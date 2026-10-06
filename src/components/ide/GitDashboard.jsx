"use client";

// 경로: src/components/ide/GitDashboard.jsx

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  VscArrowDown,
  VscArrowRight,
  VscArrowUp,
  VscCheck,
  VscClose,
  VscCloudDownload,
  VscCloudUpload,
  VscDiffAdded,
  VscDiffModified,
  VscDiffRemoved,
  VscFile,
  VscGithubInverted,
  VscHistory,
  VscLink,
  VscRecord,
  VscRefresh,
  VscRepo,
  VscRepoForked,
  VscSourceControl,
  VscTrash,
  VscWarning,
  VscCopy,
  VscInfo,
} from "react-icons/vsc";

import {
  clearVirtualTree,
  closeAllFiles,
  openFile,
  setActiveBranch,
  setActiveProject,
  updateFileContent,
  updateProjectGitInfo,
} from "@/store/slices/fileSystemSlice";
import {
  requestConflictNavigation,
  setActiveActivity,
} from "@/store/slices/uiSlice";
import {
  abortMergeApi,
  checkoutCommitApi,
  commitChangesApi,
  deleteBranchApi,
  fetchBranchListApi,
  fetchFileContentApi,
  fetchGitHistoryApi,
  fetchGitStatusApi,
  mergeBranchesApi,
  mergeCommitApi,
  pullFromRemoteApi,
  pushToRemoteApi,
  resetCommitApi,
  stageFilesApi,
  unstageFilesApi,
  updateGitUrlApi,
} from "@/lib/ide/api";
import { renderGraph } from "@/lib/ide/gitGraphHelper";

const DEFAULT_BRANCH = "master";
const OAUTH_RESULT_MESSAGE = "WEVAIS_GITHUB_OAUTH_RESULT";
const OAUTH_RESULT_STORAGE_KEY = "wevaisGithubOAuthResult";
const OAUTH_PENDING_STORAGE_KEY = "wevaisPendingGitRemoteAction";
const OAUTH_RETURN_URL_STORAGE_KEY = "wevaisGithubOAuthReturnUrl";

const BRANCHES_CHANGED_EVENT = "waivs:branches-changed";

const notifyBranchesChanged = (detail = {}) => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(BRANCHES_CHANGED_EVENT, {
      detail: {
        reason: "branch-changed",
        ...detail,
        requestedAt: Date.now(),
      },
    }),
  );
};

const getRemoteActionLabel = (action = "push") =>
  action === "pull" ? "Pull" : "Push";

const getFileNameFromPath = (filePath) => {
  if (!filePath) return "Conflict file";
  return String(filePath).split("/").filter(Boolean).pop() || filePath;
};

const normalizeGitHubRepoUrl = (rawUrl = "") => {
  const value = String(rawUrl || "").trim();

  if (!value) return "";

  if (value.startsWith("git@github.com:")) {
    const repoPath = value.replace("git@github.com:", "").replace(/\.git$/, "");
    return `https://github.com/${repoPath}.git`;
  }

  if (value.startsWith("http://github.com/")) {
    return value.replace("http://github.com/", "https://github.com/");
  }

  return value;
};

const isValidGitHubRepoUrl = (rawUrl = "") => {
  const url = normalizeGitHubRepoUrl(rawUrl);
  return /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/.test(
    url,
  );
};

const hasConflictMarkers = (content = "") => {
  return /(^|\n)<{7}|(^|\n)={7}|(^|\n)>{7}/m.test(String(content || ""));
};

const isProtectedBranchName = (branchName = "") => {
  return ["master", "main"].includes(String(branchName).toLowerCase());
};

const isMergeConflictError = (error) => {
  const message = String(error?.message || "").toLowerCase();

  return (
    error?.status === 409 ||
    error?.response?.status === 409 ||
    message.includes("merge conflict") ||
    message.includes("conflict") ||
    message.includes("충돌")
  );
};

const normalizeBranchListForMerge = (branches = []) => {
  return Array.from(new Set(Array.isArray(branches) ? branches : []))
    .filter(Boolean)
    .sort((a, b) => {
      const priority = (branch) => {
        const lower = String(branch).toLowerCase();

        if (lower === "master") return 0;
        if (lower === "main") return 1;
        if (lower === "develop") return 2;
        if (lower.startsWith("feature/")) return 3;
        if (lower.startsWith("release/")) return 4;
        if (lower.startsWith("hotfix/")) return 5;

        return 6;
      };

      const diff = priority(a) - priority(b);
      if (diff !== 0) return diff;

      return String(a).localeCompare(String(b));
    });
};

const getDashboardBranchMeta = (branchName = "") => {
  const branch = String(branchName || "");
  const lower = branch.toLowerCase();

  if (lower === "master" || lower === "main") {
    return {
      label: "MAIN",
      dotClass: "bg-slate-500",
      badgeClass: "border-slate-200 bg-slate-50 text-slate-700",
      activeClass: "border-slate-200 bg-slate-50 text-slate-900",
    };
  }

  if (lower === "develop") {
    return {
      label: "DEVELOP",
      dotClass: "bg-blue-500",
      badgeClass: "border-blue-200 bg-blue-50 text-blue-700",
      activeClass: "border-blue-200 bg-blue-50 text-blue-900",
    };
  }

  if (lower.startsWith("feature/")) {
    return {
      label: "FEATURE",
      dotClass: "bg-violet-500",
      badgeClass: "border-violet-200 bg-violet-50 text-violet-700",
      activeClass: "border-violet-200 bg-violet-50 text-violet-900",
    };
  }

  if (lower.startsWith("release/")) {
    return {
      label: "RELEASE",
      dotClass: "bg-amber-500",
      badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
      activeClass: "border-amber-200 bg-amber-50 text-amber-900",
    };
  }

  if (lower.startsWith("hotfix/")) {
    return {
      label: "HOTFIX",
      dotClass: "bg-rose-500",
      badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
      activeClass: "border-rose-200 bg-rose-50 text-rose-900",
    };
  }

  return {
    label: "BRANCH",
    dotClass: "bg-emerald-500",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    activeClass: "border-emerald-200 bg-emerald-50 text-emerald-900",
  };
};

function DashboardBranchBadge({ branch }) {
  const meta = getDashboardBranchMeta(branch);

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-black tracking-wide ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
}

function BranchMergeSelect({
  value,
  options = [],
  onChange,
  placeholder = "브랜치 선택",
  excludeValue = "",
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  const visibleOptions = options.filter((option) => option !== excludeValue);
  const selectedValue = value || "";

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getBranchBadgeClass = (branchName = "") => {
    const lower = String(branchName).toLowerCase();

    if (lower === "master" || lower === "main") {
      return "bg-slate-100 text-slate-700 border-slate-200";
    }

    if (lower === "develop") {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }

    if (lower.startsWith("feature/")) {
      return "bg-violet-50 text-violet-700 border-violet-200";
    }

    if (lower.startsWith("release/")) {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }

    if (lower.startsWith("hotfix/")) {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }

    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex h-11 w-full items-center justify-between rounded-xl border bg-white px-3 text-left text-sm font-bold shadow-sm outline-none transition-all ${
          open
            ? "border-emerald-400 ring-4 ring-emerald-50"
            : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <span className="min-w-0 truncate">
          {selectedValue ? (
            <span
              className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-black ${getBranchBadgeClass(
                selectedValue,
              )}`}
            >
              <span className="truncate">{selectedValue}</span>
            </span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </span>

        <span
          className={`ml-3 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-[10050] mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
          <div className="max-h-56 overflow-y-auto p-1.5">
            {visibleOptions.length === 0 && (
              <div className="px-3 py-3 text-center text-xs font-bold text-slate-400">
                선택할 브랜치가 없습니다.
              </div>
            )}

            {visibleOptions.map((option) => {
              const selected = option === selectedValue;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all ${
                    selected
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`inline-flex max-w-[220px] items-center rounded-full border px-2.5 py-1 text-xs font-black ${getBranchBadgeClass(
                      option,
                    )}`}
                  >
                    <span className="truncate">{option}</span>
                  </span>

                  {selected && (
                    <span className="ml-3 text-xs font-black text-emerald-600">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GitDashboard() {
  const dispatch = useDispatch();
  const { workspaceId, activeProject, activeBranch, projectList } = useSelector(
    (state) => state.fileSystem,
  );

  const [activeView, setActiveView] = useState("status");
  const [commitMessage, setCommitMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [unstagedFiles, setUnstagedFiles] = useState([]);
  const [stagedFiles, setStagedFiles] = useState([]);
  const [conflictedFiles, setConflictedFiles] = useState([]);
  const [isMerging, setIsMerging] = useState(false);

  const [branchList, setBranchList] = useState([]);

  // 옛 샌드박스(focus-u… 브랜치)를 숨기던 거름이 있던 자리. 샌드박스는 이제 브랜치가 아니라서
  // 남아 있는 focus- 브랜치도 평범한 브랜치로 보여 준다.
  const visibleBranchList = branchList;

  const [historyLog, setHistoryLog] = useState([]);

  const [showOAuthModal, setShowOAuthModal] = useState(false);
  const [showGitUrlModal, setShowGitUrlModal] = useState(false);
  const [modalAction, setModalAction] = useState("push");
  const [inputGitUrl, setInputGitUrl] = useState("");

  const [contextMenu, setContextMenu] = useState(null);
  const contextMenuRef = useRef(null);
  const [commitDetailModal, setCommitDetailModal] = useState(null);

  const [branchContextMenu, setBranchContextMenu] = useState(null);
  const branchContextMenuRef = useRef(null);

  const [branchMergeModal, setBranchMergeModal] = useState(null);
  const [branchMergeDraft, setBranchMergeDraft] = useState({
    sourceBranch: "",
    targetBranch: DEFAULT_BRANCH,
    mergeMode: "NO_FF",
    deleteSourceAfterMerge: false,
    checkoutTargetAfterMerge: true,
  });
  const [isBranchMerging, setIsBranchMerging] = useState(false);

  const [conflictNotice, setConflictNotice] = useState(null);
  const [appDialog, setAppDialog] = useState(null);
  const dialogResolverRef = useRef(null);

  const modalActionRef = useRef("push");
  const pendingOAuthActionRef = useRef(null);
  const oauthPopupRef = useRef(null);

  const currentBranch = activeBranch || DEFAULT_BRANCH;

  const showAlert = useCallback(
    ({
      title = "알림",
      message = "",
      detail = "",
      variant = "info",
      confirmText = "확인",
    } = {}) => {
      setAppDialog({
        type: "alert",
        title,
        message,
        detail,
        variant,
        confirmText,
      });
    },
    [],
  );

  const showConfirm = useCallback(
    ({
      title = "확인이 필요합니다",
      message = "",
      detail = "",
      variant = "warning",
      confirmText = "확인",
      cancelText = "취소",
    } = {}) => {
      return new Promise((resolve) => {
        dialogResolverRef.current = resolve;
        setAppDialog({
          type: "confirm",
          title,
          message,
          detail,
          variant,
          confirmText,
          cancelText,
        });
      });
    },
    [],
  );

  const closeAppDialog = useCallback(() => {
    if (appDialog?.type === "confirm" && dialogResolverRef.current) {
      dialogResolverRef.current(false);
      dialogResolverRef.current = null;
    }
    setAppDialog(null);
  }, [appDialog]);

  const confirmAppDialog = useCallback(() => {
    if (appDialog?.type === "confirm" && dialogResolverRef.current) {
      dialogResolverRef.current(true);
      dialogResolverRef.current = null;
    }
    setAppDialog(null);
  }, [appDialog]);

  useEffect(() => {
    modalActionRef.current = modalAction;
  }, [modalAction]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target)
      ) {
        setContextMenu(null);
      }

      if (
        branchContextMenuRef.current &&
        !branchContextMenuRef.current.contains(event.target)
      ) {
        setBranchContextMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case "added":
        return <VscDiffAdded className="text-green-600" size={16} title="추가됨" />;
      case "modified":
        return <VscDiffModified className="text-yellow-600" size={16} title="수정됨" />;
      case "deleted":
        return <VscDiffRemoved className="text-red-600" size={16} title="삭제됨" />;
      case "conflicted":
        return <VscWarning className="text-red-500" size={16} title="충돌됨" />;
      default:
        return null;
    }
  };

  const loadBranches = useCallback(async () => {
    if (!workspaceId || !activeProject) {
      setBranchList([]);
      return;
    }

    try {
      const branches = await fetchBranchListApi(workspaceId, activeProject);
      setBranchList(Array.isArray(branches) ? branches : []);
    } catch (error) {
      console.error("브랜치 목록 로드 실패:", error);
    }
  }, [workspaceId, activeProject]);

  const loadGitStatus = useCallback(async () => {
    if (!workspaceId || !activeProject) return;

    try {
      setIsLoading(true);

      if (activeView === "status") {
        const statusData = await fetchGitStatusApi(
          workspaceId,
          activeProject,
          currentBranch,
        );

        setStagedFiles(statusData.staged || []);
        setUnstagedFiles(statusData.unstaged || []);
        setConflictedFiles(statusData.conflicted || []);
        setIsMerging(Boolean(statusData.isMerging || statusData.conflicted?.length));

        setCommitMessage((prevMessage) => {
          if (statusData.isMerging && !String(prevMessage || "").trim()) {
            return "Merge branch and resolve conflicts";
          }

          return prevMessage;
        });
      }

      if (activeView === "history") {
        const historyData = await fetchGitHistoryApi(
          workspaceId,
          activeProject,
          currentBranch,
        );
        setHistoryLog(historyData || []);
      }
    } catch (error) {
      console.error("Git 상태 로드 실패:", error);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, activeProject, currentBranch, activeView]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);


  useEffect(() => {
    const handleBranchesChanged = async (event) => {
      const detail = event.detail || {};

      if (detail.workspaceId && detail.workspaceId !== workspaceId) return;
      if (detail.projectName && detail.projectName !== activeProject) return;

      try {
        await loadBranches();
      } catch (error) {
        console.error("브랜치 목록 동기화 실패:", error);
      }
    };

    window.addEventListener(BRANCHES_CHANGED_EVENT, handleBranchesChanged);

    return () => {
      window.removeEventListener(BRANCHES_CHANGED_EVENT, handleBranchesChanged);
    };
  }, [workspaceId, activeProject, loadBranches]);

  useEffect(() => {
    loadGitStatus();
  }, [loadGitStatus]);

  const showConflictNotice = useCallback(
    (statusData = {}) => {
      const files = statusData.conflicted || [];

      setActiveView("status");
      setConflictNotice({
        branchName: currentBranch,
        files,
        fileCount: files.length,
        createdAt: Date.now(),
      });
    },
    [currentBranch],
  );

  const handleOpenConflictFile = async (filePath) => {
    const targetPath = filePath || conflictedFiles[0]?.path;
    if (!targetPath) return;

    try {
      setIsLoading(true);
      const content = await fetchFileContentApi(
        workspaceId,
        activeProject,
        currentBranch,
        targetPath,
      );

      dispatch(
        openFile({
          id: targetPath,
          name: getFileNameFromPath(targetPath),
          type: "file",
          status: "conflicted",
        }),
      );
      dispatch(updateFileContent({ filePath: targetPath, content }));
      dispatch(
        requestConflictNavigation({
          filePath: targetPath,
          requestedAt: Date.now(),
        }),
      );
      dispatch(setActiveActivity("editor"));
      setConflictNotice(null);
    } catch (error) {
      showAlert({
        title: "충돌 파일을 열 수 없습니다",
        message: error.message,
        variant: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectChange = (event) => {
    dispatch(setActiveProject(event.target.value));
    dispatch(setActiveBranch(DEFAULT_BRANCH));
    setActiveView("status");
  };

  const handleBranchChange = (branchName) => {
    if (branchName === currentBranch) return;

    dispatch(closeAllFiles());
    dispatch(clearVirtualTree());
    dispatch(setActiveBranch(branchName));
  };

    const handleBranchRightClick = (event, branchName) => {
    event.preventDefault();

    if (!branchName) return;

    setBranchContextMenu({
      x: event.pageX,
      y: event.pageY,
      branch: branchName,
    });
  };

  const handleDeleteBranch = async () => {
    if (!branchContextMenu) return;

    const branchName = branchContextMenu.branch;
    setBranchContextMenu(null);

    const confirmed = await showConfirm({
      title: "브랜치를 삭제할까요?",
      message: `'${branchName}' 브랜치를 삭제합니다. 삭제된 브랜치의 워크트리도 함께 제거됩니다.`,
      detail:
        "현재 작업 중인 브랜치는 삭제할 수 없습니다. 다른 브랜치로 이동한 뒤 진행하세요.",
      variant: "danger",
      confirmText: "삭제하기",
      cancelText: "취소",
    });

    if (!confirmed) return;

    try {
      setIsLoading(true);

      await deleteBranchApi(workspaceId, activeProject, branchName);

      setBranchList((prev) =>
        prev.filter((branch) => branch !== branchName),
      );

      notifyBranchesChanged({
        workspaceId,
        projectName: activeProject,
        reason: "dashboard-branch-deleted",
        branchName,
      });

      showAlert({
        title: "브랜치 삭제 완료",
        message: `'${branchName}' 브랜치가 삭제되었습니다.`,
        variant: "success",
      });
    } catch (error) {
      showAlert({
        title: "브랜치 삭제 실패",
        message: error.message,
        variant: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openBranchMergeModal = ({
    sourceBranch,
    targetBranch = currentBranch,
    checkoutTargetAfterMerge = true,
  } = {}) => {
    if (!sourceBranch) return;

    const normalBranches = normalizeBranchListForMerge(branchList);

    const safeTarget =
      targetBranch && targetBranch !== sourceBranch
        ? targetBranch
        : normalBranches.find((branch) => branch !== sourceBranch) ||
          DEFAULT_BRANCH;

    setBranchMergeDraft({
      sourceBranch,
      targetBranch: safeTarget,
      mergeMode: "NO_FF",
      deleteSourceAfterMerge: false,
      checkoutTargetAfterMerge,
    });

    setBranchContextMenu(null);

    setBranchMergeModal({
      sourceBranch,
    });
  };

  const applyBranchMergeStatusToScreen = async (targetBranch) => {
    const statusData = await fetchGitStatusApi(
      workspaceId,
      activeProject,
      targetBranch,
    );

    const nextConflictedFiles = statusData.conflicted || [];

    setStagedFiles(statusData.staged || []);
    setUnstagedFiles(statusData.unstaged || []);
    setConflictedFiles(nextConflictedFiles);
    setIsMerging(Boolean(statusData.isMerging || nextConflictedFiles.length));

    if (statusData.isMerging || nextConflictedFiles.length > 0) {
      setActiveView("status");

      setConflictNotice({
        branchName: targetBranch,
        files: nextConflictedFiles,
        fileCount: nextConflictedFiles.length,
        createdAt: Date.now(),
      });
    }
  };

  const moveToConflictStatusView = async (targetBranch) => {
    const safeBranch = targetBranch || currentBranch;

    dispatch(closeAllFiles());
    dispatch(clearVirtualTree());
    dispatch(setActiveBranch(safeBranch));

    setActiveView("status");

    try {
      await applyBranchMergeStatusToScreen(safeBranch);
    } catch {
      await loadGitStatus();
    }
  };

  const executeBranchMerge = async () => {
    const {
      sourceBranch,
      targetBranch,
      mergeMode,
      deleteSourceAfterMerge,
      checkoutTargetAfterMerge,
    } = branchMergeDraft;

    if (!sourceBranch || !targetBranch) {
      showAlert({
        title: "브랜치 선택이 필요합니다",
        message: "병합할 브랜치와 병합 받을 브랜치를 모두 선택해주세요.",
        variant: "warning",
      });
      return;
    }

    if (sourceBranch === targetBranch) {
      showAlert({
        title: "브랜치 병합 불가",
        message: "같은 브랜치끼리는 병합할 수 없습니다.",
        variant: "warning",
      });
      return;
    }

    if (isMerging) {
      showAlert({
        title: "병합 충돌 해결 중입니다",
        message:
          "현재 진행 중인 병합을 완료하거나 취소한 뒤 다른 브랜치 병합을 실행하세요.",
        variant: "warning",
      });
      return;
    }

    const confirmed = await showConfirm({
      title: "브랜치를 병합할까요?",
      message: `${sourceBranch} → ${targetBranch}`,
      detail:
        "충돌이 발생하면 대상 브랜치에서 충돌 해결 모드로 전환됩니다. 병합 전 대상 브랜치에 커밋하지 않은 변경사항이 없어야 합니다.",
      variant: "warning",
      confirmText: "병합 시작",
      cancelText: "취소",
    });

    if (!confirmed) return;

    try {
      setIsBranchMerging(true);
      setIsLoading(true);

      const result = await mergeBranchesApi({
        workspaceId,
        projectName: activeProject,
        sourceBranch,
        targetBranch,
        mergeMode,
        deleteSourceAfterMerge,
      });

      await loadBranches();

      if (checkoutTargetAfterMerge || targetBranch === currentBranch) {
        dispatch(closeAllFiles());
        dispatch(clearVirtualTree());
        dispatch(setActiveBranch(targetBranch));

        setActiveView("status");

        await applyBranchMergeStatusToScreen(targetBranch);
      }

      setBranchMergeModal(null);

      showAlert({
        title: "브랜치 병합 완료",
        message:
          typeof result === "object" && result?.message
            ? result.message
            : `${sourceBranch} 브랜치가 ${targetBranch} 브랜치에 병합되었습니다.`,
        variant: "success",
      });

      await loadGitStatus();
    } catch (error) {
      setBranchMergeModal(null);

      if (targetBranch) {
        dispatch(closeAllFiles());
        dispatch(clearVirtualTree());
        dispatch(setActiveBranch(targetBranch));

        setActiveView("status");

        try {
          await applyBranchMergeStatusToScreen(targetBranch);
        } catch {
          // 충돌 상태 조회 실패는 alert에서 처리
        }
      }

      showAlert({
        title: "브랜치 병합 실패",
        message: error.message,
        detail:
          "충돌이 발생했다면 대상 브랜치의 File Status에서 충돌 파일을 해결한 뒤 Merge 완료 커밋을 진행하세요.",
        variant: "danger",
      });
    } finally {
      setIsBranchMerging(false);
      setIsLoading(false);
    }
  };

  const handleBranchContextAction = async (action) => {
  if (!branchContextMenu) return;

  const branchName = branchContextMenu.branch;

  if (action === "switch") {
    setBranchContextMenu(null);
    handleBranchChange(branchName);
    return;
  }

  if (action === "merge") {
    const fallbackTarget =
      branchName === currentBranch
        ? normalizeBranchListForMerge(branchList).find(
            (branch) => branch !== branchName,
          ) || DEFAULT_BRANCH
        : currentBranch;

    openBranchMergeModal({
      sourceBranch: branchName,
      targetBranch: fallbackTarget,
      checkoutTargetAfterMerge: true,
    });

    return;
  }

  if (action === "delete") {
    await handleDeleteBranch();
  }
};

  const handleStage = async (filePattern) => {
    try {
      setIsLoading(true);
      await stageFilesApi(workspaceId, activeProject, currentBranch, filePattern);
      await loadGitStatus();
    } catch (error) {
      showAlert({
        title: "Stage 실패",
        message: error.message,
        variant: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnstage = async (filePattern) => {
    try {
      setIsLoading(true);
      await unstageFilesApi(workspaceId, activeProject, currentBranch, filePattern);
      await loadGitStatus();
    } catch (error) {
      showAlert({
        title: "Unstage 실패",
        message: error.message,
        variant: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkConflictResolved = async (filePath) => {
    if (!filePath) return;

    try {
      setIsLoading(true);
      const latestContent = await fetchFileContentApi(
        workspaceId,
        activeProject,
        currentBranch,
        filePath,
      );

      if (hasConflictMarkers(latestContent)) {
        setConflictNotice({
          branchName: currentBranch,
          files: [{ path: filePath, status: "conflicted" }],
          fileCount: 1,
          createdAt: Date.now(),
          message:
            "아직 충돌 마커가 남아 있습니다. 에디터에서 Current / Incoming / Both 중 하나를 선택하거나 직접 수정한 뒤 저장하세요.",
        });
        return;
      }

      await stageFilesApi(workspaceId, activeProject, currentBranch, filePath);
      await loadGitStatus();
    } catch (error) {
      showAlert({
        title: "해결 완료 처리 실패",
        message: error.message,
        variant: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAbortMerge = async () => {
    const confirmed = await showConfirm({
      title: "병합을 취소할까요?",
      message: "현재 진행 중인 병합을 중단하고 충돌 해결 상태를 되돌립니다.",
      detail: "직접 수정한 충돌 해결 내용은 사라질 수 있습니다. 확실할 때만 진행하세요.",
      variant: "danger",
      confirmText: "병합 취소",
      cancelText: "계속 해결하기",
    });

    if (!confirmed) return;

    try {
      setIsLoading(true);
      await abortMergeApi(workspaceId, activeProject, currentBranch);
      setCommitMessage("");
      await loadGitStatus();
      showAlert({
        title: "병합이 취소되었습니다",
        message: "충돌 해결 중이던 상태를 중단하고 이전 상태로 복구했습니다.",
        variant: "success",
      });
    } catch (error) {
      showAlert({
        title: "병합 취소 실패",
        message: error.message,
        variant: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      showAlert({
        title: "커밋 메시지가 필요합니다",
        message: "변경 내역을 설명하는 커밋 메시지를 입력한 뒤 다시 시도하세요.",
        variant: "warning",
      });
      return false;
    }

    try {
      setIsLoading(true);

      const latestStatus = await fetchGitStatusApi(
        workspaceId,
        activeProject,
        currentBranch,
      );
      const latestConflictedFiles = latestStatus.conflicted || [];
      let latestStagedFiles = latestStatus.staged || [];

      setStagedFiles(latestStagedFiles);
      setUnstagedFiles(latestStatus.unstaged || []);
      setConflictedFiles(latestConflictedFiles);
      setIsMerging(Boolean(latestStatus.isMerging || latestConflictedFiles.length));

      if (latestConflictedFiles.length > 0) {
        showAlert({
          title: "아직 해결되지 않은 충돌 파일이 있습니다",
          message:
            "충돌 파일을 열어 내용을 선택하거나 직접 수정한 뒤, 저장 후 충돌 파일 목록에서 해결 완료 처리를 실행하세요.",
          variant: "warning",
        });
        return false;
      }

      if ((latestStatus.isMerging || isMerging) && latestStagedFiles.length === 0) {
        await stageFilesApi(workspaceId, activeProject, currentBranch, ".");
        const restagedStatus = await fetchGitStatusApi(
          workspaceId,
          activeProject,
          currentBranch,
        );
        latestStagedFiles = restagedStatus.staged || [];
        setStagedFiles(latestStagedFiles);
        setUnstagedFiles(restagedStatus.unstaged || []);
        setConflictedFiles(restagedStatus.conflicted || []);
      }

      if (latestStagedFiles.length === 0) {
        showAlert({
          title: "커밋할 파일이 없습니다",
          message:
            "Staged Files 영역에 파일이 없습니다. 변경 파일을 Stage 하거나 충돌 파일을 해결 완료 처리한 뒤 다시 커밋하세요.",
          variant: "warning",
        });
        return false;
      }

      const wasMergeCommit = Boolean(latestStatus.isMerging || isMerging);

      await commitChangesApi(
        workspaceId,
        activeProject,
        currentBranch,
        commitMessage,
      );

      showAlert({
        title: "커밋 완료",
        message: wasMergeCommit
          ? "병합 커밋이 정상적으로 생성되었습니다."
          : "변경사항이 정상적으로 커밋되었습니다.",
        variant: "success",
      });

      setCommitMessage("");
      await loadGitStatus();
      return true;
    } catch (error) {
      showAlert({
        title: "커밋 실패",
        message: error.message,
        detail:
          "충돌 파일이 모두 해결 완료 처리되었는지, Staged Files에 파일이 있는지 확인하세요.",
        variant: "danger",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const openGithubOAuthPage = useCallback(() => {
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;

    if (!clientId) {
      showAlert({
        title: "GitHub OAuth 설정이 필요합니다",
        message:
          "프론트엔드 .env.local에 NEXT_PUBLIC_GITHUB_CLIENT_ID를 설정한 뒤 다시 시도하세요.",
        variant: "warning",
      });
      return;
    }

    const requestedAction = modalActionRef.current || "push";
    pendingOAuthActionRef.current = requestedAction;

    const statePayload = {
      workspaceId,
      activeProject,
      activeBranch: currentBranch,
      action: requestedAction,
      requestedAt: Date.now(),
    };

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        OAUTH_PENDING_STORAGE_KEY,
        JSON.stringify(statePayload),
      );
      window.sessionStorage.setItem(
        OAUTH_RETURN_URL_STORAGE_KEY,
        window.location.href,
      );
    }

    const authUrl = new URL("https://github.com/login/oauth/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("scope", "repo");
    authUrl.searchParams.set(
      "redirect_uri",
      `${window.location.origin}/auth/github/callback`,
    );
    authUrl.searchParams.set("state", JSON.stringify(statePayload));

    /*
     * 현재 탭에서 GitHub로 이동했다가 callback에서 원래 IDE URL로 복귀합니다.
     * 팝업 방식은 사용하지 않습니다.
     */
    window.location.assign(authUrl.toString());
  }, [activeProject, currentBranch, showAlert, workspaceId]);

  const executeRemoteAction = useCallback(
    async (actionToExecute) => {
      const nextAction = actionToExecute || modalActionRef.current || "push";

      try {
        setIsLoading(true);

        if (nextAction === "push") {
          await pushToRemoteApi(workspaceId, activeProject, currentBranch);
          showAlert({
            title: "Push 완료",
            message: "현재 브랜치의 커밋을 GitHub 원격 저장소에 반영했습니다.",
            variant: "success",
          });
        }

        if (nextAction === "pull") {
          await pullFromRemoteApi(workspaceId, activeProject, currentBranch);
          await loadGitStatus();
          showAlert({
            title: "Pull 완료",
            message: "GitHub 원격 저장소의 변경사항을 가져왔습니다.",
            variant: "success",
          });
        }
      } catch (error) {
        if (error.code === "GITHUB_AUTH_REQUIRED") {
          modalActionRef.current = nextAction;
          pendingOAuthActionRef.current = nextAction;
          setModalAction(nextAction);
          setShowOAuthModal(true);
          return;
        }

        showAlert({
          title: "작업을 완료하지 못했습니다",
          message: error.message,
          variant: "danger",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [activeProject, currentBranch, loadGitStatus, showAlert, workspaceId],
  );

  const handleRemoteActionClick = (action) => {
    if (isMerging) {
      showAlert({
        title: "병합 충돌 해결 중입니다",
        message: "Pull/Push 전에 충돌 파일을 모두 해결 완료 처리하고 병합 커밋을 먼저 생성하세요.",
        variant: "warning",
      });
      return;
    }

    const currentProject = projectList.find((project) => project.name === activeProject);

    modalActionRef.current = action;
    pendingOAuthActionRef.current = action;
    setModalAction(action);

    if (!currentProject || !currentProject.gitUrl) {
      setShowGitUrlModal(true);
      return;
    }

    executeRemoteAction(action);
  };

  const handleLinkGitUrlAndProceed = async () => {
    const normalizedUrl = normalizeGitHubRepoUrl(inputGitUrl);
    const nextAction = modalActionRef.current || modalAction || "push";

    if (!normalizedUrl) {
      showAlert({
        title: "GitHub 저장소 주소를 입력해주세요",
        message: "Push/Pull을 진행하려면 먼저 프로젝트와 연결할 GitHub Repository URL이 필요합니다.",
        variant: "warning",
      });
      return;
    }

    if (!isValidGitHubRepoUrl(normalizedUrl)) {
      showAlert({
        title: "GitHub 저장소 주소 형식이 올바르지 않습니다",
        message:
          "https://github.com/username/repository.git 형식으로 입력해주세요. SSH 주소를 입력하면 HTTPS 주소로 자동 변환됩니다.",
        variant: "warning",
      });
      return;
    }

    try {
      setIsLoading(true);
      await updateGitUrlApi(workspaceId, activeProject, normalizedUrl);
      dispatch(updateProjectGitInfo({ projectName: activeProject, gitUrl: normalizedUrl }));
      setShowGitUrlModal(false);
      setInputGitUrl("");
      executeRemoteAction(nextAction);
    } catch (error) {
      showAlert({
        title: "GitHub 저장소를 연결하지 못했습니다",
        message: error.message,
        detail:
          "Repository URL이 실제로 존재하는지, 현재 로그인한 계정이 접근 가능한 저장소인지 확인하세요.",
        variant: "danger",
      });
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleGithubOAuthMessage = (event) => {
      if (event.origin !== window.location.origin) return;

      const data = event.data || {};
      if (data.type !== OAUTH_RESULT_MESSAGE) return;

      if (data.status === "success") {
        const nextAction =
          data.state?.action || pendingOAuthActionRef.current || modalActionRef.current || "push";

        setShowOAuthModal(false);
        pendingOAuthActionRef.current = null;

        if (oauthPopupRef.current && !oauthPopupRef.current.closed) {
          oauthPopupRef.current.close();
        }

        showAlert({
          title: "GitHub 계정 연동 완료",
          message: `${getRemoteActionLabel(nextAction)} 작업을 이어서 실행합니다.`,
          variant: "success",
        });

        executeRemoteAction(nextAction);
        return;
      }

      if (data.status === "error") {
        showAlert({
          title: "GitHub 계정 연동 실패",
          message: data.message || "GitHub 인증 처리 중 문제가 발생했습니다.",
          variant: "danger",
        });
      }
    };

    window.addEventListener("message", handleGithubOAuthMessage);
    return () => window.removeEventListener("message", handleGithubOAuthMessage);
  }, [executeRemoteAction, showAlert]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const rawResult = window.sessionStorage.getItem(OAUTH_RESULT_STORAGE_KEY);
    if (!rawResult) return;

    window.sessionStorage.removeItem(OAUTH_RESULT_STORAGE_KEY);

    try {
      const result = JSON.parse(rawResult);
      if (result.status !== "success") return;

      const nextAction = result.state?.action || modalActionRef.current || "push";
      setShowOAuthModal(false);
      executeRemoteAction(nextAction);
    } catch {
      // 잘못된 세션 값은 무시합니다.
    }
  }, [executeRemoteAction]);

  const handleCommitAndPush = async () => {
    const commitSuccess = await handleCommit();
    if (commitSuccess) handleRemoteActionClick("push");
  };

  const handleRightClick = (event, log) => {
    event.preventDefault();
    if (!log.hash || log.hash.trim() === "") return;
    setContextMenu({ x: event.pageX, y: event.pageY, commit: log });
  };

  const copyCommitHash = async (hash) => {
    if (!hash) return;

    try {
      await navigator.clipboard.writeText(hash);

      showAlert({
        title: "커밋 해시 복사 완료",
        message: hash,
        variant: "success",
      });
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = hash;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);

      showAlert({
        title: "커밋 해시 복사 완료",
        message: hash,
        variant: "success",
      });
    }
  };

  const handleContextMenuAction = async (action) => {
    if (!contextMenu) return;

    const targetCommit = contextMenu.commit;
    const targetHash = targetCommit.hash;

    setContextMenu(null);

    if (action === "detail") {
      setCommitDetailModal(targetCommit);
      return;
    }

    if (action === "copy") {
      await copyCommitHash(targetHash);
      return;
    }

    if (isMerging) {
      showAlert({
        title: "병합 충돌 해결 중입니다",
        message:
          "현재 병합 작업이 일시정지되어 있습니다. 충돌 파일을 해결 완료 처리하거나 병합을 취소한 뒤 다른 Git 작업을 진행하세요.",
        variant: "warning",
      });
      return;
    }

    try {
      setIsLoading(true);

      // 여기 아래 checkout / merge / reset 기존 로직은 그대로 유지

      if (action === "checkout") {
        const confirmed = await showConfirm({
          title: "이 커밋으로 이동할까요?",
          message: `과거 커밋(${targetHash})으로 Checkout 합니다.`,
          detail: "커밋하지 않은 변경사항은 유실될 수 있으며 Detached HEAD 상태가 됩니다.",
          variant: "warning",
          confirmText: "Checkout",
          cancelText: "취소",
        });

        if (confirmed) {
          await checkoutCommitApi(workspaceId, activeProject, currentBranch, targetHash);
          showAlert({
            title: "Checkout 완료",
            message: `HEAD가 ${targetHash} 커밋으로 이동했습니다.`,
            variant: "success",
          });
        }
      }

      if (action === "merge") {
        const confirmed = await showConfirm({
          title: "현재 브랜치로 병합할까요?",
          message: `현재 브랜치(${currentBranch})에 커밋 ${targetHash}를 병합합니다.`,
          detail: "충돌이 발생하면 충돌 해결 모드로 전환됩니다.",
          variant: "warning",
          confirmText: "병합 시작",
          cancelText: "취소",
        });

        if (confirmed) {
          const mergeResult = await mergeCommitApi(
            workspaceId,
            activeProject,
            currentBranch,
            targetHash,
          );
          const statusData = await fetchGitStatusApi(
            workspaceId,
            activeProject,
            currentBranch,
          );
          const nextConflictedFiles = statusData.conflicted || [];
          const isConflictText =
            typeof mergeResult === "string" &&
            mergeResult.toLowerCase().includes("conflict");

          setStagedFiles(statusData.staged || []);
          setUnstagedFiles(statusData.unstaged || []);
          setConflictedFiles(nextConflictedFiles);
          setIsMerging(Boolean(statusData.isMerging || nextConflictedFiles.length));

          if (statusData.isMerging || nextConflictedFiles.length > 0 || isConflictText) {
            showConflictNotice({ ...statusData, conflicted: nextConflictedFiles });
          } else {
            showAlert({
              title: "병합 완료",
              message: "충돌 없이 병합이 완료되었습니다.",
              variant: "success",
            });
          }
        }
      }

      if (action === "reset") {
        const confirmed = await showConfirm({
          title: "브랜치를 이 커밋으로 되돌릴까요?",
          message: `현재 브랜치를 커밋 ${targetHash} 상태로 강제 초기화합니다.`,
          detail: "저장되지 않았거나 커밋하지 않은 작업은 사라질 수 있습니다.",
          variant: "danger",
          confirmText: "Reset Hard",
          cancelText: "취소",
        });

        if (confirmed) {
          await resetCommitApi(workspaceId, activeProject, currentBranch, targetHash);
          showAlert({
            title: "Reset 완료",
            message: `현재 브랜치를 ${targetHash} 상태로 되돌렸습니다.`,
            variant: "success",
          });
        }
      }

      await loadGitStatus();
    } catch (error) {
      if (action === "merge" && isMergeConflictError(error)) {
        await moveToConflictStatusView(currentBranch);
        return;
      }

      showAlert({
        title: "Git 작업 실패",
        message: error.message,
        variant: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderRefs = (refsStr) => {
    if (!refsStr) return null;

    return refsStr
      .split(",")
      .map((ref) => ref.trim())
      .filter(Boolean)
      .map((ref, index) => {
        const isHead = ref.includes("HEAD");
        const isRemote = ref.includes("origin/");
        let className = "bg-gray-100 text-gray-700 border-gray-300";

        if (isHead) className = "bg-emerald-50 text-emerald-700 border-emerald-200";
        else if (isRemote) className = "bg-red-50 text-red-700 border-red-200";
        else if (["master", "main"].includes(ref)) {
          className = "bg-blue-50 text-blue-700 border-blue-200";
        }

        return (
          <span
            key={`${ref}-${index}`}
            className={`mr-1.5 shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold shadow-sm ${className}`}
          >
            {ref}
          </span>
        );
      });
  };

  const renderAppDialog = () => {
    if (!appDialog) return null;
    if (typeof document === "undefined") return null;

    const variantMap = {
      danger: {
        iconWrap: "bg-red-50 text-red-600 border-red-100",
        badge: "bg-red-50 text-red-700 border-red-100",
        confirm: "bg-red-600 hover:bg-red-700 text-white",
        label: "Action required",
      },
      warning: {
        iconWrap: "bg-amber-50 text-amber-600 border-amber-100",
        badge: "bg-amber-50 text-amber-700 border-amber-100",
        confirm: "bg-slate-900 hover:bg-slate-800 text-white",
        label: "Please confirm",
      },
      success: {
        iconWrap: "bg-emerald-50 text-emerald-600 border-emerald-100",
        badge: "bg-emerald-50 text-emerald-700 border-emerald-100",
        confirm: "bg-slate-900 hover:bg-slate-800 text-white",
        label: "Completed",
      },
      info: {
        iconWrap: "bg-blue-50 text-blue-600 border-blue-100",
        badge: "bg-blue-50 text-blue-700 border-blue-100",
        confirm: "bg-slate-900 hover:bg-slate-800 text-white",
        label: "Notice",
      },
    };

    const style = variantMap[appDialog.variant] || variantMap.info;

    return createPortal(
      <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-[2px]">
        <div className="w-full max-w-[520px] overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] animate-fade-in-up">
          <div className="relative border-b border-slate-100 bg-gradient-to-br from-white via-slate-50 to-blue-50/40 px-6 py-5">
            <div className="flex items-start gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${style.iconWrap}`}>
                {appDialog.variant === "success" ? <VscCheck size={24} /> : <VscWarning size={24} />}
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${style.badge}`}>
                    {style.label}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">WEVAIS</span>
                </div>
                <h3 className="text-[17px] font-black text-slate-950">
                  {appDialog.title}
                </h3>
                {appDialog.message && (
                  <p className="mt-2 whitespace-pre-line text-sm font-medium leading-relaxed text-slate-600">
                    {appDialog.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {appDialog.detail && (
            <div className="mx-6 mt-5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs font-medium leading-relaxed text-slate-600">
              {appDialog.detail}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 px-6 py-5">
            {appDialog.type === "confirm" && (
              <button
                type="button"
                onClick={closeAppDialog}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
              >
                {appDialog.cancelText || "취소"}
              </button>
            )}
            <button
              type="button"
              onClick={appDialog.type === "confirm" ? confirmAppDialog : closeAppDialog}
              className={`h-10 rounded-xl px-5 text-xs font-black shadow-sm transition-colors ${style.confirm}`}
            >
              {appDialog.confirmText || "확인"}
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );
  };

  if (!activeProject || !projectList || projectList.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-400 flex-col gap-4">
        <VscSourceControl size={48} className="opacity-50" />
        <p>좌측 메뉴에서 프로젝트를 먼저 생성하거나 선택해주세요.</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-1 bg-white font-sans text-[#333]">
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-[9999] w-76 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 text-sm text-slate-700 shadow-[0_18px_50px_rgba(15,23,42,0.18)]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
            <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">
              Commit
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-mono text-xs font-black text-blue-700">
                {contextMenu.commit.hash.substring(0, 7)}
              </span>
              {contextMenu.commit.refs && (
                <span className="truncate text-[11px] font-bold text-slate-500">
                  {contextMenu.commit.refs}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleContextMenuAction("detail")}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <VscInfo size={16} className="text-slate-500" />
            커밋 상세 보기
          </button>

          <button
            type="button"
            onClick={() => handleContextMenuAction("copy")}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <VscCopy size={16} className="text-slate-500" />
            커밋 해시 복사
          </button>

          <div className="my-1 border-t border-slate-100" />

          <button
            type="button"
            onClick={() => handleContextMenuAction("checkout")}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-blue-50 hover:text-blue-600"
          >
            <VscRepoForked size={16} /> 이 커밋으로 Checkout
          </button>

          <button
            type="button"
            onClick={() => handleContextMenuAction("merge")}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-emerald-50 hover:text-emerald-700"
          >
            <VscSourceControl size={16} /> 현재 브랜치로 병합
          </button>

          <div className="my-1 border-t border-slate-100" />

          <button
            type="button"
            onClick={() => handleContextMenuAction("reset")}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-bold text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <VscHistory size={16} /> 이 커밋으로 초기화
          </button>
        </div>
      )}

      {commitDetailModal && (
  <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-[3px]">
    <div className="w-full max-w-[560px] overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.28)] animate-fade-in-up">
      <div className="relative border-b border-slate-100 bg-gradient-to-br from-white via-slate-50 to-blue-50/70 px-7 py-6">
        <button
          type="button"
          onClick={() => setCommitDetailModal(null)}
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-400 shadow-sm transition-colors hover:bg-white hover:text-slate-700"
          title="닫기"
        >
          <VscClose size={16} />
        </button>

        <div className="flex items-start gap-4 pr-10">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm">
            <VscInfo size={28} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-blue-700">
                Commit Detail
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-black text-slate-500">
                Git History
              </span>
            </div>

            <h2 className="text-[19px] font-black tracking-tight text-slate-950">
              커밋 상세 정보
            </h2>

            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
              선택한 커밋의 해시, 작성자, 날짜, 메시지를 확인합니다.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 bg-white px-7 py-6">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="mb-1 text-[11px] font-black uppercase tracking-wide text-slate-400">
            Commit Hash
          </div>

          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs font-black text-slate-800">
              {commitDetailModal.hash}
            </code>

            <button
              type="button"
              onClick={() => copyCommitHash(commitDetailModal.hash)}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
            >
              <VscCopy size={14} />
              복사
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="mb-1 text-[11px] font-black uppercase tracking-wide text-slate-400">
              Author
            </div>
            <div className="truncate text-sm font-black text-slate-800">
              {commitDetailModal.author || "-"}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="mb-1 text-[11px] font-black uppercase tracking-wide text-slate-400">
              Date
            </div>
            <div className="truncate text-sm font-black text-slate-800">
              {commitDetailModal.date || "-"}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <div className="mb-1 text-[11px] font-black uppercase tracking-wide text-slate-400">
            Message
          </div>
          <div className="whitespace-pre-wrap text-sm font-bold leading-relaxed text-slate-800">
            {commitDetailModal.message || "-"}
          </div>
        </div>

        {commitDetailModal.refs && (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="mb-1 text-[11px] font-black uppercase tracking-wide text-slate-400">
              References
            </div>
            <div className="text-sm font-bold text-slate-700">
              {commitDetailModal.refs}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-7 py-5">
        <button
          type="button"
          onClick={() => setCommitDetailModal(null)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
        >
          닫기
        </button>
      </div>
    </div>
  </div>
)}

      {branchContextMenu && (
  <div
    ref={branchContextMenuRef}
    className="fixed z-[9999] w-64 rounded-md border border-gray-200 bg-white py-1 text-sm text-gray-700 shadow-xl"
    style={{ top: branchContextMenu.y, left: branchContextMenu.x }}
  >
    <div className="border-b border-gray-100 bg-gray-50 px-3 py-1.5">
      <span className="font-mono text-xs font-bold text-gray-600">
        Branch: {branchContextMenu.branch}
      </span>
    </div>

    {branchContextMenu.branch !== currentBranch && (
      <button
        type="button"
        onClick={() => handleBranchContextAction("switch")}
        className="flex w-full items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-blue-50 hover:text-blue-600"
      >
        <VscRepoForked size={16} /> 이 브랜치로 전환
      </button>
    )}

    <button
      type="button"
      onClick={() => handleBranchContextAction("merge")}
      className="flex w-full items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-emerald-50 hover:text-emerald-700"
    >
      <VscSourceControl size={16} /> 브랜치 병합...
    </button>

    {!isProtectedBranchName(branchContextMenu.branch) &&
      branchContextMenu.branch !== currentBranch && (
        <>
          <div className="my-1 border-t border-gray-100" />
          <button
            type="button"
            onClick={() => handleBranchContextAction("delete")}
            className="flex w-full items-center gap-2 px-4 py-2 text-left font-bold text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <VscTrash size={16} /> 브랜치 삭제
          </button>
        </>
      )}
  </div>
)}

{branchMergeModal && (
  <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-[3px]">
    <div className="w-full max-w-[520px] overflow-visible rounded-3xl border border-white/70 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.28)] animate-fade-in-up">
      <div className="relative rounded-t-3xl border-b border-slate-100 bg-gradient-to-br from-white via-slate-50 to-emerald-50/60 px-7 py-6">
        <button
          type="button"
          onClick={() => setBranchMergeModal(null)}
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-400 shadow-sm transition-colors hover:bg-white hover:text-slate-700"
          title="닫기"
        >
          <VscClose size={16} />
        </button>

        <div className="flex items-start gap-4 pr-10">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-600 shadow-sm">
            <VscSourceControl size={28} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                Branch Merge
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-black text-slate-500">
                Sourcetree Flow
              </span>
            </div>

            <h2 className="text-[19px] font-black tracking-tight text-slate-950">
              브랜치 병합
            </h2>

            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
              선택한 source 브랜치를 target 브랜치로 병합합니다.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white px-7 py-6">
        <div className="grid gap-4">
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
              Source Branch
            </label>

            <BranchMergeSelect
              value={branchMergeDraft.sourceBranch}
              options={normalizeBranchListForMerge(branchList)}
              placeholder="병합할 브랜치 선택"
              onChange={(nextSourceBranch) =>
                setBranchMergeDraft((prev) => ({
                  ...prev,
                  sourceBranch: nextSourceBranch,
                  targetBranch:
                    nextSourceBranch === prev.targetBranch
                      ? normalizeBranchListForMerge(branchList).find(
                          (branch) => branch !== nextSourceBranch,
                        ) || DEFAULT_BRANCH
                      : prev.targetBranch,
                }))
              }
            />
          </div>

          <div className="flex items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
            <span className="max-w-[190px] truncate font-mono text-blue-700">
              {branchMergeDraft.sourceBranch || "source"}
            </span>
            <VscArrowRight className="mx-3 text-emerald-600" size={18} />
            <span className="max-w-[190px] truncate font-mono text-emerald-700">
              {branchMergeDraft.targetBranch || "target"}
            </span>
          </div>

          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
              Target Branch
            </label>

            <BranchMergeSelect
              value={branchMergeDraft.targetBranch}
              options={normalizeBranchListForMerge(branchList)}
              excludeValue={branchMergeDraft.sourceBranch}
              placeholder="병합 받을 브랜치 선택"
              onChange={(nextTargetBranch) =>
                setBranchMergeDraft((prev) => ({
                  ...prev,
                  targetBranch: nextTargetBranch,
                }))
              }
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
              Merge Mode
            </label>

            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() =>
                  setBranchMergeDraft((prev) => ({
                    ...prev,
                    mergeMode: "NO_FF",
                  }))
                }
                className={`rounded-xl px-3 py-2.5 text-xs font-black transition-all ${
                  branchMergeDraft.mergeMode === "NO_FF"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                No Fast-Forward
              </button>

              <button
                type="button"
                onClick={() =>
                  setBranchMergeDraft((prev) => ({
                    ...prev,
                    mergeMode: "FF",
                  }))
                }
                className={`rounded-xl px-3 py-2.5 text-xs font-black transition-all ${
                  branchMergeDraft.mergeMode === "FF"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Fast-Forward 허용
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={branchMergeDraft.checkoutTargetAfterMerge}
                onChange={(event) =>
                  setBranchMergeDraft((prev) => ({
                    ...prev,
                    checkoutTargetAfterMerge: event.target.checked,
                  }))
                }
                className="h-4 w-4"
              />
              병합 후 target 브랜치로 이동
            </label>

            <label className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={branchMergeDraft.deleteSourceAfterMerge}
                onChange={(event) =>
                  setBranchMergeDraft((prev) => ({
                    ...prev,
                    deleteSourceAfterMerge: event.target.checked,
                  }))
                }
                className="h-4 w-4"
              />
              병합 성공 후 source 브랜치 삭제
            </label>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
            <p className="text-xs font-bold leading-relaxed text-amber-800">
              병합 전 target 브랜치에 커밋하지 않은 변경사항이 있으면 병합이 중단됩니다.
              충돌이 발생하면 File Status에서 충돌 파일을 해결한 뒤 Merge 완료 커밋을 진행하세요.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 rounded-b-3xl border-t border-slate-100 bg-slate-50/80 px-7 py-5">
        <button
          type="button"
          onClick={() => setBranchMergeModal(null)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
        >
          취소
        </button>

        <button
          type="button"
          onClick={executeBranchMerge}
          disabled={
            isBranchMerging ||
            !branchMergeDraft.sourceBranch ||
            !branchMergeDraft.targetBranch ||
            branchMergeDraft.sourceBranch === branchMergeDraft.targetBranch
          }
          className="flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-xs font-black text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isBranchMerging ? (
            <>
              <VscRefresh className="animate-spin" size={15} />
              병합 중
            </>
          ) : (
            <>
              <VscCheck size={15} />
              병합 실행
            </>
          )}
        </button>
      </div>
    </div>
  </div>
)}

      {renderAppDialog()}

      {showGitUrlModal && (
        <div className="fixed inset-0 z-[10000] flex items-start justify-center bg-slate-950/45 px-4 pt-[14vh] backdrop-blur-[3px]">
          <div className="w-full max-w-[560px] overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.28)] animate-fade-in-up">
            <div className="relative border-b border-slate-100 bg-gradient-to-br from-white via-slate-50 to-blue-50/60 px-7 py-6">
              <button
                type="button"
                onClick={() => {
                  setShowGitUrlModal(false);
                  setInputGitUrl("");
                }}
                className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-400 shadow-sm transition-colors hover:bg-white hover:text-slate-700"
                title="닫기"
              >
                <VscClose size={16} />
              </button>

              <div className="flex items-start gap-4 pr-10">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-950 text-white shadow-sm">
                  <VscGithubInverted size={28} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-blue-700">
                      Remote Repository
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-black text-slate-500">
                      {getRemoteActionLabel(modalAction)} 준비
                    </span>
                  </div>

                  <h2 className="text-[19px] font-black tracking-tight text-slate-950">
                    GitHub 저장소 연결이 필요합니다
                  </h2>

                  <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                    현재 프로젝트에 연결된 원격 저장소 주소가 없습니다. 저장소 URL을 한 번만 연결하면 이후 <b className="text-slate-900">Pull/Push는 저장된 GitHub 인증 정보</b>로 바로 사용할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-7 py-6">
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                GitHub Repository URL
              </label>

              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-inner transition-colors focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-50">
                <VscLink size={18} className="shrink-0 text-slate-400" />
                <input
                  type="text"
                  placeholder="https://github.com/username/repository.git"
                  value={inputGitUrl}
                  onChange={(event) => setInputGitUrl(event.target.value)}
                  onBlur={(event) => setInputGitUrl(normalizeGitHubRepoUrl(event.target.value))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleLinkGitUrlAndProceed();
                  }}
                  className="h-9 min-w-0 flex-1 bg-transparent font-mono text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
                  autoFocus
                />
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] font-bold text-slate-500">
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <span className="block text-slate-900">1. URL 저장</span>
                  프로젝트에 원격 저장소 연결
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <span className="block text-slate-900">2. GitHub 인증</span>
                  최초 1회 OAuth 로그인
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <span className="block text-slate-900">3. 자동 사용</span>
                  이후 Pull/Push 바로 실행
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-xs font-medium leading-relaxed text-blue-800">
                예시: <span className="font-mono font-black">https://github.com/username/repository.git</span>
                <br />SSH 주소를 입력해도 가능한 경우 HTTPS 주소로 자동 변환합니다.
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-7 py-5">
              <p className="text-[11px] font-bold text-slate-400">
                현재 프로젝트: <span className="font-mono text-slate-600">{activeProject}</span>
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowGitUrlModal(false);
                    setInputGitUrl("");
                  }}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleLinkGitUrlAndProceed}
                  disabled={!inputGitUrl.trim() || isLoading}
                  className="flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-5 text-xs font-black text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <VscGithubInverted size={16} />
                  저장소 연결하고 {getRemoteActionLabel(modalAction)} 계속하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showOAuthModal && (
        <div className="fixed inset-0 z-[10000] flex items-start justify-center bg-slate-950/50 px-4 pt-[13vh] backdrop-blur-[3px]">
          <div className="w-full max-w-[520px] overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.3)] animate-fade-in-up">
            <div className="relative border-b border-slate-100 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-7 py-6 text-white">
              <button
                type="button"
                onClick={() => setShowOAuthModal(false)}
                className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/60 transition-colors hover:bg-white/15 hover:text-white"
                title="닫기"
              >
                <VscClose size={16} />
              </button>

              <div className="flex items-start gap-4 pr-10">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white text-slate-950 shadow-sm">
                  <VscGithubInverted size={30} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                      GitHub OAuth
                    </span>
                    <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-black text-emerald-200">
                      최초 1회 인증
                    </span>
                  </div>

                  <h2 className="text-[20px] font-black tracking-tight">
                    GitHub 계정 인증이 필요합니다
                  </h2>

                  <p className="mt-2 text-sm font-medium leading-relaxed text-slate-300">
                    GitHub 로그인으로 권한을 승인하면, 서버가 access token을 DB에 저장하고 이후 Pull/Push를 자동 처리합니다.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 px-7 py-6">
              {["GitHub 로그인", "토큰 저장", "이후 자동 Pull/Push"].map((title, index) => (
                <div
                  key={title}
                  className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${
                    index === 2
                      ? "border-emerald-100 bg-emerald-50"
                      : "border-slate-100 bg-slate-50"
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white ${
                      index === 2 ? "bg-emerald-600" : "bg-slate-900"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <p className={`text-sm font-black ${index === 2 ? "text-emerald-900" : "text-slate-900"}`}>
                      {title}
                    </p>
                    <p className={`mt-0.5 text-xs font-medium leading-relaxed ${index === 2 ? "text-emerald-700" : "text-slate-500"}`}>
                      {index === 0 && "GitHub 인증 페이지에서 로그인하고 저장소 접근 권한을 승인합니다."}
                      {index === 1 && "백엔드가 인증 코드를 access token으로 교환하고 현재 사용자 계정에 저장합니다."}
                      {index === 2 && "다음부터는 별도 토큰 입력 없이 상단 Pull/Push 버튼만 누르면 됩니다."}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-7 py-5">
              <p className="text-[11px] font-bold text-slate-400">
                요청 작업: <span className="font-mono text-slate-700">{getRemoteActionLabel(modalAction)}</span>
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowOAuthModal(false)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
                >
                  나중에 하기
                </button>
                <button
                  type="button"
                  onClick={openGithubOAuthPage}
                  className="flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-5 text-xs font-black text-white shadow-sm transition-colors hover:bg-slate-800"
                >
                  <VscGithubInverted size={17} />
                  GitHub로 인증하기
                  <VscArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {conflictNotice && (
        <div className="fixed left-0 top-0 z-[2147483647] flex h-screen w-screen items-center justify-center bg-slate-950/45 px-4 backdrop-blur-[3px]">
          <div className="w-[520px] overflow-hidden rounded-2xl border border-red-100 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)] animate-fade-in-up">
            <div className="relative border-b border-red-100 bg-gradient-to-br from-red-50 via-white to-blue-50 px-6 pb-5 pt-6">
              <button
                type="button"
                onClick={() => setConflictNotice(null)}
                className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white/80 text-gray-400 shadow-sm hover:bg-white hover:text-gray-700"
                title="닫기"
              >
                <VscClose size={16} />
              </button>

              <div className="flex items-start gap-4 pr-10">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-200 bg-red-100 text-red-600 shadow-sm">
                  <VscWarning size={26} />
                </div>
                <div className="min-w-0">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-[11px] font-black text-red-700">
                      MERGE CONFLICT
                    </span>
                    <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 font-mono text-[11px] text-blue-700">
                      {conflictNotice.branchName}
                    </span>
                  </div>
                  <h2 className="text-lg font-black tracking-tight text-gray-950">
                    병합 중 충돌이 발생했습니다
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">
                    충돌 파일을 열어 원하는 내용을 선택하거나 직접 수정하세요. 저장 후 충돌 파일 목록에서 <b className="text-gray-900">해결 완료 처리</b>를 실행하면 병합 커밋을 진행할 수 있습니다.
                  </p>
                  {conflictNotice.message && (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                      {conflictNotice.message}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2.5">
                  <span className="text-xs font-black text-gray-700">
                    충돌 파일 {conflictNotice.fileCount || conflictNotice.files?.length || 0}개
                  </span>
                  <span className="font-mono text-[10px] text-gray-400">
                    충돌 파일 목록에서 관리
                  </span>
                </div>

                <div className="max-h-36 space-y-1 overflow-y-auto p-2">
                  {(conflictNotice.files || []).length > 0 ? (
                    conflictNotice.files.map((file, index) => (
                      <button
                        type="button"
                        key={`${file.path}-${index}`}
                        onClick={() => handleOpenConflictFile(file.path)}
                        className="group flex w-full items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition-all hover:border-red-100 hover:bg-white"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <VscFile className="shrink-0 text-red-500" size={15} />
                          <span className="truncate font-mono text-[12px] text-gray-800">
                            {file.path}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-blue-600 opacity-0 group-hover:opacity-100">
                          열기 <VscArrowRight size={12} />
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-center text-xs text-gray-400">
                      충돌 파일 목록을 불러오지 못했습니다. Git 상태 화면을 새로고침하세요.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleOpenConflictFile(conflictNotice.files?.[0]?.path)}
                  disabled={!conflictNotice.files?.[0]?.path}
                  className="flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  충돌 해결하기
                  <VscArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50">
          <div className="flex items-center gap-2 rounded bg-gray-800 px-4 py-2 text-sm font-bold text-white shadow-lg">
            <VscRefresh className="animate-spin" size={16} /> 처리 중...
          </div>
        </div>
      )}

      <div className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-[#f8f9fa]">
        <div className="flex h-14 cursor-pointer items-center border-b border-gray-200 bg-white px-4 transition-colors hover:bg-gray-50">
          <VscRepo size={18} className="mr-2 shrink-0 text-blue-600" />
          <select
            value={activeProject || ""}
            onChange={handleProjectChange}
            className="flex-1 cursor-pointer truncate bg-transparent text-sm font-bold text-gray-800 outline-none"
          >
            <option value="" disabled>
              프로젝트 선택
            </option>
            {projectList.map((project) => (
              <option key={project.name} value={project.name}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-6">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              Workspace
            </div>
            <button
              type="button"
              onClick={() => setActiveView("status")}
              className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] font-medium transition-colors ${
                activeView === "status"
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <VscRecord size={16} /> File Status
            </button>
            <button
              type="button"
              onClick={() => setActiveView("history")}
              className={`mt-1 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] font-medium transition-colors ${
                activeView === "history"
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <VscHistory size={16} /> History
            </button>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500">
              <span>Branches</span>
              <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600">
                {visibleBranchList.length}
              </span>
            </div>

            <div className="mt-1 flex flex-col gap-0.5">
              {visibleBranchList.map((branch) => {
                const isActiveBranch = branch === currentBranch;
                const branchMeta = getDashboardBranchMeta(branch);

                return (
                  <button
                    key={branch}
                    type="button"
                    onClick={() => handleBranchChange(branch)}
                    onContextMenu={(event) => handleBranchRightClick(event, branch)}
                    className={`group flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition-all ${
                      isActiveBranch
                        ? `${branchMeta.activeClass} shadow-sm`
                        : "border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:shadow-sm"
                    }`}
                    title={`${branch} 브랜치`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${branchMeta.dotClass}`}
                      />

                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span
                            className={`truncate text-[12px] font-black ${
                              isActiveBranch ? "text-slate-950" : "text-slate-700"
                            }`}
                          >
                            {branch}
                          </span>

                          {isActiveBranch && (
                            <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[9px] font-black text-blue-600">
                              현재
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex items-center gap-1.5">
                          <DashboardBranchBadge branch={branch} />

                          {!isProtectedBranchName(branch) && branch !== currentBranch && (
                            <span className="text-[9px] font-bold text-slate-400 opacity-0 transition-opacity group-hover:opacity-100">
                              우클릭 메뉴
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <VscRepoForked
                      size={14}
                      className={`shrink-0 transition-colors ${
                        isActiveBranch
                          ? "text-blue-500"
                          : "text-slate-300 group-hover:text-slate-500"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col bg-[#fefefe]">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
          <div className="flex items-center gap-4">
            <span className="text-lg font-bold">
              {activeView === "status" ? "File Status" : "Commit History"}
            </span>
            <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-100 px-3 py-1">
              <span className="text-xs font-bold text-gray-700">{activeProject}</span>
              <span className="text-xs text-gray-400">/</span>
              <span className="font-mono text-xs font-semibold text-blue-600">
                {currentBranch}
              </span>
            </div>

            <button
              type="button"
              onClick={async () => {
                if (isMerging) {
                  showAlert({
                    title: "병합 충돌 해결 중입니다",
                    message: "충돌 해결 중에는 최신 HEAD 복귀를 실행할 수 없습니다. 병합을 완료하거나 취소한 뒤 다시 시도하세요.",
                    variant: "warning",
                  });
                  return;
                }

                try {
                  setIsLoading(true);
                  await checkoutCommitApi(workspaceId, activeProject, currentBranch, currentBranch);
                  await loadGitStatus();
                  showAlert({
                    title: "최신 HEAD로 복귀 완료",
                    message: `원래 브랜치(${currentBranch})의 최신 상태로 복귀했습니다.`,
                    variant: "success",
                  });
                } catch (error) {
                  showAlert({
                    title: "최신 HEAD 복귀 실패",
                    message: error.message,
                    variant: "danger",
                  });
                } finally {
                  setIsLoading(false);
                }
              }}
              className="ml-2 rounded bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-700 shadow-sm transition-colors hover:bg-amber-200"
            >
              최신 HEAD로 복귀
            </button>

            <VscRefresh
              className="cursor-pointer text-gray-400 transition-colors hover:text-blue-600"
              title="새로고침"
              onClick={loadGitStatus}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleRemoteActionClick("pull")}
              className="flex items-center gap-1.5 rounded border border-gray-300 bg-white px-4 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              <VscCloudDownload size={16} className="text-blue-600" /> Pull
            </button>
            <button
              type="button"
              onClick={() => handleRemoteActionClick("push")}
              className="flex items-center gap-1.5 rounded border border-gray-300 bg-white px-4 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              <VscCloudUpload size={16} className="text-green-600" /> Push
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto bg-[#fafbfc] p-6">
          {activeView === "status" && isMerging && (
            <div
              className={`flex items-start justify-between gap-5 rounded-2xl border p-5 shadow-sm ${
                conflictedFiles.length > 0
                  ? "border-red-100 bg-gradient-to-r from-red-50 via-white to-blue-50"
                  : "border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-blue-50"
              }`}
            >
              <div className="flex min-w-0 items-start gap-4">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                    conflictedFiles.length > 0
                      ? "border-red-200 bg-red-100 text-red-600"
                      : "border-emerald-200 bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {conflictedFiles.length > 0 ? <VscWarning size={24} /> : <VscCheck size={24} />}
                </div>
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-black text-gray-950">
                      {conflictedFiles.length > 0
                        ? "병합 충돌 해결이 필요합니다"
                        : "충돌 파일 해결 완료 — 병합 커밋이 필요합니다"}
                    </h3>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${
                        conflictedFiles.length > 0
                          ? "border-red-200 bg-red-100 text-red-700"
                          : "border-emerald-200 bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {conflictedFiles.length > 0
                        ? `${conflictedFiles.length} conflicted`
                        : `${stagedFiles.length} staged`}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-gray-600">
                    {conflictedFiles.length > 0 ? (
                      <>
                        아래 순서대로 진행하세요. <b>1) 충돌 파일 열기</b> → <b>2) 변경 선택 또는 직접 수정</b> → <b>3) 저장 후 복귀</b> → <b>4) 해결 완료 처리</b> → <b>5) 병합 커밋</b>.
                      </>
                    ) : (
                      <>
                        Git 기준 충돌 파일은 모두 처리되었습니다. 아래 <b>Merge Commit Message</b>를 확인한 뒤 <b>Merge 완료 커밋</b>을 눌러 병합을 마무리하세요.
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {conflictedFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleOpenConflictFile(conflictedFiles[0]?.path)}
                    disabled={!conflictedFiles[0]?.path}
                    className="flex h-9 items-center gap-1.5 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    충돌 해결하기
                    <VscArrowRight size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAbortMerge}
                  className="flex h-9 items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 text-xs font-bold text-red-600 shadow-sm transition-colors hover:bg-red-50"
                >
                  <VscClose size={15} />
                  병합 취소
                </button>
              </div>
            </div>
          )}

          {activeView === "history" ? (
            <div className="flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-[#fafbfc] shadow-sm">
              <div className="sticky top-0 z-10 flex items-center border-b border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-600">
                <div className="w-24 shrink-0 text-center">Graph</div>
                <div className="flex-1">Description</div>
                <div className="w-24 shrink-0 text-center">Commit</div>
                <div className="w-28 shrink-0 text-center">Author</div>
                <div className="w-32 shrink-0 text-right">Date</div>
              </div>
              <div className="flex-1 overflow-y-auto pb-6 pt-2">
                {historyLog.length > 0 ? (
                  historyLog.map((log, index) => {
                    const isCommit = log.hash && log.hash.trim() !== "";

                    return (
                      <div
                        key={`${log.hash || "graph"}-${index}`}
                        onContextMenu={(event) => handleRightClick(event, log)}
                        className="group flex h-6 cursor-pointer items-center px-4 text-[13px] transition-colors hover:bg-blue-50"
                      >
                        <div className="flex h-full w-24 shrink-0 select-none items-center justify-start overflow-visible pl-2 font-mono">
                          {renderGraph(log.graph)}
                        </div>

                        {isCommit && (
                          <>
                            <div className="flex h-full flex-1 items-center gap-2 truncate border-b border-gray-100/70 pr-4 group-hover:border-transparent">
                              {renderRefs(log.refs)}
                              <span className="truncate font-semibold text-gray-800" title={log.message}>
                                {log.message}
                              </span>
                            </div>
                            <div className="flex h-full w-24 shrink-0 items-center justify-center border-b border-gray-100/70 text-center font-mono font-medium text-blue-600 group-hover:border-transparent">
                              {log.hash.substring(0, 7)}
                            </div>
                            <div className="flex h-full w-28 shrink-0 items-center justify-center truncate border-b border-gray-100/70 text-center text-gray-600 group-hover:border-transparent">
                              {log.author}
                            </div>
                            <div className="flex h-full w-32 shrink-0 items-center justify-end border-b border-gray-100/70 text-right text-xs text-gray-500 group-hover:border-transparent">
                              {log.date}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-sm text-gray-400">
                    커밋 기록이 없습니다.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {conflictedFiles.length > 0 && (
                <div className="mb-2 flex shrink-0 flex-col overflow-hidden rounded-2xl border border-red-100 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-red-100 bg-gradient-to-r from-red-50 to-white px-4 py-3">
                    <div>
                      <span className="flex items-center gap-2 text-sm font-black text-gray-900">
                        <VscWarning className="text-red-500" />
                        Conflicted Files ({conflictedFiles.length})
                      </span>
                      <p className="mt-0.5 text-[11px] text-gray-500">
                        파일을 열어 충돌 마커를 제거하고 저장한 뒤, 여기서 해결 완료 처리를 실행하세요.
                      </p>
                    </div>
                  </div>

                  <div className="max-h-44 space-y-1 overflow-y-auto bg-white p-2">
                    {conflictedFiles.map((file, index) => (
                      <div
                        key={`${file.path}-${index}`}
                        onClick={() => handleOpenConflictFile(file.path)}
                        className="group flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-transparent px-3 py-2.5 text-[13px] transition-all hover:border-red-100 hover:bg-red-50/70"
                      >
                        <div className="flex min-w-0 items-center gap-2 pr-2">
                          {getStatusIcon(file.status)}
                          <span className="truncate font-mono font-bold text-red-700">
                            {file.path}
                          </span>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <span className="flex items-center gap-1 text-[11px] font-bold text-blue-600 opacity-0 group-hover:opacity-100">
                            열기 <VscArrowRight size={12} />
                          </span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleMarkConflictResolved(file.path);
                            }}
                            className="flex shrink-0 items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 shadow-sm hover:bg-red-50"
                          >
                            <VscCheck size={12} />
                            해결 완료 처리
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex min-h-[250px] gap-6">
                <div className="flex flex-1 flex-col overflow-hidden rounded border border-gray-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2">
                    <span className="text-sm font-bold text-gray-700">
                      Unstaged Files ({unstagedFiles.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStage(".")}
                      disabled={unstagedFiles.length === 0}
                      className="text-xs font-semibold text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline"
                    >
                      Stage All
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                    {unstagedFiles.length > 0 ? (
                      unstagedFiles.map((file, index) => (
                        <div
                          key={`${file.path}-${index}`}
                          className="group flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-[13px] hover:bg-blue-50"
                        >
                          <div className="flex truncate pr-2 items-center gap-2">
                            {getStatusIcon(file.status)}
                            <span className="truncate font-mono text-gray-700">
                              {file.path}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleStage(file.path)}
                            className="flex shrink-0 items-center gap-1 rounded border border-gray-300 bg-white px-2 py-0.5 text-xs opacity-0 shadow-sm hover:bg-gray-100 group-hover:opacity-100"
                          >
                            <VscArrowUp size={12} /> Stage
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-gray-400">
                        변경/추가된 파일이 없습니다.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-1 flex-col overflow-hidden rounded border border-gray-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2">
                    <span className="text-sm font-bold text-gray-700">
                      Staged Files ({stagedFiles.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUnstage(".")}
                      disabled={stagedFiles.length === 0}
                      className="text-xs font-semibold text-red-600 hover:underline disabled:text-gray-400 disabled:no-underline"
                    >
                      Unstage All
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                    {stagedFiles.length > 0 ? (
                      stagedFiles.map((file, index) => (
                        <div
                          key={`${file.path}-${index}`}
                          className="group flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-[13px] hover:bg-gray-100"
                        >
                          <div className="flex truncate pr-2 items-center gap-2">
                            {getStatusIcon(file.status)}
                            <span className="truncate font-mono text-gray-700">
                              {file.path}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUnstage(file.path)}
                            className="flex shrink-0 items-center gap-1 rounded border border-gray-300 bg-white px-2 py-0.5 text-xs opacity-0 shadow-sm hover:bg-gray-100 group-hover:opacity-100"
                          >
                            <VscArrowDown size={12} /> Unstage
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-gray-400">
                        커밋할 파일이 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-2 flex shrink-0 flex-col overflow-hidden rounded border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
                  <span className="text-sm font-bold text-gray-700">
                    {isMerging ? "Merge Commit Message" : "Commit Message"}
                  </span>
                </div>
                <div className="flex gap-4 p-4">
                  <textarea
                    className="h-24 flex-1 resize-none rounded border border-gray-300 p-3 font-mono text-sm outline-none focus:border-blue-500"
                    placeholder="커밋 메시지를 입력하세요 [Ctrl+Enter]"
                    value={commitMessage}
                    onChange={(event) => setCommitMessage(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.ctrlKey && event.key === "Enter") handleCommit();
                    }}
                    disabled={isLoading}
                  />
                  <div className="flex w-48 flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleCommit}
                      disabled={
                        !commitMessage.trim() ||
                        stagedFiles.length === 0 ||
                        conflictedFiles.length > 0 ||
                        isLoading
                      }
                      className={`flex flex-1 items-center justify-center gap-2 rounded font-bold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        isMerging ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      <VscCheck size={18} /> {isMerging ? "Merge 완료 커밋" : "Commit"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCommitAndPush}
                      disabled={
                        !commitMessage.trim() ||
                        stagedFiles.length === 0 ||
                        conflictedFiles.length > 0 ||
                        isLoading
                      }
                      className="h-10 rounded bg-gray-800 text-xs font-bold text-white shadow-sm transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Commit & Push
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
