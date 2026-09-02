"use client";

// 경로: src/features/design/tabs/erd/ErdTab.tsx
//
// 왼쪽은 글로 쓰는 스키마, 오른쪽은 그 결과 다이어그램.
//
// 진짜 데이터는 오른쪽(구조화된 ERD)이고 왼쪽 텍스트는 그것을 옮겨 적은
// 사본이다. 텍스트를 진짜로 삼지 않는 이유는 테이블에 고정된 id 가 없어지기
// 때문이다. 이름을 고치는 순간 그 테이블을 가리키던 API 연결과 좌표가 전부
// 끊긴다.
//
// 텍스트 버퍼는 팀원과 공유하지 않는다. 각자 고친 뒤 결과 구조만 문서에
// 반영한다. 두 사람이 동시에 텍스트를 고치면 서로의 변경을 되돌리는
// 핑퐁이 나므로, 한 명이 편집 중일 때는 다른 사람에게 읽기 전용으로 보인다.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import ReactFlow, {
  Background,
  Controls,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { AlertTriangle, Check, Lock, RefreshCw } from "lucide-react";
import type { Awareness } from "y-protocols/awareness";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import type { DesignModel } from "../../model/schema";
import type { DesignMutations } from "../../realtime/mutations";
import { useConfirm } from "../../components/ConfirmDialog";
import { parseDbml, type ParseError } from "./dbml/parser";
import { serializeDbml } from "./dbml/serialize";
import { planErdFromParse } from "./dbml/diff";
import { applyErdPlan } from "./dbml/applyPlan";
import { TableNode, type TableNodeData } from "./TableNode";
import {
  buildRelationEdges,
  buildTableNodes,
  usedTableIds,
} from "../../render/diagramNodes";

const nodeTypes = { tableNode: TableNode };

/** 타이핑이 멈춘 뒤 이만큼 기다렸다 반영한다. */
const PARSE_DEBOUNCE_MS = 700;

export interface ErdTabProps {
  model: DesignModel;
  mutations: DesignMutations;
  awareness: Awareness | null;
}

function ErdCanvasAndText({ model, mutations, awareness }: ErdTabProps) {
  const confirm = useConfirm();

  const [text, setText] = useState("");
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [focused, setFocused] = useState(false);
  const [remoteChangeCount, setRemoteChangeCount] = useState(0);

  const focusedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const applyingRef = useRef(false);
  const draggingRef = useRef(false);

  const serialized = useMemo(() => serializeDbml(model.erd), [model.erd]);

  // 다른 사람이 텍스트를 편집 중인지.
  const otherEditor = useMemo(() => {
    if (!awareness) return null;

    let found: string | null = null;
    awareness.getStates().forEach((state, clientId) => {
      if (clientId === awareness.clientID) return;
      const editing = (state as Record<string, unknown>)?.designEditing;
      if (editing === "dbml") {
        const user = (state as Record<string, unknown>)?.user as
          | { name?: string }
          | undefined;
        found = user?.name ?? "다른 팀원";
      }
    });

    return found;
  }, [awareness, remoteChangeCount]);

  useEffect(() => {
    if (!awareness) return;

    const handler = () => setRemoteChangeCount((count) => count + 1);
    awareness.on("change", handler);
    return () => awareness.off("change", handler);
  }, [awareness]);

  // 내가 텍스트를 보고 있지 않을 때만 문서 내용으로 다시 채운다.
  // 편집 중에 덮어쓰면 타이핑하던 내용이 사라진다.
  useEffect(() => {
    if (focusedRef.current) {
      if (!applyingRef.current) setRemoteChangeCount((count) => count + 1);
      return;
    }

    setText(serialized);
    setErrors([]);
  }, [serialized]);

  const commit = useCallback(
    async (nextText: string) => {
      const parsed = parseDbml(nextText);
      setErrors(parsed.errors);

      // 문법이 깨진 동안에는 아무것도 반영하지 않는다.
      if (parsed.errors.length > 0) return;

      const plan = planErdFromParse(parsed, model.erd);

      if (plan.needsConfirm) {
        const ok = await confirm({
          title: "테이블을 지우려고 합니다",
          description:
            plan.existingTableCount === plan.removedTableCount
              ? `테이블 ${plan.removedTableCount}개가 모두 사라집니다. 팀원 모두에게 반영됩니다.`
              : `테이블 ${plan.removedTableCount}개가 사라집니다. 팀원 모두에게 반영됩니다.`,
          confirmLabel: "지우기",
          cancelLabel: "되돌리기",
          destructive: true,
        });

        if (!ok) {
          setText(serializeDbml(model.erd));
          return;
        }
      }

      if (plan.renames.length > 0) {
        const ok = await confirm({
          title: "테이블 이름을 바꾼 것이 맞나요?",
          description: plan.renames
            .map((rename) => `${rename.from} → ${rename.to}`)
            .join(", "),
          confirmLabel: "이름 변경",
          cancelLabel: "되돌리기",
        });

        if (!ok) {
          setText(serializeDbml(model.erd));
          return;
        }
      }

      applyingRef.current = true;
      applyErdPlan(plan, model, mutations);
      applyingRef.current = false;
    },
    [confirm, model, mutations],
  );

  const handleChange = (value: string | undefined) => {
    const next = value ?? "";
    setText(next);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void commit(next), PARSE_DEBOUNCE_MS);
  };

  const handleMount: OnMount = (editor) => {
    editor.onDidFocusEditorText(() => {
      focusedRef.current = true;
      setFocused(true);
      awareness?.setLocalStateField("designEditing", "dbml");
    });

    editor.onDidBlurEditorText(() => {
      focusedRef.current = false;
      setFocused(false);
      awareness?.setLocalStateField("designEditing", null);
    });
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      awareness?.setLocalStateField("designEditing", null);
    };
  }, [awareness]);

  // ── 다이어그램 ────────────────────────────────────────────────────

  const usedIds = useMemo(() => usedTableIds(model), [model]);

  const [nodes, setNodes, onNodesChange] = useNodesState<TableNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const nextNodes = useMemo<Node<TableNodeData>[]>(
    () => buildTableNodes(model, usedIds),
    [model, usedIds],
  );

  const nextEdges = useMemo<Edge[]>(() => buildRelationEdges(model), [model]);

  useEffect(() => {
    if (draggingRef.current) return;
    setNodes(nextNodes);
  }, [nextNodes, setNodes]);

  useEffect(() => {
    setEdges(nextEdges);
  }, [nextEdges, setEdges]);

  const readOnly = Boolean(otherEditor) && !focused;

  return (
    <div className="flex h-full min-h-0">
      <section className="flex w-[46%] min-w-[320px] flex-col border-r border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">스키마 (글로 작성)</span>
            {readOnly ? (
              <span className="flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-700">
                <Lock className="h-3 w-3" />
                {otherEditor}님이 편집 중
              </span>
            ) : null}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => {
              setText(serializeDbml(model.erd));
              setErrors([]);
            }}
            title="다이어그램 내용으로 텍스트를 다시 채웁니다"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            새로 고침
          </Button>
        </div>

        <div className="min-h-0 flex-1">
          <Editor
            value={text}
            language="sql"
            onChange={handleChange}
            onMount={handleMount}
            options={{
              readOnly,
              minimap: { enabled: false },
              lineNumbers: "on",
              fontSize: 13,
              scrollBeyondLastLine: false,
              wordWrap: "on",
              tabSize: 2,
            }}
          />
        </div>

        <StatusBar errors={errors} focused={focused} />
      </section>

      <section className="relative min-w-0 flex-1">
        {model.erd.tables.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 px-8 text-center">
            <p className="text-sm text-slate-500">아직 테이블이 없습니다.</p>
            <p className="max-w-sm text-xs text-slate-400">
              왼쪽에 이렇게 적어 보세요.
            </p>
            <pre className="mt-1 rounded-lg bg-slate-900 px-3 py-2 text-left font-mono text-[11px] leading-relaxed text-slate-200">
{`Table users {
  id    bigint       [pk]
  email varchar(255) [not null]
}`}
            </pre>
          </div>
        ) : null}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStart={() => {
            draggingRef.current = true;
          }}
          onNodeDragStop={(_event, node) => {
            draggingRef.current = false;
            mutations.moveTable(node.id, node.position.x, node.position.y);
          }}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} color="#e2e8f0" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </section>
    </div>
  );
}

function StatusBar({ errors, focused }: { errors: ParseError[]; focused: boolean }) {
  if (errors.length > 0) {
    return (
      <div className="max-h-28 overflow-y-auto border-t border-red-100 bg-red-50 px-4 py-2">
        {errors.slice(0, 5).map((error) => (
          <p
            key={`${error.line}-${error.message}`}
            className="flex items-start gap-1.5 text-[11px] text-red-700"
          >
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            <span>
              <span className="font-medium">{error.line}번째 줄</span> · {error.message}
            </span>
          </p>
        ))}
        {errors.length > 5 ? (
          <p className="text-[11px] text-red-500">외 {errors.length - 5}건</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500">
      <Check className="h-3 w-3 text-emerald-500" />
      {focused ? "타이핑을 멈추면 다이어그램에 반영됩니다." : "다이어그램과 같은 내용입니다."}
    </div>
  );
}

export function ErdTab(props: ErdTabProps) {
  return (
    <ReactFlowProvider>
      <ErdCanvasAndText {...props} />
    </ReactFlowProvider>
  );
}
