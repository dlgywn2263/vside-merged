"use client";

// 경로: src/features/design/export/DesignPrintCapture.tsx
//
// 인쇄할 때만 잠깐 뜨는, 화면 밖의 다이어그램.
//
// 사용자가 요구사항 탭을 보고 있으면 ERD 캔버스는 화면에 없다. 없는 것을
// 캡처할 수는 없으므로, 인쇄 순간에 같은 노드 컴포넌트로 두 다이어그램을
// 화면 밖에 그려 두고 캡처한다. 편집 화면과 같은 렌더러를 지나가므로
// 출력물이 화면과 어긋나지 않는다.

import { useEffect, useMemo, useRef } from "react";
import ReactFlow, { ReactFlowProvider } from "reactflow";
import "reactflow/dist/style.css";

import { ScreenNode } from "../tabs/screens/ScreenNode";
import { TableNode } from "../tabs/erd/TableNode";
import {
  buildRelationEdges,
  buildScreenEdges,
  buildScreenNodes,
  buildTableNodes,
} from "../render/diagramNodes";
import type { DesignModel } from "../model/schema";
import { CAPTURE_HEIGHT, CAPTURE_WIDTH, captureFlow } from "./captureDiagram";
import type { PrintImages } from "./buildPrintDocument";

const screenNodeTypes = { screenNode: ScreenNode };
const tableNodeTypes = { tableNode: TableNode };

/** 화면 밖에 두되 display:none 은 쓰지 않는다. 크기가 0이면 캡처할 것이 없다. */
const OFFSCREEN: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: -100000,
  width: CAPTURE_WIDTH,
  height: CAPTURE_HEIGHT,
  pointerEvents: "none",
  opacity: 0,
};

const READONLY = {
  nodesDraggable: false,
  nodesConnectable: false,
  elementsSelectable: false,
  panOnDrag: false,
  zoomOnScroll: false,
  zoomOnPinch: false,
  zoomOnDoubleClick: false,
  preventScrolling: false,
} as const;

export interface DesignPrintCaptureProps {
  model: DesignModel;
  onReady: (images: PrintImages) => void;
  onError: (message: string) => void;
}

export function DesignPrintCapture({ model, onReady, onError }: DesignPrintCaptureProps) {
  const screensRef = useRef<HTMLDivElement>(null);
  const erdRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const screenNodes = useMemo(() => buildScreenNodes(model, { detailed: true }), [model]);
  const screenEdges = useMemo(() => buildScreenEdges(model), [model]);
  const tableNodes = useMemo(() => buildTableNodes(model), [model]);
  const relationEdges = useMemo(() => buildRelationEdges(model), [model]);

  useEffect(() => {
    // 한 번 인쇄할 때 한 번만 캡처한다.
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;

    // reactflow 가 노드를 배치할 틈을 준다. 바로 캡처하면 빈 화면이 찍힌다.
    const timer = window.setTimeout(async () => {
      try {
        const screens = screensRef.current
          ? await captureFlow(screensRef.current, screenNodes)
          : null;
        const erd = erdRef.current ? await captureFlow(erdRef.current, tableNodes) : null;

        if (!cancelled) {
          onReady({ screens, erd });
        }
      } catch (error) {
        if (!cancelled) {
          onError(
            error instanceof Error ? error.message : "다이어그램을 그림으로 만들지 못했습니다.",
          );
        }
      }
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [screenNodes, tableNodes, onReady, onError]);

  return (
    <div aria-hidden>
      <div ref={screensRef} style={OFFSCREEN}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={screenNodes}
            edges={screenEdges}
            nodeTypes={screenNodeTypes}
            fitView
            {...READONLY}
          />
        </ReactFlowProvider>
      </div>

      <div ref={erdRef} style={OFFSCREEN}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={tableNodes}
            edges={relationEdges}
            nodeTypes={tableNodeTypes}
            fitView
            {...READONLY}
          />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
