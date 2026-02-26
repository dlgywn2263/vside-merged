"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "../types";
import { Card, Field, cn } from "../ui";

export default function ProfileTab({
  user,
  onSaveUser,
}: {
  user: User;
  onSaveUser: (next: User) => void;
}) {
  const [editing, setEditing] = useState(false);

  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [username, setUsername] = useState(user.username);
  const [location, setLocation] = useState(user.location ?? "");
  const [website, setWebsite] = useState(user.website ?? "");

  useEffect(() => {
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setUsername(user.username);
    setLocation(user.location ?? "");
    setWebsite(user.website ?? "");
  }, [user]);

  const dirty = useMemo(() => {
    return (
      firstName !== user.firstName ||
      lastName !== user.lastName ||
      username !== user.username ||
      location !== (user.location ?? "") ||
      website !== (user.website ?? "")
    );
  }, [firstName, lastName, username, location, website, user]);

  const canSave = useMemo(() => {
    if (!firstName.trim()) return false;
    if (!lastName.trim()) return false;
    if (!username.trim()) return false;
    if (website.trim() && !/^https?:\/\/.+/i.test(website.trim())) return false;
    return true;
  }, [firstName, lastName, username, website]);

  const cancel = () => {
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setUsername(user.username);
    setLocation(user.location ?? "");
    setWebsite(user.website ?? "");
    setEditing(false);
  };

  const save = () => {
    if (!canSave) return;

    const next: User = {
      ...user,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      username: username.trim(),
      location: location.trim() || undefined,
      website: website.trim() || undefined,
      displayName: `${lastName.trim()}${firstName.trim()}`,
    };

    onSaveUser(next);

    // TODO(백엔드 연동):
    // await fetch("/api/me/profile", { method: "PATCH", body: JSON.stringify(next) })

    setEditing(false);
  };

  return (
    <div className="grid gap-6">
      <Card
        title="개인 정보"
        desc="프로필 정보를 수정할 수 있습니다."
        right={
          editing ? (
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100"
                onClick={cancel}
              >
                취소
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-semibold",
                  canSave && dirty
                    ? "bg-gray-900 text-white hover:bg-black"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed",
                )}
                onClick={save}
                disabled={!(canSave && dirty)}
              >
                저장
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
          {/* 이름/성 2컬럼 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <div className="text-sm font-semibold text-gray-700">이름</div>
              <input
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={!editing}
              />
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-semibold text-gray-700">성</div>
              <input
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={!editing}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <div className="text-sm font-semibold text-gray-700">사용자명</div>
            <input
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={!editing}
            />
            <div className="text-xs text-gray-500">
              TODO: 중복 체크 API (/api/users/check-username)
            </div>
          </div>

          <div className="grid gap-2">
            <div className="text-sm font-semibold text-gray-700">위치</div>
            <input
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={!editing}
              placeholder="예: 서울, 대한민국"
            />
          </div>

          <div className="grid gap-2">
            <div className="text-sm font-semibold text-gray-700">웹사이트</div>
            <input
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              disabled={!editing}
              placeholder="https://example.com"
            />
            {editing &&
            website.trim() &&
            !/^https?:\/\/.+/i.test(website.trim()) ? (
              <div className="text-xs text-red-600">
                https:// 로 시작하는 주소로 입력해줘.
              </div>
            ) : null}
          </div>

          {/* 보기 모드 안내 */}
          {/* {!editing ? (
            <Field
              label="이메일"
              value={user.email}
              hint="이메일 변경은 ‘계정’ 탭에서 합니다."
            />
          ) : null} */}
        </div>
      </Card>
    </div>
  );
}
