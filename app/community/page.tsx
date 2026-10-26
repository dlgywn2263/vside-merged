"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Search,
  Loader2,
  Flame,
  Eye,
  Heart,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Megaphone,
  ArrowUpDown,
} from "lucide-react";

import CommunityHeader from "@/components/community/CommunityHeader";
import { fetchPosts } from "@/lib/communityApi";
import { apiJson } from "@/lib/api/apiClient";

const categoryMap: Record<string, string> = {
  전체: "All",
  질문: "Question",
  자유: "Free",
  정보: "Info",
  "AI 도움": "AIHelp",
  "팀원 모집": "TeamRecruit",
};

const categoryLabel: Record<string, string> = {
  Question: "질문",
  Free: "자유",
  Info: "정보",
  AIHelp: "AI 도움",
  TeamRecruit: "팀원 모집",
  Showcase: "쇼케이스",
  NOTICE: "공지",
};

const categoryStyle: Record<string, string> = {
  Question: "bg-blue-50 text-blue-600",
  Free: "bg-violet-50 text-violet-600",
  Info: "bg-emerald-50 text-emerald-600",
  AIHelp: "bg-amber-50 text-amber-600",
  TeamRecruit: "bg-cyan-50 text-cyan-600",
  Showcase: "bg-pink-50 text-pink-600",
};

type SortOption = "latest" | "oldest" | "recommended";

type PostItem = {
  id: number;
  title: string;
  category?: string;
  postType?: string;
  contentSnippet?: string;
  content?: string;
  authorName?: string;
  createdAt?: string;
  createdDate?: string;
  date?: string;
  updatedAt?: string;
  views?: number;
  viewCount?: number;
  likeCount?: number;
  likes?: number;
  recommendCount?: number;
  scrapCount?: number;
  scraps?: number;
  previewImageUrl?: string;
};

const isNotice = (post: PostItem) =>
  post.postType === "NOTICE" || post.category === "NOTICE";

const viewsOf = (post: PostItem) =>
  Number(post.viewCount ?? post.views ?? 0) || 0;

const likesOf = (post: PostItem) =>
  Number(post.likeCount ?? post.likes ?? post.recommendCount ?? 0) || 0;

const scrapsOf = (post: PostItem) =>
  Number(post.scrapCount ?? post.scraps ?? 0) || 0;

const timeOf = (post: PostItem) =>
  new Date(
    post.createdAt ??
      post.createdDate ??
      post.date ??
      post.updatedAt ??
      "",
  ).getTime() || 0;

const formatDate = (value?: string) =>
  value ? value.replace("T", " ").slice(0, 10) : "-";

function savePostInfo(post: PostItem) {
  sessionStorage.setItem(
    `community-view-${post.id}`,
    String(viewsOf(post)),
  );
}

export default function CommunityPage() {
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("latest");

  const [posts, setPosts] = useState<PostItem[]>([]);
  const [notices, setNotices] = useState<PostItem[]>([]);
  const [showAllNotices, setShowAllNotices] = useState(false);

  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isNoticeLoading, setIsNoticeLoading] = useState(true);
  const [error, setError] = useState("");
  const [noticeError, setNoticeError] = useState("");

  const postsRequest = useRef(0);
  const noticeRequest = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
      setCurrentPage(0);
    }, 500);

    return () => clearTimeout(timer);
  }, [keyword]);

  const loadNotices = useCallback(async () => {
    const request = ++noticeRequest.current;
    setIsNoticeLoading(true);

    try {
      const data = await apiJson(
        "/api/posts?category=NOTICE&page=0&size=10",
      );

      if (request !== noticeRequest.current) return;

      const loaded: PostItem[] = Array.isArray(data?.content)
        ? data.content
        : [];

      setNotices(
        loaded.filter(isNotice).sort((a, b) => timeOf(b) - timeOf(a)),
      );
      setNoticeError("");
    } catch {
      if (request === noticeRequest.current) {
        setNoticeError("공지를 불러오지 못했습니다.");
      }
    } finally {
      if (request === noticeRequest.current) {
        setIsNoticeLoading(false);
      }
    }
  }, []);

  const loadPosts = useCallback(async () => {
    const request = ++postsRequest.current;
    setIsLoading(true);

    try {
      const category = categoryMap[selectedCategory];

      const data = await fetchPosts(
        category === "All" ? undefined : category,
        debouncedKeyword || undefined,
        currentPage,
        10,
      );

      if (request !== postsRequest.current) return;

      const loaded: PostItem[] = Array.isArray(data?.content)
        ? data.content
        : [];

      setPosts(loaded.filter((post) => !isNotice(post)));
      setTotalPages(data?.totalPages ?? 0);

      const total =
        Number(data?.totalElements ?? loaded.length) || 0;

      setTotalElements(
        Math.max(0, total - loaded.filter(isNotice).length),
      );
      setError("");
    } catch {
      if (request === postsRequest.current) {
        setError("게시글을 불러오지 못했습니다.");
      }
    } finally {
      if (request === postsRequest.current) {
        setIsLoading(false);
      }
    }
  }, [selectedCategory, debouncedKeyword, currentPage]);

  useEffect(() => {
    void loadPosts();

    return () => {
      postsRequest.current++;
    };
  }, [loadPosts]);

  useEffect(() => {
    void loadNotices();

    return () => {
      noticeRequest.current++;
    };
  }, [loadNotices]);

  useEffect(() => {
    const refresh = () => {
      void loadPosts();
      void loadNotices();
    };

    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);

    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, [loadPosts, loadNotices]);

  // 기존과 동일하게 현재 조회한 페이지 안에서 정렬합니다.
  const sortedPosts = useMemo(
    () =>
      [...posts].sort((a, b) => {
        if (sortOption === "oldest") {
          return timeOf(a) - timeOf(b);
        }

        if (sortOption === "recommended") {
          return (
            likesOf(b) - likesOf(a) ||
            viewsOf(b) - viewsOf(a) ||
            timeOf(b) - timeOf(a)
          );
        }

        return timeOf(b) - timeOf(a);
      }),
    [posts, sortOption],
  );

  const hotPosts = useMemo(
    () =>
      [...posts]
        .sort(
          (a, b) =>
            viewsOf(b) +
            likesOf(b) * 4 +
            scrapsOf(b) * 5 -
            (viewsOf(a) + likesOf(a) * 4 + scrapsOf(a) * 5),
        )
        .slice(0, 5),
    [posts],
  );

  // 기본으로 최신 공지 1개만 표시
  const visibleNotices = showAllNotices
    ? notices
    : notices.slice(0, 1);

  const pageStart = Math.max(
    0,
    Math.min(currentPage - 2, totalPages - 5),
  );

  return (
    <main className="flex-1 bg-[#f5f6fa] px-4 pb-8 pt-4 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-[1240px]">
        {/* 게시판 헤더 */}
        <div className="mb-4 [&>*]:!my-0 [&>*]:!py-0 [&_h1]:!text-2xl [&_p]:!mt-1 [&_p]:!text-xs">
          <CommunityHeader />
        </div>

        {/* 카테고리 / 정렬 / 검색 */}
        <div className="mb-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div
            className="flex gap-1.5 overflow-x-auto pb-1 xl:pb-0"
            aria-label="게시글 카테고리"
          >
            {Object.keys(categoryMap).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={selectedCategory === item}
                onClick={() => {
                  setSelectedCategory(item);
                  setCurrentPage(0);
                }}
                className={`h-9 shrink-0 rounded-xl border px-3.5 text-[13px] font-semibold transition ${
                  selectedCategory === item
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="flex min-w-0 gap-2 xl:w-[390px]">
            <div className="relative shrink-0">
              <ArrowUpDown
                size={13}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <select
                aria-label="게시글 정렬"
                value={sortOption}
                onChange={(event) => {
                  setSortOption(event.target.value as SortOption);
                  setCurrentPage(0);
                }}
                className="h-9 appearance-none rounded-lg border border-slate-200 bg-white pl-8 pr-8 text-[13px] font-medium text-slate-600 outline-none transition-colors hover:bg-slate-50 focus:border-blue-400"
              >
                <option value="latest">최신순</option>
                <option value="oldest">오래된순</option>
                <option value="recommended">추천순</option>
              </select>

              <ChevronDown
                size={13}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            <div className="relative min-w-0 flex-1">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                aria-label="게시글 검색"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="제목, 내용 검색"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[13px] outline-none placeholder:text-slate-400 focus:border-blue-400"
              />
            </div>
          </div>
        </div>

        {/* 독립된 공지사항 카드 */}
        <section
          aria-labelledby="community-notice-heading"
          className="mb-4 overflow-hidden rounded-xl border border-blue-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        >
          <div className="flex flex-col sm:flex-row sm:items-stretch">
            {/* 공지사항 라벨 */}
            <div className="flex shrink-0 items-center gap-2 border-b border-blue-100 bg-blue-50 px-4 py-2.5 sm:w-[160px] sm:border-b-0 sm:border-r sm:px-5 sm:py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                <Megaphone size={16} aria-hidden="true" />
              </span>

              <h2
                id="community-notice-heading"
                className="text-sm font-bold text-blue-950"
              >
                공지사항
              </h2>
            </div>

            {/* 공지 목록 */}
            <div
              id="community-notice-list"
              className="min-w-0 flex-1 divide-y divide-slate-100"
            >
              {visibleNotices.map((notice) => (
                <Link
                  key={notice.id}
                  href={`/community/${notice.id}`}
                  onClick={() => savePostInfo(notice)}
                  className="group flex min-h-[56px] items-center gap-3 px-4 py-3 transition hover:bg-blue-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:px-5"
                >
                  <span className="shrink-0 rounded-md bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-600">
                    관리자
                  </span>

                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900 group-hover:text-blue-600">
                    {notice.title}
                  </span>

                  <time className="hidden shrink-0 text-[13px] text-slate-400 md:block">
                    {formatDate(notice.createdAt)}
                  </time>

                  <ChevronRight
                    size={16}
                    aria-hidden="true"
                    className="shrink-0 text-slate-400 group-hover:text-blue-600"
                  />
                </Link>
              ))}

              {noticeError ? (
                <div
                  role="alert"
                  className="flex min-h-[64px] flex-wrap items-center gap-2 px-4 py-3 text-xs text-red-500 sm:px-5"
                >
                  {noticeError}

                  <button
                    type="button"
                    onClick={() => void loadNotices()}
                    className="font-semibold underline"
                  >
                    다시 조회
                  </button>
                </div>
              ) : isNoticeLoading && !notices.length ? (
                <p
                  role="status"
                  className="flex min-h-[64px] items-center gap-2 px-4 py-3 text-xs text-slate-500 sm:px-5"
                >
                  <Loader2 size={14} className="animate-spin" />
                  공지를 불러오는 중입니다.
                </p>
              ) : !notices.length ? (
                <p className="flex min-h-[64px] items-center px-4 py-3 text-xs text-slate-400 sm:px-5">
                  등록된 공지가 없습니다.
                </p>
              ) : null}
            </div>

            {/* 추가 공지 펼치기 */}
            {notices.length > 1 && (
              <div className="flex shrink-0 items-start justify-end border-t border-blue-100 px-3 py-2 sm:border-t-0 sm:py-3">
                <button
                  type="button"
                  aria-expanded={showAllNotices}
                  aria-controls="community-notice-list"
                  onClick={() =>
                    setShowAllNotices((value) => !value)
                  }
                  className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs font-medium text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {showAllNotices
                    ? "접기"
                    : `더 보기 (${notices.length - 1})`}

                  <ChevronDown
                    size={14}
                    aria-hidden="true"
                    className={`transition-transform ${
                      showAllNotices ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>
            )}
          </div>
        </section>

        {/* 전체 게시글 + HOT 게시글 */}
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_250px]">
          <section
            className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            aria-label="게시글 목록"
          >
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
              <h2 className="text-sm font-bold">
                {selectedCategory === "전체"
                  ? "전체 게시글"
                  : `${selectedCategory} 게시글`}
              </h2>

              <span className="text-xs font-semibold text-blue-600">
                {totalElements}개
              </span>
            </div>

            {error ? (
              <div
                role="alert"
                className="px-5 py-10 text-center text-sm text-red-500"
              >
                {error}{" "}
                <button
                  onClick={() => void loadPosts()}
                  className="underline"
                >
                  다시 조회
                </button>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center gap-2 py-14 text-sm text-slate-400">
                <Loader2
                  size={20}
                  className="animate-spin text-blue-500"
                />
                게시글을 불러오는 중입니다.
              </div>
            ) : !sortedPosts.length ? (
              <div className="px-5 py-14 text-center text-sm text-slate-500">
                게시글을 찾을 수 없습니다.
                <p className="mt-1 text-xs text-slate-400">
                  다른 검색어나 카테고리를 선택해보세요.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {sortedPosts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/community/${post.id}`}
                    onClick={() => savePostInfo(post)}
                    className="group flex items-center gap-4 px-5 py-3.5 transition hover:bg-slate-50/80"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                            categoryStyle[post.category ?? ""] ??
                            "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {categoryLabel[post.category ?? ""] ??
                            post.category ??
                            "자유"}
                        </span>

                        <h3 className="min-w-0 truncate text-base font-semibold text-slate-900 group-hover:text-blue-600">
                          {post.title}
                        </h3>
                      </div>

                      {(post.contentSnippet || post.content) && (
                        <p className="mt-1 truncate text-sm leading-relaxed text-slate-500">
                          {post.contentSnippet || post.content}
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-slate-400">
                        <div className="flex min-w-0 items-center gap-2 text-[13px]">
                          <span className="max-w-[140px] truncate text-slate-500">
                            {post.authorName || "사용자"}
                          </span>
                          <span>·</span>
                          <time>
                            {formatDate(
                              post.createdAt ??
                                post.createdDate ??
                                post.date,
                            )}
                          </time>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className="inline-flex items-center gap-1"
                            aria-label={`조회 ${viewsOf(post)}`}
                          >
                            <Eye size={13} />
                            {viewsOf(post)}
                          </span>

                          <span
                            className="inline-flex items-center gap-1"
                            aria-label={`좋아요 ${likesOf(post)}`}
                          >
                            <Heart size={13} />
                            {likesOf(post)}
                          </span>

                          <span
                            className="inline-flex items-center gap-1"
                            aria-label={`스크랩 ${scrapsOf(post)}`}
                          >
                            <Bookmark size={13} />
                            {scrapsOf(post)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {post.previewImageUrl && (
                      <img
                        src={post.previewImageUrl}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-lg border border-slate-100 object-cover sm:h-[72px] sm:w-[72px]"
                      />
                    )}
                  </Link>
                ))}
              </div>
            )}

            {/* 페이지네이션 */}
            {!isLoading && totalPages > 1 && (
              <nav
                aria-label="게시글 페이지"
                className="flex flex-wrap items-center justify-center gap-1 border-t border-slate-100 px-3 py-4"
              >
                <button
                  type="button"
                  aria-label="이전 페이지"
                  disabled={currentPage === 0}
                  onClick={() =>
                    setCurrentPage((page) => Math.max(0, page - 1))
                  }
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from(
                  { length: Math.min(5, totalPages) },
                  (_, index) => pageStart + index,
                ).map((page) => (
                  <button
                    key={page}
                    type="button"
                    aria-current={
                      currentPage === page ? "page" : undefined
                    }
                    onClick={() => setCurrentPage(page)}
                    className={`h-8 min-w-8 rounded-lg text-xs font-semibold ${
                      currentPage === page
                        ? "bg-blue-600 text-white"
                        : "text-slate-500 hover:bg-blue-50"
                    }`}
                  >
                    {page + 1}
                  </button>
                ))}

                <button
                  type="button"
                  aria-label="다음 페이지"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.min(totalPages - 1, page + 1),
                    )
                  }
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </nav>
            )}
          </section>

          {/* HOT 게시글 */}
          <aside className="hidden min-w-0 lg:block">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                <Flame size={17} className="text-orange-500" />
                <h2 className="text-sm font-bold">HOT 게시글</h2>
              </div>

              <div className="divide-y divide-slate-100 px-4">
                {hotPosts.map((post, index) => (
                  <Link
                    key={post.id}
                    href={`/community/${post.id}`}
                    onClick={() => savePostInfo(post)}
                    className="group flex gap-3 py-3.5"
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                        index === 0
                          ? "bg-orange-50 text-orange-500"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-700 group-hover:text-blue-600">
                        {post.title}
                      </p>

                      <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-400">
                        <span className="truncate">
                          {categoryLabel[post.category ?? ""] ??
                            post.category}
                        </span>

                        <span className="flex items-center gap-1">
                          <Eye size={12} />
                          {viewsOf(post)}
                        </span>

                        <span className="flex items-center gap-1">
                          <Heart size={12} />
                          {likesOf(post)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}

                {!hotPosts.length && (
                  <p className="py-8 text-center text-xs text-slate-400">
                    {isLoading
                      ? "불러오는 중..."
                      : "아직 인기 게시글이 없습니다."}
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}