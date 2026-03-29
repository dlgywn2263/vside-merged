"use client";

import { useEffect, useState } from "react";
import { Copy, Mail, X } from "lucide-react";

type Role = "Owner" | "Admin" | "Member";

type Props = {
  open: boolean;
  workspaceId: string;
  onClose: () => void;
  onSendInvite: (payload: {
    email: string;
    role: Role;
  }) => Promise<void> | void;
};

export function InviteMemberModal({
  open,
  workspaceId,
  onClose,
  onSendInvite,
}: Props) {
  const [email, setEmail] = useState("teammate@example.com");
  const [role, setRole] = useState<Role>("Member");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    setEmail("teammate@example.com");
    setRole("Member");
    setSubmitting(false);
  }, [open, workspaceId]);

  if (!open) return null;

  const inviteLink = `https://devmaster.app/invite/${workspaceId || "abc123xyz"}`;
  const projectKey = "PROJ-4K9L-M2X7";

  async function handleSubmit() {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      alert("이메일 주소를 입력해주세요.");
      return;
    }

    try {
      setSubmitting(true);
      await onSendInvite({ email: trimmedEmail, role });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* 오버레이 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* ✅ 크기 축소 */}
      <div className="absolute left-1/2 top-1/2 w-[460px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          {/* 헤더 */}
          <div className="flex items-start justify-between border-b border-gray-100 px-5 py-3">
            <div>
              <h3 className="text-lg font-extrabold text-gray-900">
                팀원 초대
              </h3>
              <p className="mt-0.5 text-sm text-gray-500">
                이메일로 초대하거나 링크를 공유하세요
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-gray-100"
              aria-label="닫기"
              disabled={submitting}
            >
              <X className="text-gray-600" size={18} />
            </button>
          </div>

          {/* 본문 */}
          <div className="max-h-[70vh] space-y-5 overflow-y-auto px-5 py-4">
            <section className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                이메일 주소
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="teammate@example.com"
                disabled={submitting}
              />

              <label className="block text-sm font-semibold text-gray-700">
                역할
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-200"
                disabled={submitting}
              >
                <option value="Owner">Owner (모든 권한)</option>
                <option value="Admin">Admin (관리자 권한)</option>
                <option value="Member">Member (편집 권한)</option>
              </select>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-700 px-4 py-3 font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Mail size={16} />
                {submitting ? "전송 중..." : "초대 이메일 전송"}
              </button>
            </section>

            <div className="h-px bg-gray-100" />

            {/* 초대 링크 */}
            <section className="space-y-3">
              <div>
                <p className="text-sm font-bold text-gray-900">초대 링크</p>
                <p className="text-xs text-gray-500">
                  이 링크를 공유하면 누구나 프로젝트에 참여할 수 있습니다
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={inviteLink}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(inviteLink)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 hover:bg-gray-50"
                  aria-label="복사"
                >
                  <Copy size={16} />
                </button>
              </div>

              <p className="text-xs text-gray-500">링크 만료 · 7일 후</p>
            </section>

            {/* 프로젝트 키 */}
            <section className="space-y-3">
              <div>
                <p className="text-sm font-bold text-gray-900">프로젝트 키</p>
                <p className="text-xs text-gray-500">
                  팀원에게 이 키를 공유하면 프로젝트에 참여할 수 있습니다
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={projectKey}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(projectKey)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 hover:bg-gray-50"
                  aria-label="복사"
                >
                  <Copy size={16} />
                </button>
              </div>
            </section>

            {/* 대기 중인 초대 */}
            <section className="space-y-3">
              <p className="text-sm font-bold text-gray-900">대기 중인 초대</p>

              <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    newmember@example.com
                  </p>
                  <p className="text-xs text-gray-500">
                    Member · 2일 전 초대됨
                  </p>
                </div>
                <button className="text-sm font-semibold text-red-600 hover:underline">
                  취소
                </button>
              </div>
            </section>
          </div>

          {/* 푸터 */}
          <div className="flex items-center justify-end border-t border-gray-100 px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-semibold hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
