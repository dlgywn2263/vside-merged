"use client";

// 경로: src/lib/ide/collab/codeDocApi.ts
//
// 코드 파일 동시편집 문서 API.
//
// 협업 서버는 문서를 보관하지 않아서, 파일을 열 때마다 누군가 디스크 내용으로
// 문서를 만들어 넣어야 한다. 예전에는 서버에서 "넣어도 되는지 허락"만 받고
// 내용은 각자 만들어 넣었다. 그래서 허락받은 사람이 넣기 전에 나가 버리면
// 나머지는 넣을 것도 받을 것도 없어 빈 문서에 갇혔다.
//
// 지금은 내용 자체를 주고받는다. 서버가 처음 받은 것만 채택하고 나머지에게는
// 채택된 것을 돌려주므로, 아무도 빈 문서에 갇히지 않고 같은 내용이 두 번
// 들어가지도 않는다.
//
// 인증 갱신과 401 재시도는 공용 apiFetch 가 처리하므로 여기서는 응답 해석만 한다.

import { apiFetch } from "@/lib/api/apiClient";

const BASE = "/api/collab/rooms";

export interface RoomDocResponse {
  needsSeed: boolean;
  yjsUpdate: string | null;
}

/** 시드 결과. accepted 가 false 면 다른 사람이 먼저 냈다는 뜻이다. */
export interface RoomSeedResult {
  accepted: boolean;
  yjsUpdate: string | null;
}

async function request(path: string, options: RequestInit = {}): Promise<Response> {
  return apiFetch(path, {
    ...options,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
}

async function readJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  const text = await response.text().catch(() => "");

  if (!response.ok) {
    const error = new Error(text || fallbackMessage) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return (text ? JSON.parse(text) : null) as T;
}

export async function fetchRoomDocApi(room: string): Promise<RoomDocResponse> {
  const response = await request(`${BASE}/doc?room=${encodeURIComponent(room)}`);

  return readJson<RoomDocResponse>(response, "문서를 불러오지 못했습니다.");
}

/**
 * 저장본이 없을 때만 채택된다.
 *
 * 409 는 오류가 아니라 정상적인 경쟁 결과다. 두 명이 같은 파일을 동시에 열면
 * 한쪽만 이기고, 진 쪽은 자기가 만든 문서를 버리고 응답으로 받은 것을 써야
 * 한다. 그래서 예외로 던지지 않고 결과로 돌려준다.
 */
export async function seedRoomDocApi(
  room: string,
  yjsUpdate: string,
): Promise<RoomSeedResult> {
  const response = await request(`${BASE}/doc/seed`, {
    method: "POST",
    body: JSON.stringify({ room, yjsUpdate }),
  });

  if (response.status === 409) {
    const text = await response.text().catch(() => "");
    return JSON.parse(text) as RoomSeedResult;
  }

  return readJson<RoomSeedResult>(response, "문서를 만들지 못했습니다.");
}

/** 저장 담당자가 올리는 최신 상태. 뒤늦게 들어온 사람이 이것을 받는다. */
export async function saveRoomDocApi(room: string, yjsUpdate: string): Promise<void> {
  const response = await request(`${BASE}/doc/snapshot`, {
    method: "PUT",
    body: JSON.stringify({ room, yjsUpdate }),
  });

  await readJson<unknown>(response, "문서를 저장하지 못했습니다.");
}
