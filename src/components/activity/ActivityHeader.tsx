"use client";

import { useEffect, useState } from "react";
import { CalendarRange } from "lucide-react";

const API_BASE = "http://localhost:8080";

type ActivityHeaderProps = {
  workspaceId: string;
  mode: "personal" | "team";
};

type ScheduleProgressResponse = {
  workspaceId: string;
  workspaceName: string;
  type: string;
  totalCount: number;
  doneCount: number;
  progress: number;
};

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

export function ActivityHeader({ workspaceId, mode }: ActivityHeaderProps) {
  const safeWorkspaceId = normalizeWorkspaceId(workspaceId);

  const [totalProgress, setTotalProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!safeWorkspaceId) {
      setTotalProgress(0);
      setLoading(false);
      return;
    }

    const fetchProgress = async () => {
      try {
        setLoading(true);

        const response = await fetch(
          `${API_BASE}/api/schedules/progress?view=${encodeURIComponent(mode)}&workspaceId=${encodeURIComponent(safeWorkspaceId)}`,
          {
            method: "GET",
            headers: {
              ...getAuthHeaders(),
            },
            cache: "no-store",
          },
        );

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || "진행률 조회 실패");
        }

        const data: ScheduleProgressResponse = await response.json();
        setTotalProgress(data.progress ?? 0);
      } catch (error) {
        console.error("[ActivityHeader] progress fetch error:", error);
        setTotalProgress(0);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [safeWorkspaceId, mode]);

  return (
    <section className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <CalendarRange size={16} />
            <span className="font-semibold">필터</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="whitespace-nowrap text-sm text-gray-500">
            진행률
          </span>

          <div className="flex-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-gray-900 transition-all duration-500"
                style={{ width: `${totalProgress}%` }}
              />
            </div>
          </div>

          <span className="min-w-[40px] text-right text-sm font-semibold text-gray-900">
            {loading ? "..." : `${totalProgress}%`}
          </span>
        </div>
      </div>
    </section>
  );
}
