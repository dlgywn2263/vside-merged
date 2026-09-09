"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
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
  getAivsHref,
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

function getWorkspaceSubProjectCount(workspace?: WorkspaceListResponse | null) {
  return Array.isArray(workspace?.projects) ? workspace.projects.length : 0;
}

function getWorkspaceTechLabel(workspace?: WorkspaceListResponse | null) {
  return `작업 폴더 ${getWorkspaceSubProjectCount(workspace)}개`;
}

export default function MainDashboard({
  workspaceId,
  mode,
}: MainDashboardProps) {
  const router = useRouter();
  const routeParams = useParams<{ workspaceId?: string | string[] }>();
  const searchParams = useSearchParams();

  const routeWorkspaceId = Array.isArray(routeParams?.workspaceId)
    ? routeParams.workspaceId[0]
    : routeParams?.workspaceId;

  const routeMode = searchParams.get("mode");

  const activeMode: WorkspaceMode | undefined =
    mode ??
    (routeMode === "team" || routeMode === "personal" ? routeMode : undefined);

  const safeWorkspaceId = normalizeWorkspaceId(workspaceId ?? routeWorkspaceId);

  const [allWorkspaces, setAllWorkspaces] = useState<WorkspaceListResponse[]>(
    [],
  );
  const [workspaces, setWorkspaces] = useState<WorkspaceListResponse[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [progressDetailMap, setProgressDetailMap] = useState<
    Record<string, ScheduleProgressResponse>
  >({});
  const [workFlowItems, setWorkFlowItems] = useState<WorkFlowItem[]>([]);
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

        const workspaceData = await getMyWorkspacesByTokenApi();

        const allWorkspaceData: WorkspaceListResponse[] = Array.isArray(
          workspaceData,
        )
          ? workspaceData
          : [];

        const filteredWorkspaces = safeWorkspaceId
          ? allWorkspaceData.filter(
              (workspace) =>
                String(workspace.id) === String(safeWorkspaceId) &&
                (!activeMode || workspace.mode === activeMode),
            )
          : allWorkspaceData;

        const fallbackWorkspaces =
          safeWorkspaceId && filteredWorkspaces.length === 0
            ? allWorkspaceData.filter(
                (workspace) => String(workspace.id) === String(safeWorkspaceId),
              )
            : filteredWorkspaces;

        if (safeWorkspaceId && fallbackWorkspaces.length === 0) {
          throw new Error("선택한 프로젝트를 찾을 수 없습니다.");
        }

        const targetWorkspaces = safeWorkspaceId
          ? fallbackWorkspaces.slice(0, 1)
          : fallbackWorkspaces;

        const [progressResults, monthlyItems] = await Promise.all([
          Promise.allSettled(
            targetWorkspaces.map((workspace) =>
              fetchScheduleProgressApi({
                workspaceId: workspace.id,
              }),
            ),
          ),
          loadMonthlyWorkFlowItems(targetWorkspaces),
        ]);

        const nextProgressMap: Record<string, number> = {};
        const nextProgressDetailMap: Record<string, ScheduleProgressResponse> =
          {};

        progressResults.forEach((result, index) => {
          const workspace = targetWorkspaces[index];

          if (!workspace) return;

          if (result.status === "fulfilled") {
            const progressData = result.value as ScheduleProgressApiResponse;

            const progress = Number(progressData.progressRate ?? 0);
            const totalCount = Number(progressData.total ?? 0);
            const doneCount = Number(progressData.done ?? 0);

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
          setProgressDetailMap(nextProgressDetailMap);
          setWorkFlowItems(monthlyItems);

          if (latestItem?.dateKey) {
            setSelectedDateKey(latestItem.dateKey);
          } else {
            setSelectedDateKey(formatDateKey(new Date()));
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

  const selectedWorkspace = workspaces[0] ?? null;

  const selectedProjectName = selectedWorkspace
    ? getWorkspaceTitle(selectedWorkspace)
    : "프로젝트";

  const selectedProgressDetail = selectedWorkspace
    ? progressDetailMap[selectedWorkspace.id]
    : undefined;

  const projectProgress = selectedWorkspace
    ? (selectedProgressDetail?.progress ?? progressMap[selectedWorkspace.id] ?? 0)
    : 0;

  const totalScheduleCount = selectedProgressDetail?.totalCount ?? 0;
  const doneScheduleCount = selectedProgressDetail?.doneCount ?? 0;
  const remainingScheduleCount = Math.max(
    totalScheduleCount - doneScheduleCount,
    0,
  );

  const projectDevlogCount = safeWorkspaceId
    ? workFlowItems.filter((item) => item.type === "devlog").length
    : 0;

  const personalCount = allWorkspaces.filter(
    (workspace) => workspace.mode === "personal",
  ).length;

  const teamCount = allWorkspaces.filter(
    (workspace) => workspace.mode === "team",
  ).length;

  const summaryStats: SummaryStat[] = safeWorkspaceId
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
          count: remainingScheduleCount,
          label: "진행/대기 일정",
          icon: "todo",
        },
        {
          id: 3,
          title: "완료 일정",
          count: doneScheduleCount,
          label: `전체 ${totalScheduleCount}개 중 완료`,
          icon: "check",
        },
        {
          id: 4,
          title: "개발일지",
          count: projectDevlogCount,
          label: "이번 달 작성 기록",
          icon: "book",
        },
      ]
    : SUMMARY_STATS_BASE.map((stat) => {
        if (stat.id === 1) {
          return {
            ...stat,
            count: personalCount,
          };
        }

        if (stat.id === 2) {
          return {
            ...stat,
            count: teamCount,
          };
        }

        return stat;
      });

  const recentProjects = useMemo<RecentProject[]>(() => {
    return [...workspaces]
      .sort(
        (a, b) =>
          parseLastModified(b.updatedAt) - parseLastModified(a.updatedAt),
      )
      .slice(0, safeWorkspaceId ? 1 : MAX_RECENT_PROJECTS)
      .map((workspace) => ({
        id: workspace.id,
        workspaceId: workspace.id,
        title: getWorkspaceTitle(workspace),
        tech: getWorkspaceTechLabel(workspace),
        type: workspace.mode,
        role: workspace.role,
        progress: progressMap[workspace.id] ?? 0,
        lastModified: workspace.updatedAt || "최근 수정일 없음",
      }));
  }, [workspaces, progressMap, safeWorkspaceId]);

  const currentWorkspaceId = selectedWorkspace?.id ?? safeWorkspaceId;
  const currentMode = selectedWorkspace?.mode ?? activeMode ?? "personal";

  const sidebarWorkspaces = useMemo<WorkspaceSidebarItem[]>(
    () =>
      allWorkspaces.map((workspace) => ({
        id: String(workspace.id),
        name: getWorkspaceTitle(workspace),
        mode: workspace.mode,
        role: workspace.role,
        childCount: getWorkspaceSubProjectCount(workspace),
      })),
    [allWorkspaces],
  );

  const handleSelectSidebarWorkspace = (workspace: WorkspaceSidebarItem) => {
    router.push(`/main/${workspace.id}?mode=${workspace.mode}`);
  };

  return (
    <main className="waivs-page p-4 font-sans md:p-5">
      <div className="mx-auto flex max-w-[1680px] gap-5">
        <ProjectSidebar
          workspaces={sidebarWorkspaces}
          selectedWorkspaceId={currentWorkspaceId ?? ""}
          loading={isLoading}
          errorMessage={errorMessage}
          onSelectWorkspace={handleSelectSidebarWorkspace}
        />

        <div className="min-w-0 flex-1 space-y-5">
          <section className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-6 py-4 shadow-sm md:flex-row md:items-center">
            <div className="min-w-0">
              <h1 className="text-xl font-black leading-none tracking-tight text-[#5873F9] md:text-xl">
                {safeWorkspaceId
                  ? isLoading
                    ? "프로젝트 불러오는 중"
                    : selectedProjectName
                  : "Devw"}
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                {safeWorkspaceId
                  ? `${selectedProjectName} 프로젝트 메인`
                  : "프로젝트 구조 중심 협업을 위한 웹 IDE 플랫폼"}
              </p>
            </div>

            <div className="flex w-full flex-col gap-2.5 sm:flex-row md:w-auto">
              <Link
                href="/main"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D9E1FF] bg-[#F7F9FF] px-4 py-2.5 text-sm font-semibold text-[#5873F9] transition-colors hover:bg-[#EEF3FF]"
              >
                전체 프로젝트
                <ArrowRight size={17} strokeWidth={2.3} />
              </Link>

              <Link
                href={getIdeHref(currentWorkspaceId, currentMode)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5873F9] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#4863E8]"
              >
                작업하러 가기
                <FolderOpen size={18} strokeWidth={2.4} />
              </Link>
            </div>
          </section>

          <SummaryCards stats={summaryStats} />

          {safeWorkspaceId ? (
            <ProjectWorkStatusSection
              isLoading={isLoading}
              errorMessage={errorMessage}
              workspace={selectedWorkspace}
              projectName={selectedProjectName}
              workspaceId={currentWorkspaceId}
              mode={currentMode}
              progress={projectProgress}
              totalScheduleCount={totalScheduleCount}
              doneScheduleCount={doneScheduleCount}
              remainingScheduleCount={remainingScheduleCount}
              devlogCount={projectDevlogCount}
              workFlowItems={workFlowItems}
            />
          ) : (
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-bold text-gray-900">
                  최근 프로젝트
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  최근에 수정한 최상위 프로젝트만 빠르게 확인하세요.
                </p>
              </div>

              {isLoading ? (
                <div className="flex h-[220px] items-center justify-center rounded-2xl border border-dashed border-gray-200 text-sm text-gray-400">
                  프로젝트를 불러오는 중입니다.
                </div>
              ) : errorMessage ? (
                <div className="flex h-[220px] items-center justify-center rounded-2xl border border-dashed border-red-200 bg-red-50 text-sm text-red-500">
                  {errorMessage}
                </div>
              ) : recentProjects.length === 0 ? (
                <div className="flex h-[220px] items-center justify-center rounded-2xl border border-dashed border-gray-200 text-sm text-gray-400">
                  표시할 프로젝트가 없습니다.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {recentProjects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              )}
            </section>
          )}

          <MonthlyWorkFlowSection
            isLoading={isLoading}
            items={workFlowItems}
            selectedDateKey={selectedDateKey}
            onSelectDate={setSelectedDateKey}
            workspaceId={currentWorkspaceId}
            mode={currentMode}
            isProjectMode={Boolean(safeWorkspaceId)}
            projectName={selectedProjectName}
          />
        </div>
      </div>
    </main>
  );
}

function ProjectWorkStatusSection({
  isLoading,
  errorMessage,
  workspace,
  projectName,
  workspaceId,
  mode,
  progress,
  totalScheduleCount,
  doneScheduleCount,
  remainingScheduleCount,
  devlogCount,
  workFlowItems,
}: {
  isLoading: boolean;
  errorMessage: string;
  workspace: WorkspaceListResponse | null;
  projectName: string;
  workspaceId: string;
  mode: WorkspaceMode;
  progress: number;
  totalScheduleCount: number;
  doneScheduleCount: number;
  remainingScheduleCount: number;
  devlogCount: number;
  workFlowItems: WorkFlowItem[];
}) {
  const latestSchedule = workFlowItems.find((item) => item.type === "schedule");
  const latestDevlog = workFlowItems.find((item) => item.type === "devlog");

  const safeProgress = Math.min(Math.max(progress, 0), 100);
  const projectTech = workspace ? getWorkspaceTechLabel(workspace) : "-";
  const projectRole = workspace?.role === "owner" ? "Owner" : "Member";
  const projectMode = workspace?.mode === "team" ? "Team" : "Personal";
  const updatedAt = workspace?.updatedAt || "최근 수정일 없음";

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            프로젝트 작업 현황
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            이 프로젝트에서 이어서 작업할 항목과 이동 경로를 확인하세요.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
            {projectTech}
          </span>

          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              mode === "team"
                ? "bg-blue-50 text-blue-600"
                : "bg-purple-50 text-purple-600"
            }`}
          >
            {projectMode}
          </span>

          <span className="rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-bold text-[#5873F9]">
            {projectRole}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-[260px] items-center justify-center rounded-2xl border border-dashed border-gray-200 text-sm text-gray-400">
          프로젝트 작업 현황을 불러오는 중입니다.
        </div>
      ) : errorMessage ? (
        <div className="flex h-[260px] items-center justify-center rounded-2xl border border-dashed border-red-200 bg-red-50 text-sm text-red-500">
          {errorMessage}
        </div>
      ) : !workspace ? (
        <div className="flex h-[260px] items-center justify-center rounded-2xl border border-dashed border-gray-200 text-sm text-gray-400">
          선택한 프로젝트 정보를 찾을 수 없습니다.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-gray-200 bg-[#FBFCFF] p-5">
            <div className="mb-5">
              <p className="text-xs font-bold text-[#5873F9]">
                오늘 이어서 할 작업
              </p>

              <h3 className="mt-1 text-xl font-black text-gray-900">
                {projectName}
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                최근 일정과 개발일지를 기준으로 작업을 이어갈 수 있습니다.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Link
                href={getScheduleHref(workspaceId, mode)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-4 transition hover:border-[#5873F9] hover:bg-[#F7F9FF]"
              >
                <p className="text-[11px] font-bold text-gray-400">최근 일정</p>

                <p className="mt-1 truncate text-base font-black text-gray-900">
                  {latestSchedule?.title ?? "이번 달 등록된 일정이 없습니다."}
                </p>

                <p className="mt-2 text-xs leading-relaxed text-gray-500">
                  일정 관리에서 상태를 확인하고 완료 처리할 수 있습니다.
                </p>
              </Link>

              <Link
                href={getDevlogHref(workspaceId)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-4 transition hover:border-[#5873F9] hover:bg-[#F7F9FF]"
              >
                <p className="text-[11px] font-bold text-gray-400">
                  최근 개발일지
                </p>

                <p className="mt-1 truncate text-base font-black text-gray-900">
                  {latestDevlog?.title ?? "이번 달 작성된 개발일지가 없습니다."}
                </p>

                <p className="mt-2 text-xs leading-relaxed text-gray-500">
                  마지막 작업 기록을 기준으로 이어서 작성할 수 있습니다.
                </p>
              </Link>
            </div>

            <div className="mt-4 rounded-xl border border-[#DDE4FF] bg-[#F7F9FF] px-4 py-4">
              <p className="text-[11px] font-bold text-[#5873F9]">
                다음 작업 안내
              </p>

              <p className="mt-1 text-sm leading-relaxed text-gray-700">
                남은 일정{" "}
                <span className="font-black text-[#5873F9]">
                  {remainingScheduleCount}
                </span>
                개가 있습니다. 일정 상태를 완료로 변경하면 프로젝트 진행률에
                반영됩니다.
              </p>
            </div>

            <div className="mt-4 rounded-xl border border-gray-200 bg-white px-4 py-4">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-bold text-gray-400">
                    프로젝트 진행률
                  </p>

                  <p className="mt-1 text-sm font-medium text-gray-500">
                    완료 처리된 일정만 진행률에 반영됩니다.
                  </p>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-[#5873F9]">
                    {safeProgress}%
                  </span>

                  <span className="text-xs font-bold text-gray-400">
                    {doneScheduleCount} / {totalScheduleCount} 완료
                  </span>
                </div>
              </div>

              <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-[#5873F9] transition-all duration-500"
                  style={{ width: `${safeProgress}%` }}
                />
              </div>

              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-gray-500">
                  남은 일정{" "}
                  <span className="font-black text-gray-800">
                    {remainingScheduleCount}
                  </span>
                  개 · 최근 수정일{" "}
                  <span className="font-black text-gray-800">{updatedAt}</span>
                </p>

                <Link
                  href={getIdeHref(workspaceId, mode)}
                  className="flex items-center justify-between rounded-xl bg-[#5873F9] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#4863E8]"
                >
                  <span>AIVS에서 작업하기</span>
                  <ArrowRight size={17} strokeWidth={2.4} />
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-4">
              <p className="text-xs font-bold text-[#5873F9]">빠른 작업</p>

              <h3 className="mt-1 text-lg font-black text-gray-900">
                바로 이동
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                프로젝트 작업에 필요한 화면으로 바로 이동합니다.
              </p>
            </div>

            <div className="space-y-3">
              <Link
                href={getAivsHref(workspaceId, mode)}
                className="flex items-center justify-between rounded-xl bg-[#5873F9] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#4863E8]"
              >
                <span>AIVS에서 작업하기</span>
                <ArrowRight size={17} strokeWidth={2.4} />
              </Link>

              <Link
                href={getScheduleHref(workspaceId, mode)}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition hover:border-[#5873F9] hover:bg-[#F7F9FF] hover:text-[#5873F9]"
              >
                <span>일정 관리</span>
                <ArrowRight size={17} strokeWidth={2.4} />
              </Link>

              <Link
                href={getDevlogHref(workspaceId)}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition hover:border-[#5873F9] hover:bg-[#F7F9FF] hover:text-[#5873F9]"
              >
                <span>개발일지 작성</span>
                <ArrowRight size={17} strokeWidth={2.4} />
              </Link>

              <Link
                href={getArchiveHref(workspaceId)}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition hover:border-[#5873F9] hover:bg-[#F7F9FF] hover:text-[#5873F9]"
              >
                <span>AI 최종 보고서 작성</span>
                <ArrowRight size={17} strokeWidth={2.4} />
              </Link>
            </div>

            <div className="mt-5 rounded-xl bg-gray-50 px-4 py-4">
              <p className="text-xs font-bold text-gray-500">이번 달 기록</p>

              <p className="mt-1 text-sm leading-relaxed text-gray-600">
                개발일지{" "}
                <span className="font-black text-[#5873F9]">
                  {devlogCount}개
                </span>
                가 작성되었습니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}