"use client";

import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { VscAdd, VscChromeClose, VscTrash } from "react-icons/vsc";

import {
  setActiveBottomTab,
  toggleTerminal,
  writeToTerminal,
} from "@/store/slices/uiSlice";
import { RunSocket } from "@/lib/ide/runSocket";
import { DebugSocket } from "@/lib/ide/debugSocket";
import Terminal from "@/components/ide/Terminal";

export default function BottomPanel() {
  const dispatch = useDispatch();
  const { activeBottomTab, terminalOutput, isRunning, isDebugMode } =
    useSelector((state) => state.ui);

  const [outputContent, setOutputContent] = useState("");
  const [runInput, setRunInput] = useState("");
  const outputEndRef = useRef(null);

  useEffect(() => {
    if (terminalOutput) {
      if (terminalOutput.text === "__CLEAR__") setOutputContent("");
      else setOutputContent((prev) => prev + terminalOutput.text);
    }
  }, [terminalOutput]);

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
          <VscAdd
            className="text-gray-500 hover:text-black cursor-pointer w-4 h-4"
            title="New Terminal"
          />
          <VscTrash
            className="text-gray-500 hover:text-black cursor-pointer w-4 h-4"
            onClick={() => setOutputContent("")}
            title="Clear Output"
          />
          <VscChromeClose
            className="text-gray-500 hover:text-black cursor-pointer w-4 h-4"
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
