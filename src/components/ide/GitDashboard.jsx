// 경로: src/components/GitDashboard.jsx

import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  VscSourceControl,
  VscRepo,
  VscRepoForked,
  VscRecord,
  VscCloudDownload,
  VscCloudUpload,
  VscCheck,
  VscDiffAdded,
  VscDiffModified,
  VscDiffRemoved,
  VscArrowDown,
  VscArrowUp,
  VscRefresh,
  VscKey,
  VscHistory,
  VscGithubInverted,
  VscWarning,
  VscClose,
  VscTrash, // 💡 [추가] 휴지통 아이콘
} from "react-icons/vsc";

// 💡 [추가] clearVirtualTree 가져오기
import {
  setActiveProject,
  setActiveBranch,
  closeAllFiles,
  updateProjectGitInfo,
  clearVirtualTree,
} from "@/store/slices/fileSystemSlice";
import {
  fetchGitStatusApi,
  stageFilesApi,
  unstageFilesApi,
  commitChangesApi,
  fetchBranchListApi,
  pushToRemoteApi,
  pullFromRemoteApi,
  fetchGitHistoryApi,
  resetCommitApi,
  checkoutCommitApi,
  mergeCommitApi,
  updateGitUrlApi,
  abortMergeApi,
  deleteBranchApi, // 💡 [추가] 삭제 API 가져오기
} from "@/lib/ide/api";
import { renderGraph } from "@/lib/ide/gitGraphHelper";

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
  const [historyLog, setHistoryLog] = useState([]);

  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showGitUrlModal, setShowGitUrlModal] = useState(false);
  const [modalAction, setModalAction] = useState("push");
  const [githubToken, setGithubToken] = useState("");
  const [inputGitUrl, setInputGitUrl] = useState("");

  const authorName = "노민주";
  const authorEmail = "minju@webide.com";

  // 커밋 히스토리용 우클릭 메뉴
  const [contextMenu, setContextMenu] = useState(null);
  const contextMenuRef = useRef(null);

  // 💡 [NEW] 브랜치 목록용 우클릭 메뉴 상태
  const [branchContextMenu, setBranchContextMenu] = useState(null);
  const branchContextMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target)
      ) {
        setContextMenu(null);
      }
      if (
        branchContextMenuRef.current &&
        !branchContextMenuRef.current.contains(e.target)
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
        return (
          <VscDiffAdded className="text-green-600" size={16} title="추가됨" />
        );
      case "modified":
        return (
          <VscDiffModified
            className="text-yellow-600"
            size={16}
            title="수정됨"
          />
        );
      case "deleted":
        return (
          <VscDiffRemoved className="text-red-600" size={16} title="삭제됨" />
        );
      case "conflicted":
        return <VscWarning className="text-red-500" size={16} title="충돌됨" />;
      default:
        return null;
    }
  };

  useEffect(() => {
    if (workspaceId && activeProject)
      fetchBranchListApi(workspaceId, activeProject)
        .then(setBranchList)
        .catch(console.error);
    else setBranchList([]);
  }, [workspaceId, activeProject]);

  const loadGitStatus = async () => {
    if (!workspaceId || !activeProject) return;
    try {
      setIsLoading(true);
      if (activeView === "status") {
        const statusData = await fetchGitStatusApi(
          workspaceId,
          activeProject,
          activeBranch || "master",
        );
        setStagedFiles(statusData.staged || []);
        setUnstagedFiles(statusData.unstaged || []);
        setConflictedFiles(statusData.conflicted || []);
        setIsMerging(statusData.isMerging || false);

        if (statusData.isMerging && !commitMessage) {
          setCommitMessage("Merge branch and resolve conflicts");
        }
      } else if (activeView === "history") {
        const historyData = await fetchGitHistoryApi(
          workspaceId,
          activeProject,
          activeBranch || "master",
        );
        setHistoryLog(historyData || []);
      }
    } catch (error) {
      console.error("Git 상태 로드 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGitStatus();
  }, [workspaceId, activeProject, activeBranch, activeView]);

  const handleProjectChange = (e) => {
    dispatch(setActiveProject(e.target.value));
    dispatch(setActiveBranch("master"));
    setActiveView("status");
  };

  const handleBranchChange = (branchName) => {
    if (branchName !== activeBranch) {
      dispatch(closeAllFiles());
      dispatch(clearVirtualTree()); // 💡 변경 시 가상 뷰 해제
      dispatch(setActiveBranch(branchName));
    }
  };

  // =========================================================================
  // 💡 [NEW] 브랜치 우클릭 및 삭제 로직
  // =========================================================================
  const handleBranchRightClick = (e, branchName) => {
    e.preventDefault();
    // 마스터 브랜치는 우클릭 삭제 메뉴 안 띄움
    if (branchName === "master") return;
    setBranchContextMenu({ x: e.pageX, y: e.pageY, branch: branchName });
  };

  const handleDeleteBranch = async () => {
    if (!branchContextMenu) return;
    const branchName = branchContextMenu.branch;
    setBranchContextMenu(null);

    if (
      !window.confirm(
        `정말 '${branchName}' 브랜치를 삭제하시겠습니까?\n(해당 브랜치의 파일이 영구 삭제됩니다!)`,
      )
    )
      return;

    try {
      setIsLoading(true);
      await deleteBranchApi(workspaceId, activeProject, branchName);

      // 삭제 후 로컬 브랜치 목록 갱신
      setBranchList((prev) => prev.filter((b) => b !== branchName));
      alert(`'${branchName}' 브랜치가 삭제되었습니다.`);

      // 삭제한 브랜치가 현재 켜져 있는 브랜치라면 마스터로 피신!
      if (activeBranch === branchName) {
        dispatch(closeAllFiles());
        dispatch(clearVirtualTree());
        dispatch(setActiveBranch("master"));
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  // =========================================================================

  const handleStage = async (filePattern) => {
    try {
      setIsLoading(true);
      await stageFilesApi(
        workspaceId,
        activeProject,
        activeBranch || "master",
        filePattern,
      );
      await loadGitStatus();
    } catch (error) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  const handleUnstage = async (filePattern) => {
    try {
      setIsLoading(true);
      await unstageFilesApi(
        workspaceId,
        activeProject,
        activeBranch || "master",
        filePattern,
      );
      await loadGitStatus();
    } catch (error) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAbortMerge = async () => {
    if (
      !window.confirm(
        "정말 병합을 취소하시겠습니까? 해결 중이던 충돌 내역이 모두 날아갑니다!",
      )
    )
      return;
    try {
      setIsLoading(true);
      await abortMergeApi(workspaceId, activeProject, activeBranch || "master");
      alert("✅ 병합이 안전하게 취소되었습니다. 이전 상태로 복구됩니다.");
      setCommitMessage("");
      await loadGitStatus();
    } catch (error) {
      alert("병합 취소 실패: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommit = async () => {
    if (conflictedFiles.length > 0)
      return alert(
        "❌ 아직 해결되지 않은 충돌 파일이 있습니다! \n파일에서 <<<<<< ======= >>>>>> 부분을 수정하고 Stage(Resolve & Stage) 해주세요.",
      );
    if (!commitMessage.trim()) return alert("커밋 메시지를 입력해주세요.");
    if (stagedFiles.length === 0)
      return alert("커밋할 파일(Staged)이 없습니다!");

    try {
      setIsLoading(true);
      await commitChangesApi(
        workspaceId,
        activeProject,
        activeBranch || "master",
        commitMessage,
        authorName,
        authorEmail,
      );
      alert("✅ 성공적으로 커밋되었습니다!");
      setCommitMessage("");
      await loadGitStatus();
      return true;
    } catch (error) {
      alert("커밋 실패: " + error.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoteActionClick = (action) => {
    if (isMerging)
      return alert(
        "⚠️ 현재 병합 충돌 해결 중입니다. 충돌을 먼저 해결하고 커밋해주세요!",
      );

    const currentProj = projectList.find((p) => p.name === activeProject);
    setModalAction(action);

    if (!currentProj || !currentProj.gitUrl) setShowGitUrlModal(true);
    else setShowTokenModal(true);
  };

  const handleLinkGitUrlAndProceed = async () => {
    if (!inputGitUrl.trim()) return alert("Git URL을 입력해주세요!");
    try {
      setIsLoading(true);
      await updateGitUrlApi(workspaceId, activeProject, inputGitUrl);
      dispatch(
        updateProjectGitInfo({
          projectName: activeProject,
          gitUrl: inputGitUrl,
        }),
      );
      alert(
        "✅ Git 저장소가 성공적으로 연동되었습니다! 이어서 토큰 인증을 진행합니다.",
      );
      setShowGitUrlModal(false);
      setInputGitUrl("");
      setShowTokenModal(true);
    } catch (error) {
      alert("연동 실패: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const executeRemoteAction = async () => {
    if (!githubToken.trim()) return alert("GitHub Token을 입력해주세요!");
    setShowTokenModal(false);
    try {
      setIsLoading(true);
      if (modalAction === "push") {
        await pushToRemoteApi(
          workspaceId,
          activeProject,
          activeBranch || "master",
          githubToken,
        );
        alert("🚀 성공적으로 GitHub에 Push 되었습니다!");
      } else if (modalAction === "pull") {
        await pullFromRemoteApi(
          workspaceId,
          activeProject,
          activeBranch || "master",
          githubToken,
        );
        alert("📥 성공적으로 GitHub에서 Pull 되었습니다!");
        await loadGitStatus();
      }
      setGithubToken("");
    } catch (error) {
      alert(error.message);
      setShowTokenModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommitAndPush = async () => {
    const commitSuccess = await handleCommit();
    if (commitSuccess) handleRemoteActionClick("push");
  };

  const handleRightClick = (e, log) => {
    e.preventDefault();
    if (!log.hash || log.hash.trim() === "") return;
    setContextMenu({ x: e.pageX, y: e.pageY, commit: log });
  };

  const handleContextMenuAction = async (action) => {
    if (!contextMenu) return;
    const targetHash = contextMenu.commit.hash;
    setContextMenu(null);

    if (isMerging) {
      return alert(
        "⚠️ 현재 병합 충돌(Conflict)이 발생하여 작업이 일시정지 되었습니다.\n우측의 파일 상태 탭에서 충돌을 해결하여 커밋하거나, [병합 취소]를 눌러주세요.",
      );
    }

    try {
      setIsLoading(true);
      if (action === "checkout") {
        if (
          window.confirm(
            `⚠️ 과거 커밋(${targetHash})으로 Checkout 하시겠습니까?\n커밋하지 않은 변경사항은 유실될 수 있으며, Detached HEAD 상태가 됩니다.`,
          )
        ) {
          await checkoutCommitApi(
            workspaceId,
            activeProject,
            activeBranch || "master",
            targetHash,
          );
          alert(`✅ HEAD가 ${targetHash} 커밋으로 이동했습니다!`);
        }
      } else if (action === "merge") {
        if (
          window.confirm(
            `현재 브랜치(${activeBranch || "master"})에 이 커밋(${targetHash})을 병합하시겠습니까?`,
          )
        ) {
          await mergeCommitApi(
            workspaceId,
            activeProject,
            activeBranch || "master",
            targetHash,
          );
          alert("✅ 병합 완료!");
        }
      } else if (action === "reset") {
        if (
          window.confirm(
            `⚠️ 경고: 현재 브랜치를 이 커밋(${targetHash}) 상태로 완전히 되돌리시겠습니까? 저장되지 않은 작업은 날아갑니다.`,
          )
        ) {
          await resetCommitApi(
            workspaceId,
            activeProject,
            activeBranch || "master",
            targetHash,
          );
          alert("✅ 리셋 완료!");
        }
      }
      await loadGitStatus();
    } catch (e) {
      alert(`오류 발생: ${e.message}`);
      await loadGitStatus();
    } finally {
      setIsLoading(false);
    }
  };

  const renderRefs = (refsStr) => {
    if (!refsStr) return null;
    return refsStr
      .split(",")
      .map((r) => r.trim())
      .map((ref, idx) => {
        const isHead = ref.includes("HEAD");
        const isRemote = ref.includes("origin/");
        let bgColor = "bg-gray-100 text-gray-700 border-gray-300";
        if (isHead) bgColor = "bg-[#d1e7dd] text-[#0f5132] border-[#badbcc]";
        else if (isRemote) bgColor = "bg-red-50 text-red-700 border-red-200";
        else if (ref === "master" || ref === "main")
          bgColor = "bg-blue-50 text-blue-700 border-blue-200";
        return (
          <span
            key={idx}
            className={`text-[10px] px-1.5 py-0.5 rounded-sm border font-semibold ${bgColor} mr-1.5 shrink-0 shadow-sm`}
          >
            {ref}
          </span>
        );
      });
  };

  if (!activeProject || !projectList || projectList.length === 0)
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-400 flex-col gap-4">
        <VscSourceControl size={48} className="opacity-50" />
        <p>좌측 메뉴에서 프로젝트를 먼저 생성하거나 선택해주세요.</p>
      </div>
    );

  return (
    <div className="flex-1 flex h-full w-full bg-white font-sans text-[#333] relative">
      {/* 커밋 히스토리 우클릭 메뉴 */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed bg-white border border-gray-200 shadow-xl rounded-md py-1 z-[9999] text-sm text-gray-700 w-72"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div className="px-3 py-1.5 border-b border-gray-100 bg-gray-50">
            <span className="font-mono text-xs font-bold text-blue-600">
              Commit: {contextMenu.commit.hash.substring(0, 7)}
            </span>
          </div>
          <div
            onClick={() => handleContextMenuAction("checkout")}
            className="px-4 py-2 hover:bg-blue-50 hover:text-blue-600 cursor-pointer transition-colors flex items-center gap-2"
          >
            <VscRepoForked size={16} /> 이 커밋으로 Checkout (Detached HEAD)
          </div>
          <div
            onClick={() => handleContextMenuAction("merge")}
            className="px-4 py-2 hover:bg-blue-50 hover:text-blue-600 cursor-pointer transition-colors flex items-center gap-2"
          >
            <VscSourceControl size={16} /> 현재 브랜치로 병합 (Merge)
          </div>
          <div
            onClick={() => handleContextMenuAction("reset")}
            className="px-4 py-2 hover:bg-red-50 hover:text-red-600 cursor-pointer transition-colors flex items-center gap-2 text-red-500"
          >
            <VscHistory size={16} /> 이 커밋으로 초기화 (Reset Hard)
          </div>
        </div>
      )}

      {/* 💡 [NEW] 브랜치 전용 우클릭 휴지통 메뉴 */}
      {branchContextMenu && (
        <div
          ref={branchContextMenuRef}
          className="fixed bg-white border border-gray-200 shadow-xl rounded-md py-1 z-[9999] text-sm text-gray-700 w-48"
          style={{ top: branchContextMenu.y, left: branchContextMenu.x }}
        >
          <div className="px-3 py-1.5 border-b border-gray-100 bg-gray-50">
            <span className="font-mono text-xs font-bold text-gray-600">
              Branch: {branchContextMenu.branch}
            </span>
          </div>
          <div
            onClick={handleDeleteBranch}
            className="px-4 py-2 hover:bg-red-50 hover:text-red-600 cursor-pointer transition-colors flex items-center gap-2 text-red-500 font-bold"
          >
            <VscTrash size={16} /> 브랜치 삭제
          </div>
        </div>
      )}

      {/* 모달 창들 */}
      {showGitUrlModal && (
        <div className="absolute inset-0 bg-black/40 z-[9999] flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-96 p-6 flex flex-col gap-4 animate-fade-in-up">
            <div className="flex items-center gap-2 text-lg font-bold text-gray-800">
              <VscGithubInverted size={20} className="text-gray-800" /> 원격
              저장소 연동
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              해당 프로젝트에 연결된 GitHub 저장소가 없습니다.
              <br />
              Push/Pull을 위해 먼저 URL을 연동해주세요.
            </p>
            <input
              type="text"
              placeholder="https://github.com/username/repo.git"
              value={inputGitUrl}
              onChange={(e) => setInputGitUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleLinkGitUrlAndProceed();
              }}
              className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-blue-500"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setShowGitUrlModal(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleLinkGitUrlAndProceed}
                disabled={!inputGitUrl.trim() || isLoading}
                className="px-4 py-2 text-sm font-semibold text-white bg-gray-800 hover:bg-black rounded transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                연동하기
              </button>
            </div>
          </div>
        </div>
      )}

      {showTokenModal && (
        <div className="absolute inset-0 bg-black/40 z-[9999] flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-96 p-6 flex flex-col gap-4 animate-fade-in-up">
            <div className="flex items-center gap-2 text-lg font-bold text-gray-800">
              <VscKey size={20} className="text-amber-500" /> GitHub Token 인증
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              {modalAction === "push"
                ? "원격 저장소로 푸시"
                : "원격 저장소에서 풀(Pull)"}{" "}
              작업을 위해 PAT가 필요합니다.
            </p>
            <input
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxx"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") executeRemoteAction();
              }}
              className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-blue-500 font-mono"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setShowTokenModal(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                취소
              </button>
              <button
                onClick={executeRemoteAction}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors flex items-center gap-1"
              >
                {modalAction === "push" ? (
                  <VscCloudUpload size={16} />
                ) : (
                  <VscCloudDownload size={16} />
                )}{" "}
                실행
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center">
          <div className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded shadow-lg font-bold text-sm">
            <VscRefresh className="animate-spin" size={16} /> 처리 중...
          </div>
        </div>
      )}

      {/* 좌측 사이드바 영역 */}
      <div className="w-64 border-r border-gray-200 bg-[#f8f9fa] flex flex-col shrink-0">
        <div className="h-14 flex items-center px-4 border-b border-gray-200 bg-white hover:bg-gray-50 transition-colors cursor-pointer">
          <VscRepo size={18} className="text-blue-600 mr-2 shrink-0" />
          <select
            value={activeProject || ""}
            onChange={handleProjectChange}
            className="font-bold text-sm bg-transparent outline-none cursor-pointer flex-1 truncate text-gray-800"
          >
            <option value="" disabled>
              프로젝트 선택
            </option>
            {projectList.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="mb-6">
            <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
              Workspace
            </div>
            <div
              onClick={() => setActiveView("status")}
              className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer font-medium text-[13px] transition-colors ${activeView === "status" ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100"}`}
            >
              <VscRecord size={16} /> File Status
            </div>
            <div
              onClick={() => setActiveView("history")}
              className={`flex items-center gap-2 px-2 py-1.5 mt-1 rounded cursor-pointer font-medium text-[13px] transition-colors ${activeView === "history" ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100"}`}
            >
              <VscHistory size={16} /> History
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider flex items-center justify-between">
              <span>Branches</span>
              <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded text-[10px]">
                {branchList.length}
              </span>
            </div>
            <div className="mt-1 flex flex-col gap-0.5">
              {/* 💡 [NEW] 브랜치 렌더링 영역 (우클릭 이벤트 연결) */}
              {branchList.map((branch) => (
                <div
                  key={branch}
                  onClick={() => handleBranchChange(branch)}
                  onContextMenu={(e) => handleBranchRightClick(e, branch)}
                  className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded cursor-pointer text-[13px] transition-colors ${branch === (activeBranch || "master") ? "text-gray-800 font-bold bg-gray-100 border-l-2 border-blue-500" : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"}`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <VscRepoForked
                      size={16}
                      className={
                        branch === (activeBranch || "master")
                          ? "text-blue-600"
                          : "text-gray-400"
                      }
                    />
                    <span className="truncate">{branch}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 우측 메인 영역 */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#fefefe] relative">
        <div className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <span className="font-bold text-lg">
              {activeView === "status" ? "File Status" : "Commit History"}
            </span>
            <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
              <span className="text-xs font-bold text-gray-700">
                {activeProject}
              </span>
              <span className="text-gray-400 text-xs">/</span>
              <span className="text-xs text-blue-600 font-mono font-semibold">
                {activeBranch || "master"}
              </span>
            </div>

            <button
              onClick={async () => {
                if (isMerging)
                  return alert(
                    "⚠️ 병합 충돌 해결 중입니다. 타임머신을 탈 수 없습니다.",
                  );
                try {
                  setIsLoading(true);
                  const target = activeBranch || "master";
                  await checkoutCommitApi(
                    workspaceId,
                    activeProject,
                    activeBranch || "master",
                    target,
                  );
                  alert(
                    `✅ 원래 브랜치(${target})의 최신 상태로 복귀했습니다!`,
                  );
                  await loadGitStatus();
                } catch (e) {
                  alert(e.message);
                } finally {
                  setIsLoading(false);
                }
              }}
              className="ml-2 px-3 py-1 bg-amber-100 text-amber-700 text-[11px] font-bold rounded hover:bg-amber-200 transition-colors shadow-sm disabled:opacity-50"
            >
              최신 HEAD로 복귀
            </button>

            <VscRefresh
              className="cursor-pointer text-gray-400 hover:text-blue-600 transition-colors"
              title="새로고침"
              onClick={loadGitStatus}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleRemoteActionClick("pull")}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 shadow-sm transition-colors"
            >
              <VscCloudDownload size={16} className="text-blue-600" /> Pull
            </button>
            <button
              onClick={() => handleRemoteActionClick("push")}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 shadow-sm transition-colors"
            >
              <VscCloudUpload size={16} className="text-green-600" /> Push
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto bg-[#fafbfc]">
          {activeView === "status" && isMerging && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-start justify-between shadow-sm">
              <div className="flex items-start gap-3">
                <VscWarning className="text-red-500 mt-0.5" size={24} />
                <div>
                  <h3 className="font-bold text-red-700 text-sm mb-1">
                    병합 충돌(Merge Conflict)이 발생했습니다!
                  </h3>
                  <p className="text-xs text-red-600 leading-relaxed">
                    아래 <b>'Conflicted Files'</b> 목록에 있는 파일들을 좌측
                    탐색기에서 열어 <code>&lt;&lt;&lt;&lt;&lt;&lt;</code> 와{" "}
                    <code>&gt;&gt;&gt;&gt;&gt;&gt;</code> 로 표시된 충돌 영역을
                    직접 수정하세요.
                    <br />
                    수정이 완료되면 해당 파일의 <b>Resolve & Stage</b> 버튼을
                    누르고 커밋하여 병합을 완료할 수 있습니다.
                  </p>
                </div>
              </div>
              <button
                onClick={handleAbortMerge}
                className="bg-white border border-red-200 text-red-600 hover:bg-red-100 text-xs font-bold px-4 py-2 rounded shadow-sm transition-colors flex items-center gap-1 shrink-0"
              >
                <VscClose size={16} /> 병합 취소 (Abort)
              </button>
            </div>
          )}

          {activeView === "history" ? (
            <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden flex flex-col h-full bg-[#fafbfc]">
              <div className="bg-white px-4 py-2 border-b border-gray-200 flex text-xs font-bold text-gray-600 items-center sticky top-0 z-10">
                <div className="w-24 shrink-0 text-center">Graph</div>
                <div className="flex-1">Description</div>
                <div className="w-24 shrink-0 text-center">Commit</div>
                <div className="w-28 shrink-0 text-center">Author</div>
                <div className="w-32 shrink-0 text-right">Date</div>
              </div>
              <div className="flex-1 overflow-y-auto pt-2 pb-6">
                {historyLog.length > 0 ? (
                  historyLog.map((log, i) => {
                    const isCommit = log.hash && log.hash.trim() !== "";
                    return (
                      <div
                        key={i}
                        onContextMenu={(e) => handleRightClick(e, log)}
                        className={`flex px-4 hover:bg-blue-50 transition-colors cursor-pointer items-center text-[13px] group h-6`}
                      >
                        <div className="w-24 shrink-0 h-full flex items-center justify-start pl-2 font-mono select-none overflow-visible">
                          {renderGraph(log.graph)}
                        </div>

                        {isCommit && (
                          <>
                            <div className="flex-1 flex items-center gap-2 truncate pr-4 h-full border-b border-gray-100/70 group-hover:border-transparent">
                              {renderRefs(log.refs)}
                              <span
                                className="font-semibold text-gray-800 truncate"
                                title={log.message}
                              >
                                {log.message}
                              </span>
                            </div>
                            <div className="w-24 shrink-0 font-mono text-blue-600 font-medium text-center h-full flex items-center justify-center border-b border-gray-100/70 group-hover:border-transparent">
                              {log.hash.substring(0, 7)}
                            </div>
                            <div className="w-28 shrink-0 text-gray-600 truncate text-center h-full flex items-center justify-center border-b border-gray-100/70 group-hover:border-transparent">
                              {log.author}
                            </div>
                            <div className="w-32 shrink-0 text-right text-gray-500 text-xs h-full flex items-center justify-end border-b border-gray-100/70 group-hover:border-transparent">
                              {log.date}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-gray-400 text-sm">
                    커밋 기록이 없습니다.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {conflictedFiles.length > 0 && (
                <div className="border border-red-300 rounded bg-red-50 shadow-sm overflow-hidden flex flex-col shrink-0 mb-2 animate-pulse-border">
                  <div className="bg-red-100 px-4 py-2 border-b border-red-200 flex justify-between items-center">
                    <span className="text-sm font-bold text-red-800 flex items-center gap-2">
                      <VscWarning /> Conflicted Files ({conflictedFiles.length})
                    </span>
                  </div>
                  <div className="max-h-40 overflow-y-auto p-2 bg-white">
                    {conflictedFiles.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-2 py-1.5 hover:bg-red-50 rounded cursor-pointer group text-[13px]"
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          {getStatusIcon(f.status)}
                          <span className="font-mono text-red-700 font-semibold truncate">
                            {f.path}
                          </span>
                        </div>
                        <button
                          onClick={() => handleStage(f.path)}
                          className="opacity-0 group-hover:opacity-100 shrink-0 bg-white border border-red-300 text-red-600 px-2 py-0.5 rounded text-xs hover:bg-red-50 flex items-center gap-1 shadow-sm font-bold"
                        >
                          <VscCheck size={12} /> Resolve & Stage
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-6 min-h-[250px]">
                <div className="flex-1 flex flex-col border border-gray-200 rounded bg-white shadow-sm overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-700">
                      Unstaged Files ({unstagedFiles.length})
                    </span>
                    <button
                      onClick={() => handleStage(".")}
                      disabled={unstagedFiles.length === 0}
                      className="text-xs text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline font-semibold"
                    >
                      Stage All
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                    {unstagedFiles.length > 0 ? (
                      unstagedFiles.map((f, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between px-2 py-1.5 hover:bg-blue-50 rounded cursor-pointer group text-[13px]"
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            {getStatusIcon(f.status)}
                            <span className="font-mono text-gray-700 truncate">
                              {f.path}
                            </span>
                          </div>
                          <button
                            onClick={() => handleStage(f.path)}
                            className="opacity-0 group-hover:opacity-100 shrink-0 bg-white border border-gray-300 px-2 py-0.5 rounded text-xs hover:bg-gray-100 flex items-center gap-1 shadow-sm"
                          >
                            <VscArrowUp size={12} /> Stage
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-400 flex items-center justify-center h-full">
                        변경/추가된 파일이 없습니다.
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 flex flex-col border border-gray-200 rounded bg-white shadow-sm overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-700">
                      Staged Files ({stagedFiles.length})
                    </span>
                    <button
                      onClick={() => handleUnstage(".")}
                      disabled={stagedFiles.length === 0}
                      className="text-xs text-red-600 hover:underline disabled:text-gray-400 disabled:no-underline font-semibold"
                    >
                      Unstage All
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                    {stagedFiles.length > 0 ? (
                      stagedFiles.map((f, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer group text-[13px]"
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            {getStatusIcon(f.status)}
                            <span className="font-mono text-gray-700 truncate">
                              {f.path}
                            </span>
                          </div>
                          <button
                            onClick={() => handleUnstage(f.path)}
                            className="opacity-0 group-hover:opacity-100 shrink-0 bg-white border border-gray-300 px-2 py-0.5 rounded text-xs hover:bg-gray-100 flex items-center gap-1 shadow-sm"
                          >
                            <VscArrowDown size={12} /> Unstage
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-400 flex items-center justify-center h-full">
                        커밋할 파일이 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded bg-white shadow-sm overflow-hidden flex flex-col shrink-0 mt-2">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <span className="text-sm font-bold text-gray-700">
                    {isMerging ? "Merge Commit Message" : "Commit Message"}
                  </span>
                </div>
                <div className="p-4 flex gap-4">
                  <textarea
                    className="flex-1 h-24 border border-gray-300 rounded p-3 text-sm resize-none outline-none focus:border-blue-500 font-mono"
                    placeholder="커밋 메시지를 입력하세요 [Ctrl+Enter]"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.ctrlKey && e.key === "Enter") handleCommit();
                    }}
                    disabled={isLoading}
                  />
                  <div className="w-48 flex flex-col gap-2">
                    <button
                      onClick={handleCommit}
                      disabled={
                        !commitMessage.trim() ||
                        stagedFiles.length === 0 ||
                        conflictedFiles.length > 0 ||
                        isLoading
                      }
                      className={`flex-1 text-white font-bold rounded flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${isMerging ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"}`}
                    >
                      <VscCheck size={18} />{" "}
                      {isMerging ? "Merge 완료 커밋" : "Commit"}
                    </button>
                    <button
                      onClick={handleCommitAndPush}
                      disabled={
                        !commitMessage.trim() ||
                        stagedFiles.length === 0 ||
                        conflictedFiles.length > 0 ||
                        isLoading
                      }
                      className="h-10 bg-gray-800 hover:bg-black text-white text-xs font-bold rounded transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
