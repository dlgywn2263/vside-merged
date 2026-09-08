"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  CalendarDays,
  CheckCircle2,
  FileText,
  Flag,
  Mail,
  Trash2,
  User,
  XCircle,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

type ReportStatus = "PENDING" | "RESOLVED" | "REJECTED";

type ReportReason =
  | "ABUSE"
  | "SPAM"
  | "INAPPROPRIATE"
  | "ADVERTISEMENT"
  | "OTHER";

interface ReportDetail {
  id: number;

  reporterId: number;
  reporter: string;
  reporterEmail: string;

  postId: number;
  postTitle: string;
  postAuthorId: number;
  postAuthor: string;
  postAuthorEmail: string;
  postContent: string;

  reason: ReportReason;
  description: string;

  createdAt: string;
  status: ReportStatus;
}

const mockReports: ReportDetail[] = [
  {
    id: 102,

    reporterId: 3,
    reporter: "박프론트",
    reporterEmail: "front03@example.com",

    postId: 34,
    postTitle: "Spring Boot 로그인 API 질문 있습니다",
    postAuthorId: 1,
    postAuthor: "김개발",
    postAuthorEmail: "dev01@example.com",
    postContent: `Spring Security를 사용해서 로그인 API를 구현하고 있는데 403 오류가 발생합니다.

현재 프론트에서는 로그인 요청 시 이메일과 비밀번호를 JSON 형식으로 보내고 있고,
백엔드에서는 Spring Security를 사용해서 인증을 처리하고 있습니다.

로그인 API 자체는 permitAll()로 설정했는데도 계속 403이 발생합니다.

혹시 CORS 설정이나 SecurityFilterChain 쪽에서 추가로 확인해야 하는 부분이 있을까요?`,

    reason: "ABUSE",
    description:
      "댓글과 게시글 내용에서 특정 사용자를 비방하는 표현이 반복적으로 확인됩니다.",

    createdAt: "2026.09.01 14:45",
    status: "PENDING",
  },

  {
    id: 101,

    reporterId: 2,
    reporter: "이코딩",
    reporterEmail: "coding02@example.com",

    postId: 29,
    postTitle: "무료 광고 사이트 공유합니다!!!",
    postAuthorId: 4,
    postAuthor: "최백엔드",
    postAuthorEmail: "backend04@example.com",
    postContent: `무료 이벤트 사이트를 공유합니다.

지금 가입하면 여러 혜택을 받을 수 있습니다.

광고 링크 1
광고 링크 2
광고 링크 3

여러 커뮤니티에서 공유 중입니다.`,

    reason: "SPAM",
    description:
      "광고성 링크를 반복적으로 게시하고 있습니다.",

    createdAt: "2026.09.01 11:24",
    status: "PENDING",
  },

  {
    id: 100,

    reporterId: 6,
    reporter: "한리액트",
    reporterEmail: "react06@example.com",

    postId: 28,
    postTitle: "MySQL 외래키 설정 질문",
    postAuthorId: 7,
    postAuthor: "오스프링",
    postAuthorEmail: "spring07@example.com",
    postContent: `프로젝트 삭제 시 연관 테이블 데이터를 함께 삭제하고 싶습니다.

현재 project 테이블과 workspace 테이블이 외래키로 연결되어 있는데
프로젝트 삭제 시 foreign key constraint 오류가 발생합니다.

ON DELETE CASCADE를 사용하는 게 맞을까요?`,

    reason: "INAPPROPRIATE",
    description:
      "게시글 일부 내용이 게시판 목적과 맞지 않는 것 같습니다.",

    createdAt: "2026.08.31 19:12",
    status: "PENDING",
  },

  {
    id: 99,

    reporterId: 5,
    reporter: "정자바",
    reporterEmail: "java05@example.com",

    postId: 22,
    postTitle: "프로젝트 홍보합니다",
    postAuthorId: 9,
    postAuthor: "테스트유저",
    postAuthorEmail: "test09@example.com",
    postContent: `프로젝트 홍보 게시글입니다.

외부 서비스를 홍보하기 위한 링크가 포함되어 있습니다.`,

    reason: "ADVERTISEMENT",
    description:
      "게시판과 관계없는 상업성 홍보 게시글입니다.",

    createdAt: "2026.08.31 15:03",
    status: "RESOLVED",
  },

  {
    id: 98,

    reporterId: 1,
    reporter: "김개발",
    reporterEmail: "dev01@example.com",

    postId: 18,
    postTitle: "개발하다가 궁금한 점",
    postAuthorId: 10,
    postAuthor: "테스트회원",
    postAuthorEmail: "test10@example.com",
    postContent: `개발하면서 궁금한 내용을 자유롭게 작성한 게시글입니다.`,

    reason: "OTHER",
    description:
      "신고 사유를 기타로 선택했습니다. 확인 부탁드립니다.",

    createdAt: "2026.08.30 21:11",
    status: "REJECTED",
  },
];

const reasonLabel: Record<ReportReason, string> = {
  ABUSE: "욕설 / 비방",
  SPAM: "도배 / 스팸",
  INAPPROPRIATE: "부적절한 내용",
  ADVERTISEMENT: "광고 / 홍보",
  OTHER: "기타",
};

const reasonStyle: Record<ReportReason, string> = {
  ABUSE: "border-red-100 bg-red-50 text-red-600",
  SPAM: "border-orange-100 bg-orange-50 text-orange-600",
  INAPPROPRIATE: "border-amber-100 bg-amber-50 text-amber-700",
  ADVERTISEMENT: "border-violet-100 bg-violet-50 text-violet-700",
  OTHER: "border-gray-200 bg-gray-50 text-gray-600",
};

const statusLabel: Record<ReportStatus, string> = {
  PENDING: "처리 대기",
  RESOLVED: "처리 완료",
  REJECTED: "반려",
};

const statusStyle: Record<ReportStatus, string> = {
  PENDING: "border-amber-100 bg-amber-50 text-amber-700",
  RESOLVED:
    "border-emerald-100 bg-emerald-50 text-emerald-700",
  REJECTED: "border-gray-200 bg-gray-100 text-gray-600",
};

export default function AdminReportDetailPage() {
  const router = useRouter();
  const params = useParams();

  const reportId = Number(params.id);

  const report = useMemo(() => {
    return mockReports.find((item) => item.id === reportId);
  }, [reportId]);

  const [status, setStatus] = useState<ReportStatus>(
    report?.status ?? "PENDING",
  );

  const [postDeleted, setPostDeleted] = useState(false);

  const [authorSuspended, setAuthorSuspended] =
    useState(false);

  if (!report) {
    return (
      <div className="mx-auto w-full max-w-[1400px]">
        <button
          type="button"
          onClick={() => router.push("/admin/reports")}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-900"
        >
          <ArrowLeft size={17} />
          신고 관리로 돌아가기
        </button>

        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-24 text-center shadow-sm">
          <Flag
            size={36}
            className="mx-auto text-gray-300"
          />

          <p className="mt-5 text-base font-bold text-gray-800">
            신고 내역을 찾을 수 없습니다.
          </p>

          <p className="mt-2 text-sm text-gray-400">
            존재하지 않거나 삭제된 신고입니다.
          </p>
        </div>
      </div>
    );
  }

  const handleResolve = () => {
    const confirmed = window.confirm(
      `신고 #${report.id}을 처리 완료로 변경하시겠습니까?`,
    );

    if (!confirmed) return;

    /*
     * 추후 API 연결
     *
     * PATCH /api/admin/reports/{reportId}
     *
     * body:
     * {
     *   status: "RESOLVED"
     * }
     */

    setStatus("RESOLVED");
  };

  const handleReject = () => {
    const confirmed = window.confirm(
      `신고 #${report.id}을 반려하시겠습니까?`,
    );

    if (!confirmed) return;

    /*
     * 추후 API 연결
     *
     * PATCH /api/admin/reports/{reportId}
     *
     * body:
     * {
     *   status: "REJECTED"
     * }
     */

    setStatus("REJECTED");
  };

  const handleDeletePost = () => {
    const confirmed = window.confirm(
      `"${report.postTitle}" 게시글을 삭제하시겠습니까?\n삭제된 게시글은 복구할 수 없습니다.`,
    );

    if (!confirmed) return;

    /*
     * 추후 API 연결
     *
     * DELETE /api/admin/posts/{postId}
     */

    setPostDeleted(true);

    /*
     * 게시글 삭제까지 했다면
     * 신고도 처리 완료 상태로 변경
     */
    setStatus("RESOLVED");
  };

  const handleSuspendAuthor = () => {
    if (authorSuspended) {
      const confirmed = window.confirm(
        `${report.postAuthor} 회원의 계정 정지를 해제하시겠습니까?`,
      );

      if (!confirmed) return;

      /*
       * PATCH /api/admin/users/{userId}/activate
       */

      setAuthorSuspended(false);

      return;
    }

    const confirmed = window.confirm(
      `${report.postAuthor} 회원의 계정을 정지하시겠습니까?`,
    );

    if (!confirmed) return;

    /*
     * PATCH /api/admin/users/{userId}/suspend
     */

    setAuthorSuspended(true);
  };

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      {/* =========================
          페이지 상단
      ========================= */}
      <section className="mb-7">
        <button
          type="button"
          onClick={() => router.push("/admin/reports")}
          className="mb-5 flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-900"
        >
          <ArrowLeft size={17} />
          신고 관리로 돌아가기
        </button>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-sm font-medium text-gray-400">
              Report Management
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[28px] font-bold tracking-tight text-gray-900">
                신고 상세
              </h1>

              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                  statusStyle[status]
                }`}
              >
                {statusLabel[status]}
              </span>
            </div>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              신고 내용과 대상 게시글을 확인하고 관리자 조치를
              수행할 수 있습니다.
            </p>
          </div>

          {status === "PENDING" && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleReject}
                className="flex h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                <XCircle size={17} />
                신고 반려
              </button>

              <button
                type="button"
                onClick={handleResolve}
                className="flex h-11 items-center gap-2 rounded-lg bg-[#111827] px-5 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                <CheckCircle2 size={17} />
                처리 완료
              </button>
            </div>
          )}
        </div>
      </section>

      {/* =========================
          신고 정보
      ========================= */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-7 py-5">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              신고 정보
            </h2>

            <p className="mt-1 text-xs text-gray-400">
              사용자가 접수한 신고의 상세 내용입니다.
            </p>
          </div>

          <span className="text-sm font-bold text-gray-500">
            #{report.id}
          </span>
        </div>

        <div className="grid grid-cols-1 border-b border-gray-200 bg-gray-50/50 md:grid-cols-3">
          <InfoItem
            icon={User}
            label="신고자"
            value={report.reporter}
          />

          <InfoItem
            icon={Mail}
            label="신고자 이메일"
            value={report.reporterEmail}
          />

          <InfoItem
            icon={CalendarDays}
            label="신고일"
            value={report.createdAt}
          />
        </div>

        <div className="p-7">
          <div>
            <p className="text-xs font-semibold text-gray-400">
              신고 사유
            </p>

            <span
              className={`mt-2 inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${
                reasonStyle[report.reason]
              }`}
            >
              {reasonLabel[report.reason]}
            </span>
          </div>

          <div className="mt-7">
            <p className="text-xs font-semibold text-gray-400">
              상세 신고 내용
            </p>

            <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-5">
              <p className="text-sm leading-7 text-gray-700">
                {report.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================
          신고 대상 게시글
      ========================= */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-200 px-7 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileText
                size={18}
                className="text-gray-500"
              />

              <h2 className="text-base font-bold text-gray-900">
                신고 대상 게시글
              </h2>
            </div>

            <p className="mt-1.5 text-xs text-gray-400">
              신고가 접수된 게시글의 원문입니다.
            </p>
          </div>

          {!postDeleted && (
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/admin/posts/${report.postId}`,
                )
              }
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition hover:text-gray-900"
            >
              게시글 상세보기
              <ExternalLink size={14} />
            </button>
          )}
        </div>

        {postDeleted ? (
          <div className="px-7 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
              <Trash2 size={20} />
            </div>

            <p className="mt-4 text-sm font-bold text-gray-800">
              삭제된 게시글입니다.
            </p>

            <p className="mt-1 text-xs text-gray-400">
              관리자에 의해 게시글이 삭제되었습니다.
            </p>
          </div>
        ) : (
          <>
            {/* 게시글 정보 */}
            <div className="grid grid-cols-1 border-b border-gray-200 bg-gray-50/50 md:grid-cols-3">
              <InfoItem
                icon={FileText}
                label="게시글 번호"
                value={`#${report.postId}`}
              />

              <InfoItem
                icon={User}
                label="작성자"
                value={report.postAuthor}
              />

              <InfoItem
                icon={Mail}
                label="작성자 이메일"
                value={report.postAuthorEmail}
              />
            </div>

            {/* 본문 */}
            <div className="px-7 py-7">
              <p className="text-lg font-bold leading-7 text-gray-900">
                {report.postTitle}
              </p>

              <div className="mt-5 border-t border-gray-100 pt-6">
                <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">
                  {report.postContent}
                </p>
              </div>
            </div>
          </>
        )}
      </section>

      {/* =========================
          작성자 정보
      ========================= */}
      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600">
              {report.postAuthor.charAt(0)}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-gray-900">
                  {report.postAuthor}
                </p>

                {authorSuspended && (
                  <span className="rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-600">
                    이용 정지
                  </span>
                )}
              </div>

              <p className="mt-1 text-xs text-gray-400">
                {report.postAuthorEmail}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                `/admin/users/${report.postAuthorId}`,
              )
            }
            className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            회원 상세보기
            <ExternalLink size={14} />
          </button>
        </div>
      </section>

      {/* =========================
          관리자 조치
      ========================= */}
      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-gray-900">
            관리자 조치
          </h2>

          <p className="mt-1 text-xs leading-5 text-gray-400">
            신고 내용을 검토한 후 게시글 또는 작성자에게 필요한
            조치를 수행할 수 있습니다.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
          {/* 게시글 삭제 */}
          <div className="flex flex-col justify-between gap-5 rounded-xl border border-red-100 bg-red-50/50 p-5 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
                <Trash2 size={18} />
              </div>

              <div>
                <p className="text-sm font-bold text-red-700">
                  게시글 삭제
                </p>

                <p className="mt-1 text-xs leading-5 text-red-600/70">
                  운영 정책을 위반한 게시글을 서비스에서
                  삭제합니다.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={postDeleted}
              onClick={handleDeletePost}
              className={`shrink-0 rounded-lg px-4 py-2.5 text-xs font-semibold transition ${
                postDeleted
                  ? "cursor-not-allowed bg-gray-200 text-gray-400"
                  : "bg-red-600 text-white hover:bg-red-700"
              }`}
            >
              {postDeleted
                ? "삭제 완료"
                : "게시글 삭제"}
            </button>
          </div>

          {/* 회원 정지 */}
          <div
            className={`flex flex-col justify-between gap-5 rounded-xl border p-5 sm:flex-row sm:items-center ${
              authorSuspended
                ? "border-emerald-100 bg-emerald-50/50"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  authorSuspended
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-white text-gray-600"
                }`}
              >
                <Ban size={18} />
              </div>

              <div>
                <p className="text-sm font-bold text-gray-800">
                  {authorSuspended
                    ? "작성자 정지 해제"
                    : "작성자 계정 정지"}
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  {authorSuspended
                    ? "현재 정지된 회원의 서비스 이용을 다시 허용합니다."
                    : "반복적으로 운영 정책을 위반한 회원의 서비스 이용을 제한합니다."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSuspendAuthor}
              className={`shrink-0 rounded-lg px-4 py-2.5 text-xs font-semibold transition ${
                authorSuspended
                  ? "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                  : "bg-gray-900 text-white hover:bg-gray-800"
              }`}
            >
              {authorSuspended
                ? "정지 해제"
                : "회원 정지"}
            </button>
          </div>
        </div>
      </section>

      {/* =========================
          신고 처리
      ========================= */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-7 py-5">
          <div className="flex items-center gap-2">
            <AlertTriangle
              size={18}
              className={
                status === "PENDING"
                  ? "text-amber-500"
                  : "text-gray-400"
              }
            />

            <h2 className="text-base font-bold text-gray-900">
              신고 처리
            </h2>
          </div>

          <p className="mt-1.5 text-xs text-gray-400">
            최종적으로 신고의 처리 상태를 결정합니다.
          </p>
        </div>

        <div className="p-7">
          {status === "PENDING" ? (
            <div className="flex flex-col gap-5 rounded-xl border border-amber-100 bg-amber-50/50 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900">
                  아직 처리되지 않은 신고입니다.
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  신고 내용이 타당하면 처리 완료, 문제가 없으면
                  반려를 선택해주세요.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleReject}
                  className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                >
                  <XCircle size={15} />
                  신고 반려
                </button>

                <button
                  type="button"
                  onClick={handleResolve}
                  className="flex h-10 items-center gap-2 rounded-lg bg-[#111827] px-4 text-xs font-semibold text-white transition hover:bg-gray-800"
                >
                  <CheckCircle2 size={15} />
                  처리 완료
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`flex items-start gap-4 rounded-xl border p-5 ${
                status === "RESOLVED"
                  ? "border-emerald-100 bg-emerald-50/50"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  status === "RESOLVED"
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {status === "RESOLVED" ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <XCircle size={18} />
                )}
              </div>

              <div>
                <p className="text-sm font-bold text-gray-900">
                  {status === "RESOLVED"
                    ? "처리 완료된 신고입니다."
                    : "반려된 신고입니다."}
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  {status === "RESOLVED"
                    ? "관리자가 신고 내용을 확인하고 필요한 조치를 완료했습니다."
                    : "관리자가 신고 내용을 검토한 결과 별도의 조치가 필요하지 않은 것으로 처리했습니다."}
                </p>
              </div>
            </div>
          )}
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