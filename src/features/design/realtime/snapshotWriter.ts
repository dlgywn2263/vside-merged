"use client";

// 경로: src/features/design/realtime/snapshotWriter.ts
//
// 설계 문서를 서버에 남기는 담당자.
//
// 협업 서버는 문서를 보관하지 않는다. 방에 아무도 없으면 방 자체가 사라지고
// 그 안의 내용도 함께 사라진다. 그래서 접속자 중 한 명이 주기적으로 서버에
// 저장해 주지 않으면 팀의 설계가 통째로 증발한다.
//
// 전원이 저장하면 쓰기 폭풍이 나므로 한 명만 맡는다. 선출은 별도 합의
// 절차 없이 awareness 에 이미 퍼져 있는 clientID 중 가장 작은 값으로 정한다.
// 담당자가 창을 닫거나 죽으면 남은 사람 중 최솟값이 자동으로 이어받는다.

import * as Y from "yjs";
import type { Awareness } from "y-protocols/awareness";

import { saveDesignSnapshotApi } from "../api/designDocApi";
import { docToModel } from "./yjsSchema";
import { encodeDocState } from "./binary";

/** 마지막 편집 후 이만큼 조용하면 저장한다. */
const IDLE_SAVE_MS = 3000;

/** 편집이 계속돼도 최소 이 주기로는 저장한다. 손실 상한을 잡아 준다. */
const MAX_SAVE_INTERVAL_MS = 30000;

export type SaveState = "idle" | "pending" | "saving" | "saved" | "failed";

export interface SnapshotWriterOptions {
  workspaceId: string;
  doc: Y.Doc;
  getAwareness: () => Awareness | null;
  onStateChange?: (state: SaveState, savedAt: number | null) => void;
}

export class SnapshotWriter {
  private readonly workspaceId: string;
  private readonly doc: Y.Doc;
  private readonly getAwareness: () => Awareness | null;
  private readonly onStateChange?: (state: SaveState, savedAt: number | null) => void;

  private dirty = false;
  private saving = false;
  private destroyed = false;
  private savedAt: number | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private forceTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly handleUpdate = () => this.markDirty();
  private readonly handleAwarenessChange = () => this.onPeersChanged();
  private readonly handleVisibility = () => {
    if (document.visibilityState === "hidden") void this.flush();
  };
  private readonly handleBeforeUnload = () => {
    void this.flush();
  };

  constructor(options: SnapshotWriterOptions) {
    this.workspaceId = options.workspaceId;
    this.doc = options.doc;
    this.getAwareness = options.getAwareness;
    this.onStateChange = options.onStateChange;

    this.doc.on("update", this.handleUpdate);

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.handleVisibility);
    }
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", this.handleBeforeUnload);
    }
  }

  /** awareness 는 연결 뒤에 생기므로 준비된 시점에 한 번 붙인다. */
  attachAwareness(awareness: Awareness): void {
    awareness.on("change", this.handleAwarenessChange);
  }

  detachAwareness(awareness: Awareness): void {
    awareness.off("change", this.handleAwarenessChange);
  }

  /**
   * 지금 내가 저장 담당인지.
   * 혼자 쓰는 중이거나 연결이 끊긴 상태면 나 말고 저장할 사람이 없으므로
   * 항상 담당이다. 이 경우가 개인 워크스페이스의 정상 동작 경로다.
   */
  private isWriter(): boolean {
    const awareness = this.getAwareness();
    if (!awareness) return true;

    const clientIds = Array.from(awareness.getStates().keys());
    if (clientIds.length === 0) return true;

    return this.doc.clientID === Math.min(...clientIds);
  }

  private markDirty(): void {
    if (this.destroyed) return;

    this.dirty = true;
    this.emit("pending");

    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => void this.flush(), IDLE_SAVE_MS);

    if (!this.forceTimer) {
      this.forceTimer = setTimeout(() => void this.flush(), MAX_SAVE_INTERVAL_MS);
    }
  }

  /**
   * 참여자가 바뀌면 담당자도 바뀔 수 있다.
   * 앞 담당자의 탭이 갑자기 죽었다면 마지막 저장 이후의 편집이 아직
   * 저장되지 않았을 수 있으므로, 새로 담당이 되는 즉시 한 번 저장한다.
   */
  private onPeersChanged(): void {
    if (this.destroyed || !this.dirty) return;
    if (this.isWriter()) void this.flush();
  }

  /** 지금 바로 저장한다. 담당이 아니거나 바뀐 내용이 없으면 아무것도 하지 않는다. */
  async flush(): Promise<void> {
    if (this.destroyed || this.saving || !this.dirty) return;
    if (!this.isWriter()) return;

    this.clearTimers();
    this.saving = true;
    this.dirty = false;
    this.emit("saving");

    try {
      const model = docToModel(this.doc);

      await saveDesignSnapshotApi(this.workspaceId, {
        schemaVersion: model.schemaVersion,
        yjsUpdate: encodeDocState(this.doc),
        projection: model,
      });

      this.savedAt = Date.now();
      this.emit("saved");
    } catch (error) {
      // 저장에 실패하면 다시 시도할 수 있도록 변경 표시를 되돌린다.
      this.dirty = true;
      this.emit("failed");
      console.error("[설계] 스냅샷 저장 실패", error);
    } finally {
      this.saving = false;
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.clearTimers();
    this.doc.off("update", this.handleUpdate);

    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.handleVisibility);
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", this.handleBeforeUnload);
    }
  }

  private clearTimers(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.forceTimer) {
      clearTimeout(this.forceTimer);
      this.forceTimer = null;
    }
  }

  private emit(state: SaveState): void {
    this.onStateChange?.(state, this.savedAt);
  }
}
