"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { ProjectOption, SortType, StageType } from "@/lib/devlog/types";

type Props = {
  search: string;
  selectedStage: StageType | "all";
  selectedTag: string;
  selectedProjectId: string;
  allTags: string[];
  projects: ProjectOption[];
  sort: SortType;
  setSearch: (value: string) => void;
  setSelectedStage: (value: StageType | "all") => void;
  setSelectedTag: (value: string) => void;
  setSelectedProjectId: (value: string) => void;
  setSort: (value: SortType) => void;
  resetFilters: () => void;
};

export function DevlogFilterBar({
  search,
  selectedStage,
  selectedTag,
  selectedProjectId,
  allTags,
  projects,
  sort,
  setSearch,
  setSelectedStage,
  setSelectedTag,
  setSelectedProjectId,
  setSort,
  resetFilters,
}: Props) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <SlidersHorizontal size={16} className="text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-700">필터</h2>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div className="md:col-span-2 xl:col-span-2">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
            <Search size={16} className="text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="제목, 요약, 내용, 설계, 태그 검색"
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none"
        >
          <option value="all">전체 프로젝트</option>
          {projects.map((project) => (
            <option key={project.id} value={String(project.id)}>
              {project.name}
            </option>
          ))}
        </select>

        <select
          value={selectedStage}
          onChange={(e) =>
            setSelectedStage(e.target.value as StageType | "all")
          }
          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none"
        >
          <option value="all">전체 단계</option>
          <option value="planning">기획</option>
          <option value="design">설계</option>
          <option value="implementation">구현</option>
          <option value="wrapup">마무리</option>
        </select>

        <select
          value={selectedTag}
          onChange={(e) => setSelectedTag(e.target.value)}
          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none"
        >
          {allTags.map((tag) => (
            <option key={tag} value={tag}>
              {tag === "all" ? "전체 태그" : tag}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setSort("latest")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
            sort === "latest"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          최신순
        </button>

        <button
          onClick={() => setSort("oldest")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
            sort === "oldest"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          오래된순
        </button>

        <button
          onClick={resetFilters}
          className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
        >
          필터 초기화
        </button>
      </div>
    </section>
  );
}
