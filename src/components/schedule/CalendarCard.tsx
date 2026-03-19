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
import type { CalendarEvent } from "./schedule.types";
import {
  buildCalendarModifiers,
  buildCalendarModifierClassNames,
} from "./schedule.calendar";

type Props = {
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  dayCount: number;
  monthCount: number;
  todayCount: number;
  weekCount: number;
  // 기존 dateStageMap을 지우고 events 배열을 통째로 받습니다!
  events?: CalendarEvent[]; 
};

export default function CalendarCard({
  selectedDate,
  setSelectedDate,
  dayCount,
  monthCount,
  todayCount,
  weekCount,
  events = [],
}: Props) {
  // 컴포넌트 내부에서 확실하게 계산
  const modifiers = React.useMemo(
    () => buildCalendarModifiers(events),
    [events]
  );

  const modifierClassNames = React.useMemo(
    () => buildCalendarModifierClassNames(),
    []
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
          modifiersClassNames={modifierClassNames}
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