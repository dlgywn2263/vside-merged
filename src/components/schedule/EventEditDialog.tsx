"use client";

import type {
  Category,
  EventStatus,
  Mode,
  ProjectRole,
  ProjectStage,
  Team,
} from "./schedule.types";
import {
  EVENT_STATUSES,
  PROJECT_ROLES,
  PROJECT_STAGES,
} from "./schedule.types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;

  editingId: string | null;
  mode: Mode;
  currentTeam?: Team;

  categories: Category[];

  fTitle?: string;
  setFTitle: (v: string) => void;
  fDesc?: string;
  setFDesc: (v: string) => void;
  fLoc?: string;
  setFLoc: (v: string) => void;
  fCat: Category;
  setFCat: (v: Category) => void;

  fStartDateISO?: string;
  setFStartDateISO: (v: string) => void;
  fEndDateISO?: string;
  setFEndDateISO: (v: string) => void;

  fAssignees?: string;
  setFAssignees: (v: string) => void;

  fStage: ProjectStage;
  setFStage: (v: ProjectStage) => void;

  fRole: ProjectRole;
  setFRole: (v: ProjectRole) => void;

  fStatus: EventStatus;
  setFStatus: (v: EventStatus) => void;

  onSave: () => void;
};

const STAGE_LABELS: Record<ProjectStage, string> = {
  Planning: "기획",
  Design: "설계",
  Implementation: "구현",
  Wrapup: "마무리",
};

const ROLE_LABELS: Record<ProjectRole, string> = {
  Frontend: "프론트엔드",
  Backend: "백엔드",
  Designer: "디자인",
  Fullstack: "풀스택",
};

const STATUS_LABELS: Record<EventStatus, string> = {
  Todo: "예정",
  InProgress: "진행 중",
  Done: "완료",
};

export default function EventEditDialog({
  open,
  onOpenChange,
  editingId,
  mode,
  currentTeam,
  categories,
  fTitle = "",
  setFTitle,
  fDesc = "",
  setFDesc,
  fLoc = "",
  setFLoc,
  fCat,
  setFCat,
  fStartDateISO = "",
  setFStartDateISO,
  fEndDateISO = "",
  setFEndDateISO,
  fAssignees = "",
  setFAssignees,
  fStage,
  setFStage,
  fRole,
  setFRole,
  fStatus,
  setFStatus,
  onSave,
}: Props) {
  const isTitleEmpty = !fTitle.trim();
  const isDateInvalid = !fStartDateISO.trim() || !fEndDateISO.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>{editingId ? "일정 수정" : "일정 추가"}</DialogTitle>
          <DialogDescription>
            {mode === "team"
              ? `팀: ${currentTeam?.name ?? "팀 일정"}`
              : "개인 일정"}{" "}
            · 기간 일정과 작업 속성을 함께 저장합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="title">제목</Label>
            <Input
              id="title"
              value={fTitle}
              onChange={(e) => setFTitle(e.target.value)}
              placeholder="예: 발표 준비, 로그인 API 구현"
            />
            {isTitleEmpty ? (
              <p className="mt-1 text-xs text-muted-foreground">
                제목은 필수입니다.
              </p>
            ) : null}
          </div>

          <div>
            <Label>시작일</Label>
            <Input
              type="date"
              value={fStartDateISO}
              onChange={(e) => setFStartDateISO(e.target.value)}
            />
          </div>

          <div>
            <Label>종료일</Label>
            <Input
              type="date"
              value={fEndDateISO}
              onChange={(e) => setFEndDateISO(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              종료일은 시작일보다 빠를 수 없습니다.
            </p>
          </div>

          <div>
            <Label>카테고리</Label>
            <Select value={fCat} onValueChange={(v) => setFCat(v as Category)}>
              <SelectTrigger>
                <SelectValue placeholder="카테고리 선택" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>장소</Label>
            <Input
              value={fLoc}
              onChange={(e) => setFLoc(e.target.value)}
              placeholder="예: 학교 / 디스코드 / 회의실"
            />
          </div>

          <div>
            <Label>단계</Label>
            <Select
              value={fStage}
              onValueChange={(v) => setFStage(v as ProjectStage)}
            >
              <SelectTrigger>
                <SelectValue placeholder="단계 선택" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_STAGES.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {STAGE_LABELS[stage]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>역할</Label>
            <Select
              value={fRole}
              onValueChange={(v) => setFRole(v as ProjectRole)}
            >
              <SelectTrigger>
                <SelectValue placeholder="역할 선택" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2">
            <Label>상태</Label>
            <Select
              value={fStatus}
              onValueChange={(v) => setFStatus(v as EventStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="상태 선택" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mode === "team" ? (
            <div className="sm:col-span-2">
              <Label>담당/참여자 (쉼표로 구분)</Label>
              <Input
                value={fAssignees}
                onChange={(e) => setFAssignees(e.target.value)}
                placeholder="예: 효주, 민수"
              />
            </div>
          ) : null}

          <div className="sm:col-span-2">
            <Label>설명</Label>
            <Textarea
              value={fDesc}
              onChange={(e) => setFDesc(e.target.value)}
              placeholder="메모/준비물/링크 등"
              rows={5}
            />
          </div>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={onSave} disabled={isTitleEmpty || isDateInvalid}>
            저장
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
