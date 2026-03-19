"use client";

import * as React from "react";
import { format, startOfWeek, endOfWeek, isSameMonth } from "date-fns";
import type {
  CalendarEvent,
  Category,
  Mode,
  ProjectStage,
} from "../schedule.types";
import {
  matchesScope,
  sortByDateRange,
  todayISO,
  isDateInEventRange,
  getDatesInRange,
} from "../schedule.utils";

type Params = {
  events: CalendarEvent[];
  mode: Mode;
  teamId: string;
  category: Category | "ALL";
  query: string;
  selectedDate: Date;
};

export function useScheduleDerived({
  events,
  mode,
  teamId,
  category,
  query,
  selectedDate,
}: Params) {
  const selectedISO = format(selectedDate, "yyyy-MM-dd");

  const scopedFiltered = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    return events
      .filter((e) => matchesScope(e, mode, teamId))
      .filter((e) => (category === "ALL" ? true : e.category === category))
      .filter((e) => {
        if (!q) return true;
        const hay =
          `${e.title} ${e.description ?? ""} ${e.location ?? ""} ${e.stage ?? ""} ${e.status ?? ""} ${(e.assignees ?? []).join(" ")}`.toLowerCase();
        return hay.includes(q);
      })
      .slice()
      .sort(sortByDateRange);
  }, [events, mode, teamId, category, query]);

  const dayEvents = React.useMemo(
    () => scopedFiltered.filter((e) => isDateInEventRange(selectedISO, e)),
    [scopedFiltered, selectedISO]
  );

  const weekEvents = React.useMemo(() => {
    const startISO = format(
      startOfWeek(selectedDate, { weekStartsOn: 0 }),
      "yyyy-MM-dd"
    );
    const endISO = format(
      endOfWeek(selectedDate, { weekStartsOn: 0 }),
      "yyyy-MM-dd"
    );

    return scopedFiltered.filter(
      (e) => e.startDateISO <= endISO && e.endDateISO >= startISO
    );
  }, [scopedFiltered, selectedDate]);

  const monthCount = React.useMemo(() => {
    return scopedFiltered.filter((e) => {
      const dates = getDatesInRange(e.startDateISO, e.endDateISO);
      return dates.some((iso) => {
        const d = new Date(`${iso}T00:00:00`);
        return isSameMonth(d, selectedDate);
      });
    }).length;
  }, [scopedFiltered, selectedDate]);

  const todayCount = React.useMemo(() => {
    const t = todayISO();
    return scopedFiltered.filter((e) => isDateInEventRange(t, e)).length;
  }, [scopedFiltered]);

  const personalNextTitle = React.useMemo(() => {
    const t = todayISO();
    return (
      scopedFiltered.find((e) => e.endDateISO >= t)?.title ?? "예정된 일정 없음"
    );
  }, [scopedFiltered]);

  const monthTopCategory = React.useMemo(() => {
    const counts = new Map<string, number>();

    for (const e of scopedFiltered) {
      const dates = getDatesInRange(e.startDateISO, e.endDateISO);
      const includedInMonth = dates.some((iso) => {
        const d = new Date(`${iso}T00:00:00`);
        return isSameMonth(d, selectedDate);
      });

      if (!includedInMonth) continue;
      counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
    }

    let best: string | null = null;
    let bestV = -1;

    for (const [k, v] of counts) {
      if (v > bestV) {
        best = k;
        bestV = v;
      }
    }

    return best ? `${best} (${bestV})` : "데이터 없음";
  }, [scopedFiltered, selectedDate]);

  const dateStageMap = React.useMemo(() => {
    const map = new Map<string, ProjectStage>();

    for (const e of scopedFiltered) {
      if (!e.stage) continue;

      const dates = getDatesInRange(e.startDateISO, e.endDateISO);
      for (const iso of dates) {
        map.set(iso, e.stage);
      }
    }

    return map;
  }, [scopedFiltered]);

  return {
    selectedISO,
    scopedFiltered,
    dayEvents,
    weekEvents,
    monthCount,
    todayCount,
    personalNextTitle,
    monthTopCategory,
    dateStageMap,
  };
}