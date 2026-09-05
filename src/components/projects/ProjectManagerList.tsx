"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useDispatch } from "react-redux";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Code2,
  ExternalLink,
  FileText,
  Filter,
  FolderKanban,
  FolderOpen,
  Info,
  MoreVertical,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  Trash2,
  TrendingUp,
  UserRound,
  Users,
  UsersRound,
} from "lucide-react";



import CreateProjectModal from "@/components/ide/CreateProjectModal";
import { openProjectModal } from "@/store/slices/uiSlice";
import { setWorkspaceId } from "@/store/slices/fileSystemSlice";

import { getMyWorkspacesByTokenApi } from "@/lib/ide/api";
import { apiFetch, apiJson } from "@/lib/api/apiClient";

import type {
  ProjectSummaryResponse,
  WorkspaceListResponse,
  WorkspaceMode,
} from "@/components/main-dashboard/dashboard.types";

import {
  getAivsHref,
  getDevlogHref,
  getIdeHref,
  getScheduleHref,
} from "@/components/main-dashboard/dashboard.utils";


type SubProjectStatus = "todo" | "progress" | "done" | "hold";
type SortType = "recent" | "name" | "progress";
type ProjectFilter = "all" | "personal" | "team";

type ProjectListResponse = ProjectSummaryResponse & {
  description?: string | null;
  gitUrl?: string | null;
  workspaceId: string;
  workspaceName: string;

  status?: SubProjectStatus | string | null;
  progress?: number | null;
  scheduleCount?: number | null;
  doneScheduleCount?: number | null;
  devlogCount?: number | null;
  memberCount?: number | null;
};

type SubProject = ProjectListResponse & {
  id: string;
};

type Props = {
  workspaceId?: string;
  mode?: WorkspaceMode;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function useOnClickOutside<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  handler: () => void,
) {
  useEffect(() => {
    const listener = (event: MouseEvent) => {
      const target = event.target as Node | null;

      if (!ref.current || !target) return;
      if (ref.current.contains(target)) return;

      handler();
    };

    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

function normalizeStatus(value?: string | null): SubProjectStatus {
  if (value === "done") return "done";
  if (value === "hold") return "hold";
  if (value === "progress") return "progress";
  return "todo";
}

function getStatusLabel(status: SubProjectStatus) {
  switch (status) {
    case "progress":
      return "진행 중";
    case "done":
      return "완료";
    case "hold":
      return "보류";
    case "todo":
    default:
      return "시작 전";
  }
}

function getStatusClassName(status: SubProjectStatus) {
  switch (status) {
    case "progress":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "done":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "hold":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "todo":
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

function getProgressBarClassName(status: SubProjectStatus) {
  switch (status) {
    case "done":
      return "bg-violet-500";
    case "hold":
      return "bg-amber-500";
    case "progress":
      return "bg-blue-600";
    case "todo":
    default:
      return "bg-slate-400";
  }
}

function getProgress(project: SubProject) {
  if (typeof project.progress === "number") {
    return Math.max(0, Math.min(100, Math.round(project.progress)));
  }

  const total = project.scheduleCount ?? 0;
  const done = project.doneScheduleCount ?? 0;

  if (total > 0) {
    return Math.round((done / total) * 100);
  }

  return 0;
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  if (/^\d{4}\.\d{2}\.\d{2}/.test(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}.${month}.${day}`;
}

function getWorkspaceTitle(workspace?: WorkspaceListResponse | null) {
  return workspace?.name?.trim() || "이름 없는 프로젝트";
}

function getWorkspaceSubProjectCount(workspace?: WorkspaceListResponse | null) {
  return Array.isArray(workspace?.projects) ? workspace.projects.length : 0;
}

function getWorkspaceTechLabel(workspace?: WorkspaceListResponse | null) {
  return `작업 폴더 ${getWorkspaceSubProjectCount(workspace)}개`;
}

function mapProjectResponse(project: ProjectListResponse): SubProject {
  return {
    ...project,
    id: String(project.id),
    description: project.description ?? null,
    gitUrl: project.gitUrl ?? null,
    status: project.status ?? "todo",
    progress: project.progress ?? 0,
    scheduleCount: project.scheduleCount ?? 0,
    doneScheduleCount: project.doneScheduleCount ?? 0,
    devlogCount: project.devlogCount ?? 0,
    memberCount: project.memberCount ?? 1,
  };
}
async function fetchSubProjectsByWorkspaceApi(
  workspaceId: string,
): Promise<SubProject[]> {
  const data = (await apiJson(
    `/api/projects/workspace/${encodeURIComponent(workspaceId)}`,
    {
      cache: "no-store",
    },
  )) as ProjectListResponse[];

  return Array.isArray(data) ? data.map(mapProjectResponse) : [];
}
function StatusPill({ status }: { status: SubProjectStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold",
        getStatusClassName(status),
      )}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function ProjectSidebar({
  allWorkspaces,
  currentWorkspaceId,
  currentMode,
  projectSearch,
  projectFilter,
  sidebarExpanded,
  isSidebarPinned,
  isLoading,
  errorMessage,
  onSearchChange,
  onFilterChange,
  onToggleSidebar,
  onMouseEnter,
  onMouseLeave,
}: {
  allWorkspaces: WorkspaceListResponse[];
  currentWorkspaceId?: string | null;
  currentMode: WorkspaceMode;
  projectSearch: string;
  projectFilter: ProjectFilter;
  sidebarExpanded: boolean;
  isSidebarPinned: boolean;
  isLoading: boolean;
  errorMessage: string;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: ProjectFilter) => void;
  onToggleSidebar: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const pathname = usePathname();

  const personalCount = allWorkspaces.filter(
    (workspace) => workspace.mode === "personal",
  ).length;

  const teamCount = allWorkspaces.filter(
    (workspace) => workspace.mode === "team",
  ).length;

  const filteredSidebarWorkspaces = useMemo(() => {
    const keyword = projectSearch.trim().toLowerCase();

    return allWorkspaces.filter((workspace) => {
      const matchedFilter =
        projectFilter === "all" || workspace.mode === projectFilter;

      const title = getWorkspaceTitle(workspace).toLowerCase();
      const workspaceName = workspace.name?.toLowerCase() ?? "";
      const tech = getWorkspaceTechLabel(workspace).toLowerCase();

      const matchedKeyword =
        !keyword ||
        title.includes(keyword) ||
        workspaceName.includes(keyword) ||
        tech.includes(keyword);

      return matchedFilter && matchedKeyword;
    });
  }, [allWorkspaces, projectSearch, projectFilter]);

  const personalSidebarWorkspaces = filteredSidebarWorkspaces.filter(
    (workspace) => workspace.mode === "personal",
  );

  const teamSidebarWorkspaces = filteredSidebarWorkspaces.filter(
    (workspace) => workspace.mode === "team",
  );

  const getWorkspaceHref = (workspace: WorkspaceListResponse) => {
    const params = new URLSearchParams();
    params.set("workspaceId", String(workspace.id));
    params.set("mode", workspace.mode);

    return `${pathname}?${params.toString()}`;
  };

  const renderWorkspaceItem = (workspace: WorkspaceListResponse) => {
    const active = String(workspace.id) === String(currentWorkspaceId);
    const workspaceTitle = getWorkspaceTitle(workspace);
    const workspaceTech = getWorkspaceTechLabel(workspace);

    return (
      <Link
        key={workspace.id}
        href={getWorkspaceHref(workspace)}
        title={!sidebarExpanded ? workspaceTitle : undefined}
        onClick={() => {
          if (typeof window === "undefined") return;

          localStorage.setItem("currentWorkspaceId", String(workspace.id));
          localStorage.setItem("currentWorkspaceMode", workspace.mode);
        }}
        className={cn(
          "group flex items-center gap-2 rounded-xl px-2 py-2 text-sm transition",
          active
            ? "bg-[#5873F9] text-white shadow-sm"
            : "text-gray-700 hover:bg-gray-100",
        )}
      >
        <div
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
            active
              ? "bg-white/15 text-white"
              : workspace.mode === "team"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-blue-50 text-blue-700",
          )}
        >
          {workspace.mode === "team" ? (
            <Users size={16} strokeWidth={2.3} />
          ) : (
            <UserRound size={16} strokeWidth={2.3} />
          )}
        </div>

        {sidebarExpanded ? (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{workspaceTitle}</p>
              <p
                className={cn(
                  "truncate text-[11px]",
                  active ? "text-white/70" : "text-gray-400",
                )}
              >
                {workspace.mode === "team" ? "팀" : "개인"} · {workspaceTech}
              </p>
            </div>

            <ChevronRight
              size={15}
              strokeWidth={2.4}
              className={cn(
                "shrink-0 opacity-0 transition group-hover:opacity-100",
                active ? "text-white/70" : "text-gray-400",
              )}
            />
          </>
        ) : null}
      </Link>
    );
  };

  return (
    <aside
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
  "waivs-sidebar sticky top-5 hidden h-[calc(100vh-40px)] shrink-0 overflow-hidden transition-all duration-300 md:flex",
  sidebarExpanded ? "w-72" : "w-16",
)}
    >
      <div className="flex min-h-0 w-full flex-col">
        <div
          className={cn(
            "flex items-center border-b border-gray-200",
            sidebarExpanded
              ? "justify-between px-3 py-3"
              : "justify-center py-3",
          )}
        >
          {sidebarExpanded ? (
            <div className="min-w-0">
              <p className="text-sm font-black text-gray-900">프로젝트</p>
              <p className="mt-0.5 text-[11px] text-gray-500">
                전체 {allWorkspaces.length}개 · 개인 {personalCount}개 · 팀{" "}
                {teamCount}개
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={onToggleSidebar}
            className="grid h-8 w-8 place-items-center rounded-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            aria-label={isSidebarPinned ? "사이드바 접기" : "사이드바 고정"}
            title={isSidebarPinned ? "사이드바 접기" : "사이드바 고정"}
          >
            {isSidebarPinned ? (
              <PanelLeftClose size={17} strokeWidth={2.4} />
            ) : (
              <PanelLeftOpen size={17} strokeWidth={2.4} />
            )}
          </button>
        </div>

        {!sidebarExpanded ? (
          <div className="flex min-h-0 flex-1 flex-col items-center gap-2 px-2 py-3">
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
              title="프로젝트 검색"
              aria-label="프로젝트 검색"
              onClick={onToggleSidebar}
            >
              <Search size={17} strokeWidth={2.3} />
            </button>

            <Link
              href="/main"
              className="grid h-9 w-9 place-items-center rounded-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
              title="전체 프로젝트"
              aria-label="전체 프로젝트"
            >
              <FolderOpen size={17} strokeWidth={2.3} />
            </Link>

            <div className="mt-2 h-px w-8 bg-gray-200" />

            <div className="grid h-9 w-9 place-items-center rounded-xl text-gray-300">
              {personalCount + teamCount}
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3 px-3 py-3">
              <div className="relative">
                <Search
                  size={16}
                  strokeWidth={2.2}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  value={projectSearch}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="프로젝트 검색"
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#5873F9] focus:ring-2 focus:ring-[#5873F9]/10"
                />
              </div>

              <div className="grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1">
                {[
                  { key: "all", label: "전체" },
                  { key: "personal", label: "개인" },
                  { key: "team", label: "팀" },
                ].map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => onFilterChange(filter.key as ProjectFilter)}
                    className={cn(
                      "rounded-lg px-2 py-1.5 text-xs font-bold transition",
                      projectFilter === filter.key
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-900",
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
              {isLoading ? (
                <div className="mx-1 rounded-xl border border-dashed border-gray-200 px-3 py-6 text-center text-sm text-gray-400">
                  프로젝트를 불러오는 중입니다.
                </div>
              ) : errorMessage ? (
                <div className="mx-1 rounded-xl border border-red-100 bg-red-50 px-3 py-4 text-xs leading-relaxed text-red-500">
                  {errorMessage}
                </div>
              ) : filteredSidebarWorkspaces.length === 0 ? (
                <div className="mx-1 rounded-xl border border-dashed border-gray-200 px-3 py-6 text-center text-sm text-gray-400">
                  검색 결과가 없습니다.
                </div>
              ) : (
                <div className="space-y-5">
                  {projectFilter !== "team" ? (
                    <section>
                      <div className="mb-2 flex items-center justify-between px-2">
                        <div className="flex items-center gap-1.5 text-xs font-black text-gray-500">
                          <UserRound size={14} strokeWidth={2.3} />
                          개인 프로젝트
                        </div>

                        <span className="text-[11px] font-bold text-gray-400">
                          {personalSidebarWorkspaces.length}
                        </span>
                      </div>

                      <div className="space-y-1">
                        {personalSidebarWorkspaces.length > 0 ? (
                          personalSidebarWorkspaces.map(renderWorkspaceItem)
                        ) : (
                          <p className="px-2 py-2 text-xs text-gray-400">
                            개인 프로젝트가 없습니다.
                          </p>
                        )}
                      </div>
                    </section>
                  ) : null}

                  {projectFilter !== "personal" ? (
                    <section>
                      <div className="mb-2 flex items-center justify-between px-2">
                        <div className="flex items-center gap-1.5 text-xs font-black text-gray-500">
                          <Users size={14} strokeWidth={2.3} />팀 프로젝트
                        </div>

                        <span className="text-[11px] font-bold text-gray-400">
                          {teamSidebarWorkspaces.length}
                        </span>
                      </div>

                      <div className="space-y-1">
                        {teamSidebarWorkspaces.length > 0 ? (
                          teamSidebarWorkspaces.map(renderWorkspaceItem)
                        ) : (
                          <p className="px-2 py-2 text-xs text-gray-400">
                            팀 프로젝트가 없습니다.
                          </p>
                        )}
                      </div>
                    </section>
                  ) : null}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 p-3">
              {currentWorkspaceId ? (
                <Link
                  href={getIdeHref(String(currentWorkspaceId), currentMode)}
                  onClick={() => {
                    if (typeof window === "undefined") return;

                    localStorage.setItem(
                      "currentWorkspaceId",
                      String(currentWorkspaceId),
                    );
                    localStorage.setItem("currentWorkspaceMode", currentMode);
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl border border-[#D9E1FF] bg-[#F7F9FF] px-3 py-2 text-sm font-bold text-[#5873F9] transition hover:bg-[#EEF3FF]"
                >
                  작업하러가기
                  <ArrowRight size={16} strokeWidth={2.4} />
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-gray-400"
                >
                  작업하러가기
                  <ArrowRight size={16} strokeWidth={2.4} />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

function SubProjectCard({
  project,
  mode,
  open,
  onOpenMenu,
  onCloseMenu,
  onDelete,
  menuRef,
}: {
  project: SubProject;
  mode: WorkspaceMode;
  open: boolean;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onDelete: () => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
}) {
  const status = normalizeStatus(project.status);
  const progress = getProgress(project);

  const scheduleCount = project.scheduleCount ?? 0;
  const doneScheduleCount = project.doneScheduleCount ?? 0;
  const devlogCount = project.devlogCount ?? 0;
  const memberCount = project.memberCount ?? 1;

  const openHref = getAivsHref(project.workspaceId, mode);
  const scheduleHref = getScheduleHref(project.workspaceId, mode);
  const devlogHref = getDevlogHref(project.workspaceId);

  return (
    <section className="group relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <FolderKanban size={19} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-extrabold text-slate-950">
                {project.name}
              </h3>

              <StatusPill status={status} />
            </div>

            <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
              {project.description?.trim()
                ? project.description
                : `${project.language || "General"} 기반 작업 폴더입니다.`}
            </p>

            {project.gitUrl ? (
              <a
                href={project.gitUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs font-semibold text-slate-400 transition hover:text-blue-600"
              >
                <span className="truncate">{project.gitUrl}</span>
                <ExternalLink size={12} />
              </a>
            ) : null}
          </div>
        </div>

        <div className="relative shrink-0" ref={open ? menuRef : null}>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="작업 폴더 메뉴"
            onClick={onOpenMenu}
          >
            <MoreVertical size={17} />
          </button>

          {open ? (
            <div className="absolute right-0 top-10 z-20 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              <Link
                href={openHref}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={onCloseMenu}
              >
                <FolderOpen size={16} className="text-slate-500" />
                작업 폴더 열기
              </Link>

              <Link
                href={scheduleHref}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={onCloseMenu}
              >
                <CalendarCheck size={16} className="text-slate-500" />
                일정관리
              </Link>

              <Link
                href={devlogHref}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={onCloseMenu}
              >
                <FileText size={16} className="text-slate-500" />
                개발일지
              </Link>

              <button
                type="button"
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  onCloseMenu();
                  console.log("project detail:", project.id);
                }}
              >
                <Info size={16} className="text-slate-500" />
                프로젝트 정보
              </button>

              <button
                type="button"
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  onCloseMenu();
                  console.log("project settings:", project.id);
                }}
              >
                <Settings size={16} className="text-slate-500" />
                설정
              </button>

              <div className="h-px bg-slate-100" />

              <button
                type="button"
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                onClick={onDelete}
              >
                <Trash2 size={16} />
                삭제
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs font-bold">
          <span className="text-slate-500">진행률</span>
          <span className="text-slate-900">{progress}%</span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              getProgressBarClassName(status),
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-slate-50 px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <CalendarCheck size={14} />
            일정
          </div>
          <p className="mt-1 text-sm font-extrabold text-slate-900">
            {doneScheduleCount}/{scheduleCount}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <FileText size={14} />
            일지
          </div>
          <p className="mt-1 text-sm font-extrabold text-slate-900">
            {devlogCount}개
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <UsersRound size={14} />
            인원
          </div>
          <p className="mt-1 text-sm font-extrabold text-slate-900">
            {memberCount}명
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-slate-400">
            최근 수정
          </p>
          <p className="mt-0.5 text-sm font-bold text-slate-700">
            {formatDate(project.updatedAt)}
          </p>
        </div>

        <Link
          href={openHref}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-950 px-3 py-2 text-sm font-bold text-white transition hover:bg-blue-600"
        >
          열기
          <ArrowUpRight size={15} />
        </Link>
      </div>
    </section>
  );
}

export function ProjectManagerList({
  workspaceId: workspaceIdProp,
  mode = "personal",
}: Props) {
  const dispatch = useDispatch();
  const searchParams = useSearchParams();

  const workspaceIdFromUrl =
    searchParams.get("workspaceId") ??
    searchParams.get("id") ??
    searchParams.get("workspace");

  const modeFromUrl = searchParams.get("mode");

  const [rememberedWorkspaceId, setRememberedWorkspaceId] = useState<
    string | null
  >(null);

  const [rememberedMode, setRememberedMode] =
    useState<WorkspaceMode>("personal");

  const currentWorkspaceId =
    workspaceIdProp ?? workspaceIdFromUrl ?? rememberedWorkspaceId;

  const currentMode: WorkspaceMode =
    modeFromUrl === "team" || modeFromUrl === "personal"
      ? modeFromUrl
      : rememberedMode || mode;

  const [allWorkspaces, setAllWorkspaces] = useState<WorkspaceListResponse[]>(
    [],
  );
  const [sidebarLoading, setSidebarLoading] = useState(true);
  const [sidebarError, setSidebarError] = useState("");

  const [projects, setProjects] = useState<SubProject[]>([]);
  const [workspaceName, setWorkspaceName] = useState("AIVS");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState<"all" | SubProjectStatus>(
    "all",
  );
  const [sortType, setSortType] = useState<SortType>("recent");
  const [query, setQuery] = useState("");

  const [projectSearch, setProjectSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>("all");

  const [isSidebarPinned, setIsSidebarPinned] = useState(true);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [canSidebarHoverExpand, setCanSidebarHoverExpand] = useState(true);

  const sidebarExpanded =
    isSidebarPinned || (canSidebarHoverExpand && isSidebarHovered);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useOnClickOutside(menuRef, () => setOpenMenuId(null));

  const selectedWorkspace = useMemo(() => {
    if (!currentWorkspaceId) return null;

    return (
      allWorkspaces.find(
        (workspace) => String(workspace.id) === String(currentWorkspaceId),
      ) ?? null
    );
  }, [allWorkspaces, currentWorkspaceId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedWorkspaceId = localStorage.getItem("currentWorkspaceId");
    const storedMode = localStorage.getItem("currentWorkspaceMode");

    if (storedWorkspaceId) {
      setRememberedWorkspaceId(storedWorkspaceId);
    }

    if (storedMode === "team" || storedMode === "personal") {
      setRememberedMode(storedMode);
    }
  }, []);

  useEffect(() => {
    if (!currentWorkspaceId) return;

    localStorage.setItem("currentWorkspaceId", currentWorkspaceId);
    localStorage.setItem("currentWorkspaceMode", currentMode);
  }, [currentWorkspaceId, currentMode]);

  async function loadWorkspaceList() {
    try {
      setSidebarLoading(true);
      setSidebarError("");

      const workspaceData = await getMyWorkspacesByTokenApi();
      const list: WorkspaceListResponse[] = Array.isArray(workspaceData)
        ? workspaceData
        : [];

      setAllWorkspaces(list);

      if (!currentWorkspaceId && list[0]?.id) {
        setRememberedWorkspaceId(String(list[0].id));
        setRememberedMode(list[0].mode);

        localStorage.setItem("currentWorkspaceId", String(list[0].id));
        localStorage.setItem("currentWorkspaceMode", list[0].mode);
      }
    } catch (err) {
      console.error(err);
      setAllWorkspaces([]);
      setSidebarError(
        err instanceof Error
          ? err.message
          : "프로젝트 목록 조회 중 오류가 발생했습니다.",
      );
    } finally {
      setSidebarLoading(false);
    }
  }

  async function loadProjects(workspaceId: string) {
    try {
      setLoading(true);
      setError("");

      const data = await fetchSubProjectsByWorkspaceApi(workspaceId);

      setProjects(data);

      const nameFromResponse = data[0]?.workspaceName;
      const nameFromWorkspace = selectedWorkspace?.name;

      setWorkspaceName(nameFromResponse || nameFromWorkspace || "AIVS");
    } catch (err) {
      console.error(err);
      setProjects([]);
      setError(
        err instanceof Error
          ? err.message
          : "작업 폴더 조회 중 오류가 발생했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWorkspaceList();
  }, []);

  useEffect(() => {
    if (!currentWorkspaceId) {
      setLoading(false);
      setProjects([]);
      setError("선택된 상위 프로젝트 ID가 없습니다.");
      return;
    }

    loadProjects(currentWorkspaceId);
  }, [currentWorkspaceId, selectedWorkspace?.name]);

  useEffect(() => {
    if (selectedWorkspace?.name) {
      setWorkspaceName(selectedWorkspace.name);
    }
  }, [selectedWorkspace?.name]);

  const filteredProjects = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    const result = projects
      .filter((project) => {
        const status = normalizeStatus(project.status);

        if (statusFilter === "all") return true;
        return status === statusFilter;
      })
      .filter((project) => {
        if (!keyword) return true;

        return (
          project.name.toLowerCase().includes(keyword) ||
          project.language.toLowerCase().includes(keyword) ||
          (project.description ?? "").toLowerCase().includes(keyword) ||
          (project.gitUrl ?? "").toLowerCase().includes(keyword)
        );
      });

    result.sort((a, b) => {
      if (sortType === "name") {
        return a.name.localeCompare(b.name);
      }

      if (sortType === "progress") {
        return getProgress(b) - getProgress(a);
      }

      return a.updatedAt < b.updatedAt ? 1 : -1;
    });

    return result;
  }, [projects, query, statusFilter, sortType]);

  const allSubProjectCount = projects.length;

  const progressCount = projects.filter(
    (project) => normalizeStatus(project.status) === "progress",
  ).length;

  const doneCount = projects.filter(
    (project) => normalizeStatus(project.status) === "done",
  ).length;

  const totalDevlogCount = projects.reduce(
    (sum, project) => sum + (project.devlogCount ?? 0),
    0,
  );

  const averageProgress =
    projects.length > 0
      ? Math.round(
          projects.reduce((sum, project) => sum + getProgress(project), 0) /
            projects.length,
        )
      : 0;

  function handleToggleSidebar() {
    if (isSidebarPinned) {
      setIsSidebarPinned(false);
      setIsSidebarHovered(false);
      setCanSidebarHoverExpand(false);
      return;
    }

    setIsSidebarPinned(true);
    setIsSidebarHovered(false);
    setCanSidebarHoverExpand(true);
  }

  async function handleDeleteSubProject(projectId: string) {
    if (
      !window.confirm(
        "정말 이 작업 폴더를 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.",
      )
    ) {
      return;
    }

    try {
      const response = await apiFetch(
        `/api/projects/${encodeURIComponent(projectId)}`,
        {
          method: "DELETE",
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "작업 폴더 삭제에 실패했습니다.");
      }

      setProjects((prev) => prev.filter((project) => project.id !== projectId));
      setOpenMenuId(null);
      alert("작업 폴더가 삭제되었습니다.");
    } catch (err) {
      console.error(err);
      alert(
        err instanceof Error
          ? err.message
          : "작업 폴더 삭제 중 오류가 발생했습니다.",
      );
    }
  }

  function handleOpenCreateProjectModal() {
    if (!currentWorkspaceId) {
      alert("선택된 상위 프로젝트 ID가 없습니다.");
      return;
    }

    localStorage.setItem("currentWorkspaceId", currentWorkspaceId);
    localStorage.setItem("currentWorkspaceMode", currentMode);

    dispatch(setWorkspaceId(currentWorkspaceId));
    dispatch(openProjectModal());
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenuId(null);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
     <main className="waivs-page p-4 font-sans md:p-5">
        <div className="mx-auto flex max-w-[1680px] gap-5">
          <ProjectSidebar
            allWorkspaces={allWorkspaces}
            currentWorkspaceId={currentWorkspaceId}
            currentMode={currentMode}
            projectSearch={projectSearch}
            projectFilter={projectFilter}
            sidebarExpanded={sidebarExpanded}
            isSidebarPinned={isSidebarPinned}
            isLoading={sidebarLoading}
            errorMessage={sidebarError}
            onSearchChange={setProjectSearch}
            onFilterChange={setProjectFilter}
            onToggleSidebar={handleToggleSidebar}
            onMouseEnter={() => {
              if (!isSidebarPinned && canSidebarHoverExpand) {
                setIsSidebarHovered(true);
              }
            }}
            onMouseLeave={() => {
              setIsSidebarHovered(false);
              setCanSidebarHoverExpand(true);
            }}
          />

          <div className="min-w-0 flex-1 space-y-5">
            <section className="waivs-panel px-6 py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-black text-[#2563EB]">AIVS</p>

                  <h1 className="mt-2 truncate text-2xl font-black tracking-tight text-gray-950">
                    {workspaceName}
                  </h1>

                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    선택된 프로젝트 안의 작업 폴더를 AIVS 작업 단위로
                    관리합니다.
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {/* <Link
                    href="/main"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 text-sm font-black text-gray-700 transition hover:bg-gray-50"
                  >
                    전체 프로젝트
                    <ArrowRight size={17} />
                  </Link> */}

                  {currentWorkspaceId ? (
                    <Link
                      href={getIdeHref(String(currentWorkspaceId), currentMode)}
                      onClick={() => {
                        if (typeof window === "undefined") return;

                        localStorage.setItem(
                          "currentWorkspaceId",
                          String(currentWorkspaceId),
                        );
                        localStorage.setItem("currentWorkspaceMode", currentMode);
                      }}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#D9E1FF] bg-[#F7F9FF] px-4 text-sm font-black text-[#5873F9] transition hover:bg-[#EEF3FF]"
                    >
                      작업하러가기
                      <ArrowUpRight size={17} />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex h-11 cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-black text-gray-400"
                    >
                      작업하러가기
                      <ArrowUpRight size={17} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleOpenCreateProjectModal}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-4 text-sm font-black text-white shadow-sm transition hover:bg-blue-700"
                  >
                    <Plus size={18} />
                    작업 폴더 추가
                  </button>
                </div>
              </div>

              <div className="mt-4 border-t border-gray-100 pt-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-bold text-gray-500">
                  <span>
                    전체{" "}
                    <strong className="font-black text-gray-950">
                      {allSubProjectCount}개
                    </strong>
                  </span>

                  <span className="text-gray-300">·</span>

                  <span>
                    진행 중{" "}
                    <strong className="font-black text-gray-950">
                      {progressCount}개
                    </strong>
                  </span>

                  <span className="text-gray-300">·</span>

                  <span>
                    완료{" "}
                    <strong className="font-black text-gray-950">
                      {doneCount}개
                    </strong>
                  </span>

                  <span className="text-gray-300">·</span>

                  <span>
                    평균 진행률{" "}
                    <strong className="font-black text-gray-950">
                      {averageProgress}%
                    </strong>
                  </span>

                  <span className="text-gray-300">·</span>

                  <span>
                    개발일지{" "}
                    <strong className="font-black text-gray-950">
                      {totalDevlogCount}개
                    </strong>
                  </span>
                </div>
              </div>
            </section>

            <section className="waivs-panel p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-gray-950">
                    작업 폴더 목록
                  </h2>

                  <p className="mt-2 text-sm font-medium text-gray-500">
                    현재 선택된 상위 프로젝트에 속한 작업 폴더만
                    표시합니다.
                  </p>
                </div>

                <div className="relative w-full xl:max-w-md">
                  <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />

                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="프로젝트명, 설명, 언어, Git URL 검색"
                    className="h-12 w-full rounded-2xl border border-gray-200 bg-white pl-11 pr-4 text-sm font-medium outline-none transition placeholder:text-gray-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="mr-1 hidden items-center gap-1.5 text-sm font-black text-gray-400 sm:flex">
                    <Filter size={16} />
                    필터
                  </div>

                  {[
                    { value: "all", label: "전체" },
                    { value: "todo", label: "시작 전" },
                    { value: "progress", label: "진행 중" },
                    { value: "done", label: "완료" },
                    { value: "hold", label: "보류" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() =>
                        setStatusFilter(item.value as "all" | SubProjectStatus)
                      }
                      className={cn(
                        "h-10 rounded-2xl px-4 text-sm font-black transition",
                        statusFilter === item.value
                          ? "bg-[#2563EB] text-white shadow-sm"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <select
                  value={sortType}
                  onChange={(event) =>
                    setSortType(event.target.value as SortType)
                  }
                  className="h-10 rounded-2xl border border-gray-200 bg-white px-4 text-sm font-black text-gray-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                >
                  <option value="recent">최근 수정순</option>
                  <option value="name">이름순</option>
                  <option value="progress">진행률 높은순</option>
                </select>
              </div>

              <div className="mt-5">
                {loading ? (
                  <div className="rounded-2xl border border-gray-200 bg-white px-5 py-12 text-center shadow-sm">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 text-gray-400">
                      <Clock3 size={22} />
                    </div>

                    <p className="mt-4 text-sm font-black text-gray-800">
                      작업 폴더를 불러오는 중입니다.
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      데이터를 조회하고 있습니다.
                    </p>
                  </div>
                ) : null}

                {!loading && error ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-5 text-sm font-semibold text-red-600 shadow-sm">
                    {error}
                  </div>
                ) : null}

                {!loading && !error && filteredProjects.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-12 text-center shadow-sm">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                      <Code2 size={22} />
                    </div>

                    <p className="mt-4 text-sm font-black text-gray-800">
                      표시할 작업 폴더가 없습니다.
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      검색어나 필터를 다시 확인하거나 새 작업 폴더를 추가해
                      주세요.
                    </p>

                    <button
                      type="button"
                      onClick={handleOpenCreateProjectModal}
                      className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-700"
                    >
                      <Plus size={17} />
                      작업 폴더 추가
                    </button>
                  </div>
                ) : null}

                {!loading && !error && filteredProjects.length > 0 ? (
                  <>
                    <div className="mb-4 flex items-center justify-between gap-3 px-1">
                      <div>
                        <p className="text-sm font-black text-gray-900">
                          작업 폴더 {filteredProjects.length}개
                        </p>

                        <p className="mt-0.5 text-xs font-medium text-gray-400">
                          현재 선택된 상위 프로젝트에 속한 항목만 표시합니다.
                        </p>
                      </div>

                      <div className="hidden items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-black text-gray-500 sm:flex">
                        <CheckCircle2 size={14} />
                        완료 {doneCount}개 · 진행 {progressCount}개
                      </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                      {filteredProjects.map((project) => (
                        <SubProjectCard
                          key={project.id}
                          project={project}
                          mode={currentMode}
                          open={openMenuId === project.id}
                          menuRef={menuRef}
                          onOpenMenu={() =>
                            setOpenMenuId((current) =>
                              current === project.id ? null : project.id,
                            )
                          }
                          onCloseMenu={() => setOpenMenuId(null)}
                          onDelete={() => handleDeleteSubProject(project.id)}
                        />
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      </main>

      <CreateProjectModal redirectToIdeAfterCreate ideMode={currentMode} />
    </>
  );
}