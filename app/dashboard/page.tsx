"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";
import { Search, Funnel } from "lucide-react";

type ProjectType = "personal" | "team";

type ProjectItem = {
  id: string;
  title: string;
  description: string;
  tech: string;
  type: ProjectType;
  progress: number;
  memberCount?: number;
  lastModified: string;
};

const PROJECTS: ProjectItem[] = [
  {
    id: "p-001",
    title: "Portfolio Website",
    description: "개인 포트폴리오 페이지 리뉴얼 작업",
    tech: "TypeScript",
    type: "personal",
    progress: 85,
    lastModified: "1시간 전",
  },
  {
    id: "p-002",
    title: "VSIDE Dashboard",
    description: "대시보드 정보 구조와 위젯 구성 개선",
    tech: "Next.js",
    type: "team",
    progress: 36,
    memberCount: 4,
    lastModified: "2026.02.06",
  },
  {
    id: "p-003",
    title: "Together Project",
    description: "협업용 프로젝트 구조 정리 및 연결",
    tech: "Vue.js",
    type: "team",
    progress: 100,
    memberCount: 5,
    lastModified: "2026.02.05",
  },
  {
    id: "p-004",
    title: "개인 블로그 마이그레이션",
    description: "기존 블로그에서 새 구조로 이전",
    tech: "React",
    type: "personal",
    progress: 15,
    lastModified: "2026.02.01",
  },
  {
    id: "p-005",
    title: "Admin Dashboard 리팩토링",
    description: "관리자 화면 UI/상태 구조 정리",
    tech: "React",
    type: "team",
    progress: 54,
    memberCount: 3,
    lastModified: "2026.02.07",
  },
  {
    id: "p-006",
    title: "캘린더 UI 개선",
    description: "일정 보기 경험과 시각 표현 개선",
    tech: "Next.js",
    type: "personal",
    progress: 72,
    lastModified: "2026.02.08",
  },
];

const FILTERS = [
  { key: "all", label: "전체" },
  { key: "team", label: "팀" },
  { key: "personal", label: "개인" },
] as const;

type FilterType = (typeof FILTERS)[number]["key"];

export default function DashboardProjectSelectPage() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");

  const filteredProjects = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return PROJECTS.filter((project) => {
      const matchesFilter = filter === "all" || project.type === filter;

      const matchesSearch =
        keyword === "" ||
        project.title.toLowerCase().includes(keyword) ||
        project.description.toLowerCase().includes(keyword) ||
        project.tech.toLowerCase().includes(keyword);

      return matchesFilter && matchesSearch;
    });
  }, [filter, search]);

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
          {filteredProjects.length === 0 ? (
            <div className="flex h-64 items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white text-sm text-gray-400">
              조건에 맞는 프로젝트가 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/dashboard/${project.id}`}
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
                      {project.type === "team"
                        ? `팀원 ${project.memberCount ?? 0}명`
                        : "개인 작업"}
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
