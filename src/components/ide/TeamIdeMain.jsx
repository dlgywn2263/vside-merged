"use client";

import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "next/navigation";
import { VscSend, VscChevronLeft, VscChevronRight } from "react-icons/vsc";

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
import SafeRunStatusBar from "@/components/ide/SafeRunStatusBar";

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
import { toggleSidebar, toggleRightPanel } from "@/store/slices/uiSlice";

const MyPagePanel = () => (
  <div className="flex-1 flex items-center justify-center text-gray-500 font-bold">
    My Page Panel
  </div>
);

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
    <div className="flex flex-col h-full bg-white font-sans">
      <div className="flex-1 overflow-y-auto p-4 bg-[#fbfbfc] space-y-4 custom-scrollbar">
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

      <div className="p-3 bg-white border-t border-gray-200 shrink-0 flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap pl-1">
            수신:
          </span>

          <select
            value={chatMode}
            onChange={(e) => setChatMode(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-[12px] font-bold rounded-lg px-2 py-1.5 outline-none focus:border-green-400 focus:bg-white transition-colors cursor-pointer"
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

        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg focus-within:border-green-400 focus-within:bg-white px-3 py-2 transition-all shadow-inner">
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

  useWorkspaceEntry(id);

  const renderMainContent = () => {
    switch (activeActivity) {
      case "docs":
        return <DevlogPanel />;

      case "api-test":
        return <ApiTesterPage />;

      case "mypage":
        return <MyPagePanel />;

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
              className={`relative rounded-2xl shadow-sm overflow-hidden flex flex-col shrink-0 ${
                resizingPanel === "left"
                  ? "transition-none"
                  : "transition-all duration-300 ease-in-out"
              } ${
                isSandboxMode
                  ? "bg-slate-900 border border-indigo-900/50"
                  : "bg-white border border-gray-200"
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

            {/* 탐색기가 닫혀 있을 때 열기 버튼 */}
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

            {/* 우측 패널이 닫혀 있을 때 열기 버튼 */}
            {(isAgentVisible || isDebugMode) && !isRightPanelVisible && (
              <div className="relative flex items-center justify-center -mr-4 z-10 w-0">
                <button
                  onClick={() => dispatch(toggleRightPanel())}
                  className="w-6 h-6 bg-white border border-gray-300 rounded-full flex items-center justify-center shadow-md text-gray-500 hover:text-blue-600 hover:scale-110 transition-all z-20"
                  title="AI/채팅창 열기"
                >
                  <VscChevronLeft size={14} />
                </button>
              </div>
            )}

            {/* 오른쪽 AI/채팅 패널 */}
            {(isAgentVisible || isDebugMode) && (
              <div
                className={`relative rounded-2xl shadow-sm overflow-hidden flex flex-col z-[600] shrink-0 ${
                  resizingPanel === "right"
                    ? "transition-none"
                    : "transition-all duration-300 ease-in-out"
                } ${
                  isSandboxMode
                    ? "bg-slate-900 border border-indigo-900/50"
                    : "bg-white border border-gray-200"
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
                    title="AI/채팅 패널 너비 조절"
                    onPointerDown={startRightPanelResize}
                    className="absolute left-0 top-0 z-[700] h-full w-3 -translate-x-1/2 cursor-col-resize touch-none"
                  >
                    <div className="mx-auto h-full w-px bg-transparent transition hover:bg-blue-400" />
                  </div>
                )}

                <div
                  className="h-full flex flex-col shrink-0 bg-white"
                  style={{
                    width: `${rightPanelWidth}px`,
                  }}
                >
                  {isDebugMode ? (
                    <DebugPanel />
                  ) : (
                    <div className="flex flex-col h-full">
                      <div
                        className={`flex items-center justify-between h-11 border-b shrink-0 transition-colors duration-700 px-2 pt-1 ${
                          isSandboxMode
                            ? "bg-slate-900 border-indigo-900/50"
                            : "bg-[#f8f9fa] border-gray-200"
                        }`}
                      >
                        <div className="flex h-full flex-1">
                          <button
                            onClick={() => setRightTab("ai")}
                            className={`flex-1 h-full text-[13px] font-bold transition-colors rounded-t-lg ${
                              rightTab === "ai"
                                ? isSandboxMode
                                  ? "text-indigo-400 bg-white shadow-sm"
                                  : "text-blue-600 bg-white shadow-[0_-2px_5px_rgba(0,0,0,0.03)]"
                                : "text-gray-500 hover:bg-gray-100"
                            }`}
                          >
                            AI 어시스트
                          </button>

                          <button
                            onClick={() => setRightTab("chat")}
                            className={`flex-1 h-full text-[13px] font-bold transition-colors rounded-t-lg ${
                              rightTab === "chat"
                                ? isSandboxMode
                                  ? "text-indigo-400 bg-white shadow-sm"
                                  : "text-green-600 bg-white shadow-[0_-2px_5px_rgba(0,0,0,0.03)]"
                                : "text-gray-500 hover:bg-gray-100"
                            }`}
                          >
                            팀 채팅
                          </button>
                        </div>

                        <button
                          onClick={() => dispatch(toggleRightPanel())}
                          className="mb-1 ml-2 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-all"
                          title="패널 닫기"
                        >
                          <VscChevronRight size={18} />
                        </button>
                      </div>

                      <div className="flex-1 overflow-hidden relative bg-white">
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
          </div>
        );
    }
  };

  return (
    <div
      className={`w-full h-[calc(100vh-61px)] flex flex-col text-[#333] overflow-hidden font-sans transition-colors duration-700 ${
        isSandboxMode ? "bg-slate-900" : "bg-white"
      }`}
    >
      <CommandPalette />

      <MenuBar mode="team" />

      <div className="flex-1 flex overflow-hidden">
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