"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  FileText,
  Eye,
  MessageSquare,
  Flag,
  Trash2,
  ChevronRight,
  Filter,
  CircleAlert,
} from "lucide-react";

type PostStatus = "ACTIVE" | "HIDDEN";
type PostCategory = "QUESTION" | "FREE" | "INFO" | "RECRUIT";

interface PostItem {
  id: number;
  title: string;
  content: string;
  author: string;
  authorEmail: string;
  category: PostCategory;
  status: PostStatus;
  createdAt: string;
  views: number;
  commentCount: number;
  reportCount: number;
}

const initialPosts: PostItem[] = [
  {
    id: 34,
    title: "Spring Boot 로그인 API 질문 있습니다",
    content:
      "Spring Security를 사용해서 로그인 API를 구현하고 있는데 403 오류가 발생합니다.",
    author: "김개발",
    authorEmail: "dev01@example.com",
    category: "QUESTION",
    status: "ACTIVE",
    createdAt: "2026.09.01 14:32",
    views: 128,
    commentCount: 7,
    reportCount: 2,
  },
  {
    id: 33,
    title: "React 상태관리 어떤 거 사용하시나요?",
    content:
      "프로젝트 규모가 조금 커지고 있는데 Redux와 Zustand 중 어떤 것을 사용하는 게 좋을까요?",
    author: "이코딩",
    authorEmail: "coding02@example.com",
    category: "QUESTION",
    status: "ACTIVE",
    createdAt: "2026.09.01 12:15",
    views: 84,
    commentCount: 12,
    reportCount: 0,
  },
  {
    id: 32,
    title: "졸업 프로젝트 백엔드 팀원 구합니다",
    content:
      "Spring Boot 경험이 있는 백엔드 팀원을 모집하고 있습니다.",
    author: "박프론트",
    authorEmail: "front03@example.com",
    category: "RECRUIT",
    status: "ACTIVE",
    createdAt: "2026.08.31 22:10",
    views: 201,
    commentCount: 4,
    reportCount: 0,
  },
  {
    id: 31,
    title: "VS Code 유용한 단축키 공유",
    content:
      "개발할 때 자주 사용하는 VS Code 단축키를 정리해봤습니다.",
    author: "정자바",
    authorEmail: "java05@example.com",
    category: "INFO",
    status: "ACTIVE",
    createdAt: "2026.08.31 17:44",
    views: 165,
    commentCount: 6,
    reportCount: 0,
  },
  {
    id: 30,
    title: "오늘도 개발 화이팅",
    content: "다들 프로젝트 마감까지 힘냅시다.",
    author: "한리액트",
    authorEmail: "react06@example.com",
    category: "FREE",
    status: "ACTIVE",
    createdAt: "2026.08.31 15:20",
    views: 56,
    commentCount: 8,
    reportCount: 0,
  },
  {
    id: 29,
    title: "무료 광고 사이트 공유합니다!!!",
    content:
      "광고성 게시글입니다. 반복적인 홍보성 링크가 포함되어 있습니다.",
    author: "최백엔드",
    authorEmail: "backend04@example.com",
    category: "FREE",
    status: "ACTIVE",
    createdAt: "2026.08.30 23:51",
    views: 92,
    commentCount: 2,
    reportCount: 5,
  },
  {
    id: 28,
    title: "MySQL 외래키 설정 질문",
    content:
      "프로젝트 삭제 시 연관 테이블 데이터를 함께 삭제하고 싶습니다.",
    author: "오스프링",
    authorEmail: "spring07@example.com",
    category: "QUESTION",
    status: "ACTIVE",
    createdAt: "2026.08.30 19:33",
    views: 142,
    commentCount: 11,
    reportCount: 1,
  },
  {
    id: 27,
    title: "Next.js 프로젝트 구조 정리",
    content:
      "App Router를 기준으로 제가 사용 중인 폴더 구조를 공유합니다.",
    author: "김개발",
    authorEmail: "dev01@example.com",
    category: "INFO",
    status: "ACTIVE",
    createdAt: "2026.08.30 11:17",
    views: 223,
    commentCount: 9,
    reportCount: 0,
  },
];

type CategoryFilter = "ALL" | PostCategory;
type StatusFilter = "ALL" | PostStatus;

const categoryLabel: Record<PostCategory, string> = {
  QUESTION: "질문",
  FREE: "자유",
  INFO: "정보",
  RECRUIT: "팀원 모집",
};

const categoryStyle: Record<PostCategory, string> = {
  QUESTION: "border-blue-100 bg-blue-50 text-blue-700",
  FREE: "border-gray-200 bg-gray-50 text-gray-600",
  INFO: "border-emerald-100 bg-emerald-50 text-emerald-700",
  RECRUIT: "border-violet-100 bg-violet-50 text-violet-700",
};

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<PostItem[]>(initialPosts);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState<CategoryFilter>("ALL");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("ALL");

  const filteredPosts = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    return posts.filter((post) => {
      const matchesKeyword =
        keyword === "" ||
        post.title.toLowerCase().includes(keyword) ||
        post.author.toLowerCase().includes(keyword) ||
        post.authorEmail.toLowerCase().includes(keyword);

      const matchesCategory =
        categoryFilter === "ALL" ||
        post.category === categoryFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        post.status === statusFilter;

      return matchesKeyword && matchesCategory && matchesStatus;
    });
  }, [
    posts,
    searchKeyword,
    categoryFilter,
    statusFilter,
  ]);

  const totalCount = posts.length;

  const reportedPostCount = posts.filter(
    (post) => post.reportCount > 0,
  ).length;

  const totalReportCount = posts.reduce(
    (sum, post) => sum + post.reportCount,
    0,
  );

  const totalViewCount = posts.reduce(
    (sum, post) => sum + post.views,
    0,
  );

  const handleDelete = (post: PostItem) => {
    const confirmed = window.confirm(
      `"${post.title}" 게시글을 삭제하시겠습니까?\n삭제된 게시글은 복구할 수 없습니다.`,
    );

    if (!confirmed) return;

    /*
     * 추후 백엔드 연결
     *
     * DELETE /api/admin/posts/{postId}
     */

    setPosts((prev) =>
      prev.filter((item) => item.id !== post.id),
    );
  };

  const resetFilters = () => {
    setSearchKeyword("");
    setCategoryFilter("ALL");
    setStatusFilter("ALL");
  };

  const hasFilter =
    searchKeyword !== "" ||
    categoryFilter !== "ALL" ||
    statusFilter !== "ALL";

  return (
    <div className="mx-auto w-full max-w-[1500px]">
      {/* =========================
          페이지 제목
      ========================= */}
      <section className="mb-8">
        <p className="mb-2 text-sm font-medium text-gray-400">
          Board Management
        </p>

        <h1 className="text-[28px] font-bold tracking-tight text-gray-900">
          게시판 관리
        </h1>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          WAIVS 게시판의 게시글을 조회하고 부적절한 콘텐츠를
          관리할 수 있습니다.
        </p>
      </section>

      {/* =========================
          요약 카드
      ========================= */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="전체 게시글"
          value={totalCount}
          unit="개"
          icon={FileText}
        />

        <SummaryCard
          title="신고된 게시글"
          value={reportedPostCount}
          unit="개"
          icon={Flag}
          danger={reportedPostCount > 0}
        />

        <SummaryCard
          title="누적 신고"
          value={totalReportCount}
          unit="건"
          icon={CircleAlert}
          danger={totalReportCount > 0}
        />

        <SummaryCard
          title="누적 조회"
          value={totalViewCount}
          unit="회"
          icon={Eye}
        />
      </section>

      {/* =========================
          게시글 목록
      ========================= */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* 상단 */}
        <div className="border-b border-gray-200 px-6 py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                게시글 목록
              </h2>

              <p className="mt-1 text-xs text-gray-400">
                등록된 게시글을 검색하거나 관리자 권한으로 삭제할 수
                있습니다.
              </p>
            </div>

            {/* 검색 및 필터 */}
            <div className="flex flex-col gap-3 lg:flex-row">
              {/* 검색 */}
              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) =>
                    setSearchKeyword(e.target.value)
                  }
                  placeholder="제목 또는 작성자 검색"
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-gray-400 sm:w-[260px]"
                />
              </div>

              {/* 게시판 유형 */}
              <div className="relative">
                <Filter
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <select
                  value={categoryFilter}
                  onChange={(e) =>
                    setCategoryFilter(
                      e.target.value as CategoryFilter,
                    )
                  }
                  className="h-11 min-w-[145px] appearance-none rounded-lg border border-gray-200 bg-white pl-10 pr-9 text-sm text-gray-600 outline-none transition focus:border-gray-400"
                >
                  <option value="ALL">
                    전체 유형
                  </option>
                  <option value="QUESTION">
                    질문
                  </option>
                  <option value="FREE">
                    자유
                  </option>
                  <option value="INFO">
                    정보
                  </option>
                  <option value="RECRUIT">
                    팀원 모집
                  </option>
                </select>

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                  ▼
                </span>
              </div>

              {/* 상태 */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value as StatusFilter,
                    )
                  }
                  className="h-11 min-w-[125px] appearance-none rounded-lg border border-gray-200 bg-white pl-4 pr-9 text-sm text-gray-600 outline-none transition focus:border-gray-400"
                >
                  <option value="ALL">
                    전체 상태
                  </option>
                  <option value="ACTIVE">
                    게시 중
                  </option>
                  <option value="HIDDEN">
                    숨김
                  </option>
                </select>

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                  ▼
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 결과 영역 */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/60 px-6 py-3">
          <p className="text-xs text-gray-500">
            검색 결과
            <span className="ml-1.5 font-bold text-gray-800">
              {filteredPosts.length}
            </span>
            건
          </p>

          {hasFilter && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-semibold text-gray-500 transition hover:text-gray-900"
            >
              필터 초기화
            </button>
          )}
        </div>

        {/* 테이블 */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-[70px] px-5 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  번호
                </th>

                <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  게시글
                </th>

                <th className="w-[120px] px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  유형
                </th>

                <th className="w-[150px] px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  작성일
                </th>

                <th className="w-[80px] px-4 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  조회
                </th>

                <th className="w-[80px] px-4 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  댓글
                </th>

                <th className="w-[80px] px-4 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  신고
                </th>

                <th className="w-[90px] px-4 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  상태
                </th>

                <th className="w-[175px] px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  관리
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredPosts.length > 0 ? (
                filteredPosts.map((post) => (
                  <tr
                    key={post.id}
                    className="transition hover:bg-gray-50/70"
                  >
                    {/* 번호 */}
                    <td className="px-5 py-4 text-center text-sm text-gray-400">
                      {post.id}
                    </td>

                    {/* 게시글 */}
                    <td className="px-4 py-4">
                      <div className="max-w-[420px]">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-gray-800">
                            {post.title}
                          </p>

                          {post.reportCount > 0 && (
                            <Flag
                              size={14}
                              className="shrink-0 text-red-500"
                            />
                          )}
                        </div>

                        <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-400">
                          <span className="font-medium text-gray-500">
                            {post.author}
                          </span>

                          <span className="text-gray-300">
                            •
                          </span>

                          <span className="truncate">
                            {post.authorEmail}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 유형 */}
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                          categoryStyle[post.category]
                        }`}
                      >
                        {categoryLabel[post.category]}
                      </span>
                    </td>

                    {/* 작성일 */}
                    <td className="px-4 py-4 text-xs text-gray-500">
                      {post.createdAt}
                    </td>

                    {/* 조회 */}
                    <td className="px-4 py-4 text-center">
                      <div className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                        <Eye size={14} />
                        {post.views}
                      </div>
                    </td>

                    {/* 댓글 */}
                    <td className="px-4 py-4 text-center">
                      <div className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                        <MessageSquare size={14} />
                        {post.commentCount}
                      </div>
                    </td>

                    {/* 신고 */}
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex min-w-8 items-center justify-center rounded-full px-2 py-1 text-xs font-semibold ${
                          post.reportCount > 0
                            ? "bg-red-50 text-red-600"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {post.reportCount}
                      </span>
                    </td>

                    {/* 상태 */}
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                          post.status === "ACTIVE"
                            ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                            : "border-gray-200 bg-gray-100 text-gray-500"
                        }`}
                      >
                        {post.status === "ACTIVE"
                          ? "게시 중"
                          : "숨김"}
                      </span>
                    </td>

                    {/* 관리 */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/posts/${post.id}`}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
                        >
                          상세
                          <ChevronRight size={14} />
                        </Link>

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(post)
                          }
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                        >
                          <Trash2 size={14} />
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-20 text-center"
                  >
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                      <Search size={20} />
                    </div>

                    <p className="mt-4 text-sm font-semibold text-gray-700">
                      검색 결과가 없습니다.
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      다른 검색어나 필터 조건을 사용해보세요.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 하단 */}
        <div className="flex flex-col gap-3 border-t border-gray-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-400">
            전체 게시글 {totalCount}개 중{" "}
            {filteredPosts.length}개 표시
          </p>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled
              className="flex h-8 min-w-8 cursor-not-allowed items-center justify-center rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-300"
            >
              이전
            </button>

            <button
              type="button"
              className="flex h-8 min-w-8 items-center justify-center rounded-md bg-gray-900 px-2 text-xs font-semibold text-white"
            >
              1
            </button>

            <button
              type="button"
              disabled
              className="flex h-8 min-w-8 cursor-not-allowed items-center justify-center rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-300"
            >
              다음
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

/* =========================
   요약 카드
========================= */

function SummaryCard({
  title,
  value,
  unit,
  icon: Icon,
  danger = false,
}: {
  title: string;
  value: number;
  unit: string;
  icon: React.ElementType;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-500">
            {title}
          </p>

          <div className="mt-2 flex items-end gap-1">
            <span
              className={`text-[28px] font-bold leading-none ${
                danger && value > 0
                  ? "text-red-600"
                  : "text-gray-900"
              }`}
            >
              {value.toLocaleString()}
            </span>

            <span className="pb-0.5 text-sm text-gray-400">
              {unit}
            </span>
          </div>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            danger && value > 0
              ? "bg-red-50 text-red-500"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}