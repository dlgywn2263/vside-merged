"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchComments, createComment } from "@/lib/communityApi";
import { Send, Loader2 } from "lucide-react";

export default function CommentSection() {
  const { id } = useParams();
  const [comments, setComments] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  // 💡 1. 백엔드에서 댓글 목록 불러오기
  useEffect(() => {
    if (!id) return;
    setIsFetching(true);
    fetchComments(Number(id))
      .then(data => setComments(data.content || [])) // Page 객체의 content 배열 저장
      .catch(err => console.error("댓글 불러오기 실패", err))
      .finally(() => setIsFetching(false));
  }, [id]);

  // 💡 2. 댓글 작성 후 API 전송
  const handleCommentSubmit = async () => {
    if (!content.trim()) return;

    setIsLoading(true);
    try {
      const newComment = await createComment(Number(id), content);
      setComments((prev) => [...prev, newComment]); // 작성 성공 시 즉시 목록에 추가
      setContent(""); // 입력창 초기화
    } catch (error) {
      alert("댓글 작성에 실패했습니다. 로그인을 확인해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-8 rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-xl font-bold text-slate-950">
        댓글 <span className="text-blue-600">{comments.length}</span>
      </h2>

      {/* 댓글 리스트 렌더링 */}
      <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
        {isFetching ? (
          <div className="flex justify-center py-4 text-blue-500"><Loader2 className="animate-spin" /></div>
        ) : comments.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-6">아직 댓글이 없습니다. 첫 댓글을 남겨보세요!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="rounded-2xl border border-blue-50 bg-blue-50/30 p-4">
              <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap leading-relaxed">
                {comment.content}
              </p>
              <p className="mt-2 text-xs font-semibold text-slate-400">
                {comment.authorName} · {comment.createdAt?.split('T').join(' ').substring(0, 16)}
              </p>
            </div>
          ))
        )}
      </div>

      {/* 댓글 작성 입력창 */}
      <div className="flex gap-2">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              handleCommentSubmit();
            }
          }}
          placeholder="댓글을 입력하세요"
          className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />

        <button 
          onClick={handleCommentSubmit}
          disabled={isLoading || !content.trim()}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-100 transition hover:bg-blue-700 disabled:bg-slate-300 disabled:shadow-none"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          등록
        </button>
      </div>
    </div>
  );
}