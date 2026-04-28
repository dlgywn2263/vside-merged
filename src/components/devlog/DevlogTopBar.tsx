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
    <header className="rounded-3xl border border-slate-200 bg-white px-7 py-6 shadow-sm">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
              개발일지
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {workspaceModeLabel}
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {workspaceName || "워크스페이스"}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            기획, 설계, 구현, 테스트까지 작업 과정을 단계별로 기록합니다.
          </p>
        </div>

        <button
          onClick={onCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          <Plus size={16} />새 개발일지
        </button>
      </div>

      <div className="mt-6 border-t border-slate-100 pt-5">
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
    </header>
  );
}
