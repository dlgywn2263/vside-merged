"use client";

import { useState } from "react";
import { CalendarRange, Filter } from "lucide-react";

export function ActivityHeader() {
  /**
   * TODO (BACKEND)
   * - 이 필터값들을 쿼리로 보내서 서버에서 필터링:
   *   GET /api/activity?range=7d&scope=me&workspace=all
   */
  const [range, setRange] = useState<"7d" | "30d">("7d");
  const [scope, setScope] = useState<"me" | "team">("me");
  const [workspace, setWorkspace] = useState("all");

  return (
    <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <CalendarRange size={16} />
          <span className="font-semibold">필터</span>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-3 w-full md:w-auto">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRange("7d")}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold border ${
                range === "7d"
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              7일
            </button>
            <button
              type="button"
              onClick={() => setRange("30d")}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold border ${
                range === "30d"
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              30일
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setScope("me")}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold border ${
                scope === "me"
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              내 활동
            </button>
            <button
              type="button"
              onClick={() => setScope("team")}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold border ${
                scope === "team"
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
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
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="all">전체 워크스페이스</option>
              <option value="w1">Team Alpha Solution</option>
              <option value="w2">My Personal Solution</option>
            </select>
          </div>
        </div>
      </div>
    </section>
  );
}
