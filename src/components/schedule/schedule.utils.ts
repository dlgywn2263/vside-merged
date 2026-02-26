// 일정관리에서 쓰는 공통 유틸(스토리지/정렬/날짜 변환/스코프 매칭)을 제공하는 파일

import { format, parse } from "date-fns";
import type { CalendarEvent, Mode } from "./schedule.types";

export const STORAGE_KEY = "schedule_events_v4";

export function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

export function todayISO() {
  return format(new Date(), "yyyy-MM-dd");
}

export function timeToDate(dateISO: string, hhmm: string) {
  const base = new Date(dateISO + "T00:00:00");
  return parse(hhmm, "HH:mm", base);
}

export function sortByDateTime(a: CalendarEvent, b: CalendarEvent) {
  if (a.dateISO !== b.dateISO) return a.dateISO.localeCompare(b.dateISO);
  return a.startTime.localeCompare(b.startTime);
}

export function loadEvents(): CalendarEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CalendarEvent[];
    return Array.isArray(parsed) ? parsed : [];
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
