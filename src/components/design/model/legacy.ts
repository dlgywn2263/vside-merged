// 경로: src/components/design/model/legacy.ts
//
// 레거시 설계 데이터 ↔ v2 문서 모델 변환.
//
// 두 방향이 모두 필요하다.
//  · legacyToModel : 워크스페이스를 처음 열 때 딱 한 번(시드). 기존 사용자의
//                    작업을 새 문서로 옮긴다.
//  · modelToLegacy : 스냅샷을 저장할 때마다(역투영). 자료실·마이페이지·
//                    최종보고서가 예전 API를 그대로 읽어도 최신 내용이
//                    보이게 한다. 이것 덕분에 그 화면들을 한 줄도 고치지
//                    않고 전환할 수 있다.
//
// 식별자 정책: 마이그레이션된 항목은 레거시 id 를 그대로 유지한다.
// 새로 만드는 항목만 ids.ts 의 접두사 id 를 받는다. 두 형식이 섞이지만
// 참조 검사는 접두사가 아니라 인덱스 조회로 하므로 문제가 없고, 대신
// 역투영이 DB 행의 식별자를 흔들지 않는다는 이점이 크다.

import {
  createApiSpec,
  createColumn,
  createEmptyModel,
  createRelation,
  createRequirement,
  createScreen,
  createScreenTransition,
  createTable,
  HTTP_METHODS,
  type DesignModel,
  type HttpMethod,
  type Point,
} from "./schema";
import { nextRequirementCode } from "./ids";

// ── 레거시 형태 ────────────────────────────────────────────────────
// src/lib/design/api.js 의 정규화 결과와 필드명이 같아야 한다.

export interface LegacyRequirement {
  id: string;
  category?: string;
  name?: string;
  description?: string;
}

export interface LegacyApiSpec {
  id: string;
  method?: string;
  endpoint?: string;
  description?: string;
  request?: string;
  response?: string;
}

export interface LegacyDesignDocument {
  erdNodesJson?: string;
  erdEdgesJson?: string;
  flowNodesJson?: string;
  flowEdgesJson?: string;
}

export interface LegacyBundle {
  requirements: LegacyRequirement[];
  apiSpecs: LegacyApiSpec[];
  document: LegacyDesignDocument;
}

interface LegacyErdColumn {
  id?: string;
  name?: string;
  type?: string;
  isPk?: boolean;
  isFk?: boolean;
}

interface LegacyErdNode {
  id?: string;
  position?: Partial<Point>;
  data?: { name?: string; columns?: LegacyErdColumn[] };
}

interface LegacyEdge {
  id?: string;
  source?: string;
  target?: string;
  label?: string;
}

interface LegacyFlowNode {
  id?: string;
  position?: Partial<Point>;
  data?: { label?: string; type?: string; techStack?: string };
}

// ── 공용 헬퍼 ──────────────────────────────────────────────────────

function parseJsonArray<T>(value: string | undefined | null): T[] {
  if (!value || typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function toJsonArrayString(value: unknown[]): string {
  return JSON.stringify(value ?? []);
}

function toPoint(position: Partial<Point> | undefined): Point {
  return {
    x: Number.isFinite(position?.x) ? Number(position?.x) : 0,
    y: Number.isFinite(position?.y) ? Number(position?.y) : 0,
  };
}

function toHttpMethod(value: string | undefined): HttpMethod {
  const upper = String(value ?? "").toUpperCase();
  return (HTTP_METHODS as string[]).includes(upper) ? (upper as HttpMethod) : "GET";
}

// ── 레거시 → v2 (시드, 워크스페이스당 1회) ──────────────────────────

export function legacyToModel(bundle: LegacyBundle): DesignModel {
  const model = createEmptyModel();

  const flowNodesJson = bundle.document?.flowNodesJson ?? "[]";
  const flowEdgesJson = bundle.document?.flowEdgesJson ?? "[]";

  // 데이터 플로우는 변환하지 않고 원본을 그대로 보관한다.
  model.meta.legacyFlow = {
    nodesJson: flowNodesJson,
    edgesJson: flowEdgesJson,
  };

  // 요구사항 ─ 표시 번호는 순서대로 새로 매긴다(레거시에는 없던 개념).
  const codes: string[] = [];
  model.requirements = (bundle.requirements ?? []).map((item) => {
    const code = nextRequirementCode(codes);
    codes.push(code);

    return createRequirement(item.id, {
      code,
      category: item.category || "기본",
      name: item.name ?? "",
      description: item.description ?? "",
    });
  });

  // API 명세
  model.apis = (bundle.apiSpecs ?? []).map((item) =>
    createApiSpec(item.id, {
      method: toHttpMethod(item.method),
      endpoint: item.endpoint ?? "",
      description: item.description ?? "",
      request: item.request ?? "",
      response: item.response ?? "",
    }),
  );

  // ERD 테이블
  const erdNodes = parseJsonArray<LegacyErdNode>(bundle.document?.erdNodesJson);
  model.erd.tables = erdNodes
    .filter((node) => Boolean(node?.id))
    .map((node) =>
      createTable(String(node.id), {
        name: node.data?.name ?? "",
        columns: (node.data?.columns ?? []).map((column) =>
          createColumn(String(column?.id ?? ""), {
            name: column?.name ?? "",
            type: column?.type ?? "VARCHAR",
            isPk: Boolean(column?.isPk),
            isFk: Boolean(column?.isFk),
            // 레거시에는 nullable 개념이 없었다. PK 가 아니면 허용으로 둔다.
            nullable: !column?.isPk,
          }),
        ),
        layout: toPoint(node.position),
      }),
    );

  // ERD 관계 ─ 레거시 엣지는 테이블 단위라 컬럼 정보가 없다.
  // 관계선 라벨은 note 로 살린다. 컬럼 연결은 사용자가 채우거나
  // 설계 닥터가 REL_DANGLING 으로 안내한다.
  const erdEdges = parseJsonArray<LegacyEdge>(bundle.document?.erdEdgesJson);
  model.erd.relations = erdEdges
    .filter((edge) => Boolean(edge?.id))
    .map((edge) =>
      createRelation(String(edge.id), {
        fromTableId: String(edge.source ?? ""),
        toTableId: String(edge.target ?? ""),
        note: edge.label ?? "",
      }),
    );

  // 데이터 플로우의 client 노드만 화면으로 승격한다.
  // 라우트 경로는 지어내지 않고 비워 둔다 — 없는 경로를 만들어 두면
  // 코드 생성이 엉뚱한 파일을 만든다. 사용자가 채우도록 남긴다.
  const flowNodes = parseJsonArray<LegacyFlowNode>(flowNodesJson);
  const promotedIds = new Set<string>();

  model.screens = flowNodes
    .filter((node) => Boolean(node?.id) && node?.data?.type === "client")
    .map((node) => {
      const id = String(node.id);
      promotedIds.add(id);

      return createScreen(id, {
        name: node.data?.label ?? "",
        layout: toPoint(node.position),
      });
    });

  // 승격된 화면끼리 이어진 연결선만 화면 전이가 된다.
  const flowEdges = parseJsonArray<LegacyEdge>(flowEdgesJson);
  model.screenTransitions = flowEdges
    .filter(
      (edge) =>
        Boolean(edge?.id) &&
        promotedIds.has(String(edge.source ?? "")) &&
        promotedIds.has(String(edge.target ?? "")),
    )
    .map((edge) =>
      createScreenTransition(String(edge.id), {
        from: String(edge.source ?? ""),
        to: String(edge.target ?? ""),
        trigger: edge.label ?? "",
      }),
    );

  return model;
}

// ── v2 → 레거시 (역투영, 스냅샷 저장마다) ───────────────────────────

export interface LegacyProjection {
  requirements: Required<LegacyRequirement>[];
  apiSpecs: Required<LegacyApiSpec>[];
  erdNodesJson: string;
  erdEdgesJson: string;
  flowNodesJson: string;
  flowEdgesJson: string;
}

/**
 * 화면 흐름을 예전 데이터 플로우 형식으로 옮긴다.
 *
 * 자료실과 마이페이지는 아직 예전 형식만 읽는다. 여기서 화면 흐름을
 * 내보내지 않으면, 사용자가 지금 관리하는 흐름은 그 화면들에 영영 안 보이고
 * 시드 때 보관해 둔 옛 다이어그램만 계속 보인다.
 *
 * 화면이 하나도 없을 때만 보관된 원본을 그대로 돌려준다. 아직 새 탭을
 * 써 보지 않은 워크스페이스에서 자료실이 갑자기 비어 보이지 않게 하려는 것이다.
 */
function toLegacyFlow(model: DesignModel): { nodesJson: string; edgesJson: string } {
  if (model.screens.length === 0) {
    return {
      nodesJson: model.meta.legacyFlow.nodesJson,
      edgesJson: model.meta.legacyFlow.edgesJson,
    };
  }

  const nodes = model.screens.map((screen) => ({
    id: screen.id,
    type: "systemNode",
    position: { x: screen.layout.x, y: screen.layout.y },
    data: {
      label: screen.name,
      type: "client",
      // 예전 형식에는 라우트를 담을 자리가 없어 부가 설명 칸을 빌려 쓴다.
      techStack: screen.key,
    },
  }));

  const edges = model.screenTransitions.map((transition) => ({
    id: transition.id,
    source: transition.from,
    target: transition.to,
    animated: true,
    label: transition.condition
      ? `${transition.trigger} (${transition.condition})`
      : transition.trigger,
  }));

  return {
    nodesJson: toJsonArrayString(nodes),
    edgesJson: toJsonArrayString(edges),
  };
}

export function modelToLegacy(model: DesignModel): LegacyProjection {
  const flow = toLegacyFlow(model);

  const erdNodes = model.erd.tables.map((table) => ({
    id: table.id,
    type: "tableNode",
    position: { x: table.layout.x, y: table.layout.y },
    data: {
      name: table.name,
      columns: table.columns.map((column) => ({
        id: column.id,
        name: column.name,
        type: column.type,
        isPk: column.isPk,
        isFk: column.isFk,
      })),
    },
  }));

  const erdEdges = model.erd.relations.map((relation) => ({
    id: relation.id,
    source: relation.fromTableId,
    target: relation.toTableId,
    type: "smoothstep",
    label: relation.note,
  }));

  return {
    requirements: model.requirements.map((item) => ({
      id: item.id,
      category: item.category,
      name: item.name,
      description: item.description,
    })),
    apiSpecs: model.apis.map((item) => ({
      id: item.id,
      method: item.method,
      endpoint: item.endpoint,
      description: item.description,
      request: item.request,
      response: item.response,
    })),
    erdNodesJson: toJsonArrayString(erdNodes),
    erdEdgesJson: toJsonArrayString(erdEdges),
    flowNodesJson: flow.nodesJson,
    flowEdgesJson: flow.edgesJson,
  };
}
