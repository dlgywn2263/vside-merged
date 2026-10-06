"use client";

// 경로: src/lib/ide/sandbox/sandboxApply.ts
//
// 샌드박스 파일 하나를 팀 파일에 반영한다. 명세: docs/safe-run-sandbox.md 7절.
//
// 서버는 동시편집 문서를 해석하지 못한다(중계만 한다). 그래서 길이 둘로 갈린다.
//
//   · 그 파일의 팀 방이 닫혀 있다 / 새 파일 / 삭제  → 서버가 디스크에 직접 쓴다
//   · 팀 방이 열려 있다(팀원이 그 파일을 열어 두었다) → 이 브라우저가 팀 문서에 직접 넣는다
//
// 방이 열려 있는데 디스크만 고치면, 방의 문서는 옛 내용이라 누가 한 글자만 쳐도 자동
// 저장이 옛 내용으로 디스크를 덮는다. 그래서 그 경우는 문서 쪽에 넣어야 한다.

import type * as Y from "yjs";

import { fetchFileContentApi, saveFileApi } from "@/lib/ide/api";
import { CodeDocSession } from "@/lib/ide/collab/codeDocSession";
import { teamRoomName } from "@/lib/ide/collab/roomName";

import {
  applySandboxDirectApi,
  markSandboxAppliedApi,
  mergeSandboxFileApi,
  type SandboxScope,
} from "./sandboxApi";

export type SandboxApplyOutcome =
  /** 반영됐다(또는 반영할 것이 없어 샌드박스에서 빠졌다). */
  | { kind: "applied"; filePath: string; via: "server" | "browser" | "nothing" }
  /** 같은 곳을 팀도 고쳤다. content 는 충돌 표식이 든 본문, liveContent 는 그때의 팀 내용. */
  | { kind: "conflict"; filePath: string; content: string; liveContent: string }
  /** 내가 지운 파일을 그 사이 팀이 고쳤다. */
  | { kind: "deleteConflict"; filePath: string; liveContent: string };

/** 팀 방에 붙은 뒤 팀원들의 최신 내용을 받을 때까지 기다리는 최대 시간. */
const SYNC_WAIT_MS = 2000;

/** 넣으려는 순간 팀원이 또 고쳤으면 다시 계산한다. 이 횟수를 넘기면 포기한다. */
const MAX_RETRIES = 4;

/**
 * 문서에서 before 와 merged 가 다른 부분만 바꾼다.
 *
 * 문서 전체를 지우고 다시 넣으면 안 된다. 그러면 반영하는 순간 팀원이 다른 줄에 치고
 * 있던 글자가 지워지고, 팀원의 커서가 맨 앞으로 튄다. 앞뒤로 같은 부분은 건드리지 않고
 * 가운데만 바꾸면 나머지는 CRDT 가 그대로 지킨다.
 *
 * 삭제와 삽입을 한 트랜잭션으로 묶는다. 나뉘면 팀원 화면에 "지워진 순간"이 잠깐 보인다.
 */
export function applyMergedText(doc: Y.Doc, yText: Y.Text, before: string, merged: string): void {
  if (before === merged) return;

  let start = 0;
  const max = Math.min(before.length, merged.length);

  while (start < max && before[start] === merged[start]) start += 1;

  let endBefore = before.length;
  let endMerged = merged.length;

  while (endBefore > start && endMerged > start && before[endBefore - 1] === merged[endMerged - 1]) {
    endBefore -= 1;
    endMerged -= 1;
  }

  // origin 을 따로 준다. 에디터의 되돌리기(Y.UndoManager)는 y-monaco 바인딩이 넣은 편집만
  // 추적하므로, 이 편집은 누구의 Ctrl+Z 에도 되돌려지지 않는다.
  doc.transact(() => {
    if (endBefore > start) yText.delete(start, endBefore - start);
    if (endMerged > start) yText.insert(start, merged.slice(start, endMerged));
  }, "sandbox-apply");
}

export async function applySandboxFile(scope: SandboxScope, filePath: string): Promise<SandboxApplyOutcome> {
  // 먼저 종류와 방 상태만 본다(디스크 기준).
  const first = await mergeSandboxFileApi(scope, filePath, null);

  switch (first.status) {
    case "UNCHANGED":
      await markSandboxAppliedApi(scope, filePath);
      return { kind: "applied", filePath, via: "nothing" };

    case "DELETE_CONFLICT":
      return { kind: "deleteConflict", filePath, liveContent: first.content ?? "" };

    case "NEW_FILE":
    case "DELETED":
      // 파일을 만들고 지우는 것은 문서 편집으로 할 수 없다. 방 상태와 무관하게 서버가 한다.
      return applyOnServer(scope, filePath);

    case "CONFLICT":
      // 방이 열려 있으면 디스크가 아니라 문서의 지금 내용으로 다시 판정해야 한다.
      if (first.roomOpen) return applyInBrowser(scope, filePath);
      return conflictFromDisk(scope, filePath, first.content ?? "");

    case "CLEAN":
    default:
      return first.roomOpen ? applyInBrowser(scope, filePath) : applyOnServer(scope, filePath);
  }
}

/** 방이 닫힌 파일에서 난 충돌. 팀 파일의 지금 내용(디스크)을 같이 돌려준다. */
async function conflictFromDisk(
  scope: SandboxScope,
  filePath: string,
  content: string,
): Promise<SandboxApplyOutcome> {
  const liveContent = await fetchFileContentApi(
    scope.workspaceId,
    scope.projectName,
    scope.branchName,
    filePath,
  );

  return { kind: "conflict", filePath, content, liveContent };
}

async function applyOnServer(scope: SandboxScope, filePath: string): Promise<SandboxApplyOutcome> {
  const result = await applySandboxDirectApi(scope, filePath);

  // 판정한 뒤에 누가 그 파일을 열었다. 항상 있을 수 있는 일이라 반드시 처리한다.
  if (result === "ROOM_OPEN") return applyInBrowser(scope, filePath);

  if (result.status === "CONFLICT") return conflictFromDisk(scope, filePath, result.content ?? "");

  if (result.status === "DELETE_CONFLICT") {
    return { kind: "deleteConflict", filePath, liveContent: result.content ?? "" };
  }

  return { kind: "applied", filePath, via: result.status === "UNCHANGED" ? "nothing" : "server" };
}

/**
 * 팀원이 열어 둔 파일. 화면에 띄우지 않는 세션으로 팀 방에 들어가 문서에 직접 넣는다.
 *
 * 세션은 에디터가 쓰는 것과 같은 CodeDocSession 이다. 그래서 "저장본 조회 → 접속"
 * 순서와 저장 담당 규칙(끊기 전에 저장 여부 판정)을 그대로 따른다.
 */
async function applyInBrowser(scope: SandboxScope, filePath: string): Promise<SandboxApplyOutcome> {
  const session = await openTeamSession(scope, filePath);

  try {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
      const before = session.yText.toString();
      const view = await mergeSandboxFileApi(scope, filePath, before);

      if (view.status === "CONFLICT") {
        return { kind: "conflict", filePath, content: view.content ?? "", liveContent: before };
      }

      if (view.status === "DELETE_CONFLICT") {
        return { kind: "deleteConflict", filePath, liveContent: before };
      }

      if (view.status === "UNCHANGED") {
        await markSandboxAppliedApi(scope, filePath);
        return { kind: "applied", filePath, via: "nothing" };
      }

      if (view.status !== "CLEAN") {
        // 그 사이 팀이 파일을 지웠거나 하는 드문 경우. 서버에게 맡긴다.
        const result = await applySandboxDirectApi(scope, filePath);
        if (result === "ROOM_OPEN") continue;
        return { kind: "applied", filePath, via: "server" };
      }

      // 판정을 기다리는 동안 팀원이 또 고쳤으면 그 결과는 낡았다. 다시 계산한다.
      // 이 확인과 아래 적용 사이에는 await 가 없어야 한다(그 사이에 편집이 끼어든다).
      if (session.yText.toString() !== before) continue;

      applyMergedText(session.doc, session.yText, before, view.content ?? "");

      // 내가 저장 담당이면 디스크에 바로 쓴다. 아니면 담당인 팀원이 몇 초 안에 쓴다.
      await session.flush();
      await markSandboxAppliedApi(scope, filePath);

      return { kind: "applied", filePath, via: "browser" };
    }

    throw new Error(`팀원이 계속 고치고 있어 반영하지 못했습니다. 잠시 뒤 다시 시도해 주세요: ${filePath}`);
  } finally {
    session.destroy();
  }
}

/**
 * 화면에 띄우지 않는 세션으로 팀 방에 들어간다. 팀원들의 최신 내용까지 받은 뒤 돌려준다.
 * 다 쓰고 나면 부르는 쪽이 반드시 destroy() 해야 한다.
 */
async function openTeamSession(scope: SandboxScope, filePath: string): Promise<CodeDocSession> {
  const diskContent = await fetchFileContentApi(
    scope.workspaceId,
    scope.projectName,
    scope.branchName,
    filePath,
  );

  const session = new CodeDocSession({
    room: teamRoomName({ ...scope, filePath }),
    diskContent: String(diskContent ?? "").replace(/\r\n/g, "\n"),
    saveFile: async (content) => {
      // 팀 방의 자동 저장과 같은 규칙. 빈 문서로 멀쩡한 파일을 덮지 않는다.
      await saveFileApi(scope.workspaceId, scope.projectName, scope.branchName, filePath, content, {
        allowEmpty: false,
      });
    },
  });

  try {
    await session.open();

    if (session.getStatus() !== "ready") {
      throw new Error(`팀 문서에 접속하지 못했습니다: ${filePath}`);
    }

    // 서버에 보관된 문서는 팀원 화면보다 몇 초 늦을 수 있다. 접속한 팀원들이 빠진
    // 부분을 보내 줄 때까지 기다린다. 아무도 없으면 오지 않으므로 시간으로 끊는다.
    await waitForSync(session);
  } catch (error) {
    session.destroy();
    throw error;
  }

  return session;
}

/**
 * 팀 파일의 지금 내용. 팀 쪽에 그 파일이 없으면 null.
 *
 * 팀원이 그 파일을 열어 두었으면 팀 문서에서 읽는다. 디스크는 몇 초 늦어서, 디스크로
 * 읽으면 팀원이 방금 친 내용이 빠진다. 아무도 열어 두지 않았으면 디스크가 곧 최신이다.
 */
export async function readTeamLiveContent(scope: SandboxScope, filePath: string): Promise<string | null> {
  // 판정 API 가 그 파일의 팀 방이 열려 있는지를 같이 알려 준다. 판정 결과는 쓰지 않는다.
  const { roomOpen } = await mergeSandboxFileApi(scope, filePath, null);

  if (!roomOpen) {
    try {
      const disk = await fetchFileContentApi(scope.workspaceId, scope.projectName, scope.branchName, filePath);
      return String(disk ?? "").replace(/\r\n/g, "\n");
    } catch {
      return null;
    }
  }

  const session = await openTeamSession(scope, filePath);

  try {
    return session.yText.toString();
  } finally {
    session.destroy();
  }
}

function waitForSync(session: CodeDocSession): Promise<void> {
  const provider = session.provider;

  if (!provider || provider.synced) return Promise.resolve();

  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      provider.off("sync", onSync);
      resolve();
    };

    const onSync = (isSynced: boolean) => {
      if (isSynced) finish();
    };

    const timer = setTimeout(finish, SYNC_WAIT_MS);
    provider.on("sync", onSync);
  });
}
