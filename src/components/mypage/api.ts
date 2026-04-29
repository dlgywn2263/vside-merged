"use client";

const API_BASE = "http://localhost:8080";

/**
 * 현재 프로젝트에서 저장될 수 있는 토큰 키들을 순서대로 확인
 * - token
 * - accessToken
 * - jwt
 * - authToken
 */
function getToken() {
  if (typeof window === "undefined") return null;

  const candidates = ["token", "accessToken", "jwt", "authToken"];

  for (const key of candidates) {
    const value = localStorage.getItem(key);
    if (value && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

/**
 * 디버깅용: 현재 localStorage 상태 빠르게 확인
 */
function debugTokenState() {
  if (typeof window === "undefined") return;

  console.log("[mypage api] localStorage keys:", Object.keys(localStorage));
  console.log("[mypage api] token =", localStorage.getItem("token"));
  console.log(
    "[mypage api] accessToken =",
    localStorage.getItem("accessToken"),
  );
  console.log("[mypage api] jwt =", localStorage.getItem("jwt"));
  console.log("[mypage api] authToken =", localStorage.getItem("authToken"));
}

async function authFetch(path: string, options: RequestInit = {}) {
  const token = getToken();

  if (!token) {
    debugTokenState();

    throw new Error(
      "[authFetch] 로그인 토큰이 없습니다. 로그인 후 다시 시도하세요.",
    );
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...(options.headers ?? {}),
  };

  console.log("[mypage api] request:", `${API_BASE}${path}`);
  console.log("[mypage api] Authorization header attached:", !!token);

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  const text = await res.text();

  if (!res.ok) {
    console.error("[mypage api] request failed:", {
      path,
      status: res.status,
      statusText: res.statusText,
      body: text,
    });

    throw new Error(
      text || `[authFetch] 요청 실패: ${res.status} ${res.statusText}`,
    );
  }

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export type UserMeResponse = {
  id: number;
  email: string;
  nickname: string;
  profileImageUrl?: string | null;
  createdAt?: string;
};

export type WorkspaceProjectResponse = {
  id: string;
  name: string;
  language: string;
  updatedAt: string;
};

export type WorkspaceListResponse = {
  id: string;
  name: string;
  mode: "team" | "personal";
  role: "owner" | "member";
  updatedAt: string;
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

export async function fetchMyProfile(): Promise<UserMeResponse> {
  return authFetch("/api/users/me");
}

export async function updateMyProfile(payload: {
  nickname: string;
  profileImageUrl?: string | null;
}): Promise<UserMeResponse> {
  return authFetch("/api/users/me", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function changeMyEmail(payload: {
  email: string;
}): Promise<UserMeResponse> {
  return authFetch("/api/users/me/email", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function changeMyPassword(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<string | null> {
  return authFetch("/api/users/me/password", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteMyAccount(): Promise<string | null> {
  return authFetch("/api/users/me", {
    method: "DELETE",
  });
}

export async function fetchMyWorkspaces(): Promise<WorkspaceListResponse[]> {
  return authFetch("/api/workspaces/me");
}

export async function fetchWorkspaceMembers(
  workspaceId: string,
): Promise<WorkspaceMemberResponse[]> {
  return authFetch(`/api/workspaces/${workspaceId}/members`);
}
