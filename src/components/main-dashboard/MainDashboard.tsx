"use client";

import Link from "next/link";

import { useParams, useRouter, useSearchParams } from "next/navigation";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  Activity,
  ArrowRight,
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  Code2,
  Database,
  FileCode2,
  FolderTree,
  GitCommitHorizontal,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  Network,
  PenTool,
  Settings2,
  Sparkles,
  UsersRound,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import {

  fetchScheduleProgressApi,

  getMyWorkspacesByTokenApi,

} from "@/lib/ide/api";

import type {

  MainDashboardProps,

  RecentProject,

  ScheduleProgressApiResponse,

  ScheduleProgressResponse,

  SummaryStat,

  WorkspaceListResponse,

  WorkspaceMode,

  WorkFlowItem,

} from "./dashboard.types";

import { MAX_RECENT_PROJECTS } from "./dashboard.types";

import {

  formatDateKey,

  getArchiveHref,

  getDevlogHref,

  getIdeHref,

  getScheduleHref,

  normalizeWorkspaceId,

  parseLastModified,

  SCHEDULE_STATUS_META,

  SUMMARY_STATS_BASE,

} from "./dashboard.utils";

import { loadMonthlyWorkFlowItems } from "./dashboard.service";

import {
  buildActivity,
  loadProjectOverview,
  type ActivityKind,
  type OverviewMember,
  type OverviewSchedule,
  type ProjectOverview,
} from "./dashboard.overview";

import SummaryCards from "./SummaryCards";

import ProjectCard from "./ProjectCard";

import MonthlyWorkFlowSection from "./MonthlyWorkFlowSection";

import ProjectSwitcher from "./ProjectSwitcher";

import type { WorkspaceSidebarItem } from "@/components/layout/ProjectSidebar";

function getWorkspaceTitle(workspace?: WorkspaceListResponse | null) {

  return workspace?.name?.trim() || "이름 없는 프로젝트";

}

function getWorkspaceSubProjectCount(

  workspace?: WorkspaceListResponse | null,

) {

  return Array.isArray(workspace?.projects)

    ? workspace.projects.length

    : 0;

}

function getWorkspaceTechLabel(

  workspace?: WorkspaceListResponse | null,

) {

  return `작업 폴더 ${getWorkspaceSubProjectCount(workspace)}개`;

}

export default function MainDashboard({

  workspaceId,

  mode,

}: MainDashboardProps) {

  const router = useRouter();

  const routeParams =

    useParams<{ workspaceId?: string | string[] }>();

  const searchParams = useSearchParams();

  const routeWorkspaceId = Array.isArray(

    routeParams?.workspaceId,

  )

    ? routeParams.workspaceId[0]

    : routeParams?.workspaceId;

  const routeMode = searchParams.get("mode");

  const activeMode: WorkspaceMode | undefined =

    mode ??

    (routeMode === "team" || routeMode === "personal"

      ? routeMode

      : undefined);

  const safeWorkspaceId = normalizeWorkspaceId(

    workspaceId ?? routeWorkspaceId,

  );

  const [allWorkspaces, setAllWorkspaces] =

    useState<WorkspaceListResponse[]>([]);

  const [workspaces, setWorkspaces] =

    useState<WorkspaceListResponse[]>([]);

  const [progressMap, setProgressMap] =

    useState<Record<string, number>>({});

  const [progressDetailMap, setProgressDetailMap] = useState<

    Record<string, ScheduleProgressResponse>

  >({});

  const [workFlowItems, setWorkFlowItems] =

    useState<WorkFlowItem[]>([]);

  const [selectedDateKey, setSelectedDateKey] = useState(

    formatDateKey(new Date()),

  );

  const [isLoading, setIsLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {

    let ignore = false;

    async function loadMainData() {

      try {

        setIsLoading(true);

        setErrorMessage("");

        const workspaceData =

          await getMyWorkspacesByTokenApi();

        const allWorkspaceData: WorkspaceListResponse[] =

          Array.isArray(workspaceData)

            ? workspaceData

            : [];

        const filteredWorkspaces = safeWorkspaceId

          ? allWorkspaceData.filter(

              (workspace) =>

                String(workspace.id) ===

                  String(safeWorkspaceId) &&

                (!activeMode ||

                  workspace.mode === activeMode),

            )

          : allWorkspaceData;

        const fallbackWorkspaces =

          safeWorkspaceId &&

          filteredWorkspaces.length === 0

            ? allWorkspaceData.filter(

                (workspace) =>

                  String(workspace.id) ===

                  String(safeWorkspaceId),

              )

            : filteredWorkspaces;

        if (

          safeWorkspaceId &&

          fallbackWorkspaces.length === 0

        ) {

          throw new Error(

            "선택한 프로젝트를 찾을 수 없습니다.",

          );

        }

        const targetWorkspaces = safeWorkspaceId

          ? fallbackWorkspaces.slice(0, 1)

          : fallbackWorkspaces;

        const [progressResults, monthlyItems] =

          await Promise.all([

            Promise.allSettled(

              targetWorkspaces.map((workspace) =>

                fetchScheduleProgressApi({

                  workspaceId: workspace.id,

                }),

              ),

            ),

            loadMonthlyWorkFlowItems(targetWorkspaces),

          ]);

        const nextProgressMap: Record<string, number> =

          {};

        const nextProgressDetailMap: Record<

          string,

          ScheduleProgressResponse

        > = {};

        progressResults.forEach((result, index) => {

          const workspace =

            targetWorkspaces[index];

          if (!workspace) {

            return;

          }

          if (result.status === "fulfilled") {

            const progressData =

              result.value as ScheduleProgressApiResponse;

            const progress = Number(

              progressData.progressRate ?? 0,

            );

            const totalCount = Number(

              progressData.total ?? 0,

            );

            const doneCount = Number(

              progressData.done ?? 0,

            );

            nextProgressMap[workspace.id] = progress;

            nextProgressDetailMap[workspace.id] = {

              workspaceId: workspace.id,

              workspaceName: workspace.name,

              type: workspace.mode,

              totalCount,

              doneCount,

              progress,

            };

          } else {

            nextProgressMap[workspace.id] = 0;

            nextProgressDetailMap[workspace.id] = {

              workspaceId: workspace.id,

              workspaceName: workspace.name,

              type: workspace.mode,

              totalCount: 0,

              doneCount: 0,

              progress: 0,

            };

          }

        });

        if (!ignore) {

          const latestItem = monthlyItems[0];

          setAllWorkspaces(allWorkspaceData);

          setWorkspaces(targetWorkspaces);

          setProgressMap(nextProgressMap);

          setProgressDetailMap(

            nextProgressDetailMap,

          );

          setWorkFlowItems(monthlyItems);

          if (latestItem?.dateKey) {

            setSelectedDateKey(

              latestItem.dateKey,

            );

          } else {

            setSelectedDateKey(

              formatDateKey(new Date()),

            );

          }

        }

      } catch (error) {

        if (!ignore) {

          setAllWorkspaces([]);

          setWorkspaces([]);

          setProgressMap({});

          setProgressDetailMap({});

          setWorkFlowItems([]);

          setErrorMessage(

            error instanceof Error

              ? error.message

              : "메인 데이터를 불러오지 못했습니다.",

          );

        }

      } finally {

        if (!ignore) {

          setIsLoading(false);

        }

      }

    }

    loadMainData();

    return () => {

      ignore = true;

    };

  }, [safeWorkspaceId, activeMode]);

  const selectedWorkspace =

    workspaces[0] ?? null;

  const selectedProjectName =

    selectedWorkspace

      ? getWorkspaceTitle(

          selectedWorkspace,

        )

      : "프로젝트";

  const selectedProgressDetail =

    selectedWorkspace

      ? progressDetailMap[

          selectedWorkspace.id

        ]

      : undefined;

  const projectProgress = selectedWorkspace

    ? (selectedProgressDetail?.progress ??

      progressMap[selectedWorkspace.id] ??

      0)

    : 0;

  const totalScheduleCount =

    selectedProgressDetail?.totalCount ?? 0;

  const doneScheduleCount =

    selectedProgressDetail?.doneCount ?? 0;

  const remainingScheduleCount = Math.max(

    totalScheduleCount -

      doneScheduleCount,

    0,

  );

  const projectDevlogCount =

    safeWorkspaceId

      ? workFlowItems.filter(

          (item) =>

            item.type === "devlog",

        ).length

      : 0;

  const personalCount =

    allWorkspaces.filter(

      (workspace) =>

        workspace.mode === "personal",

    ).length;

  const teamCount =

    allWorkspaces.filter(

      (workspace) =>

        workspace.mode === "team",

    ).length;

  const summaryStats: SummaryStat[] =

    safeWorkspaceId

      ? [

          {

            id: 1,

            title: "프로젝트 진행률",

            count: projectProgress,

            suffix: "%",

            label: "전체 일정 기준",

            icon: "gauge",

          },

          {

            id: 2,

            title: "남은 일정",

            count:

              remainingScheduleCount,

            label: "진행/대기 일정",

            icon: "todo",

          },

          {

            id: 3,

            title: "완료 일정",

            count:

              doneScheduleCount,

            label: `전체 ${totalScheduleCount}개 중 완료`,

            icon: "check",

          },

          {

            id: 4,

            title: "개발일지",

            count:

              projectDevlogCount,

            label:

              "이번 달 작성 기록",

            icon: "book",

          },

        ]

      : SUMMARY_STATS_BASE.map(

          (stat) => {

            if (stat.id === 1) {

              return {

                ...stat,

                count:

                  personalCount,

              };

            }

            if (stat.id === 2) {

              return {

                ...stat,

                count: teamCount,

              };

            }

            return stat;

          },

        );

  const recentProjects =

    useMemo<RecentProject[]>(() => {

      return [...workspaces]

        .sort(

          (a, b) =>

            parseLastModified(

              b.updatedAt,

            ) -

            parseLastModified(

              a.updatedAt,

            ),

        )

        .slice(

          0,

          safeWorkspaceId

            ? 1

            : MAX_RECENT_PROJECTS,

        )

        .map((workspace) => ({

          id: workspace.id,

          workspaceId:

            workspace.id,

          title:

            getWorkspaceTitle(

              workspace,

            ),

          tech:

            getWorkspaceTechLabel(

              workspace,

            ),

          type: workspace.mode,

          role: workspace.role,

          progress:

            progressMap[

              workspace.id

            ] ?? 0,

          lastModified:

            workspace.updatedAt ||

            "최근 수정일 없음",

        }));

    }, [

      workspaces,

      progressMap,

      safeWorkspaceId,

    ]);

  const currentWorkspaceId =

    selectedWorkspace?.id ??

    safeWorkspaceId;

  const currentMode =

    selectedWorkspace?.mode ??

    activeMode ??

    "personal";

  const sidebarWorkspaces =

    useMemo<

      WorkspaceSidebarItem[]

    >(

      () =>

        allWorkspaces.map(

          (workspace) => ({

            id: String(

              workspace.id,

            ),

            name:

              getWorkspaceTitle(

                workspace,

              ),

            mode: workspace.mode,

            role: workspace.role,

            childCount:

              getWorkspaceSubProjectCount(

                workspace,

              ),

          }),

        ),

      [allWorkspaces],

    );

  const handleSelectSidebarWorkspace = (

    workspace: WorkspaceSidebarItem,

  ) => {

    router.push(

      `/dashboard/${encodeURIComponent(

        workspace.id,

      )}?mode=${workspace.mode}`,

    );

  };

  const isProjectMode = Boolean(safeWorkspaceId);

  // 확인할 작업·팀원·최근 활동·자료실은 프로젝트 화면에서만 따로 불러온다.
  // 기존 진행률·월간 흐름 로딩과 분리해 두어 이 쪽이 실패해도 위 영역은 그대로 보인다.
  const [overview, setOverview] = useState<ProjectOverview | null>(null);

  const [overviewLoading, setOverviewLoading] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadOverview() {
      setOverview(null);

      if (!safeWorkspaceId || !selectedWorkspace) {
        setOverviewLoading(false);

        return;
      }

      setOverviewLoading(true);

      try {
        const result = await loadProjectOverview(selectedWorkspace);

        if (!ignore) setOverview(result);
      } finally {
        if (!ignore) setOverviewLoading(false);
      }
    }

    loadOverview();

    return () => {
      ignore = true;
    };
  }, [safeWorkspaceId, selectedWorkspace]);

  const sectionLoading = isLoading || overviewLoading;

  return (
    <main className="waivs-page min-h-full px-4 py-5 font-sans md:px-6 md:py-6">
      <div className="mx-auto max-w-[1840px] space-y-4">
        {/* ===================== 상단: 프로젝트 정보 · 통계 ===================== */}
        <DashboardHero
          isProjectMode={isProjectMode}
          workspace={selectedWorkspace}
          workspaceId={currentWorkspaceId}
          mode={currentMode}
          progress={projectProgress}
          doneScheduleCount={doneScheduleCount}
          totalScheduleCount={totalScheduleCount}
          switcher={
            <ProjectSwitcher
              label={
                isProjectMode
                  ? isLoading
                    ? "프로젝트 불러오는 중"
                    : selectedProjectName
                  : "WAIVS"
              }
              workspaces={sidebarWorkspaces}
              selectedWorkspaceId={currentWorkspaceId ?? ""}
              loading={isLoading}
              errorMessage={errorMessage}
              onSelectWorkspace={handleSelectSidebarWorkspace}
            />
          }
        />

        <SummaryCards stats={summaryStats} />

        {isProjectMode ? (
          <>
            {/* ===================== 중단 1: 확인할 작업 · 팀원 · 바로 가기 ===================== */}
            <div className="grid items-start gap-4 lg:grid-cols-2 xl:grid-cols-12">
              <TaskFocusPanel
                className="lg:col-span-2 xl:col-span-6"
                loading={sectionLoading}
                errorMessage={errorMessage}
                schedules={overview?.schedules}
                members={overview?.members}
                workspaceId={currentWorkspaceId}
                mode={currentMode}
              />

              <TeamPanel
                className="xl:col-span-3"
                loading={sectionLoading}
                members={overview?.members}
                workspaceId={currentWorkspaceId}
                mode={currentMode}
              />

              <QuickLinksPanel
                className="xl:col-span-3"
                workspaceId={currentWorkspaceId}
                mode={currentMode}
              />
            </div>

            {/* ===================== 중단 2: 최근 활동 · 자료실 ===================== */}
            <div className="grid items-start gap-4 xl:grid-cols-12">
              <ActivityPanel
                className="xl:col-span-7"
                loading={sectionLoading}
                overview={overview}
                workspaceId={currentWorkspaceId}
                mode={currentMode}
              />

              <ArchivePanel
                className="xl:col-span-5"
                loading={sectionLoading}
                overview={overview}
                workspaceId={currentWorkspaceId}
                mode={currentMode}
              />
            </div>
          </>
        ) : (
          <section className="rounded-md border border-gray-200 bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3.5">
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-gray-900">
                  최근 프로젝트
                </h2>

                <p className="mt-0.5 truncate text-xs text-gray-500">
                  최근에 수정한 최상위 프로젝트만 빠르게 확인하세요.
                </p>
              </div>
            </div>

            <div className="bg-[#FAFBFF] p-4">
              {isLoading ? (
                <p className="py-14 text-center text-xs text-gray-400">
                  프로젝트를 불러오는 중입니다.
                </p>
              ) : errorMessage ? (
                <p className="rounded-md bg-red-50 py-14 text-center text-xs text-red-500">
                  {errorMessage}
                </p>
              ) : recentProjects.length === 0 ? (
                <p className="py-14 text-center text-xs text-gray-400">
                  표시할 프로젝트가 없습니다.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {recentProjects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ===================== 하단: 월간 달력 · 날짜별 상세 ===================== */}
        <MonthlyWorkFlowSection
          isLoading={isLoading}
          items={workFlowItems}
          selectedDateKey={selectedDateKey}
          onSelectDate={setSelectedDateKey}
          workspaceId={currentWorkspaceId}
          mode={currentMode}
          isProjectMode={isProjectMode}
          projectName={selectedProjectName}
        />
      </div>
    </main>
  );
}

/* =========================================================
   공통 조각
========================================================= */
const DAY_MS = 86_400_000;

function formatShortDate(dateKey: string) {
  const [, month, day] = dateKey.split("-");

  return month && day
    ? `${Number(month)}/${Number(day)}`
    : dateKey;
}

function daysBetween(fromKey: string, toKey: string) {
  const diff = Math.round(
    (new Date(`${toKey}T00:00:00`).getTime() -
      new Date(`${fromKey}T00:00:00`).getTime()) /
      DAY_MS,
  );

  return Number.isNaN(diff) ? null : diff;
}

function formatRelativeTime(time: number) {
  const diff = Date.now() - time;

  if (diff < 60_000) return "방금";

  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}분 전`;

  if (diff < DAY_MS) return `${Math.floor(diff / 3_600_000)}시간 전`;

  if (diff < DAY_MS * 7) return `${Math.floor(diff / DAY_MS)}일 전`;

  const date = new Date(time);

  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function PanelHeader({
  icon: Icon,
  iconTone,
  title,
  count,
  description,
  action,
}: {
  icon: LucideIcon;
  iconTone: string;
  title: string;
  count?: number;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-3.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${iconTone}`}
        >
          <Icon size={16} strokeWidth={2.2} />
        </span>

        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
            {title}

            {typeof count === "number" ? (
              <span className="rounded-full bg-gray-900 px-1.5 py-px text-[10px] font-bold tabular-nums text-white">
                {count}
              </span>
            ) : null}
          </h2>

          {description ? (
            <p className="mt-0.5 truncate text-[11px] text-gray-500">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      {action}
    </div>
  );
}

function PanelMessage({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "error";
}) {
  return (
    <p
      className={`px-5 py-10 text-center text-xs ${
        tone === "error" ? "text-red-500" : "text-gray-400"
      }`}
    >
      {children}
    </p>
  );
}

function HeaderLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold text-gray-500 transition-colors hover:bg-[#F2F5FF] hover:text-[#5873F9]"
    >
      {children}
      <ArrowRight size={12} strokeWidth={2.4} />
    </Link>
  );
}

/* =========================================================
   HERO: 프로젝트 전환 + 프로젝트 정보 + 주요 이동
========================================================= */
function DashboardHero({
  isProjectMode,
  workspace,
  workspaceId,
  mode,
  progress,
  doneScheduleCount,
  totalScheduleCount,
  switcher,
}: {
  isProjectMode: boolean;
  workspace: WorkspaceListResponse | null;
  workspaceId: string;
  mode: WorkspaceMode;
  progress: number;
  doneScheduleCount: number;
  totalScheduleCount: number;
  switcher: ReactNode;
}) {
  const isTeam = mode === "team";

  const safeProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <section className="rounded-md border border-gray-200 bg-white">
      {/* 브랜드색 띠로 화면의 시작점을 잡는다 */}
      <div className="h-1 rounded-t-md bg-[#5873F9]" />

      <div className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6 md:py-5">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            <LayoutDashboard size={12} strokeWidth={2.4} />
            {isProjectMode
              ? `${isTeam ? "Team" : "Personal"} workspace`
              : "Dashboard"}
          </p>

          <div className="mt-1">{switcher}</div>

          {isProjectMode && workspace ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono font-medium text-gray-600">
                <FolderTree size={12} />
                {getWorkspaceTechLabel(workspace)}
              </span>

              <span
                className={`rounded border px-1.5 py-0.5 font-semibold ${
                  isTeam
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-blue-200 bg-blue-50 text-blue-700"
                }`}
              >
                {isTeam ? "Team" : "Personal"}
              </span>

              <span className="rounded border border-[#D9E1FF] bg-[#EEF2FF] px-1.5 py-0.5 font-semibold text-[#5873F9]">
                {workspace.role === "owner" ? "Owner" : "Member"}
              </span>

              <span className="pl-1 text-gray-400">
                최근 수정{" "}
                <span className="font-mono text-gray-500">
                  {workspace.updatedAt || "-"}
                </span>
              </span>
            </div>
          ) : (
            <p className="mt-1.5 text-xs text-gray-500">
              프로젝트 구조 중심 협업을 위한 웹 IDE 플랫폼 · 프로젝트 이름을
              눌러 이동할 수 있어요.
            </p>
          )}
        </div>

        <div className="flex w-full shrink-0 flex-col gap-4 md:w-auto lg:flex-row lg:items-center lg:gap-6">
          {isProjectMode && workspace ? (
            <div className="w-full lg:w-64">
              <div className="flex items-end justify-between">
                <span className="text-[11px] font-semibold text-gray-500">
                  일정 진행률
                </span>

                <span className="text-lg font-bold leading-none tabular-nums text-[#5873F9]">
                  {safeProgress}
                  <span className="ml-0.5 text-xs">%</span>
                </span>
              </div>

              <div
                className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#E4E9FF]"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={safeProgress}
                aria-label="일정 진행률"
              >
                <div
                  className="h-full rounded-full bg-[#5873F9] transition-all duration-500"
                  style={{ width: `${safeProgress}%` }}
                />
              </div>

              <p className="mt-1 text-right text-[11px] tabular-nums text-gray-400">
                완료 {doneScheduleCount} / 전체 {totalScheduleCount}
              </p>
            </div>
          ) : null}

          <div className="flex items-center gap-2 lg:border-l lg:border-gray-100 lg:pl-6">
          {isProjectMode && workspace ? (
            <Link
              href={`/dashboard/${encodeURIComponent(
                workspace.id,
              )}/settings?mode=${workspace.mode}`}
              aria-label="프로젝트 설정"
              title="프로젝트 설정"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-gray-200 bg-white text-gray-500 transition-colors hover:border-[#AAB8FF] hover:text-[#5873F9]"
            >
              <Settings2 size={16} />
            </Link>
          ) : null}

          <Link
            href="/projects"
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-gray-200 bg-white px-3.5 text-xs font-semibold text-gray-700 transition-colors hover:border-[#AAB8FF] hover:text-[#5873F9] md:flex-none"
          >
            전체 프로젝트
          </Link>

          <Link
            href={getIdeHref(workspaceId, mode)}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md bg-[#5873F9] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#4863E8] md:flex-none"
          >
            <Code2 size={15} strokeWidth={2.2} />
            작업하러 가기
          </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   확인할 작업: 이 프로젝트의 미완료 일정 (기간 제한 없음)
========================================================= */
const VISIBLE_TASK_COUNT = 6;

type TaskUrgency = "overdue" | "soon" | "progress" | "todo";

const TASK_URGENCY_ORDER: Record<TaskUrgency, number> = {
  overdue: 0,
  soon: 1,
  progress: 2,
  todo: 3,
};

// 지연 상태이거나 마감이 지난 일정 → 3일 안에 마감 → 진행 중 → 할 일 순.
function getTaskUrgency(
  schedule: OverviewSchedule,
  daysLeft: number | null,
): TaskUrgency {
  if (schedule.status === "delayed" || (daysLeft !== null && daysLeft < 0)) {
    return "overdue";
  }

  if (daysLeft !== null && daysLeft <= 3) return "soon";

  return schedule.status === "progress" ? "progress" : "todo";
}

function TaskFocusPanel({
  className,
  loading,
  errorMessage,
  schedules,
  members,
  workspaceId,
  mode,
}: {
  className: string;
  loading: boolean;
  errorMessage: string;
  schedules: OverviewSchedule[] | null | undefined;
  members: ProjectOverview["members"] | undefined;
  workspaceId: string;
  mode: WorkspaceMode;
}) {
  const todayKey = formatDateKey(new Date());

  // 일정에 이름 없이 담당자 번호만 온 경우 팀원 목록에서 이름을 찾는다(일정 관리 화면과 같은 방식).
  const getAssigneeName = (schedule: OverviewSchedule) =>
    schedule.assigneeName ||
    (Array.isArray(members)
      ? members.find((member) => member.userId === schedule.assigneeUserId)
          ?.name
      : "") ||
    "";

  const tasks = (schedules ?? [])
    .filter((schedule) => schedule.status !== "done")
    .map((schedule) => {
      const daysLeft = schedule.endKey
        ? daysBetween(todayKey, schedule.endKey)
        : null;

      return {
        schedule,
        daysLeft,
        urgency: getTaskUrgency(schedule, daysLeft),
      };
    })
    .sort(
      (a, b) =>
        TASK_URGENCY_ORDER[a.urgency] - TASK_URGENCY_ORDER[b.urgency] ||
        (a.schedule.endKey || "9999").localeCompare(
          b.schedule.endKey || "9999",
        ),
    );

  const counts = tasks.reduce<Record<TaskUrgency, number>>(
    (acc, task) => {
      acc[task.urgency] += 1;

      return acc;
    },
    { overdue: 0, soon: 0, progress: 0, todo: 0 },
  );

  const visibleTasks = tasks.slice(0, VISIBLE_TASK_COUNT);

  const scheduleHref = getScheduleHref(workspaceId, mode);

  const summaryChips: Array<{ key: TaskUrgency; label: string; tone: string }> =
    [
      {
        key: "overdue",
        label: "지연·기한 지남",
        tone: "border-rose-200 bg-rose-50 text-rose-700",
      },
      {
        key: "soon",
        label: "3일 내 마감",
        tone: "border-amber-200 bg-amber-50 text-amber-700",
      },
      {
        key: "progress",
        label: "진행 중",
        tone: SCHEDULE_STATUS_META.progress.badge,
      },
    ];

  return (
    <section
      className={`min-w-0 rounded-md border border-gray-200 bg-white ${className}`}
    >
      <PanelHeader
        icon={ListChecks}
        iconTone="bg-[#5873F9] text-white"
        title="확인할 작업"
        count={schedules ? tasks.length : undefined}
        description="이 프로젝트의 미완료 일정 · 지연과 임박한 일정부터"
        action={<HeaderLink href={scheduleHref}>일정 관리</HeaderLink>}
      />

      {loading ? (
        <PanelMessage>확인할 작업을 불러오는 중입니다.</PanelMessage>
      ) : errorMessage ? (
        <PanelMessage tone="error">{errorMessage}</PanelMessage>
      ) : !schedules ? (
        <PanelMessage tone="error">일정을 불러오지 못했습니다.</PanelMessage>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-5 py-10 text-center">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={20} />
          </span>

          <p className="text-xs font-semibold text-gray-700">
            남은 일정이 없어요
          </p>

          <Link
            href={scheduleHref}
            className="text-[11px] font-semibold text-[#5873F9] hover:underline"
          >
            일정 관리에서 새 일정 등록하기
          </Link>
        </div>
      ) : (
        <div className="p-3">
          <div className="mb-2.5 flex flex-wrap gap-1.5 px-1">
            {summaryChips.map((chip) => (
              <span
                key={chip.key}
                className={`rounded border px-1.5 py-0.5 text-[11px] font-semibold ${
                  counts[chip.key] > 0
                    ? chip.tone
                    : "border-gray-100 bg-white text-gray-300"
                }`}
              >
                {chip.label}{" "}
                <span className="tabular-nums">{counts[chip.key]}</span>
              </span>
            ))}
          </div>

          <ul className="space-y-1.5">
            {visibleTasks.map(({ schedule, daysLeft, urgency }) => {
              const assigneeName = getAssigneeName(schedule);

              const meta = SCHEDULE_STATUS_META[schedule.status];

              const accent =
                urgency === "overdue"
                  ? "bg-rose-500"
                  : urgency === "soon"
                    ? "bg-amber-500"
                    : meta.bar;

              const dueText =
                daysLeft === null
                  ? "마감 없음"
                  : daysLeft < 0
                    ? `${-daysLeft}일 지남`
                    : daysLeft === 0
                      ? "오늘 마감"
                      : `D-${daysLeft}`;

              const dueTone =
                urgency === "overdue"
                  ? "text-rose-600"
                  : urgency === "soon"
                    ? "text-amber-600"
                    : "text-gray-400";

              return (
                <li key={schedule.id}>
                  <Link
                    href={scheduleHref}
                    className="group relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-md border border-gray-200 bg-white py-2.5 pl-4 pr-3 transition-colors hover:border-[#AAB8FF] hover:bg-[#F7F9FF] sm:grid-cols-[minmax(0,1fr)_64px_104px]"
                  >
                    <span
                      className={`absolute inset-y-0 left-0 w-[3px] ${accent}`}
                    />

                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-gray-900 group-hover:text-[#4058D6]">
                        {schedule.title}
                      </p>

                      <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-gray-400">
                        {assigneeName ? (
                          <>
                            <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#EEF2FF] text-[9px] font-bold text-[#4058D6]">
                              {assigneeName.slice(0, 1).toUpperCase()}
                            </span>

                            <span className="truncate text-gray-600">
                              {assigneeName}
                            </span>
                          </>
                        ) : (
                          <span>담당자 미지정</span>
                        )}
                      </p>
                    </div>

                    <span
                      className={`rounded border px-1.5 py-0.5 text-center text-[11px] font-semibold sm:px-0 ${meta.badge}`}
                    >
                      {meta.label}
                    </span>

                    <div className="col-span-2 flex items-center justify-between gap-2 sm:col-span-1 sm:block sm:text-right">
                      <p className="font-mono text-xs font-medium text-gray-700">
                        {schedule.startKey && schedule.startKey !== schedule.endKey
                          ? `${formatShortDate(schedule.startKey)}–${formatShortDate(
                              schedule.endKey,
                            )}`
                          : formatShortDate(schedule.endKey) || "-"}
                      </p>

                      <p
                        className={`font-mono text-[10px] font-bold sm:mt-0.5 ${dueTone}`}
                      >
                        {dueText}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          {tasks.length > visibleTasks.length ? (
            <Link
              href={scheduleHref}
              className="mt-2 flex h-8 items-center justify-center gap-1 rounded-md text-[11px] font-semibold text-gray-500 transition-colors hover:bg-gray-50 hover:text-[#5873F9]"
            >
              외 {tasks.length - visibleTasks.length}개 일정 더 보기
              <ArrowRight size={12} />
            </Link>
          ) : null}
        </div>
      )}
    </section>
  );
}

/* =========================================================
   팀원: 멤버 API 의 이름·이메일·역할만 쓴다 (온라인 상태 등은 없음)
========================================================= */
const VISIBLE_MEMBER_COUNT = 6;

const AVATAR_TONES = [
  "bg-[#EEF2FF] text-[#4058D6]",
  "bg-emerald-50 text-emerald-700",
  "bg-amber-50 text-amber-700",
  "bg-purple-50 text-purple-700",
  "bg-sky-50 text-sky-700",
  "bg-rose-50 text-rose-700",
];

function TeamPanel({
  className,
  loading,
  members,
  workspaceId,
  mode,
}: {
  className: string;
  loading: boolean;
  members: ProjectOverview["members"] | undefined;
  workspaceId: string;
  mode: WorkspaceMode;
}) {
  const settingsHref = `/dashboard/${encodeURIComponent(
    workspaceId,
  )}/settings?mode=${mode}`;

  const list: OverviewMember[] = Array.isArray(members) ? members : [];

  const visibleMembers = list.slice(0, VISIBLE_MEMBER_COUNT);

  return (
    <section
      className={`min-w-0 rounded-md border border-gray-200 bg-white ${className}`}
    >
      <PanelHeader
        icon={UsersRound}
        iconTone="bg-emerald-50 text-emerald-600"
        title="팀원"
        count={Array.isArray(members) ? list.length : undefined}
        action={
          mode === "team" ? (
            <HeaderLink href={settingsHref}>팀원 관리</HeaderLink>
          ) : undefined
        }
      />

      {loading ? (
        <PanelMessage>팀원을 불러오는 중입니다.</PanelMessage>
      ) : members === "personal" || mode !== "team" ? (
        <PanelMessage>
          개인 프로젝트예요. 팀원 기능은 팀 프로젝트에서 사용할 수 있어요.
        </PanelMessage>
      ) : !Array.isArray(members) ? (
        <PanelMessage tone="error">팀원 목록을 불러오지 못했습니다.</PanelMessage>
      ) : list.length === 0 ? (
        <PanelMessage>참여 중인 팀원이 없습니다.</PanelMessage>
      ) : (
        <ul className="p-2">
          {visibleMembers.map((member) => (
            <li
              key={member.userId}
              className="group flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-gray-50"
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
                  AVATAR_TONES[member.userId % AVATAR_TONES.length]
                }`}
                aria-hidden
              >
                {member.name.slice(0, 1).toUpperCase()}
              </span>

              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5">
                  <span className="truncate text-[13px] font-semibold text-gray-900">
                    {member.name}
                  </span>

                  <span
                    className={`shrink-0 rounded px-1 py-px text-[10px] font-bold ${
                      member.isOwner
                        ? "bg-[#EEF2FF] text-[#5873F9]"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {member.isOwner ? "OWNER" : "MEMBER"}
                  </span>
                </p>

                <p className="truncate text-[11px] text-gray-400">
                  {member.email || "-"}
                </p>
              </div>

              {/* 메시지 화면이 ?workspace=&member= 로 그 팀원과의 대화를 바로 연다 */}
              <Link
                href={`/messages?workspace=${encodeURIComponent(
                  workspaceId,
                )}&member=${member.userId}&mode=team`}
                aria-label={`${member.name}에게 메시지`}
                title="메시지 보내기"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-gray-300 transition-colors hover:bg-white hover:text-[#5873F9] group-hover:text-gray-500"
              >
                <MessageSquare size={14} />
              </Link>
            </li>
          ))}

          {list.length > visibleMembers.length ? (
            <li>
              <Link
                href={settingsHref}
                className="mt-1 flex h-8 items-center justify-center gap-1 rounded-md text-[11px] font-semibold text-gray-500 transition-colors hover:bg-gray-50 hover:text-[#5873F9]"
              >
                외 {list.length - visibleMembers.length}명 더 보기
                <ArrowRight size={12} />
              </Link>
            </li>
          ) : null}
        </ul>
      )}
    </section>
  );
}

/* =========================================================
   바로 가기
========================================================= */
function QuickLinksPanel({
  className,
  workspaceId,
  mode,
}: {
  className: string;
  workspaceId: string;
  mode: WorkspaceMode;
}) {
  // IDE 는 상단 "작업하러 가기", 자료실·AI 보고서는 아래 자료실 영역에서 이동한다.
  const quickLinks: Array<{
    href: string;
    label: string;
    description: string;
    icon: LucideIcon;
    tone: string;
  }> = [
    {
      href: getScheduleHref(workspaceId, mode),
      label: "일정 관리",
      description: "일정 등록과 진행 상태 변경",
      icon: CalendarDays,
      tone: "bg-[#EEF2FF] text-[#5873F9]",
    },
    {
      href: getDevlogHref(workspaceId, mode),
      label: "개발일지",
      description: "작업 기록 작성과 이어 쓰기",
      icon: BookOpenText,
      tone: "bg-purple-50 text-purple-600",
    },
    {
      href: `/design/${encodeURIComponent(workspaceId)}?mode=${mode}`,
      label: "설계 관리",
      description: "요구사항 · API 명세 · ERD",
      icon: PenTool,
      tone: "bg-sky-50 text-sky-600",
    },
  ];

  if (mode === "team") {
    quickLinks.push({
      href: `/messages?workspace=${encodeURIComponent(workspaceId)}&mode=team`,
      label: "팀 채팅",
      description: "프로젝트 팀원과 대화",
      icon: MessageSquare,
      tone: "bg-emerald-50 text-emerald-600",
    });
  }

  return (
    <nav
      aria-label="바로 가기"
      className={`min-w-0 rounded-md border border-gray-200 bg-white ${className}`}
    >
      <p className="border-b border-gray-100 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        바로 가기
      </p>

      <ul className="p-2">
        {quickLinks.map(({ href, label, description, icon: Icon, tone }) => (
          <li key={label}>
            <Link
              href={href}
              className="group flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-[#F7F9FF]"
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${tone}`}
              >
                <Icon size={17} strokeWidth={2} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-gray-900 group-hover:text-[#4058D6]">
                  {label}
                </span>

                <span className="mt-0.5 block truncate text-[11px] text-gray-500">
                  {description}
                </span>
              </span>

              <ArrowRight
                size={14}
                strokeWidth={2.2}
                className="shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-[#5873F9]"
              />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* =========================================================
   최근 활동: 일정·개발일지·설계·Git 기록을 시간순으로
========================================================= */
const VISIBLE_ACTIVITY_COUNT = 8;

const ACTIVITY_META: Record<
  ActivityKind,
  { label: string; icon: LucideIcon; tone: string; text: string }
> = {
  schedule: {
    label: "일정",
    icon: CalendarDays,
    tone: "bg-[#EEF2FF] text-[#5873F9]",
    text: "text-[#4058D6]",
  },
  devlog: {
    label: "개발일지",
    icon: BookOpenText,
    tone: "bg-purple-50 text-purple-600",
    text: "text-purple-700",
  },
  design: {
    label: "설계",
    icon: PenTool,
    tone: "bg-sky-50 text-sky-600",
    text: "text-sky-700",
  },
  commit: {
    label: "Git",
    icon: GitCommitHorizontal,
    tone: "bg-gray-900 text-white",
    text: "text-gray-900",
  },
};

function ActivityPanel({
  className,
  loading,
  overview,
  workspaceId,
  mode,
}: {
  className: string;
  loading: boolean;
  overview: ProjectOverview | null;
  workspaceId: string;
  mode: WorkspaceMode;
}) {
  const [filter, setFilter] = useState<ActivityKind | "all">("all");

  const activity = useMemo(
    () => (overview ? buildActivity(overview) : []),
    [overview],
  );

  const filtered =
    filter === "all"
      ? activity
      : activity.filter((item) => item.kind === filter);

  const visible = filtered.slice(0, VISIBLE_ACTIVITY_COUNT);

  const hrefByKind: Record<ActivityKind, string> = {
    schedule: getScheduleHref(workspaceId, mode),
    devlog: getDevlogHref(workspaceId, mode),
    design: `/design/${encodeURIComponent(workspaceId)}?mode=${mode}`,
    commit: getIdeHref(workspaceId, mode),
  };

  // 불러오지 못한 영역은 "활동 없음"과 구분해 알려 준다.
  const failedSources = overview
    ? [
        !overview.schedules && "일정",
        !overview.devlogs && "개발일지",
        !overview.design && "설계",
        !overview.commits && "Git",
      ].filter(Boolean)
    : [];

  const tabs: Array<ActivityKind | "all"> = [
    "all",
    "schedule",
    "devlog",
    "design",
    "commit",
  ];

  return (
    <section
      className={`min-w-0 rounded-md border border-gray-200 bg-white ${className}`}
    >
      <PanelHeader
        icon={Activity}
        iconTone="bg-gray-900 text-white"
        title="최근 프로젝트 활동"
        description="일정 · 개발일지 · 설계 문서 · Git 커밋 기록"
        action={
          <div className="flex flex-wrap gap-1 rounded-md bg-gray-100 p-0.5">
            {tabs.map((tab) => {
              const count =
                tab === "all"
                  ? activity.length
                  : activity.filter((item) => item.kind === tab).length;

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={`h-7 rounded px-2 text-[11px] font-semibold transition-colors ${
                    filter === tab
                      ? "bg-white text-[#5873F9]"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {tab === "all" ? "전체" : ACTIVITY_META[tab].label}
                  <span className="ml-1 tabular-nums text-gray-400">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        }
      />

      {loading ? (
        <PanelMessage>최근 활동을 불러오는 중입니다.</PanelMessage>
      ) : visible.length === 0 ? (
        <PanelMessage>
          {filter === "all"
            ? "아직 기록된 활동이 없습니다."
            : `${ACTIVITY_META[filter].label} 활동이 없습니다.`}
        </PanelMessage>
      ) : (
        <ol className="relative px-5 py-3 before:absolute before:bottom-6 before:left-[35px] before:top-6 before:w-px before:bg-gray-100">
          {visible.map((item) => {
            const meta = ACTIVITY_META[item.kind];

            const Icon = meta.icon;

            return (
              <li key={item.id}>
                <Link
                  href={hrefByKind[item.kind]}
                  className="group relative -mx-2 flex items-start gap-3 rounded-md px-2 py-2 transition-colors hover:bg-[#F7F9FF]"
                >
                  <span
                    className={`relative z-10 mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md ${meta.tone}`}
                  >
                    <Icon size={14} strokeWidth={2.2} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="flex min-w-0 items-baseline gap-2">
                      <span
                        className={`shrink-0 text-[11px] font-bold ${meta.text}`}
                      >
                        {item.action}
                      </span>

                      <span className="truncate text-[13px] font-semibold text-gray-900 group-hover:text-[#4058D6]">
                        {item.title}
                      </span>
                    </p>

                    {item.detail || item.actor ? (
                      <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-gray-400">
                        {item.actor ? (
                          <span className="shrink-0 font-semibold text-gray-600">
                            {item.actor}
                          </span>
                        ) : null}

                        {item.actor && item.detail ? (
                          <span className="text-gray-300">·</span>
                        ) : null}

                        {item.detail ? (
                          <span
                            className={`truncate ${
                              item.kind === "commit" ? "font-mono" : ""
                            }`}
                          >
                            {item.detail}
                          </span>
                        ) : null}
                      </p>
                    ) : null}
                  </div>

                  <time
                    dateTime={new Date(item.time).toISOString()}
                    title={new Date(item.time).toLocaleString("ko-KR")}
                    className="shrink-0 pt-0.5 font-mono text-[11px] text-gray-400"
                  >
                    {formatRelativeTime(item.time)}
                  </time>
                </Link>
              </li>
            );
          })}
        </ol>
      )}

      {!loading && failedSources.length > 0 ? (
        <p className="border-t border-gray-100 px-5 py-2 text-[11px] text-amber-600">
          {failedSources.join(" · ")} 기록을 불러오지 못해 빠져 있어요.
        </p>
      ) : null}
    </section>
  );
}

/* =========================================================
   자료실: 이 프로젝트 자료실에 모이는 문서 현황
========================================================= */
function ArchivePanel({
  className,
  loading,
  overview,
  workspaceId,
  mode,
}: {
  className: string;
  loading: boolean;
  overview: ProjectOverview | null;
  workspaceId: string;
  mode: WorkspaceMode;
}) {
  const archiveHref = getArchiveHref(workspaceId, mode);

  const design = overview?.design;

  const devlogs = overview?.devlogs;

  const latest = (times: number[]) =>
    times.reduce((max, time) => (time > max ? time : max), 0);

  const rows: Array<{
    key: string;
    label: string;
    type: string;
    icon: LucideIcon;
    tone: string;
    value: string | null;
    updatedAt: number;
    href: string;
  }> = [
    {
      key: "devlog",
      label: "개발일지",
      type: "기록",
      icon: BookOpenText,
      tone: "bg-purple-50 text-purple-600",
      value: devlogs ? `${devlogs.length}건` : null,
      updatedAt: devlogs ? latest(devlogs.map((item) => item.time)) : 0,
      href: archiveHref,
    },
    {
      key: "requirements",
      label: "요구사항 명세",
      type: "설계",
      icon: FileCode2,
      tone: "bg-sky-50 text-sky-600",
      value: design ? `${design.requirements.length}건` : null,
      updatedAt: design
        ? latest(
            design.requirements.map(
              (item) => item.updatedAt || item.createdAt,
            ),
          )
        : 0,
      href: archiveHref,
    },
    {
      key: "api",
      label: "API 명세",
      type: "설계",
      icon: Network,
      tone: "bg-sky-50 text-sky-600",
      value: design ? `${design.apiSpecs.length}건` : null,
      updatedAt: design
        ? latest(
            design.apiSpecs.map((item) => item.updatedAt || item.createdAt),
          )
        : 0,
      href: archiveHref,
    },
    {
      key: "erd",
      label: "ERD",
      type: "다이어그램",
      icon: Database,
      tone: "bg-amber-50 text-amber-600",
      value: design ? `엔티티 ${design.erdNodeCount}개` : null,
      updatedAt: design?.documentUpdatedAt ?? 0,
      href: archiveHref,
    },
    {
      key: "flow",
      label: "화면 흐름도",
      type: "다이어그램",
      icon: Workflow,
      tone: "bg-amber-50 text-amber-600",
      value: design ? `화면 ${design.flowNodeCount}개` : null,
      updatedAt: design?.documentUpdatedAt ?? 0,
      href: archiveHref,
    },
  ];

  return (
    <section
      className={`min-w-0 rounded-md border border-gray-200 bg-white ${className}`}
    >
      <PanelHeader
        icon={FolderTree}
        iconTone="bg-amber-50 text-amber-600"
        title="자료실"
        description="이 프로젝트에 쌓인 기록과 설계 문서"
        action={<HeaderLink href={archiveHref}>자료실 열기</HeaderLink>}
      />

      {loading ? (
        <PanelMessage>자료실 정보를 불러오는 중입니다.</PanelMessage>
      ) : (
        <>
          <div className="hidden grid-cols-[minmax(0,1fr)_72px_96px_72px] gap-3 px-5 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400 sm:grid">
            <span>문서</span>
            <span>유형</span>
            <span className="text-right">분량</span>
            <span className="text-right">수정</span>
          </div>

          <ul className="px-2 pb-2 pt-1 sm:pt-0">
            {rows.map(({ key, label, type, icon: Icon, tone, value, updatedAt, href }) => (
              <li key={key}>
                <Link
                  href={href}
                  className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-[#F7F9FF] sm:grid-cols-[minmax(0,1fr)_72px_96px_72px]"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-md ${tone}`}
                    >
                      <Icon size={14} strokeWidth={2.2} />
                    </span>

                    <span className="truncate text-[13px] font-semibold text-gray-900 group-hover:text-[#4058D6]">
                      {label}
                    </span>
                  </span>

                  <span className="hidden text-[11px] text-gray-500 sm:block">
                    {type}
                  </span>

                  <span
                    className={`text-right text-xs font-semibold tabular-nums ${
                      value ? "text-gray-700" : "text-red-400"
                    }`}
                  >
                    {value ?? "불러오기 실패"}
                  </span>

                  <span className="hidden text-right font-mono text-[11px] text-gray-400 sm:block">
                    {updatedAt ? formatRelativeTime(updatedAt) : "-"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3 border-t border-gray-100 bg-[#FAFBFF] px-5 py-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-[#5873F9] text-white">
              <Sparkles size={15} />
            </span>

            <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-gray-500">
              자료실에서 개발일지와 설계 문서를 모아{" "}
              <strong className="font-semibold text-gray-800">
                AI 최종 보고서
              </strong>
              를 만들 수 있어요.
            </p>

            <Link
              href={archiveHref}
              className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-[#5873F9] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#4863E8]"
            >
              보고서 만들기
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
