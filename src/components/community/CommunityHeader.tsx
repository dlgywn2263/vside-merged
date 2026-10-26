"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

export default function CommunityHeader() {
  return (
    <div className="mb-8 flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-slate-950">게시판</h1>
        <p className="mt-2 text-sm text-slate-500">
          개발 지식, 질문, 코드 고민을 공유하는 공간
        </p>
      </div>

      <Link
        href="/community/write"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-[13px] font-semibold text-white shadow-sm shadow-blue-100 transition hover:bg-blue-700"
      >
        <Plus size={15} />
        글 작성
      </Link>
    </div>
  );
}