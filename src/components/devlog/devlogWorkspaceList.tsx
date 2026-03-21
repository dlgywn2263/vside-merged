"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, UserRound, UsersRound } from "lucide-react";

type SolutionMode = "personal" | "team";

type WorkspaceItem = {
  uuid: string;
  name: string;
  mode: SolutionMode;
  teamName: string | null;
  lastUpdatedDate: string;
  devlogCount: number;
};

const API_BASE = "http://localhost:8080";

function formatDate(dateString: string) {
  if (!dateString) return "-";
  return dateString.replaceAll("-", ".");
}

export function DevlogWorkspaceList() {
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        setLoading(true);
        setError(null);

        /**
         * 로그인 성공 시 AuthContext에서 localStorage에 저장한 userId 사용
         * 현재 백엔드는 아직 X-USER-ID 헤더로 현재 사용자를 판별함
         */
        const token = localStorage.getItem("accessToken");

        if (!token) {
          throw new Error("로그인 정보가 없습니다. 다시 로그인해주세요.");
        }

        const res = await fetch(`${API_BASE}/api/devlogs/workspaces`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(`워크스페이스 목록 조회 실패 (${res.status})`);
        }

        const data: WorkspaceItem[] = await res.json();
        setWorkspaces(data);
      } catch (err) {
        console.error("워크스페이스 목록 조회 오류:", err);
        setError(
          err instanceof Error
            ? err.message
            : "개발일지 워크스페이스 목록을 불러오지 못했습니다.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadWorkspaces();
  }, []);

  if (loading) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white px-5 py-6 text-sm text-gray-500">
        워크스페이스 목록을 불러오는 중입니다...
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 px-5 py-6 text-sm text-red-600">
        {error}
      </section>
    );
  }

  if (workspaces.length === 0) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white px-5 py-6 text-sm text-gray-500">
        표시할 워크스페이스가 없습니다.
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {workspaces.map((s) => {
        const isTeam = s.mode === "team";

        return (
          <Link
            key={s.uuid}
            href={`/devlog/${s.uuid}`}
            className="flex w-full items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4 transition hover:border-gray-300 hover:shadow-sm"
          >
            <div className="flex min-w-[320px] items-center gap-4">
              <div
                className={[
                  "grid h-11 w-11 place-items-center rounded-xl",
                  isTeam
                    ? "bg-green-100 text-green-700"
                    : "bg-blue-50 text-blue-600",
                ].join(" ")}
              >
                {isTeam ? <UsersRound size={18} /> : <UserRound size={18} />}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="truncate text-sm font-bold text-gray-900">
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
                    {formatDate(s.lastUpdatedDate)}
                  </span>
                  <span className="mx-2 text-gray-300">·</span>
                  개발일지{" "}
                  <span className="font-semibold text-gray-800">
                    {s.devlogCount}개
                  </span>
                </div>
              </div>
            </div>

            <ChevronRight size={22} className="text-gray-900" />
          </Link>
        );
      })}
    </section>
  );
}
