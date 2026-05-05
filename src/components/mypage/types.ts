export type TabKey =
  | "overview"
  | "progress"
  | "completed"
  | "devlogs"
  | "github"
  | "account";

export type ProjectStatus = "active" | "completed";

export type User = {
  id: string;
  email: string;
  nickname: string;
  profileImageUrl?: string | null;
  createdAt?: string;
};

export type Project = {
  id: string;
  name: string;
  description?: string;
  type: "개인" | "팀";
  status: ProjectStatus;
  progress: number;
  language: string;
  stack: string[];
  updatedAt?: string;
  devlogCount: number;
  doneScheduleCount: number;
  scheduleTotalCount: number;

  workspaceId: string;
  workspaceName: string;
  workspaceRole: "owner" | "member";
  workspaceVisibility: "private" | "team";
};

export type Devlog = {
  id: string;
  projectId?: string;
  workspaceId?: string;
  title: string;
  projectName: string;
  date: string;
  summary: string;
  rawDate?: string;
};

export type ActivitySummary = {
  progressProjectCount: number;
  completedProjectCount: number;
  devlogCount: number;
  doneScheduleCount: number;
  commitCount: number;
  primaryLanguage: string;
};

export type HeatmapLevel = 0 | 1 | 2 | 3 | 4;
