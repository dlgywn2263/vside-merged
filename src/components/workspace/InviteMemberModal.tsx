"use client";

import { useState } from "react";
import { Copy, Mail, X } from "lucide-react";

type Role = "Owner" | "Admin" | "Member";

type Props = {
  open: boolean;
  workspaceId: string;
  onClose: () => void; // ✅ 닫기 시 설정화면으로 복귀는 부모에서 처리
  onSendInvite: (payload: { email: string; role: Role }) => void;
};

export function InviteMemberModal({
  open,
  workspaceId,
  onClose,
  onSendInvite,
}: Props) {
  const [email, setEmail] = useState("teammate@example.com");
  const [role, setRole] = useState<Role>("Member");

  if (!open) return null;

  /**
   * TODO (BACKEND)
   * - 초대 링크/프로젝트 키는 서버에서 발급/조회
   *   GET /api/workspaces/:id/invite-info
   */
  const inviteLink = `https://devmaster.app/invite/${workspaceId || "abc123xyz"}`;
  const projectKey = "PROJ-4K9L-M2X7";

  return (
    <div className="fixed inset-0 z-50">
      {/* 오버레이 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* ✅ 크기 축소 */}
      <div className="absolute left-1/2 top-1/2 w-[460px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2">
        <div className="rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
          {/* 헤더 */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-start justify-between">
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
            >
              <X className="text-gray-600" size={18} />
            </button>
          </div>

          {/* ✅ 본문: 높이 제한 + 스크롤 */}
          <div className="px-5 py-4 space-y-5 max-h-[70vh] overflow-y-auto">
            <section className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                이메일 주소
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="teammate@example.com"
              />

              <label className="block text-sm font-semibold text-gray-700">
                역할
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="Owner">Owner (모든 권한)</option>
                <option value="Admin">Admin (관리자 권한)</option>
                <option value="Member">Member (편집 권한)</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  /**
                   * TODO (BACKEND)
                   * - POST /api/workspaces/:id/invites
                   * - body: { email, role }
                   */
                  onSendInvite({ email, role });
                }}
                className="mt-2 w-full rounded-xl bg-gray-700 px-4 py-3 text-white font-semibold hover:bg-gray-800 inline-flex items-center justify-center gap-2"
              >
                <Mail size={16} />
                초대 이메일 전송
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
                  className="w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-2.5 text-sm"
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
                  className="w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-2.5 text-sm"
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

              {/**
               * TODO (BACKEND)
               * - GET /api/workspaces/:id/invites?status=pending
               * - 초대 취소: DELETE /api/workspaces/:id/invites/:inviteId
               */}
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
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
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
