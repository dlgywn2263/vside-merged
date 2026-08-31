// 경로: src/features/design/tabs/erd/dbml/serialize.ts
//
// 구조화된 ERD 를 DBML 텍스트로 옮긴다.
//
// 좌표는 절대 쓰지 않는다. 텍스트에 좌표가 섞이면 누가 노드를 조금 옮길
// 때마다 텍스트 전체에 변경이 생겨, 사람이 읽는 문서로서 쓸모가 없어진다.
// 좌표는 문서 안에 따로 보관되고 이름으로 다시 이어 붙는다.

import type { Erd, Relation, Table } from "../../../model/schema";

const ARROW: Record<Relation["cardinality"], string> = {
  "1:1": "-",
  "1:N": ">",
  "N:M": "<>",
};

function columnSettings(
  column: Table["columns"][number],
  inlineRef: string | null,
): string {
  const parts: string[] = [];

  if (column.isPk) parts.push("pk");
  else if (!column.nullable) parts.push("not null");

  if (column.defaultValue) parts.push(`default: ${column.defaultValue}`);
  if (inlineRef) parts.push(`ref: ${inlineRef}`);
  if (column.comment) parts.push(`note: "${column.comment.replace(/"/g, "'")}"`);

  return parts.length > 0 ? ` [${parts.join(", ")}]` : "";
}

export function serializeDbml(erd: Erd): string {
  const tableById = new Map(erd.tables.map((table) => [table.id, table]));

  // 컬럼 한 줄로 표현할 수 있는 관계는 그 줄에 붙인다. 읽기 쉬워지고
  // 별도 Ref 줄이 줄어든다.
  const inlineRefByColumn = new Map<string, string>();
  const standaloneRefs: Relation[] = [];

  erd.relations.forEach((relation) => {
    const fromTable = tableById.get(relation.fromTableId);
    const toTable = tableById.get(relation.toTableId);

    const fromColumn = fromTable?.columns.find((c) => c.id === relation.fromColumnId);
    const toColumn = toTable?.columns.find((c) => c.id === relation.toColumnId);

    if (fromTable && toTable && fromColumn && toColumn) {
      inlineRefByColumn.set(
        `${fromTable.id}:${fromColumn.id}`,
        `${ARROW[relation.cardinality]} ${toTable.name}.${toColumn.name}`,
      );
      return;
    }

    // 아직 컬럼이 정해지지 않은 관계(예전 데이터에서 넘어온 것)는 주석으로
    // 남긴다. 조용히 버리면 사용자가 그려 둔 관계가 사라진 것처럼 보인다.
    standaloneRefs.push(relation);
  });

  const blocks = erd.tables.map((table) => {
    const width = Math.max(
      4,
      ...table.columns.map((column) => column.name.length),
    );

    const lines = table.columns.map((column) => {
      const type = column.length ? `${column.type}(${column.length})` : column.type;
      const inlineRef = inlineRefByColumn.get(`${table.id}:${column.id}`) ?? null;

      return `  ${column.name.padEnd(width)} ${type}${columnSettings(column, inlineRef)}`;
    });

    const note = table.description
      ? [`  note: "${table.description.replace(/"/g, "'")}"`]
      : [];

    return [`Table ${table.name} {`, ...note, ...lines, "}"].join("\n");
  });

  const leftovers = standaloneRefs.map((relation) => {
    const fromTable = tableById.get(relation.fromTableId);
    const toTable = tableById.get(relation.toTableId);
    const note = relation.note ? ` ${relation.note}` : "";

    return `// 연결할 컬럼이 아직 정해지지 않은 관계: ${fromTable?.name ?? "?"} -> ${
      toTable?.name ?? "?"
    }${note}`;
  });

  return [...blocks, ...leftovers].join("\n\n");
}
