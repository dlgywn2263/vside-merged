"use client";

import { SchedulePreview } from "@/components/dashboard/SchedulePreview";
import { DevlogPreview } from "@/components/dashboard/DevlogPreview";
import { Link } from "lucide-react";
import React, { useState } from "react";

// --- Mock Data ---
// 요약 정보 데이터 업데이트 (프로젝트 분리 및 4개 항목으로 구성)
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
];

const TIMELINE = [
  {
    id: 1,
    action: "Web IDE: EditorPanel.tsx 수정",
    team: "Team Alpha",
    time: "1시간 전",
    icon: "code",
  },
  {
    id: 2,
    action: "fix: yjs sync edge case",
    team: "Team Alpha",
    time: "3시간 전",
    icon: "commit",
  },
  {
    id: 3,
    action: "개발일지 작성: 대시보드 구조",
    team: "My Personal Solution",
    time: "어제",
    icon: "doc",
  },
  {
    id: 4,
    action: "일정 추가: 팀 회의",
    team: "Team Alpha",
    time: "2일 전",
    icon: "calendar",
  },
  {
    id: 5,
    action: "팀원 초대 전송",
    team: "Team Alpha",
    time: "3일 전",
    icon: "users",
  },
];

// --- Icons (SVG) ---
const Icons = {
  user: () => (
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
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  users: () => (
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
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  calendar: () => (
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
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  bell: () => (
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
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  commit: () => (
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
      <circle cx="12" cy="12" r="3" />
      <line x1="3" y1="12" x2="9" y2="12" />
      <line x1="15" y1="12" x2="21" y2="12" />
    </svg>
  ),
  doc: () => (
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
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  code: () => (
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
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  plus: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
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
};

export default function MainDashboard() {
  const [filter, setFilter] = useState<"all" | "personal" | "team">("all");

  const filteredProjects = PROJECTS.filter(
    (p) => filter === "all" || p.type === filter,
  );

  return (
    <main className="min-h-screen bg-[#F8F9FA] p-6 md:p-10 font-sans text-gray-800">
      <div className="max-w-[1200px] mx-auto space-y-6">
        {/* 1. Compact Hero Banner */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#5873F9] tracking-tight mb-1">
              VSIDE
            </h1>
            <p className="text-gray-500 text-sm">
              프로젝트 구조를 중심으로 협업하는 웹 IDE 플랫폼
            </p>
          </div>
          <button className="flex items-center gap-2 bg-[#5873F9] hover:bg-[#4863e8] transition-colors text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm w-full md:w-auto justify-center">
            <Icons.plus />새 프로젝트 생성
          </button>
        </section>

        {/* 2. Summary Stats (4-Column Grid, Added Box Shadow & Borders) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SUMMARY_STATS.map((stat) => {
            const Icon = Icons[stat.icon as keyof typeof Icons];
            return (
              <div
                key={stat.id}
                className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 p-6 flex flex-col justify-between"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-gray-600 font-semibold text-sm">
                    {stat.title}
                  </h3>
                  <div className="text-gray-400">
                    <Icon />
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-black text-gray-900 mb-1">
                    {stat.count}
                  </div>
                  <p className="text-gray-400 text-xs font-medium">
                    {stat.label}
                  </p>
                </div>
              </div>
            );
          })}
        </section>

        {/* 3. Main Content Grid (Projects & Timeline) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left/Main Column: Recent Projects */}
          <section className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h2 className="text-lg font-bold text-gray-900">최근 작업물</h2>

              {/* Tab Filters */}
              <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200">
                {(["all", "personal", "team"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilter(type)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                      filter === type
                        ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {type === "all"
                      ? "전체"
                      : type === "personal"
                        ? "개인"
                        : "팀"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#5873F9]/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between h-36"
                >
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
                      <span className="text-xs text-gray-400">
                        {project.lastModified}
                      </span>
                      <span className="text-xs font-semibold text-[#5873F9]">
                        {project.progress}%
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-[#5873F9] h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Empty State / Add New Placeholder */}
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer flex flex-col items-center justify-center text-gray-400 hover:text-[#5873F9] h-36">
                <Icons.plus />
                <span className="text-sm font-medium mt-2">
                  새 프로젝트 만들기
                </span>
              </div>
            </div>
          </section>

          {/* Right Column: Activity Timeline */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-900">활동 타임라인</h2>
              <span className="text-xs text-gray-400">최근순</span>
            </div>

            <div className="relative border-l border-gray-200 ml-3 space-y-6">
              {TIMELINE.map((item) => {
                const Icon = Icons[item.icon as keyof typeof Icons];
                return (
                  <div key={item.id} className="relative pl-6">
                    {/* Timeline Dot/Icon */}
                    <div className="absolute -left-3.5 top-0 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400">
                      <div className="scale-[0.6]">
                        <Icon />
                      </div>
                    </div>

                    {/* Content */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-0.5">
                        {item.action}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{item.team}</span>
                        <span>·</span>
                        <span>{item.time}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
        {/* 일정/개발일지 프리뷰 */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
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

          <div className="rounded-2xl border border-gray-200 bg-white p-6">
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
