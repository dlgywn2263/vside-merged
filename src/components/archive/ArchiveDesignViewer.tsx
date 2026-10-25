"use client";

// 경로: src/components/archive/ArchiveDesignViewer.tsx
//
// 자료실 "설계 문서" 탭. 설계관리에서 작성한 문서를 읽기 전용으로 보여 준다.
//
// 설계관리 화면과 내용이 어긋나지 않도록 두 가지를 지킨다.
//  1. 데이터: 설계관리 페이지가 여는 것과 같은 문서(GET /design/doc 의 projection)를
//     읽는다. 조회만 하고 시드·스냅샷 저장은 부르지 않는다.
//     아직 설계관리를 한 번도 열지 않아 문서가 없으면(needsSeed), 설계관리가
//     처음 열 때 쓰는 것과 같은 변환(legacyToModel)으로 예전 데이터를 보여 준다.
//  2. 그림: ERD·화면 흐름은 설계관리 편집 화면·PDF 출력과 같은 노드 컴포넌트와
//     노드 변환 함수(render/diagramNodes)를 그대로 쓴다.
//
// 설계관리의 탭 컴포넌트(RequirementsTab 등)는 입력칸과 mutations 에 묶여 있어
// 그대로 띄울 수 없다. 표·목록·상세 패널은 같은 열 구성과 스타일을 따르되
// 입력칸 대신 글자로 보여 준다.

import { useEffect, useMemo, useState } from "react";
import ReactFlow, { Background, Controls, ReactFlowProvider } from "reactflow";
import "reactflow/dist/style.css";
import {
  CheckCircle2,
  Code2,
  Database,
  GitBranch,
  ListChecks,
  Loader2,
  Route,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { fetchDesignDocApi } from "@/components/design/api/designDocApi";
import { LinkCountBadge } from "@/components/design/components/LinkPicker";
import {
  DetailField,
  DetailPanel,
  DetailPanelBody,
  DetailPanelHeader,
  DetailSection,
} from "@/components/design/components/DetailPanel";
import { legacyToModel } from "@/components/design/model/legacy";
import {
  createEmptyModel,
  type DesignModel,
  type HttpMethod,
  type Priority,
} from "@/components/design/model/schema";
import {
  buildRelationEdges,
  buildScreenEdges,
  buildScreenNodes,
  buildTableNodes,
} from "@/components/design/render/diagramNodes";
import { ScreenNode } from "@/components/design/tabs/screens/ScreenNode";
import { TableNode } from "@/components/design/tabs/erd/TableNode";

export type ArchiveDesignSection = "requirements" | "api" | "erd" | "flow";

const SECTIONS: {
  key: ArchiveDesignSection;
  label: string;
  icon: LucideIcon;
  count: (model: DesignModel) => number;
}[] = [
  { key: "requirements", label: "요구사항", icon: CheckCircle2, count: (m) => m.requirements.length },
  { key: "api", label: "API 명세", icon: Code2, count: (m) => m.apis.length },
  { key: "erd", label: "ERD", icon: Database, count: (m) => m.erd.tables.length },
  { key: "flow", label: "화면 흐름", icon: GitBranch, count: (m) => m.screens.length },
];

// RequirementsTab · ApiTab 과 같은 값. 그쪽 상수는 export 되지 않아 옮겨 적었다.
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

const METHOD_STYLE: Record<HttpMethod, string> = {
  GET: "bg-emerald-50 text-emerald-700",
  POST: "bg-blue-50 text-blue-700",
  PUT: "bg-amber-50 text-amber-700",
  PATCH: "bg-violet-50 text-violet-700",
  DELETE: "bg-red-50 text-red-700",
};

const screenNodeTypes = { screenNode: ScreenNode };
const tableNodeTypes = { tableNode: TableNode };

// 읽기 전용이지만 넓은 다이어그램을 읽을 수 있도록 이동·확대는 남긴다.
const VIEW_ONLY = {
  nodesDraggable: false,
  nodesConnectable: false,
  elementsSelectable: false,
  panOnDrag: true,
  zoomOnScroll: true,
  zoomOnPinch: true,
} as const;

// 자료실이 예전 API 로 받아 둔 데이터 모양. id 가 숫자로 오기도 한다.
type LegacyRequirementInput = {
  id: string | number;
  category?: string;
  name?: string;
  description?: string;
};

type LegacyApiSpecInput = {
  id: string | number;
  method?: string;
  endpoint?: string;
  description?: string;
  request?: string;
  response?: string;
};

type LegacyDocumentInput = {
  erdNodesJson?: string | null;
  erdEdgesJson?: string | null;
  flowNodesJson?: string | null;
  flowEdgesJson?: string | null;
} | null;

// 어느 프로젝트를 읽은 결과인지 함께 둔다. 프로젝트를 바꾸면 workspaceId 가 달라져
// 저절로 "불러오는 중"이 되므로, 이전 프로젝트 문서가 잠깐 보이지 않는다.
type LoadedDoc = {
  workspaceId: string;
  /** 설계관리 문서가 아직 없으면(needsSeed) null — 예전 데이터로 대신 보여 준다. */
  model: DesignModel | null;
  failed: boolean;
};

export function ArchiveDesignViewer({
  workspaceId,
  section,
  onSectionChange,
  keyword,
  legacyRequirements,
  legacyApiSpecs,
  legacyDocument,
  legacyLoading,
  legacyError,
}: {
  workspaceId: string;
  section: ArchiveDesignSection;
  onSectionChange: (section: ArchiveDesignSection) => void;
  /** 자료실 툴바의 검색어. 요구사항·API 목록에만 쓴다(설계관리 검색과 같은 기준). */
  keyword: string;
  /** 문서가 아직 없을 때 대신 보여 줄 예전 데이터(자료실이 이미 받아 둔 것). */
  legacyRequirements: LegacyRequirementInput[];
  legacyApiSpecs: LegacyApiSpecInput[];
  legacyDocument: LegacyDocumentInput;
  legacyLoading: boolean;
  legacyError: string;
}) {
  const [loaded, setLoaded] = useState<LoadedDoc | null>(null);

  useEffect(() => {
    if (!workspaceId) return;

    let cancelled = false;

    fetchDesignDocApi(workspaceId)
      .then((doc) => {
        if (cancelled) return;
        const hasDoc = !doc.needsSeed && Boolean(doc.projection);
        setLoaded({
          workspaceId,
          model: hasDoc ? createEmptyModel(doc.projection) : null,
          failed: false,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setLoaded({ workspaceId, model: null, failed: true });
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const current = loaded?.workspaceId === workspaceId ? loaded : null;

  const fallbackModel = useMemo(
    () =>
      legacyToModel({
        requirements: legacyRequirements.map((item) => ({ ...item, id: String(item.id) })),
        apiSpecs: legacyApiSpecs.map((item) => ({ ...item, id: String(item.id) })),
        document: {
          erdNodesJson: legacyDocument?.erdNodesJson ?? undefined,
          erdEdgesJson: legacyDocument?.erdEdgesJson ?? undefined,
          flowNodesJson: legacyDocument?.flowNodesJson ?? undefined,
          flowEdgesJson: legacyDocument?.flowEdgesJson ?? undefined,
        },
      }),
    [legacyRequirements, legacyApiSpecs, legacyDocument],
  );

  const usesFallback = Boolean(current && !current.model);

  const model = current ? current.model ?? fallbackModel : null;

  const isLoading = !current || (usesFallback && legacyLoading);

  // 대신 보여 주는 예전 데이터마저 못 받았으면 그 이유를, 문서만 못 받았으면 사본임을 알린다
  const notice = !current || !usesFallback
    ? ""
    : legacyError
      ? legacyError
      : current.failed
        ? "설계관리 문서를 불러오지 못해 마지막으로 저장된 사본을 보여 줍니다."
        : "";

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* 문서 선택 버튼. 내용이 바뀌어도 이 줄은 움직이지 않는다 */}
      <div
        role="tablist"
        aria-label="설계 문서"
        className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-slate-200 px-4 py-2.5 lg:px-5"
      >
        {SECTIONS.map((item) => {
          const Icon = item.icon;
          const isActive = section === item.key;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSectionChange(item.key)}
              className={cn(
                "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors",
                isActive
                  ? "bg-[#5873F9] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900",
              )}
            >
              <Icon size={14} />
              {item.label}
              {model ? (
                <span
                  className={cn(
                    "tabular-nums",
                    isActive ? "text-white/80" : "text-slate-400",
                  )}
                >
                  {item.count(model)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {notice && !isLoading ? (
        <p className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 lg:px-5">
          {notice}
        </p>
      ) : null}

      {/* 문서 내용. 긴 목록은 이 영역 안에서 스크롤하고, 다이어그램은 영역을 채운다 */}
      <div className="relative flex min-h-0 min-w-0 flex-1">
        {isLoading || !model ? (
          <div className="flex flex-1 items-center justify-center gap-2 py-20 text-sm font-medium text-slate-500">
            <Loader2 size={16} className="animate-spin text-[#5873F9]" />
            설계 문서를 불러오는 중입니다.
          </div>
        ) : section === "requirements" ? (
          <RequirementsView model={model} keyword={keyword} />
        ) : section === "api" ? (
          <ApiView model={model} keyword={keyword} />
        ) : section === "erd" ? (
          <ErdView model={model} />
        ) : (
          <ScreenFlowView model={model} />
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   요구사항 — RequirementsTab 의 표와 같은 열(번호·구분·기능명·중요도·연결)
---------------------------------------------------------------- */
function RequirementsView({ model, keyword }: { model: DesignModel; keyword: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  if (filtered.length === 0) {
    return (
      <ViewEmpty
        text={model.requirements.length > 0 ? "검색 결과가 없습니다." : "작성된 요구사항이 없습니다."}
      />
    );
  }

  return (
    <>
      <section className="min-w-0 flex-1 overflow-x-auto lg:overflow-y-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-[var(--waivs-border)] text-left text-xs text-[var(--waivs-text-sub)]">
              <th className="w-24 whitespace-nowrap px-6 py-2 font-medium">번호</th>
              <th className="w-32 px-3 py-2 font-medium">구분</th>
              <th className="px-3 py-2 font-medium">기능명</th>
              <th className="w-24 px-3 py-2 font-medium">중요도</th>
              <th className="w-44 px-3 py-2 font-medium">연결</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  "cursor-pointer border-b border-[var(--waivs-border-soft)] transition hover:bg-[var(--waivs-surface-soft)]",
                  selectedId === item.id && "bg-[#EEF3FF] hover:bg-[#EEF3FF]",
                )}
              >
                <td className="whitespace-nowrap px-6 py-2.5 text-xs tabular-nums text-[var(--waivs-text-muted)]">
                  {item.code}
                </td>
                <td className="px-3 py-2.5 text-[var(--waivs-text-sub)]">
                  {item.category || "-"}
                </td>
                <td className="px-3 py-2.5 font-medium text-[var(--waivs-text)] [overflow-wrap:anywhere]">
                  {item.name || "이름 없는 요구사항"}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={cn(
                      "inline-flex h-6 items-center rounded-md px-2 text-xs font-medium",
                      PRIORITY_STYLE[item.priority],
                    )}
                  >
                    {PRIORITY_LABEL[item.priority]}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    <LinkCountBadge count={item.screenIds.length} label="화면" />
                    <LinkCountBadge count={item.apiIds.length} label="API" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {selected ? (
        <SidePanel>
          <DetailPanel>
            <DetailPanelHeader
              eyebrow={selected.code || "REQUIREMENT"}
              title={selected.name || "이름 없는 요구사항"}
              icon={ListChecks}
              onClose={() => setSelectedId(null)}
            />
            <DetailPanelBody>
              <DetailSection tone="soft">
                <DetailField label="설명">
                  <ReadOnlyText value={selected.description} empty="설명이 없습니다." />
                </DetailField>
              </DetailSection>
              <DetailSection title="이 요구사항이 나타나는 화면">
                <LinkedList
                  items={selected.screenIds.map((id) => {
                    const screen = model.screens.find((item) => item.id === id);
                    return { id, label: screen?.name ?? id, hint: screen?.key };
                  })}
                  empty="연결된 화면이 없습니다."
                />
              </DetailSection>
              <DetailSection title="이 요구사항을 담당하는 API">
                <LinkedList
                  items={selected.apiIds.map((id) => {
                    const api = model.apis.find((item) => item.id === id);
                    return {
                      id,
                      label: api ? `${api.method} ${api.endpoint}` : id,
                      hint: api?.description,
                    };
                  })}
                  empty="연결된 API가 없습니다."
                />
              </DetailSection>
            </DetailPanelBody>
          </DetailPanel>
        </SidePanel>
      ) : null}
    </>
  );
}

/* ---------------------------------------------------------------
   API 명세 — ApiTab 목록과 같은 줄(메서드·경로·연결 수)
---------------------------------------------------------------- */
function ApiView({ model, keyword }: { model: DesignModel; keyword: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  if (filtered.length === 0) {
    return (
      <ViewEmpty
        text={model.apis.length > 0 ? "검색 결과가 없습니다." : "작성된 API 명세가 없습니다."}
      />
    );
  }

  return (
    <>
      <section className="min-w-0 flex-1 lg:overflow-y-auto">
        <ul className="divide-y divide-[var(--waivs-border-soft)]">
          {filtered.map((item) => (
            <li
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              className={cn(
                "flex cursor-pointer items-center gap-3 px-4 py-2.5 transition hover:bg-[var(--waivs-surface-soft)] sm:px-6",
                selectedId === item.id && "bg-[#EEF3FF] hover:bg-[#EEF3FF]",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-7 w-[72px] shrink-0 items-center rounded-md px-2.5 text-xs font-semibold sm:w-[92px] sm:px-3",
                  METHOD_STYLE[item.method],
                )}
              >
                {item.method}
              </span>
              <span className="min-w-0 flex-1 truncate px-2 font-mono text-sm text-[var(--waivs-text)]">
                {item.endpoint || "/api/..."}
              </span>
              <div className="hidden shrink-0 gap-1 md:flex">
                <LinkCountBadge count={item.requirementIds.length} label="요구사항" />
                <LinkCountBadge count={item.screenIds.length} label="화면" warnWhenZero={false} />
                <LinkCountBadge count={item.tableIds.length} label="테이블" />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {selected ? (
        <SidePanel>
          <DetailPanel width="w-96">
            <DetailPanelHeader
              eyebrow={selected.method}
              title={selected.endpoint || "경로 없음"}
              icon={Route}
              onClose={() => setSelectedId(null)}
            />
            <DetailPanelBody>
              <DetailSection tone="soft">
                <DetailField label="설명">
                  <ReadOnlyText value={selected.description} empty="설명이 없습니다." />
                </DetailField>
              </DetailSection>
              <DetailSection title="요청·응답 예시">
                <div className="space-y-3">
                  <DetailField label="요청 본문">
                    <CodeBlock value={selected.request} />
                  </DetailField>
                  <DetailField label="응답 본문">
                    <CodeBlock value={selected.response} />
                  </DetailField>
                </div>
              </DetailSection>
              <DetailSection title="이 API가 담당하는 요구사항">
                <LinkedList
                  items={selected.requirementIds.map((id) => {
                    const requirement = model.requirements.find((item) => item.id === id);
                    return {
                      id,
                      label: requirement?.name || id,
                      hint: requirement?.code,
                    };
                  })}
                  empty="연결된 요구사항이 없습니다."
                />
              </DetailSection>
              <DetailSection title="이 API를 호출하는 화면">
                <LinkedList
                  items={selected.screenIds.map((id) => {
                    const screen = model.screens.find((item) => item.id === id);
                    return { id, label: screen?.name ?? id, hint: screen?.key };
                  })}
                  empty="연결된 화면이 없습니다."
                />
              </DetailSection>
              <DetailSection title="이 API가 다루는 테이블">
                <LinkedList
                  items={selected.tableIds.map((id) => {
                    const table = model.erd.tables.find((item) => item.id === id);
                    return { id, label: table?.name ?? id };
                  })}
                  empty="연결된 테이블이 없습니다."
                />
              </DetailSection>
            </DetailPanelBody>
          </DetailPanel>
        </SidePanel>
      ) : null}
    </>
  );
}

/* ---------------------------------------------------------------
   ERD · 화면 흐름 — 설계관리와 같은 노드 컴포넌트로 그린다
---------------------------------------------------------------- */
function ErdView({ model }: { model: DesignModel }) {
  const nodes = useMemo(() => buildTableNodes(model), [model]);
  const edges = useMemo(() => buildRelationEdges(model), [model]);

  if (nodes.length === 0) {
    return <ViewEmpty text="작성된 ERD가 없습니다." />;
  }

  return (
    <DiagramFrame>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={tableNodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        {...VIEW_ONLY}
      >
        <Background gap={16} color="#e2e8f0" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </DiagramFrame>
  );
}

function ScreenFlowView({ model }: { model: DesignModel }) {
  // 설계관리 화면 흐름 탭의 기본값(상세 보기)과 같게 그린다
  const nodes = useMemo(() => buildScreenNodes(model, { detailed: true }), [model]);
  const edges = useMemo(() => buildScreenEdges(model), [model]);

  if (nodes.length === 0) {
    return <ViewEmpty text="작성된 화면 흐름이 없습니다." />;
  }

  return (
    <DiagramFrame>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={screenNodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        {...VIEW_ONLY}
      >
        <Background gap={16} color="#e2e8f0" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </DiagramFrame>
  );
}

/* ---------------------------------------------------------------
   공용 조각
---------------------------------------------------------------- */

// 넓은 화면은 남은 높이를 다 쓰고, 페이지 전체가 스크롤되는 좁은 화면은 높이를 정해 준다.
function DiagramFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[520px] min-w-0 flex-1 bg-[#FAFBFD] lg:h-auto">
      <ReactFlowProvider>{children}</ReactFlowProvider>
    </div>
  );
}

// 넓은 화면에서는 목록 오른쪽 열, 좁은 화면에서는 목록 위에 겹쳐 연다.
function SidePanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-y-0 right-0 z-20 flex max-w-full lg:static lg:z-auto">
      {children}
    </div>
  );
}

function ViewEmpty({ text }: { text: string }) {
  return (
    <div className="flex flex-1 items-center justify-center py-20">
      <p className="text-sm text-[var(--waivs-text-sub)]">{text}</p>
    </div>
  );
}

function ReadOnlyText({ value, empty }: { value: string; empty: string }) {
  return value.trim() ? (
    <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--waivs-text)] [overflow-wrap:anywhere]">
      {value}
    </p>
  ) : (
    <p className="text-sm text-[var(--waivs-text-muted)]">{empty}</p>
  );
}

function CodeBlock({ value }: { value: string }) {
  if (!value.trim()) {
    return <p className="text-xs text-[var(--waivs-text-muted)]">비어 있습니다.</p>;
  }
  return (
    <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-[var(--waivs-border-soft)] bg-[var(--waivs-surface-soft)] p-3 font-mono text-xs leading-5 text-[var(--waivs-text)] [overflow-wrap:anywhere]">
      {value}
    </pre>
  );
}

function LinkedList({
  items,
  empty,
}: {
  items: { id: string; label: string; hint?: string }[];
  empty: string;
}) {
  if (items.length === 0) {
    return <p className="text-xs text-[var(--waivs-text-muted)]">{empty}</p>;
  }
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-lg border border-[var(--waivs-border-soft)] px-2.5 py-1.5"
        >
          <p className="truncate text-xs font-semibold text-[var(--waivs-text)]">{item.label}</p>
          {item.hint ? (
            <p className="truncate text-[11px] text-[var(--waivs-text-muted)]">{item.hint}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
