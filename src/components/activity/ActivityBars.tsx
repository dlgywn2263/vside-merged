type Day = { label: string; value: number }; // 0~100

export function ActivityBars() {
  /**
   * TODO (BACKEND)
   * GET /api/activity/daily?range=7d&scope=me&workspace=all
   */
  const data: Day[] = [
    { label: "Mon", value: 30 },
    { label: "Tue", value: 45 },
    { label: "Wed", value: 80 },
    { label: "Thu", value: 55 },
    { label: "Fri", value: 70 },
    { label: "Sat", value: 25 },
    { label: "Sun", value: 20 },
  ];

  return (
    <div className="rounded-2xl bg-gray-50 p-5 border border-gray-200">
      <div className="flex items-end justify-between gap-3 h-44">
        {data.map((d) => (
          <div
            key={d.label}
            className="flex flex-col items-center gap-2 w-full"
          >
            <div className="w-full flex items-end justify-center h-36">
              <div
                className="w-8 max-w-full rounded-xl bg-gray-900"
                style={{ height: `${Math.max(6, d.value)}%` }}
              />
            </div>
            <span className="text-xs text-gray-600">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
