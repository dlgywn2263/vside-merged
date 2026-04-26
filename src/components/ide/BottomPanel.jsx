"use client";

import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
// 💡 VscGlobe 아이콘 추가 임포트
import { VscAdd, VscChromeClose, VscTrash, VscGlobe } from "react-icons/vsc";

import {
  setActiveBottomTab,
  toggleTerminal,
  writeToTerminal,
  setIsPreviewVisible,
  setPreviewUrl,
} from "@/store/slices/uiSlice";
import { RunSocket } from "@/lib/ide/runSocket";
import { DebugSocket } from "@/lib/ide/debugSocket";
import Terminal from "@/components/ide/Terminal";

export default function BottomPanel() {
  const dispatch = useDispatch();
  // 💡 previewUrl 상태를 가져오도록 추가
  const { activeBottomTab, terminalOutput, isRunning, isDebugMode, previewUrl } =
    useSelector((state) => state.ui);

  const [outputContent, setOutputContent] = useState("");
  const [runInput, setRunInput] = useState("");
  const outputEndRef = useRef(null);

  useEffect(() => {
    if (terminalOutput) {
      if (terminalOutput.text === "__CLEAR__") {
        setOutputContent("");
      } else {
        setOutputContent((prev) => prev + terminalOutput.text);
        
        // 포트 감지 자동 팝업 로직
        if (terminalOutput.text.includes("[SERVER_STARTED_PORT:")) {
          const match = terminalOutput.text.match(/\[SERVER_STARTED_PORT:(\d+)\]/);
          if (match && match[1]) {
            const port = match[1];
            dispatch(setPreviewUrl(`http://localhost:${port}`));
            dispatch(setIsPreviewVisible(true));
          }
        }
      }
    }
  }, [terminalOutput, dispatch]);

  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [outputContent]);

  const handleRunInput = (e) => {
    if (e.key === "Enter") {
      dispatch(writeToTerminal(runInput + "\n"));
      if (isDebugMode) DebugSocket.sendInput(runInput);
      else if (isRunning) RunSocket.sendInput(runInput);
      setRunInput("");
    }
  };

  return (
    <div className="h-full flex flex-col bg-white font-sans text-[#333]">
      <div className="flex items-center justify-between bg-white h-9 border-b border-gray-200 select-none px-4">
        <div className="flex gap-5 h-full">
          {["TERMINAL", "OUTPUT"].map((tab) => {
            const id = tab.toLowerCase();
            const isActive = activeBottomTab === id;

            return (
              <button
                key={id}
                className={`h-full flex items-center text-[11px] font-medium border-b-[2px] transition-colors outline-none px-1 uppercase tracking-wide ${
                  isActive
                    ? "border-gray-800 text-gray-800 font-bold"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
                onClick={() => dispatch(setActiveBottomTab(id))}
              >
                {tab}
              </button>
            );
          })}
        </div>

        <div className="flex gap-3 items-center">
          {/* 💡 [NEW] 미리보기 다시 열기 버튼 */}
          <VscGlobe
            className="text-gray-500 hover:text-blue-600 cursor-pointer w-4 h-4 transition-colors"
            onClick={() => {
              if (!previewUrl) {
                alert("아직 실행된 웹 서버가 없습니다. 코드를 먼저 실행해주세요!");
                return;
              }
              dispatch(setIsPreviewVisible(true));
            }}
            title="웹 미리보기 창 다시 열기"
          />
          <div className="w-[1px] h-3 bg-gray-300 mx-1"></div> {/* 구분선 */}
          
          <VscAdd
            className="text-gray-500 hover:text-black cursor-pointer w-4 h-4 transition-colors"
            title="New Terminal"
          />
          <VscTrash
            className="text-gray-500 hover:text-black cursor-pointer w-4 h-4 transition-colors"
            onClick={() => setOutputContent("")}
            title="Clear Output"
          />
          <VscChromeClose
            className="text-gray-500 hover:text-black cursor-pointer w-4 h-4 transition-colors"
            onClick={() => dispatch(toggleTerminal())}
            title="Close Panel"
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative bg-white">
        <div
          className={`h-full flex flex-col p-2 ${
            activeBottomTab === "output" ? "flex" : "hidden"
          }`}
        >
          <div className="flex-1 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-[#333]">
            {outputContent || (
              <span className="text-gray-400 italic pl-1">
                Run code to see output...
              </span>
            )}
            <div ref={outputEndRef} />
          </div>

          {(isRunning || isDebugMode) && (
            <div className="flex items-center border-t border-gray-100 pt-2 mt-1">
              <span className="text-blue-600 mr-2 text-xs font-mono font-bold">
                ❯
              </span>
              <input
                className="flex-1 bg-transparent outline-none text-[#333] text-xs font-mono placeholder-gray-300"
                value={runInput}
                onChange={(e) => setRunInput(e.target.value)}
                onKeyDown={handleRunInput}
                autoFocus
                placeholder="입력을 기다리는 중..."
              />
            </div>
          )}
        </div>

        <div
          className={`h-full w-full ${
            activeBottomTab === "terminal" ? "block" : "hidden"
          }`}
        >
          <Terminal />
        </div>
      </div>
    </div>
  );
}