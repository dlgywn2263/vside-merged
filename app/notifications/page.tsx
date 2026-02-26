"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Search,
  Check,
  Trash2,
  CalendarDays,
  MessageSquare,
  GitCommit,
  Flag,
  AlertTriangle,
  Settings,
  ArrowLeft,
  Filter,
} from "lucide-react";

type NotifType =
  | "all"
  | "schedule"
  | "chat"
  | "commit"
  | "mission"
  | "error"
  | "system";

type NotificationItem = {
  id: string;
  type: Exclude<NotifType, "all">;
  title: string;
  body: string;
  time: string;
  project?: string;
  actor?: string;
  read: boolean;
};

const TYPE_LABEL: Record<Exclude<NotifType, "all">, string> = {
  schedule: "일정 알림",
  chat: "팀 채팅",
  commit: "커밋 알림",
  mission: "미션 알림",
  error: "오류 알림",
  system: "시스템 알림",
};

function typeIcon(type: Exclude<NotifType, "all">) {
  const cls = "w-5 h-5";
  switch (type) {
    case "schedule":
      return <CalendarDays className={cls} />;
    case "chat":
      return <MessageSquare className={cls} />;
    case "commit":
      return <GitCommit className={cls} />;
    case "mission":
      return <Flag className={cls} />;
    case "error":
      return <AlertTriangle className={cls} />;
    case "system":
      return <Settings className={cls} />;
  }
}

function pill(type: Exclude<NotifType, "all">) {
  const base = "px-2 py-0.5 rounded-full text-[11px] font-semibold";
  switch (type) {
    case "schedule":
      return `${base} bg-blue-50 text-blue-700`;
    case "chat":
      return `${base} bg-green-50 text-green-700`;
    case "commit":
      return `${base} bg-purple-50 text-purple-700`;
    case "mission":
      return `${base} bg-orange-50 text-orange-700`;
    case "error":
      return `${base} bg-rose-50 text-rose-700`;
    case "system":
      return `${base} bg-gray-100 text-gray-700`;
  }
}

const DEMO: NotificationItem[] = [
  {
    id: "n1",
    type: "schedule",
    title: "일정 알림",
    body: "오늘 오후 3시 팀 회의가 예정되어 있습니다",
    time: "10분 전",
    project: "MyWebWork",
    actor: "시스템",
    read: false,
  },
  {
    id: "n2",
    type: "commit",
    title: "커밋 알림",
    body: "김개발님이 main 브랜치에 커밋했습니다",
    time: "30분 전",
    project: "Server_Project",
    actor: "김개발",
    read: false,
  },
  {
    id: "n3",
    type: "chat",
    title: "팀 채팅",
    body: "이프로트: 코드 리뷰 부탁드립니다",
    time: "1시간 전",
    project: "Game_Logic",
    actor: "이프로트",
    read: false,
  },
  {
    id: "n4",
    type: "mission",
    title: "미션 알림",
    body: "@홍성찬 PR #2304에 대한 피드백 부탁드립니다",
    time: "2시간 전",
    project: "Server_Project",
    actor: "백엔드팀",
    read: false,
  },
  {
    id: "n5",
    type: "error",
    title: "오류 알림",
    body: "빌드 프로세스에서 오류가 발생했습니다. 로그를 확인하세요",
    time: "4시간 전",
    project: "Server_Project",
    actor: "시스템",
    read: true,
  },
  {
    id: "n6",
    type: "system",
    title: "시스템 알림",
    body: "DevMaster 플랫폼 업데이트가 완료되었습니다",
    time: "5시간 전",
    project: "VSIDE",
    actor: "시스템",
    read: true,
  },
];

export default function NotificationsPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [type, setType] = useState<NotifType>("all");
  const [openTypeMenu, setOpenTypeMenu] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>(DEMO);

  const unreadCount = useMemo(
    () => items.filter((i) => !i.read).length,
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (tab === "unread" && i.read) return false;
      if (type !== "all" && i.type !== type) return false;
      if (!q) return true;
      const hay =
        `${i.title} ${i.body} ${i.project ?? ""} ${i.actor ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query, tab, type]);

  const markAllRead = () =>
    setItems((prev) => prev.map((p) => ({ ...p, read: true })));
  const markRead = (id: string) =>
    setItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, read: true } : p)),
    );
  const remove = (id: string) =>
    setItems((prev) => prev.filter((p) => p.id !== id));

  return (
    <div className="min-h-[calc(100vh-64px)] bg-white">
      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-xl p-2 hover:bg-gray-100 text-gray-700"
              aria-label="뒤로"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-gray-800" />
              <h1 className="text-lg font-black text-gray-900">알림</h1>
              {unreadCount > 0 ? (
                <span className="ml-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700">
                  {unreadCount}개 읽지 않은 알림
                </span>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={markAllRead}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
          >
            <Check className="w-4 h-4" />
            모두 읽음 처리
          </button>
        </div>

        {/* Controls */}
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="알림 검색..."
                className="w-full rounded-2xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-gray-400"
              />
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenTypeMenu((v) => !v)}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                <Filter className="w-4 h-4" />
                {type === "all" ? "모든 알림" : TYPE_LABEL[type]}
              </button>

              {openTypeMenu ? (
                <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg z-10">
                  {(
                    [
                      "all",
                      "schedule",
                      "chat",
                      "commit",
                      "mission",
                      "error",
                      "system",
                    ] as NotifType[]
                  ).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setType(t);
                        setOpenTypeMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {t === "all" ? "모든 알림" : TYPE_LABEL[t]}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab("all")}
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                tab === "all"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              모든 알림 ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("unread")}
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                tab === "unread"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              읽지 않음 ({unreadCount})
            </button>
          </div>
        </div>

        {/* List */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200">
          <div className="bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
            {filtered.length}개 표시됨
          </div>

          <div className="divide-y divide-gray-100 bg-white">
            {filtered.map((n) => (
              <div key={n.id} className="flex items-start gap-4 px-4 py-4">
                <div className="mt-1 h-10 w-10 rounded-2xl bg-gray-100 grid place-items-center text-gray-700">
                  {typeIcon(n.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900">{n.title}</p>
                    <span className={pill(n.type)}>{TYPE_LABEL[n.type]}</span>
                    {!n.read ? (
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                    ) : null}
                  </div>

                  <p className="mt-1 text-sm text-gray-700">{n.body}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span>{n.time}</span>
                    {n.actor ? <span>· {n.actor}</span> : null}
                    {n.project ? <span>· {n.project}</span> : null}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!n.read ? (
                    <button
                      type="button"
                      onClick={() => markRead(n.id)}
                      className="rounded-xl p-2 hover:bg-gray-100 text-gray-700"
                      aria-label="읽음"
                      title="읽음 처리"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => remove(n.id)}
                    className="rounded-xl p-2 hover:bg-rose-50 text-rose-600"
                    aria-label="삭제"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {filtered.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-gray-500">
                조건에 맞는 알림이 없어요.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
