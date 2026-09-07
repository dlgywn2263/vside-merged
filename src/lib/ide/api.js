"use client";

import { apiFetch } from "@/lib/api/apiClient";
import { authClient } from "@/lib/auth/authClient";
import { getCurrentUserId } from "@/lib/auth/tokenStore";

const API_BASE = "/api/workspaces";
const GIT_API_BASE = "/api/git";

const DEVLOG_API_BASE = "/api/devlogs";
const SCHEDULE_API_BASE = "/api/schedules";
const AUTH_API_BASE = "/api/auth";
const USER_API_BASE = "/api/users";
const SYSTEM_API_BASE = "/api/system";
const CODEMAP_API_BASE = "/api/codemap";
const AI_API_BASE = "/api/ai";

// ============================================================================
// 공통 인증 fetch
// ============================================================================

export const authFetch = async (url, options = {}) => {
  try {
    return await apiFetch(url, options);
  } catch (error) {
    throw new Error(error?.message || "네트워크 요청 중 오류가 발생했습니다.");
  }
};

// ============================================================================
// 공통 API 응답 처리 유틸
// - 서버가 JSON 또는 text를 내려줘도 프론트에서 일관되게 처리하기 위한 함수입니다.
// - Git/Sandbox API는 status 기반 JSON 응답을 사용합니다.
// ============================================================================

const readApiBody = async (response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const getApiMessage = (payload, fallbackMessage) => {
  if (!payload) return fallbackMessage;

  if (typeof payload === "string") {
    return payload || fallbackMessage;
  }

  if (typeof payload === "object") {
    return payload.message || payload.error || fallbackMessage;
  }

  return fallbackMessage;
};

const throwApiResponseError = async (response, fallbackMessage) => {
  const payload = await readApiBody(response);
  const error = new Error(getApiMessage(payload, fallbackMessage));

  error.status = response.status;
  error.payload = payload;

  throw error;
};

// ============================================================================
// 인증 / 유저 API
// ============================================================================

export const loginApi = async (email, password) => {
  const result = await authClient.login(email, password);

  return {
    accessToken: result.accessToken,
    token: result.accessToken,
    userId: result.userId,
    user: result.user,
  };
};

export const registerApi = async (email, nickname, password) => {
  return authClient.register({
    email,
    nickname,
    password,
  });
};

export const refreshAuthApi = async () => {
  return authClient.refresh();
};

export const logoutApi = async () => {
  return authClient.logout();
};

export const getMeApi = async () => {
  return authClient.me();
};

export const getUserProfileApi = async (userId) => {
  const response = await authFetch(`${USER_API_BASE}/${userId}`);

  if (!response.ok) {
    throw new Error("유저 정보를 불러올 수 없습니다.");
  }

  return await response.json();
};

// ============================================================================
// 일정관리 API - 신규 백엔드 연동용
// ============================================================================

const normalizeScheduleFromApi = (item) => {
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    projectName: item.projectName,
    customProjectName: item.projectName,

    title: item.title ?? "",
    description: item.description ?? "",
    date: item.startDate,
    startDate: item.startDate,
    endDate: item.endDate,

    status: item.status ?? "todo",
    category: item.category ?? "General",
    hasDevlog: Boolean(item.hasDevlog),

    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
};

export const fetchWorkspaceSchedulesApi = async ({
  workspaceId,
  startDate,
  endDate,
}) => {
  if (!workspaceId) {
    throw new Error("workspaceId가 없습니다.");
  }

  const params = new URLSearchParams();

  if (startDate && endDate) {
    params.set("startDate", startDate);
    params.set("endDate", endDate);
  }

  const queryString = params.toString();

  const response = await authFetch(
    `${API_BASE}/${encodeURIComponent(workspaceId)}/schedules${
      queryString ? `?${queryString}` : ""
    }`,
  );

  if (!response.ok) {
    const errMsg = await response.text();
    throw new Error(errMsg || "일정 목록 로드 실패");
  }

  const data = await response.json();

  return Array.isArray(data) ? data.map(normalizeScheduleFromApi) : [];
};

export const createWorkspaceScheduleApi = async ({
  workspaceId,
  title,
  description,
  startDate,
  endDate,
  status = "todo",
  category = "General",
}) => {
  if (!workspaceId) {
    throw new Error("workspaceId가 없습니다.");
  }

  const response = await authFetch(
    `${API_BASE}/${encodeURIComponent(workspaceId)}/schedules`,
    {
      method: "POST",
      body: JSON.stringify({
        title,
        description,
        startDate,
        endDate,
        status,
        category,
      }),
    },
  );

  if (!response.ok) {
    const errMsg = await response.text();
    throw new Error(errMsg || "일정 생성 실패");
  }

  return normalizeScheduleFromApi(await response.json());
};

export const updateScheduleStatusApi = async ({ scheduleId, status }) => {
  if (!scheduleId) {
    throw new Error("scheduleId가 없습니다.");
  }

  const response = await authFetch(
    `${SCHEDULE_API_BASE}/${encodeURIComponent(scheduleId)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );

  if (!response.ok) {
    const errMsg = await response.text();
    throw new Error(errMsg || "일정 상태 변경 실패");
  }

  return normalizeScheduleFromApi(await response.json());
};

export const updateSchedulePeriodApi = async ({
  scheduleId,
  startDate,
  endDate,
}) => {
  if (!scheduleId) {
    throw new Error("scheduleId가 없습니다.");
  }

  const response = await authFetch(
    `${SCHEDULE_API_BASE}/${encodeURIComponent(scheduleId)}/period`,
    {
      method: "PATCH",
      body: JSON.stringify({
        startDate,
        endDate,
      }),
    },
  );

  if (!response.ok) {
    const errMsg = await response.text();
    throw new Error(errMsg || "일정 날짜 변경 실패");
  }

  return normalizeScheduleFromApi(await response.json());
};

export const deleteScheduleApi = async (scheduleId) => {
  if (!scheduleId) {
    throw new Error("scheduleId가 없습니다.");
  }

  const response = await authFetch(
    `${SCHEDULE_API_BASE}/${encodeURIComponent(scheduleId)}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    const errMsg = await response.text();
    throw new Error(errMsg || "일정 삭제 실패");
  }

  return true;
};

// ============================================================================
// 일정관리 API 호환 함수
// - 기존 메인 대시보드/일정 화면에서 쓰던 함수명을 유지하기 위한 wrapper
// - 같은 파일 안의 fetchWorkspaceSchedulesApi를 그대로 사용함
// ============================================================================

function formatScheduleDateKey(year, month, date) {
  const mm = String(month).padStart(2, "0");
  const dd = String(date).padStart(2, "0");

  return `${year}-${mm}-${dd}`;
}

function getScheduleMonthRange(year, month) {
  const startDate = formatScheduleDateKey(year, month, 1);
  const lastDate = new Date(year, month, 0).getDate();
  const endDate = formatScheduleDateKey(year, month, lastDate);

  return {
    startDate,
    endDate,
  };
}

function getScheduleWeekRange(baseDate = new Date()) {
  const start = new Date(baseDate);
  start.setDate(baseDate.getDate() - baseDate.getDay());

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    startDate: formatScheduleDateKey(
      start.getFullYear(),
      start.getMonth() + 1,
      start.getDate(),
    ),
    endDate: formatScheduleDateKey(
      end.getFullYear(),
      end.getMonth() + 1,
      end.getDate(),
    ),
  };
}

export async function fetchMainMonthSchedulesApi({ workspaceId, year, month }) {
  if (!workspaceId) {
    return [];
  }

  const { startDate, endDate } = getScheduleMonthRange(year, month);

  return fetchWorkspaceSchedulesApi({
    workspaceId,
    startDate,
    endDate,
  });
}

export async function fetchMainWeekSchedulesApi({
  workspaceId,
  startDate,
  endDate,
}) {
  if (!workspaceId) {
    return [];
  }

  if (startDate && endDate) {
    return fetchWorkspaceSchedulesApi({
      workspaceId,
      startDate,
      endDate,
    });
  }

  const weekRange = getScheduleWeekRange();

  return fetchWorkspaceSchedulesApi({
    workspaceId,
    startDate: weekRange.startDate,
    endDate: weekRange.endDate,
  });
}

export async function fetchScheduleProgressApi({ workspaceId }) {
  if (!workspaceId) {
    return {
      total: 0,
      done: 0,
      progressRate: 0,
    };
  }

  const schedules = await fetchWorkspaceSchedulesApi({ workspaceId });

  const total = schedules.length;
  const done = schedules.filter((item) => item.status === "done").length;
  const progressRate = total === 0 ? 0 : Math.round((done / total) * 100);

  return {
    total,
    done,
    progressRate,
  };
}

// ============================================================================
// 워크스페이스 / 프로젝트 API
// ============================================================================

export const getMyWorkspacesApi = async (userId = getCurrentUserId()) => {
  const response = await authFetch(`${API_BASE}?userId=${userId}`);
  if (!response.ok) throw new Error("워크스페이스 목록 로드 실패");
  return await response.json();
};

// 새 백엔드 기준 개발일지 조회
// GET /api/workspaces/{workspaceId}/devlogs
export const fetchWorkspaceDevlogsApi = async (workspaceId) => {
  const response = await authFetch(
    `${API_BASE}/${encodeURIComponent(workspaceId)}/devlogs`,
  );

  if (!response.ok) {
    const errMsg = await response.text();
    throw new Error(errMsg || "개발일지 로드 실패");
  }

  const data = await response.json();

  return Array.isArray(data) ? data.map(normalizeDevlogFromApi) : [];
};
// ============================================================================
// 개발일지 API - 신규 백엔드 연동용
// ============================================================================

const normalizeDevlogFromApi = (item) => {
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    projectName: item.projectName,

    title: item.title ?? "",
    content: item.content ?? "",
    date: item.workedDate,
    workedDate: item.workedDate,

    type: item.type ?? (item.scheduleId ? "linked" : "general"),

    scheduleId: item.scheduleId ?? null,
    scheduleTitle: item.scheduleTitle ?? null,
    status: item.scheduleStatus ?? null,

    tags: Array.isArray(item.tags) ? item.tags : [],

    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
};

export const createWorkspaceDevlogApi = async ({
  workspaceId,
  scheduleId,
  title,
  content,
  workedDate,
  scheduleStatusAfterWrite = "none",
}) => {
  if (!workspaceId) {
    throw new Error("workspaceId가 없습니다.");
  }

  const response = await authFetch(
    `${API_BASE}/${encodeURIComponent(workspaceId)}/devlogs`,
    {
      method: "POST",
      body: JSON.stringify({
        scheduleId: scheduleId || null,
        title,
        content,
        workedDate,
        scheduleStatusAfterWrite,
      }),
    },
  );

  if (!response.ok) {
    const errMsg = await response.text();
    throw new Error(errMsg || "개발일지 생성 실패");
  }

  return normalizeDevlogFromApi(await response.json());
};

export const updateDevlogApi = async ({
  devlogId,
  scheduleId,
  title,
  content,
  workedDate,
}) => {
  if (!devlogId) {
    throw new Error("devlogId가 없습니다.");
  }

  const response = await authFetch(
    `${DEVLOG_API_BASE}/${encodeURIComponent(devlogId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        scheduleId: scheduleId || null,
        title,
        content,
        workedDate,
      }),
    },
  );

  if (!response.ok) {
    const errMsg = await response.text();
    throw new Error(errMsg || "개발일지 수정 실패");
  }

  return normalizeDevlogFromApi(await response.json());
};




export const deleteDevlogApi = async (devlogId) => {
  if (!devlogId) {
    throw new Error("devlogId가 없습니다.");
  }

  const response = await authFetch(
    `${DEVLOG_API_BASE}/${encodeURIComponent(devlogId)}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    const errMsg = await response.text();
    throw new Error(errMsg || "개발일지 삭제 실패");
  }

  return true;
};

export const createWorkspaceApi = async ({
  mode,
  name,
  description = "",
  path,
  teamName,
}) => {
  const userId = getCurrentUserId();

  if (!userId) {
    throw new Error("로그인 사용자 ID가 없습니다.");
  }

  const response = await authFetch(`${API_BASE}`, {
    method: "POST",
    body: JSON.stringify({
      userId: String(userId),
      name,
      description,
      path,
      type: mode === "team" ? "TEAM" : "PERSONAL",
      teamName: mode === "team" ? teamName || name : null,
    }),
  });

  if (!response.ok) {
    const errMsg = await response.text();
    throw new Error(errMsg || "워크스페이스 생성 실패");
  }

  return await response.json();
};

export const createWorkspaceLegacyApi = async (
  name,
  path = "",
  userId = getCurrentUserId(),
  type = "PERSONAL",
) => {
  const response = await authFetch(`${API_BASE}`, {
    method: "POST",
    body: JSON.stringify({
      userId: String(userId),
      name,
      path,
      type,
    }),
  });

  if (!response.ok) throw new Error("워크스페이스 생성 실패");
  return await response.json();
};

export const fetchWorkspaceProjectsApi = async (workspaceId) => {
  const response = await authFetch(`${API_BASE}/${workspaceId}/projects`);

  if (!response.ok) {
    const errMsg = await response.text();
    throw new Error(errMsg || "프로젝트 목록 로드 실패");
  }

  return await response.json();
};

export const getMyWorkspacesByTokenApi = async () => {
  const response = await authFetch(`${API_BASE}/me`);

  if (!response.ok) {
    const errMsg = await response.text();
    throw new Error(errMsg || "내 워크스페이스 목록 로드 실패");
  }

  return await response.json();
};

export const createProjectApi = async ({
  workspaceId,
  projectName,
  language,
  description = "",
  gitUrl = "",
  templateType = "CONSOLE",
}) => {
  const response = await authFetch(`${API_BASE}/project`, {
    method: "POST",
    body: JSON.stringify({
      workspaceId,
      projectName,
      language,
      description,
      gitUrl,
      templateType,
    }),
  });

  if (!response.ok) {
    const errMsg = await response.text();
    throw new Error(errMsg || "프로젝트 생성 실패");
  }

  return await response.text();
};

export const createProjectInWorkspaceApi = async ({
  workspaceId,
  projectName,
  language,
  description = "",
  gitUrl = "",
  templateType = "CONSOLE",
}) => {
  return createProjectApi({
    workspaceId,
    projectName,
    language,
    description,
    gitUrl,
    templateType,
  });
};

// ============================================================================
// 파일 시스템 API
// ============================================================================

export const fetchProjectFilesApi = async (
  workspaceId,
  projectName,
  branchName = "master",
) => {
  const safeBranchName = branchName || "master";

  const response = await authFetch(
    `${API_BASE}/${workspaceId}/files?projectName=${encodeURIComponent(
      projectName,
    )}&branchName=${encodeURIComponent(safeBranchName)}`,
  );

  if (!response.ok) {
    throw new Error("파일 트리 로드 실패");
  }

  return await response.json();
};

export const fetchFileContentApi = async (
  workspaceId,
  projectName,
  branchName = "master",
  filePath,
) => {
  const safeBranchName = branchName || "master";

  const response = await authFetch(
    `${API_BASE}/${workspaceId}/file?projectName=${encodeURIComponent(
      projectName,
    )}&branchName=${encodeURIComponent(
      safeBranchName,
    )}&path=${encodeURIComponent(filePath)}`,
  );

  if (!response.ok) {
    throw new Error("파일 내용 로드 실패");
  }

  return await response.text();
};

export const createFileApi = async (
  workspaceId,
  projectName,
  branchName = "master",
  filePath,
  type,
) => {
  const response = await authFetch(`${API_BASE}/files`, {
    method: "POST",
    body: JSON.stringify({
      workspaceId,
      projectName,
      branchName: branchName || "master",
      filePath,
      type,
      code: "",
    }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || "파일 생성 실패");
  }
};

/**
 * 이 방의 최초 내용을 넣을 권한을 서버에 물어본다.
 *
 * 협업 서버는 문서를 보관하지 않으므로, 파일을 처음 여는 사람이 디스크
 * 내용을 문서에 넣어야 한다. 그런데 누가 처음인지는 클라이언트끼리 알 수
 * 없다 — 접속 정보가 오가기 전에 판단하게 되기 때문이다. 그래서 둘이 같은
 * 파일을 동시에 열면 같은 내용을 두 번 넣거나(중복) 아무도 안 넣는다(빈 화면).
 *
 * 방마다 한 사람만 허락받는다. 못 받았으면 절대 넣지 말고, 먼저 들어온
 * 사람의 내용이 동기화로 오기를 기다려야 한다.
 */
export const claimCollabSeedApi = async (room) => {
  const response = await authFetch("/api/collab/rooms/seed-claim", {
    method: "POST",
    body: JSON.stringify({ room }),
  });

  if (!response.ok) {
    // 물어보지 못했으면 넣지 않는 쪽이 안전하다. 중복은 되돌리기 어렵고,
    // 빈 화면은 상대가 넣어 주면 곧 채워진다.
    return false;
  }

  const result = await response.json().catch(() => null);
  return Boolean(result?.granted);
};

export const saveFileApi = async (
  workspaceId,
  projectName,
  branchName = "master",
  filePath,
  code,
) => {
  const response = await authFetch(`${API_BASE}/save`, {
    method: "POST",
    body: JSON.stringify({
      workspaceId,
      projectName,
      branchName: branchName || "master",
      filePath,
      code,
    }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || "파일 저장 실패");
  }
};

export const deleteFileApi = async (
  workspaceId,
  projectName,
  branchName = "master",
  filePath,
) => {
  const response = await authFetch(`${API_BASE}/files`, {
    method: "DELETE",
    body: JSON.stringify({
      workspaceId,
      projectName,
      branchName: branchName || "master",
      filePath,
    }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || "삭제 실패");
  }
};

export const renameFileApi = async (
  workspaceId,
  projectName,
  branchName = "master",
  filePath,
  newName,
) => {
  const response = await authFetch(`${API_BASE}/files/rename`, {
    method: "PUT",
    body: JSON.stringify({
      workspaceId,
      projectName,
      branchName: branchName || "master",
      filePath,
      newName,
    }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || "이름 변경 실패");
  }
};

export const buildProjectApi = async (
  workspaceId,
  projectName,
  branchName = "master",
  language,
) => {
  const response = await authFetch(`${API_BASE}/build`, {
    method: "POST",
    body: JSON.stringify({
      workspaceId,
      projectName,
      branchName: branchName || "master",
      language,
    }),
  });

  if (!response.ok) {
    const errMsg = await response.text();
    throw new Error("빌드 실패: " + errMsg);
  }

  return await response.blob();
};

// ============================================================================
// GIT API
// ============================================================================

export const fetchBranchListApi = async (workspaceId, projectName) => {
  const response = await authFetch(
    `${GIT_API_BASE}/${workspaceId}/${encodeURIComponent(projectName)}/branches`,
  );

  if (!response.ok) {
    const msg = await response.text().catch(() => "");
    throw new Error(msg || "브랜치 목록 로드 실패");
  }

  return await response.json();
};

export const updateGitUrlApi = async (workspaceId, projectName, gitUrl) => {
  const response = await authFetch(`${GIT_API_BASE}/project/git-url`, {
    method: "POST",
    body: JSON.stringify({
      workspaceId,
      projectName,
      gitUrl,
    }),
  });

  if (!response.ok) {
    const msg = await response.text().catch(() => "");
    throw new Error(msg || "Git 연동 실패");
  }

  return await response.text();
};

/**
 * Sourcetree식 브랜치 생성 API
 *
 * 예:
 * createBranchApi(workspaceId, projectName, "feature/login", "develop")
 *
 * 의미:
 * develop 브랜치 기준으로 feature/login 생성
 */
export const createBranchApi = async (
  workspaceId,
  projectName,
  branchName,
  baseBranch = "master",
  checkoutAfterCreate = true,
) => {
  const response = await authFetch(`${GIT_API_BASE}/branches`, {
    method: "POST",
    body: JSON.stringify({
      workspaceId,
      projectName,
      branchName,
      baseBranch,
      checkoutAfterCreate,
    }),
  });

  if (!response.ok) {
    const msg = await response.text().catch(() => "");
    throw new Error("브랜치 생성 실패: " + (msg || "알 수 없는 오류"));
  }

  return await response.text();
};

export const fetchGitStatusApi = async (
  workspaceId,
  projectName,
  branchName = "master",
) => {
  const response = await authFetch(
    `${GIT_API_BASE}/${workspaceId}/${encodeURIComponent(
      projectName,
    )}/status?branchName=${encodeURIComponent(branchName || "master")}`,
  );

  if (!response.ok) {
    const msg = await response.text().catch(() => "");
    throw new Error(msg || "Git 상태 조회 실패");
  }

  return await response.json();
};

export const stageFilesApi = async (
  workspaceId,
  projectName,
  branchName,
  filePattern,
) => {
  const response = await authFetch(`${GIT_API_BASE}/stage`, {
    method: "POST",
    body: JSON.stringify({
      workspaceId,
      projectName,
      branchName,
      filePattern,
    }),
  });

  if (!response.ok) {
    const msg = await response.text().catch(() => "");
    throw new Error(msg || "스테이징 실패");
  }

  return await response.text();
};

export const unstageFilesApi = async (
  workspaceId,
  projectName,
  branchName,
  filePattern,
) => {
  const response = await authFetch(`${GIT_API_BASE}/unstage`, {
    method: "POST",
    body: JSON.stringify({
      workspaceId,
      projectName,
      branchName,
      filePattern,
    }),
  });

  if (!response.ok) {
    const msg = await response.text().catch(() => "");
    throw new Error(msg || "언스테이징 실패");
  }

  return await response.text();
};

export const commitChangesApi = async (
  workspaceId,
  projectName,
  branchName,
  commitMessage,
  authorName,
  authorEmail,
) => {
  const response = await authFetch(`${GIT_API_BASE}/commit`, {
    method: "POST",
    body: JSON.stringify({
      workspaceId,
      projectName,
      branchName,
      commitMessage,
      authorName,
      authorEmail,
    }),
  });

  if (!response.ok) {
    const msg = await response.text().catch(() => "");
    throw new Error(msg || "커밋 실패");
  }

  return await response.text();
};

/**
 * Fetch
 *
 * 원격 저장소의 최신 refs 정보를 가져오지만,
 * 현재 브랜치에 merge/rebase하지는 않는다.
 */
export const fetchRemoteApi = async (
  workspaceId,
  projectName,
  branchName = "master",
  token = "",
) => {
  const response = await authFetch(`${GIT_API_BASE}/fetch`, {
    method: "POST",
    body: JSON.stringify({
      workspaceId,
      projectName,
      branchName,
      token,
    }),
  });

  if (!response.ok) {
    const errMsg = await response.text().catch(() => "");

    if (response.status === 403 && errMsg.includes("GITHUB_TOKEN")) {
      const error = new Error("깃허브 계정 연동이 필요합니다.");
      error.code = "GITHUB_AUTH_REQUIRED";
      throw error;
    }

    throw new Error(errMsg || "Fetch 실패");
  }

  return await response.text();
};

export const pushToRemoteApi = async (
  workspaceId,
  projectName,
  branchName,
  token = "",
) => {
  const response = await authFetch(`${GIT_API_BASE}/push`, {
    method: "POST",
    body: JSON.stringify({
      workspaceId,
      projectName,
      branchName,
      token,
    }),
  });

  if (!response.ok) {
    const errMsg = await response.text().catch(() => "");

    if (response.status === 403 && errMsg.includes("GITHUB_TOKEN")) {
      const error = new Error("깃허브 계정 연동이 필요합니다.");
      error.code = "GITHUB_AUTH_REQUIRED";
      throw error;
    }

    throw new Error(errMsg || "푸시 실패");
  }

  return await response.text();
};

export const pullFromRemoteApi = async (
  workspaceId,
  projectName,
  branchName,
  token = "",
) => {
  const response = await authFetch(`${GIT_API_BASE}/pull`, {
    method: "POST",
    body: JSON.stringify({
      workspaceId,
      projectName,
      branchName,
      token,
    }),
  });

  if (!response.ok) {
    const errMsg = await response.text().catch(() => "");

    if (response.status === 403 && errMsg.includes("GITHUB_TOKEN")) {
      const error = new Error("깃허브 계정 연동이 필요합니다.");
      error.code = "GITHUB_AUTH_REQUIRED";
      throw error;
    }

    throw new Error(errMsg || "Pull 실패");
  }

  return await response.text();
};

export const fetchGitHistoryApi = async (
  workspaceId,
  projectName,
  branchName = "master",
) => {
  try {
    const response = await authFetch(
      `${GIT_API_BASE}/${workspaceId}/${encodeURIComponent(
        projectName,
      )}/history?branchName=${encodeURIComponent(branchName || "master")}`,
    );

    if (!response.ok) {
      throw new Error("히스토리 로드 실패");
    }

    const data = await response.json();

    return data.map((log) => ({
      graph: log.graph || "",
      hash: log.hash || log.commitHash || log.id || "",
      message: log.message || log.commitMessage || log.msg || "",
      author: log.author || log.authorName || log.committer || "",
      date: log.date || log.commitDate || log.time || "",
      refs: log.refs || log.branches || "",
    }));
  } catch {
    return [];
  }
};

export const resetCommitApi = async (
  workspaceId,
  projectName,
  branchName,
  targetHash,
) => {
  const response = await authFetch(`${GIT_API_BASE}/reset`, {
    method: "POST",
    body: JSON.stringify({
      workspaceId,
      projectName,
      branchName,
      targetHash,
    }),
  });

  if (!response.ok) {
    const msg = await response.text().catch(() => "");
    throw new Error(msg || "Reset 실패");
  }

  return await response.text();
};

export const checkoutCommitApi = async (
  workspaceId,
  projectName,
  branchName,
  targetHash,
) => {
  const response = await authFetch(`${GIT_API_BASE}/checkout-commit`, {
    method: "POST",
    body: JSON.stringify({
      workspaceId,
      projectName,
      branchName,
      targetHash,
    }),
  });

  if (!response.ok) {
    const msg = await response.text().catch(() => "");
    throw new Error(msg || "체크아웃 실패");
  }

  return await response.text();
};

/**
 * 기존 커밋 기준 병합 API
 *
 * GitDashboard의 커밋 우클릭 병합 기능 호환용.
 */
export const mergeCommitApi = async (
  workspaceId,
  projectName,
  branchName,
  targetHash,
) => {
  const response = await authFetch(`${GIT_API_BASE}/merge/start`, {
    method: "POST",
    body: JSON.stringify({
      workspaceId,
      projectName,
      branchName,
      targetHash,
    }),
  });

  if (!response.ok) {
    await throwApiResponseError(response, "병합 요청 실패");
  }

  return await readApiBody(response);
};

/**
 * Sourcetree식 브랜치 병합 API
 *
 * sourceBranch -> targetBranch
 *
 * 예:
 * mergeBranchesApi({
 *   workspaceId,
 *   projectName,
 *   sourceBranch: "feature/login",
 *   targetBranch: "develop",
 *   mergeMode: "NO_FF",
 *   deleteSourceAfterMerge: false,
 * });
 */
export const mergeBranchesApi = async ({
  workspaceId,
  projectName,
  sourceBranch,
  targetBranch,
  mergeMode = "NO_FF",
  deleteSourceAfterMerge = false,
}) => {
  const response = await authFetch(`${GIT_API_BASE}/branches/merge`, {
    method: "POST",
    body: JSON.stringify({
      workspaceId,
      projectName,
      sourceBranch,
      targetBranch,
      mergeMode,
      deleteSourceAfterMerge,
    }),
  });

  if (!response.ok) {
    await throwApiResponseError(response, "브랜치 병합 실패");
  }

  return await readApiBody(response);
};

export const abortMergeApi = async (workspaceId, projectName, branchName) => {
  const response = await authFetch(`${GIT_API_BASE}/merge/abort`, {
    method: "POST",
    body: JSON.stringify({
      workspaceId,
      projectName,
      branchName,
    }),
  });

  if (!response.ok) {
    await throwApiResponseError(response, "병합 취소 실패");
  }

  return await readApiBody(response);
};

export const discardChangesApi = async (
  workspaceId,
  projectName,
  branchName,
  confirmText = "DISCARD",
) => {
  const response = await authFetch(`${GIT_API_BASE}/discard`, {
    method: "POST",
    body: JSON.stringify({
      workspaceId,
      projectName,
      branchName,
      confirmText,
    }),
  });

  if (!response.ok) {
    await throwApiResponseError(response, "변경사항 폐기 실패");
  }

  return await readApiBody(response);
};

export const deleteBranchApi = async (workspaceId, projectName, branchName) => {
  const response = await authFetch(`${GIT_API_BASE}/branches`, {
    method: "DELETE",
    body: JSON.stringify({
      workspaceId,
      projectName,
      branchName,
    }),
  });

  if (!response.ok) {
    await throwApiResponseError(response, "브랜치 삭제에 실패했습니다.");
  }

  return await readApiBody(response);
};

// ============================================================================
// 시스템 API
// ============================================================================

export const fetchSystemRootsApi = async () => {
  const response = await authFetch(`${SYSTEM_API_BASE}/roots`);
  if (!response.ok) throw new Error("드라이브 목록 로드 실패");
  return await response.json();
};

export const fetchSubFoldersApi = async (path) => {
  const response = await authFetch(
    `${SYSTEM_API_BASE}/folders?path=${encodeURIComponent(path)}`,
  );
  if (!response.ok) throw new Error("폴더 목록 로드 실패");
  return await response.json();
};

// ============================================================================
// 코드맵 / AI API
// ============================================================================

export const createCodeMapComponentApi = async (
  workspaceId,
  projectName,
  branchName,
  name,
  type,
) => {
  const response = await authFetch(`${CODEMAP_API_BASE}/components`, {
    method: "POST",
    body: JSON.stringify({ workspaceId, projectName, branchName, name, type }),
  });
  if (!response.ok) throw new Error("컴포넌트 생성 실패");
  return await response.text();
};

export const createCodeMapRelationApi = async (
  workspaceId,
  projectName,
  branchName,
  sourceNode,
  targetNode,
  relationType,
) => {
  const response = await authFetch(`${CODEMAP_API_BASE}/relations`, {
    method: "POST",
    body: JSON.stringify({
      workspaceId,
      projectName,
      branchName,
      sourceNode,
      targetNode,
      relationType,
    }),
  });
  if (!response.ok) throw new Error("관계 주입 실패");
  return await response.text();
};

export const deleteCodeMapRelationApi = async (
  workspaceId,
  projectName,
  branchName,
  sourceNode,
  targetNode,
  relationType,
) => {
  const response = await authFetch(`${CODEMAP_API_BASE}/relations`, {
    method: "DELETE",
    body: JSON.stringify({
      workspaceId,
      projectName,
      branchName,
      sourceNode,
      targetNode,
      relationType,
    }),
  });
  if (!response.ok) throw new Error("관계 삭제 실패");
  return await response.text();
};

export const fetchAiAssistApi = async (payload) => {
  const response = await authFetch(`${AI_API_BASE}/assist`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("AI 어시스트 실패");
  return await response.json();
};

export const fetchAiAutocompleteApi = async (payload) => {
  const response = await authFetch(`${AI_API_BASE}/autocomplete`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errMsg = await response.text();
    throw new Error(errMsg || "Autocomplete failed");
  }

  return await response.text();
};

export const generateCodeComponentApi = async (
  workspaceId,
  projectName,
  branchName,
  payload,
) => {
  const response = await authFetch(`${CODEMAP_API_BASE}/generate`, {
    method: "POST",
    body: JSON.stringify({ workspaceId, projectName, branchName, ...payload }),
  });

  if (!response.ok) {
    const errMsg = await response.text();
    throw new Error(errMsg || "코드 주입 실패");
  }

  return await response.text();
};

// ============================================================================
// 팀 / 초대 / 채팅 API
// ============================================================================

export const inviteWorkspaceMemberApi = async ({ workspaceId, email }) => {
  const response = await authFetch(`${API_BASE}/invite`, {
    method: "POST",
    body: JSON.stringify({ workspaceId, email }),
  });

  if (!response.ok) {
    const errMsg = await response.text();
    throw new Error(errMsg || "초대 실패");
  }

  return await response.text();
};

export const fetchPendingInvitationsApi = async (
  userId = getCurrentUserId(),
) => {
  const response = await authFetch(`${API_BASE}/invitations?userId=${userId}`);
  if (!response.ok) throw new Error("초대 목록을 불러오지 못했습니다.");
  return await response.json();
};

export const acceptWorkspaceInvitationApi = async (
  workspaceId,
  userId = getCurrentUserId(),
) => {
  const response = await authFetch(
    `${API_BASE}/${workspaceId}/accept?userId=${userId}`,
    { method: "POST" },
  );
  if (!response.ok) throw new Error("초대 수락 실패");
  return await response.text();
};

export const rejectWorkspaceInvitationApi = async (
  workspaceId,
  userId = getCurrentUserId(),
) => {
  const response = await authFetch(
    `${API_BASE}/${workspaceId}/reject?userId=${userId}`,
    { method: "POST" },
  );
  if (!response.ok) throw new Error("초대 거절 실패");
  return await response.text();
};

export const getWorkspaceMembersApi = async (workspaceId) => {
  const response = await authFetch(`${API_BASE}/${workspaceId}/members`);
  if (!response.ok) throw new Error("팀원 목록을 불러오지 못했습니다.");
  return await response.json();
};

export const fetchChatHistoryApi = async (workspaceId, userId) => {
  if (!userId) return [];
  const response = await authFetch(
    `${API_BASE}/${workspaceId}/chat?userId=${userId}`,
  );
  if (!response.ok) throw new Error("채팅 내역을 불러오지 못했습니다.");
  return await response.json();
};



// ============================================================================
// 샌드박스 API
// ============================================================================

export const createSandboxApi = async (
    workspaceId,
    projectName,
    nickname,
    taskName,
    options = {},
  ) => {
    const baseBranch =
      typeof options.baseBranch === "string" && options.baseBranch.trim()
        ? options.baseBranch.trim()
        : "master";

    const response = await authFetch(`${GIT_API_BASE}/sandbox/create`, {
      method: "POST",
      body: JSON.stringify({
        workspaceId,
        projectName,
        nickname,
        taskName,
        baseBranch,

        // true면 기준 브랜치의 미커밋 변경사항은 포함하지 않고 기준 브랜치 HEAD 기준으로 샌드박스를 만듭니다.
        forceCreate: Boolean(options.forceCreate),
      }),
    });

    if (!response.ok) {
      await throwApiResponseError(response, "샌드박스 생성에 실패했습니다.");
    }

    return await readApiBody(response);
  };

export const applySandboxApi = async (
  workspaceId,
  projectName,
  sandboxBranch,
  targetBranch,
  commitMessage,
  nickname,
) => {
  const response = await authFetch(`${GIT_API_BASE}/sandbox/apply`, {
    method: "POST",
    body: JSON.stringify({
      workspaceId,
      projectName,
      sandboxBranch,
      targetBranch,
      commitMessage,
      nickname,
    }),
  });

  if (!response.ok) {
    await throwApiResponseError(response, "샌드박스 병합에 실패했습니다.");
  }

  return await readApiBody(response);
};

export const resolveSandboxConflictApi = async (
  workspaceId,
  projectName,
  sandboxBranch,
  targetBranch,
  commitMessage,
  nickname,
) => {
  const response = await authFetch(`${GIT_API_BASE}/sandbox/resolve-conflict`, {
    method: "POST",
    body: JSON.stringify({
      workspaceId,
      projectName,
      sandboxBranch,
      targetBranch,
      commitMessage,
      nickname,
    }),
  });

  if (!response.ok) {
    await throwApiResponseError(response, "샌드박스 충돌 해결 마무리에 실패했습니다.");
  }

  return await readApiBody(response);
};
