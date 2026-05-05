"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bell, Menu, X, LogOut, User, House } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type DemoNotif = {
  id: string;
  title: string;
  body: string;
  time: string;
  href?: string; // ✅ TODO: 알림 클릭 시 이동할 링크 (백엔드 연결 시)
  unread?: boolean;
};

export default function TopNav() {
  const router = useRouter();
  const pathname = usePathname();

  const { user, isLoggedIn, logout } = useAuth();

  const [openUserMenu, setOpenUserMenu] = useState(false);
  const [openMobileNav, setOpenMobileNav] = useState(false);

  // ✅ 알림 패널
  const [openNotif, setOpenNotif] = useState(false);

  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const notifRef = useRef<HTMLDivElement | null>(null);

  // ✅ 데모 알림 데이터 (TODO: 백엔드 연결 시 fetch로 교체)
  const demoNotifs: DemoNotif[] = [
    {
      id: "n1",
      title: "일정 알림",
      body: "오늘 오후 3시 팀 회의가 예정되어 있습니다",
      time: "10분 전",
      unread: true,
      href: "/schedule",
    },
    {
      id: "n2",
      title: "커밋 알림",
      body: "김개발님이 main 브랜치에 커밋했습니다",
      time: "30분 전",
      unread: true,
      href: "/projects",
    },
    {
      id: "n3",
      title: "팀 채팅",
      body: "이프로트: 코드 리뷰 부탁드립니다",
      time: "1시간 전",
      unread: false,
      href: "/projects",
    },
    {
      id: "n4",
      title: "오류 알림",
      body: "빌드 프로세스에서 오류가 발생했습니다. 로그를 확인하세요",
      time: "4시간 전",
      unread: false,
      href: "/dashboard",
    },
  ];

  const unreadCount = demoNotifs.filter((n) => n.unread).length; // ✅ TODO: 실제 unreadCount로 교체

  // ✅ 바깥 클릭하면 유저 메뉴/알림 패널 닫기
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;

      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setOpenUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(target)) {
        setOpenNotif(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // ✅ 라우트 바뀌면 모바일 메뉴/드롭다운 닫기
  useEffect(() => {
    setOpenMobileNav(false);
    setOpenUserMenu(false);
    setOpenNotif(false);
  }, [pathname]);

  const onLogout = async () => {
    /**
     * =====================================================
     * ✅ TODO (백엔드 연결 시 여기 교체)
     *
     * 1) 서버에 "로그아웃" 요청 보내서 세션/쿠키/토큰 폐기
     *    - 예) await fetch("/api/auth/logout", { method: "POST" });
     * 2) 성공하면 프론트 상태 초기화
     *    - logout();
     *
     * (지금은 로컬스토리지 기반이라 logout()만 해도 됨)
     * =====================================================
     */
    logout();
    router.replace("/");
  };

  const onToggleBell = () => {
    // UX: 알림 열면 유저 메뉴 닫기
    setOpenUserMenu(false);
    setOpenNotif((v) => !v);
  };

  const NAV_ITEMS = [
    { href: "/projects", label: "AIVS" },
    { href: "/relocation", label: "재배치" },
    { href: "/schedules", label: "일정관리" },
    { href: "/devlogs", label: "개발일지" },
    { href: "/community", label: "게시판" },
    { href: "/my", label: "마이페이지" },
  ];

  return (
    <header className="sticky top-0 z-[2000] border-b border-gray-200 bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-6 py-2 flex items-center justify-between text-xl">
        {/* 로고 */}
        <Link href="/" className="font-black tracking-tight">
          WEVAIS
        </Link>

        {/* 데스크톱 네비 */}
        <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600">
          {NAV_ITEMS.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "hover:text-gray-900 transition",
                  active && "text-gray-900 font-semibold",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* 우측 영역 */}
        <div className="flex items-center gap-3">
          {/* 모바일 메뉴 버튼 */}
          <button
            type="button"
            className="md:hidden rounded-xl p-2 hover:bg-gray-100 text-gray-700"
            onClick={() => setOpenMobileNav((v) => !v)}
            aria-label="메뉴 열기"
          >
            {openMobileNav ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>

          {!isLoggedIn ? (
            <div className="hidden md:flex items-center gap-4 text-sm font-semibold">
              <Link
                href="/auth/login"
                className="text-gray-600 hover:text-gray-900"
              >
                로그인
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-xl bg-gray-900 px-3 py-2 text-white hover:bg-black transition"
              >
                회원가입
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* 🔔 알림 + 드롭다운 */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={onToggleBell}
                  className="relative rounded-xl p-2 hover:bg-gray-100 text-gray-700"
                  aria-label="알림"
                >
                  <Bell className="w-5 h-5" />
                  {/* ✅ TODO: unreadCount > 0일 때만 */}
                  {unreadCount > 0 ? (
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-red-500 rounded-full" />
                  ) : null}
                </button>

                {openNotif ? (
                  <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">
                          알림
                        </p>
                        {unreadCount > 0 ? (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                            {unreadCount}개 읽지 않음
                          </span>
                        ) : null}
                      </div>

                      <Link
                        href="/notifications"
                        className="text-xs font-semibold text-gray-600 hover:text-gray-900"
                        onClick={() => setOpenNotif(false)}
                      >
                        더보기
                      </Link>
                    </div>

                    <div className="max-h-80 overflow-auto">
                      {demoNotifs.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-gray-500">
                          새 알림이 없어요.
                        </div>
                      ) : (
                        demoNotifs.slice(0, 5).map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-b-0"
                            onClick={() => {
                              // ✅ TODO: 백엔드 연결 시 읽음 처리 API + 해당 링크 이동
                              // await fetch(`/api/notifications/${n.id}/read`, { method: "POST" });
                              setOpenNotif(false);
                              if (n.href) router.push(n.href);
                            }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-gray-900">
                                    {n.title}
                                  </p>
                                  {n.unread ? (
                                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                                  ) : null}
                                </div>
                                <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                                  {n.body}
                                </p>
                              </div>
                              <span className="text-[11px] text-gray-400 shrink-0">
                                {n.time}
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>

                    <div className="px-4 py-3 border-t border-gray-100">
                      <Link
                        href="/notifications"
                        className="block w-full text-center rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black"
                        onClick={() => setOpenNotif(false)}
                      >
                        전체 알림 보기
                      </Link>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* 유저 드롭다운 */}
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    // UX: 유저 메뉴 열면 알림 닫기
                    setOpenNotif(false);
                    setOpenUserMenu((v) => !v);
                  }}
                  className="flex items-center gap-2 rounded-2xl px-2 py-1.5 hover:bg-gray-100 transition"
                  aria-label="유저 메뉴"
                >
                  <div className="h-8 w-8 rounded-full bg-gray-200 grid place-items-center text-gray-600 text-sm font-bold">
                    {(user?.name?.trim()?.[0] ?? "U").toUpperCase()}
                  </div>
                  <span className="hidden sm:inline text-sm font-semibold text-gray-800">
                    {user?.name ?? "사용자"}
                  </span>
                </button>

                {openUserMenu ? (
                  <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">
                        {user?.name ?? "사용자"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {user?.email ?? ""}
                      </p>
                    </div>

                    <div className="p-2">
                      <Link
                        href="/my"
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setOpenUserMenu(false)}
                      >
                        <User className="w-4 h-4" />
                        마이페이지
                      </Link>

                      <button
                        type="button"
                        onClick={onLogout}
                        className="mt-1 w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                      >
                        <LogOut className="w-4 h-4" />
                        로그아웃
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 모바일 네비 패널 */}
      {openMobileNav ? (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-6 py-4 flex flex-col gap-2">
            {NAV_ITEMS.map((item) => {
              const active = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-xl px-3 py-2 text-sm transition",
                    active
                      ? "bg-gray-900 text-white"
                      : "text-gray-700 hover:bg-gray-50",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}

            {!isLoggedIn ? (
              <div className="pt-2 flex gap-2">
                <Link
                  href="/auth/login"
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-center text-sm font-semibold text-gray-800 hover:bg-gray-50"
                >
                  로그인
                </Link>
                <Link
                  href="/auth/signup"
                  className="flex-1 rounded-xl bg-gray-900 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-black"
                >
                  회원가입
                </Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={onLogout}
                className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
              >
                로그아웃
              </button>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
