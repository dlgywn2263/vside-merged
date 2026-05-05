import type { LucideIcon } from "lucide-react";

export const MAX_RECENT_PROJECTS = 4;

export type WorkspaceMode = "team" | "personal";
export type WorkspaceRole = "owner" | "member";
export type WorkFlowType = "schedule" | "devlog";

export type SummaryStatIcon =
  | "user"
  | "users"
  | "calendar"
  | "bell"
  | "gauge"
  | "todo"
  | "check"
  | "book";

export type SummaryStat = {
  id: number;
  title: string;
  label: string;
  icon: SummaryStatIcon;
  count?: number;
  suffix?: string;
};

export type ProjectSummaryResponse = {
  id: string;
  name: string;
  language: string;
  updatedAt: string;
};

export type WorkspaceListResponse = {
  id: string;
  name: string;
  mode: WorkspaceMode;
  role: WorkspaceRole;
  updatedAt: string;
  description: string | null;
  teamName: string | null;
  projects: ProjectSummaryResponse[];
};

export type ScheduleProgressResponse = {
  workspaceId: string;
  workspaceName: string;
  type: string;
  totalCount: number;
  doneCount: number;
  progress: number;
};

export type RecentProject = {
  id: string;
  workspaceId: string;
  title: string;
  tech: string;
  type: WorkspaceMode;
  role: WorkspaceRole;
  progress: number;
  lastModified: string;
};

export type RawSchedule = {
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

export type RawDevlog = {
  id?: number | string;
  title?: string;
  date?: string;
  createdAt?: string;
  updatedAt?: string;
  stage?: string | null;
  progress?: number | null;
  summary?: string | null;
};

export type MonthDay = {
  key: string;
  dayName: string;
  dayNumber: number;
  month: number;
  isCurrentMonth: boolean;
  isToday: boolean;
};

export type WorkFlowItem = {
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

export type MainDashboardProps = {
  workspaceId?: string;
  mode?: WorkspaceMode;
};

export type SummaryIconMap = Record<SummaryStatIcon, LucideIcon>;
