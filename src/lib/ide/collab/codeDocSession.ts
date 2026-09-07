"use client";

// 경로: src/lib/ide/collab/codeDocSession.ts
//
// 코드 파일 하나에 대한 동시편집 세션.
//
// ★ 반드시 지켜야 하는 순서가 있다.
//     1) 서버에서 저장본을 받는다
//     2) 없으면 디스크 내용으로 만들어 보내고, 서버가 채택한 것을 적용한다
//     3) 그 다음에야 WebSocket 에 접속한다
//
//   3번을 앞당기면 빈 문서인 채로 연결이 먼저 열린다. 그러면 에디터가 빈
//   문서에 묶여 화면이 비고, 내용은 뒤늦게 경주에서 이겨야만 채워진다.
//   "파일을 열면 빈 내용이 보인다"가 정확히 그 증상이었다. 설계 문서 쪽
//   designDocProvider.ts 가 같은 이유로 같은 순서를 지킨다.
//
// 저장도 이 세션이 맡는다. 협업 서버는 문서를 보관하지 않으므로 아무도
// 저장하지 않으면 함께 고친 것이 통째로 사라진다. 그렇다고 전원이 저장하면
// 요청이 겹치므로, awareness 의 clientID 가 가장 작은 한 사람만 담당한다.
// 담당자가 창을 닫으면 남은 사람 중 최솟값이 자동으로 이어받는다.
//
// 담당자는 두 곳에 쓴다. 서버에는 Yjs 상태를(뒤늦게 들어온 사람이 최신
// 문서를 받도록), 디스크에는 파일 내용을(Git·실행·빌드가 보는 것은 파일이라).

import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import type { Awareness } from "y-protocols/awareness";

import { CollabWebSocket } from "@/lib/ide/collabSocket";

import { applyEncodedState, encodeDocState } from "./binary";
import { fetchRoomDocApi, saveRoomDocApi, seedRoomDocApi } from "./codeDocApi";

const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE_URL || "ws://localhost:8080";

/** 마지막 편집 후 이만큼 조용하면 저장한다. */
const IDLE_SAVE_MS = 3000;

/** 계속 치고 있어도 최소 이 주기로는 저장한다. 손실 상한을 잡아 준다. */
const MAX_SAVE_INTERVAL_MS = 30000;

/** Y.Doc 안에서 본문을 담는 이름. y-monaco 관례를 따른다. */
export const TEXT_KEY = "monaco";

export type CodeDocStatus = "loading" | "ready" | "error";

export interface CodeDocSessionOptions {
  /** `{workspaceId}:{project}:{branch}:{file}` 형식의 방 이름. */
  room: string;
  /** 디스크에 있던 내용. 서버에 저장본이 없을 때 이것으로 문서를 만든다. */
  diskContent: string;
  /** 문서 내용을 디스크에 쓴다. */
  saveFile: (content: string) => Promise<void>;
  onStatusChange?: (status: CodeDocStatus, message: string) => void;
  onSaveError?: (error: Error) => void;
}

export class CodeDocSession {
  readonly room: string;
  readonly doc: Y.Doc;
  readonly yText: Y.Text;

  provider: WebsocketProvider | null = null;

  private readonly diskContent: string;
  private readonly saveFile: (content: string) => Promise<void>;
  private readonly onStatusChange?: (status: CodeDocStatus, message: string) => void;
  private readonly onSaveError?: (error: Error) => void;

  private status: CodeDocStatus = "loading";
  private destroyed = false;
  private updateListenerAttached = false;

  private dirty = false;
  private saving = false;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private forceTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly handleDocUpdate = () => this.markDirty();
  private readonly handleAwarenessChange = () => this.onPeersChanged();

  /**
   * 탭을 숨기거나 닫을 때 마지막으로 한 번 저장한다.
   *
   * beforeunload 에서 보낸 요청은 브라우저가 기다려 주지 않아 도중에 끊길 수
   * 있다. 실제로 일을 하는 것은 visibilitychange 쪽이고, beforeunload 는
   * 최선을 다하는 정도로 둔다.
   */
  private readonly handleVisibility = () => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      void this.flush();
    }
  };

  private readonly handleBeforeUnload = () => {
    void this.flush();
  };

  constructor(options: CodeDocSessionOptions) {
    this.room = options.room;
    this.diskContent = options.diskContent;
    this.saveFile = options.saveFile;
    this.onStatusChange = options.onStatusChange;
    this.onSaveError = options.onSaveError;

    this.doc = new Y.Doc();
    this.yText = this.doc.getText(TEXT_KEY);
  }

  get awareness(): Awareness | null {
    return this.provider?.awareness ?? null;
  }

  getStatus(): CodeDocStatus {
    return this.status;
  }

  private setStatus(status: CodeDocStatus, message: string): void {
    this.status = status;
    this.onStatusChange?.(status, message);
  }

  // ── 1) 저장본 로드 → 2) 필요하면 시드 → 3) 접속 ────────────────────

  async open(): Promise<void> {
    try {
      const stored = await fetchRoomDocApi(this.room);
      if (this.destroyed) return;

      if (stored.needsSeed) {
        await this.seed();
        if (this.destroyed) return;
      } else {
        applyEncodedState(this.doc, stored.yjsUpdate);
      }

      this.connect();
      this.setStatus("ready", "");
    } catch (error) {
      if (this.destroyed) return;

      // 저장본을 읽지 못한 상태로 편집을 열어 주면, 나중에 저장할 때 진짜
      // 내용을 빈 문서로 덮어쓸 수 있다. 그래서 편집을 열지 않고 오류로 둔다.
      const message =
        error instanceof Error ? error.message : "문서를 불러오지 못했습니다.";

      this.setStatus("error", message);
      console.error("[협업] 문서 로드 실패", this.room, error);
    }
  }

  /**
   * 디스크 내용으로 이 방의 첫 문서를 만든다.
   *
   * 후보를 임시 Y.Doc 에 만들어 보내고, 서버가 채택한 바이너리만 세션 문서에
   * 적용한다. 이렇게 하면 경쟁에서 져도 세션 문서는 여전히 비어 있는 상태라
   * 내용이 겹치지 않고, 받은 것을 그대로 쓰면 되므로 빈 화면에 갇히지도 않는다.
   */
  private async seed(): Promise<void> {
    // 빈 내용으로는 시드하지 않는다.
    //
    // "이 파일은 비어 있다"를 방의 정본으로 등록해 버리면, 뒤에 들어오는
    // 사람들까지 전부 빈 문서를 받는다. 한 번 등록되면 방이 빌 때까지
    // 남아 있어서 피해가 계속된다.
    //
    // 파일이 정말 비어 있다면 아무도 시드하지 않아도 문서가 빈 채로
    // 시작하므로 결과가 같다. 그래서 등록하지 않는 쪽이 항상 안전하다.
    if (this.diskContent === "") return;

    const candidate = new Y.Doc();

    candidate.getText(TEXT_KEY).insert(0, this.diskContent);

    const encoded = encodeDocState(candidate);
    candidate.destroy();

    const result = await seedRoomDocApi(this.room, encoded);
    if (this.destroyed) return;

    applyEncodedState(this.doc, result.yjsUpdate);
  }

  private connect(): void {
    // 방 이름은 경로가 아니라 ?room= 쿼리로 가야 하고 JWT 도 붙어야 한다.
    // 그 두 가지를 CollabWebSocket 폴리필이 처리한다.
    const provider = new WebsocketProvider(`${WS_BASE}/ws/collab`, this.room, this.doc, {
      WebSocketPolyfill: CollabWebSocket,
    });

    this.provider = provider;
    provider.awareness.on("change", this.handleAwarenessChange);

    // 문서 변경 감시는 여기서부터 켠다. 시드로 들어온 내용까지 "바뀐 것"으로
    // 세면 파일을 열자마자 쓸데없는 저장이 한 번 나간다.
    if (!this.updateListenerAttached) {
      this.doc.on("update", this.handleDocUpdate);
      this.updateListenerAttached = true;
    }

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.handleVisibility);
    }

    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", this.handleBeforeUnload);
    }
  }

  // ── 저장 담당 ─────────────────────────────────────────────────────

  /**
   * 지금 내가 저장 담당인지.
   *
   * 혼자거나 아직 연결 전이면 나 말고 저장할 사람이 없으므로 항상 담당이다.
   * 접속자가 여럿이면 clientID 가 가장 작은 사람이 맡는다. 모두가 같은
   * 목록을 보므로 따로 합의할 필요가 없다.
   */
  isWriter(): boolean {
    const awareness = this.awareness;
    if (!awareness) return true;

    const clientIds = Array.from(awareness.getStates().keys());
    if (clientIds.length === 0) return true;

    return this.doc.clientID === Math.min(...clientIds);
  }

  markDirty(): void {
    if (this.destroyed) return;

    this.dirty = true;

    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => void this.flush(), IDLE_SAVE_MS);

    if (!this.forceTimer) {
      this.forceTimer = setTimeout(() => void this.flush(), MAX_SAVE_INTERVAL_MS);
    }
  }

  /**
   * 담당자가 바뀌면 새 담당이 곧바로 한 번 저장한다.
   *
   * 앞 담당자의 탭이 갑자기 죽었다면 마지막 저장 이후의 편집이 아직 아무
   * 데도 남아 있지 않을 수 있다.
   */
  private onPeersChanged(): void {
    if (this.destroyed || !this.dirty) return;
    if (this.isWriter()) void this.flush();
  }

  private clearTimers(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.forceTimer) clearTimeout(this.forceTimer);

    this.idleTimer = null;
    this.forceTimer = null;
  }

  /**
   * 이 내용을 밖으로 내보내도 되는지.
   *
   * 디스크에 내용이 있었는데 지금 문서가 비어 있다면 무언가 잘못된 것이다.
   * 그대로 내보내면 서버 보관본과 디스크 파일이 모두 빈 내용으로 덮이고,
   * 그 뒤에 들어오는 사람은 전부 빈 파일을 보게 된다.
   */
  private canPublish(content: string): boolean {
    if (content.length > 0) return true;
    if (this.diskContent.length === 0) return true;

    console.warn("[협업] 빈 내용을 내보내지 않았습니다.", this.room);
    return false;
  }

  /** 지금 바로 저장한다. 담당이 아니거나 바뀐 것이 없으면 아무것도 하지 않는다. */
  async flush(): Promise<void> {
    if (this.destroyed || this.saving || !this.dirty) return;
    if (!this.isWriter()) return;

    this.clearTimers();
    this.saving = true;
    this.dirty = false;

    // 에디터 화면이 아니라 문서에서 가져온다. 정본은 문서다.
    const content = this.yText.toString();

    if (!this.canPublish(content)) {
      this.saving = false;
      return;
    }

    const encoded = encodeDocState(this.doc);

    try {
      // 서버 보관본을 먼저 갱신한다. 뒤늦게 들어온 사람이 받을 것이다.
      await saveRoomDocApi(this.room, encoded);

      // 빈 내용으로 멀쩡한 파일을 덮어쓰는 것은 서버가 막는다(allowEmpty).
      await this.saveFile(content);
    } catch (error) {
      // 실패하면 다시 시도할 수 있게 표시를 되돌린다.
      this.dirty = true;
      this.onSaveError?.(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.saving = false;
    }
  }

  /**
   * 떠나기 직전에 저장하고 갈 사람인지.
   *
   * 연결을 끊고 나면 누가 접속해 있는지 알 수 없어 모두가 자기를 담당이라고
   * 여기게 된다. 그러면 나가는 사람마다 저장을 보내면서, 남아서 계속 고치던
   * 팀원의 최신 내용을 옛 것으로 덮을 수 있다. 그래서 끊기 전에 물어본다.
   */
  shouldSaveOnLeave(): boolean {
    return this.dirty && this.isWriter();
  }

  destroy(): void {
    if (this.destroyed) return;

    // 판단과 내용 읽기를 먼저 하고 정리한다. 순서가 바뀌면 위 주석의 사고가
    // 나거나, 이미 파기된 문서에서 내용을 읽게 된다.
    const leavingContent = this.yText.toString();
    const shouldSave = this.shouldSaveOnLeave() && this.canPublish(leavingContent);
    const content = shouldSave ? leavingContent : "";
    const encoded = shouldSave ? encodeDocState(this.doc) : null;

    this.destroyed = true;
    this.clearTimers();

    if (shouldSave && encoded) {
      void saveRoomDocApi(this.room, encoded).catch(() => {});
      void this.saveFile(content).catch(() => {});
    }

    if (this.updateListenerAttached) {
      this.doc.off("update", this.handleDocUpdate);
      this.updateListenerAttached = false;
    }

    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.handleVisibility);
    }

    if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", this.handleBeforeUnload);
    }

    const provider = this.provider;
    this.provider = null;

    if (provider) {
      try {
        provider.awareness.off("change", this.handleAwarenessChange);
        provider.awareness.setLocalState(null);
      } catch {
        // 이미 정리된 경우
      }

      try {
        provider.disconnect();
        provider.destroy();
      } catch {
        // 이미 정리된 경우
      }
    }

    try {
      this.doc.destroy();
    } catch {
      // 이미 정리된 경우
    }
  }
}
