// 일정 추가/수정(CRUD) 입력 폼 다이얼로그를 렌더링하는 컴포넌트

"use client";

import * as React from "react";
import type { Category, Mode, Team } from "./schedule.types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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

  // 폼 상태/세터
  fTitle: string;
  setFTitle: (v: string) => void;
  fDesc: string;
  setFDesc: (v: string) => void;
  fLoc: string;
  setFLoc: (v: string) => void;
  fCat: Category;
  setFCat: (v: Category) => void;
  fDateISO: string;
  setFDateISO: (v: string) => void;
  fStart: string;
  setFStart: (v: string) => void;
  fEnd: string;
  setFEnd: (v: string) => void;
  fAssignees: string;
  setFAssignees: (v: string) => void;

  onSave: () => void;
};

export default function EventEditDialog({
  open,
  onOpenChange,
  editingId,
  mode,
  currentTeam,
  categories,
  fTitle,
  setFTitle,
  fDesc,
  setFDesc,
  fLoc,
  setFLoc,
  fCat,
  setFCat,
  fDateISO,
  setFDateISO,
  fStart,
  setFStart,
  fEnd,
  setFEnd,
  fAssignees,
  setFAssignees,
  onSave,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>{editingId ? "일정 수정" : "일정 추가"}</DialogTitle>
          <DialogDescription>
            {mode === "team" ? `팀: ${currentTeam?.name}` : "개인 일정"} ·
            저장하면 즉시 화면에 반영됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="title">제목</Label>
            <Input
              id="title"
              value={fTitle}
              onChange={(e) => setFTitle(e.target.value)}
              placeholder="예: 팀 회의, 발표 준비"
            />
            {!fTitle.trim() ? (
              <p className="text-xs text-muted-foreground mt-1">
                제목은 필수입니다.
              </p>
            ) : null}
          </div>

          <div>
            <Label>날짜</Label>
            <Input
              value={fDateISO}
              onChange={(e) => setFDateISO(e.target.value)}
              placeholder="yyyy-MM-dd"
            />
            <p className="text-xs text-muted-foreground mt-1">예: 2026-02-22</p>
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
            <Label>시작</Label>
            <Input
              value={fStart}
              onChange={(e) => setFStart(e.target.value)}
              placeholder="HH:mm"
            />
          </div>

          <div>
            <Label>종료</Label>
            <Input
              value={fEnd}
              onChange={(e) => setFEnd(e.target.value)}
              placeholder="HH:mm (선택)"
            />
            <p className="text-xs text-muted-foreground mt-1">
              종료가 시작보다 빠르면 저장되지 않습니다.
            </p>
          </div>

          <div className="sm:col-span-2">
            <Label>장소</Label>
            <Input
              value={fLoc}
              onChange={(e) => setFLoc(e.target.value)}
              placeholder="예: 디스코드 / 학교 / 회의실"
            />
          </div>

          {mode === "team" ? (
            <div className="sm:col-span-2">
              <Label>담당/참여자 (쉼표로 구분)</Label>
              <Input
                value={fAssignees}
                onChange={(e) => setFAssignees(e.target.value)}
                placeholder="예: 효주, 민수"
              />
              {/* TODO(백엔드): 멤버 선택 UI(Checkbox/Combobox)로 바꾸고 memberId 저장 */}
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

        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={onSave}
            disabled={!fTitle.trim()}
            title={!fTitle.trim() ? "제목을 입력하세요" : ""}
          >
            저장
          </Button>
        </div>

        {/* TODO(백엔드): 여기서 로딩/에러 토스트(sonner) 붙이면 UX 더 좋아짐 */}
      </DialogContent>
    </Dialog>
  );
}
