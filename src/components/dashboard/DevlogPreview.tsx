/**
 * TODO (BACKEND)
 * - GET /api/devlogs/preview
 * - 최근 작성 순
 * - limit: 3~5
 *
 * 응답 예시:
 * [
 *   {
 *     id: string,
 *     title: string,
 *     content: string,
 *     createdAt: string,
 *     type: "개발일지" | "알림"
 *   }
 * ]
 */

type DevlogItem = {
  id: string;
  title: string;
  snippet: string;
  createdAt: string;
  type?: "개발일지" | "알림";
};

// ⛔ MOCK 데이터
const MOCK: DevlogItem[] = [
  {
    id: "d1",
    title: "로그인 상태에 따라 Header UI 변경",
    snippet: "로그인 성공 시 전역 상태에 유저 정보를 저장...",
    createdAt: "2026-02-06",
    type: "개발일지",
  },
  {
    id: "d2",
    title: "로그인 상태에 따라 Header UI 변경",
    snippet: "로그인 성공 시 전역 상태에 유저 정보를 저장...",
    createdAt: "2026-02-06",
    type: "개발일지",
  },
  {
    id: "d3",
    title: "로그인 상태에 따라 Header UI 변경",
    snippet: "로그인 성공 시 전역 상태에 유저 정보를 저장...",
    createdAt: "2026-02-06",
    type: "개발일지",
  },
];

export function DevlogPreview() {
  /**
   * TODO (BACKEND)
   * const res = await fetch("/api/devlogs/preview")
   * const devlogs = await res.json()
   */

  const devlogs = MOCK;

  return (
    <ul className="divide-y divide-gray-200 rounded-xl bg-white">
      {devlogs.map((it) => (
        <li key={it.id} className="px-4 py-4">
          <p className="font-semibold">{it.title}</p>
          <p className="text-sm text-gray-600 line-clamp-2">{it.snippet}</p>
          <p className="text-xs text-gray-400 mt-1">{it.createdAt}</p>
        </li>
      ))}
    </ul>
  );
}
