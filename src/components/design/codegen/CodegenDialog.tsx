"use client";

// 경로: src/components/design/codegen/CodegenDialog.tsx
//
// 설계에서 코드를 만들어 프로젝트에 넣는 화면.
//
// 이 화면의 규칙은 하나다. 무엇이 덮어써지는지 보여 주기 전에는 아무것도
// 쓰지 않는다. 그래서 이미 있는 파일은 기본으로 체크돼 있지 않고, 고른
// 것만, 미리보기 이후에 바뀌지 않은 것만 쓰인다.

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, FileCode, Loader2, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchWorkspaceProjectsApi } from "@/lib/ide/api";
import { globalSyncInstance } from "@/hooks/useWorkspaceGlobalSync";

import {
  applyCodegenApi,
  fetchCodegenTargetsApi,
  previewCodegenApi,
  type CodegenApplyReport,
  type CodegenFileStatus,
  type CodegenFileView,
  type CodegenPreview,
  type CodegenTargets,
} from "../api/designCodegenApi";
import type { DesignModel } from "../model/schema";
import { createSafetyCheckpoint } from "../realtime/checkpoint";
import type { DesignDocSession } from "../realtime/designDocProvider";

type Step = "setup" | "preview" | "applying" | "done";

const STATUS_LABEL: Record<CodegenFileStatus, string> = {
  NEW: "새 파일",
  IDENTICAL: "그대로",
  CONFLICT: "덮어씀",
};

const STATUS_CLASS: Record<CodegenFileStatus, string> = {
  NEW: "bg-emerald-50 text-emerald-700",
  IDENTICAL: "bg-[var(--waivs-surface-soft)] text-[var(--waivs-text-sub)]",
  CONFLICT: "bg-amber-50 text-amber-700",
};

export interface CodegenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  model: DesignModel;
  errorCount: number;
  /** 넣기 직전에 저장을 밀어 넣고 되돌아올 자리를 남기는 데 쓴다. */
  session: DesignDocSession | null;
}

export function CodegenDialog({
  open,
  onOpenChange,
  workspaceId,
  model,
  errorCount,
  session,
}: CodegenDialogProps) {
  const [step, setStep] = useState<Step>("setup");
  const [errorMessage, setErrorMessage] = useState("");

  const [projects, setProjects] = useState<string[]>([]);
  const [projectName, setProjectName] = useState("");
  const [branches, setBranches] = useState<string[]>([]);
  const [branchName, setBranchName] = useState("");
  const [basePackage, setBasePackage] = useState("");
  const [targetInfo, setTargetInfo] = useState<CodegenTargets | null>(null);

  const [preview, setPreview] = useState<CodegenPreview | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openedPath, setOpenedPath] = useState("");
  const [report, setReport] = useState<CodegenApplyReport | null>(null);
  const [checkpointFailed, setCheckpointFailed] = useState(false);

  // 워크스페이스의 프로젝트 목록. 설계는 워크스페이스 단위인데 코드가 놓일
  // 곳은 프로젝트라, 어디에 넣을지 반드시 골라야 한다.
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    (async () => {
      try {
        // 이 API 는 프로젝트 배열이 아니라 워크스페이스 폴더 트리를 돌려준다.
        // 프로젝트는 그 아래 children 에 들어 있다.
        const root = await fetchWorkspaceProjectsApi(workspaceId);
        if (cancelled) return;

        const names = (root?.children ?? [])
          .map((item: { name?: string }) => item?.name)
          .filter((name: string | undefined): name is string => Boolean(name));

        setProjects(names);
        setProjectName((current) => current || names[0] || "");

        if (names.length === 0) {
          setErrorMessage(
            "이 워크스페이스에 프로젝트가 없습니다. IDE에서 프로젝트를 먼저 만들어 주세요.",
          );
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : "프로젝트 목록을 불러오지 못했습니다.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, workspaceId]);

  // 고른 프로젝트에 실제로 있는 작업 폴더와, 그곳이 무엇인지 확인한다.
  // 미리보기를 누르기 전에 "여기는 Spring Boot 이고 패키지는 이것"이 보여야
  // 한다. 패키지를 잘못 짚으면 자바 파일이 한 개도 컴파일되지 않는다.
  useEffect(() => {
    if (!open || !projectName) return;

    let cancelled = false;

    (async () => {
      try {
        const result = await fetchCodegenTargetsApi(workspaceId, projectName, branchName);
        if (cancelled) return;

        setBranches(result.branches);
        setTargetInfo(result);

        if (result.branches.length > 0 && !result.branches.includes(branchName)) {
          setBranchName(
            result.branches.includes("master") ? "master" : result.branches[0],
          );
          return;
        }

        setBasePackage((current) => current || result.basePackage);
      } catch (error) {
        if (!cancelled) {
          setTargetInfo(null);
          setErrorMessage(
            error instanceof Error ? error.message : "프로젝트를 확인하지 못했습니다.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, workspaceId, projectName, branchName]);

  const grouped = useMemo(() => {
    const groups = new Map<string, CodegenFileView[]>();

    (preview?.files ?? []).forEach((file) => {
      const list = groups.get(file.targetLabel) ?? [];
      list.push(file);
      groups.set(file.targetLabel, list);
    });

    return [...groups.entries()];
  }, [preview]);

  const openedFile = preview?.files.find((file) => file.path === openedPath) ?? null;

  function reset() {
    setStep("setup");
    setPreview(null);
    setReport(null);
    setSelected(new Set());
    setOpenedPath("");
    setErrorMessage("");
    setTargetInfo(null);
    setCheckpointFailed(false);
  }

  async function handlePreview() {
    setErrorMessage("");
    setStep("applying");

    try {
      const result = await previewCodegenApi(
        workspaceId,
        model,
        projectName,
        branchName,
        basePackage,
      );

      setPreview(result);
      setBasePackage(result.basePackage);

      // 이미 있는 파일은 기본으로 고르지 않는다. 덮어쓰기는 사람이 보고
      // 직접 정해야 하는 일이다.
      setSelected(
        new Set(result.files.filter((file) => file.status === "NEW").map((file) => file.path)),
      );

      setOpenedPath(result.files[0]?.path ?? "");
      setStep("preview");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "코드를 만들지 못했습니다.");
      setStep("setup");
    }
  }

  async function handleApply() {
    if (!preview) return;

    setErrorMessage("");
    setStep("applying");

    // 파일을 쓰기 직전에 설계 쪽 되돌아올 자리를 남긴다. 코드 생성이
    // 잘못됐을 때 설계까지 함께 확인해야 하는 경우가 많다.
    //
    // 한 번 실패한 뒤 사용자가 그래도 진행하기로 했으면 다시 시도하지
    // 않는다. 같은 이유로 또 막히면 영영 못 넣는다.
    if (!checkpointFailed) {
      const checkpoint = await createSafetyCheckpoint(
        workspaceId,
        session,
        "코드 생성 적용 직전",
      );

      if (!checkpoint.ok) {
        setErrorMessage(
          `되돌리기 기록을 남기지 못했습니다 (${checkpoint.message}). 그래도 넣으려면 한 번 더 눌러 주세요.`,
        );
        setStep("preview");
        setCheckpointFailed(true);
        return;
      }
    }

    try {
      const files = preview.files
        .filter((file) => selected.has(file.path))
        .map((file) => ({ path: file.path, expectedExistingHash: file.existingHash }));

      const result = await applyCodegenApi(
        workspaceId,
        model,
        projectName,
        branchName,
        basePackage,
        files,
      );

      setReport(result);
      setStep("done");

      // 팀원의 파일 트리도 갱신되게 한다. IDE 를 안 열어 둔 상태면 아무 일도
      // 일어나지 않으므로 안전하다.
      globalSyncInstance.trigger();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "파일을 넣지 못했습니다.");
      setStep("preview");
    }
  }

  function toggle(path: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[85vh] w-[min(1100px,95vw)] max-w-none flex-col gap-4 overflow-hidden sm:max-w-none">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5 text-[#5873F9]" />
            설계에서 코드 만들기
          </DialogTitle>
          <DialogDescription>
            ERD와 API 명세, 화면 흐름을 그대로 옮깁니다. AI가 지어내지 않으므로 같은 설계면 항상
            같은 코드가 나옵니다.
          </DialogDescription>
        </DialogHeader>

        {errorMessage ? (
          <p className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {errorMessage}
          </p>
        ) : null}

        {errorCount > 0 ? (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
            설계 점검에 오류가 {errorCount}건 있습니다. 오류가 하나라도 있으면 코드를 만들지
            않습니다 — 깨진 설계에서 나온 코드는 고치는 데 더 오래 걸리기 때문입니다.
          </p>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {step === "setup" || (step === "applying" && !preview) ? (
            <SetupPane
              projects={projects}
              projectName={projectName}
              onProjectChange={setProjectName}
              branches={branches}
              branchName={branchName}
              onBranchChange={setBranchName}
              basePackage={basePackage}
              onPackageChange={setBasePackage}
              targetInfo={targetInfo}
              busy={step === "applying"}
            />
          ) : step === "done" && report ? (
            <ResultPane report={report} />
          ) : preview ? (
            <PreviewPane
              preview={preview}
              grouped={grouped}
              selected={selected}
              onToggle={toggle}
              openedFile={openedFile}
              onOpen={setOpenedPath}
              busy={step === "applying"}
            />
          ) : null}
        </div>

        <DialogFooter className="gap-2">
          {step === "done" ? (
            <Button onClick={() => onOpenChange(false)}>닫기</Button>
          ) : preview && preview.files.length > 0 ? (
            <>
              <Button variant="outline" onClick={handlePreview} disabled={step === "applying"}>
                <RefreshCw className="mr-1.5 h-4 w-4" />
                다시 만들기
              </Button>
              <Button
                onClick={handleApply}
                disabled={step === "applying" || selected.size === 0}
              >
                {step === "applying" ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-1.5 h-4 w-4" />
                )}
                {checkpointFailed ? "그래도 " : ""}고른 {selected.size}개 파일 넣기
              </Button>
            </>
          ) : (
            <Button
              onClick={handlePreview}
              disabled={step === "applying" || !projectName || errorCount > 0}
            >
              {step === "applying" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : null}
              미리보기
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SetupPane({
  projects,
  projectName,
  onProjectChange,
  branches,
  branchName,
  onBranchChange,
  basePackage,
  onPackageChange,
  targetInfo,
  busy,
}: {
  projects: string[];
  projectName: string;
  onProjectChange: (value: string) => void;
  branches: string[];
  branchName: string;
  onBranchChange: (value: string) => void;
  basePackage: string;
  onPackageChange: (value: string) => void;
  targetInfo: CodegenTargets | null;
  busy: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm">
          <span className="font-medium text-[var(--waivs-text-sub)]">어느 프로젝트에 넣을까요</span>
          <select
            value={projectName}
            onChange={(event) => onProjectChange(event.target.value)}
            disabled={busy}
            className="h-9 w-full rounded-xl border border-[var(--waivs-border)] bg-white px-3 text-sm outline-none transition focus:border-[#5873F9] focus:ring-2 focus:ring-[#5873F9]/10"
          >
            {projects.length === 0 ? <option value="">프로젝트가 없습니다</option> : null}
            {projects.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5 text-sm">
          <span className="font-medium text-[var(--waivs-text-sub)]">브랜치</span>
          <select
            value={branchName}
            onChange={(event) => onBranchChange(event.target.value)}
            disabled={busy}
            className="h-9 w-full rounded-xl border border-[var(--waivs-border)] bg-white px-3 text-sm outline-none transition focus:border-[#5873F9] focus:ring-2 focus:ring-[#5873F9]/10"
          >
            {branches.length === 0 ? (
              <option value={branchName}>{branchName || "작업 폴더 없음"}</option>
            ) : null}
            {branches.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {targetInfo ? (
        <p
          className={cn(
            "rounded-xl px-3 py-2 text-xs",
            targetInfo.stack === "SPRING" || targetInfo.stack === "REACT"
              ? "bg-[var(--waivs-surface-soft)] text-[var(--waivs-text-sub)]"
              : "bg-amber-50 text-amber-800",
          )}
        >
          {targetInfo.note || `${targetInfo.stackLabel} 프로젝트`}
        </p>
      ) : null}

      <label className="block space-y-1.5 text-sm">
        <span className="font-medium text-[var(--waivs-text-sub)]">자바 패키지 (비워 두면 알아서 찾습니다)</span>
        <Input
          value={basePackage}
          onChange={(event) => onPackageChange(event.target.value)}
          placeholder="com.example.demo"
          disabled={busy}
        />
        <span className="block text-xs text-[var(--waivs-text-muted)]">
          프로젝트 폴더를 보고 정합니다. 잘못 짚으면 자바 파일이 한 개도 컴파일되지 않으므로,
          미리보기에서 어떤 패키지로 잡혔는지 꼭 확인해 주세요.
        </span>
      </label>
    </div>
  );
}

function PreviewPane({
  preview,
  grouped,
  selected,
  onToggle,
  openedFile,
  onOpen,
  busy,
}: {
  preview: CodegenPreview;
  grouped: [string, CodegenFileView[]][];
  selected: Set<string>;
  onToggle: (path: string) => void;
  openedFile: CodegenFileView | null;
  onOpen: (path: string) => void;
  busy: boolean;
}) {
  if (preview.blockedBy.length > 0) {
    return (
      <div className="space-y-3">
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          설계에 먼저 고쳐야 할 문제가 {preview.blockedBy.length}건 있어 코드를 만들지 않았습니다.
        </p>

        <ul className="space-y-2">
          {preview.blockedBy.map((finding, index) => (
            <li
              key={`${finding.ruleId}-${finding.targetId}-${index}`}
              className="rounded-xl border border-[var(--waivs-border)] px-3 py-2 text-sm"
            >
              <p className="font-medium text-[var(--waivs-text)]">{finding.message}</p>
              <p className="mt-0.5 text-xs text-[var(--waivs-text-sub)]">
                {finding.targetLabel ? `${finding.targetLabel} · ` : ""}
                {finding.ruleId}
              </p>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (preview.files.length === 0) {
    return (
      <p className="rounded-xl bg-[var(--waivs-surface-soft)] px-3 py-3 text-sm text-[var(--waivs-text-sub)]">
        {preview.note || "이 프로젝트에는 만들 수 있는 코드가 없습니다."}
      </p>
    );
  }

  return (
    <div className="flex min-h-0 gap-4">
      <div className="w-[42%] shrink-0 space-y-3">
        <p className="rounded-xl bg-[var(--waivs-surface-soft)] px-3 py-2 text-xs text-[var(--waivs-text-sub)]">
          {preview.stackLabel} 프로젝트
          {preview.basePackage ? ` · 패키지 ${preview.basePackage}` : ""}
        </p>

        {grouped.map(([label, files]) => (
          <div key={label}>
            <p className="mb-1 text-xs font-semibold text-[var(--waivs-text-sub)]">{label}</p>

            <ul className="space-y-1">
              {files.map((file) => (
                <li key={file.path}>
                  <div
                    className={cn(
                      "flex items-start gap-2 rounded-xl border px-2.5 py-2 text-left transition",
                      openedFile?.path === file.path
                        ? "border-[#5873F9] bg-[#EEF3FF]"
                        : "border-[var(--waivs-border)] hover:bg-[var(--waivs-surface-soft)]",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selected.has(file.path)}
                      disabled={busy || file.status === "IDENTICAL"}
                      onChange={() => onToggle(file.path)}
                    />

                    <button
                      type="button"
                      onClick={() => onOpen(file.path)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-xs font-medium text-[var(--waivs-text)]">
                        {file.path.split("/").pop()}
                      </p>
                      <p className="truncate text-[11px] text-[var(--waivs-text-muted)]">{file.path}</p>
                      <span
                        className={cn(
                          "mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium",
                          STATUS_CLASS[file.status],
                        )}
                      >
                        {STATUS_LABEL[file.status]} · {file.sourceLabel}
                      </span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        {openedFile ? (
          openedFile.status === "CONFLICT" ? (
            <div className="grid h-full grid-cols-2 gap-3">
              <CodeBlock title="지금 프로젝트에 있는 내용" code={openedFile.existingContent} />
              <CodeBlock title="새로 만든 내용" code={openedFile.content} />
            </div>
          ) : (
            <CodeBlock title={openedFile.path} code={openedFile.content} />
          )
        ) : null}
      </div>
    </div>
  );
}

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="mb-1 truncate text-xs font-medium text-[var(--waivs-text-sub)]">{title}</p>
      <pre className="max-h-[46vh] flex-1 overflow-auto rounded-xl bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function ResultPane({ report }: { report: CodegenApplyReport }) {
  return (
    <div className="space-y-3">
      <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        {report.written}개 파일을 넣었습니다.
        {report.skipped > 0 ? ` ${report.skipped}개는 내용이 같아 두었습니다.` : ""}
        {report.failed > 0 ? ` ${report.failed}개는 넣지 못했습니다.` : ""}
      </p>

      <ul className="space-y-1">
        {report.results.map((result) => (
          <li
            key={result.path}
            className="flex items-start justify-between gap-3 rounded-xl border border-[var(--waivs-border)] px-3 py-2 text-xs"
          >
            <span className="min-w-0 flex-1 truncate text-[var(--waivs-text-sub)]">{result.path}</span>
            <span
              className={cn(
                "shrink-0 rounded px-1.5 py-0.5 font-medium",
                result.status === "WRITTEN"
                  ? "bg-emerald-50 text-emerald-700"
                  : result.status === "SKIPPED"
                    ? "bg-[var(--waivs-surface-soft)] text-[var(--waivs-text-sub)]"
                    : "bg-red-50 text-red-700",
              )}
            >
              {result.status === "WRITTEN"
                ? "넣음"
                : result.status === "SKIPPED"
                  ? "그대로"
                  : result.status === "CHANGED_MEANWHILE"
                    ? "그 사이 바뀜"
                    : "실패"}
            </span>
          </li>
        ))}
      </ul>

      {report.results.some((result) => result.message) ? (
        <ul className="space-y-1 text-xs text-[var(--waivs-text-sub)]">
          {report.results
            .filter((result) => result.message)
            .map((result) => (
              <li key={`msg-${result.path}`}>
                {result.path.split("/").pop()} — {result.message}
              </li>
            ))}
        </ul>
      ) : null}
    </div>
  );
}
