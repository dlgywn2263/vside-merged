"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "../types";
import { Card, cn } from "../ui";
import { ActivityBars } from "../../activity/ActivityBars";
import { updateMyProfile } from "../api";

export default function ProfileTab({
  user,
  onSaveUser,
}: {
  user: User;
  onSaveUser: (next: User) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(user.nickname);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNickname(user.nickname);
  }, [user]);

  const dirty = useMemo(() => {
    return nickname.trim() !== user.nickname;
  }, [nickname, user.nickname]);

  const canSave = useMemo(() => {
    return !!nickname.trim();
  }, [nickname]);

  const cancel = () => {
    setNickname(user.nickname);
    setEditing(false);
  };

  const save = async () => {
    if (!canSave || !dirty) return;

    try {
      setSaving(true);

      const updated = await updateMyProfile({
        nickname: nickname.trim(),
        profileImageUrl: user.profileImageUrl ?? null,
      });

      onSaveUser({
        id: String(updated.id),
        email: updated.email,
        nickname: updated.nickname,
        profileImageUrl: updated.profileImageUrl ?? null,
        createdAt: updated.createdAt,
      });

      setEditing(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "프로필 수정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6">
      <Card
        title="개인 정보"
        desc="사용자명을 수정할 수 있습니다."
        right={
          editing ? (
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100"
                onClick={cancel}
                disabled={saving}
              >
                취소
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-semibold",
                  canSave && dirty && !saving
                    ? "bg-gray-900 text-white hover:bg-black"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed",
                )}
                onClick={save}
                disabled={!(canSave && dirty) || saving}
              >
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100"
              onClick={() => setEditing(true)}
            >
              편집
            </button>
          )
        }
      >
        <div className="grid gap-4">
          <div className="grid gap-2">
            <div className="text-sm font-semibold text-gray-700">사용자명</div>
            <input
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              disabled={!editing || saving}
            />
          </div>

          <div className="grid gap-2">
            <div className="text-sm font-semibold text-gray-700">이메일</div>
            <input
              className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500"
              value={user.email}
              disabled
            />
            <div className="text-xs text-gray-500">
              이메일 변경은 계정 탭에서 처리합니다.
            </div>
          </div>

          {user.createdAt ? (
            <div className="text-xs text-gray-500">
              가입일: {user.createdAt}
            </div>
          ) : null}
        </div>
      </Card>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-bold text-gray-900">일자별 활동량</h2>
        <p className="mt-1 text-sm text-gray-500">선택한 기간 기준</p>
        <div className="mt-5">
          <ActivityBars />
        </div>
      </div>
    </div>
  );
}
