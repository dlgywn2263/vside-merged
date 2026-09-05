"use client";

// 경로: src/components/design/components/WorkspaceSidebar.tsx
//
// 워크스페이스 전환용 사이드바.
//
// 예전 것은 고정/호버 확장, 필터 버튼, 검색이 뒤섞여 300줄이 넘었는데
// 정작 하는 일은 "다른 워크스페이스로 이동"뿐이었다. 그 일만 하도록 줄였다.

import Link from "next/link";
import { Loader2, UserRound, Users } from "lucide-react";

import { cn } from "@/lib/utils";

export interface WorkspaceSummary {
  id: string;
  name: string;
  mode: "personal" | "team";
}

export interface WorkspaceSidebarProps {
  workspaces: WorkspaceSummary[];
  currentWorkspaceId: string | null;
  loading: boolean;
  errorMessage: string;
}

export function designHref(workspace: WorkspaceSummary): string {
  return `/design?workspaceId=${encodeURIComponent(workspace.id)}&mode=${workspace.mode}`;
}

export function WorkspaceSidebar({
  workspaces,
  currentWorkspaceId,
  loading,
  errorMessage,
}: WorkspaceSidebarProps) {
  const personal = workspaces.filter((item) => item.mode === "personal");
  const team = workspaces.filter((item) => item.mode === "team");

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-slate-50/70">
      <div className="px-4 py-3">
        <p className="text-xs font-semibold text-slate-500">워크스페이스</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {loading ? (
          <p className="flex items-center gap-2 px-2 py-3 text-xs text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            불러오는 중
          </p>
        ) : errorMessage ? (
          <p className="px-2 py-3 text-xs text-red-500">{errorMessage}</p>
        ) : workspaces.length === 0 ? (
          <p className="px-2 py-3 text-xs text-slate-400">워크스페이스가 없습니다.</p>
        ) : (
          <>
            <Group
              icon={<UserRound className="h-3.5 w-3.5" />}
              label="개인"
              items={personal}
              currentWorkspaceId={currentWorkspaceId}
            />
            <Group
              icon={<Users className="h-3.5 w-3.5" />}
              label="팀"
              items={team}
              currentWorkspaceId={currentWorkspaceId}
            />
          </>
        )}
      </div>
    </aside>
  );
}

function Group({
  icon,
  label,
  items,
  currentWorkspaceId,
}: {
  icon: React.ReactNode;
  label: string;
  items: WorkspaceSummary[];
  currentWorkspaceId: string | null;
}) {
  if (items.length === 0) return null;

  return (
    <div className="mb-3">
      <p className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-slate-400">
        {icon}
        {label}
      </p>

      <ul>
        {items.map((workspace) => (
          <li key={workspace.id}>
            <Link
              href={designHref(workspace)}
              className={cn(
                "block truncate rounded-lg px-2 py-1.5 text-sm transition",
                workspace.id === currentWorkspaceId
                  ? "bg-white font-medium text-slate-900 shadow-sm"
                  : "text-slate-600 hover:bg-white/70",
              )}
            >
              {workspace.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
