export type TabKey =
  | "profile"
  | "account"
  | "projects"
  | "teams"
  | "settings"
  | "identity"
  | "customize"
  | "reputation"
  | "achievements";

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
  role: "owner" | "member";
  updatedAt: string;
  language: string;
  visibility: "private" | "team";
  status?: "active" | "archived";
};

export type Team = {
  id: string;
  name: string;
  role: "owner" | "member";
  membersCount: number;
  projectsCount: number;
  updatedAt?: string;
  description?: string;
};

export type Stats = {
  primaryLang: string;
  langRatio: { label: string; value: number }[];
  activeHours: { label: string; value: number }[];
  collabSessions: number;
  avgResponseMin: number;
  feedbackScore: number;
};

export type IDEPrefs = {
  theme: "light" | "dark";
  keymap: "vscode" | "vim" | "intellij";
  fontFamily: string;
  fontSize: number;
  tabSize: 2 | 4;
  autoSave: "off" | "afterDelay";
  autoSaveDelayMs: number;
  formatter: "prettier" | "eslint" | "none";
  aiAssistLevel: 0 | 1 | 2 | 3;
};

export type Achievement = {
  id: string;
  title: string;
  desc: string;
  earnedAt?: string;
};

export type Solution = {
  id: string;
  name: string;
  role: "owner" | "member";
  visibility: "private" | "team";
  updatedAt: string;
  locationLabel?: string;
  description?: string;
  projects: {
    id: string;
    name: string;
    language: string;
    status?: "active" | "archived";
    updatedAt?: string;
  }[];
};
