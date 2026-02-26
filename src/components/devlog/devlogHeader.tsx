"use client";

import { useState } from "react";
import { Search } from "lucide-react";

export type SortKey = "latest" | "oldest";

export function DevlogListHeader() {
  const [sort, setSort] = useState<SortKey>("latest");
  const [q, setQ] = useState("");

  return (
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

        <div className="ml-auto flex flex-col gap-3 md:flex-row md:items-center md:gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="latest">최신순</option>
              <option value="oldest">오래된순</option>
            </select>
          </div>

          <div className="relative w-full md:w-72">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="검색"
              className="w-full rounded-full border border-gray-200 bg-white pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-200"
            />
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>
        </div>
      </div>
  );
}