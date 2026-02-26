// 선택 주간의 일정 리스트(스크롤) + 상세/수정/삭제 트리거를 제공하는 좌측 하단 카드 컴포넌트

"use client";

import type { CalendarEvent, Mode } from "./schedule.types";
import { startOfWeek, endOfWeek, format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

type Props = {
  selectedDate: Date;
  weekEvents: CalendarEvent[];
  mode: Mode;

  onOpenDetail: (id: string) => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;

  sortByDateTime: (a: CalendarEvent, b: CalendarEvent) => number;
};

export default function WeekCard({
  selectedDate,
  weekEvents,
  mode,
  onOpenDetail,
  onEdit,
  onRemove,
  sortByDateTime,
}: Props) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>이번 주 일정</CardTitle>
        <CardDescription>
          {format(startOfWeek(selectedDate, { weekStartsOn: 0 }), "MM.dd")} ~{" "}
          {format(endOfWeek(selectedDate, { weekStartsOn: 0 }), "MM.dd")}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {weekEvents.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            이번 주에는 일정이 없습니다.
          </div>
        ) : (
          <ScrollArea className="h-[320px] pr-3">
            <div className="space-y-2">
              {weekEvents
                .slice()
                .sort(sortByDateTime)
                .map((e) => (
                  <div
                    key={e.id}
                    className="flex items-start justify-between gap-3 rounded-xl border p-3"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenDetail(e.id)}
                      className="min-w-0 text-left hover:opacity-90 transition"
                      aria-label={`일정 상세 보기: ${e.title}`}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{e.category}</Badge>
                        <div className="font-medium truncate">{e.title}</div>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {e.dateISO} · {e.startTime}
                        {e.endTime ? ` ~ ${e.endTime}` : ""}{" "}
                        {e.location ? `· ${e.location}` : ""}
                      </div>
                      {mode === "team" && e.assignees?.length ? (
                        <div className="text-xs text-muted-foreground mt-1">
                          담당: {e.assignees.join(", ")}
                        </div>
                      ) : null}
                    </button>

                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(e.id)}
                      >
                        수정
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onRemove(e.id)}
                      >
                        삭제
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
