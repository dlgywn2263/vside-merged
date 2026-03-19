// 일정관리에서 쓰는 공통 유틸(스토리지/정렬/기간 계산/스코프 매칭)을 제공하는 파일

import { format } from "date-fns";
import type { CalendarEvent, Mode } from "./schedule.types";

export const STORAGE_KEY = "schedule_events_v4";

export function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

export function todayISO() {
  return format(new Date(), "yyyy-MM-dd");
}

export function sortByDateRange(a: CalendarEvent, b: CalendarEvent) {
  const aStart = a.startDateISO ?? "";
  const bStart = b.startDateISO ?? "";
  if (aStart !== bStart) {
    return aStart.localeCompare(bStart);
  }

  const aEnd = a.endDateISO ?? "";
  const bEnd = b.endDateISO ?? "";
  return aEnd.localeCompare(bEnd);
}

export function loadEvents(): CalendarEvent[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is CalendarEvent =>
        item &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.mode === "string" &&
        typeof item.title === "string" &&
        typeof item.category === "string" &&
        typeof item.startDateISO === "string" &&
        typeof item.endDateISO === "string" &&
        typeof item.createdAt === "number" &&
        typeof item.updatedAt === "number"
    );
  } catch {
    return [];
  }
}

export function saveEvents(events: CalendarEvent[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export function matchesScope(e: CalendarEvent, mode: Mode, teamId: string) {
  if (mode === "personal") return e.mode === "personal";
  return e.mode === "team" && e.teamId === teamId;
}

export function isDateInEventRange(dateISO: string, event: CalendarEvent) {
  return dateISO >= event.startDateISO && dateISO <= event.endDateISO;
}

export function getDatesInRange(startISO: string, endISO: string) {
  const result: string[] = [];
  const current = new Date(`${startISO}T00:00:00`);
  const end = new Date(`${endISO}T00:00:00`);

  while (current <= end) {
    result.push(format(current, "yyyy-MM-dd"));
    current.setDate(current.getDate() + 1);
  }

  return result;
}