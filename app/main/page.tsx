"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpenText,
  CalendarDays,
  Code2,
  LayoutDashboard,
  Plus,
  RefreshCw,
  Search,
  UserRound,
  Users,
} from "lucide-react";

import {
  getAivsHref,
  getDevlogHref,
  getScheduleHref,
} from "@/components/main-dashboard/dashboard.utils";

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
  projects?: WorkspaceProject[];
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

/* =========================
   프로젝트 메인 대시보드 경로
   - IDE / 일정관리 / 개발일지는 dashboard.utils 함수 사용
========================= */
function getDashboardHref(project: DashboardCardItem) {
  return `/main/${project.id}?mode=${project.type}`;
}

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

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

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

function getProgressTextStyle(type: ProjectType) {
  return type === "team" ? "text-emerald-600" : "text-blue-600";
}

function getProgressBarStyle(type: ProjectType) {
  return type === "team" ? "bg-emerald-500" : "bg-blue-600";
}

export default function DashboardProjectSelectPage() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [projects, setProjects] = useState<DashboardCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboardProjects();
  }, []);

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
          title: latestProject?.name || workspace.name || "이름 없는 프로젝트",
          description: workspace.description?.trim() || "설명이 없습니다.",
          tech: latestProject?.language || "-",
          type: workspace.mode,
          progress: progressInfo?.progress ?? 0,
          lastModified: workspace.updatedAt || latestProject?.updatedAt || "-",
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

  return (
    <main className="min-h-screen bg-[#f5f6fa] px-6 py-6 text-slate-900 md:px-8">
      <div className="mx-auto flex max-w-[1480px] flex-col gap-5">
        {/* =========================
            상단 프로젝트 선택 패널
        ========================= */}
        <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-950">
                  프로젝트 선택
                </h1>

                <p className="mt-1.5 text-sm font-medium text-slate-500">
                  작업할 프로젝트를 선택하거나 바로 IDE, 일정관리, 개발일지로
                  이동할 수 있습니다.
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={loadDashboardProjects}
                  className="flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  <RefreshCw size={16} />
                  새로고침
                </button>

                <Link
                  href="/new/workspace"
                  className="flex h-10 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700"
                >
                  <Plus size={17} />새 프로젝트 생성
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-500">
              <SummaryChip label="전체" value={`${totalCount}개`} />
              <span className="text-slate-300">·</span>
              <SummaryChip label="팀" value={`${teamCount}개`} />
              <span className="text-slate-300">·</span>
              <SummaryChip label="개인" value={`${personalCount}개`} />
              <span className="text-slate-300">·</span>
              <SummaryChip label="평균 진행률" value={`${averageProgress}%`} />
              <span className="text-slate-300">·</span>
              <span className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-500">
                표시 {filteredProjects.length}개 / 전체 {totalCount}개
              </span>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-[620px]">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="프로젝트 검색"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div className="flex w-full items-center rounded-2xl bg-slate-100 p-1 lg:w-auto">
                {FILTERS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilter(item.key)}
                    className={`h-9 flex-1 rounded-xl px-5 text-sm font-black transition lg:flex-none ${
                      filter === item.key
                        ? "bg-slate-950 text-white shadow-sm"
                        : "text-slate-500 hover:bg-white hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

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

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span>{label}</span>
      <span className="font-black text-slate-950">{value}</span>
    </span>
  );
}

function ProjectDashboardCard({ project }: { project: DashboardCardItem }) {
  return (
    <article className="group flex min-h-[320px] flex-col rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-black ${getTypeStyle(
              project.type,
            )}`}
          >
            {getTypeLabel(project.type)}
          </span>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
            {project.tech}
          </span>
        </div>

        <div className="shrink-0 rounded-2xl bg-slate-50 px-3.5 py-2.5 text-right">
          <p className="text-[11px] font-bold text-slate-400">진행률</p>
          <p
            className={`mt-0.5 text-xl font-black ${getProgressTextStyle(
              project.type,
            )}`}
          >
            {project.progress}%
          </p>
        </div>
      </div>

      <div className="mt-5 flex-1">
        <h3 className="line-clamp-1 text-xl font-black tracking-tight text-slate-950 group-hover:text-blue-600">
          {project.title}
        </h3>

        <p className="mt-3 line-clamp-2 min-h-[44px] text-sm leading-6 text-slate-500">
          {project.description}
        </p>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>최근 수정일</span>
          <span>{formatDate(project.lastModified)}</span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all ${getProgressBarStyle(
              project.type,
            )}`}
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-500">
        {project.type === "team" ? (
          <Users size={16} />
        ) : (
          <UserRound size={16} />
        )}
        <span>{project.type === "team" ? "팀 작업" : "개인 작업"}</span>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="grid grid-cols-2 gap-2">
          <CardActionLink
            href={getDashboardHref(project)}
            icon={<LayoutDashboard size={15} />}
            label="프로젝트 열기"
            primary
          />

          <CardActionLink
            href={getAivsHref(project.id, project.type)}
            icon={<Code2 size={15} />}
            label="IDE"
          />

          <CardActionLink
            href={getScheduleHref(project.id, project.type)}
            icon={<CalendarDays size={15} />}
            label="일정관리"
          />

          <CardActionLink
            href={getDevlogHref(project.id)}
            icon={<BookOpenText size={15} />}
            label="개발일지"
          />
        </div>
      </div>
    </article>
  );
}

function CardActionLink({
  href,
  icon,
  label,
  primary = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex h-10 items-center justify-center gap-1.5 rounded-2xl text-xs font-black transition ${
        primary
          ? "bg-blue-600 text-white hover:bg-blue-700"
          : "border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
      }`}
    >
      {icon}
      <span>{label}</span>
      {primary && <ArrowRight size={14} />}
    </Link>
  );
}

function ProjectCardSkeleton() {
  return (
    <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="h-7 w-28 animate-pulse rounded-full bg-slate-100" />
        <div className="h-14 w-16 animate-pulse rounded-2xl bg-slate-100" />
      </div>

      <div className="mt-6 h-6 w-2/3 animate-pulse rounded-lg bg-slate-100" />
      <div className="mt-4 h-4 w-full animate-pulse rounded-lg bg-slate-100" />
      <div className="mt-2 h-4 w-3/4 animate-pulse rounded-lg bg-slate-100" />
      <div className="mt-6 h-2 w-full animate-pulse rounded-full bg-slate-100" />

      <div className="mt-6 grid grid-cols-2 gap-2">
        <div className="h-10 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-10 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-10 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-10 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    </div>
  );
}
