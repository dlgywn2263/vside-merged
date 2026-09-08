"use client";

import React, { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";

import TopNav from "@/components/landing/TopNav";
import { useAuth } from "@/contexts/AuthContext";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const {
    loading,
    isAuthenticated,
    isLoggedIn,
  } = useAuth();

  const isAuthed = Boolean(
    isAuthenticated || isLoggedIn,
  );

  const publicPaths = useMemo(
    () => [
      "/",
      "/auth/login",
      "/auth/signup",
    ],
    [],
  );

  const isPublicPath = useMemo(() => {
    if (!pathname) {
      return false;
    }

    if (publicPaths.includes(pathname)) {
      return true;
    }

    if (
      pathname.startsWith("/auth/github")
    ) {
      return true;
    }

    return false;
  }, [pathname, publicPaths]);

  const hideTopNav =
    pathname === "/auth/login" ||
    pathname === "/auth/signup" ||
    pathname?.startsWith("/auth/github") ||
    pathname?.startsWith("/admin");

  useEffect(() => {
    if (loading) return;
    if (isPublicPath) return;
    if (isAuthed) return;

    const currentPath =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : pathname || "/";

    router.replace(
      `/auth/login?next=${encodeURIComponent(
        currentPath,
      )}`,
    );
  }, [
    loading,
    isPublicPath,
    isAuthed,
    pathname,
    router,
  ]);

  useEffect(() => {
    if (loading) return;
    if (!isAuthed) return;

    if (
      pathname === "/auth/login" ||
      pathname === "/auth/signup"
    ) {
      router.replace("/main");
    }
  }, [
    loading,
    isAuthed,
    pathname,
    router,
  ]);

  if (loading) {
    return null;
  }

  if (
    !isPublicPath &&
    !isAuthed
  ) {
    return null;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#F7F8FA]">
      {!hideTopNav && (
        <TopNav />
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        {children}
      </div>
    </div>
  );
}