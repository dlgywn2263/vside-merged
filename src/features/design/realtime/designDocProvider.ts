"use client";

// 경로: src/features/design/realtime/designDocProvider.ts
//
// 워크스페이스별로 설계 문서 세션을 하나만 유지한다.
//
// ★ 여기서 반드시 지켜야 하는 순서가 있다.
//      1) 서버에서 저장본을 받는다
//      2) 저장본이 없으면 예전 데이터로 문서를 만들어 시드한다
//      3) 그 다음에야 WebSocket 에 접속한다
//
//   3번을 앞당기면 서버의 "시드는 한 번만" 보장이 무의미해진다. 두 명이
//   같은 시각에 워크스페이스를 처음 열었을 때, 먼저 접속한 쪽이 자기가 만든
//   문서를 이미 방에 뿌려 놓기 때문이다. 그러면 서버가 나중 시드를 거절해도
//   화면에는 이미 모든 항목이 두 벌로 보인다.
//
//   같은 이유로 평문 데이터를 Y.Doc 으로 바꾸는 일은 아래 시드 경로에서만
//   한다. 여러 클라이언트가 각자 만들면 서로 다른 clientID 로 같은 항목을
//   넣어 내용이 인원수만큼 불어난다.

import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

import { CollabWebSocket } from "@/lib/ide/collabSocket";
import {
  fetchWorkspaceApiSpecsApi,
  fetchWorkspaceDesignDocumentApi,
  fetchWorkspaceRequirementsApi,
} from "@/lib/design/api";

import { legacyToModel } from "../model/legacy";
import { fetchDesignDocApi, seedDesignDocApi } from "../api/designDocApi";
import { applyEncodedState, encodeDocState } from "./binary";
import { SnapshotWriter, type SaveState } from "./snapshotWriter";
import { seedDocFromModel } from "./yjsSchema";

const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE_URL || "ws://localhost:8080";

/** 방 이름에 워크스페이스가 들어가야 서버가 권한을 확인할 수 있다. */
export function designRoomName(workspaceId: string): string {
  return `design:${workspaceId}`;
}

export type ConnectionStatus = "loading" | "ready" | "offline" | "error";

export interface DesignDocState {
  status: ConnectionStatus;
  errorMessage: string;
  saveState: SaveState;
  savedAt: number | null;
  peerCount: number;
}

type Listener = () => void;

class DesignDocSession {
  readonly workspaceId: string;
  readonly doc: Y.Doc;

  provider: WebsocketProvider | null = null;
  writer: SnapshotWriter | null = null;

  private refCount = 0;
  private started = false;
  private listeners = new Set<Listener>();

  /**
   * 이미 정리된 세션인지.
   *
   * 문서를 불러오는 동안 사용자가 화면을 벗어날 수 있다. 그때 뒤늦게
   * 도착한 응답이 이미 파기된 문서에 상태를 적용하고 WebSocket 을 열면,
   * 그 연결은 아무도 닫지 않는 유령이 된다. 개발 모드에서는 React 가
   * 효과를 두 번 실행하므로 첫 접속마다 재현된다.
   */
  private destroyed = false;

  private state: DesignDocState = {
    status: "loading",
    errorMessage: "",
    saveState: "idle",
    savedAt: null,
    peerCount: 1,
  };

  constructor(workspaceId: string) {
    this.workspaceId = workspaceId;
    this.doc = new Y.Doc();
  }

  getState = (): DesignDocState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private setState(patch: Partial<DesignDocState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  retain(): void {
    this.refCount += 1;
    if (!this.started) {
      this.started = true;
      void this.start();
    }
  }

  release(): void {
    this.refCount -= 1;
    if (this.refCount <= 0) {
      this.destroy();
    }
  }

  // ── 1) 저장본 로드 → 2) 필요하면 시드 → 3) 접속 ────────────────────

  private async start(): Promise<void> {
    try {
      const doc = await fetchDesignDocApi(this.workspaceId);
      if (this.destroyed) return;

      if (doc.needsSeed) {
        await this.seed();
        if (this.destroyed) return;
      } else {
        applyEncodedState(this.doc, doc.yjsUpdate);
      }

      this.setState({ status: "ready", errorMessage: "" });
      this.connect();
    } catch (error) {
      if (this.destroyed) return;

      // 저장본을 읽지 못한 상태에서 편집을 열어 주면, 나중에 저장할 때
      // 서버의 진짜 내용을 빈 문서로 덮어쓸 수 있다. 그래서 여기서는
      // 편집을 열지 않고 오류로 둔다.
      const message =
        error instanceof Error ? error.message : "설계 문서를 불러오지 못했습니다.";
      this.setState({ status: "error", errorMessage: message });
      console.error("[설계] 문서 로드 실패", error);
    }
  }

  /**
   * 예전 데이터를 v2 문서로 옮긴다. 워크스페이스당 한 번뿐이다.
   *
   * 후보 문서를 임시 Y.Doc 에 만들어 두고, 서버가 받아들인 쪽의 바이너리만
   * 실제 세션 문서에 적용한다. 이렇게 하면 경쟁에서 져도 세션 문서는 여전히
   * 비어 있는 상태라 내용이 겹칠 일이 없다.
   */
  private async seed(): Promise<void> {
    const [requirements, apiSpecs, document] = await Promise.all([
      fetchWorkspaceRequirementsApi(this.workspaceId),
      fetchWorkspaceApiSpecsApi(this.workspaceId),
      fetchWorkspaceDesignDocumentApi(this.workspaceId),
    ]);

    const model = legacyToModel({
      requirements: requirements ?? [],
      apiSpecs: apiSpecs ?? [],
      document: document ?? {},
    });

    const candidate = new Y.Doc();
    seedDocFromModel(candidate, model);
    const encoded = encodeDocState(candidate);
    candidate.destroy();

    const result = await seedDesignDocApi(this.workspaceId, {
      schemaVersion: model.schemaVersion,
      yjsUpdate: encoded,
      projection: model,
    });

    // 이겼으면 내가 만든 것, 졌으면 먼저 들어간 사람의 것을 적용한다.
    applyEncodedState(this.doc, result.doc.yjsUpdate ?? encoded);
  }

  private connect(): void {
    if (this.destroyed) return;

    this.writer = new SnapshotWriter({
      workspaceId: this.workspaceId,
      doc: this.doc,
      getAwareness: () => this.provider?.awareness ?? null,
      onStateChange: (saveState, savedAt) => this.setState({ saveState, savedAt }),
    });

    try {
      this.provider = new WebsocketProvider(
        `${WS_BASE}/ws/collab`,
        designRoomName(this.workspaceId),
        this.doc,
        { WebSocketPolyfill: CollabWebSocket },
      );

      this.provider.on("status", (event: { status: string }) => {
        // 연결이 끊겨도 편집은 계속된다. 저장도 REST 로 따로 나가므로
        // 혼자 쓰는 워크스페이스에서는 이 상태가 정상 경로다.
        this.setState({ status: event.status === "connected" ? "ready" : "offline" });
      });

      this.provider.awareness.on("change", () => {
        this.setState({ peerCount: this.provider?.awareness.getStates().size ?? 1 });
      });

      this.writer.attachAwareness(this.provider.awareness);
    } catch (error) {
      // 실시간 연결에 실패해도 문서는 이미 손에 있다. 편집과 저장은 계속된다.
      this.setState({ status: "offline" });
      console.error("[설계] 실시간 연결 실패", error);
    }
  }

  private destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    if (this.provider && this.writer) {
      this.writer.detachAwareness(this.provider.awareness);
    }

    // 마지막으로 한 번 저장하고 정리한다. 방을 떠나면 서버에는 아무것도
    // 남지 않으므로, 여기서 놓치면 마지막 편집이 사라진다.
    void this.writer?.flush().finally(() => {
      this.writer?.destroy();
      this.provider?.destroy();
      this.doc.destroy();
    });

    sessions.delete(this.workspaceId);
  }
}

const sessions = new Map<string, DesignDocSession>();

export function acquireDesignDocSession(workspaceId: string): DesignDocSession {
  let session = sessions.get(workspaceId);

  if (!session) {
    session = new DesignDocSession(workspaceId);
    sessions.set(workspaceId, session);
  }

  session.retain();
  return session;
}

export function releaseDesignDocSession(workspaceId: string): void {
  sessions.get(workspaceId)?.release();
}

export type { DesignDocSession };
