// 선택한 날짜의 일정 목록(요약 카드들) + 일정 추가/수정/삭제 트리거를 제공하는 우측 상단 카드 컴포넌트

"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { CalendarEvent } from "./schedule.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STAGE_BADGE_COLORS, STAGE_LABELS } from "./schedule.colors";

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
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>선택 날짜 일정</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {format(selectedDate, "yyyy.MM.dd (EEE)", { locale: ko })}
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {dayEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground text-center">
            해당 날짜에 포함된 일정이 없습니다.
          </div>
        ) : (
          dayEvents.map((event) => (
            <div key={event.id} className="rounded-xl border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="font-medium truncate">
                  {event.workspaceName}
                </div>
                <Badge variant="secondary">{event.category}</Badge>

                {event.stage ? (
                  <Badge className={STAGE_BADGE_COLORS[event.stage]}>
                    {STAGE_LABELS[event.stage]}
                  </Badge>
                ) : null}
              </div>
              <div className="font-medium truncate">{event.title}</div>
              <div className="text-sm text-muted-foreground">
                {event.startDateISO}
                {event.startDateISO !== event.endDateISO
                  ? ` ~ ${event.endDateISO}`
                  : ""}
              </div>

              {event.location ? (
                <div className="text-sm">{event.location}</div>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenDetail(event.id)}
                >
                  상세
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(event.id)}
                >
                  수정
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onRemove(event.id)}
                >
                  삭제
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
