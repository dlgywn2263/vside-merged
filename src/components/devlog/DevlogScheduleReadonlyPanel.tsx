"use client";

import * as React from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type {
  ApiScheduleResponse,
  CalendarEvent,
  Mode,
} from "@/components/schedule/schedule.types";

import CalendarCard from "@/components/schedule/CalendarCard";
import {
  mapApiScheduleToCalendarEvent,
  dedupeEvents,
} from "@/components/schedule/schedule.utils";
import { useScheduleDerived } from "@/components/schedule/hooks/useScheduleDerived";

import {
  fetchDevlogDaySchedules,
  fetchDevlogMonthSchedules,
  fetchDevlogWeekSchedules,
} from "@/lib/devlog/devlogScheduleApi";

import DevlogReadonlySelectedDayCard from "./DevlogReadonlySelectedDayCard";

type Props = {
  workspaceId: string;
  mode: Mode;
};

export default function DevlogScheduleReadonlyPanel({
  workspaceId,
  mode,
}: Props) {
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const selectedMonthKey = format(selectedDate, "yyyy-MM");
  const selectedDateISO = format(selectedDate, "yyyy-MM-dd");

  const loadSchedules = React.useCallback(async () => {
    if (!workspaceId || !mode) {
      setEvents([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const year = Number(format(selectedDate, "yyyy"));
      const month = Number(format(selectedDate, "M"));

      const [monthSchedules, daySchedules, weekSchedules] = await Promise.all([
        fetchDevlogMonthSchedules(mode, workspaceId, year, month),
        fetchDevlogDaySchedules(mode, workspaceId, selectedDateISO),
        fetchDevlogWeekSchedules(mode, workspaceId, selectedDateISO),
      ]);

      const merged = dedupeEvents(
        [...monthSchedules, ...daySchedules, ...weekSchedules].map(
          (item: ApiScheduleResponse) => mapApiScheduleToCalendarEvent(item),
        ),
      );

      setEvents(merged);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "일정 데이터를 불러오는 중 오류가 발생했습니다.";
      setError(message);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [mode, workspaceId, selectedDate, selectedDateISO]);

  React.useEffect(() => {
    loadSchedules();
  }, [loadSchedules, selectedMonthKey, selectedDateISO]);

  const { dayEvents, weekEvents, monthCount, todayCount } = useScheduleDerived({
    events,
    mode,
    workspaceId,
    category: "ALL",
    query: "",
    selectedDate,
  });

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-[18px] font-bold">일정관리</CardTitle>
          <p className="text-sm text-muted-foreground">
            {format(selectedDate, "yyyy.MM.dd", { locale: ko })} 일정
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <CalendarCard
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            dayCount={dayEvents.length}
            monthCount={monthCount}
            todayCount={todayCount}
            weekCount={weekEvents.length}
            events={events}
          />

          {loading ? (
            <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
              일정을 불러오는 중입니다.
            </div>
          ) : error ? (
            <div className="rounded-xl border border-dashed p-5 text-center text-sm text-red-500">
              {error}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <DevlogReadonlySelectedDayCard
        selectedDate={selectedDate}
        dayEvents={dayEvents}
      />
    </div>
  );
}
