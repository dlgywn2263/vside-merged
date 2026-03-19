// 일정관리 UI 데모를 위한 카테고리/팀 목데이터를 제공하는 파일

import type { Category, Team } from "./schedule.types";

// 현재 Category 타입("Work" | "Meeting" | "Study" | "Etc")에 맞게 수정
export const CATEGORIES: Category[] = [
  "Work",
  "Meeting",
  "Study",
  "Etc",
];

export const TEAMS: Team[] = [
  {
    id: "team-a",
    name: "Team Alpha",
    members: [
      { id: "m1", name: "효주" },
      { id: "m2", name: "민수" },
      { id: "m3", name: "지연" },
    ],
  },
  {
    id: "team-b",
    name: "Team Beta",
    members: [
      { id: "m4", name: "준호" },
      { id: "m5", name: "지훈" },
    ]
  },
];