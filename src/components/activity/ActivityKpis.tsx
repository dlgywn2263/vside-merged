import { FileEdit, GitCommit, NotebookPen, CalendarCheck } from "lucide-react";

export function ActivityKpis() {
  /**
   * TODO (BACKEND)
   * GET /api/activity/kpis?range=7d&scope=me&workspace=all
   */
  const items = [
    {
      label: "파일 수정",
      value: "28",
      icon: <FileEdit size={18} className="text-gray-700" />,
    },
    {
      label: "커밋/푸시",
      value: "9",
      icon: <GitCommit size={18} className="text-gray-700" />,
    },
    {
      label: "문서/일지",
      value: "5",
      icon: <NotebookPen size={18} className="text-gray-700" />,
    },
    {
      label: "일정 완료",
      value: "3",
      icon: <CalendarCheck size={18} className="text-gray-700" />,
    },
  ];

  return (
    <>
      {items.map((k) => (
        <div
          key={k.label}
          className="rounded-2xl border border-gray-200 bg-white p-5"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-600">{k.label}</p>
            <div className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center">
              {k.icon}
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-gray-900">
            {k.value}
          </p>
          <p className="mt-1 text-sm text-gray-500">선택 기간 기준</p>
        </div>
      ))}
    </>
  );
}
