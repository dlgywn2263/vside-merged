"use client";

const API_BASE = "http://localhost:8080";

function getToken() {
  if (typeof window === "undefined") return null;

  const candidates = ["accessToken", "token", "jwt", "authToken"];

  for (const key of candidates) {
    const value = localStorage.getItem(key);

    if (value && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function debugTokenState() {
  if (typeof window === "undefined") return;

  console.log("[mypage api] localStorage keys:", Object.keys(localStorage));
  console.log(
    "[mypage api] accessToken =",
    localStorage.getItem("accessToken"),
  );
  console.log("[mypage api] token =", localStorage.getItem("token"));
  console.log("[mypage api] jwt =", localStorage.getItem("jwt"));
  console.log("[mypage api] authToken =", localStorage.getItem("authToken"));
}

async function authFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  if (!token) {
    debugTokenState();
    throw new Error("로그인 정보가 없습니다. 다시 로그인해주세요.");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
    cache: "no-store",
  });

  const text = await response.text();

  if (!response.ok) {
    let message = "요청 처리 중 오류가 발생했습니다.";

    try {
      const json = JSON.parse(text);
      message = json.message ?? json.error ?? message;
    } catch {
      if (text) message = text;
    }

    console.error("[mypage api] request failed:", {
      path,
      status: response.status,
      statusText: response.statusText,
      message,
    });

    throw new Error(message);
  }

  if (!text) return null as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}

export type UserMeResponse = {
  id: number;
  email: string;
  nickname: string;
  profileImageUrl?: string | null;
  createdAt?: string;
};

export type ProjectStatusResponse =
  | "active"
  | "completed"
  | "ACTIVE"
  | "COMPLETED"
  | "done"
  | "DONE"
  | "complete"
  | "COMPLETE"
  | string;

export type WorkspaceProjectResponse = {
  id: string;
  name: string;
  language?: string | null;
  updatedAt?: string | null;
  status?: ProjectStatusResponse | null;
  progress?: number | null;
  description?: string | null;
  stack?: string[] | null;
  devlogCount?: number | null;
  doneScheduleCount?: number | null;
};

export type WorkspaceListResponse = {
  id: string;
  name: string;
  mode: "team" | "personal";
  role: "owner" | "member" | "OWNER" | "MEMBER";
  updatedAt?: string | null;
  description?: string | null;
  teamName?: string | null;
  projects: WorkspaceProjectResponse[];
};

export type WorkspaceMemberResponse = {
  userId: number;
  email: string;
  nickname: string;
  role: "OWNER" | "MEMBER";
};

export type MyPageDevlogResponse = Record<string, unknown>;

export type WorkspaceDevlogsResponse = unknown;

export type ScheduleView = "personal" | "team";

export type ScheduleProgressResponse = {
  workspaceId: string;
  workspaceName: string;
  type: string;
  totalCount: number;
  doneCount: number;
  progress: number;
};

export async function fetchMyProfile(): Promise<UserMeResponse> {
  return authFetch<UserMeResponse>("/api/users/me");
}

export async function updateMyProfile(payload: {
  nickname: string;
  profileImageUrl?: string | null;
}): Promise<UserMeResponse> {
  return authFetch<UserMeResponse>("/api/users/me", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function changeMyEmailApi(email: string): Promise<UserMeResponse> {
  return authFetch<UserMeResponse>("/api/users/me/email", {
    method: "PATCH",
    body: JSON.stringify({ email }),
  });
}

export async function changeMyPasswordApi(
  currentPassword: string,
  newPassword: string,
): Promise<string | null> {
  return authFetch<string | null>("/api/users/me/password", {
    method: "PATCH",
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
  });
}

export async function deleteMyAccountApi(): Promise<string | null> {
  return authFetch<string | null>("/api/users/me", {
    method: "DELETE",
  });
}

export async function fetchMyWorkspaces(): Promise<WorkspaceListResponse[]> {
  return authFetch<WorkspaceListResponse[]>("/api/workspaces/me");
}

export async function fetchWorkspaceMembers(
  workspaceId: string,
): Promise<WorkspaceMemberResponse[]> {
  return authFetch<WorkspaceMemberResponse[]>(
    `/api/workspaces/${workspaceId}/members`,
  );
}

export async function fetchWorkspaceDevlogs(
  workspaceId: string,
): Promise<WorkspaceDevlogsResponse> {
  return authFetch<WorkspaceDevlogsResponse>(
    `/api/devlogs/workspaces/${workspaceId}`,
  );
}

export async function fetchScheduleProgress(
  view: ScheduleView,
  workspaceId: string,
): Promise<ScheduleProgressResponse> {
  return authFetch<ScheduleProgressResponse>(
    `/api/schedules/progress?view=${encodeURIComponent(
      view,
    )}&workspaceId=${encodeURIComponent(workspaceId)}`,
  );
}
