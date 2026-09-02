"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Code2,
  Database,
  Download,
  FileArchive,
  FileText,
  GitBranch,
  Loader2,
  Search,
  Sparkles,
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
import {
  DesignDocumentItem,
  ParsedDesignDocument,
  buildErdTablesForDraft,
  buildFlowNodesForDraft,
  buildPrintDiagramSvg,
  buildSvgPath,
  escapeHtml,
  escapeHtmlWithLineBreaks,
  formatApiPayload,
  getDiagramLayout,
  getEdgeSourceTarget,
  getNodeColumns,
  getNodeLabel,
  getNodeSubText,
  getParsedDesignDocument,
  getPrintDateLabel,
  normalizeDiagramNodes,
} from "@/features/design/render/legacyDesignView";

type ProjectStatus = "active" | "completed";
type ArchiveTabKey = "devlog" | "design" | "final";
type DesignArchiveSectionKey = "requirements" | "api" | "erd" | "flow";
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

type Project = {
  id: string;
  name: string;
  description: string;
  type: "개인" | "팀";
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

const archiveTabs: {
  key: ArchiveTabKey;
  label: string;
  description: string;
  icon: React.ElementType;
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
    description: "요구사항·API·ERD·데이터 흐름",
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
  icon: React.ElementType;
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
    label: "데이터 흐름",
    description: "화면·서버·DB 흐름",
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
    label: "데이터 플로우",
    group: "설계 문서",
    printTitle: "데이터 플로우",
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
    label: "최종 보고서 데이터 플로우",
    group: "최종 보고서",
    printTitle: "최종 보고서 데이터 플로우",
  },
];

function normalizeRole(value: unknown): "owner" | "member" {
  return String(value ?? "").toLowerCase() === "owner" ? "owner" : "member";
}

function normalizeStack(project: WorkspaceProjectResponse) {
  if (Array.isArray(project.stack) && project.stack.length > 0) {
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
  return workspace.mode === "team" ? "team" : "personal";
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringValue(
  record: Record<string, unknown>,
  keys: string[],
): string {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
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
  const directProjectName = getStringValue(devlog, [
    "projectName",
    "projectTitle",
    "workspaceProjectName",
  ]);

  if (directProjectName) return directProjectName;

  const projectObject = devlog.project;

  if (isRecord(projectObject)) {
    const nestedProjectName = getStringValue(projectObject, ["name", "title"]);
    if (nestedProjectName) return nestedProjectName;
  }

  const projectId = getStringValue(devlog, [
    "projectId",
    "project_id",
    "workspaceProjectId",
    "workspace_project_id",
  ]);

  if (projectId) {
    const matchedProject = workspace.projects?.find(
      (project) => String(project.id) === String(projectId),
    );

    if (matchedProject?.name) {
      return matchedProject.name;
    }
  }

  if (isRecord(rootResponse)) {
    const responseWorkspaceName = getStringValue(rootResponse, [
      "workspaceName",
      "name",
    ]);

    if (responseWorkspaceName) return responseWorkspaceName;
  }

  return workspace.name;
}

function getProjectIdFromDevlog(
  devlog: Record<string, unknown>,
  workspace: WorkspaceListResponse,
) {
  const directProjectId = getStringValue(devlog, [
    "projectId",
    "project_id",
    "workspaceProjectId",
    "workspace_project_id",
  ]);

  if (directProjectId) return directProjectId;

  const projectObject = devlog.project;

  if (isRecord(projectObject)) {
    const nestedProjectId = getStringValue(projectObject, [
      "id",
      "projectId",
      "workspaceProjectId",
    ]);

    if (nestedProjectId) return nestedProjectId;
  }

  const projectName = getProjectNameFromDevlog(devlog, workspace, null);

  const matchedProject = workspace.projects?.find((project) => {
    return (
      project.name === projectName ||
      project.name?.trim() === projectName.trim()
    );
  });

  return matchedProject?.id ? String(matchedProject.id) : undefined;
}

function looksLikeDevlog(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;

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
  if (depth > 7) return result;

  if (Array.isArray(value)) {
    for (const item of value) {
      collectDevlogCandidates(item, result, depth + 1);
    }

    return result;
  }

  if (!isRecord(value)) return result;

  if (looksLikeDevlog(value)) {
    result.push(value);
    return result;
  }

  for (const [key, child] of Object.entries(value)) {
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
      collectDevlogCandidates(child, result, depth + 1);
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
    getStringValue(devlog, ["id", "devlogId", "logId"]) ||
    `${workspace.id}-${index}`;

  const title =
    getStringValue(devlog, ["title", "name", "subject"]) || "제목 없는 자료";

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
    getStringValue(devlog, ["summary", "content", "description"]) ||
    getStringValue(devlog, ["issue", "solution", "nextPlan"]) ||
    "작성된 요약이 없습니다.";

  const projectId = getProjectIdFromDevlog(devlog, workspace);

  return {
    id,
    projectId,
    workspaceId: workspace.id,
    title,
    projectName: getProjectNameFromDevlog(devlog, workspace, rootResponse),
    date: formatDateLabel(rawDate),
    rawDate,
    summary,
  };
}

function mapDevlogsFromWorkspaceResponse(
  response: WorkspaceDevlogsResponse,
  workspace: WorkspaceListResponse,
): Devlog[] {
  const candidates = collectDevlogCandidates(response);

  const mapped = candidates.map((devlog, index) =>
    mapDevlogItem(devlog, workspace, response, index),
  );

  const uniqueMap = new Map<string, Devlog>();

  for (const item of mapped) {
    uniqueMap.set(item.id, item);
  }

  return Array.from(uniqueMap.values());
}

function mapProjectsFromWorkspaces(
  workspaces: WorkspaceListResponse[],
  scheduleProgressMap: Map<string, ScheduleProgressResponse>,
): Project[] {
  return workspaces.map((workspace) => {
    normalizeRole(workspace.role);

    const childProjects = workspace.projects ?? [];
    const firstProject = childProjects[0];

    const scheduleProgress = scheduleProgressMap.get(workspace.id);
    const progress =
      typeof scheduleProgress?.progress === "number"
        ? scheduleProgress.progress
        : 0;

    const status: ProjectStatus = progress >= 100 ? "completed" : "active";

    const language =
      firstProject?.language ||
      childProjects.find((project) => project.language)?.language ||
      "Unknown";

    const stack =
      childProjects.length > 0
        ? Array.from(
            new Set(
              childProjects
                .flatMap((project) => normalizeStack(project))
                .filter(Boolean),
            ),
          )
        : language
          ? [language]
          : ["언어 없음"];

    const updatedAt =
      workspace.updatedAt ??
      childProjects
        .map((project) => project.updatedAt)
        .filter(Boolean)
        .sort()
        .reverse()[0] ??
      undefined;

    const devlogCount = childProjects.reduce(
      (sum, project) => sum + Number(project.devlogCount ?? 0),
      0,
    );

    return {
      id: workspace.id,
      name: workspace.name,
      description:
        workspace.description ||
        firstProject?.description ||
        `${workspace.name} 워크스페이스입니다.`,
      type: workspace.mode === "team" ? "팀" : "개인",
      status,
      progress,
      language,
      stack,
      updatedAt,
      devlogCount,
      doneScheduleCount: Number(scheduleProgress?.doneCount ?? 0),
      scheduleTotalCount: Number(scheduleProgress?.totalCount ?? 0),
      workspaceId: workspace.id,
    };
  });
}

function applyDevlogCountToProjects(
  projects: Project[],
  devlogs: Devlog[],
): Project[] {
  const countMap = new Map<string, number>();

  for (const devlog of devlogs) {
    if (!devlog.projectId) continue;

    const key = String(devlog.projectId);
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
  }

  return projects.map((project) => {
    const countByProjectId = countMap.get(String(project.id));

    return {
      ...project,
      devlogCount:
        typeof countByProjectId === "number"
          ? countByProjectId
          : project.devlogCount,
    };
  });
}

export default function ArchivePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [devlogs, setDevlogs] = useState<Devlog[]>([]);

  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [activeArchiveTab, setActiveArchiveTab] =
    useState<ArchiveTabKey>("devlog");
  const [activeDesignSection, setActiveDesignSection] =
    useState<DesignArchiveSectionKey>("requirements");
  const [keyword, setKeyword] = useState("");
  const [sortType, setSortType] = useState<DevlogSortType>("latest");
  const [isPdfMenuOpen, setIsPdfMenuOpen] = useState(false);
  const [selectedPdfSections, setSelectedPdfSections] = useState<
    ArchivePdfSectionKey[]
  >(archivePdfSectionItems.map((item) => item.key));

  const [designRequirements, setDesignRequirements] = useState<
    DesignRequirementItem[]
  >([]);
  const [designApiSpecs, setDesignApiSpecs] = useState<DesignApiSpecItem[]>([]);
  const [designDocument, setDesignDocument] =
    useState<DesignDocumentItem | null>(null);

  const [finalReportDraft, setFinalReportDraft] = useState("");
  const [finalReportLoading, setFinalReportLoading] = useState(false);
  const [finalReportError, setFinalReportError] = useState("");

  const [loading, setLoading] = useState(true);
  const [designLoading, setDesignLoading] = useState(false);
  const [error, setError] = useState("");
  const [designError, setDesignError] = useState("");

  const projectOptions = useMemo(() => {
    return projects.map((project) => ({
      id: project.id,
      name: project.name,
      type: project.type,
      progress: project.progress,
    }));
  }, [projects]);

  const selectedProject = useMemo(() => {
    return projects.find((project) => project.id === selectedProjectId) ?? null;
  }, [projects, selectedProjectId]);

  const selectedDesignWorkspaceId =
    selectedProject?.workspaceId || selectedProject?.id || "";

  const parsedDesignDocument = useMemo(
    () => getParsedDesignDocument(designDocument),
    [designDocument],
  );

  const filteredDevlogs = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return devlogs
      .filter((devlog) => {
        const matchesProject =
          String(devlog.projectId ?? "") === selectedProjectId ||
          String(devlog.workspaceId ?? "") === selectedProjectId;

        const matchesKeyword =
          !normalizedKeyword ||
          devlog.title.toLowerCase().includes(normalizedKeyword) ||
          devlog.summary.toLowerCase().includes(normalizedKeyword) ||
          devlog.projectName.toLowerCase().includes(normalizedKeyword);

        return matchesProject && matchesKeyword;
      })
      .sort((a, b) => {
        const aTime = getDevlogSortTime(a);
        const bTime = getDevlogSortTime(b);

        return sortType === "latest" ? bTime - aTime : aTime - bTime;
      });
  }, [devlogs, keyword, selectedProjectId, sortType]);

  const activeArchive = archiveTabs.find((tab) => tab.key === activeArchiveTab);

  const totalDesignCount =
    designRequirements.length +
    designApiSpecs.length +
    parsedDesignDocument.erdNodes.length +
    parsedDesignDocument.flowNodes.length;

  const selectedPdfSectionLabels = archivePdfSectionItems
    .filter((item) => selectedPdfSections.includes(item.key))
    .map((item) => item.label);

  useEffect(() => {
    let mounted = true;

    async function loadArchivePage() {
      try {
        setLoading(true);
        setError("");

        const workspaceDtos = await fetchMyWorkspaces();

        const scheduleProgressResults = await Promise.allSettled(
          workspaceDtos.map(async (workspace) => {
            const view = getScheduleViewFromWorkspace(workspace);
            const progress = await fetchScheduleProgress(view, workspace.id);

            return {
              workspaceId: workspace.id,
              progress,
            };
          }),
        );

        const scheduleProgressMap = new Map<string, ScheduleProgressResponse>();

        for (const result of scheduleProgressResults) {
          if (result.status === "fulfilled") {
            scheduleProgressMap.set(
              result.value.workspaceId,
              result.value.progress,
            );
          }
        }

        const devlogResults = await Promise.allSettled(
          workspaceDtos.map(async (workspace) => {
            const response = await fetchWorkspaceDevlogs(workspace.id);
            return mapDevlogsFromWorkspaceResponse(response, workspace);
          }),
        );

        const nextDevlogs = devlogResults
          .filter(
            (result): result is PromiseFulfilledResult<Devlog[]> =>
              result.status === "fulfilled",
          )
          .flatMap((result) => result.value)
          .sort((a, b) => getDevlogSortTime(b) - getDevlogSortTime(a));

        const nextProjects = mapProjectsFromWorkspaces(
          workspaceDtos,
          scheduleProgressMap,
        );

        const projectsWithDevlogCount = applyDevlogCountToProjects(
          nextProjects,
          nextDevlogs,
        );

        if (!mounted) return;

        setProjects(projectsWithDevlogCount);
        setDevlogs(nextDevlogs);

        if (projectsWithDevlogCount.length > 0) {
          setSelectedProjectId(projectsWithDevlogCount[0].id);
        }
      } catch (error) {
        if (!mounted) return;

        setError(
          error instanceof Error
            ? error.message
            : "자료실 정보를 불러오지 못했습니다.",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadArchivePage();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (projectOptions.length === 0) {
      if (selectedProjectId) setSelectedProjectId("");
      return;
    }

    const exists = projectOptions.some(
      (project) => project.id === selectedProjectId,
    );

    if (!selectedProjectId || !exists) {
      setSelectedProjectId(projectOptions[0].id);
    }
  }, [projectOptions, selectedProjectId]);

  useEffect(() => {
    setFinalReportDraft("");
    setFinalReportError("");
  }, [selectedProjectId]);

  useEffect(() => {
    let mounted = true;

    async function loadDesignArchive() {
      if (!selectedDesignWorkspaceId) {
        setDesignRequirements([]);
        setDesignApiSpecs([]);
        setDesignDocument(null);
        return;
      }

      try {
        setDesignLoading(true);
        setDesignError("");

        const [requirementsResult, apiSpecsResult, designDocumentResult] =
          await Promise.allSettled([
            fetchWorkspaceRequirementsApi(selectedDesignWorkspaceId),
            fetchWorkspaceApiSpecsApi(selectedDesignWorkspaceId),
            fetchWorkspaceDesignDocumentApi(selectedDesignWorkspaceId),
          ]);

        if (!mounted) return;

        if (requirementsResult.status === "fulfilled") {
          setDesignRequirements(
            Array.isArray(requirementsResult.value)
              ? requirementsResult.value
              : [],
          );
        } else {
          setDesignRequirements([]);
        }

        if (apiSpecsResult.status === "fulfilled") {
          setDesignApiSpecs(
            Array.isArray(apiSpecsResult.value) ? apiSpecsResult.value : [],
          );
        } else {
          setDesignApiSpecs([]);
        }

        if (designDocumentResult.status === "fulfilled") {
          setDesignDocument(designDocumentResult.value ?? null);
        } else {
          setDesignDocument(null);
        }

        const failedCount = [
          requirementsResult,
          apiSpecsResult,
          designDocumentResult,
        ].filter((result) => result.status === "rejected").length;

        if (failedCount > 0) {
          setDesignError(
            "일부 설계 문서를 불러오지 못했습니다. 저장된 항목만 표시합니다.",
          );
        }
      } catch (error) {
        if (!mounted) return;

        setDesignRequirements([]);
        setDesignApiSpecs([]);
        setDesignDocument(null);
        setDesignError(
          error instanceof Error
            ? error.message
            : "설계 문서를 불러오지 못했습니다.",
        );
      } finally {
        if (mounted) setDesignLoading(false);
      }
    }

    loadDesignArchive();

    return () => {
      mounted = false;
    };
  }, [selectedDesignWorkspaceId]);

  const handleGenerateFinalReport = async () => {
    if (!selectedProject) {
      alert("최종 보고서 초안을 생성할 프로젝트를 선택해주세요.");
      return;
    }

    if (!selectedDesignWorkspaceId) {
      alert("프로젝트 식별값을 찾지 못했습니다.");
      return;
    }

    if (finalReportLoading) {
      return;
    }

    try {
      setFinalReportLoading(true);
      setFinalReportError("");

      const response = await generateFinalReportDraftApi({
        workspaceId: selectedDesignWorkspaceId,
        project: {
          name: selectedProject.name,
          description: selectedProject.description,
          type: selectedProject.type,
          language: selectedProject.language,
          stack: selectedProject.stack,
          progress: selectedProject.progress,
          doneScheduleCount: selectedProject.doneScheduleCount,
          scheduleTotalCount: selectedProject.scheduleTotalCount,
          devlogCount: filteredDevlogs.length,
        },
        devlogs: filteredDevlogs.map((devlog) => ({
          title: devlog.title,
          date: devlog.date,
          projectName: devlog.projectName,
          summary: devlog.summary,
        })),
        requirements: designRequirements.map((item) => ({
          category: item.category,
          name: item.name,
          description: item.description,
        })),
        apiSpecs: designApiSpecs.map((item) => ({
          method: item.method,
          endpoint: item.endpoint,
          description: item.description,
          request: item.request,
          response: item.response,
        })),
        erdTables: buildErdTablesForDraft(parsedDesignDocument.erdNodes),
        flowNodes: buildFlowNodesForDraft(parsedDesignDocument.flowNodes),
      });

      const responseRecord =
        typeof response === "object" && response !== null
          ? (response as Record<string, unknown>)
          : null;

      const nextDraft =
        typeof response === "string"
          ? response
          : typeof responseRecord?.draft === "string"
            ? responseRecord.draft
            : typeof responseRecord?.content === "string"
              ? responseRecord.content
              : typeof responseRecord?.result === "string"
                ? responseRecord.result
                : typeof responseRecord?.message === "string"
                  ? responseRecord.message
                  : "";

      if (!nextDraft.trim()) {
        throw new Error(
          "AI 초안 응답은 왔지만 보고서 내용이 비어 있습니다. 백엔드 응답 필드명을 확인해주세요.",
        );
      }

      setFinalReportDraft(nextDraft);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "AI 최종 보고서 초안 생성에 실패했습니다.";

      setFinalReportError(message);
      alert(message);
    } finally {
      setFinalReportLoading(false);
    }
  };

  const togglePdfSection = (sectionKey: ArchivePdfSectionKey) => {
    setSelectedPdfSections((prev) => {
      if (prev.includes(sectionKey)) {
        return prev.filter((key) => key !== sectionKey);
      }

      return [...prev, sectionKey];
    });
  };

  const selectAllPdfSections = () => {
    setSelectedPdfSections(archivePdfSectionItems.map((item) => item.key));
  };

  const clearPdfSections = () => {
    setSelectedPdfSections([]);
  };

  const selectCurrentArchivePdfSections = () => {
    if (activeArchiveTab === "devlog") {
      setSelectedPdfSections(["devlog"]);
      return;
    }

    if (activeArchiveTab === "design") {
      setSelectedPdfSections([
        "design-requirements",
        "design-api",
        "design-erd",
        "design-flow",
      ]);
      return;
    }

    setSelectedPdfSections(["final-report", "final-erd", "final-flow"]);
  };

  const handlePrintPdf = () => {
    const selectedSections = archivePdfSectionItems.filter((item) =>
      selectedPdfSections.includes(item.key),
    );

    if (selectedSections.length === 0) {
      alert("PDF로 출력할 항목을 1개 이상 선택해주세요.");
      setIsPdfMenuOpen(true);
      return;
    }

    const printWindow = window.open("", "_blank", "width=920,height=1000");

    if (!printWindow) {
      alert("팝업이 차단되어 PDF 저장 창을 열 수 없습니다.");
      return;
    }

    const documentTitle =
      selectedSections.length === archivePdfSectionItems.length
        ? "프로젝트 자료실"
        : `프로젝트 자료실 - ${selectedSections
            .map((item) => item.label)
            .join(", ")}`;
    const selectedProjectName = selectedProject?.name || "선택된 프로젝트";
    const selectedSectionText = selectedSections
      .map((item) => item.label)
      .join(", ");

    const devlogHtml = filteredDevlogs.length
      ? filteredDevlogs
          .map(
            (devlog, index) => `
              <article class="print-card">
                <div class="print-card-header">
                  <span class="index">${index + 1}</span>
                  <div>
                    <h2>${escapeHtml(devlog.title)}</h2>
                    <p class="meta">${escapeHtml(devlog.projectName)} · ${escapeHtml(devlog.date)}</p>
                  </div>
                </div>
                <p class="body-text">${escapeHtmlWithLineBreaks(devlog.summary)}</p>
              </article>
            `,
          )
          .join("")
      : `<div class="empty small-empty">조건에 맞는 개발일지가 없습니다.</div>`;

    const requirementHtml = designRequirements.length
      ? designRequirements
          .map(
            (item, index) => `
              <article class="print-card compact-card">
                <div class="print-card-header">
                  <span class="index">${index + 1}</span>
                  <div>
                    <h2>${escapeHtml(item.name || "이름 없는 요구사항")}</h2>
                    <p class="meta">${escapeHtml(item.category || "기본")}</p>
                  </div>
                </div>
                <p class="body-text">${escapeHtmlWithLineBreaks(item.description || "설명이 없습니다.")}</p>
              </article>
            `,
          )
          .join("")
      : `<div class="empty small-empty">작성된 요구사항이 없습니다.</div>`;

    const apiHtml = designApiSpecs.length
      ? designApiSpecs
          .map(
            (item) => `
              <article class="print-card compact-card">
                <h2>
                  <span class="method">${escapeHtml(item.method || "GET")}</span>
                  ${escapeHtml(item.endpoint || "/api/example")}
                </h2>
                <p class="body-text">${escapeHtmlWithLineBreaks(
                  item.description || "설명이 없습니다.",
                )}</p>

                <div class="api-payload-grid">
                  <div>
                    <p class="payload-title">요청 데이터</p>
                    <pre class="code-block">${escapeHtml(formatApiPayload(item.request))}</pre>
                  </div>

                  <div>
                    <p class="payload-title">응답 데이터</p>
                    <pre class="code-block">${escapeHtml(formatApiPayload(item.response))}</pre>
                  </div>
                </div>
              </article>
            `,
          )
          .join("")
      : `<div class="empty small-empty">작성된 API 명세가 없습니다.</div>`;

    const erdDiagramHtml = buildPrintDiagramSvg({
      nodes: parsedDesignDocument.erdNodes,
      edges: parsedDesignDocument.erdEdges,
      type: "erd",
    });

    const flowDiagramHtml = buildPrintDiagramSvg({
      nodes: parsedDesignDocument.flowNodes,
      edges: parsedDesignDocument.flowEdges,
      type: "flow",
    });

    const erdDetailHtml = parsedDesignDocument.erdNodes.length
      ? parsedDesignDocument.erdNodes
          .map((node, index) => {
            const columns = getNodeColumns(node);

            return `
              <article class="print-card compact-card">
                <div class="print-card-header">
                  <span class="index">${index + 1}</span>
                  <div>
                    <h2>${escapeHtml(getNodeLabel(node, `TABLE_${index + 1}`))}</h2>
                    <p class="meta">컬럼 ${columns.length}개</p>
                  </div>
                </div>
                <p class="body-text">${
                  columns.length
                    ? columns
                        .slice(0, 12)
                        .map((column) => {
                          const name =
                            typeof column.name === "string"
                              ? column.name
                              : "column";
                          const type =
                            typeof column.type === "string"
                              ? column.type
                              : "TYPE";

                          return `${escapeHtml(name)} (${escapeHtml(type)})`;
                        })
                        .join(", ")
                    : "컬럼이 없습니다."
                }</p>
              </article>
            `;
          })
          .join("")
      : `<div class="empty small-empty">작성된 ERD 테이블이 없습니다.</div>`;

    const flowDetailHtml = parsedDesignDocument.flowNodes.length
      ? parsedDesignDocument.flowNodes
          .map(
            (node, index) => `
              <article class="print-card compact-card">
                <div class="print-card-header">
                  <span class="index">${index + 1}</span>
                  <div>
                    <h2>${escapeHtml(getNodeLabel(node, `NODE_${index + 1}`))}</h2>
                    <p class="meta">${escapeHtml(getNodeSubText(node))}</p>
                  </div>
                </div>
              </article>
            `,
          )
          .join("")
      : `<div class="empty small-empty">작성된 데이터 플로우가 없습니다.</div>`;

    const reportContent =
      finalReportDraft.trim() ||
      "AI 초안 생성 버튼을 눌러 최종 보고서 초안을 생성한 뒤 PDF로 저장할 수 있습니다.";

    const sectionHtmlMap: Record<ArchivePdfSectionKey, string> = {
      devlog: devlogHtml,
      "design-requirements": requirementHtml,
      "design-api": apiHtml,
      "design-erd": `
        <p class="body-text section-description">설계단계에서 작성한 테이블과 관계선을 시각화한 다이어그램입니다.</p>
        ${erdDiagramHtml}
        ${erdDetailHtml}
      `,
      "design-flow": `
        <p class="body-text section-description">화면, 서버, DB, 외부 서비스 사이의 데이터 흐름을 시각화한 다이어그램입니다.</p>
        ${flowDiagramHtml}
        ${flowDetailHtml}
      `,
      "final-report": `
        <article class="print-card report-card">
          <div class="report-text">${escapeHtmlWithLineBreaks(reportContent)}</div>
        </article>
      `,
      "final-erd": erdDiagramHtml,
      "final-flow": flowDiagramHtml,
    };

    const printBody = selectedSections
      .map(
        (section, index) => `
          <section class="print-section">
            <h2 class="section-title">${index + 1}. ${escapeHtml(section.printTitle)}</h2>
            ${sectionHtmlMap[section.key]}
          </section>
        `,
      )
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html lang="ko">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(documentTitle)}</title>
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
              font-family: Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              line-height: 1.65;
            }

            .document {
              width: 100%;
            }

            .document-header {
              padding-bottom: 18px;
              margin-bottom: 22px;
              border-bottom: 2px solid #1d4ed8;
            }

            .eyebrow {
              margin: 0 0 6px;
              color: #2563eb;
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
              color: #1d4ed8;
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
              background: #2563eb;
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
              background: #dbeafe;
              color: #1d4ed8;
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
              border: 1px solid #dbeafe;
              border-radius: 12px;
              background: #f8fbff;
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
              color: #2563eb;
              font-size: 11px;
              font-weight: 900;
            }

            .diagram-wrap {
              width: 100%;
              margin: 12px 0 18px;
              border: 1px solid #dbeafe;
              border-radius: 16px;
              overflow: hidden;
              background: #f8fbff;
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
              <p class="eyebrow">PROJECT ARCHIVE</p>
              <h1>${escapeHtml(documentTitle)}</h1>

              <section class="header-meta">
                <div class="meta-box">
                  <span class="meta-label">프로젝트</span>
                  <span class="meta-value">${escapeHtml(selectedProjectName)}</span>
                </div>

                <div class="meta-box">
                  <span class="meta-label">출력 항목</span>
                  <span class="meta-value">${escapeHtml(selectedSectionText)}</span>
                </div>

                <div class="meta-box">
                  <span class="meta-label">저장일</span>
                  <span class="meta-value">${escapeHtml(getPrintDateLabel())}</span>
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

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f4f8ff] p-4 text-slate-950 md:p-5">
        <section className="mx-auto flex min-h-[420px] max-w-[1440px] items-center justify-center rounded-[28px] border border-blue-100 bg-white shadow-sm">
          <div className="flex items-center gap-3 text-sm font-black text-slate-500">
            <Loader2 className="animate-spin" size={18} />
            자료실 정보를 불러오는 중입니다.
          </div>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#f4f8ff] p-4 text-slate-950 md:p-5">
        <section className="mx-auto max-w-[1440px] rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
          {error}
        </section>
      </main>
    );
  }

 return (
  <main className="min-h-screen bg-[#f4f8ff] p-4 text-slate-950 md:p-5">
   <div className="mx-auto grid w-full max-w-[1680px] grid-cols-1 gap-5 xl:grid-cols-[300px_1fr]">
      <aside className="space-y-4">
        <section className="rounded-[26px] border border-blue-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-950 text-white">
              <FileArchive size={20} />
            </div>

            <div>
              <h1 className="text-xl font-black tracking-tight">
                프로젝트 자료실
              </h1>
              <p className="mt-0.5 text-xs font-bold text-slate-500">
                개발일지 · 설계 문서 · 최종 보고서
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {archiveTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeArchiveTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveArchiveTab(tab.key)}
                  className={[
                    "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition",
                    isActive
                      ? "border-blue-950 bg-blue-950 text-white shadow-sm"
                      : "border-blue-100 bg-blue-50/60 text-slate-700 hover:bg-blue-100",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                      isActive ? "bg-white/15" : "bg-white text-blue-700",
                    ].join(" ")}
                  >
                    <Icon size={17} />
                  </span>

                  <span className="min-w-0">
                    <span className="block text-sm font-black">
                      {tab.label}
                    </span>
                    <span
                      className={[
                        "mt-0.5 block truncate text-[11px] font-bold",
                        isActive ? "text-blue-100" : "text-slate-400",
                      ].join(" ")}
                    >
                      {tab.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-[26px] border border-blue-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-black text-slate-950">프로젝트 선택</p>

          <select
            value={selectedProjectId}
            onChange={(event) => setSelectedProjectId(event.target.value)}
            disabled={projectOptions.length === 0}
            className="mt-3 h-11 w-full rounded-2xl border border-blue-100 bg-blue-50 px-3 text-sm font-bold text-slate-700 outline-none disabled:cursor-not-allowed disabled:opacity-50 focus:border-blue-400 focus:bg-white"
          >
            {projectOptions.length === 0 && (
              <option value="">프로젝트 없음</option>
            )}

            {projectOptions.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          {selectedProject && (
            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-blue-700">
                  {selectedProject.type}
                </span>
                <span className="text-xs font-black text-slate-500">
                  {selectedProject.progress}%
                </span>
              </div>

              <p className="mt-3 line-clamp-1 text-sm font-black text-slate-950">
                {selectedProject.name}
              </p>

              <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
                {selectedProject.description || "설명이 없습니다."}
              </p>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: `${selectedProject.progress}%` }}
                />
              </div>
            </div>
          )}
        </section>

        <section className="grid grid-cols-2 gap-2">
          <ArchiveStatCard label="개발일지" value={`${filteredDevlogs.length}개`} />
          <ArchiveStatCard label="설계자료" value={`${totalDesignCount}개`} />
          <ArchiveStatCard
            label="요구사항"
            value={`${designRequirements.length}개`}
          />
          <ArchiveStatCard
            label="API"
            value={`${designApiSpecs.length}개`}
          />
        </section>
      </aside>

      <section className="min-w-0 space-y-4">
        <section className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-black tracking-tight text-slate-950">
                  {activeArchive?.label}
                </h2>

                <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">
                  {selectedProject?.name ?? "프로젝트 없음"}
                </span>
              </div>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                선택한 프로젝트의 자료를 조회하고 PDF로 저장할 수 있습니다.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="자료실 검색"
                  className="h-10 w-full rounded-2xl border border-blue-100 bg-blue-50 pl-10 pr-3 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white sm:w-[250px]"
                />
              </div>

              {activeArchiveTab === "devlog" && (
                <select
                  value={sortType}
                  onChange={(event) =>
                    setSortType(event.target.value as DevlogSortType)
                  }
                  className="h-10 rounded-2xl border border-blue-100 bg-blue-50 px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-400 focus:bg-white"
                >
                  <option value="latest">최신순</option>
                  <option value="oldest">오래된순</option>
                </select>
              )}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsPdfMenuOpen((prev) => !prev)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-blue-950 px-4 text-sm font-black text-white hover:bg-blue-900"
                >
                  <Download size={16} />
                  PDF 저장
                  <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] text-white">
                    {selectedPdfSections.length}
                  </span>
                </button>

                {isPdfMenuOpen && (
                  <div className="absolute right-0 top-12 z-50 w-[330px] rounded-2xl border border-blue-100 bg-white p-3 shadow-[0_18px_48px_rgba(15,23,42,0.16)]">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-black text-slate-950">
                          PDF 출력 항목
                        </p>
                        <p className="mt-0.5 text-[11px] font-bold text-slate-500">
                          개발일지, 설계 문서, 최종 보고서를 원하는 조합으로 출력합니다.
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">
                        {selectedPdfSections.length}개 선택
                      </span>
                    </div>

                    <div className="mb-3 grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={selectAllPdfSections}
                        className="h-7 rounded-lg bg-blue-50 px-2 text-[11px] font-black text-blue-700 transition hover:bg-blue-100"
                      >
                        전체
                      </button>
                      <button
                        type="button"
                        onClick={selectCurrentArchivePdfSections}
                        className="h-7 rounded-lg bg-indigo-50 px-2 text-[11px] font-black text-indigo-700 transition hover:bg-indigo-100"
                      >
                        현재 탭
                      </button>
                      <button
                        type="button"
                        onClick={clearPdfSections}
                        className="h-7 rounded-lg bg-slate-50 px-2 text-[11px] font-black text-slate-500 transition hover:bg-slate-100"
                      >
                        해제
                      </button>
                    </div>

                    <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
                      {["개발일지", "설계 문서", "최종 보고서"].map((group) => (
                        <section key={group}>
                          <p className="mb-1.5 px-1 text-[11px] font-black text-slate-400">
                            {group}
                          </p>

                          <div className="space-y-1.5">
                            {archivePdfSectionItems
                              .filter((item) => item.group === group)
                              .map((item) => {
                                const checked = selectedPdfSections.includes(
                                  item.key,
                                );

                                return (
                                  <label
                                    key={item.key}
                                    className={[
                                      "flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2 text-sm transition",
                                      checked
                                        ? "border-blue-200 bg-blue-50 text-blue-800"
                                        : "border-slate-100 bg-white text-slate-600 hover:bg-slate-50",
                                    ].join(" ")}
                                  >
                                    <span className="font-black">
                                      {item.label}
                                    </span>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => togglePdfSection(item.key)}
                                      className="h-4 w-4 accent-blue-600"
                                    />
                                  </label>
                                );
                              })}
                          </div>
                        </section>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        handlePrintPdf();

                        if (selectedPdfSections.length > 0) {
                          setIsPdfMenuOpen(false);
                        }
                      }}
                      disabled={selectedPdfSections.length === 0}
                      className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-xs font-extrabold text-white shadow-sm shadow-blue-100 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <Download size={14} />
                      선택 항목 PDF 저장
                    </button>

                    <p className="mt-2 truncate text-[11px] font-bold text-slate-400">
                      선택됨:{" "}
                      {selectedPdfSectionLabels.length > 0
                        ? selectedPdfSectionLabels.join(", ")
                        : "없음"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {activeArchiveTab === "devlog" && (
          <ArchiveDevlogContent devlogs={filteredDevlogs} />
        )}

        {activeArchiveTab === "design" && (
          <ArchiveDesignContent
            activeDesignSection={activeDesignSection}
            onActiveDesignSectionChange={setActiveDesignSection}
            selectedProject={selectedProject}
            requirements={designRequirements}
            apiSpecs={designApiSpecs}
            designDocument={parsedDesignDocument}
            isLoading={designLoading}
            errorMessage={designError}
          />
        )}

        {activeArchiveTab === "final" && (
          <ArchiveFinalReportContent
            selectedProject={selectedProject}
            devlogCount={filteredDevlogs.length}
            draft={finalReportDraft}
            onDraftChange={setFinalReportDraft}
            onGenerate={handleGenerateFinalReport}
            designDocument={parsedDesignDocument}
            isGenerating={finalReportLoading}
            errorMessage={finalReportError}
          />
        )}
      </section>
    </div>
  </main>
);
}

function ArchiveStatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-black text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </article>
  );
}

function ArchiveDevlogContent({ devlogs }: { devlogs: Devlog[] }) {
  return (
    <section className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-950">개발일지 목록</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            일정 기반 일지와 일반 일지를 문서 형태로 모아 보여줍니다.
          </p>
        </div>

        <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">
          {devlogs.length}개
        </span>
      </div>

      {devlogs.length === 0 ? (
        <EmptyState message="조건에 맞는 개발일지가 없습니다." />
      ) : (
        <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
          {devlogs.map((devlog) => (
            <DevlogCard key={devlog.id} devlog={devlog} />
          ))}
        </div>
      )}
    </section>
  );
}

function DevlogCard({ devlog }: { devlog: Devlog }) {
  return (
    <article className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 transition hover:bg-blue-50">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <h4 className="line-clamp-1 text-sm font-black text-slate-950">
              {devlog.title}
            </h4>

            <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-black text-blue-700">
              {devlog.projectName}
            </span>
          </div>

          <p className="line-clamp-4 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-600">
            {devlog.summary}
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-400">
          {devlog.date}
        </span>
      </div>
    </article>
  );
}

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
  onActiveDesignSectionChange: (value: DesignArchiveSectionKey) => void;
  selectedProject: Project | null;
  requirements: DesignRequirementItem[];
  apiSpecs: DesignApiSpecItem[];
  designDocument: ParsedDesignDocument;
  isLoading: boolean;
  errorMessage: string;
}) {
  const erdTables = designDocument.erdNodes;
  const erdRelations = designDocument.erdEdges;
  const flowNodes = designDocument.flowNodes;
  const flowEdges = designDocument.flowEdges;

  const hasAnyDesignData =
    requirements.length > 0 ||
    apiSpecs.length > 0 ||
    erdTables.length > 0 ||
    flowNodes.length > 0;

  return (
    <section className="space-y-4">
      {errorMessage && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
          {errorMessage}
        </div>
      )}

      <section className="rounded-[28px] border border-blue-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {designSectionTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeDesignSection === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onActiveDesignSectionChange(tab.key)}
                  className={[
                    "inline-flex h-10 items-center gap-2 rounded-2xl border px-3 text-xs font-black transition",
                    isActive
                      ? "border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-100"
                      : "border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100",
                  ].join(" ")}
                >
                  <Icon size={15} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <span className="w-fit rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">
            선택 프로젝트: {selectedProject?.name ?? "프로젝트 없음"}
          </span>
        </div>
      </section>

      {isLoading ? (
        <section className="rounded-[28px] border border-blue-100 bg-white px-4 py-14 text-center text-sm font-black text-slate-500 shadow-sm">
          설계 문서를 불러오는 중입니다.
        </section>
      ) : !hasAnyDesignData ? (
        <section className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-sm">
          <EmptyState message="아직 문서화할 설계 데이터가 없습니다. 설계단계에서 요구사항, ERD 또는 데이터 플로우를 먼저 작성해주세요." />
        </section>
      ) : (
        <section className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-sm">
          {activeDesignSection === "requirements" && (
            <DesignRequirementsPage requirements={requirements} />
          )}

          {activeDesignSection === "api" && (
            <DesignApiSpecsPage apiSpecs={apiSpecs} />
          )}

          {activeDesignSection === "erd" && (
            <DesignErdPage
              tables={erdTables}
              edges={erdRelations}
              relationCount={erdRelations.length}
            />
          )}

          {activeDesignSection === "flow" && (
            <DesignFlowPage
              nodes={flowNodes}
              edges={flowEdges}
              edgeCount={flowEdges.length}
            />
          )}
        </section>
      )}
    </section>
  );
}

function DesignRequirementsPage({
  requirements,
}: {
  requirements: DesignRequirementItem[];
}) {
  if (requirements.length === 0) {
    return <DesignEmptyText text="작성된 요구사항이 없습니다." />;
  }

  return (
    <div>
      <SectionTitle
        title="요구사항 정의"
        description="설계단계에서 작성한 요구사항을 문서 형태로 확인합니다."
        count={`${requirements.length}개`}
      />

      <div className="mt-4 space-y-3">
        {requirements.map((item, index) => (
          <article
            key={item.id}
            className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-black text-white">
                {index + 1}
              </span>

              <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-black text-blue-700">
                {item.category || "기본"}
              </span>

              <h5 className="text-sm font-black text-slate-950">
                {item.name || "이름 없는 요구사항"}
              </h5>
            </div>

            <p className="whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-600">
              {item.description || "설명이 없습니다."}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

function DesignApiSpecsPage({ apiSpecs }: { apiSpecs: DesignApiSpecItem[] }) {
  if (apiSpecs.length === 0) {
    return <DesignEmptyText text="작성된 API 명세가 없습니다." />;
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
            className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm"
          >
            <div className="flex flex-col gap-3 border-b border-blue-100 bg-blue-50 px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="shrink-0 rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-black text-white">
                  {item.method || "GET"}
                </span>

                <code className="min-w-0 break-all rounded-lg bg-white px-3 py-1.5 text-sm font-black text-slate-900">
                  {item.endpoint || "/api/example"}
                </code>
              </div>
            </div>

            <div className="space-y-4 p-4">
              <div>
                <p className="mb-1 text-xs font-black text-slate-400">설명</p>
                <p className="whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-slate-700">
                  {item.description || "설명이 없습니다."}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                <PayloadBox title="요청 데이터" value={item.request} />
                <PayloadBox title="응답 데이터" value={item.response} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function PayloadBox({ title, value }: { title: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
      <p className="mb-2 text-xs font-black text-blue-700">{title}</p>

      <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-blue-100 bg-white p-3 text-xs font-bold leading-6 text-slate-700">
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
  tables: Record<string, unknown>[];
  edges: Record<string, unknown>[];
  relationCount: number;
}) {
  if (tables.length === 0) {
    return <DesignEmptyText text="작성된 ERD 테이블이 없습니다." />;
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
        {tables.map((node, index) => {
          const columns = getNodeColumns(node);

          return (
            <article
              key={String(node.id ?? index)}
              className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between gap-2 bg-slate-950 px-4 py-3 text-white">
                <div className="min-w-0">
                  <h5 className="truncate text-sm font-black">
                    {getNodeLabel(node, `TABLE_${index + 1}`)}
                  </h5>
                  <p className="text-[11px] font-semibold text-slate-300">
                    컬럼 {columns.length}개
                  </p>
                </div>

                <Database size={16} />
              </div>

              <div className="max-h-[220px] divide-y divide-slate-100 overflow-y-auto">
                {columns.length === 0 ? (
                  <p className="px-4 py-4 text-xs font-bold text-slate-400">
                    컬럼이 없습니다.
                  </p>
                ) : (
                  columns.map((column, columnIndex) => (
                    <div
                      key={String(column.id ?? columnIndex)}
                      className="flex items-center justify-between gap-2 px-4 py-2.5 text-xs"
                    >
                      <span className="min-w-0 truncate font-black text-slate-700">
                        {typeof column.name === "string"
                          ? column.name
                          : "column"}
                      </span>

                      <span className="shrink-0 rounded-lg bg-blue-50 px-2 py-0.5 font-black text-blue-700">
                        {typeof column.type === "string" ? column.type : "TYPE"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function DesignFlowPage({
  nodes,
  edges,
  edgeCount,
}: {
  nodes: Record<string, unknown>[];
  edges: Record<string, unknown>[];
  edgeCount: number;
}) {
  if (nodes.length === 0) {
    return <DesignEmptyText text="작성된 데이터 플로우가 없습니다." />;
  }

  return (
    <div className="space-y-4">
      <SectionTitle
        title="데이터 플로우"
        description="화면, 서버, DB, 외부 서비스 사이의 흐름을 시각화했습니다."
        count={`노드 ${nodes.length}개 · 연결 ${edgeCount}개`}
      />

      <DesignDiagramPreview
        nodes={nodes}
        edges={edges}
        type="flow"
        title="데이터 플로우 미리보기"
        description="설계단계에서 작성한 흐름도를 그대로 표시합니다."
      />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {nodes.map((node, index) => (
          <div
            key={String(node.id ?? index)}
            className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700">
              <GitBranch size={17} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-slate-950">
                {getNodeLabel(node, `NODE_${index + 1}`)}
              </p>
              <p className="truncate text-xs font-semibold text-slate-500">
                {getNodeSubText(node)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DesignDiagramPreview({
  nodes,
  edges,
  type,
  title,
  description,
}: {
  nodes: Record<string, unknown>[];
  edges: Record<string, unknown>[];
  type: "erd" | "flow";
  title: string;
  description: string;
}) {
  const normalizedNodes = useMemo(
    () => normalizeDiagramNodes(nodes, type),
    [nodes, type],
  );

  const layout = useMemo(
    () => getDiagramLayout(normalizedNodes, type),
    [normalizedNodes, type],
  );

  const nodeMap = useMemo(
    () => new Map(layout.nodes.map((node) => [node.id, node])),
    [layout.nodes],
  );

  const strokeColor = type === "erd" ? "#2563eb" : "#7c3aed";

  return (
    <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-2 border-b border-blue-100 bg-blue-50 px-4 py-3 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-black text-slate-950">{title}</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">
            {description}
          </p>
        </div>

        <span className="w-fit rounded-full bg-white px-3 py-1 text-[11px] font-black text-blue-700 shadow-sm">
          노드 {nodes.length}개 · 연결 {edges.length}개
        </span>
      </div>

      <div className="overflow-auto bg-[#f8fbff] p-3">
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="h-[420px] min-w-[860px] w-full rounded-xl border border-blue-100 bg-white"
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
              <path d="M0,0 L0,6 L9,3 z" fill={strokeColor} />
            </marker>

            <pattern
              id={`archive-dot-grid-${type}`}
              width="18"
              height="18"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="1" fill="#dbeafe" />
            </pattern>
          </defs>

          <rect width="100%" height="100%" fill="#f8fbff" />
          <rect
            width="100%"
            height="100%"
            fill={`url(#archive-dot-grid-${type})`}
          />

          {edges.map((edge, index) => {
            const { source, target } = getEdgeSourceTarget(edge);
            const sourceNode = nodeMap.get(source);
            const targetNode = nodeMap.get(target);

            if (!sourceNode || !targetNode) return null;

            const sourceX = sourceNode.x + layout.nodeWidth;
            const sourceY = sourceNode.y + layout.nodeHeight / 2;
            const targetX = targetNode.x;
            const targetY = targetNode.y + layout.nodeHeight / 2;

            return (
              <path
                key={String(edge.id ?? index)}
                d={buildSvgPath(sourceX, sourceY, targetX, targetY)}
                fill="none"
                stroke={strokeColor}
                strokeWidth={2}
                strokeDasharray={type === "flow" ? "6 5" : undefined}
                markerEnd={`url(#archive-arrow-${type})`}
              />
            );
          })}

          {layout.nodes.map((node) => {
            if (type === "erd") {
              return (
                <g key={node.id}>
                  <rect
                    x={node.x}
                    y={node.y}
                    width={layout.nodeWidth}
                    height={layout.nodeHeight}
                    rx={14}
                    fill="#ffffff"
                    stroke="#bfdbfe"
                  />

                  <rect
                    x={node.x}
                    y={node.y}
                    width={layout.nodeWidth}
                    height={42}
                    rx={14}
                    fill="#020617"
                  />

                  <text
                    x={node.x + 16}
                    y={node.y + 27}
                    fill="#ffffff"
                    fontSize={13}
                    fontWeight={900}
                  >
                    {node.label}
                  </text>

                  {node.columns.length === 0 ? (
                    <text
                      x={node.x + 16}
                      y={node.y + 78}
                      fill="#64748b"
                      fontSize={11}
                      fontWeight={700}
                    >
                      컬럼 없음
                    </text>
                  ) : (
                    node.columns.slice(0, 4).map((column, columnIndex) => {
                      const columnName =
                        typeof column.name === "string"
                          ? column.name
                          : "column";
                      const columnType =
                        typeof column.type === "string" ? column.type : "TYPE";

                      return (
                        <text
                          key={String(column.id ?? columnIndex)}
                          x={node.x + 16}
                          y={node.y + 74 + columnIndex * 18}
                          fill="#334155"
                          fontSize={11}
                          fontWeight={700}
                        >
                          {columnName} · {columnType}
                        </text>
                      );
                    })
                  )}
                </g>
              );
            }

            return (
              <g key={node.id}>
                <rect
                  x={node.x}
                  y={node.y}
                  width={layout.nodeWidth}
                  height={layout.nodeHeight}
                  rx={16}
                  fill="#eff6ff"
                  stroke="#bfdbfe"
                />

                <circle
                  cx={node.x + 28}
                  cy={node.y + 32}
                  r={14}
                  fill="#ffffff"
                  stroke="#dbeafe"
                />

                <text
                  x={node.x + 52}
                  y={node.y + 33}
                  fill="#0f172a"
                  fontSize={13}
                  fontWeight={900}
                >
                  {node.label}
                </text>

                <text
                  x={node.x + 52}
                  y={node.y + 58}
                  fill="#64748b"
                  fontSize={10}
                  fontWeight={700}
                >
                  {node.subText}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}

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
  onDraftChange: (value: string) => void;
  onGenerate: () => void;
  designDocument: ParsedDesignDocument;
  isGenerating: boolean;
  errorMessage: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(textarea.scrollHeight, 520)}px`;
  }, [draft]);

  return (
    <section className="space-y-4 pb-20">
      <section className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-lg font-black text-slate-950">최종 보고서</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              AI 초안과 설계 다이어그램을 하나의 보고서 문서로 구성합니다.
            </p>
          </div>

          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-blue-950 px-4 text-sm font-black text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Sparkles size={16} />
            )}
            {isGenerating ? "생성 중..." : "AI 초안 생성"}
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        )}
      </section>

      <section className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col justify-between gap-2 border-b border-blue-50 pb-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-black text-slate-950">
              프로젝트 최종 보고서
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              PDF 저장 시 아래 초안, ERD, 데이터 플로우가 함께 출력됩니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-[11px] font-black">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
              {selectedProject?.name ?? "프로젝트 미선택"}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
              개발일지 {devlogCount}개
            </span>
          </div>
        </div>

        <div className="space-y-5">
          <section>
            <h4 className="mb-2 text-sm font-black text-slate-950">
              1. AI 최종 보고서 초안
            </h4>

            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              placeholder={
                isGenerating
                  ? "AI가 최종 보고서 초안을 생성하는 중입니다."
                  : "AI 초안 생성 버튼을 누르면 최종 보고서 초안이 여기에 작성됩니다. 생성 후 직접 수정할 수 있습니다."
              }
              className="block min-h-[520px] w-full resize-none overflow-hidden rounded-2xl border border-blue-100 bg-blue-50/30 p-4 text-sm font-semibold leading-8 text-slate-700 outline-none placeholder:text-slate-400"
            />
          </section>

          <section>
            <h4 className="mb-2 text-sm font-black text-slate-950">
              2. 설계 다이어그램
            </h4>

            <FinalReportDesignVisuals designDocument={designDocument} />
          </section>
        </div>
      </section>
    </section>
  );
}

function FinalReportDesignVisuals({
  designDocument,
}: {
  designDocument: ParsedDesignDocument;
}) {
  const erdNodes = designDocument.erdNodes;
  const erdEdges = designDocument.erdEdges;
  const flowNodes = designDocument.flowNodes;
  const flowEdges = designDocument.flowEdges;

  const hasErd = erdNodes.length > 0;
  const hasFlow = flowNodes.length > 0;

  if (!hasErd && !hasFlow) {
    return (
      <section className="rounded-2xl border border-dashed border-blue-100 bg-blue-50/70 px-4 py-10 text-center">
        <p className="text-sm font-black text-slate-400">
          최종 보고서에 표시할 ERD 또는 데이터 플로우가 없습니다.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
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
          title="최종 보고서 데이터 플로우"
          description="PDF 저장 시 최종 보고서에 포함됩니다."
        />
      )}
    </section>
  );
}

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
    <div className="flex flex-col justify-between gap-2 border-b border-blue-50 pb-4 md:flex-row md:items-center">
      <div>
        <h3 className="text-lg font-black text-slate-950">{title}</h3>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          {description}
        </p>
      </div>

      <span className="w-fit rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">
        {count}
      </span>
    </div>
  );
}

function DesignEmptyText({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-blue-100 bg-blue-50/70 px-4 py-10 text-center">
      <p className="text-sm font-black text-slate-400">{text}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-blue-100 bg-blue-50 px-4 py-10 text-center">
      <p className="text-sm font-black text-slate-500">{message}</p>
    </div>
  );
}