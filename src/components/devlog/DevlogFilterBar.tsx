"use client";

import { Search } from "lucide-react";
import { SortType, StageType } from "@/lib/devlog/types";

type WorkspaceMode = "personal" | "team";

type WorkspaceOption = {
  uuid: string;
  name: string;
  mode: WorkspaceMode;
};

type Props = {
  search: string;
  selectedStage: StageType | "all";
  sort: SortType;
  setSearch: (value: string) => void;
  setSelectedStage: (value: StageType | "all") => void;
  setSort: (value: SortType) => void;
  resetFilters: () => void;

  selectedMode: WorkspaceMode;
  setSelectedMode: (value: WorkspaceMode) => void;

  workspaces: WorkspaceOption[];
  selectedWorkspaceId: string;
  setSelectedWorkspaceId: (value: string) => void;
};

export function DevlogFilterBar({
  search,
  selectedStage,
  sort,
  setSearch,
  setSelectedStage,
  setSort,
  resetFilters,
  selectedMode,
  setSelectedMode,
  workspaces,
  selectedWorkspaceId,
  setSelectedWorkspaceId,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={selectedMode}
        onChange={(e) => setSelectedMode(e.target.value as WorkspaceMode)}
        className="h-11 w-24 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none"
      >
        <option value="personal">개인</option>
        <option value="team">팀</option>
      </select>

      <select
        value={selectedWorkspaceId}
        onChange={(e) => setSelectedWorkspaceId(e.target.value)}
        className="h-11 w-72 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none"
      >
        {workspaces.length === 0 ? (
          <option value="">선택 가능한 워크스페이스 없음</option>
        ) : (
          workspaces.map((workspace) => (
            <option key={workspace.uuid} value={workspace.uuid}>
              {workspace.name}
            </option>
          ))
        )}
      </select>

      <select
        value={selectedStage}
        onChange={(e) => setSelectedStage(e.target.value as StageType | "all")}
        className="h-11 w-32 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none"
      >
        <option value="all">전체 단계</option>
        <option value="planning">기획</option>
        <option value="design">설계</option>
        <option value="implementation">구현</option>
        <option value="wrapup">마무리</option>
      </select>

      <div className="flex h-11 w-80 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4">
        <Search size={16} className="shrink-0 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="제목, 요약, 태그 검색"
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <button
          onClick={() => setSort("latest")}
          className={`h-9 rounded-full px-3 text-xs font-medium transition ${
            sort === "latest"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          최신순
        </button>

        <button
          onClick={() => setSort("oldest")}
          className={`h-9 rounded-full px-3 text-xs font-medium transition ${
            sort === "oldest"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          오래된순
        </button>

        <button
          onClick={resetFilters}
          className="h-9 rounded-full px-3 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        >
          초기화
        </button>
      </div>
    </div>
  );
}
