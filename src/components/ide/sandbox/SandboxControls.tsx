"use client";

// 경로: src/components/ide/sandbox/SandboxControls.tsx
//
// 상단 바의 샌드박스 버튼들(팀 모드 전용).
//
// 샌드박스는 브랜치를 만들지 않는다. 켜면 그때부터 "내가 고친 파일"만 팀원에게 안
// 보이고, 안 고친 파일은 계속 팀과 실시간으로 같이 본다. 다 됐으면 반영하고, 아니면 버린다.
//
//   꺼짐:  [샌드박스]
//   켜짐:  [● 샌드박스 켜짐 · 3개 ▾]  [반영]  [버리기]  [끄기]
//
// 여기서 하는 일은 서버 호출의 순서를 지키는 것이다. 특히 탭을 닫을 때 나가는 마지막
// 자동 저장이 반영·버리기보다 늦게 도착하면 방금 처리한 파일이 샌드박스에 다시 생긴다.
// 그래서 항상 "저장을 끝까지 기다린다 → 탭을 닫는다 → 서버에 요청한다" 순서로 한다.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { flushActiveEditorSession } from "@/lib/ide/activeEditorContent";
import { deleteFileApi, fetchFileContentApi } from "@/lib/ide/api";
import { applySandboxFile } from "@/lib/ide/sandbox/sandboxApply";
import {
  disableSandboxApi,
  discardSandboxApi,
  enableSandboxApi,
  fetchSandboxFileApi,
  fetchSandboxStateApi,
  forkSandboxFileApi,
  markSandboxAppliedApi,
  resolveSandboxFileApi,
  saveSandboxFileApi,
  type SandboxFileKind,
  type SandboxScope,
  type SandboxStateResponse,
} from "@/lib/ide/sandbox/sandboxApi";
import {
  closeAllFiles,
  closeFilesByPath,
  openFile,
  updateFileContent,
} from "@/store/slices/fileSystemSlice";
import {
  clearSandboxConflict,
  sandboxScopeKey,
  setSandbox,
  setSandboxConflict,
  type SandboxState,
} from "@/store/slices/sandboxSlice";
import { writeToTerminal } from "@/store/slices/uiSlice";

interface RootState {
  sandbox: SandboxState;
  fileSystem: { workspaceId: string | null; activeProject: string | null; activeBranch: string | null };
}

/** 반영을 한 번 눌렀을 때 파일마다 어떻게 됐는지. */
interface ApplyResult {
  filePath: string;
  result: "applied" | "nothing" | "conflict" | "kept" | "failed";
  message: string;
}

const KIND_LABEL: Record<SandboxFileKind, string> = {
  MODIFIED: "수정",
  NEW: "새 파일",
  DELETED: "삭제",
};

const RESULT_STYLE: Record<ApplyResult["result"], string> = {
  applied: "bg-emerald-500 text-white",
  nothing: "bg-slate-400 text-white",
  conflict: "bg-amber-400 text-slate-900",
  kept: "bg-slate-400 text-white",
  failed: "bg-rose-500 text-white",
};

const hasConflictMarkers = (content: string) =>
  content.includes("<<<<<<< ") && content.includes(">>>>>>> ");

const baseName = (path: string) => path.split("/").filter(Boolean).pop() || path;

export default function SandboxControls() {
  const dispatch = useDispatch();

  const { workspaceId, activeProject, activeBranch } = useSelector((state: RootState) => state.fileSystem);
  const sandbox = useSelector((state: RootState) => state.sandbox);

  const [isBusy, setIsBusy] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  /** 마지막 반영의 결과. 다른 브랜치로 넘어가면 보여 주지 않으려고 어느 브랜치 것인지 같이 둔다. */
  const [applyResults, setApplyResults] = useState<{ scopeKey: string | null; items: ApplyResult[] }>({
    scopeKey: null,
    items: [],
  });

  const panelRef = useRef<HTMLDivElement | null>(null);

  const scope = useMemo<SandboxScope | null>(
    () =>
      workspaceId && activeProject
        ? { workspaceId, projectName: activeProject, branchName: activeBranch || "master" }
        : null,
    [workspaceId, activeProject, activeBranch],
  );

  const scopeKey = scope ? sandboxScopeKey(scope) : null;
  const isKnown = Boolean(scopeKey) && sandbox.scopeKey === scopeKey;
  const isOn = isKnown && sandbox.enabled;

  const store = useCallback(
    (targetScope: SandboxScope, state: SandboxStateResponse) => {
      dispatch(
        setSandbox({
          scopeKey: sandboxScopeKey(targetScope),
          enabled: state.enabled,
          files: state.files,
        }),
      );
    },
    [dispatch],
  );

  // 화면에 들어오거나 프로젝트·브랜치를 바꾸면 그 브랜치의 샌드박스 상태를 받아 온다.
  // 샌드박스는 브랜치마다 따로다.
  useEffect(() => {
    if (!scope) return undefined;

    let cancelled = false;

    fetchSandboxStateApi(scope)
      .then((state) => {
        if (!cancelled) store(scope, state);
      })
      .catch(() => {
        // 못 받아 왔으면 꺼진 것으로 둔다. 에디터는 상태를 모르는 동안 입력을 막고
        // 있으므로, 여기서 정해 주지 않으면 계속 아무것도 못 친다.
        if (!cancelled) store(scope, { enabled: false, files: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [scope, store]);

  useEffect(() => {
    if (!isPanelOpen) return undefined;

    const close = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsPanelOpen(false);
      }
    };

    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [isPanelOpen]);

  const log = useCallback(
    (message: string) => {
      dispatch(writeToTerminal(`[Sandbox] ${message}\n`));
    },
    [dispatch],
  );

  /** 서버에 요청하기 전에: 저장을 끝까지 기다리고, 열린 탭을 닫는다. */
  const settleOpenTabs = useCallback(
    async (paths: string[] | "all") => {
      await flushActiveEditorSession();

      if (paths === "all") {
        dispatch(closeAllFiles());
      } else {
        paths.forEach((path) => dispatch(closeFilesByPath(path)));
      }
    },
    [dispatch],
  );

  const run = useCallback(
    async (work: () => Promise<void>) => {
      if (isBusy) return;

      setIsBusy(true);

      try {
        await work();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log(`실패: ${message}`);
        window.alert(`샌드박스 작업에 실패했습니다.\n${message}`);
      } finally {
        setIsBusy(false);
      }
    },
    [isBusy, log],
  );

  const handleEnable = () =>
    run(async () => {
      if (!scope) return;

      // 열린 탭을 모두 닫는다. 탭의 내용은 파일 경로만으로 구분돼서, 팀 내용으로 열려
      // 있던 탭이 그대로 내 샌드박스 방에 붙으면 팀 내용이 샌드박스 파일을 덮는다.
      await settleOpenTabs("all");
      store(scope, await enableSandboxApi(scope));
      log("샌드박스를 켰습니다. 이제부터 고치는 파일은 팀원에게 보이지 않습니다.");
    });

  const handleDisable = () =>
    run(async () => {
      if (!scope) return;

      await settleOpenTabs("all");
      const state = await disableSandboxApi(scope);
      store(scope, state);
      setIsPanelOpen(false);

      log(
        state.files.length > 0
          ? `샌드박스를 껐습니다. 반영하지 않은 파일 ${state.files.length}개는 그대로 보관되고, 다시 켜면 이어서 작업할 수 있습니다.`
          : "샌드박스를 껐습니다.",
      );
    });

  const handleDiscard = () =>
    run(async () => {
      if (!scope) return;

      const count = sandbox.files.length;

      if (
        !window.confirm(
          `샌드박스에서 고친 파일 ${count}개를 모두 버립니다.\n되돌릴 수 없습니다. 계속할까요?`,
        )
      ) {
        return;
      }

      await settleOpenTabs("all");
      await discardSandboxApi(scope);
      store(scope, await fetchSandboxStateApi(scope));
      setApplyResults({ scopeKey: null, items: [] });
      setIsPanelOpen(false);
      log(`샌드박스를 버렸습니다(${count}개 파일). 팀 파일은 그대로입니다.`);
    });

  /** 목록에서 파일을 눌렀을 때. 내 샌드박스 내용으로 연다. */
  const openSandboxFile = useCallback(
    async (targetScope: SandboxScope, filePath: string) => {
      const content = await fetchSandboxFileApi(targetScope, filePath);

      // 내용을 먼저 넣고 연다. 에디터는 이 내용으로 내 개인 방의 첫 문서를 만든다.
      dispatch(updateFileContent({ filePath, content }));
      dispatch(openFile({ id: filePath, name: baseName(filePath), type: "file" }));
    },
    [dispatch],
  );

  /** 충돌 본문을 내 샌드박스 파일에 넣고, 해결 중으로 표시한다. */
  const startConflict = useCallback(
    async (targetScope: SandboxScope, filePath: string, content: string, liveContent: string) => {
      await saveSandboxFileApi(targetScope, filePath, content);
      dispatch(setSandboxConflict({ filePath, liveContent }));
    },
    [dispatch],
  );

  const applyOne = useCallback(
    async (
      targetScope: SandboxScope,
      filePath: string,
      kind: SandboxFileKind,
      conflictLive: string | undefined,
    ): Promise<ApplyResult> => {
      if (kind !== "DELETED") {
        const mine = await fetchSandboxFileApi(targetScope, filePath);

        // 충돌 표시가 남은 파일을 그대로 반영하면 그 표시가 팀 파일에 들어간다.
        if (hasConflictMarkers(mine)) {
          if (conflictLive === undefined) {
            // 충돌을 해결하다 새로고침하면 "해결 중"이라는 기억이 사라진다. 팀 파일의
            // 지금 내용을 기준으로 삼아 다시 해결 중으로 돌려놓는다.
            const liveContent = await fetchFileContentApi(
              targetScope.workspaceId,
              targetScope.projectName,
              targetScope.branchName,
              filePath,
            ).catch(() => "");

            dispatch(setSandboxConflict({ filePath, liveContent }));
          }

          return { filePath, result: "conflict", message: "아직 해결하지 않은 충돌이 있어요" };
        }

        // 다 골랐는데 '충돌 해결 완료'를 누르지 않고 반영을 누른 경우. 대신 마쳐 준다.
        // 그냥 넘어가면 비교 기준이 옛 것이라 같은 자리에서 또 충돌한다.
        if (conflictLive !== undefined) {
          await resolveSandboxFileApi(targetScope, filePath, mine, conflictLive);
          dispatch(clearSandboxConflict(filePath));
        }
      }

      const outcome = await applySandboxFile(targetScope, filePath);

      if (outcome.kind === "applied") {
        return outcome.via === "nothing"
          ? { filePath, result: "nothing", message: "바뀐 것이 없어 넘어갔어요" }
          : { filePath, result: "applied", message: "팀 파일에 반영했어요" };
      }

      if (outcome.kind === "conflict") {
        await startConflict(targetScope, filePath, outcome.content, outcome.liveContent);
        return { filePath, result: "conflict", message: "팀도 같은 곳을 고쳤어요. 열어서 골라 주세요" };
      }

      // 내가 지운 파일을 그 사이 팀이 고쳤다. 어느 쪽을 살릴지는 사람이 정해야 한다.
      const stillDelete = window.confirm(
        `${filePath}\n\n내가 샌드박스에서 지운 파일을 그 사이 팀이 고쳤습니다.\n\n[확인] 그래도 팀 파일을 지웁니다.\n[취소] 삭제를 취소하고 팀 파일을 그대로 둡니다.`,
      );

      if (stillDelete) {
        await deleteFileApi(
          targetScope.workspaceId,
          targetScope.projectName,
          targetScope.branchName,
          filePath,
        );
        await markSandboxAppliedApi(targetScope, filePath);
        return { filePath, result: "applied", message: "팀 파일을 지웠어요" };
      }

      // 다시 사본을 뜨면 서버가 삭제 표시를 푼다. 내용이 팀 것과 같으므로 바로 샌드박스에서 뺀다.
      await forkSandboxFileApi(targetScope, filePath, outcome.liveContent);
      await markSandboxAppliedApi(targetScope, filePath);
      return { filePath, result: "kept", message: "삭제를 취소하고 팀 파일을 그대로 뒀어요" };
    },
    [dispatch, startConflict],
  );

  const handleApply = () =>
    run(async () => {
      if (!scope) return;

      const files = [...sandbox.files];
      const conflictsAtStart = { ...sandbox.conflicts };

      if (files.length === 0) {
        window.alert("반영할 파일이 없습니다.");
        return;
      }

      // 샌드박스 파일의 탭을 먼저 닫는다. 반영된 파일은 샌드박스에서 빠지므로 다음에
      // 열 때는 팀 방으로 열려야 한다.
      await settleOpenTabs(files.map((file) => file.filePath));

      const next: ApplyResult[] = [];

      // 한 파일씩 차례로 한다. 한꺼번에 하면 팀 방 여러 개에 동시에 붙게 되고,
      // 중간에 실패했을 때 어디까지 됐는지 알기 어렵다.
      for (const file of files) {
        try {
          next.push(await applyOne(scope, file.filePath, file.kind, conflictsAtStart[file.filePath]));
        } catch (error) {
          next.push({
            filePath: file.filePath,
            result: "failed",
            message: error instanceof Error ? error.message : String(error),
          });
        }

        setApplyResults({ scopeKey, items: [...next] });
      }

      store(scope, await fetchSandboxStateApi(scope));
      setIsPanelOpen(true);

      const applied = next.filter((item) => item.result === "applied").length;
      const conflicts = next.filter((item) => item.result === "conflict");
      const failed = next.filter((item) => item.result === "failed").length;

      log(`반영 완료 ${applied}개 · 충돌 ${conflicts.length}개 · 실패 ${failed}개`);

      // 충돌이 있으면 첫 파일을 바로 열어 준다. 비교 화면에서 고르면 된다.
      if (conflicts.length > 0) {
        await openSandboxFile(scope, conflicts[0].filePath);
      }
    });

  const handleOpenFromList = (filePath: string, kind: SandboxFileKind) => {
    if (!scope || kind === "DELETED") return;

    setIsPanelOpen(false);
    void run(() => openSandboxFile(scope, filePath));
  };

  if (!scope) return null;

  if (!isOn) {
    return (
      <button
        type="button"
        onClick={handleEnable}
        disabled={isBusy || !isKnown}
        title="켜면 그때부터 내가 고치는 파일은 팀원에게 보이지 않습니다. 브랜치는 그대로입니다."
        className="flex h-8 items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-[12px] font-bold text-indigo-600 transition-all hover:bg-indigo-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        🧪 샌드박스
      </button>
    );
  }

  const pendingCount = sandbox.files.length;

  // 내가 고치는 동안 팀이 고친 파일의 수. 샌드박스에서는 그 편집이 보이지 않아서 여기서 알린다.
  const teamChangedCount = sandbox.files.filter((file) => file.teamChanged).length;

  const results = applyResults.scopeKey === scopeKey ? applyResults.items : [];
  const resultByPath = new Map(results.map((item) => [item.filePath, item]));

  // 방금 반영돼 목록에서 빠진 파일도 결과는 보여 준다.
  const finishedOnly = results.filter(
    (item) => !sandbox.files.some((file) => file.filePath === item.filePath),
  );

  return (
    <div className="relative flex items-center gap-1.5" ref={panelRef}>
      <button
        type="button"
        onClick={() => setIsPanelOpen((open) => !open)}
        className="flex h-8 items-center gap-1.5 rounded-lg border-2 border-indigo-800 bg-indigo-600 px-3 text-[12px] font-black text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-95"
        title="샌드박스에서 고친 파일 목록"
      >
        <span className="h-2 w-2 rounded-full bg-emerald-300" />
        샌드박스 켜짐 · {pendingCount}개
        {teamChangedCount > 0 && (
          <span className="rounded bg-orange-500 px-1.5 py-0.5 text-[11px] font-black text-white">
            팀 변경 {teamChangedCount}
          </span>
        )}
        ▾
      </button>

      <button
        type="button"
        onClick={handleApply}
        disabled={isBusy || pendingCount === 0}
        title="고친 파일을 팀 파일에 합칩니다. 충돌이 없는 파일은 바로 들어가고, 충돌 파일만 비교 화면으로 갑니다."
        className="h-8 rounded-lg border border-emerald-700 bg-emerald-500 px-3 text-[12px] font-black text-white transition-all hover:bg-emerald-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isBusy ? "처리 중…" : "반영"}
      </button>

      <button
        type="button"
        onClick={handleDiscard}
        disabled={isBusy || pendingCount === 0}
        title="샌드박스에서 고친 것을 모두 버립니다."
        className="h-8 rounded-lg border border-rose-200 bg-rose-50 px-3 text-[12px] font-bold text-rose-600 transition-all hover:bg-rose-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        버리기
      </button>

      <button
        type="button"
        onClick={handleDisable}
        disabled={isBusy}
        title="샌드박스를 끕니다. 고친 파일은 보관되고, 다시 켜면 이어서 작업할 수 있습니다."
        className="h-8 rounded-lg border border-gray-200 bg-white px-3 text-[12px] font-bold text-gray-700 transition-all hover:bg-gray-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        끄기
      </button>

      {isPanelOpen && (
        <div className="absolute right-0 top-10 z-[1000] w-[420px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="border-b border-indigo-800 bg-indigo-600 px-4 py-2.5 text-[13px] font-black text-white">
            샌드박스에서 고친 파일
            <span className="ml-2 font-bold text-indigo-100">팀원에게는 아직 보이지 않아요</span>
          </div>

          <div className="max-h-[320px] overflow-y-auto">
            {pendingCount === 0 && finishedOnly.length === 0 && (
              <p className="px-4 py-6 text-center text-[12px] font-bold text-gray-500">
                아직 고친 파일이 없습니다.
                <br />
                파일을 열고 &lsquo;샌드박스에서 고치기&rsquo;를 누르면 여기에 나타납니다.
              </p>
            )}

            {sandbox.files.map((file) => {
              const result = resultByPath.get(file.filePath);
              const isConflict = sandbox.conflicts[file.filePath] !== undefined;

              return (
                <button
                  key={file.filePath}
                  type="button"
                  onClick={() => handleOpenFromList(file.filePath, file.kind)}
                  disabled={file.kind === "DELETED"}
                  className="flex w-full items-center gap-2 border-b border-gray-100 px-4 py-2 text-left hover:bg-gray-50 disabled:cursor-default disabled:hover:bg-white"
                >
                  <span className="shrink-0 rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-black text-white">
                    {KIND_LABEL[file.kind]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-bold text-gray-800">{file.filePath}</span>
                    {(isConflict || result) && (
                      <span className="block truncate text-[11px] font-bold text-gray-500">
                        {isConflict ? "충돌 해결 중 — 열어서 골라 주세요" : result?.message}
                      </span>
                    )}
                  </span>
                  {isConflict && (
                    <span className="shrink-0 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-black text-slate-900">
                      충돌
                    </span>
                  )}
                  {!isConflict && file.teamChanged && (
                    <span
                      className="shrink-0 rounded bg-orange-500 px-1.5 py-0.5 text-[10px] font-black text-white"
                      title="내가 고치는 동안 팀이 이 파일을 고쳤습니다. 파일을 열어 '팀 변경 가져오기'로 미리 합칠 수 있어요."
                    >
                      팀 변경
                    </span>
                  )}
                  {!isConflict && result?.result === "failed" && (
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black ${RESULT_STYLE.failed}`}>
                      실패
                    </span>
                  )}
                </button>
              );
            })}

            {finishedOnly.map((item) => (
              <div key={item.filePath} className="flex items-center gap-2 border-b border-gray-100 px-4 py-2">
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black ${RESULT_STYLE[item.result]}`}>
                  {item.result === "applied" ? "반영됨" : item.result === "failed" ? "실패" : "넘어감"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-bold text-gray-800">{item.filePath}</span>
                  <span className="block truncate text-[11px] font-bold text-gray-500">{item.message}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
