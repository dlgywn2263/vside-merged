"use client";

import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import {
  VscFiles,
  VscBook,
  VscBeaker,
  VscSourceControl,
  VscAccount,
  VscSettingsGear,
  VscSignOut,
} from "react-icons/vsc";

import { setActiveActivity } from "@/store/slices/uiSlice";

export default function ActivityBar() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { activeActivity } = useSelector((state) => state.ui);

  const topItems = [
    { id: "editor", icon: <VscFiles size={24} />, label: "에디터" },
    { id: "docs", icon: <VscBook size={24} />, label: "문서" },
    { id: "api-test", icon: <VscBeaker size={24} />, label: "API 테스트" },
    { id: "git", icon: <VscSourceControl size={24} />, label: "Git 연동" },
  ];

  const handleExit = () => {
    if (window.confirm("워크스페이스에서 나가시겠습니까?")) {
      router.push("/dashboard");
    }
  };

  const handleActivityClick = (id) => {
    dispatch(setActiveActivity(id));
  };

  return (
    <div className="w-12 bg-[#f8f8f8] border-r border-gray-200 flex flex-col justify-between h-full z-30 shrink-0 shadow-sm">
      <div className="flex flex-col pt-2 gap-2">
        {topItems.map((item) => (
          <div
            key={item.id}
            className={`w-12 h-12 flex items-center justify-center cursor-pointer transition-all relative group ${
              activeActivity === item.id
                ? "text-[#333]"
                : "text-gray-400 hover:text-gray-600"
            }`}
            onClick={() => handleActivityClick(item.id)}
          >
            {activeActivity === item.id && (
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#333] rounded-r-full" />
            )}
            {item.icon}
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
              {item.label}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col pb-2 gap-2">
        <div
          className={`w-12 h-12 flex items-center justify-center cursor-pointer transition-all relative group ${
            activeActivity === "mypage"
              ? "text-[#333]"
              : "text-gray-400 hover:text-gray-600"
          }`}
          onClick={() => dispatch(setActiveActivity("mypage"))}
        >
          {activeActivity === "mypage" && (
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#333] rounded-r-full" />
          )}
          <VscAccount size={24} />
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
            마이페이지
          </div>
        </div>

        <div className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer transition-colors relative group">
          <VscSettingsGear size={24} />
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
            설정
          </div>
        </div>

        <div
          className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-red-500 cursor-pointer transition-colors relative group"
          onClick={handleExit}
        >
          <VscSignOut size={24} />
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
            방 나가기
          </div>
        </div>
      </div>
    </div>
  );
}
