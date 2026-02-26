type Item = { label: string; value: number };

export function ActivityBreakdown() {
  /**
   * TODO (BACKEND)
   * GET /api/activity/breakdown?range=7d&scope=me&workspace=all
   */
  const items: Item[] = [
    { label: "편집", value: 55 },
    { label: "커밋", value: 20 },
    { label: "문서", value: 12 },
    { label: "일정", value: 8 },
    { label: "협업", value: 5 },
  ];

  return (
    <div className="rounded-2xl bg-gray-50 p-5 border border-gray-200 space-y-3">
      {items.map((it) => (
        <div key={it.label}>
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-gray-800">{it.label}</span>
            <span className="text-gray-500">{it.value}%</span>
          </div>
          <div className="mt-2 h-3 rounded-full bg-white border border-gray-200 overflow-hidden">
            <div
              className="h-full bg-gray-900"
              style={{ width: `${it.value}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
