"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  VscAdd,
  VscCheck,
  VscChevronDown,
  VscClose,
  VscRefresh,
  VscSourceControl,
  VscTrash,
} from "react-icons/vsc";

import { useDispatch } from "react-redux";
import {
  clearVirtualTree,
  closeAllFiles,
} from "@/store/slices/fileSystemSlice";

import {
  DEFAULT_BRANCH,
  DEVELOP_BRANCH,
  isProtectedBranch,
  useGitBranches,
  validateBranchName,
} from "@/hooks/ide/useGitBranches";

const getBranchMeta = (branchName = "") => {
  const branch = String(branchName || "");
  const lower = branch.toLowerCase();

  if (lower === "master" || lower === "main") {
    return {
      label: "MAIN",
      dotClass: "bg-slate-500",
      badgeClass: "border-slate-200 bg-slate-50 text-slate-700",
      rowClass: "hover:bg-slate-50",
    };
  }

  if (lower === "develop") {
    return {
      label: "DEVELOP",
      dotClass: "bg-blue-500",
      badgeClass: "border-blue-200 bg-blue-50 text-blue-700",
      rowClass: "hover:bg-blue-50",
    };
  }

  if (lower.startsWith("feature/")) {
    return {
      label: "FEATURE",
      dotClass: "bg-violet-500",
      badgeClass: "border-violet-200 bg-violet-50 text-violet-700",
      rowClass: "hover:bg-violet-50",
    };
  }

  if (lower.startsWith("release/")) {
    return {
      label: "RELEASE",
      dotClass: "bg-amber-500",
      badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
      rowClass: "hover:bg-amber-50",
    };
  }

  if (lower.startsWith("hotfix/")) {
    return {
      label: "HOTFIX",
      dotClass: "bg-rose-500",
      badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
      rowClass: "hover:bg-rose-50",
    };
  }

  return {
    label: "BRANCH",
    dotClass: "bg-emerald-500",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rowClass: "hover:bg-emerald-50",
  };
};

function BranchBadge({ branch, compact = false }) {
  const meta = getBranchMeta(branch);

  return (
    <span
      className={`inline-flex min-w-0 items-center gap-1.5 rounded-full border font-black ${meta.badgeClass} ${
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
      }`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dotClass}`} />
      <span className="truncate">{branch}</span>
    </span>
  );
}

function BranchTypeTag({ branch }) {
  const meta = getBranchMeta(branch);

  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black tracking-wide ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
}

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

/** 내가 보는 브랜치가 바뀌었음을 알린다(코드맵이 듣는다). */
const notifyBranchContextChanged = (detail) => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("waivs:branch-context-changed", {
      detail: {
        ...detail,
        requestedAt: Date.now(),
      },
    }),
  );
};

function BranchPicker({
  value,
  options = [],
  onChange,
  placeholder = "브랜치 선택",
  excludeValue = "",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef(null);

  const visibleOptions = useMemo(() => {
    return options.filter((option) => option && option !== excludeValue);
  }, [options, excludeValue]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div ref={pickerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex h-11 w-full items-center justify-between rounded-xl border bg-white px-3 text-left shadow-sm outline-none transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
          open
            ? "border-blue-400 ring-4 ring-blue-50"
            : "border-gray-200 hover:border-gray-300"
        }`}
      >
        <span className="min-w-0 flex-1 truncate">
          {value ? (
            <BranchBadge branch={value} />
          ) : (
            <span className="text-[12px] font-bold text-gray-400">
              {placeholder}
            </span>
          )}
        </span>

        <VscChevronDown
          size={16}
          className={`ml-2 shrink-0 text-gray-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-[10050] mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
          <div className="max-h-64 overflow-y-auto p-1.5">
            {visibleOptions.length === 0 && (
              <div className="px-3 py-4 text-center text-[12px] font-bold text-gray-400">
                선택할 브랜치가 없습니다.
              </div>
            )}

            {visibleOptions.map((option) => {
              const selected = option === value;
              const meta = getBranchMeta(option);

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                    selected
                      ? "bg-blue-50 text-blue-700"
                      : `text-gray-700 ${meta.rowClass}`
                  }`}
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${meta.dotClass}`}
                    />
                    <span className="truncate text-[12px] font-black">
                      {option}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <BranchTypeTag branch={option} />
                    {selected && (
                      <VscCheck size={14} className="text-blue-600" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GitBranchControls({
  workspaceId,
  activeProject,
  activeBranch,
}) {
  const dispatch = useDispatch();
  const branchRef = useRef(null);

  const [isBranchOpen, setIsBranchOpen] = useState(false);

  const [isCreateBranchModalOpen, setIsCreateBranchModalOpen] = useState(false);
  const [branchDraft, setBranchDraft] = useState({
    branchName: "",
    baseBranch: DEFAULT_BRANCH,
    checkoutAfterCreate: true,
  });

  const [isMergeBranchModalOpen, setIsMergeBranchModalOpen] = useState(false);
  const [mergeDraft, setMergeDraft] = useState({
    sourceBranch: "",
    targetBranch: DEFAULT_BRANCH,
    mergeMode: "NO_FF",
    deleteSourceAfterMerge: false,
    checkoutTargetAfterMerge: false,
  });

  const {
    branches,
    visibleBranches,
    currentBranch,
    defaultMergeTarget,

    isLoadingBranches,
    isSwitchingBranch,
    isCreatingBranch,
    isDeletingBranchName,
    isMergingBranches,

    loadBranches,
    switchBranch,
    createBranch,
    deleteBranch,
    mergeBranches,
  } = useGitBranches({
    workspaceId,
    activeProject,
    activeBranch,
  });

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

  const normalBranches = useMemo(() => {
  const uniqueBranches = Array.from(
      new Set(
        (Array.isArray(branches) ? branches : [])
          .filter(Boolean),
      ),
    );

    const getPriority = (branch) => {
      const lower = branch.toLowerCase();

      if (lower === DEFAULT_BRANCH) return 0;
      if (lower === "main") return 1;
      if (lower === DEVELOP_BRANCH) return 2;
      if (lower.startsWith("feature/")) return 3;
      if (lower.startsWith("release/")) return 4;
      if (lower.startsWith("hotfix/")) return 5;

      return 10;
    };

    return uniqueBranches.sort((a, b) => {
      const priorityDiff = getPriority(a) - getPriority(b);

      if (priorityDiff !== 0) return priorityDiff;

      return a.localeCompare(b);
    });
  }, [branches]);

  const branchNameError = useMemo(() => {
    if (!branchDraft.branchName.trim()) return "";
    return validateBranchName(branchDraft.branchName, branches);
  }, [branchDraft.branchName, branches]);

  const isBranchBusy =
    isLoadingBranches ||
    isSwitchingBranch ||
    isCreatingBranch ||
    isMergingBranches ||
    Boolean(isDeletingBranchName);

  const isCreateDisabled =
    !branchDraft.branchName.trim() ||
    !branchDraft.baseBranch ||
    Boolean(branchNameError) ||
    isCreatingBranch;

  const isMergeDisabled =
    !mergeDraft.sourceBranch ||
    !mergeDraft.targetBranch ||
    mergeDraft.sourceBranch === mergeDraft.targetBranch ||
    isMergingBranches;

  useEffect(() => {
    if (!defaultMergeTarget) return;

    // 브랜치 목록이 바뀌면 모달의 기본값을 맞춰 두는 기존 동작이다. 옛 샌드박스 코드를
    // 걷어 내자 린트가 이 컴포넌트를 분석하기 시작하면서 드러난 경고라, 동작은 그대로 둔다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBranchDraft((prev) => ({
      ...prev,
      baseBranch:
        prev.baseBranch && branches.includes(prev.baseBranch)
          ? prev.baseBranch
          : currentBranch && branches.includes(currentBranch)
            ? currentBranch
            : defaultMergeTarget,
    }));

    setMergeDraft((prev) => ({
      ...prev,
      targetBranch:
        prev.targetBranch && branches.includes(prev.targetBranch)
          ? prev.targetBranch
          : defaultMergeTarget,
    }));
  }, [branches, currentBranch, defaultMergeTarget]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (branchRef.current && !branchRef.current.contains(event.target)) {
        setIsBranchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key !== "Escape") return;

      setIsBranchOpen(false);
      setIsCreateBranchModalOpen(false);
      setIsMergeBranchModalOpen(false);
    };

    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const openBranchDropdown = () => {
    if (!activeProject) {
      alert("프로젝트를 먼저 선택해주세요.");
      return;
    }

    setIsBranchOpen((prev) => !prev);
  };

  const resetEditorForBranchChange = (nextBranch = "") => {
    dispatch(closeAllFiles());
    dispatch(clearVirtualTree());

    if (!nextBranch) return;

    notifyBranchContextChanged({
      workspaceId,
      projectName: activeProject,
      branchName: nextBranch,
    });
  };

  const handleSelectBranch = async (branchName) => {
    if (!branchName || branchName === currentBranch || isBranchBusy) return;

    try {
      resetEditorForBranchChange(branchName);
      await switchBranch(branchName);

      setIsBranchOpen(false);
    } catch (error) {
      alert(error.message);
    }
  };

  const openCreateBranchModal = () => {
    const baseBranch =
      currentBranch && branches.includes(currentBranch)
        ? currentBranch
        : defaultMergeTarget || DEFAULT_BRANCH;

    setBranchDraft({
      branchName: "",
      baseBranch,
      checkoutAfterCreate: true,
    });

    setIsBranchOpen(false);
    setIsCreateBranchModalOpen(true);
  };

  const handleCreateBranch = async () => {
    if (isCreateDisabled) return;

    const createdBranchName = branchDraft.branchName.trim();

    try {
      await createBranch({
        branchName: createdBranchName,
        baseBranch: branchDraft.baseBranch,
        checkoutAfterCreate: branchDraft.checkoutAfterCreate,
      });

      if (branchDraft.checkoutAfterCreate) {
        resetEditorForBranchChange(createdBranchName);
      }

      notifyBranchesChanged({
        workspaceId,
        projectName: activeProject,
        reason: "branch-created",
        branchName: createdBranchName,
      });

      setBranchDraft({
        branchName: "",
        baseBranch: currentBranch || DEFAULT_BRANCH,
        checkoutAfterCreate: true,
      });

      setIsCreateBranchModalOpen(false);
    } catch (error) {
      alert(error.message);
    }
  };

  const openMergeBranchModal = (sourceBranch = "") => {
    const fallbackTarget =
      currentBranch && currentBranch !== "No Project"
        ? currentBranch
        : defaultMergeTarget || DEFAULT_BRANCH;

    const fallbackSource =
      sourceBranch ||
      normalBranches.find((branch) => branch !== fallbackTarget) ||
      "";

    const targetBranch =
      fallbackSource === fallbackTarget
        ? normalBranches.find((branch) => branch !== fallbackSource) ||
          defaultMergeTarget ||
          DEFAULT_BRANCH
        : fallbackTarget;

    setMergeDraft({
      sourceBranch: fallbackSource,
      targetBranch,
      mergeMode: "NO_FF",
      deleteSourceAfterMerge: false,
      checkoutTargetAfterMerge: false,
    });

    setIsBranchOpen(false);
    setIsMergeBranchModalOpen(true);
  };

  const handleMergeBranches = async () => {
    if (isMergeDisabled) return;

    try {
      const resultMessage = await mergeBranches({
        sourceBranch: mergeDraft.sourceBranch,
        targetBranch: mergeDraft.targetBranch,
        mergeMode: mergeDraft.mergeMode,
        deleteSourceAfterMerge: mergeDraft.deleteSourceAfterMerge,
        checkoutTargetAfterMerge: mergeDraft.checkoutTargetAfterMerge,
      });

      notifyBranchesChanged({
        workspaceId,
        projectName: activeProject,
        reason: "branch-merged",
        sourceBranch: mergeDraft.sourceBranch,
        targetBranch: mergeDraft.targetBranch,
      });

      setIsMergeBranchModalOpen(false);
      alert(resultMessage || "브랜치 병합이 완료되었습니다.");
    } catch (error) {
      alert(`브랜치 병합 실패:\n${error.message}`);
    }
  };

  const handleDeleteBranch = async (event, branchName) => {
    event.stopPropagation();

    if (isProtectedBranch(branchName) || branchName === currentBranch) return;

    const confirmed = window.confirm(
      `정말 '${branchName}' 브랜치를 삭제하시겠습니까?\n삭제된 브랜치의 워크트리도 함께 제거됩니다.`,
    );

    if (!confirmed) return;

    try {
      await deleteBranch(branchName);

      notifyBranchesChanged({
        workspaceId,
        projectName: activeProject,
        reason: "branch-deleted",
        branchName,
      });
    } catch (error) {
      alert(error.message);
    }
  };

  const handleRefreshBranches = async (event) => {
    event.stopPropagation();

    try {
      await loadBranches();
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="relative" ref={branchRef}>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 h-8 border rounded-lg cursor-pointer transition-all text-[12px] font-bold bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
            onClick={openBranchDropdown}
          >
            <VscSourceControl
              size={14}
              className="text-blue-500"
            />
            <span className="max-w-[160px] truncate">
              <BranchBadge branch={currentBranch} compact />
            </span>
            <VscChevronDown
              size={14}
              className={
                isBranchOpen
                  ? "rotate-180 transition-transform"
                  : "transition-transform text-gray-400"
              }
            />
          </button>

          {isBranchOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 shadow-xl rounded-xl py-2 z-[99999] animate-fade-in-up origin-top-right">
              <div className="px-4 pb-3 pt-1 border-b border-gray-100 mb-2 bg-gray-50/30">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                      <VscSourceControl /> Git Repository
                    </p>
                    <p className="text-[10px] text-gray-500 truncate mt-1 font-medium">
                      {activeProject}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleRefreshBranches}
                    disabled={isLoadingBranches}
                    className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
                    title="브랜치 목록 새로고침"
                  >
                    <VscRefresh
                      size={14}
                      className={isLoadingBranches ? "animate-spin" : ""}
                    />
                  </button>
                </div>
              </div>

              <div className="max-h-52 overflow-y-auto custom-scrollbar px-2 space-y-1">
                {visibleBranches.length === 0 && (
                  <div className="px-3 py-5 text-center text-[12px] text-gray-400">
                    표시할 브랜치가 없습니다.
                  </div>
                )}

                {visibleBranches.map((branch) => {
                  const isActive = branch === currentBranch;
                  const isProtected = isProtectedBranch(branch);
                  const isDeleting = isDeletingBranchName === branch;
                  const canDelete = !isActive && !isProtected && !isDeleting;
                  const canMerge = !isActive;

                  return (
                    <div
                      key={branch}
                      onClick={() => handleSelectBranch(branch)}
                      className={`flex items-center justify-between px-3 py-2.5 text-xs rounded-xl font-medium transition-all ${
                        isActive
                          ? "bg-blue-50 text-blue-700 font-bold"
                          : isBranchBusy
                            ? "text-gray-400 cursor-wait"
                            : "text-gray-600 hover:bg-gray-50 hover:text-blue-600 cursor-pointer"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          getBranchMeta(branch).dotClass
                        }`}
                      />

                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-[12px] font-black">{branch}</span>
                          {isActive && <VscCheck size={13} className="shrink-0 text-blue-600" />}
                        </div>

                        <div className="mt-0.5">
                          <BranchTypeTag branch={branch} />
                        </div>
                      </div>
                    </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {canMerge && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openMergeBranchModal(branch);
                            }}
                            disabled={isBranchBusy}
                            className="p-1 rounded text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-40"
                            title={`${branch} 브랜치를 다른 브랜치로 병합`}
                          >
                            <VscSourceControl size={14} />
                          </button>
                        )}

                        {!isProtected && (
                          <button
                            type="button"
                            onClick={(event) => handleDeleteBranch(event, branch)}
                            disabled={!canDelete}
                            className={`p-1 rounded transition-colors ${
                              canDelete
                                ? "text-gray-400 hover:text-red-500 hover:bg-red-50"
                                : "text-gray-300 cursor-not-allowed"
                            }`}
                            title={
                              isActive
                                ? "현재 브랜치는 삭제할 수 없습니다."
                                : "브랜치 삭제"
                            }
                          >
                            {isDeleting ? (
                              <VscRefresh size={14} className="animate-spin" />
                            ) : (
                              <VscTrash size={14} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-2 pt-2 border-t border-gray-100 px-3 space-y-2">
                <button
                  type="button"
                  onClick={openCreateBranchModal}
                  disabled={isCreatingBranch}
                  className="w-full h-9 rounded-lg bg-blue-600 text-white text-[12px] font-bold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <VscAdd size={14} /> 새 브랜치 생성
                </button>

                <button
                  type="button"
                  onClick={() => openMergeBranchModal()}
                  disabled={normalBranches.length < 2 || isMergingBranches}
                  className="w-full h-9 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 text-[12px] font-bold hover:bg-emerald-100 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <VscSourceControl size={14} /> 브랜치 병합
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isCreateBranchModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center animate-fade-in"
          onClick={() => setIsCreateBranchModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-[460px] overflow-hidden flex flex-col animate-slide-up ring-1 ring-black/5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-50 to-sky-50 p-6 border-b border-blue-100 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="bg-blue-100 p-1.5 rounded-lg">
                    <VscSourceControl className="text-blue-600" size={20} />
                  </div>
                  <h2 className="text-xl font-black text-blue-900 tracking-tight">
                    새 브랜치 생성
                  </h2>
                </div>
                <p className="text-[13px] text-blue-700/80 font-medium">
                  기준 브랜치를 선택한 뒤 새 작업 브랜치를 만듭니다.
                </p>
              </div>

              <button
                onClick={() => setIsCreateBranchModalOpen(false)}
                className="text-gray-400 hover:text-gray-800 bg-white/50 hover:bg-white p-1.5 rounded-full transition-colors"
              >
                <VscClose size={20} />
              </button>
            </div>

            <div className="p-6 bg-white space-y-4">
              <div className="space-y-2">
                <label className="text-[13px] font-extrabold text-gray-800">
                  기준 브랜치
                </label>

                <BranchPicker
                    value={branchDraft.baseBranch}
                    options={normalBranches}
                    placeholder="기준 브랜치 선택"
                    onChange={(nextBaseBranch) =>
                      setBranchDraft((prev) => ({
                        ...prev,
                        baseBranch: nextBaseBranch,
                      }))
                    }
                  />
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-extrabold text-gray-800">
                  새 브랜치명
                </label>

                <input
                  type="text"
                  value={branchDraft.branchName}
                  onChange={(event) =>
                    setBranchDraft((prev) => ({
                      ...prev,
                      branchName: event.target.value,
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleCreateBranch();
                    }
                  }}
                  placeholder="예) feature/login-ui, hotfix/build-error"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-[14px] outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-medium"
                  autoFocus
                />

                {branchNameError && (
                  <p className="text-[11px] font-medium text-red-500">
                    {branchNameError}
                  </p>
                )}
              </div>

              <label className="flex items-center gap-2 text-[12px] font-bold text-gray-700">
                <input
                  type="checkbox"
                  checked={branchDraft.checkoutAfterCreate}
                  onChange={(event) =>
                    setBranchDraft((prev) => ({
                      ...prev,
                      checkoutAfterCreate: event.target.checked,
                    }))
                  }
                  className="w-4 h-4"
                />
                생성 후 새 브랜치로 이동
              </label>

              <button
                onClick={handleCreateBranch}
                disabled={isCreateDisabled}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-[14px] font-bold shadow-lg shadow-blue-200 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
              >
                {isCreatingBranch ? (
                  <>
                    <VscRefresh className="animate-spin" /> 생성 중
                  </>
                ) : (
                  <>
                    <VscAdd size={16} /> 브랜치 생성
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isMergeBranchModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center animate-fade-in"
          onClick={() => setIsMergeBranchModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-[480px] overflow-hidden flex flex-col animate-slide-up ring-1 ring-black/5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 border-b border-emerald-100 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="bg-emerald-100 p-1.5 rounded-lg">
                    <VscSourceControl className="text-emerald-600" size={20} />
                  </div>
                  <h2 className="text-xl font-black text-emerald-900 tracking-tight">
                    브랜치 병합
                  </h2>
                </div>
                <p className="text-[13px] text-emerald-700/80 font-medium">
                  선택한 브랜치를 대상 브랜치로 병합합니다.
                </p>
              </div>

              <button
                onClick={() => setIsMergeBranchModalOpen(false)}
                className="text-gray-400 hover:text-gray-800 bg-white/50 hover:bg-white p-1.5 rounded-full transition-colors"
              >
                <VscClose size={20} />
              </button>
            </div>

            <div className="p-6 bg-white space-y-4">
              <div className="space-y-2">
                <label className="text-[13px] font-extrabold text-gray-800">
                  병합할 브랜치
                </label>

                <BranchPicker
                  value={mergeDraft.sourceBranch}
                  options={normalBranches}
                  placeholder="병합할 브랜치 선택"
                  onChange={(nextSourceBranch) =>
                    setMergeDraft((prev) => ({
                      ...prev,
                      sourceBranch: nextSourceBranch,
                      targetBranch:
                        nextSourceBranch === prev.targetBranch
                          ? normalBranches.find((branch) => branch !== nextSourceBranch) ||
                            DEFAULT_BRANCH
                          : prev.targetBranch,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-extrabold text-gray-800">
                  병합 받을 브랜치
                </label>

                <BranchPicker
                  value={mergeDraft.targetBranch}
                  options={normalBranches}
                  excludeValue={mergeDraft.sourceBranch}
                  placeholder="병합 받을 브랜치 선택"
                  onChange={(nextTargetBranch) =>
                    setMergeDraft((prev) => ({
                      ...prev,
                      targetBranch: nextTargetBranch,
                    }))
                  }
                />
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[12px] text-gray-600">
                <span className="font-black text-gray-800">
                  {mergeDraft.sourceBranch || "source"}
                </span>{" "}
                →{" "}
                <span className="font-black text-emerald-700">
                  {mergeDraft.targetBranch || "target"}
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-extrabold text-gray-800">
                  병합 방식
                </label>

                <select
                  value={mergeDraft.mergeMode}
                  onChange={(event) =>
                    setMergeDraft((prev) => ({
                      ...prev,
                      mergeMode: event.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-[13px] outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all font-medium bg-white"
                >
                  <option value="NO_FF">No Fast-Forward (--no-ff)</option>
                  <option value="FF">Fast-Forward 허용</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[12px] font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={mergeDraft.checkoutTargetAfterMerge}
                    onChange={(event) =>
                      setMergeDraft((prev) => ({
                        ...prev,
                        checkoutTargetAfterMerge: event.target.checked,
                      }))
                    }
                    className="w-4 h-4"
                  />
                  병합 후 대상 브랜치로 이동
                </label>

                <label className="flex items-center gap-2 text-[12px] font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={mergeDraft.deleteSourceAfterMerge}
                    onChange={(event) =>
                      setMergeDraft((prev) => ({
                        ...prev,
                        deleteSourceAfterMerge: event.target.checked,
                      }))
                    }
                    className="w-4 h-4"
                  />
                  병합 성공 후 source 브랜치 삭제
                </label>
              </div>

              <button
                onClick={handleMergeBranches}
                disabled={isMergeDisabled}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl text-[14px] font-bold shadow-lg shadow-emerald-200 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
              >
                {isMergingBranches ? (
                  <>
                    <VscRefresh className="animate-spin" /> 병합 중
                  </>
                ) : (
                  <>
                    <VscCheck size={16} /> 병합 실행
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}