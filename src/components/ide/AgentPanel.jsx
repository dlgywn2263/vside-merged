"use client";

import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { VscSend, VscTrash, VscLoading, VscSparkle } from "react-icons/vsc";

import { addAgentMessage, clearAgentMessages } from "@/store/slices/uiSlice";
import { setAiSuggestion } from "@/store/slices/fileSystemSlice";
import { fetchAiAssistApi } from "@/lib/ide/api";

export default function AgentPanel() {
  const dispatch = useDispatch();

  const { agentMessages, selectedText } = useSelector((state) => state.ui);
  const {
    workspaceId,
    activeProject,
    activeBranch,
    activeFileId,
    fileContents,
  } = useSelector((state) => state.fileSystem);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleFocusChat = () => {
      if (inputRef.current) inputRef.current.focus();
    };

    window.addEventListener("focusAgentPanel", handleFocusChat);
    return () => window.removeEventListener("focusAgentPanel", handleFocusChat);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agentMessages, isLoading]);

  const handleSend = async (customQuery = null) => {
    const textToSend = typeof customQuery === "string" ? customQuery : input;
    if (!textToSend.trim() || isLoading) return;

    setInput("");
    dispatch(addAgentMessage({ role: "user", content: textToSend }));
    setIsLoading(true);

    try {
      let finalQuery = textToSend;

      let strictRule =
        "\n\n(명령어: 답변은 마크다운 불릿(-)으로 3문장 이내로 핵심만 요약해. 코드 수정/리팩토링이면 suggestedCode 필드에 수정된 파일 전체 코드를 넣고, 단순 질문이면 빈 문자열로 둬.)";

      if (selectedText && selectedText.trim() !== "") {
        finalQuery = `[사용자가 현재 선택(드래그)한 타겟 코드]\n${selectedText}\n\n[사용자 요청 사항]\n${textToSend}`;
        strictRule =
          '\n\n(🚨 CRITICAL RULE: DO NOT output raw Java code directly! You MUST wrap your response strictly in the requested JSON format { "explanation": "...", "suggestedCode": "..." }. If you output raw code outside of JSON, the server will crash!)';
      }

      const response = await fetchAiAssistApi({
        workspaceId,
        projectName: activeProject,
        branchName: activeBranch || "master",
        filePath: activeFileId || "선택된 파일 없음",
        userQuery: finalQuery + strictRule,
        currentCode:
          activeFileId && fileContents[activeFileId]
            ? fileContents[activeFileId]
            : "",
      });

      if (response.success) {
        dispatch(
          addAgentMessage({ role: "ai", content: response.explanation }),
        );

        if (
          response.suggestedCode &&
          response.suggestedCode.trim() !== "" &&
          activeFileId
        ) {
          dispatch(
            setAiSuggestion({
              originalCode: fileContents[activeFileId],
              suggestedCode: response.suggestedCode,
              targetPath: activeFileId,
              explanation: "채팅 요청에 따른 코드 수정 제안",
            }),
          );
        }
      } else {
        dispatch(
          addAgentMessage({
            role: "ai",
            content: "❌ 에러: " + response.explanation,
          }),
        );
      }
    } catch {
      dispatch(
        addAgentMessage({
          role: "ai",
          content: "❌ 서버와 연결할 수 없습니다. 통신 실패.",
        }),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const suggestionButtons = [
    { icon: "📝", text: "선택한 코드 설명해줘" },
    { icon: "✨", text: "리팩토링 해줘" },
    { icon: "🐛", text: "버그 찾아서 고쳐줘" },
  ];

  return (
    <div className="h-full bg-white flex flex-col font-sans border-l border-gray-200">
      <div className="h-9 px-4 flex items-center justify-between text-[13px] font-bold text-gray-800 bg-[#f8f9fa] border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-blue-600 text-lg font-black">A</span>
          <span>AI 코드 어시스트</span>
        </div>
        <button
          onClick={() => dispatch(clearAgentMessages())}
          className="text-gray-400 hover:text-red-500 transition-colors"
          title="채팅 내역 지우기"
        >
          <VscTrash size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-[#fbfbfc]">
        {agentMessages.length === 0 ? (
          <div className="flex flex-col gap-2 mt-2 animate-fade-in">
            <div className="text-xs text-gray-500 mb-4 px-1">
              <strong>AI 어시스트</strong>
              <br />
              코드 블록을 드래그한 후 질문해 보세요!
            </div>

            {suggestionButtons.map((btn, idx) => (
              <button
                key={idx}
                className="bg-white border border-gray-200 p-2.5 rounded text-left text-[13px] text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-all flex items-center gap-2 shadow-sm"
                onClick={() => handleSend(btn.text)}
              >
                <span>{btn.icon}</span> {btn.text}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {agentMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${
                  msg.role === "user" ? "items-end" : "items-start"
                } animate-fade-in-up`}
              >
                <div
                  className={`max-w-[90%] p-3 rounded-lg text-[13px] shadow-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "ai"
                      ? "bg-white text-gray-800 border border-gray-200 rounded-tl-none"
                      : "bg-blue-600 text-white rounded-tr-none"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start animate-fade-in">
                <div className="max-w-[90%] p-3 rounded-lg bg-white border border-gray-200 rounded-tl-none shadow-sm flex items-center gap-2 text-blue-500 text-[13px]">
                  <VscLoading className="animate-spin" /> AI가 코드를 분석
                  중입니다...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="p-3 bg-white border-t border-gray-200 shrink-0">
        <div className="flex flex-col gap-2">
          {selectedText && selectedText.trim() !== "" && (
            <div className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1.5 rounded flex items-center gap-1.5 truncate shadow-sm">
              <VscSparkle className="shrink-0" />
              <span className="truncate">
                선택된 타겟 코드 ({selectedText.split("\n").length}줄) 감지됨
              </span>
            </div>
          )}

          <div className="flex flex-col gap-2 bg-white border border-gray-300 rounded-lg focus-within:border-blue-500 px-3 py-2 transition-all shadow-inner">
            <textarea
              ref={inputRef}
              className="w-full bg-transparent border-none outline-none text-gray-800 text-[13px] placeholder-gray-400 resize-none h-[40px] custom-scrollbar"
              placeholder="선택한 코드에 대해 질문하기..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={isLoading}
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-[10px] text-gray-400 font-bold">
                에디터에서 Ctrl+L 을 누르면 커서가 이동합니다.
              </span>
              <button
                disabled={isLoading || !input.trim()}
                className={`cursor-pointer p-1.5 rounded-md transition-colors ${
                  input.trim()
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-100 text-gray-400"
                }`}
                onClick={() => handleSend()}
              >
                <VscSend size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
