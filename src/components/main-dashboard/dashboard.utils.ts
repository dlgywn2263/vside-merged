import {
  Bell,
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  Gauge,
  ListTodo,
  UserRound,
  UsersRound,
} from "lucide-react";

import type {
  MonthDay,
  RawDevlog,
  RawSchedule,
  RecentProject,
  SummaryIconMap,
  SummaryStat,
  WorkFlowItem,
  WorkspaceListResponse,
  WorkspaceMode,
} from "./dashboard.types";

export const SummaryIcons: SummaryIconMap = {
  user: UserRound,
  users: UsersRound,
  calendar: CalendarDays,
  bell: Bell,
  gauge: Gauge,
  todo: ListTodo,
  check: CheckCircle2,
  book: BookOpenText,
};

export const SUMMARY_STATS_BASE: SummaryStat[] = [
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

export function normalizeWorkspaceId(value?: string | null) {
  if (!value) return "";
  if (value === "undefined" || value === "null") return "";
  return value;
}

export function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

export function normalizeDateKey(value?: string | null) {
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

export function getSortTime(...values: Array<string | null | undefined>) {
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

export function getMonthDays(baseDate: Date): MonthDay[] {
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

export function getDateKeysBetween(startKey: string, endKey: string) {
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

export function parseLastModified(value: string) {
  if (!value) return 0;

  const normalized = value.replace(/\./g, "-");
  const parsed = new Date(normalized).getTime();

  return Number.isNaN(parsed) ? 0 : parsed;
}

export function getProjectTitle(workspace: WorkspaceListResponse) {
  const latestProject = workspace.projects?.[0];

  return latestProject?.name || workspace.name || "이름 없는 프로젝트";
}

export function getProjectTech(workspace: WorkspaceListResponse) {
  const latestProject = workspace.projects?.[0];

  return latestProject?.language || workspace.mode;
}

export function getProjectMainHref(project: RecentProject) {
  return `/main/${project.workspaceId}?mode=${project.type}`;
}

export function getIdeHref(project: RecentProject) {
  return project.type === "team"
    ? `/ide/team/${project.workspaceId}`
    : `/ide/personal/${project.workspaceId}`;
}

export function getScheduleHref(workspaceId: string, mode: WorkspaceMode) {
  return `/schedules?view=${mode}&workspaceId=${workspaceId}`;
}

export function getDevlogHref(workspaceId: string) {
  return `/devlogs?workspaceId=${workspaceId}`;
}

export function getAivsHref(workspaceId: string, mode: WorkspaceMode) {
  return mode === "team"
    ? `/ide/team/${workspaceId}`
    : `/ide/personal/${workspaceId}`;
}

export function getScheduleTitle(schedule: RawSchedule) {
  return schedule.title?.trim() || "제목 없는 일정";
}

export function getDevlogTitle(devlog: RawDevlog) {
  return devlog.title?.trim() || "제목 없는 개발일지";
}

export function extractDevlogs(response: unknown): RawDevlog[] {
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

export function buildScheduleItems(
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
      workspaceName: getProjectTitle(workspace),
      workspaceMode: workspace.mode,
      stage: schedule.stage ?? schedule.category ?? null,
      status: schedule.status ?? null,
      href: getScheduleHref(workspace.id, workspace.mode),
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

export function buildDevlogItems(
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
        workspaceName: getProjectTitle(workspace),
        workspaceMode: workspace.mode,
        stage: devlog.stage ?? null,
        status:
          typeof devlog.progress === "number" ? `${devlog.progress}%` : null,
        href: getDevlogHref(workspace.id),
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
