"use client";

import { FileText, X } from "lucide-react";
import { stageMeta } from "@/lib/devlog/constants";
import { DevlogItem } from "@/lib/devlog/types";
import { formatKoreanDate } from "@/lib/devlog/utils";
import { DevlogInfoBlock } from "./DevlogInfoBlock";

type Props = {
  item: DevlogItem;
  onClose: () => void;
  onEdit: (item: DevlogItem) => void;
  onDelete: (id: number, projectId: number) => void;
};

export function DevlogDetailModal({ item, onClose, onEdit, onDelete }: Props) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-slate-400">
              {item.projectTitle} · {formatKoreanDate(item.date)}
            </div>
            <h3 className="mt-1 text-2xl font-bold text-slate-900">
              {item.title}
            </h3>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {stageMeta[item.stage].label}
              </span>
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <DevlogInfoBlock title="요약" value={item.summary} />
          {/* <DevlogInfoBlock title="진행률" value={`${item.progress ?? 0}%`} /> */}
          <DevlogInfoBlock title="목표" value={item.goal} />
          <DevlogInfoBlock title="설계" value={item.design} />
          <DevlogInfoBlock title="문제 상황" value={item.issue} />
          <DevlogInfoBlock title="해결 방법" value={item.solution} />
          <DevlogInfoBlock title="다음 계획" value={item.nextPlan} />
          <DevlogInfoBlock
            title="커밋 해시 / 브랜치"
            value={item.commitHash}
            mono
          />
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <FileText size={16} />
            상세 내용
          </div>
          <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {item.content}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={() => onEdit(item)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            수정
          </button>
          <button
            onClick={() => onDelete(item.id, item.projectId)}
            className="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}
