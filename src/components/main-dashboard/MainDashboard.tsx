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
      <div className="mx-auto flex max-w-[1680px] gap-4">
        <ProjectSidebar
          workspaces={sidebarWorkspaces}
          selectedWorkspaceId={currentWorkspaceId ?? ""}
          loading={isLoading}
          errorMessage={errorMessage}
          onSelectWorkspace={handleSelectSidebarWorkspace}
        />

        <div className="min-w-0 flex-1 space-y-4">
          {/* 상단 프로젝트 헤더 */}
          <section className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-3.5 shadow-sm md:flex-row md:items-center">
            <div className="min-w-0">
              <h1 className="truncate text-[18px] font-black leading-tight tracking-tight text-[#5873F9]">
                {safeWorkspaceId
                  ? isLoading
                    ? "프로젝트 불러오는 중"
                    : selectedProjectName
                  : "Devw"}
              </h1>

              <p className="mt-0.5 truncate text-xs font-medium text-gray-400">
                {safeWorkspaceId
                  ? `${selectedProjectName} 프로젝트 메인`
                  : "프로젝트 구조 중심 협업을 위한 웹 IDE 플랫폼"}
              </p>
            </div>

            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Link
                href="/main"
                className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#D9E1FF] bg-[#F7F9FF] px-3.5 text-xs font-bold text-[#5873F9] transition-colors hover:bg-[#EEF3FF] sm:flex-none"
              >
                전체 프로젝트
                <ArrowRight size={15} strokeWidth={2.3} />
              </Link>

              <Link
                href={getIdeHref(currentWorkspaceId, currentMode)}
                className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#5873F9] px-3.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#4863E8] sm:flex-none"
              >
                작업하러 가기
                <FolderOpen size={16} strokeWidth={2.3} />
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
            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3">
                <h2 className="text-base font-black text-gray-900">
                  최근 프로젝트
                </h2>

                <p className="mt-0.5 text-xs text-gray-400">
                  최근에 수정한 최상위 프로젝트만 빠르게 확인하세요.
                </p>
              </div>

              {isLoading ? (
                <div className="flex h-[180px] items-center justify-center rounded-xl border border-dashed border-gray-200 text-xs text-gray-400">
                  프로젝트를 불러오는 중입니다.
                </div>
              ) : errorMessage ? (
                <div className="flex h-[180px] items-center justify-center rounded-xl border border-dashed border-red-200 bg-red-50 text-xs text-red-500">
                  {errorMessage}
                </div>
              ) : recentProjects.length === 0 ? (
                <div className="flex h-[180px] items-center justify-center rounded-xl border border-dashed border-gray-200 text-xs text-gray-400">
                  표시할 프로젝트가 없습니다.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
      {/* 섹션 헤더 */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-black text-gray-900">
            프로젝트 작업 현황
          </h2>

          <p className="mt-0.5 text-xs font-medium text-gray-400">
            최근 작업을 확인하고 필요한 화면으로 바로 이동하세요.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-500">
            {projectTech}
          </span>

          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
              mode === "team"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-blue-50 text-blue-700"
            }`}
          >
            {projectMode}
          </span>

          <span className="rounded-full bg-[#EEF2FF] px-2.5 py-1 text-[10px] font-bold text-[#5873F9]">
            {projectRole}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-[180px] items-center justify-center rounded-xl border border-dashed border-gray-200 text-xs text-gray-400">
          프로젝트 작업 현황을 불러오는 중입니다.
        </div>
      ) : errorMessage ? (
        <div className="flex h-[180px] items-center justify-center rounded-xl border border-dashed border-red-200 bg-red-50 text-xs text-red-500">
          {errorMessage}
        </div>
      ) : !workspace ? (
        <div className="flex h-[180px] items-center justify-center rounded-xl border border-dashed border-gray-200 text-xs text-gray-400">
          선택한 프로젝트 정보를 찾을 수 없습니다.
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[1.25fr_0.75fr]">
          {/* 이어서 작업 */}
          <div className="rounded-xl border border-gray-200 bg-[#FBFCFF] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black text-[#5873F9]">
                  이어서 작업
                </p>
                <h3 className="mt-0.5 truncate text-[17px] font-black text-gray-900">
                  {projectName}
                </h3>
              </div>

              <span className="shrink-0 text-lg font-black text-[#5873F9]">
                {safeProgress}%
              </span>
            </div>

            <div className="mt-3 grid gap-2.5 md:grid-cols-2">
              <Link
                href={getScheduleHref(workspaceId, mode)}
                className="rounded-xl border border-gray-200 bg-white px-3.5 py-3 transition hover:border-[#AAB8FF] hover:bg-[#F7F9FF]"
              >
                <p className="text-[10px] font-bold text-gray-400">최근 일정</p>
                <p className="mt-1 truncate text-sm font-black text-gray-900">
                  {latestSchedule?.title ?? "등록된 일정이 없습니다."}
                </p>
                <p className="mt-1.5 text-[11px] font-medium text-gray-400">
                  일정 관리에서 상태 확인
                </p>
              </Link>

              <Link
                href={getDevlogHref(workspaceId)}
                className="rounded-xl border border-gray-200 bg-white px-3.5 py-3 transition hover:border-[#AAB8FF] hover:bg-[#F7F9FF]"
              >
                <p className="text-[10px] font-bold text-gray-400">
                  최근 개발일지
                </p>
                <p className="mt-1 truncate text-sm font-black text-gray-900">
                  {latestDevlog?.title ?? "작성된 개발일지가 없습니다."}
                </p>
                <p className="mt-1.5 text-[11px] font-medium text-gray-400">
                  마지막 기록에서 이어서 작성
                </p>
              </Link>
            </div>

            <div className="mt-3 rounded-xl border border-[#DDE4FF] bg-[#F7F9FF] px-3.5 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2 text-[11px] font-bold text-gray-500">
                  <span>
                    남은 일정 <strong className="text-gray-900">{remainingScheduleCount}</strong>개
                  </span>
                  <span className="text-gray-300">·</span>
                  <span className="truncate">
                    최근 수정 <strong className="text-gray-900">{updatedAt}</strong>
                  </span>
                </div>

                <span className="shrink-0 text-[11px] font-black text-[#5873F9]">
                  {doneScheduleCount}/{totalScheduleCount} 완료
                </span>
              </div>

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-[#5873F9] transition-all duration-500"
                  style={{ width: `${safeProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* 빠른 이동 */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-3">
              <p className="text-[10px] font-black text-[#5873F9]">빠른 작업</p>
              <h3 className="mt-0.5 text-base font-black text-gray-900">
                바로 이동
              </h3>
              <p className="mt-0.5 text-[11px] font-medium text-gray-400">
                필요한 기능으로 바로 이동합니다.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Link
                href={getAivsHref(workspaceId, mode)}
                className="col-span-2 flex h-10 items-center justify-between rounded-xl bg-[#5873F9] px-3.5 text-xs font-bold text-white transition hover:bg-[#4863E8]"
              >
                <span>AIVS에서 작업하기</span>
                <ArrowRight size={15} strokeWidth={2.4} />
              </Link>

              <Link
                href={getScheduleHref(workspaceId, mode)}
                className="flex h-10 items-center justify-between rounded-xl border border-gray-200 bg-white px-3 text-[11px] font-bold text-gray-600 transition hover:border-[#AAB8FF] hover:bg-[#F7F9FF] hover:text-[#5873F9]"
              >
                <span>일정 관리</span>
                <ArrowRight size={14} strokeWidth={2.3} />
              </Link>

              <Link
                href={getDevlogHref(workspaceId)}
                className="flex h-10 items-center justify-between rounded-xl border border-gray-200 bg-white px-3 text-[11px] font-bold text-gray-600 transition hover:border-[#AAB8FF] hover:bg-[#F7F9FF] hover:text-[#5873F9]"
              >
                <span>개발일지</span>
                <ArrowRight size={14} strokeWidth={2.3} />
              </Link>

              <Link
                href={getArchiveHref(workspaceId)}
                className="col-span-2 flex h-10 items-center justify-between rounded-xl border border-gray-200 bg-white px-3 text-[11px] font-bold text-gray-600 transition hover:border-[#AAB8FF] hover:bg-[#F7F9FF] hover:text-[#5873F9]"
              >
                <span>AI 최종 보고서</span>
                <ArrowRight size={14} strokeWidth={2.3} />
              </Link>
            </div>

            <p className="mt-2.5 text-[10px] font-semibold text-gray-400">
              이번 달 개발일지 <span className="font-black text-[#5873F9]">{devlogCount}개</span>
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
