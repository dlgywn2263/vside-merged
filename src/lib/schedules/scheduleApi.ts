import type { ScheduleStatus } from "@/components/schedules/scheduleMockData";
import { apiFetch, apiJson } from "@/lib/api/apiClient";

/* =========================================================
   BACKEND RESPONSE
   ========================================================= */

export type BackendScheduleResponse = {
  id: string;

  workspaceId: string;

  projectName: string;

  title: string;

  description: string | null;

  startDate: string;

  endDate: string;

  status: ScheduleStatus;

  hasDevlog: boolean;

  /**
   * 일정 담당자
   *
   * 백엔드 ScheduleResponse에서 내려오는 값.
   */
  assigneeUserId: number | null;

  assigneeName: string | null;

  createdAt: string;

  updatedAt: string;
};

/* =========================================================
   FRONT SCHEDULE ITEM
   ========================================================= */

export type ScheduleApiItem = {
  id: string;

  workspaceId: string;

  projectName: string;

  customProjectName: string;

  title: string;

  description: string;

  date: string;

  startDate: string;

  endDate: string;

  status: ScheduleStatus;

  hasDevlog: boolean;

  /**
   * 담당 사용자 PK
   */
  assigneeUserId: number | null;

  /**
   * 담당 사용자 이름
   */
  assigneeName: string;

  createdAt: string;

  updatedAt: string;
};

/* =========================================================
   CREATE
   ========================================================= */

export type CreateScheduleRequest = {
  workspaceId: string;

  title: string;

  description: string;

  startDate: string;

  endDate: string;

  status: ScheduleStatus;

  /**
   * null이면 백엔드에서
   * 현재 로그인 사용자를 담당자로 설정.
   */
  assigneeUserId?: number | null;
};

/* =========================================================
   UPDATE STATUS
   ========================================================= */

export type UpdateScheduleStatusRequest = {
  scheduleId: string;

  status: ScheduleStatus;
};

/* =========================================================
   UPDATE PERIOD
   ========================================================= */

export type UpdateSchedulePeriodRequest = {
  scheduleId: string;

  startDate: string;

  endDate: string;
};

/* =========================================================
   UPDATE
   ========================================================= */

export type UpdateScheduleRequest = {
  scheduleId: string;

  title: string;

  description: string;

  startDate: string;

  endDate: string;

  status: ScheduleStatus;

  /**
   * 일정 담당자 변경.
   *
   * null 또는 undefined면
   * 백엔드에서는 기존 담당자를 유지하도록 구현.
   */
  assigneeUserId?: number | null;
};

/* =========================================================
   NORMALIZE
   ========================================================= */

export function normalizeScheduleFromApi(
  item: BackendScheduleResponse,
): ScheduleApiItem {
  return {
    id: String(item.id),

    workspaceId: String(item.workspaceId),

    projectName: item.projectName ?? "",

    customProjectName: item.projectName ?? "",

    title: item.title ?? "",

    description: item.description ?? "",

    date: item.startDate,

    startDate: item.startDate,

    endDate: item.endDate,

    status: item.status ?? "todo",

    hasDevlog: Boolean(item.hasDevlog),

    /**
     * 중요:
     * 기존 코드에서는 여기서 담당자 정보를 버리고 있었음.
     */
    assigneeUserId:
      item.assigneeUserId ?? null,

    assigneeName:
      item.assigneeName ?? "",

    createdAt: item.createdAt,

    updatedAt: item.updatedAt,
  };
}

/* =========================================================
   GET WORKSPACE SCHEDULES
   ========================================================= */

export async function fetchWorkspaceSchedulesApi({
  workspaceId,
  startDate,
  endDate,
}: {
  workspaceId: string;

  startDate?: string;

  endDate?: string;
}) {
  if (!workspaceId) {
    throw new Error("workspaceId가 없습니다.");
  }

  const params = new URLSearchParams();

  if (startDate && endDate) {
    params.set("startDate", startDate);
    params.set("endDate", endDate);
  }

  const queryString = params.toString();

  const data = (await apiJson(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/schedules${
      queryString ? `?${queryString}` : ""
    }`,
  )) as BackendScheduleResponse[];

  return Array.isArray(data)
    ? data.map(normalizeScheduleFromApi)
    : [];
}

/* =========================================================
   CREATE SCHEDULE
   ========================================================= */

export async function createWorkspaceScheduleApi({
  workspaceId,
  title,
  description,
  startDate,
  endDate,
  status,
  assigneeUserId,
}: CreateScheduleRequest) {
  if (!workspaceId) {
    throw new Error("workspaceId가 없습니다.");
  }

  const data = (await apiJson(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/schedules`,
    {
      method: "POST",

      body: JSON.stringify({
        title,

        description,

        startDate,

        endDate,

        status,

        /**
         * 중요:
         * 실제 담당자 ID를 백엔드 DTO로 전송.
         *
         * 값이 undefined이면 JSON.stringify 과정에서 빠지고,
         * 백엔드가 현재 로그인 사용자를 기본 담당자로 지정.
         */
        assigneeUserId,
      }),
    },
  )) as BackendScheduleResponse;

  return normalizeScheduleFromApi(data);
}

/* =========================================================
   UPDATE SCHEDULE
   ========================================================= */

export async function updateScheduleApi({
  scheduleId,
  title,
  description,
  startDate,
  endDate,
  status,
  assigneeUserId,
}: UpdateScheduleRequest) {
  if (!scheduleId) {
    throw new Error("scheduleId가 없습니다.");
  }

  const data = (await apiJson(
    `/api/schedules/${encodeURIComponent(scheduleId)}`,
    {
      method: "PUT",

      body: JSON.stringify({
        title,

        description,

        startDate,

        endDate,

        status,

        /**
         * 담당자를 수정할 때 같이 전송.
         */
        assigneeUserId,
      }),
    },
  )) as BackendScheduleResponse;

  return normalizeScheduleFromApi(data);
}

/* =========================================================
   UPDATE STATUS
   ========================================================= */

export async function updateScheduleStatusApi({
  scheduleId,
  status,
}: UpdateScheduleStatusRequest) {
  if (!scheduleId) {
    throw new Error("scheduleId가 없습니다.");
  }

  const data = (await apiJson(
    `/api/schedules/${encodeURIComponent(scheduleId)}/status`,
    {
      method: "PATCH",

      body: JSON.stringify({
        status,
      }),
    },
  )) as BackendScheduleResponse;

  return normalizeScheduleFromApi(data);
}

/* =========================================================
   UPDATE PERIOD
   ========================================================= */

export async function updateSchedulePeriodApi({
  scheduleId,
  startDate,
  endDate,
}: UpdateSchedulePeriodRequest) {
  if (!scheduleId) {
    throw new Error("scheduleId가 없습니다.");
  }

  const data = (await apiJson(
    `/api/schedules/${encodeURIComponent(scheduleId)}/period`,
    {
      method: "PATCH",

      body: JSON.stringify({
        startDate,

        endDate,
      }),
    },
  )) as BackendScheduleResponse;

  return normalizeScheduleFromApi(data);
}

/* =========================================================
   DELETE
   ========================================================= */

export async function deleteScheduleApi(
  value:
    | string
    | {
        scheduleId: string;
      },
) {
  const scheduleId =
    typeof value === "string"
      ? value
      : value.scheduleId;

  if (!scheduleId) {
    throw new Error("scheduleId가 없습니다.");
  }

  const response = await apiFetch(
    `/api/schedules/${encodeURIComponent(scheduleId)}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    const message = await response.text().catch(() => "");

    throw new Error(
      message || "일정 삭제 실패",
    );
  }

  return true;
}