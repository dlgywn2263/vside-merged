"use client";

import { usePathname } from "next/navigation";
import TopNav from "@/components/landing/TopNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const hideTopNav = pathname === "/auth/login" || pathname === "/auth/signup";

  return (
    <>
      {!hideTopNav && <TopNav />}
      {children}
    </>
  );
}
