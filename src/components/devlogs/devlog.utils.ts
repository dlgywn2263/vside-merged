import { normalizeUserId } from "@/lib/messages/identity";

import type { ScheduleStatus, WorkspaceLike } from "./devlog.types";

export const scheduleStatusLabel: Record<ScheduleStatus, string> = {
  todo: "할 일",
  progress: "진행 중",
  done: "완료",
  delayed: "지연",
};

export const statusStyle: Record<ScheduleStatus, string> = {
  todo: "bg-slate-100 text-slate-700 border-slate-200",
  progress: "bg-blue-50 text-blue-700 border-blue-200",
  done: "bg-purple-50 text-purple-700 border-purple-200",
  delayed: "bg-rose-50 text-rose-700 border-rose-200",
};

export function getTodayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const date = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${date}`;
}

export function extractWorkspaceList(value: unknown): WorkspaceLike[] {
  if (Array.isArray(value)) return value as WorkspaceLike[];

  if (value && typeof value === "object") {
    const objectValue = value as Record<string, unknown>;

    if (Array.isArray(objectValue.workspaces)) {
      return objectValue.workspaces as WorkspaceLike[];
    }

    if (Array.isArray(objectValue.data)) {
      return objectValue.data as WorkspaceLike[];
    }

    if (Array.isArray(objectValue.content)) {
      return objectValue.content as WorkspaceLike[];
    }

    if (Array.isArray(objectValue.list)) {
      return objectValue.list as WorkspaceLike[];
    }
  }

  return [];
}

export function normalizeWorkspaceId(value: string | null) {
  if (!value) return "";
  if (value === "undefined" || value === "null") return "";
  return value;
}

// 백엔드 규칙과 같다: 본인 일지만 수정·삭제한다(OWNER 도 남의 일지는 못 고친다).
// 작성자를 모르면(authorId 없음) 막는다. 닉네임은 겹칠 수 있어 비교에 쓰지 않는다.
export function canManageDevlog(
  devlog: { authorId?: unknown } | null | undefined,
  viewerId: string | null,
) {
  const authorId = normalizeUserId(devlog?.authorId);

  return Boolean(viewerId && authorId && authorId === viewerId);
}
