// app/dashboard/activity/page.tsx
import Link from "next/link";
import { ActivityHeader } from "@/components/activity/ActivityHeader";
import { ActivityKpis } from "@/components/activity/ActivityKpis";
import { ActivityBars } from "@/components/activity/ActivityBars";
import { ActivityBreakdown } from "@/components/activity/ActivityBreakdown";
import { ActivityTimeline } from "@/components/activity/ActivityTimeline";
import { DevlogPreview } from "@/components/dashboard/DevlogPreview";
import { SchedulePreview } from "@/components/dashboard/SchedulePreview";

const projectName = "{프로젝트 이름}";

export default function ActivityPage() {
  return (
    <main className="bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">대시보드</p>
            <h1 className="mt-1 text-2xl font-extrabold text-gray-900">
              {projectName}
            </h1>
          </div>
          <button className="inline-flex items-center justify-center gap-2 bg-[#5873F9] hover:bg-[#4863E8] transition-colors text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm">
            작업하러 가기
          </button>
        </div>

        <ActivityHeader />

        <section className="grid grid-cols-3 gap-4">
          <ActivityKpis />
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

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">활동 타임라인</h2>
              <span className="text-sm text-gray-500">최근순</span>
            </div>
            <div className="mt-5">
              <ActivityTimeline />
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
      </div>
    </main>
  );
}
