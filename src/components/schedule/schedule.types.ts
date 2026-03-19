export type Category = "Work" | "Meeting" | "Study" | "Etc";
export type Mode = "personal" | "team";
export type EventStatus = "Todo" | "InProgress" | "Done";

export type ProjectStage =
  | "Planning"
  | "Design"
  | "Development"
  | "Finalization";

export type ProjectRole = "Frontend" | "Backend" | "Designer" | "Fullstack";

export type Team = {
  id: string;
  name: string;
};

export type CalendarEvent = {
  id: string;
  mode: Mode;
  teamId?: string;

  title: string;
  description?: string;
  location?: string;
  category: Category;

  startDateISO: string;
  endDateISO: string;

  assignees?: string[];

  stage?: ProjectStage;
  role?: ProjectRole;
  status?: EventStatus;

  createdAt: number;
  updatedAt: number;
};

export const PROJECT_STAGES: ProjectStage[] = [
  "Planning",
  "Design",
  "Development",
  "Finalization",
];

export const PROJECT_ROLES: ProjectRole[] = [
  "Frontend",
  "Backend",
  "Designer",
  "Fullstack",
];

export const EVENT_STATUSES: EventStatus[] = [
  "Todo",
  "InProgress",
  "Done",
];