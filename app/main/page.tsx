"use client";

import { SchedulePreview } from "@/components/dashboard/SchedulePreview";
import { DevlogPreview } from "@/components/dashboard/DevlogPreview";
import Link from "next/link";
import React, { useMemo } from "react";
import { ArrowRight } from "lucide-react";

// --- Mock Data ---
const SUMMARY_STATS = [
  {
    id: 1,
    title: "개인 프로젝트",
    count: 2,
    label: "최근 30일 +1",
    icon: "user",
  },
  {
    id: 2,
    title: "팀 프로젝트",
    count: 4,
    label: "최근 30일 +1",
    icon: "users",
  },
  { id: 3, title: "예정 일정", count: 4, label: "7일 내", icon: "calendar" },
  {
    id: 4,
    title: "미확인 알림",
    count: 3,
    label: "우선 확인 필요",
    icon: "bell",
  },
];

const PROJECTS = [
  {
    id: 1,
    title: "Portfolio Website",
    tech: "TypeScript",
    type: "personal",
    progress: 85,
    lastModified: "1시간 전",
  },
  {
    id: 2,
    title: "VSIDE Dashboard",
    tech: "Next.js",
    type: "team",
    progress: 36,
    lastModified: "2026.02.06",
  },
  {
    id: 3,
    title: "Together Project",
    tech: "Vue.js",
    type: "team",
    progress: 100,
    lastModified: "2026.02.05",
  },
  {
    id: 4,
    title: "개인 블로그 마이그레이션",
    tech: "React",
    type: "personal",
    progress: 15,
    lastModified: "2026.02.01",
  },
  {
    id: 5,
    title: "Admin Dashboard 리팩토링",
    tech: "React",
    type: "team",
    progress: 54,
    lastModified: "2026.02.07",
  },
  {
    id: 6,
    title: "캘린더 UI 개선",
    tech: "Next.js",
    type: "personal",
    progress: 72,
    lastModified: "2026.02.08",
  },
  {
    id: 7,
    title: "알림 시스템 고도화",
    tech: "Spring",
    type: "team",
    progress: 41,
    lastModified: "2026.02.09",
  },
  {
    id: 8,
    title: "워크스페이스 구조 설계",
    tech: "TypeScript",
    type: "team",
    progress: 63,
    lastModified: "2026.02.10",
  },
  {
    id: 9,
    title: "개발일지 자동화",
    tech: "React",
    type: "personal",
    progress: 28,
    lastModified: "2026.02.11",
  },
  {
    id: 10,
    title: "프로젝트 권한 처리",
    tech: "Java",
    type: "team",
    progress: 80,
    lastModified: "2026.02.12",
  },
];

// 최근 몇 개만 보여줄지
const MAX_RECENT_PROJECTS = 4;

// --- Icons (SVG) ---
const Icons = {
  user: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  users: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  calendar: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  bell: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  plus: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  arrowRight: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
};

type ProjectType = (typeof PROJECTS)[number];

function parseLastModified(value: string) {
  if (value.includes("시간 전")) {
    const hours = Number(value.replace("시간 전", "").trim()) || 0;
    return Date.now() - hours * 60 * 60 * 1000;
  }

  if (value.includes("분 전")) {
    const minutes = Number(value.replace("분 전", "").trim()) || 0;
    return Date.now() - minutes * 60 * 1000;
  }

  if (value.includes("일 전")) {
    const days = Number(value.replace("일 전", "").trim()) || 0;
    return Date.now() - days * 24 * 60 * 60 * 1000;
  }

  const normalized = value.replace(/\./g, "-");
  const parsed = new Date(normalized).getTime();

  return Number.isNaN(parsed) ? 0 : parsed;
}

export default function MainDashboard() {
  const recentProjects = useMemo(() => {
    return [...PROJECTS]
      .sort(
        (a, b) =>
          parseLastModified(b.lastModified) - parseLastModified(a.lastModified),
      )
      .slice(0, MAX_RECENT_PROJECTS);
  }, []);

  return (
    <main className="min-h-screen bg-[#F8F9FA] p-5 md:p-8 font-sans text-gray-800">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* 1. Compact Hero Banner */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1.5">
              <div className="h-9 w-9 rounded-xl bg-[#EEF2FF] text-[#5873F9] flex items-center justify-center font-black text-base">
                V
              </div>
              <div>
                <h1 className="text-xl md:text-xl font-black text-[#5873F9] tracking-tight leading-none">
                  VSIDE
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                  프로젝트 구조 중심 협업을 위한 웹 IDE 플랫폼
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto">
            <Link
              href="/projects"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D9E1FF] bg-[#F7F9FF] px-4 py-2.5 text-sm font-semibold text-[#5873F9] hover:bg-[#EEF3FF] transition-colors"
            >
              프로젝트 둘러보기
              <ArrowRight size={17} />
            </Link>

            <Link
              href="/new/workspace"
              className="inline-flex items-center justify-center gap-2 bg-[#5873F9] hover:bg-[#4863E8] transition-colors text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm"
            >
              새 프로젝트 생성
              <Icons.plus />
            </Link>
          </div>
        </section>

        {/* 2. Summary Stats - smaller */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {SUMMARY_STATS.map((stat) => {
            const Icon = Icons[stat.icon as keyof typeof Icons];

            return (
              <div
                key={stat.id}
                className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 px-4 py-3.5 min-h-[106px]"
              >
                <div className="flex items-start justify-between mb-2.5">
                  <h3 className="text-[13px] font-semibold text-gray-600 leading-none">
                    {stat.title}
                  </h3>
                  <div className="text-gray-400 mt-0.5">
                    <Icon />
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className="text-[30px] leading-none font-black text-gray-900">
                    {stat.count}
                  </span>
                  <span className="text-[11px] text-gray-400 font-medium mt-1.5">
                    {stat.label}
                  </span>
                </div>
              </div>
            );
          })}
        </section>

        {/* 3. Recent Projects - filter/scroll removed */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-gray-900">최근 프로젝트</h2>
            <p className="text-sm text-gray-500 mt-1">
              최근에 수정한 프로젝트만 빠르게 확인하세요.
            </p>
          </div>

          {recentProjects.length === 0 ? (
            <div className="h-[220px] rounded-2xl border border-dashed border-gray-200 flex items-center justify-center text-sm text-gray-400">
              표시할 프로젝트가 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
              {recentProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </section>

        {/* 일정/개발일지 프리뷰 */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                최신 일정 (7일)
              </h2>
              <Link
                href="/schedule"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 underline underline-offset-4"
              >
                더보기
              </Link>
            </div>
            <div className="mt-4">
              <SchedulePreview />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                개발일지 / 알림
              </h2>
              <Link
                href="/devlog"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 underline underline-offset-4"
              >
                더보기
              </Link>
            </div>
            <div className="mt-4">
              <DevlogPreview />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function ProjectCard({ project }: { project: ProjectType }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#5873F9]/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between h-36">
      <div>
        <div className="flex justify-between items-start mb-2">
          <span className="bg-gray-100 text-gray-600 text-[11px] font-medium px-2.5 py-1 rounded-md">
            {project.tech}
          </span>
          <span
            className={`text-[11px] font-semibold px-2 py-1 rounded-md ${
              project.type === "team"
                ? "text-blue-600 bg-blue-50"
                : "text-purple-600 bg-purple-50"
            }`}
          >
            {project.type === "team" ? "Team" : "Personal"}
          </span>
        </div>

        <h3 className="font-bold text-gray-900 group-hover:text-[#5873F9] transition-colors truncate">
          {project.title}
        </h3>
      </div>

      <div>
        <div className="flex justify-between items-end mb-1.5">
          <span className="text-xs text-gray-400">{project.lastModified}</span>
          <span className="text-xs font-semibold text-[#5873F9]">
            {project.progress}%
          </span>
        </div>

        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div
            className="bg-[#5873F9] h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
