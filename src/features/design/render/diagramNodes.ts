"use client";

// 경로: src/features/design/render/diagramNodes.ts
//
// 설계 모델을 reactflow 가 아는 노드·엣지로 옮기는 순수 함수들.
//
// 편집 화면과 출력물이 같은 함수를 쓰게 하려고 여기로 모았다. 예전에는
// 출력용 다이어그램이 좌표를 자기가 다시 계산해서, 화면에서 본 그림과
// PDF 에 찍힌 그림이 서로 달랐다. 그림을 두 번 그리는 한 그 차이는
// 반드시 다시 생긴다.

import { MarkerType, type Edge, type Node } from "reactflow";

import type { DesignModel } from "../model/schema";
import type { ScreenNodeData } from "../tabs/screens/ScreenNode";
import type { TableNodeData } from "../tabs/erd/TableNode";

/** 화면 카드에 "이 화면이 부르는 API" 를 적기 위한 표. */
export function buildApiLabelMap(model: DesignModel): Map<string, string> {
  const map = new Map<string, string>();
  model.apis.forEach((api) => map.set(api.id, `${api.method} ${api.endpoint}`));
  return map;
}

export function buildScreenNodes(
  model: DesignModel,
  options: { detailed: boolean; apiLabelById?: Map<string, string> },
): Node<ScreenNodeData>[] {
  const apiLabelById = options.apiLabelById ?? buildApiLabelMap(model);

  return model.screens.map((screen) => ({
    id: screen.id,
    type: "screenNode",
    position: { x: screen.layout.x, y: screen.layout.y },
    data: {
      name: screen.name,
      routeKey: screen.key,
      role: screen.role,
      isEntry: screen.isEntry,
      requiresAuth: screen.requiresAuth,
      requirementCount: screen.requirementIds.length,
      apiLabels: screen.apiIds
        .map((id) => apiLabelById.get(id))
        .filter((label): label is string => Boolean(label)),
      detailed: options.detailed,
    },
  }));
}

export function buildScreenEdges(model: DesignModel, selectedEdgeId?: string | null): Edge[] {
  return model.screenTransitions.map((transition) => ({
    id: transition.id,
    source: transition.from,
    target: transition.to,
    type: "smoothstep",
    animated: transition.kind === "redirect",
    label: transition.condition
      ? `${transition.trigger} (${transition.condition})`
      : transition.trigger,
    labelStyle: { fontSize: 11 },
    style: { stroke: selectedEdgeId === transition.id ? "#4f46e5" : "#94a3b8" },
  }));
}

/** 아무 API 도 쓰지 않는 표는 회색으로 표시한다. 설계 점검의 TBL_ORPHAN 과 같은 뜻이다. */
export function usedTableIds(model: DesignModel): Set<string> {
  const used = new Set<string>();
  model.apis.forEach((api) => api.tableIds.forEach((id) => used.add(id)));
  return used;
}

export function buildTableNodes(
  model: DesignModel,
  used?: Set<string>,
): Node<TableNodeData>[] {
  const usedIds = used ?? usedTableIds(model);

  return model.erd.tables.map((table) => ({
    id: table.id,
    type: "tableNode",
    position: { x: table.layout.x, y: table.layout.y },
    data: {
      name: table.name,
      unused: !usedIds.has(table.id),
      columns: table.columns.map((column) => ({
        id: column.id,
        name: column.name,
        type: column.length ? `${column.type}(${column.length})` : column.type,
        isPk: column.isPk,
        isFk: column.isFk,
        nullable: column.nullable,
      })),
    },
  }));
}

export function buildRelationEdges(model: DesignModel): Edge[] {
  return model.erd.relations.map((relation) => ({
    id: relation.id,
    source: relation.fromTableId,
    target: relation.toTableId,
    type: "smoothstep",
    label: relation.cardinality,
    labelStyle: { fontSize: 10 },
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: "#94a3b8" },
  }));
}
