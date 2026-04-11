"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DevlogWorkspaceView } from "@/components/devlog/devlogWorkspaceView";

type WorkspaceMode = "personal" | "team";

type WorkspaceListItem = {
  uuid: string;
  name: string;
  mode: WorkspaceMode;
};

const API_BASE = "http://localhost:8080";

function normalizeWorkspaceId(value: string | null) {
  if (!value) return null;
  if (value === "undefined" || value === "null") return null;
  return value;
}

export default function DevlogPage() {
  const searchParams = useSearchParams();
  const requestedWorkspaceId = normalizeWorkspaceId(
    searchParams.get("workspaceId"),
  );

  const [allWorkspaces, setAllWorkspaces] = useState<WorkspaceListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedMode, setSelectedMode] = useState<WorkspaceMode>("personal");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");

  useEffect(() => {
    loadWorkspaces();
  }, [requestedWorkspaceId]);

  async function loadWorkspaces() {
    setLoading(true);

    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("accessToken")
          : null;

      const res = await fetch(
        `${API_BASE}/api/devlogs/workspaces?sort=latest`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        },
      );

      if (!res.ok) {
        throw new Error("워크스페이스 목록 조회 실패");
      }

      const data: WorkspaceListItem[] = await res.json();
      setAllWorkspaces(data);

      const requested = requestedWorkspaceId
        ? data.find((item) => item.uuid === requestedWorkspaceId)
        : null;

      if (requested) {
        setSelectedMode(requested.mode);
        setSelectedWorkspaceId(requested.uuid);
        return;
      }

      const personalFirst = data.find((item) => item.mode === "personal");
      const teamFirst = data.find((item) => item.mode === "team");
      const first = personalFirst ?? teamFirst ?? null;

      if (first) {
        setSelectedMode(first.mode);
        setSelectedWorkspaceId(first.uuid);
      } else {
        setSelectedWorkspaceId("");
      }
    } catch (error) {
      console.error("loadWorkspaces error:", error);
      alert("워크스페이스 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const filteredWorkspaces = useMemo(() => {
    return allWorkspaces.filter((item) => item.mode === selectedMode);
  }, [allWorkspaces, selectedMode]);

  useEffect(() => {
    if (!filteredWorkspaces.length) {
      setSelectedWorkspaceId("");
      return;
    }

    const exists = filteredWorkspaces.some(
      (item) => item.uuid === selectedWorkspaceId,
    );

    if (!exists) {
      setSelectedWorkspaceId(filteredWorkspaces[0].uuid);
    }
  }, [filteredWorkspaces, selectedWorkspaceId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          데이터를 불러오는 중...
        </div>
      </div>
    );
  }

  if (!allWorkspaces.length) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          표시할 워크스페이스가 없습니다.
        </div>
      </div>
    );
  }

  if (!selectedWorkspaceId) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          선택 가능한 워크스페이스가 없습니다.
        </div>
      </div>
    );
  }

  return (
    <section className="bg-[#F8F9FA] min-h-screen">
      <div className="mx-auto max-w-[1200px] px-6 py-10">
        <DevlogWorkspaceView
          workspaceId={selectedWorkspaceId}
          selectedMode={selectedMode}
          setSelectedMode={setSelectedMode}
          workspaces={filteredWorkspaces}
          selectedWorkspaceId={selectedWorkspaceId}
          setSelectedWorkspaceId={setSelectedWorkspaceId}
        />
      </div>
    </section>
  );
}
