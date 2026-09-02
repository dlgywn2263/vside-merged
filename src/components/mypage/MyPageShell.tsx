"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Code2,
  Database,
  Download,
  FileText,
  GitBranch,
  Github,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Sparkles,
  Settings,
  UserRound,
} from "lucide-react";

import {
  changeMyEmailApi,
  changeMyPasswordApi,
  deleteMyAccountApi,
  fetchGithubAccountStatusApi,
  disconnectGithubAccountApi,
  fetchMyProfile,
  fetchMyWorkspaces,
  fetchScheduleProgress,
  fetchWorkspaceDevlogs,
  fetchMyActivityHeatmapApi,
  generateFinalReportDraftApi,
  type GithubAccountStatus,
  type MyPageDevlogResponse,
  type ScheduleProgressResponse,
  type ScheduleView,
  type UserMeResponse,
  type WorkspaceDevlogsResponse,
  type WorkspaceListResponse,
  type WorkspaceProjectResponse,
  type ActivityHeatmapResponse,
} from "@/components/mypage/api";

import {
  fetchWorkspaceApiSpecsApi,
  fetchWorkspaceDesignDocumentApi,
  fetchWorkspaceRequirementsApi,
} from "@/lib/design/api";

import type {
  ActivitySummary,
   Devlog,
  HeatmapLevel,
  Project,
  ProjectStatus,
  TabKey,
  User,
} from "@/components/mypage/types";
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
  getNodeData,
  getNodeLabel,
  getNodeSubText,
  getParsedDesignDocument,
  getPrintDateLabel,
  normalizeDiagramNodes,
} from "@/features/design/render/legacyDesignView";

type DevlogSortType = "latest" | "oldest";
type ProjectTypeFilter = "all" | "personal" | "team";
type ArchiveTabKey = "devlog" | "design" | "final";
type DesignArchiveSectionKey = "requirements" | "api" | "erd" | "flow";

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

const DEFAULT_HEATMAP_DAYS = 49;

function createEmptyHeatmapValues(days = DEFAULT_HEATMAP_DAYS): HeatmapLevel[] {
  return Array.from({ length: days }, () => 0 as HeatmapLevel);
}

function createEmptyActivityHeatmap(): ActivityHeatmapResponse {
  return {
    days: [],
    totalActivityCount: 0,
    activeDays: 0,
    devlogCount: 0,
    scheduleDoneCount: 0,
    commitCount: 0,
  };
}

function mapHeatmapValuesFromResponse(
  heatmap: ActivityHeatmapResponse,
): HeatmapLevel[] {
  if (!Array.isArray(heatmap.days) || heatmap.days.length === 0) {
    return createEmptyHeatmapValues();
  }

  return heatmap.days.map((day) => day.level as HeatmapLevel);
}
const OAUTH_RESULT_STORAGE_KEY = "wevaisGithubOAuthResult";
const OAUTH_PENDING_STORAGE_KEY = "wevaisPendingGitRemoteAction";
const OAUTH_RETURN_URL_STORAGE_KEY = "wevaisGithubOAuthReturnUrl";

function openGithubAccountOAuth() {
  const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;

  if (!clientId) {
    alert(
      "GitHub OAuth 설정이 없습니다. .env.local에 NEXT_PUBLIC_GITHUB_CLIENT_ID를 추가해주세요.",
    );
    return;
  }

  const statePayload = {
    source: "mypage",
    action: "account-link",
    requestedAt: Date.now(),
  };

  window.sessionStorage.setItem(
    OAUTH_PENDING_STORAGE_KEY,
    JSON.stringify(statePayload),
  );

  window.sessionStorage.setItem(
    OAUTH_RETURN_URL_STORAGE_KEY,
    window.location.href,
  );

  const authUrl = new URL("https://github.com/login/oauth/authorize");

  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("scope", "repo");
  authUrl.searchParams.set(
    "redirect_uri",
    `${window.location.origin}/auth/github/callback`,
  );
  authUrl.searchParams.set("state", JSON.stringify(statePayload));

  window.location.assign(authUrl.toString());
}

function getGithubAccountName(status: GithubAccountStatus | null) {
  return status?.username || status?.login || "";
}

const tabs: {
  key: TabKey;
  label: string;
  description: string;
  icon: React.ElementType;
  children?: {
    key: ArchiveTabKey;
    label: string;
    description: string;
    icon: React.ElementType;
  }[];
}[] = [
  {
    key: "overview",
    label: "Overview",
    description: "전체 활동 요약",
    icon: LayoutDashboard,
  },
  {
    key: "progress",
    label: "진행 중 프로젝트",
    description: "현재 작업 중",
    icon: Clock3,
  },
  {
    key: "completed",
    label: "완료 프로젝트",
    description: "끝낸 작업",
    icon: CheckCircle2,
  },
  {
    key: "devlogs",
    label: "자료실",
    description: "문서화 자료",
    icon: BookOpen,
    children: [
      {
        key: "devlog",
        label: "개발일지",
        description: "작성 기록",
        icon: BookOpen,
      },
      {
        key: "design",
        label: "설계 문서",
        description: "요구사항·ERD·API",
        icon: FileText,
      },
      {
        key: "final",
        label: "최종 보고서",
        description: "AI 초안",
        icon: Sparkles,
      },
    ],
  },
  {
    key: "github",
    label: "GitHub 설정",
    description: "커밋 연동",
    icon: Github,
  },
  {
    key: "account",
    label: "계정 설정",
    description: "프로필 관리",
    icon: Settings,
  },
];

function mapUser(dto: UserMeResponse): User {
  return {
    id: String(dto.id),
    email: dto.email,
    nickname: dto.nickname,
    profileImageUrl: dto.profileImageUrl ?? null,
    createdAt: dto.createdAt,
  };
}

function normalizeRole(value: unknown): "owner" | "member" {
  return String(value ?? "").toLowerCase() === "owner" ? "owner" : "member";
}

function normalizeProjectStatus(value: unknown): ProjectStatus {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();

  if (
    raw === "completed" ||
    raw === "complete" ||
    raw === "done" ||
    raw === "finished" ||
    raw === "완료"
  ) {
    return "completed";
  }

  return "active";
}

function normalizeProgress(value: unknown, status: ProjectStatus) {
  const progress = Number(value);

  if (Number.isFinite(progress)) {
    return Math.max(0, Math.min(100, Math.round(progress)));
  }

  return status === "completed" ? 100 : 65;
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

function mapProjectsFromWorkspaces(
  workspaces: WorkspaceListResponse[],
  scheduleProgressMap: Map<string, ScheduleProgressResponse>,
): Project[] {
  return workspaces.map((workspace) => {
    const workspaceRole = normalizeRole(workspace.role);
    const workspaceVisibility = workspace.mode === "team" ? "team" : "private";
    const workspaceType = workspace.mode === "team" ? "팀" : "개인";

    const scheduleProgress = scheduleProgressMap.get(workspace.id);

    // 하위 프로젝트는 카드로 펼치지 않고,
    // 최상위 워크스페이스 카드의 보조 정보로만 사용함.
    const childProjects = workspace.projects ?? [];
    const firstProject = childProjects[0];

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
        `${workspace.name} 프로젝트입니다.`,
      type: workspaceType,
      status,
      progress,
      language,
      stack,
      updatedAt,
      devlogCount,
      doneScheduleCount: Number(scheduleProgress?.doneCount ?? 0),
      scheduleTotalCount: Number(scheduleProgress?.totalCount ?? 0),

      workspaceId: workspace.id,
      workspaceName: workspace.name,
      workspaceRole,
      workspaceVisibility,
    };
  });
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

function buildActivitySummary(
  projects: Project[],
  devlogCount: number,
  commitCount: number,
): ActivitySummary {
  const progressProjectCount = projects.filter(
    (project) => project.status === "active",
  ).length;

  const completedProjectCount = projects.filter(
    (project) => project.status === "completed",
  ).length;

  const doneScheduleCount = projects.reduce(
    (sum, project) => sum + project.doneScheduleCount,
    0,
  );

  const languageCount = new Map<string, number>();

  for (const project of projects) {
    const language = project.language || "Unknown";
    languageCount.set(language, (languageCount.get(language) ?? 0) + 1);
  }

  const primaryLanguage =
    Array.from(languageCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "-";

  return {
    progressProjectCount,
    completedProjectCount,
    devlogCount,
    doneScheduleCount,
    commitCount,
    primaryLanguage,
  };
}

function logout() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("token");
  localStorage.removeItem("jwt");
  localStorage.removeItem("authToken");
  localStorage.removeItem("userId");

  window.location.href = "/login";
}

export default function 워MyPageDemo() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [activeArchiveTab, setActiveArchiveTab] =
    useState<ArchiveTabKey>("devlog");
  const [keyword, setKeyword] = useState("");

  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [devlogs, setDevlogs] = useState<Devlog[]>([]);

const [heatmapValues, setHeatmapValues] = useState<HeatmapLevel[]>(
  createEmptyHeatmapValues(),
);
const [activityHeatmap, setActivityHeatmap] =
  useState<ActivityHeatmapResponse>(createEmptyActivityHeatmap());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const progressProjects = useMemo(
    () => projects.filter((project) => project.status === "active"),
    [projects],
  );

  const completedProjects = useMemo(
    () => projects.filter((project) => project.status === "completed"),
    [projects],
  );

const summary = useMemo(
  () =>
    buildActivitySummary(
      projects,
      devlogs.length,
      activityHeatmap.commitCount,
    ),
  [projects, devlogs.length, activityHeatmap.commitCount],
);

  useEffect(() => {
  let mounted = true;

  async function loadMyPage() {
    try {
      setLoading(true);
      setError("");

      const [profileDto, workspaceDtos, heatmapResult] = await Promise.all([
        fetchMyProfile(),
        fetchMyWorkspaces(),
        fetchMyActivityHeatmapApi(DEFAULT_HEATMAP_DAYS).catch((error) => {
          console.warn("[mypage activity heatmap] 활동 히트맵 요청 실패:", error);
          return createEmptyActivityHeatmap();
        }),
      ]);

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

      const failedScheduleRequests = scheduleProgressResults.filter(
        (result) => result.status === "rejected",
      );

      if (failedScheduleRequests.length > 0) {
        console.warn(
          "[mypage schedules] 일부 프로젝트 일정 진행률 요청 실패:",
          failedScheduleRequests,
        );
      }

      const devlogResults = await Promise.allSettled(
        workspaceDtos.map(async (workspace) => {
          const response = await fetchWorkspaceDevlogs(workspace.id);

          console.log(
            "[mypage devlogs] workspace:",
            workspace.name,
            response,
          );

          return mapDevlogsFromWorkspaceResponse(response, workspace);
        }),
      );

      const failedDevlogRequests = devlogResults.filter(
        (result) => result.status === "rejected",
      );

      if (failedDevlogRequests.length > 0) {
        console.warn(
          "[mypage devlogs] 일부 프로젝트 자료 요청 실패:",
          failedDevlogRequests,
        );
      }

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

      setUser(mapUser(profileDto));
      setProjects(projectsWithDevlogCount);
      setDevlogs(nextDevlogs);
      setActivityHeatmap(heatmapResult);
      setHeatmapValues(mapHeatmapValuesFromResponse(heatmapResult));
    } catch (error) {
      if (!mounted) return;

      setError(
        error instanceof Error
          ? error.message
          : "마이페이지 정보를 불러오지 못했습니다.",
      );
    } finally {
      if (mounted) setLoading(false);
    }
  }

  loadMyPage();

  return () => {
    mounted = false;
  };
}, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-blue-50 text-slate-950">
        <div className="mx-auto max-w-[1280px] px-6 py-8">
          <section className="rounded-2xl border border-blue-100 bg-white p-5 text-sm font-semibold text-slate-600 shadow-sm">
            마이페이지 불러오는 중...
          </section>
        </div>
      </main>
    );
  }

  if (error || !user) {
    return (
      <main className="min-h-screen bg-blue-50 text-slate-950">
        <div className="mx-auto max-w-[1280px] px-6 py-8">
          <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 shadow-sm">
            {error || "사용자 정보를 불러오지 못했습니다."}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-blue-50 text-slate-950">
      <div className="mx-auto max-w-[1440px] p-4 md:p-5">
        <section className="mb-5 flex flex-col justify-between gap-4 rounded-2xl border border-blue-100 bg-white px-5 py-4 shadow-sm md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-blue-100 bg-white text-xl font-black shadow-sm">
              {user.profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.profileImageUrl}
                  alt="profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                user.nickname.slice(0, 1)
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-black tracking-tight">
                  {user.nickname}님의 마이페이지
                </h2>
                <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-black text-slate-500">
                  Dev Activity
                </span>
              </div>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                프로젝트, 자료실, GitHub 활동을 한 곳에서 확인합니다.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-blue-100 bg-white px-4 text-sm font-black text-slate-700 hover:bg-blue-50"
          >
            <LogOut size={16} />
            로그아웃
          </button>
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-4">
            <section className="rounded-2xl border border-blue-100 bg-white p-3 shadow-sm">
              <p className="mb-2 px-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
                My Page
              </p>

              <div className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;
                  const hasChildren = Boolean(tab.children?.length);
                  const isArchiveOpen = tab.key === "devlogs" && isActive;

                  return (
                    <div key={tab.key}>
                      <button
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={[
                          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                          isActive
                            ? "bg-blue-950 text-white shadow-sm"
                            : "text-slate-600 hover:bg-blue-100 hover:text-slate-950",
                        ].join(" ")}
                      >
                        <Icon size={17} />

                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-black">
                            {tab.label}
                          </span>
                          <span
                            className={[
                              "mt-0.5 block text-[10px] font-semibold",
                              isActive ? "text-blue-100" : "text-slate-400",
                            ].join(" ")}
                          >
                            {tab.description}
                          </span>
                        </span>

                        {hasChildren && (
                          <ChevronDown
                            size={15}
                            className={[
                              "shrink-0 transition-transform",
                              isArchiveOpen ? "rotate-0" : "-rotate-90",
                              isActive ? "text-blue-100" : "text-slate-400",
                            ].join(" ")}
                          />
                        )}
                      </button>

                      {hasChildren && isArchiveOpen && (
                        <div className="ml-5 mt-1 space-y-1 border-l border-blue-100 pl-3">
                          {tab.children?.map((child) => {
                            const ChildIcon = child.icon;
                            const isChildActive =
                              activeArchiveTab === child.key;

                            return (
                              <button
                                key={child.key}
                                type="button"
                                onClick={() => {
                                  setActiveTab("devlogs");
                                  setActiveArchiveTab(child.key);
                                }}
                                className={[
                                  "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition",
                                  isChildActive
                                    ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
                                    : "text-slate-500 hover:bg-blue-50 hover:text-slate-900",
                                ].join(" ")}
                              >
                                <ChildIcon size={14} />

                                <span className="min-w-0 flex-1">
                                  <span className="block text-xs font-black">
                                    {child.label}
                                  </span>
                                  <span className="mt-0.5 block truncate text-[10px] font-semibold text-slate-400">
                                    {child.description}
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
              <p className="text-sm font-black">요약</p>

              <div className="mt-3 space-y-2">
                <SummaryCard
                  label="대표 언어"
                  value={summary.primaryLanguage}
                />
                <SummaryCard
                  label="진행 중 프로젝트"
                  value={`${summary.progressProjectCount}개`}
                />
                <SummaryCard
                  label="완료 프로젝트"
                  value={`${summary.completedProjectCount}개`}
                />
                <SummaryCard
                  label="자료실"
                  value={`${summary.devlogCount}개`}
                />
                <SummaryCard
                  label="완료 일정"
                  value={`${summary.doneScheduleCount}개`}
                />
              </div>
            </section>
          </aside>

          <section className="min-w-0 space-y-5">
            {activeTab === "overview" && (
              <OverviewSection
  summary={summary}
  progressProjects={progressProjects}
  devlogs={devlogs}
  heatmapValues={heatmapValues}
  activityHeatmap={activityHeatmap}
  keyword={keyword}
  onKeywordChange={setKeyword}
/>
            )}

            {activeTab === "progress" && (
              <ProjectSection
                title="진행 중 프로젝트"
                description="현재 작업 중인 프로젝트를 리스트 형태로 확인합니다."
                projects={progressProjects}
                emptyText="진행 중인 프로젝트가 없습니다."
                keyword={keyword}
                onKeywordChange={setKeyword}
              />
            )}

            {activeTab === "completed" && (
              <ProjectSection
                title="완료 프로젝트"
                description="완료한 프로젝트만 따로 분리해서 확인할 수 있습니다."
                projects={completedProjects}
                emptyText="완료한 프로젝트가 없습니다."
                keyword={keyword}
                onKeywordChange={setKeyword}
              />
            )}

            {activeTab === "devlogs" && (
              <ProjectArchiveSection
                devlogs={devlogs}
                projects={projects}
                keyword={keyword}
                onKeywordChange={setKeyword}
                activeArchiveTab={activeArchiveTab}
                onActiveArchiveTabChange={setActiveArchiveTab}
              />
            )}

            {activeTab === "github" && <GithubSection />}

            {activeTab === "account" && <AccountSection user={user} />}
          </section>
        </div>
      </div>
    </main>
  );
}

function OverviewSection({
  summary,
  progressProjects,
  devlogs,
  heatmapValues,
  activityHeatmap,
  keyword,
  onKeywordChange,
}: {
  summary: ActivitySummary;
  progressProjects: Project[];
  devlogs: Devlog[];
  heatmapValues: HeatmapLevel[];
  activityHeatmap: ActivityHeatmapResponse;
  keyword: string;
  onKeywordChange: (value: string) => void;
}) {
  return (
    <div className="flex min-h-[calc(100vh-380px)] flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <ActivityCard
          label="진행 중"
          value={`${summary.progressProjectCount}개`}
          icon={Clock3}
          description="현재 작업 중"
        />
        <ActivityCard
          label="완료 일정"
          value={`${summary.doneScheduleCount}개`}
          icon={CheckCircle2}
          description="DONE 상태 기준"
        />
        <ActivityCard
          label="자료실"
          value={`${summary.devlogCount}개`}
          icon={BookOpen}
          description="전체 문서"
        />
        <ActivityCard
          label="커밋"
          value={`${summary.commitCount}개`}
          icon={Github}
          description="연동 저장소 기준"
        />
      </div>

      <ProjectSection
        title="현재 작업 중"
        description="최근 활동이 있는 진행 중 프로젝트입니다."
        projects={progressProjects}
        emptyText="현재 작업 중인 프로젝트가 없습니다."
        keyword={keyword}
        onKeywordChange={onKeywordChange}
        maxItems={4}
      />

      <HeatmapSection
        heatmapValues={heatmapValues}
        activityHeatmap={activityHeatmap}
      />
    </div>
  );
}
function ProjectSection({
  title,
  description,
  projects,
  emptyText,
  keyword,
  onKeywordChange,
  maxItems,
}: {
  title: string;
  description: string;
  projects: Project[];
  emptyText: string;
  keyword: string;
  onKeywordChange: (value: string) => void;
  maxItems?: number;
}) {
  const [projectTypeFilter, setProjectTypeFilter] =
    useState<ProjectTypeFilter>("all");

  const filteredProjects = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    const result = projects.filter((project) => {
      const matchesType =
        projectTypeFilter === "all" ||
        (projectTypeFilter === "team" && project.type === "팀") ||
        (projectTypeFilter === "personal" && project.type === "개인");

      const matchesKeyword =
        !normalizedKeyword ||
        project.name.toLowerCase().includes(normalizedKeyword) ||
        (project.description || "").toLowerCase().includes(normalizedKeyword) ||
        (project.language || "").toLowerCase().includes(normalizedKeyword);

      return matchesType && matchesKeyword;
    });

    return typeof maxItems === "number" ? result.slice(0, maxItems) : result;
  }, [projects, projectTypeFilter, keyword, maxItems]);

  const projectTypeFilters: {
    key: ProjectTypeFilter;
    label: string;
    count: number;
  }[] = [
    {
      key: "all",
      label: "전체",
      count: projects.length,
    },
    {
      key: "personal",
      label: "개인",
      count: projects.filter((project) => project.type === "개인").length,
    },
    {
      key: "team",
      label: "팀",
      count: projects.filter((project) => project.type === "팀").length,
    },
  ];

  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col justify-between gap-3 xl:flex-row xl:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black tracking-tight text-slate-950">
              {title}
            </h3>
            <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">
              {filteredProjects.length}개
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {description}
          </p>
        </div>
      </div>

      <div className="mb-3 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {projectTypeFilters.map((filter) => {
            const isActive = projectTypeFilter === filter.key;

            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setProjectTypeFilter(filter.key)}
                className={[
                  "inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-black transition",
                  isActive
                    ? "border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-100"
                    : "border-blue-100 bg-blue-50 text-blue-700 hover:border-blue-200 hover:bg-blue-100",
                ].join(" ")}
              >
                <span>{filter.label}</span>
                <span
                  className={[
                    "rounded-full px-1.5 py-0.5 text-[10px]",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-white text-blue-600",
                  ].join(" ")}
                >
                  {filter.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={keyword}
              onChange={(event) => onKeywordChange(event.target.value)}
              placeholder="프로젝트 검색"
              className="h-9 w-full rounded-xl border border-blue-100 bg-blue-50 pl-10 pr-3 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white sm:w-[230px]"
            />
          </div>

          <button
            type="button"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-blue-950 px-4 text-sm font-black text-white hover:bg-blue-900"
          >
            <Plus size={16} />새 프로젝트
          </button>
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <EmptyState
          message={
            projects.length === 0
              ? emptyText
              : "검색 또는 선택한 구분에 해당하는 프로젝트가 없습니다."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-blue-100">
          <div className="hidden grid-cols-[1.4fr_90px_120px_120px_120px] border-b border-blue-100 bg-blue-50 px-4 py-3 text-xs font-black text-blue-700 md:grid">
            <span>프로젝트명</span>
            <span>구분</span>
            <span>진행률</span>
            <span>완료 일정</span>
            <span className="text-right">최근 수정일</span>
          </div>

          <div className="divide-y divide-blue-50 bg-white">
            {filteredProjects.map((project) => (
              <ProjectListRow
                key={`${project.workspaceId}-${project.id}`}
                project={project}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ProjectListRow({ project }: { project: Project }) {
  const isCompleted = project.status === "completed";
  const isTeam = project.type === "팀";

  return (
    <article className="grid grid-cols-1 gap-3 px-4 py-4 transition hover:bg-blue-50/70 md:grid-cols-[1.4fr_90px_120px_120px_120px] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <h4
            className={[
              "line-clamp-1 text-sm font-black",
              isCompleted ? "text-blue-700" : "text-slate-950",
            ].join(" ")}
          >
            {project.name}
          </h4>

          <span
            className={[
              "rounded-full px-2 py-0.5 text-[11px] font-black",
              isCompleted
                ? "bg-blue-100 text-blue-700"
                : "bg-sky-50 text-sky-700",
            ].join(" ")}
          >
            {isCompleted ? "완료" : "진행 중"}
          </span>
        </div>

        <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">
          {project.description || "설명이 없습니다."}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-[11px] font-black text-blue-700">
            {project.language || "Unknown"}
          </span>

          {project.stack.slice(0, 2).map((stack) => (
            <span
              key={stack}
              className="rounded-full border border-blue-100 bg-white px-2.5 py-0.5 text-[11px] font-black text-slate-500"
            >
              {stack}
            </span>
          ))}

          {project.stack.length > 2 && (
            <span className="rounded-full border border-blue-100 bg-white px-2.5 py-0.5 text-[11px] font-black text-slate-400">
              +{project.stack.length - 2}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between md:block">
        <span className="text-xs font-black text-slate-400 md:hidden">
          구분
        </span>
        <span
          className={[
            "inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-black",
            isTeam ? "bg-blue-100 text-blue-700" : "bg-sky-50 text-sky-700",
          ].join(" ")}
        >
          {project.type}
        </span>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs font-black">
          <span className="text-slate-400 md:hidden">진행률</span>
          <span className={isCompleted ? "text-blue-700" : "text-slate-700"}>
            {project.progress}%
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-blue-100">
          <div
            className={[
              "h-full rounded-full transition-all",
              isCompleted ? "bg-blue-600" : "bg-sky-500",
            ].join(" ")}
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between md:block">
        <span className="text-xs font-black text-slate-400 md:hidden">
          완료 일정
        </span>
        <p className="text-sm font-black text-slate-800">
          {project.doneScheduleCount}/{project.scheduleTotalCount}개
        </p>
        <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
          자료 {project.devlogCount}개
        </p>
      </div>

      <div className="flex items-center justify-between md:block md:text-right">
        <span className="text-xs font-black text-slate-400 md:hidden">
          최근 수정일
        </span>
        <span className="text-xs font-black text-slate-400">
          {formatDateLabel(project.updatedAt)}
        </span>
      </div>
    </article>
  );
}

function DevlogPreviewSection({ devlogs }: { devlogs: Devlog[] }) {
  const previewDevlogs = devlogs.slice(0, 2);

  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-black tracking-tight">최근 자료</h3>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          최근 작성된 자료 2개만 표시합니다.
        </p>
      </div>

      {previewDevlogs.length === 0 ? (
        <EmptyState message="표시할 자료가 없습니다." />
      ) : (
        <div className="space-y-2.5">
          {previewDevlogs.map((devlog) => (
            <DevlogCard key={devlog.id} devlog={devlog} />
          ))}
        </div>
      )}
    </section>
  );
}

function ProjectArchiveSection({
  devlogs,
  projects,
  keyword,
  onKeywordChange,
  activeArchiveTab,
  onActiveArchiveTabChange,
}: {
  devlogs: Devlog[];
  projects: Project[];
  keyword: string;
  onKeywordChange: (value: string) => void;
  activeArchiveTab: ArchiveTabKey;
  onActiveArchiveTabChange: (value: ArchiveTabKey) => void;
}) {
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [sortType, setSortType] = useState<DevlogSortType>("latest");
  const [finalReportDraft, setFinalReportDraft] = useState("");
  const [finalReportLoading, setFinalReportLoading] = useState(false);
  const [finalReportError, setFinalReportError] = useState("");

  const [designRequirements, setDesignRequirements] = useState<
    DesignRequirementItem[]
  >([]);
  const [designApiSpecs, setDesignApiSpecs] = useState<DesignApiSpecItem[]>([]);
  const [designDocument, setDesignDocument] =
    useState<DesignDocumentItem | null>(null);
  const [designLoading, setDesignLoading] = useState(false);
  const [designError, setDesignError] = useState("");

  const projectOptions = useMemo(() => {
    return projects.map((project) => ({
      id: project.id,
      name: project.name,
    }));
  }, [projects]);

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

  const selectedProject = useMemo(() => {
    return projects.find((project) => project.id === selectedProjectId) ?? null;
  }, [projects, selectedProjectId]);

  const selectedDesignWorkspaceId =
    selectedProject?.workspaceId || selectedProject?.id || "";

  const parsedDesignDocument = useMemo(
    () => getParsedDesignDocument(designDocument),
    [designDocument],
  );

  useEffect(() => {
    setFinalReportDraft("");
    setFinalReportError("");
  }, [selectedProjectId]);

  useEffect(() => {
    let mounted = true;

    async function loadDesignArchive() {
      if (activeArchiveTab !== "design" && activeArchiveTab !== "final") return;

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
  }, [activeArchiveTab, selectedDesignWorkspaceId]);

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

  const archiveTabs: {
    key: ArchiveTabKey;
    label: string;
    description: string;
    icon: React.ElementType;
  }[] = [
    {
      key: "devlog",
      label: "개발일지",
      description: "작성 기록 문서화",
      icon: BookOpen,
    },
    {
      key: "design",
      label: "설계 문서",
      description: "요구사항·ERD·데이터 흐름",
      icon: Code2,
    },
    {
      key: "final",
      label: "최종 보고서",
      description: "AI 초안 생성",
      icon: Sparkles,
    },
  ];

  const activeArchive = archiveTabs.find((tab) => tab.key === activeArchiveTab);

  const handlePrintPdf = () => {
    const printWindow = window.open("", "_blank", "width=920,height=1000");

    if (!printWindow) {
      alert("팝업이 차단되어 PDF 저장 창을 열 수 없습니다.");
      return;
    }

    const documentTitle = activeArchive?.label ?? "프로젝트 자료실";
    const selectedProjectName = selectedProject?.name || "선택된 프로젝트";

    const printBody = (() => {
      if (activeArchiveTab === "devlog") {
        if (filteredDevlogs.length === 0) {
          return `<div class="empty">조건에 맞는 개발일지가 없습니다.</div>`;
        }

        return filteredDevlogs
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
          .join("");
      }

      if (activeArchiveTab === "design") {
        const erdTables = parsedDesignDocument.erdNodes;
        const flowNodes = parsedDesignDocument.flowNodes;

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
                <pre class="code-block">${escapeHtml(
                  formatApiPayload(item.request),
                )}</pre>
              </div>

              <div>
                <p class="payload-title">응답 데이터</p>
                <pre class="code-block">${escapeHtml(
                  formatApiPayload(item.response),
                )}</pre>
              </div>
            </div>
          </article>
        `,
              )
              .join("")
          : `<div class="empty small-empty">작성된 API 명세가 없습니다.</div>`;
        const erdDiagramHtml = buildPrintDiagramSvg({
          nodes: erdTables,
          edges: parsedDesignDocument.erdEdges,
          type: "erd",
        });

        const flowDiagramHtml = buildPrintDiagramSvg({
          nodes: flowNodes,
          edges: parsedDesignDocument.flowEdges,
          type: "flow",
        });

        const erdHtml = erdTables.length
          ? erdTables
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
                            .slice(0, 8)
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

        const flowHtml = flowNodes.length
          ? flowNodes
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

        return `
          <section class="print-section">
            <h2 class="section-title">1. 요구사항 정의</h2>
            ${requirementHtml}
          </section>
          <section class="print-section">
            <h2 class="section-title">2. API 명세</h2>
            ${apiHtml}
          </section>
          <section class="print-section">
            <h2 class="section-title">3. ERD</h2>
            <p class="body-text section-description">설계단계에서 작성한 테이블과 관계선을 시각화한 다이어그램입니다.</p>
            ${erdDiagramHtml}
            ${erdHtml}
          </section>
          <section class="print-section">
            <h2 class="section-title">4. 데이터 플로우</h2>
            <p class="body-text section-description">화면, 서버, DB, 외부 서비스 사이의 데이터 흐름을 시각화한 다이어그램입니다.</p>
            ${flowDiagramHtml}
            ${flowHtml}
          </section>
        `;
      }

      const reportContent =
        finalReportDraft.trim() ||
        "AI 초안 생성 버튼을 눌러 최종 보고서 초안을 생성한 뒤 PDF로 저장할 수 있습니다.";

      const finalErdDiagramHtml = buildPrintDiagramSvg({
        nodes: parsedDesignDocument.erdNodes,
        edges: parsedDesignDocument.erdEdges,
        type: "erd",
      });

      const finalFlowDiagramHtml = buildPrintDiagramSvg({
        nodes: parsedDesignDocument.flowNodes,
        edges: parsedDesignDocument.flowEdges,
        type: "flow",
      });

      return `
  <section class="print-section">
    <h2 class="section-title">1. 최종 보고서 초안</h2>
    <article class="print-card report-card">
      <div class="report-text">${escapeHtmlWithLineBreaks(reportContent)}</div>
    </article>
  </section>

  <section class="print-section diagram-page">
    <h2 class="section-title">2. ERD</h2>
    <p class="body-text section-description">
      설계단계에서 작성한 테이블 구조와 관계선을 최종 보고서에 포함합니다.
    </p>
    ${finalErdDiagramHtml}
  </section>

  <section class="print-section diagram-page">
    <h2 class="section-title">3. 데이터 플로우</h2>
    <p class="body-text section-description">
      화면, 서버, DB, 외부 서비스 사이의 데이터 흐름을 최종 보고서에 포함합니다.
    </p>
    ${finalFlowDiagramHtml}
  </section>
`;
    })();

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

            .report-card {
              border-bottom: 0;
            }

            .report-card h2 {
              margin-bottom: 14px;
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
              .diagram-page {
  break-before: auto;
  page-break-before: auto;
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

@media print {
  .api-payload-grid {
    grid-template-columns: 1fr;
  }
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
                  <span class="meta-label">문서 구분</span>
                  <span class="meta-value">${escapeHtml(documentTitle)}</span>
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

      console.log("[final report] AI 초안 생성 요청 시작", {
        workspaceId: selectedDesignWorkspaceId,
        projectName: selectedProject.name,
        devlogCount: filteredDevlogs.length,
        requirementCount: designRequirements.length,
        apiSpecCount: designApiSpecs.length,
        erdCount: parsedDesignDocument.erdNodes.length,
        flowCount: parsedDesignDocument.flowNodes.length,
      });

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

      console.log("[final report] AI 초안 생성 응답", response);

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

      console.error("[final report] AI 초안 생성 실패", error);

      setFinalReportError(message);
      alert(message);
    } finally {
      setFinalReportLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-col justify-between gap-2 xl:flex-row xl:items-center">
        <div>
          <h3 className="text-lg font-black tracking-tight text-slate-950">
            프로젝트 자료실
          </h3>
          <p className="mt-0.5 text-xs font-bold text-slate-500">
            선택 프로젝트: {selectedProject?.name ?? "프로젝트 없음"}
          </p>
        </div>

        <span className="w-fit rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700">
          {activeArchive?.label}
        </span>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2">
        {archiveTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeArchiveTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onActiveArchiveTabChange(tab.key)}
              className={[
                "flex h-10 items-center justify-center gap-2 rounded-xl border px-2.5 text-left transition",
                isActive
                  ? "border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-100"
                  : "border-blue-100 bg-blue-50 text-slate-700 hover:border-blue-200 hover:bg-blue-100",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                  isActive ? "bg-white/20" : "bg-white text-blue-700",
                ].join(" ")}
              >
                <Icon size={15} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-black leading-tight">
                  {tab.label}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-3 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(220px,1fr)] xl:w-[360px]">
          <select
            value={selectedProjectId}
            onChange={(event) => setSelectedProjectId(event.target.value)}
            disabled={projectOptions.length === 0}
            className="h-9 rounded-xl border border-blue-100 bg-blue-50 px-3 text-sm font-bold text-slate-700 outline-none disabled:cursor-not-allowed disabled:opacity-50 focus:border-blue-400 focus:bg-white"
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

          {activeArchiveTab === "devlog" && (
            <select
              value={sortType}
              onChange={(event) =>
                setSortType(event.target.value as DevlogSortType)
              }
              className="h-9 rounded-xl border border-blue-100 bg-blue-50 px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-400 focus:bg-white"
            >
              <option value="latest">최신순</option>
              <option value="oldest">오래된순</option>
            </select>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={keyword}
              onChange={(event) => onKeywordChange(event.target.value)}
              placeholder="자료실 검색"
              className="h-9 w-full rounded-xl border border-blue-100 bg-blue-50 pl-10 pr-3 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white sm:w-[230px]"
            />
          </div>

          <button
            type="button"
            onClick={handlePrintPdf}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-blue-100 bg-white px-4 text-sm font-black text-blue-700 hover:bg-blue-50"
          >
            <Download size={16} />
            PDF 저장
          </button>
        </div>
      </div>

      {activeArchiveTab === "devlog" && (
        <ArchiveDevlogContent devlogs={filteredDevlogs} />
      )}

      {activeArchiveTab === "design" && (
        <ArchiveDesignContent
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
  );
}

function ArchiveDevlogContent({ devlogs }: { devlogs: Devlog[] }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h4 className="text-base font-black text-slate-950">개발일지</h4>
          <p className="mt-0.5 text-sm font-semibold text-slate-500">
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
        <div className="space-y-2.5">
          {devlogs.map((devlog) => (
            <DevlogCard key={devlog.id} devlog={devlog} />
          ))}
        </div>
      )}
    </div>
  );
}

function ArchiveDesignContent({
  selectedProject,
  requirements,
  apiSpecs,
  designDocument,
  isLoading,
  errorMessage,
}: {
  selectedProject: Project | null;
  requirements: DesignRequirementItem[];
  apiSpecs: DesignApiSpecItem[];
  designDocument: ParsedDesignDocument;
  isLoading: boolean;
  errorMessage: string;
}) {
  const [activeDesignSection, setActiveDesignSection] =
    useState<DesignArchiveSectionKey>("requirements");

  const erdTables = designDocument.erdNodes;
  const erdRelations = designDocument.erdEdges;
  const flowNodes = designDocument.flowNodes;
  const flowEdges = designDocument.flowEdges;

  const designSectionTabs: {
    key: DesignArchiveSectionKey;
    label: string;
    description: string;
    count: number;
    icon: React.ElementType;
  }[] = [
    {
      key: "requirements",
      label: "요구사항",
      description: "구현 범위와 기능 조건",
      count: requirements.length,
      icon: CheckCircle2,
    },
    {
      key: "api",
      label: "API",
      description: "요청/응답과 엔드포인트",
      count: apiSpecs.length,
      icon: Code2,
    },
    {
      key: "erd",
      label: "ERD",
      description: "테이블·컬럼·관계",
      count: erdTables.length,
      icon: Database,
    },
    {
      key: "flow",
      label: "데이터 흐름",
      description: "화면·서버·DB 처리 흐름",
      count: flowNodes.length,
      icon: GitBranch,
    },
  ];

  const activeDesignTab = designSectionTabs.find(
    (tab) => tab.key === activeDesignSection,
  );
  const ActiveDesignIcon = activeDesignTab?.icon;

  const hasAnyDesignData =
    requirements.length > 0 ||
    apiSpecs.length > 0 ||
    erdTables.length > 0 ||
    flowNodes.length > 0;

  return (
    <div className="space-y-3">
      {errorMessage && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          {designSectionTabs.map((tab) => {
            const isActive = activeDesignSection === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveDesignSection(tab.key)}
                className={[
                  "inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-black transition",
                  isActive
                    ? "border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-100"
                    : "border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100",
                ].join(" ")}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <span className="w-fit rounded-full border border-blue-100 bg-white px-3 py-1 text-[11px] font-black text-blue-700">
          선택 프로젝트: {selectedProject?.name ?? "프로젝트 없음"}
        </span>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-blue-100 bg-white px-4 py-10 text-center text-sm font-black text-slate-500">
          설계 문서를 불러오는 중입니다.
        </div>
      ) : !hasAnyDesignData ? (
        <EmptyState message="아직 문서화할 설계 데이터가 없습니다. 설계단계에서 요구사항, ERD 또는 데이터 플로우를 먼저 작성해주세요." />
      ) : (
        <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-col justify-between gap-2 border-b border-blue-50 pb-3 xl:flex-row xl:items-center">
            <div className="flex min-w-0 items-center gap-2">
              {ActiveDesignIcon && (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <ActiveDesignIcon size={16} />
                </span>
              )}
              <div className="min-w-0">
                <h4 className="truncate text-base font-black tracking-tight text-slate-950">
                  {activeDesignTab?.label}
                </h4>
                <p className="truncate text-xs font-semibold text-slate-500">
                  {activeDesignTab?.description}
                </p>
              </div>
            </div>
          </div>

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
    </div>
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
    <div className="space-y-2.5">
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
          <p className="text-sm font-semibold leading-6 text-slate-600">
            {item.description || "설명이 없습니다."}
          </p>
        </article>
      ))}
    </div>
  );
}
function DesignApiSpecsPage({ apiSpecs }: { apiSpecs: DesignApiSpecItem[] }) {
  if (apiSpecs.length === 0) {
    return <DesignEmptyText text="작성된 API 명세가 없습니다." />;
  }

  return (
    <div className="space-y-3">
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

            <span className="w-fit rounded-full bg-white px-3 py-1 text-[11px] font-black text-blue-700">
              API 명세
            </span>
          </div>

          <div className="space-y-4 p-4">
            <div>
              <p className="mb-1 text-xs font-black text-slate-400">설명</p>
              <p className="whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-slate-700">
                {item.description || "설명이 없습니다."}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                <p className="mb-2 text-xs font-black text-blue-700">
                  요청 데이터
                </p>
                <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-blue-100 bg-white p-3 text-xs font-bold leading-6 text-slate-700">
                  {formatApiPayload(item.request)}
                </pre>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                <p className="mb-2 text-xs font-black text-blue-700">
                  응답 데이터
                </p>
                <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-blue-100 bg-white p-3 text-xs font-bold leading-6 text-slate-700">
                  {formatApiPayload(item.response)}
                </pre>
              </div>
            </div>
          </div>
        </article>
      ))}
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
    <div className="space-y-3">
      <DesignDiagramPreview
        nodes={tables}
        edges={edges}
        type="erd"
        title="ERD 구조 미리보기"
        description="설계단계에서 작성한 테이블 위치와 관계선을 시각화했습니다."
      />

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
        <p className="text-sm font-black text-slate-700">
          테이블 {tables.length}개 · 관계 {relationCount}개
        </p>
        <p className="text-xs font-semibold text-slate-500">
          아래 목록에서는 각 테이블의 컬럼을 문서 형태로 확인합니다.
        </p>
      </div>

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
    <div className="space-y-3">
      <DesignDiagramPreview
        nodes={nodes}
        edges={edges}
        type="flow"
        title="데이터 플로우 미리보기"
        description="화면, 서버, DB, 외부 서비스 사이의 흐름을 시각화했습니다."
      />

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
        <p className="text-sm font-black text-slate-700">
          노드 {nodes.length}개 · 연결 {edgeCount}개
        </p>
        <p className="text-xs font-semibold text-slate-500">
          아래 목록에서는 각 흐름 노드의 역할을 문서 형태로 확인합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
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

function DesignDocumentBlock({
  title,
  description,
  count,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  count: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <Icon size={15} />
          </div>
          <div className="min-w-0">
            <h4 className="text-base font-black text-slate-950">{title}</h4>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              {description}
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700">
          {count}
        </span>
      </div>

      {children}
    </section>
  );
}

function DesignEmptyText({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-blue-100 bg-blue-50/70 px-4 py-8 text-center">
      <p className="text-sm font-black text-slate-400">{text}</p>
    </div>
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
    <div className="space-y-4 pb-28">
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h4 className="text-base font-black text-slate-950">최종 보고서</h4>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              AI 초안과 설계 다이어그램을 하나의 보고서 문서로 구성합니다.
            </p>
          </div>

          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-blue-950 px-4 text-sm font-black text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Sparkles size={16} />
            {isGenerating ? "생성 중..." : "AI 초안 생성"}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {errorMessage}
        </div>
      )}

      <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
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
            <h5 className="mb-2 text-sm font-black text-slate-950">
              1. AI 최종 보고서 초안
            </h5>

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
            <h5 className="mb-2 text-sm font-black text-slate-950">
              2. 설계 다이어그램
            </h5>

            <FinalReportDesignVisuals designDocument={designDocument} />
          </section>
        </div>
      </section>
    </div>
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
      <div className="border-b border-blue-50 pb-4">
        <p className="text-sm font-black text-slate-950">설계 다이어그램</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          설계관리에서 작성한 ERD와 데이터 플로우를 최종 보고서에 함께
          표시합니다.
        </p>
      </div>

      {hasErd && <FinalReportErdDiagram nodes={erdNodes} edges={erdEdges} />}

      {hasFlow && (
        <FinalReportFlowDiagram nodes={flowNodes} edges={flowEdges} />
      )}
    </section>
  );
}

function FinalReportErdDiagram({
  nodes,
  edges,
}: {
  nodes: Record<string, unknown>[];
  edges: Record<string, unknown>[];
}) {
  const bounds = getDiagramBounds(nodes);

  return (
    <section className="rounded-2xl border border-blue-100 bg-slate-50 p-4">
      <div className="mb-3 flex flex-col justify-between gap-2 md:flex-row md:items-center">
        <div>
          <h5 className="text-sm font-black text-slate-950">ERD</h5>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">
            테이블 {nodes.length}개 · 관계 {edges.length}개
          </p>
        </div>
      </div>

      <div className="overflow-auto rounded-2xl border border-blue-100 bg-white">
        <div
          className="relative"
          style={{
            width: bounds.width,
            height: bounds.height,
            minWidth: "100%",
            minHeight: 420,
          }}
        >
          <DiagramEdgeLayer nodes={nodes} edges={edges} bounds={bounds} />

          {nodes.map((node, index) => {
            const position = getDiagramPosition(node, index, bounds);
            const columns = getNodeColumns(node);

            return (
              <article
                key={String(node.id ?? index)}
                className="absolute w-[230px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                style={{
                  left: position.x,
                  top: position.y,
                }}
              >
                <div className="flex items-center justify-between bg-slate-950 px-4 py-3 text-white">
                  <div className="min-w-0">
                    <h6 className="truncate text-xs font-black">
                      {getNodeLabel(node, `TABLE_${index + 1}`)}
                    </h6>
                    <p className="text-[10px] font-semibold text-slate-300">
                      컬럼 {columns.length}개
                    </p>
                  </div>
                  <Database size={15} />
                </div>

                <div className="divide-y divide-slate-100">
                  {columns.length === 0 ? (
                    <p className="px-4 py-3 text-xs font-bold text-slate-400">
                      컬럼 없음
                    </p>
                  ) : (
                    columns.slice(0, 6).map((column, columnIndex) => {
                      const name =
                        typeof column.name === "string"
                          ? column.name
                          : "column";
                      const type =
                        typeof column.type === "string" ? column.type : "TYPE";

                      return (
                        <div
                          key={String(column.id ?? columnIndex)}
                          className="flex items-center justify-between gap-2 px-4 py-2 text-[11px]"
                        >
                          <span className="min-w-0 truncate font-black text-slate-700">
                            {name}
                          </span>
                          <span className="shrink-0 rounded-lg bg-blue-50 px-2 py-0.5 font-black text-blue-700">
                            {type}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FinalReportFlowDiagram({
  nodes,
  edges,
}: {
  nodes: Record<string, unknown>[];
  edges: Record<string, unknown>[];
}) {
  const bounds = getDiagramBounds(nodes);

  return (
    <section className="rounded-2xl border border-blue-100 bg-slate-50 p-4">
      <div className="mb-3 flex flex-col justify-between gap-2 md:flex-row md:items-center">
        <div>
          <h5 className="text-sm font-black text-slate-950">데이터 플로우</h5>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">
            노드 {nodes.length}개 · 연결 {edges.length}개
          </p>
        </div>
      </div>

      <div className="overflow-auto rounded-2xl border border-blue-100 bg-white">
        <div
          className="relative"
          style={{
            width: bounds.width,
            height: bounds.height,
            minWidth: "100%",
            minHeight: 420,
          }}
        >
          <DiagramEdgeLayer nodes={nodes} edges={edges} bounds={bounds} />

          {nodes.map((node, index) => {
            const position = getDiagramPosition(node, index, bounds);
            const data = getNodeData(node);
            const type = typeof data.type === "string" ? data.type : "server";

            const colorClass =
              type === "client"
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : type === "db"
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : type === "external"
                    ? "border-violet-200 bg-violet-50 text-violet-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700";

            return (
              <article
                key={String(node.id ?? index)}
                className={[
                  "absolute flex w-[260px] items-center gap-3 rounded-2xl border p-4 shadow-sm",
                  colorClass,
                ].join(" ")}
                style={{
                  left: position.x,
                  top: position.y,
                }}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80">
                  <GitBranch size={17} />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-black">
                    {getNodeLabel(node, `NODE_${index + 1}`)}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-semibold opacity-80">
                    {getNodeSubText(node)}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function DiagramEdgeLayer({
  nodes,
  edges,
  bounds,
}: {
  nodes: Record<string, unknown>[];
  edges: Record<string, unknown>[];
  bounds: DiagramBounds;
}) {
  const nodeMap = new Map<string, Record<string, unknown>>();

  for (const node of nodes) {
    if (node.id) {
      nodeMap.set(String(node.id), node);
    }
  }

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={bounds.width}
      height={bounds.height}
    >
      {edges.map((edge, index) => {
        const sourceId = String(edge.source ?? "");
        const targetId = String(edge.target ?? "");

        const source = nodeMap.get(sourceId);
        const target = nodeMap.get(targetId);

        if (!source || !target) return null;

        const sourcePosition = getDiagramPosition(source, index, bounds);
        const targetPosition = getDiagramPosition(target, index + 1, bounds);

        const x1 = sourcePosition.x + 230;
        const y1 = sourcePosition.y + 60;
        const x2 = targetPosition.x;
        const y2 = targetPosition.y + 60;

        const midX = (x1 + x2) / 2;

        return (
          <path
            key={String(edge.id ?? index)}
            d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2"
            strokeDasharray="6 5"
          />
        );
      })}
    </svg>
  );
}

type DiagramBounds = {
  minX: number;
  minY: number;
  width: number;
  height: number;
};

function getDiagramBounds(nodes: Record<string, unknown>[]): DiagramBounds {
  const positions = nodes.map((node, index) => {
    const rawPosition = node.position;

    if (
      typeof rawPosition === "object" &&
      rawPosition !== null &&
      !Array.isArray(rawPosition)
    ) {
      const position = rawPosition as Record<string, unknown>;

      return {
        x: typeof position.x === "number" ? position.x : 180 + index * 260,
        y:
          typeof position.y === "number" ? position.y : 120 + (index % 3) * 160,
      };
    }

    return {
      x: 180 + index * 260,
      y: 120 + (index % 3) * 160,
    };
  });

  const minX = Math.min(...positions.map((position) => position.x), 0);
  const minY = Math.min(...positions.map((position) => position.y), 0);
  const maxX = Math.max(...positions.map((position) => position.x), 600);
  const maxY = Math.max(...positions.map((position) => position.y), 320);

  return {
    minX,
    minY,
    width: maxX - minX + 420,
    height: maxY - minY + 260,
  };
}

function getDiagramPosition(
  node: Record<string, unknown>,
  index: number,
  bounds: DiagramBounds,
) {
  const rawPosition = node.position;

  if (
    typeof rawPosition === "object" &&
    rawPosition !== null &&
    !Array.isArray(rawPosition)
  ) {
    const position = rawPosition as Record<string, unknown>;

    return {
      x:
        (typeof position.x === "number" ? position.x : 180 + index * 260) -
        bounds.minX +
        40,
      y:
        (typeof position.y === "number"
          ? position.y
          : 120 + (index % 3) * 160) -
        bounds.minY +
        40,
    };
  }

  return {
    x: 180 + index * 260,
    y: 120 + (index % 3) * 160,
  };
}

function ArchiveMetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-4">
      <p className="text-[11px] font-black text-slate-400">{label}</p>
      <p className="mt-1 truncate text-base font-black text-slate-950">
        {value}
      </p>
    </div>
  );
}

function DevlogCard({ devlog }: { devlog: Devlog }) {
  return (
    <article className="rounded-2xl border border-blue-100 bg-white p-4 transition hover:bg-blue-50">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
        <div>
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <h4 className="text-sm font-black">{devlog.title}</h4>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-black text-slate-500">
              {devlog.projectName}
            </span>
          </div>

          <p className="text-sm font-semibold leading-5 text-slate-500">
            {devlog.summary}
          </p>
        </div>

        <span className="shrink-0 text-[11px] font-black text-slate-400">
          {devlog.date}
        </span>
      </div>
    </article>
  );
}

function HeatmapSection({
  heatmapValues,
  activityHeatmap,
}: {
  heatmapValues: HeatmapLevel[];
  activityHeatmap: ActivityHeatmapResponse;
}) {
  const heatmapStats = useMemo(() => {
    const maxLevel: HeatmapLevel =
      heatmapValues.length > 0
        ? (Math.max(...heatmapValues) as HeatmapLevel)
        : 0;

    const maxLevelCount = heatmapValues.filter(
      (level) => level === maxLevel,
    ).length;

    const averageScore =
      heatmapValues.length > 0
        ? Math.round(
            (activityHeatmap.totalActivityCount / heatmapValues.length) * 10,
          ) / 10
        : 0;

    return {
      totalScore: activityHeatmap.totalActivityCount,
      activeDays: activityHeatmap.activeDays,
      maxLevel,
      maxLevelCount,
      averageScore,
      totalDays: heatmapValues.length,
      devlogCount: activityHeatmap.devlogCount,
      scheduleDoneCount: activityHeatmap.scheduleDoneCount,
      commitCount: activityHeatmap.commitCount,
    };
  }, [heatmapValues, activityHeatmap]);

  const levelGuide: {
    level: HeatmapLevel;
    label: string;
    description: string;
  }[] = [
    {
      level: 0,
      label: "0건",
      description: "활동 없음",
    },
    {
      level: 1,
      label: "1건",
      description: "낮은 활동",
    },
    {
      level: 2,
      label: "2건",
      description: "보통 활동",
    },
    {
      level: 3,
      label: "3건",
      description: "높은 활동",
    },
    {
      level: 4,
      label: "4건 이상",
      description: "매우 높은 활동",
    },
  ];

  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col justify-between gap-3 xl:flex-row xl:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black tracking-tight">
              개발 활동 히트맵
            </h3>
            <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700">
              최근 {heatmapStats.totalDays}일 기준
            </span>
          </div>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            개발일지, 일정 완료, GitHub 커밋 활동을 날짜별로 시각화합니다.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-400">
          <span>적음</span>
          <HeatCell level={0} />
          <HeatCell level={1} />
          <HeatCell level={2} />
          <HeatCell level={3} />
          <HeatCell level={4} />
          <span>많음</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
          <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black text-slate-800">
                날짜별 활동 분포
              </p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                각 칸은 하루를 의미하며, 색이 진할수록 해당 날짜의 개발 활동이
                많았다는 뜻입니다.
              </p>
            </div>

            <span className="w-fit rounded-full bg-white px-3 py-1 text-[11px] font-black text-blue-700 shadow-sm">
              활동일 {heatmapStats.activeDays}일
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[auto_minmax(0,1fr)] 2xl:items-center">
            <div className="w-fit rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
              <div className="grid grid-flow-col grid-rows-7 gap-1.5">
                {heatmapValues.map((level, index) => (
                  <HeatCell
                    key={index}
                    level={level}
                    title={`${index + 1}번째 날짜 · 활동 단계 ${level}`}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <HeatmapMetricCard
                label="총 활동 수"
                value={`${heatmapStats.totalScore}건`}
                description="일지·일정·커밋 합산"
              />
              <HeatmapMetricCard
                label="평균 활동"
                value={`${heatmapStats.averageScore}건`}
                description="하루 평균"
              />
              <HeatmapMetricCard
                label="최고 활동 단계"
                value={`${heatmapStats.maxLevel}단계`}
                description={
                  heatmapStats.maxLevel > 0
                    ? `${heatmapStats.maxLevelCount}일 기록`
                    : "활동 없음"
                }
              />
              <HeatmapMetricCard
                label="산정 방식"
                value="1건 = 1점"
                description="하루 단위 합산"
              />
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-blue-100 bg-white p-4">
            <p className="text-sm font-black text-slate-800">
              이 히트맵은 무엇을 보여주나요?
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
              하루 동안 발생한 개발일지 작성, 일정 완료 활동을 합산하고,
              GitHub 저장소가 연결된 프로젝트는 커밋 기록까지 함께 반영해 개발
              활동 강도를 표시합니다.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
            <div className="mb-3">
              <p className="text-sm font-black text-slate-800">
                활동 점수 산정 기준
              </p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                아래 활동이 발생할 때마다 해당 날짜의 활동 점수가 1점씩
                증가합니다.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <HeatmapRuleRow
                label="개발일지 작성"
                value={`${heatmapStats.devlogCount}건`}
              />
              <HeatmapRuleRow
                label="일정 완료 처리"
                value={`${heatmapStats.scheduleDoneCount}건`}
              />
              <HeatmapRuleRow
                label="GitHub 커밋 기록"
                value={`${heatmapStats.commitCount}건`}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
            <div className="mb-3">
              <p className="text-sm font-black text-slate-800">색상 기준</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                활동 점수가 높을수록 더 진한 파란색으로 표시됩니다.
              </p>
            </div>

            <div className="space-y-2">
              {levelGuide.map((item) => (
                <div
                  key={item.level}
                  className="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <HeatCell level={item.level} />
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800">
                        {item.label}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-500">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-blue-700">
                    {item.level}단계
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
function HeatmapMetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-blue-100 bg-white px-3 py-2.5">
      <p className="text-[11px] font-black text-slate-400">{label}</p>
      <p className="mt-0.5 text-base font-black text-slate-950">{value}</p>
      <p className="mt-0.5 text-[10px] font-bold text-slate-400">
        {description}
      </p>
    </div>
  );
}

function HeatmapRuleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2">
      <span className="text-xs font-black text-slate-700">{label}</span>
      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-blue-700">
        {value}
      </span>
    </div>
  );
}

function HeatCell({ level, title }: { level: HeatmapLevel; title?: string }) {
  const bgClass =
    level === 0
      ? "bg-slate-200"
      : level === 1
        ? "bg-blue-100"
        : level === 2
          ? "bg-blue-300"
          : level === 3
            ? "bg-blue-500"
            : "bg-blue-700";

  const label =
    level === 0
      ? "활동 없음"
      : level === 1
        ? "활동 1건"
        : level === 2
          ? "활동 2건"
          : level === 3
            ? "활동 3건"
            : "활동 4건 이상";

  return (
    <div
      title={title ?? label}
      aria-label={title ?? label}
      className={`h-3.5 w-3.5 shrink-0 rounded-[4px] border border-white ${bgClass}`}
    />
  );
}

function GithubSection() {
  const [status, setStatus] = useState<GithubAccountStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const githubName = getGithubAccountName(status);
  const isConnected = Boolean(status?.connected);

  const loadGithubStatus = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const nextStatus = await fetchGithubAccountStatusApi();
      setStatus(nextStatus);
    } catch (error) {
      setStatus({
        connected: false,
      });

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "GitHub 연결 상태를 확인하지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGithubStatus();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const rawResult = window.sessionStorage.getItem(OAUTH_RESULT_STORAGE_KEY);
    if (!rawResult) return;

    window.sessionStorage.removeItem(OAUTH_RESULT_STORAGE_KEY);

    try {
      const result = JSON.parse(rawResult);

      if (result.status === "success") {
        setMessage("GitHub 계정 연결이 완료되었습니다.");
        setErrorMessage("");
        loadGithubStatus();
        return;
      }

      if (result.status === "error") {
        setMessage("");
        setErrorMessage(
          result.message || "GitHub 인증 처리 중 문제가 발생했습니다.",
        );
      }
    } catch {
      setErrorMessage("GitHub 인증 결과를 확인하지 못했습니다.");
    }
  }, []);

  const handleConnectGithub = () => {
    setMessage("");
    setErrorMessage("");
    openGithubAccountOAuth();
  };

  const handleDisconnectGithub = async () => {
    const confirmed = window.confirm(
      "GitHub 계정 연결을 해제할까요? 프로젝트에 연결된 저장소 정보는 별도로 유지됩니다.",
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setMessage("");
      setErrorMessage("");

      await disconnectGithubAccountApi();

      setStatus({
        connected: false,
      });

      setMessage("GitHub 계정 연결이 해제되었습니다.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "GitHub 연결 해제에 실패했습니다.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-lg font-black tracking-tight">GitHub 설정</h3>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          마이페이지에서는 GitHub 계정 인증 상태만 관리합니다. 프로젝트별
          저장소 연결은 프로젝트 생성 또는 IDE에서 따로 설정합니다.
        </p>
      </div>

      {message && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {message}
        </div>
      )}

      {errorMessage && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
          {errorMessage}
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-blue-950 text-white">
              {isConnected && status?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={status.avatarUrl}
                  alt="GitHub profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Github size={23} />
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-black">
                  {loading
                    ? "GitHub 연결 상태 확인 중"
                    : isConnected
                      ? "GitHub 계정 연결됨"
                      : "GitHub 계정 미연결"}
                </p>

                <span
                  className={[
                    "rounded-full px-2.5 py-0.5 text-[11px] font-black",
                    isConnected
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-white text-slate-500",
                  ].join(" ")}
                >
                  {isConnected ? "CONNECTED" : "NOT CONNECTED"}
                </span>
              </div>

              <p className="mt-0.5 text-sm font-semibold text-slate-500">
                {isConnected
                  ? `${githubName || "GitHub 계정"} 계정으로 인증되어 있습니다.`
                  : "GitHub 계정을 연결하면 IDE에서 Pull, Push, 커밋 연동 기능을 사용할 수 있습니다."}
              </p>

              {isConnected && (
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-black">
                  {githubName && (
                    <span className="rounded-full bg-white px-2.5 py-1 text-blue-700">
                      @{githubName}
                    </span>
                  )}

                  {status?.email && (
                    <span className="rounded-full bg-white px-2.5 py-1 text-slate-500">
                      {status.email}
                    </span>
                  )}

                  {status?.connectedAt && (
                    <span className="rounded-full bg-white px-2.5 py-1 text-slate-500">
                      연결일 {formatDateLabel(status.connectedAt)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={loadGithubStatus}
              disabled={loading || actionLoading}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-blue-100 bg-white px-4 text-sm font-black text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              새로고침
            </button>

            {isConnected ? (
              <>
                <button
                  type="button"
                  onClick={handleConnectGithub}
                  disabled={actionLoading}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-950 px-4 text-sm font-black text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  다시 인증
                </button>

                <button
                  type="button"
                  onClick={handleDisconnectGithub}
                  disabled={actionLoading}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-red-100 bg-white px-4 text-sm font-black text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  연결 해제
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleConnectGithub}
                disabled={loading || actionLoading}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-950 px-4 text-sm font-black text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Github size={17} />
                GitHub 연결
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-blue-100 bg-white p-4">
          <p className="text-xs font-black text-slate-400">마이페이지 역할</p>
          <p className="mt-1 text-sm font-black text-slate-900">
            GitHub 계정 인증
          </p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            사용자 계정과 GitHub 계정을 연결합니다.
          </p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-white p-4">
          <p className="text-xs font-black text-slate-400">프로젝트 역할</p>
          <p className="mt-1 text-sm font-black text-slate-900">
            저장소 URL 연결
          </p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            프로젝트마다 서로 다른 Repository를 연결합니다.
          </p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-white p-4">
          <p className="text-xs font-black text-slate-400">IDE 역할</p>
          <p className="mt-1 text-sm font-black text-slate-900">
            Pull / Push 실행
          </p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            현재 프로젝트 저장소 기준으로 Git 작업을 수행합니다.
          </p>
        </div>
      </div>
    </section>
  );
}

function AccountSection({ user }: { user: User }) {
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");

  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const resetNotice = () => {
    setMessage("");
    setErrorMessage("");
  };

  const handleChangeEmail = async () => {
    resetNotice();

    const nextEmail = email.trim();

    if (!nextEmail) {
      setErrorMessage("변경할 이메일을 입력해주세요.");
      return;
    }

    if (nextEmail === user.email) {
      setErrorMessage("현재 이메일과 동일합니다.");
      return;
    }

    try {
      setEmailLoading(true);
      await changeMyEmailApi(nextEmail);
      setMessage("이메일이 변경되었습니다. 다시 로그인해야 할 수 있습니다.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "이메일 변경에 실패했습니다.",
      );
    } finally {
      setEmailLoading(false);
    }
  };

  const handleChangePassword = async () => {
    resetNotice();

    if (!currentPassword.trim()) {
      setErrorMessage("현재 비밀번호를 입력해주세요.");
      return;
    }

    if (!newPassword.trim()) {
      setErrorMessage("새 비밀번호를 입력해주세요.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage("새 비밀번호는 8자 이상으로 입력해주세요.");
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setErrorMessage("새 비밀번호와 확인 비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      setPasswordLoading(true);
      await changeMyPasswordApi(currentPassword, newPassword);

      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
      setMessage("비밀번호가 변경되었습니다.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "비밀번호 변경에 실패했습니다.",
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    resetNotice();

    const confirmed = window.confirm(
      "정말 회원 탈퇴를 진행할까요? 이 작업은 되돌릴 수 없습니다.",
    );

    if (!confirmed) return;

    const doubleConfirmed = window.confirm(
      "회원 탈퇴 시 계정 정보가 삭제됩니다. 계속 진행할까요?",
    );

    if (!doubleConfirmed) return;

    try {
      setDeleteLoading(true);

      await deleteMyAccountApi();

      localStorage.removeItem("accessToken");
      localStorage.removeItem("token");
      localStorage.removeItem("jwt");
      localStorage.removeItem("authToken");
      localStorage.removeItem("userId");

      window.location.href = "/login";
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "회원 탈퇴에 실패했습니다.",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <section className="space-y-5">
      <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
        <div>
          <h3 className="text-lg font-black tracking-tight">계정 설정</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            사용자명, 이메일, 가입일 정보를 확인하고 계정 정보를 변경합니다.
          </p>
        </div>

        {(message || errorMessage) && (
          <div
            className={[
              "mt-4 rounded-xl border px-4 py-3 text-sm font-bold",
              message
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700",
            ].join(" ")}
          >
            {message || errorMessage}
          </div>
        )}

        <div className="mt-4 space-y-3">
          <AccountRow label="사용자명" value={user.nickname} icon={UserRound} />
          <AccountRow
            label="가입일"
            value={formatDateLabel(user.createdAt)}
            icon={Settings}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h4 className="text-base font-black text-slate-950">이메일 변경</h4>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            로그인 계정에 사용할 이메일을 변경합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
          <div>
            <label className="mb-1.5 block text-xs font-black text-slate-500">
              이메일
            </label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-10 w-full rounded-xl border border-blue-100 bg-blue-50 px-3 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white"
              placeholder="이메일을 입력하세요"
            />
          </div>

          <button
            type="button"
            onClick={handleChangeEmail}
            disabled={emailLoading}
            className="self-end rounded-xl bg-blue-950 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {emailLoading ? "변경 중..." : "이메일 변경"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h4 className="text-base font-black text-slate-950">비밀번호 변경</h4>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            현재 비밀번호 확인 후 새 비밀번호로 변경합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <PasswordField
            label="현재 비밀번호"
            value={currentPassword}
            onChange={setCurrentPassword}
            placeholder="현재 비밀번호"
          />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <PasswordField
              label="새 비밀번호"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="8자 이상"
            />

            <PasswordField
              label="새 비밀번호 확인"
              value={newPasswordConfirm}
              onChange={setNewPasswordConfirm}
              placeholder="새 비밀번호 확인"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleChangePassword}
              disabled={passwordLoading}
              className="rounded-xl bg-blue-950 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {passwordLoading ? "변경 중..." : "비밀번호 변경"}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h4 className="text-base font-black text-red-700">회원 탈퇴</h4>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              계정을 삭제하면 복구할 수 없습니다. 필요한 데이터는 먼저
              백업하세요.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={deleteLoading}
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-black text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleteLoading ? "처리 중..." : "회원 탈퇴"}
          </button>
        </div>
      </section>
    </section>
  );
}

function ActivityCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <article className="flex min-h-[74px] items-center gap-3 rounded-xl border border-blue-100 bg-white px-3 py-2.5 shadow-sm">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-950 text-white">
        <Icon size={15} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-black text-slate-500">{label}</p>
        <div className="mt-0.5 flex items-end gap-1.5">
          <p className="truncate text-lg font-black leading-none tracking-tight">
            {value}
          </p>
          <p className="hidden truncate text-[10px] font-black leading-none text-slate-400 xl:block">
            {description}
          </p>
        </div>
      </div>
    </article>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
      <p className="text-[11px] font-black text-slate-500">{label}</p>
      <p className="mt-0.5 text-base font-black">{value}</p>
    </div>
  );
}


function AccountRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-black text-slate-600">
        <Icon size={15} />
        {label}
      </div>

      <div className="rounded-xl border border-blue-100 bg-white px-3.5 py-2.5 text-sm font-black text-slate-800">
        {value}
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-black text-slate-500">
        {label}
      </label>
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-blue-100 bg-blue-50 px-3 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white"
      />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-blue-100 bg-blue-50 px-4 py-8 text-center">
      <p className="text-sm font-black text-slate-500">{message}</p>
    </div>
  );
}
