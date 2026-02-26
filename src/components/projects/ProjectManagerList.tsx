"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  MoreVertical,
  Settings,
  Trash2,
  Info,
  FolderOpen,
  UsersRound,
  UserRound,
  ChevronDown,
  Search,
  Filter,
} from "lucide-react";
import { WorkspaceSettingsModal } from "@/components/workspace/WorkspaceSettingsModal";
import { InviteMemberModal } from "@/components/workspace/InviteMemberModal";

/**
 * TODO (BACKEND)
 * - GET /api/workspaces (내가 참여 중인 워크스페이스/솔루션 목록)
 *   - team/personal 구분 포함
 *   - 각 workspace 안의 projects 목록 포함
 * - 정렬/필터/검색 쿼리 지원 권장:
 *   - /api/workspaces?mode=team|personal|all&search=...&sort=updatedAtDesc
 */

type Project = {
  id: string;
  name: string;
  language: string;
  updatedAt: string; // 2026.01.05
};

type Workspace = {
  id: string;
  name: string; // 솔루션/워크스페이스 이름
  mode: "team" | "personal";
  updatedAt: string; // 워크스페이스 기준 최근 변경일
  description?: string;
  teamName?: string; // team이면 표시용 (옵션)
  projects: Project[]; // 솔루션 안 여러 프로젝트
};

const MOCK: Workspace[] = [
  {
    id: "w1",
    name: "Team Alpha Solution",
    mode: "team",
    teamName: "Team Alpha",
    updatedAt: "2026.02.06",
    description: "팀 협업용 솔루션",
    projects: [
      {
        id: "p11",
        name: "Web IDE",
        language: "Next.js",
        updatedAt: "2026.02.06",
      },
      {
        id: "p12",
        name: "Sync Engine",
        language: "Yjs",
        updatedAt: "2026.02.05",
      },
      { id: "p13", name: "Docs", language: "MDX", updatedAt: "2026.02.04" },
    ],
  },
  {
    id: "w2",
    name: "My Personal Solution",
    mode: "personal",
    updatedAt: "2026.02.06",
    description: "개인 실험/토이 프로젝트 모음",
    projects: [
      {
        id: "p21",
        name: "Portfolio Website",
        language: "TypeScript",
        updatedAt: "2026.01.05",
      },
      {
        id: "p22",
        name: "VSIDE UI",
        language: "React",
        updatedAt: "2026.02.03",
      },
    ],
  },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function useOnClickOutside<T extends HTMLElement>(
  ref: React.RefObject<T>,
  handler: () => void,
) {
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      if (!ref.current) return;
      if (ref.current.contains(e.target as Node)) return;
      handler();
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

function ModePill({ mode }: { mode: "team" | "personal" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold",
        mode === "team"
          ? "bg-blue-50 text-blue-700"
          : "bg-emerald-50 text-emerald-700",
      )}
    >
      {mode === "team" ? "팀" : "개인"}
    </span>
  );
}

function WorkspaceIcon({ mode }: { mode: "team" | "personal" }) {
  return (
    <div
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-xl",
        mode === "team"
          ? "bg-blue-50 text-blue-700"
          : "bg-emerald-50 text-emerald-700",
      )}
    >
      {mode === "team" ? <UsersRound size={18} /> : <UserRound size={18} />}
    </div>
  );
}

function LanguageBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
      {value}
    </span>
  );
}

export function ProjectManagerList() {
  // TODO (BACKEND): MOCK -> fetch 결과로 교체
  const workspaces = useMemo(() => MOCK, []);

  // --------- 필터/검색/정렬 (프론트 데모) ---------
  const [modeFilter, setModeFilter] = useState<"all" | "team" | "personal">(
    "all",
  );
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({}); // workspace 접기/펼치기

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    const ws = workspaces
      .filter((w) => (modeFilter === "all" ? true : w.mode === modeFilter))
      .map((w) => {
        // workspace 이름이나 내부 project 이름으로 검색
        if (!q) return w;
        const hitWorkspace =
          w.name.toLowerCase().includes(q) ||
          (w.teamName ?? "").toLowerCase().includes(q);
        const hitProjects = w.projects.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.language.toLowerCase().includes(q),
        );
        if (hitWorkspace) return w;
        if (hitProjects.length) return { ...w, projects: hitProjects };
        return null;
      })
      .filter(Boolean) as Workspace[];

    // 정렬: 최근 수정 날짜 기준 (workspace)
    ws.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    return ws;
  }, [workspaces, modeFilter, query]);

  // --------- 점3개 메뉴 ---------
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  useOnClickOutside(menuRef, () => setOpenMenuId(null));

  // --------- 모달(워크스페이스 설정/팀원 초대) ---------
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [returnToSettingsAfterInvite, setReturnToSettingsAfterInvite] =
    useState(false);

  const [selected, setSelected] = useState<Workspace | null>(null);

  const openSettings = (w: Workspace) => {
    setSelected(w);
    setOpenMenuId(null);
    setSettingsOpen(true);
  };

  const openInviteOnly = () => {
    setReturnToSettingsAfterInvite(true);
    setSettingsOpen(false);
    setInviteOpen(true);
  };

  const closeInvite = () => {
    setInviteOpen(false);
    if (returnToSettingsAfterInvite) setSettingsOpen(true);
    setReturnToSettingsAfterInvite(false);
  };

  // ESC 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenuId(null);
        setInviteOpen(false);
        setSettingsOpen(false);
        setReturnToSettingsAfterInvite(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ✅ 모달 열릴 때 body 스크롤 잠금
  useEffect(() => {
    const isModalOpen = settingsOpen || inviteOpen;
    if (!isModalOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0)
      document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [settingsOpen, inviteOpen]);

  return (
    <>
      {/* 상단 컨트롤 바 */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="워크스페이스/프로젝트 검색"
              className="w-full md:w-72 rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          <div className="hidden md:flex items-center gap-2">
            <Filter size={16} className="text-gray-500" />
            <button
              type="button"
              onClick={() => setModeFilter("all")}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-semibold border",
                modeFilter === "all"
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
              )}
            >
              전체
            </button>
            <button
              type="button"
              onClick={() => setModeFilter("team")}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-semibold border",
                modeFilter === "team"
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
              )}
            >
              팀
            </button>
            <button
              type="button"
              onClick={() => setModeFilter("personal")}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-semibold border",
                modeFilter === "personal"
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
              )}
            >
              개인
            </button>
          </div>
        </div>

        {/* 모바일에서 필터 간단 버전 */}
        <div className="md:hidden">
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value as any)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">전체</option>
            <option value="team">팀</option>
            <option value="personal">개인</option>
          </select>
        </div>
      </div>

      {/* 그룹 뷰: 워크스페이스(솔루션) 단위 */}
      <div className="space-y-4">
        {filtered.map((w) => {
          const isCollapsed = collapsed[w.id] ?? false;

          return (
            <section
              key={w.id}
              className="rounded-2xl border border-gray-200 bg-white overflow-hidden"
            >
              {/* 워크스페이스 헤더(= 솔루션 헤더) */}
              <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <WorkspaceIcon mode={w.mode} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="truncate text-base font-extrabold text-gray-900">
                        {w.name}
                      </p>
                      <ModePill mode={w.mode} />
                      {w.mode === "team" && w.teamName ? (
                        <span className="text-xs font-semibold text-gray-500">
                          · {w.teamName}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-gray-500 truncate">
                      최근 수정: {w.updatedAt} · 프로젝트 {w.projects.length}개
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* 접기/펼치기 */}
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsed((cur) => ({ ...cur, [w.id]: !isCollapsed }))
                    }
                    className="rounded-xl p-2 hover:bg-gray-100 text-gray-700"
                    aria-label="접기/펼치기"
                  >
                    <ChevronDown
                      className={cn("transition", isCollapsed && "-rotate-90")}
                      size={18}
                    />
                  </button>

                  {/* 점3개 메뉴 (워크스페이스 단위로 유지) */}
                  <div
                    className="relative"
                    ref={openMenuId === w.id ? menuRef : null}
                  >
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100"
                      aria-label="워크스페이스 메뉴"
                      onClick={() =>
                        setOpenMenuId((cur) => (cur === w.id ? null : w.id))
                      }
                    >
                      <MoreVertical className="text-gray-600" size={18} />
                    </button>

                    {openMenuId === w.id && (
                      <div className="absolute right-0 top-10 z-20 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                        <button
                          type="button"
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                          onClick={() => {
                            setOpenMenuId(null);
                            // TODO (BACKEND): 워크스페이스 상세 페이지/모달
                            console.log("workspace detail:", w.id);
                          }}
                        >
                          <Info size={16} className="text-gray-500" />
                          워크스페이스 정보
                        </button>

                        <Link
                          href={`/workspace/${w.id}`}
                          className="block px-4 py-2.5 text-sm hover:bg-gray-50"
                          onClick={() => setOpenMenuId(null)}
                        >
                          <span className="flex items-center gap-2">
                            <FolderOpen size={16} className="text-gray-500" />
                            워크스페이스 열기
                          </span>
                        </Link>

                        <button
                          type="button"
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                          onClick={() => openSettings(w)}
                        >
                          <Settings size={16} className="text-gray-500" />
                          프로젝트 설정
                        </button>

                        <div className="h-px bg-gray-100" />

                        <button
                          type="button"
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-50 flex items-center gap-2 text-red-600"
                          onClick={() => {
                            setOpenMenuId(null);
                            /**
                             * TODO (BACKEND)
                             * - DELETE /api/workspaces/:id
                             * - (권장) 삭제 confirm 모달
                             */
                            console.log("delete workspace:", w.id);
                          }}
                        >
                          <Trash2 size={16} className="text-red-600" />
                          워크스페이스 삭제
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 워크스페이스 내부 프로젝트 리스트 */}
              {!isCollapsed ? (
                <div className="px-5 py-4">
                  <div className="space-y-2">
                    {w.projects.map((p) => (
                      <div
                        key={p.id}
                        className="rounded-2xl border border-gray-200 bg-white px-4 py-3 flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <Link
                              href={`/workspace/${w.id}/project/${p.id}`}
                              className="truncate font-semibold text-gray-900 hover:underline underline-offset-4"
                            >
                              {p.name}
                            </Link>
                            <LanguageBadge value={p.language} />
                          </div>
                          <p className="mt-1 text-sm text-gray-500">
                            최근 수정 날짜 : {p.updatedAt}
                          </p>
                        </div>

                        <Link
                          href={`/workspace/${w.id}/project/${p.id}`}
                          className="shrink-0 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          열기
                        </Link>
                      </div>
                    ))}
                  </div>

                  {/* TODO (BACKEND)
                      - 팀/개인 워크스페이스 안에 새 프로젝트 생성(솔루션 하위 프로젝트 추가)
                      - POST /api/workspaces/:id/projects
                  */}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      {/* ✅ 설정 모달 (워크스페이스 단위로 계속 사용) */}
      <WorkspaceSettingsModal
        open={settingsOpen}
        workspace={
          selected
            ? {
                id: selected.id,
                name: selected.name,
                description: selected.description ?? "",
              }
            : null
        }
        onClose={() => setSettingsOpen(false)}
        onClickInvite={openInviteOnly}
        onSave={(payload) => {
          /**
           * TODO (BACKEND)
           * PATCH /api/workspaces/:id
           * body: { name, description }
           */
          console.log("save settings:", payload);
          setSettingsOpen(false);
        }}
        onDelete={() => {
          /**
           * TODO (BACKEND)
           * DELETE /api/workspaces/:id
           */
          console.log("delete workspace:", selected?.id);
          setSettingsOpen(false);
          setInviteOpen(false);
          setReturnToSettingsAfterInvite(false);
        }}
      />

      {/* ✅ 초대 모달 (단독 표시, 닫으면 설정으로 복귀) */}
      <InviteMemberModal
        open={inviteOpen}
        workspaceId={selected?.id ?? ""}
        onClose={closeInvite}
        onSendInvite={(payload) => {
          /**
           * TODO (BACKEND)
           * POST /api/workspaces/:id/invites
           * body: { email, role }
           */
          console.log("send invite:", payload);
        }}
      />
    </>
  );
}
