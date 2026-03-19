import type { CalendarEvent } from "./schedule.types";
import { STAGE_BAR_COLORS } from "./schedule.colors";

// 1. 일정의 시작일~종료일 사이의 모든 날짜를 구하는 유틸 함수
function getDatesInRange(startISO: string, endISO: string) {
  const result: string[] = [];
  const current = new Date(`${startISO}T00:00:00`);
  const end = new Date(`${endISO}T00:00:00`);
  while (current <= end) {
    result.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return result;
}

// 2. events 배열을 받아서 달력에 찍을 날짜 목록(modifiers)을 완벽하게 계산
export function buildCalendarModifiers(events: CalendarEvent[]) {
  const modifiers: Record<string, Date[]> = {};

  events.forEach((event) => {
    if (!event.stage) return;
    const key = `stage_${event.stage}`;
    
    if (!modifiers[key]) modifiers[key] = [];

    // 해당 일정의 기간 내 모든 날짜에 Bar가 생기도록 추가
    const dates = getDatesInRange(event.startDateISO, event.endDateISO);
    dates.forEach((iso) => {
      modifiers[key].push(new Date(`${iso}T00:00:00`));
    });
  });

  return modifiers;
}

// 3. 막대(Bar) CSS 생성 (z-20 추가로 달력 버튼 위로 확실하게 노출)
export function buildCalendarModifierClassNames() {
  const baseBarClass =
    "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-5 after:h-1.5 after:rounded-full after:z-20";

  const classes: Record<string, string> = {};

  Object.entries(STAGE_BAR_COLORS).forEach(([stage, colorClass]) => {
    classes[`stage_${stage}`] = `${baseBarClass} ${colorClass}`;
  });

  return classes;
}