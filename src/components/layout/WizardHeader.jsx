"use client";

import { Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

const HEADER_MAP = {
  "/new/workspace": {
    title: "프로젝트 생성",
    subtitle: "프로젝트를 생성하세요",
  },
  "/new/language": {
    title: "언어 선택",
    subtitle: "프로젝트 언어를 선택하세요",
  },
  "/new/config": {
    title: "새 프로젝트 구성",
    subtitle: "프로젝트 세부 설정을 완료하세요",
  },
};

export default function WizardHeader() {
  const router = useRouter();
  const pathname = usePathname();

  const header = HEADER_MAP[pathname] ?? {
    title: "",
    subtitle: "",
  };

  return (
    <header className="pt-6 border-gray-300 bg-gray-50  top-0 left-0 right-0 ">
      <div className="mx-auto max-w-6xl px-6  flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* <button
            type="button"
            onClick={() => router.back()}
            className="text-gray-600 text-xl leading-none"
            aria-label="뒤로가기"
          >
            <ArrowLeft />
          </button> */}

          <div>
            <h1 className="text-xl font-bold">{header.title}</h1>
            {header.subtitle && (
              <p className="text-gray-500">{header.subtitle}</p>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
