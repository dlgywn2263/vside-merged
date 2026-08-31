"use client";

// 경로: src/features/design/api/designAiApi.ts
//
// 초안 생성은 두 번에 나눠 부른다. 한 번에 처리하면 응답까지 수십 초가
// 걸리는데 공용 HTTP 클라이언트에는 시간 제한이 없어서, 실패해도 사용자는
// 멈춘 화면만 보게 된다.

import { apiFetch } from "@/lib/api/apiClient";

import type { DesignModel, TechStack } from "../model/schema";
import type { DoctorReport } from "./designDoctorApi";

export interface DraftResponse {
  model: DesignModel;
  report: DoctorReport;
}

async function post<T>(path: string, body: unknown, fallback: string): Promise<T> {
  const response = await apiFetch(path, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await response.text().catch(() => "");

  if (!response.ok) {
    // 서버가 이유를 문장으로 돌려주므로 그대로 보여 준다.
    const error = new Error(text || fallback) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return JSON.parse(text) as T;
}

export async function generateSkeletonApi(
  workspaceId: string,
  summary: string,
  techStack: TechStack,
  instruction: string,
): Promise<DraftResponse> {
  return post(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/design/ai/skeleton`,
    { summary, techStack, instruction },
    "초안을 만들지 못했습니다.",
  );
}

export async function generateDetailApi(
  workspaceId: string,
  skeleton: DesignModel,
  instruction: string,
): Promise<DraftResponse> {
  return post(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/design/ai/detail`,
    { skeleton, instruction },
    "표와 API를 만들지 못했습니다.",
  );
}

export async function fetchAiStatusApi(): Promise<boolean> {
  try {
    const response = await apiFetch("/api/design/ai/status", { cache: "no-store" });
    if (!response.ok) return false;

    const text = await response.text();
    return Boolean(JSON.parse(text)?.available);
  } catch {
    return false;
  }
}
