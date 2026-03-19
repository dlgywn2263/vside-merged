"use client";

import * as React from "react";
import { format } from "date-fns";
import { Tabs, TabsContent } from "@/components/ui/tabs";

import type {
  Category,
  CalendarEvent,
  Mode,
  Team,
} from "./schedule.types";
import { CATEGORIES, TEAMS } from "./schedule.mock";
import {
  loadEvents,
  saveEvents,
  sortByDateRange,
  todayISO,
  uid,
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
  const [teamId, setTeamId] = React.useState<string>(TEAMS[0]?.id ?? "team-a");

  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);

  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<Category | "ALL">("ALL");

  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailId, setDetailId] = React.useState<string | null>(null);

  const selectedISO = format(selectedDate, "yyyy-MM-dd");

  const form = useScheduleForm({ selectedISO });

  React.useEffect(() => {
    const loaded = loadEvents();
    if (loaded.length > 0) {
      setEvents(loaded);
      return;
    }

    const seed: CalendarEvent[] = [
      {
        id: uid(),
        mode: "personal",
        title: "캡스톤 문서 정리",
        description:
          "기능 정의서/화면 설계 정리\n- 일정 페이지 구조\n- API 명세 초안",
        location: "집",
        category: "Work",
        startDateISO: todayISO(),
        endDateISO: todayISO(),
        stage: "Planning",
        role: "Frontend",
        status: "Todo",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: uid(),
        mode: "team",
        teamId: TEAMS[0]?.id,
        title: "발표 준비 주간",
        description: "PPT / 시연 / 발표 대본 마무리",
        location: "디스코드",
        category: "Meeting",
        startDateISO: todayISO(),
        endDateISO: format(
          new Date(new Date().setDate(new Date().getDate() + 4)),
          "yyyy-MM-dd"
        ),
        assignees: ["효주", "민수"],
        stage: "Development",
        role: "Backend",
        status: "InProgress",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    setEvents(seed);
    saveEvents(seed);
  }, []);

  React.useEffect(() => {
    saveEvents(events);
  }, [events]);

  const currentTeam: Team | undefined = React.useMemo(
    () => TEAMS.find((t) => t.id === teamId) ?? TEAMS[0],
    [teamId]
  );

  const detailEvent = React.useMemo(() => {
    if (!detailId) return null;
    return events.find((e) => e.id === detailId) ?? null;
  }, [detailId, events]);

  const {
    dayEvents,
    weekEvents,
    monthCount,
    todayCount,
    personalNextTitle,
    monthTopCategory,
    dateStageMap,
  } = useScheduleDerived({
    events,
    mode,
    teamId,
    category,
    query,
    selectedDate,
  });

  function openDetail(id: string) {
    setDetailId(id);
    setDetailOpen(true);
  }

  function openEdit(id: string) {
    const event = events.find((x) => x.id === id);
    if (!event) return;
    form.openEdit(event);
  }

  function remove(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));

    if (detailId === id) {
      setDetailOpen(false);
      setDetailId(null);
    }
    if (form.editingId === id) {
      form.setEditOpen(false);
      form.setEditingId(null);
    }
  }

  function upsert() {
    const title = form.fTitle.trim();
    if (!title) return;
    if (!form.fStartDateISO.trim() || !form.fEndDateISO.trim()) return;
    if (form.fEndDateISO < form.fStartDateISO) return;

    const now = Date.now();

    if (!form.editingId) {
      const created: CalendarEvent = {
        id: uid(),
        mode,
        teamId: mode === "team" ? teamId : undefined,
        title,
        description: form.fDesc.trim() || undefined,
        location: form.fLoc.trim() || undefined,
        category: form.fCat,
        startDateISO: form.fStartDateISO,
        endDateISO: form.fEndDateISO,
        assignees:
          mode === "team"
            ? form.fAssignees
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : undefined,
        stage: form.fStage,
        role: form.fRole,
        status: form.fStatus,
        createdAt: now,
        updatedAt: now,
      };

      setEvents((prev) => [...prev, created].sort(sortByDateRange));
    } else {
      setEvents((prev) =>
        prev
          .map((e) => {
            if (e.id !== form.editingId) return e;

            return {
              ...e,
              mode,
              teamId: mode === "team" ? teamId : undefined,
              title,
              description: form.fDesc.trim() || undefined,
              location: form.fLoc.trim() || undefined,
              category: form.fCat,
              startDateISO: form.fStartDateISO,
              endDateISO: form.fEndDateISO,
              assignees:
                mode === "team"
                  ? form.fAssignees
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                  : undefined,
              stage: form.fStage,
              role: form.fRole,
              status: form.fStatus,
              updatedAt: now,
            };
          })
          .sort(sortByDateRange)
      );
    }

    form.setEditOpen(false);
    form.setEditingId(null);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <TopBar
        onToday={() => setSelectedDate(new Date())}
        onCreate={() => form.openCreate(selectedISO)}
      />

      <Tabs
        value={mode}
        onValueChange={(v) => setMode(v as Mode)}
        className="w-full"
      >
        <ScopeToolbar
          mode={mode}
          setMode={setMode}
          teams={TEAMS}
          teamId={teamId}
          setTeamId={setTeamId}
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
              dateStageMap={dateStageMap}
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