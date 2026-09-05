"use client";

import { useState } from "react";
import { X } from "lucide-react";

type ReportModalProps = {
  open: boolean;
  postId: number;
  onClose: () => void;
};

type ReportReason =
  | "ABUSE"
  | "SPAM"
  | "OBSCENE"
  | "PERSONAL_INFO"
  | "ETC";

export default function ReportModal({
  open,
  postId,
  onClose,
}: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason | "">("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 모달이 닫혀있으면 렌더링하지 않음
  if (!open) {
    return null;
  }

  const handleClose = () => {
    if (isSubmitting) return;

    setReason("");
    setContent("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!reason) {
      alert("신고 사유를 선택해주세요.");
      return;
    }

    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);

      const token = localStorage.getItem("accessToken");

      const response = await fetch(
        `http://localhost:8080/api/community/posts/${postId}/reports`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && {
              Authorization: `Bearer ${token}`,
            }),
          },
          body: JSON.stringify({
            reason,
            content,
          }),
        }
      );

      // 실패했을 때 백엔드 응답 확인
      if (!response.ok) {
        console.log("신고 실패 상태코드:", response.status);

        const errorText = await response.text();
        console.log("신고 실패 응답:", errorText);

        if (response.status === 400) {
          throw new Error("신고 정보가 올바르지 않습니다.");
        }

        if (response.status === 401) {
          throw new Error("로그인이 필요합니다.");
        }

        if (response.status === 403) {
          throw new Error("신고 권한이 없습니다.");
        }

        if (response.status === 404) {
          throw new Error("신고 API를 찾을 수 없습니다.");
        }

        throw new Error("신고 접수에 실패했습니다.");
      }

      alert("신고가 접수되었습니다.");

      setReason("");
      setContent("");

      onClose();
    } catch (error) {
      console.error("신고 요청 오류:", error);

      alert(
        error instanceof Error
          ? error.message
          : "신고 처리 중 오류가 발생했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            게시글 신고
          </h2>

          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* 신고 사유 */}
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-red-200 hover:bg-red-50">
            <input
              type="radio"
              name="reportReason"
              value="ABUSE"
              checked={reason === "ABUSE"}
              onChange={() => setReason("ABUSE")}
              className="accent-red-500"
            />

            <span className="text-sm text-slate-700">
              욕설 및 비방
            </span>
          </label>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-red-200 hover:bg-red-50">
            <input
              type="radio"
              name="reportReason"
              value="SPAM"
              checked={reason === "SPAM"}
              onChange={() => setReason("SPAM")}
              className="accent-red-500"
            />

            <span className="text-sm text-slate-700">
              광고 및 도배
            </span>
          </label>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-red-200 hover:bg-red-50">
            <input
              type="radio"
              name="reportReason"
              value="OBSCENE"
              checked={reason === "OBSCENE"}
              onChange={() => setReason("OBSCENE")}
              className="accent-red-500"
            />

            <span className="text-sm text-slate-700">
              음란하거나 부적절한 내용
            </span>
          </label>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-red-200 hover:bg-red-50">
            <input
              type="radio"
              name="reportReason"
              value="PERSONAL_INFO"
              checked={reason === "PERSONAL_INFO"}
              onChange={() => setReason("PERSONAL_INFO")}
              className="accent-red-500"
            />

            <span className="text-sm text-slate-700">
              개인정보 노출
            </span>
          </label>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-red-200 hover:bg-red-50">
            <input
              type="radio"
              name="reportReason"
              value="ETC"
              checked={reason === "ETC"}
              onChange={() => setReason("ETC")}
              className="accent-red-500"
            />

            <span className="text-sm text-slate-700">
              기타
            </span>
          </label>
        </div>

        {/* 상세 신고 내용 */}
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="상세 사유를 입력해주세요. (선택)"
          maxLength={500}
          disabled={isSubmitting}
          className="mt-5 min-h-[120px] w-full resize-none rounded-2xl border border-slate-200 p-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-red-300 focus:ring-2 focus:ring-red-100 disabled:bg-slate-50"
        />

        {/* 글자 수 */}
        <div className="mt-2 text-right text-xs text-slate-400">
          {content.length}/500
        </div>

        {/* 하단 버튼 */}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            취소
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-300"
          >
            {isSubmitting ? "신고 중..." : "신고하기"}
          </button>
        </div>
      </div>
    </div>
  );
} 