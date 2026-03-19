"use client";

import type { CalendarEvent, Mode, ProjectRole } from "./schedule.types";
import { startOfWeek, endOfWeek, format } from "date-fns";
import { ko } from "date-fns/locale";
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
import { ROLE_COLORS } from "./schedule.utils";

type Props = {
  selectedDate: Date;
  weekEvents: CalendarEvent[];
  mode: Mode;

  onOpenDetail: (id: string) => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;

  sortByDateRange: (a: CalendarEvent, b: CalendarEvent) => number;
};

function getPeriodText(event: CalendarEvent) {
  if (event.startDateISO === event.endDateISO) {
    return format(new Date(event.startDateISO), "yyyy.MM.dd (EEE)", {
      locale: ko,
    });
  }

  return `${format(new Date(event.startDateISO), "yyyy.MM.dd (EEE)", {
    locale: ko,
  })} ~ ${format(new Date(event.endDateISO), "yyyy.MM.dd (EEE)", {
    locale: ko,
  })}`;
}

function getRoleBadgeClass(role?: ProjectRole) {
  if (!role) return "";
  return ROLE_COLORS[role];
}

export default function WeekCard({
  selectedDate,
  weekEvents,
  mode,
  onOpenDetail,
  onEdit,
  onRemove,
  sortByDateRange,
}: Props) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>이번 주 일정</CardTitle>
        <CardDescription>
          {format(startOfWeek(selectedDate, { weekStartsOn: 0 }), "MM.dd", {
            locale: ko,
          })}{" "}
          ~{" "}
          {format(endOfWeek(selectedDate, { weekStartsOn: 0 }), "MM.dd", {
            locale: ko,
          })}
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
                .sort(sortByDateRange)
                .map((e) => (
                  <div
                    key={e.id}
                    className="flex items-start justify-between gap-3 rounded-xl border p-3"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenDetail(e.id)}
                      className="min-w-0 flex-1 text-left transition hover:opacity-90"
                      aria-label={`일정 상세 보기: ${e.title}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{e.category}</Badge>

                        {mode === "team" && e.role ? (
                          <Badge className={getRoleBadgeClass(e.role)}>
                            {e.role}
                          </Badge>
                        ) : null}

                        <div className="truncate font-medium">{e.title}</div>
                      </div>

                      <div className="mt-1 text-sm text-muted-foreground">
                        {getPeriodText(e)}
                        {e.location ? ` · ${e.location}` : ""}
                      </div>

                      {e.description ? (
                        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {e.description}
                        </div>
                      ) : null}

                      {mode === "team" && e.assignees?.length ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          담당: {e.assignees.join(", ")}
                        </div>
                      ) : null}
                    </button>

                    <div className="flex shrink-0 gap-2">
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