"use client";

import { useEffect, useRef, useState } from "react";

import { useDispatch, useSelector } from "react-redux";

import { useParams } from "next/navigation";

import { VscChevronRight, VscSparkle, VscDebugAlt } from "react-icons/vsc";

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

import { useWorkspaceEntry } from "@/hooks/ide/useWorkspaceEntry";

import {
  RIGHT_PANEL_RAIL_WIDTH,
  useRightPanelAutoCollapse,
} from "@/hooks/ide/useRightPanelAutoCollapse";

import MyPageShell from "../mypage/MyPageShell";

import { toggleRightPanel } from "@/store/slices/uiSlice";

import { PanelResizeHandle, RightPanelRail } from "@/components/ide/IdePanelChrome";

const LEFT_SIDEBAR_DEFAULT_WIDTH = 260;

const LEFT_SIDEBAR_MIN_WIDTH = 200;

const LEFT_SIDEBAR_MAX_WIDTH = 400;

const RIGHT_PANEL_DEFAULT_WIDTH = 320;

const RIGHT_PANEL_MIN_WIDTH = 280;

const RIGHT_PANEL_MAX_WIDTH = 450;

const TERMINAL_DEFAULT_HEIGHT = 220;

const TERMINAL_MIN_HEIGHT = 120;

// 터미널 최대 높이는 고정값이 아니라 편집 영역 높이의 비율이다(작은 화면에서도 에디터가 남게).

const TERMINAL_MAX_HEIGHT_RATIO = 0.65;

// 창이 좁을 때 양쪽 패널이 에디터를 밀어내지 않도록 비율로도 막는다.

const LEFT_SIDEBAR_MAX_RATIO = "30%";

const RIGHT_PANEL_MAX_RATIO = "35%";

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

    isAgentVisible,

    isDebugMode,

  } = useSelector((state) => state.ui);

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

  const hasRightPanel = isAgentVisible || isDebugMode;

  const rightPanel = useRightPanelAutoCollapse();

  const rightRailItems = isDebugMode
    ? [{ id: "debug", label: "디버그", icon: <VscDebugAlt size={20} /> }]
    : [{ id: "ai", label: "AI 어시스트", icon: <VscSparkle size={20} /> }];

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

        // 겹쳐 띄운 패널은 아이콘 바 왼쪽에 붙어 있다.
        const railOffset = rightPanel.isCompact ? RIGHT_PANEL_RAIL_WIDTH : 0;

        const nextWidth = layoutRect

          ? layoutRect.right - railOffset - event.clientX

          : window.innerWidth - railOffset - event.clientX;

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

        const maxHeight = layoutRect
          ? Math.max(TERMINAL_MIN_HEIGHT, layoutRect.height * TERMINAL_MAX_HEIGHT_RATIO)
          : window.innerHeight * TERMINAL_MAX_HEIGHT_RATIO;

        setTerminalHeight(

          clampPanelSize(nextHeight, TERMINAL_MIN_HEIGHT, maxHeight),

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

  }, [resizingPanel, rightPanel.isCompact]);

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  useWorkspaceEntry(id);

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

            className="relative flex-1 min-h-0 min-w-0 flex overflow-hidden bg-[#f0f2f5]"

          >

            {/* 왼쪽 탐색기 패널. 접어도 Sidebar 를 언마운트하지 않는다 —
                파일 트리 이벤트 소켓(/ws/workspace-events)이 Sidebar 안에 있다. */}

            <div

              className={`relative overflow-hidden flex flex-col shrink-0 bg-[#F8FAFC] ${

                resizingPanel === "left"

                  ? "transition-none"

                  : "transition-[width,opacity] duration-200 ease-out"

              } ${

                isSidebarVisible

                  ? "opacity-100 border-r border-gray-200"

                  : "opacity-0"

              }`}

              style={{

                width: isSidebarVisible ? `${leftSidebarWidth}px` : "0px",

                maxWidth: LEFT_SIDEBAR_MAX_RATIO,

              }}

              aria-hidden={!isSidebarVisible}

            >

              {isSidebarVisible && (

                <PanelResizeHandle

                  orientation="vertical"

                  edge="right"

                  active={resizingPanel === "left"}

                  title="탐색기 너비 조절"

                  onPointerDown={startLeftSidebarResize}

                />

              )}

              <div

                className="h-full w-full flex flex-col"

                style={{ minWidth: `${LEFT_SIDEBAR_MIN_WIDTH}px` }}

              >

                <Sidebar />

              </div>

            </div>

            {/* 중앙 에디터 영역 — 남은 가로 공간을 전부 차지한다.
                Monaco 는 automaticLayout, xterm 은 ResizeObserver 로 크기를 따라간다. */}

            <div className="flex-1 min-h-0 min-w-[240px] flex flex-col bg-white overflow-hidden relative z-0">

              <FileTabs />

              <div className="flex-1 min-h-0 flex relative overflow-hidden">

                <div className="flex-1 min-h-0 flex flex-col min-w-0 relative">

                  <CodeEditor />

                  <CodeMap />

                </div>

              </div>

              {isTerminalVisible && (

                <div

                  className="relative border-t border-gray-200 bg-white shrink-0 z-[600]"

                  style={{

                    height: `${terminalHeight}px`,

                    minHeight: `${TERMINAL_MIN_HEIGHT}px`,

                    maxHeight: `${TERMINAL_MAX_HEIGHT_RATIO * 100}%`,

                  }}

                >

                  <PanelResizeHandle

                    orientation="horizontal"

                    edge="top"

                    active={resizingPanel === "terminal"}

                    title="터미널 높이 조절"

                    onPointerDown={startTerminalResize}

                  />

                  <BottomPanel />

                </div>

              )}

            </div>

            {/* 오른쪽 AI 패널. 접어도 언마운트하지 않아 대화 내용이 남는다.
                좁은 창에서는 같은 요소를 absolute 로 바꿔 에디터 위에 겹쳐 띄운다(구조를 바꾸면 리마운트된다). */}

            {hasRightPanel && (

              <div

                className={`${

                  rightPanel.isCompact ? "absolute inset-y-0" : "relative"

                } overflow-hidden flex flex-col z-[600] shrink-0 bg-[#F8FAFC] ${

                  resizingPanel === "right"

                    ? "transition-none"

                    : "transition-[width,opacity] duration-200 ease-out"

                } ${

                  rightPanel.isShown

                    ? "opacity-100 border-l border-gray-200"

                    : "opacity-0"

                } ${rightPanel.isOverlay ? "shadow-[-8px_0_24px_rgba(15,23,42,0.08)]" : ""}`}

                style={{

                  width: rightPanel.isShown ? `${rightPanelWidth}px` : "0px",

                  maxWidth: rightPanel.isCompact

                    ? `calc(100% - ${RIGHT_PANEL_RAIL_WIDTH}px)`

                    : RIGHT_PANEL_MAX_RATIO,

                  right: rightPanel.isCompact ? `${RIGHT_PANEL_RAIL_WIDTH}px` : undefined,

                }}

                aria-hidden={!rightPanel.isShown}

              >

                {rightPanel.isShown && (

                  <PanelResizeHandle

                    orientation="vertical"

                    edge="left"

                    active={resizingPanel === "right"}

                    title="AI 어시스트 너비 조절"

                    onPointerDown={startRightPanelResize}

                  />

                )}

                <div

                  className="h-full w-full flex flex-col"

                  style={{ minWidth: `${RIGHT_PANEL_MIN_WIDTH}px` }}

                >

                  <div className="flex items-center justify-between h-9 border-b border-gray-200 shrink-0 pl-1 pr-1.5 bg-[#F8FAFC]">

                    <div className="flex items-center gap-1.5 h-full px-3 text-[12px] font-bold border-b-2 border-[#5873F9] text-[#5873F9] select-none cursor-default">

                      {isDebugMode ? <VscDebugAlt size={14} /> : <VscSparkle size={14} />}

                      {isDebugMode ? "디버깅 모드" : "AI 어시스트"}

                    </div>

                    <button

                      type="button"

                      onClick={() => dispatch(toggleRightPanel())}

                      className="shrink-0 p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"

                      title="패널 접기"

                      aria-label="AI 어시스트 패널 접기"

                    >

                      <VscChevronRight size={16} />

                    </button>

                  </div>

                  <div className="flex-1 min-h-0 overflow-hidden relative bg-[#F8FAFC]">

                    {isDebugMode ? <DebugPanel /> : <AgentPanel />}

                  </div>

                </div>

              </div>

            )}

            {/* 오른쪽 패널을 접었을 때(좁은 창에서는 항상)의 세로 아이콘 바.
                패널이 하나뿐이라 아이콘을 누르면 열고, 겹쳐 띄운 상태에서 다시 누르면 닫는다. */}

            {hasRightPanel && rightPanel.showRail && (

              <RightPanelRail

                items={rightRailItems}

                activeId={isDebugMode ? "debug" : "ai"}

                onSelect={() => dispatch(toggleRightPanel())}

              />

            )}

          </div>

        );

    }

  };

  return (

    <div className="w-full h-full flex-1 min-h-0 min-w-0 flex flex-col bg-white text-[#333] overflow-hidden font-sans relative">

      <CommandPalette />

      <MenuBar mode="personal" />

      <div className="flex-1 min-h-0 flex overflow-hidden">

        <ActivityBar />

        {renderMainContent()}

      </div>

      <CreateProjectModal />

      <WebPreview />

    </div>

  );

}
