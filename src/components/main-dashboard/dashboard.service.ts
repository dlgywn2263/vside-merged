import {
  fetchMainMonthSchedulesApi,
  fetchWorkspaceDevlogsApi,
} from "@/lib/ide/api";

import type {
  RawSchedule,
  WorkFlowItem,
  WorkspaceListResponse,
} from "./dashboard.types";

import {
  buildDevlogItems,
  buildScheduleItems,
  extractDevlogs,
  getMonthDays,
} from "./dashboard.utils";

export async function loadMonthlyWorkFlowItems(
  workspaces: WorkspaceListResponse[],
): Promise<WorkFlowItem[]> {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const monthKeys = getMonthDays(today).map((day) => day.key);

  const results = await Promise.allSettled(
    workspaces.map(async (workspace) => {
      const [scheduleResult, devlogResult] = await Promise.allSettled([
        fetchMainMonthSchedulesApi({
          view: workspace.mode,
          year,
          month,
          workspaceId: workspace.id,
        }),
        fetchWorkspaceDevlogsApi(workspace.id),
      ]);

      const schedules =
        scheduleResult.status === "fulfilled" &&
        Array.isArray(scheduleResult.value)
          ? (scheduleResult.value as RawSchedule[])
          : [];

      const devlogs =
        devlogResult.status === "fulfilled"
          ? extractDevlogs(devlogResult.value)
          : [];

      return [
        ...buildScheduleItems(workspace, schedules, monthKeys),
        ...buildDevlogItems(workspace, devlogs, monthKeys),
      ];
    }),
  );

  return results
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .sort((a, b) => b.sortTime - a.sortTime);
}
