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
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
};

type WeekBar = {
  event: CalendarEvent;
  startCol: number;
  span: number;
  row: number;
};

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/**
 * 세로 길이 줄인 압축 버전
 */
const DAY_CELL_HEIGHT = 68;
const BAR_ROW_HEIGHT = 14;
const MAX_VISIBLE_BAR_ROWS = Infinity;
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
}: Props) {
  const [currentMonth, setCurrentMonth] = React.useState<Date>(selectedDate);

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
    <Card className="h-full rounded-2xl">
      <CardHeader>
        <CardTitle>달력</CardTitle>
        <CardDescription>단계별 일정 bar가 표시됩니다.</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="w-full rounded-xl border p-4">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="text-lg font-semibold">
              {format(currentMonth, "MMMM yyyy", { locale: ko })}
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-sm text-muted-foreground">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="py-1.5">
                {label}
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            {weeks.map((week, weekIndex) => {
              const weekBars = buildWeekBars(week, events);
              const visibleBars = weekBars;
              const hiddenCount = weekBars.length - visibleBars.length;
              const maxRow = weekBars.length
                ? Math.max(...weekBars.map((b) => b.row))
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

                      return (
                        <button
                          key={date.toISOString()}
                          type="button"
                          onClick={() => setSelectedDate(date)}
                          className={[
                            "flex h-[100px] flex-col items-center justify-start px-1 pt-1.5 text-center transition-colors",
                            "hover:bg-muted/50",
                            isSelected ? "rounded-md bg-muted" : "",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "text-sm",
                              isOutside
                                ? "text-muted-foreground/40"
                                : "text-foreground",
                            ].join(" ")}
                          >
                            {date.getDate()}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div
                    className="absolute left-0 right-0"
                    style={{ top: `${DAY_CELL_HEIGHT - 16}px` }}
                  >
                    {visibleBars.map((bar) => (
                      <div
                        key={`${bar.event.id}-${bar.row}-${bar.startCol}`}
                        className="absolute flex items-center overflow-hidden rounded-full px-1.5 text-[10px] text-white shadow-sm"
                        style={{
                          left: `calc(${(bar.startCol / 7) * 100}% + 4px)`,
                          width: `calc(${(bar.span / 7) * 100}% - 8px)`,
                          top: `${bar.row * BAR_ROW_HEIGHT}px`,
                          height: `${BAR_HEIGHT}px`,
                          backgroundColor: getStageColor(bar.event.stage),
                        }}
                        title={bar.event.title}
                      >
                        <span className="truncate leading-none">
                          {bar.event.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">선택 날짜</Badge>
          <span className="text-sm font-medium">
            {format(selectedDate, "yyyy.MM.dd (EEE)", { locale: ko })}
          </span>
          <span className="text-sm text-muted-foreground">
            · 일정 {dayCount}개
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="rounded-lg border p-3 text-center">
            <div className="text-xs text-muted-foreground">이번 달 전체</div>
            <div className="text-xl font-semibold">{monthCount}</div>
          </div>

          <div className="rounded-lg border p-3 text-center">
            <div className="text-xs text-muted-foreground">오늘 일정</div>
            <div className="text-xl font-semibold">{todayCount}</div>
          </div>

          <div className="rounded-lg border p-3 text-center">
            <div className="text-xs text-muted-foreground">이번 주</div>
            <div className="text-xl font-semibold">{weekCount}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
