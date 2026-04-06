"use client";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const API_BASE = `${BASE_URL}/api/workspaces`;
const GIT_API_BASE = `${BASE_URL}/api/git`;
const AUTH_API_BASE = `${BASE_URL}/api/users`;
const SYSTEM_API_BASE = `${BASE_URL}/api/system`;
const CODEMAP_API_BASE = `${BASE_URL}/api/codemap`;
const AI_API_BASE = `${BASE_URL}/api/ai`;

const getCurrentUserId = () =>
  typeof window !== "undefined" ? localStorage.getItem("userId") : null;

const authFetch = async (url, options = {}) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  try {
    return await fetch(url, { ...options, headers });
  } catch (error) {
    throw new Error(error?.message || "네트워크 요청 중 오류가 발생했습니다.");
  }
};

// ============================================================================
// 인증 / 유저 API
// ============================================================================

export const loginApi = async (email, password) => {
  const response = await fetch(`${AUTH_API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error("로그인 실패: 이메일이나 비밀번호를 확인해주세요.");
  }

  return await response.json();
};

export const registerApi = async (email, nickname, password) => {
  const response = await fetch(`${AUTH_API_BASE}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, nickname, password }),
  });

  if (!response.ok) {
    throw new Error("회원가입 실패: 이미 존재하는 이메일/닉네임입니다.");
  }

  return await response.json();
};

export const getUserProfileApi = async (userId) => {
  const response = await authFetch(`${AUTH_API_BASE}/${userId}`);
  if (!response.ok) throw new Error("유저 정보를 불러올 수 없습니다.");
  return await response.json();
};

// ============================================================================
// 워크스페이스 / 프로젝트 API
// ============================================================================

export const getMyWorkspacesApi = async (userId = getCurrentUserId()) => {
  const response = await authFetch(`${API_BASE}?userId=${userId}`);
  if (!response.ok) throw new Error("워크스페이스 목록 로드 실패");
  return await response.json();
};

// wizard용 workspace 생성
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

// 기존 바이트 스타일 호환용
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

// wizard / 기존 create project 둘 다 이걸 쓰면 됨
export const createProjectApi = async ({
  workspaceId,
  projectName,
  language,
  description = "",
  gitUrl = "",
}) => {
  const response = await authFetch(`${API_BASE}/project`, {
    method: "POST",
    body: JSON.stringify({
      workspaceId,
      projectName,
      language,
      description,
      gitUrl,
    }),
  });

  if (!response.ok) {
    const errMsg = await response.text();
    throw new Error(errMsg || "프로젝트 생성 실패");
  }

  return await response.text();
};

// 기존 이름 호환
export const createProjectInWorkspaceApi = async (
  workspaceId,
  projectName,
  language,
  description = "",
  gitUrl = "",
) => {
  return createProjectApi({
    workspaceId,
    projectName,
    language,
    description,
    gitUrl,
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
  const response = await authFetch(
    `${API_BASE}/${workspaceId}/files?projectName=${encodeURIComponent(projectName)}&branchName=${encodeURIComponent(branchName)}`,
  );
  if (!response.ok) throw new Error("파일 트리 로드 실패");
  return await response.json();
};

export const fetchFileContentApi = async (
  workspaceId,
  projectName,
  branchName,
  filePath,
) => {
  const response = await authFetch(
    `${API_BASE}/${workspaceId}/file?projectName=${encodeURIComponent(projectName)}&branchName=${encodeURIComponent(branchName)}&path=${encodeURIComponent(filePath)}`,
  );
  if (!response.ok) throw new Error("파일 내용 로드 실패");
  return await response.text();
};

export const createFileApi = async (
  workspaceId,
  projectName,
  branchName,
  filePath,
  type,
) => {
  const response = await authFetch(`${API_BASE}/files`, {
    method: "POST",
    body: JSON.stringify({
      workspaceId,
      projectName,
      branchName,
      filePath,
      type,
      code: "",
    }),
  });
  if (!response.ok) throw new Error("파일 생성 실패");
};

export const saveFileApi = async (
  workspaceId,
  projectName,
  branchName,
  filePath,
  code,
) => {
  const response = await authFetch(`${API_BASE}/save`, {
    method: "POST",
    body: JSON.stringify({
      workspaceId,
      projectName,
      branchName,
      filePath,
      code,
    }),
  });
  if (!response.ok) throw new Error("파일 저장 실패");
};

export const deleteFileApi = async (
  workspaceId,
  projectName,
  branchName,
  filePath,
) => {
  const response = await authFetch(`${API_BASE}/files`, {
    method: "DELETE",
    body: JSON.stringify({
      workspaceId,
      projectName,
      branchName,
      filePath,
    }),
  });
  if (!response.ok) throw new Error("삭제 실패");
};

export const renameFileApi = async (
  workspaceId,
  projectName,
  branchName,
  filePath,
  newName,
) => {
  const response = await authFetch(`${API_BASE}/files/rename`, {
    method: "PUT",
    body: JSON.stringify({
      workspaceId,
      projectName,
      branchName,
      filePath,
      newName,
    }),
  });
  if (!response.ok) throw new Error("이름 변경 실패");
};

export const buildProjectApi = async (
  workspaceId,
  projectName,
  branchName,
  language,
) => {
  const response = await authFetch(`${API_BASE}/build`, {
    method: "POST",
    body: JSON.stringify({
      workspaceId,
      projectName,
      branchName,
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
  if (!response.ok) throw new Error("브랜치 목록 로드 실패");
  return await response.json();
};

export const updateGitUrlApi = async (workspaceId, projectName, gitUrl) => {
  const response = await authFetch(`${GIT_API_BASE}/project/git-url`, {
    method: "POST",
    body: JSON.stringify({ workspaceId, projectName, gitUrl }),
  });
  if (!response.ok) throw new Error("Git 연동 실패");
};

export const createBranchApi = async (workspaceId, projectName, branchName) => {
  const response = await authFetch(`${GIT_API_BASE}/branches`, {
    method: "POST",
    body: JSON.stringify({ workspaceId, projectName, branchName }),
  });

  if (!response.ok) {
    const msg = await response.text();
    throw new Error("브랜치 생성 실패: " + msg);
  }
};

export const fetchGitStatusApi = async (
  workspaceId,
  projectName,
  branchName = "master",
) => {
  const response = await authFetch(
    `${GIT_API_BASE}/${workspaceId}/${encodeURIComponent(projectName)}/status?branchName=${encodeURIComponent(branchName)}`,
  );
  if (!response.ok) throw new Error("Git 상태 조회 실패");
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
    body: JSON.stringify({ workspaceId, projectName, branchName, filePattern }),
  });
  if (!response.ok) throw new Error("스테이징 실패");
};

export const unstageFilesApi = async (
  workspaceId,
  projectName,
  branchName,
  filePattern,
) => {
  const response = await authFetch(`${GIT_API_BASE}/unstage`, {
    method: "POST",
    body: JSON.stringify({ workspaceId, projectName, branchName, filePattern }),
  });
  if (!response.ok) throw new Error("언스테이징 실패");
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
  if (!response.ok) throw new Error("커밋 실패");
};

export const pushToRemoteApi = async (
  workspaceId,
  projectName,
  branchName,
  token,
) => {
  const response = await authFetch(`${GIT_API_BASE}/push`, {
    method: "POST",
    body: JSON.stringify({ workspaceId, projectName, branchName, token }),
  });

  if (!response.ok) {
    const errMsg = await response.text();
    throw new Error(errMsg || "푸시 실패");
  }
};

export const pullFromRemoteApi = async (
  workspaceId,
  projectName,
  branchName,
  token,
) => {
  const response = await authFetch(`${GIT_API_BASE}/pull`, {
    method: "POST",
    body: JSON.stringify({ workspaceId, projectName, branchName, token }),
  });
  if (!response.ok) throw new Error("Pull 실패");
  return await response.text();
};

export const fetchGitHistoryApi = async (
  workspaceId,
  projectName,
  branchName = "master",
) => {
  try {
    const response = await authFetch(
      `${GIT_API_BASE}/${workspaceId}/${encodeURIComponent(projectName)}/history?branchName=${encodeURIComponent(branchName)}`,
    );
    if (!response.ok) throw new Error("히스토리 로드 실패");

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
    body: JSON.stringify({ workspaceId, projectName, branchName, targetHash }),
  });
  if (!response.ok) throw new Error("Reset 실패");
};

export const checkoutCommitApi = async (
  workspaceId,
  projectName,
  branchName,
  targetHash,
) => {
  const response = await authFetch(`${GIT_API_BASE}/checkout-commit`, {
    method: "POST",
    body: JSON.stringify({ workspaceId, projectName, branchName, targetHash }),
  });
  if (!response.ok) throw new Error("체크아웃 실패");
};

export const mergeCommitApi = async (
  workspaceId,
  projectName,
  branchName,
  targetBranch,
) => {
  const response = await authFetch(`${GIT_API_BASE}/merge`, {
    method: "POST",
    body: JSON.stringify({
      workspaceId,
      projectName,
      branchName,
      targetBranch,
    }),
  });
  if (!response.ok) throw new Error("Merge 실패");
  return await response.text();
};

export const abortMergeApi = async (workspaceId, projectName, branchName) => {
  const response = await authFetch(`${GIT_API_BASE}/merge/abort`, {
    method: "POST",
    body: JSON.stringify({ workspaceId, projectName, branchName }),
  });
  if (!response.ok) throw new Error("병합 취소 실패");
};

export const deleteBranchApi = async (workspaceId, projectName, branchName) => {
  const response = await authFetch(
    `${GIT_API_BASE}/${workspaceId}/${encodeURIComponent(projectName)}/branches/${encodeURIComponent(branchName)}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    const msg = await response.text();
    throw new Error(msg || "브랜치 삭제에 실패했습니다.");
  }

  return await response.text();
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
// 가상 뷰 API
// ============================================================================

export const fetchVirtualViewsApi = async (
  workspaceId,
  branchName = "master",
) => {
  const response = await authFetch(
    `${API_BASE}/${workspaceId}/rearrange?branchName=${encodeURIComponent(branchName)}`,
  );

  if (!response.ok) {
    const errMsg = await response.text();
    throw new Error(errMsg || "가상 뷰 목록을 불러오지 못했습니다.");
  }

  const text = await response.text();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    throw new Error("가상 뷰 응답 형식이 올바르지 않습니다.");
  }
};

export const generateVirtualViewApi = async (
  workspaceId,
  viewName,
  prompt,
  branchName = "master",
) => {
  const response = await authFetch(
    `${API_BASE}/${workspaceId}/rearrange/generate`,
    {
      method: "POST",
      body: JSON.stringify({
        workspaceId,
        viewName,
        prompt,
        branchName,
      }),
    },
  );

  if (response.status === 409) {
    throw new Error("이미 동일한 이름으로 생성된 뷰가 있습니다.");
  }

  if (!response.ok) {
    const errMsg = await response.text();
    throw new Error(errMsg || "AI 가상 뷰 생성에 실패했습니다.");
  }

  return await response.json();
};

export const deleteVirtualViewApi = async (workspaceId, viewId) => {
  const response = await authFetch(
    `${API_BASE}/${workspaceId}/rearrange/${viewId}`,
    {
      method: "DELETE",
    },
  );
  if (!response.ok) throw new Error("뷰 삭제에 실패했습니다.");
  return true;
};

export const activateVirtualViewApi = async (
  workspaceId,
  treeId,
  branchName = "master",
) => {
  const response = await authFetch(
    `${API_BASE}/${workspaceId}/rearrange/${treeId}/activate?branchName=${encodeURIComponent(branchName)}`,
    { method: "POST" },
  );
  if (!response.ok) throw new Error("가상 뷰 활성화에 실패했습니다.");
  return true;
};

export const deactivateVirtualViewApi = async (
  workspaceId,
  branchName = "master",
) => {
  const response = await authFetch(
    `${API_BASE}/${workspaceId}/rearrange/deactivate?branchName=${encodeURIComponent(branchName)}`,
    { method: "POST" },
  );
  if (!response.ok) throw new Error("가상 뷰 비활성화에 실패했습니다.");
  return true;
};

export const updateVirtualViewApi = async (
  workspaceId,
  treeId,
  treeDataJson,
) => {
  const response = await authFetch(
    `${API_BASE}/${workspaceId}/rearrange/${treeId}`,
    {
      method: "PUT",
      body: JSON.stringify({
        treeDataJson:
          typeof treeDataJson === "string"
            ? treeDataJson
            : JSON.stringify(treeDataJson),
      }),
    },
  );
  if (!response.ok) throw new Error("뷰 구조 업데이트에 실패했습니다.");
  return true;
};

// ============================================================================
// 샌드박스 API
// ============================================================================

export const createSandboxApi = async (
  workspaceId,
  projectName,
  nickname,
  taskName,
) => {
  const response = await authFetch(`${GIT_API_BASE}/sandbox/create`, {
    method: "POST",
    body: JSON.stringify({ workspaceId, projectName, nickname, taskName }),
  });

  if (!response.ok) {
    throw new Error((await response.text()) || "샌드박스 생성에 실패했습니다.");
  }

  return await response.text();
};

export const applySandboxApi = async (
  workspaceId,
  projectName,
  sandboxBranch,
  commitMessage,
  nickname,
) => {
  const response = await authFetch(`${GIT_API_BASE}/sandbox/apply`, {
    method: "POST",
    body: JSON.stringify({
      workspaceId,
      projectName,
      sandboxBranch,
      commitMessage,
      nickname,
    }),
  });

  if (!response.ok) {
    throw new Error((await response.text()) || "샌드박스 병합에 실패했습니다.");
  }

  return await response.text();
};
