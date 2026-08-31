"use client";

// 경로: src/features/design/ai/AiDraftDialog.tsx
//
// 한 줄 설명에서 설계 초안을 만드는 흐름.
//
// AI가 만든 것이 문서에 곧바로 들어가지 않는다. 무엇이 만들어졌는지 보고
// 필요 없는 것을 빼고 나서야 반영된다. 반영은 덮어쓰기가 아니라 더하기라,
// 손으로 적어 둔 내용은 그대로 남는다.

import { useState } from "react";
import { AlertTriangle, Check, Loader2, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { generateDetailApi, generateSkeletonApi } from "../api/designAiApi";
import type { DoctorReport } from "../api/designDoctorApi";
import type { DesignModel } from "../model/schema";
import type { DesignMutations } from "../realtime/mutations";

type Step = "input" | "generating" | "review";

export interface AiDraftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  mutations: DesignMutations;
  /** 이미 문서에 내용이 있으면 더하기라는 점을 분명히 알린다. */
  hasExisting: boolean;
}

export function AiDraftDialog({
  open,
  onOpenChange,
  workspaceId,
  mutations,
  hasExisting,
}: AiDraftDialogProps) {
  const [step, setStep] = useState<Step>("input");
  const [progress, setProgress] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [summary, setSummary] = useState("");
  const [backend, setBackend] = useState("Spring Boot");
  const [frontend, setFrontend] = useState("React");
  const [db, setDb] = useState("MySQL");
  const [instruction, setInstruction] = useState("");

  const [draft, setDraft] = useState<DesignModel | null>(null);
  const [report, setReport] = useState<DoctorReport | null>(null);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  const reset = () => {
    setStep("input");
    setProgress("");
    setErrorMessage("");
    setDraft(null);
    setReport(null);
    setExcluded(new Set());
  };

  const close = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const generate = async () => {
    if (!summary.trim()) {
      setErrorMessage("어떤 서비스를 만들지 한 줄로 적어 주세요.");
      return;
    }

    setStep("generating");
    setErrorMessage("");

    try {
      setProgress("요구사항과 화면을 정리하는 중 (1/2)");
      const skeleton = await generateSkeletonApi(
        workspaceId,
        summary.trim(),
        { backend, frontend, db },
        instruction.trim(),
      );

      setProgress("표와 API를 설계하는 중 (2/2)");
      const detail = await generateDetailApi(
        workspaceId,
        skeleton.model,
        instruction.trim(),
      );

      setDraft(detail.model);
      setReport(detail.report);
      setStep("review");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "초안을 만들지 못했습니다.",
      );
      setStep("input");
    }
  };

  const toggle = (id: string) => {
    setExcluded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const apply = () => {
    if (!draft) return;

    mutations.applyDraft(filterDraft(draft, excluded));
    close(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            AI로 설계 초안 만들기
          </DialogTitle>
          <DialogDescription>
            {step === "review"
              ? "무엇이 만들어졌는지 확인하고, 필요 없는 것은 빼고 넣으세요."
              : "무엇을 만들지 한 줄로 알려 주면 요구사항과 화면, 표, API를 서로 연결해 만들어 드립니다."}
          </DialogDescription>
        </DialogHeader>

        {step === "generating" ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            <p className="text-sm text-slate-600">{progress}</p>
            <p className="text-xs text-slate-400">
              20초에서 1분쯤 걸립니다. 창을 닫지 말아 주세요.
            </p>
          </div>
        ) : step === "review" && draft ? (
          <ReviewStep draft={draft} report={report} excluded={excluded} onToggle={toggle} />
        ) : (
          <div className="space-y-4 py-2">
            {hasExisting ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                이미 작성된 내용이 있습니다. 지우지 않고 새로 만든 것만 더합니다.
              </p>
            ) : null}

            <Field label="어떤 서비스인가요?" hint="예: 학과 학생들이 중고 물품을 사고파는 웹">
              <Input
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                placeholder="한 줄로 적어 주세요"
                autoFocus
              />
            </Field>

            <div className="grid grid-cols-3 gap-2">
              <Field label="백엔드">
                <Input value={backend} onChange={(event) => setBackend(event.target.value)} />
              </Field>
              <Field label="프론트엔드">
                <Input value={frontend} onChange={(event) => setFrontend(event.target.value)} />
              </Field>
              <Field label="데이터베이스">
                <Input value={db} onChange={(event) => setDb(event.target.value)} />
              </Field>
            </div>

            <Field label="더 알려 줄 것이 있나요?" hint="비워 두어도 됩니다">
              <Textarea
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                placeholder="예: 결제는 빼고, 채팅 기능을 꼭 넣어 주세요"
                className="min-h-[72px]"
              />
            </Field>

            {errorMessage ? (
              <p className="flex items-start gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {errorMessage}
              </p>
            ) : null}
          </div>
        )}

        <DialogFooter>
          {step === "review" ? (
            <>
              <Button variant="outline" onClick={() => close(false)}>
                버리기
              </Button>
              <Button onClick={apply} className="gap-1.5">
                <Check className="h-4 w-4" />
                문서에 넣기
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => close(false)}>
                취소
              </Button>
              <Button onClick={generate} disabled={step === "generating"} className="gap-1.5">
                <Sparkles className="h-4 w-4" />
                초안 만들기
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReviewStep({
  draft,
  report,
  excluded,
  onToggle,
}: {
  draft: DesignModel;
  report: DoctorReport | null;
  excluded: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="max-h-[52vh] space-y-4 overflow-y-auto pr-1">
      <div className="grid grid-cols-4 gap-2 text-center">
        <Count label="요구사항" value={draft.requirements.length} />
        <Count label="화면" value={draft.screens.length} />
        <Count label="표" value={draft.erd.tables.length} />
        <Count label="API" value={draft.apis.length} />
      </div>

      {report ? (
        <p
          className={cn(
            "rounded-lg px-3 py-2 text-xs",
            report.errorCount > 0
              ? "bg-red-50 text-red-700"
              : report.warningCount > 0
                ? "bg-amber-50 text-amber-700"
                : "bg-emerald-50 text-emerald-700",
          )}
        >
          {report.errorCount > 0
            ? `설계 점검에서 고쳐야 할 것 ${report.errorCount}건이 나왔습니다. 넣은 뒤 점검 패널에서 확인하세요.`
            : report.warningCount > 0
              ? `확인할 것 ${report.warningCount}건이 있습니다. 넣은 뒤 점검 패널에서 볼 수 있습니다.`
              : "설계 점검을 통과했습니다."}
        </p>
      ) : null}

      <Section title="요구사항">
        {draft.requirements.map((item) => (
          <Row
            key={item.id}
            checked={!excluded.has(item.id)}
            onToggle={() => onToggle(item.id)}
            title={item.name}
            subtitle={item.description}
          />
        ))}
      </Section>

      <Section title="API 명세">
        {draft.apis.map((item) => (
          <Row
            key={item.id}
            checked={!excluded.has(item.id)}
            onToggle={() => onToggle(item.id)}
            title={`${item.method} ${item.endpoint}`}
            subtitle={item.description}
            mono
          />
        ))}
      </Section>

      <Section title="화면">
        <p className="px-1 text-xs text-slate-500">
          {draft.screens.map((screen) => screen.name).join(" · ")}
        </p>
      </Section>

      <Section title="표">
        <p className="px-1 font-mono text-xs text-slate-500">
          {draft.erd.tables.map((table) => table.name).join(" · ")}
        </p>
      </Section>

      <p className="text-[11px] text-slate-400">
        화면과 표는 서로 이어져 있어 낱개로 빼면 연결이 끊깁니다. 넣은 뒤 편집 화면에서
        지우는 편이 안전합니다.
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-1 text-xs font-semibold text-slate-500">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}

function Row({
  checked,
  onToggle,
  title,
  subtitle,
  mono = false,
}: {
  checked: boolean;
  onToggle: () => void;
  title: string;
  subtitle?: string;
  mono?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 hover:bg-slate-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300"
      />
      <span className={cn("min-w-0 flex-1", !checked && "opacity-40")}>
        <span className={cn("block truncate text-xs text-slate-700", mono && "font-mono")}>
          {title}
        </span>
        {subtitle ? (
          <span className="block truncate text-[11px] text-slate-400">{subtitle}</span>
        ) : null}
      </span>
    </label>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-2">
      <p className="text-lg font-semibold tabular-nums text-slate-900">{value}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500">{label}</label>
      <div className="mt-1">{children}</div>
      {hint ? <p className="mt-1 text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  );
}

/**
 * 빼기로 한 항목을 덜어 내고, 그것을 가리키던 연결도 함께 정리한다.
 * 남겨 두면 문서에 들어가자마자 설계 점검이 "없는 항목 참조" 오류를 낸다.
 */
function filterDraft(draft: DesignModel, excluded: Set<string>): DesignModel {
  if (excluded.size === 0) return draft;

  const keep = (ids: string[]) => ids.filter((id) => !excluded.has(id));

  return {
    ...draft,
    requirements: draft.requirements
      .filter((item) => !excluded.has(item.id))
      .map((item) => ({ ...item, apiIds: keep(item.apiIds) })),
    screens: draft.screens.map((item) => ({
      ...item,
      requirementIds: keep(item.requirementIds),
      apiIds: keep(item.apiIds),
    })),
    screenTransitions: draft.screenTransitions.map((item) => ({
      ...item,
      apiIds: keep(item.apiIds),
    })),
    apis: draft.apis
      .filter((item) => !excluded.has(item.id))
      .map((item) => ({ ...item, requirementIds: keep(item.requirementIds) })),
  };
}
