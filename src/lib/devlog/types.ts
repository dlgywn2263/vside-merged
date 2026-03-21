export type StageType = "planning" | "design" | "implementation" | "wrapup";

export type SortType = "latest" | "oldest";

export type ProjectOption = {
  id: number;
  name: string;
};

export type DevlogItem = {
  id: number;
  workspaceId: string;
  projectId: number;
  projectTitle: string;
  title: string;
  summary: string;
  content: string;
  date: string;
  tags: string[];
  stage: StageType;

  goal?: string;
  design?: string;
  issue?: string;
  solution?: string;
  nextPlan?: string;
  commitHash?: string;
  progress?: number;

  authorId?: number;
  authorName?: string;
};

export type FormValue = {
  projectId: string;
  title: string;
  summary: string;
  content: string;
  date: string;
  tagsText: string;
  stage: StageType;

  goal: string;
  design: string;
  issue: string;
  solution: string;
  nextPlan: string;
  commitHash: string;
  progress: string;
};

export type ApiDevlogResponse = {
  id: number | string;
  workspaceId?: string;
  projectId?: number | string;
  projectTitle?: string;

  title: string;
  summary: string;
  content: string;
  date: string;
  tags?: string[] | string | null;
  stage?: string | null;

  goal?: string | null;
  design?: string | null;
  issue?: string | null;
  solution?: string | null;
  nextPlan?: string | null;
  commitHash?: string | null;
  progress?: number | null;

  authorId?: number | string | null;
  authorName?: string | null;
};

export type ApiProjectDevlogGroupResponse = {
  projectId?: number | string;
  id?: number | string;
  projectTitle?: string;
  name?: string;
  description?: string;
  language?: string;
  lastUpdatedDate?: string | null;
  devlogCount?: number;

  posts?: ApiDevlogResponse[];
  devlogs?: ApiDevlogResponse[];
};

export type ApiWorkspaceDetailResponse = {
  uuid: string;
  name: string;
  mode: "personal" | "team";
  projects?: ApiProjectDevlogGroupResponse[];
};
