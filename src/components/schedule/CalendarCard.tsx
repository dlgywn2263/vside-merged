"use client";

import * as React from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  max,
  min,
  startOfMonth,
  startOfWeek,
  subMonths,
  differenceInCalendarDays,
} from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { CalendarEvent, ProjectStage } from "./schedule.types";

type Props = {
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  dayCount: number;
  monthCount: number;
  todayCount: number;
  weekCount: number;
  events: CalendarEvent[];

  /**
   * card: 일정관리 페이지에서 쓰는 기본 카드형 달력
   * plain: 개발일지 화면에서 쓰는 border 없는 달력
   */
  variant?: "card" | "plain";
};

type WeekBar = {
  event: CalendarEvent;
  startCol: number;
  span: number;
  row: number;
};

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const DAY_CELL_HEIGHT = 68;
const BAR_ROW_HEIGHT = 14;
const BAR_HEIGHT = 10;

function toDate(dateISO: string) {
  return new Date(`${dateISO}T00:00:00`);
}

function getStageColor(stage?: ProjectStage) {
  switch (stage) {
    case "Planning":
      return "#3b82f6";
    case "Design":
      return "#ec4899";
    case "Implementation":
      return "#8b5cf6";
    case "Wrapup":
      return "#22c55e";
    default:
      return "#94a3b8";
  }
}

function buildWeekBars(week: Date[], events: CalendarEvent[]): WeekBar[] {
  const weekStart = week[0];
  const weekEnd = week[6];

  const rawBars = events
    .filter((event) => {
      const eventStart = toDate(event.startDateISO);
      const eventEnd = toDate(event.endDateISO);

      return eventStart <= weekEnd && eventEnd >= weekStart;
    })
    .map((event) => {
      const eventStart = toDate(event.startDateISO);
      const eventEnd = toDate(event.endDateISO);

      const visibleStart = max([eventStart, weekStart]);
      const visibleEnd = min([eventEnd, weekEnd]);

      const startCol = differenceInCalendarDays(visibleStart, weekStart);
      const span = differenceInCalendarDays(visibleEnd, visibleStart) + 1;

      return {
        event,
        startCol,
        span,
        row: 0,
      };
    })
    .sort((a, b) => {
      if (a.startCol !== b.startCol) return a.startCol - b.startCol;
      return b.span - a.span;
    });

  const placed: WeekBar[] = [];
  const rowLastEndCol: number[] = [];

  for (const bar of rawBars) {
    let row = 0;

    while (true) {
      const lastEnd = rowLastEndCol[row] ?? -1;

      if (bar.startCol > lastEnd) {
        bar.row = row;
        rowLastEndCol[row] = bar.startCol + bar.span - 1;
        placed.push(bar);
        break;
      }

      row += 1;
    }
  }

  return placed;
}

export default function CalendarCard({
  selectedDate,
  setSelectedDate,
  dayCount,
  monthCount,
  todayCount,
  weekCount,
  events,
  variant = "card",
}: Props) {
  const [currentMonth, setCurrentMonth] = React.useState<Date>(selectedDate);

  const isPlain = variant === "plain";

  React.useEffect(() => {
    setCurrentMonth(
      new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
    );
  }, [selectedDate]);

  const calendarDays = React.useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({
      start: calendarStart,
      end: calendarEnd,
    });
  }, [currentMonth]);

  const weeks = React.useMemo(() => {
    const result: Date[][] = [];

    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }

    return result;
  }, [calendarDays]);

  function handlePrevMonth() {
    setCurrentMonth((prev) => subMonths(prev, 1));
  }

  function handleNextMonth() {
    setCurrentMonth((prev) => addMonths(prev, 1));
  }

  return (
    <Card
      className={
        isPlain
          ? "h-full border-0 bg-transparent shadow-none"
          : "h-full rounded-2xl border border-slate-200 bg-white shadow-sm"
      }
    >
      {!isPlain && (
        <CardHeader>
          <CardTitle>달력</CardTitle>
          <CardDescription>단계별 일정 bar가 표시됩니다.</CardDescription>
        </CardHeader>
      )}

      <CardContent className={isPlain ? "p-0" : "flex flex-col gap-4 p-6"}>
        <div
          className={
            isPlain ? "w-full" : "w-full rounded-xl border border-slate-200 p-4"
          }
        >
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="text-lg font-semibold text-slate-900">
              {format(currentMonth, "M월 yyyy", { locale: ko })}
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-sm text-slate-500">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="py-1.5">
                {label}
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            {weeks.map((week, weekIndex) => {
              const weekBars = buildWeekBars(week, events);
              const maxRow = weekBars.length
                ? Math.max(...weekBars.map((bar) => bar.row))
                : -1;

              const barAreaHeight = (maxRow + 1) * BAR_ROW_HEIGHT;

              return (
                <div
                  key={weekIndex}
                  className="relative"
                  style={{
                    minHeight: `${DAY_CELL_HEIGHT + barAreaHeight + 6}px`,
                  }}
                >
                  <div className="grid grid-cols-7">
                    {week.map((date) => {
                      const isOutside = !isSameMonth(date, currentMonth);
                      const isSelected = isSameDay(date, selectedDate);
                      const isToday = isSameDay(date, new Date());

                      return (
                        <button
                          key={date.toISOString()}
                          type="button"
                          onClick={() => setSelectedDate(date)}
                          className="relative flex justify-center pt-3 text-sm"
                          style={{ height: DAY_CELL_HEIGHT }}
                        >
                          <span
                            className={[
                              "inline-flex h-7 w-7 items-center justify-center rounded-full transition",
                              isSelected
                                ? "bg-slate-900 font-semibold text-white"
                                : "",
                              !isSelected && isToday
                                ? "bg-slate-100 font-semibold text-slate-900"
                                : "",
                              !isSelected && !isToday && isOutside
                                ? "text-slate-300"
                                : "",
                              !isSelected && !isToday && !isOutside
                                ? "text-slate-900"
                                : "",
                            ].join(" ")}
                          >
                            {format(date, "d")}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div
                    className="pointer-events-none absolute left-0 right-0 top-[44px]"
                    style={{
                      height: `${barAreaHeight}px`,
                    }}
                  >
                    {weekBars.map((bar) => {
                      const left = `${(bar.startCol / 7) * 100}%`;
                      const width = `${(bar.span / 7) * 100}%`;
                      const top = `${bar.row * BAR_ROW_HEIGHT}px`;

                      return (
                        <div
                          key={`${bar.event.id}-${bar.startCol}-${bar.row}`}
                          className="absolute overflow-hidden rounded-full px-1.5 text-[10px] font-medium leading-[10px] text-white"
                          style={{
                            left,
                            width,
                            top,
                            height: BAR_HEIGHT,
                            backgroundColor: getStageColor(bar.event.stage),
                          }}
                          title={bar.event.title}
                        >
                          <span className="block truncate">
                            {bar.event.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {!isPlain && (
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="rounded-xl bg-slate-50 px-2 py-3">
              <p className="text-slate-500">오늘</p>
              <p className="mt-1 font-semibold text-slate-900">{todayCount}</p>
            </div>

            <div className="rounded-xl bg-slate-50 px-2 py-3">
              <p className="text-slate-500">선택일</p>
              <p className="mt-1 font-semibold text-slate-900">{dayCount}</p>
            </div>

            <div className="rounded-xl bg-slate-50 px-2 py-3">
              <p className="text-slate-500">이번 주</p>
              <p className="mt-1 font-semibold text-slate-900">{weekCount}</p>
            </div>

            <div className="rounded-xl bg-slate-50 px-2 py-3">
              <p className="text-slate-500">이번 달</p>
              <p className="mt-1 font-semibold text-slate-900">{monthCount}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
