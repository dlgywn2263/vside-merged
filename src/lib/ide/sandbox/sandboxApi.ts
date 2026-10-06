"use client";

// 경로: src/lib/ide/sandbox/sandboxApi.ts
//
// 샌드박스(개인 레이어) API. 명세: 백엔드 저장소의 docs/safe-run-sandbox.md 5절.
//
// 예전 샌드박스는 개인 브랜치를 만들었다. 지금은 브랜치를 만들지도 바꾸지도 않는다.
// 같은 브랜치에 머문 채 "내가 고친 파일"만 서버가 따로 보관한다.
// 누구의 샌드박스인지는 요청에 싣지 않는다. 서버가 토큰에서 읽는다.

import { apiFetch } from "@/lib/api/apiClient";

const BASE = "/api/sandbox";

/** 샌드박스는 워크스페이스·프로젝트·브랜치(그리고 사람)마다 따로다. */
export interface SandboxScope {
  workspaceId: string;
  projectName: string;
  branchName: string;
}

export type SandboxFileKind = "MODIFIED" | "NEW" | "DELETED";

export interface SandboxPendingFile {
  filePath: string;
  kind: SandboxFileKind;
  /**
   * 내가 이 파일을 고치기 시작한 뒤로 팀 파일이 달라졌는지.
   *
   * 샌드박스에서 고치는 파일은 팀원의 편집이 화면에 보이지 않는다. 이 값이 "팀이 이
   * 파일을 고쳤다"를 알 수 있는 유일한 단서다. 켜져 있으면 가져오기 버튼을 띄운다.
   */
  teamChanged?: boolean;
}

/** @property files 아직 팀 파일에 반영하지 않은 것 */
export interface SandboxStateResponse {
  enabled: boolean;
  files: SandboxPendingFile[];
}

export type SandboxMergeStatus =
  | "UNCHANGED"
  | "CLEAN"
  | "CONFLICT"
  | "NEW_FILE"
  | "DELETED"
  | "DELETE_CONFLICT";

export interface SandboxMergeView {
  filePath: string;
  status: SandboxMergeStatus;
  /** CLEAN: 팀 파일에 넣을 병합 결과 / CONFLICT: 충돌 표식이 든 본문 / DELETE_CONFLICT: 팀의 지금 내용 */
  content: string | null;
  /** 이 파일의 팀 공유 방이 열려 있는지. 열려 있으면 브라우저가 문서에 직접 넣어야 한다. */
  roomOpen: boolean;
}

type ApiError = Error & { status?: number; payload?: unknown };

async function send(path: string, method: string, body?: Record<string, unknown>): Promise<Response> {
  return apiFetch(path, {
    method,
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

async function fail(response: Response, fallbackMessage: string): Promise<never> {
  const text = await response.text().catch(() => "");
  let payload: unknown = text;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    // 본문이 JSON 이 아니면 글자 그대로 둔다.
  }

  const message =
    payload && typeof payload === "object" && "message" in payload
      ? String((payload as { message: unknown }).message)
      : typeof payload === "string" && payload
        ? payload
        : fallbackMessage;

  const error = new Error(message) as ApiError;
  error.status = response.status;
  error.payload = payload;
  throw error;
}

async function json<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) await fail(response, fallbackMessage);
  return (await response.json()) as T;
}

async function noContent(response: Response, fallbackMessage: string): Promise<void> {
  if (!response.ok) await fail(response, fallbackMessage);
}

function query(scope: SandboxScope, extra: Record<string, string> = {}): string {
  return new URLSearchParams({ ...scope, ...extra }).toString();
}

/** 켠다. 깃발만 바뀐다 — 브랜치를 만들지도 바꾸지도 않는다. */
export async function enableSandboxApi(scope: SandboxScope): Promise<SandboxStateResponse> {
  return json(await send(`${BASE}/enable`, "POST", { ...scope }), "샌드박스를 켜지 못했습니다.");
}

/** 끈다. 고친 파일은 서버에 그대로 남는다. 다시 켜면 이어서 작업한다. */
export async function disableSandboxApi(scope: SandboxScope): Promise<SandboxStateResponse> {
  return json(await send(`${BASE}/disable`, "POST", { ...scope }), "샌드박스를 끄지 못했습니다.");
}

export async function fetchSandboxStateApi(scope: SandboxScope): Promise<SandboxStateResponse> {
  return json(await send(`${BASE}/state?${query(scope)}`, "GET"), "샌드박스 상태를 불러오지 못했습니다.");
}

/**
 * 파일을 처음 고치는 순간 부른다. 그 순간의 팀 파일을 사본으로 뜬다.
 *
 * liveContent 는 반드시 보낸다 — 팀 공유 문서(Y.Text)의 지금 내용이다. 서버의 디스크는
 * 최대 30초 늦어서, 보내지 않으면 팀원이 방금 친 내용이 내 샌드박스에서 빠지고 반영할 때
 * 그것을 "내가 지운 것"으로 착각한다.
 *
 * @returns 샌드박스 파일의 내용. 이미 사본이 있으면 그것이 그대로 온다
 */
export async function forkSandboxFileApi(
  scope: SandboxScope,
  filePath: string,
  liveContent: string | null,
): Promise<string> {
  const result = await json<{ content: string }>(
    await send(`${BASE}/files/fork`, "POST", { ...scope, filePath, liveContent }),
    "샌드박스 사본을 만들지 못했습니다.",
  );

  return result.content ?? "";
}

/** 샌드박스에서 본 파일 내용. 내가 고친 파일이면 내 것, 아니면 팀 파일. */
export async function fetchSandboxFileApi(scope: SandboxScope, filePath: string): Promise<string> {
  const result = await json<{ content: string }>(
    await send(`${BASE}/file?${query(scope, { path: filePath })}`, "GET"),
    "샌드박스 파일을 불러오지 못했습니다.",
  );

  return result.content ?? "";
}

/**
 * 샌드박스 파일을 저장한다.
 *
 * sbx 방의 저장은 반드시 이것으로 간다. 팀 파일 저장(/api/workspaces/save)을 부르면
 * 팀 파일이 내 샌드박스 내용으로 덮인다.
 */
export async function saveSandboxFileApi(scope: SandboxScope, filePath: string, code: string): Promise<void> {
  await noContent(await send(`${BASE}/file`, "PUT", { ...scope, filePath, code }), "샌드박스에 저장하지 못했습니다.");
}

/** 샌드박스에서 지운다. 팀 파일은 그대로다(반영할 때 지워진다). */
export async function deleteSandboxFileApi(scope: SandboxScope, filePath: string): Promise<void> {
  await noContent(await send(`${BASE}/file`, "DELETE", { ...scope, filePath }), "샌드박스에서 삭제하지 못했습니다.");
}

/** 반영하면 어떻게 되는지 판정만 한다. 서버는 아무것도 쓰지 않는다. */
export async function mergeSandboxFileApi(
  scope: SandboxScope,
  filePath: string,
  liveContent: string | null,
): Promise<SandboxMergeView> {
  return json(
    await send(`${BASE}/merge`, "POST", { ...scope, filePath, liveContent }),
    "반영 결과를 계산하지 못했습니다.",
  );
}

/**
 * 팀 변경을 내 샌드박스 파일로 가져온다(반영의 반대 방향). 팀 파일은 바뀌지 않는다.
 *
 * @param mine        내 개인 방 문서의 지금 내용. 서버에 저장된 것보다 몇 초 앞서 있을 수 있다
 * @param liveContent 팀 공유 문서의 지금 내용. 모르면 null(서버가 디스크를 읽는다)
 * @returns status 가 CLEAN 이면 content 가 가져온 뒤의 내 파일, UNCHANGED 면 가져올 것이
 *          없었던 것, CONFLICT 면 content 가 충돌 본문이고 서버는 아무것도 쓰지 않았다
 */
export async function pullSandboxFileApi(
  scope: SandboxScope,
  filePath: string,
  mine: string,
  liveContent: string | null,
): Promise<SandboxMergeView> {
  return json(
    await send(`${BASE}/pull`, "POST", { ...scope, filePath, code: mine, liveContent }),
    "팀 변경을 가져오지 못했습니다.",
  );
}

/**
 * 충돌을 해결한 결과를 저장하고, 비교 기준을 liveContent(충돌을 본 그 팀 내용)로 옮긴다.
 *
 * 그냥 저장(saveSandboxFileApi)으로 대신하면 안 된다. 기준이 그대로면 다시 반영할 때
 * 같은 자리에서 또 충돌한다.
 */
export async function resolveSandboxFileApi(
  scope: SandboxScope,
  filePath: string,
  code: string,
  liveContent: string,
): Promise<void> {
  await noContent(
    await send(`${BASE}/resolve`, "POST", { ...scope, filePath, code, liveContent }),
    "충돌 해결을 저장하지 못했습니다.",
  );
}

/** 브라우저가 팀 문서에 넣은 뒤 부른다. 그 파일이 샌드박스에서 빠진다. */
export async function markSandboxAppliedApi(scope: SandboxScope, filePath: string): Promise<void> {
  await noContent(await send(`${BASE}/applied`, "POST", { ...scope, filePath }), "반영 완료를 알리지 못했습니다.");
}

/**
 * 서버가 팀 파일에 직접 반영한다(방이 닫힌 파일, 새 파일, 삭제).
 *
 * @returns 판정 결과. 방이 열려 있어 서버가 쓸 수 없으면 "ROOM_OPEN" —
 *          오류가 아니라 브라우저 쪽 반영을 쓰라는 뜻이다
 */
export async function applySandboxDirectApi(
  scope: SandboxScope,
  filePath: string,
): Promise<SandboxMergeView | "ROOM_OPEN"> {
  const response = await send(`${BASE}/apply-direct`, "POST", { ...scope, filePath });

  if (response.status === 409) {
    const body = await response.clone().json().catch(() => null);

    if (body && typeof body === "object" && (body as { code?: string }).code === "ROOM_OPEN") {
      return "ROOM_OPEN";
    }
  }

  return json(response, "팀 파일에 반영하지 못했습니다.");
}

/** 버린다. 내 샌드박스 수정이 모두 사라진다. */
export async function discardSandboxApi(scope: SandboxScope): Promise<void> {
  await noContent(await send(`${BASE}/discard`, "POST", { ...scope }), "샌드박스를 버리지 못했습니다.");
}
