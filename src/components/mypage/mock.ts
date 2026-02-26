import type {
  Achievement,
  IDEPrefs,
  Project,
  Solution,
  Stats,
  Team,
  User,
} from "@/components/mypage/types";

export const mockUser: User = {
  id: "u_001",
  firstName: "효주",
  lastName: "이",
  username: "hyojoo",
  email: "hyojoo@example.com",
  location: "서울, 대한민국",
  website: "https://example.com",
  displayName: "이효주",
};

export const mockStats: Stats = {
  primaryLang: "TypeScript",
  langRatio: [
    { label: "TS", value: 55 },
    { label: "JS", value: 20 },
    { label: "HTML/CSS", value: 15 },
    { label: "Other", value: 10 },
  ],
  activeHours: [
    { label: "Morning", value: 15 },
    { label: "Afternoon", value: 35 },
    { label: "Evening", value: 50 },
  ],
  collabSessions: 18,
  avgResponseMin: 6,
  feedbackScore: 4.6,
};

export const mockSolutions: Solution[] = [
  {
    id: "s1",
    name: "VSIDE.sln",
    role: "owner",
    visibility: "team",
    updatedAt: "2026-02-21T10:20:00.000Z",
    locationLabel: "workspace/vside",
    projects: [
      { id: "p1", name: "vside-web", language: "TypeScript", status: "active" },
      { id: "p2", name: "vside-api", language: "Java", status: "active" },
    ],
  },
  {
    id: "s2",
    name: "Sandbox.sln",
    role: "owner",
    visibility: "private",
    updatedAt: "2026-02-20T03:40:00.000Z",
    locationLabel: "workspace/sandbox",
    projects: [
      {
        id: "p3",
        name: "playground",
        language: "JavaScript",
        status: "active",
      },
    ],
  },
  {
    id: "s3",
    name: "TeamLegacy.sln",
    role: "member",
    visibility: "team",
    updatedAt: "2025-12-12T12:00:00.000Z",
    locationLabel: "workspace/legacy",
    projects: [
      { id: "p4", name: "legacy-core", language: "C++", status: "archived" },
    ],
  },
];

export const mockTeams: Team[] = [
  {
    id: "t1",
    name: "VSIDE Core Team",
    role: "owner",
    membersCount: 6,
    projectsCount: 2,
    joinedAt: "2026-02-01T09:00:00.000Z",
    description: "졸업작품 핵심 기능 구현 팀",
  },
  {
    id: "t2",
    name: "UI/UX Squad",
    role: "member",
    membersCount: 4,
    projectsCount: 1,
    joinedAt: "2026-02-08T12:30:00.000Z",
    description: "레이아웃, 디자인 시스템 정리",
  },
];

export const mockPrefs: IDEPrefs = {
  theme: "light",
  keymap: "vscode",
  fontFamily:
    "Pretendard, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  fontSize: 14,
  tabSize: 2,
  autoSave: "afterDelay",
  autoSaveDelayMs: 1500,
  formatter: "prettier",
  aiAssistLevel: 2,
};

export const mockAchievements: Achievement[] = [
  {
    id: "a1",
    title: "첫 협업 세션 완료",
    desc: "팀 모드에서 첫 실시간 공동 편집을 완료했습니다.",
    earnedAt: "2026-02-12T02:00:00.000Z",
  },
  {
    id: "a2",
    title: "프로젝트 3개 생성",
    desc: "프로젝트를 3개 이상 생성했습니다.",
    earnedAt: "2026-02-18T07:00:00.000Z",
  },
  {
    id: "a3",
    title: "AI 도움 50회 사용",
    desc: "AI 코드 제안/리팩토링/문서화를 50회 이상 사용했습니다.",
  },
  {
    id: "a4",
    title: "팀원 피드백 4.5+",
    desc: "협업 평판 점수 4.5 이상을 달성했습니다.",
    earnedAt: "2026-02-20T08:00:00.000Z",
  },
];
