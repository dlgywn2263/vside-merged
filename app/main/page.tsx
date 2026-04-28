"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import {
  fetchMainMonthSchedulesApi,
  fetchScheduleProgressApi,
  fetchWorkspaceDevlogsApi,
  getMyWorkspacesByTokenApi,
} from "@/lib/ide/api";

const MAX_RECENT_PROJECTS = 4;

type WorkspaceMode = "team" | "personal";
type WorkspaceRole = "owner" | "member";
type WorkFlowType = "schedule" | "devlog";

type SummaryStat = {
  id: number;
  title: string;
  label: string;
  icon: keyof typeof Icons;
  count?: number;
};

type ProjectSummaryResponse = {
  id: string;
  name: string;
  language: string;
  updatedAt: string;
};

type WorkspaceListResponse = {
  id: string;
  name: string;
  mode: WorkspaceMode;
  role: WorkspaceRole;
  updatedAt: string;
  description: string | null;
  teamName: string | null;
  projects: ProjectSummaryResponse[];
};

type ScheduleProgressResponse = {
  workspaceId: string;
  workspaceName: string;
  type: string;
  totalCount: number;
  doneCount: number;
  progress: number;
};

type RecentProject = {
  id: string;
  workspaceId: string;
  title: string;
  tech: string;
  type: WorkspaceMode;
  role: WorkspaceRole;
  progress: number;
  lastModified: string;
};

type RawSchedule = {
  id?: number | string;
  title?: string;
  startDate?: string;
  endDate?: string;
  date?: string;
  stage?: string | null;
  status?: string | null;
  category?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type RawDevlog = {
  id?: number | string;
  title?: string;
  date?: string;
  createdAt?: string;
  updatedAt?: string;
  stage?: string | null;
  progress?: number | null;
  summary?: string | null;
};

type MonthDay = {
  key: string;
  dayName: string;
  dayNumber: number;
  month: number;
  isCurrentMonth: boolean;
  isToday: boolean;
};

type WorkFlowItem = {
  id: string;
  type: WorkFlowType;
  title: string;
  dateKey: string;
  workspaceId: string;
  workspaceName: string;
  workspaceMode: WorkspaceMode;
  stage?: string | null;
  status?: string | null;
  href: string;
  sortTime: number;
};

const Icons = {
  user: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),

  users: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),

  calendar: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),

  bell: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),

  plus: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
};

const SUMMARY_STATS_BASE: SummaryStat[] = [
  {
    id: 1,
    title: "개인 프로젝트",
    label: "내 워크스페이스",
    icon: "user",
  },
  {
    id: 2,
    title: "팀 프로젝트",
    label: "내 워크스페이스",
    icon: "users",
  },
  {
    id: 3,
    title: "예정 일정",
    count: 4,
    label: "7일 내",
    icon: "calendar",
  },
  {
    id: 4,
    title: "미확인 알림",
    count: 3,
    label: "우선 확인 필요",
    icon: "bell",
  },
];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

function normalizeDateKey(value?: string | null) {
  if (!value) return "";

  const trimmed = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }

  if (/^\d{4}\.\d{2}\.\d{2}/.test(trimmed)) {
    return trimmed.replace(/\./g, "-").slice(0, 10);
  }

  const parsed = new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return formatDateKey(parsed);
}

function getSortTime(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (!value) continue;

    const normalized = String(value).replace(/\./g, "-");
    const parsed = new Date(normalized).getTime();

    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getMonthDays(baseDate: Date): MonthDay[] {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  const firstDate = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0);

  const start = new Date(firstDate);
  const firstDay = start.getDay();
  const diffToMonday = firstDay === 0 ? -6 : 1 - firstDay;
  start.setDate(start.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(lastDate);
  const lastDay = end.getDay();
  const diffToSunday = lastDay === 0 ? 0 : 7 - lastDay;
  end.setDate(end.getDate() + diffToSunday);
  end.setHours(0, 0, 0, 0);

  const result: MonthDay[] = [];
  const cursor = new Date(start);
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

  while (cursor <= end) {
    result.push({
      key: formatDateKey(cursor),
      dayName: dayNames[cursor.getDay()],
      dayNumber: cursor.getDate(),
      month: cursor.getMonth() + 1,
      isCurrentMonth: cursor.getMonth() === month,
      isToday: formatDateKey(cursor) === formatDateKey(new Date()),
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

function getDateKeysBetween(startKey: string, endKey: string) {
  if (!startKey) return [];

  const start = new Date(startKey);
  const end = endKey ? new Date(endKey) : new Date(startKey);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return [];
  }

  const result: string[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    result.push(formatDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

function parseLastModified(value: string) {
  if (!value) return 0;

  if (value.includes("시간 전")) {
    const hours = Number(value.replace("시간 전", "").trim()) || 0;
    return Date.now() - hours * 60 * 60 * 1000;
  }

  if (value.includes("분 전")) {
    const minutes = Number(value.replace("분 전", "").trim()) || 0;
    return Date.now() - minutes * 60 * 1000;
  }

  if (value.includes("일 전")) {
    const days = Number(value.replace("일 전", "").trim()) || 0;
    return Date.now() - days * 24 * 60 * 60 * 1000;
  }

  const normalized = value.replace(/\./g, "-");
  const parsed = new Date(normalized).getTime();

  return Number.isNaN(parsed) ? 0 : parsed;
}

function getProjectTitle(workspace: WorkspaceListResponse) {
  const latestProject = workspace.projects?.[0];

  return latestProject?.name || workspace.name || "이름 없는 프로젝트";
}

function getProjectTech(workspace: WorkspaceListResponse) {
  const latestProject = workspace.projects?.[0];

  return latestProject?.language || workspace.mode;
}

function getIdeHref(project: RecentProject) {
  return project.type === "team"
    ? `/ide/team/${project.workspaceId}`
    : `/ide/personal/${project.workspaceId}`;
}

function getScheduleTitle(schedule: RawSchedule) {
  return schedule.title?.trim() || "제목 없는 일정";
}

function getDevlogTitle(devlog: RawDevlog) {
  return devlog.title?.trim() || "제목 없는 개발일지";
}

function extractDevlogs(response: unknown): RawDevlog[] {
  const data = response as any;

  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.devlogs)) return data.devlogs;
  if (Array.isArray(data?.posts)) return data.posts;
  if (Array.isArray(data?.logs)) return data.logs;
  if (Array.isArray(data?.devlogPosts)) return data.devlogPosts;

  if (Array.isArray(data?.projects)) {
    return data.projects.flatMap((project: any) => {
      if (Array.isArray(project?.devlogs)) return project.devlogs;
      if (Array.isArray(project?.posts)) return project.posts;
      if (Array.isArray(project?.logs)) return project.logs;
      return [];
    });
  }

  return [];
}

function buildScheduleItems(
  workspace: WorkspaceListResponse,
  schedules: RawSchedule[],
  dateKeys: string[],
): WorkFlowItem[] {
  const dateKeySet = new Set(dateKeys);

  return schedules.flatMap((schedule, index) => {
    const startKey = normalizeDateKey(schedule.startDate || schedule.date);
    const endKey = normalizeDateKey(schedule.endDate || schedule.startDate);

    const matchedDateKeys = getDateKeysBetween(startKey, endKey).filter(
      (dateKey) => dateKeySet.has(dateKey),
    );

    return matchedDateKeys.map((dateKey) => ({
      id: `schedule-${workspace.id}-${schedule.id ?? index}-${dateKey}`,
      type: "schedule" as const,
      title: getScheduleTitle(schedule),
      dateKey,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      workspaceMode: workspace.mode,
      stage: schedule.stage ?? schedule.category ?? null,
      status: schedule.status ?? null,
      href: `/schedule?view=${workspace.mode}&workspaceId=${workspace.id}`,
      sortTime: getSortTime(
        schedule.updatedAt,
        schedule.createdAt,
        schedule.startDate,
        schedule.date,
        dateKey,
      ),
    }));
  });
}

function buildDevlogItems(
  workspace: WorkspaceListResponse,
  devlogs: RawDevlog[],
  dateKeys: string[],
): WorkFlowItem[] {
  const dateKeySet = new Set(dateKeys);

  return devlogs
    .map((devlog, index) => {
      const dateKey = normalizeDateKey(
        devlog.date || devlog.createdAt || devlog.updatedAt,
      );

      if (!dateKey || !dateKeySet.has(dateKey)) {
        return null;
      }

      return {
        id: `devlog-${workspace.id}-${devlog.id ?? index}`,
        type: "devlog" as const,
        title: getDevlogTitle(devlog),
        dateKey,
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        workspaceMode: workspace.mode,
        stage: devlog.stage ?? null,
        status:
          typeof devlog.progress === "number" ? `${devlog.progress}%` : null,
        href: `/devlog?workspaceId=${workspace.id}`,
        sortTime: getSortTime(
          devlog.updatedAt,
          devlog.createdAt,
          devlog.date,
          dateKey,
        ),
      };
    })
    .filter(Boolean) as WorkFlowItem[];
}

async function loadMonthlyWorkFlowItems(
  workspaces: WorkspaceListResponse[],
): Promise<WorkFlowItem[]> {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const monthKeys = getMonthDays(today).map((day) => day.key);

  const results = await Promise.allSettled(
    workspaces.map(async (workspace) => {
      const [scheduleResult, devlogResult] = await Promise.allSettled([
        fetchMainMonthSchedulesApi({
          view: workspace.mode,
          year,
          month,
          workspaceId: workspace.id,
        }),
        fetchWorkspaceDevlogsApi(workspace.id),
      ]);

      const schedules =
        scheduleResult.status === "fulfilled" &&
        Array.isArray(scheduleResult.value)
          ? (scheduleResult.value as RawSchedule[])
          : [];

      const devlogs =
        devlogResult.status === "fulfilled"
          ? extractDevlogs(devlogResult.value)
          : [];

      return [
        ...buildScheduleItems(workspace, schedules, monthKeys),
        ...buildDevlogItems(workspace, devlogs, monthKeys),
      ];
    }),
  );

  return results
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .sort((a, b) => b.sortTime - a.sortTime);
}

export default function MainDashboard() {
  const [workspaces, setWorkspaces] = useState<WorkspaceListResponse[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
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

        const safeWorkspaces: WorkspaceListResponse[] = Array.isArray(
          workspaceData,
        )
          ? workspaceData
          : [];

        const [progressResults, monthlyWorkFlowItems] = await Promise.all([
          Promise.allSettled(
            safeWorkspaces.map((workspace) =>
              fetchScheduleProgressApi({
                view: workspace.mode,
                workspaceId: workspace.id,
              }),
            ),
          ),
          loadMonthlyWorkFlowItems(safeWorkspaces),
        ]);

        const nextProgressMap: Record<string, number> = {};

        progressResults.forEach((result, index) => {
          const workspace = safeWorkspaces[index];

          if (!workspace) return;

          if (result.status === "fulfilled") {
            const progressData = result.value as ScheduleProgressResponse;

            nextProgressMap[workspace.id] =
              typeof progressData.progress === "number"
                ? progressData.progress
                : 0;
          } else {
            nextProgressMap[workspace.id] = 0;
          }
        });

        if (!ignore) {
          const latestItem = monthlyWorkFlowItems[0];

          setWorkspaces(safeWorkspaces);
          setProgressMap(nextProgressMap);
          setWorkFlowItems(monthlyWorkFlowItems);

          if (latestItem?.dateKey) {
            setSelectedDateKey(latestItem.dateKey);
          }
        }
      } catch (error) {
        if (!ignore) {
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
  }, []);

  const personalCount = workspaces.filter(
    (workspace) => workspace.mode === "personal",
  ).length;

  const teamCount = workspaces.filter(
    (workspace) => workspace.mode === "team",
  ).length;

  const summaryStats = SUMMARY_STATS_BASE.map((stat) => {
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
      .slice(0, MAX_RECENT_PROJECTS)
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
  }, [workspaces, progressMap]);

  return (
    <main className="min-h-screen bg-[#F8F9FA] p-5 md:p-8 font-sans text-gray-800">
      <div className="max-w-6xl mx-auto space-y-5">
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1.5">
              <div className="h-9 w-9 rounded-xl bg-[#EEF2FF] text-[#5873F9] flex items-center justify-center font-black text-base">
                D
              </div>

              <div>
                <h1 className="text-xl md:text-xl font-black text-[#5873F9] tracking-tight leading-none">
                  Devw
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                  프로젝트 구조 중심 협업을 위한 웹 IDE 플랫폼
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto">
            <Link
              href="/projects"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D9E1FF] bg-[#F7F9FF] px-4 py-2.5 text-sm font-semibold text-[#5873F9] hover:bg-[#EEF3FF] transition-colors"
            >
              프로젝트 둘러보기
              <ArrowRight size={17} />
            </Link>

            <Link
              href="/new/workspace"
              className="inline-flex items-center justify-center gap-2 bg-[#5873F9] hover:bg-[#4863E8] transition-colors text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm"
            >
              새 프로젝트 생성
              <Icons.plus />
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {summaryStats.map((stat) => {
            const Icon = Icons[stat.icon];

            return (
              <div
                key={stat.id}
                className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 px-4 py-3.5 min-h-[106px]"
              >
                <div className="flex items-start justify-between mb-2.5">
                  <h3 className="text-[13px] font-semibold text-gray-600 leading-none">
                    {stat.title}
                  </h3>

                  <div className="text-gray-400 mt-0.5">
                    <Icon />
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className="text-[30px] leading-none font-black text-gray-900">
                    {stat.count ?? 0}
                  </span>

                  <span className="text-[11px] text-gray-400 font-medium mt-1.5">
                    {stat.label}
                  </span>
                </div>
              </div>
            );
          })}
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-gray-900">최근 프로젝트</h2>
            <p className="text-sm text-gray-500 mt-1">
              최근에 수정한 프로젝트만 빠르게 확인하세요.
            </p>
          </div>

          {isLoading ? (
            <div className="h-[220px] rounded-2xl border border-dashed border-gray-200 flex items-center justify-center text-sm text-gray-400">
              최근 프로젝트를 불러오는 중입니다.
            </div>
          ) : errorMessage ? (
            <div className="h-[220px] rounded-2xl border border-dashed border-red-200 bg-red-50 flex items-center justify-center text-sm text-red-500">
              {errorMessage}
            </div>
          ) : recentProjects.length === 0 ? (
            <div className="h-[220px] rounded-2xl border border-dashed border-gray-200 flex items-center justify-center text-sm text-gray-400">
              표시할 프로젝트가 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recentProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </section>

        <MonthlyWorkFlowSection
          isLoading={isLoading}
          items={workFlowItems}
          selectedDateKey={selectedDateKey}
          onSelectDate={setSelectedDateKey}
        />
      </div>
    </main>
  );
}

function MonthlyWorkFlowSection({
  isLoading,
  items,
  selectedDateKey,
  onSelectDate,
}: {
  isLoading: boolean;
  items: WorkFlowItem[];
  selectedDateKey: string;
  onSelectDate: (dateKey: string) => void;
}) {
  const monthDays = useMemo(() => getMonthDays(new Date()), []);

  const itemsByDate = useMemo(() => {
    return monthDays.reduce<Record<string, WorkFlowItem[]>>((acc, day) => {
      acc[day.key] = items
        .filter((item) => item.dateKey === day.key)
        .sort((a, b) => b.sortTime - a.sortTime);
      return acc;
    }, {});
  }, [items, monthDays]);

  const selectedDay = monthDays.find((day) => day.key === selectedDateKey);

  const selectedItems = [...(itemsByDate[selectedDateKey] ?? [])].sort(
    (a, b) => b.sortTime - a.sortTime,
  );

  const schedules = selectedItems
    .filter((item) => item.type === "schedule")
    .sort((a, b) => b.sortTime - a.sortTime);

  const devlogs = selectedItems
    .filter((item) => item.type === "devlog")
    .sort((a, b) => b.sortTime - a.sortTime);

  const visibleSchedules = schedules.slice(0, 4);
  const visibleDevlogs = devlogs.slice(0, 3);

  const hiddenCount =
    Math.max(schedules.length - visibleSchedules.length, 0) +
    Math.max(devlogs.length - visibleDevlogs.length, 0);

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">이번 달 작업 흐름</h2>
          <p className="text-sm text-gray-500 mt-1">
            이번 달 전체 워크스페이스의 일정과 개발일지를 최신순으로 확인하세요.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/schedule"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:border-[#5873F9] hover:text-[#5873F9] transition-colors"
          >
            일정관리
          </Link>

          <Link
            href="/devlog"
            className="rounded-xl bg-[#5873F9] px-3 py-2 text-xs font-semibold text-white hover:bg-[#4863E8] transition-colors"
          >
            개발일지
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="h-[420px] rounded-2xl border border-dashed border-gray-200 flex items-center justify-center text-sm text-gray-400">
          이번 달 작업 흐름을 불러오는 중입니다.
        </div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[1.35fr_1fr]">
          <div>
            <div className="mb-2 grid grid-cols-7 text-center text-[11px] font-bold text-gray-400">
              {["월", "화", "수", "목", "금", "토", "일"].map((dayName) => (
                <div key={dayName}>{dayName}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {monthDays.map((day) => {
                const dayItems = itemsByDate[day.key] ?? [];
                const scheduleCount = dayItems.filter(
                  (item) => item.type === "schedule",
                ).length;
                const devlogCount = dayItems.filter(
                  (item) => item.type === "devlog",
                ).length;
                const active = selectedDateKey === day.key;
                const hasItems = scheduleCount + devlogCount > 0;

                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => onSelectDate(day.key)}
                    className={`min-h-[82px] rounded-xl border p-2 text-left transition-all ${
                      active
                        ? "border-[#5873F9] bg-[#F7F9FF] shadow-sm"
                        : "border-gray-200 bg-white hover:border-[#5873F9]/50 hover:bg-gray-50"
                    } ${day.isCurrentMonth ? "" : "opacity-40"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm font-black ${
                          day.isToday ? "text-[#5873F9]" : "text-gray-900"
                        }`}
                      >
                        {day.dayNumber}
                      </span>

                      {day.isToday ? (
                        <span className="rounded-full bg-[#5873F9] px-1.5 py-0.5 text-[9px] font-bold text-white">
                          오늘
                        </span>
                      ) : null}
                    </div>

                    {hasItems ? (
                      <div className="mt-2 space-y-1">
                        {scheduleCount > 0 ? (
                          <div className="flex items-center justify-between rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-bold text-[#5873F9]">
                            <span>일정</span>
                            <span>{scheduleCount}</span>
                          </div>
                        ) : null}

                        {devlogCount > 0 ? (
                          <div className="flex items-center justify-between rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                            <span>일지</span>
                            <span>{devlogCount}</span>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-5 h-1.5 w-1.5 rounded-full bg-gray-200" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="rounded-2xl border border-gray-200 bg-[#FBFCFF] p-4">
            <div className="mb-4">
              <p className="text-xs font-semibold text-[#5873F9]">
                선택한 날짜
              </p>

              <h3 className="mt-1 text-lg font-black text-gray-900">
                {selectedDay
                  ? `${selectedDay.month}월 ${selectedDay.dayNumber}일 ${selectedDay.dayName}요일`
                  : selectedDateKey}
              </h3>

              <p className="mt-1 text-xs text-gray-400">
                일정 {schedules.length}개 · 개발일지 {devlogs.length}개
              </p>
            </div>

            {selectedItems.length === 0 ? (
              <div className="flex min-h-[190px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white text-sm text-gray-400">
                이 날짜에는 표시할 작업이 없습니다.
              </div>
            ) : (
              <div className="space-y-4">
                <WorkFlowList
                  title="일정"
                  emptyText="등록된 일정이 없습니다."
                  items={visibleSchedules}
                />

                <WorkFlowList
                  title="개발일지"
                  emptyText="작성된 개발일지가 없습니다."
                  items={visibleDevlogs}
                />

                {hiddenCount > 0 ? (
                  <div className="rounded-xl bg-white px-3 py-2 text-center text-xs font-semibold text-gray-500">
                    외 {hiddenCount}개 더 있음
                  </div>
                ) : null}
              </div>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}

function WorkFlowList({
  title,
  emptyText,
  items,
}: {
  title: string;
  emptyText: string;
  items: WorkFlowItem[];
}) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-bold text-gray-900">{title}</h4>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 bg-white px-3 py-3 text-xs text-gray-400">
          {emptyText}
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="block rounded-xl border border-gray-200 bg-white px-3 py-3 transition hover:border-[#5873F9]/50 hover:bg-[#F7F9FF]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-gray-900">
                    {item.title}
                  </p>

                  <p className="mt-1 truncate text-xs text-gray-400">
                    {item.workspaceName}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${
                    item.type === "schedule"
                      ? "bg-blue-50 text-blue-600"
                      : "bg-purple-50 text-purple-600"
                  }`}
                >
                  {item.type === "schedule" ? "일정" : "일지"}
                </span>
              </div>

              {item.stage || item.status ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.stage ? (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                      {item.stage}
                    </span>
                  ) : null}

                  {item.status ? (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                      {item.status}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project }: { project: RecentProject }) {
  const router = useRouter();
  const ideHref = getIdeHref(project);

  const handleCardClick = () => {
    router.push(ideHref);
  };

  const handleButtonClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(ideHref);
        }
      }}
      className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#5873F9]/50 hover:shadow-md transition-all group flex flex-col justify-between min-h-[210px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#5873F9]/30"
    >
      <div>
        <div className="flex justify-between items-start mb-2">
          <span className="bg-gray-100 text-gray-600 text-[11px] font-medium px-2.5 py-1 rounded-md">
            {project.tech}
          </span>

          <span
            className={`text-[11px] font-semibold px-2 py-1 rounded-md ${
              project.type === "team"
                ? "text-blue-600 bg-blue-50"
                : "text-purple-600 bg-purple-50"
            }`}
          >
            {project.type === "team" ? "Team" : "Personal"}
          </span>
        </div>

        <h3 className="font-bold text-gray-900 group-hover:text-[#5873F9] transition-colors truncate">
          {project.title}
        </h3>

        <p className="mt-1 text-xs text-gray-400">
          {project.role === "owner" ? "Owner" : "Member"}
        </p>
      </div>

      <div className="mt-4">
        <div className="flex justify-between items-end mb-1.5">
          <span className="text-xs text-gray-400">{project.lastModified}</span>

          <span className="text-xs font-semibold text-[#5873F9]">
            {project.progress}%
          </span>
        </div>

        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div
            className="bg-[#5873F9] h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${project.progress}%` }}
          />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Link
            href={`/devlog?workspaceId=${project.workspaceId}`}
            onClick={handleButtonClick}
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-semibold text-gray-600 hover:border-[#5873F9] hover:bg-[#F7F9FF] hover:text-[#5873F9] transition-colors"
          >
            개발일지
          </Link>

          <Link
            href={`/schedule?view=${project.type}&workspaceId=${project.workspaceId}`}
            onClick={handleButtonClick}
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-semibold text-gray-600 hover:border-[#5873F9] hover:bg-[#F7F9FF] hover:text-[#5873F9] transition-colors"
          >
            일정
          </Link>

          <Link
            href={`/dashboard/${project.workspaceId}?mode=${project.type}`}
            onClick={handleButtonClick}
            className="inline-flex items-center justify-center rounded-lg bg-[#5873F9] px-2 py-2 text-xs font-semibold text-white hover:bg-[#4863E8] transition-colors"
          >
            대시보드
          </Link>
        </div>
      </div>
    </div>
  );
}
