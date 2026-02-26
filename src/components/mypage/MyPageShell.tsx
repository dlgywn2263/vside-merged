"use client";
import {
  mockSolutions,
  mockTeams,
  mockPrefs,
  mockStats,
  mockAchievements,
  mockUser,
} from "@/components/mypage/mock";
import { useMemo, useState } from "react";
import {
  Award,
  Fingerprint,
  Folder,
  Keyboard,
  LogOut,
  Settings,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";

import Sidebar, { type TabItem } from "./Sidebar";
import { MiniStat } from "./ui";
import type { TabKey, User } from "./types";

// Tabs
import ProfileTab from "@/components/mypage/tabs/ProfileTab";
import AccountTab from "@/components/mypage/tabs/AccountTab";
import ProjectsTab from "@/components/mypage/tabs/ProjectsTab";
import TeamsTab from "@/components/mypage/tabs/TeamsTab";
import SettingsTab from "@/components/mypage/tabs/SettingsTab";
import IdentityTab from "@/components/mypage/tabs/IdentityTab";
import CustomizeTab from "@/components/mypage/tabs/CustomizeTab";
// import ReputationTab from "@/componenets/mypage/tabs/ReputationTab";
// import AchievementsTab from "@/components/mypage/tabs/AchievementsTab";

const TABS: TabItem[] = [
  { key: "profile", label: "프로필", icon: UserRound, group: "기본" },
  { key: "account", label: "계정", icon: ShieldCheck, group: "기본" },
  { key: "projects", label: "프로젝트", icon: Folder, group: "기본" },
  { key: "teams", label: "팀", icon: UsersRound, group: "기본" },
  { key: "settings", label: "환경설정", icon: Settings, group: "기본" },

  {
    key: "identity",
    label: "Dev Identity",
    icon: Fingerprint,
    group: "개인화",
  },
  {
    key: "customize",
    label: "IDE 커스터마이징",
    icon: Keyboard,
    group: "개인화",
  },
  //   { key: "reputation", label: "협업 평판", icon: UsersRound, group: "개인화" },
  //   { key: "achievements", label: "업적", icon: Award, group: "개인화" },
];

export default function MyPageShell() {
  const [tab, setTab] = useState<TabKey>("profile");

  // ✅ user는 편집/저장 반영 위해 state
  const [user, setUser] = useState<User>(mockUser);

  const stats = mockStats;
  const solutions = mockSolutions;
  const teams = mockTeams;
  const prefs = mockPrefs;
  const achievements = mockAchievements;

  const mine = useMemo(
    () => solutions.filter((s) => s.role === "owner"),
    [solutions],
  );
  const joined = useMemo(
    () => solutions.filter((s) => s.role === "member"),
    [solutions],
  );

  const headerName = user.displayName ?? `${user.lastName}${user.firstName}`;

  return (
    <div className="min-h-[calc(100vh-0px)] bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 shrink-0 rounded-2xl border border-gray-200 bg-white grid place-items-center text-xl font-black text-gray-900">
              {headerName.slice(0, 1)}
            </div>
            <div>
              <div className="text-2xl font-black tracking-tight text-gray-900">
                {headerName}님의 마이페이지
              </div>
              <div className="mt-1 text-sm text-gray-500">
                정체성/기본값/권한/평판. 대시보드랑 구분되는 개인 공간.
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100"
              onClick={() =>
                alert("TODO: 로그아웃 처리 (세션 삭제 후 /login 이동)")
              }
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Sidebar */}
          <aside className="lg:col-span-4">
            <Sidebar tab={tab} setTab={setTab} tabs={TABS} />

            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-bold text-gray-900">요약</div>
              <div className="mt-3 grid gap-3">
                <MiniStat label="대표 언어" value={stats.primaryLang} />
                <MiniStat
                  label="협업 세션"
                  value={`${stats.collabSessions}회`}
                />
                <MiniStat
                  label="평균 응답"
                  value={`${stats.avgResponseMin}분`}
                />
                <MiniStat
                  label="피드백 점수"
                  value={`${stats.feedbackScore.toFixed(1)} / 5`}
                />
              </div>
            </div>
          </aside>

          {/* Content */}
          <main className="lg:col-span-8">
            {tab === "profile" ? (
              <ProfileTab user={user} onSaveUser={setUser} />
            ) : tab === "account" ? (
              <AccountTab user={user} onSaveUser={setUser} />
            ) : tab === "projects" ? (
              <ProjectsTab mine={mine} joined={joined} />
            ) : tab === "teams" ? (
              <TeamsTab teams={teams} />
            ) : tab === "settings" ? (
              <SettingsTab prefs={prefs} />
            ) : tab === "identity" ? (
              <IdentityTab stats={stats} />
            ) : tab === "customize" ? (
              <CustomizeTab prefs={prefs} />
            ) : // ) : tab === "reputation" ? (
            //   <ReputationTab stats={stats} />
            // ) : tab === "achievements" ? (
            //   <AchievementsTab achievements={achievements} />
            null}
          </main>
        </div>
      </div>
    </div>
  );
}
