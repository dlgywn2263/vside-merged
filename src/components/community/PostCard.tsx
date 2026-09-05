"use client";

import Link from "next/link";
import { Eye, Heart, Bookmark, FileText } from "lucide-react";

type Props = {
  post: any;
  isLast?: boolean;
};

const categoryLabel: Record<string, string> = {
  Question: "질문",
  Free: "자유",
  Info: "정보",
  AIHelp: "AI 도움",
};

const categoryStyle: Record<string, string> = {
  Question: "bg-blue-50 text-blue-600",
  Free: "bg-violet-50 text-violet-600",
  Info: "bg-emerald-50 text-emerald-600",
  AIHelp: "bg-amber-50 text-amber-600",
};

export default function PostCard({
  post,
  isLast = false,
}: Props) {
  const preview = post.attachments?.[0];

  const imageUrl =
    post.previewImageUrl ||
    (preview?.type === "image" ? preview?.url : null);

  const hasImage = Boolean(imageUrl);
  const hasFile = preview && preview.type !== "image";

  let formattedDate = "";

  if (post.createdAt) {
    if (typeof post.createdAt === "string") {
      formattedDate = post.createdAt.split("T")[0];
    } else if (Array.isArray(post.createdAt)) {
      const year = post.createdAt[0];
      const month = String(post.createdAt[1]).padStart(2, "0");
      const day = String(post.createdAt[2]).padStart(2, "0");

      formattedDate = `${year}-${month}-${day}`;
    }
  }

  const views =
    post.viewCount ??
    post.views ??
    0;

  const likes =
    post.likeCount ??
    post.likes ??
    0;

  const scraps =
    post.scrapCount ??
    post.scraps ??
    0;

  const handleClick = () => {
    sessionStorage.setItem(
      `community-view-${post.id}`,
      String(views)
    );
  };

  return (
    <Link
      href={`/community/${post.id}`}
      onClick={handleClick}
      className={`group block h-[190px] px-6 py-5 transition hover:bg-blue-50/30 ${
        !isLast ? "border-b border-slate-100" : ""
      }`}
    >
      <div className="flex h-full gap-6">
        {/* 왼쪽 게시글 정보 */}
        <div className="grid min-w-0 flex-1 grid-rows-[auto_auto_1fr_auto]">
          {/* 카테고리 */}
          <div>
            <span
              className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${
                categoryStyle[post.category] ??
                "bg-slate-100 text-slate-500"
              }`}
            >
              {categoryLabel[post.category] ?? post.category}
            </span>
          </div>

          {/* 제목 */}
          <h3 className="mt-2 truncate text-[17px] font-bold text-slate-900 transition group-hover:text-blue-600">
            {post.title}
          </h3>

          {/* 내용 + 태그 */}
          <div className="min-h-0 pt-2">
            <p className="line-clamp-2 overflow-hidden text-sm leading-6 text-slate-500">
              {post.contentSnippet ?? post.content}
            </p>

            {post.tags?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {post.tags.slice(0, 4).map((tag: string) => (
                  <span
                    key={tag}
                    className="text-xs font-medium text-blue-500"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 작성자 / 날짜 / 통계 */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{post.authorName}</span>

              {formattedDate && (
                <>
                  <span>·</span>
                  <span>{formattedDate}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400">
              {/* 조회수 */}
              <span className="flex items-center gap-1">
                <Eye size={13} />
                {views}
              </span>

              {/* 좋아요 */}
              <span className="flex items-center gap-1">
                <Heart size={13} />
                {likes}
              </span>

              {/* 스크랩 */}
              <span className="flex items-center gap-1">
                <Bookmark size={13} />
                {scraps}
              </span>
            </div>
          </div>
        </div>

        {/* 이미지 미리보기 */}
        {hasImage && (
          <div className="h-full w-[165px] shrink-0 overflow-hidden rounded-xl bg-slate-100">
            <img
              src={imageUrl}
              alt={post.title || "게시글 이미지"}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          </div>
        )}

        {/* 일반 첨부파일 */}
        {!hasImage && hasFile && (
          <div className="flex h-full w-[165px] shrink-0 flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-center">
            <FileText
              size={24}
              className="text-blue-400"
            />

            <span className="mt-2 line-clamp-2 text-xs text-slate-500">
              {preview.name}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}