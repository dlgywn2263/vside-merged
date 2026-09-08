"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Eye,
  FileText,
  Flag,
  Mail,
  MessageSquare,
  Trash2,
  User,
  AlertTriangle,
  EyeOff,
  EyeIcon,
} from "lucide-react";

type PostStatus = "ACTIVE" | "HIDDEN";
type PostCategory = "QUESTION" | "FREE" | "INFO" | "RECRUIT";

interface CommentItem {
  id: number;
  author: string;
  content: string;
  createdAt: string;
}

interface PostDetail {
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
  comments: CommentItem[];
}

const mockPosts: PostDetail[] = [
  {
    id: 34,
    title: "Spring Boot 로그인 API 질문 있습니다",
    content: `Spring Security를 사용해서 로그인 API를 구현하고 있는데 403 오류가 발생합니다.

현재 프론트에서는 로그인 요청 시 이메일과 비밀번호를 JSON 형식으로 보내고 있고,
백엔드에서는 Spring Security를 사용해서 인증을 처리하고 있습니다.

로그인 API 자체는 permitAll()로 설정했는데도 계속 403이 발생합니다.

혹시 CORS 설정이나 SecurityFilterChain 쪽에서 추가로 확인해야 하는 부분이 있을까요?`,
    author: "김개발",
    authorEmail: "dev01@example.com",
    category: "QUESTION",
    status: "ACTIVE",
    createdAt: "2026.09.01 14:32",
    views: 128,
    commentCount: 3,
    reportCount: 2,
    comments: [
      {
        id: 1,
        author: "이코딩",
        content:
          "SecurityConfig에서 해당 API 경로가 permitAll로 제대로 등록됐는지 확인해보세요.",
        createdAt: "2026.09.01 14:41",
      },
      {
        id: 2,
        author: "정자바",
        content:
          "CORS에서 credentials 설정과 allowedOrigins 설정도 같이 확인해보면 좋을 것 같습니다.",
        createdAt: "2026.09.01 14:52",
      },
      {
        id: 3,
        author: "박프론트",
        content:
          "개발자 도구 Network 탭에서 실제 요청 URL이 맞는지도 확인해보세요.",
        createdAt: "2026.09.01 15:03",
      },
    ],
  },

  {
    id: 33,
    title: "React 상태관리 어떤 거 사용하시나요?",
    content: `프로젝트 규모가 조금 커지고 있는데 Redux와 Zustand 중 어떤 것을 사용하는 게 좋을까요?

현재 전역으로 관리해야 하는 데이터는 로그인 사용자 정보, 프로젝트 정보,
현재 선택한 워크스페이스 정도입니다.

Redux Toolkit을 계속 사용하는 게 좋은지 궁금합니다.`,
    author: "이코딩",
    authorEmail: "coding02@example.com",
    category: "QUESTION",
    status: "ACTIVE",
    createdAt: "2026.09.01 12:15",
    views: 84,
    commentCount: 2,
    reportCount: 0,
    comments: [
      {
        id: 1,
        author: "한리액트",
        content:
          "규모가 크지 않으면 Zustand도 간단해서 괜찮다고 생각합니다.",
        createdAt: "2026.09.01 12:30",
      },
      {
        id: 2,
        author: "김개발",
        content:
          "이미 Redux Toolkit을 사용하고 있다면 굳이 바꾸지 않아도 될 것 같아요.",
        createdAt: "2026.09.01 13:12",
      },
    ],
  },

  {
    id: 32,
    title: "졸업 프로젝트 백엔드 팀원 구합니다",
    content: `졸업 프로젝트를 함께 진행할 백엔드 팀원을 모집합니다.

Spring Boot와 MySQL을 사용하며 REST API 개발 경험이 있는 분이면 좋겠습니다.

관심 있으신 분은 댓글 남겨주세요.`,
    author: "박프론트",
    authorEmail: "front03@example.com",
    category: "RECRUIT",
    status: "ACTIVE",
    createdAt: "2026.08.31 22:10",
    views: 201,
    commentCount: 1,
    reportCount: 0,
    comments: [
      {
        id: 1,
        author: "정자바",
        content: "혹시 현재 팀 인원은 몇 명인가요?",
        createdAt: "2026.08.31 22:32",
      },
    ],
  },

  {
    id: 31,
    title: "VS Code 유용한 단축키 공유",
    content: `개발할 때 자주 사용하는 VS Code 단축키를 정리해봤습니다.

Ctrl + P : 빠른 파일 검색
Ctrl + Shift + P : Command Palette
Ctrl + / : 주석 처리
Alt + ↑ / ↓ : 코드 줄 이동

도움이 되셨으면 좋겠습니다.`,
    author: "정자바",
    authorEmail: "java05@example.com",
    category: "INFO",
    status: "ACTIVE",
    createdAt: "2026.08.31 17:44",
    views: 165,
    commentCount: 1,
    reportCount: 0,
    comments: [
      {
        id: 1,
        author: "이코딩",
        content: "정리 감사합니다!",
        createdAt: "2026.08.31 18:01",
      },
    ],
  },

  {
    id: 30,
    title: "오늘도 개발 화이팅",
    content: `다들 프로젝트 마감까지 힘냅시다.

오늘도 개발하다가 오류만 잔뜩 봤네요.`,
    author: "한리액트",
    authorEmail: "react06@example.com",
    category: "FREE",
    status: "ACTIVE",
    createdAt: "2026.08.31 15:20",
    views: 56,
    commentCount: 1,
    reportCount: 0,
    comments: [
      {
        id: 1,
        author: "박프론트",
        content: "마감까지 화이팅입니다.",
        createdAt: "2026.08.31 15:32",
      },
    ],
  },

  {
    id: 29,
    title: "무료 광고 사이트 공유합니다!!!",
    content: `무료 이벤트 사이트를 공유합니다.

지금 가입하면 여러 혜택을 받을 수 있습니다.

광고 링크 1
광고 링크 2
광고 링크 3

여러 커뮤니티에서 공유 중입니다.`,
    author: "최백엔드",
    authorEmail: "backend04@example.com",
    category: "FREE",
    status: "ACTIVE",
    createdAt: "2026.08.30 23:51",
    views: 92,
    commentCount: 2,
    reportCount: 5,
    comments: [
      {
        id: 1,
        author: "김개발",
        content: "광고 게시글 아닌가요?",
        createdAt: "2026.08.31 00:02",
      },
      {
        id: 2,
        author: "관리자",
        content: "게시글 확인 예정입니다.",
        createdAt: "2026.08.31 09:12",
      },
    ],
  },

  {
    id: 28,
    title: "MySQL 외래키 설정 질문",
    content: `프로젝트 삭제 시 연관 테이블 데이터를 함께 삭제하고 싶습니다.

현재 project 테이블과 workspace 테이블이 외래키로 연결되어 있는데
프로젝트 삭제 시 foreign key constraint 오류가 발생합니다.

ON DELETE CASCADE를 사용하는 게 맞을까요?`,
    author: "오스프링",
    authorEmail: "spring07@example.com",
    category: "QUESTION",
    status: "ACTIVE",
    createdAt: "2026.08.30 19:33",
    views: 142,
    commentCount: 1,
    reportCount: 1,
    comments: [
      {
        id: 1,
        author: "정자바",
        content:
          "데이터 관계에 따라 CASCADE 적용 여부를 결정하는 게 좋습니다.",
        createdAt: "2026.08.30 20:11",
      },
    ],
  },

  {
    id: 27,
    title: "Next.js 프로젝트 구조 정리",
    content: `App Router 기준으로 현재 사용하고 있는 프로젝트 구조를 정리해봤습니다.

app/
components/
contexts/
lib/
types/

페이지별 컴포넌트와 공통 컴포넌트를 분리해서 관리하고 있습니다.`,
    author: "김개발",
    authorEmail: "dev01@example.com",
    category: "INFO",
    status: "ACTIVE",
    createdAt: "2026.08.30 11:17",
    views: 223,
    commentCount: 0,
    reportCount: 0,
    comments: [],
  },
];

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

export default function AdminPostDetailPage() {
  const router = useRouter();
  const params = useParams();

  const postId = Number(params.id);

  const post = useMemo(() => {
    return mockPosts.find((item) => item.id === postId);
  }, [postId]);

  const [status, setStatus] = useState<PostStatus>(
    post?.status ?? "ACTIVE",
  );

  if (!post) {
    return (
      <div className="mx-auto w-full max-w-[1400px]">
        <button
          type="button"
          onClick={() => router.push("/admin/posts")}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-900"
        >
          <ArrowLeft size={17} />
          게시판 관리로 돌아가기
        </button>

        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-24 text-center shadow-sm">
          <FileText
            size={35}
            className="mx-auto text-gray-300"
          />

          <p className="mt-5 text-base font-bold text-gray-800">
            게시글을 찾을 수 없습니다.
          </p>

          <p className="mt-2 text-sm text-gray-400">
            삭제되었거나 존재하지 않는 게시글입니다.
          </p>
        </div>
      </div>
    );
  }

  const handleDelete = () => {
    const confirmed = window.confirm(
      `"${post.title}" 게시글을 삭제하시겠습니까?\n삭제된 게시글은 복구할 수 없습니다.`,
    );

    if (!confirmed) return;

    /*
     * 추후 API 연결
     *
     * DELETE /api/admin/posts/{postId}
     */

    alert("게시글이 삭제되었습니다.");

    router.push("/admin/posts");
  };

  const handleToggleVisibility = () => {
    if (status === "ACTIVE") {
      const confirmed = window.confirm(
        "이 게시글을 숨김 처리하시겠습니까?",
      );

      if (!confirmed) return;

      /*
       * 추후 API 연결
       *
       * PATCH /api/admin/posts/{postId}/hide
       */

      setStatus("HIDDEN");

      return;
    }

    const confirmed = window.confirm(
      "숨김 처리된 게시글을 다시 공개하시겠습니까?",
    );

    if (!confirmed) return;

    /*
     * 추후 API 연결
     *
     * PATCH /api/admin/posts/{postId}/restore
     */

    setStatus("ACTIVE");
  };

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      {/* =========================
          상단
      ========================= */}
      <section className="mb-7">
        <button
          type="button"
          onClick={() => router.push("/admin/posts")}
          className="mb-5 flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-900"
        >
          <ArrowLeft size={17} />
          게시판 관리로 돌아가기
        </button>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-sm font-medium text-gray-400">
              Board Management
            </p>

            <h1 className="text-[28px] font-bold tracking-tight text-gray-900">
              게시글 상세
            </h1>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              게시글 내용과 작성자, 댓글 및 신고 현황을 확인할 수
              있습니다.
            </p>
          </div>

          {/* 관리자 버튼 */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleToggleVisibility}
              className={`flex h-11 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition ${
                status === "ACTIVE"
                  ? "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              {status === "ACTIVE" ? (
                <>
                  <EyeOff size={17} />
                  게시글 숨김
                </>
              ) : (
                <>
                  <EyeIcon size={17} />
                  다시 공개
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="flex h-11 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-600 transition hover:bg-red-100"
            >
              <Trash2 size={17} />
              게시글 삭제
            </button>
          </div>
        </div>
      </section>

      {/* =========================
          신고 경고
      ========================= */}
      {post.reportCount > 0 && (
        <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-red-100 bg-red-50/70 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
              <AlertTriangle size={19} />
            </div>

            <div>
              <p className="text-sm font-bold text-red-700">
                신고된 게시글입니다.
              </p>

              <p className="mt-1 text-xs leading-5 text-red-600/80">
                현재 이 게시글에 총 {post.reportCount}건의 신고가
                접수되어 있습니다. 게시글 내용을 확인한 후 필요한
                조치를 진행해주세요.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/admin/reports")}
            className="shrink-0 rounded-lg bg-red-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-red-700"
          >
            신고 목록 확인
          </button>
        </section>
      )}

      {/* =========================
          게시글 본문
      ========================= */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* 제목 */}
        <div className="border-b border-gray-200 px-7 py-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                categoryStyle[post.category]
              }`}
            >
              {categoryLabel[post.category]}
            </span>

            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                status === "ACTIVE"
                  ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                  : "border-gray-200 bg-gray-100 text-gray-500"
              }`}
            >
              {status === "ACTIVE" ? "게시 중" : "숨김"}
            </span>

            {post.reportCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600">
                <Flag size={11} />
                신고 {post.reportCount}건
              </span>
            )}
          </div>

          <h2 className="text-xl font-bold leading-8 text-gray-900">
            {post.title}
          </h2>
        </div>

        {/* 작성 정보 */}
        <div className="grid grid-cols-1 border-b border-gray-200 bg-gray-50/50 md:grid-cols-2 xl:grid-cols-4">
          <InfoItem
            icon={User}
            label="작성자"
            value={post.author}
          />

          <InfoItem
            icon={Mail}
            label="이메일"
            value={post.authorEmail}
          />

          <InfoItem
            icon={CalendarDays}
            label="작성일"
            value={post.createdAt}
          />

          <InfoItem
            icon={FileText}
            label="게시글 번호"
            value={`#${post.id}`}
          />
        </div>

        {/* 내용 */}
        <div className="px-7 py-8">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
            게시글 내용
          </p>

          <div className="min-h-[220px] whitespace-pre-wrap text-[14px] leading-7 text-gray-700">
            {post.content}
          </div>
        </div>

        {/* 통계 */}
        <div className="flex flex-wrap items-center gap-6 border-t border-gray-200 bg-gray-50/50 px-7 py-4">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Eye size={15} />
            조회
            <span className="font-bold text-gray-700">
              {post.views}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <MessageSquare size={15} />
            댓글
            <span className="font-bold text-gray-700">
              {post.comments.length}
            </span>
          </div>

          <div
            className={`flex items-center gap-2 text-xs ${
              post.reportCount > 0
                ? "text-red-500"
                : "text-gray-500"
            }`}
          >
            <Flag size={15} />
            신고
            <span
              className={`font-bold ${
                post.reportCount > 0
                  ? "text-red-600"
                  : "text-gray-700"
              }`}
            >
              {post.reportCount}
            </span>
          </div>
        </div>
      </section>

      {/* =========================
          댓글
      ========================= */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-7 py-5">
          <div className="flex items-center gap-2">
            <MessageSquare
              size={18}
              className="text-gray-500"
            />

            <h2 className="text-base font-bold text-gray-900">
              댓글
            </h2>

            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
              {post.comments.length}
            </span>
          </div>

          <p className="mt-1.5 text-xs text-gray-400">
            게시글에 작성된 댓글을 확인할 수 있습니다.
          </p>
        </div>

        {post.comments.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {post.comments.map((comment) => (
              <div
                key={comment.id}
                className="px-7 py-5"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                    {comment.author.charAt(0)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-gray-800">
                        {comment.author}
                      </p>

                      <span className="text-xs text-gray-300">
                        •
                      </span>

                      <p className="text-xs text-gray-400">
                        {comment.createdAt}
                      </p>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      {comment.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-7 py-16 text-center">
            <MessageSquare
              size={27}
              className="mx-auto text-gray-300"
            />

            <p className="mt-3 text-sm font-semibold text-gray-600">
              작성된 댓글이 없습니다.
            </p>
          </div>
        )}
      </section>

      {/* =========================
          관리자 조치
      ========================= */}
      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
        <h2 className="text-base font-bold text-gray-900">
          관리자 조치
        </h2>

        <p className="mt-1 text-xs leading-5 text-gray-400">
          서비스 운영 정책을 위반한 게시글에 대해 숨김 또는 삭제 처리를
          할 수 있습니다.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* 숨김 */}
          <div className="flex flex-col justify-between gap-5 rounded-xl border border-gray-200 bg-gray-50 p-5 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                {status === "ACTIVE" ? (
                  <EyeOff
                    size={17}
                    className="text-gray-500"
                  />
                ) : (
                  <EyeIcon
                    size={17}
                    className="text-emerald-600"
                  />
                )}

                <p className="text-sm font-bold text-gray-800">
                  {status === "ACTIVE"
                    ? "게시글 숨김"
                    : "게시글 공개"}
                </p>
              </div>

              <p className="mt-2 text-xs leading-5 text-gray-500">
                {status === "ACTIVE"
                  ? "게시글은 삭제하지 않고 일반 사용자에게 노출되지 않도록 처리합니다."
                  : "숨김 처리된 게시글을 다시 사용자에게 공개합니다."}
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggleVisibility}
              className="shrink-0 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
            >
              {status === "ACTIVE"
                ? "숨김 처리"
                : "다시 공개"}
            </button>
          </div>

          {/* 삭제 */}
          <div className="flex flex-col justify-between gap-5 rounded-xl border border-red-100 bg-red-50/50 p-5 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <Trash2
                  size={17}
                  className="text-red-500"
                />

                <p className="text-sm font-bold text-red-700">
                  게시글 삭제
                </p>
              </div>

              <p className="mt-2 text-xs leading-5 text-red-600/70">
                부적절한 게시글을 삭제합니다. 삭제된 게시글은 복구할 수
                없습니다.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDelete}
              className="shrink-0 rounded-lg bg-red-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-red-700"
            >
              게시글 삭제
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

/* =========================
   정보 항목
========================= */

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-gray-500 shadow-sm">
        <Icon size={15} />
      </div>

      <div className="min-w-0">
        <p className="text-[11px] font-medium text-gray-400">
          {label}
        </p>

        <p className="mt-0.5 truncate text-sm font-semibold text-gray-700">
          {value}
        </p>
      </div>
    </div>
  );
}