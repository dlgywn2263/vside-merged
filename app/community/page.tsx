"use client";

import Link from "next/link";
import {
  Search,
  Loader2,
  Flame,
  Eye,
  Heart,
  Bookmark,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useState, useCallback, useMemo } from "react";

import CommunityHeader from "@/components/community/CommunityHeader";
import PostCard from "@/components/community/PostCard";
import { fetchPosts } from "@/lib/communityApi";

const categoryMap: Record<string, string> = {
  전체: "All",
  질문: "Question",
  자유: "Free",
  정보: "Info",
  "AI 도움": "AIHelp",
};

const categories = Object.keys(categoryMap);

const categoryLabel: Record<string, string> = {
  Question: "질문",
  Free: "자유",
  Info: "정보",
  AIHelp: "AI 도움",
};

const categoryStyle: Record<string, string> = {
  Question: "bg-blue-50 text-blue-600",
  Free: "bg-violet-50 text-violet-600",
  Info: "bg-emerald-50 text-emerald-600",
  AIHelp: "bg-amber-50 text-amber-600",
  Showcase: "bg-pink-50 text-pink-600",
};

export default function CommunityPage() {
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");

  const [posts, setPosts] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
      setCurrentPage(0);
    }, 500);

    return () => clearTimeout(timer);
  }, [keyword]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(0);
  };

  const loadPosts = useCallback(async () => {
    setIsLoading(true);

    try {
      const categoryValue = categoryMap[selectedCategory];

      const data = await fetchPosts(
        categoryValue === "All" ? undefined : categoryValue,
        debouncedKeyword || undefined,
        currentPage,
        10
      );

      const loadedPosts = data.content ?? [];

      setPosts(loadedPosts);
      setTotalPages(data.totalPages ?? 0);
      setTotalElements(data.totalElements ?? loadedPosts.length);
    } catch (error) {
      console.error("게시글을 불러오는데 실패했습니다.", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, debouncedKeyword, currentPage]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    const refreshPosts = () => {
      loadPosts();
    };

    window.addEventListener("pageshow", refreshPosts);
    window.addEventListener("focus", refreshPosts);

    return () => {
      window.removeEventListener("pageshow", refreshPosts);
      window.removeEventListener("focus", refreshPosts);
    };
  }, [loadPosts]);

  const hotPosts = useMemo(() => {
    return [...posts]
      .sort((a, b) => {
        const aViews = a.viewCount ?? a.views ?? 0;
        const bViews = b.viewCount ?? b.views ?? 0;

        const aLikes = a.likeCount ?? a.likes ?? 0;
        const bLikes = b.likeCount ?? b.likes ?? 0;

        const aScraps = a.scrapCount ?? a.scraps ?? 0;
        const bScraps = b.scrapCount ?? b.scraps ?? 0;

        const aScore =
          Number(aViews) +
          Number(aLikes) * 4 +
          Number(aScraps) * 5;

        const bScore =
          Number(bViews) +
          Number(bLikes) * 4 +
          Number(bScraps) * 5;

        return bScore - aScore;
      })
      .slice(0, 5);
  }, [posts]);

  const savePostInfo = (post: any) => {
    const views = post.viewCount ?? post.views ?? 0;

    sessionStorage.setItem(
      `community-view-${post.id}`,
      String(views)
    );
  };

  return (
    <main className="min-h-screen bg-[#f5f6fa] via-white to-white px-5 py-10 text-slate-900 md:px-8">
      <div className="mx-auto max-w-[1240px]">
        <CommunityHeader />

        {/* 카테고리 + 검색 */}
        <div className="mb-7 mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2.5">
            {categories.map((item) => {
              const active = selectedCategory === item;

              return (
                <button
                  key={item}
                  onClick={() => handleCategoryChange(item)}
                  className={`min-w-[72px] rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-200/60"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-[360px]">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="제목, 내용 검색"
              className="w-full rounded-full border border-slate-200 bg-white py-3 pl-11 pr-5 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100/60"
            />
          </div>
        </div>

        {/* 게시글 + HOT */}
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          {/* 게시글 목록 */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">
                  {selectedCategory === "전체"
                    ? "전체 게시글"
                    : `${selectedCategory} 게시글`}
                </h2>

                {!isLoading && (
                  <span className="text-sm font-bold text-blue-600">
                    {totalElements}개
                  </span>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />

                <p className="mt-4 text-sm text-slate-400">
                  게시글을 불러오는 중입니다...
                </p>
              </div>
            ) : posts.length > 0 ? (
              <div>
                {posts.map((post, index) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    isLast={index === posts.length - 1}
                  />
                ))}
              </div>
            ) : (
              <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
                <p className="mt-4 font-semibold text-slate-600">
                  게시글을 찾을 수 없습니다.
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  다른 검색어나 카테고리를 선택해보세요.
                </p>
              </div>
            )}
          </section>

          {/* HOT 게시글 */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-5">
                <Flame size={20} className="text-orange-500" />
                <h2 className="text-[17px] font-bold">
                  HOT 게시글
                </h2>
              </div>

              <div className="px-3 py-2">
                {hotPosts.length > 0 ? (
                  hotPosts.map((post, index) => {
                    const views =
                      post.viewCount ??
                      post.views ??
                      0;

                    const likes =
                      post.likeCount ??
                      post.likes ??
                      0;

                    const scraps =
                      post.scrapCount ??
                      post.scraps ??
                      0;

                    const rankStyle =
                      index === 0
                        ? "bg-orange-500 text-white"
                        : index === 1
                        ? "bg-blue-400 text-white"
                        : index === 2
                        ? "bg-violet-400 text-white"
                        : "bg-slate-100 text-slate-500";

                    return (
                      <Link
                        key={post.id}
                        href={`/community/${post.id}`}
                        onClick={() => savePostInfo(post)}
                        className="group flex gap-3 rounded-xl px-2 py-4 transition hover:bg-slate-50"
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${rankStyle}`}
                        >
                          {index + 1}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-[13px] font-semibold leading-5 text-slate-800 group-hover:text-blue-600">
                            {post.title}
                          </p>

                          <span
                            className={`mt-1.5 inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                              categoryStyle[post.category] ??
                              "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {categoryLabel[post.category] ??
                              post.category}
                          </span>

                          <div className="mt-2.5 flex items-center gap-3 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Eye size={12} />
                              {views}
                            </span>

                            <span className="flex items-center gap-1">
                              <Heart size={12} />
                              {likes}
                            </span>

                            <span className="flex items-center gap-1">
                              <Bookmark size={12} />
                              {scraps}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="flex min-h-[240px] items-center justify-center px-4 text-center text-xs text-slate-400">
                    아직 인기 게시글이 없습니다.
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>

        {/* 페이지네이션 */}
        {!isLoading && totalPages > 1 && (
          <div className="mt-9 flex items-center justify-center gap-1.5 lg:pr-[300px]">
            <button
              onClick={() =>
                setCurrentPage((p) =>
                  Math.max(0, p - 1)
                )
              }
              disabled={currentPage === 0}
              className="mr-2 flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
              이전
            </button>

            {Array.from(
              { length: totalPages },
              (_, index) => (
                <button
                  key={index}
                  onClick={() =>
                    setCurrentPage(index)
                  }
                  className={`flex h-9 min-w-9 items-center justify-center rounded-lg text-sm font-semibold ${
                    currentPage === index
                      ? "bg-blue-600 text-white"
                      : "bg-white text-slate-500 hover:bg-blue-50"
                  }`}
                >
                  {index + 1}
                </button>
              )
            )}

            <button
              onClick={() =>
                setCurrentPage((p) =>
                  Math.min(
                    totalPages - 1,
                    p + 1
                  )
                )
              }
              disabled={
                currentPage === totalPages - 1
              }
              className="ml-2 flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500 disabled:opacity-40"
            >
              다음
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </main>
  );
}