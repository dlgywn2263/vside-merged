/**
 * TODO (BACKEND)
 * - GET /api/schedules/preview
 * - 기간: today ~ today + 7 days
 *
 * 응답 예시:
 * [
 *   {
 *     id: string,
 *     date: string,
 *     title: string,
 *     time?: string,
 *     type: "회의" | "마감" | "개발"
 *   }
 * ]
 */

type ScheduleItem = {
  id: string;
  date: string;
  title: string;
  time?: string;
  badge?: "회의" | "마감" | "개발";
};

// ⛔ MOCK 데이터
const MOCK: ScheduleItem[] = [
  {
    id: "s1",
    date: "02/07",
    title: "팀 주간 회의",
    time: "20:00",
    badge: "회의",
  },
  {
    id: "s2",
    date: "02/07",
    title: "팀 주간 회의",
    time: "20:00",
    badge: "회의",
  },
  {
    id: "s3",
    date: "02/07",
    title: "팀 주간 회의",
    time: "20:00",
    badge: "회의",
  },
];

export function SchedulePreview() {
  /**
   * TODO (BACKEND)
   * const res = await fetch("/api/schedules/preview")
   * const schedules = await res.json()
   */

  const schedules = MOCK;

  return (
    <ul className="divide-y divide-gray-200 rounded-xl flex flex-col gap-1 ">
      {schedules.map((it) => (
        <li
          key={it.id}
          className="px-4 py-4 flex justify-between rounded-xl  bg-white"
        >
          <div>
            <p className="font-semibold">{it.title}</p>
            <p className="text-sm text-gray-500">
              {it.date} · {it.time ?? "시간 미정"}
            </p>
          </div>
          {
            <span className=" flex items-center text-xs bg-gray-100 px-3 py-1 rounded-full">
              {it.badge}
            </span>
          }
        </li>
      ))}
    </ul>
  );
}
