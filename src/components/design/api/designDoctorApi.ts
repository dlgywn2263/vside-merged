"use client";

// 경로: src/components/design/api/designDoctorApi.ts

import { apiFetch } from "@/lib/api/apiClient";

import type { DesignModel } from "../model/schema";

export type FindingSeverity = "ERROR" | "WARNING" | "INFO";

export type FixKind =
  | "RENAME_COLUMN"
  | "SET_SCREEN_ROUTE"
  | "ADD_PK_COLUMN"
  | "ALIGN_FK_TYPE"
  | "DELETE_RELATION"
  | "DELETE_TRANSITION";

/**
 * 기계적으로 고칠 수 있는 문제를 어떻게 고칠지.
 *
 * 무엇을 어떻게 바꿀지까지 서버가 정한다. 화면이 따로 계산하면 판정하는 쪽과
 * 어긋나서, 눌러도 오류가 안 사라지는 일이 생긴다.
 */
export interface Fix {
  kind: FixKind;
  targetId: string;
  columnId: string | null;
  value: string | null;
  length: number | null;
}

export interface Finding {
  ruleId: string;
  severity: FindingSeverity;
  /** requirement | screen | transition | api | table | relation */
  targetKind: string;
  targetId: string;
  targetLabel: string;
  message: string;
  fixHint: string;
  /** 고칠 수 있는 문제에만 담긴다. */
  fix: Fix | null;
}

export interface DoctorReport {
  findings: Finding[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
  codegenBlocked: boolean;
}

export const EMPTY_REPORT: DoctorReport = {
  findings: [],
  errorCount: 0,
  warningCount: 0,
  infoCount: 0,
  codegenBlocked: false,
};

export async function inspectDesignApi(
  workspaceId: string,
  projection: DesignModel,
): Promise<DoctorReport> {
  const response = await apiFetch(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/design/doctor`,
    {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projection }),
    },
  );

  const text = await response.text().catch(() => "");

  if (!response.ok) {
    const error = new Error(text || "설계 점검에 실패했습니다.") as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return (text ? JSON.parse(text) : EMPTY_REPORT) as DoctorReport;
}
