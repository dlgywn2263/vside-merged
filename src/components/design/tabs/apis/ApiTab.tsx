"use client";

// 경로: src/components/design/tabs/apis/ApiTab.tsx

import { useMemo } from "react";
import { Braces, Plus, Route, Search, Trash2 } from "lucide-react";

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
import {
  DetailDangerButton,
  DetailEmpty,
  DetailField,
  DetailPanel,
  DetailPanelBody,
  DetailPanelHeader,
  DetailSection,
} from "../../components/DetailPanel";

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
        <div className="flex items-center gap-2 border-b border-[var(--waivs-border-soft)] px-6 py-3">
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-[var(--waivs-surface-soft)] px-3">
            <Search className="h-4 w-4 text-[var(--waivs-text-muted)]" />
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
              <p className="text-sm text-[var(--waivs-text-sub)]">
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
            <ul className="divide-y divide-[var(--waivs-border-soft)]">
              {filtered.map((item) => (
                <li
                  key={item.id}
                  onClick={() => select({ apiId: item.id })}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 px-6 py-2.5 transition hover:bg-[var(--waivs-surface-soft)]",
                    selectedId === item.id && "bg-[#EEF3FF] hover:bg-[#EEF3FF]",
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
                    className="h-8 flex-1 border-transparent bg-transparent px-2 font-mono text-sm hover:border-[var(--waivs-border)]"
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
                    className="rounded-md p-1.5 text-[var(--waivs-text-muted)] transition hover:bg-red-50 hover:text-red-500"
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

      <DetailPanel width="w-96">
        {!selected ? (
          <DetailEmpty
            icon={Route}
            title="API를 선택해 주세요"
            description="왼쪽 목록에서 하나를 고르면 요청·응답과 연결을 여기서 편집합니다."
          />
        ) : (
          <>
            <DetailPanelHeader
              eyebrow={selected.method}
              title={selected.endpoint || "경로 없음"}
              icon={Route}
              onClose={() => select({ apiId: null })}
            />

            <DetailPanelBody>
              <DetailSection tone="soft">
                <DetailField label="설명">
                  <Input
                    value={selected.description}
                    onChange={(event) =>
                      mutations.updateApi(selected.id, { description: event.target.value })
                    }
                    placeholder="이 API가 하는 일"
                    className="rounded-xl bg-white"
                  />
                </DetailField>
              </DetailSection>

              <DetailSection title="요청·응답 예시">
                <div className="space-y-3">
                  <JsonField
                    label="요청 본문"
                    value={selected.request}
                    onChange={(value) => mutations.updateApi(selected.id, { request: value })}
                  />

                  <JsonField
                    label="응답 본문"
                    value={selected.response}
                    onChange={(value) => mutations.updateApi(selected.id, { response: value })}
                  />
                </div>
              </DetailSection>

              <DetailSection title="이 API가 담당하는 요구사항">
                <LinkPicker
                  emptyHint="요구사항 탭에서 먼저 만들어 주세요."
                  candidates={requirementCandidates}
                  selectedIds={selected.requirementIds}
                  onToggle={(requirementId, linked) =>
                    mutations.linkRequirementApi(requirementId, selected.id, linked)
                  }
                />
              </DetailSection>

              <DetailSection title="이 API를 호출하는 화면">
                <LinkPicker
                  emptyHint="화면 흐름 탭에서 먼저 만들어 주세요."
                  candidates={screenCandidates}
                  selectedIds={selected.screenIds}
                  onToggle={(screenId, linked) =>
                    mutations.linkScreenApi(screenId, selected.id, linked)
                  }
                />
              </DetailSection>

              <DetailSection title="이 API가 다루는 테이블">
                <LinkPicker
                  emptyHint="ERD 탭에서 테이블을 먼저 만들어 주세요."
                  candidates={tableCandidates}
                  selectedIds={selected.tableIds}
                  onToggle={(tableId, linked) =>
                    mutations.linkApiTable(selected.id, tableId, linked)
                  }
                />
              </DetailSection>

              <DetailDangerButton
                icon={Trash2}
                label="이 API 삭제"
                onClick={() =>
                  void handleRemove(selected.id, `${selected.method} ${selected.endpoint}`)
                }
              />
            </DetailPanelBody>
          </>
        )}
      </DetailPanel>
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
        <label className="text-[11px] font-bold text-[var(--waivs-text-sub)]">{label}</label>
        <button
          type="button"
          onClick={format}
          className="flex items-center gap-1 text-[11px] text-[var(--waivs-text-muted)] transition hover:text-[var(--waivs-text-sub)]"
        >
          <Braces className="h-3 w-3" />
          정리
        </button>
      </div>

      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="{ }"
        className="mt-1.5 min-h-[96px] rounded-xl bg-white font-mono text-xs"
      />
    </div>
  );
}
