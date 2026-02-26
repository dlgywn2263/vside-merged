import Link from "next/link";
import {
  Dot,
  FileEdit,
  GitCommit,
  NotebookPen,
  CalendarDays,
  UsersRound,
} from "lucide-react";

type Activity = {
  id: string;
  type: "edit" | "commit" | "doc" | "schedule" | "collab";
  title: string;
  meta: string;
  href: string;
};

function icon(type: Activity["type"]) {
  const cls = "text-gray-600";
  switch (type) {
    case "edit":
      return <FileEdit size={16} className={cls} />;
    case "commit":
      return <GitCommit size={16} className={cls} />;
    case "doc":
      return <NotebookPen size={16} className={cls} />;
    case "schedule":
      return <CalendarDays size={16} className={cls} />;
    case "collab":
      return <UsersRound size={16} className={cls} />;
  }
}

export function ActivityTimeline() {
  /**
   * TODO (BACKEND)
   * GET /api/activity/timeline?range=7d&scope=me&workspace=all&limit=20
   */
  const items: Activity[] = [
    {
      id: "t1",
      type: "edit",
      title: "Web IDE: EditorPanel.tsx 수정",
      meta: "Team Alpha · 1시간 전",
      href: "/workspace/w1",
    },
    {
      id: "t2",
      type: "commit",
      title: "fix: yjs sync edge case",
      meta: "Team Alpha · 3시간 전",
      href: "/workspace/w1",
    },
    {
      id: "t3",
      type: "doc",
      title: "개발일지 작성: 대시보드 구조",
      meta: "My Personal Solution · 어제",
      href: "/devlog",
    },
    {
      id: "t4",
      type: "schedule",
      title: "일정 추가: 팀 회의",
      meta: "Team Alpha · 2일 전",
      href: "/schedule",
    },
    {
      id: "t5",
      type: "collab",
      title: "팀원 초대 전송",
      meta: "Team Alpha · 3일 전",
      href: "/projects",
    },
  ];

  return (
    <ul className="space-y-3">
      {items.map((it) => (
        <li key={it.id} className="flex items-start gap-3">
          <div className="mt-1 flex items-center gap-1">
            <Dot className="text-gray-400" />
            <div className="h-8 w-8 rounded-xl bg-gray-100 flex items-center justify-center">
              {icon(it.type)}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <Link
              href={it.href}
              className="block text-sm font-semibold text-gray-900 hover:underline underline-offset-4 truncate"
            >
              {it.title}
            </Link>
            <p className="mt-1 text-xs text-gray-500 truncate">{it.meta}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
