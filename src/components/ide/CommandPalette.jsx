"use client";

import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { VscChevronRight } from "react-icons/vsc";

import { closeCommandPalette, toggleTerminal } from "@/store/slices/uiSlice";

export default function CommandPalette() {
  const dispatch = useDispatch();
  const isVisible = useSelector((state) => state.ui.isCommandPaletteVisible);

  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands = [
    {
      id: "toggle-terminal",
      label: "View: Toggle Terminal",
      action: () => dispatch(toggleTerminal()),
    },
    {
      id: "save",
      label: "File: Save",
      action: () => alert("Use Ctrl+S to save"),
    },
    {
      id: "new-file",
      label: "File: New File",
      action: () =>
        alert("Please use the Sidebar or Terminal to create files."),
    },
  ];

  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isVisible]);

  const handleKeyDown = (e) => {
    if (filteredCommands.length === 0) {
      if (e.key === "Escape") dispatch(closeCommandPalette());
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(
        (prev) =>
          (prev - 1 + filteredCommands.length) % filteredCommands.length,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
        dispatch(closeCommandPalette());
      }
    } else if (e.key === "Escape") {
      dispatch(closeCommandPalette());
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex justify-center pt-[10vh] bg-black/20"
      onClick={() => dispatch(closeCommandPalette())}
    >
      <div
        className="w-[600px] bg-[#252526] shadow-2xl border border-[#454545] rounded-md overflow-hidden flex flex-col max-h-[400px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-2 py-2 border-b border-[#333]">
          <VscChevronRight className="text-gray-400 mr-2" />
          <input
            ref={inputRef}
            className="w-full bg-transparent outline-none text-white text-sm placeholder-gray-500"
            placeholder="Type a command..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="overflow-y-auto py-1">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-2 text-gray-500 text-xs">
              No matching commands
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => (
              <div
                key={cmd.id}
                className={`px-3 py-1.5 flex justify-between items-center text-sm cursor-pointer ${
                  idx === selectedIndex
                    ? "bg-[#04395e] text-white"
                    : "text-gray-300 hover:bg-[#2a2d2e]"
                }`}
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => {
                  cmd.action();
                  dispatch(closeCommandPalette());
                }}
              >
                <span>{cmd.label}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
