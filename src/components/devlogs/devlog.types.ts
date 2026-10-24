export type ScheduleStatus = "todo" | "progress" | "done" | "delayed";
export type DevlogType = "linked" | "general";
export type DevlogFilter = "all" | "linked" | "general" | "progress" | "done";

export type ScheduleOption = {
  id: string;
  workspaceId: string;
  projectName: string;
  title: string;
  status: ScheduleStatus;
  hasDevlog: boolean;
  startDate: string;
  endDate: string;
};

export type DevlogItem = {
  id: string;
  workspaceId: string;
  projectName: string;
  title: string;
  content: string;
  date: string;
  workedDate: string;
  type: DevlogType;
  scheduleId: string | null;
  scheduleTitle: string | null;
  status: ScheduleStatus | null;
  tags: string[];
  /** 서버 응답의 authorName. 없으면 화면에 "-" 로 보인다. */
  authorName?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type WorkspaceLike = {
  id?: string;
  uuid?: string;
  workspaceId?: string;
  name?: string;
  title?: string;
  projectName?: string;
};
