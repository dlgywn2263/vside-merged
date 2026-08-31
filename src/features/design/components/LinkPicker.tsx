"use client";

// 경로: src/features/design/components/LinkPicker.tsx
//
// 요구사항과 화면, API, 테이블을 서로 이어 붙이는 공용 UI.
//
// 연결이 이 기능의 핵심이라 어느 탭에서든 같은 방식으로 걸 수 있어야 한다.
// 그래서 종류별로 따로 만들지 않고 하나로 둔다.

import { useMemo, useState } from "react";
import { Check, Link2, Plus, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface LinkCandidate {
  id: string;
  label: string;
  hint?: string;
}

export interface LinkPickerProps {
  title: string;
  emptyHint: string;
  candidates: LinkCandidate[];
  selectedIds: string[];
  onToggle: (id: string, linked: boolean) => void;
}

export function LinkPicker({
  title,
  emptyHint,
  candidates,
  selectedIds,
  onToggle,
}: LinkPickerProps) {
  const [keyword, setKeyword] = useState("");
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filtered = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    if (!needle) return candidates;

    return candidates.filter(
      (item) =>
        item.label.toLowerCase().includes(needle) ||
        (item.hint ?? "").toLowerCase().includes(needle),
    );
  }, [candidates, keyword]);

  const selectedCandidates = candidates.filter((item) => selected.has(item.id));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">{title}</span>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">
              <Plus className="h-3.5 w-3.5" />
              연결
            </Button>
          </PopoverTrigger>

          <PopoverContent align="end" className="w-72 p-0">
            <div className="border-b border-slate-100 p-2">
              <div className="flex items-center gap-2 rounded-md bg-slate-50 px-2">
                <Search className="h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="검색"
                  className="h-8 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto p-1">
              {filtered.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-slate-400">{emptyHint}</p>
              ) : (
                filtered.map((item) => {
                  const isLinked = selected.has(item.id);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onToggle(item.id, !isLinked)}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition",
                        isLinked ? "bg-indigo-50 text-indigo-900" : "hover:bg-slate-50",
                      )}
                    >
                      <Check
                        className={cn(
                          "mt-0.5 h-3.5 w-3.5 shrink-0",
                          isLinked ? "text-indigo-600" : "text-transparent",
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{item.label || "(이름 없음)"}</span>
                        {item.hint ? (
                          <span className="block truncate text-xs text-slate-400">
                            {item.hint}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {selectedCandidates.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-400">
          아직 연결된 항목이 없습니다.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {selectedCandidates.map((item) => (
            <li key={item.id}>
              <span className="flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-2.5 pr-1 text-xs text-slate-700">
                <Link2 className="h-3 w-3 text-slate-400" />
                <span className="max-w-[180px] truncate">{item.label || "(이름 없음)"}</span>
                <button
                  type="button"
                  onClick={() => onToggle(item.id, false)}
                  className="rounded-full p-0.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                  aria-label="연결 해제"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * 연결 개수를 보여 주는 작은 표시.
 * 0이면 붉게 보이게 해서, 표만 훑어도 "이 요구사항은 아직 담당 API가 없다"가
 * 눈에 들어오게 한다. 연결을 UI의 1급 시민으로 만드는 장치다.
 */
export function LinkCountBadge({
  count,
  label,
  warnWhenZero = true,
}: {
  count: number;
  label: string;
  warnWhenZero?: boolean;
}) {
  const isWarning = warnWhenZero && count === 0;

  return (
    <span
      title={`${label} ${count}개`}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
        isWarning ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600",
      )}
    >
      {label}
      <span className="tabular-nums">{count}</span>
    </span>
  );
}
