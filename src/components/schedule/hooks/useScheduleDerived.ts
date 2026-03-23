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
  workspaceId: string;
  category: Category | "ALL";
  query: string;
  selectedDate: Date;
};

export function useScheduleDerived({
  events,
  mode,
  workspaceId,
  category,
  query,
  selectedDate,
}: Params) {
  const selectedISO = format(selectedDate, "yyyy-MM-dd");

  const scopedFiltered = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    return events
      .filter((e) => matchesScope(e, mode, workspaceId))
      .filter((e) => (category === "ALL" ? true : e.category === category))
      .filter((e) => {
        if (!q) return true;

        const haystack = [
          e.title,
          e.description ?? "",
          e.location ?? "",
          e.stage ?? "",
          e.status ?? "",
          e.workspaceName ?? "",
          ...(e.assignees ?? []),
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      })
      .slice()
      .sort(sortByDateRange);
  }, [events, mode, workspaceId, category, query]);

  const dayEvents = React.useMemo(
    () => scopedFiltered.filter((e) => isDateInEventRange(selectedISO, e)),
    [scopedFiltered, selectedISO],
  );

  const weekEvents = React.useMemo(() => {
    const startISO = format(
      startOfWeek(selectedDate, { weekStartsOn: 0 }),
      "yyyy-MM-dd",
    );
    const endISO = format(
      endOfWeek(selectedDate, { weekStartsOn: 0 }),
      "yyyy-MM-dd",
    );

    return scopedFiltered.filter(
      (e) => e.startDateISO <= endISO && e.endDateISO >= startISO,
    );
  }, [scopedFiltered, selectedDate]);

  const monthCount = React.useMemo(() => {
    return scopedFiltered.filter((e) => {
      const dates = getDatesInRange(e.startDateISO, e.endDateISO);
      return dates.some((iso) => {
        const date = new Date(`${iso}T00:00:00`);
        return isSameMonth(date, selectedDate);
      });
    }).length;
  }, [scopedFiltered, selectedDate]);

  const todayCount = React.useMemo(() => {
    const today = todayISO();
    return scopedFiltered.filter((e) => isDateInEventRange(today, e)).length;
  }, [scopedFiltered]);

  const personalNextTitle = React.useMemo(() => {
    const today = todayISO();
    return (
      scopedFiltered.find((e) => e.endDateISO >= today)?.title ??
      "예정된 일정 없음"
    );
  }, [scopedFiltered]);

  const monthTopCategory = React.useMemo(() => {
    const counts = new Map<string, number>();

    for (const event of scopedFiltered) {
      const dates = getDatesInRange(event.startDateISO, event.endDateISO);
      const includedInMonth = dates.some((iso) => {
        const date = new Date(`${iso}T00:00:00`);
        return isSameMonth(date, selectedDate);
      });

      if (!includedInMonth) continue;

      counts.set(event.category, (counts.get(event.category) ?? 0) + 1);
    }

    let bestKey: string | null = null;
    let bestValue = -1;

    for (const [key, value] of counts) {
      if (value > bestValue) {
        bestKey = key;
        bestValue = value;
      }
    }

    return bestKey ? `${bestKey} (${bestValue})` : "데이터 없음";
  }, [scopedFiltered, selectedDate]);

  const dateStageMap = React.useMemo(() => {
    const map = new Map<string, ProjectStage[]>();

    for (const event of scopedFiltered) {
      if (!event.stage) continue;

      const dates = getDatesInRange(event.startDateISO, event.endDateISO);

      for (const iso of dates) {
        const current = map.get(iso) ?? [];

        if (!current.includes(event.stage)) {
          current.push(event.stage);
        }

        map.set(iso, current);
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
    // dateStageMap,
  };
}
