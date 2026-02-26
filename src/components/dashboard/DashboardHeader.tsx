// src/components/dashboard/DashboardHeader.tsx
import Link from "next/link";
import { Plus } from "lucide-react";

export function DashboardHeader() {
  /**
   * TODO (BACKEND)
   * - GET /api/me (유저 정보)
   * - GET /api/dashboard/summary (요약 데이터)
   */
  const user = {
    id: "u1",
    name: "이효숭",
    email: "hyoju@example.com",
  };
  // TODO: 로그인 유저 이름으로 교체

  return (
    <section className="rounded-3xl border border-gray-200 bg-gray-50 p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {/* <p className="text-sm text-gray-500">오늘도 개발을… 하게 되셨군요.</p> */}
          <h1 className="mt-2 text-2xl font-extrabold text-gray-900">
            {user.name}님의 대시보드
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            프로젝트/일정/활동을 한 번에 요약해서 보여줍니다.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/new/workspace"
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black"
          >
            <Plus size={16} />새 프로젝트
          </Link>
          <Link
            href="/projects"
            className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            프로젝트 관리
          </Link>
        </div>
      </div>
    </section>
  );
}
