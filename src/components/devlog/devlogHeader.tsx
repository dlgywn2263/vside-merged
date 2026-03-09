"use client";

import { Search, ArrowUpDown } from "lucide-react";

type DevlogListHeaderProps = {
  keyword: string;
  sort: "latest" | "oldest";
  onKeywordChange: (value: string) => void;
  onSortChange: (value: "latest" | "oldest") => void;
};

export function DevlogListHeader({
  keyword,
  sort,
  onKeywordChange,
  onSortChange,
}: DevlogListHeaderProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">개발일지 목록</h2>
          <p className="mt-1 text-sm text-gray-500">
            제목, 요약, 내용, 태그 기준으로 검색하고 날짜순으로 정렬합니다.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-[240px]">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={keyword}
              onChange={(e) => onKeywordChange(e.target.value)}
              placeholder="제목, 요약, 태그 검색"
              className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 outline-none transition focus:border-gray-300 focus:ring-2 focus:ring-gray-100"
            />
          </div>

          <div className="relative">
            <ArrowUpDown
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <select
              value={sort}
              onChange={(e) =>
                onSortChange(e.target.value as "latest" | "oldest")
              }
              className="h-10 rounded-lg border border-gray-200 bg-white pl-9 pr-8 text-sm text-gray-900 outline-none transition focus:border-gray-300 focus:ring-2 focus:ring-gray-100"
            >
              <option value="latest">최신순</option>
              <option value="oldest">오래된순</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
