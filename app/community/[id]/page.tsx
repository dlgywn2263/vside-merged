import CommentSection from "@/components/community/CommentSection";
import { mockPosts } from "@/components/community/CommunityMock";
import {
  Bookmark, Heart,
  Pencil, Trash2,
  ArrowLeft, ChevronLeft, ChevronRight
} from "lucide-react";
import Link from "next/link";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

const CURRENT_USER = "신유";

export default async function CommunityDetailPage({ params }: Props) {
  const { id } = await params;

  const post = mockPosts.find((item) => String(item.id) === String(id));

  if (!post) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-50/70 via-white to-white px-6 py-10 text-slate-900">
        <div className="mx-auto max-w-4xl rounded-3xl border border-blue-100 bg-white p-10 text-center text-slate-500 shadow-sm">
          게시글을 찾을 수 없습니다.
        </div>
      </main>
    );
  }

  const currentIndex = mockPosts.findIndex(
    (item) => String(item.id) === String(id)
        );

    const prevPost = currentIndex > 0 ? mockPosts[currentIndex - 1] : null;
    const nextPost = currentIndex < mockPosts.length - 1 ? mockPosts[currentIndex + 1] : null;

  const isMyPost = post.authorName === CURRENT_USER;

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50/70 via-white to-white px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <Link
            href="/community"
            className="mb-8 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-blue-600"        >
            <ArrowLeft size={14} />
            목록으로
        </Link>
        
        <div className="rounded-3xl border border-blue-100 bg-white p-7 shadow-[0_18px_45px_rgba(37,99,235,0.08)]">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-600">
                  {post.category}
                </span>

                <span className="text-sm text-slate-500">
                  {post.authorName} · {post.createdAt}
                </span>
              </div>

              <h1 className="text-3xl font-bold text-slate-950">
                {post.title}
              </h1>
            </div>

            {isMyPost && (
              <div className="flex shrink-0 gap-2">
                <Link
                  href={`/community/${post.id}/edit`}
                  className="inline-flex items-center gap-1 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-100"
                >
                  <Pencil size={15} />
                  수정
                </Link>

                <button className="inline-flex items-center gap-1 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-100">
                  <Trash2 size={15} />
                  삭제
                </button>
              </div>
            )}
          </div>

          <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-slate-600">
            {post.content}
          </p>

          {post.attachments && post.attachments.length > 0 && (
            <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
              <p className="mb-3 text-sm font-semibold text-slate-700">
                첨부 자료
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                {post.attachments.map((file) => (
                  <div
                    key={file.id}
                    className="overflow-hidden rounded-2xl border border-blue-100 bg-white"
                  >
                    {file.type === "image" ? (
                      <img
                        src={file.url}
                        alt={file.name}
                        className="h-48 w-full object-cover"
                      />
                    ) : (
                      <div className="p-4 text-sm text-slate-600">
                        {file.name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600"
              >
                #{tag}
              </span>
            ))}
          </div>

          <div className="mt-7 flex items-center justify-between border-t border-slate-100 pt-5">
            <div className="text-sm text-slate-500">
              조회 {post.views} · 좋아요 {post.likes}
            </div>

            <div className="flex gap-2">
              <button className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-blue-600">
                <Heart size={17} />
                좋아요
              </button>

              <button className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-blue-600">
                <Bookmark size={17} />
                스크랩
              </button>
            </div>
          </div>
        </div>
        <div className="mb-5 flex items-center justify-between">

        <div className="mt-10 flex justify-center gap-6">
            {prevPost ? (
                <Link
                href={`/community/${prevPost.id}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-slate-400 transition hover:text-blue-600"
                >
                <ChevronLeft size={16} />
                이전글
                </Link>
            ) : (
                <span className="inline-flex items-center gap-1 text-sm text-slate-300">
                <ChevronLeft size={16} />
                이전글
                </span>
            )}

            <span className="text-slate-300">|</span>

            {nextPost ? (
                <Link
                href={`/community/${nextPost.id}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-slate-400 transition hover:text-blue-600"
                >
                다음글
                <ChevronRight size={16} />
                </Link>
            ) : (
                <span className="inline-flex items-center gap-1 text-sm text-slate-300">
                다음글
                <ChevronRight size={16} />
                </span>
            )}
            </div>
            </div>
        <CommentSection />
      </div>
    </main>
  );
}