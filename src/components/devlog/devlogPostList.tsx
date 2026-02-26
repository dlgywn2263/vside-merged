"use client";

import Link from "next/link";
import { ChevronRight, Dot } from "lucide-react";

type Post = {
  id: string;
  title: string;
  author: string;
  date: string; // YYYY-MM-DD
  summary: string;
  tags: string[];
};

const MOCK: Post[] = [
  {
    id: "d1",
    title: "프로젝트 초기 설정 및 환경 구성",
    author: "김개발",
    date: "2025-01-16",
    summary: "개발 환경 설정 완료, React + TypeScript + Vite 스택 구성",
    tags: ["Setup", "Configuration"],
  },
  {
    id: "d2",
    title: "API 엔드포인트 설계 및 문서화",
    author: "이프로토",
    date: "2025-01-15",
    summary: "RESTful API 구조 설계, 주요 엔드포인트 4개 정의",
    tags: ["API", "Design"],
  },
  {
    id: "d3",
    title: "데이터베이스 스키마 설계",
    author: "박백엔드",
    date: "2025-01-14",
    summary: "사용자, 프로젝트, 태스크 테이블 구조 설계 및 관계 정의",
    tags: ["Database", "Schema"],
  },
  {
    id: "d4",
    title: "UI/UX 디자인 시스템 구축",
    author: "최진영",
    date: "2025-01-13",
    summary: "컬러 팔레트, 타이포그래피, 컴포넌트 라이브러리 정의",
    tags: ["Design", "UI/UX"],
  },
];

export function DevlogPostList({ projectId }: { projectId: string }) {
  return (
    <section className="space-y-4">
      {MOCK.map((p) => (
        <Link
          key={p.id}
          href={`/devlog/${projectId}/${p.id}`}
          className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-4
                     hover:shadow-sm hover:border-gray-300 transition
                     flex items-center justify-between gap-4 text-left"
        >
          <div className="min-w-0 flex-1">
            {/* 1) 제목 + (작성자/날짜) */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-base font-extrabold text-gray-900">
                {p.title}
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="font-semibold text-gray-700">{p.author}</span>
                <span className="text-gray-300">•</span>
                <span>{p.date}</span>
              </div>
            </div>

            {/* 2) 미리보기 */}
            <div className="mt-3 text-sm text-gray-600 leading-relaxed">
              {p.summary}
            </div>

            {/* 3) 태그 */}
            <div className="mt-4 flex flex-wrap gap-2">
              {p.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold text-gray-800"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-8 text-sm">
            <ChevronRight size={22} className="ml-auto text-gray-400" />
          </div>
        </Link>
      ))}
    </section>
  );
}