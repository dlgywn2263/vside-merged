"use client";

import { Send } from "lucide-react";

export default function CommentSection() {
  return (
    <div className="mt-8 rounded-3xl border border-blue-100 bg-white p-6 shadow-[0_18px_45px_rgba(37,99,235,0.08)]">
      <h2 className="mb-5 text-xl font-bold text-slate-950">댓글</h2>

      <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
        <p className="text-sm font-medium text-slate-700">
          좋은 질문이에요. 상태 관리 분리하면 훨씬 편해져요.
        </p>
        <p className="mt-2 text-xs text-slate-500">devwave · 방금 전</p>
      </div>

      <div className="flex gap-2">
        <input
          placeholder="댓글을 입력하세요"
          className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />

        <button className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-100 transition hover:bg-blue-700">
          <Send size={16} />
          등록
        </button>
      </div>
    </div>
  );
}