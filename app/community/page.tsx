"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import CommunityHeader from "@/components/community/CommunityHeader";
import PostCard from "@/components/community/PostCard";
import { mockPosts } from "@/components/community/CommunityMock";

const categories = ["전체", "질문", "자유", "정보", "AI 도움"];

const categoryMap = {
  전체: "All",
  질문: "Question",
  자유: "Free",
  정보: "Info",
  "AI 도움": "AIHelp",
} as const;

export default function CommunityPage() {
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [keyword, setKeyword] = useState("");

  const filteredPosts = useMemo(() => {
    return mockPosts.filter((post) => {
      const categoryValue =
        categoryMap[selectedCategory as keyof typeof categoryMap];

      const matchesCategory =
        categoryValue === "All" || post.category === categoryValue;

      const lowerKeyword = keyword.toLowerCase();

      const matchesKeyword =
        post.title.toLowerCase().includes(lowerKeyword) ||
        post.content.toLowerCase().includes(lowerKeyword) ||
        post.tags.some((tag) => tag.toLowerCase().includes(lowerKeyword));

      return matchesCategory && matchesKeyword;
    });
  }, [selectedCategory, keyword]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50/70 via-white to-white px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <CommunityHeader />

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {categories.map((item) => {
              const isActive = selectedCategory === item;

              return (
                <button
                  key={item}
                  onClick={() => setSelectedCategory(item)}
                  className={`rounded-full border px-5 py-2 text-sm font-medium transition ${
                    isActive
                      ? "border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-100"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-[360px]">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="제목, 내용, 태그 검색"
              className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}

          {filteredPosts.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-500">
              검색 결과가 없습니다.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}