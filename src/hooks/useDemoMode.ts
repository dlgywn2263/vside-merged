// 경로: src/hooks/useDemoMode.ts

import { useCallback, useSyncExternalStore } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { resolveDemoRole } from "@/config/demoInputConfig";
import {
  getDemoModeOwner,
  setDemoModeOwner,
  subscribeDemoMode,
} from "@/lib/demo/demoRunner";

/**
 * 지금 로그인한 계정이 발표 계정인지, 시연 모드가 켜져 있는지.
 *
 * 저장된 값은 "켠 계정"이라, 다른 계정으로 바뀌면 값이 남아 있어도 꺼진 것으로 본다.
 */
export function useDemoMode() {
  const { user, isAuthenticated, loading } = useAuth();

  const rawKey = user?.userId ?? user?.id;
  const userKey = isAuthenticated && rawKey != null ? String(rawKey) : null;
  const role = resolveDemoRole(userKey);

  const owner = useSyncExternalStore(subscribeDemoMode, getDemoModeOwner, () => null);
  const isActive = Boolean(role && owner === userKey);

  const setActive = useCallback(
    (next: boolean) => {
      if (userKey) setDemoModeOwner(next ? userKey : null);
    },
    [userKey],
  );

  return { role, userKey, owner, isActive, setActive, loading };
}
