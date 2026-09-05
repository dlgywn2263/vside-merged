"use client";

// 경로: src/components/design/components/DoctorPanel.tsx
//
// 설계 점검 결과 패널.
//
// 문제를 알려 주는 것으로 끝나면 반쯤만 쓸모 있다. 항목을 누르면 그 자리로
// 데려다주는 것까지가 이 기능의 값어치다.

import { useMemo } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Wand2, X } from "lucide-react";

import { cn } from "@/lib/utils";

import type { DoctorReport, Finding, FindingSeverity } from "../api/designDoctorApi";
import { focusDesignTarget, useDesignUiStore } from "../store/designUiStore";
import { applyDoctorFix, describeFix } from "../doctor/applyFix";
import type { DesignMutations } from "../realtime/mutations";

const SEVERITY_ORDER: FindingSeverity[] = ["ERROR", "WARNING", "INFO"];

const SEVERITY_META: Record<
  FindingSeverity,
  { label: string; icon: typeof AlertCircle; tone: string; dot: string }
> = {
  ERROR: {
    label: "고쳐야 함",
    icon: AlertCircle,
    tone: "text-red-600",
    dot: "bg-red-500",
  },
  WARNING: {
    label: "확인 필요",
    icon: AlertTriangle,
    tone: "text-amber-600",
    dot: "bg-amber-500",
  },
  INFO: {
    label: "참고",
    icon: Info,
    tone: "text-slate-500",
    dot: "bg-slate-400",
  },
};

export interface DoctorPanelProps {
  report: DoctorReport;
  /** 없으면 "고치기" 버튼을 띄우지 않는다. */
  mutations: DesignMutations | null;
}

export function DoctorPanel({ report, mutations }: DoctorPanelProps) {
  const toggleDoctor = useDesignUiStore((s) => s.toggleDoctor);

  const grouped = useMemo(() => {
    const map = new Map<FindingSeverity, Finding[]>();
    SEVERITY_ORDER.forEach((severity) => map.set(severity, []));
    report.findings.forEach((finding) => map.get(finding.severity)?.push(finding));
    return map;
  }, [report.findings]);

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">설계 점검</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {report.findings.length === 0
              ? "문제를 찾지 못했습니다."
              : `${report.errorCount}개 고쳐야 함 · ${report.warningCount}개 확인 필요`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => toggleDoctor(false)}
          className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="점검 패널 닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {report.codegenBlocked ? (
        <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">
          고쳐야 할 항목이 남아 있어 코드 생성이 막혀 있습니다.
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {report.findings.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            <p className="text-sm text-slate-500">지금은 짚어 드릴 것이 없습니다.</p>
            <p className="text-xs text-slate-400">
              요구사항과 화면, API, 테이블이 서로 잘 이어져 있습니다.
            </p>
          </div>
        ) : (
          SEVERITY_ORDER.map((severity) => {
            const items = grouped.get(severity) ?? [];
            if (items.length === 0) return null;

            const meta = SEVERITY_META[severity];
            const Icon = meta.icon;

            return (
              <section key={severity} className="border-b border-slate-100 last:border-b-0">
                <p
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 text-xs font-semibold",
                    meta.tone,
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {meta.label}
                  <span className="text-slate-400">{items.length}</span>
                </p>

                <ul>
                  {items.map((finding, index) => (
                    <li key={`${finding.ruleId}-${finding.targetId}-${index}`}>
                      <button
                        type="button"
                        onClick={() => focusDesignTarget(finding.targetKind, finding.targetId)}
                        className="flex w-full gap-2 px-4 py-2 text-left transition hover:bg-slate-50"
                      >
                        <span
                          className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", meta.dot)}
                        />

                        <span className="min-w-0 flex-1">
                          {finding.targetLabel ? (
                            <span className="block truncate text-xs font-medium text-slate-700">
                              {finding.targetLabel}
                            </span>
                          ) : null}

                          <span className="block text-xs text-slate-600">{finding.message}</span>

                          {finding.fixHint ? (
                            <span className="mt-0.5 block text-[11px] text-slate-400">
                              {finding.fixHint}
                            </span>
                          ) : null}
                        </span>
                      </button>

                      {finding.fix && mutations ? (
                        <div className="pb-2 pl-9 pr-4">
                          <button
                            type="button"
                            onClick={() => applyDoctorFix(mutations, finding.fix!)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            <Wand2 className="h-3 w-3" />
                            {describeFix(finding.fix)}
                          </button>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </div>
    </aside>
  );
}
