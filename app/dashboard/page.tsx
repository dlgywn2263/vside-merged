//전체 프로젝트 페이지
// app/dashboard/page.tsx
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { WeeklyActivityChart } from "@/components/dashboard/WeeklyActivityChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { SchedulePreview } from "@/components/dashboard/SchedulePreview";
import { DevlogPreview } from "@/components/dashboard/DevlogPreview";

export default function DashboardPage() {
  return (
    <main className="bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <DashboardHeader />

        {/* KPI 요약 */}
        <section className="grid grid-cols-3 gap-4">
          <KpiCards />
        </section>

        {/* 그래프 + 최근활동 */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                주간 활동 요약
              </h2>
              <Link
                href="/dashboard/activity"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 underline underline-offset-4"
              >
                더보기
              </Link>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              최근 7일 기준 (커밋/파일 수정/노트 작성 등)
            </p>

            <div className="mt-5">
              <WeeklyActivityChart />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">최근 활동</h2>
              <Link
                href="/dashboard/activity"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 underline underline-offset-4"
              >
                더보기
              </Link>
            </div>
            <div className="mt-5">
              <RecentActivity />
            </div>
          </div>
        </section>

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
