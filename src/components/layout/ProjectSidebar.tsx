"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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

export type WorkspaceMode = "personal" | "team";
export type ProjectFilter = "all" | WorkspaceMode;

export type WorkspaceSidebarItem = {
  id: string;
  name: string;
  mode: WorkspaceMode;
  role?: string;
  childCount: number;
};

type ProjectSidebarProps = {
  workspaces: WorkspaceSidebarItem[];
  selectedWorkspaceId?: string;
  loading?: boolean;
  errorMessage?: string;
  onSelectWorkspace: (workspace: WorkspaceSidebarItem) => void;
  allProjectsHref?: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeWorkspaceRole(role?: string) {
  return role?.toLowerCase() === "owner" ? "OWNER" : "MEMBER";
}

export default function ProjectSidebar({
  workspaces,
  selectedWorkspaceId = "",
  loading = false,
  errorMessage = "",
  onSelectWorkspace,
  allProjectsHref = "/main",
}: ProjectSidebarProps) {
  const router = useRouter();

  const [projectSearch, setProjectSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>("all");

  const [isSidebarPinned, setIsSidebarPinned] = useState(true);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [canSidebarHoverExpand, setCanSidebarHoverExpand] = useState(true);
  const [isPageScrolled, setIsPageScrolled] = useState(false);

  const projectSearchInputRef = useRef<HTMLInputElement | null>(null);

  const sidebarExpanded =
    isSidebarPinned || (canSidebarHoverExpand && isSidebarHovered);

  useEffect(() => {
    const handleScroll = () => {
      setIsPageScrolled(window.scrollY > 0);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const personalCount = useMemo(
    () => workspaces.filter((workspace) => workspace.mode === "personal").length,
    [workspaces],
  );

  const teamCount = useMemo(
    () => workspaces.filter((workspace) => workspace.mode === "team").length,
    [workspaces],
  );

  const filteredWorkspaces = useMemo(() => {
    const keyword = projectSearch.trim().toLowerCase();

    return workspaces.filter((workspace) => {
      const matchesMode =
        projectFilter === "all" || workspace.mode === projectFilter;

      const matchesKeyword =
        !keyword || workspace.name.toLowerCase().includes(keyword);

      return matchesMode && matchesKeyword;
    });
  }, [projectFilter, projectSearch, workspaces]);

  const personalWorkspaces = useMemo(
    () =>
      filteredWorkspaces.filter(
        (workspace) => workspace.mode === "personal",
      ),
    [filteredWorkspaces],
  );

  const teamWorkspaces = useMemo(
    () =>
      filteredWorkspaces.filter(
        (workspace) => workspace.mode === "team",
      ),
    [filteredWorkspaces],
  );

  const handleToggleSidebar = () => {
    if (isSidebarPinned) {
      setIsSidebarPinned(false);
      setIsSidebarHovered(false);
      setCanSidebarHoverExpand(false);
      return;
    }

    setIsSidebarPinned(true);
    setIsSidebarHovered(false);
    setCanSidebarHoverExpand(true);
  };

  const openSidebarForSearch = () => {
    setIsSidebarPinned(true);
    setIsSidebarHovered(false);
    setCanSidebarHoverExpand(true);

    requestAnimationFrame(() => {
      projectSearchInputRef.current?.focus();
    });
  };

  const openSidebarForProjects = () => {
    setIsSidebarPinned(true);
    setIsSidebarHovered(false);
    setCanSidebarHoverExpand(true);
    setProjectFilter("all");
  };

  return (
    <aside
      onMouseEnter={() => {
        if (!isSidebarPinned && canSidebarHoverExpand) {
          setIsSidebarHovered(true);
        }
      }}
      onMouseLeave={() => {
        setIsSidebarHovered(false);
        setCanSidebarHoverExpand(true);
      }}
      className={cn(
        "waivs-sidebar sticky hidden h-[calc(100dvh-104px)] shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-[width] duration-200 lg:flex lg:flex-col",
        isPageScrolled ? "top-[88px]" : "top-4",
        sidebarExpanded ? "w-[288px]" : "w-16",
      )}
    >
      {/* =================================================
          SIDEBAR HEADER
         ================================================= */}
      <div
        className={cn(
          "border-b border-slate-100",
          sidebarExpanded
            ? "p-3"
            : "flex h-[64px] items-center justify-center p-0",
        )}
      >
        <div
          className={cn(
            "flex items-center",
            sidebarExpanded ? "justify-between gap-2" : "justify-center",
          )}
        >
          {sidebarExpanded && (
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#EEF3FF] text-[#5873F9]">
                  <FolderOpen size={16} strokeWidth={2.4} />
                </div>

                <div>
                  <p className="text-sm font-black text-slate-900">
                    프로젝트
                  </p>

                  <p className="text-[10px] font-semibold text-slate-400">
                    전체 {workspaces.length}
                    {" · "}
                    개인 {personalCount}
                    {" · "}
                    팀 {teamCount}
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleToggleSidebar}
            className={cn(
              "grid shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700",
              sidebarExpanded ? "h-8 w-8" : "h-9 w-9",
            )}
            title={isSidebarPinned ? "사이드바 접기" : "사이드바 펼치기"}
          >
            {sidebarExpanded ? (
              <PanelLeftClose size={17} />
            ) : (
              <PanelLeftOpen size={18} />
            )}
          </button>
        </div>

        {sidebarExpanded && (
          <>
            <div className="relative mt-3">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                ref={projectSearchInputRef}
                value={projectSearch}
                onChange={(event) => setProjectSearch(event.target.value)}
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
                  onClick={() => setProjectFilter(value)}
                  className={cn(
                    "rounded-lg px-2 py-1.5 text-[11px] font-black transition",
                    projectFilter === value
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

      {/* =================================================
          SIDEBAR BODY
         ================================================= */}
      <div
        className={cn(
          "min-h-0 flex-1",
          sidebarExpanded ? "overflow-y-auto p-3" : "overflow-hidden",
        )}
      >
        {loading ? (
          <div className="grid h-32 place-items-center">
            <Loader2
              size={18}
              className="animate-spin text-[#5873F9]"
            />
          </div>
        ) : errorMessage ? (
          sidebarExpanded ? (
            <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs font-semibold leading-5 text-rose-600">
              {errorMessage}
            </div>
          ) : null
        ) : sidebarExpanded ? (
          <div className="space-y-5">
            {projectFilter !== "team" && (
              <WorkspaceSection
                title="개인 프로젝트"
                mode="personal"
                items={personalWorkspaces}
                selectedWorkspaceId={selectedWorkspaceId}
                onSelect={onSelectWorkspace}
              />
            )}

            {projectFilter !== "personal" && (
              <WorkspaceSection
                title="팀 프로젝트"
                mode="team"
                items={teamWorkspaces}
                selectedWorkspaceId={selectedWorkspaceId}
                onSelect={onSelectWorkspace}
              />
            )}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center pt-4">
            <button
              type="button"
              onClick={openSidebarForSearch}
              className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-[#5873F9]"
              title="프로젝트 검색"
            >
              <Search size={19} strokeWidth={2} />
            </button>

            <button
              type="button"
              onClick={openSidebarForProjects}
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

      {/* =================================================
          SIDEBAR FOOTER
         ================================================= */}
      {sidebarExpanded && (
        <div className="border-t border-slate-100 p-3">
          <button
            type="button"
            onClick={() => router.push(allProjectsHref)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#D9E1FF] bg-[#F7F9FF] px-3 py-2 text-xs font-black text-[#5873F9] transition hover:bg-[#EEF3FF]"
          >
            전체 프로젝트
            <ArrowRight size={14} />
          </button>
        </div>
      )}
    </aside>
  );
}

function WorkspaceSection({
  title,
  mode,
  items,
  selectedWorkspaceId,
  onSelect,
}: {
  title: string;
  mode: WorkspaceMode;
  items: WorkspaceSidebarItem[];
  selectedWorkspaceId: string;
  onSelect: (workspace: WorkspaceSidebarItem) => void;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between px-2">
        <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-500">
          {mode === "team" ? (
            <UsersRound size={13} />
          ) : (
            <UserRound size={13} />
          )}

          {title}
        </div>

        <span className="text-[10px] font-black text-slate-400">
          {items.length}
        </span>
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
              selected={workspace.id === selectedWorkspaceId}
              onClick={() => onSelect(workspace)}
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
  onClick,
}: {
  workspace: WorkspaceSidebarItem;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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
        {workspace.mode === "team" ? (
          <UsersRound size={15} />
        ) : (
          <UserRound size={15} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-black">
          {workspace.name}
        </p>

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
    </button>
  );
}
