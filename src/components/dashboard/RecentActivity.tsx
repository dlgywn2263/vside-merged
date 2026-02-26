// src/components/dashboard/RecentActivity.tsx
import { Dot } from "lucide-react";

type Activity = {
  id: string;
  title: string;
  meta: string; // "프로젝트명 · 2시간 전"
};

export function RecentActivity() {
  /**
   * TODO (BACKEND)
   * - GET /api/dashboard/recent-activity?limit=6
   * - 예: 파일 수정, 커밋, 초대, 일정 등록, 개발일지 작성 등
   */
  const items: Activity[] = [
    {
      id: "a1",
      title: "README 업데이트",
      meta: "Portfolio Website · 1시간 전",
    },
    { id: "a2", title: "일정 추가: 팀 회의", meta: "Team IDE Sync · 3시간 전" },
    { id: "a3", title: "개발일지 작성", meta: "VSIDE Dashboard · 어제" },
    {
      id: "a4",
      title: "워크스페이스 설정 변경",
      meta: "Portfolio Website · 2일 전",
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <ul className="space-y-3">
        {items.map((it) => (
          <li key={it.id} className="flex gap-2">
            <Dot className="text-gray-500 mt-1" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {it.title}
              </p>
              <p className="text-xs text-gray-500 truncate">{it.meta}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
