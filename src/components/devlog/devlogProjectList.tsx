"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, UserRound } from "lucide-react";

type DevlogProject = {
  id: string;
  title: string;
  tech: string;
  lastUpdated: string;
  devlogCount: number;
};

const MOCK: DevlogProject[] = [
  { id: "p1", title: "Portfolio Website", tech: "TypeScript", lastUpdated: "2026.01.05", devlogCount: 2 },
  { id: "p2", title: "Portfolio Website1", tech: "C#", lastUpdated: "2026.01.05", devlogCount: 1 },
  { id: "p3", title: "Portfolio Website2", tech: "Java", lastUpdated: "2026.01.05", devlogCount: 4 },
  { id: "p4", title: "Portfolio Website3", tech: "C", lastUpdated: "2026.01.05", devlogCount: 3 },
  { id: "p5", title: "Portfolio Website4", tech: "C++", lastUpdated: "2026.01.05", devlogCount: 1 },
  { id: "p6", title: "Portfolio Website5", tech: "TypeScript", lastUpdated: "2026.01.05", devlogCount: 5 },
];

export function DevlogProjectList() {
  const router = useRouter();

  const onOpen = (id: string) => {
    router.push(`/devlog/${id}`);
  };

  return (
    <section className="space-y-3">
      {MOCK.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onOpen(p.id)}
          className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-4
                     hover:shadow-sm hover:border-gray-300 transition
                     flex items-center justify-between gap-4 text-left"
        >
          {/* 왼쪽 */}
          <div className="flex items-center gap-4 min-w-[320px]">
            <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 grid place-items-center">
              <UserRound size={18} />
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-sm font-bold text-gray-900">{p.title}</div>
              <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
                {p.tech}
              </span>
            </div>
          </div>

          {/* 오른쪽 */}
          <div className="flex items-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">최근 수정 날짜 :</span>
              <span className="font-semibold text-gray-800">{p.lastUpdated}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-500">개발일지 개수 :</span>
              <span className="font-semibold text-gray-800">{p.devlogCount}개</span>
            </div>

            <ChevronRight size={22} className="text-gray-900" />
          </div>
        </button>
      ))}
    </section>
  );
}