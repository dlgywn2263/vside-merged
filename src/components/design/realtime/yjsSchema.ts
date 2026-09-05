// 경로: src/components/design/realtime/yjsSchema.ts
//
// 설계 문서를 Y.Doc 안에 어떤 모양으로 담을지 정하고, 문서와 평문 모델
// 사이를 오가는 변환을 제공한다.
//
// 필드 종류를 나눈 기준
//  · 짧은 값(이름, 경로, 타입, method ...)은 그냥 문자열로 둔다. 마지막에
//    쓴 사람이 이긴다. 둘이 같은 칸을 동시에 고치는 일은 드물고, 전부
//    Y.Text 로 만들면 표가 눈에 띄게 느려진다.
//  · 긴 값(설명, 요청/응답 예시)만 Y.Text 로 둬서 같이 타이핑할 수 있게 한다.
//  · 좌표(layout)는 항상 별도 Y.Map 이다. 이름 편집과 드래그가 같은 키에서
//    부딪히지 않게 하기 위해서다.
//
// 주의: 평문 모델로 Y.Doc 을 만드는 것은 시드 단 한 번뿐이다. 여러
// 클라이언트가 각자 만들면 서로 다른 clientID 로 같은 항목을 넣어 내용이
// 인원수만큼 복제된다. 그래서 seedDocFromModel 은 designDocProvider 의
// 시드 경로에서만 호출한다.

import * as Y from "yjs";

import {
  createApiSpec,
  createColumn,
  createEmptyModel,
  createRelation,
  createRequirement,
  createScreen,
  createScreenTransition,
  createTable,
  DESIGN_SCHEMA_VERSION,
  type ApiSpec,
  type Column,
  type DesignModel,
  type Point,
  type Relation,
  type Requirement,
  type Screen,
  type ScreenTransition,
  type Table,
} from "../model/schema";

// ERD의 두 배열을 erd 맵 안에 중첩하지 않고 최상위에 두는 이유가 있다.
// 중첩하면 두 클라이언트가 각자 "erd.tables" 에 새 배열을 만들어 넣을 수
// 있고, 그때 맵의 키 하나를 두고 마지막 쓰기가 이기면서 한쪽이 넣은
// 테이블이 통째로 사라진다. doc.getArray(이름) 은 모든 클라이언트가 같은
// 공유 타입으로 해석하므로 그 위험이 아예 없다.
export const DOC_KEYS = {
  meta: "meta",
  requirements: "requirements",
  screens: "screens",
  screenTransitions: "screenTransitions",
  apis: "apis",
  erdTables: "erdTables",
  erdRelations: "erdRelations",
} as const;

type YMapAny = Y.Map<unknown>;

export function getMeta(doc: Y.Doc): YMapAny {
  return doc.getMap(DOC_KEYS.meta);
}

export function getRequirements(doc: Y.Doc): Y.Array<YMapAny> {
  return doc.getArray(DOC_KEYS.requirements);
}

export function getScreens(doc: Y.Doc): Y.Array<YMapAny> {
  return doc.getArray(DOC_KEYS.screens);
}

export function getScreenTransitions(doc: Y.Doc): Y.Array<YMapAny> {
  return doc.getArray(DOC_KEYS.screenTransitions);
}

export function getApis(doc: Y.Doc): Y.Array<YMapAny> {
  return doc.getArray(DOC_KEYS.apis);
}

export function getTables(doc: Y.Doc): Y.Array<YMapAny> {
  return doc.getArray(DOC_KEYS.erdTables);
}

export function getRelations(doc: Y.Doc): Y.Array<YMapAny> {
  return doc.getArray(DOC_KEYS.erdRelations);
}

// ── 읽기 도우미 ────────────────────────────────────────────────────

function readText(map: YMapAny, key: string): string {
  const value = map.get(key);

  if (value instanceof Y.Text) return value.toString();
  if (typeof value === "string") return value;

  return "";
}

function readString(map: YMapAny, key: string, fallback = ""): string {
  const value = map.get(key);
  return typeof value === "string" ? value : fallback;
}

function readBoolean(map: YMapAny, key: string): boolean {
  return map.get(key) === true;
}

function readIdList(map: YMapAny, key: string): string[] {
  const value = map.get(key);

  if (value instanceof Y.Array) {
    return value.toArray().filter((item): item is string => typeof item === "string");
  }

  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

function readPoint(map: YMapAny, key: string): Point {
  const value = map.get(key);

  if (value instanceof Y.Map) {
    const x = value.get("x");
    const y = value.get("y");
    return {
      x: typeof x === "number" ? x : 0,
      y: typeof y === "number" ? y : 0,
    };
  }

  return { x: 0, y: 0 };
}

// ── 쓰기 도우미 ────────────────────────────────────────────────────

function textOf(value: string): Y.Text {
  const text = new Y.Text();
  if (value) text.insert(0, value);
  return text;
}

function idListOf(values: string[]): Y.Array<string> {
  const array = new Y.Array<string>();
  if (values.length > 0) array.insert(0, values);
  return array;
}

function pointOf(point: Point): YMapAny {
  const map = new Y.Map<unknown>();
  map.set("x", point.x);
  map.set("y", point.y);
  return map;
}

// ── 항목 <-> Y.Map ─────────────────────────────────────────────────

export function requirementToY(item: Requirement): YMapAny {
  const map = new Y.Map<unknown>();
  map.set("id", item.id);
  map.set("code", item.code);
  map.set("category", item.category);
  map.set("name", item.name);
  map.set("description", textOf(item.description));
  map.set("priority", item.priority);
  map.set("screenIds", idListOf(item.screenIds));
  map.set("apiIds", idListOf(item.apiIds));
  return map;
}

function requirementFromY(map: YMapAny): Requirement {
  return createRequirement(readString(map, "id"), {
    code: readString(map, "code"),
    category: readString(map, "category", "기본"),
    name: readString(map, "name"),
    description: readText(map, "description"),
    priority: readString(map, "priority", "should") as Requirement["priority"],
    screenIds: readIdList(map, "screenIds"),
    apiIds: readIdList(map, "apiIds"),
  });
}

export function screenToY(item: Screen): YMapAny {
  const map = new Y.Map<unknown>();
  map.set("id", item.id);
  map.set("key", item.key);
  map.set("name", item.name);
  map.set("description", textOf(item.description));
  map.set("role", item.role);
  map.set("isEntry", item.isEntry);
  map.set("requiresAuth", item.requiresAuth);
  map.set("requirementIds", idListOf(item.requirementIds));
  map.set("apiIds", idListOf(item.apiIds));
  map.set("layout", pointOf(item.layout));
  return map;
}

function screenFromY(map: YMapAny): Screen {
  return createScreen(readString(map, "id"), {
    key: readString(map, "key"),
    name: readString(map, "name"),
    description: readText(map, "description"),
    role: readString(map, "role", "page") as Screen["role"],
    isEntry: readBoolean(map, "isEntry"),
    requiresAuth: readBoolean(map, "requiresAuth"),
    requirementIds: readIdList(map, "requirementIds"),
    apiIds: readIdList(map, "apiIds"),
    layout: readPoint(map, "layout"),
  });
}

export function transitionToY(item: ScreenTransition): YMapAny {
  const map = new Y.Map<unknown>();
  map.set("id", item.id);
  map.set("from", item.from);
  map.set("to", item.to);
  map.set("trigger", item.trigger);
  map.set("kind", item.kind);
  map.set("condition", item.condition);
  map.set("apiIds", idListOf(item.apiIds));
  return map;
}

function transitionFromY(map: YMapAny): ScreenTransition {
  return createScreenTransition(readString(map, "id"), {
    from: readString(map, "from"),
    to: readString(map, "to"),
    trigger: readString(map, "trigger"),
    kind: readString(map, "kind", "navigate") as ScreenTransition["kind"],
    condition: readString(map, "condition"),
    apiIds: readIdList(map, "apiIds"),
  });
}

export function apiToY(item: ApiSpec): YMapAny {
  const map = new Y.Map<unknown>();
  map.set("id", item.id);
  map.set("method", item.method);
  map.set("endpoint", item.endpoint);
  map.set("description", textOf(item.description));
  map.set("request", textOf(item.request));
  map.set("response", textOf(item.response));
  map.set("auth", item.auth);
  map.set("crud", item.crud);
  map.set("requirementIds", idListOf(item.requirementIds));
  map.set("screenIds", idListOf(item.screenIds));
  map.set("tableIds", idListOf(item.tableIds));
  return map;
}

function apiFromY(map: YMapAny): ApiSpec {
  return createApiSpec(readString(map, "id"), {
    method: readString(map, "method", "GET") as ApiSpec["method"],
    endpoint: readString(map, "endpoint"),
    description: readText(map, "description"),
    request: readText(map, "request"),
    response: readText(map, "response"),
    auth: readBoolean(map, "auth"),
    crud: readString(map, "crud") as ApiSpec["crud"],
    requirementIds: readIdList(map, "requirementIds"),
    screenIds: readIdList(map, "screenIds"),
    tableIds: readIdList(map, "tableIds"),
  });
}

export function columnToY(item: Column): YMapAny {
  const map = new Y.Map<unknown>();
  map.set("id", item.id);
  map.set("name", item.name);
  map.set("type", item.type);
  map.set("length", item.length);
  map.set("nullable", item.nullable);
  map.set("isPk", item.isPk);
  map.set("isFk", item.isFk);
  map.set("defaultValue", item.defaultValue);
  map.set("comment", item.comment);
  return map;
}

function columnFromY(map: YMapAny): Column {
  const length = map.get("length");

  return createColumn(readString(map, "id"), {
    name: readString(map, "name"),
    type: readString(map, "type", "VARCHAR"),
    length: typeof length === "number" ? length : null,
    nullable: readBoolean(map, "nullable"),
    isPk: readBoolean(map, "isPk"),
    isFk: readBoolean(map, "isFk"),
    defaultValue: readString(map, "defaultValue"),
    comment: readString(map, "comment"),
  });
}

export function tableToY(item: Table): YMapAny {
  const map = new Y.Map<unknown>();
  map.set("id", item.id);
  map.set("name", item.name);
  map.set("entityName", item.entityName);
  map.set("description", textOf(item.description));
  map.set("layout", pointOf(item.layout));

  const columns = new Y.Array<YMapAny>();
  columns.insert(0, item.columns.map(columnToY));
  map.set("columns", columns);

  return map;
}

function tableFromY(map: YMapAny): Table {
  const columns = map.get("columns");

  return createTable(readString(map, "id"), {
    name: readString(map, "name"),
    entityName: readString(map, "entityName"),
    description: readText(map, "description"),
    layout: readPoint(map, "layout"),
    columns:
      columns instanceof Y.Array
        ? (columns.toArray() as YMapAny[]).map(columnFromY)
        : [],
  });
}

export function relationToY(item: Relation): YMapAny {
  const map = new Y.Map<unknown>();
  map.set("id", item.id);
  map.set("fromTableId", item.fromTableId);
  map.set("fromColumnId", item.fromColumnId);
  map.set("toTableId", item.toTableId);
  map.set("toColumnId", item.toColumnId);
  map.set("cardinality", item.cardinality);
  map.set("onDelete", item.onDelete);
  map.set("note", item.note);
  return map;
}

function relationFromY(map: YMapAny): Relation {
  return createRelation(readString(map, "id"), {
    fromTableId: readString(map, "fromTableId"),
    fromColumnId: readString(map, "fromColumnId"),
    toTableId: readString(map, "toTableId"),
    toColumnId: readString(map, "toColumnId"),
    cardinality: readString(map, "cardinality", "1:N") as Relation["cardinality"],
    onDelete: readString(map, "onDelete") as Relation["onDelete"],
    note: readString(map, "note"),
  });
}

// ── 문서 전체 변환 ──────────────────────────────────────────────────

/**
 * 평문 모델로 빈 문서를 채운다. 시드 경로에서만 호출해야 한다.
 * 자세한 이유는 파일 상단 주석 참고.
 */
export function seedDocFromModel(doc: Y.Doc, model: DesignModel): void {
  doc.transact(() => {
    const meta = getMeta(doc);
    meta.set("schemaVersion", model.schemaVersion || DESIGN_SCHEMA_VERSION);
    meta.set("projectSummary", model.meta.projectSummary);

    const techStack = new Y.Map<unknown>();
    techStack.set("backend", model.meta.techStack.backend);
    techStack.set("frontend", model.meta.techStack.frontend);
    techStack.set("db", model.meta.techStack.db);
    meta.set("techStack", techStack);

    const legacyFlow = new Y.Map<unknown>();
    legacyFlow.set("nodesJson", model.meta.legacyFlow.nodesJson);
    legacyFlow.set("edgesJson", model.meta.legacyFlow.edgesJson);
    meta.set("legacyFlow", legacyFlow);

    getRequirements(doc).insert(0, model.requirements.map(requirementToY));
    getScreens(doc).insert(0, model.screens.map(screenToY));
    getScreenTransitions(doc).insert(0, model.screenTransitions.map(transitionToY));
    getApis(doc).insert(0, model.apis.map(apiToY));
    getTables(doc).insert(0, model.erd.tables.map(tableToY));
    getRelations(doc).insert(0, model.erd.relations.map(relationToY));
  });
}

/** 문서를 평문 모델로 읽어 낸다. 저장할 때마다 서버로 함께 보내는 사본이다. */
export function docToModel(doc: Y.Doc): DesignModel {
  const meta = getMeta(doc);
  const techStack = meta.get("techStack");
  const legacyFlow = meta.get("legacyFlow");

  const readNested = (source: unknown, key: string, fallback: string): string => {
    if (source instanceof Y.Map) {
      const value = source.get(key);
      return typeof value === "string" ? value : fallback;
    }
    return fallback;
  };

  const schemaVersion = meta.get("schemaVersion");

  return createEmptyModel({
    schemaVersion:
      typeof schemaVersion === "number" ? schemaVersion : DESIGN_SCHEMA_VERSION,
    meta: {
      projectSummary: readString(meta, "projectSummary"),
      techStack: {
        backend: readNested(techStack, "backend", ""),
        frontend: readNested(techStack, "frontend", ""),
        db: readNested(techStack, "db", ""),
      },
      legacyFlow: {
        nodesJson: readNested(legacyFlow, "nodesJson", "[]"),
        edgesJson: readNested(legacyFlow, "edgesJson", "[]"),
      },
    },
    requirements: (getRequirements(doc).toArray() as YMapAny[]).map(requirementFromY),
    screens: (getScreens(doc).toArray() as YMapAny[]).map(screenFromY),
    screenTransitions: (getScreenTransitions(doc).toArray() as YMapAny[]).map(
      transitionFromY,
    ),
    apis: (getApis(doc).toArray() as YMapAny[]).map(apiFromY),
    erd: {
      tables: (getTables(doc).toArray() as YMapAny[]).map(tableFromY),
      relations: (getRelations(doc).toArray() as YMapAny[]).map(relationFromY),
    },
  });
}
