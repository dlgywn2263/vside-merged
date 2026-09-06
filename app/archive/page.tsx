"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementType,
} from "react";

import { useRouter } from "next/navigation";

import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Code2,
  Database,
  Download,
  FileText,
  FolderOpen,
  GitBranch,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";

import {
  fetchMyWorkspaces,
  fetchScheduleProgress,
  fetchWorkspaceDevlogs,
  generateFinalReportDraftApi,
  type MyPageDevlogResponse,
  type ScheduleProgressResponse,
  type ScheduleView,
  type WorkspaceDevlogsResponse,
  type WorkspaceListResponse,
  type WorkspaceProjectResponse,
} from "@/components/mypage/api";

import {
  fetchWorkspaceApiSpecsApi,
  fetchWorkspaceDesignDocumentApi,
  fetchWorkspaceRequirementsApi,
} from "@/lib/design/api";

/* =========================================================
   TYPE
   ========================================================= */

type ProjectStatus = "active" | "completed";

type ArchiveTabKey = "devlog" | "design" | "final";

type DesignArchiveSectionKey =
  | "requirements"
  | "api"
  | "erd"
  | "flow";

type ArchivePdfSectionKey =
  | "devlog"
  | "design-requirements"
  | "design-api"
  | "design-erd"
  | "design-flow"
  | "final-report"
  | "final-erd"
  | "final-flow";

type DevlogSortType = "latest" | "oldest";

type ProjectFilter = "all" | "personal" | "team";

type Project = {
  id: string;
  name: string;
  description: string;
  type: "개인" | "팀";
  role: "owner" | "member";
  status: ProjectStatus;
  progress: number;
  language: string;
  stack: string[];
  updatedAt?: string;
  devlogCount: number;
  doneScheduleCount: number;
  scheduleTotalCount: number;
  workspaceId: string;
};

type Devlog = {
  id: string;
  projectId?: string;
  workspaceId: string;
  title: string;
  projectName: string;
  date: string;
  rawDate: string;
  summary: string;
};

type DesignRequirementItem = {
  id: string | number;
  category: string;
  name: string;
  description: string;
};

type DesignApiSpecItem = {
  id: string | number;
  method: string;
  endpoint: string;
  description: string;
  request: string;
  response: string;
};

type DesignDocumentItem = {
  erdNodesJson?: string | null;
  erdEdgesJson?: string | null;
  flowNodesJson?: string | null;
  flowEdgesJson?: string | null;
};

type ParsedDesignDocument = {
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
  /** 화면 흐름 상자 아랫줄에 쓰는 라우트 경로. */
  route: string;
  /** 시작 화면이면 설계단계처럼 초록 테두리를 두른다. */
  isEntry: boolean;
  /** 로그인이 필요한 화면인지. */
  requiresAuth: boolean;
  /** 화면 / 팝업 / 외부. */
  roleLabel: string;
  /** 이 화면이 만족시키는 요구사항 개수. */
  requirementCount: number;
  /** 이 화면이 부르는 API 이름들. */
  apiLabels: string[];
};

function cn(
  ...classes: Array<
    string | false | null | undefined
  >
) {
  return classes.filter(Boolean).join(" ");
}

/* =========================================================
   CONSTANT
   ========================================================= */

const archiveTabs: {
  key: ArchiveTabKey;
  label: string;
  description: string;
  icon: ElementType;
}[] = [
  {
    key: "devlog",
    label: "개발일지",
    description: "프로젝트별 작성 기록",
    icon: BookOpen,
  },
  {
    key: "design",
    label: "설계 문서",
    description: "요구사항·API·ERD·화면 흐름",
    icon: FileText,
  },
  {
    key: "final",
    label: "최종 보고서",
    description: "AI 초안과 PDF 문서화",
    icon: Sparkles,
  },
];

const designSectionTabs: {
  key: DesignArchiveSectionKey;
  label: string;
  description: string;
  icon: ElementType;
}[] = [
  {
    key: "requirements",
    label: "요구사항",
    description: "구현 범위와 기능 조건",
    icon: CheckCircle2,
  },
  {
    key: "api",
    label: "API 명세",
    description: "요청/응답과 엔드포인트",
    icon: Code2,
  },
  {
    key: "erd",
    label: "ERD",
    description: "테이블·컬럼·관계",
    icon: Database,
  },
  {
    key: "flow",
    label: "화면 흐름",
    description: "화면 사이 이동",
    icon: GitBranch,
  },
];

const archivePdfSectionItems: {
  key: ArchivePdfSectionKey;
  label: string;
  group: string;
  printTitle: string;
}[] = [
  {
    key: "devlog",
    label: "개발일지",
    group: "개발일지",
    printTitle: "개발일지",
  },
  {
    key: "design-requirements",
    label: "요구사항",
    group: "설계 문서",
    printTitle: "요구사항 정의",
  },
  {
    key: "design-api",
    label: "API 명세",
    group: "설계 문서",
    printTitle: "API 명세",
  },
  {
    key: "design-erd",
    label: "ERD",
    group: "설계 문서",
    printTitle: "ERD",
  },
  {
    key: "design-flow",
    label: "화면 흐름",
    group: "설계 문서",
    printTitle: "화면 흐름",
  },
  {
    key: "final-report",
    label: "최종 보고서 초안",
    group: "최종 보고서",
    printTitle: "최종 보고서 초안",
  },
  {
    key: "final-erd",
    label: "최종 보고서 ERD",
    group: "최종 보고서",
    printTitle: "최종 보고서 ERD",
  },
  {
    key: "final-flow",
    label: "최종 보고서 화면 흐름",
    group: "최종 보고서",
    printTitle: "최종 보고서 화면 흐름",
  },
];

/* =========================================================
   WORKSPACE / DEVLOG UTILS
   ========================================================= */

function normalizeRole(value: unknown): "owner" | "member" {
  return String(value ?? "").toLowerCase() === "owner"
    ? "owner"
    : "member";
}

function normalizeStack(project: WorkspaceProjectResponse) {
  if (
    Array.isArray(project.stack) &&
    project.stack.length > 0
  ) {
    return project.stack.filter(Boolean);
  }

  if (project.language) {
    return [project.language];
  }

  return ["언어 없음"];
}

function getScheduleViewFromWorkspace(
  workspace: WorkspaceListResponse,
): ScheduleView {
  return workspace.mode === "team"
    ? "team"
    : "personal";
}

function formatDateLabel(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getDevlogSortTime(devlog: Devlog) {
  const value = devlog.rawDate || devlog.date;

  const time = new Date(value).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getStringValue(
  record: Record<string, unknown>,
  keys: string[],
): string {
  for (const key of keys) {
    const value = record[key];

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return "";
}

function getProjectNameFromDevlog(
  devlog: Record<string, unknown>,
  workspace: WorkspaceListResponse,
  rootResponse?: WorkspaceDevlogsResponse | null,
) {
  const directProjectName = getStringValue(
    devlog,
    [
      "projectName",
      "projectTitle",
      "workspaceProjectName",
    ],
  );

  if (directProjectName) {
    return directProjectName;
  }

  const projectObject = devlog.project;

  if (isRecord(projectObject)) {
    const nestedProjectName =
      getStringValue(projectObject, [
        "name",
        "title",
      ]);

    if (nestedProjectName) {
      return nestedProjectName;
    }
  }

  const projectId = getStringValue(
    devlog,
    [
      "projectId",
      "project_id",
      "workspaceProjectId",
      "workspace_project_id",
    ],
  );

  if (projectId) {
    const matchedProject =
      workspace.projects?.find(
        (project) =>
          String(project.id) ===
          String(projectId),
      );

    if (matchedProject?.name) {
      return matchedProject.name;
    }
  }

  if (isRecord(rootResponse)) {
    const responseWorkspaceName =
      getStringValue(rootResponse, [
        "workspaceName",
        "name",
      ]);

    if (responseWorkspaceName) {
      return responseWorkspaceName;
    }
  }

  return workspace.name;
}

function getProjectIdFromDevlog(
  devlog: Record<string, unknown>,
  workspace: WorkspaceListResponse,
) {
  const directProjectId = getStringValue(
    devlog,
    [
      "projectId",
      "project_id",
      "workspaceProjectId",
      "workspace_project_id",
    ],
  );

  if (directProjectId) {
    return directProjectId;
  }

  const projectObject = devlog.project;

  if (isRecord(projectObject)) {
    const nestedProjectId =
      getStringValue(projectObject, [
        "id",
        "projectId",
        "workspaceProjectId",
      ]);

    if (nestedProjectId) {
      return nestedProjectId;
    }
  }

  const projectName =
    getProjectNameFromDevlog(
      devlog,
      workspace,
      null,
    );

  const matchedProject =
    workspace.projects?.find((project) => {
      return (
        project.name === projectName ||
        project.name?.trim() ===
          projectName.trim()
      );
    });

  return matchedProject?.id
    ? String(matchedProject.id)
    : undefined;
}

function looksLikeDevlog(
  value: unknown,
): value is Record<string, unknown> {
  if (!isRecord(value)) {
    return false;
  }

  const hasTitleLike =
    typeof value.title === "string" ||
    typeof value.summary === "string" ||
    typeof value.content === "string";

  const hasDevlogLikeKey =
    "devlogId" in value ||
    "date" in value ||
    "createdAt" in value ||
    "updatedAt" in value ||
    "stage" in value ||
    "goal" in value ||
    "issue" in value ||
    "solution" in value ||
    "nextPlan" in value ||
    "commitHash" in value;

  return hasTitleLike && hasDevlogLikeKey;
}

function collectDevlogCandidates(
  value: unknown,
  result: MyPageDevlogResponse[] = [],
  depth = 0,
): MyPageDevlogResponse[] {
  if (depth > 7) {
    return result;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectDevlogCandidates(
        item,
        result,
        depth + 1,
      );
    }

    return result;
  }

  if (!isRecord(value)) {
    return result;
  }

  if (looksLikeDevlog(value)) {
    result.push(value);

    return result;
  }

  for (const [key, child] of Object.entries(
    value,
  )) {
    const lowerKey = key.toLowerCase();

    const shouldSearch =
      Array.isArray(child) ||
      lowerKey.includes("devlog") ||
      lowerKey.includes("log") ||
      lowerKey.includes("data") ||
      lowerKey.includes("content") ||
      lowerKey.includes("project") ||
      lowerKey.includes("workspace");

    if (shouldSearch) {
      collectDevlogCandidates(
        child,
        result,
        depth + 1,
      );
    }
  }

  return result;
}

function mapDevlogItem(
  devlog: MyPageDevlogResponse,
  workspace: WorkspaceListResponse,
  rootResponse: WorkspaceDevlogsResponse,
  index: number,
): Devlog {
  const id =
    getStringValue(devlog, [
      "id",
      "devlogId",
      "logId",
    ]) || `${workspace.id}-${index}`;

  const title =
    getStringValue(devlog, [
      "title",
      "name",
      "subject",
    ]) || "제목 없는 자료";

  const rawDate =
    getStringValue(devlog, [
      "date",
      "createdAt",
      "updatedAt",
      "writeDate",
      "devlogDate",
      "loggedAt",
    ]) || "";

  const summary =
    getStringValue(devlog, [
      "summary",
      "content",
      "description",
    ]) ||
    getStringValue(devlog, [
      "issue",
      "solution",
      "nextPlan",
    ]) ||
    "작성된 요약이 없습니다.";

  const projectId =
    getProjectIdFromDevlog(
      devlog,
      workspace,
    );

  return {
    id,
    projectId,
    workspaceId: workspace.id,
    title,
    projectName: getProjectNameFromDevlog(
      devlog,
      workspace,
      rootResponse,
    ),
    date: formatDateLabel(rawDate),
    rawDate,
    summary,
  };
}

function mapDevlogsFromWorkspaceResponse(
  response: WorkspaceDevlogsResponse,
  workspace: WorkspaceListResponse,
): Devlog[] {
  const candidates =
    collectDevlogCandidates(response);

  const mapped = candidates.map(
    (devlog, index) =>
      mapDevlogItem(
        devlog,
        workspace,
        response,
        index,
      ),
  );

  const uniqueMap = new Map<
    string,
    Devlog
  >();

  for (const item of mapped) {
    uniqueMap.set(item.id, item);
  }

  return Array.from(uniqueMap.values());
}

function mapProjectsFromWorkspaces(
  workspaces: WorkspaceListResponse[],
  scheduleProgressMap: Map<
    string,
    ScheduleProgressResponse
  >,
): Project[] {
  return workspaces.map((workspace) => {
    normalizeRole(workspace.role);

    const childProjects =
      workspace.projects ?? [];

    const firstProject =
      childProjects[0];

    const scheduleProgress =
      scheduleProgressMap.get(
        workspace.id,
      );

    const progress =
      typeof scheduleProgress?.progress ===
      "number"
        ? scheduleProgress.progress
        : 0;

    const status: ProjectStatus =
      progress >= 100
        ? "completed"
        : "active";

    const language =
      firstProject?.language ||
      childProjects.find(
        (project) => project.language,
      )?.language ||
      "Unknown";

    const stack =
      childProjects.length > 0
        ? Array.from(
            new Set(
              childProjects
                .flatMap((project) =>
                  normalizeStack(project),
                )
                .filter(Boolean),
            ),
          )
        : language
          ? [language]
          : ["언어 없음"];

    const updatedAt =
      workspace.updatedAt ??
      childProjects
        .map(
          (project) =>
            project.updatedAt,
        )
        .filter(Boolean)
        .sort()
        .reverse()[0] ??
      undefined;

    const devlogCount =
      childProjects.reduce(
        (sum, project) =>
          sum +
          Number(
            project.devlogCount ?? 0,
          ),
        0,
      );

    return {
      id: workspace.id,
      name: workspace.name,

      description:
        workspace.description ||
        firstProject?.description ||
        `${workspace.name} 워크스페이스입니다.`,

      type:
        workspace.mode === "team"
          ? "팀"
          : "개인",

      role: normalizeRole(
        workspace.role,
      ),

      status,
      progress,
      language,
      stack,
      updatedAt,
      devlogCount,

      doneScheduleCount: Number(
        scheduleProgress?.doneCount ??
          0,
      ),

      scheduleTotalCount: Number(
        scheduleProgress?.totalCount ??
          0,
      ),

      workspaceId: workspace.id,
    };
  });
}

function applyDevlogCountToProjects(
  projects: Project[],
  devlogs: Devlog[],
): Project[] {
  const countMap = new Map<
    string,
    number
  >();

  for (const devlog of devlogs) {
    if (!devlog.projectId) {
      continue;
    }

    const key = String(
      devlog.projectId,
    );

    countMap.set(
      key,
      (countMap.get(key) ?? 0) + 1,
    );
  }

  return projects.map((project) => {
    const countByProjectId =
      countMap.get(
        String(project.id),
      );

    return {
      ...project,

      devlogCount:
        typeof countByProjectId ===
        "number"
          ? countByProjectId
          : project.devlogCount,
    };
  });
}

/* =========================================================
   DESIGN UTILS
   ========================================================= */

function parseDesignJsonArray(
  value?: string | null,
): Record<string, unknown>[] {
  if (
    !value ||
    typeof value !== "string"
  ) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed)
      ? parsed.filter(
          (
            item,
          ): item is Record<
            string,
            unknown
          > =>
            typeof item ===
              "object" &&
            item !== null &&
            !Array.isArray(item),
        )
      : [];
  } catch {
    return [];
  }
}

function getParsedDesignDocument(
  designDocument: DesignDocumentItem | null,
): ParsedDesignDocument {
  return {
    erdNodes:
      parseDesignJsonArray(
        designDocument?.erdNodesJson,
      ),

    erdEdges:
      parseDesignJsonArray(
        designDocument?.erdEdgesJson,
      ),

    flowNodes:
      parseDesignJsonArray(
        designDocument?.flowNodesJson,
      ),

    flowEdges:
      parseDesignJsonArray(
        designDocument?.flowEdgesJson,
      ),
  };
}

function escapeHtml(value: string) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeHtmlWithLineBreaks(
  value: string,
) {
  return escapeHtml(value).replaceAll(
    "\n",
    "<br />",
  );
}

function getPrintDateLabel() {
  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(new Date());
}

function formatApiPayload(
  value?: string | null,
) {
  if (!value || !value.trim()) {
    return "-";
  }

  try {
    return JSON.stringify(
      JSON.parse(value),
      null,
      2,
    );
  } catch {
    return value;
  }
}

function getNodeData(
  node: Record<string, unknown>,
) {
  const data = node.data;

  return typeof data === "object" &&
    data !== null &&
    !Array.isArray(data)
    ? (data as Record<
        string,
        unknown
      >)
    : {};
}

function getNodeLabel(
  node: Record<string, unknown>,
  fallback: string,
) {
  const data = getNodeData(node);

  const label =
    data.label ??
    data.name ??
    node.label ??
    node.name;

  return typeof label === "string" &&
    label.trim()
    ? label.trim()
    : fallback;
}

function getNodeSubText(
  node: Record<string, unknown>,
) {
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
            : typeof type ===
                  "string" &&
                type.trim()
              ? type.trim()
              : "설계 노드";

  const techText =
    typeof techStack === "string" &&
    techStack.trim()
      ? techStack.trim()
      : "설명 없음";

  return `${typeLabel} · ${techText}`;
}

function getNodeColumns(
  node: Record<string, unknown>,
) {
  const data = getNodeData(node);

  const columns = data.columns;

  return Array.isArray(columns)
    ? columns.filter(
        (
          column,
        ): column is Record<
          string,
          unknown
        > =>
          typeof column ===
            "object" &&
          column !== null &&
          !Array.isArray(column),
      )
    : [];
}

function getNodePosition(
  node: Record<string, unknown>,
  index: number,
) {
  const position = node.position;

  if (
    typeof position === "object" &&
    position !== null &&
    !Array.isArray(position)
  ) {
    const record =
      position as Record<
        string,
        unknown
      >;

    const x = Number(record.x);

    const y = Number(record.y);

    return {
      x: Number.isFinite(x)
        ? x
        : 120 +
          (index % 3) * 280,

      y: Number.isFinite(y)
        ? y
        : 100 +
          Math.floor(index / 3) *
            190,
    };
  }

  return {
    x: 120 + (index % 3) * 280,

    y:
      100 +
      Math.floor(index / 3) *
        190,
  };
}

function getEdgeSourceTarget(
  edge: Record<string, unknown>,
) {
  const source = edge.source;

  const target = edge.target;

  return {
    source:
      typeof source === "string"
        ? source
        : "",

    target:
      typeof target === "string"
        ? target
        : "",
  };
}

function buildSvgPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
) {
  const midX =
    (sourceX + targetX) / 2;

  return `M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`;
}

/** 설계단계 화면 상자에 찍히는 종류 이름. */
const SCREEN_ROLE_LABEL: Record<string, string> = {
  page: "화면",
  modal: "팝업",
  external: "외부",
};

/** 화면 흐름 노드가 실어 온 부가 정보를 상자에 쓸 모양으로 꺼낸다. */
function getScreenExtras(node: Record<string, unknown>) {
  const data = getNodeData(node);
  const role = typeof data.role === "string" ? data.role : "page";

  return {
    isEntry: Boolean(data.isEntry),
    requiresAuth: Boolean(data.requiresAuth),
    roleLabel: SCREEN_ROLE_LABEL[role] ?? role,
    requirementCount:
      typeof data.requirementCount === "number" ? data.requirementCount : 0,
    apiLabels: Array.isArray(data.apiLabels)
      ? data.apiLabels.filter(
          (label): label is string => typeof label === "string",
        )
      : [],
  };
}

function normalizeDiagramNodes(
  nodes: Record<
    string,
    unknown
  >[],
  type: "erd" | "flow",
): NormalizedDiagramNode[] {
  return nodes.map(
    (node, index) => {
      const position =
        getNodePosition(
          node,
          index,
        );

      return {
        id: String(
          node.id ??
            `node-${index}`,
        ),

        label: getNodeLabel(
          node,
          type === "erd"
            ? `TABLE_${index + 1}`
            : `NODE_${index + 1}`,
        ),

        x: position.x,
        y: position.y,

        columns:
          getNodeColumns(node),

        subText:
          getNodeSubText(node),

        route:
          getFlowNodeTechStack(
            node,
          ),

        ...getScreenExtras(node),
      };
    },
  );
}

function getDiagramLayout(
  nodes: NormalizedDiagramNode[],
  type: "erd" | "flow",
) {
  const nodeWidth =
    type === "erd" ? 248 : 236;

  const nodeHeight =
    type === "erd" ? 138 : 152;

  const padding = 80;

  if (nodes.length === 0) {
    return {
      nodes:
        [] as NormalizedDiagramNode[],

      width: 760,
      height: 420,
      nodeWidth,
      nodeHeight,
    };
  }

  const minX = Math.min(
    ...nodes.map(
      (node) => node.x,
    ),
  );

  const minY = Math.min(
    ...nodes.map(
      (node) => node.y,
    ),
  );

  const maxX = Math.max(
    ...nodes.map(
      (node) => node.x,
    ),
  );

  const maxY = Math.max(
    ...nodes.map(
      (node) => node.y,
    ),
  );

  const offsetX =
    padding - minX;

  const offsetY =
    padding - minY;

  return {
    nodes: nodes.map((node) => ({
      ...node,
      x: node.x + offsetX,
      y: node.y + offsetY,
    })),

    width: Math.max(
      860,
      maxX -
        minX +
        nodeWidth +
        padding * 2,
    ),

    height: Math.max(
      460,
      maxY -
        minY +
        nodeHeight +
        padding * 2,
    ),

    nodeWidth,
    nodeHeight,
  };
}

/* =========================================================
   PRINT DIAGRAM
   ========================================================= */

/**
 * 인쇄용 화면 흐름 상자.
 *
 * 화면용 ScreenFlowNodeShape 와 같은 그림을 문자열 SVG 로 만든다.
 * 둘이 어긋나면 화면에서 본 것과 뽑은 PDF 가 달라진다.
 */
function buildPrintScreenNodeSvg(
  node: NormalizedDiagramNode,
  width: number,
  height: number,
) {
  const shownApis = node.apiLabels.slice(0, 3);
  const restApis = node.apiLabels.length - shownApis.length;

  const entrySvg = node.isEntry
    ? `<rect x="${node.x + 12}" y="${node.y + 12}" width="34" height="17" rx="6" fill="#ecfdf5" />
       <text x="${node.x + 29}" y="${node.y + 24}" text-anchor="middle" class="diagram-entry">시작</text>`
    : "";

  const authSvg = node.requiresAuth
    ? `<text x="${node.x + width - 14}" y="${node.y + 25}" text-anchor="end" class="diagram-chip-muted">로그인</text>`
    : "";

  const apiSvg = shownApis.length
    ? shownApis
        .map(
          (label, index) =>
            `<text x="${node.x + 14}" y="${node.y + 100 + index * 14}" class="diagram-api">${escapeHtml(label)}</text>`,
        )
        .join("")
    : `<text x="${node.x + 14}" y="${node.y + 100}" class="diagram-chip-muted">호출하는 API 없음</text>`;

  const restSvg =
    restApis > 0
      ? `<text x="${node.x + 14}" y="${node.y + 100 + shownApis.length * 14}" class="diagram-chip-muted">외 ${restApis}개</text>`
      : "";

  return `
    <g>
      <rect x="${node.x}" y="${node.y}" width="${width}" height="${height}" rx="16"
        fill="#ffffff" stroke="${node.isEntry ? "#34d399" : "#e5e7eb"}" stroke-width="${node.isEntry ? 2 : 1}" />
      ${entrySvg}
      <text x="${node.x + (node.isEntry ? 54 : 14)}" y="${node.y + 25}" class="diagram-title">${escapeHtml(node.label)}</text>
      ${authSvg}
      <line x1="${node.x}" y1="${node.y + 38}" x2="${node.x + width}" y2="${node.y + 38}" stroke="#eef1f4" />
      <text x="${node.x + 14}" y="${node.y + 56}" class="diagram-route">${escapeHtml(node.route)}</text>
      <rect x="${node.x + 14}" y="${node.y + 64}" width="62" height="17" rx="5"
        fill="${node.requirementCount === 0 ? "#fef2f2" : "#f1f5f9"}" />
      <text x="${node.x + 20}" y="${node.y + 76}" class="${node.requirementCount === 0 ? "diagram-chip-warn" : "diagram-chip"}">요구사항 ${node.requirementCount}</text>
      <rect x="${node.x + 82}" y="${node.y + 64}" width="34" height="17" rx="5" fill="#f1f5f9" />
      <text x="${node.x + 99}" y="${node.y + 76}" text-anchor="middle" class="diagram-chip">${escapeHtml(node.roleLabel)}</text>
      ${apiSvg}
      ${restSvg}
    </g>
  `;
}

function buildPrintDiagramSvg({
  nodes,
  edges,
  type,
}: {
  nodes: Record<
    string,
    unknown
  >[];
  edges: Record<
    string,
    unknown
  >[];
  type: "erd" | "flow";
}) {
  if (nodes.length === 0) {
    return `
      <div class="empty small-empty">
        표시할 다이어그램이 없습니다.
      </div>
    `;
  }

  const layout = getDiagramLayout(
    normalizeDiagramNodes(
      nodes,
      type,
    ),
    type,
  );

  const nodeMap = new Map(
    layout.nodes.map((node) => [
      node.id,
      node,
    ]),
  );

  const strokeColor =
    type === "erd"
      ? "#5873F9"
      : "#7c3aed";

  const edgeSvg = edges
    .map((edge) => {
      const { source, target } =
        getEdgeSourceTarget(edge);

      const sourceNode =
        nodeMap.get(source);

      const targetNode =
        nodeMap.get(target);

      if (
        !sourceNode ||
        !targetNode
      ) {
        return "";
      }

      const sourceX =
        sourceNode.x +
        layout.nodeWidth;

      const sourceY =
        sourceNode.y +
        layout.nodeHeight / 2;

      const targetX =
        targetNode.x;

      const targetY =
        targetNode.y +
        layout.nodeHeight / 2;

      // 화면 흐름에서는 "무엇을 했을 때 넘어가는가" 가 핵심 정보다.
      // 선만 그리면 그 정보가 그림에서 통째로 빠진다.
      const label =
        typeof edge.label === "string"
          ? edge.label.trim()
          : "";

      return `
        <path
          d="${buildSvgPath(
            sourceX,
            sourceY,
            targetX,
            targetY,
          )}"
          fill="none"
          stroke="${strokeColor}"
          stroke-width="2"
          marker-end="url(#arrow-${type})"
        />
        ${
          label
            ? `<text
                 x="${(sourceX + targetX) / 2}"
                 y="${(sourceY + targetY) / 2 - 8}"
                 class="diagram-edge-label"
                 text-anchor="middle"
               >${escapeHtml(label)}</text>`
            : ""
        }
      `;
    })
    .join("");

  const nodeSvg = layout.nodes
    .map((node) => {
      if (type === "erd") {
        const columnRows =
          node.columns.length
            ? node.columns
                .slice(0, 4)
                .map(
                  (
                    column,
                    columnIndex,
                  ) => {
                    const columnName =
                      typeof column.name ===
                      "string"
                        ? column.name
                        : "column";

                    const columnType =
                      typeof column.type ===
                      "string"
                        ? column.type
                        : "TYPE";

                    // 설계단계 표는 기본키에 열쇠, 외래키에 고리 표시를
                    // 붙인다. 인쇄물은 아이콘을 쓸 수 없어 글자로 대신한다.
                    const marker = column.isPk
                      ? "PK "
                      : column.isFk
                        ? "FK "
                        : "";

                    return `
                      <text
                        x="${node.x + 16}"
                        y="${
                          node.y +
                          74 +
                          columnIndex *
                            18
                        }"
                        class="diagram-column"
                      >
                        ${escapeHtml(
                          marker +
                            columnName,
                        )} · ${escapeHtml(
                          columnType,
                        )}
                      </text>
                    `;
                  },
                )
                .join("")
            : `
              <text
                x="${node.x + 16}"
                y="${node.y + 78}"
                class="diagram-muted"
              >
                컬럼 없음
              </text>
            `;

        return `
          <g>
            <rect
              x="${node.x}"
              y="${node.y}"
              width="${layout.nodeWidth}"
              height="${layout.nodeHeight}"
              rx="14"
              fill="#ffffff"
              stroke="#dbe1ea"
            />

            <rect
              x="${node.x}"
              y="${node.y}"
              width="${layout.nodeWidth}"
              height="42"
              rx="14"
              fill="#5873F9"
            />

            <text
              x="${node.x + 16}"
              y="${node.y + 27}"
              class="diagram-title diagram-white"
            >
              ${escapeHtml(
                node.label,
              )}
            </text>

            ${columnRows}
          </g>
        `;
      }

      return buildPrintScreenNodeSvg(
        node,
        layout.nodeWidth,
        layout.nodeHeight,
      );
    })
    .join("");

  return `
    <div class="diagram-wrap">
      <svg
        viewBox="0 0 ${layout.width} ${layout.height}"
        class="diagram-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <marker
            id="arrow-${type}"
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="3"
            orient="auto"
          >
            <path
              d="M0,0 L0,6 L9,3 z"
              fill="${strokeColor}"
            />
          </marker>

          <pattern
            id="dot-grid-${type}"
            width="18"
            height="18"
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx="1"
              cy="1"
              r="1"
              fill="#e5e7eb"
            />
          </pattern>
        </defs>

        <rect
          width="100%"
          height="100%"
          fill="#f8fafc"
        />

        <rect
          width="100%"
          height="100%"
          fill="url(#dot-grid-${type})"
        />

        ${edgeSvg}
        ${nodeSvg}
      </svg>
    </div>
  `;
}

function getColumnStringValue(
  column: Record<
    string,
    unknown
  >,
  key: string,
  fallback: string,
) {
  const value = column[key];

  return typeof value === "string" &&
    value.trim()
    ? value.trim()
    : fallback;
}

function getColumnBooleanValue(
  column: Record<
    string,
    unknown
  >,
  keys: string[],
) {
  return keys.some(
    (key) =>
      column[key] === true ||
      column[key] === "true",
  );
}

function getFlowNodeType(
  node: Record<
    string,
    unknown
  >,
) {
  const data = getNodeData(node);

  const type =
    data.type ?? node.type;

  return typeof type === "string" &&
    type.trim()
    ? type.trim()
    : "설계 노드";
}

function getFlowNodeTechStack(
  node: Record<
    string,
    unknown
  >,
) {
  const data = getNodeData(node);

  const techStack =
    data.techStack ??
    data.description ??
    data.memo ??
    node.description;

  return typeof techStack ===
    "string" &&
    techStack.trim()
    ? techStack.trim()
    : getNodeSubText(node);
}

function buildErdTablesForDraft(
  erdNodes: Record<
    string,
    unknown
  >[],
) {
  return erdNodes.map(
    (node, index) => ({
      name: getNodeLabel(
        node,
        `TABLE_${index + 1}`,
      ),

      columns:
        getNodeColumns(node).map(
          (column) => ({
            name:
              getColumnStringValue(
                column,
                "name",
                "column",
              ),

            type:
              getColumnStringValue(
                column,
                "type",
                "TYPE",
              ),

            pk:
              getColumnBooleanValue(
                column,
                [
                  "pk",
                  "primaryKey",
                  "isPrimaryKey",
                ],
              ),

            fk:
              getColumnBooleanValue(
                column,
                [
                  "fk",
                  "foreignKey",
                  "isForeignKey",
                ],
              ),
          }),
        ),
    }),
  );
}

function buildFlowNodesForDraft(
  flowNodes: Record<
    string,
    unknown
  >[],
) {
  return flowNodes.map(
    (node, index) => ({
      label: getNodeLabel(
        node,
        `NODE_${index + 1}`,
      ),

      type:
        getFlowNodeType(node),

      techStack:
        getFlowNodeTechStack(
          node,
        ),
    }),
  );
}

/* =========================================================
   PAGE
   ========================================================= */

export default function ArchivePage() {
  const router = useRouter();

  const [projects, setProjects] =
    useState<Project[]>([]);

  const [devlogs, setDevlogs] =
    useState<Devlog[]>([]);

  const [
    selectedProjectId,
    setSelectedProjectId,
  ] = useState("");

  const [
    activeArchiveTab,
    setActiveArchiveTab,
  ] =
    useState<ArchiveTabKey>(
      "devlog",
    );

  const [
    activeDesignSection,
    setActiveDesignSection,
  ] =
    useState<DesignArchiveSectionKey>(
      "requirements",
    );

  const [keyword, setKeyword] =
    useState("");

  const [sortType, setSortType] =
    useState<DevlogSortType>(
      "latest",
    );

  const [
    isPdfMenuOpen,
    setIsPdfMenuOpen,
  ] = useState(false);

  const [
    selectedPdfSections,
    setSelectedPdfSections,
  ] = useState<
    ArchivePdfSectionKey[]
  >(
    archivePdfSectionItems.map(
      (item) => item.key,
    ),
  );

  const [
    designRequirements,
    setDesignRequirements,
  ] = useState<
    DesignRequirementItem[]
  >([]);

  const [
    designApiSpecs,
    setDesignApiSpecs,
  ] = useState<
    DesignApiSpecItem[]
  >([]);

  const [
    designDocument,
    setDesignDocument,
  ] =
    useState<DesignDocumentItem | null>(
      null,
    );

  const [
    finalReportDraft,
    setFinalReportDraft,
  ] = useState("");

  const [
    finalReportLoading,
    setFinalReportLoading,
  ] = useState(false);

  const [
    finalReportError,
    setFinalReportError,
  ] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [
    designLoading,
    setDesignLoading,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [
    designError,
    setDesignError,
  ] = useState("");

  /* =========================
     프로젝트 사이드바
     ========================= */

  const [
    projectSearch,
    setProjectSearch,
  ] = useState("");

  const projectSearchInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const [
    projectFilter,
    setProjectFilter,
  ] =
    useState<ProjectFilter>(
      "all",
    );

  const [
    isSidebarPinned,
    setIsSidebarPinned,
  ] = useState(true);

  const [
    isSidebarHovered,
    setIsSidebarHovered,
  ] = useState(false);

  const [
    canSidebarHoverExpand,
    setCanSidebarHoverExpand,
  ] = useState(true);

  const [
    isPageScrolled,
    setIsPageScrolled,
  ] = useState(false);

  const sidebarExpanded =
    isSidebarPinned ||
    (canSidebarHoverExpand &&
      isSidebarHovered);

  useEffect(() => {
    const handleScroll = () => {
      setIsPageScrolled(
        window.scrollY > 0,
      );
    };

    handleScroll();

    window.addEventListener(
      "scroll",
      handleScroll,
      {
        passive: true,
      },
    );

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll,
      );
    };
  }, []);

  const handleToggleSidebar =
    () => {
      if (isSidebarPinned) {
        setIsSidebarPinned(false);
        setIsSidebarHovered(false);
        setCanSidebarHoverExpand(false);
        return;
      }

      setIsSidebarPinned(true);
      setIsSidebarHovered(false);
      setCanSidebarHoverExpand(true);
    };

  const openSidebarForSearch =
    () => {
      setIsSidebarPinned(true);
      setIsSidebarHovered(false);
      setCanSidebarHoverExpand(true);

      requestAnimationFrame(
        () => {
          projectSearchInputRef.current?.focus();
        },
      );
    };

  const openSidebarForProjects =
    () => {
      setIsSidebarPinned(true);
      setIsSidebarHovered(false);
      setCanSidebarHoverExpand(true);
      setProjectFilter("all");
    };

  /* =========================
     프로젝트
     ========================= */

  const projectOptions =
    useMemo(() => {
      return projects.map(
        (project) => ({
          id: project.id,
          name: project.name,
          type: project.type,
          progress:
            project.progress,
        }),
      );
    }, [projects]);

  const personalCount =
    useMemo(
      () =>
        projects.filter(
          (project) =>
            project.type ===
            "개인",
        ).length,
      [projects],
    );

  const teamCount =
    useMemo(
      () =>
        projects.filter(
          (project) =>
            project.type === "팀",
        ).length,
      [projects],
    );

  const filteredSidebarProjects =
    useMemo(() => {
      const normalizedSearch =
        projectSearch
          .trim()
          .toLowerCase();

      return projects.filter(
        (project) => {
          const matchesSearch =
            !normalizedSearch ||
            project.name
              .toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            project.description
              .toLowerCase()
              .includes(
                normalizedSearch,
              );

          const matchesFilter =
            projectFilter ===
              "all" ||
            (projectFilter ===
              "personal" &&
              project.type ===
                "개인") ||
            (projectFilter ===
              "team" &&
              project.type ===
                "팀");

          return (
            matchesSearch &&
            matchesFilter
          );
        },
      );
    }, [
      projectFilter,
      projectSearch,
      projects,
    ]);

  const personalProjects =
    useMemo(
      () =>
        filteredSidebarProjects.filter(
          (project) =>
            project.type ===
            "개인",
        ),
      [filteredSidebarProjects],
    );

  const teamProjects =
    useMemo(
      () =>
        filteredSidebarProjects.filter(
          (project) =>
            project.type === "팀",
        ),
      [filteredSidebarProjects],
    );

  const selectedProject =
    useMemo(() => {
      return (
        projects.find(
          (project) =>
            project.id ===
            selectedProjectId,
        ) ?? null
      );
    }, [
      projects,
      selectedProjectId,
    ]);

  const selectedDesignWorkspaceId =
    selectedProject?.workspaceId ||
    selectedProject?.id ||
    "";

  const parsedDesignDocument =
    useMemo(
      () =>
        getParsedDesignDocument(
          designDocument,
        ),
      [designDocument],
    );

  /* =========================
     개발일지 검색 / 정렬
     ========================= */

  const filteredDevlogs =
    useMemo(() => {
      const normalizedKeyword =
        keyword
          .trim()
          .toLowerCase();

      return devlogs
        .filter((devlog) => {
          const matchesProject =
            String(
              devlog.projectId ??
                "",
            ) ===
              selectedProjectId ||
            String(
              devlog.workspaceId ??
                "",
            ) ===
              selectedProjectId;

          const matchesKeyword =
            !normalizedKeyword ||
            devlog.title
              .toLowerCase()
              .includes(
                normalizedKeyword,
              ) ||
            devlog.summary
              .toLowerCase()
              .includes(
                normalizedKeyword,
              ) ||
            devlog.projectName
              .toLowerCase()
              .includes(
                normalizedKeyword,
              );

          return (
            matchesProject &&
            matchesKeyword
          );
        })
        .sort((a, b) => {
          const aTime =
            getDevlogSortTime(a);

          const bTime =
            getDevlogSortTime(b);

          return sortType ===
            "latest"
            ? bTime - aTime
            : aTime - bTime;
        });
    }, [
      devlogs,
      keyword,
      selectedProjectId,
      sortType,
    ]);

  const totalDesignCount =
    designRequirements.length +
    designApiSpecs.length +
    parsedDesignDocument.erdNodes
      .length +
    parsedDesignDocument.flowNodes
      .length;

  const selectedPdfSectionLabels =
    archivePdfSectionItems
      .filter((item) =>
        selectedPdfSections.includes(
          item.key,
        ),
      )
      .map((item) => item.label);

  /* =========================
     초기 데이터 로딩
     ========================= */

  useEffect(() => {
    let mounted = true;

    async function loadArchivePage() {
      try {
        setLoading(true);
        setError("");

        const workspaceDtos =
          await fetchMyWorkspaces();

        const scheduleProgressResults =
          await Promise.allSettled(
            workspaceDtos.map(
              async (workspace) => {
                const view =
                  getScheduleViewFromWorkspace(
                    workspace,
                  );

                const progress =
                  await fetchScheduleProgress(
                    view,
                    workspace.id,
                  );

                return {
                  workspaceId:
                    workspace.id,
                  progress,
                };
              },
            ),
          );

        const scheduleProgressMap =
          new Map<
            string,
            ScheduleProgressResponse
          >();

        for (const result of scheduleProgressResults) {
          if (
            result.status ===
            "fulfilled"
          ) {
            scheduleProgressMap.set(
              result.value
                .workspaceId,
              result.value
                .progress,
            );
          }
        }

        const devlogResults =
          await Promise.allSettled(
            workspaceDtos.map(
              async (workspace) => {
                const response =
                  await fetchWorkspaceDevlogs(
                    workspace.id,
                  );

                return mapDevlogsFromWorkspaceResponse(
                  response,
                  workspace,
                );
              },
            ),
          );

        const nextDevlogs =
          devlogResults
            .filter(
              (
                result,
              ): result is PromiseFulfilledResult<
                Devlog[]
              > =>
                result.status ===
                "fulfilled",
            )
            .flatMap(
              (result) =>
                result.value,
            )
            .sort(
              (a, b) =>
                getDevlogSortTime(
                  b,
                ) -
                getDevlogSortTime(
                  a,
                ),
            );

        const nextProjects =
          mapProjectsFromWorkspaces(
            workspaceDtos,
            scheduleProgressMap,
          );

        const projectsWithDevlogCount =
          applyDevlogCountToProjects(
            nextProjects,
            nextDevlogs,
          );

        if (!mounted) {
          return;
        }

        setProjects(
          projectsWithDevlogCount,
        );

        setDevlogs(nextDevlogs);

        if (
          projectsWithDevlogCount.length >
          0
        ) {
          setSelectedProjectId(
            projectsWithDevlogCount[0]
              .id,
          );
        }
      } catch (error) {
        if (!mounted) {
          return;
        }

        setError(
          error instanceof Error
            ? error.message
            : "자료실 정보를 불러오지 못했습니다.",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadArchivePage();

    return () => {
      mounted = false;
    };
  }, []);

  /* =========================
     프로젝트 기본 선택
     ========================= */

  useEffect(() => {
    if (
      projectOptions.length === 0
    ) {
      if (selectedProjectId) {
        setSelectedProjectId("");
      }

      return;
    }

    const exists =
      projectOptions.some(
        (project) =>
          project.id ===
          selectedProjectId,
      );

    if (
      !selectedProjectId ||
      !exists
    ) {
      setSelectedProjectId(
        projectOptions[0].id,
      );
    }
  }, [
    projectOptions,
    selectedProjectId,
  ]);

  /* =========================
     프로젝트 변경 시 보고서 초기화
     ========================= */

  useEffect(() => {
    setFinalReportDraft("");

    setFinalReportError("");
  }, [selectedProjectId]);

  /* =========================
     설계 문서 로딩
     ========================= */

  useEffect(() => {
    let mounted = true;

    async function loadDesignArchive() {
      if (
        !selectedDesignWorkspaceId
      ) {
        setDesignRequirements([]);

        setDesignApiSpecs([]);

        setDesignDocument(null);

        return;
      }

      try {
        setDesignLoading(true);

        setDesignError("");

        const [
          requirementsResult,
          apiSpecsResult,
          designDocumentResult,
        ] =
          await Promise.allSettled([
            fetchWorkspaceRequirementsApi(
              selectedDesignWorkspaceId,
            ),

            fetchWorkspaceApiSpecsApi(
              selectedDesignWorkspaceId,
            ),

            fetchWorkspaceDesignDocumentApi(
              selectedDesignWorkspaceId,
            ),
          ]);

        if (!mounted) {
          return;
        }

        if (
          requirementsResult.status ===
          "fulfilled"
        ) {
          setDesignRequirements(
            Array.isArray(
              requirementsResult.value,
            )
              ? requirementsResult.value
              : [],
          );
        } else {
          setDesignRequirements([]);
        }

        if (
          apiSpecsResult.status ===
          "fulfilled"
        ) {
          setDesignApiSpecs(
            Array.isArray(
              apiSpecsResult.value,
            )
              ? apiSpecsResult.value
              : [],
          );
        } else {
          setDesignApiSpecs([]);
        }

        if (
          designDocumentResult.status ===
          "fulfilled"
        ) {
          setDesignDocument(
            designDocumentResult.value ??
              null,
          );
        } else {
          setDesignDocument(null);
        }

        const failedCount = [
          requirementsResult,
          apiSpecsResult,
          designDocumentResult,
        ].filter(
          (result) =>
            result.status ===
            "rejected",
        ).length;

        if (failedCount > 0) {
          setDesignError(
            "일부 설계 문서를 불러오지 못했습니다. 저장된 항목만 표시합니다.",
          );
        }
      } catch (error) {
        if (!mounted) {
          return;
        }

        setDesignRequirements([]);

        setDesignApiSpecs([]);

        setDesignDocument(null);

        setDesignError(
          error instanceof Error
            ? error.message
            : "설계 문서를 불러오지 못했습니다.",
        );
      } finally {
        if (mounted) {
          setDesignLoading(false);
        }
      }
    }

    void loadDesignArchive();

    return () => {
      mounted = false;
    };
  }, [selectedDesignWorkspaceId]);

  /* =========================
     AI 최종 보고서
     ========================= */

  const handleGenerateFinalReport =
    async () => {
      if (!selectedProject) {
        alert(
          "최종 보고서 초안을 생성할 프로젝트를 선택해주세요.",
        );

        return;
      }

      if (
        !selectedDesignWorkspaceId
      ) {
        alert(
          "프로젝트 식별값을 찾지 못했습니다.",
        );

        return;
      }

      if (finalReportLoading) {
        return;
      }

      try {
        setFinalReportLoading(true);

        setFinalReportError("");

        const response =
          await generateFinalReportDraftApi(
            {
              workspaceId:
                selectedDesignWorkspaceId,

              project: {
                name:
                  selectedProject.name,

                description:
                  selectedProject.description,

                type:
                  selectedProject.type,

                language:
                  selectedProject.language,

                stack:
                  selectedProject.stack,

                progress:
                  selectedProject.progress,

                doneScheduleCount:
                  selectedProject.doneScheduleCount,

                scheduleTotalCount:
                  selectedProject.scheduleTotalCount,

                devlogCount:
                  filteredDevlogs.length,
              },

              devlogs:
                filteredDevlogs.map(
                  (devlog) => ({
                    title:
                      devlog.title,

                    date:
                      devlog.date,

                    projectName:
                      devlog.projectName,

                    summary:
                      devlog.summary,
                  }),
                ),

              requirements:
                designRequirements.map(
                  (item) => ({
                    category:
                      item.category,

                    name: item.name,

                    description:
                      item.description,
                  }),
                ),

              apiSpecs:
                designApiSpecs.map(
                  (item) => ({
                    method:
                      item.method,

                    endpoint:
                      item.endpoint,

                    description:
                      item.description,

                    request:
                      item.request,

                    response:
                      item.response,
                  }),
                ),

              erdTables:
                buildErdTablesForDraft(
                  parsedDesignDocument.erdNodes,
                ),

              flowNodes:
                buildFlowNodesForDraft(
                  parsedDesignDocument.flowNodes,
                ),
            },
          );

        const responseRecord =
          typeof response ===
            "object" &&
          response !== null
            ? (response as Record<
                string,
                unknown
              >)
            : null;

        const nextDraft =
          typeof response === "string"
            ? response
            : typeof responseRecord?.draft ===
                "string"
              ? responseRecord.draft
              : typeof responseRecord?.content ===
                  "string"
                ? responseRecord.content
                : typeof responseRecord?.result ===
                    "string"
                  ? responseRecord.result
                  : typeof responseRecord?.message ===
                      "string"
                    ? responseRecord.message
                    : "";

        if (!nextDraft.trim()) {
          throw new Error(
            "AI 초안 응답은 왔지만 보고서 내용이 비어 있습니다. 백엔드 응답 필드명을 확인해주세요.",
          );
        }

        setFinalReportDraft(
          nextDraft,
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "AI 최종 보고서 초안 생성에 실패했습니다.";

        setFinalReportError(
          message,
        );

        alert(message);
      } finally {
        setFinalReportLoading(
          false,
        );
      }
    };

  /* =========================
     PDF 선택
     ========================= */

  const togglePdfSection = (
    sectionKey: ArchivePdfSectionKey,
  ) => {
    setSelectedPdfSections(
      (prev) => {
        if (
          prev.includes(sectionKey)
        ) {
          return prev.filter(
            (key) =>
              key !== sectionKey,
          );
        }

        return [
          ...prev,
          sectionKey,
        ];
      },
    );
  };

  const selectAllPdfSections =
    () => {
      setSelectedPdfSections(
        archivePdfSectionItems.map(
          (item) => item.key,
        ),
      );
    };

  const clearPdfSections = () => {
    setSelectedPdfSections([]);
  };

  const selectCurrentArchivePdfSections =
    () => {
      if (
        activeArchiveTab ===
        "devlog"
      ) {
        setSelectedPdfSections([
          "devlog",
        ]);

        return;
      }

      if (
        activeArchiveTab ===
        "design"
      ) {
        setSelectedPdfSections([
          "design-requirements",
          "design-api",
          "design-erd",
          "design-flow",
        ]);

        return;
      }

      setSelectedPdfSections([
        "final-report",
        "final-erd",
        "final-flow",
      ]);
    };

  /* =========================================================
     PDF PRINT
     ========================================================= */

  const handlePrintPdf = () => {
    const selectedSections =
      archivePdfSectionItems.filter(
        (item) =>
          selectedPdfSections.includes(
            item.key,
          ),
      );

    if (
      selectedSections.length === 0
    ) {
      alert(
        "PDF로 출력할 항목을 1개 이상 선택해주세요.",
      );

      setIsPdfMenuOpen(true);

      return;
    }

    const printWindow =
      window.open(
        "",
        "_blank",
        "width=920,height=1000",
      );

    if (!printWindow) {
      alert(
        "팝업이 차단되어 PDF 저장 창을 열 수 없습니다.",
      );

      return;
    }

    const documentTitle =
      selectedSections.length ===
      archivePdfSectionItems.length
        ? "프로젝트 자료실"
        : `프로젝트 자료실 - ${selectedSections
            .map(
              (item) => item.label,
            )
            .join(", ")}`;

    const selectedProjectName =
      selectedProject?.name ||
      "선택된 프로젝트";

    const selectedSectionText =
      selectedSections
        .map(
          (item) => item.label,
        )
        .join(", ");

    const devlogHtml =
      filteredDevlogs.length
        ? filteredDevlogs
            .map(
              (
                devlog,
                index,
              ) => `
              <article class="print-card">
                <div class="print-card-header">
                  <span class="index">${
                    index + 1
                  }</span>

                  <div>
                    <h2>
                      ${escapeHtml(
                        devlog.title,
                      )}
                    </h2>

                    <p class="meta">
                      ${escapeHtml(
                        devlog.projectName,
                      )}
                      ·
                      ${escapeHtml(
                        devlog.date,
                      )}
                    </p>
                  </div>
                </div>

                <p class="body-text">
                  ${escapeHtmlWithLineBreaks(
                    devlog.summary,
                  )}
                </p>
              </article>
            `,
            )
            .join("")
        : `
          <div class="empty small-empty">
            조건에 맞는 개발일지가 없습니다.
          </div>
        `;

    const requirementHtml =
      designRequirements.length
        ? designRequirements
            .map(
              (
                item,
                index,
              ) => `
              <article class="print-card compact-card">
                <div class="print-card-header">
                  <span class="index">
                    ${index + 1}
                  </span>

                  <div>
                    <h2>
                      ${escapeHtml(
                        item.name ||
                          "이름 없는 요구사항",
                      )}
                    </h2>

                    <p class="meta">
                      ${escapeHtml(
                        item.category ||
                          "기본",
                      )}
                    </p>
                  </div>
                </div>

                <p class="body-text">
                  ${escapeHtmlWithLineBreaks(
                    item.description ||
                      "설명이 없습니다.",
                  )}
                </p>
              </article>
            `,
            )
            .join("")
        : `
          <div class="empty small-empty">
            작성된 요구사항이 없습니다.
          </div>
        `;

    const apiHtml =
      designApiSpecs.length
        ? designApiSpecs
            .map(
              (item) => `
              <article class="print-card compact-card">
                <h2>
                  <span class="method">
                    ${escapeHtml(
                      item.method ||
                        "GET",
                    )}
                  </span>

                  ${escapeHtml(
                    item.endpoint ||
                      "/api/example",
                  )}
                </h2>

                <p class="body-text">
                  ${escapeHtmlWithLineBreaks(
                    item.description ||
                      "설명이 없습니다.",
                  )}
                </p>

                <div class="api-payload-grid">
                  <div>
                    <p class="payload-title">
                      요청 데이터
                    </p>

                    <pre class="code-block">${escapeHtml(
                      formatApiPayload(
                        item.request,
                      ),
                    )}</pre>
                  </div>

                  <div>
                    <p class="payload-title">
                      응답 데이터
                    </p>

                    <pre class="code-block">${escapeHtml(
                      formatApiPayload(
                        item.response,
                      ),
                    )}</pre>
                  </div>
                </div>
              </article>
            `,
            )
            .join("")
        : `
          <div class="empty small-empty">
            작성된 API 명세가 없습니다.
          </div>
        `;

    const erdDiagramHtml =
      buildPrintDiagramSvg({
        nodes:
          parsedDesignDocument.erdNodes,

        edges:
          parsedDesignDocument.erdEdges,

        type: "erd",
      });

    const flowDiagramHtml =
      buildPrintDiagramSvg({
        nodes:
          parsedDesignDocument.flowNodes,

        edges:
          parsedDesignDocument.flowEdges,

        type: "flow",
      });

    const erdDetailHtml =
      parsedDesignDocument.erdNodes
        .length
        ? parsedDesignDocument.erdNodes
            .map((node, index) => {
              const columns =
                getNodeColumns(node);

              return `
              <article class="print-card compact-card">
                <div class="print-card-header">
                  <span class="index">
                    ${index + 1}
                  </span>

                  <div>
                    <h2>
                      ${escapeHtml(
                        getNodeLabel(
                          node,
                          `TABLE_${
                            index +
                            1
                          }`,
                        ),
                      )}
                    </h2>

                    <p class="meta">
                      컬럼 ${
                        columns.length
                      }개
                    </p>
                  </div>
                </div>

                <p class="body-text">
                  ${
                    columns.length
                      ? columns
                          .slice(
                            0,
                            12,
                          )
                          .map(
                            (
                              column,
                            ) => {
                              const name =
                                typeof column.name ===
                                "string"
                                  ? column.name
                                  : "column";

                              const type =
                                typeof column.type ===
                                "string"
                                  ? column.type
                                  : "TYPE";

                              return `${escapeHtml(
                                name,
                              )} (${escapeHtml(
                                type,
                              )})`;
                            },
                          )
                          .join(", ")
                      : "컬럼이 없습니다."
                  }
                </p>
              </article>
            `;
            })
            .join("")
        : `
          <div class="empty small-empty">
            작성된 ERD 테이블이 없습니다.
          </div>
        `;

    const flowDetailHtml =
      parsedDesignDocument.flowNodes
        .length
        ? parsedDesignDocument.flowNodes
            .map(
              (
                node,
                index,
              ) => `
              <article class="print-card compact-card">
                <div class="print-card-header">
                  <span class="index">
                    ${index + 1}
                  </span>

                  <div>
                    <h2>
                      ${escapeHtml(
                        getNodeLabel(
                          node,
                          `NODE_${
                            index +
                            1
                          }`,
                        ),
                      )}
                    </h2>

                    <p class="meta">
                      ${escapeHtml(
                        getNodeSubText(
                          node,
                        ),
                      )}
                    </p>
                  </div>
                </div>
              </article>
            `,
            )
            .join("")
        : `
          <div class="empty small-empty">
            작성된 화면 흐름이 없습니다.
          </div>
        `;

    const reportContent =
      finalReportDraft.trim() ||
      "AI 초안 생성 버튼을 눌러 최종 보고서 초안을 생성한 뒤 PDF로 저장할 수 있습니다.";

    const sectionHtmlMap: Record<
      ArchivePdfSectionKey,
      string
    > = {
      devlog: devlogHtml,

      "design-requirements":
        requirementHtml,

      "design-api": apiHtml,

      "design-erd": `
        <p class="body-text section-description">
          설계단계에서 작성한 테이블과 관계선을 시각화한 다이어그램입니다.
        </p>

        ${erdDiagramHtml}
        ${erdDetailHtml}
      `,

      "design-flow": `
        <p class="body-text section-description">
          설계단계에서 작성한 화면 사이의 이동 흐름을 시각화한 다이어그램입니다.
        </p>

        ${flowDiagramHtml}
        ${flowDetailHtml}
      `,

      "final-report": `
        <article class="print-card report-card">
          <div class="report-text">
            ${escapeHtmlWithLineBreaks(
              reportContent,
            )}
          </div>
        </article>
      `,

      "final-erd":
        erdDiagramHtml,

      "final-flow":
        flowDiagramHtml,
    };

    const printBody =
      selectedSections
        .map(
          (
            section,
            index,
          ) => `
          <section class="print-section">
            <h2 class="section-title">
              ${index + 1}. ${escapeHtml(
                section.printTitle,
              )}
            </h2>

            ${
              sectionHtmlMap[
                section.key
              ]
            }
          </section>
        `,
        )
        .join("");

    printWindow.document.write(`
      <!doctype html>

      <html lang="ko">
        <head>
          <meta charset="utf-8" />

          <title>
            ${escapeHtml(
              documentTitle,
            )}
          </title>

          <style>
            @page {
              size: A4;
              margin: 18mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              background: #ffffff;
              color: #111827;
              font-family:
                Pretendard,
                -apple-system,
                BlinkMacSystemFont,
                "Segoe UI",
                sans-serif;
              line-height: 1.65;
            }

            .document {
              width: 100%;
            }

            .document-header {
              padding-bottom: 18px;
              margin-bottom: 22px;
              border-bottom: 2px solid #5873f9;
            }

            .eyebrow {
              margin: 0 0 6px;
              color: #5873f9;
              font-size: 12px;
              font-weight: 800;
              letter-spacing: 0.08em;
            }

            h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 900;
              letter-spacing: -0.04em;
            }

            .header-meta {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 8px;
              margin-top: 16px;
            }

            .meta-box {
              padding: 10px 12px;
              border: 1px solid #dbeafe;
              border-radius: 12px;
              background: #eff6ff;
            }

            .meta-label {
              display: block;
              margin-bottom: 2px;
              color: #64748b;
              font-size: 10px;
              font-weight: 800;
            }

            .meta-value {
              color: #0f172a;
              font-size: 13px;
              font-weight: 800;
            }

            .print-section {
              margin-bottom: 22px;
            }

            .section-title {
              margin: 0 0 8px;
              color: #405ed9;
              font-size: 18px;
              font-weight: 900;
            }

            .print-card {
              break-inside: avoid;
              page-break-inside: avoid;
              padding: 18px 0;
              border-bottom: 1px solid #e5e7eb;
            }

            .compact-card {
              padding: 12px 0;
            }

            .print-card:first-of-type {
              padding-top: 0;
            }

            .print-card-header {
              display: flex;
              gap: 10px;
              align-items: flex-start;
              margin-bottom: 10px;
            }

            .index {
              display: inline-flex;
              width: 26px;
              height: 26px;
              align-items: center;
              justify-content: center;
              border-radius: 8px;
              background: #5873f9;
              color: #ffffff;
              font-size: 12px;
              font-weight: 900;
              flex-shrink: 0;
            }

            h2 {
              margin: 0;
              color: #111827;
              font-size: 17px;
              font-weight: 900;
              letter-spacing: -0.02em;
            }

            .method {
              display: inline-block;
              margin-right: 6px;
              border-radius: 7px;
              background: #eef3ff;
              color: #405ed9;
              padding: 2px 7px;
              font-size: 11px;
            }

            .meta {
              margin: 3px 0 0;
              color: #64748b;
              font-size: 11px;
              font-weight: 700;
            }

            .body-text,
            .report-text {
              margin: 0;
              color: #374151;
              font-size: 13px;
              font-weight: 600;
              white-space: normal;
            }

            .empty {
              padding: 40px 0;
              color: #64748b;
              font-size: 14px;
              font-weight: 700;
              text-align: center;
            }

            .small-empty {
              padding: 14px 0;
              text-align: left;
            }

            .section-description {
              margin-bottom: 10px;
            }

            .code-block {
              margin: 8px 0 0;
              padding: 12px;
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              background: #f8fafc;
              color: #1e293b;
              font-size: 11px;
              font-weight: 700;
              line-height: 1.6;
              white-space: pre-wrap;
              word-break: break-word;
            }

            .api-payload-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
              margin-top: 10px;
            }

            .payload-title {
              margin: 0 0 4px;
              color: #5873f9;
              font-size: 11px;
              font-weight: 900;
            }

            .diagram-wrap {
              width: 100%;
              margin: 12px 0 18px;
              border: 1px solid #e5e7eb;
              border-radius: 16px;
              overflow: hidden;
              background: #f8fafc;
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .diagram-svg {
              display: block;
              width: 100%;
              min-height: 360px;
            }

            .diagram-title {
              fill: #0f172a;
              font-size: 13px;
              font-weight: 900;
            }

            .diagram-white {
              fill: #ffffff;
            }

            .diagram-column {
              fill: #334155;
              font-size: 11px;
              font-weight: 700;
            }

            .diagram-muted {
              fill: #64748b;
              font-size: 10px;
              font-weight: 700;
            }

            /* 화면 흐름 상자에 쓰는 작은 글씨들. 화면용과 같은 값이어야 한다. */
            .diagram-route {
              fill: #6b7280;
              font-size: 10px;
              font-weight: 700;
              font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            }

            .diagram-entry {
              fill: #047857;
              font-size: 9px;
              font-weight: 900;
            }

            .diagram-chip {
              fill: #475569;
              font-size: 9px;
              font-weight: 900;
            }

            .diagram-chip-warn {
              fill: #dc2626;
              font-size: 9px;
              font-weight: 900;
            }

            .diagram-chip-muted {
              fill: #9ca3af;
              font-size: 9px;
              font-weight: 900;
            }

            .diagram-api {
              fill: #6b7280;
              font-size: 9px;
              font-weight: 700;
              font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            }

            /* 화살표 위에 얹는 이동 조건. 선과 겹쳐도 읽히도록 흰 테를 두른다. */
            .diagram-edge-label {
              fill: #475569;
              font-size: 10px;
              font-weight: 700;
              stroke: #ffffff;
              stroke-width: 3px;
              paint-order: stroke;
            }

            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }

              .api-payload-grid {
                grid-template-columns: 1fr;
              }
            }
          </style>
        </head>

        <body>
          <main class="document">
            <header class="document-header">
              <p class="eyebrow">
                PROJECT ARCHIVE
              </p>

              <h1>
                ${escapeHtml(
                  documentTitle,
                )}
              </h1>

              <section class="header-meta">
                <div class="meta-box">
                  <span class="meta-label">
                    프로젝트
                  </span>

                  <span class="meta-value">
                    ${escapeHtml(
                      selectedProjectName,
                    )}
                  </span>
                </div>

                <div class="meta-box">
                  <span class="meta-label">
                    출력 항목
                  </span>

                  <span class="meta-value">
                    ${escapeHtml(
                      selectedSectionText,
                    )}
                  </span>
                </div>

                <div class="meta-box">
                  <span class="meta-label">
                    저장일
                  </span>

                  <span class="meta-value">
                    ${escapeHtml(
                      getPrintDateLabel(),
                    )}
                  </span>
                </div>
              </section>
            </header>

            ${printBody}
          </main>
        </body>
      </html>
    `);

    printWindow.document.close();

    printWindow.focus();

    printWindow.onload = () => {
      printWindow.print();
    };
  };

  /* =========================================================
     LOADING / ERROR
     ========================================================= */

  if (loading) {
    return (
      <main className="waivs-page min-h-[calc(100dvh-72px)] p-5 text-slate-950">
        <section className="waivs-panel flex min-h-[420px] items-center justify-center">
          <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
            <Loader2
              className="animate-spin"
              size={18}
            />

            자료실 정보를 불러오는
            중입니다.
          </div>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="waivs-page min-h-[calc(100dvh-72px)] p-5 text-slate-950">
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
          {error}
        </section>
      </main>
    );
  }

  /* =========================================================
     UI
     ========================================================= */

  return (
    <main className="waivs-page min-h-[calc(100dvh-72px)] bg-[#F7F8FA] p-4 text-slate-950 md:p-5">
      <div className="mx-auto flex max-w-[1880px] gap-4">
        {/* =================================================
            PROJECT SIDEBAR
           ================================================= */}

        <aside
          onMouseEnter={() => {
            if (
              !isSidebarPinned &&
              canSidebarHoverExpand
            ) {
              setIsSidebarHovered(
                true,
              );
            }
          }}
          onMouseLeave={() => {
            setIsSidebarHovered(false);
            setCanSidebarHoverExpand(
              true,
            );
          }}
          className={cn(
            "waivs-sidebar sticky hidden h-[calc(100dvh-104px)] shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-[width] duration-200 lg:flex lg:flex-col",
            isPageScrolled
              ? "top-[88px]"
              : "top-4",
            sidebarExpanded
              ? "w-[288px]"
              : "w-16",
          )}
        >
          {/* SIDEBAR HEADER */}

          <div
            className={cn(
              "border-b border-slate-100",
              sidebarExpanded
                ? "p-3"
                : "flex h-[64px] items-center justify-center p-0",
            )}
          >
            <div
              className={cn(
                "flex items-center",
                sidebarExpanded
                  ? "justify-between gap-2"
                  : "justify-center",
              )}
            >
              {sidebarExpanded && (
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#EEF3FF] text-[#5873F9]">
                      <FolderOpen
                        size={16}
                        strokeWidth={2.4}
                      />
                    </div>

                    <div>
                      <p className="text-sm font-black text-slate-900">
                        프로젝트
                      </p>

                      <p className="text-[10px] font-semibold text-slate-400">
                        전체{" "}
                        {projects.length}
                        {" · "}
                        개인{" "}
                        {personalCount}
                        {" · "}
                        팀 {teamCount}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={
                  handleToggleSidebar
                }
                className={cn(
                  "grid shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700",
                  sidebarExpanded
                    ? "h-8 w-8"
                    : "h-9 w-9",
                )}
                title={
                  isSidebarPinned
                    ? "사이드바 접기"
                    : "사이드바 펼치기"
                }
              >
                {sidebarExpanded ? (
                  <PanelLeftClose
                    size={17}
                  />
                ) : (
                  <PanelLeftOpen
                    size={18}
                  />
                )}
              </button>
            </div>

            {sidebarExpanded && (
              <>
                <div className="relative mt-3">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    ref={
                      projectSearchInputRef
                    }
                    value={
                      projectSearch
                    }
                    onChange={(
                      event,
                    ) =>
                      setProjectSearch(
                        event.target
                          .value,
                      )
                    }
                    placeholder="프로젝트 검색"
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#AAB8FF] focus:bg-white focus:ring-2 focus:ring-[#5873F9]/10"
                  />
                </div>

                <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
                  {(
                    [
                      [
                        "all",
                        "전체",
                      ],
                      [
                        "personal",
                        "개인",
                      ],
                      [
                        "team",
                        "팀",
                      ],
                    ] as const
                  ).map(
                    ([
                      value,
                      label,
                    ]) => (
                      <button
                        key={
                          value
                        }
                        type="button"
                        onClick={() =>
                          setProjectFilter(
                            value,
                          )
                        }
                        className={cn(
                          "rounded-lg px-2 py-1.5 text-[11px] font-black transition",
                          projectFilter ===
                            value
                            ? "bg-white text-[#5873F9] shadow-sm"
                            : "text-slate-400 hover:text-slate-700",
                        )}
                      >
                        {
                          label
                        }
                      </button>
                    ),
                  )}
                </div>
              </>
            )}
          </div>

          {/* SIDEBAR BODY */}

          <div
            className={cn(
              "min-h-0 flex-1",
              sidebarExpanded
                ? "overflow-y-auto p-3"
                : "overflow-hidden",
            )}
          >
            {sidebarExpanded ? (
              <div className="space-y-5">
                {projectFilter !==
                  "team" && (
                  <ArchiveProjectSection
                    title="개인 프로젝트"
                    mode="personal"
                    items={
                      personalProjects
                    }
                    selectedProjectId={
                      selectedProjectId
                    }
                    onSelect={
                      setSelectedProjectId
                    }
                  />
                )}

                {projectFilter !==
                  "personal" && (
                  <ArchiveProjectSection
                    title="팀 프로젝트"
                    mode="team"
                    items={
                      teamProjects
                    }
                    selectedProjectId={
                      selectedProjectId
                    }
                    onSelect={
                      setSelectedProjectId
                    }
                  />
                )}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center pt-4">
                <button
                  type="button"
                  onClick={
                    openSidebarForSearch
                  }
                  className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-[#5873F9]"
                  title="프로젝트 검색"
                >
                  <Search
                    size={19}
                    strokeWidth={2}
                  />
                </button>

                <button
                  type="button"
                  onClick={
                    openSidebarForProjects
                  }
                  className="mt-1 grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-[#5873F9]"
                  title="프로젝트 목록"
                >
                  <FolderOpen
                    size={19}
                    strokeWidth={2}
                  />
                </button>

                <div className="my-3 h-px w-8 bg-slate-100" />

                <div
                  className="flex h-8 w-8 items-center justify-center text-xs font-black text-slate-300"
                  title={`전체 프로젝트 ${projects.length}개`}
                >
                  {projects.length}
                </div>
              </div>
            )}
          </div>

          {/* SIDEBAR FOOTER */}

          {sidebarExpanded && (
            <div className="border-t border-slate-100 p-3">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/main",
                  )
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#D9E1FF] bg-[#F7F9FF] px-3 py-2 text-xs font-black text-[#5873F9] transition hover:bg-[#EEF3FF]"
              >
                전체 프로젝트

                <ArrowRight
                  size={14}
                />
              </button>
            </div>
          )}
        </aside>

        {/* =================================================
            MAIN
           ================================================= */}

        <section className="min-w-0 flex-1">
          {/* ===============================================
              ARCHIVE HEADER
             =============================================== */}

          <section className="waivs-panel overflow-visible">
            <div className="px-5 py-3.5">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[#5873F9]">
                      Archive
                    </span>

                    {selectedProject && (
                      <>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[10px] font-black",
                            selectedProject.type ===
                              "팀"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-[#EEF3FF] text-[#5873F9]",
                          )}
                        >
                          {selectedProject.type ===
                          "팀"
                            ? "TEAM"
                            : "PERSONAL"}
                        </span>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500">
                          {selectedProject.role.toUpperCase()}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="mt-1 flex flex-wrap items-baseline gap-2">
                    <h1 className="truncate text-xl font-black tracking-tight text-slate-950">
                      {selectedProject?.name ??
                        "프로젝트 없음"}
                    </h1>

                    <span className="text-xs font-bold text-slate-400">
                      프로젝트 자료실
                    </span>
                  </div>

                  <p className="mt-0.5 text-xs font-medium text-slate-500">
                    개발 과정에서 생성된 프로젝트 문서를 한곳에서 확인합니다.
                  </p>
                </div>

                {/* PDF */}

                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setIsPdfMenuOpen(
                        (prev) =>
                          !prev,
                      )
                    }
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-[#D9E1FF] bg-white px-3.5 text-xs font-black text-[#5873F9] transition hover:bg-[#F7F9FF]"
                  >
                    <Download
                      size={16}
                    />

                    PDF 저장

                    <span className="rounded-full bg-[#EEF3FF] px-1.5 py-0.5 text-[10px] text-[#5873F9]">
                      {
                        selectedPdfSections.length
                      }
                    </span>
                  </button>

                  {isPdfMenuOpen && (
                    <div className="absolute right-0 top-11 z-50 w-[330px] rounded-2xl border border-[var(--waivs-border)] bg-white p-3 shadow-[0_18px_48px_rgba(15,23,42,0.16)]">
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-black text-slate-950">
                            PDF 출력 항목
                          </p>

                          <p className="mt-0.5 text-[11px] font-medium leading-5 text-slate-500">
                            원하는 문서를 선택해 하나의 PDF로 출력합니다.
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full bg-[#EEF3FF] px-2 py-1 text-[10px] font-black text-[#5873F9]">
                          {
                            selectedPdfSections.length
                          }
                          개
                        </span>
                      </div>

                      <div className="mb-3 grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={
                            selectAllPdfSections
                          }
                          className="h-7 rounded-lg bg-[#EEF3FF] px-2 text-[11px] font-black text-[#5873F9] transition hover:bg-[#E4EAFF]"
                        >
                          전체
                        </button>

                        <button
                          type="button"
                          onClick={
                            selectCurrentArchivePdfSections
                          }
                          className="h-7 rounded-lg bg-slate-100 px-2 text-[11px] font-black text-slate-600 transition hover:bg-slate-200"
                        >
                          현재 탭
                        </button>

                        <button
                          type="button"
                          onClick={
                            clearPdfSections
                          }
                          className="h-7 rounded-lg bg-slate-50 px-2 text-[11px] font-black text-slate-400 transition hover:bg-slate-100"
                        >
                          해제
                        </button>
                      </div>

                      <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
                        {[
                          "개발일지",
                          "설계 문서",
                          "최종 보고서",
                        ].map(
                          (group) => (
                            <section
                              key={
                                group
                              }
                            >
                              <p className="mb-1.5 px-1 text-[11px] font-black text-slate-400">
                                {
                                  group
                                }
                              </p>

                              <div className="space-y-1.5">
                                {archivePdfSectionItems
                                  .filter(
                                    (
                                      item,
                                    ) =>
                                      item.group ===
                                      group,
                                  )
                                  .map(
                                    (
                                      item,
                                    ) => {
                                      const checked =
                                        selectedPdfSections.includes(
                                          item.key,
                                        );

                                      return (
                                        <label
                                          key={
                                            item.key
                                          }
                                          className={cn(
                                            "flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2 text-sm transition",
                                            checked
                                              ? "border-[#5873F9]/30 bg-[#EEF3FF] text-[#405ED9]"
                                              : "border-slate-100 bg-white text-slate-600 hover:bg-slate-50",
                                          )}
                                        >
                                          <span className="font-bold">
                                            {
                                              item.label
                                            }
                                          </span>

                                          <input
                                            type="checkbox"
                                            checked={
                                              checked
                                            }
                                            onChange={() =>
                                              togglePdfSection(
                                                item.key,
                                              )
                                            }
                                            className="h-4 w-4 accent-[#5873F9]"
                                          />
                                        </label>
                                      );
                                    },
                                  )}
                              </div>
                            </section>
                          ),
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          handlePrintPdf();

                          if (
                            selectedPdfSections.length >
                            0
                          ) {
                            setIsPdfMenuOpen(
                              false,
                            );
                          }
                        }}
                        disabled={
                          selectedPdfSections.length ===
                          0
                        }
                        className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-[#5873F9] text-xs font-extrabold text-white transition hover:bg-[#4863E8] disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        <Download
                          size={14}
                        />

                        선택 항목 PDF 저장
                      </button>

                      <p className="mt-2 truncate text-[11px] font-medium text-slate-400">
                        선택됨:{" "}
                        {selectedPdfSectionLabels.length >
                        0
                          ? selectedPdfSectionLabels.join(
                              ", ",
                            )
                          : "없음"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* SUMMARY */}

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-100 pt-3 text-xs">
                <ArchiveSummaryItem
                  label="개발일지"
                  value={`${filteredDevlogs.length}개`}
                />

                <span className="hidden text-slate-300 sm:block">
                  ·
                </span>

                <ArchiveSummaryItem
                  label="설계자료"
                  value={`${totalDesignCount}개`}
                />

                <span className="hidden text-slate-300 sm:block">
                  ·
                </span>

                <ArchiveSummaryItem
                  label="요구사항"
                  value={`${designRequirements.length}개`}
                />

                <span className="hidden text-slate-300 sm:block">
                  ·
                </span>

                <ArchiveSummaryItem
                  label="API"
                  value={`${designApiSpecs.length}개`}
                />

                <span className="hidden text-slate-300 sm:block">
                  ·
                </span>

                <ArchiveSummaryItem
                  label="진행률"
                  value={`${selectedProject?.progress ?? 0}%`}
                  accent
                />
              </div>
            </div>
          </section>

          {/* ===============================================
              ARCHIVE CONTENT
             =============================================== */}

          <section className="waivs-panel mt-4 overflow-visible">
            {/* MAIN ARCHIVE TABS */}

            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex w-fit max-w-full items-center gap-1 rounded-xl bg-slate-100 p-1">
                {archiveTabs.map(
                  (tab) => {
                    const Icon =
                      tab.icon;

                    const isActive =
                      activeArchiveTab ===
                      tab.key;

                    return (
                      <button
                        key={
                          tab.key
                        }
                        type="button"
                        onClick={() =>
                          setActiveArchiveTab(
                            tab.key,
                          )
                        }
                        className={cn(
                          "inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-xs font-black transition",
                          isActive
                            ? "bg-white text-[#5873F9] shadow-sm"
                            : "text-slate-500 hover:text-slate-800",
                        )}
                      >
                        <Icon
                          size={14}
                        />

                        {tab.label}
                      </button>
                    );
                  },
                )}
              </div>

              {/* DEVLOG ONLY TOOLS */}

              {activeArchiveTab ===
                "devlog" && (
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                  <select
                    value={
                      sortType
                    }
                    onChange={(
                      event,
                    ) =>
                      setSortType(
                        event.target
                          .value as DevlogSortType,
                      )
                    }
                    className="h-10 rounded-xl border border-[var(--waivs-border)] bg-white px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-[#5873F9]"
                  >
                    <option value="latest">
                      최신순
                    </option>

                    <option value="oldest">
                      오래된순
                    </option>
                  </select>

                  <div className="relative min-w-0">
                    <Search
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      value={keyword}
                      onChange={(
                        event,
                      ) =>
                        setKeyword(
                          event.target
                            .value,
                        )
                      }
                      placeholder="개발일지 검색"
                      className="h-10 w-full rounded-xl border border-[var(--waivs-border)] bg-white pl-10 pr-3 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-[#5873F9] focus:ring-2 focus:ring-[#5873F9]/10 sm:w-[300px]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* CONTENT */}

            <div className="p-5">
              {activeArchiveTab ===
                "devlog" && (
                <ArchiveDevlogContent
                  devlogs={
                    filteredDevlogs
                  }
                  hasSearchKeyword={Boolean(
                    keyword.trim(),
                  )}
                />
              )}

              {activeArchiveTab ===
                "design" && (
                <ArchiveDesignContent
                  activeDesignSection={
                    activeDesignSection
                  }
                  onActiveDesignSectionChange={
                    setActiveDesignSection
                  }
                  selectedProject={
                    selectedProject
                  }
                  requirements={
                    designRequirements
                  }
                  apiSpecs={
                    designApiSpecs
                  }
                  designDocument={
                    parsedDesignDocument
                  }
                  isLoading={
                    designLoading
                  }
                  errorMessage={
                    designError
                  }
                />
              )}

              {activeArchiveTab ===
                "final" && (
                <ArchiveFinalReportContent
                  selectedProject={
                    selectedProject
                  }
                  devlogCount={
                    filteredDevlogs.length
                  }
                  draft={
                    finalReportDraft
                  }
                  onDraftChange={
                    setFinalReportDraft
                  }
                  onGenerate={
                    handleGenerateFinalReport
                  }
                  designDocument={
                    parsedDesignDocument
                  }
                  isGenerating={
                    finalReportLoading
                  }
                  errorMessage={
                    finalReportError
                  }
                />
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

/* =========================================================
   PROJECT SIDEBAR
   ========================================================= */

function ArchiveProjectSection({
  title,
  mode,
  items,
  selectedProjectId,
  onSelect,
}: {
  title: string;
  mode: "personal" | "team";
  items: Project[];
  selectedProjectId: string;
  onSelect: (projectId: string) => void;
}) {
  const Icon =
    mode === "team"
      ? Users
      : UserRound;

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 text-slate-500">
          <Icon size={14} />

          <p className="text-xs font-black">
            {title}
          </p>
        </div>

        <span className="text-[10px] font-black text-slate-400">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-[10px] font-semibold text-slate-400">
          표시할 프로젝트가 없습니다.
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map(
            (project) => (
              <ArchiveProjectItem
                key={project.id}
                project={project}
                selected={
                  selectedProjectId ===
                  project.id
                }
                onSelect={
                  onSelect
                }
              />
            ),
          )}
        </div>
      )}
    </section>
  );
}

function ArchiveProjectItem({
  project,
  selected,
  onSelect,
}: {
  project: Project;
  selected: boolean;
  onSelect: (projectId: string) => void;
}) {
  const Icon =
    project.type === "팀"
      ? Users
      : UserRound;

  return (
    <button
      type="button"
      onClick={() =>
        onSelect(project.id)
      }
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition",
        selected
          ? "bg-[#5873F9] text-white shadow-sm"
          : "text-slate-700 hover:bg-slate-100",
      )}
    >
      <span
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
          selected
            ? "bg-white/15 text-white"
            : project.type === "팀"
              ? "bg-emerald-50 text-emerald-600"
              : "bg-[#EEF3FF] text-[#5873F9]",
        )}
      >
        <Icon
          size={15}
          strokeWidth={2.1}
        />
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-xs font-black",
            selected
              ? "text-white"
              : "text-slate-800",
          )}
        >
          {project.name}
        </span>

        <span
          className={cn(
            "mt-0.5 block truncate text-[10px] font-semibold",
            selected
              ? "text-white/70"
              : "text-slate-400",
          )}
        >
          {project.type} 프로젝트 ·{" "}
          {project.role.toUpperCase()}
        </span>
      </span>
    </button>
  );
}

/* =========================================================
   HEADER SUMMARY
   ========================================================= */

function ArchiveSummaryItem({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <span className="font-semibold text-slate-400">
        {label}
      </span>

      <strong
        className={
          accent
            ? "font-black text-[#5873F9]"
            : "font-black text-slate-900"
        }
      >
        {value}
      </strong>
    </div>
  );
}

/* =========================================================
   DEVLOG
   ========================================================= */

function ArchiveDevlogContent({
  devlogs,
  hasSearchKeyword,
}: {
  devlogs: Devlog[];
  hasSearchKeyword: boolean;
}) {
  return (
    <section>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-950">
            개발일지 목록
          </h3>

          <p className="mt-1 text-sm font-medium text-slate-500">
            일정 기반 일지와 일반 일지를
            문서 형태로 한곳에서
            확인합니다.
          </p>
        </div>

        <span className="rounded-full bg-[#EEF3FF] px-3 py-1 text-[11px] font-black text-[#5873F9]">
          {devlogs.length}개
        </span>
      </div>

      {devlogs.length === 0 ? (
        <EmptyState
          icon={
            hasSearchKeyword
              ? Search
              : BookOpen
          }
          title={
            hasSearchKeyword
              ? "검색 결과가 없습니다."
              : "아직 작성된 개발일지가 없습니다."
          }
          message={
            hasSearchKeyword
              ? "검색어를 변경하거나 다른 프로젝트를 선택해서 다시 확인해보세요."
              : "프로젝트에서 개발일지를 작성하면 이곳에 자동으로 모여 문서 형태로 표시됩니다."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
          {devlogs.map(
            (devlog) => (
              <DevlogCard
                key={devlog.id}
                devlog={devlog}
              />
            ),
          )}
        </div>
      )}
    </section>
  );
}

function DevlogCard({
  devlog,
}: {
  devlog: Devlog;
}) {
  return (
    <article className="rounded-xl border border-[var(--waivs-border)] bg-white p-4 transition hover:border-[#5873F9]/30 hover:shadow-sm">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h4 className="line-clamp-1 text-sm font-black text-slate-950">
              {devlog.title}
            </h4>

            <span className="rounded-full bg-[#EEF3FF] px-2.5 py-0.5 text-[10px] font-black text-[#5873F9]">
              {devlog.projectName}
            </span>
          </div>

          <p className="line-clamp-4 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-600">
            {devlog.summary}
          </p>
        </div>

        <span className="shrink-0 text-[11px] font-bold text-slate-400">
          {devlog.date}
        </span>
      </div>
    </article>
  );
}

/* =========================================================
   DESIGN
   ========================================================= */

function ArchiveDesignContent({
  activeDesignSection,
  onActiveDesignSectionChange,
  selectedProject,
  requirements,
  apiSpecs,
  designDocument,
  isLoading,
  errorMessage,
}: {
  activeDesignSection: DesignArchiveSectionKey;
  onActiveDesignSectionChange: (
    value: DesignArchiveSectionKey,
  ) => void;
  selectedProject: Project | null;
  requirements: DesignRequirementItem[];
  apiSpecs: DesignApiSpecItem[];
  designDocument: ParsedDesignDocument;
  isLoading: boolean;
  errorMessage: string;
}) {
  const erdTables =
    designDocument.erdNodes;

  const erdRelations =
    designDocument.erdEdges;

  const flowNodes =
    designDocument.flowNodes;

  const flowEdges =
    designDocument.flowEdges;

  const hasAnyDesignData =
    requirements.length > 0 ||
    apiSpecs.length > 0 ||
    erdTables.length > 0 ||
    flowNodes.length > 0;

  return (
    <section>
      {errorMessage && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
          {errorMessage}
        </div>
      )}

      <div className="mb-5 flex flex-col gap-3 border-b border-[var(--waivs-border-soft)] pb-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          {designSectionTabs.map(
            (tab) => {
              const Icon = tab.icon;

              const isActive =
                activeDesignSection ===
                tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() =>
                    onActiveDesignSectionChange(
                      tab.key,
                    )
                  }
                  className={[
                    "inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-black transition",

                    isActive
                      ? "bg-[#5873F9] text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800",
                  ].join(" ")}
                >
                  <Icon
                    size={14}
                  />

                  {tab.label}
                </button>
              );
            },
          )}
        </div>

        <span className="w-fit text-xs font-bold text-slate-400">
          선택 프로젝트 ·{" "}
          <strong className="text-slate-700">
            {selectedProject?.name ??
              "프로젝트 없음"}
          </strong>
        </span>
      </div>

      {isLoading ? (
        <div className="grid min-h-[360px] place-items-center rounded-2xl bg-slate-50">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
            <Loader2
              size={17}
              className="animate-spin"
            />

            설계 문서를 불러오는
            중입니다.
          </div>
        </div>
      ) : !hasAnyDesignData ? (
        <EmptyState
          icon={FileText}
          title="아직 저장된 설계 문서가 없습니다."
          message="설계관리에서 요구사항, API 명세, ERD 또는 화면 흐름을 작성하면 이곳에서 문서 형태로 확인할 수 있습니다."
        />
      ) : (
        <>
          {activeDesignSection ===
            "requirements" && (
            <DesignRequirementsPage
              requirements={
                requirements
              }
            />
          )}

          {activeDesignSection ===
            "api" && (
            <DesignApiSpecsPage
              apiSpecs={apiSpecs}
            />
          )}

          {activeDesignSection ===
            "erd" && (
            <DesignErdPage
              tables={erdTables}
              edges={erdRelations}
              relationCount={
                erdRelations.length
              }
            />
          )}

          {activeDesignSection ===
            "flow" && (
            <DesignFlowPage
              nodes={flowNodes}
              edges={flowEdges}
              edgeCount={
                flowEdges.length
              }
            />
          )}
        </>
      )}
    </section>
  );
}

function DesignRequirementsPage({
  requirements,
}: {
  requirements: DesignRequirementItem[];
}) {
  if (
    requirements.length === 0
  ) {
    return (
      <DesignEmptyText
        icon={CheckCircle2}
        title="작성된 요구사항이 없습니다."
        text="설계관리에서 요구사항을 작성하면 이곳에 표시됩니다."
      />
    );
  }

  return (
    <div>
      <SectionTitle
        title="요구사항 정의"
        description="설계단계에서 작성한 요구사항을 문서 형태로 확인합니다."
        count={`${requirements.length}개`}
      />

      <div className="mt-4 space-y-3">
        {requirements.map(
          (item, index) => (
            <article
              key={item.id}
              className="rounded-xl border border-[var(--waivs-border)] bg-white p-4 transition hover:border-[#5873F9]/30"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#5873F9] text-xs font-black text-white">
                  {index + 1}
                </span>

                <span className="rounded-full bg-[#EEF3FF] px-2.5 py-0.5 text-[11px] font-black text-[#5873F9]">
                  {item.category ||
                    "기본"}
                </span>

                <h5 className="text-sm font-black text-slate-950">
                  {item.name ||
                    "이름 없는 요구사항"}
                </h5>
              </div>

              <p className="whitespace-pre-wrap text-sm font-medium leading-6 text-slate-600">
                {item.description ||
                  "설명이 없습니다."}
              </p>
            </article>
          ),
        )}
      </div>
    </div>
  );
}

function DesignApiSpecsPage({
  apiSpecs,
}: {
  apiSpecs: DesignApiSpecItem[];
}) {
  if (apiSpecs.length === 0) {
    return (
      <DesignEmptyText
        icon={Code2}
        title="작성된 API 명세가 없습니다."
        text="설계관리에서 API 명세를 작성하면 이곳에 표시됩니다."
      />
    );
  }

  return (
    <div>
      <SectionTitle
        title="API 명세"
        description="엔드포인트, 설명, 요청 데이터, 응답 데이터를 확인합니다."
        count={`${apiSpecs.length}개`}
      />

      <div className="mt-4 space-y-3">
        {apiSpecs.map((item) => (
          <article
            key={item.id}
            className="overflow-hidden rounded-xl border border-[var(--waivs-border)] bg-white"
          >
            <div className="flex flex-col gap-3 border-b border-[var(--waivs-border-soft)] bg-slate-50 px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="shrink-0 rounded-lg bg-[#5873F9] px-2.5 py-1 text-[11px] font-black text-white">
                  {item.method ||
                    "GET"}
                </span>

                <code className="min-w-0 break-all rounded-lg bg-white px-3 py-1.5 text-sm font-black text-slate-900">
                  {item.endpoint ||
                    "/api/example"}
                </code>
              </div>
            </div>

            <div className="space-y-4 p-4">
              <div>
                <p className="mb-1 text-xs font-black text-slate-400">
                  설명
                </p>

                <p className="whitespace-pre-wrap break-words text-sm font-medium leading-6 text-slate-700">
                  {item.description ||
                    "설명이 없습니다."}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                <PayloadBox
                  title="요청 데이터"
                  value={
                    item.request
                  }
                />

                <PayloadBox
                  title="응답 데이터"
                  value={
                    item.response
                  }
                />
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function PayloadBox({
  title,
  value,
}: {
  title: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-xl border border-[var(--waivs-border-soft)] bg-slate-50 p-4">
      <p className="mb-2 text-xs font-black text-[#5873F9]">
        {title}
      </p>

      <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-[var(--waivs-border)] bg-white p-3 text-xs font-bold leading-6 text-slate-700">
        {formatApiPayload(value)}
      </pre>
    </div>
  );
}

function DesignErdPage({
  tables,
  edges,
  relationCount,
}: {
  tables: Record<
    string,
    unknown
  >[];
  edges: Record<
    string,
    unknown
  >[];
  relationCount: number;
}) {
  if (tables.length === 0) {
    return (
      <DesignEmptyText
        icon={Database}
        title="작성된 ERD가 없습니다."
        text="설계관리에서 ERD를 작성하면 테이블과 관계를 이곳에서 확인할 수 있습니다."
      />
    );
  }

  return (
    <div className="space-y-4">
      <SectionTitle
        title="ERD"
        description="설계단계에서 작성한 테이블 위치와 관계선을 시각화했습니다."
        count={`테이블 ${tables.length}개 · 관계 ${relationCount}개`}
      />

      <DesignDiagramPreview
        nodes={tables}
        edges={edges}
        type="erd"
        title="ERD 구조 미리보기"
        description="테이블과 관계선을 그대로 표시합니다."
      />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 2xl:grid-cols-3">
        {tables.map(
          (node, index) => {
            const columns =
              getNodeColumns(node);

            return (
              <article
                key={String(
                  node.id ??
                    index,
                )}
                className="overflow-hidden rounded-xl border border-[var(--waivs-border)] bg-white"
              >
                <div className="flex items-center justify-between gap-2 bg-slate-900 px-4 py-3 text-white">
                  <div className="min-w-0">
                    <h5 className="truncate text-sm font-black">
                      {getNodeLabel(
                        node,
                        `TABLE_${
                          index + 1
                        }`,
                      )}
                    </h5>

                    <p className="text-[11px] font-semibold text-slate-300">
                      컬럼{" "}
                      {
                        columns.length
                      }
                      개
                    </p>
                  </div>

                  <Database
                    size={16}
                  />
                </div>

                <div className="max-h-[220px] divide-y divide-slate-100 overflow-y-auto">
                  {columns.length ===
                  0 ? (
                    <p className="px-4 py-4 text-xs font-bold text-slate-400">
                      컬럼이 없습니다.
                    </p>
                  ) : (
                    columns.map(
                      (
                        column,
                        columnIndex,
                      ) => (
                        <div
                          key={String(
                            column.id ??
                              columnIndex,
                          )}
                          className="flex items-center justify-between gap-2 px-4 py-2.5 text-xs"
                        >
                          <span className="min-w-0 truncate font-black text-slate-700">
                            {typeof column.name ===
                            "string"
                              ? column.name
                              : "column"}
                          </span>

                          <span className="shrink-0 rounded-lg bg-[#EEF3FF] px-2 py-0.5 font-black text-[#5873F9]">
                            {typeof column.type ===
                            "string"
                              ? column.type
                              : "TYPE"}
                          </span>
                        </div>
                      ),
                    )
                  )}
                </div>
              </article>
            );
          },
        )}
      </div>
    </div>
  );
}

function DesignFlowPage({
  nodes,
  edges,
  edgeCount,
}: {
  nodes: Record<
    string,
    unknown
  >[];
  edges: Record<
    string,
    unknown
  >[];
  edgeCount: number;
}) {
  if (nodes.length === 0) {
    return (
      <DesignEmptyText
        icon={GitBranch}
        title="작성된 화면 흐름이 없습니다."
        text="설계관리에서 화면 흐름을 작성하면 이곳에서 확인할 수 있습니다."
      />
    );
  }

  return (
    <div className="space-y-4">
      <SectionTitle
        title="화면 흐름"
        description="화면 사이의 이동 흐름을 시각화했습니다."
        count={`노드 ${nodes.length}개 · 연결 ${edgeCount}개`}
      />

      <DesignDiagramPreview
        nodes={nodes}
        edges={edges}
        type="flow"
        title="화면 흐름 미리보기"
        description="설계단계에서 작성한 흐름도를 그대로 표시합니다."
      />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {nodes.map(
          (node, index) => (
            <div
              key={String(
                node.id ??
                  index,
              )}
              className="flex items-center gap-3 rounded-xl border border-[var(--waivs-border)] bg-white p-4"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EEF3FF] text-[#5873F9]">
                <GitBranch
                  size={17}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-slate-950">
                  {getNodeLabel(
                    node,
                    `NODE_${
                      index + 1
                    }`,
                  )}
                </p>

                <p className="truncate text-xs font-medium text-slate-500">
                  {getNodeSubText(
                    node,
                  )}
                </p>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

/* =========================================================
   DIAGRAM PREVIEW
   ========================================================= */

/**
 * 화면 흐름 상자.
 *
 * 설계단계의 화면 카드(src/components/design/tabs/screens/ScreenNode.tsx)와
 * 같은 것을 보여 준다. 같은 데이터인데 그림이 다르면 다른 자료로 오해한다.
 */
function ScreenFlowNodeShape({
  node,
  width,
  height,
}: {
  node: NormalizedDiagramNode;
  width: number;
  height: number;
}) {
  const shownApis = node.apiLabels.slice(0, 3);
  const restApis = node.apiLabels.length - shownApis.length;

  return (
    <g>
      <rect
        x={node.x}
        y={node.y}
        width={width}
        height={height}
        rx={16}
        fill="#ffffff"
        stroke={node.isEntry ? "#34d399" : "#e5e7eb"}
        strokeWidth={node.isEntry ? 2 : 1}
      />

      {node.isEntry ? (
        <>
          <rect
            x={node.x + 12}
            y={node.y + 12}
            width={34}
            height={17}
            rx={6}
            fill="#ecfdf5"
          />
          <text
            x={node.x + 29}
            y={node.y + 24}
            textAnchor="middle"
            fill="#047857"
            fontSize={9}
            fontWeight={900}
          >
            시작
          </text>
        </>
      ) : null}

      <text
        x={node.x + (node.isEntry ? 54 : 14)}
        y={node.y + 25}
        fill="#0f172a"
        fontSize={13}
        fontWeight={900}
      >
        {node.label}
      </text>

      {node.requiresAuth ? (
        <text
          x={node.x + width - 14}
          y={node.y + 25}
          textAnchor="end"
          fill="#9ca3af"
          fontSize={9}
          fontWeight={900}
        >
          로그인
        </text>
      ) : null}

      <line
        x1={node.x}
        y1={node.y + 38}
        x2={node.x + width}
        y2={node.y + 38}
        stroke="#eef1f4"
      />

      <text
        x={node.x + 14}
        y={node.y + 56}
        fill="#6b7280"
        fontSize={10}
        fontWeight={700}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
      >
        {node.route}
      </text>

      <rect
        x={node.x + 14}
        y={node.y + 64}
        width={62}
        height={17}
        rx={5}
        fill={node.requirementCount === 0 ? "#fef2f2" : "#f1f5f9"}
      />
      <text
        x={node.x + 20}
        y={node.y + 76}
        fill={node.requirementCount === 0 ? "#dc2626" : "#475569"}
        fontSize={9}
        fontWeight={900}
      >
        요구사항 {node.requirementCount}
      </text>

      <rect
        x={node.x + 82}
        y={node.y + 64}
        width={34}
        height={17}
        rx={5}
        fill="#f1f5f9"
      />
      <text
        x={node.x + 99}
        y={node.y + 76}
        textAnchor="middle"
        fill="#475569"
        fontSize={9}
        fontWeight={900}
      >
        {node.roleLabel}
      </text>

      {shownApis.length === 0 ? (
        <text
          x={node.x + 14}
          y={node.y + 100}
          fill="#9ca3af"
          fontSize={9}
          fontWeight={700}
        >
          호출하는 API 없음
        </text>
      ) : (
        shownApis.map((label, index) => (
          <text
            key={label}
            x={node.x + 14}
            y={node.y + 100 + index * 14}
            fill="#6b7280"
            fontSize={9}
            fontWeight={700}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          >
            {label}
          </text>
        ))
      )}

      {restApis > 0 ? (
        <text
          x={node.x + 14}
          y={node.y + 100 + shownApis.length * 14}
          fill="#9ca3af"
          fontSize={9}
          fontWeight={700}
        >
          외 {restApis}개
        </text>
      ) : null}
    </g>
  );
}

function DesignDiagramPreview({
  nodes,
  edges,
  type,
  title,
  description,
}: {
  nodes: Record<
    string,
    unknown
  >[];
  edges: Record<
    string,
    unknown
  >[];
  type: "erd" | "flow";
  title: string;
  description: string;
}) {
  const normalizedNodes =
    useMemo(
      () =>
        normalizeDiagramNodes(
          nodes,
          type,
        ),
      [nodes, type],
    );

  const layout = useMemo(
    () =>
      getDiagramLayout(
        normalizedNodes,
        type,
      ),
    [normalizedNodes, type],
  );

  const nodeMap = useMemo(
    () =>
      new Map(
        layout.nodes.map(
          (node) => [
            node.id,
            node,
          ],
        ),
      ),
    [layout.nodes],
  );

  const strokeColor =
    type === "erd"
      ? "#5873F9"
      : "#7c3aed";

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--waivs-border)] bg-white">
      <div className="flex flex-col justify-between gap-2 border-b border-[var(--waivs-border-soft)] bg-slate-50 px-4 py-3 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-black text-slate-950">
            {title}
          </p>

          <p className="mt-0.5 text-xs font-medium text-slate-500">
            {description}
          </p>
        </div>

        <span className="w-fit rounded-full bg-white px-3 py-1 text-[11px] font-black text-[#5873F9]">
          노드 {nodes.length}개 ·
          연결 {edges.length}개
        </span>
      </div>

      <div className="overflow-auto bg-slate-50 p-3">
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="h-[420px] w-full min-w-[860px] rounded-xl border border-[var(--waivs-border)] bg-white"
          role="img"
          aria-label={title}
        >
          <defs>
            <marker
              id={`archive-arrow-${type}`}
              markerWidth="10"
              markerHeight="10"
              refX="8"
              refY="3"
              orient="auto"
            >
              <path
                d="M0,0 L0,6 L9,3 z"
                fill={strokeColor}
              />
            </marker>

            <pattern
              id={`archive-dot-grid-${type}`}
              width="18"
              height="18"
              patternUnits="userSpaceOnUse"
            >
              <circle
                cx="1"
                cy="1"
                r="1"
                fill="#e5e7eb"
              />
            </pattern>
          </defs>

          <rect
            width="100%"
            height="100%"
            fill="#f8fafc"
          />

          <rect
            width="100%"
            height="100%"
            fill={`url(#archive-dot-grid-${type})`}
          />

          {edges.map(
            (edge, index) => {
              const {
                source,
                target,
              } =
                getEdgeSourceTarget(
                  edge,
                );

              const sourceNode =
                nodeMap.get(source);

              const targetNode =
                nodeMap.get(target);

              if (
                !sourceNode ||
                !targetNode
              ) {
                return null;
              }

              const sourceX =
                sourceNode.x +
                layout.nodeWidth;

              const sourceY =
                sourceNode.y +
                layout.nodeHeight /
                  2;

              const targetX =
                targetNode.x;

              const targetY =
                targetNode.y +
                layout.nodeHeight /
                  2;

              // 화면 흐름에서는 "무엇을 했을 때 넘어가는가" 가
              // 핵심 정보다. 선만 그리면 그림에서 통째로 빠진다.
              const edgeLabel =
                typeof edge.label ===
                "string"
                  ? edge.label.trim()
                  : "";

              return (
                <g
                  key={String(
                    edge.id ??
                      index,
                  )}
                >
                  <path
                    d={buildSvgPath(
                      sourceX,
                      sourceY,
                      targetX,
                      targetY,
                    )}
                    fill="none"
                    stroke={
                      strokeColor
                    }
                    strokeWidth={2}
                    markerEnd={`url(#archive-arrow-${type})`}
                  />

                  {edgeLabel ? (
                    <text
                      x={
                        (sourceX +
                          targetX) /
                        2
                      }
                      y={
                        (sourceY +
                          targetY) /
                          2 -
                        8
                      }
                      textAnchor="middle"
                      fill="#475569"
                      fontSize={10}
                      fontWeight={700}
                      stroke="#ffffff"
                      strokeWidth={3}
                      paintOrder="stroke"
                    >
                      {edgeLabel}
                    </text>
                  ) : null}
                </g>
              );
            },
          )}

          {layout.nodes.map(
            (node) => {
              if (
                type === "erd"
              ) {
                return (
                  <g
                    key={node.id}
                  >
                    <rect
                      x={node.x}
                      y={node.y}
                      width={
                        layout.nodeWidth
                      }
                      height={
                        layout.nodeHeight
                      }
                      rx={14}
                      fill="#ffffff"
                      stroke="#dbe1ea"
                    />

                    <rect
                      x={node.x}
                      y={node.y}
                      width={
                        layout.nodeWidth
                      }
                      height={42}
                      rx={14}
                      fill="#5873F9"
                    />

                    <text
                      x={
                        node.x +
                        16
                      }
                      y={
                        node.y +
                        27
                      }
                      fill="#ffffff"
                      fontSize={13}
                      fontWeight={
                        900
                      }
                    >
                      {
                        node.label
                      }
                    </text>

                    {node.columns
                      .length ===
                    0 ? (
                      <text
                        x={
                          node.x +
                          16
                        }
                        y={
                          node.y +
                          78
                        }
                        fill="#64748b"
                        fontSize={
                          11
                        }
                        fontWeight={
                          700
                        }
                      >
                        컬럼 없음
                      </text>
                    ) : (
                      node.columns
                        .slice(
                          0,
                          4,
                        )
                        .map(
                          (
                            column,
                            columnIndex,
                          ) => {
                            const columnName =
                              typeof column.name ===
                              "string"
                                ? column.name
                                : "column";

                            const columnType =
                              typeof column.type ===
                              "string"
                                ? column.type
                                : "TYPE";

                            return (
                              <text
                                key={String(
                                  column.id ??
                                    columnIndex,
                                )}
                                x={
                                  node.x +
                                  16
                                }
                                y={
                                  node.y +
                                  74 +
                                  columnIndex *
                                    18
                                }
                                fill="#334155"
                                fontSize={
                                  11
                                }
                                fontWeight={
                                  700
                                }
                              >
                                {column.isPk
                                  ? "PK "
                                  : column.isFk
                                    ? "FK "
                                    : ""}
                                {
                                  columnName
                                }{" "}
                                ·{" "}
                                {
                                  columnType
                                }
                              </text>
                            );
                          },
                        )
                    )}
                  </g>
                );
              }

              return (
                <ScreenFlowNodeShape
                  key={node.id}
                  node={node}
                  width={
                    layout.nodeWidth
                  }
                  height={
                    layout.nodeHeight
                  }
                />
              );
            },
          )}
        </svg>
      </div>
    </section>
  );
}

/* =========================================================
   FINAL REPORT
   ========================================================= */

function ArchiveFinalReportContent({
  selectedProject,
  devlogCount,
  draft,
  onDraftChange,
  onGenerate,
  designDocument,
  isGenerating,
  errorMessage,
}: {
  selectedProject: Project | null;
  devlogCount: number;
  draft: string;
  onDraftChange: (
    value: string,
  ) => void;
  onGenerate: () => void;
  designDocument: ParsedDesignDocument;
  isGenerating: boolean;
  errorMessage: string;
}) {
  const textareaRef =
    useRef<HTMLTextAreaElement | null>(
      null,
    );

  useEffect(() => {
    const textarea =
      textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height =
      "auto";

    textarea.style.height = `${Math.max(
      textarea.scrollHeight,
      420,
    )}px`;
  }, [draft]);

  return (
    <section>
      <div className="mb-5 flex flex-col justify-between gap-4 border-b border-[var(--waivs-border-soft)] pb-5 md:flex-row md:items-center">
        <div>
          <h3 className="text-lg font-black text-slate-950">
            최종 보고서
          </h3>

          <p className="mt-1 text-sm font-medium text-slate-500">
            개발일지와 설계 데이터를
            기반으로 AI 초안을 생성하고
            최종 문서로 구성합니다.
          </p>
        </div>

        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#5873F9] px-4 text-sm font-black text-white transition hover:bg-[#4863E8] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGenerating ? (
            <Loader2
              className="animate-spin"
              size={16}
            />
          ) : (
            <Sparkles
              size={16}
            />
          )}

          {isGenerating
            ? "생성 중..."
            : "AI 초안 생성"}
        </button>
      </div>

      {errorMessage && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="rounded-xl border border-[var(--waivs-border)] bg-slate-50/50 p-4">
        <div className="mb-4 flex flex-col justify-between gap-2 border-b border-[var(--waivs-border-soft)] pb-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-black text-slate-950">
              프로젝트 최종 보고서
            </p>

            <p className="mt-1 text-xs font-medium text-slate-500">
              PDF 저장 시 아래 초안,
              ERD, 화면 흐름이 함께
              출력됩니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-[11px] font-black">
            <span className="rounded-full bg-[#EEF3FF] px-3 py-1 text-[#5873F9]">
              {selectedProject?.name ??
                "프로젝트 미선택"}
            </span>

            <span className="rounded-full bg-white px-3 py-1 text-slate-600">
              개발일지{" "}
              {devlogCount}개
            </span>
          </div>
        </div>

        <div className="space-y-6">
          <section>
            <div className="mb-2 flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-lg bg-[#5873F9] text-[11px] font-black text-white">
                1
              </span>

              <h4 className="text-sm font-black text-slate-950">
                AI 최종 보고서 초안
              </h4>
            </div>

            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(
                event,
              ) =>
                onDraftChange(
                  event.target
                    .value,
                )
              }
              placeholder={
                isGenerating
                  ? "AI가 최종 보고서 초안을 생성하는 중입니다."
                  : "AI 초안 생성 버튼을 누르면 최종 보고서 초안이 여기에 작성됩니다. 생성 후 직접 수정할 수 있습니다."
              }
              className="block min-h-[420px] w-full resize-none overflow-hidden rounded-xl border border-[var(--waivs-border)] bg-white p-4 text-sm font-medium leading-8 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#5873F9] focus:ring-2 focus:ring-[#5873F9]/10"
            />
          </section>

          <section>
            <div className="mb-2 flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-lg bg-[#5873F9] text-[11px] font-black text-white">
                2
              </span>

              <h4 className="text-sm font-black text-slate-950">
                설계 다이어그램
              </h4>
            </div>

            <FinalReportDesignVisuals
              designDocument={
                designDocument
              }
            />
          </section>
        </div>
      </div>
    </section>
  );
}

function FinalReportDesignVisuals({
  designDocument,
}: {
  designDocument: ParsedDesignDocument;
}) {
  const erdNodes =
    designDocument.erdNodes;

  const erdEdges =
    designDocument.erdEdges;

  const flowNodes =
    designDocument.flowNodes;

  const flowEdges =
    designDocument.flowEdges;

  const hasErd =
    erdNodes.length > 0;

  const hasFlow =
    flowNodes.length > 0;

  if (!hasErd && !hasFlow) {
    return (
      <DesignEmptyText
        icon={Database}
        title="표시할 설계 다이어그램이 없습니다."
        text="설계관리에서 ERD 또는 화면 흐름을 작성하면 최종 보고서에 함께 표시됩니다."
      />
    );
  }

  return (
    <section className="space-y-4">
      {hasErd && (
        <DesignDiagramPreview
          nodes={erdNodes}
          edges={erdEdges}
          type="erd"
          title="최종 보고서 ERD"
          description="PDF 저장 시 최종 보고서에 포함됩니다."
        />
      )}

      {hasFlow && (
        <DesignDiagramPreview
          nodes={flowNodes}
          edges={flowEdges}
          type="flow"
          title="최종 보고서 화면 흐름"
          description="PDF 저장 시 최종 보고서에 포함됩니다."
        />
      )}
    </section>
  );
}

/* =========================================================
   COMMON
   ========================================================= */

function SectionTitle({
  title,
  description,
  count,
}: {
  title: string;
  description: string;
  count: string;
}) {
  return (
    <div className="flex flex-col justify-between gap-2 border-b border-[var(--waivs-border-soft)] pb-4 md:flex-row md:items-center">
      <div>
        <h3 className="text-lg font-black text-slate-950">
          {title}
        </h3>

        <p className="mt-1 text-sm font-medium text-slate-500">
          {description}
        </p>
      </div>

      <span className="w-fit rounded-full bg-[#EEF3FF] px-3 py-1 text-[11px] font-black text-[#5873F9]">
        {count}
      </span>
    </div>
  );
}

function DesignEmptyText({
  icon: Icon,
  title,
  text,
}: {
  icon: ElementType;
  title: string;
  text: string;
}) {
  return (
    <div className="grid min-h-[300px] place-items-center rounded-2xl border border-dashed border-[var(--waivs-border)] bg-slate-50/70 px-6 py-10 text-center">
      <div className="max-w-[440px]">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#EEF3FF] text-[#5873F9]">
          <Icon size={20} />
        </div>

        <h4 className="mt-4 text-base font-black text-slate-800">
          {title}
        </h4>

        <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
          {text}
        </p>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  message,
}: {
  icon: ElementType;
  title: string;
  message: string;
}) {
  return (
    <div className="grid min-h-[360px] place-items-center rounded-2xl border border-dashed border-[var(--waivs-border)] bg-slate-50/70 px-6 py-12 text-center">
      <div className="max-w-[460px]">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#EEF3FF] text-[#5873F9]">
          <Icon size={22} />
        </div>

        <h4 className="mt-4 text-base font-black text-slate-800">
          {title}
        </h4>

        <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
          {message}
        </p>
      </div>
    </div>
  );
}