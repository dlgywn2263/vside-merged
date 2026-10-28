"use client";

import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { VscAdd, VscChromeClose, VscTrash, VscGlobe } from "react-icons/vsc";
import {
  setActiveBottomTab,
  toggleTerminal,
  writeToTerminal,
  setIsPreviewVisible,
  setPreviewUrl,
  setGuiPreviewUrl,
  setGuiAppReady,
} from "@/store/slices/uiSlice";
import { RunSocket } from "@/lib/ide/runSocket";
import { DebugSocket } from "@/lib/ide/debugSocket";
import Terminal from "@/components/ide/Terminal";
import { SafeRunVersionPanel } from "@/components/ide/SafeRunStatusBar";
import { buildGuiPreviewUrl } from "@/lib/ide/previewUrl";

// isSandboxMode 는 팀 셸만 넘긴다. 헤더만 연한 에메랄드로 칠해 에디터와 같은 작업 영역임을 보이고,
// 출력·터미널 본문은 읽기 쉽도록 흰 바탕 그대로 둔다.
export default function BottomPanel({ isSandboxMode = false }) {
  const dispatch = useDispatch();
  const { activeBottomTab, terminalOutput, isRunning, isDebugMode, previewUrl } =
    useSelector((state) => state.ui);
  const [outputContent, setOutputContent] = useState("");
  const [runInput, setRunInput] = useState("");
  const outputEndRef = useRef(null);
  const pendingPreviewUrlRef = useRef(null);
  const { workspaceId, activeProject, activeBranch } = useSelector((state) => state.fileSystem);
  const safeRunStatus = useSelector((state) => state.safeRun.status);
  const branchName = activeBranch || "master";
  const currentStatus = safeRunStatus && activeProject &&
    safeRunStatus.projectName === activeProject && safeRunStatus.branchName === branchName
    ? safeRunStatus : null;
  const brokenCount = currentStatus?.brokenFiles?.length || 0;

  useEffect(() => {
    if (!terminalOutput) return;
    const text = terminalOutput.text || "";
    if (text === "__CLEAR__") {
      setOutputContent("");
      pendingPreviewUrlRef.current = null;
      return;
    }
    setOutputContent((prev) => prev + text);

    if (text.includes("[SERVER_STARTED_PORT:")) {
      const match = text.match(/\[SERVER_STARTED_PORT:(\d+)\]/);
      if (match && match[1]) {
        const url = `http://localhost:${match[1]}`;
        pendingPreviewUrlRef.current = url;
        dispatch(setPreviewUrl(url));
      }
    }
    if (text.includes("[GUI_STARTED_PORT:")) {
      const match = text.match(/\[GUI_STARTED_PORT:(\d+)\]/);
      if (match && match[1]) {
        dispatch(setGuiPreviewUrl(buildGuiPreviewUrl(match[1])));
        dispatch(setIsPreviewVisible(true));
      }
    }
    const isServerReady =
      text.includes("ready in") ||
      text.includes("Ready in") ||
      text.includes("Local:") ||
      text.includes("VITE") ||
      text.includes("Compiled") ||
      text.includes("compiled") ||
      text.includes("Tomcat started on port") ||
      text.includes("Started");

    if (isServerReady) dispatch(setGuiAppReady(true));
    if (pendingPreviewUrlRef.current && isServerReady) {
      dispatch(setPreviewUrl(pendingPreviewUrlRef.current));
      dispatch(setIsPreviewVisible(true));
      pendingPreviewUrlRef.current = null;
    }
  }, [terminalOutput, dispatch]);

  useEffect(() => {
    if (activeBottomTab === "output") outputEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [outputContent, activeBottomTab]);

  const handleRunInput = (e) => {
    if (e.key === "Enter") {
      dispatch(writeToTerminal(runInput + "\n"));
      if (isDebugMode) DebugSocket.sendInput(runInput);
      else if (isRunning) RunSocket.sendInput(runInput);
      setRunInput("");
    }
  };

  const tabs = [
    { id: "terminal", label: "TERMINAL" },
    { id: "output", label: "OUTPUT" },
    { id: "run-version", label: "실행 버전" },
  ];

  return (
    <div className="h-full flex flex-col bg-white font-sans text-[#333]">
      <div className={`flex items-center justify-between gap-2 h-9 border-b select-none pl-3 pr-1.5 shrink-0 ${
        isSandboxMode ? "bg-[#D1FAE5] border-[#6EE7B7]" : "bg-[#fafbfc] border-gray-200"
      }`}>
        <div className="flex gap-4 h-full min-w-0 overflow-x-auto overflow-y-hidden">
          {tabs.map((tab) => {
            const isActive = activeBottomTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`h-full shrink-0 flex items-center gap-1.5 text-[11px] font-medium border-b-[2px] transition-colors outline-none px-1 tracking-wide ${
                  isActive
                    ? isSandboxMode
                      ? "border-[#059669] text-[#065F46] font-bold"
                      : "border-[#5873F9] text-gray-800 font-bold"
                    : isSandboxMode
                      ? "border-transparent text-slate-600 hover:text-[#065F46]"
                      : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
                onClick={() => dispatch(setActiveBottomTab(tab.id))}
              >
                {tab.label}
                {tab.id === "run-version" && brokenCount > 0 && (
                  <span className="rounded-full bg-rose-100 px-1.5 text-[10px] font-bold text-rose-700" title={`문법 오류 파일 ${brokenCount}개`}>
                    {brokenCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex gap-0.5 items-center shrink-0">
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition-colors"
            onClick={() => {
              if (!previewUrl) {
                alert("아직 실행된 웹 서버가 없습니다. 코드를 먼저 실행해주세요!");
                return;
              }
              dispatch(setIsPreviewVisible(true));
            }}
            title="웹 미리보기 창 다시 열기"
            aria-label="웹 미리보기 창 다시 열기"
          ><VscGlobe size={16} /></button>
          <div className="w-px h-3.5 bg-gray-200 mx-1" />
          <span className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-gray-100"><VscAdd className="text-gray-500 hover:text-black cursor-pointer w-4 h-4 transition-colors" title="New Terminal" /></span>
          <button type="button" className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-gray-100" onClick={() => setOutputContent("")} title="Clear Output" aria-label="Clear Output">
            <VscTrash className="text-gray-500 hover:text-black w-4 h-4 transition-colors" />
          </button>
          <button type="button" className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-gray-100" onClick={() => dispatch(toggleTerminal())} title="Close Panel" aria-label="Close Panel">
            <VscChromeClose className="text-gray-500 hover:text-black w-4 h-4 transition-colors" />
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden relative bg-white">
        <div className={`h-full flex-col p-2 ${activeBottomTab === "output" ? "flex" : "hidden"}`}>
          <div className="flex-1 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-[#333]">
            {outputContent || <span className="text-gray-400 italic pl-1">Run code to see output...</span>}
            <div ref={outputEndRef} />
          </div>
          {(isRunning || isDebugMode) && (
            <div className="flex items-center border-t border-gray-100 pt-2 mt-1">
              <span className="text-blue-600 mr-2 text-xs font-mono font-bold">❯</span>
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
        {/* Terminal은 탭 이동 시 언마운트하지 않아 기존 소켓 세션을 유지한다. */}
        <div className={`h-full w-full ${activeBottomTab === "terminal" ? "block" : "hidden"}`}>
          <Terminal />
        </div>
        {activeBottomTab === "run-version" && <SafeRunVersionPanel />}
      </div>
    </div>
  );
}
