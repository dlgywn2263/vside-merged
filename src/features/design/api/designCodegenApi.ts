"use client";

// 경로: src/features/design/api/designCodegenApi.ts
//
// 코드 생성은 미리보기와 적용 두 번에 나눠 부른다. 무엇이 덮어써지는지
// 보지 않고 결정하게 하면 안 되기 때문이다.
//
// 적용할 때 파일 내용을 보내지 않는다는 점을 기억해 두면 좋다. 서버가 같은
// 설계로 다시 만들어서 고른 경로만 쓴다. 경로와 내용을 그대로 보내는 구조는
// 사실상 "아무 파일이나 쓸 수 있는 통로"가 된다.

import { apiFetch } from "@/lib/api/apiClient";

import type { DesignModel } from "../model/schema";
import type { Finding } from "./designDoctorApi";

export type CodegenFileStatus = "NEW" | "IDENTICAL" | "CONFLICT";

export interface CodegenFileView {
  path: string;
  content: string;
  status: CodegenFileStatus;
  existingHash: string;
  existingContent: string;
  target: string;
  targetLabel: string;
  sourceLabel: string;
}

export interface CodegenPreview {
  stack: "SPRING" | "REACT" | "NEXT" | "UNKNOWN";
  stackLabel: string;
  basePackage: string;
  note: string;
  files: CodegenFileView[];
  blockedBy: Finding[];
}

export type ApplyStatus = "WRITTEN" | "SKIPPED" | "CHANGED_MEANWHILE" | "FAILED";

export interface CodegenApplyResult {
  path: string;
  status: ApplyStatus;
  message: string;
}

export interface CodegenApplyReport {
  results: CodegenApplyResult[];
  written: number;
  skipped: number;
  failed: number;
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
    const error = new Error(text || fallback) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return JSON.parse(text) as T;
}

export async function previewCodegenApi(
  workspaceId: string,
  model: DesignModel,
  projectName: string,
  branchName: string,
  basePackage: string,
): Promise<CodegenPreview> {
  return post(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/design/codegen/preview`,
    { model, projectName, branchName, basePackage },
    "코드를 만들지 못했습니다.",
  );
}

export async function applyCodegenApi(
  workspaceId: string,
  model: DesignModel,
  projectName: string,
  branchName: string,
  basePackage: string,
  files: { path: string; expectedExistingHash: string }[],
): Promise<CodegenApplyReport> {
  return post(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/design/codegen/apply`,
    { model, projectName, branchName, basePackage, files },
    "파일을 넣지 못했습니다.",
  );
}
