"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail } from "lucide-react";
import type { User } from "../types";
import { Card, cn } from "../ui";
import {
  changeMyEmailApi,
  changeMyPasswordApi,
  deleteMyAccountApi,
} from "@/lib/mypage/accountApi";

export default function AccountTab({
  user,
  onSaveUser,
}: {
  user: User;
  onSaveUser: (next: User) => void;
}) {
  const [emailDraft, setEmailDraft] = useState(user.email);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    setEmailDraft(user.email);
  }, [user.email]);

  const emailChanged = emailDraft.trim() !== user.email;

  const canChangeEmail = useMemo(() => {
    if (!emailDraft.trim()) return false;
    if (!/^\S+@\S+\.\S+$/.test(emailDraft.trim())) return false;
    return emailChanged && !emailLoading;
  }, [emailDraft, emailChanged, emailLoading]);

  const changeEmail = async () => {
    if (!canChangeEmail) return;

    try {
      setEmailLoading(true);

      const updatedUser = await changeMyEmailApi(emailDraft.trim());

      onSaveUser({
        ...user,
        email: updatedUser.email,
        nickname: updatedUser.nickname,
        profileImageUrl: updatedUser.profileImageUrl,
        createdAt: updatedUser.createdAt,
      });

      alert("이메일이 변경되었습니다.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "이메일 변경에 실패했습니다.";

      alert(message);
    } finally {
      setEmailLoading(false);
    }
  };

  const pwOk = useMemo(() => {
    if (!currentPw) return false;
    if (newPw.length < 8) return false;
    if (newPw !== confirmPw) return false;
    if (passwordLoading) return false;
    return true;
  }, [currentPw, newPw, confirmPw, passwordLoading]);

  const changePassword = async () => {
    if (!pwOk) return;

    try {
      setPasswordLoading(true);

      await changeMyPasswordApi(currentPw, newPw);

      alert("비밀번호가 변경되었습니다.");

      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "비밀번호 변경에 실패했습니다.";

      alert(message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const deleteAccount = async () => {
    const ok = window.confirm(
      "정말 계정을 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.",
    );

    if (!ok) return;

    try {
      setDeleteLoading(true);

      await deleteMyAccountApi();

      localStorage.removeItem("token");

      alert("회원 탈퇴가 완료되었습니다.");

      window.location.href = "/";
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "계정 삭제에 실패했습니다.";

      alert(message);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      {/* 이메일 주소 */}
      <Card title="이메일 주소" desc="로그인 및 알림에 사용되는 이메일입니다.">
        <div className="grid gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
            <Mail className="h-4 w-4 text-gray-600" />
            <input
              className="w-full bg-transparent text-sm outline-none"
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
              placeholder="email@example.com"
              disabled={emailLoading}
            />
          </div>

          <div>
            <button
              type="button"
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold",
                canChangeEmail
                  ? "bg-gray-900 text-white hover:bg-black"
                  : "cursor-not-allowed bg-gray-200 text-gray-500",
              )}
              disabled={!canChangeEmail}
              onClick={changeEmail}
            >
              {emailLoading ? "변경 중..." : "이메일 변경"}
            </button>
          </div>

          <div className="text-xs text-gray-500">
            이메일 형식이 올바르고 기존 이메일과 다를 때만 변경할 수 있습니다.
          </div>
        </div>
      </Card>

      {/* 비밀번호 변경 */}
      <Card
        title="비밀번호 변경"
        desc="계정 보안을 위해 주기적으로 비밀번호를 변경하세요."
      >
        <div className="grid gap-4">
          <div className="grid gap-2">
            <div className="text-sm font-semibold text-gray-700">
              현재 비밀번호
            </div>
            <input
              type="password"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              placeholder="현재 비밀번호"
              autoComplete="current-password"
              disabled={passwordLoading}
            />
          </div>

          <div className="grid gap-2">
            <div className="text-sm font-semibold text-gray-700">
              새 비밀번호
            </div>
            <input
              type="password"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="8자 이상"
              autoComplete="new-password"
              disabled={passwordLoading}
            />
            {newPw && newPw.length < 8 ? (
              <div className="text-xs text-red-600">
                비밀번호는 8자 이상이어야 합니다.
              </div>
            ) : null}
          </div>

          <div className="grid gap-2">
            <div className="text-sm font-semibold text-gray-700">
              비밀번호 확인
            </div>
            <input
              type="password"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="새 비밀번호 다시 입력"
              autoComplete="new-password"
              disabled={passwordLoading}
            />
            {confirmPw && newPw !== confirmPw ? (
              <div className="text-xs text-red-600">
                새 비밀번호가 일치하지 않습니다.
              </div>
            ) : null}
          </div>

          <div>
            <button
              type="button"
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold",
                pwOk
                  ? "bg-gray-900 text-white hover:bg-black"
                  : "cursor-not-allowed bg-gray-200 text-gray-500",
              )}
              disabled={!pwOk}
              onClick={changePassword}
            >
              {passwordLoading ? "변경 중..." : "비밀번호 변경"}
            </button>
          </div>

          <div className="text-xs text-gray-500">
            현재 비밀번호가 일치해야 새 비밀번호로 변경됩니다.
          </div>
        </div>
      </Card>

      {/* 위험 영역 */}
      <Card title="위험 영역" desc="계정을 영구적으로 삭제합니다.">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="text-sm font-bold text-red-700">
            계정을 삭제하면 복구할 수 없습니다.
          </div>
          <div className="mt-3">
            <button
              type="button"
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold text-white",
                deleteLoading
                  ? "cursor-not-allowed bg-red-300"
                  : "bg-red-600 hover:bg-red-700",
              )}
              onClick={deleteAccount}
              disabled={deleteLoading}
            >
              {deleteLoading ? "삭제 중..." : "계정 삭제"}
            </button>
          </div>
          <div className="mt-2 text-xs text-red-700">
            삭제 후에는 현재 계정으로 다시 로그인할 수 없습니다.
          </div>
        </div>
      </Card>
    </div>
  );
}
