// 일정관리 페이지의 핵심 상태/필터/CRUD 로직을 보유하고 분리된 UI 컴포넌트들을 조립하는 메인 클라이언트 컴포넌트

"use client";

import * as React from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  isSameMonth,
} from "date-fns";

import { Tabs, TabsContent } from "@/components/ui/tabs";

import type { Category, CalendarEvent, Mode, Team } from "./schedule.types";
import { CATEGORIES, TEAMS } from "./schedule.mock";
import {
  loadEvents,
  saveEvents,
  matchesScope,
  sortByDateTime,
  timeToDate,
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

export default function SchedulePageClient() {
  // ------------------------------
  // ✅ 페이지 로컬 상태
  // ------------------------------
  const [mode, setMode] = React.useState<Mode>("personal");
  const [teamId, setTeamId] = React.useState<string>(TEAMS[0]?.id ?? "team-a");

  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const selectedISO = format(selectedDate, "yyyy-MM-dd");

  const [events, setEvents] = React.useState<CalendarEvent[]>([]);

  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<Category | "ALL">("ALL");

  // CRUD Dialog (추가/수정)
  const [editOpen, setEditOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  // ✅ 상세 보기 Dialog
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailId, setDetailId] = React.useState<string | null>(null);

  // ------------------------------
  // ✅ 폼 상태 (추가/수정)
  // ------------------------------
  const [fTitle, setFTitle] = React.useState("");
  const [fDesc, setFDesc] = React.useState("");
  const [fLoc, setFLoc] = React.useState("");
  const [fCat, setFCat] = React.useState<Category>("Work");
  const [fDateISO, setFDateISO] = React.useState(selectedISO);
  const [fStart, setFStart] = React.useState("09:00");
  const [fEnd, setFEnd] = React.useState("10:00");
  const [fAssignees, setFAssignees] = React.useState<string>("");

  // ------------------------------
  // ✅ 초기 로드
  // ------------------------------
  React.useEffect(() => {
    /**
     * TODO(백엔드):
     * - GET /api/events?scope=...&teamId=...
     */
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
        dateISO: todayISO(),
        startTime: "19:00",
        endTime: "20:30",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: uid(),
        mode: "team",
        teamId: TEAMS[0]?.id,
        title: "팀 스크럼",
        description:
          "진행상황 공유 / 막힌 부분 정리\n- FE: 레이아웃\n- BE: 인증",
        location: "디스코드",
        category: "Meeting",
        dateISO: todayISO(),
        startTime: "21:00",
        endTime: "21:30",
        assignees: ["효주", "민수"],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    setEvents(seed);
    saveEvents(seed);
  }, []);

  React.useEffect(() => {
    // TODO(백엔드): CRUD API 성공 후에만 setEvents / invalidate 방식 권장
    saveEvents(events);
  }, [events]);

  // 선택 날짜 바뀌면 기본 입력 날짜도 동기화(편의)
  React.useEffect(() => {
    if (!editOpen) setFDateISO(selectedISO);
  }, [selectedISO, editOpen]);

  const currentTeam: Team | undefined = React.useMemo(
    () => TEAMS.find((t) => t.id === teamId) ?? TEAMS[0],
    [teamId],
  );

  // ------------------------------
  // ✅ 필터 적용
  // ------------------------------
  const scopedFiltered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return events
      .filter((e) => matchesScope(e, mode, teamId))
      .filter((e) => (category === "ALL" ? true : e.category === category))
      .filter((e) => {
        if (!q) return true;
        const hay =
          `${e.title} ${e.description ?? ""} ${e.location ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice()
      .sort(sortByDateTime);
  }, [events, mode, teamId, category, query]);

  const dayEvents = React.useMemo(
    () =>
      scopedFiltered
        .filter((e) => e.dateISO === selectedISO)
        .sort(sortByDateTime),
    [scopedFiltered, selectedISO],
  );

  const weekEvents = React.useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 0 });
    return scopedFiltered.filter((e) => {
      const d = new Date(e.dateISO + "T00:00:00");
      return isWithinInterval(d, { start, end });
    });
  }, [scopedFiltered, selectedDate]);

  const monthCount = React.useMemo(() => {
    return scopedFiltered.filter((e) => {
      const d = new Date(e.dateISO + "T00:00:00");
      return isSameMonth(d, selectedDate);
    }).length;
  }, [scopedFiltered, selectedDate]);

  const todayCount = React.useMemo(() => {
    const t = todayISO();
    return scopedFiltered.filter((e) => e.dateISO === t).length;
  }, [scopedFiltered]);

  const eventDateSet = React.useMemo(() => {
    const set = new Set<string>();
    for (const e of scopedFiltered) set.add(e.dateISO);
    return set;
  }, [scopedFiltered]);

  // ------------------------------
  // ✅ 상세 보기 열기/닫기
  // ------------------------------
  function openDetail(id: string) {
    setDetailId(id);
    setDetailOpen(true);
  }

  const detailEvent = React.useMemo(() => {
    if (!detailId) return null;
    return events.find((e) => e.id === detailId) ?? null;
  }, [detailId, events]);

  // ------------------------------
  // ✅ CRUD: 추가/수정 열기
  // ------------------------------
  function openCreate(prefillDateISO?: string) {
    setEditingId(null);
    setFTitle("");
    setFDesc("");
    setFLoc("");
    setFCat("Work");
    setFDateISO(prefillDateISO ?? selectedISO);
    setFStart("09:00");
    setFEnd("10:00");
    setFAssignees("");
    setEditOpen(true);
  }

  function openEdit(id: string) {
    const e = events.find((x) => x.id === id);
    if (!e) return;

    setEditingId(id);
    setFTitle(e.title);
    setFDesc(e.description ?? "");
    setFLoc(e.location ?? "");
    setFCat(e.category);
    setFDateISO(e.dateISO);
    setFStart(e.startTime);
    setFEnd(e.endTime ?? "");
    setFAssignees((e.assignees ?? []).join(", "));
    setEditOpen(true);
  }

  function remove(id: string) {
    /**
     * TODO(백엔드):
     * - DELETE /api/events/:id
     * - 성공 후 setEvents(prev => prev.filter(...))
     */
    setEvents((prev) => prev.filter((e) => e.id !== id));

    if (detailId === id) {
      setDetailOpen(false);
      setDetailId(null);
    }
    if (editingId === id) {
      setEditOpen(false);
      setEditingId(null);
    }
  }

  function upsert() {
    const title = fTitle.trim();
    if (!title) return;

    // 시간 유효성 체크
    if (fStart && fEnd) {
      const s = timeToDate(fDateISO, fStart);
      const e = timeToDate(fDateISO, fEnd);
      if (e.getTime() <= s.getTime()) return;
    }

    const now = Date.now();

    if (!editingId) {
      // CREATE
      const created: CalendarEvent = {
        id: uid(),
        mode,
        teamId: mode === "team" ? teamId : undefined,
        title,
        description: fDesc.trim() || undefined,
        location: fLoc.trim() || undefined,
        category: fCat,
        dateISO: fDateISO,
        startTime: fStart,
        endTime: fEnd.trim() || undefined,
        assignees:
          mode === "team"
            ? fAssignees
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : undefined,
        createdAt: now,
        updatedAt: now,
      };

      /**
       * TODO(백엔드):
       * - POST /api/events
       */
      setEvents((prev) => [...prev, created].sort(sortByDateTime));
    } else {
      // UPDATE
      /**
       * TODO(백엔드):
       * - PATCH /api/events/:id
       */
      setEvents((prev) =>
        prev
          .map((e) => {
            if (e.id !== editingId) return e;
            return {
              ...e,
              mode,
              teamId: mode === "team" ? teamId : undefined,
              title,
              description: fDesc.trim() || undefined,
              location: fLoc.trim() || undefined,
              category: fCat,
              dateISO: fDateISO,
              startTime: fStart,
              endTime: fEnd.trim() || undefined,
              assignees:
                mode === "team"
                  ? fAssignees
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                  : undefined,
              updatedAt: now,
            } as CalendarEvent;
          })
          .sort(sortByDateTime),
      );
    }

    setEditOpen(false);
    setEditingId(null);
  }

  // ------------------------------
  // ✅ 개인 요약(우측 2행 카드용)
  // ------------------------------
  const personalNextTitle = React.useMemo(() => {
    const t = todayISO();
    return (
      scopedFiltered.find((e) => e.dateISO >= t)?.title ?? "예정된 일정 없음"
    );
  }, [scopedFiltered]);

  const monthTopCategory = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of scopedFiltered) {
      const d = new Date(e.dateISO + "T00:00:00");
      if (!isSameMonth(d, selectedDate)) continue;
      counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
    }
    let best: string | null = null;
    let bestV = -1;
    for (const [k, v] of counts) {
      if (v > bestV) {
        bestV = v;
        best = k;
      }
    }
    return best ? `${best} (${bestV})` : "데이터 없음";
  }, [scopedFiltered, selectedDate]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <TopBar
        onToday={() => setSelectedDate(new Date())}
        onCreate={() => openCreate(selectedISO)}
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8">
            <CalendarCard
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              dayCount={dayEvents.length}
              monthCount={monthCount}
              todayCount={todayCount}
              weekCount={weekEvents.length}
              eventDateSet={eventDateSet}
            />
          </div>

          <div className="lg:col-span-4">
            <SelectedDayCard
              selectedDate={selectedDate}
              dayEvents={dayEvents}
              onCreateForDay={() => openCreate(selectedISO)}
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
              sortByDateTime={sortByDateTime}
            />
          </div>

          <div className="lg:col-span-4">
            <SideInfoCard
              mode={mode}
              currentTeam={currentTeam}
              personalNextTitle={personalNextTitle}
              monthTopCategory={monthTopCategory}
              onQuickCreate={() => openCreate(selectedISO)}
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
        open={editOpen}
        onOpenChange={setEditOpen}
        editingId={editingId}
        mode={mode}
        currentTeam={currentTeam}
        categories={CATEGORIES}
        fTitle={fTitle}
        setFTitle={setFTitle}
        fDesc={fDesc}
        setFDesc={setFDesc}
        fLoc={fLoc}
        setFLoc={setFLoc}
        fCat={fCat}
        setFCat={setFCat}
        fDateISO={fDateISO}
        setFDateISO={setFDateISO}
        fStart={fStart}
        setFStart={setFStart}
        fEnd={fEnd}
        setFEnd={setFEnd}
        fAssignees={fAssignees}
        setFAssignees={setFAssignees}
        onSave={upsert}
      />
    </div>
  );
}
