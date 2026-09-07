"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";

import {
  clearVirtualTree,
  closeAllFiles,
  mergeProjectFiles,
  setActiveBranch,
} from "@/store/slices/fileSystemSlice";
import { writeToTerminal } from "@/store/slices/uiSlice";
import {
  applySandboxApi,
  createBranchApi,
  createSandboxApi,
  deleteBranchApi,
  fetchBranchListApi,
  fetchProjectFilesApi,
  mergeBranchesApi,
  saveFileApi,
} from "@/lib/ide/api";

export const DEFAULT_BRANCH = "master";
export const DEVELOP_BRANCH = "develop";
export const PROTECTED_BRANCHES = ["master", "main"];

const RESERVED_BRANCH_NAMES = new Set(["head", "fetch_head", "orig_head"]);

const normalizeBranchValue = (branch) => {
  if (typeof branch === "string") {
    const value = branch.trim();
    return value === "[object Object]" ? "" : value;
  }

  if (branch && typeof branch === "object") {
    const value =
      branch.branchName ||
      branch.sandboxBranchName ||
      branch.sandboxBranch ||
      branch.branch ||
      branch.name ||
      branch.currentBranch ||
      branch.data?.branchName ||
      branch.data?.sandboxBranchName ||
      branch.data?.sandboxBranch ||
      branch.result?.branchName ||
      branch.result?.sandboxBranchName ||
      branch.result?.sandboxBranch ||
      "";

    return normalizeBranchValue(value);
  }

  return "";
};

const extractSandboxBranchName = (payload) => {
  const branchName = normalizeBranchValue(payload);

  if (!branchName) {
    throw new Error(
      "서버가 샌드박스 브랜치명을 올바르게 반환하지 않았습니다.",
    );
  }

  if (!isSandboxBranch(branchName)) {
    throw new Error(`샌드박스 브랜치명이 올바르지 않습니다: ${branchName}`);
  }

  return branchName;
};

const getSandboxResultMessage = (payload, fallbackMessage) => {
  if (!payload) return fallbackMessage;

  if (typeof payload === "string") {
    return payload || fallbackMessage;
  }

  if (typeof payload === "object") {
    return (
      payload.message ||
      payload.resultMessage ||
      payload.result ||
      payload.status ||
      fallbackMessage
    );
  }

  return fallbackMessage;
};

const getMergeResultMessage = (payload, fallbackMessage) => {
  if (!payload) return fallbackMessage;

  if (typeof payload === "string") {
    return payload || fallbackMessage;
  }

  if (typeof payload === "object") {
    return (
      payload.message ||
      payload.resultMessage ||
      payload.result ||
      payload.status ||
      fallbackMessage
    );
  }

  return fallbackMessage;
};

export const isProtectedBranch = (branchName) => {
  const normalized = normalizeBranchValue(branchName).toLowerCase();
  return PROTECTED_BRANCHES.includes(normalized);
};

export const isSandboxBranch = (branchName) => {
  const normalized = normalizeBranchValue(branchName);
  return normalized.startsWith("focus-") || normalized.startsWith("focus/");
};

const normalizeBranchList = (branches) => {
  const uniqueBranches = Array.from(
    new Set(
      (Array.isArray(branches) ? branches : [])
        .map(normalizeBranchValue)
        .filter(Boolean),
    ),
  );

  const getPriority = (branch) => {
    const lowerBranch = branch.toLowerCase();

    if (lowerBranch === "master") return 0;
    if (lowerBranch === "main") return 1;
    if (lowerBranch === "develop") return 2;
    if (lowerBranch.startsWith("feature/")) return 3;
    if (lowerBranch.startsWith("release/")) return 4;
    if (lowerBranch.startsWith("hotfix/")) return 5;
    if (lowerBranch.startsWith("focus-") || lowerBranch.startsWith("focus/")) {
      return 6;
    }

    return 7;
  };

  return uniqueBranches.sort((a, b) => {
    const priorityDiff = getPriority(a) - getPriority(b);

    if (priorityDiff !== 0) return priorityDiff;

    return a.localeCompare(b);
  });
};

export const validateBranchName = (rawBranchName, branches = []) => {
  const branchName = normalizeBranchValue(rawBranchName);

  if (!branchName) return "브랜치명을 입력해주세요.";
  if (branchName.length > 120) return "브랜치명은 120자 이하로 입력해주세요.";

  const lowerBranchName = branchName.toLowerCase();

  if (isProtectedBranch(branchName)) {
    return "master/main 브랜치는 새로 만들 수 없습니다.";
  }

  if (RESERVED_BRANCH_NAMES.has(lowerBranchName)) {
    return "Git 예약어는 브랜치명으로 사용할 수 없습니다.";
  }

  const normalizedBranches = normalizeBranchList(branches);

  if (
    normalizedBranches.some(
      (branch) => branch.toLowerCase() === lowerBranchName,
    )
  ) {
    return "이미 존재하는 브랜치입니다.";
  }

  if (branchName.startsWith("/") || branchName.endsWith("/")) {
    return "브랜치명은 / 로 시작하거나 끝날 수 없습니다.";
  }

  if (branchName.includes("//")) {
    return "브랜치명에는 연속된 / 를 사용할 수 없습니다.";
  }

  if (branchName.includes("..")) {
    return "브랜치명에는 연속된 점(..)을 사용할 수 없습니다.";
  }

  if (branchName.includes("@{")) {
    return "브랜치명에는 @{ 를 사용할 수 없습니다.";
  }

  if (branchName.endsWith(".") || branchName.endsWith(".lock")) {
    return "브랜치명은 . 또는 .lock 으로 끝날 수 없습니다.";
  }

  if (/[\s]/.test(branchName)) {
    return "브랜치명에는 공백을 사용할 수 없습니다.";
  }

  if (/[\x00-\x1f\x7f]/.test(branchName)) {
    return "브랜치명에는 제어 문자를 사용할 수 없습니다.";
  }

  if (/[~^:?*\[\]\\]/.test(branchName)) {
    return "브랜치명에는 ~ ^ : ? * [ ] \\ 문자를 사용할 수 없습니다.";
  }

  const invalidSegment = branchName
    .split("/")
    .some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment.startsWith(".") ||
        segment.endsWith("."),
    );

  if (invalidSegment) {
    return "브랜치 경로의 각 구간은 비어 있거나 점(.)으로 시작/종료할 수 없습니다.";
  }

  return "";
};

const validateExistingBranchName = (rawBranchName, branches = []) => {
  const branchName = normalizeBranchValue(rawBranchName);

  if (!branchName) return "기준 브랜치를 선택해주세요.";

  const normalizedBranches = normalizeBranchList(branches);

  if (
    !normalizedBranches.some(
      (branch) => branch.toLowerCase() === branchName.toLowerCase(),
    )
  ) {
    return `브랜치를 찾을 수 없습니다: ${branchName}`;
  }

  return "";
};

const sanitizeSandboxTaskName = (taskName) => {
  return String(taskName || "")
    .trim()
    .replace(/[\s/\\]+/g, "-")
    .replace(/[~^:?*\[\]@{}]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const resolveDefaultMergeTarget = (branches) => {
  const normalizedBranches = normalizeBranchList(branches);

  if (
    normalizedBranches.some(
      (branch) => branch.toLowerCase() === DEVELOP_BRANCH,
    )
  ) {
    return DEVELOP_BRANCH;
  }

  return DEFAULT_BRANCH;
};

export function useGitBranches({
  workspaceId,
  activeProject,
  activeBranch,
  currentNickname = "dev",
  mode = "personal",
}) {
  const dispatch = useDispatch();

  const [branches, setBranches] = useState([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [isSwitchingBranch, setIsSwitchingBranch] = useState(false);
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [isDeletingBranchName, setIsDeletingBranchName] = useState("");
  const [isCreatingSandbox, setIsCreatingSandbox] = useState(false);
  const [isApplyingSandbox, setIsApplyingSandbox] = useState(false);
  const [isMergingBranches, setIsMergingBranches] = useState(false);

  const activeBranchName = normalizeBranchValue(activeBranch);

  const currentBranch = activeProject
    ? activeBranchName || DEFAULT_BRANCH
    : "No Project";

  const isTeamMode = mode === "team";

  const isSandboxMode =
    isTeamMode && Boolean(activeProject) && isSandboxBranch(currentBranch);

  const visibleBranches = useMemo(() => {
    const normalizedBranches = normalizeBranchList(branches);

    return normalizedBranches.filter((branch) => {
      if (!isSandboxBranch(branch)) {
        return true;
      }

      if (!isTeamMode) {
        return false;
      }

      const nickname = String(currentNickname || "dev");

      return (
        branch.startsWith(`focus-${nickname}-`) ||
        branch.startsWith(`focus/${nickname}/`)
      );
    });
  }, [branches, currentNickname, isTeamMode]);

  const defaultMergeTarget = useMemo(
    () => resolveDefaultMergeTarget(branches),
    [branches],
  );

  useEffect(() => {
    if (!activeProject) return;
    if (!activeBranch) return;

    const normalized = normalizeBranchValue(activeBranch);

    if (!normalized) {
      dispatch(setActiveBranch(DEFAULT_BRANCH));
    }
  }, [activeProject, activeBranch, dispatch]);

  const loadBranches = useCallback(async () => {
    if (!workspaceId || !activeProject) {
      setBranches([]);
      return [];
    }

    setIsLoadingBranches(true);

    try {
      const fetchedBranches = await fetchBranchListApi(
        workspaceId,
        activeProject,
      );

      const normalizedBranches = normalizeBranchList(fetchedBranches);

      setBranches(normalizedBranches);

      return normalizedBranches;
    } finally {
      setIsLoadingBranches(false);
    }
  }, [workspaceId, activeProject]);

  // 다른 사람이 브랜치를 만들거나 지우면 목록을 다시 받아 온다.
  //
  // 서버가 /ws/workspace-events 로 알려 주지만 그 소켓은 Sidebar 가 들고
  // 있다. 그래서 Sidebar 가 브라우저 이벤트로 넘겨준 것을 여기서 받는다.
  // 이게 없으면 새로고침해야만 남이 만든 브랜치가 보인다.
  useEffect(() => {
    if (!workspaceId || !activeProject) return undefined;

    const handleBranchListChanged = (event) => {
      const detail = event.detail || {};

      if (String(detail.workspaceId) !== String(workspaceId)) return;
      if (detail.projectName !== activeProject) return;

      void loadBranches();
    };

    window.addEventListener(
      "waivs:branch-list-changed",
      handleBranchListChanged,
    );

    return () => {
      window.removeEventListener(
        "waivs:branch-list-changed",
        handleBranchListChanged,
      );
    };
  }, [workspaceId, activeProject, loadBranches]);

  const refreshProjectTree = useCallback(
    async (branchName) => {
      if (!workspaceId || !activeProject) return null;

      const targetBranch = normalizeBranchValue(branchName) || DEFAULT_BRANCH;

      const files = await fetchProjectFilesApi(
        workspaceId,
        activeProject,
        targetBranch,
      );

      dispatch(
        mergeProjectFiles({
          projectName: activeProject,
          files,
        }),
      );

      return files;
    },
    [workspaceId, activeProject, dispatch],
  );

  const switchBranch = useCallback(
    async (nextBranchName) => {
      const nextBranch = normalizeBranchValue(nextBranchName);

      if (!workspaceId || !activeProject) {
        throw new Error("프로젝트를 먼저 선택해주세요.");
      }

      if (!nextBranch) {
        throw new Error("올바르지 않은 브랜치명입니다.");
      }

      if (nextBranch === currentBranch) return;

      const previousBranch =
        normalizeBranchValue(activeBranch) || DEFAULT_BRANCH;

      setIsSwitchingBranch(true);

      try {
        dispatch(closeAllFiles());
        dispatch(clearVirtualTree());
        dispatch(setActiveBranch(nextBranch));

        await refreshProjectTree(nextBranch);

        dispatch(writeToTerminal(`[Git] 브랜치 전환 완료: ${nextBranch}\n`));
      } catch (error) {
        dispatch(setActiveBranch(previousBranch));

        try {
          await refreshProjectTree(previousBranch);
        } catch {
          // rollback 중 파일 트리 갱신 실패는 무시
        }

        throw new Error(
          `브랜치 전환 실패: ${
            error?.message || "알 수 없는 오류가 발생했습니다."
          }`,
        );
      } finally {
        setIsSwitchingBranch(false);
      }
    },
    [
      workspaceId,
      activeProject,
      currentBranch,
      activeBranch,
      dispatch,
      refreshProjectTree,
    ],
  );

  /**
   * Sourcetree식 브랜치 생성.
   *
   * 기존 호환:
   * createBranch("feature/login")
   *
   * 신규:
   * createBranch({
   *   branchName: "feature/login",
   *   baseBranch: "develop",
   *   checkoutAfterCreate: true,
   * })
   */
  const createBranch = useCallback(
    async (input) => {
      const branchName = normalizeBranchValue(
        typeof input === "object" ? input.branchName : input,
      );

      const baseBranch = normalizeBranchValue(
        typeof input === "object" ? input.baseBranch : currentBranch,
      ) || DEFAULT_BRANCH;

      const checkoutAfterCreate =
        typeof input === "object" && typeof input.checkoutAfterCreate === "boolean"
          ? input.checkoutAfterCreate
          : true;

      const validationMessage = validateBranchName(branchName, branches);

      if (validationMessage) {
        throw new Error(validationMessage);
      }

      const baseBranchValidationMessage = validateExistingBranchName(
        baseBranch,
        branches,
      );

      if (baseBranchValidationMessage) {
        throw new Error(baseBranchValidationMessage);
      }

      if (!workspaceId || !activeProject) {
        throw new Error("프로젝트를 먼저 선택해주세요.");
      }

      setIsCreatingBranch(true);

      try {
        await createBranchApi(
          workspaceId,
          activeProject,
          branchName,
          baseBranch,
          checkoutAfterCreate,
        );

        setBranches((prev) => normalizeBranchList([...prev, branchName]));

        if (checkoutAfterCreate) {
          await switchBranch(branchName);
        } else {
          await loadBranches();
        }

        dispatch(
          writeToTerminal(
            `[Git] 브랜치 생성 완료: ${branchName} (base: ${baseBranch})\n`,
          ),
        );

        return branchName;
      } finally {
        setIsCreatingBranch(false);
      }
    },
    [
      workspaceId,
      activeProject,
      branches,
      currentBranch,
      switchBranch,
      loadBranches,
      dispatch,
    ],
  );

  const deleteBranch = useCallback(
    async (branchName) => {
      const targetBranch = normalizeBranchValue(branchName);

      if (!targetBranch) return;

      if (isProtectedBranch(targetBranch)) {
        throw new Error("master/main 브랜치는 삭제할 수 없습니다.");
      }

      if (targetBranch === currentBranch) {
        throw new Error(
          "현재 체크아웃 중인 브랜치는 삭제할 수 없습니다. 다른 브랜치로 이동한 뒤 삭제하세요.",
        );
      }

      if (!workspaceId || !activeProject) {
        throw new Error("프로젝트를 먼저 선택해주세요.");
      }

      setIsDeletingBranchName(targetBranch);

      try {
        await deleteBranchApi(workspaceId, activeProject, targetBranch);

        setBranches((prev) =>
          normalizeBranchList(prev.filter((branch) => branch !== targetBranch)),
        );

        dispatch(writeToTerminal(`[Git] 브랜치 삭제 완료: ${targetBranch}\n`));
      } finally {
        setIsDeletingBranchName("");
      }
    },
    [workspaceId, activeProject, currentBranch, dispatch],
  );

  /**
   * Sourcetree식 브랜치 병합.
   *
   * sourceBranch -> targetBranch
   */
  const mergeBranches = useCallback(
    async ({
      sourceBranch,
      targetBranch,
      mergeMode = "NO_FF",
      deleteSourceAfterMerge = false,
      checkoutTargetAfterMerge = false,
    }) => {
      const normalizedSourceBranch = normalizeBranchValue(sourceBranch);
      const normalizedTargetBranch = normalizeBranchValue(targetBranch);

      if (!workspaceId || !activeProject) {
        throw new Error("프로젝트를 먼저 선택해주세요.");
      }

      if (!normalizedSourceBranch) {
        throw new Error("병합할 브랜치를 선택해주세요.");
      }

      if (!normalizedTargetBranch) {
        throw new Error("병합 받을 브랜치를 선택해주세요.");
      }

      if (normalizedSourceBranch === normalizedTargetBranch) {
        throw new Error("같은 브랜치끼리는 병합할 수 없습니다.");
      }

      const sourceValidationMessage = validateExistingBranchName(
        normalizedSourceBranch,
        branches,
      );

      if (sourceValidationMessage) {
        throw new Error(sourceValidationMessage);
      }

      const targetValidationMessage = validateExistingBranchName(
        normalizedTargetBranch,
        branches,
      );

      if (targetValidationMessage) {
        throw new Error(targetValidationMessage);
      }

      setIsMergingBranches(true);

      try {
        const resultPayload = await mergeBranchesApi({
          workspaceId,
          projectName: activeProject,
          sourceBranch: normalizedSourceBranch,
          targetBranch: normalizedTargetBranch,
          mergeMode,
          deleteSourceAfterMerge,
        });

        await loadBranches();

        if (
          checkoutTargetAfterMerge ||
          normalizeBranchValue(activeBranch) === normalizedTargetBranch
        ) {
          dispatch(closeAllFiles());
          dispatch(clearVirtualTree());
          dispatch(setActiveBranch(normalizedTargetBranch));

          await refreshProjectTree(normalizedTargetBranch);
        }

        const resultMessage = getMergeResultMessage(
          resultPayload,
          `${normalizedSourceBranch} 브랜치가 ${normalizedTargetBranch} 브랜치에 병합되었습니다.`,
        );

        dispatch(
          writeToTerminal(
            `[Git] 브랜치 병합 완료: ${normalizedSourceBranch} -> ${normalizedTargetBranch}\n`,
          ),
        );

        return resultMessage;
      } finally {
        setIsMergingBranches(false);
      }
    },
    [
      workspaceId,
      activeProject,
      activeBranch,
      branches,
      dispatch,
      loadBranches,
      refreshProjectTree,
    ],
  );

  const createSandbox = useCallback(
    async (input) => {
      if (!isTeamMode) {
        throw new Error("샌드박스는 팀 모드에서만 사용할 수 있습니다.");
      }

      const rawTaskName =
        typeof input === "object" && input !== null ? input.taskName : input;

      const baseBranch =
        normalizeBranchValue(
          typeof input === "object" && input !== null
            ? input.baseBranch
            : currentBranch,
        ) || DEFAULT_BRANCH;

      if (!baseBranch) {
        throw new Error("샌드박스 기준 브랜치를 선택해주세요.");
      }

      if (isSandboxBranch(baseBranch)) {
        throw new Error("샌드박스 브랜치를 기준으로 새 샌드박스를 만들 수 없습니다.");
      }

      const baseBranchValidationMessage = validateExistingBranchName(
        baseBranch,
        branches,
      );

      if (baseBranchValidationMessage) {
        throw new Error(baseBranchValidationMessage);
      }

      const taskName = sanitizeSandboxTaskName(rawTaskName);

      if (!taskName) {
        throw new Error("작업명을 입력해주세요.");
      }

      if (!workspaceId || !activeProject) {
        throw new Error("프로젝트를 먼저 선택해주세요.");
      }

      setIsCreatingSandbox(true);

      try {
        const sandboxResponse = await createSandboxApi(
          workspaceId,
          activeProject,
          currentNickname || "dev",
          taskName,
          {
            baseBranch,
          },
        );

        const sandboxBranchName = extractSandboxBranchName(sandboxResponse);

        setBranches((prev) => normalizeBranchList([...prev, sandboxBranchName]));

        await switchBranch(sandboxBranchName);

        dispatch(
          writeToTerminal(
            `[Git] 샌드박스 생성 완료: ${sandboxBranchName} (base: ${baseBranch})\n`,
          ),
        );

        return sandboxBranchName;
      } finally {
        setIsCreatingSandbox(false);
      }
    },
    [
      isTeamMode,
      currentBranch,
      branches,
      workspaceId,
      activeProject,
      currentNickname,
      switchBranch,
      dispatch,
    ],
  );

  const applySandbox = useCallback(
    async ({ fileContents = {}, commitMessage, targetBranch }) => {
      if (!isTeamMode) {
        throw new Error("샌드박스 병합은 팀 모드에서만 사용할 수 있습니다.");
      }

      const sandboxBranch = normalizeBranchValue(activeBranch);

      if (!isSandboxBranch(sandboxBranch)) {
        throw new Error("샌드박스 브랜치에서만 병합을 실행할 수 있습니다.");
      }

      const message = String(commitMessage || "").trim();

      if (!message) {
        throw new Error("병합 전 남길 커밋 메시지를 입력해주세요.");
      }

      if (!workspaceId || !activeProject) {
        throw new Error("프로젝트를 먼저 선택해주세요.");
      }

      const resolvedTargetBranch =
        normalizeBranchValue(targetBranch) || defaultMergeTarget;

      if (sandboxBranch === resolvedTargetBranch) {
        throw new Error("샌드박스 브랜치와 병합 대상 브랜치가 같습니다.");
      }

      setIsApplyingSandbox(true);

      try {
        const entries = Object.entries(fileContents || {}).filter(
  ([path]) => path && !String(path).startsWith("virtual:"),
);

const isTransientCodeMapError = (error) => {
  const message = String(error?.message || "").toLowerCase();

  return (
    message.includes("codemapcache") ||
    message.includes("row was updated or deleted") ||
    message.includes("optimistic") ||
    message.includes("another transaction")
  );
};

const wait = (ms) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

for (const [path, content] of entries) {
  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await saveFileApi(
        workspaceId,
        activeProject,
        sandboxBranch,
        path,
        content || "",
      );

      lastError = null;
      break;
    } catch (error) {
      lastError = error;

      if (!isTransientCodeMapError(error) || attempt === 3) {
        throw error;
      }

      await wait(150 * attempt);
    }
  }

  if (lastError) {
    throw lastError;
  }
}

        const resultPayload = await applySandboxApi(
          workspaceId,
          activeProject,
          sandboxBranch,
          resolvedTargetBranch,
          message,
          currentNickname || "dev",
        );

        const resultMessage = getSandboxResultMessage(
          resultPayload,
          `성공적으로 ${resolvedTargetBranch} 브랜치에 반영되었습니다.`,
        );

        dispatch(closeAllFiles());
        dispatch(clearVirtualTree());
        dispatch(setActiveBranch(resolvedTargetBranch));

        await refreshProjectTree(resolvedTargetBranch);
        await loadBranches();

        dispatch(
          writeToTerminal(
            `[Git] 샌드박스 병합 완료. ${resolvedTargetBranch} 브랜치로 이동했습니다.\n`,
          ),
        );

        return resultMessage;
      } finally {
        setIsApplyingSandbox(false);
      }
    },
    [
      isTeamMode,
      workspaceId,
      activeProject,
      activeBranch,
      currentNickname,
      defaultMergeTarget,
      dispatch,
      refreshProjectTree,
      loadBranches,
    ],
  );

  useEffect(() => {
    loadBranches().catch((error) => {
      console.error("브랜치 목록 로드 실패:", error);
    });
  }, [loadBranches]);

  return {
    branches,
    visibleBranches,
    currentBranch,
    defaultMergeTarget,
    isSandboxMode,

    isLoadingBranches,
    isSwitchingBranch,
    isCreatingBranch,
    isDeletingBranchName,
    isCreatingSandbox,
    isApplyingSandbox,
    isMergingBranches,

    loadBranches,
    refreshProjectTree,
    switchBranch,
    createBranch,
    deleteBranch,
    mergeBranches,
    createSandbox,
    applySandbox,
  };
}