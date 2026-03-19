"use client";

import { useMemo, useState } from "react";
import { format, isSameDay, isSameMonth, isSameWeek } from "date-fns";
import { ko } from "date-fns/locale";

import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type DevlogItem = {
  id: string;
  title: string;
  date: string; // yyyy-MM-dd
  tags: string[];
};

const MOCK_DEVLOGS: DevlogItem[] = [
  {
    id: "1",
    title: "로그인 API 구현",
    date: "2026-03-05",
    tags: ["#API", "#백엔드"],
  },
  {
    id: "2",
    title: "ERD 설계",
    date: "2026-03-09",
    tags: ["#DB", "#설계"],
  },
  {
    id: "3",
    title: "Devlog UI 구현",
    date: "2026-03-21",
    tags: ["#React", "#UI"],
  },
  {
    id: "4",
    title: "문서 정리",
    date: "2026-03-25",
    tags: ["#문서", "#정리"],
  },
];

function parseDate(dateString: string) {
  return new Date(dateString);
}

export default function DevlogProject() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date("2026-03-05"));

  const eventDateSet = useMemo(() => {
    return new Set(MOCK_DEVLOGS.map((item) => item.date));
  }, []);

  const dayLogs = useMemo(() => {
    return MOCK_DEVLOGS.filter((item) =>
      isSameDay(parseDate(item.date), selectedDate)
    );
  }, [selectedDate]);

  const monthCount = useMemo(() => {
    return MOCK_DEVLOGS.filter((item) =>
      isSameMonth(parseDate(item.date), selectedDate)
    ).length;
  }, [selectedDate]);

  const todayCount = useMemo(() => {
    const today = new Date();
    return MOCK_DEVLOGS.filter((item) =>
      isSameDay(parseDate(item.date), today)
    ).length;
  }, []);

  const weekCount = useMemo(() => {
    return MOCK_DEVLOGS.filter((item) =>
      isSameWeek(parseDate(item.date), selectedDate, { weekStartsOn: 0 })
    ).length;
  }, [selectedDate]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      {/* 왼쪽 달력 */}
      <Card className="rounded-2xl h-fit">
        <CardHeader>
          <CardTitle>캘린더</CardTitle>
          <CardDescription>
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col items-center gap-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => d && setSelectedDate(d)}
            locale={ko}
            className="w-[320px] rounded-xl border p-2 text-sm"
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
              {format(selectedDate, "yyyy.MM.dd (EEE)", { locale: ko })}
            </span>
            <span className="text-sm text-muted-foreground">
              · 개발일지 {dayLogs.length}개
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 오른쪽 개발일지 상세 */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>
            {format(selectedDate, "yyyy.MM.dd", { locale: ko })} 개발일지
          </CardTitle>
          <CardDescription>
            선택한 날짜에 작성된 개발일지 목록입니다.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          {dayLogs.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              선택한 날짜에 작성된 개발일지가 없습니다.
            </div>
          ) : (
            dayLogs.map((log) => (
              <div key={log.id} className="rounded-xl border p-4">
                <div className="text-sm text-muted-foreground">
                  {log.date.replaceAll("-", ".")}
                </div>
                <div className="mt-1 text-base font-semibold">{log.title}</div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {log.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}