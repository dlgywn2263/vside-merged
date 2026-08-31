"use client";

// 경로: src/features/design/api/designDoctorApi.ts

import { apiFetch } from "@/lib/api/apiClient";

import type { DesignModel } from "../model/schema";

export type FindingSeverity = "ERROR" | "WARNING" | "INFO";

export interface Finding {
  ruleId: string;
  severity: FindingSeverity;
  /** requirement | screen | transition | api | table | relation */
  targetKind: string;
  targetId: string;
  targetLabel: string;
  message: string;
  fixHint: string;
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
