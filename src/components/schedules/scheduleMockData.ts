export type ScheduleStatus = "todo" | "progress" | "done" | "delayed";

export type ViewMode = "calendar" | "board" | "list";

export type ScheduleItem = {
  id: string;
  title: string;
  description: string;
  date: string;
  status: ScheduleStatus;
  category: string;
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
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  delayed: "bg-rose-50 text-rose-700 border-rose-200",
};

export const calendarEventStyle: Record<ScheduleStatus, string> = {
  todo: "bg-slate-100 text-slate-700 border-slate-300",
  progress: "bg-blue-50 text-blue-700 border-blue-300",
  done: "bg-emerald-50 text-emerald-700 border-emerald-300",
  delayed: "bg-rose-50 text-rose-700 border-rose-300",
};

export const boardColumnStyle: Record<ScheduleStatus, string> = {
  todo: "border-slate-200 bg-slate-50",
  progress: "border-blue-200 bg-blue-50/40",
  done: "border-emerald-200 bg-emerald-50/40",
  delayed: "border-rose-200 bg-rose-50/40",
};

export const initialSchedules: ScheduleItem[] = [
  {
    id: "s1",
    title: "로그인 API 구현",
    description: "JWT 기반 로그인 API와 인증 필터 구현",
    date: "2026-05-01",
    status: "done",
    category: "Backend",
    hasDevlog: true,
  },
  {
    id: "s2",
    title: "프로젝트 생성 UI 수정",
    description: "프로젝트 생성 모달과 입력 검증 개선",
    date: "2026-05-02",
    status: "progress",
    category: "Frontend",
    hasDevlog: false,
  },
  {
    id: "s3",
    title: "GitHub 브랜치 연동",
    description: "브랜치 목록 조회 및 선택 기능 구현",
    date: "2026-05-03",
    status: "todo",
    category: "Git",
    hasDevlog: false,
  },
  {
    id: "s4",
    title: "개발일지 상세 화면 구성",
    description: "연결 일정, 태그, 작성 내용을 함께 표시",
    date: "2026-05-04",
    status: "todo",
    category: "Devlog",
    hasDevlog: true,
  },
  {
    id: "s5",
    title: "일정 진행률 계산 로직 정리",
    description: "완료 일정 기준으로 프로젝트 진행률 계산",
    date: "2026-05-05",
    status: "delayed",
    category: "Planning",
    hasDevlog: false,
  },
  {
    id: "s6",
    title: "일지 미작성 일정 표시",
    description: "작업은 있지만 아직 개발일지가 없는 일정 표시",
    date: "2026-05-06",
    status: "progress",
    category: "Devlog",
    hasDevlog: false,
  },
  {
    id: "s7",
    title: "캘린더 관리 화면 구성",
    description: "좌우 사이드바가 있는 월간 캘린더 관리 화면",
    date: "2026-05-07",
    status: "todo",
    category: "Calendar",
    hasDevlog: false,
  },
];

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
