"use client";

// 경로: src/components/design/tabs/screens/ScreenNode.tsx
//
// 화면 흐름도의 노드.
//
// 폐기한 데이터 플로우 노드와의 차이가 여기 있다. 예전 노드는 "화면 / 서버 /
// DB" 같은 추상적인 상자라 요구사항이나 API와 이어지지 않았다. 이 노드는
// 실제 화면 하나를 가리키고, 그 화면이 어떤 요구사항을 만족시키며 어떤 API를
// 부르는지 카드 위에 그대로 보여 준다. 그래서 이 그림 한 장이 발표 자료가 된다.

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Lock, LogIn } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ScreenNodeData {
  name: string;
  routeKey: string;
  role: string;
  isEntry: boolean;
  requiresAuth: boolean;
  requirementCount: number;
  apiLabels: string[];
  detailed: boolean;
}

const ROLE_LABEL: Record<string, string> = {
  page: "화면",
  modal: "팝업",
  external: "외부",
};

function ScreenNodeComponent({ data, selected }: NodeProps<ScreenNodeData>) {
  return (
    <div
      className={cn(
        "w-[236px] overflow-hidden rounded-2xl border bg-white shadow-sm transition",
        selected ? "border-[#5873F9] shadow-md" : "border-[var(--waivs-border)]",
        data.isEntry && "ring-2 ring-emerald-400/60",
      )}
    >
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !bg-[var(--waivs-text-muted)]" />
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !bg-[#5873F9]" />

      <div className="flex items-center gap-1.5 border-b border-[var(--waivs-border-soft)] px-3 py-2">
        {data.isEntry ? (
          <span
            title="시작 화면"
            className="flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700"
          >
            <LogIn className="h-3 w-3" />
            시작
          </span>
        ) : null}

        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--waivs-text)]">
          {data.name || "이름 없는 화면"}
        </span>

        {data.requiresAuth ? (
          <Lock className="h-3.5 w-3.5 shrink-0 text-[var(--waivs-text-muted)]" aria-label="로그인 필요" />
        ) : null}
      </div>

      <div className="px-3 py-2">
        <p className="truncate font-mono text-[11px] text-[var(--waivs-text-sub)]">
          {data.routeKey || "경로 미지정"}
        </p>

        {data.detailed ? (
          <>
            <div className="mt-2 flex flex-wrap gap-1">
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-medium",
                  data.requirementCount === 0
                    ? "bg-red-50 text-red-600"
                    : "bg-[var(--waivs-surface-soft)] text-[var(--waivs-text-sub)]",
                )}
              >
                요구사항 {data.requirementCount}
              </span>
              <span className="rounded bg-[var(--waivs-surface-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--waivs-text-sub)]">
                {ROLE_LABEL[data.role] ?? data.role}
              </span>
            </div>

            {data.apiLabels.length > 0 ? (
              <ul className="mt-2 space-y-0.5">
                {data.apiLabels.slice(0, 4).map((label) => (
                  <li
                    key={label}
                    className="truncate font-mono text-[10px] text-[var(--waivs-text-sub)]"
                    title={label}
                  >
                    {label}
                  </li>
                ))}
                {data.apiLabels.length > 4 ? (
                  <li className="text-[10px] text-[var(--waivs-text-muted)]">
                    외 {data.apiLabels.length - 4}개
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="mt-2 text-[10px] text-[var(--waivs-text-muted)]">호출하는 API 없음</p>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

export const ScreenNode = memo(ScreenNodeComponent);
