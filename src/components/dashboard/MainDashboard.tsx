"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ActivityHeader } from "@/components/activity/ActivityHeader";
import { ActivityKpis } from "@/components/activity/ActivityKpis";
import { ActivityBreakdown } from "@/components/activity/ActivityBreakdown";
import { ActivityTimeline } from "@/components/activity/ActivityTimeline";
import { DevlogPreview } from "@/components/dashboard/DevlogPreview";
import { SchedulePreview } from "@/components/dashboard/SchedulePreview";
import { ArrowRight } from "lucide-react";

const API_BASE = "http://localhost:8080";

type MainDashboardProps = {
  workspaceId: string;
  mode: "personal" | "team";
};

type WorkspaceSummary = {
  id: string;
  name: string;
  mode: "personal" | "team";
  updatedAt: string;
  description?: string | null;
};

function getStoredUserId(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const rawUser = localStorage.getItem("user");
    if (rawUser) {
      const parsedUser = JSON.parse(rawUser);
      const userId = parsedUser?.id;

      if (userId !== undefined && userId !== null && userId !== "") {
        return String(userId);
      }
    }

    const userId = localStorage.getItem("userId");
    return userId ? String(userId) : null;
  } catch {
    const userId = localStorage.getItem("userId");
    return userId ? String(userId) : null;
  }
}

function getAuthHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};

  const token =
    localStorage.getItem("accessToken") || localStorage.getItem("token");

  if (!token) return {};

  return {
    Authorization: `Bearer ${token}`,
  };
}

function normalizeWorkspaceId(value: string | null | undefined) {
  if (!value) return "";
  if (value === "undefined" || value === "null") return "";
  return value;
}

export default function MainDashboard({
  workspaceId,
  mode,
}: MainDashboardProps) {
  const safeWorkspaceId = normalizeWorkspaceId(workspaceId);

  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [workspaceError, setWorkspaceError] = useState("");

  useEffect(() => {
    if (!safeWorkspaceId) {
      setWorkspace(null);
      setWorkspaceError("workspaceId가 없습니다.");
      setLoadingWorkspace(false);
      return;
    }

    loadWorkspace();
  }, [safeWorkspaceId]);

  async function loadWorkspace() {
    try {
      setLoadingWorkspace(true);
      setWorkspaceError("");

      const userId = getStoredUserId();

      console.log("[MainDashboard] workspaceId:", safeWorkspaceId);
      console.log("[MainDashboard] userId:", userId);

      if (!userId) {
        setWorkspace(null);
        setWorkspaceError("localStorage에 userId가 없습니다.");
        return;
      }

      const response = await fetch(
        `${API_BASE}/api/workspaces?userId=${encodeURIComponent(userId)}`,
        {
          method: "GET",
          headers: {
            ...getAuthHeaders(),
          },
          cache: "no-store",
        },
      );

      console.log("[MainDashboard] response status:", response.status);

      if (!response.ok) {
        const text = await response.text();
        console.error("[MainDashboard] workspaces api failed:", text);
        setWorkspace(null);
        setWorkspaceError(text || "워크스페이스 목록 조회 실패");
        return;
      }

      const data = await response.json();
      console.log("[MainDashboard] workspaces response:", data);

      const list = Array.isArray(data) ? data : [];

      const found =
        list.find((item: any) => String(item.id) === String(safeWorkspaceId)) ??
        null;

      console.log("[MainDashboard] found workspace:", found);

      if (!found) {
        setWorkspace(null);
        setWorkspaceError(
          "현재 workspaceId와 일치하는 워크스페이스를 찾지 못했습니다.",
        );
        return;
      }

      setWorkspace({
        id: found.id,
        name: found.name ?? "워크스페이스",
        mode: found.mode,
        updatedAt: found.updatedAt ?? "",
        description: found.description ?? "",
      });
    } catch (error) {
      console.error("[MainDashboard] loadWorkspace error:", error);
      setWorkspace(null);
      setWorkspaceError("워크스페이스 조회 중 예외가 발생했습니다.");
    } finally {
      setLoadingWorkspace(false);
    }
  }

  const effectiveMode = workspace?.mode ?? mode;
  const projectName = workspace?.name ?? "워크스페이스";

  return (
    <main className="bg-white">
      <div className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">대시보드</p>
            <h1 className="mt-1 text-2xl font-extrabold text-gray-900">
              {loadingWorkspace ? "불러오는 중..." : projectName}
            </h1>
            {workspaceError ? (
              <p className="mt-2 text-sm text-red-500">{workspaceError}</p>
            ) : null}
          </div>

          {safeWorkspaceId ? (
            <Link
              href={
                effectiveMode === "team"
                  ? `/ide/team/${safeWorkspaceId}`
                  : `/ide/personal/${safeWorkspaceId}`
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D9E1FF] bg-[#F7F9FF] px-4 py-2.5 text-sm font-semibold text-[#5873F9] transition-colors hover:bg-[#EEF3FF]"
            >
              작업하러 가기
              <ArrowRight size={17} />
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-400"
            >
              작업하러 가기
              <ArrowRight size={17} />
            </button>
          )}
        </div>

        <ActivityHeader workspaceId={safeWorkspaceId} mode={effectiveMode} />

        <section className="grid grid-cols-3 gap-4">
          <ActivityKpis />
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">최신 일정</h2>

              {safeWorkspaceId ? (
                <Link
                  href={{
                    pathname: "/schedule",
                    query: {
                      view: effectiveMode,
                      workspaceId: safeWorkspaceId,
                    },
                  }}
                  className="text-sm font-medium text-gray-600 underline underline-offset-4 hover:text-gray-900"
                >
                  더보기
                </Link>
              ) : (
                <span className="text-sm text-gray-300">더보기</span>
              )}
            </div>

            <div className="mt-4">
              <SchedulePreview
                workspaceId={safeWorkspaceId}
                mode={effectiveMode}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">최신 개발일지</h2>

              {safeWorkspaceId ? (
                <Link
                  href={{
                    pathname: "/devlog",
                    query: {
                      workspaceId: safeWorkspaceId,
                      mode: effectiveMode,
                    },
                  }}
                  className="text-sm font-medium text-gray-600 underline underline-offset-4 hover:text-gray-900"
                >
                  더보기
                </Link>
              ) : (
                <span className="text-sm text-gray-300">더보기</span>
              )}
            </div>

            <div className="mt-4">
              <DevlogPreview workspaceId={safeWorkspaceId} />
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
