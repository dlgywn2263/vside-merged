"use client";

import Link from "next/link";

import { useMemo } from "react";

import { CalendarRange } from "lucide-react";

import type { WorkFlowItem, WorkspaceMode } from "./dashboard.types";

import {

  getDevlogHref,

  getMonthDays,

  getScheduleHref,

} from "./dashboard.utils";

import WorkFlowList from "./WorkFlowList";

type Props = {

  isLoading: boolean;

  items: WorkFlowItem[];

  selectedDateKey: string;

  onSelectDate: (dateKey: string) => void;

  workspaceId: string;

  mode: WorkspaceMode;

  isProjectMode: boolean;

  projectName: string;

};

export default function MonthlyWorkFlowSection({

  isLoading,

  items,

  selectedDateKey,

  onSelectDate,

  workspaceId,

  mode,

  isProjectMode,

  projectName,

}: Props) {

  const monthDays = useMemo(() => getMonthDays(new Date()), []);

  const itemsByDate = useMemo(() => {

    return monthDays.reduce<Record<string, WorkFlowItem[]>>((acc, day) => {

      acc[day.key] = items

        .filter((item) => item.dateKey === day.key)

        .sort((a, b) => b.sortTime - a.sortTime);

      return acc;

    }, {});

  }, [items, monthDays]);

  const selectedDay = monthDays.find((day) => day.key === selectedDateKey);

  const selectedItems = [...(itemsByDate[selectedDateKey] ?? [])].sort(

    (a, b) => b.sortTime - a.sortTime,

  );

  const schedules = selectedItems

    .filter((item) => item.type === "schedule")

    .sort((a, b) => b.sortTime - a.sortTime);

  const devlogs = selectedItems

    .filter((item) => item.type === "devlog")

    .sort((a, b) => b.sortTime - a.sortTime);

  const visibleSchedules = schedules.slice(0, 4);

  const visibleDevlogs = devlogs.slice(0, 3);

  const hiddenCount =

    Math.max(schedules.length - visibleSchedules.length, 0) +

    Math.max(devlogs.length - visibleDevlogs.length, 0);

  const today = new Date();

  return (
    <section className="rounded-md border border-gray-200 bg-white">
      {/* =====================================================
          HEADER
      ===================================================== */}
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-gray-900 text-white">
            <CalendarRange size={16} strokeWidth={2.2} />
          </span>

          <div className="min-w-0">
            <h2 className="flex flex-wrap items-baseline gap-x-2 text-sm font-bold text-gray-900">
              이번 달 작업 흐름
              <span className="font-mono text-xs font-medium text-gray-400">
                {today.getFullYear()}.{String(today.getMonth() + 1).padStart(2, "0")}
              </span>
            </h2>

            <p className="mt-0.5 truncate text-[11px] text-gray-500">
              {isProjectMode
                ? `${projectName} · 날짜를 눌러 그날의 일정과 개발일지를 확인하세요.`
                : "이번 달 전체 워크스페이스의 일정과 개발일지를 확인하세요."}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="flex items-center gap-3 text-[11px] font-medium text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-[#5873F9]" />
              일정
            </span>

            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-purple-500" />
              개발일지
            </span>
          </div>

          {/* 프로젝트 화면에서는 위 "바로 가기"에 같은 이동이 있어 여기서는 숨긴다 */}
          {isProjectMode ? null : (
            <div className="flex gap-2">
              <Link
                href={
                  workspaceId ? getScheduleHref(workspaceId, mode) : "/schedule"
                }
                className="inline-flex h-8 items-center justify-center rounded-md border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 transition-colors hover:border-[#AAB8FF] hover:text-[#5873F9]"
              >
                일정관리
              </Link>

              <Link
                href={workspaceId ? getDevlogHref(workspaceId, mode) : "/devlog"}
                className="inline-flex h-8 items-center justify-center rounded-md bg-[#5873F9] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#4863E8]"
              >
                개발일지
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          CONTENT
      ===================================================== */}
      {isLoading ? (
        <p className="flex h-[360px] items-center justify-center text-xs text-gray-400">
          이번 달 작업 흐름을 불러오는 중입니다.
        </p>
      ) : (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* =================================================
              CALENDAR
          ================================================= */}
          <div className="min-w-0 p-4 md:p-5">
            <div className="grid grid-cols-7 pb-2 text-[11px] font-semibold">
              {["월", "화", "수", "목", "금", "토", "일"].map((dayName) => (
                <div
                  key={dayName}
                  className={`px-2 ${
                    dayName === "토"
                      ? "text-blue-500"
                      : dayName === "일"
                        ? "text-rose-500"
                        : "text-gray-400"
                  }`}
                >
                  {dayName}
                </div>
              ))}
            </div>

            {/* 칸마다 테두리를 두르지 않고 선을 공유하는 격자로 그린다 */}
            <div className="grid grid-cols-7 overflow-hidden rounded-md border-l border-t border-gray-200">
              {monthDays.map((day) => {
                const dayItems = itemsByDate[day.key] ?? [];

                const scheduleCount = dayItems.filter(
                  (item) => item.type === "schedule",
                ).length;

                const devlogCount = dayItems.filter(
                  (item) => item.type === "devlog",
                ).length;

                const active = selectedDateKey === day.key;

                const hasItems = scheduleCount + devlogCount > 0;

                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => onSelectDate(day.key)}
                    aria-pressed={active}
                    aria-label={`${day.month}월 ${day.dayNumber}일, 일정 ${scheduleCount}개, 개발일지 ${devlogCount}개`}
                    className={`relative flex min-h-[84px] flex-col justify-between border-b border-r border-gray-200 p-1.5 text-left transition-colors sm:p-2 ${
                      active
                        ? "bg-[#F2F5FF]"
                        : day.isCurrentMonth
                          ? "bg-white hover:bg-[#F7F9FF]"
                          : "bg-gray-50 hover:bg-gray-100/70"
                    }`}
                  >
                    {/* 선택한 날은 칸 위쪽에 브랜드색 띠를 둔다 */}
                    {active ? (
                      <span className="absolute inset-x-0 top-0 h-0.5 bg-[#5873F9]" />
                    ) : null}

                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs tabular-nums ${
                          active
                            ? "bg-[#5873F9] font-bold text-white"
                            : day.isToday
                              ? "border-2 border-[#5873F9] font-bold text-[#5873F9]"
                              : !day.isCurrentMonth
                                ? "font-medium text-gray-300"
                                : hasItems
                                  ? "font-bold text-gray-900"
                                  : "font-medium text-gray-400"
                        }`}
                      >
                        {day.dayNumber}
                      </span>

                      {day.isToday ? (
                        <span className="hidden text-[10px] font-bold text-[#5873F9] sm:inline">
                          TODAY
                        </span>
                      ) : null}
                    </div>

                    {hasItems ? (
                      <div
                        className={day.isCurrentMonth ? "" : "opacity-50"}
                      >
                        {/* 넓은 화면: 개수 배지 / 좁은 화면: 색 점 */}
                        <div className="hidden flex-wrap gap-1 sm:flex">
                          {scheduleCount > 0 ? (
                            <span className="inline-flex h-[18px] items-center gap-1 rounded bg-[#EEF2FF] px-1.5 text-[10px] font-semibold text-[#4058D6]">
                              <span className="h-1.5 w-1.5 rounded-sm bg-[#5873F9]" />
                              {scheduleCount}
                            </span>
                          ) : null}

                          {devlogCount > 0 ? (
                            <span className="inline-flex h-[18px] items-center gap-1 rounded bg-purple-50 px-1.5 text-[10px] font-semibold text-purple-700">
                              <span className="h-1.5 w-1.5 rounded-sm bg-purple-500" />
                              {devlogCount}
                            </span>
                          ) : null}
                        </div>

                        <div className="flex gap-1 sm:hidden">
                          {scheduleCount > 0 ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-[#5873F9]" />
                          ) : null}

                          {devlogCount > 0 ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* =================================================
              SELECTED DATE
          ================================================= */}
          <aside className="flex min-h-0 flex-col border-t border-gray-100 bg-[#FAFBFF] lg:border-l lg:border-t-0">
            <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md border border-[#D9E1FF] bg-white">
                <span className="text-lg font-bold leading-none tabular-nums text-[#5873F9]">
                  {selectedDay?.dayNumber ?? "-"}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  선택한 날짜
                </p>

                <h3 className="mt-0.5 truncate text-sm font-bold text-gray-900">
                  {selectedDay
                    ? `${selectedDay.month}월 ${selectedDay.dayNumber}일 ${selectedDay.dayName}요일`
                    : selectedDateKey}
                </h3>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1 text-[11px]">
                <span className="inline-flex items-center gap-1 font-semibold text-[#4058D6]">
                  <span className="h-1.5 w-1.5 rounded-sm bg-[#5873F9]" />
                  일정 <span className="tabular-nums">{schedules.length}</span>
                </span>

                <span className="inline-flex items-center gap-1 font-semibold text-purple-700">
                  <span className="h-1.5 w-1.5 rounded-sm bg-purple-500" />
                  일지 <span className="tabular-nums">{devlogs.length}</span>
                </span>
              </div>
            </div>

            <div className="min-h-0 flex-1 px-5 py-4">
              {selectedItems.length === 0 ? (
                <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 text-center">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-gray-300">
                    <CalendarRange size={18} />
                  </span>

                  <p className="text-xs text-gray-400">
                    이 날짜에는 표시할 작업이 없습니다.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  <WorkFlowList
                    title="일정"
                    emptyText="등록된 일정이 없습니다."
                    items={visibleSchedules}
                  />

                  <WorkFlowList
                    title="개발일지"
                    emptyText="작성된 개발일지가 없습니다."
                    items={visibleDevlogs}
                  />

                  {hiddenCount > 0 ? (
                    <p className="text-[11px] text-gray-400">
                      외 {hiddenCount}개 더 있음
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
