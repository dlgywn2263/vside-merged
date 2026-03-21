import { API_BASE } from "./constants";
import { ApiWorkspaceDetailResponse, FormValue } from "./types";

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  if (!token) {
    throw new Error("로그인 정보가 없습니다. 다시 로그인해주세요.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function handleJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "요청 처리 중 오류가 발생했습니다.");
  }

  return response.json() as Promise<T>;
}

async function handleVoidResponse(response: Response): Promise<void> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "요청 처리 중 오류가 발생했습니다.");
  }
}

function toPayload(workspaceId: string, form: FormValue) {
  return {
    workspaceId,
    projectId: Number(form.projectId),
    title: form.title.trim(),
    summary: form.summary.trim(),
    content: form.content.trim(),
    date: form.date,
    tagsText: form.tagsText,
    stage: form.stage,
    goal: form.goal,
    design: form.design,
    issue: form.issue,
    solution: form.solution,
    nextPlan: form.nextPlan,
    commitHash: form.commitHash,
    progress: Number(form.progress || 0),
  };
}

/**
 * 워크스페이스 상세 + 개발일지 목록
 */
export async function fetchWorkspaceDevlogs(
  workspaceId: string,
): Promise<ApiWorkspaceDetailResponse> {
  const response = await fetch(
    `${API_BASE}/api/devlogs/workspaces/${workspaceId}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
      cache: "no-store",
    },
  );

  return handleJsonResponse<ApiWorkspaceDetailResponse>(response);
}

/**
 * 개발일지 생성
 */
export async function createDevlog(workspaceId: string, form: FormValue) {
  const response = await fetch(`${API_BASE}/api/devlogs`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(toPayload(workspaceId, form)),
  });

  await handleVoidResponse(response);
}

/**
 * 개발일지 수정
 */
export async function updateDevlog(
  devlogId: number,
  workspaceId: string,
  form: FormValue,
) {
  const response = await fetch(`${API_BASE}/api/devlogs/${devlogId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(toPayload(workspaceId, form)),
  });

  await handleVoidResponse(response);
}

/**
 * 개발일지 삭제
 */
export async function deleteDevlog(
  devlogId: number,
  workspaceId: string,
  projectId: number,
) {
  const response = await fetch(
    `${API_BASE}/api/devlogs/${devlogId}?workspaceId=${encodeURIComponent(
      workspaceId,
    )}&projectId=${projectId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    },
  );

  await handleVoidResponse(response);
}
