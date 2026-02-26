// 일정관리 도메인 타입(Mode/Team/Event 등)을 모아두는 파일

export type Mode = "personal" | "team";
export type Category = "Work" | "School" | "Personal" | "Meeting" | "Etc";

export type Team = {
  id: string;
  name: string;
  members: { id: string; name: string }[];
};

export type CalendarEvent = {
  id: string;
  mode: Mode;
  teamId?: string;

  title: string;
  description?: string;
  location?: string;
  category: Category;

  dateISO: string; // yyyy-MM-dd
  startTime: string; // HH:mm
  endTime?: string;

  assignees?: string[];

  createdAt: number;
  updatedAt: number;
};
