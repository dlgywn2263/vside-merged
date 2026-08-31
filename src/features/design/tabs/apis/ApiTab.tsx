"use client";

// 경로: src/features/design/tabs/apis/ApiTab.tsx

import { useMemo } from "react";
import { Braces, Plus, Search, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { HTTP_METHODS, type DesignModel, type HttpMethod } from "../../model/schema";
import type { DesignMutations } from "../../realtime/mutations";
import { useDesignUiStore } from "../../store/designUiStore";
import { useConfirm } from "../../components/ConfirmDialog";
import { LinkCountBadge, LinkPicker } from "../../components/LinkPicker";

const METHOD_STYLE: Record<HttpMethod, string> = {
  GET: "bg-emerald-50 text-emerald-700",
  POST: "bg-blue-50 text-blue-700",
  PUT: "bg-amber-50 text-amber-700",
  PATCH: "bg-violet-50 text-violet-700",
  DELETE: "bg-red-50 text-red-700",
};

export interface ApiTabProps {
  model: DesignModel;
  mutations: DesignMutations;
}

export function ApiTab({ model, mutations }: ApiTabProps) {
  const confirm = useConfirm();
  const keyword = useDesignUiStore((s) => s.search.apis);
  const setSearch = useDesignUiStore((s) => s.setSearch);
  const selectedId = useDesignUiStore((s) => s.selection.apiId);
  const select = useDesignUiStore((s) => s.select);

  const filtered = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    if (!needle) return model.apis;

    return model.apis.filter(
      (item) =>
        item.endpoint.toLowerCase().includes(needle) ||
        item.description.toLowerCase().includes(needle) ||
        item.method.toLowerCase().includes(needle),
    );
  }, [model.apis, keyword]);

  const selected = model.apis.find((item) => item.id === selectedId) ?? null;

  const requirementCandidates = model.requirements.map((item) => ({
    id: item.id,
    label: item.name,
    hint: item.code,
  }));

  const screenCandidates = model.screens.map((item) => ({
    id: item.id,
    label: item.name,
    hint: item.key,
  }));

  const tableCandidates = model.erd.tables.map((item) => ({
    id: item.id,
    label: item.name,
    hint: `${item.columns.length}개 컬럼`,
  }));

  const handleAdd = () => {
    const id = mutations.addApi({ method: "GET", endpoint: "/api/" });
    select({ apiId: id });
  };

  const handleRemove = async (id: string, label: string) => {
    const ok = await confirm({
      title: "이 API를 삭제할까요?",
      description: `${label} 과 여기에 걸린 연결이 함께 사라집니다.`,
      confirmLabel: "삭제",
      destructive: true,
    });

    if (!ok) return;

    mutations.removeApi(id);
    if (selectedId === id) select({ apiId: null });
  };

  return (
    <div className="flex h-full min-h-0">
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-3">
          <div className="flex flex-1 items-center gap-2 rounded-lg bg-slate-50 px-3">
            <Search className="h-4 w-4 text-slate-400" />
            <Input
              value={keyword}
              onChange={(event) => setSearch("apis", event.target.value)}
              placeholder="엔드포인트 검색"
              className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </div>

          <Button size="sm" onClick={handleAdd} className="gap-1.5">
            <Plus className="h-4 w-4" />
            API 추가
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-20 text-center">
              <p className="text-sm text-slate-500">
                {model.apis.length > 0 ? "검색 결과가 없습니다." : "아직 API 명세가 없습니다."}
              </p>
              {model.apis.length === 0 ? (
                <Button size="sm" variant="outline" onClick={handleAdd} className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  직접 추가하기
                </Button>
              ) : null}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <li
                  key={item.id}
                  onClick={() => select({ apiId: item.id })}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 px-6 py-2.5 transition hover:bg-slate-50",
                    selectedId === item.id && "bg-indigo-50/60 hover:bg-indigo-50/60",
                  )}
                >
                  <div onClick={(event) => event.stopPropagation()}>
                    <Select
                      value={item.method}
                      onValueChange={(value) =>
                        mutations.updateApi(item.id, { method: value as HttpMethod })
                      }
                    >
                      <SelectTrigger
                        className={cn(
                          "h-7 w-[92px] border-0 text-xs font-semibold",
                          METHOD_STYLE[item.method],
                        )}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HTTP_METHODS.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Input
                    value={item.endpoint}
                    placeholder="/api/..."
                    onChange={(event) =>
                      mutations.updateApi(item.id, { endpoint: event.target.value })
                    }
                    onClick={(event) => event.stopPropagation()}
                    className="h-8 flex-1 border-transparent bg-transparent px-2 font-mono text-sm hover:border-slate-200"
                  />

                  <div className="flex shrink-0 gap-1">
                    <LinkCountBadge count={item.requirementIds.length} label="요구사항" />
                    <LinkCountBadge count={item.screenIds.length} label="화면" warnWhenZero={false} />
                    <LinkCountBadge count={item.tableIds.length} label="테이블" />
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleRemove(item.id, `${item.method} ${item.endpoint}`);
                    }}
                    className="rounded-md p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                    aria-label="API 삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <aside className="w-96 shrink-0 overflow-y-auto border-l border-slate-200 bg-slate-50/60 p-5">
        {!selected ? (
          <p className="mt-8 text-center text-sm text-slate-400">
            API를 선택하면
            <br />
            요청·응답과 연결을 여기서 편집합니다.
          </p>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-slate-500">설명</label>
              <Input
                value={selected.description}
                onChange={(event) =>
                  mutations.updateApi(selected.id, { description: event.target.value })
                }
                placeholder="이 API가 하는 일"
                className="mt-1.5 bg-white"
              />
            </div>

            <JsonField
              label="요청 본문 예시"
              value={selected.request}
              onChange={(value) => mutations.updateApi(selected.id, { request: value })}
            />

            <JsonField
              label="응답 본문 예시"
              value={selected.response}
              onChange={(value) => mutations.updateApi(selected.id, { response: value })}
            />

            <LinkPicker
              title="이 API가 담당하는 요구사항"
              emptyHint="요구사항 탭에서 먼저 만들어 주세요."
              candidates={requirementCandidates}
              selectedIds={selected.requirementIds}
              onToggle={(requirementId, linked) =>
                mutations.linkRequirementApi(requirementId, selected.id, linked)
              }
            />

            <LinkPicker
              title="이 API를 호출하는 화면"
              emptyHint="화면 흐름 탭에서 먼저 만들어 주세요."
              candidates={screenCandidates}
              selectedIds={selected.screenIds}
              onToggle={(screenId, linked) =>
                mutations.linkScreenApi(screenId, selected.id, linked)
              }
            />

            <LinkPicker
              title="이 API가 다루는 테이블"
              emptyHint="ERD 탭에서 테이블을 먼저 만들어 주세요."
              candidates={tableCandidates}
              selectedIds={selected.tableIds}
              onToggle={(tableId, linked) =>
                mutations.linkApiTable(selected.id, tableId, linked)
              }
            />
          </div>
        )}
      </aside>
    </div>
  );
}

/** JSON 예시를 적는 칸. 보기 좋게 정리하는 버튼을 옆에 둔다. */
function JsonField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const format = () => {
    try {
      onChange(JSON.stringify(JSON.parse(value), null, 2));
    } catch {
      // 아직 완성되지 않은 JSON 이라 정리할 수 없다. 조용히 넘어간다.
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-500">{label}</label>
        <button
          type="button"
          onClick={format}
          className="flex items-center gap-1 text-[11px] text-slate-400 transition hover:text-slate-700"
        >
          <Braces className="h-3 w-3" />
          정리
        </button>
      </div>

      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="{ }"
        className="mt-1.5 min-h-[96px] bg-white font-mono text-xs"
      />
    </div>
  );
}
