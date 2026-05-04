"use client";

import { useEffect, useMemo, useState } from "react";
import {
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
import type { Solution, Stats, TabKey, Team, User } from "./types";

import ProfileTab from "@/components/mypage/tabs/ProfileTab";
import AccountTab from "@/components/mypage/tabs/AccountTab";
import ProjectsTab from "@/components/mypage/tabs/ProjectsTab";
import TeamsTab from "@/components/mypage/tabs/TeamsTab";
import SettingsTab from "@/components/mypage/tabs/SettingsTab";
import IdentityTab from "@/components/mypage/tabs/IdentityTab";
import CustomizeTab from "@/components/mypage/tabs/CustomizeTab";

import {
  fetchMyProfile,
  fetchMyWorkspaces,
  fetchWorkspaceMembers,
  type WorkspaceListResponse,
} from "@/components/mypage/api";

const TABS: TabItem[] = [
  { key: "profile", label: "프로필", icon: UserRound, group: "기본" },
  { key: "account", label: "계정", icon: ShieldCheck, group: "기본" },
  { key: "projects", label: "개인 프로젝트", icon: Folder, group: "기본" },
  { key: "teams", label: "팀 프로젝트", icon: UsersRound, group: "기본" },
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
];

const defaultStats: Stats = {
  primaryLang: "-",
  langRatio: [],
  activeHours: [],
  collabSessions: 0,
  avgResponseMin: 0,
  feedbackScore: 0,
};

const defaultPrefs = {
  theme: "light" as const,
  keymap: "vscode" as const,
  fontFamily:
    "Pretendard, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  fontSize: 14,
  tabSize: 2 as const,
  autoSave: "afterDelay" as const,
  autoSaveDelayMs: 1500,
  formatter: "prettier" as const,
  aiAssistLevel: 2 as const,
};

function mapUser(dto: Awaited<ReturnType<typeof fetchMyProfile>>): User {
  return {
    id: String(dto.id),
    email: dto.email,
    nickname: dto.nickname,
    profileImageUrl: dto.profileImageUrl ?? null,
    createdAt: dto.createdAt,
  };
}

function mapSolution(dto: WorkspaceListResponse): Solution {
  return {
    id: dto.id,
    name: dto.name,
    role:
      String(dto.role || "")
        .trim()
        .toLowerCase() === "owner"
        ? "owner"
        : "member",
    visibility: dto.mode === "team" ? "team" : "private",
    updatedAt: dto.updatedAt,
    locationLabel: undefined,
    description: dto.description ?? undefined,
    projects: (dto.projects ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      language: p.language,
      status: "active",
      updatedAt: p.updatedAt,
    })),
  };
}
function buildStatsFromSolutions(solutions: Solution[]): Stats {
  const langCount = new Map<string, number>();

  for (const solution of solutions) {
    for (const project of solution.projects) {
      const lang = project.language || "Unknown";
      langCount.set(lang, (langCount.get(lang) ?? 0) + 1);
    }
  }

  const total = Array.from(langCount.values()).reduce((a, b) => a + b, 0);
  const sorted = Array.from(langCount.entries()).sort((a, b) => b[1] - a[1]);

  return {
    primaryLang: sorted[0]?.[0] ?? "-",
    langRatio: sorted.map(([label, count]) => ({
      label,
      value: total > 0 ? Math.round((count / total) * 100) : 0,
    })),
    activeHours: [],
    collabSessions: 0,
    avgResponseMin: 0,
    feedbackScore: 0,
  };
}

export default function MyPageShell() {
  const [tab, setTab] = useState<TabKey>("profile");
  const [user, setUser] = useState<User | null>(null);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const stats = useMemo(() => buildStatsFromSolutions(solutions), [solutions]);

  const mine = useMemo(
    () => solutions.filter((s) => String(s.role).toLowerCase() === "owner"),
    [solutions],
  );

  const joined = useMemo(
    () => solutions.filter((s) => String(s.role).toLowerCase() === "member"),
    [solutions],
  );

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const [userDto, workspaceDtos] = await Promise.all([
          fetchMyProfile(),
          fetchMyWorkspaces(),
        ]);

        if (!mounted) return;

        const nextUser = mapUser(userDto);
        const nextSolutions = workspaceDtos.map(mapSolution);

        setUser(nextUser);
        setSolutions(nextSolutions);

        const teamWorkspaces = workspaceDtos.filter((w) => w.mode === "team");

        const teamList: Team[] = await Promise.all(
          teamWorkspaces.map(async (workspace) => {
            try {
              const members = await fetchWorkspaceMembers(workspace.id);

              return {
                id: workspace.id,
                name: workspace.name,
                role: workspace.role,
                membersCount: members.length,
                projectsCount: workspace.projects?.length ?? 0,
                updatedAt: workspace.updatedAt,
                description: workspace.description ?? undefined,
              };
            } catch {
              return {
                id: workspace.id,
                name: workspace.name,
                role: workspace.role,
                membersCount: 0,
                projectsCount: workspace.projects?.length ?? 0,
                updatedAt: workspace.updatedAt,
                description: workspace.description ?? undefined,
              };
            }
          }),
        );

        if (!mounted) return;
        setTeams(teamList);
      } catch (e) {
        if (!mounted) return;
        setError(
          e instanceof Error ? e.message : "마이페이지를 불러오지 못했습니다.",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const headerName = user?.nickname ?? "사용자";

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-0px)] bg-gray-50">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
            마이페이지 불러오는 중...
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-[calc(100vh-0px)] bg-gray-50">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
            {error || "사용자 정보를 불러오지 못했습니다."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-0px)] bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
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
                프로필, 계정, 내 워크스페이스와 팀 정보를 확인할 수 있습니다.
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <aside className="lg:col-span-4">
            <Sidebar tab={tab} setTab={setTab} tabs={TABS} />

            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-bold text-gray-900">요약</div>
              <div className="mt-3 grid gap-3">
                <MiniStat label="대표 언어" value={stats.primaryLang} />
                <MiniStat label="내 솔루션" value={`${mine.length}개`} />
                <MiniStat label="참여 솔루션" value={`${joined.length}개`} />
              </div>
            </div>
          </aside>

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
              <SettingsTab prefs={defaultPrefs} />
            ) : tab === "identity" ? (
              <IdentityTab stats={stats} />
            ) : tab === "customize" ? (
              <CustomizeTab prefs={defaultPrefs} />
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}
