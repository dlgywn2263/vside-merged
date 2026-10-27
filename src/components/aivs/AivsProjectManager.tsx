"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";

import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import { useDispatch } from "react-redux";

import {

  AlertTriangle,

  ArrowUpRight,

  ChevronRight,

  GitBranch,


  CalendarCheck,


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

  getDevlogHref,

  getIdeHref,

  getScheduleHref,

} from "@/components/main-dashboard/dashboard.utils";

import type { WorkspaceSidebarItem } from "@/components/layout/ProjectSidebar";

import ProjectSwitcher from "@/components/main-dashboard/ProjectSwitcher";


/* =========================================================

   TYPE

========================================================= */

type SubProjectStatus = "todo" | "progress" | "done" | "hold";

type SortType = "recent" | "name" | "progress";

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

/* =========================================================

   UTIL

========================================================= */

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

      if (!ref.current || !target) {

        return;

      }

      if (ref.current.contains(target)) {

        return;

      }

      handler();

    };

    document.addEventListener("mousedown", listener);

    return () => document.removeEventListener("mousedown", listener);

  }, [ref, handler]);

}

function normalizeStatus(value?: string | null): SubProjectStatus {

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

function normalizeWorkspaceRole(role?: string | null) {

  return role?.trim().toLowerCase() === "owner" ? "owner" : "member";

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

  if (!value) {

    return "-";

  }

  if (/^\d{4}\.\d{2}\.\d{2}/.test(value)) {

    return value;

  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {

    return value;

  }

  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}.${month}.${day}`;

}

function getWorkspaceTitle(workspace?: WorkspaceListResponse | null) {

  return workspace?.name?.trim() || "이름 없는 프로젝트";

}

function getWorkspaceSubProjectCount(

  workspace?: WorkspaceListResponse | null,

) {

  return Array.isArray(workspace?.projects) ? workspace.projects.length : 0;

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

/* =========================================================

   API

========================================================= */

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

/* =========================================================

   STATUS PILL

========================================================= */

function StatusPill({ status }: { status: SubProjectStatus }) {

  return (

    <span

      className={cn(

        "inline-flex h-5 shrink-0 items-center rounded border px-1.5 text-[10px] font-semibold",

        getStatusClassName(status),

      )}

    >

      {getStatusLabel(status)}

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
  const status = normalizeStatus(project.status);
  const progress = getProgress(project);
  const scheduleCount = project.scheduleCount ?? 0;
  const doneScheduleCount = project.doneScheduleCount ?? 0;
  const devlogCount = project.devlogCount ?? 0;
  const memberCount = project.memberCount ?? 1;
  const openHref = getIdeHref(project.workspaceId, mode);
  const scheduleHref = getScheduleHref(project.workspaceId, mode);
  const devlogHref = getDevlogHref(project.workspaceId, mode);

  return (
    <section className="group relative flex h-full min-w-0 flex-col rounded-md border border-slate-200 bg-white p-3.5 transition-colors hover:border-[#AAB8FF]">
      {/* =================================================
          TOP
      ================================================= */}
      <div className="flex min-w-0 items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[#EEF3FF] text-[#5873F9]">
          <FolderKanban size={17} strokeWidth={2.2} />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-slate-900">
            {project.name}
          </h3>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex h-5 items-center rounded border border-slate-200 bg-slate-50 px-1.5 font-mono text-[10px] font-medium text-slate-600">
              {project.language || "General"}
            </span>

            <StatusPill status={status} />
          </div>
        </div>

        {/* ===============================================
            MORE MENU
        =============================================== */}
        <div
          className="relative -mr-1.5 -mt-1.5 shrink-0"
          ref={open ? menuRef : null}
        >
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="작업 폴더 메뉴"
            onClick={onOpenMenu}
          >
            <MoreVertical size={15} />
          </button>

          {open ? (
            <div className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-md border border-slate-300 bg-white py-1">
              <Link
                href={openHref}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                onClick={onCloseMenu}
              >
                <FolderOpen size={14} className="text-slate-400" />
                작업 폴더 열기
              </Link>

              <Link
                href={scheduleHref}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                onClick={onCloseMenu}
              >
                <CalendarCheck size={14} className="text-slate-400" />
                일정관리
              </Link>

              <Link
                href={devlogHref}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                onClick={onCloseMenu}
              >
                <FileText size={14} className="text-slate-400" />
                개발일지
              </Link>

              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  onCloseMenu();
                  onOpenInfo();
                }}
              >
                <Info size={14} className="text-slate-400" />
                프로젝트 정보
              </button>

              {canDelete ? (
                <>
                  <div className="my-1 h-px bg-slate-100" />

                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50"
                    onClick={() => {
                      onCloseMenu();
                      onDelete();
                    }}
                  >
                    <Trash2 size={14} />
                    삭제
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <p className="mt-2 line-clamp-1 text-xs text-slate-500">
        {project.description?.trim()
          ? project.description
          : `${project.language || "General"} 기반 작업 폴더입니다.`}
      </p>

      {/* =================================================
          PROGRESS
      ================================================= */}
      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-500">진행률</span>

          <span className="text-xs font-semibold tabular-nums text-slate-900">
            {progress}%
          </span>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              getProgressBarClassName(status),
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
      <div className="mt-2.5 grid grid-cols-3 divide-x divide-slate-100 rounded-md border border-slate-100 bg-slate-50/60 text-center">
        <div className="px-2 py-1.5">
          <p className="flex items-center justify-center gap-1 text-[10px] text-slate-400">
            <CalendarCheck size={11} />
            일정
          </p>

          <p className="mt-0.5 text-xs font-semibold tabular-nums text-slate-800">
            {doneScheduleCount}/{scheduleCount}
          </p>
        </div>

        <div className="px-2 py-1.5">
          <p className="flex items-center justify-center gap-1 text-[10px] text-slate-400">
            <FileText size={11} />
            일지
          </p>

          <p className="mt-0.5 text-xs font-semibold tabular-nums text-slate-800">
            {devlogCount}
          </p>
        </div>

        <div className="px-2 py-1.5">
          <p className="flex items-center justify-center gap-1 text-[10px] text-slate-400">
            <UsersRound size={11} />
            인원
          </p>

          <p className="mt-0.5 text-xs font-semibold tabular-nums text-slate-800">
            {memberCount}
          </p>
        </div>
      </div>

      {/* =================================================
          FOOTER
      ================================================= */}
      <div className="mt-auto flex min-w-0 items-center justify-between gap-3 border-t border-slate-100 pt-2.5 [margin-top:12px]">
        <div className="min-w-0 flex-1">
          {project.gitUrl ? (
            <a
              href={project.gitUrl}
              target="_blank"
              rel="noreferrer"
              className="flex min-w-0 items-center gap-1 text-[11px] text-slate-500 transition-colors hover:text-[#5873F9]"
            >
              <GitBranch size={12} className="shrink-0 text-emerald-600" />
              <span className="truncate">{project.gitUrl}</span>
              <ExternalLink size={10} className="shrink-0" />
            </a>
          ) : (
            <p className="flex items-center gap-1 truncate text-[11px] text-slate-400">
              <GitBranch size={12} className="shrink-0" />
              원격 저장소 없음
            </p>
          )}

          <p className="mt-0.5 font-mono text-[10px] text-slate-400">
            최근 수정 {formatDate(project.updatedAt)}
          </p>
        </div>

        <Link
          href={openHref}
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-[#5873F9] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#4863E8]"
        >
          열기
          <ArrowUpRight size={13} />
        </Link>
      </div>
    </section>
  );
}

/* =========================================================

   PROJECT MANAGER LIST

========================================================= */

export function AivsProjectManager({
  workspaceId: workspaceIdProp,
  mode: modeProp,
}: Props = {}) {
  const dispatch = useDispatch();
  const router = useRouter();
  const params = useParams<Record<string, string | string[]>>();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /* =======================================================
     CURRENT WORKSPACE
  ======================================================= */

  const workspaceIdFromParams = useMemo(() => {
    const candidates = [
      params?.workspaceId,
      params?.id,
      params?.projectId,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        if (candidate[0]) {
          return candidate[0];
        }
      } else if (typeof candidate === "string" && candidate.trim()) {
        return candidate;
      }
    }

    return null;
  }, [params]);

  const workspaceIdFromPath = useMemo(() => {
    const parts = pathname?.split("/").filter(Boolean) ?? [];

    if (parts[0] !== "aivs" || !parts[1]) {
      return null;
    }

    try {
      return decodeURIComponent(parts[1]);
    } catch {
      return parts[1];
    }
  }, [pathname]);

  const currentWorkspaceId =
    workspaceIdProp?.trim() ||
    workspaceIdFromParams ||
    workspaceIdFromPath ||
    null;

  const modeFromUrl = searchParams.get("mode");

  const currentMode: WorkspaceMode =
    modeFromUrl === "team" || modeFromUrl === "personal"
      ? modeFromUrl
      : modeProp ?? "personal";

  /* =======================================================

     WORKSPACE

  ======================================================= */

  const [allWorkspaces, setAllWorkspaces] = useState<

    WorkspaceListResponse[]

  >([]);

  const [sidebarLoading, setSidebarLoading] = useState(true);

  const [sidebarError, setSidebarError] = useState("");

  /* =======================================================

     PROJECT

  ======================================================= */

  const [projects, setProjects] = useState<SubProject[]>([]);

  const [workspaceName, setWorkspaceName] = useState("AIVS");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  /* =======================================================

     FILTER

  ======================================================= */

  const [statusFilter, setStatusFilter] = useState<

    "all" | SubProjectStatus

  >("all");

  const [sortType, setSortType] = useState<SortType>("recent");

  const [query, setQuery] = useState("");

  /* =======================================================

     MENU / MODAL

  ======================================================= */

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [infoProject, setInfoProject] = useState<SubProject | null>(

    null,

  );

  const [deleteTarget, setDeleteTarget] = useState<SubProject | null>(

    null,

  );

  const [deleting, setDeleting] = useState(false);

  const [actionMessage, setActionMessage] = useState<{

    type: "success" | "error";

    text: string;

  } | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);

  useOnClickOutside(menuRef, () => setOpenMenuId(null));

  /* =======================================================

     SELECTED WORKSPACE

  ======================================================= */

  const selectedWorkspace = useMemo(() => {

    if (!currentWorkspaceId) {

      return null;

    }

    return (

      allWorkspaces.find(

        (workspace) =>

          String(workspace.id) === String(currentWorkspaceId),

      ) ?? null

    );

  }, [allWorkspaces, currentWorkspaceId]);

  /* =======================================================

     OWNER CHECK

  ======================================================= */

  const isWorkspaceOwner =

    normalizeWorkspaceRole(selectedWorkspace?.role) === "owner";

  /* =======================================================

     SIDEBAR DATA

  ======================================================= */

  const sidebarWorkspaces = useMemo<WorkspaceSidebarItem[]>(

    () =>

      allWorkspaces.map((workspace) => ({

        id: String(workspace.id),

        name: getWorkspaceTitle(workspace),

        mode: workspace.mode,

        role: (

          workspace as WorkspaceListResponse & {

            role?: string;

          }

        ).role,

        childCount: getWorkspaceSubProjectCount(workspace),

      })),

    [allWorkspaces],

  );

  /* =======================================================

     WORKSPACE SELECT

  ======================================================= */

  function handleSelectWorkspace(workspace: WorkspaceSidebarItem) {

    if (typeof window !== "undefined") {

      localStorage.setItem("currentWorkspaceId", workspace.id);

      localStorage.setItem("currentWorkspaceMode", workspace.mode);

    }

    router.push(

      `/aivs/${encodeURIComponent(workspace.id)}?mode=${workspace.mode}`,

    );

  }

  /* =======================================================

     LOCAL STORAGE SYNC

  ======================================================= */

  useEffect(() => {

    if (!currentWorkspaceId) {

      return;

    }

    localStorage.setItem("currentWorkspaceId", currentWorkspaceId);

    localStorage.setItem("currentWorkspaceMode", currentMode);

  }, [currentWorkspaceId, currentMode]);

  /* =======================================================

     LOAD WORKSPACES

  ======================================================= */

  async function loadWorkspaceList() {

    try {

      setSidebarLoading(true);

      setSidebarError("");

      const workspaceData = await getMyWorkspacesByTokenApi();

      const list: WorkspaceListResponse[] = Array.isArray(workspaceData)

        ? workspaceData

        : [];

      setAllWorkspaces(list);

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

  /* =======================================================

     LOAD PROJECTS

  ======================================================= */

  async function loadProjects(workspaceId: string) {

    try {

      setLoading(true);

      setError("");

      const data = await fetchSubProjectsByWorkspaceApi(workspaceId);

      setProjects(data);

      const nameFromResponse = data[0]?.workspaceName;

      const nameFromWorkspace = selectedWorkspace?.name;

      setWorkspaceName(

        nameFromResponse || nameFromWorkspace || "AIVS",

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

    if (!currentWorkspaceId) {

      setLoading(false);

      setProjects([]);

      setError("선택된 상위 프로젝트 ID가 없습니다.");

      return;

    }

    loadProjects(currentWorkspaceId);

  }, [currentWorkspaceId, selectedWorkspace?.name]);

  /* =======================================================

     WORKSPACE NAME SYNC

  ======================================================= */

  useEffect(() => {

    if (selectedWorkspace?.name) {

      setWorkspaceName(selectedWorkspace.name);

    }

  }, [selectedWorkspace?.name]);

  /* =======================================================

     FILTERED PROJECTS

  ======================================================= */

  const filteredProjects = useMemo(() => {

    const keyword = query.trim().toLowerCase();

    const result = projects

      .filter((project) => {

        const status = normalizeStatus(project.status);

        if (statusFilter === "all") {

          return true;

        }

        return status === statusFilter;

      })

      .filter((project) => {

        if (!keyword) {

          return true;

        }

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

  /* =======================================================

     STATISTICS

  ======================================================= */

  const allSubProjectCount = projects.length;

  const todoCount = projects.filter(

    (project) => normalizeStatus(project.status) === "todo",

  ).length;

  const progressCount = projects.filter(

    (project) => normalizeStatus(project.status) === "progress",

  ).length;

  const doneCount = projects.filter(

    (project) => normalizeStatus(project.status) === "done",

  ).length;

  const holdCount = projects.filter(

    (project) => normalizeStatus(project.status) === "hold",

  ).length;

  const totalDevlogCount = projects.reduce(

    (sum, project) => sum + (project.devlogCount ?? 0),

    0,

  );

  const averageProgress =

    projects.length > 0

      ? Math.round(

          projects.reduce(

            (sum, project) => sum + getProgress(project),

            0,

          ) / projects.length,

        )

      : 0;

  /* =======================================================

     DELETE MODAL OPEN

  ======================================================= */

  function openDeleteModal(project: SubProject) {

    if (!isWorkspaceOwner) {

      setActionMessage({

        type: "error",

        text: "프로젝트 OWNER만 작업 폴더를 삭제할 수 있습니다.",

      });

      return;

    }

    setOpenMenuId(null);

    setDeleteTarget(project);

  }

  /* =======================================================

     DELETE PROJECT

  ======================================================= */

  async function handleDeleteSubProject() {

    if (!deleteTarget) {

      return;

    }

    if (!isWorkspaceOwner) {

      setDeleteTarget(null);

      setActionMessage({

        type: "error",

        text: "프로젝트 OWNER만 작업 폴더를 삭제할 수 있습니다.",

      });

      return;

    }

    try {

      setDeleting(true);

      setActionMessage(null);

      const response = await apiFetch(

        `/api/projects/${encodeURIComponent(deleteTarget.id)}`,

        {

          method: "DELETE",

          cache: "no-store",

        },

      );

      if (!response.ok) {

        let errorMessage = "작업 폴더 삭제에 실패했습니다.";

        try {

          const data = await response.clone().json();

          if (data?.message) {

            errorMessage = data.message;

          } else if (data?.error) {

            errorMessage = data.error;

          }

        } catch {

          try {

            const text = await response.text();

            if (text.trim()) {

              errorMessage = text;

            }

          } catch {

            // ignore

          }

        }

        throw new Error(errorMessage);

      }

      const deletedId = deleteTarget.id;

      setProjects((prev) =>

        prev.filter((project) => project.id !== deletedId),

      );

      setDeleteTarget(null);

      setOpenMenuId(null);

      setActionMessage({

        type: "success",

        text: "작업 폴더가 삭제되었습니다.",

      });

      await loadWorkspaceList();

    } catch (err) {

      console.error("[AIVS project delete]", err);

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

    if (!currentWorkspaceId) {

      alert("선택된 상위 프로젝트 ID가 없습니다.");

      return;

    }

    localStorage.setItem("currentWorkspaceId", currentWorkspaceId);

    localStorage.setItem("currentWorkspaceMode", currentMode);

    dispatch(setWorkspaceId(currentWorkspaceId));

    dispatch(openProjectModal());

  }

  /* =======================================================

     ESC

  ======================================================= */

  useEffect(() => {

    const onKey = (event: KeyboardEvent) => {

      if (event.key !== "Escape") {

        return;

      }

      setOpenMenuId(null);

      setInfoProject(null);

      if (!deleting) {

        setDeleteTarget(null);

      }

    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);

  }, [deleting]);

  /* =======================================================

     ACTION MESSAGE TIMER

  ======================================================= */

  useEffect(() => {

    if (!actionMessage) {

      return;

    }

    const timer = window.setTimeout(() => {

      setActionMessage(null);

    }, 3000);

    return () => window.clearTimeout(timer);

  }, [actionMessage]);

  /* =======================================================

     RENDER

  ======================================================= */

  /* =======================================================
     최근 작업 이어하기
     IDE(useWorkspaceEntry)는 이 브라우저의 localStorage 에
     lastProject_{워크스페이스} 로 마지막에 연 작업 폴더 이름을 남긴다.
     그 기록이 있으면 그 폴더를, 없으면 가장 최근에 수정된 폴더를 보여 준다.
     (서버에는 "최근 작업" 기록이 없어 다른 사람·다른 기기 기록은 알 수 없다)
  ======================================================= */
  const [lastOpenedName, setLastOpenedName] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function readLastOpened() {
      let value: string | null = null;

      try {
        value = currentWorkspaceId
          ? localStorage.getItem(`lastProject_${currentWorkspaceId}`)
          : null;
      } catch {
        value = null;
      }

      if (!ignore) setLastOpenedName(value);
    }

    void readLastOpened();

    return () => {
      ignore = true;
    };
  }, [currentWorkspaceId]);

  const lastOpenedProject = lastOpenedName
    ? projects.find((project) => project.name === lastOpenedName) ?? null
    : null;

  const recentlyUpdatedProject =
    [...projects].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0] ??
    null;

  const continueProject = lastOpenedProject ?? recentlyUpdatedProject;

  const statusTabs: Array<{
    value: "all" | SubProjectStatus;
    label: string;
    count: number;
  }> = [
    { value: "all", label: "전체", count: allSubProjectCount },
    { value: "todo", label: "시작 전", count: todoCount },
    { value: "progress", label: "진행 중", count: progressCount },
    { value: "done", label: "완료", count: doneCount },
    { value: "hold", label: "보류", count: holdCount },
  ];

  const rememberWorkspace = () => {
    if (typeof window === "undefined" || !currentWorkspaceId) {
      return;
    }

    localStorage.setItem("currentWorkspaceId", String(currentWorkspaceId));
    localStorage.setItem("currentWorkspaceMode", currentMode);
  };

  return (
    <>
      {/* 카드 없이 TopNav 아래 화면 전체를 쓰는 작업 공간(일정·설계 관리와 같은 틀) */}
      <main className="waivs-page flex flex-col bg-white font-sans text-slate-900 lg:h-[calc(100dvh-65px)] lg:min-h-0 lg:overflow-hidden">
        {/* =================================================
            PAGE HEADER
        ================================================= */}
        <header className="flex shrink-0 flex-col gap-3 border-y border-slate-200 bg-[#F4F6FA] px-4 py-2.5 lg:h-[62px] lg:flex-row lg:items-center lg:justify-between lg:px-5 lg:py-0">
          <nav
            aria-label="현재 위치"
            className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm"
          >
            <ProjectSwitcher
              size="compact"
              label={workspaceName}
              workspaces={sidebarWorkspaces}
              selectedWorkspaceId={currentWorkspaceId ?? ""}
              loading={sidebarLoading}
              errorMessage={sidebarError}
              onSelectWorkspace={handleSelectWorkspace}
            />

            <ChevronRight size={14} className="text-slate-300" />

            <span className="inline-flex items-center gap-1.5 px-1 py-1 text-[15px] font-semibold text-slate-800">
              <Code2 size={14} className="text-[#5873F9]" />
              AIVS 작업 폴더
            </span>

            <span
              className={cn(
                "ml-1.5 rounded border px-1.5 py-px text-[10px] font-semibold",
                currentMode === "team"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-blue-200 bg-blue-50 text-blue-700",
              )}
            >
              {currentMode === "team" ? "Team" : "Personal"}
            </span>

            <span className="rounded border border-slate-200 bg-white px-1.5 py-px text-[10px] font-semibold text-slate-500">
              {isWorkspaceOwner ? "OWNER" : "MEMBER"}
            </span>
          </nav>

          {/* 헤더 배경(#F4F6FA) 위에서 묻히지 않도록 보조 버튼은 흰 바탕 + 진한 테두리 */}
          <div className="flex shrink-0 items-center gap-2">
            {currentWorkspaceId ? (
              <Link
                href={getIdeHref(String(currentWorkspaceId), currentMode)}
                onClick={rememberWorkspace}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900"
              >
                작업하러 가기
                <ArrowUpRight size={14} />
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex h-9 cursor-not-allowed items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-400"
              >
                작업하러 가기
                <ArrowUpRight size={14} />
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenCreateProjectModal}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-[#5873F9] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#4863E8]"
            >
              <Plus size={14} />
              작업 폴더 추가
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden">
          {/* =================================================
              MAIN (남은 너비 전체)
          ================================================= */}
          <section className="min-w-0 flex-1 lg:overflow-y-auto">
            <div className="space-y-4 px-4 py-4 lg:px-5">
              {/* ===============================================
                  최근 작업 이어하기
              =============================================== */}
              {!loading && !error && continueProject ? (
                <ContinueWorkPanel
                  project={continueProject}
                  source={lastOpenedProject ? "opened" : "updated"}
                  href={getIdeHref(continueProject.workspaceId, currentMode)}
                  onNavigate={rememberWorkspace}
                />
              ) : null}

              {/* ===============================================
                  작업 폴더 목록 제목
              =============================================== */}
              <div className="min-w-0">
                <h2 className="text-[15px] font-semibold text-slate-900">
                  작업 폴더{" "}
                  <span className="tabular-nums text-[#5873F9]">
                    {allSubProjectCount}
                  </span>
                  개
                </h2>

                <p className="mt-0.5 truncate text-xs text-slate-500">
                  현재 선택된 상위 프로젝트에 속한 작업 폴더만 표시합니다.
                </p>
              </div>

              {/* ===============================================
                  FILTER / SORT / SEARCH
              =============================================== */}
              <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 xl:flex-row xl:items-end xl:justify-between">
                <div className="-mb-3 flex items-stretch gap-1 overflow-x-auto">
                  {statusTabs.map((item) => {
                    const active = statusFilter === item.value;

                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setStatusFilter(item.value)}
                        aria-pressed={active}
                        className={cn(
                          "inline-flex h-9 items-center gap-1.5 border-b-2 px-2.5 text-[13px] font-medium transition-colors",
                          active
                            ? "border-[#5873F9] text-[#4058D6]"
                            : "border-transparent text-slate-500 hover:text-slate-900",
                        )}
                      >
                        {item.label}

                        <span
                          className={cn(
                            "rounded px-1.5 py-px text-[11px] font-semibold tabular-nums",
                            active
                              ? "bg-[#EEF2FF] text-[#4058D6]"
                              : "bg-slate-100 text-slate-500",
                          )}
                        >
                          {item.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex w-full items-center gap-2 xl:w-auto">
                  <div className="relative shrink-0">
                    <Filter
                      size={13}
                      className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <select
                      value={sortType}
                      onChange={(event) =>
                        setSortType(event.target.value as SortType)
                      }
                      aria-label="정렬"
                      className="h-8 min-w-[140px] appearance-none rounded-md border border-slate-200 bg-white pl-7 pr-7 text-xs font-medium text-slate-700 outline-none transition-colors hover:bg-slate-50 focus:border-[#AAB8FF]"
                    >
                      <option value="recent">최근 수정순</option>
                      <option value="name">이름순</option>
                      <option value="progress">진행률 높은순</option>
                    </select>

                    <svg
                      className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path
                        d="m6 8 4 4 4-4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <div className="relative min-w-0 flex-1 xl:w-[260px] xl:flex-none">
                    <Search
                      className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                      size={13}
                    />

                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="작업 폴더 검색"
                      className="h-8 w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 text-xs font-medium text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-[#AAB8FF]"
                    />
                  </div>
                </div>
              </div>

              {/* ===============================================
                  FOLDER LIST
              =============================================== */}
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-xs text-slate-400">
                  <Clock3 size={15} />
                  작업 폴더를 불러오는 중입니다.
                </div>
              ) : null}

              {!loading && error ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-4 text-sm font-medium text-red-600">
                  {error}
                </div>
              ) : null}

              {!loading && !error && filteredProjects.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-200 px-5 py-12 text-center">
                  <div className="mx-auto grid h-10 w-10 place-items-center rounded-md bg-[#EEF3FF] text-[#5873F9]">
                    <Code2 size={20} />
                  </div>

                  <p className="mt-3 text-sm font-semibold text-slate-800">
                    표시할 작업 폴더가 없습니다.
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    검색어나 필터를 다시 확인하거나 새 작업 폴더를 추가해
                    주세요.
                  </p>

                </div>
              ) : null}

              {!loading && !error && filteredProjects.length > 0 ? (
                <div>
                  {filteredProjects.length !== allSubProjectCount ? (
                    <p className="mb-3 text-xs text-slate-500">
                      조건에 맞는 작업 폴더{" "}
                      <strong className="font-semibold tabular-nums text-slate-900">
                        {filteredProjects.length}
                      </strong>
                      개
                    </p>
                  ) : null}

                  {/* 메인 영역을 균등하게 사용하는 2열. 폴더가 하나면 과도하게 늘어나지 않도록 제한 */}
                  <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {filteredProjects.map((project) => (
                      <SubProjectCard
                        key={project.id}
                        project={project}
                        mode={currentMode}
                        open={openMenuId === project.id}
                        canDelete={isWorkspaceOwner}
                        menuRef={menuRef}
                        onOpenMenu={() =>
                          setOpenMenuId((current) =>
                            current === project.id ? null : project.id,
                          )
                        }
                        onCloseMenu={() => setOpenMenuId(null)}
                        onOpenInfo={() => setInfoProject(project)}
                        onDelete={() => openDeleteModal(project)}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>

        </div>
      </main>

      {/* =================================================
          PROJECT INFO MODAL
      ================================================= */}
      {infoProject ? (
        <ProjectInfoModal
          project={infoProject}
          onClose={() => setInfoProject(null)}
        />
      ) : null}

      {/* =================================================
          DELETE MODAL
      ================================================= */}
      {deleteTarget ? (
        <DeleteProjectModal
          project={deleteTarget}
          deleting={deleting}
          onClose={() => {
            if (!deleting) {
              setDeleteTarget(null);
            }
          }}
          onConfirm={handleDeleteSubProject}
        />
      ) : null}

      {/* =================================================
          TOAST
      ================================================= */}
      {actionMessage ? (
        <div className="fixed right-5 top-[88px] z-[160] w-[340px] max-w-[calc(100vw-40px)]">
          <div
            className={cn(
              "flex items-center gap-3 rounded-md border bg-white px-4 py-3",
              actionMessage.type === "success"
                ? "border-emerald-300"
                : "border-rose-300",
            )}
          >
            <div
              className={cn(
                "h-2.5 w-2.5 shrink-0 rounded-full",
                actionMessage.type === "success"
                  ? "bg-emerald-500"
                  : "bg-rose-500",
              )}
            />

            <p className="min-w-0 flex-1 text-xs font-medium text-slate-700">
              {actionMessage.text}
            </p>

            <button
              type="button"
              onClick={() => setActionMessage(null)}
              className="grid h-7 w-7 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="알림 닫기"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : null}

      {/* =================================================
          CREATE PROJECT
      ================================================= */}
      <CreateProjectModal
        redirectToIdeAfterCreate
        ideMode={currentMode}
      />
    </>
  );
}

/* =========================================================
   최근 작업 이어하기
========================================================= */
function ContinueWorkPanel({
  project,
  source,
  href,
  onNavigate,
}: {
  project: SubProject;
  source: "opened" | "updated";
  href: string;
  onNavigate: () => void;
}) {
  const status = normalizeStatus(project.status);

  const progress = getProgress(project);

  return (
    <section className="flex flex-col gap-2 rounded-md border border-[#D9E1FF] bg-[#F5F7FF] px-4 py-2.5 md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[#5873F9] text-white">
          <Code2 size={20} />
        </div>

        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-[#5873F9]">
            {source === "opened"
              ? "이 브라우저에서 마지막으로 연 작업 폴더"
              : "가장 최근에 수정된 작업 폴더"}
          </p>

          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold text-slate-900">
              {project.name}
            </h2>

            <StatusPill status={status} />
          </div>

          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
            <span className="font-mono text-slate-600">
              {project.language || "General"}
            </span>
            <span className="text-slate-300">·</span>
            <span>
              최근 수정{" "}
              <span className="font-mono">{formatDate(project.updatedAt)}</span>
            </span>
            <span className="text-slate-300">·</span>
            <span className="inline-flex items-center gap-1">
              <GitBranch
                size={11}
                className={project.gitUrl ? "text-emerald-600" : "text-slate-400"}
              />
              {project.gitUrl ? "원격 저장소 연결" : "원격 저장소 없음"}
            </span>
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-5">
        <div className="w-44">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">진행률</span>
            <span className="font-semibold tabular-nums text-slate-900">
              {progress}%
            </span>
          </div>

          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                getProgressBarClassName(status),
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 기존 "열기"와 같은 IDE 주소. IDE 가 마지막으로 연 폴더를 이어서 연다 */}
        <Link
          href={href}
          onClick={onNavigate}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#5873F9] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#4863E8]"
        >
          {source === "opened" ? "작업 이어하기" : "AIVS에서 열기"}
          <ArrowUpRight size={15} />
        </Link>
      </div>
    </section>
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

  const status = normalizeStatus(project.status);

  const progress = getProgress(project);

  const scheduleCount = project.scheduleCount ?? 0;

  const doneScheduleCount = project.doneScheduleCount ?? 0;

  const devlogCount = project.devlogCount ?? 0;

  const memberCount = project.memberCount ?? 1;

  return (

    <div

      className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]"

      onMouseDown={(event) => {

        if (event.target === event.currentTarget) {

          onClose();

        }

      }}

    >

      <div className="w-full max-w-[620px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

        {/* HEADER */}

        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">

          <div className="flex min-w-0 items-center gap-2">

            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#EEF3FF] text-[#5873F9]">

              <Info size={15} />

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

            onClick={onClose}

            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"

            aria-label="프로젝트 정보 닫기"

          >

            <X size={16} />

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

              <StatusPill status={status} />

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

              value={project.language || "General"}

            />

            <ProjectInfoRow

              label="진행 상태"

              value={getStatusLabel(status)}

            />

            <ProjectInfoRow label="진행률" value={`${progress}%`} />

            <ProjectInfoRow

              label="최근 수정"

              value={formatDate(project.updatedAt)}

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

              value={project.workspaceName || "-"}

            />

          </div>

          {/* GIT */}

          <div className="mt-4 rounded-xl border border-slate-200 px-4 py-3">

            <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">

              Git Repository

            </p>

            {project.gitUrl ? (

              <a

                href={project.gitUrl}

                target="_blank"

                rel="noreferrer"

                className="mt-2 flex min-w-0 items-center gap-2 text-xs font-bold text-[#5873F9] hover:underline"

              >

                <span className="truncate">{project.gitUrl}</span>

                <ExternalLink size={13} className="shrink-0" />

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

              onClick={onClose}

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

      onMouseDown={(event) => {

        if (event.target === event.currentTarget && !deleting) {

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

            onClick={onClose}

            disabled={deleting}

            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"

            aria-label="삭제 창 닫기"

          >

            <X size={16} />

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

              onClick={onClose}

              disabled={deleting}

              className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"

            >

              취소

            </button>

            <button

              type="button"

              onClick={onConfirm}

              disabled={deleting}

              className="inline-flex h-9 min-w-[92px] items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 text-xs font-black text-white transition hover:bg-rose-700 disabled:bg-rose-300"

            >

              {deleting ? (

                <>

                  <Clock3 size={13} className="animate-spin" />

                  삭제 중

                </>

              ) : (

                <>

                  <Trash2 size={13} />

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
