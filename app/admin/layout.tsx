"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  Flag,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";

const menuItems = [
  {
    name: "대시보드",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    name: "회원 관리",
    href: "/admin/users",
    icon: Users,
  },
  {
    name: "게시판 관리",
    href: "/admin/posts",
    icon: FileText,
  },
  {
    name: "신고 관리",
    href: "/admin/reports",
    icon: Flag,
  },
];

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }

    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-[#f6f7f9]">
      {/* 왼쪽 관리자 사이드바 */}
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-[250px] flex-col border-r border-gray-200 bg-white">
        {/* 로고 영역 */}
        <div className="flex h-[72px] items-center border-b border-gray-200 px-6">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#111827]">
              <ShieldCheck size={22} className="text-white" />
            </div>

            <div>
              <p className="text-[18px] font-bold tracking-tight text-gray-900">
                WAIVS
              </p>
              <p className="text-[11px] font-medium tracking-[0.18em] text-gray-400">
                ADMIN
              </p>
            </div>
          </Link>
        </div>

        {/* 메뉴 */}
        <nav className="flex-1 px-3 py-5">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
            Management
          </p>

          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex h-[46px] items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
                    active
                      ? "bg-[#111827] text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Icon
                    size={19}
                    strokeWidth={active ? 2.2 : 1.8}
                    className={
                      active ? "text-white" : "text-gray-500"
                    }
                  />

                  <span>{item.name}</span>

                  {item.href === "/admin/reports" && (
                    <span
                      className={`ml-auto flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                        active
                          ? "bg-white text-gray-900"
                          : "bg-red-50 text-red-500"
                      }`}
                    >
                      3
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* 하단 */}
        <div className="border-t border-gray-200 p-3">
          <Link
            href="/main"
            className="flex h-[46px] items-center gap-3 rounded-lg px-3 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <ArrowLeft size={19} />
            WAIVS로 돌아가기
          </Link>

          <div className="mt-3 rounded-xl bg-gray-50 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
                A
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-800">
                  관리자
                </p>
                <p className="truncate text-xs text-gray-400">
                  Administrator
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* 오른쪽 콘텐츠 영역 */}
      <div className="ml-[250px] min-h-screen">
        {/* 상단 헤더 */}
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-gray-200 bg-white/95 px-8 backdrop-blur">
          <div>
            <p className="text-sm font-medium text-gray-400">
              WAIVS Administration
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-800">
                관리자
              </p>
              <p className="text-[11px] text-gray-400">
                ADMIN
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#111827] text-xs font-bold text-white">
              A
            </div>
          </div>
        </header>

        {/* 각 관리자 페이지 */}
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}