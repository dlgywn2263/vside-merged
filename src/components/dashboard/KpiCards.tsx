// src/components/dashboard/KpiCards.tsx
import { FolderKanban, CalendarDays, Bell, Flame } from "lucide-react";

type Kpi = {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
};

export function KpiCards() {
  /**
   * TODO (BACKEND)
   * - GET /api/dashboard/kpis
   * 응답 예시:
   * { totalProjects, upcomingSchedules, unreadAlerts, weekActivityScore }
   */

  const kpis: Kpi[] = [
    {
      label: "프로젝트",
      value: "6",
      sub: "최근 30일 +2",
      icon: <FolderKanban size={18} className="text-gray-700" />,
    },
    {
      label: "예정 일정",
      value: "4",
      sub: "7일 내",
      icon: <CalendarDays size={18} className="text-gray-700" />,
    },
    {
      label: "미확인 알림",
      value: "3",
      sub: "우선 확인 필요",
      icon: <Bell size={18} className="text-gray-700" />,
    },
  ];

  return (
    <>
      {kpis.map((k) => (
        <div
          key={k.label}
          className="rounded-2xl border border-gray-200 bg-white p-5"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-600">{k.label}</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100">
              {k.icon}
            </div>
          </div>

          <p className="mt-3 text-3xl font-extrabold text-gray-900">
            {k.value}
          </p>
          <p className="mt-1 text-sm text-gray-500">{k.sub}</p>
        </div>
      ))}
    </>
  );
}
