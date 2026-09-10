"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Users,
  UserCheck,
  UserX,
  ShieldCheck,
  ChevronRight,
  Filter,
} from "lucide-react";

type UserStatus = "ACTIVE" | "SUSPENDED";
type UserRole = "USER" | "ADMIN";

interface UserItem {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  joinedAt: string;
  lastLoginAt: string;
  postCount: number;
  receivedReportCount: number;
}

const mockUsers: UserItem[] = [
  {
    id: 1,
    name: "김개발",
    email: "dev01@example.com",
    role: "USER",
    status: "ACTIVE",
    joinedAt: "2026.09.01",
    lastLoginAt: "2026.09.01 14:32",
    postCount: 12,
    receivedReportCount: 2,
  },
  {
    id: 2,
    name: "이코딩",
    email: "coding02@example.com",
    role: "USER",
    status: "ACTIVE",
    joinedAt: "2026.09.01",
    lastLoginAt: "2026.09.01 13:51",
    postCount: 8,
    receivedReportCount: 0,
  },
  {
    id: 3,
    name: "박프론트",
    email: "front03@example.com",
    role: "USER",
    status: "ACTIVE",
    joinedAt: "2026.08.31",
    lastLoginAt: "2026.09.01 11:20",
    postCount: 5,
    receivedReportCount: 1,
  },
  {
    id: 4,
    name: "최백엔드",
    email: "backend04@example.com",
    role: "USER",
    status: "SUSPENDED",
    joinedAt: "2026.08.31",
    lastLoginAt: "2026.08.31 19:24",
    postCount: 15,
    receivedReportCount: 5,
  },
  {
    id: 5,
    name: "정자바",
    email: "java05@example.com",
    role: "USER",
    status: "ACTIVE",
    joinedAt: "2026.08.30",
    lastLoginAt: "2026.09.01 10:12",
    postCount: 4,
    receivedReportCount: 0,
  },
  {
    id: 6,
    name: "한리액트",
    email: "react06@example.com",
    role: "USER",
    status: "ACTIVE",
    joinedAt: "2026.08.29",
    lastLoginAt: "2026.08.31 23:40",
    postCount: 9,
    receivedReportCount: 1,
  },
  {
    id: 7,
    name: "오스프링",
    email: "spring07@example.com",
    role: "USER",
    status: "SUSPENDED",
    joinedAt: "2026.08.28",
    lastLoginAt: "2026.08.30 18:05",
    postCount: 18,
    receivedReportCount: 7,
  },
  {
    id: 8,
    name: "관리자",
    email: "admin@waivs.com",
    role: "ADMIN",
    status: "ACTIVE",
    joinedAt: "2026.01.01",
    lastLoginAt: "2026.09.01 15:02",
    postCount: 3,
    receivedReportCount: 0,
  },
];

type StatusFilter = "ALL" | UserStatus;

export default function AdminUsersPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("ALL");

  const filteredUsers = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    return mockUsers.filter((user) => {
      const matchesKeyword =
        keyword === "" ||
        user.name.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "ALL" || user.status === statusFilter;

      return matchesKeyword && matchesStatus;
    });
  }, [searchKeyword, statusFilter]);

  const totalCount = mockUsers.length;

  const activeCount = mockUsers.filter(
    (user) => user.status === "ACTIVE",
  ).length;

  const suspendedCount = mockUsers.filter(
    (user) => user.status === "SUSPENDED",
  ).length;

  const adminCount = mockUsers.filter(
    (user) => user.role === "ADMIN",
  ).length;

  return (
    <div className="mx-auto w-full max-w-[1500px]">
      {/* =========================
          페이지 제목
      ========================= */}
      <section className="mb-8">
        <p className="mb-2 text-sm font-medium text-gray-400">
          User Management
        </p>

        <h1 className="text-[28px] font-bold tracking-tight text-gray-900">
          회원 관리
        </h1>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          WAIVS 회원 정보를 조회하고 계정 상태를 관리할 수 있습니다.
        </p>
      </section>

      {/* =========================
          요약 카드
      ========================= */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="전체 회원"
          value={totalCount}
          unit="명"
          icon={Users}
        />

        <SummaryCard
          title="정상 회원"
          value={activeCount}
          unit="명"
          icon={UserCheck}
        />

        <SummaryCard
          title="정지 회원"
          value={suspendedCount}
          unit="명"
          icon={UserX}
          danger
        />

        <SummaryCard
          title="관리자"
          value={adminCount}
          unit="명"
          icon={ShieldCheck}
        />
      </section>

      {/* =========================
          회원 목록
      ========================= */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* 상단 검색/필터 */}
        <div className="border-b border-gray-200 px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                전체 회원
              </h2>

              <p className="mt-1 text-xs text-gray-400">
                총 {totalCount}명의 회원이 등록되어 있습니다.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
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
                  placeholder="이름 또는 이메일 검색"
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
                  className="h-11 min-w-[150px] appearance-none rounded-lg border border-gray-200 bg-white pl-10 pr-10 text-sm text-gray-600 outline-none transition focus:border-gray-400"
                >
                  <option value="ALL">
                    전체 상태
                  </option>

                  <option value="ACTIVE">
                    정상
                  </option>

                  <option value="SUSPENDED">
                    정지
                  </option>
                </select>

                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  ▼
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 검색 결과 */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/60 px-6 py-3">
          <p className="text-xs text-gray-500">
            검색 결과
            <span className="ml-1.5 font-bold text-gray-800">
              {filteredUsers.length}
            </span>
            명
          </p>

          {(searchKeyword || statusFilter !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSearchKeyword("");
                setStatusFilter("ALL");
              }}
              className="text-xs font-semibold text-gray-500 transition hover:text-gray-900"
            >
              필터 초기화
            </button>
          )}
        </div>

        {/* 테이블 */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  회원
                </th>

                <th className="px-4 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  권한
                </th>

                <th className="px-4 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  가입일
                </th>

                <th className="px-4 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  최근 로그인
                </th>

                <th className="px-4 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  게시글
                </th>

                <th className="px-4 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  신고
                </th>

                <th className="px-4 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  상태
                </th>

                <th className="px-6 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  관리
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="transition hover:bg-gray-50/70"
                  >
                    {/* 회원 */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100text-sm font-bold text-gray-600">
                          {user.name.charAt(0)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-800">
                              {user.name}
                            </p>

                            {user.role === "ADMIN" && (
                              <ShieldCheck
                                size={14}
                                className="text-indigo-500"
                              />
                            )}
                          </div>

                          <p className="mt-0.5 truncate text-xs text-gray-400">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* 권한 */}
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                          user.role === "ADMIN"
                            ? "border-indigo-100 bg-indigo-50 text-indigo-700"
                            : "border-gray-200 bg-gray-50 text-gray-600"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>

                    {/* 가입일 */}
                    <td className="px-4 py-4 text-sm text-gray-500 text-center">
                      {user.joinedAt}
                    </td>

                    {/* 최근 로그인 */}
                    <td className="px-4 py-4 text-sm text-gray-500 text-center">
                      {user.lastLoginAt}
                    </td>

                    {/* 게시글 수 */}
                    <td className="px-4 py-4 text-center">
                      <span className="text-sm font-semibold text-gray-700">
                        {user.postCount}
                      </span>
                    </td>

                    {/* 신고 받은 수 */}
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex min-w-8 items-center justify-center rounded-full px-2 py-1 text-xs font-semibold ${
                          user.receivedReportCount > 0
                            ? "bg-red-50 text-red-600"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {user.receivedReportCount}
                      </span>
                    </td>

                    {/* 상태 */}
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                          user.status === "ACTIVE"
                            ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                            : "border-red-100 bg-red-50 text-red-600"
                        }`}
                      >
                        {user.status === "ACTIVE"
                          ? "정상"
                          : "정지"}
                      </span>
                    </td>

                    {/* 상세보기 */}
                    <td className="px-6 py-4 text-center">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
                      >
                        상세보기
                        <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-20 text-center"
                  >
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                      <Search size={20} />
                    </div>

                    <p className="mt-4 text-sm font-semibold text-gray-700">
                      검색 결과가 없습니다.
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      다른 이름이나 이메일로 검색해보세요.
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
            전체 회원 {totalCount}명 중 {filteredUsers.length}명 표시
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
              {value}
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