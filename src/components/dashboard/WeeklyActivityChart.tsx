// src/components/dashboard/WeeklyActivityChart.tsx

type Day = { label: string; value: number }; // 0~100

export function WeeklyActivityChart() {
  /**
   * TODO (BACKEND)
   * - GET /api/dashboard/weekly-activity
   * 응답 예시: [{label:"Mon", value:30}, ...]
   */
  const data: Day[] = [
    { label: "Mon", value: 25 },
    { label: "Tue", value: 40 },
    { label: "Wed", value: 70 },
    { label: "Thu", value: 55 },
    { label: "Fri", value: 80 },
    { label: "Sat", value: 35 },
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
                aria-label={`${d.label} ${d.value}`}
              />
            </div>
            <span className="text-xs text-gray-600">{d.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
        <span>낮음</span>
        <span>높음</span>
      </div>
    </div>
  );
}
