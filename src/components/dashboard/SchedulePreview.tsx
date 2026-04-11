"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE = "http://localhost:8080";

type SchedulePreviewProps = {
  workspaceId: string;
  mode: "personal" | "team";
};

type ScheduleItem = {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  stage?: string;
  status?: string;
  description?: string;
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
  if (!value) return null;
  if (value === "undefined" || value === "null") return null;
  return value;
}

export function SchedulePreview({ workspaceId, mode }: SchedulePreviewProps) {
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);

  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!normalizedWorkspaceId || !mode) {
      setItems([]);
      setLoading(false);
      return;
    }

    loadSchedules();
  }, [normalizedWorkspaceId, mode]);

  async function loadSchedules() {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE}/api/schedules/latest?view=${encodeURIComponent(
          mode,
        )}&workspaceId=${encodeURIComponent(normalizedWorkspaceId!)}&size=3`,
        {
          method: "GET",
          headers: {
            ...getAuthHeaders(),
          },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        setItems([]);
        return;
      }

      const data = await response.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("loadSchedules error:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  const latestItems = useMemo(() => {
    return [...items].slice(0, 3);
  }, [items]);

  if (loading) {
    return (
      <div className="text-sm text-gray-400">일정을 불러오는 중입니다.</div>
    );
  }

  if (!normalizedWorkspaceId || latestItems.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-400">
        표시할 일정이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {latestItems.map((item) => (
        <div
          key={item.id}
          className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="truncate font-semibold text-gray-900">{item.title}</p>
            <span className="shrink-0 text-xs text-gray-500">
              {item.startDate}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            {item.stage ? (
              <span className="rounded-full border border-gray-200 bg-white px-2 py-1">
                {item.stage}
              </span>
            ) : null}
            {item.status ? (
              <span className="rounded-full border border-gray-200 bg-white px-2 py-1">
                {item.status}
              </span>
            ) : null}
          </div>

          {item.description ? (
            <p className="mt-2 line-clamp-2 text-sm text-gray-600">
              {item.description}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
