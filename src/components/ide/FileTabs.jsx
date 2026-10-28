"use client";

import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { VscClose, VscFile, VscTypeHierarchySub } from "react-icons/vsc";
import { DiJava, DiPython, DiJsBadge, DiReact } from "react-icons/di";

import { setActiveFile, closeFile } from "@/store/slices/fileSystemSlice";

const getFileIcon = (file) => {
  if (!file || !file.name) return <VscFile className="text-gray-400" />;

  if (file.id === "virtual:codemap") {
    return <VscTypeHierarchySub className="text-purple-500" />;
  }

  const ext = file.name.split(".").pop().toLowerCase();

  switch (ext) {
    case "java":
      return <DiJava className="text-red-500" />;
    case "py":
      return <DiPython className="text-[#3776ab]" />;
    case "js":
      return <DiJsBadge className="text-[#f7df1e]" />;
    case "jsx":
      return <DiReact className="text-[#61dafb]" />;
    default:
      return <VscFile className="text-gray-400" />;
  }
};

// isSandboxMode 는 팀 셸만 넘긴다. 샌드박스에서는 탭바를 연한 에메랄드로 칠해 "지금 개인 레이어에서
// 고치는 중"임을 편집 영역 맨 위에서 알린다. 코드 영역은 가독성을 위해 흰 바탕 그대로 두고,
// 활성 탭도 흰색이라 코드 영역과 이어져 보인다. 개인 모드에는 샌드박스가 없다.
export default function FileTabs({ isSandboxMode = false }) {
  const dispatch = useDispatch();
  const { openFiles, activeFileId } = useSelector((state) => state.fileSystem);

  const barClass = isSandboxMode
    ? "bg-[#D1FAE5] border-b border-[#6EE7B7]"
    : "bg-[#f3f3f3] border-b border-gray-200";

  if (openFiles.length === 0) {
    return <div className={`h-9 ${barClass}`}></div>;
  }

  return (
    <div className={`flex h-9 overflow-x-auto scrollbar-hide ${barClass}`}>
      {openFiles.map((file) => (
        <div
          key={file.id}
          className={`flex items-center px-3 min-w-[120px] max-w-[200px] border-r cursor-pointer select-none text-xs group transition-all ${
            isSandboxMode ? "border-[#A7F3D0]" : "border-gray-200"
          } ${
            activeFileId === file.id
              ? isSandboxMode
                ? "bg-white text-[#065F46] border-t-2 border-t-[#059669] font-semibold"
                : "bg-white text-[#333] border-t-2 border-t-blue-500 font-medium"
              : isSandboxMode
                ? "bg-[#D1FAE5] text-[#065F46]/75 hover:bg-[#A7F3D0] border-t-2 border-t-transparent"
                : "bg-[#ececec] text-gray-500 hover:bg-[#e6e6e6] border-t-2 border-t-transparent"
          }`}
          onClick={() => dispatch(setActiveFile(file.id))}
        >
          <span className="mr-2 text-base">{getFileIcon(file)}</span>
          <span className="truncate flex-1">{file.name}</span>
          <span
            className={`ml-2 p-0.5 rounded-sm text-gray-500 transition-opacity ${
              isSandboxMode ? "hover:bg-[#A7F3D0]" : "hover:bg-gray-300"
            } ${
              activeFileId === file.id
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              dispatch(closeFile(file.id));
            }}
          >
            <VscClose />
          </span>
        </div>
      ))}
    </div>
  );
}
