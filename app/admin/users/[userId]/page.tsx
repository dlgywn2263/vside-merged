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
  ShieldCheck,
  User,
  UserRoundCheck,
  Users,
} from "lucide-react";

type UserStatus = "ACTIVE" | "SUSPENDED";
type UserRole = "USER" | "ADMIN";

interface UserDetail {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  joinedAt: string;
  lastLoginAt: string;
  postCount: number;
  reportCount: number;
  receivedReportCount: number;
}

const mockUsers: UserDetail[] = [
  {
    id: 1,
    name: "김개발",
    email: "dev01@example.com",
    role: "USER",
    status: "ACTIVE",
    joinedAt: "2026.09.01",
    lastLoginAt: "2026.09.01 14:32",
    postCount: 12,
    reportCount: 1,
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
    reportCount: 0,
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
    reportCount: 2,
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
    reportCount: 0,
    receivedReportCount: 5,
  },
];

export default function AdminUserDetailPage() {
  const router = useRouter();
  const params = useParams();

  const userId = Number(params.id);

  const foundUser = useMemo(
    () => mockUsers.find((user) => user.id === userId) ?? mockUsers[0],
    [userId],
  );

  const [status, setStatus] = useState<UserStatus>(foundUser.status);

  const isSuspended = status === "SUSPENDED";

  const handleToggleStatus = () => {
    if (isSuspended) {
      const confirmed = window.confirm(
        `${foundUser.name} 회원의 계정 정지를 해제하시겠습니까?`,
      );

      if (!confirmed) return;

      /*
       * 추후 API 연결
       *
       * PATCH /api/admin/users/{userId}/activate
       */

      setStatus("ACTIVE");
      return;
    }

    const confirmed = window.confirm(
      `${foundUser.name} 회원의 계정을 정지하시겠습니까?`,
    );

    if (!confirmed) return;

    /*
     * 추후 API 연결
     *
     * PATCH /api/admin/users/{userId}/suspend
     */

    setStatus("SUSPENDED");
  };

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      {/* 상단 */}
      <div className="mb-7">
        <button
          type="button"
          onClick={() => router.push("/admin/users")}
          className="mb-5 flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-900"
        >
          <ArrowLeft size={17} />
          회원 관리로 돌아가기
        </button>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-sm font-medium text-gray-400">
              User Management
            </p>

            <h1 className="text-[28px] font-bold tracking-tight text-gray-900">
              회원 상세
            </h1>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              회원의 기본 정보와 서비스 이용 현황을 확인할 수 있습니다.
            </p>
          </div>

          <button
            type="button"
            onClick={handleToggleStatus}
            className={`flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition ${
              isSuspended
                ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
            }`}
          >
            {isSuspended ? (
              <>
                <UserRoundCheck size={17} />
                정지 해제
              </>
            ) : (
              <>
                <Ban size={17} />
                계정 정지
              </>
            )}
          </button>
        </div>
      </div>

      {/* 회원 기본 정보 */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-7 py-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {/* 프로필 */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xl font-bold text-gray-600">
              {foundUser.name.charAt(0)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900">
                  {foundUser.name}
                </h2>

                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    status === "ACTIVE"
                      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                      : "border-red-100 bg-red-50 text-red-600"
                  }`}
                >
                  {status === "ACTIVE" ? "정상" : "정지"}
                </span>

                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    foundUser.role === "ADMIN"
                      ? "border-indigo-100 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 bg-gray-50 text-gray-600"
                  }`}
                >
                  {foundUser.role}
                </span>
              </div>

              <p className="mt-1.5 text-sm text-gray-500">
                {foundUser.email}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 px-5 py-3">
              <p className="text-[11px] font-medium text-gray-400">
                회원 ID
              </p>

              <p className="mt-1 text-sm font-bold text-gray-800">
                #{foundUser.id}
              </p>
            </div>
          </div>
        </div>

        {/* 상세 정보 */}
        <div className="grid grid-cols-1 divide-y divide-gray-100 md:grid-cols-2 md:divide-x md:divide-y-0">
          <div className="space-y-6 p-7">
            <h3 className="text-sm font-bold text-gray-900">
              기본 정보
            </h3>

            <InfoRow
              icon={User}
              label="이름"
              value={foundUser.name}
            />

            <InfoRow
              icon={Mail}
              label="이메일"
              value={foundUser.email}
            />

            <InfoRow
              icon={ShieldCheck}
              label="회원 권한"
              value={foundUser.role}
            />
          </div>

          <div className="space-y-6 p-7">
            <h3 className="text-sm font-bold text-gray-900">
              계정 정보
            </h3>

            <InfoRow
              icon={CalendarDays}
              label="가입일"
              value={foundUser.joinedAt}
            />

            <InfoRow
              icon={CheckCircle2}
              label="최근 로그인"
              value={foundUser.lastLoginAt}
            />

            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                <Users size={17} />
              </div>

              <div>
                <p className="text-xs font-medium text-gray-400">
                  계정 상태
                </p>

                <p
                  className={`mt-1 text-sm font-semibold ${
                    status === "ACTIVE"
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {status === "ACTIVE" ? "정상 이용 중" : "이용 정지"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 활동 통계 */}
      <section className="mt-6">
        <div className="mb-4">
          <h2 className="text-base font-bold text-gray-900">
            서비스 이용 현황
          </h2>

          <p className="mt-1 text-xs text-gray-400">
            회원의 커뮤니티 활동 및 신고 관련 현황입니다.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <StatCard
            title="작성 게시글"
            value={foundUser.postCount}
            unit="개"
            icon={FileText}
          />

          <StatCard
            title="신고한 횟수"
            value={foundUser.reportCount}
            unit="건"
            icon={Flag}
          />

          <StatCard
            title="신고 받은 횟수"
            value={foundUser.receivedReportCount}
            unit="건"
            icon={Ban}
            danger={foundUser.receivedReportCount > 0}
          />
        </div>
      </section>

      {/* 최근 활동 */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-7 py-5">
          <h2 className="text-base font-bold text-gray-900">
            회원 관리
          </h2>

          <p className="mt-1 text-xs text-gray-400">
            회원의 상태를 확인하고 필요한 관리 작업을 수행할 수 있습니다.
          </p>
        </div>

        <div className="p-7">
          <div
            className={`flex flex-col gap-5 rounded-xl border p-5 sm:flex-row sm:items-center sm:justify-between ${
              isSuspended
                ? "border-red-100 bg-red-50/50"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  isSuspended
                    ? "bg-red-100 text-red-600"
                    : "bg-white text-gray-600"
                }`}
              >
                {isSuspended ? (
                  <Ban size={19} />
                ) : (
                  <CheckCircle2 size={19} />
                )}
              </div>

              <div>
                <p className="text-sm font-bold text-gray-900">
                  {isSuspended
                    ? "현재 정지된 회원입니다."
                    : "현재 정상 이용 중인 회원입니다."}
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  {isSuspended
                    ? "계정 정지를 해제하면 회원이 다시 WAIVS 서비스를 이용할 수 있습니다."
                    : "서비스 이용 정책을 위반한 회원은 관리자 권한으로 계정을 정지할 수 있습니다."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleStatus}
              className={`shrink-0 rounded-lg px-4 py-2.5 text-xs font-semibold transition ${
                isSuspended
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-red-600 text-white hover:bg-red-700"
              }`}
            >
              {isSuspended ? "정지 해제" : "계정 정지"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

/* =========================
   정보 행
========================= */

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
        <Icon size={17} />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-400">
          {label}
        </p>

        <p className="mt-1 break-all text-sm font-semibold text-gray-800">
          {value}
        </p>
      </div>
    </div>
  );
}

/* =========================
   통계 카드
========================= */

function StatCard({
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
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-500">
            {title}
          </p>

          <div className="mt-3 flex items-end gap-1">
            <span
              className={`text-[30px] font-bold leading-none ${
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
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${
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