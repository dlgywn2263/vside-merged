"use client";

import * as React from "react";
import { format } from "date-fns";
import { Tabs, TabsContent } from "@/components/ui/tabs";

import type {
  ApiScheduleResponse,
  ApiTeamMemberResponse,
  ApiWorkspaceOptionResponse,
  CalendarEvent,
  Category,
  Mode,
  Team,
  WorkspaceOption,
} from "./schedule.types";
import { CATEGORIES } from "./schedule.mock";
import {
  apiFetch,
  apiFetchJson,
  dedupeEvents,
  mapApiScheduleToCalendarEvent,
  sortByDateRange,
  toApiCategory,
  toApiRole,
  toApiStage,
  toApiStatus,
} from "./schedule.utils";

import TopBar from "./TopBar";
import ScopeToolbar from "./ScopeToolbar";
import CalendarCard from "./CalendarCard";
import SelectedDayCard from "./SelectedDayCard";
import WeekCard from "./WeekCard";
import SideInfoCard from "./SideInfoCard";
import EventDetailDialog from "./EventDetailDialog";
import EventEditDialog from "./EventEditDialog";

import { useScheduleForm } from "./hooks/useScheduleForm";
import { useScheduleDerived } from "./hooks/useScheduleDerived";

export default function SchedulePageClient() {
  const [mode, setMode] = React.useState<Mode>("personal");

  const [personalWorkspaces, setPersonalWorkspaces] = React.useState<
    WorkspaceOption[]
  >([]);
  const [teamWorkspaces, setTeamWorkspaces] = React.useState<WorkspaceOption[]>(
    [],
  );

  const [selectedPersonalWorkspaceId, setSelectedPersonalWorkspaceId] =
    React.useState("");
  const [selectedTeamWorkspaceId, setSelectedTeamWorkspaceId] =
    React.useState("");

  const [teamMembers, setTeamMembers] = React.useState<ApiTeamMemberResponse[]>(
    [],
  );

  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);

  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<Category | "ALL">("ALL");

  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailId, setDetailId] = React.useState<string | null>(null);

  const [loading, setLoading] = React.useState(false);
  const [bootLoading, setBootLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const selectedISO = format(selectedDate, "yyyy-MM-dd");
  const selectedWorkspaceId =
    mode === "personal" ? selectedPersonalWorkspaceId : selectedTeamWorkspaceId;

  const form = useScheduleForm({ selectedISO });

  const currentTeam: Team | undefined = React.useMemo(() => {
    if (mode !== "team" || !selectedTeamWorkspaceId) return undefined;

    const workspace = teamWorkspaces.find(
      (item) => item.workspaceId === selectedTeamWorkspaceId,
    );

    return {
      id: selectedTeamWorkspaceId,
      name: workspace?.workspaceName ?? "팀 워크스페이스",
      members: teamMembers.map((member) => ({
        userId: member.userId,
        name: member.name,
      })),
    };
  }, [mode, selectedTeamWorkspaceId, teamWorkspaces, teamMembers]);

  const detailEvent = React.useMemo(() => {
    if (!detailId) return null;
    return events.find((event) => event.id === detailId) ?? null;
  }, [detailId, events]);

  const {
    dayEvents,
    weekEvents,
    monthCount,
    todayCount,
    personalNextTitle,
    monthTopCategory,
    scopedFiltered,
  } = useScheduleDerived({
    events,
    mode,
    workspaceId: selectedWorkspaceId,
    category,
    query,
    selectedDate,
  });
  const loadWorkspaceOptions = React.useCallback(async () => {
    try {
      setBootLoading(true);
      setError(null);

      const [personal, team] = await Promise.all([
        apiFetch<ApiWorkspaceOptionResponse[]>(
          "/api/schedules/personal/workspaces",
        ),
        apiFetch<ApiWorkspaceOptionResponse[]>(
          "/api/schedules/team/workspaces",
        ),
      ]);

      const personalOptions: WorkspaceOption[] = personal.map((item) => ({
        workspaceId: item.workspaceId,
        workspaceName: item.workspaceName,
      }));

      const teamOptions: WorkspaceOption[] = team.map((item) => ({
        workspaceId: item.workspaceId,
        workspaceName: item.workspaceName,
      }));

      setPersonalWorkspaces(personalOptions);
      setTeamWorkspaces(teamOptions);

      setSelectedPersonalWorkspaceId((prev) => {
        if (prev && personalOptions.some((w) => w.workspaceId === prev)) {
          return prev;
        }
        return personalOptions[0]?.workspaceId ?? "";
      });

      setSelectedTeamWorkspaceId((prev) => {
        if (prev && teamOptions.some((w) => w.workspaceId === prev)) {
          return prev;
        }
        return teamOptions[0]?.workspaceId ?? "";
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "워크스페이스 조회 실패");
    } finally {
      setBootLoading(false);
    }
  }, []);

  const loadTeamMembers = React.useCallback(async () => {
    if (mode !== "team" || !selectedTeamWorkspaceId) {
      setTeamMembers([]);
      return;
    }

    try {
      const members = await apiFetch<ApiTeamMemberResponse[]>(
        `/api/schedules/team/workspaces/${selectedTeamWorkspaceId}/members`,
      );
      setTeamMembers(members);
    } catch {
      setTeamMembers([]);
    }
  }, [mode, selectedTeamWorkspaceId]);

  const loadScheduleData = React.useCallback(async () => {
    if (!selectedWorkspaceId) {
      setEvents([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const commonParams = new URLSearchParams({
        view: mode,
        workspaceId: selectedWorkspaceId,
      });

      const dayParams = new URLSearchParams(commonParams.toString());
      dayParams.set("date", selectedISO);
      dayParams.set("category", "all");

      const monthParams = new URLSearchParams(commonParams.toString());
      monthParams.set("year", String(selectedDate.getFullYear()));
      monthParams.set("month", String(selectedDate.getMonth() + 1));

      const weekParams = new URLSearchParams(commonParams.toString());
      weekParams.set("date", selectedISO);

      const [dayRes, monthRes, weekRes] = await Promise.all([
        apiFetch<ApiScheduleResponse[]>(
          `/api/schedules?${dayParams.toString()}`,
        ),
        apiFetch<ApiScheduleResponse[]>(
          `/api/schedules/calendar?${monthParams.toString()}`,
        ),
        apiFetch<ApiScheduleResponse[]>(
          `/api/schedules/weekly?${weekParams.toString()}`,
        ),
      ]);

      const merged = dedupeEvents(
        [...dayRes, ...monthRes, ...weekRes]
          .map(mapApiScheduleToCalendarEvent)
          .sort(sortByDateRange),
      );

      setEvents(merged);

      if (detailId && !merged.some((event) => event.id === detailId)) {
        setDetailOpen(false);
        setDetailId(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "일정 조회 실패");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [mode, selectedWorkspaceId, selectedISO, selectedDate, detailId]);

  React.useEffect(() => {
    loadWorkspaceOptions();
  }, [loadWorkspaceOptions]);

  React.useEffect(() => {
    loadTeamMembers();
  }, [loadTeamMembers]);

  React.useEffect(() => {
    if (!bootLoading) {
      loadScheduleData();
    }
  }, [bootLoading, loadScheduleData]);

  function openDetail(id: string) {
    setDetailId(id);
    setDetailOpen(true);
  }

  function openEdit(id: string) {
    const event = events.find((item) => item.id === id);
    if (!event) return;
    form.openEdit(event);
  }

  async function remove(id: string) {
    try {
      await apiFetchJson<void>(`/api/schedules/${id}`, "DELETE");
      await loadScheduleData();

      if (detailId === id) {
        setDetailOpen(false);
        setDetailId(null);
      }

      if (form.editingId === id) {
        form.setEditOpen(false);
        form.setEditingId(null);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "일정 삭제 실패");
    }
  }

  async function upsert() {
    const title = form.fTitle.trim();

    if (!title) return;
    if (!form.fStartDateISO.trim() || !form.fEndDateISO.trim()) return;
    if (form.fEndDateISO < form.fStartDateISO) {
      alert("종료일은 시작일보다 빠를 수 없습니다.");
      return;
    }
    if (!selectedWorkspaceId) {
      alert("워크스페이스를 먼저 선택하세요.");
      return;
    }

    const createPayload = {
      type: mode.toUpperCase(),
      workspaceId: selectedWorkspaceId,
      title,
      startDate: form.fStartDateISO,
      endDate: form.fEndDateISO,
      category: toApiCategory(form.fCat),
      location: form.fLoc.trim(),
      stage: toApiStage(form.fStage),
      role: toApiRole(form.fRole),
      status: toApiStatus(form.fStatus),
      participants: mode === "team" ? form.fAssignees.trim() : "",
      description: form.fDesc.trim(),
    };
    const updatePayload = {
      title,
      startDate: form.fStartDateISO,
      endDate: form.fEndDateISO,
      category: toApiCategory(form.fCat),
      location: form.fLoc.trim(),
      stage: toApiStage(form.fStage),
      role: toApiRole(form.fRole),
      status: toApiStatus(form.fStatus),
      participants: mode === "team" ? form.fAssignees.trim() : "",
      description: form.fDesc.trim(),
    };
    try {
      if (!form.editingId) {
        await apiFetchJson<ApiScheduleResponse>(
          "/api/schedules",
          "POST",
          createPayload,
        );
      } else {
        await apiFetchJson<ApiScheduleResponse>(
          `/api/schedules/${form.editingId}`,
          "PUT",
          updatePayload,
        );
      }

      form.setEditOpen(false);
      form.setEditingId(null);
      await loadScheduleData();
    } catch (e) {
      alert(e instanceof Error ? e.message : "일정 저장 실패");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <TopBar
        onToday={() => setSelectedDate(new Date())}
        onCreate={() => form.openCreate(selectedISO)}
      />

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <Tabs
        value={mode}
        onValueChange={(value) => setMode(value as Mode)}
        className="w-full"
      >
        <ScopeToolbar
          mode={mode}
          setMode={setMode}
          personalWorkspaces={personalWorkspaces}
          selectedPersonalWorkspaceId={selectedPersonalWorkspaceId}
          setSelectedPersonalWorkspaceId={setSelectedPersonalWorkspaceId}
          teamWorkspaces={teamWorkspaces}
          selectedTeamWorkspaceId={selectedTeamWorkspaceId}
          setSelectedTeamWorkspaceId={setSelectedTeamWorkspaceId}
          query={query}
          setQuery={setQuery}
          categories={CATEGORIES}
          category={category}
          setCategory={setCategory}
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <CalendarCard
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              dayCount={dayEvents.length}
              monthCount={monthCount}
              todayCount={todayCount}
              weekCount={weekEvents.length}
              events={scopedFiltered}
            />
          </div>

          <div className="lg:col-span-4">
            <SelectedDayCard
              selectedDate={selectedDate}
              dayEvents={dayEvents}
              onCreateForDay={() => form.openCreate(selectedISO)}
              onOpenDetail={openDetail}
              onEdit={openEdit}
              onRemove={remove}
            />
          </div>

          <div className="lg:col-span-8">
            <WeekCard
              selectedDate={selectedDate}
              weekEvents={weekEvents}
              mode={mode}
              onOpenDetail={openDetail}
              onEdit={openEdit}
              onRemove={remove}
              sortByDateRange={sortByDateRange}
            />
          </div>

          <div className="lg:col-span-4">
            <SideInfoCard
              mode={mode}
              currentTeam={currentTeam}
              personalNextTitle={personalNextTitle}
              monthTopCategory={monthTopCategory}
              onQuickCreate={() => form.openCreate(selectedISO)}
            />
          </div>
        </div>

        {bootLoading || loading ? (
          <div className="mt-4 text-sm text-muted-foreground">
            일정 불러오는 중...
          </div>
        ) : null}

        {!bootLoading && !loading && !selectedWorkspaceId ? (
          <div className="mt-4 text-sm text-muted-foreground">
            선택 가능한 워크스페이스가 없습니다.
          </div>
        ) : null}

        <TabsContent value="personal" className="hidden" />
        <TabsContent value="team" className="hidden" />
      </Tabs>

      <EventDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        event={detailEvent}
        currentTeam={currentTeam}
        onEdit={openEdit}
        onRemove={remove}
      />

      <EventEditDialog
        open={form.editOpen}
        onOpenChange={form.setEditOpen}
        editingId={form.editingId}
        mode={mode}
        currentTeam={currentTeam}
        categories={CATEGORIES}
        fTitle={form.fTitle}
        setFTitle={form.setFTitle}
        fDesc={form.fDesc}
        setFDesc={form.setFDesc}
        fLoc={form.fLoc}
        setFLoc={form.setFLoc}
        fCat={form.fCat}
        setFCat={form.setFCat}
        fStartDateISO={form.fStartDateISO}
        setFStartDateISO={form.setFStartDateISO}
        fEndDateISO={form.fEndDateISO}
        setFEndDateISO={form.setFEndDateISO}
        fAssignees={form.fAssignees}
        setFAssignees={form.setFAssignees}
        fStage={form.fStage}
        setFStage={form.setFStage}
        fRole={form.fRole}
        setFRole={form.setFRole}
        fStatus={form.fStatus}
        setFStatus={form.setFStatus}
        onSave={upsert}
      />
    </div>
  );
}
