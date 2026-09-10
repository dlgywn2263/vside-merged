import Link from "next/link";
import {
  Users,
  UserPlus,
  FileText,
  Flag,
  ArrowUpRight,
  Clock3,
  CircleAlert,
  CheckCircle2,
} from "lucide-react";

const summaryCards = [
  {
    title: "전체 회원",
    value: "128",
    unit: "명",
    description: "WAIVS에 가입한 전체 회원",
    icon: Users,
  },
  {
    title: "오늘 가입자",
    value: "4",
    unit: "명",
    description: "오늘 새롭게 가입한 회원",
    icon: UserPlus,
  },
  {
    title: "전체 게시글",
    value: "342",
    unit: "개",
    description: "현재 등록된 전체 게시글",
    icon: FileText,
  },
  {
    title: "미처리 신고",
    value: "3",
    unit: "건",
    description: "관리자 확인이 필요한 신고",
    icon: Flag,
  },
];

const recentUsers = [
  {
    id: 1,
    name: "김개발",
    email: "dev01@example.com",
    joinedAt: "2026.09.01",
    status: "ACTIVE",
  },
  {
    id: 2,
    name: "이코딩",
    email: "coding02@example.com",
    joinedAt: "2026.09.01",
    status: "ACTIVE",
  },
  {
    id: 3,
    name: "박프론트",
    email: "front03@example.com",
    joinedAt: "2026.08.31",
    status: "ACTIVE",
  },
  {
    id: 4,
    name: "최백엔드",
    email: "backend04@example.com",
    joinedAt: "2026.08.31",
    status: "SUSPENDED",
  },
];

const recentReports = [
  {
    id: 102,
    target: "게시글 #34",
    reason: "욕설 및 비방",
    reporter: "user03",
    reportedAt: "2026.09.01",
    status: "PENDING",
  },
  {
    id: 101,
    target: "게시글 #22",
    reason: "광고 및 스팸",
    reporter: "user05",
    reportedAt: "2026.08.31",
    status: "PENDING",
  },
  {
    id: 100,
    target: "게시글 #18",
    reason: "부적절한 내용",
    reporter: "user08",
    reportedAt: "2026.08.30",
    status: "RESOLVED",
  },
  {
    id: 99,
    target: "게시글 #13",
    reason: "도배",
    reporter: "user11",
    reportedAt: "2026.08.29",
    status: "REJECTED",
  },
];

const statusStyle = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-100",
  SUSPENDED: "bg-red-50 text-red-600 border-red-100",
};

const reportStatusStyle = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-100",
  RESOLVED: "bg-emerald-50 text-emerald-700 border-emerald-100",
  REJECTED: "bg-gray-100 text-gray-600 border-gray-200",
};

const reportStatusLabel = {
  PENDING: "처리 대기",
  RESOLVED: "처리 완료",
  REJECTED: "반려",
};

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto w-full max-w-[1500px]">
      {/* 페이지 타이틀 */}
      <section className="mb-8">
        <p className="mb-2 text-sm font-medium text-gray-400">
          Admin Dashboard
        </p>

        <div className="flex items-end justify-between gap-5">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-gray-900">
              관리자 대시보드
            </h1>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              WAIVS 서비스의 회원, 게시판 및 신고 현황을 확인할 수 있습니다.
            </p>
          </div>

          <div className="hidden items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-xs text-gray-500 shadow-sm md:flex">
            <Clock3 size={15} />
            최근 업데이트
            <span className="font-semibold text-gray-700">
              2026.09.01
            </span>
          </div>
        </div>
      </section>

      {/* 통계 카드 */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-500">
                    {card.title}
                  </p>

                  <div className="mt-3 flex items-end gap-1">
                    <span className="text-[32px] font-bold leading-none tracking-tight text-gray-900">
                      {card.value}
                    </span>

                    <span className="pb-0.5 text-sm font-medium text-gray-500">
                      {card.unit}
                    </span>
                  </div>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                  <Icon size={21} strokeWidth={1.9} />
                </div>
              </div>

              <p className="mt-5 text-xs leading-5 text-gray-400">
                {card.description}
              </p>
            </div>
          );
        })}
      </section>

      {/* 중간 안내 영역 */}
      <section className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* 관리자 안내 */}
        <div className="rounded-2xl border border-gray-200 bg-[#111827] p-6 text-white lg:col-span-2">
          <div className="flex h-full flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                <CircleAlert size={20} />
              </div>

              <h2 className="text-lg font-bold">
                관리자 확인이 필요한 신고가 있습니다.
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-300">
                현재 처리되지 않은 신고가 3건 있습니다. 신고된 게시글의
                내용을 확인한 후 반려 또는 삭제 처리를 진행해주세요.
              </p>
            </div>

            <Link
              href="/admin/reports"
              className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-100"
            >
              신고 확인하기
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>

        {/* 운영 상태 */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-gray-900">
            서비스 운영 상태
          </p>

          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2
                  size={17}
                  className="text-emerald-500"
                />
                <span className="text-sm text-gray-600">
                  회원 서비스
                </span>
              </div>

              <span className="text-xs font-semibold text-emerald-600">
                정상
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2
                  size={17}
                  className="text-emerald-500"
                />
                <span className="text-sm text-gray-600">
                  게시판 서비스
                </span>
              </div>

              <span className="text-xs font-semibold text-emerald-600">
                정상
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2
                  size={17}
                  className="text-emerald-500"
                />
                <span className="text-sm text-gray-600">
                  신고 관리
                </span>
              </div>

              <span className="text-xs font-semibold text-emerald-600">
                정상
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 테이블 영역 */}
      <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[2fr_3fr]">
        {/* 최근 가입 회원 */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                최근 가입 회원
              </h2>

              <p className="mt-1 text-xs text-gray-400">
                최근 WAIVS에 가입한 회원입니다.
              </p>
            </div>

            <Link
              href="/admin/users"
              className="flex items-center gap-1 text-xs font-semibold text-gray-500 transition hover:text-gray-900"
            >
              전체보기
              <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    회원
                  </th>

                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    가입일
                  </th>

                  <th className="px-6 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    상태
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {recentUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="transition hover:bg-gray-50/70"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                          {user.name.charAt(0)}
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800">
                            {user.name}
                          </p>

                          <p className="mt-0.5 truncate text-xs text-gray-400">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-center text-sm text-gray-500">
                      {user.joinedAt}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                          statusStyle[
                            user.status as keyof typeof statusStyle
                          ]
                        }`}
                      >
                        {user.status === "ACTIVE"
                          ? "정상"
                          : "정지"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 최근 신고 */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                최근 신고
              </h2>

              <p className="mt-1 text-xs text-gray-400">
                최근 접수된 게시글 신고 내역입니다.
              </p>
            </div>

            <Link
              href="/admin/reports"
              className="flex items-center gap-1 text-xs font-semibold text-gray-500 transition hover:text-gray-900"
            >
              전체보기
              <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    신고 대상
                  </th>

                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    사유
                  </th>

                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    신고일
                  </th>

                  <th className="px-6 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    상태
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {recentReports.map((report) => (
                  <tr
                    key={report.id}
                    className="transition hover:bg-gray-50/70"
                  >
                    <td className="px-6 py-4">
                      <p className="text-center text-sm font-semibold text-gray-800">
                        {report.target}
                      </p>

                      <p className="mt-0.5 text-center text-xs text-gray-400">
                        신고자 {report.reporter}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-center text-sm text-gray-500">
                      {report.reason}
                    </td>

                    <td className="px-4 py-4 text-center text-sm text-gray-500">
                      {report.reportedAt}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                          reportStatusStyle[
                            report.status as keyof typeof reportStatusStyle
                          ]
                        }`}
                      >
                        {
                          reportStatusLabel[
                            report.status as keyof typeof reportStatusLabel
                          ]
                        }
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}