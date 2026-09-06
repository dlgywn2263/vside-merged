"use client";

// 경로: src/components/design/components/HistoryDialog.tsx
//
// 되돌리기 기록.
//
// AI 초안이나 코드 생성을 적용하기 직전 상태가 자동으로 남는다. 잘못 넣었을
// 때 손으로 하나씩 지우는 대신 그 시점으로 되돌아갈 수 있어야, 사용자가
// 마음 놓고 AI 초안을 써 볼 수 있다.

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, History, Loader2, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  listDesignCheckpointsApi,
  restoreDesignCheckpointApi,
  type DesignCheckpoint,
} from "../api/designDocApi";
import type { DesignMutations } from "../realtime/mutations";
import { useConfirm } from "./ConfirmDialog";

function timeLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export interface HistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  mutations: DesignMutations;
}

export function HistoryDialog({
  open,
  onOpenChange,
  workspaceId,
  mutations,
}: HistoryDialogProps) {
  const confirm = useConfirm();

  const [checkpoints, setCheckpoints] = useState<DesignCheckpoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      setCheckpoints(await listDesignCheckpointsApi(workspaceId));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "기록을 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function handleRestore(checkpoint: DesignCheckpoint) {
    const ok = await confirm({
      title: "이 시점으로 되돌릴까요?",
      description:
        `"${checkpoint.label}" 시점으로 문서 전체가 돌아갑니다. ` +
        "지금 함께 보고 있는 팀원 화면도 같이 바뀝니다. " +
        "되돌리기 직전 상태는 자동으로 한 번 더 보관되므로 다시 앞으로 올 수 있습니다.",
      confirmLabel: "되돌리기",
    });

    if (!ok) return;

    setRestoringId(checkpoint.id);
    setErrorMessage("");

    try {
      const restored = await restoreDesignCheckpointApi(workspaceId, checkpoint.id);

      // 서버에 저장된 것만 되돌리면 접속 중인 브라우저가 다음 저장 때 도로
      // 덮어쓴다. 살아 있는 문서 안의 내용을 바꿔야 그대로 굳는다.
      mutations.replaceAll(restored.projection);

      await load();
      onOpenChange(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "되돌리지 못했습니다.",
      );
    } finally {
      setRestoringId("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] w-[min(560px,95vw)] flex-col gap-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-[var(--waivs-text-sub)]" />
            되돌리기 기록
          </DialogTitle>
          <DialogDescription>
            AI 초안과 코드 생성을 적용하기 직전 상태가 자동으로 남습니다.
            되돌리기는 워크스페이스를 만든 사람만 할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        {errorMessage ? (
          <p className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {errorMessage}
          </p>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <p className="flex items-center justify-center gap-2 py-8 text-sm text-[var(--waivs-text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              기록을 불러오는 중
            </p>
          ) : checkpoints.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--waivs-text-muted)]">
              아직 남은 기록이 없습니다. AI 초안이나 코드 생성을 적용하면 그
              직전 상태가 여기에 남습니다.
            </p>
          ) : (
            <ul className="space-y-2">
              {checkpoints.map((checkpoint) => (
                <li
                  key={checkpoint.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--waivs-border)] px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--waivs-text)]">
                      {checkpoint.label}
                    </p>
                    {checkpoint.summary ? (
                      <p className="truncate text-xs text-[var(--waivs-text-sub)]">{checkpoint.summary}</p>
                    ) : null}

                    <p className="text-xs text-[var(--waivs-text-muted)]">
                      {timeLabel(checkpoint.createdAt)}
                      {checkpoint.createdByNickname
                        ? ` · ${checkpoint.createdByNickname}`
                        : ""}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5"
                    disabled={Boolean(restoringId)}
                    onClick={() => void handleRestore(checkpoint)}
                  >
                    {restoringId === checkpoint.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                    되돌리기
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
