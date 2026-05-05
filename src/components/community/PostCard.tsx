"use client";

import Link from "next/link";
import { FileText, ImageIcon } from "lucide-react";
import { CommunityPost } from "./CommunityTypes";

type Props = {
  post: CommunityPost;
};

export default function PostCard({ post }: Props) {
  const preview = post.attachments?.[0];

  return (
    <Link
      href={`/community/${post.id}`}
      className="group block rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-blue-300 hover:shadow-[0_12px_35px_rgba(37,99,235,0.10)]"
    >
      <div className="flex gap-6">
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center gap-2">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-600">
              {post.category}
            </span>

            {post.tags.map((tag) => (
              <span key={tag} className="text-sm text-slate-500">
                #{tag}
              </span>
            ))}
          </div>

          <h2 className="text-xl font-bold text-slate-950 group-hover:text-blue-700">
            {post.title}
          </h2>

          <p className="mt-3 line-clamp-2 text-sm text-slate-500">
            {post.content}
          </p>
        </div>

        {preview ? (
          <div className="hidden h-24 w-32 shrink-0 overflow-hidden rounded-2xl border border-blue-100 bg-blue-50 md:block">
            {preview.type === "image" ? (
              <img
                src={preview.url}
                alt={preview.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-blue-600">
                <FileText size={28} />
                <span className="max-w-[110px] truncate text-xs">
                  {preview.name}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="hidden h-24 w-32 shrink-0 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-slate-300 md:flex">
            <ImageIcon size={30} />
          </div>
        )}
      </div>

      <div className="mt-7 flex items-center justify-between text-sm text-slate-500">
        <span>
          {post.authorName} · {post.createdAt}
        </span>

        <span className="text-right">
          조회 {post.views} · 좋아요 {post.likes}
        </span>
      </div>
    </Link>
  );
}