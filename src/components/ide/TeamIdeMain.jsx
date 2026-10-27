"use client";

import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "next/navigation";
import {
  VscSend,
  VscChevronRight,
  VscSparkle,
  VscCommentDiscussion,
  VscDebugAlt,
} from "react-icons/vsc";

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
import MyPageShell from "../mypage/MyPageShell";
import SafeRunStatusBar from "@/components/ide/SafeRunStatusBar";
import { PanelResizeHandle, RightPanelRail } from "@/components/ide/IdePanelChrome";

import {
  fetchChatHistoryApi,
  getUserProfileApi,
  getWorkspaceMembersApi,
} from "@/lib/ide/api";
import { ChatSocket } from "@/lib/ide/chatSocket";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceEntry } from "@/hooks/ide/useWorkspaceEntry";

import {
  closeAllFiles,
  clearVirtualTree,
} from "@/store/slices/fileSystemSlice";
import { toggleRightPanel } from "@/store/slices/uiSlice";

// const MyPagePanel = () => (
//   <div className="flex-1 flex items-center justify-center text-gray-500 font-bold">
//     My Page Panel
//   </div>
// );

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

function CollaborationPanel({ workspaceId }) {
  const { user } = useAuth();

  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [chatMode, setChatMode] = useState("ALL");

  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatMode]);

  const getMyChatName = () => {
    if (myProfile?.nickname) return myProfile.nickname;
    if (user?.nickname) return user.nickname;
    if (user?.email) return user.email.split("@")[0];

    try {
      if (typeof window !== "undefined") {
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");

        if (storedUser?.nickname) return storedUser.nickname;
        if (storedUser?.email) return storedUser.email.split("@")[0];
      }
    } catch {}

    return "팀원";
  };

  const getMyUserId = () => {
    if (user?.id) return user.id;

    try {
      if (typeof window !== "undefined") {
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");

        if (storedUser?.id) return storedUser.id;
      }
    } catch {}

    return 0;
  };

  useEffect(() => {
    const myId = getMyUserId();
    if (!workspaceId || !myId) return;

    getUserProfileApi(myId).then(setMyProfile).catch(console.error);

    getWorkspaceMembersApi(workspaceId)
      .then(setTeamMembers)
      .catch(console.error);

    fetchChatHistoryApi(workspaceId, myId)
      .then((history) => {
        const formatted = history.map((msg) => ({
          id: msg.id,
          senderId: msg.senderId,
          receiverId: msg.receiverId,
          sender: msg.senderName,
          text: msg.content,
          time: new Date(msg.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          isMe: String(msg.senderId) === String(myId),
          type: msg.type,
        }));

        setMessages(formatted);
      })
      .catch((err) => console.error("이전 채팅 불러오기 실패:", err));

    ChatSocket.connect(workspaceId, myId, (newMessage) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === newMessage.id)) return prev;

        return [
          ...prev,
          {
            id: newMessage.id,
            senderId: newMessage.senderId,
            receiverId: newMessage.receiverId,
            sender: newMessage.senderName,
            text: newMessage.content,
            time: new Date(newMessage.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            isMe: String(newMessage.senderId) === String(myId),
            type: newMessage.type,
          },
        ];
      });
    });

    return () => {
      ChatSocket.disconnect();
    };
  }, [workspaceId, user]);

  const handleSend = () => {
    const myId = getMyUserId();
    if (!chatInput.trim() || !workspaceId || !myId) return;

    const actualName = getMyChatName();
    const receiver = chatMode === "ALL" ? null : Number(chatMode);

    const messageData = {
      workspaceId,
      senderId: myId,
      senderName: actualName,
      receiverId: receiver,
      content: chatInput,
      type: "CHAT",
    };

    ChatSocket.sendMessage(messageData);
    setChatInput("");
  };

  const displayMessages = messages.filter((msg) => {
    if (chatMode === "ALL") {
      return msg.receiverId === null;
    }

    const targetId = String(chatMode);
    const myId = String(getMyUserId());
    const mSender = String(msg.senderId);
    const mReceiver = String(msg.receiverId);

    return (
      (mSender === myId && mReceiver === targetId) ||
      (mSender === targetId && mReceiver === myId)
    );
  });

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] font-sans">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {displayMessages.length === 0 && (
          <div className="text-center text-gray-400 text-xs font-bold py-10">
            {chatMode === "ALL"
              ? "공용 채팅을 시작해보세요! 🎉"
              : "팀원과 1:1 귓속말을 시작해보세요! 💬"}
          </div>
        )}

        {displayMessages.map((msg, i) => (
          <div
            key={msg.id || i}
            className={`flex flex-col ${
              msg.isMe ? "items-end" : "items-start"
            } animate-fade-in-up`}
          >
            {!msg.isMe && (
              <span className="text-[10px] text-gray-400 font-bold mb-1 px-1">
                {msg.sender}
              </span>
            )}

            <div
              className={`max-w-[85%] p-3 rounded-lg text-[13px] shadow-sm leading-relaxed whitespace-pre-wrap break-words ${
                msg.isMe
                  ? "bg-green-600 text-white rounded-tr-none"
                  : "bg-white text-gray-800 border border-gray-200 rounded-tl-none"
              }`}
            >
              {msg.text}
            </div>

            <span className="text-[9px] text-gray-400 mt-1">{msg.time}</span>
          </div>
        ))}

        <div ref={endRef} />
      </div>

      <div className="p-3 bg-[#F8FAFC] border-t border-gray-200 shrink-0 flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap pl-1">
            수신:
          </span>

          <select
            value={chatMode}
            onChange={(e) => setChatMode(e.target.value)}
            className="w-full bg-white border border-gray-200 text-gray-700 text-[12px] font-bold rounded-lg px-2 py-1.5 outline-none focus:border-green-400 focus:bg-white transition-colors cursor-pointer"
          >
            <option value="ALL">📢 모두에게 (Public)</option>

            {teamMembers
              .filter((m) => String(m.userId) !== String(getMyUserId()))
              .map((member) => (
                <option key={member.userId} value={member.userId}>
                  👤 {member.nickname} 님에게 (DM)
                </option>
              ))}
          </select>
        </div>

        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg focus-within:border-green-400 px-3 py-2 transition-all">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 bg-transparent border-none outline-none text-[13px] placeholder-gray-400"
            placeholder={
              chatMode === "ALL"
                ? "모두에게 메시지 보내기..."
                : "귓속말 보내기..."
            }
          />

          <button
            onClick={handleSend}
            disabled={!chatInput.trim()}
            className={`cursor-pointer p-1.5 rounded-md transition-colors ${
              chatInput.trim()
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-gray-200 text-gray-400"
            }`}
          >
            <VscSend size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TeamIdeMain() {
  const params = useParams();
  const id = params?.id;

  const dispatch = useDispatch();

  const {
    activeActivity,
    isTerminalVisible,
    isSidebarVisible,
    isAgentVisible,
    isDebugMode,
    isRightPanelVisible,
  } = useSelector((state) => state.ui);

 const { workspaceId, activeProject, activeBranch } = useSelector(
  (state) => state.fileSystem,
);

  const [rightTab, setRightTab] = useState("chat");

  const [leftSidebarWidth, setLeftSidebarWidth] = useState(
    LEFT_SIDEBAR_DEFAULT_WIDTH,
  );
  const [rightPanelWidth, setRightPanelWidth] = useState(
    RIGHT_PANEL_DEFAULT_WIDTH,
  );
  const [terminalHeight, setTerminalHeight] = useState(
    TERMINAL_DEFAULT_HEIGHT,
  );

  useEffect(() => {
    const previousBranch = previousBranchRef.current;
    const nextBranch = activeBranch || "master";

    if (!activeProject || previousBranch === nextBranch) {
      previousBranchRef.current = nextBranch;
      return;
    }

    previousBranchRef.current = nextBranch;

    dispatch(closeAllFiles());
    dispatch(clearVirtualTree());

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("waivs:branch-context-changed", {
          detail: {
            workspaceId,
            projectName: activeProject,
            branchName: nextBranch,
            requestedAt: Date.now(),
          },
        }),
      );
    }
  }, [workspaceId, activeProject, activeBranch, dispatch]);

  const [resizingPanel, setResizingPanel] = useState(null);

  const editorLayoutRef = useRef(null);
  const previousBranchRef = useRef(activeBranch || "master");

  // 샌드박스(개인 레이어)가 켜져 있으면 화면을 어둡게 해서 "지금 고치는 것은 팀원에게
  // 안 보인다"는 것을 한눈에 알게 한다. 예전에는 브랜치 이름(focus-…)으로 가렸지만,
  // 샌드박스는 이제 브랜치가 아니라서 서버가 알려 준 켜짐 여부를 본다.
  const isSandboxMode = useSelector(
    (state) =>
      state.sandbox.enabled &&
      state.sandbox.scopeKey ===
        `${workspaceId}:${activeProject}:${activeBranch || "master"}`,
  );

  // 패널 사이 구분선. 샌드박스일 때는 남색으로 "지금 개인 레이어"임을 계속 보여 준다.
  const panelBorderClass = isSandboxMode ? "border-indigo-300" : "border-gray-200";

  const hasRightPanel = isAgentVisible || isDebugMode;
  const rightRailItems = isDebugMode
    ? [{ id: "debug", label: "디버그", icon: <VscDebugAlt size={20} /> }]
    : [
        { id: "ai", label: "AI 어시스트", icon: <VscSparkle size={20} /> },
        { id: "chat", label: "팀 채팅", icon: <VscCommentDiscussion size={20} /> },
      ];

  const openRightPanelTab = (tabId) => {
    if (tabId === "ai" || tabId === "chat") setRightTab(tabId);
    if (!isRightPanelVisible) dispatch(toggleRightPanel());
  };

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
  }, [resizingPanel]);

  useWorkspaceEntry(id);

  const renderMainContent = () => {
    switch (activeActivity) {
      case "docs":
        return <DevlogPanel />;

      case "api-test":
        return <ApiTesterPage />;

      case "mypage":
        return  <div className="flex-1 min-w-0 h-full overflow-y-auto bg-white">
                    <MyPageShell />
                  </div>

      case "git":
        return <GitDashboard />;

      case "editor":
      default:
        return (
          <div
            ref={editorLayoutRef}
            className={`flex-1 min-h-0 min-w-0 flex overflow-hidden transition-colors duration-300 ${
              isSandboxMode ? "bg-[#E0E7FF]" : "bg-[#f0f2f5]"
            }`}
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
                  ? `opacity-100 border-r ${panelBorderClass}`
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
                  className={`relative border-t bg-white shrink-0 z-[600] ${panelBorderClass}`}
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

            {/* 오른쪽 AI/채팅 패널. 접어도 언마운트하지 않는다 —
                팀 채팅 소켓과 메시지 상태가 CollaborationPanel 안에 있다. */}
            {hasRightPanel && (
              <div
                className={`relative overflow-hidden flex flex-col z-[600] shrink-0 bg-[#F8FAFC] ${
                  resizingPanel === "right"
                    ? "transition-none"
                    : "transition-[width,opacity] duration-200 ease-out"
                } ${
                  isRightPanelVisible
                    ? `opacity-100 border-l ${panelBorderClass}`
                    : "opacity-0"
                }`}
                style={{
                  width: isRightPanelVisible ? `${rightPanelWidth}px` : "0px",
                  maxWidth: RIGHT_PANEL_MAX_RATIO,
                }}
                aria-hidden={!isRightPanelVisible}
              >
                {isRightPanelVisible && (
                  <PanelResizeHandle
                    orientation="vertical"
                    edge="left"
                    active={resizingPanel === "right"}
                    title="AI/채팅 패널 너비 조절"
                    onPointerDown={startRightPanelResize}
                  />
                )}

                <div
                  className="h-full w-full flex flex-col bg-[#F8FAFC]"
                  style={{ minWidth: `${RIGHT_PANEL_MIN_WIDTH}px` }}
                >
                  {isDebugMode ? (
                    <DebugPanel />
                  ) : (
                    <div className="flex flex-col h-full">
                      <div className="flex items-center justify-between h-9 border-b border-gray-200 bg-[#F8FAFC] shrink-0 pl-1 pr-1.5">
                        <div className="flex h-full flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => setRightTab("ai")}
                            className={`flex items-center gap-1.5 h-full px-3 text-[12px] font-bold border-b-2 transition-colors ${
                              rightTab === "ai"
                                ? "border-[#5873F9] text-[#5873F9]"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                          >
                            <VscSparkle size={14} />
                            AI 어시스트
                          </button>

                          <button
                            type="button"
                            onClick={() => setRightTab("chat")}
                            className={`flex items-center gap-1.5 h-full px-3 text-[12px] font-bold border-b-2 transition-colors ${
                              rightTab === "chat"
                                ? "border-[#5873F9] text-[#5873F9]"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                          >
                            <VscCommentDiscussion size={14} />
                            팀 채팅
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => dispatch(toggleRightPanel())}
                          className="shrink-0 p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                          title="패널 접기"
                          aria-label="AI/채팅 패널 접기"
                        >
                          <VscChevronRight size={16} />
                        </button>
                      </div>

                      <div className="flex-1 min-h-0 overflow-hidden relative bg-[#F8FAFC]">
                        <div
                          className={`absolute inset-0 ${
                            rightTab === "ai" ? "block" : "hidden"
                          }`}
                        >
                          <AgentPanel />
                        </div>

                        <div
                          className={`absolute inset-0 ${
                            rightTab === "chat" ? "block" : "hidden"
                          }`}
                        >
                          <CollaborationPanel workspaceId={workspaceId} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 오른쪽 패널을 접었을 때의 세로 아이콘 바 */}
            {hasRightPanel && !isRightPanelVisible && (
              <RightPanelRail
                items={rightRailItems}
                activeId={isDebugMode ? "debug" : rightTab}
                onSelect={openRightPanelTab}
              />
            )}
          </div>
        );
    }
  };

  return (
    <div
      className={`w-full h-full flex-1 min-h-0 min-w-0 flex flex-col text-[#333] overflow-hidden font-sans transition-colors duration-700 ${
        isSandboxMode ? "bg-[#E0E7FF]" : "bg-white"
      }`}
    >
      <CommandPalette />

      <MenuBar mode="team" />

      <div className="flex-1 min-h-0 flex overflow-hidden">
        <ActivityBar />
        {renderMainContent()}
      </div>

      {/* 안전 실행 상태바. 알림을 받아 주는 소켓이 탐색기(Sidebar)에 있어서,
          탐색기가 떠 있는 편집 화면에서만 보여 준다. 다른 화면에서는 값이 멈춘다. */}
      {!["docs", "api-test", "mypage", "git"].includes(activeActivity) && (
        <SafeRunStatusBar />
      )}

      <CreateProjectModal />
      <WebPreview />
    </div>
  );
}