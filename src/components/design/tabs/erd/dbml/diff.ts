// 경로: src/components/design/tabs/erd/dbml/diff.ts
//
// 텍스트로 고친 결과를 구조화된 ERD 에 최소한만 반영하기 위한 차이 계산.
//
// 왜 통째로 갈아끼우지 않는가.
// 테이블과 컬럼의 id 가 바뀌면 그 테이블을 가리키던 API 연결과 캔버스에서
// 옮겨 둔 좌표가 전부 끊긴다. 연결이 이 기능의 핵심이므로, 텍스트를 고쳐도
// 살아 있는 것은 그대로 살려 둬야 한다.
//
// 안전장치 두 가지가 여기 들어 있다.
//  1. 이름 변경 감지 — users 를 members 로 고쳤을 때 "삭제 후 새로 만듦"으로
//     보면 id 와 좌표, 연결이 전부 날아간다. 컬럼 구성이 거의 같으면 같은
//     테이블의 이름이 바뀐 것으로 본다.
//  2. 대량 삭제 보고 — 텍스트를 전체 선택하고 지우면 파싱은 "성공"하고
//     모든 테이블을 지우라는 지시가 된다. 그러면 팀 전원의 ERD 가 한순간에
//     사라진다. 몇 개를 지우게 되는지 함께 돌려주어 화면이 확인을 받게 한다.

import type { Column, Erd, Table } from "../../../model/schema";
import type { ParsedRef, ParsedTable, ParseResult } from "./parser";

/** 이 비율 이상 컬럼이 겹치면 같은 테이블의 이름이 바뀐 것으로 본다. */
const RENAME_SIMILARITY = 0.6;

export interface TablePlan {
  kind: "add" | "update" | "remove";
  tableId: string | null;
  parsed: ParsedTable | null;
  existing: Table | null;
  /** 이름이 바뀐 경우의 이전 이름. 화면에서 확인을 받을 때 쓴다. */
  renamedFrom: string | null;
}

export interface ErdPlan {
  tables: TablePlan[];
  /**
   * 반영 후 남아야 할 관계. 기존 id 를 최대한 재사용한다.
   *
   * 이름을 함께 담는 이유: 아직 만들어지지 않은 테이블/컬럼은 계획 단계에서
   * id 를 알 수 없다. 적용할 때 실제로 만든 뒤 이름으로 다시 찾아 이어 붙인다.
   */
  relations: {
    id: string | null;
    fromTableId: string;
    fromColumnId: string;
    toTableId: string;
    toColumnId: string;
    fromTableName: string;
    fromColumnName: string;
    toTableName: string;
    toColumnName: string;
    cardinality: ParsedRef["cardinality"];
    note: string;
  }[];
  removedTableCount: number;
  existingTableCount: number;
  renames: { from: string; to: string }[];
  /** 지우려는 비율이 커서 사람 확인을 받아야 하는가. */
  needsConfirm: boolean;
}

function columnNames(columns: { name: string }[]): Set<string> {
  return new Set(columns.map((column) => column.name.toLowerCase()));
}

function similarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;

  let shared = 0;
  a.forEach((name) => {
    if (b.has(name)) shared += 1;
  });

  return shared / Math.max(a.size, b.size);
}

/**
 * 파싱 결과를 현재 ERD 에 맞춰 어떻게 반영할지 계획을 세운다.
 * 실제 문서 수정은 하지 않는다. 화면이 확인을 받은 뒤 적용한다.
 */
export function planErdFromParse(parsed: ParseResult, erd: Erd): ErdPlan {
  const usedTableIds = new Set<string>();
  const plans: TablePlan[] = [];
  const renames: { from: string; to: string }[] = [];

  // 1) 이름이 그대로인 테이블끼리 먼저 짝을 짓는다.
  const byName = new Map(erd.tables.map((table) => [table.name.toLowerCase(), table]));
  const unmatchedParsed: ParsedTable[] = [];

  parsed.tables.forEach((parsedTable) => {
    const existing = byName.get(parsedTable.name.toLowerCase());

    if (existing && !usedTableIds.has(existing.id)) {
      usedTableIds.add(existing.id);
      plans.push({
        kind: "update",
        tableId: existing.id,
        parsed: parsedTable,
        existing,
        renamedFrom: null,
      });
      return;
    }

    unmatchedParsed.push(parsedTable);
  });

  // 2) 남은 것끼리 컬럼 구성으로 이름 변경을 찾아낸다.
  const leftoverExisting = erd.tables.filter((table) => !usedTableIds.has(table.id));

  unmatchedParsed.forEach((parsedTable) => {
    const parsedColumns = columnNames(parsedTable.columns);

    let best: { table: Table; score: number } | null = null;

    leftoverExisting.forEach((table) => {
      if (usedTableIds.has(table.id)) return;

      const score = similarity(parsedColumns, columnNames(table.columns));
      if (score >= RENAME_SIMILARITY && (!best || score > best.score)) {
        best = { table, score };
      }
    });

    if (best) {
      const matched = best as { table: Table; score: number };
      usedTableIds.add(matched.table.id);
      renames.push({ from: matched.table.name, to: parsedTable.name });

      plans.push({
        kind: "update",
        tableId: matched.table.id,
        parsed: parsedTable,
        existing: matched.table,
        renamedFrom: matched.table.name,
      });
      return;
    }

    plans.push({
      kind: "add",
      tableId: null,
      parsed: parsedTable,
      existing: null,
      renamedFrom: null,
    });
  });

  // 3) 짝을 못 찾은 기존 테이블은 삭제 대상이다.
  const removed = erd.tables.filter((table) => !usedTableIds.has(table.id));
  removed.forEach((table) => {
    plans.push({
      kind: "remove",
      tableId: table.id,
      parsed: null,
      existing: table,
      renamedFrom: null,
    });
  });

  // 4) 관계를 다시 맺는다. 테이블/컬럼 이름으로 대상을 찾고, 같은 짝이
  //    이미 있었다면 그 id 를 재사용해 캔버스에서 선이 깜빡이지 않게 한다.
  const resolvedByName = new Map<string, { tableId: string; columns: Map<string, string> }>();

  plans.forEach((plan) => {
    if (plan.kind === "remove" || !plan.parsed) return;

    const columns = new Map<string, string>();

    plan.parsed.columns.forEach((parsedColumn) => {
      const existingColumn = plan.existing?.columns.find(
        (column) => column.name.toLowerCase() === parsedColumn.name.toLowerCase(),
      );

      // 새로 생기는 컬럼은 아직 id 가 없다. 적용 단계에서 채운다.
      columns.set(parsedColumn.name.toLowerCase(), existingColumn?.id ?? "");
    });

    resolvedByName.set(plan.parsed.name.toLowerCase(), {
      tableId: plan.tableId ?? "",
      columns,
    });
  });

  const relations = parsed.refs
    .map((ref) => {
      const from = resolvedByName.get(ref.fromTable.toLowerCase());
      const to = resolvedByName.get(ref.toTable.toLowerCase());
      if (!from || !to) return null;

      const fromColumnId = from.columns.get(ref.fromColumn.toLowerCase());
      const toColumnId = to.columns.get(ref.toColumn.toLowerCase());
      if (fromColumnId === undefined || toColumnId === undefined) return null;

      const existing = erd.relations.find(
        (relation) =>
          relation.fromTableId === from.tableId &&
          relation.toTableId === to.tableId &&
          relation.fromColumnId === fromColumnId &&
          relation.toColumnId === toColumnId,
      );

      return {
        id: existing?.id ?? null,
        fromTableId: from.tableId,
        fromColumnId,
        toTableId: to.tableId,
        toColumnId,
        fromTableName: ref.fromTable,
        fromColumnName: ref.fromColumn,
        toTableName: ref.toTable,
        toColumnName: ref.toColumn,
        cardinality: ref.cardinality,
        note: existing?.note ?? "",
      };
    })
    .filter((relation): relation is NonNullable<typeof relation> => relation !== null);

  const removedTableCount = removed.length;
  const existingTableCount = erd.tables.length;

  // 텍스트를 통째로 지운 경우(파싱 결과가 빈 스키마)는 절대 그냥 적용하지 않는다.
  const wipedEverything = parsed.tables.length === 0 && existingTableCount > 0;
  const removesTooMuch =
    existingTableCount > 0 && removedTableCount / existingTableCount > 0.3;

  return {
    tables: plans,
    relations,
    removedTableCount,
    existingTableCount,
    renames,
    needsConfirm: wipedEverything || removesTooMuch,
  };
}

/** 파싱된 컬럼을 문서에 쓸 형태로 옮긴다. */
export function toColumnPatch(parsed: ParsedTable["columns"][number]): Partial<Column> {
  return {
    name: parsed.name,
    type: parsed.type,
    length: parsed.length,
    nullable: parsed.nullable,
    isPk: parsed.isPk,
    defaultValue: parsed.defaultValue,
    comment: parsed.comment,
  };
}
