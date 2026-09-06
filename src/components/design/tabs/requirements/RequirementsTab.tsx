"use client";

// 경로: src/components/design/tabs/requirements/RequirementsTab.tsx
//
// 표 + 오른쪽 상세 패널.
//
// 각 행에 연결 개수를 붙이고 0이면 붉게 보이게 한다. 표만 훑어도 "이
// 요구사항은 아직 담당 API가 없다"가 눈에 들어오게 하려는 것이다.
// 연결이 이 재설계의 핵심 가치라, 어딘가 깊은 곳이 아니라 목록 첫 화면에서
// 보여야 한다.

import { useMemo } from "react";
import { ListChecks, Plus, Search, Trash2 } from "lucide-react";

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

import type { DesignModel, Priority } from "../../model/schema";
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

const PRIORITY_LABEL: Record<Priority, string> = {
  must: "필수",
  should: "권장",
  could: "선택",
};

const PRIORITY_STYLE: Record<Priority, string> = {
  must: "bg-red-50 text-red-700",
  should: "bg-amber-50 text-amber-700",
  could: "bg-[var(--waivs-surface-soft)] text-[var(--waivs-text-sub)]",
};

export interface RequirementsTabProps {
  model: DesignModel;
  mutations: DesignMutations;
}

export function RequirementsTab({ model, mutations }: RequirementsTabProps) {
  const confirm = useConfirm();
  const keyword = useDesignUiStore((s) => s.search.requirements);
  const setSearch = useDesignUiStore((s) => s.setSearch);
  const selectedId = useDesignUiStore((s) => s.selection.requirementId);
  const select = useDesignUiStore((s) => s.select);

  const filtered = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    if (!needle) return model.requirements;

    return model.requirements.filter(
      (item) =>
        item.name.toLowerCase().includes(needle) ||
        item.category.toLowerCase().includes(needle) ||
        item.description.toLowerCase().includes(needle),
    );
  }, [model.requirements, keyword]);

  const selected = model.requirements.find((item) => item.id === selectedId) ?? null;

  const screenCandidates = model.screens.map((screen) => ({
    id: screen.id,
    label: screen.name,
    hint: screen.key,
  }));

  const apiCandidates = model.apis.map((api) => ({
    id: api.id,
    label: `${api.method} ${api.endpoint}`,
    hint: api.description,
  }));

  const handleAdd = () => {
    const id = mutations.addRequirement({ name: "" });
    select({ requirementId: id });
  };

  const handleRemove = async (id: string, name: string) => {
    const ok = await confirm({
      title: "이 요구사항을 삭제할까요?",
      description: name
        ? `"${name}" 과 여기에 걸린 연결이 함께 사라집니다.`
        : "여기에 걸린 연결이 함께 사라집니다.",
      confirmLabel: "삭제",
      destructive: true,
    });

    if (!ok) return;

    mutations.removeRequirement(id);
    if (selectedId === id) select({ requirementId: null });
  };

  return (
    <div className="flex h-full min-h-0">
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-[var(--waivs-border-soft)] px-6 py-3">
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-[var(--waivs-surface-soft)] px-3">
            <Search className="h-4 w-4 text-[var(--waivs-text-muted)]" />
            <Input
              value={keyword}
              onChange={(event) => setSearch("requirements", event.target.value)}
              placeholder="요구사항 검색"
              className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </div>

          <Button size="sm" onClick={handleAdd} className="gap-1.5">
            <Plus className="h-4 w-4" />
            요구사항 추가
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <EmptyRequirements hasAny={model.requirements.length > 0} onAdd={handleAdd} />
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-[var(--waivs-border)] text-left text-xs text-[var(--waivs-text-sub)]">
                  <th className="w-16 px-6 py-2 font-medium">번호</th>
                  <th className="w-32 px-3 py-2 font-medium">구분</th>
                  <th className="px-3 py-2 font-medium">기능명</th>
                  <th className="w-24 px-3 py-2 font-medium">중요도</th>
                  <th className="w-44 px-3 py-2 font-medium">연결</th>
                  <th className="w-12 px-3 py-2" />
                </tr>
              </thead>

              <tbody>
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => select({ requirementId: item.id })}
                    className={cn(
                      "cursor-pointer border-b border-[var(--waivs-border-soft)] transition hover:bg-[var(--waivs-surface-soft)]",
                      selectedId === item.id && "bg-[#EEF3FF] hover:bg-[#EEF3FF]",
                    )}
                  >
                    <td className="px-6 py-2 text-xs tabular-nums text-[var(--waivs-text-muted)]">
                      {item.code}
                    </td>

                    <td className="px-3 py-2">
                      <Input
                        value={item.category}
                        onChange={(event) =>
                          mutations.updateRequirement(item.id, { category: event.target.value })
                        }
                        onClick={(event) => event.stopPropagation()}
                        className="h-8 border-transparent bg-transparent px-2 hover:border-[var(--waivs-border)]"
                      />
                    </td>

                    <td className="px-3 py-2">
                      <Input
                        value={item.name}
                        placeholder="무엇을 할 수 있어야 하나요?"
                        onChange={(event) =>
                          mutations.updateRequirement(item.id, { name: event.target.value })
                        }
                        onClick={(event) => event.stopPropagation()}
                        className="h-8 border-transparent bg-transparent px-2 hover:border-[var(--waivs-border)]"
                      />
                    </td>

                    <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                      <Select
                        value={item.priority}
                        onValueChange={(value) =>
                          mutations.updateRequirement(item.id, { priority: value as Priority })
                        }
                      >
                        <SelectTrigger
                          className={cn(
                            "h-7 w-full border-0 text-xs font-medium",
                            PRIORITY_STYLE[item.priority],
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(PRIORITY_LABEL) as Priority[]).map((value) => (
                            <SelectItem key={value} value={value}>
                              {PRIORITY_LABEL[value]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>

                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <LinkCountBadge count={item.screenIds.length} label="화면" />
                        <LinkCountBadge count={item.apiIds.length} label="API" />
                      </div>
                    </td>

                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleRemove(item.id, item.name);
                        }}
                        className="rounded-md p-1.5 text-[var(--waivs-text-muted)] transition hover:bg-red-50 hover:text-red-500"
                        aria-label="요구사항 삭제"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <DetailPanel>
        {!selected ? (
          <DetailEmpty
            icon={ListChecks}
            title="요구사항을 선택해 주세요"
            description="왼쪽 표에서 한 줄을 고르면 설명과 연결을 여기서 편집합니다."
          />
        ) : (
          <>
            <DetailPanelHeader
              eyebrow={selected.code || "REQUIREMENT"}
              title={selected.name || "이름 없는 요구사항"}
              icon={ListChecks}
              onClose={() => select({ requirementId: null })}
            />

            <DetailPanelBody>
              <DetailSection tone="soft">
                <DetailField
                  label="설명"
                  hint="코드를 만들 때 이 문장이 주석과 문서에 그대로 쓰입니다."
                >
                  <Textarea
                    value={selected.description}
                    onChange={(event) =>
                      mutations.updateRequirement(selected.id, {
                        description: event.target.value,
                      })
                    }
                    placeholder="이 기능이 무엇을 해야 하는지 한두 문장으로 적어 주세요."
                    className="min-h-[120px] rounded-xl bg-white"
                  />
                </DetailField>
              </DetailSection>

              <DetailSection title="이 요구사항이 나타나는 화면">
                <LinkPicker
                  emptyHint="화면 흐름 탭에서 화면을 먼저 만들어 주세요."
                  candidates={screenCandidates}
                  selectedIds={selected.screenIds}
                  onToggle={(screenId, linked) =>
                    mutations.linkRequirementScreen(selected.id, screenId, linked)
                  }
                />
              </DetailSection>

              <DetailSection title="이 요구사항을 담당하는 API">
                <LinkPicker
                  emptyHint="API 명세 탭에서 API를 먼저 만들어 주세요."
                  candidates={apiCandidates}
                  selectedIds={selected.apiIds}
                  onToggle={(apiId, linked) =>
                    mutations.linkRequirementApi(selected.id, apiId, linked)
                  }
                />
              </DetailSection>

              <DetailDangerButton
                icon={Trash2}
                label="이 요구사항 삭제"
                onClick={() => void handleRemove(selected.id, selected.name)}
              />
            </DetailPanelBody>
          </>
        )}
      </DetailPanel>
    </div>
  );
}

function EmptyRequirements({ hasAny, onAdd }: { hasAny: boolean; onAdd: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 py-20 text-center">
      <p className="text-sm text-[var(--waivs-text-sub)]">
        {hasAny ? "검색 결과가 없습니다." : "아직 요구사항이 없습니다."}
      </p>

      {!hasAny ? (
        <Button size="sm" variant="outline" onClick={onAdd} className="gap-1.5">
          <Plus className="h-4 w-4" />
          직접 추가하기
        </Button>
      ) : null}
    </div>
  );
}
