"use client";

// 경로: src/components/design/components/WorkspaceSidebar.tsx
//
// 워크스페이스(프로젝트) 전환용 사이드바.
//
// 일정관리 화면(app/schedules/page.tsx)의 프로젝트 사이드바와 같은 모양이다.
// 두 화면 모두 "왼쪽에서 프로젝트를 고르고 오른쪽에서 그 프로젝트를 다룬다"는
// 같은 일을 하는데 생김새가 다르면, 쓰는 사람은 매번 새로 익혀야 한다.
// 그래서 접기/펼치기, 검색, 전체·개인·팀 거르기, 목록 카드까지 그대로 맞췄다.

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  FolderOpen,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  UserRound,
  UsersRound,
} from "lucide-react";

import { cn } from "@/lib/utils";

export interface WorkspaceSummary {
  id: string;
  name: string;
  mode: "personal" | "team";
  role?: string;
}

export interface WorkspaceSidebarProps {
  workspaces: WorkspaceSummary[];
  currentWorkspaceId: string | null;
  loading: boolean;
  errorMessage: string;
}

type ProjectFilter = "all" | "personal" | "team";

export function designHref(workspace: WorkspaceSummary): string {
  return `/design?workspaceId=${encodeURIComponent(workspace.id)}&mode=${workspace.mode}`;
}

function normalizeWorkspaceRole(role?: string) {
  return role?.toLowerCase() === "owner" ? "OWNER" : "MEMBER";
}

export function WorkspaceSidebar({
  workspaces,
  currentWorkspaceId,
  loading,
  errorMessage,
}: WorkspaceSidebarProps) {
  // 접힌 상태에서도 마우스를 올리면 잠깐 펼쳐진다. 고정(pin)해 두면 계속 펼쳐져 있다.
  const [pinned, setPinned] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ProjectFilter>("all");

  const expanded = pinned || hovered;

  const personalCount = workspaces.filter((item) => item.mode === "personal").length;
  const teamCount = workspaces.length - personalCount;

  const { personal, team } = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const matched = keyword
      ? workspaces.filter((item) => item.name.toLowerCase().includes(keyword))
      : workspaces;

    return {
      personal: matched.filter((item) => item.mode === "personal"),
      team: matched.filter((item) => item.mode === "team"),
    };
  }, [workspaces, search]);

  return (
    <aside
      onMouseEnter={() => {
        if (!pinned) setHovered(true);
      }}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "waivs-sidebar flex h-full shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-[width] duration-200",
        expanded ? "w-[288px]" : "w-16",
      )}
    >
      {/* 머리 */}
      <div
        className={cn(
          "border-b border-slate-100",
          expanded ? "p-3" : "flex h-[64px] items-center justify-center p-0",
        )}
      >
        <div
          className={cn(
            "flex items-center",
            expanded ? "justify-between gap-2" : "justify-center",
          )}
        >
          {expanded && (
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#EEF3FF] text-[#5873F9]">
                  <FolderOpen size={16} strokeWidth={2.4} />
                </div>

                <div>
                  <p className="text-sm font-black text-slate-900">프로젝트</p>

                  <p className="text-[10px] font-semibold text-slate-400">
                    전체 {workspaces.length}
                    {" · "}
                    개인 {personalCount}
                    {" · "}팀 {teamCount}
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setPinned((prev) => !prev);
              setHovered(false);
            }}
            className={cn(
              "grid shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700",
              expanded ? "h-8 w-8" : "h-9 w-9",
            )}
            title={pinned ? "사이드바 접기" : "사이드바 펼치기"}
          >
            {expanded ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={18} />}
          </button>
        </div>

        {expanded && (
          <>
            <div className="relative mt-3">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="프로젝트 검색"
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#AAB8FF] focus:bg-white focus:ring-2 focus:ring-[#5873F9]/10"
              />
            </div>

            <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
              {(
                [
                  ["all", "전체"],
                  ["personal", "개인"],
                  ["team", "팀"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={cn(
                    "rounded-lg px-2 py-1.5 text-[11px] font-black transition",
                    filter === value
                      ? "bg-white text-[#5873F9] shadow-sm"
                      : "text-slate-400 hover:text-slate-700",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 몸통 */}
      <div
        className={cn(
          "min-h-0 flex-1",
          expanded ? "overflow-y-auto p-3" : "overflow-hidden",
        )}
      >
        {loading ? (
          <div className="grid h-32 place-items-center">
            <Loader2 size={18} className="animate-spin text-[#5873F9]" />
          </div>
        ) : errorMessage ? (
          expanded ? (
            <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs font-semibold leading-5 text-rose-600">
              {errorMessage}
            </div>
          ) : null
        ) : expanded ? (
          <div className="space-y-5">
            {filter !== "team" && (
              <WorkspaceSection
                title="개인 프로젝트"
                mode="personal"
                items={personal}
                currentWorkspaceId={currentWorkspaceId}
              />
            )}

            {filter !== "personal" && (
              <WorkspaceSection
                title="팀 프로젝트"
                mode="team"
                items={team}
                currentWorkspaceId={currentWorkspaceId}
              />
            )}
          </div>
        ) : (
          /* 접힌 상태 — 아이콘만 남긴다. 누르면 펼쳐진다. */
          <div className="flex h-full flex-col items-center pt-4">
            <button
              type="button"
              onClick={() => setPinned(true)}
              className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-[#5873F9]"
              title="프로젝트 검색"
            >
              <Search size={19} strokeWidth={2} />
            </button>

            <button
              type="button"
              onClick={() => setPinned(true)}
              className="mt-1 grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-[#5873F9]"
              title="프로젝트 목록"
            >
              <FolderOpen size={19} strokeWidth={2} />
            </button>

            <div className="my-3 h-px w-8 bg-slate-100" />

            <div
              className="flex h-8 w-8 items-center justify-center text-xs font-black text-slate-300"
              title={`전체 프로젝트 ${workspaces.length}개`}
            >
              {workspaces.length}
            </div>
          </div>
        )}
      </div>

      {/* 발치 */}
      {expanded && (
        <div className="border-t border-slate-100 p-3">
          <Link
            href="/main"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#D9E1FF] bg-[#F7F9FF] px-3 py-2 text-xs font-black text-[#5873F9] transition hover:bg-[#EEF3FF]"
          >
            전체 프로젝트
            <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </aside>
  );
}

function WorkspaceSection({
  title,
  mode,
  items,
  currentWorkspaceId,
}: {
  title: string;
  mode: "personal" | "team";
  items: WorkspaceSummary[];
  currentWorkspaceId: string | null;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between px-2">
        <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-500">
          {mode === "team" ? <UsersRound size={13} /> : <UserRound size={13} />}
          {title}
        </div>

        <span className="text-[10px] font-black text-slate-400">{items.length}</span>
      </div>

      <div className="space-y-1">
        {items.length === 0 ? (
          <p className="px-2 py-2 text-[11px] font-medium text-slate-400">
            프로젝트가 없습니다.
          </p>
        ) : (
          items.map((workspace) => (
            <WorkspaceButton
              key={workspace.id}
              workspace={workspace}
              selected={workspace.id === currentWorkspaceId}
            />
          ))
        )}
      </div>
    </section>
  );
}

function WorkspaceButton({
  workspace,
  selected,
}: {
  workspace: WorkspaceSummary;
  selected: boolean;
}) {
  return (
    <Link
      href={designHref(workspace)}
      className={cn(
        "flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition",
        selected
          ? "bg-[#5873F9] text-white shadow-sm"
          : "text-slate-700 hover:bg-slate-100",
      )}
    >
      <div
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
          selected
            ? "bg-white/15 text-white"
            : workspace.mode === "team"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-blue-50 text-blue-700",
        )}
      >
        {workspace.mode === "team" ? <UsersRound size={15} /> : <UserRound size={15} />}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-black">{workspace.name}</p>

        <p
          className={cn(
            "mt-0.5 truncate text-[10px] font-semibold",
            selected ? "text-white/70" : "text-slate-400",
          )}
        >
          {workspace.mode === "team" ? "팀 프로젝트" : "개인 프로젝트"}
          {" · "}
          {normalizeWorkspaceRole(workspace.role)}
        </p>
      </div>
    </Link>
  );
}
