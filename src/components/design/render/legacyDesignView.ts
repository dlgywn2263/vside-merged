"use client";

// 경로: src/components/design/render/legacyDesignView.ts
//
// 자료실과 마이페이지가 옛 형식의 설계 문서를 읽고 그리는 데 쓰는 함수들.
//
// 이 파일이 생기기 전에는 같은 코드가 app/archive/page.tsx 와
// src/components/mypage/MyPageShell.tsx 에 글자까지 똑같이 복제돼 있었다.
// 한쪽만 고치면 두 화면이 서로 다른 그림을 그리게 되는데, 파일이 각각
// 3,000줄과 5,000줄이라 복제본이 있다는 사실조차 눈에 잘 띄지 않았다.
//
// 새 설계 화면(src/components/design)은 이 함수들을 쓰지 않는다. 저장할 때
// 옛 형식으로도 함께 써 두기 때문에 두 화면이 고치지 않고도 계속 도는 것이고,
// 이 파일은 그 전환기 동안의 읽기 경로다.

export type DesignDocumentItem = {
  erdNodesJson?: string | null;
  erdEdgesJson?: string | null;
  flowNodesJson?: string | null;
  flowEdgesJson?: string | null;
};

export type ParsedDesignDocument = {
  erdNodes: Record<string, unknown>[];
  erdEdges: Record<string, unknown>[];
  flowNodes: Record<string, unknown>[];
  flowEdges: Record<string, unknown>[];
};

type NormalizedDiagramNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  columns: Record<string, unknown>[];
  subText: string;
};

function parseDesignJsonArray(
  value?: string | null,
): Record<string, unknown>[] {
  if (!value || typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is Record<string, unknown> =>
            typeof item === "object" && item !== null && !Array.isArray(item),
        )
      : [];
  } catch {
    return [];
  }
}

export function getParsedDesignDocument(
  designDocument: DesignDocumentItem | null,
): ParsedDesignDocument {
  return {
    erdNodes: parseDesignJsonArray(designDocument?.erdNodesJson),
    erdEdges: parseDesignJsonArray(designDocument?.erdEdgesJson),
    flowNodes: parseDesignJsonArray(designDocument?.flowNodesJson),
    flowEdges: parseDesignJsonArray(designDocument?.flowEdgesJson),
  };
}

export function escapeHtml(value: string) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function escapeHtmlWithLineBreaks(value: string) {
  return escapeHtml(value).replaceAll("\n", "<br />");
}

export function getPrintDateLabel() {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

export function formatApiPayload(value?: string | null) {
  if (!value || !value.trim()) return "-";

  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export function getNodeData(node: Record<string, unknown>) {
  const data = node.data;

  return typeof data === "object" && data !== null && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

export function getNodeLabel(node: Record<string, unknown>, fallback: string) {
  const data = getNodeData(node);
  const label = data.label ?? data.name ?? node.label ?? node.name;

  return typeof label === "string" && label.trim() ? label.trim() : fallback;
}

export function getNodeSubText(node: Record<string, unknown>) {
  const data = getNodeData(node);
  const type = data.type;
  const techStack = data.techStack;

  const typeLabel =
    type === "client"
      ? "화면"
      : type === "server"
        ? "서버/API"
        : type === "db"
          ? "DB"
          : type === "external"
            ? "외부 서비스"
            : typeof type === "string" && type.trim()
              ? type.trim()
              : "설계 노드";

  const techText =
    typeof techStack === "string" && techStack.trim()
      ? techStack.trim()
      : "설명 없음";

  return `${typeLabel} · ${techText}`;
}

export function getNodeColumns(node: Record<string, unknown>) {
  const data = getNodeData(node);
  const columns = data.columns;

  return Array.isArray(columns)
    ? columns.filter(
        (column): column is Record<string, unknown> =>
          typeof column === "object" &&
          column !== null &&
          !Array.isArray(column),
      )
    : [];
}

function getNodePosition(node: Record<string, unknown>, index: number) {
  const position = node.position;

  if (
    typeof position === "object" &&
    position !== null &&
    !Array.isArray(position)
  ) {
    const record = position as Record<string, unknown>;
    const x = Number(record.x);
    const y = Number(record.y);

    return {
      x: Number.isFinite(x) ? x : 120 + (index % 3) * 280,
      y: Number.isFinite(y) ? y : 100 + Math.floor(index / 3) * 190,
    };
  }

  return {
    x: 120 + (index % 3) * 280,
    y: 100 + Math.floor(index / 3) * 190,
  };
}

export function getEdgeSourceTarget(edge: Record<string, unknown>) {
  const source = edge.source;
  const target = edge.target;

  return {
    source: typeof source === "string" ? source : "",
    target: typeof target === "string" ? target : "",
  };
}

export function buildSvgPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
) {
  const midX = (sourceX + targetX) / 2;

  return `M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`;
}

export function normalizeDiagramNodes(
  nodes: Record<string, unknown>[],
  type: "erd" | "flow",
): NormalizedDiagramNode[] {
  return nodes.map((node, index) => {
    const position = getNodePosition(node, index);

    return {
      id: String(node.id ?? `node-${index}`),
      label: getNodeLabel(
        node,
        type === "erd" ? `TABLE_${index + 1}` : `NODE_${index + 1}`,
      ),
      x: position.x,
      y: position.y,
      columns: getNodeColumns(node),
      subText: getNodeSubText(node),
    };
  });
}

export function getDiagramLayout(
  nodes: NormalizedDiagramNode[],
  type: "erd" | "flow",
) {
  const nodeWidth = type === "erd" ? 220 : 270;
  const nodeHeight = type === "erd" ? 138 : 92;
  const padding = 80;

  if (nodes.length === 0) {
    return {
      nodes: [] as NormalizedDiagramNode[],
      width: 760,
      height: 420,
      nodeWidth,
      nodeHeight,
    };
  }

  const minX = Math.min(...nodes.map((node) => node.x));
  const minY = Math.min(...nodes.map((node) => node.y));
  const maxX = Math.max(...nodes.map((node) => node.x));
  const maxY = Math.max(...nodes.map((node) => node.y));

  const offsetX = padding - minX;
  const offsetY = padding - minY;

  return {
    nodes: nodes.map((node) => ({
      ...node,
      x: node.x + offsetX,
      y: node.y + offsetY,
    })),
    width: Math.max(860, maxX - minX + nodeWidth + padding * 2),
    height: Math.max(460, maxY - minY + nodeHeight + padding * 2),
    nodeWidth,
    nodeHeight,
  };
}

export function buildPrintDiagramSvg({
  nodes,
  edges,
  type,
}: {
  nodes: Record<string, unknown>[];
  edges: Record<string, unknown>[];
  type: "erd" | "flow";
}) {
  if (nodes.length === 0) {
    return `<div class="empty small-empty">표시할 다이어그램이 없습니다.</div>`;
  }

  const layout = getDiagramLayout(normalizeDiagramNodes(nodes, type), type);
  const nodeMap = new Map(layout.nodes.map((node) => [node.id, node]));
  const strokeColor = type === "erd" ? "#2563eb" : "#7c3aed";

  const edgeSvg = edges
    .map((edge) => {
      const { source, target } = getEdgeSourceTarget(edge);
      const sourceNode = nodeMap.get(source);
      const targetNode = nodeMap.get(target);

      if (!sourceNode || !targetNode) return "";

      const sourceX = sourceNode.x + layout.nodeWidth;
      const sourceY = sourceNode.y + layout.nodeHeight / 2;
      const targetX = targetNode.x;
      const targetY = targetNode.y + layout.nodeHeight / 2;

      return `
        <path
          d="${buildSvgPath(sourceX, sourceY, targetX, targetY)}"
          fill="none"
          stroke="${strokeColor}"
          stroke-width="2"
          stroke-dasharray="${type === "flow" ? "6 5" : "0"}"
          marker-end="url(#arrow-${type})"
        />
      `;
    })
    .join("");

  const nodeSvg = layout.nodes
    .map((node) => {
      if (type === "erd") {
        const columnRows = node.columns.length
          ? node.columns
              .slice(0, 4)
              .map((column, columnIndex) => {
                const columnName =
                  typeof column.name === "string" ? column.name : "column";
                const columnType =
                  typeof column.type === "string" ? column.type : "TYPE";

                return `
                  <text x="${node.x + 16}" y="${node.y + 74 + columnIndex * 18}" class="diagram-column">
                    ${escapeHtml(columnName)} · ${escapeHtml(columnType)}
                  </text>
                `;
              })
              .join("")
          : `<text x="${node.x + 16}" y="${node.y + 78}" class="diagram-muted">컬럼 없음</text>`;

        return `
          <g>
            <rect x="${node.x}" y="${node.y}" width="${layout.nodeWidth}" height="${layout.nodeHeight}" rx="14" fill="#ffffff" stroke="#bfdbfe" />
            <rect x="${node.x}" y="${node.y}" width="${layout.nodeWidth}" height="42" rx="14" fill="#020617" />
            <text x="${node.x + 16}" y="${node.y + 27}" class="diagram-title diagram-white">${escapeHtml(node.label)}</text>
            ${columnRows}
          </g>
        `;
      }

      return `
        <g>
          <rect x="${node.x}" y="${node.y}" width="${layout.nodeWidth}" height="${layout.nodeHeight}" rx="16" fill="#eff6ff" stroke="#bfdbfe" />
          <circle cx="${node.x + 28}" cy="${node.y + 32}" r="14" fill="#ffffff" stroke="#dbeafe" />
          <text x="${node.x + 52}" y="${node.y + 33}" class="diagram-title">${escapeHtml(node.label)}</text>
          <text x="${node.x + 52}" y="${node.y + 58}" class="diagram-muted">${escapeHtml(node.subText)}</text>
        </g>
      `;
    })
    .join("");

  return `
    <div class="diagram-wrap">
      <svg viewBox="0 0 ${layout.width} ${layout.height}" class="diagram-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="arrow-${type}" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="${strokeColor}" />
          </marker>
          <pattern id="dot-grid-${type}" width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#dbeafe" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="#f8fbff" />
        <rect width="100%" height="100%" fill="url(#dot-grid-${type})" />
        ${edgeSvg}
        ${nodeSvg}
      </svg>
    </div>
  `;
}

function getColumnStringValue(
  column: Record<string, unknown>,
  key: string,
  fallback: string,
) {
  const value = column[key];

  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function getColumnBooleanValue(
  column: Record<string, unknown>,
  keys: string[],
) {
  return keys.some((key) => column[key] === true || column[key] === "true");
}

function getFlowNodeType(node: Record<string, unknown>) {
  const data = getNodeData(node);
  const type = data.type ?? node.type;

  return typeof type === "string" && type.trim() ? type.trim() : "설계 노드";
}

function getFlowNodeTechStack(node: Record<string, unknown>) {
  const data = getNodeData(node);
  const techStack =
    data.techStack ?? data.description ?? data.memo ?? node.description;

  return typeof techStack === "string" && techStack.trim()
    ? techStack.trim()
    : getNodeSubText(node);
}

export function buildErdTablesForDraft(erdNodes: Record<string, unknown>[]) {
  return erdNodes.map((node, index) => ({
    name: getNodeLabel(node, `TABLE_${index + 1}`),
    columns: getNodeColumns(node).map((column) => ({
      name: getColumnStringValue(column, "name", "column"),
      type: getColumnStringValue(column, "type", "TYPE"),
      pk: getColumnBooleanValue(column, ["pk", "primaryKey", "isPrimaryKey"]),
      fk: getColumnBooleanValue(column, ["fk", "foreignKey", "isForeignKey"]),
    })),
  }));
}

export function buildFlowNodesForDraft(flowNodes: Record<string, unknown>[]) {
  return flowNodes.map((node, index) => ({
    label: getNodeLabel(node, `NODE_${index + 1}`),
    type: getFlowNodeType(node),
    techStack: getFlowNodeTechStack(node),
  }));
}
