"use client";

// 경로: src/features/design/export/captureDiagram.ts
//
// 화면에 그려진 다이어그램을 그대로 그림으로 뜬다.
//
// 예전에는 출력용으로 SVG 를 따로 그렸다. 좌표를 자기가 다시 계산했기
// 때문에 화면에서 본 그림과 PDF 에 찍힌 그림이 달랐다. 같은 캔버스를
// 캡처하면 그 차이가 생길 자리가 아예 없어진다.

import { toPng } from "html-to-image";
import { getRectOfNodes, getTransformForBounds, type Node } from "reactflow";

/** 출력물에 넣을 그림 크기. A4 가로에 넣기 좋은 비율이다. */
export const CAPTURE_WIDTH = 1400;
export const CAPTURE_HEIGHT = 900;

/**
 * reactflow 캔버스를 PNG data URL 로 만든다.
 *
 * fitView 를 부르지 않고 노드들의 실제 범위에서 배율을 직접 계산한다.
 * fitView 는 화면에 보이는 영역을 기준으로 움직이므로, 캔버스가 화면 밖에
 * 있으면 엉뚱한 곳을 잡는다.
 */
export async function captureFlow(
  container: HTMLElement,
  nodes: Node[],
): Promise<string | null> {
  if (nodes.length === 0) {
    return null;
  }

  const viewport = container.querySelector<HTMLElement>(".react-flow__viewport");

  if (!viewport) {
    return null;
  }

  const bounds = getRectOfNodes(nodes);
  const transform = getTransformForBounds(
    bounds,
    CAPTURE_WIDTH,
    CAPTURE_HEIGHT,
    0.2,
    1.6,
  );

  return toPng(viewport, {
    backgroundColor: "#ffffff",
    width: CAPTURE_WIDTH,
    height: CAPTURE_HEIGHT,
    pixelRatio: 2,
    style: {
      width: `${CAPTURE_WIDTH}px`,
      height: `${CAPTURE_HEIGHT}px`,
      transform: `translate(${transform[0]}px, ${transform[1]}px) scale(${transform[2]})`,
    },
  });
}
