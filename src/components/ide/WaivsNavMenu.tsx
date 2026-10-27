"use client";

// 경로: src/components/ide/WaivsNavMenu.tsx
// IDE 메뉴바 맨 왼쪽의 "WAIVS ▾" 드롭다운. IDE 화면에서는 공통 헤더(TopNav)를 띄우지 않으므로
// 다른 WAIVS 페이지로 가는 길과, 헤더에만 있던 메시지·알림·로그아웃을 여기로 옮겨 둔다.
// 주소 규칙은 TopNav 와 같다(`/{섹션}/{workspaceId}?mode=`). 바꿀 때는 두 곳을 같이 본다.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Bell, Check, ChevronDown, LogOut, MessageSquare } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useMessages } from "@/contexts/MessageContext";
import { getUnreadNotificationCount } from "@/lib/notification/notificationApi";

type NavItem = { key: string; label: string; href: string };

function parseIdeWorkspace(pathname: string) {
  const match = pathname.match(/^\/ide\/(personal|team)\/([^/]+)/);
  if (!match) return null;
  return { mode: match[1] as "personal" | "team", workspaceId: match[2] };
}

export default function WaivsNavMenu() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { user, logout } = useAuth();
  const { enabled: messagesEnabled, openInbox, unreadCount: unreadMessages } = useMessages();

  const [open, setOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const navItems = useMemo<NavItem[]>(() => {
    const ws = parseIdeWorkspace(pathname);
    // URL 의 id 는 이미 인코딩된 상태라 그대로 붙인다.
    const scoped = (section: string) =>
      ws ? `/${section}/${ws.workspaceId}?mode=${ws.mode}` : "/projects";
    return [
      { key: "projects", label: "프로젝트", href: "/projects" },
      { key: "dashboard", label: "대시보드", href: scoped("dashboard") },
      { key: "schedules", label: "일정관리", href: scoped("schedules") },
      { key: "design", label: "설계관리", href: scoped("design") },
      { key: "aivs", label: "AIVS", href: scoped("aivs") },
      { key: "devlogs", label: "개발일지", href: scoped("devlogs") },
      { key: "archive", label: "자료실", href: scoped("archive") },
      { key: "community", label: "게시판", href: "/community" },
      { key: "my", label: "마이페이지", href: "/my" },
    ];
  }, [pathname]);

  // IDE 는 AIVS 에서 들어오는 작업 화면이라 AIVS 를 현재 메뉴로 표시한다.
  const activeKey = "aivs";

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  // 펼칠 때만 읽지 않은 알림 수를 받아 온다(헤더처럼 주기 조회는 하지 않는다).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getUnreadNotificationCount()
      .then((res) => {
        if (!cancelled) setUnreadNotifications(res.unreadCount ?? 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();

    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) close(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, close]);

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(index + 1) % items.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1]?.focus();
    } else if (event.key === "Tab") {
      close(false);
    }
  };

  // TopNav 의 로그아웃과 같은 정리(마지막 워크스페이스 기억 지우기)를 한다.
  const onLogout = async () => {
    close(false);
    await logout();
    localStorage.removeItem("currentWorkspaceId");
    localStorage.removeItem("currentWorkspaceMode");
    router.replace("/");
  };

  const itemClass =
    "flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px] font-medium outline-none transition-colors focus-visible:bg-[#5873F9]/10";
  const displayName = user?.nickname || user?.name || user?.email || "사용자";

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[13px] font-extrabold tracking-wide text-[#5873F9] transition-colors ${
          open ? "bg-[#5873F9]/10" : "hover:bg-[#5873F9]/[0.07]"
        }`}
      >
        WAIVS
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="WAIVS 페이지 이동"
          onKeyDown={onMenuKeyDown}
          className="absolute left-0 top-full z-[99999] mt-1 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white py-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
        >
          {navItems.map((item) => {
            const active = item.key === activeKey;
            return (
              <Link
                key={item.key}
                href={item.href}
                role="menuitem"
                aria-current={active ? "page" : undefined}
                onClick={() => close(false)}
                className={`${itemClass} ${
                  active ? "text-[#5873F9]" : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span className="flex-1">{item.label}</span>
                {active && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              </Link>
            );
          })}

          <div className="my-1.5 h-px bg-gray-100" role="separator" />

          {messagesEnabled && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close(false);
                openInbox();
              }}
              className={`${itemClass} text-gray-700 hover:bg-gray-50 hover:text-gray-900`}
            >
              <MessageSquare className="h-4 w-4 text-gray-400" aria-hidden="true" />
              <span className="flex-1">메시지</span>
              {unreadMessages > 0 && (
                <span className="rounded-full bg-[#5873F9] px-1.5 text-[10px] font-bold leading-4 text-white">
                  {unreadMessages > 99 ? "99+" : unreadMessages}
                </span>
              )}
            </button>
          )}

          <Link
            href="/notifications"
            role="menuitem"
            onClick={() => close(false)}
            className={`${itemClass} text-gray-700 hover:bg-gray-50 hover:text-gray-900`}
          >
            <Bell className="h-4 w-4 text-gray-400" aria-hidden="true" />
            <span className="flex-1">알림</span>
            {unreadNotifications > 0 && (
              <span className="rounded-full bg-rose-500 px-1.5 text-[10px] font-bold leading-4 text-white">
                {unreadNotifications > 99 ? "99+" : unreadNotifications}
              </span>
            )}
          </Link>

          <div className="my-1.5 h-px bg-gray-100" role="separator" />

          <div className="truncate px-3 pb-1 text-[11px] font-semibold text-gray-400" title={displayName}>
            {displayName}
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={onLogout}
            className={`${itemClass} text-gray-700 hover:bg-rose-50 hover:text-rose-600`}
          >
            <LogOut className="h-4 w-4 text-gray-400" aria-hidden="true" />
            <span className="flex-1">로그아웃</span>
          </button>
        </div>
      )}
    </div>
  );
}
