"use client";

// 경로: src/components/design/api/designDocApi.ts
//
// 설계 문서 저장본 API. 인증 갱신과 401 재시도는 공용 apiFetch 가 이미
// 처리하므로 여기서는 응답 해석만 한다.

import { apiFetch } from "@/lib/api/apiClient";

import type { DesignModel } from "../model/schema";

const WORKSPACE_API_BASE = "/api/workspaces";

export interface DesignDocResponse {
  schemaVersion: number;
  revision: number;
  yjsUpdate: string | null;
  projection: DesignModel;
  needsSeed: boolean;
}

export interface DesignDocWritePayload {
  schemaVersion: number;
  yjsUpdate: string;
  projection: DesignModel;
}

export interface DesignCheckpoint {
  id: string;
  label: string;
  /** 그 시점에 담겨 있던 것. 예전 기록에는 없어서 빌 수 있다. */
  summary: string;
  createdByNickname: string;
  createdAt: string;
}

/** 시드 결과. accepted 가 false 면 다른 사람이 먼저 시드했다는 뜻이다. */
export interface SeedResult {
  accepted: boolean;
  doc: DesignDocResponse;
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

export async function fetchDesignDocApi(workspaceId: string): Promise<DesignDocResponse> {
  const response = await request(`${WORKSPACE_API_BASE}/${encodeURIComponent(workspaceId)}/design/doc`);
  return readJson<DesignDocResponse>(response, "설계 문서를 불러오지 못했습니다.");
}

/**
 * 저장본이 없을 때만 받아들여진다.
 *
 * 409 는 오류가 아니라 정상적인 경쟁 결과다. 두 명이 같은 시각에
 * 워크스페이스를 처음 열면 한쪽만 이기고, 진 쪽은 자기가 만든 문서를 버리고
 * 응답으로 받은 것을 써야 한다. 그래서 예외로 던지지 않고 결과로 돌려준다.
 */
export async function seedDesignDocApi(
  workspaceId: string,
  payload: DesignDocWritePayload,
): Promise<SeedResult> {
  const response = await request(
    `${WORKSPACE_API_BASE}/${encodeURIComponent(workspaceId)}/design/doc/seed`,
    { method: "POST", body: JSON.stringify(payload) },
  );

  if (response.status === 409) {
    const text = await response.text().catch(() => "");
    return { accepted: false, doc: JSON.parse(text) as DesignDocResponse };
  }

  const doc = await readJson<DesignDocResponse>(response, "설계 문서를 만들지 못했습니다.");
  return { accepted: true, doc };
}

export async function saveDesignSnapshotApi(
  workspaceId: string,
  payload: DesignDocWritePayload,
): Promise<DesignDocResponse> {
  const response = await request(
    `${WORKSPACE_API_BASE}/${encodeURIComponent(workspaceId)}/design/doc/snapshot`,
    { method: "PUT", body: JSON.stringify(payload) },
  );

  return readJson<DesignDocResponse>(response, "설계 문서를 저장하지 못했습니다.");
}

export async function listDesignCheckpointsApi(
  workspaceId: string,
): Promise<DesignCheckpoint[]> {
  const response = await request(
    `${WORKSPACE_API_BASE}/${encodeURIComponent(workspaceId)}/design/doc/checkpoints`,
  );

  return (await readJson<DesignCheckpoint[]>(response, "기록을 불러오지 못했습니다.")) ?? [];
}

export async function createDesignCheckpointApi(
  workspaceId: string,
  label: string,
): Promise<DesignCheckpoint> {
  const response = await request(
    `${WORKSPACE_API_BASE}/${encodeURIComponent(workspaceId)}/design/doc/checkpoints`,
    { method: "POST", body: JSON.stringify({ label }) },
  );

  return readJson<DesignCheckpoint>(response, "기록을 남기지 못했습니다.");
}

export async function restoreDesignCheckpointApi(
  workspaceId: string,
  checkpointId: string,
): Promise<DesignDocResponse> {
  const response = await request(
    `${WORKSPACE_API_BASE}/${encodeURIComponent(workspaceId)}/design/doc/checkpoints/${encodeURIComponent(checkpointId)}/restore`,
    { method: "POST" },
  );

  return readJson<DesignDocResponse>(response, "되돌리지 못했습니다.");
}
