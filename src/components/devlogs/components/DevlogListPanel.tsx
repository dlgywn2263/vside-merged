// 경로: src/components/devlogs/components/DevlogListPanel.tsx
//
// 개발일지 목록. 카드 나열 대신 높이가 같은 행으로 보여 준다(일정 관리 리스트와 같은 결).
// 받는 값과 클릭 동작(onSelectDevlog)은 예전 카드 목록과 같다.
import { CalendarDays, FileText, Link2, UserRound } from "lucide-react";

import type { DevlogItem } from "../devlog.types";
import { scheduleStatusLabel, statusStyle } from "../devlog.utils";
import { DevlogEmptyBox } from "./DevlogEmptyBox";

// 상태 칸. 일정 연결 일지는 연결된 일정의 진행 상태(API scheduleStatus)를 보여 준다.
// 일반 일지는 상태 필드가 없으므로 임의 상태를 붙이지 않고 "해당 없음"으로 둔다.
function DevlogStatusCell({ item }: { item: DevlogItem }) {
  if (item.status) {
    return (
      <span
        className={`inline-flex h-6 items-center rounded border px-1.5 text-[11px] font-medium ${
          statusStyle[item.status]
        }`}
      >
        {scheduleStatusLabel[item.status]}
      </span>
    );
  }

  return (
    <span className="text-[11px] text-slate-400">
      {item.type === "general" ? "해당 없음" : "상태 정보 없음"}
    </span>
  );
}

export function DevlogListPanel({
  filteredDevlogs,
  selectedDevlog,
  onSelectDevlog,
}: {
  filteredDevlogs: DevlogItem[];
  selectedDevlog: DevlogItem | null;
  onSelectDevlog: (id: string) => void;
}) {
  if (filteredDevlogs.length === 0) {
    return <DevlogEmptyBox text="조건에 맞는 개발일지가 없습니다." />;
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="hidden grid-cols-[minmax(0,1fr)_200px_84px_110px_96px] gap-4 border-b border-slate-200 bg-slate-50/80 px-4 py-2 text-[11px] font-medium text-slate-500 lg:grid">
        <span>개발일지</span>
        <span>연결 일정</span>
        <span>상태</span>
        <span>작성자</span>
        <span className="text-right">작업일</span>
      </div>

      <ul className="divide-y divide-slate-100">
        {filteredDevlogs.map((item) => {
          const selected = selectedDevlog?.id === item.id;

          const isLinked = item.type === "linked";

          const workedDate = item.workedDate || item.date || "-";

          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelectDevlog(item.id)}
                aria-current={selected ? "true" : undefined}
                className={`group relative grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-4 py-3 text-left transition-colors lg:grid-cols-[minmax(0,1fr)_200px_84px_110px_96px] ${
                  selected ? "bg-[#F5F7FF]" : "hover:bg-slate-50"
                }`}
              >
                {/* 선택한 일지는 왼쪽 브랜드색 선으로 표시 */}
                <span
                  className={`absolute inset-y-0 left-0 w-[3px] ${
                    selected ? "bg-[#5873F9]" : "bg-transparent"
                  }`}
                />

                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md ${
                      isLinked
                        ? "bg-[#EEF2FF] text-[#5873F9]"
                        : "bg-slate-100 text-slate-500"
                    }`}
                    title={isLinked ? "일정 연결 일지" : "일반 일지"}
                  >
                    {isLinked ? <Link2 size={14} /> : <FileText size={14} />}
                  </span>

                  <div className="min-w-0">
                    <p
                      className={`truncate text-[13px] font-semibold ${
                        selected
                          ? "text-[#4058D6]"
                          : "text-slate-900 group-hover:text-[#4058D6]"
                      }`}
                    >
                      {item.title || "제목 없는 개발일지"}
                    </p>

                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {item.content || "작성된 내용이 없습니다."}
                    </p>
                  </div>
                </div>

                {/* 좁은 화면: 오른쪽에 작업일만 */}
                <span className="font-mono text-[11px] text-slate-500 lg:hidden">
                  {workedDate}
                </span>

                <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-1.5 pl-10 lg:col-span-1 lg:pl-0">
                  {isLinked ? (
                    <span className="inline-flex h-6 min-w-0 max-w-full items-center gap-1 rounded border border-[#D9E1FF] bg-[#F5F7FF] px-1.5 text-[11px] font-medium text-[#4058D6]">
                      <CalendarDays size={11} className="shrink-0" />
                      <span className="truncate">
                        {item.scheduleTitle || "연결 일정"}
                      </span>
                    </span>
                  ) : (
                    <span className="inline-flex h-6 items-center rounded border border-slate-200 bg-white px-1.5 text-[11px] font-medium text-slate-600">
                      일반 개발일지
                    </span>
                  )}

                  {/* 좁은 화면에서는 상태·작성자를 같은 줄에 붙인다 */}
                  <span className="lg:hidden">
                    <DevlogStatusCell item={item} />
                  </span>

                  {item.authorName ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 lg:hidden">
                      <UserRound size={11} />
                      {item.authorName}
                    </span>
                  ) : null}
                </div>

                <div className="hidden lg:block">
                  <DevlogStatusCell item={item} />
                </div>

                <span className="hidden min-w-0 items-center gap-1.5 text-xs text-slate-600 lg:flex">
                  {item.authorName ? (
                    <>
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#EEF3FF] text-[10px] font-semibold text-[#4058D6]">
                        {item.authorName.slice(0, 1)}
                      </span>
                      <span className="truncate">{item.authorName}</span>
                    </>
                  ) : (
                    // 개발일지 목록 API(/api/workspaces/{id}/devlogs) 응답에 작성자 필드가 없다.
                    // 다른 사람 이름으로 채우지 않고 비워 둔다.
                    <span
                      className="text-[11px] text-slate-300"
                      title="작성자 정보가 제공되지 않습니다."
                    >
                      -
                    </span>
                  )}
                </span>

                <span className="hidden text-right font-mono text-[11px] text-slate-500 lg:block">
                  {workedDate}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
