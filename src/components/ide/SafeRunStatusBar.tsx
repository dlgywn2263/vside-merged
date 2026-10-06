"use client";

// 경로: src/components/ide/SafeRunStatusBar.tsx
//
// 팀 화면 맨 아래의 상태바. 실행을 누르기 전에 "지금 실행하면 누구 것이 들어가고
// 누구 것이 빠질지"를 미리 보여 준다.
//
//   정상 버전: 2분 전 | 민수 준비됨 | 지영 수정 중 | 이번 실행: 지영 님 변경 제외
//
// 값은 전부 서버가 준 것이다. 여기서는 처음 한 번 조회하고, 그 뒤로는 Sidebar 가
// 파일 트리 소켓(/ws/workspace-events)으로 받은 알림을 Redux 에 넣어 주는 것을 그린다.
// 알림은 바뀔 때만 오므로, 브랜치를 바꾸면 다시 조회해야 한다.

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { fetchSafeRunStatusApi, type SafeRunAuthor } from "@/lib/ide/safeRun";
import { setSafeRunStatus, type SafeRunState } from "@/store/slices/safeRunSlice";

interface RootState {
  safeRun: SafeRunState;
  fileSystem: { workspaceId: string | null; activeProject: string | null; activeBranch: string | null };
}

/** "2분 전" 같은 표시. 시각은 서버가 주고, 얼마나 지났는지는 여기서 센다. */
function formatElapsed(timestamp: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));

  if (seconds < 60) return "방금 전";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 전`;
  return `${Math.floor(seconds / 86400)}일 전`;
}

function AuthorChip({ author }: { author: SafeRunAuthor }) {
  const isReady = author.status === "READY";

  return (
    <span
      title={`${author.nickname} 님이 고친 파일\n${author.files.join("\n")}`}
      className={`flex items-center gap-1.5 rounded px-2 py-0.5 text-[12px] font-bold ${
        isReady ? "bg-emerald-500 text-white" : "bg-amber-400 text-slate-900"
      }`}
    >
      <span>{isReady ? "✅" : "✏️"}</span>
      <span className="max-w-[120px] truncate">{author.nickname}</span>
      <span>{isReady ? "준비됨" : "수정 중"}</span>
    </span>
  );
}

export default function SafeRunStatusBar() {
  const dispatch = useDispatch();

  const { workspaceId, activeProject, activeBranch } = useSelector(
    (state: RootState) => state.fileSystem,
  );
  const { status, lastRun } = useSelector((state: RootState) => state.safeRun);

  const branchName = activeBranch || "master";

  // "몇 분 전"이 저절로 넘어가게 30초마다 다시 그린다.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!workspaceId || !activeProject) return undefined;

    // 응답이 오기 전에 브랜치를 또 바꿨다면 늦게 온 옛 브랜치의 상태를 버린다.
    let cancelled = false;

    fetchSafeRunStatusApi(workspaceId, activeProject, branchName)
      .then((next) => {
        if (!cancelled) dispatch(setSafeRunStatus(next));
      })
      .catch(() => {
        // 못 받아 왔으면 옛 브랜치의 상태를 계속 보여 주지 않는다.
        if (!cancelled) dispatch(setSafeRunStatus(null));
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId, activeProject, branchName, dispatch]);

  if (!workspaceId || !activeProject) return null;

  // 다른 브랜치의 상태가 잠깐 남아 있을 수 있다. 지금 브랜치의 것만 그린다.
  const current =
    status && status.projectName === activeProject && status.branchName === branchName
      ? status
      : null;

  const excludedNames = (lastRun?.excluded ?? []).map((author) => author.nickname);
  const sharedFiles = lastRun?.sharedFiles ?? [];

  return (
    <div className="flex h-8 shrink-0 items-center gap-2 overflow-x-auto border-t border-slate-900 bg-slate-800 px-3 text-[12px] font-bold text-slate-100">
      <span className="shrink-0 rounded bg-slate-600 px-2 py-0.5">
        {current?.greenUpdatedAt
          ? `✅ 정상 버전: ${formatElapsed(current.greenUpdatedAt, now)}`
          : "정상 버전: 아직 없음 (한 번 실행하면 만들어져요)"}
      </span>

      {current && current.authors.length === 0 && (
        <span className="shrink-0 text-slate-300">정상 버전 이후 고친 사람 없음</span>
      )}

      {current?.authors.map((author) => (
        <span key={author.userId} className="shrink-0">
          <AuthorChip author={author} />
        </span>
      ))}

      {lastRun && excludedNames.length > 0 && (
        <span
          className="shrink-0 rounded bg-rose-500 px-2 py-0.5 text-white"
          title={(lastRun.excluded ?? [])
            .map((author) => `${author.nickname}: ${author.files.join(", ")}`)
            .join("\n")}
        >
          이번 실행: {excludedNames.join(", ")} 님 변경 제외
        </span>
      )}

      {lastRun && lastRun.success && lastRun.mode === "OWN_ONLY" && (
        <span className="shrink-0 rounded bg-rose-500 px-2 py-0.5 text-white">
          이번 실행: 정상 버전 + 내 변경만
        </span>
      )}

      {sharedFiles.map((shared) => (
        <span key={shared.file} className="shrink-0 rounded bg-rose-500 px-2 py-0.5 text-white">
          {shared.file}: {shared.coAuthors.map((author) => author.nickname).join(", ")} 님과 함께 수정 중
        </span>
      ))}
    </div>
  );
}
