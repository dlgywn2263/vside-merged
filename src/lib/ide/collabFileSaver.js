"use client";

// 경로: src/lib/ide/collabFileSaver.js
//
// 팀으로 같이 고치는 파일을 자동으로 저장한다.
//
// 협업 서버는 방이 비면 아무것도 남기지 않는다. 그래서 아무도 Ctrl+S 를
// 누르지 않고 창을 닫으면 그때까지 함께 고친 것이 통째로 사라진다.
//
// 그렇다고 모두가 저장하면 서로의 요청이 겹친다. 그래서 접속자 중 한 명을
// 저장 담당으로 정한다. 설계 문서 쪽(realtime/snapshotWriter.ts)이 같은
// 문제를 이미 이렇게 풀었고, 여기서는 저장 대상이 스냅샷이 아니라 파일이라
// 구조만 따르고 코드는 따로 둔다.

const IDLE_SAVE_MS = 3000;
const MAX_SAVE_INTERVAL_MS = 30000;

export class CollabFileSaver {
  /**
   * @param {object} options
   * @param {import("yjs").Text} options.yText 저장할 내용이 담긴 문서
   * @param {import("y-protocols/awareness").Awareness} options.awareness 담당자를 뽑는 데 쓴다
   * @param {number} options.clientId 내 문서 clientID
   * @param {(content: string) => Promise<void>} options.save 실제 저장
   * @param {(error: Error) => void} [options.onError]
   */
  constructor({ yText, awareness, clientId, save, onError }) {
    this.yText = yText;
    this.awareness = awareness;
    this.clientId = clientId;
    this.save = save;
    this.onError = onError ?? (() => {});

    this.dirty = false;
    this.saving = false;
    this.destroyed = false;
    this.idleTimer = null;
    this.forceTimer = null;

    this.handleTextChange = () => this.markDirty();
    this.handleAwarenessChange = () => this.onPeersChanged();

    this.yText.observe(this.handleTextChange);
    this.awareness?.on("change", this.handleAwarenessChange);
  }

  /**
   * 지금 내가 저장 담당인지.
   *
   * 혼자거나 연결이 끊긴 상태면 나 말고 저장할 사람이 없으므로 항상 담당이다.
   * 접속자가 여럿이면 clientID 가 가장 작은 사람이 맡는다 — 모두가 같은
   * 목록을 보므로 따로 합의할 필요가 없다.
   */
  isWriter() {
    if (!this.awareness) return true;

    const clientIds = Array.from(this.awareness.getStates().keys());
    if (clientIds.length === 0) return true;

    return this.clientId === Math.min(...clientIds);
  }

  markDirty() {
    if (this.destroyed) return;

    this.dirty = true;

    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => void this.flush(), IDLE_SAVE_MS);

    // 계속 타이핑하는 동안에도 일정 간격으로는 저장한다. 유휴만 기다리면
    // 오래 이어서 치는 동안 한 번도 저장되지 않는다.
    if (!this.forceTimer) {
      this.forceTimer = setTimeout(() => void this.flush(), MAX_SAVE_INTERVAL_MS);
    }
  }

  /**
   * 담당자가 바뀌면 새 담당이 곧바로 한 번 저장한다.
   *
   * 앞 담당자의 탭이 갑자기 죽었다면 마지막 저장 이후의 편집이 아직 안
   * 남아 있을 수 있다.
   */
  onPeersChanged() {
    if (this.destroyed || !this.dirty) return;
    if (this.isWriter()) void this.flush();
  }

  clearTimers() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.forceTimer) clearTimeout(this.forceTimer);

    this.idleTimer = null;
    this.forceTimer = null;
  }

  /** 지금 바로 저장한다. 담당이 아니거나 바뀐 것이 없으면 아무것도 하지 않는다. */
  async flush() {
    if (this.destroyed || this.saving || !this.dirty) return;
    if (!this.isWriter()) return;

    this.clearTimers();
    this.saving = true;
    this.dirty = false;

    try {
      // 에디터 화면이 아니라 문서에서 가져온다. 정본은 문서다.
      await this.save(this.yText.toString());
    } catch (error) {
      // 실패하면 다시 시도할 수 있게 표시를 되돌린다.
      this.dirty = true;
      this.onError(error instanceof Error ? error : new Error(String(error)));
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
  shouldSaveOnLeave() {
    return this.dirty && this.isWriter();
  }

  destroy() {
    this.destroyed = true;
    this.clearTimers();

    try {
      this.yText.unobserve(this.handleTextChange);
    } catch {
      // 문서가 이미 정리된 경우
    }

    try {
      this.awareness?.off("change", this.handleAwarenessChange);
    } catch {
      // 연결이 이미 정리된 경우
    }
  }
}
