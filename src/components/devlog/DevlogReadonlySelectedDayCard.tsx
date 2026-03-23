"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type {
  CalendarEvent,
  ProjectStage,
} from "@/components/schedule/schedule.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Props = {
  selectedDate: Date;
  dayEvents: CalendarEvent[];
};

const STAGE_LABELS: Record<ProjectStage, string> = {
  Planning: "기획",
  Design: "설계",
  Implementation: "구현",
  Wrapup: "마무리",
};

const STAGE_BADGE_CLASS: Record<ProjectStage, string> = {
  Planning: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  Design: "bg-pink-100 text-pink-700 hover:bg-pink-100",
  Implementation: "bg-purple-100 text-purple-700 hover:bg-purple-100",
  Wrapup: "bg-green-100 text-green-700 hover:bg-green-100",
};

export default function DevlogReadonlySelectedDayCard({
  selectedDate,
  dayEvents,
}: Props) {
  return (
    <Card className="rounded-2xl border bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-[18px] font-bold">선택 날짜 일정</CardTitle>
        <p className="text-sm text-muted-foreground">
          {format(selectedDate, "yyyy.MM.dd (EEE)", { locale: ko })}
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {dayEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            해당 날짜에 포함된 일정이 없습니다.
          </div>
        ) : (
          dayEvents.map((event) => (
            <div key={event.id} className="rounded-xl border p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{event.category}</Badge>

                {event.stage ? (
                  <Badge className={STAGE_BADGE_CLASS[event.stage]}>
                    {STAGE_LABELS[event.stage]}
                  </Badge>
                ) : null}

                <div className="min-w-0 flex-1 truncate font-medium">
                  {event.title}
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                {event.startDateISO}
                {event.startDateISO !== event.endDateISO
                  ? ` ~ ${event.endDateISO}`
                  : ""}
              </div>

              {event.location ? (
                <div className="text-sm">{event.location}</div>
              ) : null}

              {event.description ? (
                <div className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                  {event.description}
                </div>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
