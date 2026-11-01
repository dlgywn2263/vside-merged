// 경로: src/components/demo/DemoModeControl.tsx
"use client";

import { useEffect } from "react";
import { useDemoMode } from "@/hooks/useDemoMode";
import { setDemoModeOwner } from "@/lib/demo/demoRunner";

/** 발표 계정에게만 보이는 시연 모드 스위치. 오작동하면 눌러서 바로 수동 입력으로 돌아간다. */
export default function DemoModeControl() {
  const { role, userKey, owner, isActive, setActive, loading } = useDemoMode();

  // 다른 계정으로 바뀌었거나 로그아웃했다. 예전 계정으로 돌아와도 저절로 켜지지 않게 지운다.
  useEffect(() => {
    if (!loading && owner && owner !== userKey) setDemoModeOwner(null);
  }, [loading, owner, userKey]);

  if (!role) return null;

  return (
    <button
      type="button"
      onClick={() => setActive(!isActive)}
      aria-pressed={isActive}
      title={`${role === "presenter" ? "시연자" : "보조 시연자"} 계정 · 누르면 자동 입력을 ${isActive ? "끕니다" : "켭니다"}`}
      className={`fixed bottom-1 left-1 z-[2147483647] rounded px-1.5 py-0.5 text-[10px] font-semibold shadow-sm transition-opacity ${
        isActive
          ? "bg-[#5873F9] text-white opacity-60 hover:opacity-100"
          : "bg-slate-200 text-slate-500 opacity-40 hover:opacity-100"
      }`}
    >
      시연 {isActive ? "ON" : "OFF"}
    </button>
  );
}
