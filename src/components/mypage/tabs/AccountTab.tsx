"use client";

import { useMemo, useState } from "react";
import { Mail } from "lucide-react";
import type { User } from "../types";
import { Card, cn } from "../ui";

export default function AccountTab({
  user,
  onSaveUser,
}: {
  user: User;
  onSaveUser: (next: User) => void;
}) {
  // 이메일 변경
  const [emailDraft, setEmailDraft] = useState(user.email);
  const emailChanged = emailDraft.trim() !== user.email;

  const canChangeEmail = useMemo(() => {
    if (!emailDraft.trim()) return false;
    if (!/^\S+@\S+\.\S+$/.test(emailDraft.trim())) return false;
    return emailChanged;
  }, [emailDraft, emailChanged]);

  const changeEmail = () => {
    if (!canChangeEmail) return;

    const next: User = { ...user, email: emailDraft.trim() };
    onSaveUser(next);

    // TODO(백엔드):
    // 이메일 변경은 보통 "인증메일" 플로우가 안전
    // await fetch("/api/me/email", { method:"POST", body: JSON.stringify({ email: next.email }) })
    alert("TODO: 이메일 변경 요청/인증메일 발송 API 연결");
  };

  // 비밀번호 변경
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const pwOk = useMemo(() => {
    if (!currentPw) return false;
    if (newPw.length < 8) return false;
    if (newPw !== confirmPw) return false;
    return true;
  }, [currentPw, newPw, confirmPw]);

  const changePassword = async () => {
    if (!pwOk) return;

    // TODO(백엔드):
    // await fetch("/api/me/password", { method:"POST", body: JSON.stringify({ currentPw, newPw }) })
    alert("TODO: 비밀번호 변경 API 연결");

    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
  };

  const deleteAccount = async () => {
    // TODO(백엔드):
    // await fetch("/api/me", { method:"DELETE" })
    alert("TODO: 계정 삭제 API 연결 (삭제 확인 모달 붙이기 권장)");
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
            />
          </div>

          <div>
            <button
              type="button"
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold",
                canChangeEmail
                  ? "bg-gray-900 text-white hover:bg-black"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed",
              )}
              disabled={!canChangeEmail}
              onClick={changeEmail}
            >
              이메일 변경
            </button>
          </div>

          <div className="text-xs text-gray-500">
            TODO: 이메일 변경은 인증메일 확인 후 반영하는 게 일반적.
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
            />
            {newPw && newPw.length < 8 ? (
              <div className="text-xs text-red-600">
                비밀번호는 8자 이상 권장.
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
                  : "bg-gray-200 text-gray-500 cursor-not-allowed",
              )}
              disabled={!pwOk}
              onClick={changePassword}
            >
              비밀번호 변경
            </button>
          </div>

          <div className="text-xs text-gray-500">
            TODO: 서버에서 현재 비밀번호 검증 + 해시 저장
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
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              onClick={deleteAccount}
            >
              계정 삭제
            </button>
          </div>
          <div className="mt-2 text-xs text-red-700">
            TODO: 삭제 확인 모달(“DELETE” 입력 등) 추천
          </div>
        </div>
      </Card>
    </div>
  );
}
