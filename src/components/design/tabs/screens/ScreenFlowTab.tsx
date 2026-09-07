"use client";

// 경로: src/components/design/tabs/screens/ScreenFlowTab.tsx
//
// 데이터 플로우 탭을 대체하는 화면·기능 흐름도.
//
// 드래그 중에는 좌표를 문서에 쓰지 않는다. 매 프레임 방송하면 팀원 수만큼
// 메시지가 곱해져 연결이 죽는다. 손을 뗄 때 한 번만 기록한다.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { Eye, EyeOff, MonitorSmartphone, MoveRight, Plus, Trash2 } from "lucide-react";

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

import type { DesignModel, ScreenRole, TransitionKind } from "../../model/schema";
import type { DesignMutations } from "../../realtime/mutations";
import { useDesignUiStore } from "../../store/designUiStore";
import {
  DetailDangerButton,
  DetailEmpty,
  DetailField,
  DetailPanel,
  DetailPanelBody,
  DetailPanelHeader,
  DetailSection,
} from "../../components/DetailPanel";
import { useConfirm } from "../../components/ConfirmDialog";
import { LinkPicker } from "../../components/LinkPicker";
import { ScreenNode, type ScreenNodeData } from "./ScreenNode";
import {
  buildApiLabelMap,
  buildScreenEdges,
  buildScreenNodes,
} from "../../render/diagramNodes";

const nodeTypes = { screenNode: ScreenNode };

const KIND_LABEL: Record<TransitionKind, string> = {
  navigate: "이동",
  submit: "제출",
  redirect: "자동 이동",
  back: "뒤로",
};

const ROLE_LABEL: Record<ScreenRole, string> = {
  page: "화면",
  modal: "팝업",
  external: "외부 서비스",
};

export interface ScreenFlowTabProps {
  model: DesignModel;
  mutations: DesignMutations;
}

function ScreenFlowCanvas({ model, mutations }: ScreenFlowTabProps) {
  const confirm = useConfirm();
  const selectedScreenId = useDesignUiStore((s) => s.selection.screenId);
  const select = useDesignUiStore((s) => s.select);

  const [detailed, setDetailed] = useState(true);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const draggingRef = useRef(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<ScreenNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const apiLabelById = useMemo(() => buildApiLabelMap(model), [model]);

  const nextNodes = useMemo<Node<ScreenNodeData>[]>(
    () => buildScreenNodes(model, { detailed, apiLabelById }),
    [model, apiLabelById, detailed],
  );

  const nextEdges = useMemo<Edge[]>(
    () => buildScreenEdges(model, selectedEdgeId),
    [model, selectedEdgeId],
  );

  // 문서가 바뀌면 캔버스를 맞춘다. 단 드래그 중에는 건드리지 않는다.
  // 드래그 도중 좌표를 문서 값으로 되돌리면 노드가 손에서 튕겨 나간다.
  useEffect(() => {
    if (draggingRef.current) return;
    setNodes(nextNodes);
  }, [nextNodes, setNodes]);

  useEffect(() => {
    setEdges(nextEdges);
  }, [nextEdges, setEdges]);

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      mutations.addTransition(connection.source, connection.target, { trigger: "" });
    },
    [mutations],
  );

  const selectedScreen =
    model.screens.find((screen) => screen.id === selectedScreenId) ?? null;
  const selectedTransition =
    model.screenTransitions.find((item) => item.id === selectedEdgeId) ?? null;

  const handleAddScreen = () => {
    const id = mutations.addScreen({
      name: "새 화면",
      isEntry: model.screens.length === 0,
      layout: { x: 120 + model.screens.length * 60, y: 120 + (model.screens.length % 4) * 140 },
    });

    select({ screenId: id });
    setSelectedEdgeId(null);
  };

  const handleRemoveScreen = async (id: string, name: string) => {
    const ok = await confirm({
      title: "이 화면을 삭제할까요?",
      description: `"${name}" 과 이 화면에 연결된 흐름이 함께 사라집니다.`,
      confirmLabel: "삭제",
      destructive: true,
    });

    if (!ok) return;

    mutations.removeScreen(id);
    select({ screenId: null });
  };

  return (
    <div className="flex h-full min-h-0">
      <div className="relative min-w-0 flex-1">
        <div className="absolute left-4 top-4 z-10 flex gap-2">
          <Button size="sm" onClick={handleAddScreen} className="gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" />
            화면 추가
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setDetailed((value) => !value)}
            className="gap-1.5 bg-white shadow-sm"
          >
            {detailed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {detailed ? "요약 보기" : "상세 보기"}
          </Button>
        </div>

        {model.screens.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm text-[var(--waivs-text-sub)]">아직 화면이 없습니다.</p>
            <p className="max-w-xs text-xs text-[var(--waivs-text-muted)]">
              로그인, 목록, 상세처럼 사용자가 실제로 보게 될 화면을 놓고
              화살표로 이어 보세요.
            </p>
          </div>
        ) : null}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onNodeDragStart={() => {
            draggingRef.current = true;
          }}
          onNodeDragStop={(_event, node) => {
            draggingRef.current = false;
            mutations.moveScreen(node.id, node.position.x, node.position.y);
          }}
          onNodeClick={(_event, node) => {
            select({ screenId: node.id });
            setSelectedEdgeId(null);
          }}
          onEdgeClick={(_event, edge) => {
            setSelectedEdgeId(edge.id);
            select({ screenId: null });
          }}
          onPaneClick={() => {
            select({ screenId: null });
            setSelectedEdgeId(null);
          }}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} color="#e2e8f0" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      <DetailPanel>
        {selectedTransition ? (
          <TransitionPanel
            onClose={() => setSelectedEdgeId(null)}
            trigger={selectedTransition.trigger}
            kind={selectedTransition.kind}
            condition={selectedTransition.condition}
            onChange={(patch) => mutations.updateTransition(selectedTransition.id, patch)}
            onRemove={async () => {
              const ok = await confirm({
                title: "이 흐름을 삭제할까요?",
                confirmLabel: "삭제",
                destructive: true,
              });
              if (!ok) return;
              mutations.removeTransition(selectedTransition.id);
              setSelectedEdgeId(null);
            }}
          />
        ) : selectedScreen ? (
          <>
            <DetailPanelHeader
              eyebrow={selectedScreen.key || "SCREEN"}
              title={selectedScreen.name || "이름 없는 화면"}
              icon={MonitorSmartphone}
              onClose={() => select({ screenId: null })}
            />

            <DetailPanelBody>
            <DetailSection tone="soft">
            <div className="space-y-3">
              <DetailField label="화면 이름">
                <Input
                  value={selectedScreen.name}
                  onChange={(event) =>
                    mutations.updateScreen(selectedScreen.id, { name: event.target.value })
                  }
                  className="rounded-xl bg-white"
                />
              </DetailField>

              <DetailField
                label="라우트 경로"
                hint="React 페이지 파일을 만들 때 이 경로가 쓰입니다."
              >
                <Input
                  value={selectedScreen.key}
                  onChange={(event) =>
                    mutations.updateScreen(selectedScreen.id, { key: event.target.value })
                  }
                  placeholder="/login"
                  className="rounded-xl bg-white font-mono text-sm"
                />
              </DetailField>

              <DetailField label="종류">
                <Select
                  value={selectedScreen.role}
                  onValueChange={(value) =>
                    mutations.updateScreen(selectedScreen.id, { role: value as ScreenRole })
                  }
                >
                  <SelectTrigger className="rounded-xl bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ROLE_LABEL) as ScreenRole[]).map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABEL[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </DetailField>

              <label className="flex items-center gap-2 text-sm text-[var(--waivs-text-sub)]">
                <input
                  type="checkbox"
                  checked={selectedScreen.isEntry}
                  onChange={(event) =>
                    mutations.updateScreen(selectedScreen.id, { isEntry: event.target.checked })
                  }
                  className="h-4 w-4 rounded border-[var(--waivs-border)] accent-[#5873F9]"
                />
                시작 화면
              </label>

              <label className="flex items-center gap-2 text-sm text-[var(--waivs-text-sub)]">
                <input
                  type="checkbox"
                  checked={selectedScreen.requiresAuth}
                  onChange={(event) =>
                    mutations.updateScreen(selectedScreen.id, {
                      requiresAuth: event.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-[var(--waivs-border)] accent-[#5873F9]"
                />
                로그인이 필요한 화면
              </label>

              <DetailField label="설명">
                <Textarea
                  value={selectedScreen.description}
                  onChange={(event) =>
                    mutations.updateScreen(selectedScreen.id, {
                      description: event.target.value,
                    })
                  }
                  className="min-h-[80px] rounded-xl bg-white"
                />
              </DetailField>
            </div>
            </DetailSection>

            <DetailSection title="이 화면이 만족시키는 요구사항">
            <LinkPicker
              emptyHint="요구사항 탭에서 먼저 만들어 주세요."
              candidates={model.requirements.map((item) => ({
                id: item.id,
                label: item.name,
                hint: item.code,
              }))}
              selectedIds={selectedScreen.requirementIds}
              onToggle={(requirementId, linked) =>
                mutations.linkRequirementScreen(requirementId, selectedScreen.id, linked)
              }
            />
            </DetailSection>

            <DetailSection title="이 화면이 호출하는 API">
            <LinkPicker
              emptyHint="API 명세 탭에서 먼저 만들어 주세요."
              candidates={model.apis.map((api) => ({
                id: api.id,
                label: `${api.method} ${api.endpoint}`,
                hint: api.description,
              }))}
              selectedIds={selectedScreen.apiIds}
              onToggle={(apiId, linked) =>
                mutations.linkScreenApi(selectedScreen.id, apiId, linked)
              }
            />
            </DetailSection>

            <DetailDangerButton
              icon={Trash2}
              label="이 화면 삭제"
              onClick={() => void handleRemoveScreen(selectedScreen.id, selectedScreen.name)}
            />
            </DetailPanelBody>
          </>
        ) : (
          <DetailEmpty
            icon={MonitorSmartphone}
            title="화면이나 화살표를 골라 주세요"
            description="다이어그램에서 상자를 누르면 화면을, 화살표를 누르면 이동 조건을 편집합니다."
          />
        )}
      </DetailPanel>
    </div>
  );
}

/** 화살표(전이) 편집. 예전에는 이 값을 window.prompt 로 받았다. */
function TransitionPanel({
  trigger,
  kind,
  condition,
  onChange,
  onRemove,
  onClose,
}: {
  trigger: string;
  kind: TransitionKind;
  condition: string;
  onChange: (patch: { trigger?: string; kind?: TransitionKind; condition?: string }) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <DetailPanelHeader
        eyebrow="TRANSITION"
        title={trigger || "화면 이동"}
        icon={MoveRight}
        onClose={onClose}
      />

      <DetailPanelBody>
        <DetailSection tone="soft">
          <div className="space-y-3">
      <DetailField label="무엇을 했을 때" hint="예: 로그인 버튼 클릭">
        <Input
          value={trigger}
          onChange={(event) => onChange({ trigger: event.target.value })}
          placeholder="사용자의 행동"
          className="rounded-xl bg-white"
        />
      </DetailField>

      <DetailField label="이동 방식">
        <Select value={kind} onValueChange={(value) => onChange({ kind: value as TransitionKind })}>
          <SelectTrigger className="rounded-xl bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(KIND_LABEL) as TransitionKind[]).map((value) => (
              <SelectItem key={value} value={value}>
                {KIND_LABEL[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </DetailField>

      <DetailField label="조건" hint="예: 성공 시 / 실패 시">
        <Input
          value={condition}
          onChange={(event) => onChange({ condition: event.target.value })}
          placeholder="없으면 비워 두세요"
          className="rounded-xl bg-white"
        />
      </DetailField>
          </div>
        </DetailSection>

        <DetailDangerButton icon={Trash2} label="이 흐름 삭제" onClick={onRemove} />
      </DetailPanelBody>
    </>
  );
}

export function ScreenFlowTab(props: ScreenFlowTabProps) {
  return (
    <ReactFlowProvider>
      <ScreenFlowCanvas {...props} />
    </ReactFlowProvider>
  );
}
