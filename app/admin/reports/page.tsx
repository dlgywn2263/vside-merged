"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Flag,
  Clock3,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Filter,
  FileText,
  User,
} from "lucide-react";

type ReportStatus = "PENDING" | "RESOLVED" | "REJECTED";

type ReportReason =
  | "ABUSE"
  | "SPAM"
  | "INAPPROPRIATE"
  | "ADVERTISEMENT"
  | "OTHER";

interface ReportItem {
  id: number;
  postId: number;
  postTitle: string;
  postAuthor: string;

  reporter: string;
  reporterEmail: string;

  reason: ReportReason;
  description: string;

  createdAt: string;
  status: ReportStatus;
}

const initialReports: ReportItem[] = [
  {
    id: 102,
    postId: 34,
    postTitle: "Spring Boot 로그인 API 질문 있습니다",
    postAuthor: "김개발",
    reporter: "박프론트",
    reporterEmail: "front03@example.com",
    reason: "ABUSE",
    description:
      "댓글과 게시글 내용에서 특정 사용자를 비방하는 표현이 반복적으로 확인됩니다.",
    createdAt: "2026.09.01 14:45",
    status: "PENDING",
  },
  {
    id: 101,
    postId: 29,
    postTitle: "무료 광고 사이트 공유합니다!!!",
    postAuthor: "최백엔드",
    reporter: "이코딩",
    reporterEmail: "coding02@example.com",
    reason: "SPAM",
    description:
      "광고성 링크를 반복적으로 게시하고 있습니다.",
    createdAt: "2026.09.01 11:24",
    status: "PENDING",
  },
  {
    id: 100,
    postId: 28,
    postTitle: "MySQL 외래키 설정 질문",
    postAuthor: "오스프링",
    reporter: "한리액트",
    reporterEmail: "react06@example.com",
    reason: "INAPPROPRIATE",
    description:
      "게시글 일부 내용이 게시판 목적과 맞지 않는 것 같습니다.",
    createdAt: "2026.08.31 19:12",
    status: "PENDING",
  },
  {
    id: 99,
    postId: 22,
    postTitle: "프로젝트 홍보합니다",
    postAuthor: "테스트유저",
    reporter: "정자바",
    reporterEmail: "java05@example.com",
    reason: "ADVERTISEMENT",
    description:
      "게시판과 관계없는 상업성 홍보 게시글입니다.",
    createdAt: "2026.08.31 15:03",
    status: "RESOLVED",
  },
  {
    id: 98,
    postId: 18,
    postTitle: "개발하다가 궁금한 점",
    postAuthor: "테스트회원",
    reporter: "김개발",
    reporterEmail: "dev01@example.com",
    reason: "OTHER",
    description:
      "신고 사유를 기타로 선택했습니다. 확인 부탁드립니다.",
    createdAt: "2026.08.30 21:11",
    status: "REJECTED",
  },
  {
    id: 97,
    postId: 15,
    postTitle: "광고 링크 모음",
    postAuthor: "오스프링",
    reporter: "박프론트",
    reporterEmail: "front03@example.com",
    reason: "SPAM",
    description:
      "동일한 링크를 반복해서 게시하고 있습니다.",
    createdAt: "2026.08.30 17:41",
    status: "RESOLVED",
  },
];

type StatusFilter = "ALL" | ReportStatus;

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

export default function AdminReportsPage() {
  const [reports, setReports] =
    useState<ReportItem[]>(initialReports);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("ALL");

  const filteredReports = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    return reports.filter((report) => {
      const matchesKeyword =
        keyword === "" ||
        report.postTitle.toLowerCase().includes(keyword) ||
        report.postAuthor.toLowerCase().includes(keyword) ||
        report.reporter.toLowerCase().includes(keyword) ||
        report.reporterEmail.toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "ALL" ||
        report.status === statusFilter;

      return matchesKeyword && matchesStatus;
    });
  }, [reports, searchKeyword, statusFilter]);

  const totalCount = reports.length;

  const pendingCount = reports.filter(
    (report) => report.status === "PENDING",
  ).length;

  const resolvedCount = reports.filter(
    (report) => report.status === "RESOLVED",
  ).length;

  const rejectedCount = reports.filter(
    (report) => report.status === "REJECTED",
  ).length;

  const handleResolve = (report: ReportItem) => {
    const confirmed = window.confirm(
      `신고 #${report.id}을 처리 완료 상태로 변경하시겠습니까?`,
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

    setReports((prev) =>
      prev.map((item) =>
        item.id === report.id
          ? {
              ...item,
              status: "RESOLVED",
            }
          : item,
      ),
    );
  };

  const handleReject = (report: ReportItem) => {
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

    setReports((prev) =>
      prev.map((item) =>
        item.id === report.id
          ? {
              ...item,
              status: "REJECTED",
            }
          : item,
      ),
    );
  };

  const resetFilters = () => {
    setSearchKeyword("");
    setStatusFilter("ALL");
  };

  const hasFilter =
    searchKeyword !== "" || statusFilter !== "ALL";

  return (
    <div className="mx-auto w-full max-w-[1500px]">
      {/* =========================
          페이지 제목
      ========================= */}
      <section className="mb-8">
        <p className="mb-2 text-sm font-medium text-gray-400">
          Report Management
        </p>

        <h1 className="text-[28px] font-bold tracking-tight text-gray-900">
          신고 관리
        </h1>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          사용자로부터 접수된 게시글 신고를 확인하고 처리할 수
          있습니다.
        </p>
      </section>

      {/* =========================
          요약 카드
      ========================= */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="전체 신고"
          value={totalCount}
          unit="건"
          icon={Flag}
        />

        <SummaryCard
          title="처리 대기"
          value={pendingCount}
          unit="건"
          icon={Clock3}
          warning
        />

        <SummaryCard
          title="처리 완료"
          value={resolvedCount}
          unit="건"
          icon={CheckCircle2}
        />

        <SummaryCard
          title="반려"
          value={rejectedCount}
          unit="건"
          icon={XCircle}
        />
      </section>

      {/* =========================
          신고 목록
      ========================= */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* 검색 */}
        <div className="border-b border-gray-200 px-6 py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                신고 목록
              </h2>

              <p className="mt-1 text-xs text-gray-400">
                접수된 신고 내용을 확인하고 처리 상태를 관리합니다.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {/* 검색창 */}
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
                  placeholder="게시글 또는 회원 검색"
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-gray-400 sm:w-[270px]"
                />
              </div>

              {/* 상태 필터 */}
              <div className="relative">
                <Filter
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value as StatusFilter,
                    )
                  }
                  className="h-11 min-w-[150px] appearance-none rounded-lg border border-gray-200 bg-white pl-10 pr-9 text-sm text-gray-600 outline-none transition focus:border-gray-400"
                >
                  <option value="ALL">
                    전체 상태
                  </option>

                  <option value="PENDING">
                    처리 대기
                  </option>

                  <option value="RESOLVED">
                    처리 완료
                  </option>

                  <option value="REJECTED">
                    반려
                  </option>
                </select>

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                  ▼
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 상태 탭 */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex gap-6 overflow-x-auto">
            <StatusTab
              label="전체"
              count={totalCount}
              active={statusFilter === "ALL"}
              onClick={() => setStatusFilter("ALL")}
            />

            <StatusTab
              label="처리 대기"
              count={pendingCount}
              active={statusFilter === "PENDING"}
              onClick={() => setStatusFilter("PENDING")}
            />

            <StatusTab
              label="처리 완료"
              count={resolvedCount}
              active={statusFilter === "RESOLVED"}
              onClick={() =>
                setStatusFilter("RESOLVED")
              }
            />

            <StatusTab
              label="반려"
              count={rejectedCount}
              active={statusFilter === "REJECTED"}
              onClick={() =>
                setStatusFilter("REJECTED")
              }
            />
          </div>
        </div>

        {/* 검색 결과 */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/60 px-6 py-3">
          <p className="text-xs text-gray-500">
            검색 결과
            <span className="ml-1.5 font-bold text-gray-800">
              {filteredReports.length}
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

        {/* =========================
            테이블
        ========================= */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-[90px] px-5 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  신고 번호
                </th>

                <th className="px-4 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  신고 대상
                </th>

                <th className="w-[150px] px-4 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  신고 사유
                </th>

                <th className="w-[180px] px-4 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  신고자
                </th>

                <th className="w-[150px] px-4 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  신고일
                </th>

                <th className="w-[110px] px-4 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  상태
                </th>

                <th className="w-[250px] px-6 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  관리
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredReports.length > 0 ? (
                filteredReports.map((report) => (
                  <tr
                    key={report.id}
                    className="transition hover:bg-gray-50/70"
                  >
                    {/* 신고번호 */}
                    <td className="px-5 py-4 text-center">
                      <span className="text-sm font-semibold text-gray-600">
                        #{report.id}
                      </span>
                    </td>

                    {/* 대상 게시글 */}
                    <td className="px-8 py-4">
                      <div className="max-w-[420px]">
                        <div className="flex items-center gap-2">
                          <FileText
                            size={15}
                            className="shrink-0 text-gray-400"
                          />

                          <p className="truncate text-sm font-semibold text-gray-800">
                            {report.postTitle}
                          </p>
                        </div>

                        <div className="mt-1.5 flex items-center gap-2 pl-[23px] text-xs text-gray-400">
                          <span>
                            게시글 #{report.postId}
                          </span>

                          <span className="text-gray-300">
                            •
                          </span>

                          <span>
                            작성자 {report.postAuthor}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 신고 사유 */}
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                          reasonStyle[report.reason]
                        }`}
                      >
                        {reasonLabel[report.reason]}
                      </span>
                    </td>

                    {/* 신고자 */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                          {report.reporter.charAt(0)}
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-700">
                            {report.reporter}
                          </p>

                          <p className="mt-0.5 truncate text-[11px] text-gray-400">
                            {report.reporterEmail}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* 날짜 */}
                    <td className="px-4 py-4 text-center text-xs text-gray-500">
                      {report.createdAt}
                    </td>

                    {/* 상태 */}
                    <td className="px-2 py-4 text-center">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                          statusStyle[report.status]
                        }`}
                      >
                        {statusLabel[report.status]}
                      </span>
                    </td>

                    {/* 관리 */}
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">

                        <Link
                          href={`/admin/reports/${report.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
                        >
                          상세보기
                          <ChevronRight size={14} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-20 text-center"
                  >
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                      <Flag size={20} />
                    </div>

                    <p className="mt-4 text-sm font-semibold text-gray-700">
                      신고 내역이 없습니다.
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      현재 조건에 해당하는 신고가 없습니다.
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
            전체 신고 {totalCount}건 중{" "}
            {filteredReports.length}건 표시
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
   상태 탭
========================= */

function StatusTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex h-13 shrink-0 items-center gap-2 border-b-2 px-1 text-sm font-semibold transition ${
        active
          ? "border-gray-900 text-gray-900"
          : "border-transparent text-gray-400 hover:text-gray-700"
      }`}
    >
      {label}

      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
          active
            ? "bg-gray-900 text-white"
            : "bg-gray-100 text-gray-500"
        }`}
      >
        {count}
      </span>
    </button>
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
  warning = false,
}: {
  title: string;
  value: number;
  unit: string;
  icon: React.ElementType;
  warning?: boolean;
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
                warning && value > 0
                  ? "text-amber-600"
                  : "text-gray-900"
              }`}
            >
              {value}
            </span>

            <span className="pb-0.5 text-sm text-gray-400">
              {unit}
            </span>
          </div>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            warning && value > 0
              ? "bg-amber-50 text-amber-600"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}