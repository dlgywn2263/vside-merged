"use client";

import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "next/navigation";
import { VscChevronLeft, VscChevronRight } from "react-icons/vsc";

import MenuBar from "@/components/ide/MenuBar";
import ActivityBar from "@/components/ide/ActivityBar";
import Sidebar from "@/components/ide/Sidebar";
import CodeEditor from "@/components/ide/CodeEditor";
import BottomPanel from "@/components/ide/BottomPanel";
import FileTabs from "@/components/ide/FileTabs";
import DebugPanel from "@/components/ide/DebugPanel";
import AgentPanel from "@/components/ide/AgentPanel";
import ApiTesterPage from "@/components/api-test/ApiTesterPage";
import CommandPalette from "@/components/ide/CommandPalette";
import GitDashboard from "@/components/ide/GitDashboard";
import CodeMap from "@/components/ide/CodeMap";
import DevlogPanel from "@/components/ide/DevlogPanel";
import CreateProjectModal from "@/components/ide/CreateProjectModal";
import WebPreview from "@/components/ide/WebPreview";

import { fetchWorkspaceProjectsApi } from "@/lib/ide/api";

import {
  setWorkspaceTree,
  setWorkspaceId,
  setProjectList,
  setActiveProject,
  setActiveBranch,
  closeAllFiles,
} from "@/store/slices/fileSystemSlice";
import MyPageShell from "../mypage/MyPageShell";
import { toggleSidebar, toggleRightPanel } from "@/store/slices/uiSlice";

const LEFT_SIDEBAR_DEFAULT_WIDTH = 260;
const LEFT_SIDEBAR_MIN_WIDTH = 220;
const LEFT_SIDEBAR_MAX_WIDTH = 420;

const RIGHT_PANEL_DEFAULT_WIDTH = 320;
const RIGHT_PANEL_MIN_WIDTH = 300;
const RIGHT_PANEL_MAX_WIDTH = 560;

const TERMINAL_DEFAULT_HEIGHT = 250;
const TERMINAL_MIN_HEIGHT = 140;
const TERMINAL_MAX_HEIGHT = 520;

const clampPanelSize = (value, min, max) => {
  return Math.min(max, Math.max(min, value));
};

export default function IdeMain() {
  const params = useParams();
  const id = params?.id;

  const dispatch = useDispatch();

  const {
    activeActivity,
    isTerminalVisible,
    isSidebarVisible,
    isRightPanelVisible,
    isAgentVisible,
    isDebugMode,
  } = useSelector((state) => state.ui);

  const { workspaceId, activeProject, activeBranch } = useSelector(
    (state) => state.fileSystem,
  );

  const editorLayoutRef = useRef(null);

  const [leftSidebarWidth, setLeftSidebarWidth] = useState(
    LEFT_SIDEBAR_DEFAULT_WIDTH,
  );
  const [rightPanelWidth, setRightPanelWidth] = useState(
    RIGHT_PANEL_DEFAULT_WIDTH,
  );
  const [terminalHeight, setTerminalHeight] = useState(
    TERMINAL_DEFAULT_HEIGHT,
  );

  const [resizingPanel, setResizingPanel] = useState(null);

  const startLeftSidebarResize = (event) => {
    event.preventDefault();
    setResizingPanel("left");
  };

  const startRightPanelResize = (event) => {
    event.preventDefault();
    setResizingPanel("right");
  };

  const startTerminalResize = (event) => {
    event.preventDefault();
    setResizingPanel("terminal");
  };

  useEffect(() => {
    if (!resizingPanel) return;

    const handlePointerMove = (event) => {
      const layoutRect = editorLayoutRef.current?.getBoundingClientRect();

      if (resizingPanel === "left") {
        const nextWidth = layoutRect
          ? event.clientX - layoutRect.left
          : event.clientX;

        setLeftSidebarWidth(
          clampPanelSize(
            nextWidth,
            LEFT_SIDEBAR_MIN_WIDTH,
            LEFT_SIDEBAR_MAX_WIDTH,
          ),
        );
      }

      if (resizingPanel === "right") {
        const nextWidth = layoutRect
          ? layoutRect.right - event.clientX
          : window.innerWidth - event.clientX;

        setRightPanelWidth(
          clampPanelSize(
            nextWidth,
            RIGHT_PANEL_MIN_WIDTH,
            RIGHT_PANEL_MAX_WIDTH,
          ),
        );
      }

      if (resizingPanel === "terminal") {
        const nextHeight = layoutRect
          ? layoutRect.bottom - event.clientY
          : window.innerHeight - event.clientY;

        setTerminalHeight(
          clampPanelSize(
            nextHeight,
            TERMINAL_MIN_HEIGHT,
            TERMINAL_MAX_HEIGHT,
          ),
        );
      }
    };

    const handlePointerUp = () => {
      setResizingPanel(null);
    };

    document.body.style.cursor =
      resizingPanel === "terminal" ? "row-resize" : "col-resize";
    document.body.style.userSelect = "none";

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [resizingPanel]);

  useEffect(() => {
    if (!id) return;

    dispatch(closeAllFiles());
    dispatch(setWorkspaceId(id));

    fetchWorkspaceProjectsApi(id)
      .then((root) => {
        dispatch(setWorkspaceTree(root));

        if (root && root.children && root.children.length > 0) {
          dispatch(setProjectList(root.children));

          const savedProject = localStorage.getItem(`lastProject_${id}`);
          const savedBranch = localStorage.getItem(`lastBranch_${id}`);

          const isValidProject = root.children.some(
            (p) => p.name === savedProject,
          );

          const targetProject = isValidProject
            ? savedProject
            : root.children[0].name;
          const targetBranch = savedBranch || "master";

          dispatch(setActiveProject(targetProject));
          dispatch(setActiveBranch(targetBranch));
        }
      })
      .catch((error) => {
        console.error("fetchWorkspaceProjectsApi error:", error);
      });
  }, [id, dispatch]);

  useEffect(() => {
    if (workspaceId && activeProject) {
      localStorage.setItem(`lastProject_${workspaceId}`, activeProject);
    }

    if (workspaceId && activeBranch) {
      localStorage.setItem(`lastBranch_${workspaceId}`, activeBranch);
    }
  }, [workspaceId, activeProject, activeBranch]);

  

  const renderMainContent = () => {
    switch (activeActivity) {
      case "docs":
        return <DevlogPanel />;

      case "api-test":
        return <ApiTesterPage />;

      case "mypage":
        return (
          <div className="flex-1 min-w-0 h-full overflow-y-auto bg-white">
            <MyPageShell />
          </div>
        );

      case "git":
        return <GitDashboard />;

      case "editor":
      default:
        return (
          <div
            ref={editorLayoutRef}
            className="flex-1 flex overflow-hidden bg-[#f0f2f5] p-2 gap-2"
          >
            {/* 왼쪽 탐색기 패널 */}
            <div
              className={`relative rounded-2xl shadow-sm overflow-hidden bg-white border flex flex-col shrink-0 border-gray-200 ${
                resizingPanel === "left"
                  ? "transition-none"
                  : "transition-all duration-300 ease-in-out"
              } ${
                isSidebarVisible
                  ? "opacity-100"
                  : "opacity-0 border-transparent"
              }`}
              style={{
                width: isSidebarVisible ? `${leftSidebarWidth}px` : "0px",
              }}
            >
              {isSidebarVisible && (
                <div
                  role="separator"
                  aria-orientation="vertical"
                  title="탐색기 너비 조절"
                  onPointerDown={startLeftSidebarResize}
                  className="absolute right-0 top-0 z-[700] h-full w-3 translate-x-1/2 cursor-col-resize touch-none"
                >
                  <div className="mx-auto h-full w-px bg-transparent transition hover:bg-blue-400" />
                </div>
              )}

              <div
                className="h-full flex flex-col shrink-0"
                style={{
                  width: `${leftSidebarWidth}px`,
                }}
              >
                <Sidebar />
              </div>
            </div>

            {/* 탐색기 닫혀있을 때 열기 버튼 */}
            {!isSidebarVisible && (
              <div className="relative flex items-center justify-center -ml-4 z-10 w-0">
                <button
                  onClick={() => dispatch(toggleSidebar())}
                  className="w-6 h-6 bg-white border border-gray-300 rounded-full flex items-center justify-center shadow-md text-gray-500 hover:text-blue-600 hover:scale-110 transition-all z-20"
                  title="탐색기 열기"
                >
                  <VscChevronRight size={14} />
                </button>
              </div>
            )}

            {/* 중앙 에디터 영역 */}
            <div className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 z-0 relative">
              <FileTabs />

              <div className="flex-1 flex relative overflow-hidden">
                <div className="flex-1 flex flex-col min-w-0 relative">
                  <CodeEditor />
                  <CodeMap />
                </div>
              </div>

              {isTerminalVisible && (
                <div
                  className="relative border-t border-gray-200 bg-white shrink-0 z-[600]"
                  style={{
                    height: `${terminalHeight}px`,
                  }}
                >
                  <div
                    role="separator"
                    aria-orientation="horizontal"
                    title="터미널 높이 조절"
                    onPointerDown={startTerminalResize}
                    className="absolute left-0 top-0 z-[700] h-3 w-full -translate-y-1/2 cursor-row-resize touch-none"
                  >
                    <div className="h-px w-full bg-transparent transition hover:bg-blue-400" />
                  </div>

                  <BottomPanel />
                </div>
              )}
            </div>

            {/* 오른쪽 패널이 닫혀있을 때 열기 버튼 */}
            {(isAgentVisible || isDebugMode) && !isRightPanelVisible && (
              <div className="relative flex items-center justify-center -mr-4 z-10 w-0">
                <button
                  onClick={() => dispatch(toggleRightPanel())}
                  className="w-6 h-6 bg-white border border-gray-300 rounded-full flex items-center justify-center shadow-md text-gray-500 hover:text-blue-600 hover:scale-110 transition-all z-20"
                  title="AI 어시스트 열기"
                >
                  <VscChevronLeft size={14} />
                </button>
              </div>
            )}

            {/* 오른쪽 AI 패널 */}
            {(isAgentVisible || isDebugMode) && (
              <div
                className={`relative rounded-2xl shadow-sm overflow-hidden bg-white border flex flex-col z-[600] shrink-0 border-gray-200 ${
                  resizingPanel === "right"
                    ? "transition-none"
                    : "transition-all duration-300 ease-in-out"
                } ${
                  isRightPanelVisible
                    ? "opacity-100"
                    : "opacity-0 border-transparent"
                }`}
                style={{
                  width: isRightPanelVisible ? `${rightPanelWidth}px` : "0px",
                }}
              >
                {isRightPanelVisible && (
                  <div
                    role="separator"
                    aria-orientation="vertical"
                    title="AI 어시스트 너비 조절"
                    onPointerDown={startRightPanelResize}
                    className="absolute left-0 top-0 z-[700] h-full w-3 -translate-x-1/2 cursor-col-resize touch-none"
                  >
                    <div className="mx-auto h-full w-px bg-transparent transition hover:bg-blue-400" />
                  </div>
                )}

                <div
                  className="h-full flex flex-col shrink-0"
                  style={{
                    width: `${rightPanelWidth}px`,
                  }}
                >
                  <div className="flex items-center justify-between h-11 border-b border-gray-200 shrink-0 px-2 pt-1 bg-[#f8f9fa]">
                    <div className="flex-1 h-full flex items-center justify-center text-[13px] font-bold border-t-2 border-t-blue-500 bg-white text-blue-600 shadow-sm rounded-t-lg select-none cursor-default">
                      {isDebugMode ? "디버깅 모드" : "AI 어시스트"}
                    </div>

                    <button
                      onClick={() => dispatch(toggleRightPanel())}
                      className="mb-1 ml-2 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-all"
                      title="AI 어시스트 닫기"
                    >
                      <VscChevronRight size={18} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-hidden relative bg-white">
                    {isDebugMode ? <DebugPanel /> : <AgentPanel />}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="w-full h-[calc(100vh-61px)] flex flex-col bg-white text-[#333] overflow-hidden font-sans relative">
      <CommandPalette />

      <MenuBar mode="personal" />

      <div className="flex-1 flex overflow-hidden">
        <ActivityBar />
        {renderMainContent()}
      </div>

      <CreateProjectModal />
      <WebPreview />
    </div>
  );
}