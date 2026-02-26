// 일정 카드 클릭 시 열리는 '상세 보기' 다이얼로그(수정/삭제 버튼 포함) 컴포넌트

"use client";

import type { CalendarEvent, Team } from "./schedule.types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;

  event: CalendarEvent | null;
  currentTeam?: Team;

  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
};

export default function EventDetailDialog({
  open,
  onOpenChange,
  event,
  currentTeam,
  onEdit,
  onRemove,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>일정 상세</DialogTitle>
          <DialogDescription>
            일정 내용을 자세히 확인하고 수정/삭제할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        {event ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{event.category}</Badge>
              {event.mode === "team" ? (
                <Badge variant="outline">Team</Badge>
              ) : (
                <Badge variant="outline">Personal</Badge>
              )}
              <div className="text-lg font-semibold">{event.title}</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border p-3">
                <div className="text-xs text-muted-foreground">날짜</div>
                <div className="font-medium">{event.dateISO}</div>
              </div>
              <div className="rounded-xl border p-3">
                <div className="text-xs text-muted-foreground">시간</div>
                <div className="font-medium">
                  {event.startTime}
                  {event.endTime ? ` ~ ${event.endTime}` : ""}
                </div>
              </div>
              <div className="rounded-xl border p-3">
                <div className="text-xs text-muted-foreground">장소</div>
                <div className="font-medium">{event.location ?? "없음"}</div>
              </div>
              <div className="rounded-xl border p-3">
                <div className="text-xs text-muted-foreground">범위</div>
                <div className="font-medium">
                  {event.mode === "team" ? (currentTeam?.name ?? "팀") : "개인"}
                </div>
              </div>
            </div>

            {event.mode === "team" ? (
              <div className="rounded-xl border p-3">
                <div className="text-xs text-muted-foreground">담당/참여자</div>
                <div className="font-medium">
                  {event.assignees?.length
                    ? event.assignees.join(", ")
                    : "없음"}
                </div>
              </div>
            ) : null}

            <div className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground mb-2">설명</div>
              <div className="whitespace-pre-wrap text-sm">
                {event.description?.trim() ? event.description : "설명 없음"}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(event.id);
                }}
              >
                수정
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  onRemove(event.id);
                  onOpenChange(false);
                }}
              >
                삭제
              </Button>
            </div>

            {/* TODO(백엔드):
              - 상세 보기에서 "첨부파일/링크/태그" 같은 확장 필드 추가 가능
              - 권한(팀원만 수정 가능) 체크도 여기서 적용 */}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            선택된 일정이 없습니다.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
