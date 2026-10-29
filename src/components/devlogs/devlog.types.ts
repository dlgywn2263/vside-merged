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
  /** 작성자 사용자 ID(문자열로 정규화). 수정·삭제 권한 판단의 유일한 기준이다. */
  authorId?: string | null;
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
