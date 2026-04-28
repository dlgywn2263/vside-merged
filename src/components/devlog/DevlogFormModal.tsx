"use client";

import { X } from "lucide-react";
import {
  DevlogItem,
  FormValue,
  ProjectOption,
  StageType,
} from "@/lib/devlog/types";
import { DevlogField } from "./DevlogField";

type Props = {
  editingTarget: DevlogItem | null;
  form: FormValue;
  projects: ProjectOption[];
  setForm: React.Dispatch<React.SetStateAction<FormValue>>;
  onClose: () => void;
  onSubmit: () => void;
  isStageFixed?: boolean; 
  isProjectFixed?: boolean; // 💡 [NEW] 프로젝트 선택창 고정 옵션 추가!
};

export function DevlogFormModal({
  editingTarget,
  form,
  projects,
  setForm,
  onClose,
  onSubmit,
  isStageFixed = false, 
  isProjectFixed = false, // 💡 [NEW] 기본값 false (대시보드에서는 자유롭게 선택 가능)
}: Props) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">
              {editingTarget ? "개발일지 수정" : "새 개발일지 작성"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              단계와 일정 기준으로 개발 흐름을 기록합니다.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          
          <DevlogField label="프로젝트" className="md:col-span-2">
            <select
              value={form.projectId}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, projectId: e.target.value }))
              }
              // 💡 [핵심] IDE에서 열었을 때(isProjectFixed) 선택창을 강제로 잠급니다!
              disabled={isProjectFixed || !!editingTarget} 
              className={`h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none ${
                isProjectFixed || editingTarget ? "bg-slate-50 cursor-not-allowed opacity-70" : "bg-white"
              }`}
            >
              {projects.length === 0 && <option value="">프로젝트 없음</option>}
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </DevlogField>

          <DevlogField label="제목" className="md:col-span-2">
            <input
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="예: 로그인 API 구현"
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none"
            />
          </DevlogField>

          <DevlogField label="단계">
            <select
              value={form.stage}
              disabled={isStageFixed} 
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  stage: e.target.value as StageType,
                }))
              }
              className={`h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none ${
                isStageFixed ? "bg-slate-50 cursor-not-allowed opacity-70" : ""
              }`}
            >
              <option value="planning">기획</option>
              <option value="design">설계</option>
              <option value="implementation">구현</option>
              <option value="wrapup">마무리</option>
            </select>
          </DevlogField>

          <DevlogField label="날짜">
            <input
              type="date"
              value={form.date}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, date: e.target.value }))
              }
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none"
            />
          </DevlogField>

          <DevlogField label="요약" className="md:col-span-2">
            <input
              value={form.summary}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, summary: e.target.value }))
              }
              placeholder="한 줄 요약"
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none"
            />
          </DevlogField>

          <DevlogField label="태그" className="md:col-span-2">
            <input
              value={form.tagsText}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, tagsText: e.target.value }))
              }
              placeholder="React, API, UI"
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none"
            />
          </DevlogField>

          <DevlogField label="목표">
            <textarea
              value={form.goal}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, goal: e.target.value }))
              }
              placeholder="이번 작업의 목표"
              className="min-h-[110px] w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none"
            />
          </DevlogField>

          <DevlogField label="설계">
            <textarea
              value={form.design}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, design: e.target.value }))
              }
              placeholder="구조, 흐름, 설계 방향"
              className="min-h-[110px] w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none"
            />
          </DevlogField>

          <DevlogField label="문제 상황">
            <textarea
              value={form.issue}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, issue: e.target.value }))
              }
              placeholder="막혔던 점, 에러, 고민"
              className="min-h-[110px] w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none"
            />
          </DevlogField>

          <DevlogField label="해결 방법">
            <textarea
              value={form.solution}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, solution: e.target.value }))
              }
              placeholder="해결한 방식, 수정 포인트"
              className="min-h-[110px] w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none"
            />
          </DevlogField>

          <DevlogField label="다음 계획" className="md:col-span-2">
            <textarea
              value={form.nextPlan}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, nextPlan: e.target.value }))
              }
              placeholder="다음에 이어서 할 작업"
              className="min-h-[110px] w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none"
            />
          </DevlogField>

          <DevlogField label="커밋 해시 / 브랜치" className="md:col-span-2">
            <input
              value={form.commitHash}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, commitHash: e.target.value }))
              }
              placeholder="예: feat/devlog-board, a1b2c3d"
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none"
            />
          </DevlogField>

          <DevlogField label="상세 내용" className="md:col-span-2">
            <textarea
              value={form.content}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, content: e.target.value }))
              }
              placeholder="구현 내용, 테스트 결과, 회고 등을 자세히 작성"
              className="min-h-[240px] w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none"
            />
          </DevlogField>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            취소
          </button>
          <button
            onClick={onSubmit}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            {editingTarget ? "수정 저장" : "작성 완료"}
          </button>
        </div>
      </div>
    </div>
  );
}