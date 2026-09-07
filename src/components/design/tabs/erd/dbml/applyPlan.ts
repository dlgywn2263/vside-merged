// 경로: src/components/design/tabs/erd/dbml/applyPlan.ts
//
// 차이 계산 결과를 실제 문서에 반영한다.
//
// 반영은 반드시 최소 연산으로 한다. 통째로 지우고 다시 만들면 테이블 id 가
// 바뀌어 그 테이블을 가리키던 API 연결과 캔버스 좌표가 전부 끊긴다.

import type { DesignModel } from "../../../model/schema";
import type { DesignMutations } from "../../../realtime/mutations";
import type { ErdPlan } from "./diff";
import { toColumnPatch } from "./diff";

export function applyErdPlan(
  plan: ErdPlan,
  model: DesignModel,
  mutations: DesignMutations,
): void {
  // 계획 단계에서 아직 id 가 없던 테이블/컬럼을 여기서 만들며 채워 넣는다.
  const tableIdByName = new Map<string, string>();
  const columnIdByKey = new Map<string, string>();

  model.erd.tables.forEach((table) => {
    tableIdByName.set(table.name.toLowerCase(), table.id);
    table.columns.forEach((column) =>
      columnIdByKey.set(`${table.id}:${column.name.toLowerCase()}`, column.id),
    );
  });

  // 1) 삭제
  plan.tables
    .filter((item) => item.kind === "remove" && item.tableId)
    .forEach((item) => {
      mutations.removeTable(item.tableId as string);
      tableIdByName.delete((item.existing?.name ?? "").toLowerCase());
    });

  // 2) 추가
  plan.tables
    .filter((item) => item.kind === "add" && item.parsed)
    .forEach((item) => {
      const parsed = item.parsed!;

      const tableId = mutations.addTable({
        name: parsed.name,
        description: parsed.note,
        // 컬럼은 아래에서 하나씩 넣는다. 기본 id 컬럼이 자동으로 붙지 않도록
        // 빈 배열을 명시한다.
        columns: [],
      });

      tableIdByName.set(parsed.name.toLowerCase(), tableId);

      parsed.columns.forEach((column) => {
        const columnId = mutations.addColumn(tableId, toColumnPatch(column));
        columnIdByKey.set(`${tableId}:${column.name.toLowerCase()}`, columnId);
      });
    });

  // 3) 갱신
  plan.tables
    .filter((item) => item.kind === "update" && item.parsed && item.tableId)
    .forEach((item) => {
      const parsed = item.parsed!;
      const tableId = item.tableId as string;
      const existing = item.existing;

      if (existing) {
        if (existing.name !== parsed.name) {
          tableIdByName.delete(existing.name.toLowerCase());
          mutations.updateTable(tableId, { name: parsed.name });
        }
        if (existing.description !== parsed.note) {
          mutations.updateTable(tableId, { description: parsed.note });
        }
      }

      tableIdByName.set(parsed.name.toLowerCase(), tableId);

      const parsedNames = new Set(parsed.columns.map((c) => c.name.toLowerCase()));

      // 사라진 컬럼 지우기
      existing?.columns
        .filter((column) => !parsedNames.has(column.name.toLowerCase()))
        .forEach((column) => {
          mutations.removeColumn(tableId, column.id);
          columnIdByKey.delete(`${tableId}:${column.name.toLowerCase()}`);
        });

      // 남거나 새로 생긴 컬럼
      parsed.columns.forEach((column) => {
        const key = `${tableId}:${column.name.toLowerCase()}`;
        const existingColumn = existing?.columns.find(
          (item2) => item2.name.toLowerCase() === column.name.toLowerCase(),
        );

        if (existingColumn) {
          mutations.updateColumn(tableId, existingColumn.id, toColumnPatch(column));
          columnIdByKey.set(key, existingColumn.id);
          return;
        }

        const columnId = mutations.addColumn(tableId, toColumnPatch(column));
        columnIdByKey.set(key, columnId);
      });
    });

  // 4) 관계 맞추기
  //    텍스트가 진짜이므로, 텍스트에 없는 관계는 사라져야 한다.
  //
  //    여기서 이름으로 다시 찾는 이유: 방금 만든 테이블과 컬럼은 계획을
  //    세울 때 아직 id 가 없었다. 위에서 만들며 채워 둔 지도를 써서 잇는다.
  const resolve = (
    tableName: string,
    columnName: string,
    fallbackTableId: string,
    fallbackColumnId: string,
  ): { tableId: string; columnId: string } | null => {
    const tableId = fallbackTableId || tableIdByName.get(tableName.toLowerCase()) || "";
    if (!tableId) return null;

    const columnId =
      fallbackColumnId || columnIdByKey.get(`${tableId}:${columnName.toLowerCase()}`) || "";
    if (!columnId) return null;

    return { tableId, columnId };
  };

  const keptIds = new Set(
    plan.relations.map((relation) => relation.id).filter((id): id is string => Boolean(id)),
  );

  model.erd.relations
    .filter((relation) => !keptIds.has(relation.id))
    .forEach((relation) => mutations.removeRelation(relation.id));

  plan.relations
    .filter((relation) => !relation.id)
    .forEach((relation) => {
      const from = resolve(
        relation.fromTableName,
        relation.fromColumnName,
        relation.fromTableId,
        relation.fromColumnId,
      );
      const to = resolve(
        relation.toTableName,
        relation.toColumnName,
        relation.toTableId,
        relation.toColumnId,
      );

      if (!from || !to) return;

      mutations.addRelation({
        fromTableId: from.tableId,
        fromColumnId: from.columnId,
        toTableId: to.tableId,
        toColumnId: to.columnId,
        cardinality: relation.cardinality,
        note: relation.note,
      });
    });
}
