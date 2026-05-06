"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Bell, Menu, X, LogOut, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type DemoNotif = {
  id: string;
  title: string;
  body: string;
  time: string;
  href?: string;
  unread?: boolean;
};

export default function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { user, isLoggedIn, logout } = useAuth();

  const [openUserMenu, setOpenUserMenu] = useState(false);
  const [openMobileNav, setOpenMobileNav] = useState(false);
  const [openNotif, setOpenNotif] = useState(false);

  const [rememberedWorkspaceId, setRememberedWorkspaceId] = useState<
    string | null
  >(null);

  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const notifRef = useRef<HTMLDivElement | null>(null);

  // =========================================================
  // 현재 URL에서 workspaceId 추출
  // /main/abc123 -> abc123
  // /main        -> null
  // =========================================================
  const workspaceIdFromPath = (() => {
    const parts = pathname?.split("/").filter(Boolean) ?? [];

    if (parts[0] === "main" && parts[1]) {
      return parts[1];
    }

    return null;
  })();

  // =========================================================
  // 쿼리스트링에서 workspaceId 추출
  // /schedules?workspaceId=abc123
  // /devlogs?workspaceId=abc123
  // =========================================================
  const workspaceIdFromQuery =
    searchParams.get("workspaceId") ??
    searchParams.get("workspaceid") ??
    searchParams.get("workspace");

  const currentWorkspaceId =
    workspaceIdFromPath || workspaceIdFromQuery || rememberedWorkspaceId;

  const homeHref = currentWorkspaceId ? `/main/${currentWorkspaceId}` : "/main";

  // =========================================================
  // workspaceId가 URL에서 발견되면 localStorage에 저장
  // =========================================================
  useEffect(() => {
    const foundWorkspaceId = workspaceIdFromPath || workspaceIdFromQuery;

    if (!foundWorkspaceId) return;

    localStorage.setItem("currentWorkspaceId", foundWorkspaceId);
    setRememberedWorkspaceId(foundWorkspaceId);
  }, [workspaceIdFromPath, workspaceIdFromQuery]);

  // =========================================================
  // 처음 렌더링될 때 저장된 workspaceId 불러오기
  // =========================================================
  useEffect(() => {
    const storedWorkspaceId = localStorage.getItem("currentWorkspaceId");

    if (storedWorkspaceId) {
      setRememberedWorkspaceId(storedWorkspaceId);
    }
  }, []);

  const demoNotifs: DemoNotif[] = [
    {
      id: "n1",
      title: "일정 알림",
      body: "오늘 오후 3시 팀 회의가 예정되어 있습니다",
      time: "10분 전",
      unread: true,
      href: "/schedules",
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
      href: "/main",
    },
  ];

  const unreadCount = demoNotifs.filter((n) => n.unread).length;

  // =========================================================
  // 바깥 클릭 시 드롭다운 닫기
  // =========================================================
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

  // =========================================================
  // 라우트 변경 시 메뉴 닫기
  // =========================================================
  useEffect(() => {
    setOpenMobileNav(false);
    setOpenUserMenu(false);
    setOpenNotif(false);
  }, [pathname]);

  const onLogout = async () => {
    logout();
    router.replace("/");
  };

  const onToggleBell = () => {
    setOpenUserMenu(false);
    setOpenNotif((v) => !v);
  };

  const NAV_ITEMS = [
    { href: homeHref, label: "HOME", matchPath: "/main" },
    { href: "/projects", label: "AIVS", matchPath: "/projects" },
    { href: "/relocation", label: "설계단계", matchPath: "/relocation" },
    { href: "/schedules", label: "일정관리", matchPath: "/schedules" },
    { href: "/devlogs", label: "개발일지", matchPath: "/devlogs" },
    { href: "/community", label: "게시판", matchPath: "/community" },
    { href: "/my", label: "마이페이지", matchPath: "/my" },
  ];

  // =========================================================
  // HOME 활성화 조건
  // /main에서는 비활성화
  // /main/[workspaceId]에서만 활성화
  // =========================================================
  const isNavItemActive = (item: (typeof NAV_ITEMS)[number]) => {
    if (item.label === "HOME") {
      return Boolean(workspaceIdFromPath);
    }

    return pathname?.startsWith(item.matchPath);
  };

  return (
    <header className="sticky top-0 z-[2000] border-b border-gray-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-2 text-xl">
        {/* 로고 */}
        <Link href="/" className="font-black tracking-tight">
          WEVAIS
        </Link>

        {/* 데스크톱 네비게이션 */}
        <nav className="hidden items-center gap-8 text-sm text-gray-600 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = isNavItemActive(item);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "transition hover:text-gray-900",
                  active && "font-semibold text-gray-900",
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
            className="rounded-xl p-2 text-gray-700 hover:bg-gray-100 md:hidden"
            onClick={() => setOpenMobileNav((v) => !v)}
            aria-label="메뉴 열기"
          >
            {openMobileNav ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>

          {!isLoggedIn ? (
            <div className="hidden items-center gap-4 text-sm font-semibold md:flex">
              <Link
                href="/auth/login"
                className="text-gray-600 hover:text-gray-900"
              >
                로그인
              </Link>

              <Link
                href="/auth/signup"
                className="rounded-xl bg-gray-900 px-3 py-2 text-white transition hover:bg-black"
              >
                회원가입
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* 알림 */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={onToggleBell}
                  className="relative rounded-xl p-2 text-gray-700 hover:bg-gray-100"
                  aria-label="알림"
                >
                  <Bell className="h-5 w-5" />

                  {unreadCount > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
                  ) : null}
                </button>

                {openNotif ? (
                  <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
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
                            className="w-full border-b border-gray-50 px-4 py-3 text-left last:border-b-0 hover:bg-gray-50"
                            onClick={() => {
                              setOpenNotif(false);

                              if (n.href) {
                                router.push(n.href);
                              }
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

                                <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">
                                  {n.body}
                                </p>
                              </div>

                              <span className="shrink-0 text-[11px] text-gray-400">
                                {n.time}
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>

                    <div className="border-t border-gray-100 px-4 py-3">
                      <Link
                        href="/notifications"
                        className="block w-full rounded-xl bg-gray-900 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-black"
                        onClick={() => setOpenNotif(false)}
                      >
                        전체 알림 보기
                      </Link>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* 유저 메뉴 */}
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setOpenNotif(false);
                    setOpenUserMenu((v) => !v);
                  }}
                  className="flex items-center gap-2 rounded-2xl px-2 py-1.5 transition hover:bg-gray-100"
                  aria-label="유저 메뉴"
                >
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-gray-200 text-sm font-bold text-gray-600">
                    {(user?.name?.trim()?.[0] ?? "U").toUpperCase()}
                  </div>

                  <span className="hidden text-sm font-semibold text-gray-800 sm:inline">
                    {user?.name ?? "사용자"}
                  </span>
                </button>

                {openUserMenu ? (
                  <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
                    <div className="border-b border-gray-100 px-4 py-3">
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
                        <User className="h-4 w-4" />
                        마이페이지
                      </Link>

                      <button
                        type="button"
                        onClick={onLogout}
                        className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                      >
                        <LogOut className="h-4 w-4" />
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

      {/* 모바일 네비게이션 */}
      {openMobileNav ? (
        <div className="border-t border-gray-200 bg-white md:hidden">
          <div className="flex flex-col gap-2 px-6 py-4">
            {NAV_ITEMS.map((item) => {
              const active = isNavItemActive(item);

              return (
                <Link
                  key={item.label}
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
              <div className="flex gap-2 pt-2">
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
