"use client";

import Link from "next/link";

import { useParams, useRouter, useSearchParams } from "next/navigation";

import { useEffect, useMemo, useState } from "react";

import {
  ArrowRight,
  BookOpenText,
  CalendarDays,
  FileText,
  FolderOpen,
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

  SUMMARY_STATS_BASE,

} from "./dashboard.utils";

import { loadMonthlyWorkFlowItems } from "./dashboard.service";

import SummaryCards from "./SummaryCards";

import ProjectCard from "./ProjectCard";

import MonthlyWorkFlowSection from "./MonthlyWorkFlowSection";

import ProjectSidebar, {

  type WorkspaceSidebarItem,

} from "@/components/layout/ProjectSidebar";

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

  return (

    <main className="waivs-page p-4 font-sans md:p-5">

      <div className="mx-auto flex max-w-[1680px] gap-4">

        <ProjectSidebar

          workspaces={

            sidebarWorkspaces

          }

          selectedWorkspaceId={

            currentWorkspaceId ??

            ""

          }

          loading={isLoading}

          errorMessage={

            errorMessage

          }

          onSelectWorkspace={

            handleSelectSidebarWorkspace

          }

          density="compact"

        />

        <div className="min-w-0 flex-1 space-y-3">

          <section className="flex flex-col items-start justify-between gap-3 rounded-md border border-gray-200 bg-white px-5 py-4 md:flex-row md:items-center">

            <div className="min-w-0">

              <h1 className="truncate text-[18px] font-black leading-tight tracking-tight text-[#5873F9]">

                {safeWorkspaceId

                  ? isLoading

                    ? "프로젝트 불러오는 중"

                    : selectedProjectName

                  : "WAIVS"}

              </h1>

              <p className="mt-0.5 truncate text-xs font-medium text-gray-400">

                {safeWorkspaceId

                  ? `${selectedProjectName} 프로젝트 메인`

                  : "프로젝트 구조 중심 협업을 위한 웹 IDE 플랫폼"}

              </p>

            </div>

            <div className="flex w-full items-center gap-2 sm:w-auto">

              <Link

                href="/projects"

                className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 transition-colors hover:border-[#AAB8FF] hover:bg-[#F7F9FF] hover:text-[#5873F9] sm:flex-none"

              >

                전체 프로젝트

                <ArrowRight

                  size={14}

                  strokeWidth={2.2}

                />

              </Link>

              <Link

                href={getIdeHref(

                  currentWorkspaceId,

                  currentMode,

                )}

                className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md bg-[#5873F9] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#4863E8] sm:flex-none"

              >

                작업하러 가기

                <FolderOpen

                  size={14}

                  strokeWidth={2.2}

                />

              </Link>

            </div>

          </section>

          <SummaryCards

            stats={summaryStats}

          />

          {safeWorkspaceId ? (

            <ProjectWorkStatusSection

              isLoading={

                isLoading

              }

              errorMessage={

                errorMessage

              }

              workspace={

                selectedWorkspace

              }

              workspaceId={

                currentWorkspaceId

              }

              mode={currentMode}

              progress={

                projectProgress

              }

              totalScheduleCount={

                totalScheduleCount

              }

              doneScheduleCount={

                doneScheduleCount

              }

              workFlowItems={

                workFlowItems

              }

            />

          ) : (

            // 카드 안에 카드가 겹치지 않도록 바깥 틀 없이 제목과 카드 목록만 둔다
            <section>

              <div className="mb-2.5 flex items-baseline justify-between gap-3">

                <h2 className="text-sm font-bold text-gray-900">

                  최근 프로젝트

                </h2>

                <p className="truncate text-xs text-gray-500">

                  최근에 수정한 최상위 프로젝트만 빠르게 확인하세요.

                </p>

              </div>

              {isLoading ? (

                <div className="flex h-[180px] items-center justify-center rounded-md border border-gray-200 bg-white text-xs text-gray-400">

                  프로젝트를 불러오는 중입니다.

                </div>

              ) : errorMessage ? (

                <div className="flex h-[180px] items-center justify-center rounded-md border border-red-200 bg-red-50 text-xs text-red-500">

                  {errorMessage}

                </div>

              ) : recentProjects.length ===

                0 ? (

                <div className="flex h-[180px] items-center justify-center rounded-md border border-gray-200 bg-white text-xs text-gray-400">

                  표시할 프로젝트가 없습니다.

                </div>

              ) : (

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                  {recentProjects.map(

                    (project) => (

                      <ProjectCard

                        key={

                          project.id

                        }

                        project={

                          project

                        }

                      />

                    ),

                  )}

                </div>

              )}

            </section>

          )}

          <MonthlyWorkFlowSection

            isLoading={isLoading}

            items={workFlowItems}

            selectedDateKey={

              selectedDateKey

            }

            onSelectDate={

              setSelectedDateKey

            }

            workspaceId={

              currentWorkspaceId

            }

            mode={currentMode}

            isProjectMode={Boolean(

              safeWorkspaceId,

            )}

            projectName={

              selectedProjectName

            }

          />

        </div>

      </div>

    </main>

  );

}

type ScheduleStatusKey =
  | "delayed"
  | "progress"
  | "todo"
  | "done";

const SCHEDULE_STATUS_META: Record<
  ScheduleStatusKey,
  { label: string; dot: string; text: string; order: number }
> = {
  delayed: {
    label: "지연",
    dot: "bg-rose-500",
    text: "text-rose-600",
    order: 0,
  },
  progress: {
    label: "진행 중",
    dot: "bg-[#5873F9]",
    text: "text-[#5873F9]",
    order: 1,
  },
  todo: {
    label: "할 일",
    dot: "bg-gray-300",
    text: "text-gray-500",
    order: 2,
  },
  done: {
    label: "완료",
    dot: "bg-emerald-500",
    text: "text-emerald-600",
    order: 3,
  },
};

const VISIBLE_SCHEDULE_COUNT = 4;

const VISIBLE_DEVLOG_COUNT = 3;

// 일정 화면(app/schedules)과 같은 상태 값(todo/progress/done/delayed)을 쓴다.
// 대소문자나 한글 표기로 들어와도 같은 상태로 본다.
function getScheduleStatusKey(
  status?: string | null,
): ScheduleStatusKey {
  const value = String(status ?? "")
    .trim()
    .toLowerCase();

  if (value === "delayed" || value === "지연") return "delayed";

  if (
    value === "progress" ||
    value === "in_progress" ||
    value === "진행 중" ||
    value === "진행중"
  ) {
    return "progress";
  }

  if (value === "done" || value === "완료") return "done";

  return "todo";
}

function formatShortDate(dateKey: string) {
  const [, month, day] = dateKey.split("-");

  return month && day
    ? `${Number(month)}/${Number(day)}`
    : dateKey;
}

type ScheduleSummary = {
  key: string;
  title: string;
  stage?: string | null;
  status: ScheduleStatusKey;
  startKey: string;
  endKey: string;
  href: string;
};

// 월간 작업 흐름은 기간 일정을 날짜마다 한 줄씩 담고 있다(id 끝에 -{dateKey}).
// 목록에는 일정 하나를 한 줄로 보여 주려고 날짜를 걷어낸 id 로 묶는다.
function summarizeSchedules(
  items: WorkFlowItem[],
): ScheduleSummary[] {
  const map = new Map<string, ScheduleSummary>();

  items.forEach((item) => {
    if (item.type !== "schedule") return;

    const suffix = `-${item.dateKey}`;

    const key = item.id.endsWith(suffix)
      ? item.id.slice(0, -suffix.length)
      : item.id;

    const current = map.get(key);

    if (!current) {
      map.set(key, {
        key,
        title: item.title,
        stage: item.stage,
        status: getScheduleStatusKey(item.status),
        startKey: item.dateKey,
        endKey: item.dateKey,
        href: item.href,
      });

      return;
    }

    if (item.dateKey < current.startKey) current.startKey = item.dateKey;

    if (item.dateKey > current.endKey) current.endKey = item.dateKey;
  });

  return [...map.values()];
}

function ProjectWorkStatusSection({
  isLoading,
  errorMessage,
  workspace,
  workspaceId,
  mode,
  progress,
  totalScheduleCount,
  doneScheduleCount,
  workFlowItems,
}: {
  isLoading: boolean;
  errorMessage: string;
  workspace: WorkspaceListResponse | null;
  workspaceId: string;
  mode: WorkspaceMode;
  progress: number;
  totalScheduleCount: number;
  doneScheduleCount: number;
  workFlowItems: WorkFlowItem[];
}) {
  // 지연 → 진행 중 → 할 일 순으로, 같은 상태면 끝나는 날이 가까운 것부터 보여 준다.
  const activeSchedules = summarizeSchedules(workFlowItems)
    .filter((schedule) => schedule.status !== "done")
    .sort(
      (a, b) =>
        SCHEDULE_STATUS_META[a.status].order -
          SCHEDULE_STATUS_META[b.status].order ||
        a.endKey.localeCompare(b.endKey),
    );

  const visibleSchedules = activeSchedules.slice(
    0,
    VISIBLE_SCHEDULE_COUNT,
  );

  const hiddenScheduleCount =
    activeSchedules.length - visibleSchedules.length;

  const recentDevlogs = workFlowItems
    .filter((item) => item.type === "devlog")
    .slice(0, VISIBLE_DEVLOG_COUNT);

  const safeProgress = Math.min(Math.max(progress, 0), 100);

  const projectTech = workspace
    ? getWorkspaceTechLabel(workspace)
    : "-";

  const projectRole =
    workspace?.role === "owner" ? "Owner" : "Member";

  const projectMode =
    workspace?.mode === "team" ? "Team" : "Personal";

  const updatedAt =
    workspace?.updatedAt || "최근 수정일 없음";

  // AIVS 작업 화면은 상단 "작업하러 가기"와 같은 곳으로 가므로 여기에는 두지 않는다.
  const quickLinks = [
    {
      href: getScheduleHref(workspaceId, mode),
      label: "일정 관리",
      icon: CalendarDays,
    },
    {
      href: getDevlogHref(workspaceId, mode),
      label: "개발일지",
      icon: BookOpenText,
    },
    {
      href: getArchiveHref(workspaceId, mode),
      label: "AI 최종 보고서",
      icon: FileText,
    },
  ];

  return (
    <section className="rounded-md border border-gray-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-gray-900">
            프로젝트 작업 현황
          </h2>

          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-gray-500">
            <span>{projectTech}</span>

            <span className="text-gray-300">·</span>

            <span
              className={`font-semibold ${
                mode === "team"
                  ? "text-emerald-700"
                  : "text-blue-700"
              }`}
            >
              {projectMode}
            </span>

            <span className="text-gray-300">·</span>

            <span>{projectRole}</span>

            <span className="text-gray-300">·</span>

            <span className="truncate">최근 수정 {updatedAt}</span>
          </p>
        </div>

        <div className="w-full shrink-0 md:w-60">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-500">
              일정 진행률
            </span>

            <span className="font-bold tabular-nums text-gray-900">
              {doneScheduleCount}/{totalScheduleCount}
              <span className="ml-1.5 text-[#5873F9]">
                {safeProgress}%
              </span>
            </span>
          </div>

          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-[#5873F9] transition-all duration-500"
              style={{
                width: `${safeProgress}%`,
              }}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="px-5 py-12 text-center text-xs text-gray-400">
          프로젝트 작업 현황을 불러오는 중입니다.
        </p>
      ) : errorMessage ? (
        <p className="m-5 rounded-md bg-red-50 px-4 py-10 text-center text-xs text-red-500">
          {errorMessage}
        </p>
      ) : !workspace ? (
        <p className="px-5 py-12 text-center text-xs text-gray-400">
          선택한 프로젝트 정보를 찾을 수 없습니다.
        </p>
      ) : (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="min-w-0 divide-y divide-gray-100">
            <div className="px-5 py-4">
              <StatusListHeader
                title="진행 중인 일정"
                count={activeSchedules.length}
                hint="이번 달 · 지연·진행 중 우선"
              />

              {visibleSchedules.length === 0 ? (
                <p className="py-3 text-xs text-gray-400">
                  이번 달 진행할 일정이 없습니다.
                </p>
              ) : (
                <ul className="mt-1">
                  {visibleSchedules.map((schedule) => {
                    const meta =
                      SCHEDULE_STATUS_META[schedule.status];

                    return (
                      <li key={schedule.key}>
                        <Link
                          href={schedule.href}
                          className="-mx-2 flex h-9 items-center gap-3 rounded-md px-2 transition-colors hover:bg-gray-50"
                        >
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`}
                          />

                          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-gray-900">
                            {schedule.title}
                          </span>

                          {schedule.stage ? (
                            <span className="hidden max-w-[120px] shrink-0 truncate text-xs text-gray-400 sm:inline">
                              {schedule.stage}
                            </span>
                          ) : null}

                          <span
                            className={`w-12 shrink-0 text-right text-xs font-semibold ${meta.text}`}
                          >
                            {meta.label}
                          </span>

                          <span className="w-[76px] shrink-0 text-right text-xs tabular-nums text-gray-500">
                            {schedule.startKey === schedule.endKey
                              ? formatShortDate(schedule.endKey)
                              : `${formatShortDate(
                                  schedule.startKey,
                                )}–${formatShortDate(schedule.endKey)}`}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}

              {hiddenScheduleCount > 0 ? (
                <p className="mt-1 text-xs text-gray-400">
                  외 {hiddenScheduleCount}개 일정
                </p>
              ) : null}
            </div>

            <div className="px-5 py-4">
              <StatusListHeader
                title="최근 개발일지"
                count={recentDevlogs.length}
                hint="이번 달"
              />

              {recentDevlogs.length === 0 ? (
                <p className="py-3 text-xs text-gray-400">
                  작성된 개발일지가 없습니다.
                </p>
              ) : (
                <ul className="mt-1">
                  {recentDevlogs.map((devlog) => (
                    <li key={devlog.id}>
                      <Link
                        href={devlog.href}
                        className="-mx-2 flex h-9 items-center gap-3 rounded-md px-2 transition-colors hover:bg-gray-50"
                      >
                        <span className="h-2 w-2 shrink-0 rounded-full bg-purple-400" />

                        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-gray-900">
                          {devlog.title}
                        </span>

                        {devlog.stage ? (
                          <span className="hidden max-w-[120px] shrink-0 truncate text-xs text-gray-400 sm:inline">
                            {devlog.stage}
                          </span>
                        ) : null}

                        <span className="w-[76px] shrink-0 text-right text-xs tabular-nums text-gray-500">
                          {formatShortDate(devlog.dateKey)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <nav
            aria-label="바로 가기"
            className="border-t border-gray-100 px-5 py-4 lg:border-l lg:border-t-0"
          >
            <p className="text-xs font-semibold text-gray-500">
              바로 가기
            </p>

            <ul className="mt-2">
              {quickLinks.map(
                ({ href, label, icon: Icon }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="-mx-2 flex h-9 items-center gap-2.5 rounded-md px-2 text-[13px] font-semibold text-gray-700 transition-colors hover:bg-[#F7F9FF] hover:text-[#5873F9]"
                    >
                      <Icon
                        size={15}
                        strokeWidth={2}
                        className="shrink-0 text-gray-400"
                      />

                      <span className="flex-1">{label}</span>

                      <ArrowRight
                        size={14}
                        strokeWidth={2.2}
                        className="text-gray-300"
                      />
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </nav>
        </div>
      )}
    </section>
  );
}

function StatusListHeader({
  title,
  count,
  hint,
}: {
  title: string;
  count: number;
  hint: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="text-xs font-semibold text-gray-500">
        {title}
        <span className="ml-1.5 font-bold tabular-nums text-gray-900">
          {count}
        </span>
      </h3>

      <span className="text-[11px] text-gray-400">{hint}</span>
    </div>
  );
}
