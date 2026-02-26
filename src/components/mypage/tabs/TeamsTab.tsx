"use client";

import type { Team } from "../types";
import { Card, EmptyLine, cn, formatKST } from "../ui";

export default function TeamsTab({ teams }: { teams: Team[] }) {
  return (
    <div className="grid gap-6">
      <Card
        title="내 팀"
        desc="‘오늘 뭐 하지’는 대시보드. 여긴 ‘내 소속/권한 관리’."
        right={
          <button
            type="button"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100"
            onClick={() => alert("TODO: 팀 생성 플로우로 이동")}
          >
            새 팀 만들기
          </button>
        }
      >
        <div className="grid gap-3">
          {teams.map((t) => (
            <TeamRow key={t.id} t={t} />
          ))}
          {teams.length === 0 ? (
            <EmptyLine text="아직 참여 중인 팀이 없습니다." />
          ) : null}
        </div>
      </Card>

      <Card
        title="초대/참가"
        desc="협업 서비스면 이런 건 기본 옵션으로 있어야죠."
      >
        <div className="grid gap-3">
          <button
            type="button"
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-100"
            onClick={() => alert("TODO: 팀 초대 링크 생성")}
          >
            팀 초대 링크 생성
          </button>
          <button
            type="button"
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-100"
            onClick={() => alert("TODO: 초대 코드로 팀 참가")}
          >
            초대 코드로 팀 참가
          </button>
        </div>

        <div className="mt-3 text-xs text-gray-500">
          TODO(백엔드): /api/teams, /api/teams/invite, /api/teams/join
        </div>
      </Card>
    </div>
  );
}

function TeamRow({ t }: { t: Team }) {
  const badge =
    t.role === "owner"
      ? { text: "OWNER", cls: "bg-gray-900 text-white" }
      : t.role === "admin"
        ? { text: "ADMIN", cls: "bg-gray-100 text-gray-900" }
        : { text: "MEMBER", cls: "bg-gray-200 text-gray-700" };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-black text-gray-900">{t.name}</div>
          {t.description ? (
            <div className="mt-1 text-xs text-gray-500">{t.description}</div>
          ) : null}
          <div className="mt-2 text-xs text-gray-500">
            멤버 {t.membersCount}명 · 프로젝트 {t.projectsCount}개 · 가입:{" "}
            {formatKST(t.joinedAt)}
          </div>
        </div>

        <div className="flex gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold",
              badge.cls,
            )}
          >
            {badge.text}
          </span>
          <button
            type="button"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100"
            onClick={() => alert("TODO: 팀 상세/관리 페이지로 이동")}
          >
            팀 관리
          </button>
        </div>
      </div>
    </div>
  );
}
