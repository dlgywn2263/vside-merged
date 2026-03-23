"use client";

import * as React from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import CalendarCard from "@/components/schedule/CalendarCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  STAGE_BADGE_COLORS,
  STAGE_LABELS,
} from "@/components/schedule/schedule.colors";
import type {
  CalendarEvent,
  Mode,
  ProjectStage,
} from "@/components/schedule/schedule.types";

type Props = {
  workspaceId: string;
  view: "personal" | "team";
};

type ApiScheduleItem = {
  id?: number | string;
  title?: string;
  content?: string;
  description?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  startDateISO?: string;
  endDateISO?: string;
  stage?: string;
  category?: string;
  location?: string;
};

type SummaryResponse = {
  monthCount?: number;
  todayCount?: number;
  weekCount?: number;
  monthlyCount?: number;
};

/**
 * 개발일지 패널에서 쓰는 확장 이벤트 타입
 * CalendarCard에 넘기기 위해 CalendarEvent 형태를 맞추고,
 * 상세 카드에서 보여줄 content도 유지한다.
 */
type DevlogCalendarEvent = CalendarEvent & {
  content: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

function ymd(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function toProjectStage(stage?: string): ProjectStage | undefined {
  if (!stage) return undefined;

  const normalized = stage.toUpperCase();

  if (normalized === "PLANNING") return "Planning";
  if (normalized === "DESIGN") return "Design";
  if (normalized === "IMPLEMENTATION") return "Implementation";
  if (normalized === "WRAPUP") return "Wrapup";

  return undefined;
}

function normalizeDate(value?: string) {
  if (!value) return "";
  return value.slice(0, 10);
}

function mapScheduleItem(
  item: ApiScheduleItem,
  workspaceId: string,
  view: Mode,
): DevlogCalendarEvent {
  const start =
    normalizeDate(item.startDateISO) ||
    normalizeDate(item.startDate) ||
    normalizeDate(item.date);

  const end =
    normalizeDate(item.endDateISO) ||
    normalizeDate(item.endDate) ||
    normalizeDate(item.date) ||
    start;

  return {
    id: String(item.id ?? crypto.randomUUID()),
    mode: view,
    workspaceId,
    workspaceName: undefined,
    title: item.title ?? "제목 없음",
    description: item.description ?? item.content ?? "",
    content: item.content ?? item.description ?? "",
    category:
      item.category === "Meeting" ||
      item.category === "Study" ||
      item.category === "Etc"
        ? item.category
        : "Work",
    location: item.location ?? "",
    startDateISO: start,
    endDateISO: end,
    assignees: [],
    stage: toProjectStage(item.stage),
    role: undefined,
    status: undefined,
    creatorId: undefined,
    creatorName: undefined,
  };
}

export default function DevlogSchedulePanel({ workspaceId, view }: Props) {
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [monthEvents, setMonthEvents] = React.useState<DevlogCalendarEvent[]>(
    [],
  );
  const [dayEvents, setDayEvents] = React.useState<DevlogCalendarEvent[]>([]);
  const [monthCount, setMonthCount] = React.useState(0);
  const [todayCount, setTodayCount] = React.useState(0);
  const [weekCount, setWeekCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  const selectedYear = selectedDate.getFullYear();
  const selectedMonth = selectedDate.getMonth() + 1;
  const dayCount = dayEvents.length;

  React.useEffect(() => {
    if (!workspaceId) return;
    loadAll();
  }, [workspaceId, view, selectedDate]);

  async function loadAll() {
    setLoading(true);

    try {
      const [calendarRes, dayRes, summaryRes] = await Promise.all([
        fetch(
          `${API_BASE}/api/schedules/calendar?view=${view}&year=${selectedYear}&month=${selectedMonth}&workspaceId=${workspaceId}`,
          {
            method: "GET",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            cache: "no-store",
          },
        ),
        fetch(
          `${API_BASE}/api/schedules?view=${view}&date=${ymd(selectedDate)}&workspaceId=${workspaceId}&category=all`,
          {
            method: "GET",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            cache: "no-store",
          },
        ),
        fetch(
          `${API_BASE}/api/schedules/summary?view=${view}&date=${ymd(selectedDate)}&workspaceId=${workspaceId}`,
          {
            method: "GET",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            cache: "no-store",
          },
        ),
      ]);

      if (!calendarRes.ok) {
        throw new Error("월간 일정 조회 실패");
      }
      if (!dayRes.ok) {
        throw new Error("선택 날짜 일정 조회 실패");
      }
      if (!summaryRes.ok) {
        throw new Error("일정 요약 조회 실패");
      }

      const calendarJson: ApiScheduleItem[] = await calendarRes.json();
      const dayJson: ApiScheduleItem[] = await dayRes.json();
      const summaryJson: SummaryResponse = await summaryRes.json();

      const mappedMonthEvents = (calendarJson ?? []).map((item) =>
        mapScheduleItem(item, workspaceId, view),
      );
      const mappedDayEvents = (dayJson ?? []).map((item) =>
        mapScheduleItem(item, workspaceId, view),
      );

      setMonthEvents(mappedMonthEvents);
      setDayEvents(mappedDayEvents);
      setMonthCount(summaryJson.monthCount ?? summaryJson.monthlyCount ?? 0);
      setTodayCount(summaryJson.todayCount ?? 0);
      setWeekCount(summaryJson.weekCount ?? 0);
    } catch (error) {
      console.error("DevlogSchedulePanel loadAll error:", error);
      setMonthEvents([]);
      setDayEvents([]);
      setMonthCount(0);
      setTodayCount(0);
      setWeekCount(0);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <CalendarCard
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        dayCount={dayCount}
        monthCount={monthCount}
        todayCount={todayCount}
        weekCount={weekCount}
        events={monthEvents}
      />

      <Card className="h-full rounded-2xl">
        <CardHeader>
          <CardTitle>선택 날짜 일정</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {format(selectedDate, "yyyy.MM.dd (EEE)", { locale: ko })}
          </p>
        </CardHeader>

        <CardContent className="space-y-3">
          {loading ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              일정을 불러오는 중입니다.
            </div>
          ) : dayEvents.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              해당 날짜에 포함된 일정이 없습니다.
            </div>
          ) : (
            dayEvents.map((event) => (
              <div key={event.id} className="space-y-3 rounded-xl border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{event.category}</Badge>

                  {event.stage ? (
                    <Badge className={STAGE_BADGE_COLORS[event.stage]}>
                      {STAGE_LABELS[event.stage]}
                    </Badge>
                  ) : null}

                  <div className="truncate font-medium">{event.title}</div>
                </div>

                <div className="text-sm text-muted-foreground">
                  {event.startDateISO}
                  {event.startDateISO !== event.endDateISO
                    ? ` ~ ${event.endDateISO}`
                    : ""}
                </div>

                {event.location ? (
                  <div className="text-sm">{event.location}</div>
                ) : null}

                <div className="rounded-lg bg-muted/40 p-3 text-sm whitespace-pre-wrap">
                  {event.content || "일정 내용이 없습니다."}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
