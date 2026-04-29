"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import {
  setActiveBranch,
  closeAllFiles,
  closeFile,
  openCodeMapTab,
  clearVirtualTree,
} from "@/store/slices/fileSystemSlice";
import {
  openProjectModal,
  setDebugMode,
  writeToTerminal,
  setActiveBottomTab,
  triggerEditorCmd,
  toggleTerminal,
  toggleSidebar,
  setCodeMapMode,
  setVoiceConnected,
  // 💡 [NEW] 서버 실행 상태 관리를 위한 임포트
  setRunning,
} from "@/store/slices/uiSlice";
import { DebugSocket } from "@/lib/ide/debugSocket";
import { RunSocket } from "@/lib/ide/runSocket";
import {
  VscSourceControl,
  VscChevronDown,
  VscAdd,
  VscRefresh,
  VscClose,
  VscMail,
  VscCopy,
  VscCheck,
  VscKey,
  VscTrash,
  VscLock,
  VscRocket,
  VscSparkle,
  VscBeaker,
  VscMute,
  VscMicFilled,
  VscCallOutgoing,
  // 💡 [NEW] 실행, 중지 아이콘 추가
  VscPlay,
  VscDebugStop,
} from "react-icons/vsc";
import {
  fetchBranchListApi,
  createBranchApi,
  saveFileApi,
  getWorkspaceMembersApi,
  inviteWorkspaceMemberApi,
  getUserProfileApi,
  deleteBranchApi,
  createSandboxApi,
  applySandboxApi,
} from "@/lib/ide/api";
import { useAuth } from "@/lib/ide/AuthContext";

import VoiceChatManager from "./VoiceChatManager";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE_URL || "ws://localhost:8080";

const getLanguageFromPath = (path) => {
  if (!path) return "UNKNOWN";
  const ext = path.split(".").pop().toLowerCase();
  switch (ext) {
    case "java":
      return "JAVA";
    case "py":
      return "PYTHON";
    case "cpp":
    case "cc":
    case "cxx":
      return "CPP";
    case "c":
      return "C";
    case "cs":
      return "CSHARP";
    case "js":
      return "JAVASCRIPT";
    case "ts":
      return "TYPESCRIPT";
    // 💡 [버그 해결] html과 css 확장자를 HTML 타입으로 매핑합니다!
    case "html":
    case "css":
      return "HTML";
    default:
      return "UNKNOWN";
  }
};

const avatarColors = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-teal-500",
];

const VoiceChatRoom = ({ myUserId, teamMembers, onClose }) => {
  const dispatch = useDispatch();
  const { isVoiceConnected } = useSelector((state) => state.ui);
  const [isMutedLocal, setIsMutedLocal] = useState(false);

  const handleConnectToggle = () =>
    dispatch(setVoiceConnected(!isVoiceConnected));
  const myMember = teamMembers.find(
    (m) => String(m.userId) === String(myUserId),
  );
  const myNickname = myMember ? myMember.nickname : "나";

  return (
    <div className="flex flex-col h-[480px]">
      <div className="px-6 py-4 flex justify-between items-center border-b border-[#1E1F22]/50 bg-[#2B2D31]">
        <div className="flex items-center gap-2">
          <div className="flex relative w-3 h-3">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-50 ${isVoiceConnected ? "bg-emerald-400" : "bg-gray-500"}`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${isVoiceConnected ? "bg-emerald-500" : "bg-gray-500"}`}
            ></span>
          </div>
          <span className="text-xs font-bold text-gray-200">
            {isVoiceConnected ? "음성 서버 연결됨" : "연결이 끊겨있습니다"}
          </span>
        </div>
      </div>
      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar grid grid-cols-3 gap-4 content-start">
        <div className="flex flex-col items-center gap-2">
          <div
            className={`relative w-16 h-16 rounded-full flex items-center justify-center text-xl font-black text-white shadow-lg transition-all duration-200 ${isMutedLocal || !isVoiceConnected ? "bg-gray-600 opacity-60" : "bg-indigo-500"}`}
          >
            {myNickname[0]}
            {(isMutedLocal || !isVoiceConnected) && (
              <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-1 border-2 border-[#2B2D31]">
                <VscMute size={12} className="text-white" />
              </div>
            )}
          </div>
          <span className="text-[12px] font-bold text-gray-300 bg-[#1E1F22] px-2 py-0.5 rounded-md truncate max-w-full">
            {myNickname} (나)
          </span>
        </div>
        {isVoiceConnected &&
          teamMembers
            .filter((m) => String(m.userId) !== String(myUserId))
            .map((member) => (
              <div
                key={member.userId}
                className="flex flex-col items-center gap-2 animate-fade-in"
              >
                <div className="w-16 h-16 bg-gray-500 rounded-full flex items-center justify-center text-xl font-black text-white shadow-lg transition-all duration-200">
                  {member.nickname[0]}
                </div>
                <span className="text-[12px] font-bold text-gray-300 bg-[#1E1F22] px-2 py-0.5 rounded-md truncate max-w-full">
                  {member.nickname}
                </span>
              </div>
            ))}
      </div>
      <div className="bg-[#232428] px-6 py-5 flex justify-center items-center gap-6 rounded-b-2xl">
        <button
          onClick={() => setIsMutedLocal(!isMutedLocal)}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-md active:scale-90 ${isMutedLocal ? "bg-red-500 text-white" : "bg-[#383A40] hover:bg-[#474A52] text-gray-200"}`}
          title={isMutedLocal ? "마이크 켜기" : "마이크 끄기"}
        >
          {isMutedLocal ? <VscMute size={24} /> : <VscMicFilled size={24} />}
        </button>
        <button
          onClick={handleConnectToggle}
          className={`w-14 h-14 rounded-full text-white flex items-center justify-center transition-all shadow-md active:scale-90 ${isVoiceConnected ? "bg-red-500 hover:bg-red-600" : "bg-emerald-500 hover:bg-emerald-600"}`}
          title={isVoiceConnected ? "연결 끊기" : "채널 접속하기"}
        >
          {isVoiceConnected ? (
            <VscCallOutgoing size={24} />
          ) : (
            <VscMicFilled size={24} />
          )}
        </button>
      </div>
    </div>
  );
};

export default function MenuBar({ mode = "personal" }) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  const { user } = useAuth();

  const [myProfile, setMyProfile] = useState(null);

  const {
    workspaceId,
    activeProject,
    activeBranch,
    fileContents,
    activeFileId,
    tree,
  } = useSelector((state) => state.fileSystem);

  // 💡 [NEW] isRunning, isDebugMode 상태 추출 추가
  const {
    isTerminalVisible,
    breakpoints,
    codeMapMode,
    isVoiceConnected,
    isRunning,
    isDebugMode,
  } = useSelector((state) => state.ui);

  const [activeMenu, setActiveMenu] = useState(null);
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isVoiceChatModalOpen, setIsVoiceChatModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [branches, setBranches] = useState([]);
  const [newBranchName, setNewBranchName] = useState("");
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [fullScreenLoading, setFullScreenLoading] = useState({
    isOpen: false,
    text: "",
  });
  const [isSandboxCreateModalOpen, setIsSandboxCreateModalOpen] =
    useState(false);
  const [sandboxTaskName, setSandboxTaskName] = useState("");
  const [isSandboxApplyModalOpen, setIsSandboxApplyModalOpen] = useState(false);
  const [mergeCommitMessage, setMergeCommitMessage] = useState("");

  const menuRef = useRef(null);
  const branchRef = useRef(null);

  const isRelocationPage =
    pathname?.includes("/relocation") || pathname?.includes("/rearrange");
  const currentBranch = activeProject ? activeBranch || "master" : "No Project";
  const isSandboxMode =
    currentBranch.startsWith("focus-") || currentBranch.startsWith("focus/");
  const currentNickname = myProfile?.nickname || user?.nickname || "dev";

  useEffect(() => {
    if (user && user.id) {
      getUserProfileApi(user.id)
        .then(setMyProfile)
        .catch((err) => console.error("프로필 정보 로드 실패", err));
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target))
        setActiveMenu(null);
      if (branchRef.current && !branchRef.current.contains(event.target))
        setIsBranchOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setIsTeamModalOpen(false);
        setIsVoiceChatModalOpen(false);
        setIsInviteModalOpen(false);
        setIsSandboxCreateModalOpen(false);
        setIsSandboxApplyModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    if (workspaceId && activeProject)
      fetchBranchListApi(workspaceId, activeProject)
        .then(setBranches)
        .catch(console.error);
    else setBranches([]);
  }, [workspaceId, activeProject, isBranchOpen, currentBranch]);

  useEffect(() => {
    if (mode === "team" && workspaceId)
      getWorkspaceMembersApi(workspaceId)
        .then(setTeamMembers)
        .catch(console.error);
  }, [mode, workspaceId, isTeamModalOpen]);

  const handleSelectBranch = (branchName) => {
    if (branchName === activeBranch) return;
    dispatch(closeAllFiles());
    dispatch(clearVirtualTree());
    dispatch(setActiveBranch(branchName));
    setIsBranchOpen(false);
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;
    try {
      setIsCreatingBranch(true);
      await createBranchApi(workspaceId, activeProject, newBranchName);
      dispatch(closeAllFiles());
      dispatch(clearVirtualTree());
      dispatch(setActiveBranch(newBranchName));
      setNewBranchName("");
      setIsBranchOpen(false);
    } catch (error) {
      alert(error.message);
    } finally {
      setIsCreatingBranch(false);
    }
  };

  const handleDeleteBranch = async (e, branchName) => {
    e.stopPropagation();
    if (branchName === "master")
      return alert("master 브랜치는 삭제할 수 없습니다.");
    if (!window.confirm(`정말 '${branchName}' 브랜치를 삭제하시겠습니까?`))
      return;
    try {
      await deleteBranchApi(workspaceId, activeProject, branchName);
      setBranches((prev) => prev.filter((b) => b !== branchName));
      if (activeBranch === branchName) {
        dispatch(closeAllFiles());
        dispatch(clearVirtualTree());
        dispatch(setActiveBranch("master"));
        setIsBranchOpen(false);
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const executeCreateSandbox = async () => {
    if (!sandboxTaskName.trim()) return alert("작업명을 입력해주세요.");
    setIsSandboxCreateModalOpen(false);
    setFullScreenLoading({
      isOpen: true,
      text: "격리된 샌드박스 환경을 구축하는 중입니다...",
    });
    try {
      const sandboxBranchName = await createSandboxApi(
        workspaceId,
        activeProject,
        currentNickname,
        sandboxTaskName,
      );
      dispatch(closeAllFiles());
      dispatch(clearVirtualTree());
      dispatch(setActiveBranch(sandboxBranchName));
      setSandboxTaskName("");
    } catch (error) {
      alert(error.message);
    } finally {
      setTimeout(() => setFullScreenLoading({ isOpen: false, text: "" }), 500);
    }
  };

  const executeApplySandbox = async () => {
    if (!mergeCommitMessage.trim())
      return alert("병합 전 남길 커밋 메시지를 입력해주세요!");
    setIsSandboxApplyModalOpen(false);
    setFullScreenLoading({
      isOpen: true,
      text: "작업 내용을 저장하고 메인으로 합치는 중...",
    });
    try {
      if (fileContents && Object.keys(fileContents).length > 0) {
        const savePromises = Object.entries(fileContents).map(
          ([path, content]) =>
            saveFileApi(
              workspaceId,
              activeProject,
              activeBranch,
              path,
              content,
            ),
        );
        await Promise.all(savePromises);
      }
      await applySandboxApi(
        workspaceId,
        activeProject,
        activeBranch,
        mergeCommitMessage,
        currentNickname,
      );
      dispatch(closeAllFiles());
      dispatch(setActiveBranch("master"));
      if (activeFileId)
        alert(
          "🚀 master 브랜치로 병합이 완료되었습니다!\n최신 변경된 코드를 화면에 표시하려면 좌측 탐색기에서 파일을 다시 클릭해 주세요.",
        );
      else alert("🚀 성공적으로 메인(master) 코드에 반영되었습니다!");
      dispatch(clearVirtualTree());
      setMergeCommitMessage("");
    } catch (error) {
      alert(`⚠️ 병합 실패:\n${error.message}`);
    } finally {
      setTimeout(() => setFullScreenLoading({ isOpen: false, text: "" }), 500);
    }
  };

  const handleCopyCode = () => {
    if (!workspaceId) return alert("워크스페이스 ID를 찾을 수 없습니다.");
    navigator.clipboard.writeText(workspaceId);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) return alert("초대할 이메일 주소를 입력해주세요.");
    try {
      setIsInviting(true);
      await inviteWorkspaceMemberApi(workspaceId, inviteEmail);
      alert(`✨ ${inviteEmail} 님에게 초대장을 발송했습니다!`);
      setInviteEmail("");
      setIsInviteModalOpen(false);
    } catch (error) {
      alert(`초대 실패: ${error.message}`);
    } finally {
      setIsInviting(false);
    }
  };

  // 💡 [NEW] 서버 강제 중지 로직
  const handleQuickStop = () => {
    dispatch(setRunning(false));
    dispatch(setDebugMode(false));
    if (DebugSocket && typeof DebugSocket.stopDebug === "function")
      DebugSocket.stopDebug();
    if (RunSocket && typeof RunSocket.stop === "function") RunSocket.stop();
    if (!isTerminalVisible) dispatch(toggleTerminal());
    dispatch(
      writeToTerminal("\r\n[System] 🛑 서버 및 실행을 강제 중지했습니다.\r\n"),
    );
  };

  // 💡 [NEW] 빠른 실행 로직 (기존 메뉴 로직 분리)
  const handleQuickRun = async () => {
    if (!activeFileId || !workspaceId || !activeProject)
      return alert("실행할 파일을 에디터에 열어주세요!");
    if (!isTerminalVisible) dispatch(toggleTerminal());
    dispatch(setActiveBottomTab("output"));

    try {
      const content = fileContents[activeFileId] || "";
      await saveFileApi(
        workspaceId,
        activeProject,
        activeBranch || "master",
        activeFileId,
        content,
      );
      dispatch(
        writeToTerminal(
          `\r\n[System] 코드를 자동 저장했습니다: ${activeFileId}\r\n`,
        ),
      );
    } catch (error) {
      return dispatch(
        writeToTerminal(
          `\r\n[Error] 실행 전 자동 저장에 실패했습니다: ${error.message}\r\n`,
        ),
      );
    }

    const language = getLanguageFromPath(activeFileId);
    let templateType = "CONSOLE";

    if (tree && tree.children) {
      const projectNode = tree.children.find((p) => p.name === activeProject);
      if (projectNode && projectNode.children) {
        const rootFiles = projectNode.children.map((c) => c.name);
        if (rootFiles.includes("build.gradle")) {
          templateType = "SPRING_BOOT";
        } else if (rootFiles.includes("package.json")) {
          templateType = "REACT";
        } else if (
          rootFiles.includes("index.html") &&
          !rootFiles.includes("package.json")
        ) {
          templateType = "VANILLA";
        }
      }
    }

    dispatch(
      writeToTerminal(
        `[System] ${language} 환경에서 [${templateType}] 모드로 실행을 준비합니다...\r\n`,
      ),
    );
    dispatch(setRunning(true)); // 💡 실행 버튼 비활성화 상태로 변경

    const runPayload = {
      type: "RUN",
      workspaceId,
      projectName: activeProject,
      branchName: activeBranch || "master",
      filePath: activeFileId,
      language,
      templateType,
    };

    RunSocket.connectAndRun(
      `${WS_BASE}/ws/run`,
      runPayload,
      (msg) => dispatch(writeToTerminal(msg)),
      () => {
        dispatch(
          writeToTerminal(
            "\r\n[Error] 실행 중 웹소켓 에러가 발생했습니다.\r\n",
          ),
        );
        dispatch(setRunning(false)); // 에러 시 버튼 다시 활성화
      },
      () => {
        dispatch(
          writeToTerminal("\r\n[System] 실행이 완전히 종료되었습니다.\r\n"),
        );
        dispatch(setRunning(false)); // 종료 시 버튼 다시 활성화
      },
    );
  };

  const startDebugSession = async () => {
    if (!activeFileId || !workspaceId || !activeProject)
      return alert("디버깅할 파일을 에디터에 열어주세요!");
    if (!isTerminalVisible) dispatch(toggleTerminal());
    dispatch(setDebugMode(true));
    dispatch(setActiveBottomTab("output"));
    try {
      const content = fileContents[activeFileId] || "";
      await saveFileApi(
        workspaceId,
        activeProject,
        activeBranch || "master",
        activeFileId,
        content,
      );
      dispatch(
        writeToTerminal(
          `\r\n[System] 코드를 자동 저장했습니다: ${activeFileId}\r\n`,
        ),
      );
    } catch (error) {
      return dispatch(
        writeToTerminal(
          `\r\n[Error] 실행 전 자동 저장에 실패했습니다: ${error.message}\r\n`,
        ),
      );
    }
    dispatch(
      writeToTerminal("[System] 백엔드 디버거와 연결을 시도합니다...\n"),
    );
    const currentFileBreakpoints = breakpoints
      .filter((bp) => bp.path === activeFileId)
      .map((bp) => ({ line: bp.line }));
    DebugSocket.connect(
      `${WS_BASE}/ws/debug`,
      () => {
        DebugSocket.startDebug(
          workspaceId,
          activeProject,
          activeBranch || "master",
          activeFileId,
          currentFileBreakpoints,
        );
      },
      (message) => {
        dispatch(writeToTerminal(message));
      },
      () => {
        dispatch(
          writeToTerminal("\r\n[System] 디버깅 세션이 종료되었습니다.\r\n"),
        );
        dispatch(setDebugMode(false));
      },
    );
  };

  const handleMenuItemClick = async (menuName, itemName) => {
    setActiveMenu(null);
    switch (itemName) {
      case "새 파일":
        if (!isTerminalVisible) dispatch(toggleTerminal());
        dispatch(writeToTerminal("[System] 새 파일을 생성합니다.\n"));
        break;
      case "파일 열기...":
      case "폴더 열기...":
      case "탐색기":
        dispatch(toggleSidebar());
        break;
      case "저장":
        if (!activeFileId || !workspaceId || !activeProject)
          return alert("저장할 파일이나 프로젝트가 선택되지 않았습니다.");
        try {
          const content = fileContents[activeFileId] || "";
          await saveFileApi(
            workspaceId,
            activeProject,
            activeBranch || "master",
            activeFileId,
            content,
          );
          if (!isTerminalVisible) dispatch(toggleTerminal());
          dispatch(writeToTerminal(`[System] Saved: ${activeFileId}\n`));
        } catch (error) {
          if (!isTerminalVisible) dispatch(toggleTerminal());
          dispatch(writeToTerminal(`[Error] Save failed: ${error.message}\n`));
        }
        break;

      case "다른 이름으로...":
      case "모두 저장":
      case "내보내기":
      case "검색":
      case "소스 제어":
      case "실행 및 디버그":
      case "확장":
      case "정보":
      case "문서":
      case "키보드 단축키":
      case "Commit & Merge":
      case "Repository Settings":
        if (!isTerminalVisible) dispatch(toggleTerminal());
        dispatch(writeToTerminal(`[System] ${itemName} 기능 준비 중입니다.\n`));
        break;

      case "닫기":
        dispatch(closeFile(activeFileId));
        break;
      case "실행 취소":
        dispatch(triggerEditorCmd("undo"));
        break;
      case "다시 실행":
        dispatch(triggerEditorCmd("redo"));
        break;
      case "잘라내기":
        dispatch(triggerEditorCmd("cut"));
        break;
      case "복사":
        dispatch(triggerEditorCmd("copy"));
        break;
      case "붙여넣기":
        dispatch(triggerEditorCmd("paste"));
        break;
      case "찾기":
        dispatch(triggerEditorCmd("find"));
        break;
      case "바꾸기":
        dispatch(triggerEditorCmd("replace"));
        break;

      case "출력":
        if (!isTerminalVisible) dispatch(toggleTerminal());
        dispatch(setActiveBottomTab("output"));
        break;
      case "디버그 콘솔":
      case "터미널":
      case "새 터미널":
      case "터미널 분할":
        if (!isTerminalVisible) dispatch(toggleTerminal());
        dispatch(setActiveBottomTab("terminal"));
        dispatch(writeToTerminal(`[System] ${itemName} 세션을 엽니다.\n$ `));
        break;

      case "확대":
        dispatch(triggerEditorCmd("zoom_in"));
        break;
      case "축소":
        dispatch(triggerEditorCmd("zoom_out"));
        break;

      case "정의로 이동":
        dispatch(triggerEditorCmd("go_to_definition"));
        break;
      case "참조로 이동":
        if (!isTerminalVisible) dispatch(toggleTerminal());
        dispatch(writeToTerminal("[System] 참조로 이동 기능 준비 중입니다.\n"));
        break;
      case "줄로 이동...":
        dispatch(triggerEditorCmd("go_to_line"));
        break;

      case "디버깅 시작":
        await startDebugSession();
        break;

      // 💡 [NEW] 메뉴 클릭 시에도 빠른 실행/중지 함수를 재활용
      case "디버깅 없이 실행":
        await handleQuickRun();
        break;
      case "디버깅 중지":
        handleQuickStop();
        break;

      case "한 단계씩 코드 실행":
        if (DebugSocket && typeof DebugSocket.stepOver === "function")
          DebugSocket.stepOver();
        break;
      case "프로시저 단위 실행":
        if (DebugSocket && typeof DebugSocket.stepInto === "function")
          DebugSocket.stepInto();
        break;
      case "중단점 설정/해제":
        dispatch(triggerEditorCmd("toggle_breakpoint"));
        break;

      case "프로젝트 빌드":
      case "다시 빌드":
        if (!workspaceId || !activeProject)
          return alert("빌드할 프로젝트를 탐색기에서 선택해주세요!");
        if (!isTerminalVisible) dispatch(toggleTerminal());
        dispatch(setActiveBottomTab("output"));
        dispatch(
          writeToTerminal(
            `\r\n[System] 🔨 ${activeProject} 프로젝트 빌드를 시작합니다...\r\n`,
          ),
        );
        fetch(`${BASE_URL}/api/workspaces/build`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId,
            projectName: activeProject,
            branchName: activeBranch || "master",
          }),
        })
          .then(async (res) => {
            if (!res.ok)
              throw new Error(
                (await res.text()) || "서버에서 빌드 중 에러가 발생했습니다.",
              );
            let defaultExtension =
              getLanguageFromPath(activeFileId) === "JAVA"
                ? ".jar"
                : getLanguageFromPath(activeFileId) === "C" ||
                    getLanguageFromPath(activeFileId) === "CPP"
                  ? ".exe"
                  : "";
            let filename = `${activeProject}_build_result${defaultExtension}`;
            const disposition = res.headers.get("Content-Disposition");
            if (disposition && disposition.includes("filename=")) {
              const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(
                disposition,
              );
              if (matches != null && matches[1]) {
                filename = matches[1].replace(/['"]/g, "");
                try {
                  filename = decodeURIComponent(filename);
                } catch {}
              }
            }
            return { blob: await res.blob(), filename };
          })
          .then(({ blob, filename }) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            dispatch(
              writeToTerminal(
                `[System] ✅ 빌드 성공! 파일(${filename})이 정상적으로 다운로드되었습니다.\r\n`,
              ),
            );
          })
          .catch((err) =>
            dispatch(
              writeToTerminal(`[Error] ❌ 빌드 실패: ${err.message}\r\n`),
            ),
          );
        break;

      case "빌드 취소":
        if (!isTerminalVisible) dispatch(toggleTerminal());
        dispatch(writeToTerminal("[System] 빌드를 취소했습니다.\n"));
        break;
      case "전체 화면":
        dispatch(setCodeMapMode("full"));
        dispatch(openCodeMapTab());
        break;
      case "분할 화면":
        dispatch(setCodeMapMode("split"));
        dispatch(openCodeMapTab());
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleMenuItemClick(null, "저장");
      } else if (e.ctrlKey && e.shiftKey && (e.key === "`" || e.key === "~")) {
        e.preventDefault();
        handleMenuItemClick(null, "새 터미널");
      } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        handleMenuItemClick(null, "탐색기");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeFileId,
    workspaceId,
    activeProject,
    activeBranch,
    fileContents,
    isTerminalVisible,
    codeMapMode,
  ]);

  const subMenus = [
    {
      name: "파일",
      items: [
        { label: "새 파일", shortcut: "Ctrl+N" },
        { label: "파일 열기...", shortcut: "Ctrl+O" },
        { label: "폴더 열기...", shortcut: "Ctrl+Shift+O" },
        { label: "저장", shortcut: "Ctrl+S" },
        { label: "다른 이름으로...", shortcut: "Ctrl+Shift+S" },
        { label: "모두 저장", shortcut: "Ctrl+K S" },
        { label: "내보내기" },
        { label: "닫기", shortcut: "Ctrl+W" },
      ],
    },
    {
      name: "편집",
      items: [
        { label: "실행 취소", shortcut: "Ctrl+Z" },
        { label: "다시 실행", shortcut: "Ctrl+Y" },
        { label: "잘라내기", shortcut: "Ctrl+X" },
        { label: "복사", shortcut: "Ctrl+C" },
        { label: "붙여넣기", shortcut: "Ctrl+V" },
        { label: "찾기", shortcut: "Ctrl+F" },
        { label: "바꾸기", shortcut: "Ctrl+H" },
      ],
    },
    {
      name: "보기",
      items: [
        { label: "탐색기", shortcut: "Ctrl+Shift+E" },
        { label: "검색", shortcut: "Ctrl+Shift+F" },
        { label: "소스 제어", shortcut: "Ctrl+Shift+G" },
        { label: "실행 및 디버그", shortcut: "Ctrl+Shift+D" },
        { label: "확장", shortcut: "Ctrl+Shift+X" },
        { label: "출력", shortcut: "Ctrl+Shift+U" },
        { label: "디버그 콘솔", shortcut: "Ctrl+Shift+Y" },
        { label: "터미널", shortcut: "Ctrl+`" },
        { label: "확대", shortcut: "Ctrl+=" },
        { label: "축소", shortcut: "Ctrl+-" },
      ],
    },
    {
      name: "이동",
      items: [
        { label: "정의로 이동", shortcut: "F12" },
        { label: "참조로 이동", shortcut: "Shift+F12" },
        { label: "줄로 이동...", shortcut: "Ctrl+G" },
      ],
    },
    {
      name: "디버그",
      items: [
        { label: "디버깅 시작", shortcut: "F5" },
        { label: "디버깅 없이 실행", shortcut: "Ctrl+F5" },
        { label: "디버깅 중지", shortcut: "Shift+F5" },
        { label: "중단점 설정/해제", shortcut: "F9" },
        { label: "한 단계씩 코드 실행", shortcut: "F10" },
        { label: "프로시저 단위 실행", shortcut: "F11" },
      ],
    },
    {
      name: "빌드",
      items: [
        { label: "프로젝트 빌드", shortcut: "Ctrl+Shift+B" },
        { label: "다시 빌드" },
        { label: "빌드 취소" },
      ],
    },
    {
      name: "터미널",
      items: [
        { label: "새 터미널", shortcut: "Ctrl+Shift+`" },
        { label: "터미널 분할", shortcut: "Ctrl+Shift+5" },
      ],
    },
    {
      name: "도움말",
      items: [
        { label: "정보" },
        { label: "문서" },
        { label: "키보드 단축키", shortcut: "Ctrl+K Ctrl+S" },
      ],
    },
    { name: "코드맵", items: [{ label: "전체 화면" }, { label: "분할 화면" }] },
    {
      name: "Git",
      items: [{ label: "Commit & Merge" }, { label: "Repository Settings" }],
    },
  ];

  const visibleBranches = branches.filter((branch) => {
    if (branch.startsWith("focus-") || branch.startsWith("focus/"))
      return (
        branch.startsWith(`focus-${currentNickname}-`) ||
        branch.startsWith(`focus/${currentNickname}/`)
      );
    return true;
  });

  return (
    <>
      <VoiceChatManager />

      <div>
        {!isRelocationPage && (
          <div
            className={`flex items-center justify-between px-4 h-9 border-t relative transition-colors duration-700 ${isSandboxMode ? "bg-slate-900 border-indigo-900/50" : "bg-[#f8f9fa] border-gray-100"}`}
            ref={menuRef}
          >
            <div
              className={`flex items-center gap-1 text-[13px] ${isSandboxMode ? "text-indigo-200" : "text-gray-700"}`}
            >
              {subMenus.map((menu) => (
                <div key={menu.name} className="relative">
                  <div
                    className={`cursor-pointer px-3 py-1 rounded transition-colors ${activeMenu === menu.name ? (isSandboxMode ? "bg-indigo-800 text-white font-medium" : "bg-gray-200 font-medium") : isSandboxMode ? "hover:bg-indigo-800/50" : "hover:bg-gray-200"}`}
                    onClick={() =>
                      setActiveMenu(activeMenu === menu.name ? null : menu.name)
                    }
                  >
                    {menu.name}
                  </div>
                  {activeMenu === menu.name && (
                    <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-gray-200 shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-md py-1.5 z-[9999] animate-fade-in-up">
                      {menu.items.map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() =>
                            handleMenuItemClick(menu.name, item.label)
                          }
                          className="px-5 py-1.5 hover:bg-blue-50 hover:text-blue-600 cursor-pointer text-[13px] text-gray-700 transition-colors flex justify-between items-center"
                        >
                          <span>{item.label}</span>
                          {item.shortcut && (
                            <span className="text-[11px] text-gray-400">
                              {item.shortcut}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {mode === "team" && (
                <div
                  className={`flex items-center gap-1.5 ml-3 border-l pl-3 animate-fade-in ${isSandboxMode ? "border-indigo-700/50" : "border-gray-300"}`}
                >
                  <div
                    onClick={() => setIsTeamModalOpen(true)}
                    className={`cursor-pointer px-3 py-1 rounded-md font-extrabold flex items-center gap-1.5 transition-all border active:scale-95 ${isSandboxMode ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/40" : "text-blue-600 bg-blue-50/80 hover:bg-blue-100 border-blue-100"}`}
                  >
                    TEAM
                  </div>
                  <div
                    onClick={() => setIsVoiceChatModalOpen(true)}
                    className={`cursor-pointer px-3 py-1 rounded-md font-extrabold flex items-center gap-1.5 transition-all border active:scale-95 ${isSandboxMode ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/40" : "text-green-600 bg-green-50/80 hover:bg-green-100 border-green-100"}`}
                  >
                    <span className="relative flex h-2 w-2">
                      <span
                        className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isVoiceConnected ? "bg-emerald-400" : "bg-gray-500"}`}
                      ></span>
                      <span
                        className={`relative inline-flex rounded-full h-2 w-2 ${isVoiceConnected ? "bg-emerald-500" : "bg-gray-500"}`}
                      ></span>
                    </span>
                    VoiceChat
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* 💡 [NEW] 빠른 실행 및 중지 버튼 UI 장착 완료! */}
              <div className="flex items-center bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden h-7 mr-1">
                <button
                  onClick={handleQuickRun}
                  disabled={isRunning || isDebugMode}
                  className={`flex items-center gap-1.5 px-3 h-full text-[11px] font-extrabold transition-all
                    ${isRunning || isDebugMode ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "text-green-600 hover:bg-green-50 active:bg-green-100"}`}
                  title="빠른 실행 (디버깅 없이)"
                >
                  <VscPlay size={14} /> Run
                </button>
                <div className="w-[1px] h-full bg-gray-200"></div>
                <button
                  onClick={handleQuickStop}
                  disabled={!isRunning && !isDebugMode}
                  className={`flex items-center gap-1 px-2.5 h-full text-[11px] font-extrabold transition-all
                    ${!isRunning && !isDebugMode ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "text-red-500 hover:bg-red-50 active:bg-red-100"}`}
                  title="실행 강제 중지"
                >
                  <VscDebugStop size={14} />
                </button>
              </div>

              <button
                onClick={() => dispatch(openProjectModal())}
                className={`flex items-center gap-1 text-[12px] font-bold px-2.5 py-1 rounded transition-colors ${isSandboxMode ? "bg-indigo-600 text-white hover:bg-indigo-500" : "bg-[#333] text-white hover:bg-black"}`}
              >
                <VscAdd size={14} /> 새 프로젝트
              </button>

              <div
                className={`w-[1px] h-4 mx-1 ${isSandboxMode ? "bg-indigo-800" : "bg-gray-300"}`}
              ></div>

              <div className="flex items-center gap-1.5 mr-2">
                {mode === "team" &&
                  activeProject &&
                  currentBranch === "master" && (
                    <button
                      onClick={() => setIsSandboxCreateModalOpen(true)}
                      className="group flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-purple-100 to-indigo-50 text-indigo-700 hover:from-purple-200 hover:to-indigo-100 border border-indigo-200 rounded text-[11px] font-extrabold transition-all shadow-sm active:scale-95"
                    >
                      <VscLock
                        className="group-hover:scale-110 transition-transform"
                        size={14}
                      />{" "}
                      샌드박스 (혼자 작업)
                    </button>
                  )}
                {mode === "team" && activeProject && isSandboxMode && (
                  <button
                    onClick={() => setIsSandboxApplyModalOpen(true)}
                    className="group flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-400 text-white hover:from-emerald-400 hover:to-teal-300 border border-emerald-400/50 rounded text-[11px] font-extrabold transition-all shadow-[0_0_10px_rgba(16,185,129,0.4)] hover:shadow-[0_0_15px_rgba(16,185,129,0.6)] animate-pulse hover:animate-none active:scale-95"
                  >
                    <VscRocket
                      className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform"
                      size={14}
                    />{" "}
                    메인으로 합치기
                  </button>
                )}
              </div>

              <div className="relative" ref={branchRef}>
                <div
                  className={`flex items-center gap-1.5 text-[11px] font-mono border px-3 py-0.5 rounded cursor-pointer transition-all duration-300 shadow-sm ${isSandboxMode ? "bg-indigo-900/50 border-indigo-500 text-indigo-300 hover:bg-indigo-800" : isBranchOpen ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                  onClick={() => {
                    if (!activeProject)
                      return alert(
                        "좌측 탐색기에서 시작 프로젝트를 먼저 설정해주세요!",
                      );
                    setIsBranchOpen(!isBranchOpen);
                  }}
                >
                  <VscSourceControl
                    size={13}
                    className={
                      isSandboxMode ? "text-indigo-400" : "text-blue-600"
                    }
                  />
                  <span className="font-semibold tracking-wide">
                    {currentBranch}
                  </span>
                  <VscChevronDown
                    size={12}
                    className={`transition-transform duration-300 ${isBranchOpen ? "rotate-180" : ""} ${isSandboxMode ? "text-indigo-500" : "text-gray-400"}`}
                  />
                </div>
                {isBranchOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] rounded-xl py-2 z-[9999] animate-fade-in-up origin-top-right">
                    <div className="px-4 pb-3 border-b border-gray-100 mb-2 bg-gradient-to-r from-gray-50 to-white">
                      <p className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                        <VscSourceControl /> Git Repository
                      </p>
                      <p className="text-[10px] text-gray-500 truncate mt-0.5 font-medium">
                        {activeProject}
                      </p>
                    </div>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar px-2 space-y-1">
                      {visibleBranches.map((branch) => {
                        const isActive = branch === currentBranch;
                        const isFocus =
                          branch.startsWith("focus-") ||
                          branch.startsWith("focus/");
                        return (
                          <div
                            key={branch}
                            onClick={() => handleSelectBranch(branch)}
                            className={`flex items-center justify-between px-3 py-2.5 cursor-pointer text-xs group transition-all rounded-lg ${isActive ? (isFocus ? "bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 text-indigo-700 font-bold shadow-sm" : "bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 text-blue-700 font-bold shadow-sm") : isFocus ? "bg-indigo-50/30 text-indigo-600 hover:bg-indigo-50" : "text-gray-600 hover:bg-gray-50 border border-transparent"}`}
                          >
                            <div className="flex items-center gap-2">
                              {isFocus ? (
                                <VscLock
                                  className={
                                    isActive
                                      ? "text-indigo-500"
                                      : "text-indigo-400"
                                  }
                                />
                              ) : (
                                <VscSourceControl
                                  className={
                                    isActive ? "text-blue-500" : "text-gray-400"
                                  }
                                />
                              )}
                              <span>{branch}</span>
                              {isFocus && !isActive && (
                                <span className="text-[9px] font-bold bg-indigo-100 text-indigo-500 px-1 rounded">
                                  Sandbox
                                </span>
                              )}
                              {isActive && (
                                <span className="relative flex h-2 w-2 ml-1">
                                  <span
                                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isFocus ? "bg-indigo-400" : "bg-blue-400"}`}
                                  ></span>
                                  <span
                                    className={`relative inline-flex rounded-full h-2 w-2 ${isFocus ? "bg-indigo-500" : "bg-blue-500"}`}
                                  ></span>
                                </span>
                              )}
                            </div>
                            {branch !== "master" && (
                              <button
                                onClick={(e) => handleDeleteBranch(e, branch)}
                                className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-all opacity-0 group-hover:opacity-100"
                                title="브랜치 삭제"
                              >
                                <VscTrash size={14} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="px-4 pt-3 border-t border-gray-100 mt-2 bg-gray-50/50 rounded-b-xl pb-1">
                      <p className="text-[10px] font-black text-gray-500 mb-1.5 uppercase tracking-wider">
                        Create Branch
                      </p>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          placeholder="새 브랜치 이름"
                          value={newBranchName}
                          onChange={(e) => setNewBranchName(e.target.value)}
                          className="flex-1 text-xs border border-gray-300 rounded-md px-2.5 py-1.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
                        />
                        <button
                          onClick={handleCreateBranch}
                          disabled={isCreatingBranch || !newBranchName.trim()}
                          className="bg-gray-800 text-white p-1.5 rounded-md hover:bg-black transition-all disabled:opacity-50 active:scale-95"
                        >
                          {isCreatingBranch ? (
                            <VscRefresh className="animate-spin" size={14} />
                          ) : (
                            <VscAdd size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {mode === "team" && (
                <div className="relative group flex items-center cursor-help ml-2 mr-1">
                  <div className="flex -space-x-1.5">
                    {teamMembers.slice(0, 3).map((member, idx) => (
                      <div
                        key={member.userId}
                        className={`w-7 h-7 rounded-full ${avatarColors[idx % avatarColors.length]} border-2 border-white flex items-center justify-center text-[10px] text-white font-bold shadow-sm relative`}
                      >
                        {member.nickname?.[0]}
                        <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border-2 border-white rounded-full"></div>
                      </div>
                    ))}
                    {teamMembers.length > 3 && (
                      <div className="w-7 h-7 rounded-full bg-gray-500 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold shadow-sm">
                        +{teamMembers.length - 3}
                      </div>
                    )}
                  </div>
                  <div className="absolute top-full right-0 mt-2 w-52 bg-white border border-gray-200 shadow-xl rounded-xl p-3 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-[9999]">
                    <p className="text-xs font-black text-gray-800 mb-3 border-b border-gray-100 pb-2">
                      팀원 ({teamMembers.length})
                    </p>
                    <div className="space-y-2">
                      {teamMembers.map((member) => (
                        <div
                          key={member.userId}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-[12px] font-bold text-gray-800 truncate max-w-[80px]">
                              {member.nickname}
                            </span>
                          </div>
                          {user?.id === member.userId && (
                            <span className="text-[10px] text-blue-500 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                              Me
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <span
                className={`text-[11px] font-black px-3 py-0.5 rounded-full 
                shadow-sm select-none tracking-wider
                 border ${isSandboxMode ? "bg-indigo-600 text-white border-indigo-700" : mode === "team" ? "bg-green-600 text-white border-green-700" : "bg-blue-600 text-white border-blue-700"}`}
              >
                {isSandboxMode ? "SANDBOX" : mode === "team" ? "TEAM" : "SOLO"}
              </span>
            </div>
          </div>
        )}
      </div>

      {fullScreenLoading.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[10000] flex flex-col items-center justify-center animate-fade-in">
          <div className="bg-white/10 p-6 rounded-3xl backdrop-blur-md border border-white/20 shadow-2xl flex flex-col items-center justify-center animate-pulse">
            <VscBeaker
              className="text-indigo-400 mb-4 animate-bounce"
              size={48}
            />
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              {fullScreenLoading.text}
            </h2>
            <div className="w-48 h-1 bg-indigo-900/50 rounded-full mt-5 overflow-hidden">
              <div className="w-1/2 h-full bg-indigo-400 rounded-full animate-[ping_1.5s_ease-in-out_infinite]"></div>
            </div>
          </div>
        </div>
      )}

      {isSandboxCreateModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center animate-fade-in"
          onClick={() => setIsSandboxCreateModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-[440px] overflow-hidden flex flex-col animate-slide-up ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 border-b border-indigo-100 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="bg-indigo-100 p-1.5 rounded-lg">
                    <VscLock className="text-indigo-600" size={20} />
                  </div>
                  <h2 className="text-xl font-black text-indigo-900 tracking-tight">
                    나만의 집중 공간 만들기
                  </h2>
                </div>
                <p className="text-[13px] text-indigo-700/80 font-medium">
                  다른 팀원에게 영향을 주지 않고 코드를 테스트해보세요.
                </p>
              </div>
              <button
                onClick={() => setIsSandboxCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-800 bg-white/50 hover:bg-white p-1.5 rounded-full transition-colors"
              >
                <VscClose size={20} />
              </button>
            </div>
            <div className="p-6 bg-white space-y-5">
              <div className="space-y-2">
                <label className="text-[13px] font-extrabold text-gray-800">
                  어떤 작업을 진행하시나요?
                </label>
                <input
                  type="text"
                  value={sandboxTaskName}
                  onChange={(e) => setSandboxTaskName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && executeCreateSandbox()}
                  placeholder="예) 로그인 에러 수정, 헤더 UI 변경"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-[14px] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all font-medium"
                  autoFocus
                />
              </div>
              <button
                onClick={executeCreateSandbox}
                disabled={!sandboxTaskName.trim()}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl text-[14px] font-bold shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
              >
                공간 생성 및 이동하기
              </button>
            </div>
          </div>
        </div>
      )}

      {isSandboxApplyModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center animate-fade-in"
          onClick={() => setIsSandboxApplyModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] w-[460px] overflow-hidden flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 pb-6 text-center flex flex-col items-center border-b border-gray-100">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-5 border-4 border-white shadow-md relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-50"></span>
                <VscRocket className="text-emerald-600" size={32} />
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-2 tracking-tight">
                메인 코드로 병합 (Merge)
              </h2>
              <p className="text-[13px] text-gray-500 font-medium leading-relaxed">
                작업하신 내용을 안전하게 저장하고{" "}
                <strong className="text-emerald-600 font-black">master</strong>{" "}
                브랜치에 합칩니다.
              </p>
            </div>
            <div className="p-6 bg-gray-50 space-y-3">
              <label className="text-[12px] font-bold text-gray-700 flex items-center gap-1.5">
                <VscSourceControl /> 병합 커밋 메시지 작성
              </label>
              <input
                type="text"
                value={mergeCommitMessage}
                onChange={(e) => setMergeCommitMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && executeApplySandbox()}
                placeholder="예) 로그인 화면 레이아웃 수정 완료"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-[13px] outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all font-medium bg-white"
                autoFocus
              />
            </div>
            <div className="flex border-t border-gray-100 p-4 gap-3 bg-white">
              <button
                onClick={() => setIsSandboxApplyModalOpen(false)}
                className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95 rounded-xl text-[13px] font-bold transition-all shadow-sm"
              >
                취소
              </button>
              <button
                onClick={executeApplySandbox}
                disabled={!mergeCommitMessage.trim()}
                className="flex-[2] py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white rounded-xl text-[13px] font-bold shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100"
              >
                <VscCheck size={16} strokeWidth={1} /> 커밋 및 병합하기
              </button>
            </div>
          </div>
        </div>
      )}

      {isTeamModalOpen && mode === "team" && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998] flex items-center justify-center animate-fade-in"
          onClick={() => setIsTeamModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-[400px] overflow-hidden flex flex-col animate-slide-up ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
              <h2 className="text-lg font-black text-gray-900">
                팀원 관리{" "}
                <span className="text-blue-500 ml-1">{teamMembers.length}</span>
              </h2>
              <button
                onClick={() => setIsTeamModalOpen(false)}
                className="text-gray-400 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
              >
                <VscClose size={20} />
              </button>
            </div>
            <div className="p-4 space-y-2 max-h-[350px] overflow-y-auto bg-gray-50/50 custom-scrollbar">
              {teamMembers.map((member, idx) => {
                const isMe = user?.id === member.userId;
                return (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md hover:ring-2 hover:ring-blue-50 transition-all group cursor-default"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="relative">
                        <div
                          className={`w-10 h-10 rounded-full ${avatarColors[idx % avatarColors.length]} text-white flex items-center justify-center font-bold text-[14px] shadow-sm`}
                        >
                          {member.nickname?.[0]}
                        </div>
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-[13px] text-gray-900">
                            {member.nickname}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${member.role === "OWNER" ? "bg-blue-100 text-blue-700" : member.role === "ADMIN" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"}`}
                          >
                            {member.role === "OWNER"
                              ? "Owner"
                              : member.role === "ADMIN"
                                ? "Admin"
                                : "Member"}{" "}
                            {isMe && "(나)"}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-500 mt-0.5">
                          {member.email}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-gray-100 bg-white">
              <button
                onClick={() => {
                  setIsInviteModalOpen(true);
                  setIsTeamModalOpen(false);
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-200 transition-all"
              >
                <VscAdd size={16} strokeWidth={1} /> 새로운 팀원 초대하기
              </button>
            </div>
          </div>
        </div>
      )}

      {isInviteModalOpen && mode === "team" && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center animate-fade-in"
          onClick={() => setIsInviteModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-[420px] overflow-hidden flex flex-col animate-slide-up ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white">
              <div>
                <h2 className="text-lg font-black text-gray-900">팀원 초대</h2>
                <p className="text-xs text-gray-500 mt-1">
                  이메일 발송 또는 프로젝트 코드로 초대하세요
                </p>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-gray-400 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
              >
                <VscClose size={20} />
              </button>
            </div>
            <div className="p-6 space-y-7 bg-gray-50/50">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-extrabold text-gray-800 flex items-center gap-1.5">
                    <VscMail className="text-blue-500" /> 이메일로 초대장 발송
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSendInvite();
                      }}
                      placeholder="teammate@example.com"
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 bg-white transition-all shadow-sm"
                    />
                    <button
                      onClick={handleSendInvite}
                      disabled={isInviting || !inviteEmail.trim()}
                      className="px-5 bg-[#2d333b] hover:bg-black text-white rounded-xl text-[13px] font-bold transition-all shadow-sm disabled:opacity-50 flex items-center justify-center shrink-0"
                    >
                      {isInviting ? (
                        <VscRefresh className="animate-spin" size={16} />
                      ) : (
                        "발송"
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-px bg-gray-200 flex-1"></div>
                <span className="text-[11px] font-bold text-gray-400">
                  또는
                </span>
                <div className="h-px bg-gray-200 flex-1"></div>
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-extrabold text-gray-800 flex items-center gap-1.5">
                  <VscKey className="text-green-500" /> 프로젝트 코드 공유
                </label>
                <p className="text-[11px] text-gray-500">
                  새로운 팀원이 대시보드에서 이 코드를 입력하여 참여할 수
                  있습니다.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-3 text-[13px] text-gray-700 truncate font-mono shadow-sm select-all font-bold tracking-wider text-center">
                    {workspaceId || "PROJ-XXXX-YYYY"}
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className={`px-5 py-3 rounded-xl flex items-center gap-1.5 text-[12px] font-bold shrink-0 transition-all shadow-sm ${isCopied ? "bg-green-500 text-white border-transparent" : "bg-white border border-gray-300 text-gray-800 hover:bg-gray-50 active:scale-95"}`}
                  >
                    {isCopied ? (
                      <>
                        <VscCheck size={14} /> 복사됨
                      </>
                    ) : (
                      <>
                        <VscCopy size={14} /> 복사
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isVoiceChatModalOpen && mode === "team" && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center animate-fade-in"
          onClick={() => setIsVoiceChatModalOpen(false)}
        >
          <div
            className="bg-[#2B2D31] rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] w-[600px] overflow-hidden flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <VoiceChatRoom
              workspaceId={workspaceId}
              myUserId={user?.id}
              teamMembers={teamMembers}
              onClose={() => setIsVoiceChatModalOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
