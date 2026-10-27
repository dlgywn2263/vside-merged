"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import TopNav from "@/components/landing/TopNav";
import { useAuth } from "@/contexts/AuthContext";
import { MessageProvider } from "@/contexts/MessageContext";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { user, loading, isAuthenticated, isLoggedIn } = useAuth();
  const isAuthed = Boolean(isAuthenticated || isLoggedIn);
  const isAdmin = user?.role === "ADMIN";

  const isAdminPath = /^\/admin(\/|$)/.test(pathname);
  const isAuthPage = pathname === "/auth/login" || pathname === "/auth/signup";
  const isGithubAuth = /^\/auth\/github(\/|$)/.test(pathname);
  const isPublicPath = pathname === "/" || isAuthPage || isGithubAuth;
  const isUserOnlyPath = /^\/(projects|dashboard|design|schedules|aivs|devlogs|archive|messages|main)(\/|$)/.test(pathname);
  const isAdminBlocked = isAdmin && isUserOnlyPath;
  const hideTopNavBase = isAuthPage || isGithubAuth || isAdminPath;

  // 코드 편집 화면(/ide/personal|team/{id})에서는 공통 헤더를 띄우지 않는다.
  // 페이지 이동·메시지·알림은 IDE 메뉴바의 "WAIVS ▾" 드롭다운(WaivsNavMenu)이 대신한다.
  const isIdeWorkspace = /^\/ide\/(personal|team)\/[^/]+/.test(pathname);
  const hideTopNav = hideTopNavBase || isIdeWorkspace;
  // IDE는 자체 패널 스크롤을 사용하므로 화면 높이를 고정합니다.
  const isIdePage = isIdeWorkspace || /^\/aivs(\/|$)/.test(pathname) || /^\/projects\/[^/]+(\/|$)/.test(pathname);
  // 일정관리와 개발일지는 문서 자체의 기본 스크롤을 사용합니다.
  // IDE만 자체 스크롤 레이아웃을 유지합니다.

  useEffect(() => {
    if (loading) return;
    if (!isPublicPath && !isAuthed) {
      const currentPath = `${window.location.pathname}${window.location.search}`;
      router.replace(`/auth/login?next=${encodeURIComponent(currentPath)}`);
      return;
    }
    if (!isAuthed || !user) return;
    if (isAuthPage) {
      router.replace(isAdmin ? "/admin" : "/projects");
      return;
    }
    if (isAdminPath && !isAdmin) {
      router.replace("/projects");
      return;
    }
    if (isAdminBlocked) {
      router.replace("/admin");
    }
  }, [loading, isPublicPath, isAuthed, user, isAuthPage, isAdmin, isAdminPath, isAdminBlocked, pathname, router]);

  if (
    loading ||
    (!isPublicPath && !isAuthed) ||
    (isAdminPath && (!isAuthed || !user || !isAdmin)) ||
    (isAuthPage && isAuthed && !!user) ||
    isAdminBlocked
  ) {
    return null;
  }

  return (
    <MessageProvider>
      <div className={isIdePage
        ? "flex h-dvh min-h-0 flex-col overflow-hidden bg-[#F7F8FA]"
        : "flex min-h-dvh flex-col bg-[#F7F8FA]"
      }>
        {!hideTopNav && <TopNav />}
        <div className={isIdePage
          ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          : "flex min-w-0 flex-1 flex-col"
        }>
          {children}
        </div>
      </div>
    </MessageProvider>
  );
}
