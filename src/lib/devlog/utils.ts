import {
  ApiDevlogResponse,
  ApiProjectDevlogGroupResponse,
  DevlogItem,
  StageType,
} from "./types";

export function normalizeDate(input?: string | null) {
  if (!input) return todayYmd();
  if (input.includes("T")) return input.slice(0, 10);
  return input;
}

export function todayYmd() {
  return toYmd(new Date());
}

export function toYmd(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseTags(tags?: string[] | string | null): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) {
    return tags.map((v) => String(v).trim()).filter(Boolean);
  }

  return String(tags)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function normalizeStage(stage?: string | null): StageType {
  const value = (stage ?? "").trim().toLowerCase();

  if (value === "planning" || value === "기획") return "planning";
  if (value === "design" || value === "설계") return "design";
  if (value === "implementation" || value === "구현") return "implementation";
  if (value === "wrapup" || value === "마무리") return "wrapup";

  return "planning";
}

export function inferStage(
  title: string,
  summary: string,
  tags: string[],
): StageType {
  const source = `${title} ${summary} ${tags.join(" ")}`.toLowerCase();

  if (
    source.includes("설계") ||
    source.includes("erd") ||
    source.includes("흐름") ||
    source.includes("와이어") ||
    source.includes("구조")
  ) {
    return "design";
  }

  if (
    source.includes("기획") ||
    source.includes("요구사항") ||
    source.includes("주제")
  ) {
    return "planning";
  }

  if (
    source.includes("정리") ||
    source.includes("문서") ||
    source.includes("리팩토링") ||
    source.includes("마무리")
  ) {
    return "wrapup";
  }

  return "implementation";
}

export function mapApiDevlogToItem(
  post: ApiDevlogResponse,
  project: ApiProjectDevlogGroupResponse,
  workspaceId: string,
): DevlogItem {
  const tags = parseTags(post.tags);
  const rawProjectId = project.projectId ?? project.id ?? post.projectId;
  const numericProjectId = Number(rawProjectId);

  return {
    id: Number(post.id),
    workspaceId,
    projectId: Number.isNaN(numericProjectId) ? -1 : numericProjectId,
    projectTitle: project.projectTitle ?? project.name ?? "프로젝트",
    title: post.title ?? "",
    summary: post.summary ?? "",
    content: post.content ?? "",
    date: normalizeDate(post.date),
    tags,
    stage: post.stage
      ? normalizeStage(post.stage)
      : inferStage(post.title ?? "", post.summary ?? "", tags),

    goal: post.goal ?? "",
    design: post.design ?? "",
    issue: post.issue ?? "",
    solution: post.solution ?? "",
    nextPlan: post.nextPlan ?? "",
    commitHash: post.commitHash ?? "",
    progress: post.progress ?? 0,

    authorId: post.authorId ? Number(post.authorId) : undefined,
    authorName: post.authorName ?? "",
  };
}

export function getProjectPosts(project: ApiProjectDevlogGroupResponse) {
  return project.posts ?? project.devlogs ?? [];
}

export function shortDate(ymd: string) {
  const [, month, day] = ymd.split("-");
  return `${month}.${day}`;
}

export function formatKoreanDate(ymd: string) {
  const [year, month, day] = ymd.split("-");
  return `${year}.${month}.${day}`;
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function buildCalendarGrid(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const lastDay = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth() + 1,
    0,
  );

  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  const end = new Date(lastDay);
  end.setDate(lastDay.getDate() + (6 - lastDay.getDay()));

  const result: Date[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    result.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}
