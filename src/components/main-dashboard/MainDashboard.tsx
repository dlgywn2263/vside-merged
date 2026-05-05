"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronRight,
  FolderOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  UserRound,
  Users,
} from "lucide-react";

import {
  fetchScheduleProgressApi,
  getMyWorkspacesByTokenApi,
} from "@/lib/ide/api";

import type {
  MainDashboardProps,
  RecentProject,
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
  getDevlogHref,
  getProjectTech,
  getProjectTitle,
  getScheduleHref,
  normalizeWorkspaceId,
  parseLastModified,
  SUMMARY_STATS_BASE,
} from "./dashboard.utils";

import { loadMonthlyWorkFlowItems } from "./dashboard.service";

import SummaryCards from "./SummaryCards";
import ProjectCard from "./ProjectCard";
import MonthlyWorkFlowSection from "./MonthlyWorkFlowSection";

type ProjectFilter = "all" | "personal" | "team";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function MainDashboard({
  workspaceId,
  mode,
}: MainDashboardProps) {
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

  // =========================================================
  // 노션형 사이드바 상태
  // isSidebarPinned: 고정 펼침 여부
  // isSidebarHovered: 접힌 상태에서 마우스 hover 여부
  // canSidebarHoverExpand: 접기 버튼 클릭 직후 바로 다시 펼쳐지는 문제 방지
  // =========================================================
  const [isSidebarPinned, setIsSidebarPinned] = useState(true);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [canSidebarHoverExpand, setCanSidebarHoverExpand] = useState(true);

  const [projectSearch, setProjectSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>("all");

  const sidebarExpanded =
    isSidebarPinned || (canSidebarHoverExpand && isSidebarHovered);

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
                view: workspace.mode,
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
            const progressData = result.value as ScheduleProgressResponse;

            nextProgressMap[workspace.id] =
              typeof progressData.progress === "number"
                ? progressData.progress
                : 0;

            nextProgressDetailMap[workspace.id] = {
              workspaceId: progressData.workspaceId ?? workspace.id,
              workspaceName: progressData.workspaceName ?? workspace.name,
              type: progressData.type ?? workspace.mode,
              totalCount: Number(progressData.totalCount ?? 0),
              doneCount: Number(progressData.doneCount ?? 0),
              progress: Number(progressData.progress ?? 0),
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
    ? getProjectTitle(selectedWorkspace)
    : "프로젝트";

  const selectedWorkspaceName = selectedWorkspace?.name ?? "";

  const selectedProgressDetail = selectedWorkspace
    ? progressDetailMap[selectedWorkspace.id]
    : undefined;

  const projectProgress = selectedWorkspace
    ? (selectedProgressDetail?.progress ??
      progressMap[selectedWorkspace.id] ??
      0)
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
        title: getProjectTitle(workspace),
        tech: getProjectTech(workspace),
        type: workspace.mode,
        role: workspace.role,
        progress: progressMap[workspace.id] ?? 0,
        lastModified: workspace.updatedAt || "최근 수정일 없음",
      }));
  }, [workspaces, progressMap, safeWorkspaceId]);

  const currentWorkspaceId = selectedWorkspace?.id ?? safeWorkspaceId;
  const currentMode = selectedWorkspace?.mode ?? activeMode ?? "personal";

  const filteredSidebarWorkspaces = useMemo(() => {
    const keyword = projectSearch.trim().toLowerCase();

    return allWorkspaces.filter((workspace) => {
      const matchedFilter =
        projectFilter === "all" || workspace.mode === projectFilter;

      const title = getProjectTitle(workspace).toLowerCase();
      const name = workspace.name?.toLowerCase() ?? "";
      const tech = getProjectTech(workspace).toLowerCase();

      const matchedKeyword =
        !keyword ||
        title.includes(keyword) ||
        name.includes(keyword) ||
        tech.includes(keyword);

      return matchedFilter && matchedKeyword;
    });
  }, [allWorkspaces, projectSearch, projectFilter]);

  const personalSidebarWorkspaces = filteredSidebarWorkspaces.filter(
    (workspace) => workspace.mode === "personal",
  );

  const teamSidebarWorkspaces = filteredSidebarWorkspaces.filter(
    (workspace) => workspace.mode === "team",
  );

  const getWorkspaceHref = (workspace: WorkspaceListResponse) => {
    return `/main/${workspace.id}?mode=${workspace.mode}`;
  };

  const handleToggleSidebar = () => {
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

  const renderWorkspaceItem = (workspace: WorkspaceListResponse) => {
    const active = String(workspace.id) === String(currentWorkspaceId);
    const workspaceTitle = getProjectTitle(workspace);
    const workspaceTech = getProjectTech(workspace);

    return (
      <Link
        key={workspace.id}
        href={getWorkspaceHref(workspace)}
        title={!sidebarExpanded ? workspaceTitle : undefined}
        className={cn(
          "group flex items-center gap-2 rounded-xl px-2 py-2 text-sm transition",
          active
            ? "bg-[#5873F9] text-white shadow-sm"
            : "text-gray-700 hover:bg-gray-100",
        )}
      >
        <div
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
            active
              ? "bg-white/15 text-white"
              : workspace.mode === "team"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-blue-50 text-blue-700",
          )}
        >
          {workspace.mode === "team" ? (
            <Users size={16} strokeWidth={2.3} />
          ) : (
            <UserRound size={16} strokeWidth={2.3} />
          )}
        </div>

        {sidebarExpanded ? (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{workspaceTitle}</p>
              <p
                className={cn(
                  "truncate text-[11px]",
                  active ? "text-white/70" : "text-gray-400",
                )}
              >
                {workspace.mode === "team" ? "팀" : "개인"} · {workspaceTech}
              </p>
            </div>

            <ChevronRight
              size={15}
              strokeWidth={2.4}
              className={cn(
                "shrink-0 opacity-0 transition group-hover:opacity-100",
                active ? "text-white/70" : "text-gray-400",
              )}
            />
          </>
        ) : null}
      </Link>
    );
  };

  return (
    <main className="min-h-screen bg-[#F8F9FA] p-4 font-sans text-gray-800 md:p-5">
      <div className="mx-auto flex max-w-[1680px] gap-5">
        {/* 왼쪽 노션형 프로젝트 사이드바 */}
        <aside
          onMouseEnter={() => {
            if (!isSidebarPinned && canSidebarHoverExpand) {
              setIsSidebarHovered(true);
            }
          }}
          onMouseLeave={() => {
            setIsSidebarHovered(false);
            setCanSidebarHoverExpand(true);
          }}
          className={cn(
            "sticky top-5 hidden h-[calc(100vh-40px)] shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-[#FBFBFA] shadow-sm transition-all duration-900 md:flex",
            sidebarExpanded ? "w-72" : "w-16",
          )}
        >
          <div className="flex min-h-0 w-full flex-col">
            <div
              className={cn(
                "flex items-center border-b border-gray-200",
                sidebarExpanded
                  ? "justify-between px-3 py-3"
                  : "justify-center py-3",
              )}
            >
              {sidebarExpanded ? (
                <div className="min-w-0">
                  <p className="text-sm font-black text-gray-900">프로젝트</p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    전체 {allWorkspaces.length}개 · 개인 {personalCount}개 · 팀{" "}
                    {teamCount}개
                  </p>
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleToggleSidebar}
                className="grid h-8 w-8 place-items-center rounded-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                aria-label={isSidebarPinned ? "사이드바 접기" : "사이드바 고정"}
                title={isSidebarPinned ? "사이드바 접기" : "사이드바 고정"}
              >
                {isSidebarPinned ? (
                  <PanelLeftClose size={17} strokeWidth={2.4} />
                ) : (
                  <PanelLeftOpen size={17} strokeWidth={2.4} />
                )}
              </button>
            </div>

            {!sidebarExpanded ? (
              <div className="flex min-h-0 flex-1 flex-col items-center gap-2 px-2 py-3">
                <button
                  type="button"
                  className="grid h-9 w-9 place-items-center rounded-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                  title="프로젝트 검색"
                  aria-label="프로젝트 검색"
                  onClick={() => {
                    setIsSidebarPinned(true);
                    setIsSidebarHovered(false);
                    setCanSidebarHoverExpand(true);
                  }}
                >
                  <Search size={17} strokeWidth={2.3} />
                </button>

                <Link
                  href="/main"
                  className="grid h-9 w-9 place-items-center rounded-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                  title="전체 프로젝트"
                  aria-label="전체 프로젝트"
                >
                  <FolderOpen size={17} strokeWidth={2.3} />
                </Link>

                <div className="mt-2 h-px w-8 bg-gray-200" />

                <div className="grid h-9 w-9 place-items-center rounded-xl text-gray-300">
                  {personalCount + teamCount}
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-3 px-3 py-3">
                  <div className="relative">
                    <Search
                      size={16}
                      strokeWidth={2.2}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      value={projectSearch}
                      onChange={(event) => setProjectSearch(event.target.value)}
                      placeholder="프로젝트 검색"
                      className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#5873F9] focus:ring-2 focus:ring-[#5873F9]/10"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1">
                    {[
                      { key: "all", label: "전체" },
                      { key: "personal", label: "개인" },
                      { key: "team", label: "팀" },
                    ].map((filter) => (
                      <button
                        key={filter.key}
                        type="button"
                        onClick={() =>
                          setProjectFilter(filter.key as ProjectFilter)
                        }
                        className={cn(
                          "rounded-lg px-2 py-1.5 text-xs font-bold transition",
                          projectFilter === filter.key
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-900",
                        )}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
                  {isLoading ? (
                    <div className="mx-1 rounded-xl border border-dashed border-gray-200 px-3 py-6 text-center text-sm text-gray-400">
                      프로젝트를 불러오는 중입니다.
                    </div>
                  ) : errorMessage ? (
                    <div className="mx-1 rounded-xl border border-red-100 bg-red-50 px-3 py-4 text-xs leading-relaxed text-red-500">
                      {errorMessage}
                    </div>
                  ) : filteredSidebarWorkspaces.length === 0 ? (
                    <div className="mx-1 rounded-xl border border-dashed border-gray-200 px-3 py-6 text-center text-sm text-gray-400">
                      검색 결과가 없습니다.
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {projectFilter !== "team" ? (
                        <section>
                          <div className="mb-2 flex items-center justify-between px-2">
                            <div className="flex items-center gap-1.5 text-xs font-black text-gray-500">
                              <UserRound size={14} strokeWidth={2.3} />
                              개인 프로젝트
                            </div>

                            <span className="text-[11px] font-bold text-gray-400">
                              {personalSidebarWorkspaces.length}
                            </span>
                          </div>

                          <div className="space-y-1">
                            {personalSidebarWorkspaces.length > 0 ? (
                              personalSidebarWorkspaces.map(renderWorkspaceItem)
                            ) : (
                              <p className="px-2 py-2 text-xs text-gray-400">
                                개인 프로젝트가 없습니다.
                              </p>
                            )}
                          </div>
                        </section>
                      ) : null}

                      {projectFilter !== "personal" ? (
                        <section>
                          <div className="mb-2 flex items-center justify-between px-2">
                            <div className="flex items-center gap-1.5 text-xs font-black text-gray-500">
                              <Users size={14} strokeWidth={2.3} />팀 프로젝트
                            </div>

                            <span className="text-[11px] font-bold text-gray-400">
                              {teamSidebarWorkspaces.length}
                            </span>
                          </div>

                          <div className="space-y-1">
                            {teamSidebarWorkspaces.length > 0 ? (
                              teamSidebarWorkspaces.map(renderWorkspaceItem)
                            ) : (
                              <p className="px-2 py-2 text-xs text-gray-400">
                                팀 프로젝트가 없습니다.
                              </p>
                            )}
                          </div>
                        </section>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 p-3">
                  <Link
                    href="/main"
                    className="flex items-center justify-center gap-2 rounded-xl border border-[#D9E1FF] bg-[#F7F9FF] px-3 py-2 text-sm font-bold text-[#5873F9] transition hover:bg-[#EEF3FF]"
                  >
                    전체 프로젝트
                    <ArrowRight size={16} strokeWidth={2.4} />
                  </Link>
                </div>
              </>
            )}
          </div>
        </aside>

        {/* 오른쪽 메인 콘텐츠 */}
        <div className="min-w-0 flex-1 space-y-5">
          <section className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-6 py-4 shadow-sm md:flex-row md:items-center">
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-3">
                <div>
                  <h1 className="text-xl font-black leading-none tracking-tight text-[#5873F9] md:text-xl">
                    {safeWorkspaceId
                      ? isLoading
                        ? "프로젝트 불러오는 중"
                        : selectedProjectName
                      : "Devw"}
                  </h1>

                  <p className="mt-1 text-sm text-gray-500">
                    {safeWorkspaceId
                      ? selectedWorkspaceName
                        ? `${selectedWorkspaceName} 프로젝트 메인`
                        : "선택한 프로젝트의 일정, 개발일지, 진행률을 확인합니다."
                      : "프로젝트 구조 중심 협업을 위한 웹 IDE 플랫폼"}
                  </p>
                </div>
              </div>
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
                href={
                  currentWorkspaceId
                    ? getAivsHref(currentWorkspaceId, currentMode)
                    : "/new/workspace"
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5873F9] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#4863E8]"
              >
                {currentWorkspaceId ? "작업하러 가기" : "새 프로젝트 생성"}
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
                  최근에 수정한 프로젝트만 빠르게 확인하세요.
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
  const projectTech = workspace ? getProjectTech(workspace) : "-";
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
                  href={getAivsHref(workspaceId, mode)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#EEF2FF] px-3 py-2 text-xs font-bold text-[#5873F9] transition hover:bg-[#E3E9FF]"
                >
                  작업 화면 열기
                  <ArrowRight size={15} strokeWidth={2.4} />
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
            </div>

            <div className="mt-5 rounded-xl bg-gray-50 px-4 py-3">
              <p className="text-xs font-bold text-gray-500">이번 달 기록</p>

              <p className="mt-1 text-sm text-gray-700">
                개발일지{" "}
                <span className="font-black text-[#5873F9]">{devlogCount}</span>
                개가 작성되었습니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
