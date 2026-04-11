"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { Search, Funnel } from "lucide-react";

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

  return (
    <main className="min-h-screen bg-[#F8F9FA] px-6 py-10 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5">
          <p className="text-sm font-medium text-gray-500">대시보드</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-gray-900">
            프로젝트 선택
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            확인할 프로젝트를 먼저 선택하세요.
          </p>
        </div>

        <section className="rounded-[18px] border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative w-full max-w-[420px]">
              <Search
                size={17}
                className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="프로젝트 검색"
                className="h-10 w-full rounded-[15px] border border-gray-200 bg-white pl-14 pr-4 text-md text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#5873F9] focus:ring-2 focus:ring-[#5873F9]/10"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="필터"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-gray-500 transition hover:bg-gray-50"
              >
                <Funnel size={17} strokeWidth={1.8} />
              </button>

              <div className="flex items-center gap-3">
                {FILTERS.map((item) => {
                  const active = filter === item.key;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setFilter(item.key)}
                      className={`h-8 rounded-full px-5 text-md font-medium transition-all md:text-md ${
                        active
                          ? "bg-[#0F1730] text-white shadow-sm"
                          : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6">
          {loading ? (
            <div className="flex h-64 items-center justify-center rounded-3xl border border-gray-200 bg-white text-sm text-gray-400">
              프로젝트를 불러오는 중입니다.
            </div>
          ) : error ? (
            <div className="flex h-64 items-center justify-center rounded-3xl border border-red-200 bg-red-50 text-sm text-red-500">
              {error}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex h-64 items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white text-sm text-gray-400">
              조건에 맞는 프로젝트가 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/dashboard/${project.id}?mode=${project.type}`}
                  className="group rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#5873F9]/40 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
                          {project.tech}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            project.type === "team"
                              ? "bg-blue-50 text-blue-600"
                              : "bg-purple-50 text-purple-600"
                          }`}
                        >
                          {project.type === "team"
                            ? "팀 프로젝트"
                            : "개인 프로젝트"}
                        </span>
                      </div>

                      <h2 className="mt-4 truncate text-xl font-bold text-gray-900 group-hover:text-[#5873F9]">
                        {project.title}
                      </h2>

                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">
                        {project.description}
                      </p>
                    </div>

                    <div className="shrink-0 rounded-2xl bg-[#F5F7FF] px-3 py-2 text-right">
                      <div className="text-[11px] font-medium text-gray-400">
                        진행률
                      </div>
                      <div className="text-lg font-black text-[#5873F9]">
                        {project.progress}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="text-gray-400">마지막 수정</span>
                      <span className="font-medium text-gray-600">
                        {project.lastModified}
                      </span>
                    </div>

                    <div className="h-2 w-full rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-[#5873F9]"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      {project.type === "team" ? "팀 작업" : "개인 작업"}
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-xl border border-[#D9E1FF] bg-[#F7F9FF] px-3 py-2 text-sm font-semibold text-[#5873F9]">
                      대시보드 보기
                      <span aria-hidden>→</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
