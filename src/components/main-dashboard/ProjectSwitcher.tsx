"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Loader2,
  Search,
  Settings2,
  UserRound,
  UsersRound,
} from "lucide-react";

import type {
  ProjectFilter,
  WorkspaceSidebarItem,
} from "@/components/layout/ProjectSidebar";

type Props = {
  label: string;
  workspaces: WorkspaceSidebarItem[];
  selectedWorkspaceId: string;
  loading: boolean;
  errorMessage: string;
  onSelectWorkspace: (workspace: WorkspaceSidebarItem) => void;
  allProjectsHref?: string;
  // "compact" 는 일정 관리처럼 경로 표시(대시보드 / 프로젝트 / 일정) 안에 넣을 때 쓴다.
  size?: "default" | "compact";
};

const FILTERS: Array<[ProjectFilter, string]> = [
  ["all", "전체"],
  ["personal", "개인"],
  ["team", "팀"],
];

// 대시보드에서 ProjectSidebar 대신 쓰는 프로젝트 전환 메뉴.
// 사이드바가 하던 일(검색·개인/팀 필터·선택·설정·전체 프로젝트)을 그대로 옮겼다.
export default function ProjectSwitcher({
  label,
  workspaces,
  selectedWorkspaceId,
  loading,
  errorMessage,
  onSelectWorkspace,
  allProjectsHref = "/projects",
  size = "default",
}: Props) {
  const compact = size === "compact";

  const router = useRouter();

  const [open, setOpen] = useState(false);

  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState<ProjectFilter>("all");

  const rootRef = useRef<HTMLDivElement | null>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const selectedWorkspace = useMemo(
    () =>
      workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ??
      null,
    [workspaces, selectedWorkspaceId],
  );

  const filteredWorkspaces = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return workspaces.filter(
      (workspace) =>
        (filter === "all" || workspace.mode === filter) &&
        (!keyword || workspace.name.toLowerCase().includes(keyword)),
    );
  }, [filter, search, workspaces]);

  const groups = [
    {
      mode: "personal" as const,
      title: "개인 프로젝트",
      items: filteredWorkspaces.filter((item) => item.mode === "personal"),
    },
    {
      mode: "team" as const,
      title: "팀 프로젝트",
      items: filteredWorkspaces.filter((item) => item.mode === "team"),
    },
  ].filter((group) => filter === "all" || group.mode === filter);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    requestAnimationFrame(() => searchInputRef.current?.focus());

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleSelect = (workspace: WorkspaceSidebarItem) => {
    setOpen(false);
    onSelectWorkspace(workspace);
  };

  const handleOpenSettings = () => {
    if (!selectedWorkspace) return;

    setOpen(false);
    router.push(
      `/dashboard/${encodeURIComponent(
        selectedWorkspace.id,
      )}/settings?mode=${selectedWorkspace.mode}`,
    );
  };

  return (
    <div ref={rootRef} className="relative min-w-0">
      <h1 className="min-w-0">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={`group inline-flex max-w-full items-center rounded-md text-left transition-colors hover:bg-[#F2F5FF] ${
            compact ? "gap-1 px-1.5 py-1" : "-ml-2 gap-2 px-2 py-1"
          }`}
        >
          <span
            className={`truncate text-gray-900 ${
              compact
                ? "text-sm font-semibold"
                : "text-[26px] font-bold leading-tight tracking-tight"
            }`}
          >
            {label}
          </span>

          <span
            className={`grid shrink-0 place-items-center rounded text-gray-500 transition-colors group-hover:text-[#5873F9] ${
              compact
                ? "h-5 w-5"
                : "h-6 w-6 border border-gray-200 bg-white group-hover:border-[#AAB8FF]"
            }`}
          >
            <ChevronDown
              size={compact ? 13 : 14}
              strokeWidth={2.4}
              className={`transition-transform ${open ? "rotate-180" : ""}`}
            />
          </span>
        </button>
      </h1>

      {open ? (
        <div
          role="dialog"
          aria-label="프로젝트 전환"
          className="absolute left-0 top-full z-40 mt-2 w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-md border border-gray-300 bg-white"
        >
          <div className="border-b border-gray-100 p-3">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                ref={searchInputRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="프로젝트 검색"
                className="h-8 w-full rounded-md border border-gray-200 bg-gray-50 pl-8 pr-3 text-xs font-medium text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[#AAB8FF] focus:bg-white"
              />
            </div>

            <div className="mt-2 grid grid-cols-3 gap-1 rounded-md bg-gray-100 p-0.5">
              {FILTERS.map(([value, text]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`h-7 rounded text-[11px] font-semibold transition-colors ${
                    filter === value
                      ? "bg-white text-[#5873F9]"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {text}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[320px] overflow-y-auto p-2">
            {loading ? (
              <div className="grid h-24 place-items-center">
                <Loader2 size={18} className="animate-spin text-[#5873F9]" />
              </div>
            ) : errorMessage ? (
              <p className="rounded-md bg-rose-50 p-3 text-xs font-medium text-rose-600">
                {errorMessage}
              </p>
            ) : (
              groups.map((group) => (
                <div key={group.mode} className="pb-1.5 last:pb-0">
                  <p className="flex items-center justify-between px-2 pb-1 pt-1.5 text-[11px] font-semibold text-gray-400">
                    {group.title}
                    <span className="tabular-nums">{group.items.length}</span>
                  </p>

                  {group.items.length === 0 ? (
                    <p className="px-2 py-1.5 text-[11px] text-gray-400">
                      프로젝트가 없습니다.
                    </p>
                  ) : (
                    group.items.map((workspace) => {
                      const selected = workspace.id === selectedWorkspaceId;

                      const isTeam = workspace.mode === "team";

                      return (
                        <button
                          key={workspace.id}
                          type="button"
                          onClick={() => handleSelect(workspace)}
                          className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors ${
                            selected ? "bg-[#F2F5FF]" : "hover:bg-gray-50"
                          }`}
                        >
                          <span
                            className={`grid h-7 w-7 shrink-0 place-items-center rounded-md ${
                              isTeam
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {isTeam ? (
                              <UsersRound size={14} />
                            ) : (
                              <UserRound size={14} />
                            )}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span
                              className={`block truncate text-[13px] font-semibold ${
                                selected ? "text-[#4058D6]" : "text-gray-900"
                              }`}
                            >
                              {workspace.name}
                            </span>

                            <span className="block truncate text-[11px] text-gray-400">
                              {workspace.role?.toLowerCase() === "owner"
                                ? "OWNER"
                                : "MEMBER"}
                              {" · "}작업 폴더 {workspace.childCount}개
                            </span>
                          </span>

                          {selected ? (
                            <Check
                              size={15}
                              strokeWidth={2.6}
                              className="shrink-0 text-[#5873F9]"
                            />
                          ) : null}
                        </button>
                      );
                    })
                  )}
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2 border-t border-gray-100 bg-gray-50 p-2">
            {selectedWorkspace ? (
              <button
                type="button"
                onClick={handleOpenSettings}
                className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-gray-200 bg-white text-xs font-semibold text-gray-700 transition-colors hover:border-[#AAB8FF] hover:text-[#5873F9]"
              >
                <Settings2 size={14} />
                프로젝트 설정
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push(allProjectsHref);
              }}
              className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-[#D9E1FF] bg-[#F7F9FF] text-xs font-semibold text-[#5873F9] transition-colors hover:bg-[#EEF3FF]"
            >
              전체 프로젝트
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
