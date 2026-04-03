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

const API_BASE = "http://localhost:8080";

type Project = {
  id: string;
  name: string;
  language: string;
  updatedAt: string;
};

type Workspace = {
  id: string;
  name: string;
  mode: "team" | "personal";
  updatedAt: string;
  description?: string | null;
  teamName?: string | null;
  projects: Project[];
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/**
 * 바깥 클릭 감지 훅
 */
function useOnClickOutside<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  handler: () => void,
) {
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      const target = e.target as Node | null;

      if (!ref.current || !target) return;
      if (ref.current.contains(target)) return;

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
  // ----------------------------
  // 서버 데이터 상태
  // ----------------------------
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ----------------------------
  // 필터 / 검색 / 접기
  // ----------------------------
  const [modeFilter, setModeFilter] = useState<"all" | "team" | "personal">(
    "all",
  );
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // ----------------------------
  // 점3개 메뉴
  // ----------------------------
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  useOnClickOutside(menuRef, () => setOpenMenuId(null));

  // ----------------------------
  // 모달 상태
  // ----------------------------
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [returnToSettingsAfterInvite, setReturnToSettingsAfterInvite] =
    useState(false);
  const [selected, setSelected] = useState<Workspace | null>(null);

  /**
   * localStorage에서 user 정보 읽기
   * - user.id를 백엔드 userId 쿼리파라미터로 사용
   */
  function getStoredUserId(): string | null {
    if (typeof window === "undefined") return null;

    try {
      const rawUser = localStorage.getItem("user");
      if (!rawUser) return null;

      const parsedUser = JSON.parse(rawUser);
      const userId = parsedUser?.id;

      if (userId === undefined || userId === null || userId === "") {
        return null;
      }

      return String(userId);
    } catch (e) {
      console.error("localStorage user 파싱 실패:", e);
      return null;
    }
  }

  /**
   * accessToken이 있으면 Authorization 헤더 추가
   * 없더라도 현재 백엔드가 userId 기반 조회라면 조회는 가능
   */
  function getAuthHeaders(): HeadersInit {
    if (typeof window === "undefined") return {};

    const token = localStorage.getItem("accessToken");
    if (!token) return {};

    return {
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * 프로젝트 목록 조회
   */
  async function loadWorkspaces() {
    try {
      setLoading(true);
      setError("");

      const userId = getStoredUserId();

      if (!userId) {
        setWorkspaces([]);
        setError("로그인 사용자 정보가 없습니다.");
        return;
      }

      const response = await fetch(
        `${API_BASE}/api/workspaces?userId=${encodeURIComponent(userId)}`,
        {
          method: "GET",
          headers: {
            ...getAuthHeaders(),
          },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "프로젝트 목록 조회에 실패했습니다.");
      }

      const data: Workspace[] = await response.json();
      setWorkspaces(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setWorkspaces([]);
      setError(
        err instanceof Error
          ? err.message
          : "프로젝트 목록 조회 중 오류가 발생했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWorkspaces();
  }, []);

  /**
   * 검색 + 모드 필터
   * - 백엔드에서 일단 전체 목록 받아와서 프론트에서 필터링
   */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    const ws = workspaces
      .filter((w) => (modeFilter === "all" ? true : w.mode === modeFilter))
      .map((w) => {
        if (!q) return w;

        const hitWorkspace =
          w.name.toLowerCase().includes(q) ||
          (w.teamName ?? "").toLowerCase().includes(q) ||
          (w.description ?? "").toLowerCase().includes(q);

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

    ws.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    return ws;
  }, [workspaces, modeFilter, query]);

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

  /**
   * 팀원 초대 API 연결
   * 백엔드: POST /api/workspaces/invite
   * body: { workspaceId, email }
   */
  async function handleInviteMember(payload: { email: string }) {
    try {
      if (!selected?.id) {
        throw new Error("선택된 프로젝트가 없습니다.");
      }

      const response = await fetch(`${API_BASE}/api/workspaces/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          workspaceId: selected.id,
          email: payload.email,
        }),
      });

      const text = await response.text();

      if (!response.ok) {
        throw new Error(text || "팀원 초대에 실패했습니다.");
      }

      alert(text || "팀원에게 초대가 발송되었습니다.");
      closeInvite();
    } catch (err) {
      console.error(err);
      alert(
        err instanceof Error
          ? err.message
          : "팀원 초대 중 오류가 발생했습니다.",
      );
    }
  }

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

  // 모달 열릴 때 body 스크롤 잠금
  useEffect(() => {
    const isModalOpen = settingsOpen || inviteOpen;
    if (!isModalOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

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
              placeholder="프로젝트 검색"
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200 md:w-72"
            />
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <Filter size={16} className="text-gray-500" />
            <button
              type="button"
              onClick={() => setModeFilter("all")}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-semibold",
                modeFilter === "all"
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
              )}
            >
              전체
            </button>
            <button
              type="button"
              onClick={() => setModeFilter("team")}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-semibold",
                modeFilter === "team"
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
              )}
            >
              팀
            </button>
            <button
              type="button"
              onClick={() => setModeFilter("personal")}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-semibold",
                modeFilter === "personal"
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
              )}
            >
              개인
            </button>
          </div>
        </div>

        {/* 모바일 필터 */}
        <div className="md:hidden">
          <select
            value={modeFilter}
            onChange={(e) =>
              setModeFilter(e.target.value as "all" | "team" | "personal")
            }
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">전체</option>
            <option value="team">팀</option>
            <option value="personal">개인</option>
          </select>
        </div>
      </div>

      {/* 로딩 / 에러 */}
      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-8 text-center text-sm text-gray-500">
          프로젝트를 불러오는 중입니다...
        </div>
      ) : null}

      {!loading && error ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      {!loading && !error && filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-8 text-center text-sm text-gray-500">
          표시할 프로젝트가 없습니다.
        </div>
      ) : null}

      {/* 프로젝트 그룹 목록 */}
      {!loading && filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((w) => {
            const isCollapsed = collapsed[w.id] ?? false;

            return (
              <section
                key={w.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white"
              >
                {/* 헤더 */}
                <div className="flex items-center justify-between gap-4 border-b border-gray-200 bg-gray-50 px-5 py-4">
                  <div className="flex min-w-0 items-center gap-4">
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

                      <p className="mt-1 truncate text-sm text-gray-500">
                        최근 수정: {w.updatedAt}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* 접기 / 펼치기 */}
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsed((cur) => ({
                          ...cur,
                          [w.id]: !isCollapsed,
                        }))
                      }
                      className="rounded-xl p-2 text-gray-700 hover:bg-gray-100"
                      aria-label="접기/펼치기"
                    >
                      <Link
                        href={`/workspace/${w.id}`}
                        className="shrink-0 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        열기
                      </Link>
                    </button>

                    {/* 점3개 메뉴 */}
                    <div
                      className="relative"
                      ref={openMenuId === w.id ? menuRef : null}
                    >
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100"
                        aria-label="프로젝트 메뉴"
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
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-gray-50"
                            onClick={() => {
                              setOpenMenuId(null);
                              console.log("workspace detail:", w.id);
                            }}
                          >
                            <Info size={16} className="text-gray-500" />
                            프로젝트 정보
                          </button>

                          <Link
                            href={`/workspace/${w.id}`}
                            className="block px-4 py-2.5 text-sm hover:bg-gray-50"
                            onClick={() => setOpenMenuId(null)}
                          >
                            <span className="flex items-center gap-2">
                              <FolderOpen size={16} className="text-gray-500" />
                              프로젝트 열기
                            </span>
                          </Link>

                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-gray-50"
                            onClick={() => openSettings(w)}
                          >
                            <Settings size={16} className="text-gray-500" />
                            프로젝트 설정
                          </button>

                          <div className="h-px bg-gray-100" />

                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setOpenMenuId(null);
                              console.log("delete workspace:", w.id);
                            }}
                          >
                            <Trash2 size={16} className="text-red-600" />
                            프로젝트 삭제
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 내부 프로젝트 리스트 */}
                {/* {!isCollapsed ? (
                  <div className="px-5 py-4">
                    {w.projects.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                        아직 프로젝트가 없습니다.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {w.projects.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-3"
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

                            
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null} */}
              </section>
            );
          })}
        </div>
      ) : null}

      {/* 설정 모달 */}
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
          // 아직 PATCH API 미연결
          console.log("save settings:", payload);
          setSettingsOpen(false);
        }}
        onDelete={() => {
          // 아직 DELETE API 미연결
          console.log("delete workspace:", selected?.id);
          setSettingsOpen(false);
          setInviteOpen(false);
          setReturnToSettingsAfterInvite(false);
        }}
      />

      {/* 초대 모달 */}
      <InviteMemberModal
        open={inviteOpen}
        workspaceId={selected?.id ?? ""}
        onClose={closeInvite}
        onSendInvite={handleInviteMember}
      />
    </>
  );
}
