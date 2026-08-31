"use client";

import { useEffect } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { CollabWebSocket } from "@/lib/ide/collabSocket";

const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE_URL || "ws://localhost:8080";

class WorkspaceSyncManager {
    constructor() {
        this.provider = null;
        this.doc = null;
        this.eventsMap = null;
        this.currentWorkspaceId = null;
    }

    init(workspaceId) {
        if (this.currentWorkspaceId === workspaceId && this.provider?.connected) return;
        this.destroy();

        this.currentWorkspaceId = workspaceId;
        this.doc = new Y.Doc();
        const globalRoomName = `global-workspace-room-${workspaceId}`;

        // 공용 폴리필을 반드시 넘겨야 한다.
        // 백엔드는 ?room= 쿼리로만 방을 구분하는데 y-websocket 기본값은
        // 경로 형식이라, 폴리필 없이 붙으면 워크스페이스와 무관하게 모든
        // 사용자가 default-room 한 곳에 모인다. 토큰도 여기서 붙는다.
        this.provider = new WebsocketProvider(
            `${WS_BASE}/ws/collab`,
            globalRoomName,
            this.doc,
            {
                WebSocketPolyfill: CollabWebSocket,
            }
        );

        this.eventsMap = this.doc.getMap("workspaceGlobalEvents");

        this.eventsMap.observe((event, transaction) => {
            // 내가 보낸 신호는 무시하고, 타인이 보낸 신호만 캐치합니다.
            if (transaction.local) return;
            
            console.log("🔄 [SyncManager] 팀원의 파일 변경이 감지되었습니다! (0.3초 후 동기화)");
            
            // 💡 [핵심] DB 커밋 대기시간 300ms 부여 후, 브라우저 전역에 네이티브 이벤트를 발송!
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('workspace-sync-triggered'));
            }, 300);
        });
    }

    trigger() {
        if (this.eventsMap) {
            console.log("📢 [SyncManager] 변경 신호 브로드캐스트 전송!");
            // 타임스탬프와 난수를 섞어 무조건 새로운 값으로 인식하게 만들어 옵저버를 강제 실행합니다.
            this.eventsMap.set("sync_token", Date.now() + Math.random());
        }
    }

    destroy() {
        if (this.provider) this.provider.disconnect();
        if (this.doc) this.doc.destroy();
        this.provider = null;
        this.doc = null;
        this.eventsMap = null;
        this.currentWorkspaceId = null;
    }
}

// 외부에서 임포트할 단일 싱글톤 인스턴스
export const globalSyncInstance = new WorkspaceSyncManager();

export const useWorkspaceGlobalSync = (workspaceId) => {
    useEffect(() => {
        if (workspaceId) globalSyncInstance.init(workspaceId);
        
        return () => {
            // SPA 라우팅 이탈 시에만 소켓 해제
        };
    }, [workspaceId]);
};