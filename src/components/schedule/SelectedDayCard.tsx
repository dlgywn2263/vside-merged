// 선택한 날짜의 일정 목록(요약 카드들) + 일정 추가/수정/삭제 트리거를 제공하는 우측 상단 카드 컴포넌트

"use client";

import type { CalendarEvent } from "./schedule.types";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Props = {
  selectedDate: Date;
  dayEvents: CalendarEvent[];

  onCreateForDay: () => void;
  onOpenDetail: (id: string) => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
};

export default function SelectedDayCard({
  selectedDate,
  dayEvents,
  onCreateForDay,
  onOpenDetail,
  onEdit,
  onRemove,
}: Props) {
  return (
    <Card className="rounded-2xl h-full">
      <CardHeader>
        <CardTitle>선택 날짜 상세</CardTitle>
        <CardDescription>
          {format(selectedDate, "yyyy.MM.dd (EEE)")}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            일정 {dayEvents.length}개
          </div>
          <Button variant="outline" size="sm" onClick={onCreateForDay}>
            + 이 날짜에 추가
          </Button>
        </div>

        <Separator />

        {dayEvents.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            이 날짜엔 일정이 없습니다.
          </div>
        ) : (
          <div className="space-y-2">
            {dayEvents.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => onOpenDetail(e.id)}
                className="w-full text-left rounded-xl border p-3 hover:bg-muted/40 transition"
                aria-label={`일정 상세 보기: ${e.title}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{e.category}</Badge>
                      <div className="font-semibold truncate">{e.title}</div>
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-sm">
                      <Badge variant="outline">
                        {e.startTime}
                        {e.endTime ? ` ~ ${e.endTime}` : ""}
                      </Badge>
                      {e.location ? (
                        <span className="text-muted-foreground">
                          {e.location}
                        </span>
                      ) : null}
                    </div>

                    {e.description ? (
                      <div className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {e.description}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        onEdit(e.id);
                      }}
                    >
                      수정
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        onRemove(e.id);
                      }}
                    >
                      삭제
                    </Button>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
