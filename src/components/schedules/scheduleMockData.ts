export type ScheduleStatus = "todo" | "progress" | "done" | "delayed";

export type ViewMode = "calendar" | "board" | "list";

export type ScheduleItem = {
  id: string;
  title: string;
  description: string;
  date: string;
  status: ScheduleStatus;
  hasDevlog: boolean;
};
export const scheduleStatusLabel: Record<ScheduleStatus, string> = {
  todo: "할 일",
  progress: "진행 중",
  done: "완료",
  delayed: "지연",
};

export const statusBadgeStyle: Record<ScheduleStatus, string> = {
  todo: "bg-slate-100 text-slate-700 border-slate-200",
  progress: "bg-blue-50 text-blue-700 border-blue-200",
  done: "bg-purple-50 text-purple-700 border-purple-200",
  delayed: "bg-rose-50 text-rose-700 border-rose-200",
};

export const calendarEventStyle: Record<ScheduleStatus, string> = {
  todo: "bg-slate-100 text-slate-700 border-slate-300",
  progress: "bg-blue-50 text-blue-700 border-blue-300",
  done: "bg-purple-50 text-purple-700 border-purple-300",
  delayed: "bg-rose-50 text-rose-700 border-rose-300",
};

export const boardColumnStyle: Record<ScheduleStatus, string> = {
  todo: "border-slate-200 bg-slate-50",
  progress: "border-blue-200 bg-blue-50/40",
  done: "border-purple-200 bg-purple-50/40",
  delayed: "border-rose-200 bg-rose-50/40",
};



export const weekLabels = ["일", "월", "화", "수", "목", "금", "토"];

export function formatDateKey(year: number, month: number, date: number) {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(date).padStart(2, "0");

  return `${year}-${mm}-${dd}`;
}

export function getMonthGridDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay();
  const startDate = new Date(year, month, 1 - startDay);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    return {
      key: formatDateKey(date.getFullYear(), date.getMonth(), date.getDate()),
      year: date.getFullYear(),
      month: date.getMonth(),
      date: date.getDate(),
    };
  });
}

export function getWeekDays(baseDate: Date) {
  const start = new Date(baseDate);
  start.setDate(baseDate.getDate() - baseDate.getDay());

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    return {
      key: formatDateKey(date.getFullYear(), date.getMonth(), date.getDate()),
      year: date.getFullYear(),
      month: date.getMonth(),
      date: date.getDate(),
      label: weekLabels[date.getDay()],
    };
  });
}

export function getDateFromKey(dateKey: string) {
  const [year, month, date] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, date);
}
