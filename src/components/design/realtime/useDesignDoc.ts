"use client";

// 경로: src/components/design/realtime/useDesignDoc.ts

import { useEffect, useState, useSyncExternalStore } from "react";
import type * as Y from "yjs";

import {
  acquireDesignDocSession,
  releaseDesignDocSession,
  type DesignDocSession,
  type DesignDocState,
} from "./designDocProvider";

const IDLE_STATE: DesignDocState = {
  status: "loading",
  errorMessage: "",
  saveState: "idle",
  savedAt: null,
  peerCount: 1,
};

const noopSubscribe = () => () => {};
const idleSnapshot = () => IDLE_STATE;

export interface UseDesignDocResult {
  doc: Y.Doc | null;
  session: DesignDocSession | null;
  state: DesignDocState;
}

/**
 * 워크스페이스의 설계 문서를 연다.
 *
 * workspaceId 가 비어 있으면 아무것도 열지 않는다. 유효하지 않은 값으로
 * 방에 붙으면 서로 무관한 사용자들이 한 방에 모이게 되므로, 이 경우
 * 화면은 "워크스페이스를 먼저 선택하세요" 안내만 보여야 한다.
 */
export function useDesignDoc(workspaceId: string | null | undefined): UseDesignDocResult {
  const [session, setSession] = useState<DesignDocSession | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setSession(null);
      return;
    }

    const acquired = acquireDesignDocSession(workspaceId);
    setSession(acquired);

    return () => {
      setSession(null);
      releaseDesignDocSession(workspaceId);
    };
  }, [workspaceId]);

  const state = useSyncExternalStore(
    session ? session.subscribe : noopSubscribe,
    session ? session.getState : idleSnapshot,
    idleSnapshot,
  );

  return { doc: session?.doc ?? null, session, state };
}
