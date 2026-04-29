"use client";

import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "next/navigation";
import { VscSend } from "react-icons/vsc";

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

// 💡 [추가] 우리가 만든 개발일지 패널 임포트!
import DevlogPanel from "@/components/ide/DevlogPanel";

// 전체 화면을 덮을 페이지형 모달 및 웹 미리보기 창 임포트
import CreateProjectModal from "@/components/ide/CreateProjectModal";
import WebPreview from "@/components/ide/WebPreview";

import {
  fetchWorkspaceProjectsApi,
  fetchChatHistoryApi,
  getUserProfileApi,
  getWorkspaceMembersApi,
} from "@/lib/ide/api";
import { ChatSocket } from "@/lib/ide/chatSocket";
import { useAuth } from "@/lib/ide/AuthContext";

import {
  setWorkspaceTree,
  setWorkspaceId,
  setProjectList,
  closeAllFiles,
} from "@/store/slices/fileSystemSlice";

// const ApiTesterPage = () => (
//   <div className="flex-1 flex items-center justify-center text-gray-500 font-bold">
//     API Test Panel
//   </div>
// );
const MyPagePanel = () => (
  <div className="flex-1 flex items-center justify-center text-gray-500 font-bold">
    My Page Panel
  </div>
);

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

  useEffect(() => {
    if (!workspaceId || !user || !user.id) return;

    getUserProfileApi(user.id).then(setMyProfile).catch(console.error);
    getWorkspaceMembersApi(workspaceId)
      .then(setTeamMembers)
      .catch(console.error);

    fetchChatHistoryApi(workspaceId, user.id)
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
          isMe: String(msg.senderId) === String(user.id),
          type: msg.type,
        }));
        setMessages(formatted);
      })
      .catch((err) => console.error("이전 채팅 불러오기 실패:", err));

    ChatSocket.connect(workspaceId, user.id, (newMessage) => {
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
            isMe: String(newMessage.senderId) === String(user.id),
            type: newMessage.type,
          },
        ];
      });
    });

    return () => {
      ChatSocket.disconnect();
    };
  }, [workspaceId, user?.id]);

  const handleSend = () => {
    if (!chatInput.trim() || !workspaceId || !user) return;

    const actualName =
      myProfile?.nickname ||
      user.nickname ||
      (user.email ? user.email.split("@")[0] : "팀원");

    const receiver = chatMode === "ALL" ? null : Number(chatMode);

    const messageData = {
      workspaceId,
      senderId: user.id,
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
    const myId = String(user.id);
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
              className={`max-w-[85%] p-3 rounded-lg text-[13px] shadow-sm leading-relaxed whitespace-pre-wrap break-words
              ${
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
              .filter((m) => String(m.userId) !== String(user?.id))
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
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
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
  } = useSelector((state) => state.ui);

  const { workspaceId, activeBranch } = useSelector(
    (state) => state.fileSystem,
  );

  const [rightTab, setRightTab] = useState("chat");

  const isSandboxMode = activeBranch?.startsWith("focus/");

  useEffect(() => {
    if (!id) return;

    dispatch(closeAllFiles());
    dispatch(setWorkspaceId(id));

    fetchWorkspaceProjectsApi(id)
      .then((root) => {
        dispatch(setWorkspaceTree(root));
        if (root.children) {
          dispatch(setProjectList(root.children));
        }
      })
      .catch(console.error);
  }, [id, dispatch]);

  const renderMainContent = () => {
    switch (activeActivity) {
      case "docs":
        // 💡 [핵심] 기존 DocsPanel 껍데기를 버리고 방금 만든 DevlogPanel을 반환합니다!
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
          <div className="flex-1 flex overflow-hidden">
            {isSidebarVisible && (
              <div
                className={`w-[260px] shrink-0 border-r flex flex-col transition-colors duration-700 ${
                  isSandboxMode
                    ? "bg-slate-900 border-indigo-900/50"
                    : "bg-[#f8f9fa] border-gray-200"
                }`}
              >
                <Sidebar />
              </div>
            )}

            <div className="flex-1 flex flex-col min-w-0 bg-white">
              <FileTabs />
              <div className="flex-1 flex relative overflow-hidden">
                <div className="flex-1 flex flex-col min-w-0 relative">
                  <CodeEditor />
                  <CodeMap />
                </div>
              </div>
              {isTerminalVisible && (
                <div className="h-[250px] border-t border-gray-200 bg-white shrink-0 z-[600]">
                  <BottomPanel />
                </div>
              )}
            </div>

            {(isAgentVisible || isDebugMode) && (
              <div
                className={`w-[320px] shrink-0 border-l flex flex-col z-[600] transition-colors duration-700 ${
                  isSandboxMode
                    ? "bg-slate-900 border-indigo-900/50"
                    : "bg-[#f8f9fa] border-gray-200"
                }`}
              >
                {isDebugMode ? (
                  <DebugPanel />
                ) : (
                  <div className="flex flex-col h-full">
                    <div
                      className={`flex items-center h-10 border-b shrink-0 transition-colors duration-700 ${
                        isSandboxMode
                          ? "bg-slate-900 border-indigo-900/50"
                          : "bg-[#f8f9fa] border-gray-200"
                      }`}
                    >
                      <button
                        onClick={() => setRightTab("ai")}
                        className={`flex-1 h-full text-[12px] font-bold transition-colors ${
                          rightTab === "ai"
                            ? isSandboxMode
                              ? "text-indigo-400 bg-white border-t-2 border-t-indigo-500"
                              : "text-blue-600 bg-white border-t-2 border-t-blue-600"
                            : "text-gray-500 hover:bg-gray-100"
                        }`}
                      >
                        AI 어시스트
                      </button>
                      <button
                        onClick={() => setRightTab("chat")}
                        className={`flex-1 h-full text-[12px] font-bold transition-colors ${
                          rightTab === "chat"
                            ? isSandboxMode
                              ? "text-indigo-400 bg-white border-t-2 border-t-indigo-500"
                              : "text-green-600 bg-white border-t-2 border-t-green-600"
                            : "text-gray-500 hover:bg-gray-100"
                        }`}
                      >
                        팀 채팅
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
            )}
          </div>
        );
    }
  };

  return (
    <div
      className={`h-screen w-screen flex flex-col text-[#333] overflow-hidden font-sans transition-colors duration-700 ${
        isSandboxMode ? "bg-slate-900" : "bg-white"
      }`}
    >
      <CommandPalette />

      <MenuBar mode="team" />
      <div className="flex-1 flex overflow-hidden">
        <ActivityBar />
        {renderMainContent()}
      </div>

      {/* 여기에 모달이 렌더링되면 화면 전체를 덮게 됩니다! */}
      <CreateProjectModal />

      {/* 팀 워크스페이스용 플로팅 웹 미리보기 창 장착 완료! */}
      <WebPreview />
    </div>
  );
}
