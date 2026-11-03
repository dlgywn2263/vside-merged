// 경로: src/lib/demo/demoRunner.ts
//
// 시연 모드의 켜짐 상태와, 자동 입력 한 번의 진행을 맡는다. 일반 입력창과 코드 에디터가 같이 쓴다.
// 실제로 글자를 넣는 방법은 DemoSink 로 받으므로 여기는 React 도 Monaco 도 모른다.

import { getAuthUser } from "@/lib/auth/tokenStore";
import type { DemoInputMode } from "@/config/demoInputConfig";

const STORAGE_KEY = "waivsDemoModeOwner";

/* 시연 모드 — 켠 계정의 회원번호를 기억한다. 탭마다 따로이고 서버에는 저장하지 않는다. */

let owner: string | null | undefined;
const listeners = new Set<() => void>();
const doneTargets = new Set<string>();

export const getDemoModeOwner = () => {
  if (owner !== undefined) return owner;
  try {
    owner = window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    owner = null;
  }
  return owner;
};

export const subscribeDemoMode = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const setDemoModeOwner = (nextOwner: string | null) => {
  owner = nextOwner;
  // 끄고 다시 켜면 처음부터 다시 시연할 수 있다(리허설 뒤 새로고침 없이 초기화).
  doneTargets.clear();
  if (!nextOwner) cancelActiveDemoRun();
  try {
    if (nextOwner) window.sessionStorage.setItem(STORAGE_KEY, nextOwner);
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // 저장소를 못 써도 이 페이지에 있는 동안은 동작한다.
  }
  listeners.forEach((listener) => listener());
};

const getCurrentUserKey = () => {
  const user = getAuthUser();
  const key = user?.userId ?? user?.id;
  return key === null || key === undefined ? null : String(key);
};

/*
 * 코드맵이 실제로 만든 파일. 생성 경로는 기존 파일 위치와 모달 입력으로 정해져 미리 알 수 없다.
 * 새로고침해도 남도록 저장하고, 끄고 켜도 지우지 않는다(리허설을 다시 할 때 파일은 그대로다).
 */

const CREATED_FILES_KEY = "waivsDemoCreatedFiles";

const createdFileKey = (ownerKey: string, workspaceId: unknown, projectName: unknown, filePath: string) =>
  [ownerKey, workspaceId, projectName, filePath.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\.[^./]+$/, "")].join("|");

const readCreatedFiles = (): string[] => {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(CREATED_FILES_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/** 시연 모드가 켜져 있을 때 코드맵이 파일을 만들면 기록한다. 그 밖에는 아무 일도 하지 않는다. */
export function recordDemoCreatedFile(workspaceId: unknown, projectName: unknown, filePath: string) {
  const ownerKey = getDemoModeOwner();
  if (!ownerKey) return;
  try {
    const key = createdFileKey(ownerKey, workspaceId, projectName, filePath);
    window.sessionStorage.setItem(CREATED_FILES_KEY, JSON.stringify([...new Set([...readCreatedFiles(), key])]));
  } catch {
    // 기록하지 못하면 자동 입력이 시작되지 않을 뿐이다.
  }
}

export function isDemoCreatedFile(ownerKey: string, workspaceId: unknown, projectName: unknown, filePath: string) {
  return readCreatedFiles().includes(createdFileKey(ownerKey, workspaceId, projectName, filePath));
}

/* 한 번 입력한 대상은 다시 클릭해도 입력하지 않는다(rerun 설정 제외). */

export const isDemoTargetDone = (targetId: string) => doneTargets.has(targetId);

export type DemoSink = {
  /** 입력을 이어도 되는 상태인지. false 면 그 자리에서 멈춘다. */
  isValid: () => boolean;
  /** 지금은 쓸 수 없지만 곧 풀릴 수 있는 상태인지(팀원이 잡은 줄 등). 없으면 기다리지 않는다. */
  isBlocked?: () => boolean;
  /** 전체 선택을 보여 준다. */
  select?: () => void;
  /** 내용을 지운다. 없으면 write 가 한 번에 바꾼다. */
  clear?: () => void;
  /** 글자를 넣는다. false 를 돌려주면 멈춘다. */
  write: (chunk: string) => boolean;
};

export type DemoRunOptions = {
  targetId: string;
  ownerKey: string;
  text: string;
  mode: DemoInputMode;
  /** 기존 내용을 지우고 시작하는지 */
  replaceExisting: boolean;
  intervalMs: number;
  charsPerTick: number;
  selectDelayMs: number;
  clearDelayMs: number;
  blockedTimeoutMs?: number;
  sink: DemoSink;
  onFinish?: () => void;
};

export type DemoRun = {
  cancel: () => void;
  /** 일시정지했으면 true, 이어서 시작했으면 false 를 돌려준다. 이미 끝났으면 아무 일도 없다. */
  togglePause: () => boolean;
};

let activeRun: DemoRun | null = null;

export const isDemoRunActive = () => activeRun !== null;

export function cancelActiveDemoRun() {
  activeRun?.cancel();
}

/**
 * 자동 입력을 시작한다. 이미 다른 입력이 돌고 있으면 시작하지 않고 null 을 돌려준다.
 * 중단해도 이미 넣은 글자는 되돌리지 않는다.
 */
export function startDemoRun(options: DemoRunOptions): DemoRun | null {
  if (activeRun) return null;

  const { sink, targetId, ownerKey } = options;
  let cancelled = false;
  let paused = false;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let wakeUp: (() => void) | null = null;

  const interrupt = () => {
    if (timerId !== null) clearTimeout(timerId);
    wakeUp?.();
  };

  const run: DemoRun = {
    cancel: () => {
      cancelled = true;
      interrupt();
    },
    // 타이머는 아래 루프 하나뿐이다. 여기서는 깃발만 바꾸고 기다리던 것을 깨우므로 여러 번 눌러도 타이머가 늘지 않는다.
    togglePause: () => {
      if (cancelled || activeRun !== run) return paused;
      paused = !paused;
      interrupt();
      return paused;
    },
  };

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      wakeUp = resolve;
      timerId = setTimeout(resolve, ms);
    });

  // 입력 사이사이 로그아웃·계정 변경·시연 모드 끄기를 놓치지 않도록 매번 본다.
  const canContinue = () =>
    !cancelled &&
    getDemoModeOwner() === ownerKey &&
    getCurrentUserKey() === ownerKey &&
    sink.isValid();

  const execute = async () => {
    let wroteAnything = false;

    const write = (chunk: string) => {
      const ok = sink.write(chunk);
      if (ok) wroteAnything = true;
      return ok;
    };

    try {
      if (options.replaceExisting && sink.select) {
        sink.select();
        await wait(options.selectDelayMs);
        if (!canContinue()) return;
        if (sink.clear) {
          sink.clear();
          wroteAnything = true;
          await wait(options.clearDelayMs);
          if (!canContinue()) return;
        }
      }

      if (options.mode === "paste") {
        write(options.text);
        return;
      }

      // 한글·이모지가 쪼개지지 않게 코드포인트 단위로 자른다.
      const chars = Array.from(options.text);
      const step = Math.max(1, options.charsPerTick);

      for (let index = 0; index < chars.length; index += step) {
        if (!canContinue()) return;

        // 일시정지 중에는 아무것도 쓰지 않는다. 풀리면 index 그대로, 다음 글자부터 잇는다.
        // 그사이 시연 모드를 끄거나 파일·브랜치를 바꾸면 canContinue 에서 끝난다.
        while (paused) {
          await wait(200);
          if (!canContinue()) return;
        }

        const blockedSince = Date.now();
        while (sink.isBlocked?.()) {
          if (Date.now() - blockedSince > (options.blockedTimeoutMs ?? 0)) return;
          await wait(100);
          if (!canContinue()) return;
        }

        if (!write(chars.slice(index, index + step).join(""))) return;
        await wait(options.intervalMs);
      }
    } catch (error) {
      // 자동 입력이 실패해도 입력창은 그대로 쓸 수 있어야 한다.
      console.warn("[시연 입력] 중단됨", error);
    } finally {
      // 시작하면 완료로 친다. 중간에 끊긴 것을 다시 클릭해 같은 코드가 또 들어가면 안 된다.
      // 한 글자도 못 넣었으면 다시 시도할 수 있게 둔다.
      if (wroteAnything) doneTargets.add(targetId);
      activeRun = null;
      options.onFinish?.();
    }
  };

  activeRun = run;
  void execute();
  return run;
}
