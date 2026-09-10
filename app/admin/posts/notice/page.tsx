"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Megaphone,
  Save,
  X,
  Pencil,
  Trash2,
} from "lucide-react";

interface NoticeItem {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  views: number;
}

const initialNotices: NoticeItem[] = [
  {
    id: 3,
    title: "WAIVS 서비스 이용 안내",
    content:
      "안녕하세요. WAIVS 관리자입니다. 원활한 서비스 이용을 위해 게시판 이용수칙을 확인해주세요.",
    createdAt: "2026.09.10 20:00",
    views: 326,
  },
  {
    id: 2,
    title: "커뮤니티 이용수칙 안내",
    content:
      "WAIVS 커뮤니티를 이용하실 때 타인을 비방하거나 광고성 게시글을 등록하지 않도록 주의해주세요.",
    createdAt: "2026.09.05 14:20",
    views: 189,
  },
  {
    id: 1,
    title: "WAIVS 업데이트 안내",
    content:
      "일부 기능이 개선되었습니다. 자세한 내용은 업데이트 내용을 확인해주세요.",
    createdAt: "2026.08.28 11:30",
    views: 254,
  },
];

{/* 현재 날짜 */}
function getCurrentDateTime() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    now.getDate(),
  ).padStart(2, "0");

  const hour = String(
    now.getHours(),
  ).padStart(2, "0");

  const minute = String(
    now.getMinutes(),
  ).padStart(2, "0");

  return `${year}.${month}.${day} ${hour}:${minute}`;
}

export default function AdminNoticePage() {
  const [notices, setNotices] =
    useState<NoticeItem[]>(initialNotices);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [editingId, setEditingId] =
    useState<number | null>(null);

  /* =========================
     최신순 정렬
  ========================= */

  const sortedNotices = useMemo(() => {
    return [...notices].sort((a, b) => b.id - a.id);
  }, [notices]);

  /* =========================
     폼 초기화
  ========================= */

  const resetForm = () => {
    setTitle("");
    setContent("");
    setEditingId(null);
  };

  /* =========================
     등록 / 수정
  ========================= */

  const handleSubmit = () => {
    if (!title.trim()) {
      alert("공지 제목을 입력해주세요.");
      return;
    }

    if (!content.trim()) {
      alert("공지 내용을 입력해주세요.");
      return;
    }

    /* =========================
       수정
    ========================= */

    if (editingId !== null) {
      const confirmed = window.confirm(
        "공지사항을 수정하시겠습니까?",
      );

      if (!confirmed) return;

      /*
       * 추후 백엔드 연결
       *
       * PUT /api/admin/notices/{noticeId}
       *
       * body:
       * {
       *   title,
       *   content
       * }
       */

      setNotices((prev) =>
        prev.map((notice) =>
          notice.id === editingId
            ? {
                ...notice,
                title: title.trim(),
                content: content.trim(),
              }
            : notice,
        ),
      );

      alert("공지사항이 수정되었습니다.");

      resetForm();

      return;
    }

    /* =========================
       등록
    ========================= */

    /*
     * 추후 백엔드 연결
     *
     * POST /api/admin/notices
     *
     * body:
     * {
     *   title,
     *   content
     * }
     */

    const nextId =
      notices.length > 0
        ? Math.max(...notices.map((notice) => notice.id)) + 1
        : 1;

    const newNotice: NoticeItem = {
      id: nextId,
      title: title.trim(),
      content: content.trim(),
      createdAt: getCurrentDateTime(),
      views: 0,
    };

    setNotices((prev) => [
      newNotice,
      ...prev,
    ]);

    alert("공지사항이 등록되었습니다.");

    resetForm();
  };

  /* =========================
     수정 시작
  ========================= */

  const handleEdit = (notice: NoticeItem) => {
    setEditingId(notice.id);
    setTitle(notice.title);
    setContent(notice.content);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =========================
     삭제
  ========================= */

  const handleDelete = (notice: NoticeItem) => {
    const confirmed = window.confirm(
      `"${notice.title}" 공지사항을 삭제하시겠습니까?\n삭제된 공지는 복구할 수 없습니다.`,
    );

    if (!confirmed) return;

    /*
     * 추후 백엔드 연결
     *
     * DELETE /api/admin/notices/{noticeId}
     */

    setNotices((prev) =>
      prev.filter((item) => item.id !== notice.id),
    );

    if (editingId === notice.id) {
      resetForm();
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1500px]">
      {/* =========================
          페이지 제목
      ========================= */}

      <section className="mb-8">
        <p className="mb-2 text-sm font-medium text-gray-400">
          Board Management
        </p>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/posts"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
          >
            <ArrowLeft size={18} />
          </Link>

          <h1 className="text-[28px] font-bold tracking-tight text-gray-900">
            공지 관리
          </h1>
        </div>

        <p className="mt-3 text-sm leading-6 text-gray-500">
          WAIVS 사용자에게 노출되는 공지사항을 등록하고
          관리할 수 있습니다.
        </p>
      </section>

      {/* =========================
          작성 / 수정 폼
      ========================= */}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* 상단 */}

        <div className="border-b border-gray-200 px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                {editingId !== null ? (
                  <Pencil size={18} />
                ) : (
                  <Megaphone size={18} />
                )}
              </div>

              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {editingId !== null
                    ? "공지 수정"
                    : "공지 작성"}
                </h2>

                <p className="mt-1 text-xs text-gray-400">
                  {editingId !== null
                    ? "선택한 공지사항의 내용을 수정할 수 있습니다."
                    : "사용자에게 전달할 공지사항을 작성해주세요."}
                </p>
              </div>
            </div>

            {editingId !== null && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
              >
                <X size={14} />
                수정 취소
              </button>
            )}
          </div>
        </div>

        {/* 폼 */}

        <div className="space-y-7 px-6 py-6">
          {/* 제목 */}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700">
                제목
              </label>

              <span className="text-xs text-gray-400">
                {title.length} / 100
              </span>
            </div>

            <input
              type="text"
              value={title}
              maxLength={100}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              placeholder="공지 제목을 입력해주세요."
              className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
            />
          </div>

          {/* 내용 */}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700">
                내용
              </label>

              <span className="text-xs text-gray-400">
                {content.length} / 3000
              </span>
            </div>

            <textarea
              value={content}
              maxLength={3000}
              onChange={(e) =>
                setContent(e.target.value)
              }
              placeholder="공지 내용을 입력해주세요."
              className="min-h-[260px] w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-4 text-sm leading-7 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
            />
          </div>
        </div>

        {/* 하단 버튼 */}

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50/40 px-6 py-5">
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
          >
            <X size={16} />
            초기화
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gray-900 px-5 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            <Save size={16} />

            {editingId !== null
              ? "수정 완료"
              : "공지 등록"}
          </button>
        </div>
      </section>

      {/* =========================
          공지 목록
      ========================= */}

      <section className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* 목록 상단 */}

        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              등록된 공지
            </h2>

            <p className="mt-1 text-xs text-gray-400">
              등록된 공지사항을 확인하거나 수정 및 삭제할 수 있습니다.
            </p>
          </div>

          <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600">
            총 {notices.length}개
          </span>
        </div>

        {/* 테이블 */}

        {sortedNotices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-[80px] px-5 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    번호
                  </th>

                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    공지사항
                  </th>

                  <th className="w-[170px] px-5 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    작성일
                  </th>

                  <th className="w-[100px] px-5 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    조회
                  </th>

                  <th className="w-[190px] px-5 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    관리
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {sortedNotices.map((notice) => (
                  <tr
                    key={notice.id}
                    className={`transition hover:bg-gray-50/70 ${
                      editingId === notice.id
                        ? "bg-gray-50"
                        : ""
                    }`}
                  >
                    {/* 번호 */}

                    <td className="px-5 py-5 text-center text-sm text-gray-400">
                      {notice.id}
                    </td>

                    {/* 공지 */}

                    <td className="px-5 py-5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex shrink-0 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-600">
                            공지
                          </span>

                          <p className="truncate text-sm font-bold text-gray-900">
                            {notice.title}
                          </p>
                        </div>

                        <p className="mt-2 line-clamp-1 text-xs leading-5 text-gray-500">
                          {notice.content}
                        </p>
                      </div>
                    </td>

                    {/* 작성일 */}

                    <td className="px-5 py-5 text-center text-sm text-gray-500">
                      {notice.createdAt}
                    </td>

                    {/* 조회 */}

                    <td className="px-5 py-5 text-center text-sm text-gray-500">
                      {notice.views.toLocaleString()}
                    </td>

                    {/* 관리 */}

                    <td className="px-2 py-5">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleEdit(notice)
                          }
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 text-xs font-semibold text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
                        >
                          <Pencil size={14} />
                          수정
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(notice)
                          }
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-100 hover:text-red-900"
                        >
                          <Trash2 size={14} />
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-20 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <Megaphone size={20} />
            </div>

            <p className="mt-4 text-sm font-semibold text-gray-700">
              등록된 공지가 없습니다.
            </p>

            <p className="mt-1 text-xs text-gray-400">
              새로운 공지사항을 작성해주세요.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}