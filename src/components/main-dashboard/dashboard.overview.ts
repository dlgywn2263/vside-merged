// 경로: src/components/main-dashboard/dashboard.overview.ts
//
// 프로젝트 대시보드의 "확인할 작업 · 팀원 · 최근 활동 · 자료실" 데이터.
// 새 API 를 만들지 않고, 다른 화면이 이미 쓰는 조회 API 만 모아 부른다.
// 한 곳이 실패해도 나머지는 보이도록 영역마다 따로 성공/실패를 들고 있는다(null = 실패).
import {
  fetchGitHistoryApi,
  fetchWorkspaceDevlogsApi,
  fetchWorkspaceSchedulesApi,
  getWorkspaceMembersApi,
} from "@/lib/ide/api";
import {
  fetchWorkspaceApiSpecsApi,
  fetchWorkspaceDesignDocumentApi,
  fetchWorkspaceRequirementsApi,
} from "@/lib/design/api";

import type { WorkspaceListResponse } from "./dashboard.types";
import {
  extractDevlogs,
  getScheduleStatusKey,
  normalizeDateKey,
  type ScheduleStatusKey,
} from "./dashboard.utils";

// 작업 폴더마다 Git 기록을 따로 불러야 해서 요청 수를 묶어 둔다.
const MAX_GIT_PROJECTS = 5;

const MAX_COMMITS_PER_PROJECT = 10;

export type OverviewSchedule = {
  id: string;
  title: string;
  category: string;
  status: ScheduleStatusKey;
  startKey: string;
  endKey: string;
  createdAt: number;
  updatedAt: number;
};

export type OverviewMember = {
  userId: number;
  name: string;
  email: string;
  isOwner: boolean;
};

export type OverviewCommit = {
  hash: string;
  message: string;
  author: string;
  projectName: string;
  time: number;
  dateText: string;
};

export type OverviewDevlog = {
  id: string;
  title: string;
  authorName: string;
  stage: string;
  time: number;
};

type DesignEntry = {
  id: string;
  label: string;
  createdAt: number;
  updatedAt: number;
};

export type OverviewDesign = {
  requirements: DesignEntry[];
  apiSpecs: DesignEntry[];
  erdNodeCount: number;
  flowNodeCount: number;
  documentUpdatedAt: number;
};

export type ProjectOverview = {
  schedules: OverviewSchedule[] | null;
  // 개인 프로젝트는 팀원 API 를 부르지 않는다(설정 화면과 같은 기준).
  members: OverviewMember[] | null | "personal";
  commits: OverviewCommit[] | null;
  devlogs: OverviewDevlog[] | null;
  design: OverviewDesign | null;
};

export function toTime(value?: string | null) {
  if (!value) return 0;

  const parsed = new Date(String(value).replace(" ", "T")).getTime();

  if (!Number.isNaN(parsed)) return parsed;

  const fallback = new Date(String(value)).getTime();

  return Number.isNaN(fallback) ? 0 : fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function countJsonArray(value: string) {
  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

async function loadSchedules(
  workspaceId: string,
): Promise<OverviewSchedule[]> {
  // 기간 없이 부르면 이 프로젝트의 일정 전체가 온다. 지난달에 끝났어야 할 미완료 일정도 보인다.
  const list = (await fetchWorkspaceSchedulesApi({
    workspaceId,
    startDate: undefined,
    endDate: undefined,
  })) as unknown[];

  return list.map((raw, index) => {
    const item = asRecord(raw);

    const startKey = normalizeDateKey(
      asText(item.startDate) || asText(item.date),
    );

    return {
      id: String(item.id ?? index),
      title: asText(item.title) || "제목 없는 일정",
      category: asText(item.category),
      status: getScheduleStatusKey(asText(item.status)),
      startKey,
      endKey: normalizeDateKey(asText(item.endDate)) || startKey,
      createdAt: toTime(asText(item.createdAt)),
      updatedAt: toTime(asText(item.updatedAt)),
    };
  });
}

async function loadMembers(
  workspaceId: string,
): Promise<OverviewMember[]> {
  const list = (await getWorkspaceMembersApi(workspaceId)) as unknown;

  if (!Array.isArray(list)) return [];

  return list
    .map((raw) => {
      const item = asRecord(raw);

      const userId = Number(item.userId ?? item.id);

      if (!Number.isFinite(userId)) return null;

      const email = asText(item.email);

      return {
        userId,
        email,
        name:
          asText(item.nickname) ||
          asText(item.name) ||
          email.split("@")[0] ||
          `사용자 ${userId}`,
        isOwner: asText(item.role).toUpperCase() === "OWNER",
      };
    })
    .filter((item): item is OverviewMember => item !== null)
    .sort((a, b) => Number(b.isOwner) - Number(a.isOwner));
}

async function loadCommits(
  workspace: WorkspaceListResponse,
): Promise<OverviewCommit[]> {
  const projectNames = (workspace.projects ?? [])
    .map((project) => project.name)
    .filter(Boolean)
    .slice(0, MAX_GIT_PROJECTS);

  // fetchGitHistoryApi 는 실패하면 빈 배열을 돌려준다(저장소가 없는 폴더 포함).
  const results = await Promise.all(
    projectNames.map(async (projectName) => {
      const logs = (await fetchGitHistoryApi(
        workspace.id,
        projectName,
        "master",
      )) as Array<Record<string, string>>;

      return logs
        .filter((log) => log.hash)
        .slice(0, MAX_COMMITS_PER_PROJECT)
        .map((log) => ({
          hash: log.hash,
          message: log.message || "(메시지 없음)",
          author: log.author || "",
          projectName,
          time: toTime(log.date),
          dateText: log.date || "",
        }));
    }),
  );

  return results.flat();
}

async function loadDevlogs(
  workspaceId: string,
): Promise<OverviewDevlog[]> {
  const list = extractDevlogs(
    await fetchWorkspaceDevlogsApi(workspaceId),
  ) as unknown[];

  return list.map((raw, index) => {
    const item = asRecord(raw);

    return {
      id: String(item.id ?? index),
      title: asText(item.title) || "제목 없는 개발일지",
      authorName: asText(item.authorName),
      stage: asText(item.stage),
      time:
        toTime(asText(item.createdAt)) ||
        toTime(asText(item.date)) ||
        toTime(asText(item.updatedAt)),
    };
  });
}

async function loadDesign(workspaceId: string): Promise<OverviewDesign> {
  const [requirements, apiSpecs, document] = await Promise.all([
    fetchWorkspaceRequirementsApi(workspaceId),
    fetchWorkspaceApiSpecsApi(workspaceId),
    fetchWorkspaceDesignDocumentApi(workspaceId),
  ]);

  const toEntries = (list: unknown[], getLabel: (item: Record<string, unknown>) => string) =>
    list.map((raw, index) => {
      const item = asRecord(raw);

      return {
        id: String(item.id ?? index),
        label: getLabel(item),
        createdAt: toTime(asText(item.createdAt)),
        updatedAt: toTime(asText(item.updatedAt)),
      };
    });

  return {
    requirements: toEntries(
      requirements as unknown[],
      (item) => asText(item.name) || "이름 없는 요구사항",
    ),
    apiSpecs: toEntries(
      apiSpecs as unknown[],
      (item) =>
        `${asText(item.method) || "GET"} ${asText(item.endpoint)}`.trim(),
    ),
    erdNodeCount: countJsonArray(document.erdNodesJson),
    flowNodeCount: countJsonArray(document.flowNodesJson),
    documentUpdatedAt: toTime(document.updatedAt),
  };
}

function settled<T>(result: PromiseSettledResult<T>) {
  return result.status === "fulfilled" ? result.value : null;
}

export async function loadProjectOverview(
  workspace: WorkspaceListResponse,
): Promise<ProjectOverview> {
  const isTeam = workspace.mode === "team";

  const [schedules, members, commits, devlogs, design] =
    await Promise.allSettled([
      loadSchedules(workspace.id),
      isTeam ? loadMembers(workspace.id) : Promise.resolve("personal" as const),
      loadCommits(workspace),
      loadDevlogs(workspace.id),
      loadDesign(workspace.id),
    ]);

  return {
    schedules: settled(schedules),
    members: settled(members),
    commits: settled(commits),
    devlogs: settled(devlogs),
    design: settled(design),
  };
}

/* =========================================================
   최근 활동: 위 데이터에서 시간이 있는 것만 한 줄로 모은다
========================================================= */
export type ActivityKind = "schedule" | "devlog" | "design" | "commit";

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  action: string;
  title: string;
  detail?: string;
  actor?: string;
  time: number;
};

// 생성 직후 저장으로 updatedAt 이 몇 초 늦게 찍히는 경우는 "수정"으로 보지 않는다.
const EDIT_THRESHOLD_MS = 60_000;

function pickChange(createdAt: number, updatedAt: number) {
  if (updatedAt && createdAt && updatedAt - createdAt > EDIT_THRESHOLD_MS) {
    return { edited: true, time: updatedAt };
  }

  return { edited: false, time: createdAt || updatedAt };
}

export function buildActivity(overview: ProjectOverview): ActivityItem[] {
  const items: ActivityItem[] = [];

  overview.schedules?.forEach((schedule) => {
    const change = pickChange(schedule.createdAt, schedule.updatedAt);

    if (!change.time) return;

    items.push({
      id: `schedule-${schedule.id}`,
      kind: "schedule",
      action: change.edited ? "일정 수정" : "일정 등록",
      title: schedule.title,
      detail: schedule.category || undefined,
      time: change.time,
    });
  });

  overview.devlogs?.forEach((devlog) => {
    if (!devlog.time) return;

    items.push({
      id: `devlog-${devlog.id}`,
      kind: "devlog",
      action: "개발일지 작성",
      title: devlog.title,
      detail: devlog.stage || undefined,
      actor: devlog.authorName || undefined,
      time: devlog.time,
    });
  });

  const design = overview.design;

  design?.requirements.forEach((entry) => {
    const change = pickChange(entry.createdAt, entry.updatedAt);

    if (!change.time) return;

    items.push({
      id: `requirement-${entry.id}`,
      kind: "design",
      action: change.edited ? "요구사항 수정" : "요구사항 추가",
      title: entry.label,
      time: change.time,
    });
  });

  design?.apiSpecs.forEach((entry) => {
    const change = pickChange(entry.createdAt, entry.updatedAt);

    if (!change.time) return;

    items.push({
      id: `api-${entry.id}`,
      kind: "design",
      action: change.edited ? "API 명세 수정" : "API 명세 추가",
      title: entry.label,
      time: change.time,
    });
  });

  if (design?.documentUpdatedAt) {
    items.push({
      id: "design-document",
      kind: "design",
      action: "ERD·흐름도 저장",
      title: `엔티티 ${design.erdNodeCount}개 · 화면 ${design.flowNodeCount}개`,
      time: design.documentUpdatedAt,
    });
  }

  overview.commits?.forEach((commit) => {
    if (!commit.time) return;

    items.push({
      id: `commit-${commit.projectName}-${commit.hash}`,
      kind: "commit",
      action: "커밋",
      title: commit.message,
      detail: `${commit.projectName} · ${commit.hash.slice(0, 7)}`,
      actor: commit.author || undefined,
      time: commit.time,
    });
  });

  return items.sort((a, b) => b.time - a.time);
}
