"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { closeFile, openCodeMapTab, setWorkspaceTree } from "@/store/slices/fileSystemSlice";
import {
  openProjectModal,
  setDebugMode,
  writeToTerminal,
  setActiveBottomTab,
  triggerEditorCmd,
  toggleTerminal,
  toggleSidebar,
  toggleRightPanel,
  setCodeMapMode,
  setRunning,
  setCurrentDebugLine,
  updateDebugVariables,
  setActiveActivity,
} from "@/store/slices/uiSlice";
import { DebugSocket } from "@/lib/ide/debugSocket";
import { RunSocket } from "@/lib/ide/runSocket";
import {
  VscAdd,
  VscRefresh,
  VscClose,
  VscMail,
  VscCopy,
  VscCheck,
  VscKey,
  VscPlay,
  VscDebugStop,
} from "react-icons/vsc";
import {
  saveFileApi,
  getWorkspaceMembersApi,
  inviteWorkspaceMemberApi,
  getUserProfileApi,
  fetchProjectFilesApi,
} from "@/lib/ide/api";
import { useAuth } from "@/contexts/AuthContext";
import VoiceChatManager from "@/components/ide/voice/VoiceChatManager";
import { useWorkspacePresence } from "@/hooks/useWorkspacePresence";
import GitBranchControls from "@/components/ide/git/GitBranchControls";
import { useGitRemoteActions } from "@/hooks/ide/useGitRemoteActions";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE_URL || "ws://localhost:8080";

const getLanguageFromPath = (path) => {
  if (!path) return "UNKNOWN";
  const ext = path.split(".").pop().toLowerCase();
  switch (ext) {
    case "java": return "JAVA";
    case "py": return "PYTHON";
    case "cpp": case "cc": case "cxx": return "CPP";
    case "c": return "C";
    case "cs": return "CSHARP";
    case "js": return "JAVASCRIPT";
   case "ts":
case "tsx":
  return "TYPESCRIPT";
case "jsx":
  return "JAVASCRIPT";
    case "html": case "css": return "HTML";
    default: return "UNKNOWN";
  }
};

const avatarColors = [
  "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-teal-500",
];

export default function MenuBar({ mode = "personal" }) {
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

  const {
    isTerminalVisible,
    breakpoints,
    codeMapMode,
    isVoiceConnected,
    isRunning,
    isDebugMode,
  } = useSelector((state) => state.ui);

  const [activeMenu, setActiveMenu] = useState(null);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isVoiceChatModalOpen, setIsVoiceChatModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);

  const menuRef = useRef(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const isRelocationPage = pathname?.includes("/relocation") || pathname?.includes("/rearrange");
  const currentNickname = myProfile?.nickname || user?.nickname || "dev";
  const { pullFromRemote, pushToRemote } = useGitRemoteActions();

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
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);


  useEffect(() => {
    if (mode === "team" && workspaceId)
      getWorkspaceMembersApi(workspaceId)
        .then(setTeamMembers)
        .catch(console.error);
  }, [mode, workspaceId, isTeamModalOpen]);


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
      await inviteWorkspaceMemberApi({ workspaceId, email: inviteEmail });
      alert(`✨ ${inviteEmail} 님에게 초대장을 발송했습니다!`);
      setInviteEmail("");
      setIsInviteModalOpen(false);
    } catch (error) {
      alert(`초대 실패: ${error.message}`);
    } finally {
      setIsInviting(false);
    }
  };

  const handleQuickStop = () => {
    dispatch(setRunning(false));
    dispatch(setDebugMode(false));
    if (DebugSocket && typeof DebugSocket.stopDebug === "function") DebugSocket.stopDebug();
    if (RunSocket && typeof RunSocket.stop === "function") RunSocket.stop();
    if (!isTerminalVisible) dispatch(toggleTerminal());
    dispatch(writeToTerminal("\r\n[System] 🛑 서버 및 실행을 강제 중지했습니다.\r\n"));
  };

  const handleQuickRun = async () => {
    if (!activeFileId || !workspaceId || !activeProject) return alert("실행할 파일을 에디터에 열어주세요!");
    if (!isTerminalVisible) dispatch(toggleTerminal());
    dispatch(setActiveBottomTab("output"));

    try {
      const content = fileContents[activeFileId] || "";
      await saveFileApi(workspaceId, activeProject, activeBranch || "master", activeFileId, content);
      dispatch(writeToTerminal(`\r\n[System] 코드를 자동 저장했습니다: ${activeFileId}\r\n`));
    } catch (error) {
      return dispatch(writeToTerminal(`\r\n[Error] 실행 전 자동 저장에 실패했습니다: ${error.message}\r\n`));
    }

    const language = getLanguageFromPath(activeFileId);
    let templateType = "CONSOLE";

if (tree && tree.children) {
  const projectNode = tree.children.find((p) => p.name === activeProject);

  if (projectNode && projectNode.children) {
    const rootFiles = projectNode.children.map((c) => c.name);

    const hasNextConfig =
      rootFiles.includes("next.config.js") ||
      rootFiles.includes("next.config.mjs") ||
      rootFiles.includes("next.config.ts");

    const hasNextAppDir = rootFiles.includes("app");
    const hasPackageJson = rootFiles.includes("package.json");
    const hasBuildGradle = rootFiles.includes("build.gradle");
    const hasIndexHtml = rootFiles.includes("index.html");

    if (hasBuildGradle) {
      templateType = "SPRING_BOOT";
    } else if (hasPackageJson && (hasNextConfig || hasNextAppDir)) {
      templateType = "NEXT";
    } else if (hasPackageJson) {
      templateType = "REACT";
    } else if (hasIndexHtml) {
      templateType = "VANILLA";
    }
  }
}

    dispatch(writeToTerminal(`[System] ${language} 환경에서 [${templateType}] 모드로 실행을 준비합니다...\r\n`));
    dispatch(setRunning(true));

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
        dispatch(writeToTerminal("\r\n[Error] 실행 중 웹소켓 에러가 발생했습니다.\r\n"));
        dispatch(setRunning(false));
      },
      () => {
        dispatch(writeToTerminal("\r\n[System] 실행이 완전히 종료되었습니다.\r\n"));
        dispatch(setRunning(false));
      }
    );
  };

  const startDebugSession = async () => {
    if (!activeFileId || !workspaceId || !activeProject) return alert("디버깅할 파일을 에디터에 열어주세요!");
    if (!isTerminalVisible) dispatch(toggleTerminal());
    dispatch(setDebugMode(true));
    dispatch(setActiveBottomTab("output"));
    try {
      const content = fileContents[activeFileId] || "";
      await saveFileApi(workspaceId, activeProject, activeBranch || "master", activeFileId, content);
      dispatch(writeToTerminal(`\r\n[System] 코드를 자동 저장했습니다: ${activeFileId}\r\n`));
    } catch (error) {
      return dispatch(writeToTerminal(`\r\n[Error] 실행 전 자동 저장에 실패했습니다: ${error.message}\r\n`));
    }
    dispatch(writeToTerminal("[System] 백엔드 디버거와 연결을 시도합니다...\n"));
    const currentFileBreakpoints = breakpoints.filter((bp) => bp.path === activeFileId).map((bp) => ({ line: bp.line }));

    DebugSocket.connect(
      `${WS_BASE}/ws/debug`,
      () => {
        DebugSocket.startDebug(workspaceId, activeProject, activeBranch || "master", activeFileId, currentFileBreakpoints);
      },
      (msg) => {
        try {
          const data = JSON.parse(msg);
          if (data.type === "SUSPENDED") {
            dispatch(setCurrentDebugLine({ line: data.line, path: data.path }));
            dispatch(updateDebugVariables(data.variables || {}));
          } else if (data.type === "OUTPUT" || data.type === "ERROR") {
            dispatch(writeToTerminal((data.data || "") + "\n"));
            if (data.data && data.data.includes("Debugging Finished")) {
              dispatch(setDebugMode(false));
              dispatch(setCurrentDebugLine(null));
              dispatch(updateDebugVariables({}));
            }
          }
        } catch {
          dispatch(writeToTerminal(msg + "\n"));
        }
      },
      () => {
        dispatch(writeToTerminal("\r\n[System] 디버깅 세션이 종료되었습니다.\r\n"));
        dispatch(setDebugMode(false));
        dispatch(setCurrentDebugLine(null));
        dispatch(updateDebugVariables({}));
      }
    );
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !workspaceId || !activeProject) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target.result;
      try {
        await saveFileApi(workspaceId, activeProject, activeBranch || "master", file.name, content);
        dispatch(writeToTerminal(`\r\n[System] ✅ 로컬 파일 업로드: ${file.name}\r\n`));
        const treeData = await fetchProjectFilesApi(workspaceId, activeProject, activeBranch || "master");
        dispatch(setWorkspaceTree(treeData));
      } catch (error) {
        dispatch(writeToTerminal(`\r\n[Error] ❌ 업로드 실패: ${error.message}\r\n`));
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleFolderUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0 || !workspaceId || !activeProject) return;

    dispatch(writeToTerminal(`\r\n[System] 📂 ${files.length}개 파일 업로드 시작...\r\n`));

    try {
      const uploadPromises = files.map((file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              const path = file.webkitRelativePath || file.name;
              await saveFileApi(workspaceId, activeProject, activeBranch || "master", path, event.target.result);
              resolve();
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = reject;
          reader.readAsText(file);
        });
      });

      await Promise.all(uploadPromises);
      dispatch(writeToTerminal(`[System] ✅ 폴더 업로드 완료.\r\n`));
      const treeData = await fetchProjectFilesApi(workspaceId, activeProject, activeBranch || "master");
      dispatch(setWorkspaceTree(treeData));
    } catch (error) {
      dispatch(writeToTerminal(`[Error] ❌ 폴더 업로드 에러: ${error.message}\r\n`));
    }
    e.target.value = "";
  };

  const handleMenuItemClick = async (menuName, itemName) => {
    setActiveMenu(null);

    switch (itemName) {
      case "새 파일":
        if (!workspaceId || !activeProject) return alert("프로젝트를 선택해주세요.");
        const fileName = window.prompt("파일 이름을 확장자와 함께 입력하세요 (예: index.js):");
        if (fileName) {
          try {
            await saveFileApi(workspaceId, activeProject, activeBranch || "master", fileName, "");
            dispatch(writeToTerminal(`[System] ✅ 새 파일 생성 성공: ${fileName}\n`));
            const treeData = await fetchProjectFilesApi(workspaceId, activeProject, activeBranch || "master");
            dispatch(setWorkspaceTree(treeData));
          } catch (e) {
            dispatch(writeToTerminal(`[Error] ❌ 생성 실패: ${e.message}\n`));
          }
        }
        break;
      case "파일 열기...":
        if (!workspaceId || !activeProject) return alert("프로젝트를 선택해주세요.");
        if (fileInputRef.current) fileInputRef.current.click();
        break;
      case "폴더 열기...":
        if (!workspaceId || !activeProject) return alert("프로젝트를 선택해주세요.");
        if (folderInputRef.current) folderInputRef.current.click();
        break;
      case "저장":
        if (!activeFileId || !workspaceId || !activeProject) return alert("에디터에 파일이 없습니다.");
        try {
          const content = fileContents[activeFileId] || "";
          await saveFileApi(workspaceId, activeProject, activeBranch || "master", activeFileId, content);
          if (!isTerminalVisible) dispatch(toggleTerminal());
          dispatch(writeToTerminal(`[System] ✅ 저장 완료: ${activeFileId}\n`));
        } catch (error) {
          if (!isTerminalVisible) dispatch(toggleTerminal());
          dispatch(writeToTerminal(`[Error] ❌ 저장 실패: ${error.message}\n`));
        }
        break;
      case "다른 이름으로...":
        if (!activeFileId || !workspaceId || !activeProject) return alert("파일이 없습니다.");
        const newName = window.prompt("새로운 파일 이름을 입력하세요:", activeFileId);
        if (newName && newName !== activeFileId) {
          try {
            const content = fileContents[activeFileId] || "";
            await saveFileApi(workspaceId, activeProject, activeBranch || "master", newName, content);
            dispatch(writeToTerminal(`[System] ✅ 복제 저장 완료: ${newName}\n`));
            const treeData = await fetchProjectFilesApi(workspaceId, activeProject, activeBranch || "master");
            dispatch(setWorkspaceTree(treeData));
          } catch (error) {
            dispatch(writeToTerminal(`[Error] ❌ 복제 실패: ${error.message}\n`));
          }
        }
        break;
      case "모두 저장":
        if (!workspaceId || !activeProject) return alert("저장할 내용이 없습니다.");
        dispatch(writeToTerminal("[System] 모든 파일을 저장합니다...\n"));
        try {
          const savePromises = Object.entries(fileContents || {}).map(([path, content]) =>
            saveFileApi(workspaceId, activeProject, activeBranch || "master", path, content)
          );
          await Promise.all(savePromises);
          if (!isTerminalVisible) dispatch(toggleTerminal());
          dispatch(writeToTerminal("[System] ✅ 모두 저장 완료!\n"));
        } catch (e) {
          if (!isTerminalVisible) dispatch(toggleTerminal());
          dispatch(writeToTerminal(`[Error] ❌ 모두 저장 실패: ${e.message}\n`));
        }
        break;
      case "내보내기":
        if (!activeFileId) return alert("다운로드할 파일을 열어주세요.");
        const fileContent = fileContents[activeFileId] || "";
        const blob = new Blob([fileContent], { type: "text/plain" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = activeFileId.split("/").pop() || "export.txt";
        a.click();
        window.URL.revokeObjectURL(url);
        dispatch(writeToTerminal(`[System] ✅ 로컬로 내보내기 되었습니다.\n`));
        break;
      case "닫기":
        if (activeFileId) dispatch(closeFile(activeFileId));
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
        dispatch(setActiveActivity("editor"));
        dispatch(triggerEditorCmd("find"));
        break;
      case "바꾸기":
        dispatch(setActiveActivity("editor"));
        dispatch(triggerEditorCmd("replace"));
        break;
      case "탐색기":
        dispatch(setActiveActivity("editor"));
        break;
      case "검색":
        dispatch(setActiveActivity("editor"));
        dispatch(triggerEditorCmd("find"));
        break;
      case "소스 제어":
        dispatch(setActiveActivity("git"));
        if (!isTerminalVisible) dispatch(toggleTerminal());
        dispatch(writeToTerminal("[System] 🔄 Git 대시보드 오픈\n"));
        break;
      case "실행 및 디버그":
        dispatch(setActiveActivity("editor"));
        dispatch(setDebugMode(true));
        break;
      case "확장":
        alert("💡 IDE 환경에 언어 컴파일러가 기본 내장되어 있습니다.");
        break;
      case "출력":
      case "디버그 콘솔":
        dispatch(setDebugMode(true));
        if (!isTerminalVisible) dispatch(toggleTerminal());
        dispatch(setActiveBottomTab("output"));
        break;
      case "터미널":
        if (!isTerminalVisible) dispatch(toggleTerminal());
        dispatch(setActiveBottomTab("terminal"));
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
        dispatch(triggerEditorCmd("go_to_references"));
        break;
      case "줄로 이동...":
        dispatch(triggerEditorCmd("go_to_line"));
        break;
      case "디버깅 시작":
        await startDebugSession();
        break;
      case "디버깅 없이 실행":
        await handleQuickRun();
        break;
      case "디버깅 중지":
        handleQuickStop();
        break;
      case "중단점 설정/해제":
        dispatch(triggerEditorCmd("toggle_breakpoint"));
        break;
      case "한 단계씩 코드 실행":
        if (DebugSocket && typeof DebugSocket.stepOver === "function") DebugSocket.stepOver();
        break;
      case "프로시저 단위 실행":
        if (DebugSocket && typeof DebugSocket.stepInto === "function") DebugSocket.stepInto();
        break;
      case "프로젝트 빌드":
      case "다시 빌드":
        if (!workspaceId || !activeProject) return alert("빌드할 프로젝트를 선택해주세요!");
        if (!isTerminalVisible) dispatch(toggleTerminal());
        dispatch(setActiveBottomTab("output"));
        dispatch(writeToTerminal(`\r\n[System] 🔨 ${activeProject} 빌드 시작...\r\n`));
        fetch(`${BASE_URL}/api/workspaces/build`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId, projectName: activeProject, branchName: activeBranch || "master" }),
        })
          .then(async (res) => {
            if (!res.ok) throw new Error((await res.text()) || "서버 빌드 에러");
            let defaultExtension =
              getLanguageFromPath(activeFileId) === "JAVA" ? ".jar" :
              getLanguageFromPath(activeFileId) === "C" || getLanguageFromPath(activeFileId) === "CPP" ? ".exe" : "";
            let filename = `${activeProject}_build_result${defaultExtension}`;
            return { blob: await res.blob(), filename };
          })
          .then(({ blob, filename }) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);
            dispatch(writeToTerminal(`[System] ✅ 빌드 및 다운로드 완료.\r\n`));
          })
          .catch((err) => dispatch(writeToTerminal(`[Error] ❌ 빌드 실패: ${err.message}\r\n`)));
        break;
      case "빌드 취소":
        if (!isTerminalVisible) dispatch(toggleTerminal());
        dispatch(writeToTerminal("[System] 🛑 빌드 취소 요청 완료.\n"));
        break;
      case "새 터미널":
        if (!isTerminalVisible) dispatch(toggleTerminal());
        dispatch(setActiveBottomTab("terminal"));
        dispatch(writeToTerminal(`\r\n[System] 새 터미널 세션 오픈\r\n$ `));
        break;
      case "터미널 분할":
        if (!isTerminalVisible) dispatch(toggleTerminal());
        dispatch(setActiveBottomTab("terminal"));
        dispatch(writeToTerminal(`\r\n[System] 터미널 분할 예정\r\n`));
        break;
      case "정보":
        alert("💻 Cloud Web IDE v1.0.0\nReact 기반 팀 협업 지원 에디터");
        break;
      case "문서":
        window.open("https://github.com/TeamIDE", "_blank");
        break;
      case "키보드 단축키":
        alert("📌 단축키\nCtrl+S : 저장\nCtrl+Shift+S : 모두 저장\nCtrl+` : 터미널 토글\nF5 : 디버깅");
        break;
      case "전체 화면":
        dispatch(setCodeMapMode("full"));
        dispatch(openCodeMapTab());
        break;
      case "분할 화면":
        dispatch(setCodeMapMode("split"));
        dispatch(openCodeMapTab());
        break;
      case "Commit & Merge":
      case "Repository Settings":
        dispatch(setActiveActivity("git"));
        if (!isTerminalVisible) dispatch(toggleTerminal());
        dispatch(writeToTerminal(`[Git] 🔄 Git 설정 창 이동\n`));
        break;
      case "Pull from Remote":
        await pullFromRemote();
        break;
      case "Push to Remote":
        await pushToRemote();
        break;
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      // 💡 오른쪽 패널 토글 단축키 추가
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        dispatch(toggleRightPanel());
      }

      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (e.shiftKey) handleMenuItemClick(null, "모두 저장");
        else handleMenuItemClick(null, "저장");
      } else if (e.ctrlKey && e.shiftKey && (e.key === "`" || e.key === "~")) {
        e.preventDefault();
        handleMenuItemClick(null, "새 터미널");
      } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        dispatch(toggleSidebar());
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeFileId, workspaceId, activeProject, activeBranch, fileContents, isTerminalVisible, codeMapMode]);

  const subMenus = [
    {
      name: "파일",
      items: [
        { label: "새 파일", shortcut: "Ctrl+N" },
        { label: "파일 열기...", shortcut: "Ctrl+O" },
        { label: "폴더 열기...", shortcut: "Ctrl+Shift+O" },
        { label: "저장", shortcut: "Ctrl+S" },
        { label: "다른 이름으로...", shortcut: "Ctrl+Shift+S" },
        { label: "모두 저장", shortcut: "Ctrl+Shift+S" },
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
      items: [
        { label: "Commit & Merge", shortcut: "Ctrl+Shift+G" },
        { label: "Pull from Remote", shortcut: "Ctrl+Shift+P" },
        { label: "Push to Remote", shortcut: "Ctrl+Shift+U" },
        { label: "Repository Settings" },
      ],
    },
  ];


  const {
    onlineMembers,
    onlineUserIdSet,
    connected: isPresenceConnected,
  } = useWorkspacePresence({
    workspaceId,
    enabled: mode === "team" && Boolean(workspaceId && user?.id),
    user,
  });

  const normalizeUserId = (value) => {
    if (value === null || value === undefined) return "";
    return String(value);
  };

  const isMemberOnline = (member) => {
    return onlineUserIdSet.has(normalizeUserId(member?.userId ?? member?.id));
  };

  const onlineTeamMembers = useMemo(() => {
    if (!Array.isArray(onlineMembers) || onlineMembers.length === 0) {
      return [];
    }

    return onlineMembers.map((onlineMember) => {
      const matchedMember = teamMembers.find(
        (member) =>
          normalizeUserId(member.userId ?? member.id) ===
          normalizeUserId(onlineMember.userId ?? onlineMember.id),
      );

      return {
        ...matchedMember,
        ...onlineMember,
        userId: onlineMember.userId ?? matchedMember?.userId ?? matchedMember?.id,
        nickname:
          onlineMember.nickname ||
          matchedMember?.nickname ||
          onlineMember.email ||
          matchedMember?.email ||
          "User",
        email: onlineMember.email || matchedMember?.email || "",
        role: matchedMember?.role,
      };
    });
  }, [onlineMembers, teamMembers]);

  const sortedTeamMembers = useMemo(() => {
    return [...teamMembers].sort((a, b) => {
      const aOnline = isMemberOnline(a) ? 1 : 0;
      const bOnline = isMemberOnline(b) ? 1 : 0;

      if (aOnline !== bOnline) {
        return bOnline - aOnline;
      }

      return String(a.nickname || "").localeCompare(String(b.nickname || ""));
    });
  }, [teamMembers, onlineUserIdSet]);

  return (
    <>
      <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileUpload} />
      <input
        type="file"
        ref={folderInputRef}
        webkitdirectory="true"
        directory="true"
        style={{ display: "none" }}
        onChange={handleFolderUpload}
      />

      {/* 💡 최신 IDE 트렌드를 반영한 세련되고 깔끔한 메뉴바 헤더 UI */}
      {!isRelocationPage && (
        <div className="flex items-center justify-between px-4 h-[48px] border-b border-gray-200 bg-white relative z-[2000] shadow-sm select-none">
          
          {/* 1. 왼쪽: 드롭다운 메뉴 영역 */}
          <div className="flex items-center gap-0.5" ref={menuRef}>
            {subMenus.map((menu) => (
              <div key={menu.name} className="relative">
                <div
                  className={`cursor-pointer px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors ${
                    activeMenu === menu.name
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                  onClick={() => setActiveMenu(activeMenu === menu.name ? null : menu.name)}
                >
                  {menu.name}
                </div>
                {activeMenu === menu.name && (
                  <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-gray-200 shadow-[0_10px_40px_rgba(0,0,0,0.1)] rounded-lg py-1.5 z-[99999] animate-fade-in-up">
                    {menu.items.map((item) => (
                      <div
                        key={item.label}
                        onClick={() => handleMenuItemClick(menu.name, item.label)}
                        className="px-4 py-1.5 hover:bg-blue-50 hover:text-blue-700 cursor-pointer text-[13px] font-medium text-gray-700 transition-colors flex justify-between items-center"
                      >
                        <span>{item.label}</span>
                        {item.shortcut && <span className="text-[10px] font-bold text-gray-400">{item.shortcut}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 2. 중앙 및 오른쪽: 액션 버튼 그룹 */}
          <div className="flex items-center gap-3">
            
            {/* Run / Stop 컨트롤 */}
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-0.5">
              <button
                onClick={handleQuickRun}
                disabled={isRunning || isDebugMode}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-bold transition-all h-7 ${
                  isRunning || isDebugMode
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-emerald-600 hover:bg-white hover:shadow-sm active:scale-95"
                }`}
                title="빠른 실행"
              >
                <VscPlay size={14} /> Run
              </button>
              <div className="w-px h-3 bg-gray-300 mx-0.5"></div>
              <button
                onClick={handleQuickStop}
                disabled={!isRunning && !isDebugMode}
                className={`flex items-center justify-center px-2.5 py-1 rounded-md transition-all h-7 ${
                  !isRunning && !isDebugMode
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-rose-500 hover:bg-white hover:shadow-sm active:scale-95"
                }`}
                title="강제 중지"
              >
                <VscDebugStop size={14} />
              </button>
            </div>

            <div className="w-px h-4 bg-gray-200"></div>

            {/* 새 프로젝트 버튼 */}
            <button
              onClick={() => dispatch(openProjectModal())}
              className="flex items-center gap-1.5 px-3 py-1.5 h-8 bg-gray-800 text-white hover:bg-black active:scale-95 rounded-lg text-[12px] font-bold shadow-sm transition-all"
            >
              <VscAdd size={14} /> 새 작업폴더
            </button>

            <div className="w-px h-4 bg-gray-200"></div>

            <GitBranchControls
              mode={mode}
              workspaceId={workspaceId}
              activeProject={activeProject}
              activeBranch={activeBranch}
              currentNickname={currentNickname}
              fileContents={fileContents}
            />

            {mode === "team" && <div className="w-px h-4 bg-gray-200 mx-1"></div>}

            {/* Team 및 VoiceChat 그룹 */}
            {mode === "team" && (
              <div className="flex items-center gap-2">
                {/* 팀원 아바타: 서버 presence 기준 접속 중인 팀원만 표시 */}
                <div
                  className="flex -space-x-1.5 mr-1 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setIsTeamModalOpen(true)}
                  title={
                    isPresenceConnected
                      ? `접속 중 ${onlineTeamMembers.length}명 / 전체 ${teamMembers.length}명`
                      : "접속자 정보를 연결하는 중"
                  }
                >
                  {onlineTeamMembers.slice(0, 3).map((member, idx) => (
                    <div
                      key={member.userId}
                      className={`w-7 h-7 rounded-full ${
                        avatarColors[idx % avatarColors.length]
                      } ring-2 ring-white flex items-center justify-center text-[10px] text-white font-bold shadow-sm relative`}
                      title={`${member.nickname || member.email || "User"} 접속 중`}
                    >
                      {(member.nickname || member.email || "U")?.[0]?.toUpperCase()}
                      <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 ring-2 ring-white rounded-full"></div>
                    </div>
                  ))}

                  {onlineTeamMembers.length > 3 && (
                    <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 ring-2 ring-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                      +{onlineTeamMembers.length - 3}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setIsTeamModalOpen(true)}
                  className="px-3 py-1.5 h-8 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 rounded-lg text-[12px] font-bold transition-all active:scale-95"
                >
                  TEAM
                </button>

                <button
                  onClick={() => {
                    setIsVoiceChatModalOpen(true);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 h-8 rounded-lg text-[12px] font-bold transition-all active:scale-95 ${
                    isVoiceConnected 
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100" 
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="relative flex h-2 w-2">
                    <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${isVoiceConnected ? "animate-ping bg-emerald-400" : "bg-gray-400"}`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isVoiceConnected ? "bg-emerald-500" : "bg-gray-500"}`}></span>
                  </div>
                  VoiceChat
                </button>
              </div>
            )}
          </div>
        </div>
      )}


      {isTeamModalOpen && mode === "team" && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998] flex items-center justify-center animate-fade-in" onClick={() => setIsTeamModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-[400px] overflow-hidden flex flex-col animate-slide-up ring-1 ring-black/5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
              <h2 className="text-lg font-black text-gray-900">
                팀원 관리{" "}
                <span className="text-blue-500 ml-1">
                  {onlineTeamMembers.length}/{teamMembers.length}
                </span>
              </h2>
              <button onClick={() => setIsTeamModalOpen(false)} className="text-gray-400 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 p-1.5 rounded-full transition-colors">
                <VscClose size={20} />
              </button>
            </div>
            <div className="p-4 space-y-2 max-h-[350px] overflow-y-auto bg-gray-50/50 custom-scrollbar">
              {sortedTeamMembers.map((member, idx) => {
                const isMe = normalizeUserId(user?.id ?? user?.userId) === normalizeUserId(member.userId ?? member.id);
                const online = isMemberOnline(member);

                return (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md hover:ring-2 hover:ring-blue-50 transition-all group cursor-default"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="relative">
                        <div
                          className={`w-10 h-10 rounded-full ${
                            avatarColors[idx % avatarColors.length]
                          } text-white flex items-center justify-center font-bold text-[14px] shadow-sm`}
                        >
                          {(member.nickname || member.email || "U")?.[0]?.toUpperCase()}
                        </div>

                        <div
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-white rounded-full ${
                            online ? "bg-green-500" : "bg-gray-300"
                          }`}
                          title={online ? "접속 중" : "오프라인"}
                        ></div>
                      </div>

                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-[13px] text-gray-900">
                            {member.nickname}
                          </span>

                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${
                              member.role === "OWNER"
                                ? "bg-blue-100 text-blue-700"
                                : member.role === "ADMIN"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {member.role === "OWNER"
                              ? "Owner"
                              : member.role === "ADMIN"
                                ? "Admin"
                                : "Member"}{" "}
                            {isMe && "(나)"}
                          </span>

                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              online
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-gray-100 text-gray-400"
                            }`}
                          >
                            {online ? "접속 중" : "오프라인"}
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
              <button onClick={() => { setIsInviteModalOpen(true); setIsTeamModalOpen(false); }} className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-200 transition-all">
                <VscAdd size={16} strokeWidth={1} /> 새로운 팀원 초대하기
              </button>
            </div>
          </div>
        </div>
      )}

      {isInviteModalOpen && mode === "team" && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center animate-fade-in" onClick={() => setIsInviteModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-[420px] overflow-hidden flex flex-col animate-slide-up ring-1 ring-black/5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white">
              <div>
                <h2 className="text-lg font-black text-gray-900">팀원 초대</h2>
                <p className="text-xs text-gray-500 mt-1">이메일 발송 또는 프로젝트 코드로 초대하세요</p>
              </div>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-gray-400 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 p-1.5 rounded-full transition-colors">
                <VscClose size={20} />
              </button>
            </div>
            <div className="p-6 space-y-7 bg-gray-50/50">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-extrabold text-gray-800 flex items-center gap-1.5"><VscMail className="text-blue-500" /> 이메일로 초대장 발송</label>
                  <div className="flex gap-2">
                    <input type="text" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSendInvite(); }} placeholder="teammate@example.com" className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 bg-white transition-all shadow-sm" />
                    <button onClick={handleSendInvite} disabled={isInviting || !inviteEmail.trim()} className="px-5 bg-[#2d333b] hover:bg-black text-white rounded-xl text-[13px] font-bold transition-all shadow-sm disabled:opacity-50 flex items-center justify-center shrink-0">
                      {isInviting ? <VscRefresh className="animate-spin" size={16} /> : "발송"}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-px bg-gray-200 flex-1"></div>
                <span className="text-[11px] font-bold text-gray-400">또는</span>
                <div className="h-px bg-gray-200 flex-1"></div>
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-extrabold text-gray-800 flex items-center gap-1.5"><VscKey className="text-green-500" /> 프로젝트 코드 공유</label>
                <p className="text-[11px] text-gray-500">새로운 팀원이 대시보드에서 이 코드를 입력하여 참여할 수 있습니다.</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-3 text-[13px] text-gray-700 truncate font-mono shadow-sm select-all font-bold tracking-wider text-center">{workspaceId || "PROJ-XXXX-YYYY"}</div>
                  <button onClick={handleCopyCode} className={`px-5 py-3 rounded-xl flex items-center gap-1.5 text-[12px] font-bold shrink-0 transition-all shadow-sm ${isCopied ? "bg-green-500 text-white border-transparent" : "bg-white border border-gray-300 text-gray-800 hover:bg-gray-50 active:scale-95"}`}>
                    {isCopied ? <><VscCheck size={14} /> 복사됨</> : <><VscCopy size={14} /> 복사</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === "team" && (
        <VoiceChatManager
          teamMembers={teamMembers}
          isModalOpen={isVoiceChatModalOpen}
          onCloseModal={() => setIsVoiceChatModalOpen(false)}
        />
      )}
    </>
  );
}
