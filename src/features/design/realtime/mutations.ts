"use client";

// 경로: src/features/design/realtime/mutations.ts
//
// 설계 문서를 고치는 유일한 통로.
//
// 화면마다 Y.Doc 을 직접 건드리게 두면 이 재설계의 핵심인 "연결"이 곧바로
// 깨진다. 요구사항에 API 를 붙이는 동작은 요구사항의 apiIds 와 API 의
// requirementIds 를 함께 써야 하는데, 화면마다 따로 구현하면 언젠가 한쪽을
// 빠뜨린다. 그러면 설계 닥터가 "담당 API 없는 요구사항"을 엉뚱하게 보고하고,
// 사용자는 도구를 믿지 않게 된다.
//
// 그래서 쓰기를 전부 여기로 모으고, 연결은 항상 하나의 transact 안에서
// 양쪽을 같이 갱신한다.

import * as Y from "yjs";

import {
  createApiSpec,
  createColumn,
  createRelation,
  createRequirement,
  createScreen,
  createScreenTransition,
  createTable,
  type ApiSpec,
  type Column,
  type Relation,
  type Requirement,
  type Screen,
  type ScreenTransition,
  type Table,
} from "../model/schema";
import {
  newApiId,
  newColumnId,
  newRelationId,
  newRequirementId,
  newScreenId,
  newTableId,
  newTransitionId,
  nextRequirementCode,
} from "../model/ids";
import {
  apiToY,
  columnToY,
  getApis,
  getMeta,
  getRelations,
  getRequirements,
  getScreens,
  getScreenTransitions,
  getTables,
  relationToY,
  requirementToY,
  screenToY,
  tableToY,
  transitionToY,
} from "./yjsSchema";

type YMapAny = Y.Map<unknown>;
type YArrayOfMaps = Y.Array<YMapAny>;

// ── 공용 도우미 ────────────────────────────────────────────────────

function indexOfId(array: YArrayOfMaps, id: string): number {
  const items = array.toArray() as YMapAny[];
  return items.findIndex((item) => item.get("id") === id);
}

function findById(array: YArrayOfMaps, id: string): YMapAny | null {
  const index = indexOfId(array, id);
  return index >= 0 ? (array.get(index) as YMapAny) : null;
}

function removeById(array: YArrayOfMaps, id: string): void {
  const index = indexOfId(array, id);
  if (index >= 0) array.delete(index, 1);
}

function idListOf(map: YMapAny, key: string): Y.Array<string> | null {
  const value = map.get(key);
  return value instanceof Y.Array ? (value as Y.Array<string>) : null;
}

function addToIdList(map: YMapAny, key: string, id: string): void {
  const list = idListOf(map, key);
  if (!list) return;
  if (list.toArray().includes(id)) return;

  list.push([id]);
}

function removeFromIdList(map: YMapAny, key: string, id: string): void {
  const list = idListOf(map, key);
  if (!list) return;

  const index = list.toArray().indexOf(id);
  if (index >= 0) list.delete(index, 1);
}

/**
 * 긴 텍스트를 프로그램이 통째로 바꿔야 할 때 쓴다(AI 초안 적용 등).
 *
 * 통째로 지우고 다시 넣지 않고 앞뒤로 같은 부분을 남긴다. 그래야 같은
 * 문단을 보고 있던 팀원의 커서가 엉뚱한 곳으로 튀지 않고, 한 글자 고쳤을 때
 * 문서 전체가 오가지 않는다.
 */
export function setLongText(map: YMapAny, key: string, next: string): void {
  const text = map.get(key);
  if (!(text instanceof Y.Text)) {
    map.set(key, next);
    return;
  }

  const current = text.toString();
  if (current === next) return;

  let prefix = 0;
  const maxPrefix = Math.min(current.length, next.length);
  while (prefix < maxPrefix && current[prefix] === next[prefix]) prefix += 1;

  let suffix = 0;
  const maxSuffix = Math.min(current.length - prefix, next.length - prefix);
  while (
    suffix < maxSuffix &&
    current[current.length - 1 - suffix] === next[next.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  const removeCount = current.length - prefix - suffix;
  const inserted = next.slice(prefix, next.length - suffix);

  if (removeCount > 0) text.delete(prefix, removeCount);
  if (inserted) text.insert(prefix, inserted);
}

function setPoint(map: YMapAny, key: string, x: number, y: number): void {
  const point = map.get(key);

  if (point instanceof Y.Map) {
    point.set("x", x);
    point.set("y", y);
    return;
  }

  const created = new Y.Map<unknown>();
  created.set("x", x);
  created.set("y", y);
  map.set(key, created);
}

// ── 팩토리 ─────────────────────────────────────────────────────────

/**
 * 내가 한 편집이라는 표식.
 *
 * 실행취소가 이 표식이 붙은 것만 되돌린다. 스코프 없이 UndoManager 를 쓰면
 * Ctrl+Z 한 번에 팀원의 편집까지 사라지는데, 실시간 협업에서 가장 흔한
 * 사고다. 쓰기가 모두 아래 tx() 한 줄을 지나므로 여기 한 곳만 표시하면 된다.
 */
export const LOCAL_ORIGIN = Symbol("design-local-edit");

export function createDesignMutations(doc: Y.Doc) {
  const requirements = () => getRequirements(doc);
  const screens = () => getScreens(doc);
  const transitions = () => getScreenTransitions(doc);
  const apis = () => getApis(doc);
  const tables = () => getTables(doc);
  const relations = () => getRelations(doc);

  const tx = <T>(fn: () => T): T => doc.transact(fn, LOCAL_ORIGIN);

  return {
    // ── 메타 ──────────────────────────────────────────────────────
    setProjectSummary(summary: string) {
      tx(() => getMeta(doc).set("projectSummary", summary));
    },

    setTechStack(part: Partial<{ backend: string; frontend: string; db: string }>) {
      tx(() => {
        const stack = getMeta(doc).get("techStack");
        if (!(stack instanceof Y.Map)) return;

        Object.entries(part).forEach(([key, value]) => {
          if (typeof value === "string") stack.set(key, value);
        });
      });
    },

    // ── 요구사항 ──────────────────────────────────────────────────
    addRequirement(partial: Partial<Requirement> = {}): string {
      const id = newRequirementId();

      tx(() => {
        const existingCodes = (requirements().toArray() as YMapAny[]).map(
          (item) => String(item.get("code") ?? ""),
        );

        requirements().push([
          requirementToY(
            createRequirement(id, { ...partial, code: nextRequirementCode(existingCodes) }),
          ),
        ]);
      });

      return id;
    },

    updateRequirement(id: string, patch: Partial<Requirement>) {
      tx(() => {
        const item = findById(requirements(), id);
        if (!item) return;

        if (patch.category !== undefined) item.set("category", patch.category);
        if (patch.name !== undefined) item.set("name", patch.name);
        if (patch.priority !== undefined) item.set("priority", patch.priority);
        if (patch.description !== undefined) setLongText(item, "description", patch.description);
      });
    },

    /**
     * 요구사항을 지우면 이 요구사항을 가리키던 화면과 API 의 역참조도 함께
     * 지운다. 남겨 두면 설계 닥터가 "존재하지 않는 항목 참조" 오류로 잡는다.
     */
    removeRequirement(id: string) {
      tx(() => {
        (screens().toArray() as YMapAny[]).forEach((screen) =>
          removeFromIdList(screen, "requirementIds", id),
        );
        (apis().toArray() as YMapAny[]).forEach((api) =>
          removeFromIdList(api, "requirementIds", id),
        );
        removeById(requirements(), id);
      });
    },

    // ── 화면 ──────────────────────────────────────────────────────
    addScreen(partial: Partial<Screen> = {}): string {
      const id = newScreenId();
      tx(() => screens().push([screenToY(createScreen(id, partial))]));
      return id;
    },

    updateScreen(id: string, patch: Partial<Screen>) {
      tx(() => {
        const item = findById(screens(), id);
        if (!item) return;

        if (patch.key !== undefined) item.set("key", patch.key);
        if (patch.name !== undefined) item.set("name", patch.name);
        if (patch.role !== undefined) item.set("role", patch.role);
        if (patch.isEntry !== undefined) item.set("isEntry", patch.isEntry);
        if (patch.requiresAuth !== undefined) item.set("requiresAuth", patch.requiresAuth);
        if (patch.description !== undefined) setLongText(item, "description", patch.description);
      });
    },

    /**
     * 드래그가 끝났을 때만 부른다.
     * 드래그 중 매 프레임 부르면 그 좌표가 전부 팀원에게 방송되어 연결이 죽는다.
     */
    moveScreen(id: string, x: number, y: number) {
      tx(() => {
        const item = findById(screens(), id);
        if (item) setPoint(item, "layout", x, y);
      });
    },

    removeScreen(id: string) {
      tx(() => {
        (requirements().toArray() as YMapAny[]).forEach((item) =>
          removeFromIdList(item, "screenIds", id),
        );
        (apis().toArray() as YMapAny[]).forEach((item) =>
          removeFromIdList(item, "screenIds", id),
        );

        // 이 화면에 걸린 전이도 같이 사라져야 한다. 남으면 끊어진 화살표가 된다.
        const orphanTransitions = (transitions().toArray() as YMapAny[])
          .filter((item) => item.get("from") === id || item.get("to") === id)
          .map((item) => String(item.get("id")));

        orphanTransitions.forEach((transitionId) => removeById(transitions(), transitionId));
        removeById(screens(), id);
      });
    },

    // ── 화면 전이 ─────────────────────────────────────────────────
    addTransition(from: string, to: string, partial: Partial<ScreenTransition> = {}): string {
      const id = newTransitionId();
      tx(() =>
        transitions().push([
          transitionToY(createScreenTransition(id, { ...partial, from, to })),
        ]),
      );
      return id;
    },

    updateTransition(id: string, patch: Partial<ScreenTransition>) {
      tx(() => {
        const item = findById(transitions(), id);
        if (!item) return;

        if (patch.trigger !== undefined) item.set("trigger", patch.trigger);
        if (patch.kind !== undefined) item.set("kind", patch.kind);
        if (patch.condition !== undefined) item.set("condition", patch.condition);
      });
    },

    removeTransition(id: string) {
      tx(() => removeById(transitions(), id));
    },

    // ── API 명세 ──────────────────────────────────────────────────
    addApi(partial: Partial<ApiSpec> = {}): string {
      const id = newApiId();
      tx(() => apis().push([apiToY(createApiSpec(id, partial))]));
      return id;
    },

    updateApi(id: string, patch: Partial<ApiSpec>) {
      tx(() => {
        const item = findById(apis(), id);
        if (!item) return;

        if (patch.method !== undefined) item.set("method", patch.method);
        if (patch.endpoint !== undefined) item.set("endpoint", patch.endpoint);
        if (patch.auth !== undefined) item.set("auth", patch.auth);
        if (patch.crud !== undefined) item.set("crud", patch.crud);
        if (patch.description !== undefined) setLongText(item, "description", patch.description);
        if (patch.request !== undefined) setLongText(item, "request", patch.request);
        if (patch.response !== undefined) setLongText(item, "response", patch.response);
      });
    },

    removeApi(id: string) {
      tx(() => {
        (requirements().toArray() as YMapAny[]).forEach((item) =>
          removeFromIdList(item, "apiIds", id),
        );
        (screens().toArray() as YMapAny[]).forEach((item) =>
          removeFromIdList(item, "apiIds", id),
        );
        (transitions().toArray() as YMapAny[]).forEach((item) =>
          removeFromIdList(item, "apiIds", id),
        );
        removeById(apis(), id);
      });
    },

    // ── ERD ───────────────────────────────────────────────────────
    addTable(partial: Partial<Table> = {}): string {
      const id = newTableId();

      tx(() =>
        tables().push([
          tableToY(
            createTable(id, {
              ...partial,
              // 표를 만들자마자 기본키 없는 테이블이 되지 않게 한다.
              // 기본키가 없으면 코드 생성이 아예 막힌다.
              columns: partial.columns ?? [
                createColumn(newColumnId(), {
                  name: "id",
                  type: "BIGINT",
                  isPk: true,
                  nullable: false,
                }),
              ],
            }),
          ),
        ]),
      );

      return id;
    },

    updateTable(id: string, patch: Partial<Table>) {
      tx(() => {
        const item = findById(tables(), id);
        if (!item) return;

        if (patch.name !== undefined) item.set("name", patch.name);
        if (patch.entityName !== undefined) item.set("entityName", patch.entityName);
        if (patch.description !== undefined) setLongText(item, "description", patch.description);
      });
    },

    moveTable(id: string, x: number, y: number) {
      tx(() => {
        const item = findById(tables(), id);
        if (item) setPoint(item, "layout", x, y);
      });
    },

    removeTable(id: string) {
      tx(() => {
        (apis().toArray() as YMapAny[]).forEach((api) =>
          removeFromIdList(api, "tableIds", id),
        );

        // 이 테이블에 걸린 관계도 함께 지운다. 남기면 끊어진 관계선이 된다.
        const orphanRelations = (relations().toArray() as YMapAny[])
          .filter((item) => item.get("fromTableId") === id || item.get("toTableId") === id)
          .map((item) => String(item.get("id")));

        orphanRelations.forEach((relationId) => removeById(relations(), relationId));
        removeById(tables(), id);
      });
    },

    addColumn(tableId: string, partial: Partial<Column> = {}): string {
      const id = newColumnId();

      tx(() => {
        const table = findById(tables(), tableId);
        const columns = table?.get("columns");
        if (!(columns instanceof Y.Array)) return;

        (columns as YArrayOfMaps).push([columnToY(createColumn(id, partial))]);
      });

      return id;
    },

    updateColumn(tableId: string, columnId: string, patch: Partial<Column>) {
      tx(() => {
        const table = findById(tables(), tableId);
        const columns = table?.get("columns");
        if (!(columns instanceof Y.Array)) return;

        const column = findById(columns as YArrayOfMaps, columnId);
        if (!column) return;

        if (patch.name !== undefined) column.set("name", patch.name);
        if (patch.type !== undefined) column.set("type", patch.type);
        if (patch.length !== undefined) column.set("length", patch.length);
        if (patch.nullable !== undefined) column.set("nullable", patch.nullable);
        if (patch.isPk !== undefined) column.set("isPk", patch.isPk);
        if (patch.isFk !== undefined) column.set("isFk", patch.isFk);
        if (patch.defaultValue !== undefined) column.set("defaultValue", patch.defaultValue);
        if (patch.comment !== undefined) column.set("comment", patch.comment);
      });
    },

    removeColumn(tableId: string, columnId: string) {
      tx(() => {
        const table = findById(tables(), tableId);
        const columns = table?.get("columns");
        if (!(columns instanceof Y.Array)) return;

        // 이 컬럼을 쓰던 관계는 더 이상 성립하지 않는다.
        const orphanRelations = (relations().toArray() as YMapAny[])
          .filter(
            (item) =>
              item.get("fromColumnId") === columnId || item.get("toColumnId") === columnId,
          )
          .map((item) => String(item.get("id")));

        orphanRelations.forEach((relationId) => removeById(relations(), relationId));
        removeById(columns as YArrayOfMaps, columnId);
      });
    },

    addRelation(partial: Partial<Relation> = {}): string {
      const id = newRelationId();

      tx(() => {
        relations().push([relationToY(createRelation(id, partial))]);

        // 관계에 쓰인 컬럼은 외래키로 표시해 준다. 사용자가 따로 켜지 않아도
        // 설계 닥터가 "관계에 쓰였는데 FK 표시가 없다"고 잔소리하지 않는다.
        if (partial.fromTableId && partial.fromColumnId) {
          const table = findById(tables(), partial.fromTableId);
          const columns = table?.get("columns");

          if (columns instanceof Y.Array) {
            const column = findById(columns as YArrayOfMaps, partial.fromColumnId);
            column?.set("isFk", true);
          }
        }
      });

      return id;
    },

    updateRelation(id: string, patch: Partial<Relation>) {
      tx(() => {
        const item = findById(relations(), id);
        if (!item) return;

        if (patch.fromTableId !== undefined) item.set("fromTableId", patch.fromTableId);
        if (patch.fromColumnId !== undefined) item.set("fromColumnId", patch.fromColumnId);
        if (patch.toTableId !== undefined) item.set("toTableId", patch.toTableId);
        if (patch.toColumnId !== undefined) item.set("toColumnId", patch.toColumnId);
        if (patch.cardinality !== undefined) item.set("cardinality", patch.cardinality);
        if (patch.onDelete !== undefined) item.set("onDelete", patch.onDelete);
        if (patch.note !== undefined) item.set("note", patch.note);
      });
    },

    removeRelation(id: string) {
      tx(() => removeById(relations(), id));
    },

    // ── 연결 (항상 양쪽을 함께 쓴다) ────────────────────────────────

    linkRequirementScreen(requirementId: string, screenId: string, linked: boolean) {
      tx(() => {
        const requirement = findById(requirements(), requirementId);
        const screen = findById(screens(), screenId);
        if (!requirement || !screen) return;

        if (linked) {
          addToIdList(requirement, "screenIds", screenId);
          addToIdList(screen, "requirementIds", requirementId);
        } else {
          removeFromIdList(requirement, "screenIds", screenId);
          removeFromIdList(screen, "requirementIds", requirementId);
        }
      });
    },

    linkRequirementApi(requirementId: string, apiId: string, linked: boolean) {
      tx(() => {
        const requirement = findById(requirements(), requirementId);
        const api = findById(apis(), apiId);
        if (!requirement || !api) return;

        if (linked) {
          addToIdList(requirement, "apiIds", apiId);
          addToIdList(api, "requirementIds", requirementId);
        } else {
          removeFromIdList(requirement, "apiIds", apiId);
          removeFromIdList(api, "requirementIds", requirementId);
        }
      });
    },

    linkScreenApi(screenId: string, apiId: string, linked: boolean) {
      tx(() => {
        const screen = findById(screens(), screenId);
        const api = findById(apis(), apiId);
        if (!screen || !api) return;

        if (linked) {
          addToIdList(screen, "apiIds", apiId);
          addToIdList(api, "screenIds", screenId);
        } else {
          removeFromIdList(screen, "apiIds", apiId);
          removeFromIdList(api, "screenIds", screenId);
        }
      });
    },

    /**
     * AI 초안을 문서에 더한다.
     *
     * 이미 있는 것은 건드리지 않고 새 항목만 넣는다. 덮어쓰기가 아니라
     * 더하기라, 사용자가 그동안 손으로 적어 둔 내용이 사라질 일이 없다.
     *
     * 항목의 id 는 서버가 이미 붙여 두었고 그 안에서 서로를 가리키고 있으므로
     * 그대로 넣는다. 여기서 새 id 를 발급하면 연결이 전부 끊긴다.
     *
     * 전체를 한 트랜잭션으로 묶어 팀원 화면에 반쯤 만들어진 상태가 보이지 않게 한다.
     */
    applyDraft(draft: {
      meta?: { projectSummary?: string; techStack?: Partial<{ backend: string; frontend: string; db: string }> };
      requirements?: Requirement[];
      screens?: Screen[];
      screenTransitions?: ScreenTransition[];
      apis?: ApiSpec[];
      erd?: { tables?: Table[]; relations?: Relation[] };
    }) {
      tx(() => {
        const existingIds = new Set<string>();
        const collect = (array: YArrayOfMaps) =>
          (array.toArray() as YMapAny[]).forEach((item) =>
            existingIds.add(String(item.get("id"))),
          );

        collect(requirements());
        collect(screens());
        collect(transitions());
        collect(apis());
        collect(tables());
        collect(relations());

        const meta = getMeta(doc);

        // 요약과 기술 스택은 비어 있을 때만 채운다. 사용자가 적어 둔 것을
        // AI 입력값으로 덮지 않는다.
        if (draft.meta?.projectSummary && !meta.get("projectSummary")) {
          meta.set("projectSummary", draft.meta.projectSummary);
        }

        const stack = meta.get("techStack");
        if (stack instanceof Y.Map && draft.meta?.techStack) {
          Object.entries(draft.meta.techStack).forEach(([key, value]) => {
            if (typeof value === "string" && value && !stack.get(key)) {
              stack.set(key, value);
            }
          });
        }

        const push = <T extends { id: string }>(
          array: YArrayOfMaps,
          items: T[] | undefined,
          toY: (item: T) => YMapAny,
        ) => {
          const fresh = (items ?? []).filter((item) => !existingIds.has(item.id));
          if (fresh.length > 0) array.push(fresh.map(toY));
        };

        push(requirements(), draft.requirements, requirementToY);
        push(screens(), draft.screens, screenToY);
        push(transitions(), draft.screenTransitions, transitionToY);
        push(apis(), draft.apis, apiToY);
        push(tables(), draft.erd?.tables, tableToY);
        push(relations(), draft.erd?.relations, relationToY);
      });
    },

    /**
     * 문서 내용을 통째로 다른 것으로 바꾼다. 되돌리기가 쓴다.
     *
     * 예전 문서를 새로 만들어 붙이지 않고 <b>살아 있는 문서 안에서 내용만</b>
     * 바꾸는 것이 중요하다. 서버는 CRDT 를 모르므로 서버에 저장된 것만
     * 되돌려 봐야, 접속 중인 사람의 브라우저가 자기 문서를 그대로 들고 있다가
     * 다음 저장 때 도로 덮어쓴다. 이렇게 하면 팀원 화면에도 즉시 반영되고
     * 그 상태가 그대로 굳는다.
     *
     * 한 트랜잭션으로 묶어 반쯤 비워진 문서가 남에게 보이지 않게 하고,
     * 표식이 붙으므로 Ctrl+Z 로도 되돌릴 수 있다.
     */
    replaceAll(next: {
      meta?: {
        projectSummary?: string;
        techStack?: Partial<{ backend: string; frontend: string; db: string }>;
      };
      requirements?: Requirement[];
      screens?: Screen[];
      screenTransitions?: ScreenTransition[];
      apis?: ApiSpec[];
      erd?: { tables?: Table[]; relations?: Relation[] };
    }) {
      tx(() => {
        const meta = getMeta(doc);

        if (typeof next.meta?.projectSummary === "string") {
          meta.set("projectSummary", next.meta.projectSummary);
        }

        const stack = meta.get("techStack");
        if (stack instanceof Y.Map && next.meta?.techStack) {
          Object.entries(next.meta.techStack).forEach(([key, value]) => {
            if (typeof value === "string") stack.set(key, value);
          });
        }

        const swap = <T extends { id: string }>(
          array: YArrayOfMaps,
          items: T[] | undefined,
          toY: (item: T) => YMapAny,
        ) => {
          if (array.length > 0) array.delete(0, array.length);
          const fresh = items ?? [];
          if (fresh.length > 0) array.push(fresh.map(toY));
        };

        swap(requirements(), next.requirements, requirementToY);
        swap(screens(), next.screens, screenToY);
        swap(transitions(), next.screenTransitions, transitionToY);
        swap(apis(), next.apis, apiToY);
        swap(tables(), next.erd?.tables, tableToY);
        swap(relations(), next.erd?.relations, relationToY);
      });
    },

    /**
     * API 와 테이블만 한쪽 배열로 둔다.
     * 테이블에 apiIds 를 두지 않는 이유는, 테이블의 진짜 주인이 ERD 텍스트라
     * 텍스트를 고쳐 쓸 때마다 역참조를 다시 맞춰야 하는 부담이 생기기 때문이다.
     * 어느 API 가 이 테이블을 쓰는지는 API 쪽을 훑어 구하면 된다.
     */
    linkApiTable(apiId: string, tableId: string, linked: boolean) {
      tx(() => {
        const api = findById(apis(), apiId);
        if (!api) return;

        if (linked) addToIdList(api, "tableIds", tableId);
        else removeFromIdList(api, "tableIds", tableId);
      });
    },
  };
}

export type DesignMutations = ReturnType<typeof createDesignMutations>;
