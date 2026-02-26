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

  // ✅ 회원가입/마이페이지 관리 핵심
  firstName: string; // 이름
  lastName: string; // 성
  username: string; // 닉네임/사용자명
  email: string;

  // ✅ 선택 정보(피그마)
  location?: string;
  website?: string;

  // 상단 표시용
  displayName?: string;
};

export type Project = {
  id: string;
  name: string;
  role: "owner" | "member";
  updatedAt: string; // ISO
  language: string;
  visibility: "private" | "team";
  status?: "active" | "archived";
};

export type Team = {
  id: string;
  name: string;
  role: "owner" | "admin" | "member";
  membersCount: number;
  projectsCount: number;
  joinedAt: string; // ISO
  description?: string;
};

export type Stats = {
  primaryLang: string;
  langRatio: { label: string; value: number }[];
  activeHours: { label: string; value: number }[];
  collabSessions: number;
  avgResponseMin: number;
  feedbackScore: number; // 0-5
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
  earnedAt?: string; // ISO
};
export type Solution = {
  id: string;
  name: string;
  role: "owner" | "member";
  visibility: "private" | "team";
  updatedAt: string; // ISO
  locationLabel?: string; // "서울, 대한민국" 같은 표시용
  projects: {
    id: string;
    name: string;
    language: string;
    status?: "active" | "archived";
  }[];
};
