"use client";

import React from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  VscDebugDisconnect,
  VscDebugStart,
  VscDebugStepInto,
  VscDebugStepOver,
  VscClose,
} from "react-icons/vsc";

import {
  setDebugMode,
  writeToTerminal,
  setCurrentDebugLine,
  updateDebugVariables,
} from "@/store/slices/uiSlice";
import { DebugSocket } from "@/lib/ide/debugSocket";

const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE_URL || "ws://localhost:8080";

export default function DebugPanel() {
  const dispatch = useDispatch();

  const { debugVariables, debugLine, isDebugMode, breakpoints } = useSelector(
    (state) => state.ui,
  );
  const { workspaceId, activeProject, activeBranch, activeFileId } =
    useSelector((state) => state.fileSystem);

  const handleClose = () => {
    dispatch(setDebugMode(false));
    dispatch(setCurrentDebugLine(null));
    dispatch(updateDebugVariables({}));

    if (DebugSocket && typeof DebugSocket.stopDebug === "function") {
      DebugSocket.stopDebug();
    }

    dispatch(writeToTerminal("[System] 디버깅을 중지하고 패널을 닫습니다.\n"));
  };

  const handleStartDebug = () => {
    if (!workspaceId || !activeProject) {
      alert("디버깅할 프로젝트를 먼저 선택해주세요.");
      return;
    }

    dispatch(setDebugMode(true));
    dispatch(
      writeToTerminal("[System] 백엔드 디버거와 연결을 시도합니다...\n"),
    );

    DebugSocket.connect(
      `${WS_BASE}/ws/debug`,
      () => {
        dispatch(
          writeToTerminal("[System] 디버거 연결 성공! 디버깅을 시작합니다.\n"),
        );
        DebugSocket.startDebug(
          workspaceId,
          activeProject,
          activeBranch || "master",
          activeFileId || "",
          breakpoints,
        );
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
        dispatch(setDebugMode(false));
        dispatch(setCurrentDebugLine(null));
        dispatch(updateDebugVariables({}));
        dispatch(writeToTerminal("[System] 디버거 연결이 종료되었습니다.\n"));
      },
    );
  };

  return (
    <div className="h-full w-full bg-white flex flex-col text-gray-800 font-sans">
      <div className="h-9 px-4 flex items-center justify-between text-xs font-bold uppercase tracking-wide border-b border-gray-200 bg-[#f8f9fa]">
        <span className="text-gray-700">Run &amp; Debug</span>
        <button
          onClick={handleClose}
          className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-red-500 transition-colors"
          title="디버그 패널 닫기"
        >
          <VscClose size={16} />
        </button>
      </div>

      <div className="p-4 bg-white border-b border-gray-200">
        {isDebugMode ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-orange-600 text-xs font-semibold">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
              Debugging Active...
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  if (DebugSocket) DebugSocket.stepOver();
                }}
                className="flex-1 flex justify-center items-center py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 transition-colors"
                title="Step Over (F10)"
              >
                <VscDebugStepOver size={16} />
              </button>
              <button
                onClick={() => {
                  if (DebugSocket) DebugSocket.stepInto();
                }}
                className="flex-1 flex justify-center items-center py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 transition-colors"
                title="Step Into (F11)"
              >
                <VscDebugStepInto size={16} />
              </button>
              <button
                onClick={handleClose}
                className="flex-1 flex justify-center items-center py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded border border-red-200 transition-colors"
                title="Stop Debugging (Shift+F5)"
              >
                <VscDebugDisconnect size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="text-xs text-gray-500">
              No active debug session.
            </div>
            <button
              onClick={handleStartDebug}
              className="w-full flex items-center justify-center gap-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded transition-colors"
            >
              <VscDebugStart size={14} /> Start Debugging
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <div className="px-3 py-1.5 bg-gray-100 text-xs font-bold text-gray-600 mt-2 border-y border-gray-200">
          VARIABLES
        </div>
        <div className="p-2 space-y-1">
          {Object.keys(debugVariables).length === 0 ? (
            <div className="text-xs text-gray-400 italic pl-2">
              No variables available
            </div>
          ) : (
            Object.entries(debugVariables).map(([key, value]) => (
              <div
                key={key}
                className="flex text-xs hover:bg-blue-50 px-2 py-1 rounded cursor-default"
              >
                <span className="text-blue-600 mr-2 font-medium">{key}:</span>
                <span className="text-gray-700 truncate">
                  {value != null ? value.toString() : "null"}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="px-3 py-1.5 bg-gray-100 text-xs font-bold text-gray-600 mt-4 border-y border-gray-200">
          CALL STACK
        </div>
        <div className="p-2 space-y-1">
          {debugLine ? (
            <div className="text-xs text-orange-700 px-2 py-1.5 bg-orange-50 rounded border border-orange-200 font-mono">
              Line {debugLine.line} : {debugLine.path.split("/").pop()}
            </div>
          ) : (
            <div className="text-xs text-gray-400 italic pl-2">Not paused</div>
          )}
        </div>
      </div>
    </div>
  );
}
