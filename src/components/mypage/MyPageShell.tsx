"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  Code2,
  Github,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Settings,
  UserRound,
} from "lucide-react";

import {
  changeMyEmailApi,
  changeMyPasswordApi,
  deleteMyAccountApi,
  fetchMyProfile,
  fetchMyWorkspaces,
  fetchScheduleProgress,
  fetchWorkspaceDevlogs,
  type MyPageDevlogResponse,
  type ScheduleProgressResponse,
  type ScheduleView,
  type UserMeResponse,
  type WorkspaceDevlogsResponse,
  type WorkspaceListResponse,
  type WorkspaceProjectResponse,
} from "@/components/mypage/api";

import type {
  ActivitySummary,
  Devlog,
  HeatmapLevel,
  Project,
  ProjectStatus,
  TabKey,
  User,
} from "@/components/mypage/types";

type DevlogSortType = "latest" | "oldest";

const fallbackHeatmapValues: HeatmapLevel[] = [
  0, 1, 2, 0, 3, 1, 4, 2, 0, 1, 3, 0, 2, 1, 4, 3, 1, 0, 2, 4, 1, 0, 1, 3, 2, 0,
  1, 4, 2, 3, 0, 1, 2, 4, 3, 1, 0, 2, 3, 4, 1, 2, 3, 1, 0, 2, 4, 3, 1,
];

const tabs: {
  key: TabKey;
  label: string;
  description: string;
  icon: React.ElementType;
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
    label: "개발일지",
    description: "작성 기록",
    icon: BookOpen,
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
  return workspaces.flatMap((workspace) => {
    const workspaceRole = normalizeRole(workspace.role);
    const workspaceVisibility = workspace.mode === "team" ? "team" : "private";
    const workspaceType = workspace.mode === "team" ? "팀" : "개인";
    const scheduleProgress = scheduleProgressMap.get(workspace.id);

    return (workspace.projects ?? []).map((project) => {
      const status = normalizeProjectStatus(project.status);

      const progress =
        typeof scheduleProgress?.progress === "number"
          ? scheduleProgress.progress
          : normalizeProgress(project.progress, status);

      return {
        id: project.id,
        name: project.name,
        description:
          project.description ??
          workspace.description ??
          `${workspace.name} 워크스페이스의 프로젝트입니다.`,
        type: workspaceType,
        status,
        progress,
        language: project.language || "Unknown",
        stack: normalizeStack(project),
        updatedAt: project.updatedAt ?? workspace.updatedAt ?? undefined,
        devlogCount: Number(project.devlogCount ?? 0),
        doneScheduleCount: Number(scheduleProgress?.doneCount ?? 0),
        scheduleTotalCount: Number(scheduleProgress?.totalCount ?? 0),
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        workspaceRole,
        workspaceVisibility,
      };
    });
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
  rootResponse: WorkspaceDevlogsResponse,
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
    getStringValue(devlog, ["title", "name", "subject"]) ||
    "제목 없는 개발일지";

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
    commitCount: 0,
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

export default function MyPageDemo() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [keyword, setKeyword] = useState("");

  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [devlogs, setDevlogs] = useState<Devlog[]>([]);
  const [heatmapValues] = useState<HeatmapLevel[]>(fallbackHeatmapValues);

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
    () => buildActivitySummary(projects, devlogs.length),
    [projects, devlogs.length],
  );

  const selectedTab = tabs.find((tab) => tab.key === activeTab);

  const filteredProgressProjects = useMemo(
    () =>
      progressProjects.filter((project) =>
        project.name.toLowerCase().includes(keyword.toLowerCase()),
      ),
    [progressProjects, keyword],
  );

  const filteredCompletedProjects = useMemo(
    () =>
      completedProjects.filter((project) =>
        project.name.toLowerCase().includes(keyword.toLowerCase()),
      ),
    [completedProjects, keyword],
  );

  useEffect(() => {
    let mounted = true;

    async function loadMyPage() {
      try {
        setLoading(true);
        setError("");

        const [profileDto, workspaceDtos] = await Promise.all([
          fetchMyProfile(),
          fetchMyWorkspaces(),
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
            "[mypage schedules] 일부 워크스페이스 일정 진행률 요청 실패:",
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
            "[mypage devlogs] 일부 워크스페이스 개발일지 요청 실패:",
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
      <main className="min-h-screen bg-[#f6f8fa] text-slate-950">
        <div className="mx-auto max-w-[1280px] px-6 py-8">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-600 shadow-sm">
            마이페이지 불러오는 중...
          </section>
        </div>
      </main>
    );
  }

  if (error || !user) {
    return (
      <main className="min-h-screen bg-[#f6f8fa] text-slate-950">
        <div className="mx-auto max-w-[1280px] px-6 py-8">
          <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 shadow-sm">
            {error || "사용자 정보를 불러오지 못했습니다."}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f8fa] text-slate-950">
      <div className="mx-auto max-w-[1280px] px-6 py-8">
        <section className="mb-5 flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white text-xl font-black shadow-sm">
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
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-500">
                  Dev Activity
                </span>
              </div>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                프로젝트, 개발일지, GitHub 활동을 한 곳에서 확인합니다.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            <LogOut size={16} />
            로그아웃
          </button>
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="mb-2 px-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
                My Page
              </p>

              <div className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={[
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                        isActive
                          ? "bg-slate-950 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                      ].join(" ")}
                    >
                      <Icon size={17} />

                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black">
                          {tab.label}
                        </span>
                        <span
                          className={[
                            "mt-0.5 block text-[11px] font-semibold",
                            isActive ? "text-slate-300" : "text-slate-400",
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

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
                  label="개발일지"
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
            <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
                <div>
                  <p className="text-xs font-black text-slate-400">
                    {selectedTab?.description}
                  </p>
                  <h3 className="mt-0.5 text-xl font-black tracking-tight">
                    {selectedTab?.label}
                  </h3>
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
                      placeholder={
                        activeTab === "devlogs"
                          ? "개발일지 검색"
                          : "프로젝트 검색"
                      }
                      className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white sm:w-[230px]"
                    />
                  </div>

                  <button
                    type="button"
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white hover:bg-slate-800"
                  >
                    <Plus size={16} />
                    {activeTab === "devlogs" ? "일지 작성" : "새 프로젝트"}
                  </button>
                </div>
              </div>
            </section>

            {activeTab === "overview" && (
              <OverviewSection
                summary={summary}
                progressProjects={progressProjects}
                devlogs={devlogs}
                heatmapValues={heatmapValues}
              />
            )}

            {activeTab === "progress" && (
              <ProjectSection
                title="진행 중 프로젝트"
                description="현재 작업 중인 프로젝트가 카드 형태로 표시됩니다."
                projects={filteredProgressProjects}
                emptyText="진행 중인 프로젝트가 없습니다."
              />
            )}

            {activeTab === "completed" && (
              <ProjectSection
                title="완료 프로젝트"
                description="완료한 프로젝트만 따로 분리해서 확인할 수 있습니다."
                projects={filteredCompletedProjects}
                emptyText="완료한 프로젝트가 없습니다."
              />
            )}

            {activeTab === "devlogs" && (
              <DevlogSection
                devlogs={devlogs}
                projects={projects}
                keyword={keyword}
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
}: {
  summary: ActivitySummary;
  progressProjects: Project[];
  devlogs: Devlog[];
  heatmapValues: HeatmapLevel[];
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
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
          label="개발일지"
          value={`${summary.devlogCount}개`}
          icon={BookOpen}
          description="전체 작성"
        />
        <ActivityCard
          label="커밋"
          value={`${summary.commitCount}개`}
          icon={Github}
          description="GitHub 연동 후 표시"
        />
      </div>

      <ProjectSection
        title="현재 작업 중"
        description="최근 활동이 있는 진행 중 프로젝트입니다."
        projects={progressProjects.slice(0, 4)}
        emptyText="현재 작업 중인 프로젝트가 없습니다."
      />

      <HeatmapSection heatmapValues={heatmapValues} />

      <DevlogPreviewSection devlogs={devlogs} />
    </div>
  );
}

function ProjectSection({
  title,
  description,
  projects,
  emptyText,
}: {
  title: string;
  description: string;
  projects: Project[];
  emptyText: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
        <div>
          <h3 className="text-lg font-black tracking-tight">{title}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {description}
          </p>
        </div>

        <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-500">
          {projects.length}개
        </span>
      </div>

      {projects.length === 0 ? (
        <EmptyState message={emptyText} />
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard
              key={`${project.workspaceId}-${project.id}`}
              project={project}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const isCompleted = project.status === "completed";
  const isTeam = project.type === "팀";

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <h4 className="truncate text-base font-black text-slate-950">
              {project.name}
            </h4>

            <span
              className={[
                "rounded-full px-2 py-0.5 text-[11px] font-black",
                isCompleted
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-blue-50 text-blue-700",
              ].join(" ")}
            >
              {isCompleted ? "완료" : "진행 중"}
            </span>

            <span
              className={[
                "rounded-full px-2 py-0.5 text-[11px] font-black",
                isTeam
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-sky-50 text-sky-700",
              ].join(" ")}
            >
              {project.type}
            </span>
          </div>

          <p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-500">
            {project.description}
          </p>

          <p className="mt-1 text-[11px] font-black text-slate-400">
            {project.workspaceName}
          </p>
        </div>

        <span className="shrink-0 text-[11px] font-black text-slate-400">
          {formatDateLabel(project.updatedAt)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-black text-slate-600">
          {project.language}
        </span>

        {project.stack.map((stack) => (
          <span
            key={stack}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-black text-slate-500"
          >
            {stack}
          </span>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-slate-50 p-2.5">
          <p className="text-[11px] font-bold text-slate-400">개발일지</p>
          <p className="mt-0.5 text-base font-black">{project.devlogCount}개</p>
        </div>

        <div className="rounded-xl bg-slate-50 p-2.5">
          <p className="text-[11px] font-bold text-slate-400">완료 일정</p>
          <p className="mt-0.5 text-base font-black">
            {project.doneScheduleCount}/{project.scheduleTotalCount}개
          </p>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-black">
          <span className="text-slate-500">진행률</span>
          <span>{project.progress}%</span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={[
              "h-full rounded-full",
              isCompleted ? "bg-emerald-500" : "bg-slate-950",
            ].join(" ")}
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>
    </article>
  );
}

function DevlogPreviewSection({ devlogs }: { devlogs: Devlog[] }) {
  const previewDevlogs = devlogs.slice(0, 2);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-black tracking-tight">최근 개발일지</h3>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          최근 작성된 개발일지 2개만 표시합니다.
        </p>
      </div>

      {previewDevlogs.length === 0 ? (
        <EmptyState message="표시할 개발일지가 없습니다." />
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

function DevlogSection({
  devlogs,
  projects,
  keyword,
}: {
  devlogs: Devlog[];
  projects: Project[];
  keyword: string;
}) {
  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const [sortType, setSortType] = useState<DevlogSortType>("latest");

  const projectOptions = useMemo(() => {
    const map = new Map<string, string>();

    for (const project of projects) {
      map.set(project.id, project.name);
    }

    for (const devlog of devlogs) {
      if (devlog.projectId && devlog.projectName) {
        map.set(devlog.projectId, devlog.projectName);
      }
    }

    return Array.from(map.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [projects, devlogs]);

  const filteredDevlogs = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return devlogs
      .filter((devlog) => {
        const matchesProject =
          selectedProjectId === "all" ||
          String(devlog.projectId ?? "") === selectedProjectId;

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

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col justify-between gap-3 xl:flex-row xl:items-start">
        <div>
          <h3 className="text-lg font-black tracking-tight">개발일지</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            전체 개발일지를 확인하거나 특정 프로젝트의 개발일지만 필터링할 수
            있습니다.
          </p>
        </div>

        <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-500">
          {filteredDevlogs.length}개
        </span>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-[1fr_160px]">
        <select
          value={selectedProjectId}
          onChange={(event) => setSelectedProjectId(event.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
        >
          <option value="all">전체 프로젝트</option>
          {projectOptions.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>

        <select
          value={sortType}
          onChange={(event) =>
            setSortType(event.target.value as DevlogSortType)
          }
          className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
        >
          <option value="latest">최신순</option>
          <option value="oldest">오래된순</option>
        </select>
      </div>

      {filteredDevlogs.length === 0 ? (
        <EmptyState message="조건에 맞는 개발일지가 없습니다." />
      ) : (
        <div className="space-y-2.5">
          {filteredDevlogs.map((devlog) => (
            <DevlogCard key={devlog.id} devlog={devlog} />
          ))}
        </div>
      )}
    </section>
  );
}

function DevlogCard({ devlog }: { devlog: Devlog }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:bg-slate-50">
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

function HeatmapSection({ heatmapValues }: { heatmapValues: HeatmapLevel[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-lg font-black tracking-tight">
            개발 활동 히트맵
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            개발일지 작성, 일정 완료, 프로젝트 생성, 커밋 기록 기준입니다.
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

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="grid w-max grid-flow-col grid-rows-7 gap-1.5">
          {heatmapValues.map((level, index) => (
            <HeatCell key={index} level={level} />
          ))}
        </div>
      </div>
    </section>
  );
}

function GithubSection() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-lg font-black tracking-tight">GitHub 설정</h3>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          GitHub 계정과 저장소 연동 상태를 관리합니다.
        </p>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white">
              <Github size={22} />
            </div>

            <div>
              <p className="text-sm font-black">GitHub 연동 준비 중</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-500">
                GitHub API를 연결하면 커밋 기록과 저장소 정보를 표시할 수
                있습니다.
              </p>
            </div>
          </div>

          <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800">
            GitHub 연결
          </button>
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
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
              placeholder="이메일을 입력하세요"
            />
          </div>

          <button
            type="button"
            onClick={handleChangeEmail}
            disabled={emailLoading}
            className="self-end rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {emailLoading ? "변경 중..." : "이메일 변경"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
              className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
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
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
        <Icon size={18} />
      </div>

      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-2xl font-black tracking-tight">
        {value}
      </p>
      <p className="mt-0.5 text-[11px] font-black text-slate-400">
        {description}
      </p>
    </article>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[11px] font-black text-slate-500">{label}</p>
      <p className="mt-0.5 text-base font-black">{value}</p>
    </div>
  );
}

function HeatCell({ level }: { level: HeatmapLevel }) {
  const bgClass =
    level === 0
      ? "bg-slate-200"
      : level === 1
        ? "bg-emerald-100"
        : level === 2
          ? "bg-emerald-300"
          : level === 3
            ? "bg-emerald-500"
            : "bg-emerald-700";

  return (
    <div
      title={`활동 ${level}`}
      className={`h-3.5 w-3.5 rounded-[4px] border border-white ${bgClass}`}
    />
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-black text-slate-600">
        <Icon size={16} />
        {label}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-black text-slate-800">
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
        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
      />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
      <p className="text-sm font-black text-slate-500">{message}</p>
    </div>
  );
}
