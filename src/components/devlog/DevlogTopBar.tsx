"use client";

import { Plus } from "lucide-react";
import { SortType, StageType } from "@/lib/devlog/types";
import { DevlogFilterBar } from "./DevlogFilterBar";

type WorkspaceMode = "personal" | "team";

type WorkspaceOption = {
  uuid: string;
  name: string;
  mode: WorkspaceMode;
};

type Props = {
  workspaceName: string;
  workspaceModeLabel: string;

  search: string;
  setSearch: (value: string) => void;

  selectedStage: StageType | "all";
  setSelectedStage: (value: StageType | "all") => void;

  sort: SortType;
  setSort: (value: SortType) => void;

  resetFilters: () => void;
  onCreate: () => void;

  selectedMode: WorkspaceMode;
  setSelectedMode: (value: WorkspaceMode) => void;

  workspaces: WorkspaceOption[];
  selectedWorkspaceId: string;
  setSelectedWorkspaceId: (value: string) => void;
};

export function DevlogTopBar({
  workspaceName,
  workspaceModeLabel,
  search,
  setSearch,
  selectedStage,
  setSelectedStage,
  sort,
  setSort,
  resetFilters,
  onCreate,
  selectedMode,
  setSelectedMode,
  workspaces,
  selectedWorkspaceId,
  setSelectedWorkspaceId,
}: Props) {
  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            개발일지
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {workspaceName} · {workspaceModeLabel}의 개발일지를 단계와 일정
            기준으로 관리합니다.
          </p>
        </div>

        <button
          onClick={onCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          <Plus size={16} />새 개발일지
        </button>
      </header>

      <DevlogFilterBar
        search={search}
        setSearch={setSearch}
        selectedStage={selectedStage}
        setSelectedStage={setSelectedStage}
        sort={sort}
        setSort={setSort}
        resetFilters={resetFilters}
        selectedMode={selectedMode}
        setSelectedMode={setSelectedMode}
        workspaces={workspaces}
        selectedWorkspaceId={selectedWorkspaceId}
        setSelectedWorkspaceId={setSelectedWorkspaceId}
      />
    </div>
  );
}
