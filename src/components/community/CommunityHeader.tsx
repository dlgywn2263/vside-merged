"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

export default function CommunityHeader() {
  return (
    <div className="mb-8 flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-slate-950">커뮤니티</h1>
        <p className="mt-2 text-sm text-slate-500">
          개발 지식, 질문, 코드 고민을 공유하는 공간
        </p>
      </div>

      <Link
        href="/community/write"
        className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-100 transition hover:bg-blue-700"
      >
        <Plus size={18} />
        글 작성
      </Link>
    </div>
  );
}