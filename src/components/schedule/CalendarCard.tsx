// 월간 달력(점 표시 포함) + 선택 날짜 요약/통계를 렌더링하는 좌측 상단 카드 컴포넌트

"use client";

import * as React from "react";
import { format, isSameDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

type Props = {
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;

  dayCount: number;
  monthCount: number;
  todayCount: number;
  weekCount: number;

  eventDateSet: Set<string>;
};

function DayCell({
  day,
  selectedDate,
  eventDateSet,
}: {
  day: Date;
  selectedDate: Date;
  eventDateSet: Set<string>;
}) {
  const iso = format(day, "yyyy-MM-dd");
  const has = eventDateSet.has(iso);
  const selected = isSameDay(day, selectedDate);

  return (
    <div className="relative flex flex-col items-center justify-center h-14">
      <div className={selected ? "font-semibold text-lg" : "text-lg"}>
        {format(day, "d")}
      </div>
      <div className="h-3 flex items-center justify-center">
        {has ? <div className="w-2 h-2 rounded-full bg-primary" /> : null}
      </div>
    </div>
  );
}

export default function CalendarCard({
  selectedDate,
  setSelectedDate,
  dayCount,
  monthCount,
  todayCount,
  weekCount,
  eventDateSet,
}: Props) {
  return (
    <Card className="rounded-2xl h-full">
      <CardHeader>
        <CardTitle>달력</CardTitle>
        <CardDescription>
          점 표시 = 일정 있음. 날짜 선택하면 오른쪽 상세가 갱신됩니다.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(d) => d && setSelectedDate(d)}
          className="w-full rounded-xl border p-6 text-base"
          modifiers={{
            hasEvent: (date) => eventDateSet.has(format(date, "yyyy-MM-dd")),
          }}
          modifiersClassNames={{
            hasEvent:
              "relative after:content-[''] after:w-2 after:h-2 after:rounded-full after:bg-primary after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2",
          }}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">선택 날짜</Badge>
          <span className="text-sm font-medium">
            {format(selectedDate, "yyyy.MM.dd (EEE)")}
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
