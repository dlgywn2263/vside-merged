"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Code2,
  FolderKanban,
  Funnel,
  LayoutDashboard,
  Plus,
  RefreshCw,
  Search,
  UserRound,
  Users,
} from "lucide-react";

const API_BASE = "http://localhost:8080";

type ProjectType = "personal" | "team";

type WorkspaceProject = {
  id: string;
  name: string;
  language: string;
  updatedAt: string;
};

type WorkspaceItem = {
  id: string;
  name: string;
  mode: ProjectType;
  updatedAt: string;
  description?: string | null;
  teamName?: string | null;
  projects: WorkspaceProject[];
};

type ScheduleProgressResponse = {
  workspaceId: string;
  workspaceName: string;
  type: string;
  totalCount: number;
  doneCount: number;
  progress: number;
};

type DashboardCardItem = {
  id: string;
  title: string;
  description: string;
  tech: string;
  type: ProjectType;
  progress: number;
  memberCount?: number;
  lastModified: string;
};

const FILTERS = [
  { key: "all", label: "전체" },
  { key: "team", label: "팀" },
  { key: "personal", label: "개인" },
] as const;

type FilterType = (typeof FILTERS)[number]["key"];

function getStoredUserId(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const rawUser = localStorage.getItem("user");
    if (rawUser) {
      const parsedUser = JSON.parse(rawUser);
      const userId = parsedUser?.id;

      if (userId !== undefined && userId !== null && userId !== "") {
        return String(userId);
      }
    }

    const userId = localStorage.getItem("userId");
    return userId ? String(userId) : null;
  } catch {
    const userId = localStorage.getItem("userId");
    return userId ? String(userId) : null;
  }
}

function getAuthHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};

  const token =
    localStorage.getItem("accessToken") || localStorage.getItem("token");

  if (!token) return {};

  return {
    Authorization: `Bearer ${token}`,
  };
}

function formatDate(value: string) {
  if (!value || value === "-") return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");

  return `${year}.${month}.${day}`;
}

function getTypeLabel(type: ProjectType) {
  return type === "team" ? "팀 프로젝트" : "개인 프로젝트";
}

function getTypeStyle(type: ProjectType) {
  return type === "team"
    ? "bg-emerald-50 text-emerald-700"
    : "bg-blue-50 text-blue-700";
}

export default function DashboardProjectSelectPage() {
  /* =========================
     1. 기본 상태 관리
  ========================= */
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [projects, setProjects] = useState<DashboardCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboardProjects();
  }, []);

  /* =========================
     2. 프로젝트 + 진행률 조회
     - 워크스페이스 목록 조회
     - 각 워크스페이스의 일정 진행률 조회
     - 대시보드 카드 데이터로 병합
  ========================= */
  async function loadDashboardProjects() {
    try {
      setLoading(true);
      setError("");

      const userId = getStoredUserId();
      if (!userId) {
        setProjects([]);
        setError("로그인 사용자 정보가 없습니다.");
        return;
      }

      const workspaceRes = await fetch(
        `${API_BASE}/api/workspaces?userId=${encodeURIComponent(userId)}`,
        {
          method: "GET",
          headers: {
            ...getAuthHeaders(),
          },
          cache: "no-store",
        },
      );

      if (!workspaceRes.ok) {
        const text = await workspaceRes.text();
        throw new Error(text || "워크스페이스 목록 조회에 실패했습니다.");
      }

      const workspaces: WorkspaceItem[] = await workspaceRes.json();
      const workspaceList = Array.isArray(workspaces) ? workspaces : [];

      const progressResults = await Promise.all(
        workspaceList.map(async (workspace) => {
          try {
            const progressRes = await fetch(
              `${API_BASE}/api/schedules/progress?view=${encodeURIComponent(
                workspace.mode,
              )}&workspaceId=${encodeURIComponent(workspace.id)}`,
              {
                method: "GET",
                headers: {
                  ...getAuthHeaders(),
                },
                cache: "no-store",
              },
            );

            if (!progressRes.ok) {
              return {
                workspaceId: workspace.id,
                workspaceName: workspace.name,
                type: workspace.mode,
                totalCount: 0,
                doneCount: 0,
                progress: 0,
              } satisfies ScheduleProgressResponse;
            }

            return (await progressRes.json()) as ScheduleProgressResponse;
          } catch {
            return {
              workspaceId: workspace.id,
              workspaceName: workspace.name,
              type: workspace.mode,
              totalCount: 0,
              doneCount: 0,
              progress: 0,
            } satisfies ScheduleProgressResponse;
          }
        }),
      );

      const progressMap = new Map<string, ScheduleProgressResponse>();
      progressResults.forEach((item) => {
        progressMap.set(item.workspaceId, item);
      });

      const merged: DashboardCardItem[] = workspaceList.map((workspace) => {
        const latestProject =
          Array.isArray(workspace.projects) && workspace.projects.length > 0
            ? workspace.projects[0]
            : null;

        const progressInfo = progressMap.get(workspace.id);

        return {
          id: workspace.id,
          title: workspace.name,
          description: workspace.description?.trim() || "설명이 없습니다.",
          tech: latestProject?.language || "-",
          type: workspace.mode,
          progress: progressInfo?.progress ?? 0,
          lastModified: workspace.updatedAt || "-",
          memberCount: undefined,
        };
      });

      setProjects(merged);
    } catch (err) {
      console.error(err);
      setProjects([]);
      setError(
        err instanceof Error
          ? err.message
          : "대시보드 프로젝트 목록 조회 중 오류가 발생했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     3. 필터링 / 통계 계산
  ========================= */
  const filteredProjects = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesFilter = filter === "all" || project.type === filter;

      const matchesSearch =
        keyword === "" ||
        project.title.toLowerCase().includes(keyword) ||
        project.description.toLowerCase().includes(keyword) ||
        project.tech.toLowerCase().includes(keyword);

      return matchesFilter && matchesSearch;
    });
  }, [filter, search, projects]);

  const totalCount = projects.length;
  const teamCount = projects.filter(
    (project) => project.type === "team",
  ).length;
  const personalCount = projects.filter(
    (project) => project.type === "personal",
  ).length;
  const averageProgress =
    totalCount === 0
      ? 0
      : Math.round(
          projects.reduce((sum, project) => sum + project.progress, 0) /
            totalCount,
        );

  const topProject =
    projects.length > 0
      ? [...projects].sort((a, b) => b.progress - a.progress)[0]
      : null;

  return (
    <main className="min-h-screen bg-[#f5f6fa] px-6 py-10 text-slate-900 md:px-8">
      <div className="mx-auto flex max-w-[1480px] flex-col gap-6">
        {/* =========================
            4. 상단 히어로 영역
            - 기존 단순 제목/필터를 일정관리·개발일지 스타일 카드형으로 재구성
        ========================= */}
        <section className="rounded-[30px] border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
            <div>
              <p className="text-sm font-bold text-blue-600">Dashboard</p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                프로젝트 선택
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                확인할 프로젝트를 선택하면 해당 프로젝트의 일정, 개발일지,
                진행률을 기준으로 대시보드가 열립니다.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={loadDashboardProjects}
                className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw size={16} />
                새로고침
              </button>

              <Link
                href="/new/workspace"
                className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700"
              >
                <Plus size={17} />새 프로젝트 생성
              </Link>
            </div>
          </div>

          {/* 상단 통계 카드 */}
          <div className="mt-3 grid gap-4 md:grid-cols-4">
            <SummaryCard
              title="전체 프로젝트"
              value={`${totalCount}개`}
              icon={<FolderKanban size={20} />}
            />
            <SummaryCard
              title="팀 프로젝트"
              value={`${teamCount}개`}
              icon={<Users size={20} />}
            />
            <SummaryCard
              title="개인 프로젝트"
              value={`${personalCount}개`}
              icon={<UserRound size={20} />}
            />
            <SummaryCard
              title="평균 진행률"
              value={`${averageProgress}%`}
              icon={<Activity size={20} />}
              subText={topProject ? `최고 진행: ${topProject.title}` : "-"}
            />
          </div>

          {/* 평균 진행률 바 */}
          {/* <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>전체 프로젝트 평균 진행률</span>
              <span>{averageProgress}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{ width: `${averageProgress}%` }}
              />
            </div>
          </div> */}
        </section>

        {/* =========================
            5. 검색 / 필터 패널
            - 기존 긴 필터 박스를 더 얇고 정돈된 툴바로 변경
        ========================= */}
        <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-black">프로젝트 목록</h2>
              <p className="mt-1 text-sm text-slate-500">
                프로젝트 유형이나 이름, 기술 스택으로 빠르게 찾을 수 있습니다.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 xl:w-auto xl:flex-row xl:items-center">
              <div className="relative w-full xl:w-[440px]">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="프로젝트 검색"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div className="flex items-center gap-2 rounded-2xl bg-slate-100 p-1">
                {FILTERS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilter(item.key)}
                    className={`h-10 rounded-xl px-5 text-sm font-black transition ${
                      filter === item.key
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5">
              <Funnel size={13} /> 현재 필터
            </span>
            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-blue-700">
              {FILTERS.find((item) => item.key === filter)?.label ?? "전체"}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5">
              표시 {filteredProjects.length}개 / 전체 {totalCount}개
            </span>
          </div>
        </section>

        {/* =========================
            6. 상태 영역
        ========================= */}
        {error && (
          <section className="rounded-[24px] border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700">
            {error}
          </section>
        )}

        {loading && (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <ProjectCardSkeleton key={index} />
            ))}
          </section>
        )}

        {!loading && !error && filteredProjects.length === 0 && (
          <section className="rounded-[28px] border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
              <Search size={24} />
            </div>
            <h2 className="mt-5 text-xl font-black">검색 결과가 없습니다</h2>
            <p className="mt-2 text-sm text-slate-500">
              다른 키워드로 검색하거나 필터를 전체로 변경해보세요.
            </p>
          </section>
        )}

        {/* =========================
            7. 프로젝트 카드 목록
            - 카드 자체는 기존 장점 유지
            - 정보 위계와 버튼 정렬만 개선
        ========================= */}
        {!loading && !error && filteredProjects.length > 0 && (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredProjects.map((project) => (
              <ProjectDashboardCard key={project.id} project={project} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  subText,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  subText?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-500">{title}</p>
        <div className="text-slate-500">{icon}</div>
      </div>
      <p className="mt-4 text-2xl font-black text-slate-950">{value}</p>
      {subText && (
        <p className="mt-1 truncate text-xs text-slate-500">{subText}</p>
      )}
    </div>
  );
}

function ProjectDashboardCard({ project }: { project: DashboardCardItem }) {
  return (
    <article className="group rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-700">
            {project.tech || "-"}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-black ${getTypeStyle(
              project.type,
            )}`}
          >
            {getTypeLabel(project.type)}
          </span>
        </div>

        <div className="shrink-0 rounded-2xl bg-blue-50 px-4 py-3 text-right">
          <p className="text-[11px] font-bold text-slate-400">진행률</p>
          <p className="mt-0.5 text-xl font-black text-blue-600">
            {project.progress}%
          </p>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="line-clamp-1 text-xl font-black tracking-tight text-slate-950">
          {project.title}
        </h3>
        <p className="mt-3 line-clamp-2 min-h-[44px] text-sm leading-6 text-slate-500">
          {project.description}
        </p>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>마지막 수정</span>
          <span>{formatDate(project.lastModified)}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-blue-600 transition-all"
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          {project.type === "team" ? (
            <Users size={16} />
          ) : (
            <UserRound size={16} />
          )}
          <span>{project.type === "team" ? "팀 작업" : "개인 작업"}</span>
        </div>

        <Link
          href={`/dashboard/${project.id}?mode=${project.type}`}
          className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 text-sm font-black text-blue-700 transition hover:bg-blue-600 hover:text-white"
        >
          대시보드 보기
          <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  );
}

function ProjectCardSkeleton() {
  return (
    <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="h-7 w-28 animate-pulse rounded-full bg-slate-100" />
        <div className="h-14 w-16 animate-pulse rounded-2xl bg-slate-100" />
      </div>
      <div className="mt-6 h-6 w-2/3 animate-pulse rounded-lg bg-slate-100" />
      <div className="mt-4 h-4 w-full animate-pulse rounded-lg bg-slate-100" />
      <div className="mt-2 h-4 w-3/4 animate-pulse rounded-lg bg-slate-100" />
      <div className="mt-6 h-2 w-full animate-pulse rounded-full bg-slate-100" />
      <div className="mt-6 flex justify-between">
        <div className="h-5 w-20 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-11 w-32 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    </div>
  );
}
