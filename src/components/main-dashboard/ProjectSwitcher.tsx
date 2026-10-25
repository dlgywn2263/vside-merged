"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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

// 메뉴가 화면 가장자리에서 띄울 최소 간격(px)
const VIEWPORT_GAP = 12;

// 버튼과 메뉴 사이 간격(mt-2)
const PANEL_OFFSET = 8;

// 목록 영역 높이. 화면이 낮으면 이 범위 안에서 줄이고, 목록만 스크롤한다.
const LIST_MAX_HEIGHT = 320;
const LIST_MIN_HEIGHT = 140;

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

  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const panelRef = useRef<HTMLDivElement | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);

  // 메뉴를 버튼 왼쪽 끝에 맞추되, 오른쪽이 잘리면 그만큼 왼쪽으로 당긴다.
  const [panelPosition, setPanelPosition] = useState({
    left: 0,
    listMaxHeight: LIST_MAX_HEIGHT,
  });

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

  const hasKeyword = search.trim().length > 0;

  const closeMenu = () => {
    setOpen(false);
    // 다시 열 때는 전체 목록부터 보이도록 검색어만 비운다(필터는 유지)
    setSearch("");
  };

  // 페인트 전에 위치를 잡아 메뉴가 잘린 채로 한 번 보였다가 움직이지 않게 한다.
  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const root = rootRef.current;
      const panel = panelRef.current;

      if (!root || !panel) return;

      const rootRect = root.getBoundingClientRect();

      // innerWidth 는 세로 스크롤바 폭까지 포함해 메뉴가 스크롤바 밑으로 들어간다
      const viewportWidth = document.documentElement.clientWidth;

      const maxLeft = viewportWidth - VIEWPORT_GAP - panel.offsetWidth;

      const left =
        Math.max(VIEWPORT_GAP, Math.min(rootRect.left, maxLeft)) -
        rootRect.left;

      // 검색·필터·하단 버튼을 뺀 나머지 높이만 목록에 준다
      const fixedHeight = panel.offsetHeight - (listRef.current?.offsetHeight ?? 0);

      const available =
        window.innerHeight -
        rootRect.bottom -
        PANEL_OFFSET -
        VIEWPORT_GAP -
        fixedHeight;

      const listMaxHeight = Math.max(
        LIST_MIN_HEIGHT,
        Math.min(LIST_MAX_HEIGHT, available),
      );

      setPanelPosition((prev) =>
        prev.left === left && prev.listMaxHeight === listMaxHeight
          ? prev
          : { left, listMaxHeight },
      );
    };

    updatePosition();

    window.addEventListener("resize", updatePosition);
    // 대시보드처럼 페이지 전체가 스크롤되는 화면에서도 위치를 다시 잡는다
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      // 자료실·개발일지 상세 패널도 window 에서 Esc 로 닫힌다.
      // document 단계에서 막아 메뉴만 닫히게 한다.
      event.stopPropagation();
      setOpen(false);
      setSearch("");
      triggerRef.current?.focus();
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
    closeMenu();
    onSelectWorkspace(workspace);
  };

  const handleOpenSettings = () => {
    if (!selectedWorkspace) return;

    closeMenu();
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
          ref={triggerRef}
          type="button"
          onClick={() => (open ? closeMenu() : setOpen(true))}
          aria-haspopup="dialog"
          aria-expanded={open}
          // 잘린 이름도 마우스를 올리면 전체를 볼 수 있게 한다(메뉴 안에서는 줄바꿈으로 전체 표시)
          title={label}
          className={`group inline-flex max-w-full items-center rounded-md text-left transition-colors hover:bg-[#F2F5FF] ${
            compact ? "gap-1 px-1.5 py-0.5" : "-ml-2 gap-2 px-2 py-1"
          }`}
        >
          {/* compact: 경로(대시보드 › 프로젝트 › 페이지) 중 현재 프로젝트가 가장 먼저 보이도록
              주변 14px 보다 크게(18px) 둔다. 줄 높이 24px 로 묶어 62px 헤더가 늘어나지 않는다.
              화면이 좁을수록 최대 너비를 줄여 말줄임한다. */}
          <span
            className={`truncate ${
              compact
                ? "max-w-[200px] text-lg font-semibold leading-6 text-[#1B2559] sm:max-w-[320px] xl:max-w-[420px]"
                : "text-[26px] font-bold leading-tight tracking-tight text-gray-900"
            }`}
          >
            {label}
          </span>

          <span
            className={`grid shrink-0 place-items-center rounded text-gray-500 transition-colors group-hover:text-[#5873F9] ${
              compact
                ? "h-6 w-6"
                : "h-6 w-6 border border-gray-200 bg-white group-hover:border-[#AAB8FF]"
            }`}
          >
            <ChevronDown
              size={compact ? 16 : 14}
              strokeWidth={2.4}
              className={`transition-transform ${open ? "rotate-180" : ""}`}
            />
          </span>
        </button>
      </h1>

      {open ? (
        // z-50: 자료실 상세 패널(z-40)처럼 헤더 뒤에 오는 겹침 요소보다 위에 그린다.
        // absolute 라 열어도 헤더 아래 내용이 밀리지 않는다.
        <div
          ref={panelRef}
          role="dialog"
          aria-label="프로젝트 전환"
          style={{ left: panelPosition.left }}
          className="absolute top-full z-50 mt-2 w-[min(320px,calc(100vw-40px))] overflow-hidden rounded-md border border-gray-300 bg-white"
        >
          <div className="border-b border-gray-100 p-2.5">
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
                  aria-pressed={filter === value}
                  className={`h-6 rounded text-[11px] font-semibold transition-colors ${
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

          {/* 프로젝트가 많아도 이 영역만 스크롤한다 */}
          <div
            ref={listRef}
            style={{ maxHeight: panelPosition.listMaxHeight }}
            className="overflow-y-auto overscroll-contain p-2"
          >
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
                      {hasKeyword
                        ? "검색 결과가 없습니다."
                        : "프로젝트가 없습니다."}
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
                          aria-current={selected ? "true" : undefined}
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
                            {/* 헤더에서는 잘리는 긴 이름을 여기서는 줄바꿈해 전체를 보여 준다 */}
                            <span
                              className={`block text-[13px] font-semibold leading-5 [overflow-wrap:anywhere] ${
                                selected ? "text-[#4058D6]" : "text-gray-900"
                              }`}
                            >
                              {workspace.name}
                            </span>

                            <span className="block truncate text-[11px] text-gray-400">
                              {workspace.role?.toLowerCase() === "owner"
                                ? "OWNER"
                                : "MEMBER"}
                              {/* 작업 폴더 수는 화면마다 채워지지 않는 경우가 있어(일정 관리) 옛 사이드바처럼 역할과 종류만 보여 준다 */}
                              {" · "}
                              {isTeam ? "팀 프로젝트" : "개인 프로젝트"}
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
                closeMenu();
                router.push(allProjectsHref);
              }}
              className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-[#D9E1FF] bg-[#F7F9FF] text-xs font-semibold text-[#5873F9] transition-colors hover:bg-[#EEF3FF]"
            >
              전체 프로젝트 보기
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
