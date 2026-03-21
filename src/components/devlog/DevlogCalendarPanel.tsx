import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { DevlogItem } from "@/lib/devlog/types";
import {
  addMonths,
  buildCalendarGrid,
  formatKoreanDate,
  toYmd,
} from "@/lib/devlog/utils";
import { stageMeta } from "@/lib/devlog/constants";

type Props = {
  calendarMonth: Date;
  selectedDate: string;
  setSelectedDate: (value: string) => void;
  setCalendarMonth: (value: Date) => void;
  markedDates: Set<string>;
  selectedDateLogs: DevlogItem[];
  onOpenDetail: (item: DevlogItem) => void;
  onEdit: (item: DevlogItem) => void;
  onDelete: (id: number, projectId: number) => void;
  onCreate: () => void;
};

export function DevlogCalendarPanel({
  calendarMonth,
  selectedDate,
  setSelectedDate,
  setCalendarMonth,
  markedDates,
  selectedDateLogs,
  onOpenDetail,
  onEdit,
  onDelete,
  onCreate,
}: Props) {
  const monthGrid = buildCalendarGrid(calendarMonth);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">개발일지</h2>
        </div>
        <CalendarDays className="text-slate-400" size={20} />
      </div>

      <div className="rounded-2xl bg-slate-50 p-4">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => setCalendarMonth(addMonths(calendarMonth, -1))}
            className="rounded-lg p-2 hover:bg-white"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="text-sm font-semibold text-slate-800">
            {calendarMonth.toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
            })}
          </div>

          <button
            onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
            className="rounded-lg p-2 hover:bg-white"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-y-2 text-center text-xs text-slate-400">
          {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
            <div key={day} className="py-2 font-medium">
              {day}
            </div>
          ))}

          {monthGrid.map((cell, idx) => {
            const isCurrentMonth = cell.getMonth() === calendarMonth.getMonth();
            const ymd = toYmd(cell);
            const isSelected = ymd === selectedDate;
            const hasLog = markedDates.has(ymd);

            return (
              <button
                key={`${ymd}-${idx}`}
                onClick={() => setSelectedDate(ymd)}
                className={`relative mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm transition ${
                  isSelected
                    ? "bg-slate-900 text-white"
                    : isCurrentMonth
                      ? "text-slate-700 hover:bg-white"
                      : "text-slate-300 hover:bg-white"
                }`}
              >
                {cell.getDate()}
                {hasLog && !isSelected && (
                  <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-slate-900" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3 text-sm font-semibold text-slate-700">
          {formatKoreanDate(selectedDate)} 개발일지
        </div>

        <div className="space-y-3">
          {selectedDateLogs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
              선택한 날짜의 개발일지가 없습니다.
            </div>
          ) : (
            selectedDateLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="min-w-0 cursor-pointer"
                    onClick={() => onOpenDetail(log)}
                  >
                    <div className="text-sm font-semibold text-slate-900">
                      {log.title}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {log.projectTitle}
                    </div>
                    <div className="mt-2 line-clamp-2 text-xs text-slate-600">
                      {log.summary}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEdit(log)}
                      className="rounded-lg p-2 text-slate-500 hover:bg-white"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => onDelete(log.id, log.projectId)}
                      className="rounded-lg p-2 text-slate-500 hover:bg-white"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
                    {stageMeta[log.stage].label}
                  </span>
                  {log.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-white px-2.5 py-1 text-[11px] text-slate-500"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}

          <button
            onClick={onCreate}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-500 hover:bg-slate-50"
          >
            <Plus size={16} />새 개발일지 작성
          </button>
        </div>
      </div>
    </section>
  );
}
