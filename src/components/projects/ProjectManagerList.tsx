"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDispatch } from "react-redux";

import {
  AlertTriangle,
  ArrowUpRight,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Code2,
  ExternalLink,
  FileText,
  Filter,
  FolderKanban,
  FolderOpen,
  Info,
  MoreVertical,
  Plus,
  Search,
  Trash2,
  UsersRound,
  X,
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

import ProjectSidebar, {
  type WorkspaceSidebarItem,
} from "@/components/layout/ProjectSidebar";

/* =========================================================
   TYPE
========================================================= */

type SubProjectStatus =
  | "todo"
  | "progress"
  | "done"
  | "hold";

type SortType =
  | "recent"
  | "name"
  | "progress";

type ProjectListResponse =
  ProjectSummaryResponse & {
    description?: string | null;
    gitUrl?: string | null;

    workspaceId: string;
    workspaceName: string;

    status?:
      | SubProjectStatus
      | string
      | null;

    progress?: number | null;

    scheduleCount?: number | null;
    doneScheduleCount?: number | null;

    devlogCount?: number | null;
    memberCount?: number | null;
  };

type SubProject =
  ProjectListResponse & {
    id: string;
  };

type Props = {
  workspaceId?: string;
  mode?: WorkspaceMode;
};

/* =========================================================
   UTIL
========================================================= */

function cn(
  ...classes: Array<
    string | false | null | undefined
  >
) {
  return classes
    .filter(Boolean)
    .join(" ");
}

function useOnClickOutside<
  T extends HTMLElement,
>(
  ref: React.RefObject<T | null>,
  handler: () => void,
) {
  useEffect(() => {
    const listener = (
      event: MouseEvent,
    ) => {
      const target =
        event.target as Node | null;

      if (
        !ref.current ||
        !target
      ) {
        return;
      }

      if (
        ref.current.contains(
          target,
        )
      ) {
        return;
      }

      handler();
    };

    document.addEventListener(
      "mousedown",
      listener,
    );

    return () =>
      document.removeEventListener(
        "mousedown",
        listener,
      );
  }, [ref, handler]);
}

function normalizeStatus(
  value?: string | null,
): SubProjectStatus {
  if (value === "done") {
    return "done";
  }

  if (value === "hold") {
    return "hold";
  }

  if (value === "progress") {
    return "progress";
  }

  return "todo";
}

function normalizeWorkspaceRole(
  role?: string | null,
) {
  return role
    ?.trim()
    .toLowerCase() === "owner"
    ? "owner"
    : "member";
}

function getStatusLabel(
  status: SubProjectStatus,
) {
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

function getStatusClassName(
  status: SubProjectStatus,
) {
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

function getProgressBarClassName(
  status: SubProjectStatus,
) {
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

function getProgress(
  project: SubProject,
) {
  if (
    typeof project.progress ===
    "number"
  ) {
    return Math.max(
      0,
      Math.min(
        100,
        Math.round(
          project.progress,
        ),
      ),
    );
  }

  const total =
    project.scheduleCount ?? 0;

  const done =
    project.doneScheduleCount ?? 0;

  if (total > 0) {
    return Math.round(
      (done / total) * 100,
    );
  }

  return 0;
}

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "-";
  }

  if (
    /^\d{4}\.\d{2}\.\d{2}/.test(
      value,
    )
  ) {
    return value;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(2, "0");

  const day =
    String(
      date.getDate(),
    ).padStart(2, "0");

  return `${year}.${month}.${day}`;
}

function getWorkspaceTitle(
  workspace?: WorkspaceListResponse | null,
) {
  return (
    workspace?.name?.trim() ||
    "이름 없는 프로젝트"
  );
}

function getWorkspaceSubProjectCount(
  workspace?: WorkspaceListResponse | null,
) {
  return Array.isArray(
    workspace?.projects,
  )
    ? workspace.projects.length
    : 0;
}

function mapProjectResponse(
  project: ProjectListResponse,
): SubProject {
  return {
    ...project,

    id: String(
      project.id,
    ),

    description:
      project.description ?? null,

    gitUrl:
      project.gitUrl ?? null,

    status:
      project.status ?? "todo",

    progress:
      project.progress ?? 0,

    scheduleCount:
      project.scheduleCount ?? 0,

    doneScheduleCount:
      project.doneScheduleCount ?? 0,

    devlogCount:
      project.devlogCount ?? 0,

    memberCount:
      project.memberCount ?? 1,
  };
}

/* =========================================================
   API
========================================================= */

async function fetchSubProjectsByWorkspaceApi(
  workspaceId: string,
): Promise<SubProject[]> {
  const data =
    (await apiJson(
      `/api/projects/workspace/${encodeURIComponent(
        workspaceId,
      )}`,
      {
        cache: "no-store",
      },
    )) as ProjectListResponse[];

  return Array.isArray(data)
    ? data.map(
        mapProjectResponse,
      )
    : [];
}

/* =========================================================
   STATUS PILL
========================================================= */

function StatusPill({
  status,
}: {
  status: SubProjectStatus;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[9px] font-black",
        getStatusClassName(
          status,
        ),
      )}
    >
      {getStatusLabel(
        status,
      )}
    </span>
  );
}

/* =========================================================
   SUB PROJECT CARD
========================================================= */

function SubProjectCard({
  project,
  mode,
  open,
  canDelete,
  onOpenMenu,
  onCloseMenu,
  onOpenInfo,
  onDelete,
  menuRef,
}: {
  project: SubProject;

  mode: WorkspaceMode;

  open: boolean;

  canDelete: boolean;

  onOpenMenu: () => void;

  onCloseMenu: () => void;

  onOpenInfo: () => void;

  onDelete: () => void;

  menuRef: React.RefObject<HTMLDivElement | null>;
}) {
  const status =
    normalizeStatus(
      project.status,
    );

  const progress =
    getProgress(project);

  const scheduleCount =
    project.scheduleCount ?? 0;

  const doneScheduleCount =
    project.doneScheduleCount ?? 0;

  const devlogCount =
    project.devlogCount ?? 0;

  const memberCount =
    project.memberCount ?? 1;

  const openHref =
    getAivsHref(
      project.workspaceId,
      mode,
    );

  const scheduleHref =
    getScheduleHref(
      project.workspaceId,
      mode,
    );

  const devlogHref =
    getDevlogHref(
      project.workspaceId,
    );

  return (
    <section className="group relative flex min-h-[176px] flex-col rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-[#BFCBFF] hover:shadow-[0_6px_18px_rgba(15,23,42,0.07)]">
      {/* =================================================
          TOP
      ================================================= */}

      <div className="flex min-w-0 items-start gap-2.5">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#EEF3FF] text-[#5873F9]">
          <FolderKanban
            size={17}
            strokeWidth={2.2}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="min-w-0 flex-1 truncate text-[13px] font-black text-slate-900">
              {project.name}
            </h3>

            <StatusPill
              status={status}
            />
          </div>

          <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-400">
            {project.description?.trim()
              ? project.description
              : `${
                  project.language ||
                  "General"
                } 기반 작업 폴더입니다.`}
          </p>
        </div>

        {/* ===============================================
            MORE MENU
        =============================================== */}

        <div
          className="relative -mr-1 -mt-1 shrink-0"
          ref={
            open
              ? menuRef
              : null
          }
        >
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="작업 폴더 메뉴"
            onClick={
              onOpenMenu
            }
          >
            <MoreVertical
              size={15}
            />
          </button>

          {open ? (
            <div className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
              {/* 작업 폴더 열기 */}

              <Link
                href={
                  openHref
                }
                className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                onClick={
                  onCloseMenu
                }
              >
                <FolderOpen
                  size={14}
                  className="text-slate-400"
                />

                작업 폴더 열기
              </Link>

              {/* 일정관리 */}

              <Link
                href={
                  scheduleHref
                }
                className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                onClick={
                  onCloseMenu
                }
              >
                <CalendarCheck
                  size={14}
                  className="text-slate-400"
                />

                일정관리
              </Link>

              {/* 개발일지 */}

              <Link
                href={
                  devlogHref
                }
                className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                onClick={
                  onCloseMenu
                }
              >
                <FileText
                  size={14}
                  className="text-slate-400"
                />

                개발일지
              </Link>

              {/* 프로젝트 정보 */}

              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-slate-600 hover:bg-slate-50"
                onClick={() => {
                  onCloseMenu();
                  onOpenInfo();
                }}
              >
                <Info
                  size={14}
                  className="text-slate-400"
                />

                프로젝트 정보
              </button>

              {/* OWNER만 삭제 */}

              {canDelete ? (
                <>
                  <div className="my-1 h-px bg-slate-100" />

                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50"
                    onClick={() => {
                      onCloseMenu();
                      onDelete();
                    }}
                  >
                    <Trash2
                      size={14}
                    />

                    삭제
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* =================================================
          PROGRESS
      ================================================= */}

      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400">
            진행률
          </span>

          <span className="text-[10px] font-black text-slate-700">
            {progress}%
          </span>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              getProgressBarClassName(
                status,
              ),
            )}
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      </div>

      {/* =================================================
          META
      ================================================= */}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] font-bold text-slate-500">
        {/* 일정 */}

        <span className="inline-flex items-center gap-1.5">
          <CalendarCheck
            size={12}
            className="text-slate-400"
          />

          일정

          <strong className="font-black text-slate-700">
            {
              doneScheduleCount
            }
            /
            {
              scheduleCount
            }
          </strong>
        </span>

        <span className="h-3 w-px bg-slate-200" />

        {/* 개발일지 */}

        <span className="inline-flex items-center gap-1.5">
          <FileText
            size={12}
            className="text-slate-400"
          />

          일지

          <strong className="font-black text-slate-700">
            {devlogCount}
          </strong>
        </span>

        <span className="h-3 w-px bg-slate-200" />

        {/* 인원 */}

        <span className="inline-flex items-center gap-1.5">
          <UsersRound
            size={12}
            className="text-slate-400"
          />

          인원

          <strong className="font-black text-slate-700">
            {memberCount}
          </strong>
        </span>
      </div>

      {/* =================================================
          FOOTER
      ================================================= */}

      <div className="mt-auto flex min-w-0 items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <div className="min-w-0 flex-1">
          {project.gitUrl ? (
            <a
              href={
                project.gitUrl
              }
              target="_blank"
              rel="noreferrer"
              className="flex min-w-0 items-center gap-1 text-[9px] font-semibold text-slate-400 transition hover:text-[#5873F9]"
            >
              <span className="truncate">
                {
                  project.gitUrl
                }
              </span>

              <ExternalLink
                size={10}
                className="shrink-0"
              />
            </a>
          ) : (
            <p className="truncate text-[9px] font-semibold text-slate-400">
              {project.language ||
                "General"}{" "}
              · 최근 수정{" "}
              {formatDate(
                project.updatedAt,
              )}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {project.gitUrl ? (
            <span className="hidden text-[9px] font-semibold text-slate-300 2xl:inline">
              {formatDate(
                project.updatedAt,
              )}
            </span>
          ) : null}

          <Link
            href={openHref}
            className="inline-flex h-7 items-center gap-1 rounded-lg bg-[#5873F9] px-2.5 text-[10px] font-black text-white transition hover:bg-[#4863E8]"
          >
            열기

            <ArrowUpRight
              size={11}
            />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   PROJECT MANAGER LIST
========================================================= */

export function ProjectManagerList({
  workspaceId: workspaceIdProp,
  mode = "personal",
}: Props) {
  const dispatch =
    useDispatch();

  const router =
    useRouter();

  const pathname =
    usePathname();

  const searchParams =
    useSearchParams();

  /* =======================================================
     URL / LOCAL STORAGE
  ======================================================= */

  const workspaceIdFromUrl =
    searchParams.get(
      "workspaceId",
    ) ??
    searchParams.get("id") ??
    searchParams.get(
      "workspace",
    );

  const modeFromUrl =
    searchParams.get("mode");

  const [
    rememberedWorkspaceId,
    setRememberedWorkspaceId,
  ] =
    useState<
      string | null
    >(null);

  const [
    rememberedMode,
    setRememberedMode,
  ] =
    useState<WorkspaceMode>(
      "personal",
    );

 const currentWorkspaceId =
  workspaceIdFromUrl ?? workspaceIdProp ?? rememberedWorkspaceId;

  const currentMode: WorkspaceMode =
    modeFromUrl === "team" ||
    modeFromUrl === "personal"
      ? modeFromUrl
      : rememberedMode || mode;

  /* =======================================================
     WORKSPACE
  ======================================================= */

  const [
    allWorkspaces,
    setAllWorkspaces,
  ] = useState<
    WorkspaceListResponse[]
  >([]);

  const [
    sidebarLoading,
    setSidebarLoading,
  ] = useState(true);

  const [
    sidebarError,
    setSidebarError,
  ] = useState("");

  /* =======================================================
     PROJECT
  ======================================================= */

  const [
    projects,
    setProjects,
  ] = useState<
    SubProject[]
  >([]);

  const [
    workspaceName,
    setWorkspaceName,
  ] = useState("AIVS");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  /* =======================================================
     FILTER
  ======================================================= */

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<
    | "all"
    | SubProjectStatus
  >("all");

  const [
    sortType,
    setSortType,
  ] =
    useState<SortType>(
      "recent",
    );

  const [
    query,
    setQuery,
  ] = useState("");

  /* =======================================================
     MENU / MODAL
  ======================================================= */

  const [
    openMenuId,
    setOpenMenuId,
  ] =
    useState<
      string | null
    >(null);

  const [
    infoProject,
    setInfoProject,
  ] =
    useState<
      SubProject | null
    >(null);

  const [
    deleteTarget,
    setDeleteTarget,
  ] =
    useState<
      SubProject | null
    >(null);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  const [
    actionMessage,
    setActionMessage,
  ] = useState<{
    type:
      | "success"
      | "error";

    text: string;
  } | null>(null);

  const menuRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  useOnClickOutside(
    menuRef,
    () =>
      setOpenMenuId(
        null,
      ),
  );

  /* =======================================================
     SELECTED WORKSPACE
  ======================================================= */

  const selectedWorkspace =
    useMemo(() => {
      if (
        !currentWorkspaceId
      ) {
        return null;
      }

      return (
        allWorkspaces.find(
          (workspace) =>
            String(
              workspace.id,
            ) ===
            String(
              currentWorkspaceId,
            ),
        ) ?? null
      );
    }, [
      allWorkspaces,
      currentWorkspaceId,
    ]);

  /* =======================================================
     OWNER CHECK
  ======================================================= */

  const isWorkspaceOwner =
    normalizeWorkspaceRole(
      selectedWorkspace?.role,
    ) === "owner";

  /* =======================================================
     SIDEBAR DATA
  ======================================================= */

  const sidebarWorkspaces =
    useMemo<
      WorkspaceSidebarItem[]
    >(
      () =>
        allWorkspaces.map(
          (
            workspace,
          ) => ({
            id: String(
              workspace.id,
            ),

            name:
              getWorkspaceTitle(
                workspace,
              ),

            mode:
              workspace.mode,

            role:
              (
                workspace as WorkspaceListResponse & {
                  role?: string;
                }
              ).role,

            childCount:
              getWorkspaceSubProjectCount(
                workspace,
              ),
          }),
        ),
      [allWorkspaces],
    );

  /* =======================================================
     WORKSPACE SELECT
  ======================================================= */

 function handleSelectWorkspace(workspace: WorkspaceSidebarItem) {
  setRememberedWorkspaceId(workspace.id);
  setRememberedMode(workspace.mode);

  if (typeof window !== "undefined") {
    localStorage.setItem("currentWorkspaceId", workspace.id);
    localStorage.setItem("currentWorkspaceMode", workspace.mode);
  }

  const params = new URLSearchParams(searchParams.toString());

  params.set("workspaceId", workspace.id);
  params.set("mode", workspace.mode);

  params.delete("id");
  params.delete("workspace");

  router.push(`${pathname}?${params.toString()}`);
}

  /* =======================================================
     LOCAL STORAGE LOAD
  ======================================================= */

  useEffect(() => {
    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }

    const storedWorkspaceId =
      localStorage.getItem(
        "currentWorkspaceId",
      );

    const storedMode =
      localStorage.getItem(
        "currentWorkspaceMode",
      );

    if (
      storedWorkspaceId
    ) {
      setRememberedWorkspaceId(
        storedWorkspaceId,
      );
    }

    if (
      storedMode ===
        "team" ||
      storedMode ===
        "personal"
    ) {
      setRememberedMode(
        storedMode,
      );
    }
  }, []);

  /* =======================================================
     LOCAL STORAGE SYNC
  ======================================================= */

  useEffect(() => {
    if (
      !currentWorkspaceId
    ) {
      return;
    }

    localStorage.setItem(
      "currentWorkspaceId",
      currentWorkspaceId,
    );

    localStorage.setItem(
      "currentWorkspaceMode",
      currentMode,
    );
  }, [
    currentWorkspaceId,
    currentMode,
  ]);

  /* =======================================================
     LOAD WORKSPACES
  ======================================================= */

  async function loadWorkspaceList() {
    try {
      setSidebarLoading(
        true,
      );

      setSidebarError("");

      const workspaceData =
        await getMyWorkspacesByTokenApi();

      const list:
        WorkspaceListResponse[] =
        Array.isArray(
          workspaceData,
        )
          ? workspaceData
          : [];

      setAllWorkspaces(
        list,
      );

      if (
        !currentWorkspaceId &&
        list[0]?.id
      ) {
        setRememberedWorkspaceId(
          String(
            list[0].id,
          ),
        );

        setRememberedMode(
          list[0].mode,
        );

        localStorage.setItem(
          "currentWorkspaceId",
          String(
            list[0].id,
          ),
        );

        localStorage.setItem(
          "currentWorkspaceMode",
          list[0].mode,
        );
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
      setSidebarLoading(
        false,
      );
    }
  }

  /* =======================================================
     LOAD PROJECTS
  ======================================================= */

  async function loadProjects(
    workspaceId: string,
  ) {
    try {
      setLoading(true);

      setError("");

      const data =
        await fetchSubProjectsByWorkspaceApi(
          workspaceId,
        );

      setProjects(data);

      const nameFromResponse =
        data[0]?.workspaceName;

      const nameFromWorkspace =
        selectedWorkspace?.name;

      setWorkspaceName(
        nameFromResponse ||
          nameFromWorkspace ||
          "AIVS",
      );
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

  /* =======================================================
     INITIAL WORKSPACE LOAD
  ======================================================= */

  useEffect(() => {
    loadWorkspaceList();
  }, []);

  /* =======================================================
     PROJECT LOAD
  ======================================================= */

  useEffect(() => {
    if (
      !currentWorkspaceId
    ) {
      setLoading(false);

      setProjects([]);

      setError(
        "선택된 상위 프로젝트 ID가 없습니다.",
      );

      return;
    }

    loadProjects(
      currentWorkspaceId,
    );
  }, [
    currentWorkspaceId,
    selectedWorkspace?.name,
  ]);

  /* =======================================================
     WORKSPACE NAME SYNC
  ======================================================= */

  useEffect(() => {
    if (
      selectedWorkspace?.name
    ) {
      setWorkspaceName(
        selectedWorkspace.name,
      );
    }
  }, [
    selectedWorkspace?.name,
  ]);

  /* =======================================================
     FILTERED PROJECTS
  ======================================================= */

  const filteredProjects =
    useMemo(() => {
      const keyword =
        query
          .trim()
          .toLowerCase();

      const result =
        projects
          .filter(
            (project) => {
              const status =
                normalizeStatus(
                  project.status,
                );

              if (
                statusFilter ===
                "all"
              ) {
                return true;
              }

              return (
                status ===
                statusFilter
              );
            },
          )
          .filter(
            (project) => {
              if (!keyword) {
                return true;
              }

              return (
                project.name
                  .toLowerCase()
                  .includes(
                    keyword,
                  ) ||
                project.language
                  .toLowerCase()
                  .includes(
                    keyword,
                  ) ||
                (
                  project.description ??
                  ""
                )
                  .toLowerCase()
                  .includes(
                    keyword,
                  ) ||
                (
                  project.gitUrl ??
                  ""
                )
                  .toLowerCase()
                  .includes(
                    keyword,
                  )
              );
            },
          );

      result.sort(
        (a, b) => {
          if (
            sortType ===
            "name"
          ) {
            return a.name.localeCompare(
              b.name,
            );
          }

          if (
            sortType ===
            "progress"
          ) {
            return (
              getProgress(b) -
              getProgress(a)
            );
          }

          return (
            a.updatedAt <
            b.updatedAt
              ? 1
              : -1
          );
        },
      );

      return result;
    }, [
      projects,
      query,
      statusFilter,
      sortType,
    ]);

  /* =======================================================
     STATISTICS
  ======================================================= */

  const allSubProjectCount =
    projects.length;

  const progressCount =
    projects.filter(
      (project) =>
        normalizeStatus(
          project.status,
        ) === "progress",
    ).length;

  const doneCount =
    projects.filter(
      (project) =>
        normalizeStatus(
          project.status,
        ) === "done",
    ).length;

  const totalDevlogCount =
    projects.reduce(
      (
        sum,
        project,
      ) =>
        sum +
        (project.devlogCount ??
          0),
      0,
    );

  const averageProgress =
    projects.length > 0
      ? Math.round(
          projects.reduce(
            (
              sum,
              project,
            ) =>
              sum +
              getProgress(
                project,
              ),
            0,
          ) /
            projects.length,
        )
      : 0;

  /* =======================================================
     DELETE MODAL OPEN
  ======================================================= */

  function openDeleteModal(
    project: SubProject,
  ) {
    /*
     * 프론트에서도 OWNER 권한 확인
     *
     * 백엔드 역시 OWNER 검증을 수행하므로
     * 이 부분은 UI 제어용입니다.
     */
    if (
      !isWorkspaceOwner
    ) {
      setActionMessage({
        type: "error",
        text: "프로젝트 OWNER만 작업 폴더를 삭제할 수 있습니다.",
      });

      return;
    }

    setOpenMenuId(null);

    setDeleteTarget(
      project,
    );
  }

  /* =======================================================
     DELETE PROJECT
  ======================================================= */

  async function handleDeleteSubProject() {
    if (
      !deleteTarget
    ) {
      return;
    }

    if (
      !isWorkspaceOwner
    ) {
      setDeleteTarget(
        null,
      );

      setActionMessage({
        type: "error",
        text: "프로젝트 OWNER만 작업 폴더를 삭제할 수 있습니다.",
      });

      return;
    }

    try {
      setDeleting(true);

      setActionMessage(
        null,
      );

      const response =
        await apiFetch(
          `/api/projects/${encodeURIComponent(
            deleteTarget.id,
          )}`,
          {
            method:
              "DELETE",

            cache:
              "no-store",
          },
        );

      if (!response.ok) {
        let errorMessage =
          "작업 폴더 삭제에 실패했습니다.";

        try {
          const data =
            await response
              .clone()
              .json();

          if (
            data?.message
          ) {
            errorMessage =
              data.message;
          } else if (
            data?.error
          ) {
            errorMessage =
              data.error;
          }
        } catch {
          try {
            const text =
              await response.text();

            if (
              text.trim()
            ) {
              errorMessage =
                text;
            }
          } catch {
            // ignore
          }
        }

        throw new Error(
          errorMessage,
        );
      }

      const deletedId =
        deleteTarget.id;

      /*
       * 삭제 성공 후 화면에서 즉시 제거
       */
      setProjects(
        (prev) =>
          prev.filter(
            (project) =>
              project.id !==
              deletedId,
          ),
      );

      setDeleteTarget(
        null,
      );

      setOpenMenuId(
        null,
      );

      setActionMessage({
        type: "success",
        text: "작업 폴더가 삭제되었습니다.",
      });

      /*
       * 사이드바의 작업 폴더 개수도 갱신하기 위해
       * Workspace 목록을 다시 조회합니다.
       */
      await loadWorkspaceList();
    } catch (err) {
      console.error(
        "[AIVS project delete]",
        err,
      );

      setActionMessage({
        type: "error",

        text:
          err instanceof Error
            ? err.message
            : "작업 폴더 삭제 중 오류가 발생했습니다.",
      });
    } finally {
      setDeleting(false);
    }
  }

  /* =======================================================
     CREATE PROJECT
  ======================================================= */

  function handleOpenCreateProjectModal() {
    if (
      !currentWorkspaceId
    ) {
      alert(
        "선택된 상위 프로젝트 ID가 없습니다.",
      );

      return;
    }

    localStorage.setItem(
      "currentWorkspaceId",
      currentWorkspaceId,
    );

    localStorage.setItem(
      "currentWorkspaceMode",
      currentMode,
    );

    dispatch(
      setWorkspaceId(
        currentWorkspaceId,
      ),
    );

    dispatch(
      openProjectModal(),
    );
  }

  /* =======================================================
     ESC
  ======================================================= */

  useEffect(() => {
    const onKey = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key !==
        "Escape"
      ) {
        return;
      }

      setOpenMenuId(
        null,
      );

      setInfoProject(
        null,
      );

      if (!deleting) {
        setDeleteTarget(
          null,
        );
      }
    };

    window.addEventListener(
      "keydown",
      onKey,
    );

    return () =>
      window.removeEventListener(
        "keydown",
        onKey,
      );
  }, [deleting]);

  /* =======================================================
     ACTION MESSAGE TIMER
  ======================================================= */

  useEffect(() => {
    if (
      !actionMessage
    ) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          setActionMessage(
            null,
          );
        },
        3000,
      );

    return () =>
      window.clearTimeout(
        timer,
      );
  }, [actionMessage]);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <main className="waivs-page flex min-h-0 flex-1 p-4 font-sans md:p-5">
        <div className="mx-auto flex min-h-0 w-full max-w-[1680px] flex-1 gap-5">
          {/* =================================================
              SIDEBAR
          ================================================= */}

          <ProjectSidebar
            workspaces={
              sidebarWorkspaces
            }
            selectedWorkspaceId={
              currentWorkspaceId ??
              ""
            }
            loading={
              sidebarLoading
            }
            errorMessage={
              sidebarError
            }
            onSelectWorkspace={
              handleSelectWorkspace
            }
          />

          {/* =================================================
              CONTENT
          ================================================= */}

          <div className="flex min-w-0 flex-1">
            <section className="waivs-panel flex min-h-0 flex-1 flex-col overflow-hidden">
              {/* =================================================
                  AIVS HEADER
              ================================================= */}

              <div className="shrink-0 px-5 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#5873F9]">
                      AIVS
                    </p>

                    <h1 className="mt-1 truncate text-xl font-black tracking-tight text-slate-950">
                      {
                        workspaceName
                      }
                    </h1>

                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
                      선택된 프로젝트 안의 작업 폴더를 AIVS 작업 단위로 관리합니다.
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {currentWorkspaceId ? (
                      <Link
                        href={getIdeHref(
                          String(
                            currentWorkspaceId,
                          ),
                          currentMode,
                        )}
                        onClick={() => {
                          if (
                            typeof window ===
                            "undefined"
                          ) {
                            return;
                          }

                          localStorage.setItem(
                            "currentWorkspaceId",
                            String(
                              currentWorkspaceId,
                            ),
                          );

                          localStorage.setItem(
                            "currentWorkspaceMode",
                            currentMode,
                          );
                        }}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#D9E1FF] bg-white px-4 text-xs font-black text-[#5873F9] transition hover:bg-[#F7F9FF]"
                      >
                        작업하러가기

                        <ArrowUpRight
                          size={17}
                        />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="inline-flex h-9 cursor-not-allowed items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-black text-slate-400"
                      >
                        작업하러가기

                        <ArrowUpRight
                          size={17}
                        />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={
                        handleOpenCreateProjectModal
                      }
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#5873F9] px-4 text-xs font-black text-white transition hover:bg-[#4863E8]"
                    >
                      <Plus
                        size={14}
                      />

                      작업 폴더 추가
                    </button>
                  </div>
                </div>

                {/* =============================================
                    STATISTICS
                ============================================= */}

                <div className="mt-4 border-t border-slate-100 pt-3">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-bold text-slate-400">
                    <span>
                      전체{" "}

                      <strong className="font-black text-slate-800">
                        {
                          allSubProjectCount
                        }
                        개
                      </strong>
                    </span>

                    <span className="text-gray-300">
                      ·
                    </span>

                    <span>
                      진행 중{" "}

                      <strong className="font-black text-slate-800">
                        {
                          progressCount
                        }
                        개
                      </strong>
                    </span>

                    <span className="text-gray-300">
                      ·
                    </span>

                    <span>
                      완료{" "}

                      <strong className="font-black text-slate-800">
                        {
                          doneCount
                        }
                        개
                      </strong>
                    </span>

                    <span className="text-gray-300">
                      ·
                    </span>

                    <span>
                      평균 진행률{" "}

                      <strong className="font-black text-slate-800">
                        {
                          averageProgress
                        }
                        %
                      </strong>
                    </span>

                    <span className="text-gray-300">
                      ·
                    </span>

                    <span>
                      개발일지{" "}

                      <strong className="font-black text-slate-800">
                        {
                          totalDevlogCount
                        }
                        개
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* =================================================
                  WORKSPACE TOOLS
              ================================================= */}

              <div className="shrink-0 border-t border-slate-100 px-5 py-3">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h2 className="text-base font-black tracking-tight text-slate-900">
                      작업 폴더 목록
                    </h2>

                    <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                      현재 선택된 상위 프로젝트에 속한 작업 폴더만 표시합니다.
                    </p>
                  </div>

                  {/* SEARCH */}

                  <div className="relative w-full xl:max-w-md">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={14}
                    />

                    <input
                      value={
                        query
                      }
                      onChange={(
                        event,
                      ) =>
                        setQuery(
                          event
                            .target
                            .value,
                        )
                      }
                      placeholder="프로젝트명, 설명, 언어, Git URL 검색"
                      className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-semibold outline-none transition placeholder:text-slate-400 focus:border-[#AAB8FF] focus:ring-2 focus:ring-[#5873F9]/10"
                    />
                  </div>
                </div>

                {/* =============================================
                    FILTER
                ============================================= */}

                <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="mr-1 hidden items-center gap-1.5 text-[11px] font-black text-slate-400 sm:flex">
                      <Filter
                        size={16}
                      />

                      필터
                    </div>

                    {[
                      {
                        value:
                          "all",
                        label:
                          "전체",
                      },
                      {
                        value:
                          "todo",
                        label:
                          "시작 전",
                      },
                      {
                        value:
                          "progress",
                        label:
                          "진행 중",
                      },
                      {
                        value:
                          "done",
                        label:
                          "완료",
                      },
                      {
                        value:
                          "hold",
                        label:
                          "보류",
                      },
                    ].map(
                      (
                        item,
                      ) => (
                        <button
                          key={
                            item.value
                          }
                          type="button"
                          onClick={() =>
                            setStatusFilter(
                              item.value as
                                | "all"
                                | SubProjectStatus,
                            )
                          }
                          className={cn(
                            "h-9 rounded-xl px-3 text-[11px] font-black transition",
                            statusFilter ===
                              item.value
                              ? "bg-[#2563EB] text-white shadow-sm"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                          )}
                        >
                          {
                            item.label
                          }
                        </button>
                      ),
                    )}
                  </div>

                  {/* SORT */}

                  <select
                    value={
                      sortType
                    }
                    onChange={(
                      event,
                    ) =>
                      setSortType(
                        event
                          .target
                          .value as SortType,
                      )
                    }
                    className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 outline-none transition focus:border-[#AAB8FF] focus:ring-2 focus:ring-[#5873F9]/10"
                  >
                    <option value="recent">
                      최근 수정순
                    </option>

                    <option value="name">
                      이름순
                    </option>

                    <option value="progress">
                      진행률 높은순
                    </option>
                  </select>
                </div>
              </div>

              {/* =================================================
                  WORKSPACE LIST
              ================================================= */}

              <div className="min-h-[260px] flex-1 border-t border-slate-100 px-5 pb-5 pt-4">
                {/* LOADING */}

                {loading ? (
                  <div className="rounded-xl border border-slate-200 bg-white px-5 py-9 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 text-gray-400">
                      <Clock3
                        size={22}
                      />
                    </div>

                    <p className="mt-4 text-sm font-black text-gray-800">
                      작업 폴더를 불러오는 중입니다.
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      데이터를 조회하고 있습니다.
                    </p>
                  </div>
                ) : null}

                {/* ERROR */}

                {!loading &&
                error ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-5 text-sm font-semibold text-red-600 shadow-sm">
                    {error}
                  </div>
                ) : null}

                {/* EMPTY */}

                {!loading &&
                !error &&
                filteredProjects.length ===
                  0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white px-5 py-9 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                      <Code2
                        size={22}
                      />
                    </div>

                    <p className="mt-4 text-sm font-black text-gray-800">
                      표시할 작업 폴더가 없습니다.
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      검색어나 필터를 다시 확인하거나 새 작업 폴더를 추가해 주세요.
                    </p>

                    <button
                      type="button"
                      onClick={
                        handleOpenCreateProjectModal
                      }
                      className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-700"
                    >
                      <Plus
                        size={17}
                      />

                      작업 폴더 추가
                    </button>
                  </div>
                ) : null}

                {/* PROJECT LIST */}

                {!loading &&
                !error &&
                filteredProjects.length >
                  0 ? (
                  <>
                    <div className="mb-3 flex items-center justify-between gap-3 px-1">
                      <div>
                        <p className="text-sm font-black text-gray-900">
                          작업 폴더{" "}
                          {
                            filteredProjects.length
                          }
                          개
                        </p>

                        <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                          현재 선택된 상위 프로젝트에 속한 항목만 표시합니다.
                        </p>
                      </div>

                      <div className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500 sm:flex">
                        <CheckCircle2
                          size={14}
                        />

                        완료{" "}
                        {
                          doneCount
                        }
                        개 · 진행{" "}
                        {
                          progressCount
                        }
                        개
                      </div>
                    </div>

                    <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
                      {filteredProjects.map(
                        (
                          project,
                        ) => (
                          <SubProjectCard
                            key={
                              project.id
                            }
                            project={
                              project
                            }
                            mode={
                              currentMode
                            }
                            open={
                              openMenuId ===
                              project.id
                            }
                            canDelete={
                              isWorkspaceOwner
                            }
                            menuRef={
                              menuRef
                            }
                            onOpenMenu={() =>
                              setOpenMenuId(
                                (
                                  current,
                                ) =>
                                  current ===
                                  project.id
                                    ? null
                                    : project.id,
                              )
                            }
                            onCloseMenu={() =>
                              setOpenMenuId(
                                null,
                              )
                            }
                            onOpenInfo={() =>
                              setInfoProject(
                                project,
                              )
                            }
                            onDelete={() =>
                              openDeleteModal(
                                project,
                              )
                            }
                          />
                        ),
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* =================================================
          PROJECT INFO MODAL
      ================================================= */}

      {infoProject ? (
        <ProjectInfoModal
          project={
            infoProject
          }
          onClose={() =>
            setInfoProject(
              null,
            )
          }
        />
      ) : null}

      {/* =================================================
          DELETE MODAL
      ================================================= */}

      {deleteTarget ? (
        <DeleteProjectModal
          project={
            deleteTarget
          }
          deleting={
            deleting
          }
          onClose={() => {
            if (
              !deleting
            ) {
              setDeleteTarget(
                null,
              );
            }
          }}
          onConfirm={
            handleDeleteSubProject
          }
        />
      ) : null}

      {/* =================================================
          TOAST
      ================================================= */}

      {actionMessage ? (
        <div className="fixed right-5 top-[88px] z-[160] w-[340px] max-w-[calc(100vw-40px)]">
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-xl",

              actionMessage.type ===
                "success"
                ? "border-emerald-200"
                : "border-rose-200",
            )}
          >
            <div
              className={cn(
                "h-2.5 w-2.5 shrink-0 rounded-full",

                actionMessage.type ===
                  "success"
                  ? "bg-emerald-500"
                  : "bg-rose-500",
              )}
            />

            <p className="min-w-0 flex-1 text-xs font-bold text-slate-700">
              {
                actionMessage.text
              }
            </p>

            <button
              type="button"
              onClick={() =>
                setActionMessage(
                  null,
                )
              }
              className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="알림 닫기"
            >
              <X
                size={14}
              />
            </button>
          </div>
        </div>
      ) : null}

      {/* =================================================
          CREATE PROJECT
      ================================================= */}

      <CreateProjectModal
        redirectToIdeAfterCreate
        ideMode={
          currentMode
        }
      />
    </>
  );
}

/* =========================================================
   PROJECT INFO MODAL
========================================================= */

function ProjectInfoModal({
  project,
  onClose,
}: {
  project: SubProject;

  onClose: () => void;
}) {
  const status =
    normalizeStatus(
      project.status,
    );

  const progress =
    getProgress(project);

  const scheduleCount =
    project.scheduleCount ?? 0;

  const doneScheduleCount =
    project.doneScheduleCount ?? 0;

  const devlogCount =
    project.devlogCount ?? 0;

  const memberCount =
    project.memberCount ?? 1;

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(
        event,
      ) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-[620px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* HEADER */}

        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#EEF3FF] text-[#5873F9]">
              <Info
                size={15}
              />
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-base font-black text-slate-900">
                프로젝트 정보
              </h2>

              <p className="mt-0.5 truncate text-xs font-semibold text-slate-400">
                {project.name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="프로젝트 정보 닫기"
          >
            <X
              size={16}
            />
          </button>
        </div>

        {/* CONTENT */}

        <div className="p-5">
          {/* SUMMARY */}

          <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-black text-slate-900">
                {project.name}
              </h3>

              <StatusPill
                status={
                  status
                }
              />
            </div>

            <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
              {project.description?.trim()
                ? project.description
                : "등록된 설명이 없습니다."}
            </p>
          </div>

          {/* INFO GRID */}

          <div className="mt-4 grid overflow-hidden rounded-xl border border-slate-200 sm:grid-cols-2">
            <ProjectInfoRow
              label="언어"
              value={
                project.language ||
                "General"
              }
            />

            <ProjectInfoRow
              label="진행 상태"
              value={getStatusLabel(
                status,
              )}
            />

            <ProjectInfoRow
              label="진행률"
              value={`${progress}%`}
            />

            <ProjectInfoRow
              label="최근 수정"
              value={formatDate(
                project.updatedAt,
              )}
            />

            <ProjectInfoRow
              label="일정"
              value={`${doneScheduleCount}/${scheduleCount} 완료`}
            />

            <ProjectInfoRow
              label="개발일지"
              value={`${devlogCount}개`}
            />

            <ProjectInfoRow
              label="참여 인원"
              value={`${memberCount}명`}
            />

            <ProjectInfoRow
              label="상위 프로젝트"
              value={
                project.workspaceName ||
                "-"
              }
            />
          </div>

          {/* GIT */}

          <div className="mt-4 rounded-xl border border-slate-200 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">
              Git Repository
            </p>

            {project.gitUrl ? (
              <a
                href={
                  project.gitUrl
                }
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex min-w-0 items-center gap-2 text-xs font-bold text-[#5873F9] hover:underline"
              >
                <span className="truncate">
                  {
                    project.gitUrl
                  }
                </span>

                <ExternalLink
                  size={13}
                  className="shrink-0"
                />
              </a>
            ) : (
              <p className="mt-2 text-xs font-semibold text-slate-400">
                연결된 Git 저장소가 없습니다.
              </p>
            )}
          </div>

          {/* BUTTON */}

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={
                onClose
              }
              className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 transition hover:bg-slate-50"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   PROJECT INFO ROW
========================================================= */

function ProjectInfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-[54px] items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5 sm:border-r">
      <span className="text-[11px] font-bold text-slate-400">
        {label}
      </span>

      <span className="truncate text-xs font-black text-slate-700">
        {value}
      </span>
    </div>
  );
}

/* =========================================================
   DELETE MODAL
========================================================= */

function DeleteProjectModal({
  project,
  deleting,
  onClose,
  onConfirm,
}: {
  project: SubProject;

  deleting: boolean;

  onClose: () => void;

  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(
        event,
      ) => {
        if (
          event.target ===
            event.currentTarget &&
          !deleting
        ) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-[480px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* HEADER */}

        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-black text-slate-900">
              작업 폴더 삭제
            </h2>

            <p className="mt-0.5 text-xs font-semibold text-slate-400">
              삭제한 작업 폴더는 복구할 수 없습니다.
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            disabled={
              deleting
            }
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="삭제 창 닫기"
          >
            <X
              size={16}
            />
          </button>
        </div>

        {/* CONTENT */}

        <div className="p-5">
          <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle
                size={17}
                className="mt-0.5 shrink-0 text-rose-500"
              />

              <div>
                <p className="text-xs font-black text-slate-800">
                  {project.name}
                </p>

                <p className="mt-1 text-[11px] font-medium leading-5 text-slate-500">
                  이 작업 폴더의 DB 정보와 실제 작업 폴더가 함께 삭제됩니다.
                  삭제된 작업 폴더는 복구할 수 없습니다.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-black text-slate-400">
              삭제 대상
            </p>

            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-600">
                작업 폴더
              </span>

              <span className="max-w-[240px] truncate text-xs font-black text-slate-800">
                {project.name}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-600">
                상위 프로젝트
              </span>

              <span className="max-w-[240px] truncate text-xs font-black text-slate-800">
                {project.workspaceName}
              </span>
            </div>
          </div>

          {/* BUTTONS */}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={
                onClose
              }
              disabled={
                deleting
              }
              className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              취소
            </button>

            <button
              type="button"
              onClick={
                onConfirm
              }
              disabled={
                deleting
              }
              className="inline-flex h-9 min-w-[92px] items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 text-xs font-black text-white transition hover:bg-rose-700 disabled:bg-rose-300"
            >
              {deleting ? (
                <>
                  <Clock3
                    size={13}
                    className="animate-spin"
                  />

                  삭제 중
                </>
              ) : (
                <>
                  <Trash2
                    size={13}
                  />

                  삭제
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}