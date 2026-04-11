"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE = "http://localhost:8080";

type DevlogPreviewProps = {
  workspaceId: string;
};

type DevlogPost = {
  id: number;
  title: string;
  date: string | null;
  summary?: string | null;
  stage?: string | null;
  progress?: number | null;
  projectName: string;
};

type WorkspaceDetailResponse = {
  projects: Array<{
    id?: number;
    projectId?: number;
    name?: string;
    projectTitle?: string;
    posts?: Array<{
      id: number;
      title: string;
      date?: string | null;
      summary?: string | null;
      stage?: string | null;
      progress?: number | null;
    }>;
  }>;
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

export function DevlogPreview({ workspaceId }: DevlogPreviewProps) {
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);

  const [items, setItems] = useState<DevlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!normalizedWorkspaceId) {
      setItems([]);
      setLoading(false);
      return;
    }

    loadDevlogs();
  }, [normalizedWorkspaceId]);

  async function loadDevlogs() {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE}/api/devlogs/workspaces/${encodeURIComponent(
          normalizedWorkspaceId!,
        )}?sort=latest`,
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

      const data: WorkspaceDetailResponse = await response.json();

      const flattened: DevlogPost[] = (data.projects ?? []).flatMap((project) =>
        (project.posts ?? []).map((post) => ({
          id: Number(post.id),
          title: post.title ?? "",
          date: post.date ?? null,
          summary: post.summary ?? "",
          stage: post.stage ?? "",
          progress: post.progress ?? 0,
          projectName: project.projectTitle ?? project.name ?? "프로젝트",
        })),
      );

      setItems(flattened);
    } catch (error) {
      console.error("loadDevlogs error:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  const latestItems = useMemo(() => {
    return [...items]
      .sort((a, b) => {
        const aTime = a.date ? new Date(a.date).getTime() : 0;
        const bTime = b.date ? new Date(b.date).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 3);
  }, [items]);

  if (loading) {
    return (
      <div className="text-sm text-gray-400">개발일지를 불러오는 중입니다.</div>
    );
  }

  if (!normalizedWorkspaceId || latestItems.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-400">
        표시할 개발일지가 없습니다.
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
              {item.date ?? "-"}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span className="rounded-full border border-gray-200 bg-white px-2 py-1">
              {item.projectName}
            </span>
            {item.stage ? (
              <span className="rounded-full border border-gray-200 bg-white px-2 py-1">
                {item.stage}
              </span>
            ) : null}
            {typeof item.progress === "number" ? (
              <span className="rounded-full border border-gray-200 bg-white px-2 py-1">
                {item.progress}%
              </span>
            ) : null}
          </div>

          {item.summary ? (
            <p className="mt-2 line-clamp-2 text-sm text-gray-600">
              {item.summary}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
