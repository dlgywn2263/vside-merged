// 일정관리 UI 데모를 위한 카테고리/팀 목데이터를 제공하는 파일

import type { Category, Team } from "./schedule.types";

// 1. 현재 Category 타입("Work" | "Meeting" | "Study" | "Etc")에 맞게 수정
export const CATEGORIES: Category[] = [
  "Work",
  "Meeting",
  "Study",
  "Etc",
];

// 2. 현재 Team 타입(id, name만 존재)에 맞게 members 속성 제거
export const TEAMS: Team[] = [
  {
    id: "team-a",
    name: "Team Alpha",
  },
  {
    id: "team-b",
    name: "Team Beta",
  },
];