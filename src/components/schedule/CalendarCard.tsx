"use client";

import * as React from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { ProjectStage } from "./schedule.types";
import { buildCalendarModifiers } from "./schedule.calendar";

type Props = {
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  dayCount: number;
  monthCount: number;
  todayCount: number;
  weekCount: number;
  dateStageMap?: Map<string, ProjectStage>;
};

export default function CalendarCard({
  selectedDate,
  setSelectedDate,
  dayCount,
  monthCount,
  todayCount,
  weekCount,
  dateStageMap = new Map<string, ProjectStage>(),
}: Props) {
  const modifiers = React.useMemo(
    () => buildCalendarModifiers({ dateStageMap }),
    [dateStageMap]
  );

  return (
    <Card className="h-full rounded-2xl">
      <CardHeader>
        <CardTitle>달력</CardTitle>
        <CardDescription>단계별 일정 bar가 표시됩니다.</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(d) => d && setSelectedDate(d)}
          className="w-full rounded-xl border p-4"
          modifiers={modifiers}
          modifiersStyles={{
            planning: {
              backgroundImage:
                "linear-gradient(to top, #3b82f6 0 5px, transparent 5px)",
            },
            design: {
              backgroundImage:
                "linear-gradient(to top, #ec4899 0 5px, transparent 5px)",
            },
            development: {
              backgroundImage:
                "linear-gradient(to top , #8b5cf6 0 5px, transparent 5px)",
            },
            finalization: {
              backgroundImage:
                "linear-gradient(to top, #22c55e 0 5px, transparent 5px)",
            },
          }}
        />

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