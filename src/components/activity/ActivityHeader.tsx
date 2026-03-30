"use client";

import { useMemo, useState } from "react";
import { CalendarRange, Filter } from "lucide-react";

export function ActivityHeader() {

  const [range, setRange] = useState<"7d" | "30d">("7d");
  const [scope, setScope] = useState<"me" | "team">("me");
  const [workspace, setWorkspace] = useState("all");

  const totalProgress = useMemo(() => {
    if (workspace === "w1") return 74;
    if (workspace === "w2") return 61;
    return 68;
  }, [workspace]);

  return (
    <div className="space-y-3">
      {/* 진행률 한 줄 */}
      <div className="flex items-center justify-end gap-3">
        <div className="w-full max-w-[220px]">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-gray-900 transition-all duration-500"
              style={{ width: `${totalProgress}%` }}
            />
          </div>
        </div>

        <span className="min-w-[36px] text-right text-sm font-semibold text-gray-900">
          {totalProgress}%
        </span>
      </div>

      {/* 필터 박스 */}
      <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <CalendarRange size={16} />
            <span className="font-semibold">필터</span>
          </div>

          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center md:gap-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRange("7d")}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                  range === "7d"
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                7일
              </button>
              <button
                type="button"
                onClick={() => setRange("30d")}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                  range === "30d"
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                30일
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setScope("me")}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                  scope === "me"
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                내 활동
              </button>
              <button
                type="button"
                onClick={() => setScope("team")}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                  scope === "team"
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                팀 전체
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-500" />
              <select
                value={workspace}
                onChange={(e) => setWorkspace(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none"
              >
                <option value="all">전체 워크스페이스</option>
                <option value="w1">Team Alpha Solution</option>
                <option value="w2">My Personal Solution</option>
              </select>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}