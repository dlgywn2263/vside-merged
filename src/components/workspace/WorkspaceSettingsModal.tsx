"use client";

import { X, Plus, UserRound } from "lucide-react";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: "Owner" | "Member";
};

type Props = {
  open: boolean;
  workspace: { id: string; name: string; description: string } | null;
  onClose: () => void;
  onClickInvite: () => void;
  onSave: (payload: { name: string; description: string }) => void;
  onDelete: () => void;
};

const MOCK_MEMBERS: TeamMember[] = [
  {
    id: "m1",
    name: "DevMaster",
    email: "devmaster@example.com",
    role: "Owner",
  },
  { id: "m2", name: "이프론트", email: "frontend@example.com", role: "Member" },
  { id: "m3", name: "박백엔드", email: "backend@example.com", role: "Member" },
];

export function WorkspaceSettingsModal({
  open,
  workspace,
  onClose,
  onClickInvite,
  onSave,
  onDelete,
}: Props) {
  if (!open || !workspace) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* 오버레이 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* ✅ 크기 축소 + 높이 제한 */}
      <div className="absolute left-1/2 top-1/2 w-[560px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2">
        <div className="rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
          {/* 헤더 */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-start justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-gray-900">
                워크스페이스 설정
              </h3>
              <p className="mt-0.5 text-sm text-gray-500">
                워크스페이스 정보 및 설정을 관리합니다
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

          {/* ✅ 본문: 화면 꽉 차지 않게 내부 스크롤 */}
          <div className="px-5 py-4 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* 일반 설정 */}
            <section>
              <h4 className="text-sm font-bold text-gray-900 mb-3">
                일반 설정
              </h4>

              <label className="block text-sm font-semibold text-gray-700 mb-2">
                워크스페이스 이름
              </label>
              <input
                defaultValue={workspace.name}
                className="w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-200"
                id="ws-name"
              />

              <label className="mt-4 block text-sm font-semibold text-gray-700 mb-2">
                워크스페이스 설명
              </label>
              <input
                defaultValue={workspace.description}
                className="w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-200"
                id="ws-desc"
              />

              {/**
               * TODO (BACKEND)
               * - PATCH /api/workspaces/:id
               * - name, description 저장
               */}
            </section>

            <div className="h-px bg-gray-100" />

            {/* 팀 설정 */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-gray-900">팀 설정</h4>

                <button
                  type="button"
                  onClick={onClickInvite}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                >
                  <Plus size={16} />
                  팀원 초대
                </button>
              </div>

              <div className="space-y-2">
                {/**
                 * TODO (BACKEND)
                 * - GET /api/workspaces/:id/members
                 * - 팀원 목록 불러오기
                 */}
                {MOCK_MEMBERS.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-2xl border border-gray-200 bg-white px-4 py-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <UserRound size={18} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 leading-tight">
                          {m.name}
                        </p>
                        <p className="text-sm text-gray-500">{m.email}</p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        m.role === "Owner"
                          ? "bg-gray-900 text-white"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <div className="h-px bg-gray-100" />

            {/* 위험 구역 */}
            <section>
              <h4 className="text-sm font-bold text-red-600 mb-3">위험 구역</h4>

              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-extrabold text-red-600">
                    워크스페이스 삭제
                  </p>
                  <p className="text-sm text-gray-600">
                    프로젝트와 모든 데이터가 영구 삭제됩니다
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onDelete}
                  className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
                >
                  삭제
                </button>

                {/**
                 * TODO (BACKEND)
                 * - DELETE /api/workspaces/:id
                 * - 삭제 전 confirm 모달 권장
                 */}
              </div>
            </section>
          </div>

          {/* 푸터 */}
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              취소
            </button>

            <button
              type="button"
              onClick={() => {
                const name = (
                  document.getElementById("ws-name") as HTMLInputElement
                )?.value;
                const description = (
                  document.getElementById("ws-desc") as HTMLInputElement
                )?.value;

                onSave({ name, description });
              }}
              className="rounded-xl bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-black"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
