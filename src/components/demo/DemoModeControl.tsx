// 경로: src/components/demo/DemoModeControl.tsx
"use client";

import { useEffect } from "react";
import { useDemoMode } from "@/hooks/useDemoMode";
import { setDemoModeOwner } from "@/lib/demo/demoRunner";

/**
 * 시연 모드 스위치. 발표 화면에 드러나지 않도록 UI 없이 Ctrl+F9 로만 전환한다.
 * 오작동하면 다시 눌러 바로 수동 입력으로 돌아간다.
 */
export default function DemoModeControl() {
  const { role, userKey, owner, isActive, setActive, loading } = useDemoMode();

  // 다른 계정으로 바뀌었거나 로그아웃했다. 예전 계정으로 돌아와도 저절로 켜지지 않게 지운다.
  useEffect(() => {
    if (!loading && owner && owner !== userKey) setDemoModeOwner(null);
  }, [loading, owner, userKey]);

  // 에디터가 키를 먼저 가져가지 못하도록 capture 로 받는다. 발표 계정이 아니면 듣지도 않는다.
  useEffect(() => {
    if (!role) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "F9" || !event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) return;

      event.preventDefault();
      event.stopPropagation();
      // 키를 누르고 있어도 한 번만 전환한다.
      if (!event.repeat) setActive(!isActive);
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [role, isActive, setActive]);

  return null;
}
