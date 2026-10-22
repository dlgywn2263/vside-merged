"use client";

import Link from "next/link";

import { useMemo } from "react";

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

  return (
    <section className="rounded-md border border-gray-200 bg-white">
      {/* =====================================================
          HEADER
      ===================================================== */}
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h2 className="text-sm font-bold text-gray-900">
              이번 달 작업 흐름
            </h2>

            {isProjectMode ? (
              <span className="truncate text-xs text-gray-400">
                {projectName}
              </span>
            ) : null}
          </div>

          <p className="mt-1 text-xs text-gray-500">
            {isProjectMode
              ? "이번 달 일정과 개발일지를 날짜별로 확인하세요."
              : "이번 달 전체 워크스페이스의 일정과 개발일지를 확인하세요."}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="flex items-center gap-3 text-[11px] text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#5873F9]" />
              일정
            </span>

            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
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
                className="inline-flex h-8 items-center justify-center rounded-md border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 transition-colors hover:border-[#AAB8FF] hover:bg-[#F7F9FF] hover:text-[#5873F9]"
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
        <p className="flex h-[320px] items-center justify-center text-xs text-gray-400">
          이번 달 작업 흐름을 불러오는 중입니다.
        </p>
      ) : (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* =================================================
              CALENDAR
          ================================================= */}
          <div className="min-w-0 p-4 md:px-5">
            <div className="grid grid-cols-7 pb-1.5 text-[11px] font-semibold text-gray-400">
              {["월", "화", "수", "목", "금", "토", "일"].map((dayName) => (
                <div key={dayName} className="px-2">
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

                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => onSelectDate(day.key)}
                    aria-pressed={active}
                    className={`flex min-h-[76px] flex-col justify-between border-b border-r border-gray-200 px-2 py-1.5 text-left transition-colors ${
                      active
                        ? "bg-[#EEF2FF]"
                        : day.isCurrentMonth
                          ? "bg-white hover:bg-[#F7F9FF]"
                          : "bg-gray-50/70 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`grid h-5 min-w-5 place-items-center rounded px-1 text-xs font-bold tabular-nums ${
                          active
                            ? "bg-[#5873F9] text-white"
                            : day.isToday
                              ? "text-[#5873F9]"
                              : day.isCurrentMonth
                                ? "text-gray-800"
                                : "text-gray-300"
                        }`}
                      >
                        {day.dayNumber}
                      </span>

                      {day.isToday ? (
                        <span className="text-[10px] font-bold text-[#5873F9]">
                          오늘
                        </span>
                      ) : null}
                    </div>

                    <div
                      className={`space-y-0.5 text-[10px] font-semibold leading-tight ${
                        day.isCurrentMonth ? "" : "opacity-50"
                      }`}
                    >
                      {scheduleCount > 0 ? (
                        <p className="flex items-center gap-1 text-[#4058D6]">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#5873F9]" />
                          일정 {scheduleCount}
                        </p>
                      ) : null}

                      {devlogCount > 0 ? (
                        <p className="flex items-center gap-1 text-purple-600">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
                          일지 {devlogCount}
                        </p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* =================================================
              SELECTED DATE
          ================================================= */}
          <aside className="flex min-h-0 flex-col border-t border-gray-100 p-4 md:px-5 lg:border-l lg:border-t-0">
            <div className="flex items-start justify-between gap-2 pb-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-gray-400">
                  선택한 날짜
                </p>

                <h3 className="mt-0.5 truncate text-sm font-bold text-gray-900">
                  {selectedDay
                    ? `${selectedDay.month}월 ${selectedDay.dayNumber}일 ${selectedDay.dayName}요일`
                    : selectedDateKey}
                </h3>
              </div>

              <p className="shrink-0 pt-4 text-[11px] text-gray-500">
                일정{" "}
                <strong className="font-bold tabular-nums text-gray-900">
                  {schedules.length}
                </strong>
                <span className="mx-1.5 text-gray-300">·</span>
                일지{" "}
                <strong className="font-bold tabular-nums text-gray-900">
                  {devlogs.length}
                </strong>
              </p>
            </div>

            <div className="min-h-0 flex-1 border-t border-gray-100 pt-3">
              {selectedItems.length === 0 ? (
                <p className="py-10 text-center text-xs text-gray-400">
                  이 날짜에는 표시할 작업이 없습니다.
                </p>
              ) : (
                <div className="space-y-4">
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
                    <p className="text-xs text-gray-400">
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
