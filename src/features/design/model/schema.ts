// 경로: src/features/design/model/schema.ts
//
// 설계 관리 v2 문서 모델.
// 이 구조는 백엔드 dto/design/v2/*.java 와 1:1로 대응한다.
// 필드명이 한쪽만 바뀌면 설계 닥터와 코드 생성이 통째로 실패하므로
// 양쪽을 항상 같은 커밋에서 함께 고쳐야 한다.
//
// 어기면 전부 깨지는 규칙 3가지
//  1. id 는 불변이고, 사람이 읽는 번호(code)와 분리한다.
//     정렬/삭제/AI 재생성이 참조를 깨뜨리지 않게 하는 유일한 방법이다.
//  2. 참조는 양방향 배열을 모두 유지한다(Requirement.apiIds ↔ ApiSpec.requirementIds).
//     쓰기는 반드시 mutations 를 통해 한 트랜잭션에서 양쪽을 함께 갱신한다.
//  3. 좌표(layout)는 항상 별도 필드다. 이름 편집과 드래그가 충돌하지 않게.

export const DESIGN_SCHEMA_VERSION = 2;

export type Priority = "must" | "should" | "could";
export type ScreenRole = "page" | "modal" | "external";
export type TransitionKind = "navigate" | "submit" | "redirect" | "back";
export type CrudHint = "C" | "R" | "U" | "D" | "";
export type Cardinality = "1:1" | "1:N" | "N:M";
export type OnDeleteAction = "CASCADE" | "RESTRICT" | "SET_NULL" | "";
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export interface Point {
  x: number;
  y: number;
}

export interface TechStack {
  backend: string;
  frontend: string;
  db: string;
}

/**
 * 폐기된 데이터 플로우 탭의 원본 데이터를 그대로 보관한다.
 *
 * 변환하지 않고 통째로 들고 있는 이유는 두 가지다.
 *  1. 화면으로 승격되는 것은 client 노드뿐이고 server/db/external 노드와
 *     그 사이 연결선은 새 모델에 담을 자리가 없다. 변환하면 반드시 잃는다.
 *  2. 원본을 그대로 두면 자료실·마이페이지 역투영이 예전 다이어그램을
 *     정확히 재현한다. 근사치로 다시 그리지 않아도 된다.
 *
 * 값은 reactflow 노드/엣지 배열의 JSON 문자열이며, 빈 값은 "[]" 이다.
 */
export interface LegacyFlowSnapshot {
  nodesJson: string;
  edgesJson: string;
}

export interface DesignMeta {
  projectSummary: string;
  techStack: TechStack;
  legacyFlow: LegacyFlowSnapshot;
}

export interface Requirement {
  id: string;
  /** 표시용 번호(R-01). 재정렬 가능하며 참조에 절대 쓰지 않는다. */
  code: string;
  category: string;
  name: string;
  description: string;
  priority: Priority;
  screenIds: string[];
  apiIds: string[];
}

export interface Screen {
  id: string;
  /** 라우트 경로. React 코드 생성의 입력이 된다. */
  key: string;
  name: string;
  description: string;
  role: ScreenRole;
  isEntry: boolean;
  requiresAuth: boolean;
  requirementIds: string[];
  apiIds: string[];
  layout: Point;
}

export interface ScreenTransition {
  id: string;
  from: string;
  to: string;
  /** 사용자 행동 라벨. 예: "로그인 버튼 클릭" */
  trigger: string;
  kind: TransitionKind;
  condition: string;
  apiIds: string[];
}

export interface ApiSpec {
  id: string;
  method: HttpMethod;
  endpoint: string;
  description: string;
  /** 요청 본문 예시(JSON 문자열) */
  request: string;
  /** 응답 본문 예시(JSON 문자열) */
  response: string;
  auth: boolean;
  crud: CrudHint;
  requirementIds: string[];
  screenIds: string[];
  tableIds: string[];
}

export interface Column {
  id: string;
  name: string;
  type: string;
  length: number | null;
  nullable: boolean;
  isPk: boolean;
  isFk: boolean;
  defaultValue: string;
  comment: string;
}

export interface Table {
  id: string;
  /** DB 물리명(snake_case) */
  name: string;
  /** 코드 생성용 클래스명. 비면 name 에서 파생한다. */
  entityName: string;
  description: string;
  columns: Column[];
  layout: Point;
}

export interface Relation {
  id: string;
  fromTableId: string;
  fromColumnId: string;
  toTableId: string;
  toColumnId: string;
  cardinality: Cardinality;
  onDelete: OnDeleteAction;
  /**
   * 관계에 대한 자유 설명.
   * 기존 ERD가 관계선마다 갖고 있던 라벨이 여기로 들어온다.
   * 이 필드가 없으면 마이그레이션에서 그 텍스트가 사라진다.
   */
  note: string;
}

export interface Erd {
  tables: Table[];
  relations: Relation[];
}

export interface DesignModel {
  schemaVersion: number;
  meta: DesignMeta;
  requirements: Requirement[];
  screens: Screen[];
  screenTransitions: ScreenTransition[];
  apis: ApiSpec[];
  erd: Erd;
}

// ── 기본값 팩토리 ──────────────────────────────────────────────────
// Y.Doc 초기화, AI 초안 정규화, 레거시 변환이 모두 이 팩토리를 거쳐야
// 필드 누락으로 인한 undefined 접근이 생기지 않는다.

export function createTechStack(partial: Partial<TechStack> = {}): TechStack {
  return {
    backend: partial.backend ?? "",
    frontend: partial.frontend ?? "",
    db: partial.db ?? "",
  };
}

export function createMeta(partial: Partial<DesignMeta> = {}): DesignMeta {
  return {
    projectSummary: partial.projectSummary ?? "",
    techStack: createTechStack(partial.techStack),
    legacyFlow: {
      nodesJson: partial.legacyFlow?.nodesJson ?? "[]",
      edgesJson: partial.legacyFlow?.edgesJson ?? "[]",
    },
  };
}

export function createRequirement(
  id: string,
  partial: Partial<Requirement> = {},
): Requirement {
  return {
    id,
    code: partial.code ?? "",
    category: partial.category ?? "기본",
    name: partial.name ?? "",
    description: partial.description ?? "",
    priority: partial.priority ?? "should",
    screenIds: partial.screenIds ?? [],
    apiIds: partial.apiIds ?? [],
  };
}

export function createScreen(id: string, partial: Partial<Screen> = {}): Screen {
  return {
    id,
    key: partial.key ?? "",
    name: partial.name ?? "",
    description: partial.description ?? "",
    role: partial.role ?? "page",
    isEntry: partial.isEntry ?? false,
    requiresAuth: partial.requiresAuth ?? false,
    requirementIds: partial.requirementIds ?? [],
    apiIds: partial.apiIds ?? [],
    layout: partial.layout ?? { x: 0, y: 0 },
  };
}

export function createScreenTransition(
  id: string,
  partial: Partial<ScreenTransition> = {},
): ScreenTransition {
  return {
    id,
    from: partial.from ?? "",
    to: partial.to ?? "",
    trigger: partial.trigger ?? "",
    kind: partial.kind ?? "navigate",
    condition: partial.condition ?? "",
    apiIds: partial.apiIds ?? [],
  };
}

export function createApiSpec(id: string, partial: Partial<ApiSpec> = {}): ApiSpec {
  return {
    id,
    method: partial.method ?? "GET",
    endpoint: partial.endpoint ?? "",
    description: partial.description ?? "",
    request: partial.request ?? "",
    response: partial.response ?? "",
    auth: partial.auth ?? false,
    crud: partial.crud ?? "",
    requirementIds: partial.requirementIds ?? [],
    screenIds: partial.screenIds ?? [],
    tableIds: partial.tableIds ?? [],
  };
}

export function createColumn(id: string, partial: Partial<Column> = {}): Column {
  return {
    id,
    name: partial.name ?? "",
    type: partial.type ?? "VARCHAR",
    length: partial.length ?? null,
    nullable: partial.nullable ?? true,
    isPk: partial.isPk ?? false,
    isFk: partial.isFk ?? false,
    defaultValue: partial.defaultValue ?? "",
    comment: partial.comment ?? "",
  };
}

export function createTable(id: string, partial: Partial<Table> = {}): Table {
  return {
    id,
    name: partial.name ?? "",
    entityName: partial.entityName ?? "",
    description: partial.description ?? "",
    columns: partial.columns ?? [],
    layout: partial.layout ?? { x: 0, y: 0 },
  };
}

export function createRelation(id: string, partial: Partial<Relation> = {}): Relation {
  return {
    id,
    fromTableId: partial.fromTableId ?? "",
    fromColumnId: partial.fromColumnId ?? "",
    toTableId: partial.toTableId ?? "",
    toColumnId: partial.toColumnId ?? "",
    cardinality: partial.cardinality ?? "1:N",
    onDelete: partial.onDelete ?? "",
    note: partial.note ?? "",
  };
}

export function createEmptyModel(partial: Partial<DesignModel> = {}): DesignModel {
  return {
    schemaVersion: DESIGN_SCHEMA_VERSION,
    meta: createMeta(partial.meta),
    requirements: partial.requirements ?? [],
    screens: partial.screens ?? [],
    screenTransitions: partial.screenTransitions ?? [],
    apis: partial.apis ?? [],
    erd: {
      tables: partial.erd?.tables ?? [],
      relations: partial.erd?.relations ?? [],
    },
  };
}

/** 문서가 비어 있는지 — AI 초안 안내를 띄울지 판단할 때 쓴다. */
export function isEmptyModel(model: DesignModel): boolean {
  return (
    model.requirements.length === 0 &&
    model.screens.length === 0 &&
    model.apis.length === 0 &&
    model.erd.tables.length === 0
  );
}
