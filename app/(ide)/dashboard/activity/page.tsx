// app/dashboard/activity/page.tsx
import Link from "next/link";
import { ActivityHeader } from "@/components/activity/ActivityHeader";
import { ActivityKpis } from "@/components/activity/ActivityKpis";
import { ActivityBars } from "@/components/activity/ActivityBars";
import { ActivityBreakdown } from "@/components/activity/ActivityBreakdown";
import { ActivityTimeline } from "@/components/activity/ActivityTimeline";

export default function ActivityPage() {
  return (
    <main className="bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">대시보드</p>
            <h1 className="mt-1 text-2xl font-extrabold text-gray-900">
              활동 요약
            </h1>
          </div>
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-gray-600 hover:text-gray-900 underline underline-offset-4"
          >
            대시보드로
          </Link>
        </div>

        <ActivityHeader />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <ActivityKpis />
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-bold text-gray-900">일자별 활동량</h2>
            <p className="mt-1 text-sm text-gray-500">선택한 기간 기준</p>
            <div className="mt-5">
              <ActivityBars />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-bold text-gray-900">활동 유형 분포</h2>
            <p className="mt-1 text-sm text-gray-500">
              편집/커밋/문서/일정/협업
            </p>
            <div className="mt-5">
              <ActivityBreakdown />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">활동 타임라인</h2>
            <span className="text-sm text-gray-500">최근순</span>
          </div>
          <div className="mt-5">
            <ActivityTimeline />
          </div>
        </section>
      </div>
    </main>
  );
}
