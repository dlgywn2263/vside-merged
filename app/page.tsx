"use client";

import EditorShowcase from "@/components/landing/EditorShowcase";
import FeatureShowcase from "@/components/landing/FeatureShowcase";
import WorkflowShowcase from "@/components/landing/WorkflowShowcase";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
export default function Page() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    if (isLoggedIn) {
      router.replace("/dashboard"); // 메인 페이지
    }
  }, [isLoggedIn, router]);
  return (
    <main className="bg-white">
      {/* <TopNav /> */}
      <EditorShowcase />
      <FeatureShowcase />
      <WorkflowShowcase />
      {/* <Footer /> */}
    </main>
  );
}
