"use client";

// 경로: src/lib/ide/safeRun.ts
//
// 안전 실행 — 팀원이 코드를 쓰는 중이어도 서버가 "돌아가는 조합"을 찾아 실행한다.
// 여기에는 서버와 주고받는 것의 모양과, 실행 출력에서 기계용 줄을 가려내는 일만 둔다.
// 명세: 백엔드 저장소의 docs/safe-run-sandbox.md

import { apiFetch } from "@/lib/api/apiClient";

/** 준비됨 / 수정 중. 그 사람이 고친 파일이 전부 문법 검사를 통과하면 READY 다. */
export type AuthorStatus = "READY" | "EDITING";

export interface SafeRunAuthor {
  userId: number;
  nickname: string;
  status: AuthorStatus;
  files: string[];
}

/** 상태바에 보여 줄 것. 조회 응답과 실시간 알림이 같은 모양으로 온다. */
export interface SafeRunStatus {
  workspaceId: string;
  projectName: string;
  branchName: string;
  /** 정상 버전을 만든 시각(epoch 밀리초). 아직 없으면 null. */
  greenUpdatedAt: number | null;
  /** 정상 버전 이후 무언가 고친 사람만 나온다. */
  authors: SafeRunAuthor[];
}

/** 실행 한 번의 결과. 서버가 [SAFE_RUN_INFO] 줄에 실어 보낸다. */
export interface SafeRunInfo {
  success: boolean;
  /** 빌드를 몇 번 했는가(1~3). */
  builds: number;
  mode: "FULL" | "EXCLUDED" | "OWN_ONLY" | "NO_GREEN";
  /** 변경이 빠진 작성자와, 실제로 정상 버전으로 되돌린 파일. */
  excluded: { userId: number; nickname: string; files: string[] }[];
  /** 에러가 난 파일 중 나와 다른 사람이 함께 고친 파일. 서버가 되돌리지 않은 것이다. */
  sharedFiles: { file: string; coAuthors: { userId: number; nickname: string }[] }[];
  errorFiles: string[];
  greenUpdated: boolean;
}

const INFO_PREFIX = "[SAFE_RUN_INFO]";

/** Spring Boot 는 서버 전체에서 동시에 정해진 개수만 돈다. 기다리게 되면 이 줄이 온다. */
const WAITING_TEXT = "다른 실행이 끝나기를 기다리는 중";

/**
 * 실행 출력 한 덩어리가 기계용 안내 줄이면 풀어서 돌려주고, 아니면 null.
 *
 * 이 줄은 출력 창에 찍으면 안 된다. 서버는 이 줄을 메시지 하나에 통째로 담아
 * 보내므로 메시지 단위로 가려내면 된다.
 */
export function parseSafeRunInfo(message: string): SafeRunInfo | null {
  if (typeof message !== "string" || !message.startsWith(INFO_PREFIX)) return null;

  try {
    return JSON.parse(message.slice(INFO_PREFIX.length)) as SafeRunInfo;
  } catch {
    // 풀지 못해도 기계용 줄인 것은 맞다. 화면에 찍히지 않게 빈 결과로라도 가려낸다.
    return {
      success: false,
      builds: 0,
      mode: "FULL",
      excluded: [],
      sharedFiles: [],
      errorFiles: [],
      greenUpdated: false,
    };
  }
}

export function isWaitingForRunSlot(message: string): boolean {
  return typeof message === "string" && message.includes(WAITING_TEXT);
}

/**
 * 지금의 작성자 상태. 알림은 바뀔 때만 오므로, 화면을 열거나 브랜치를 바꾼
 * 직후에는 이것으로 한 번 받아 와야 한다.
 */
export async function fetchSafeRunStatusApi(
  workspaceId: string,
  projectName: string,
  branchName: string,
): Promise<SafeRunStatus> {
  const query = new URLSearchParams({
    workspaceId,
    projectName,
    branchName: branchName || "master",
  });

  const response = await apiFetch(`/api/safe-run/status?${query.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("작성자 상태를 불러오지 못했습니다.");
  }

  return (await response.json()) as SafeRunStatus;
}
