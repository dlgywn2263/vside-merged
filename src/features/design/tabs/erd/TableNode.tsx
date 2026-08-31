"use client";

// 경로: src/features/design/tabs/erd/TableNode.tsx
//
// ERD 다이어그램의 테이블 카드.
//
// 여기서는 편집하지 않는다. 예전 화면은 노드 안에서 컬럼을 하나씩 추가하고
// 이름을 고치게 했는데, 테이블이 열 개만 넘어가도 견디기 어려웠다. 편집은
// 왼쪽 텍스트 패널에서 하고, 이 카드는 결과를 보여 주는 역할만 한다.

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { KeyRound, Link2 } from "lucide-react";

import { cn } from "@/lib/utils";

export interface TableNodeColumn {
  id: string;
  name: string;
  type: string;
  isPk: boolean;
  isFk: boolean;
  nullable: boolean;
}

export interface TableNodeData {
  name: string;
  columns: TableNodeColumn[];
  /** 어떤 API도 이 테이블을 쓰지 않는 경우 표시한다. */
  unused: boolean;
}

function TableNodeComponent({ data, selected }: NodeProps<TableNodeData>) {
  return (
    <div
      className={cn(
        "w-[248px] overflow-hidden rounded-xl border bg-white shadow-sm transition",
        selected ? "border-indigo-500 shadow-md" : "border-slate-200",
      )}
    >
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !bg-slate-400" />
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !bg-indigo-500" />

      <div className="flex items-center gap-2 bg-slate-900 px-3 py-2">
        <span className="min-w-0 flex-1 truncate font-mono text-sm font-semibold text-white">
          {data.name || "이름 없음"}
        </span>

        {data.unused ? (
          <span
            title="이 테이블을 사용하는 API가 없습니다"
            className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-300"
          >
            미사용
          </span>
        ) : null}
      </div>

      <ul className="divide-y divide-slate-50">
        {data.columns.length === 0 ? (
          <li className="px-3 py-2 text-xs text-slate-400">컬럼 없음</li>
        ) : (
          data.columns.map((column) => (
            <li key={column.id} className="flex items-center gap-2 px-3 py-1.5">
              <span className="flex w-4 shrink-0 justify-center">
                {column.isPk ? (
                  <KeyRound className="h-3 w-3 text-amber-500" aria-label="기본키" />
                ) : column.isFk ? (
                  <Link2 className="h-3 w-3 text-indigo-400" aria-label="외래키" />
                ) : null}
              </span>

              <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-700">
                {column.name}
              </span>

              <span className="shrink-0 font-mono text-[10px] text-slate-400">
                {column.type}
                {column.nullable ? "" : " *"}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export const TableNode = memo(TableNodeComponent);
