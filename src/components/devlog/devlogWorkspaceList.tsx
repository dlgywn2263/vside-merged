"use client";

import Link from "next/link";
import { ChevronRight, UserRound, UsersRound } from "lucide-react";

type SolutionMode = "personal" | "team";

type Solution = {
  id: string;
  name: string;
  mode: SolutionMode;
  teamName?: string;
  lastUpdated: string; // YYYY.MM.DD
  projectCount: number;
};

const MOCK_SOLUTIONS: Solution[] = [
  {
    id: "s1",
    name: "My Personal Solution",
    mode: "personal",
    lastUpdated: "2026.02.06",
    projectCount: 2,
  },
  {
    id: "s2",
    name: "Team Alpha Solution",
    mode: "team",
    teamName: "Team Alpha",
    lastUpdated: "2026.02.06",
    projectCount: 3,
  },
];

export function DevlogWorkspaceList() {
  return (
    <section className="space-y-3">
      {MOCK_SOLUTIONS.map((s) => {
        const isTeam = s.mode === "team";

        return (
          <Link
            key={s.id}
            href={`/devlog/${s.id}`}
            className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-4
                       hover:shadow-sm hover:border-gray-300 transition
                       flex items-center justify-between gap-4"
          >
            {/* 왼쪽 */}
            <div className="flex items-center gap-4 min-w-[320px]">
              <div
                className={[
                  "h-11 w-11 rounded-xl grid place-items-center",
                  isTeam
                    ? "bg-green-100 text-green-700"
                    : "bg-blue-50 text-blue-600",
                ].join(" ")}
              >
                {isTeam ? <UsersRound size={18} /> : <UserRound size={18} />}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-sm font-bold text-gray-900 truncate">
                    {s.name}
                  </div>

                  <span
                    className={[
                      "rounded-full border px-2.5 py-1 text-xs font-semibold",
                      isTeam
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-gray-200 bg-gray-50 text-gray-700",
                    ].join(" ")}
                  >
                    {isTeam ? "팀" : "개인"}
                  </span>

                  {isTeam && s.teamName ? (
                    <span className="text-xs text-gray-500">
                      · {s.teamName}
                    </span>
                  ) : null}
                </div>

                <div className="mt-1 text-xs text-gray-500">
                  최근 수정:{" "}
                  <span className="font-semibold text-gray-800">
                    {s.lastUpdated}
                  </span>
                  <span className="mx-2 text-gray-300">·</span>
                  프로젝트{" "}
                  <span className="font-semibold text-gray-800">
                    {s.projectCount}개
                  </span>
                </div>
              </div>
            </div>

            {/* 오른쪽 */}
            <ChevronRight size={22} className="text-gray-900" />
          </Link>
        );
      })}
    </section>
  );
}
