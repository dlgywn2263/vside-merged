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
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="text-base font-black text-gray-900">
              이번 달 작업 흐름
            </h2>

            {isProjectMode ? (
              <span className="truncate text-[11px] font-semibold text-gray-400">
                {projectName}
              </span>
            ) : null}
          </div>

          <p className="mt-0.5 text-xs font-medium text-gray-400">
            {isProjectMode
              ? "이번 달 일정과 개발일지를 날짜별로 확인하세요."
              : "이번 달 전체 워크스페이스의 일정과 개발일지를 확인하세요."}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <Link
            href={
              workspaceId ? getScheduleHref(workspaceId, mode) : "/schedule"
            }
            className="inline-flex h-8 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-[11px] font-bold text-gray-600 transition-colors hover:border-[#5873F9] hover:bg-[#F7F9FF] hover:text-[#5873F9]"
          >
            일정관리
          </Link>

          <Link
            href={workspaceId ? getDevlogHref(workspaceId) : "/devlog"}
            className="inline-flex h-8 items-center justify-center rounded-lg bg-[#5873F9] px-3 text-[11px] font-bold text-white transition-colors hover:bg-[#4863E8]"
          >
            개발일지
          </Link>
        </div>
      </div>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      {isLoading ? (
        <div className="flex h-[320px] items-center justify-center rounded-xl border border-dashed border-gray-200 text-xs font-medium text-gray-400">
          이번 달 작업 흐름을 불러오는 중입니다.
        </div>
      ) : (
        <div className="grid items-stretch gap-3 lg:grid-cols-[1.45fr_0.85fr]">
          {/* =================================================
              CALENDAR
          ================================================= */}

          <div className="min-w-0">
            <div className="mb-1.5 grid grid-cols-7 text-center text-[10px] font-bold text-gray-400">
              {["월", "화", "수", "목", "금", "토", "일"].map((dayName) => (
                <div key={dayName} className="py-1">
                  {dayName}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
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
                    className={`group min-h-[68px] rounded-xl border px-2 py-1.5 text-left transition-all ${
                      active
                        ? "border-[#5873F9] bg-[#F7F9FF] shadow-sm"
                        : "border-gray-200 bg-white hover:border-[#BFCBFF] hover:bg-[#FBFCFF]"
                    } ${day.isCurrentMonth ? "" : "opacity-35"}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-[13px] font-black ${
                          day.isToday || active
                            ? "text-[#5873F9]"
                            : "text-gray-900"
                        }`}
                      >
                        {day.dayNumber}
                      </span>

                      {day.isToday ? (
                        <span className="rounded-full bg-[#5873F9] px-1.5 py-0.5 text-[8px] font-black leading-none text-white">
                          오늘
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-2 min-h-[18px]">
                      {hasItems ? (
                        <div className="flex flex-wrap items-center gap-1">
                          {scheduleCount > 0 ? (
                            <span className="inline-flex h-4 items-center rounded-full bg-[#EEF2FF] px-1.5 text-[8px] font-black text-[#5873F9]">
                              일정 {scheduleCount}
                            </span>
                          ) : null}

                          {devlogCount > 0 ? (
                            <span className="inline-flex h-4 items-center rounded-full bg-gray-100 px-1.5 text-[8px] font-black text-gray-500">
                              일지 {devlogCount}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="block h-1.5 w-1.5 rounded-full bg-gray-200 transition-colors group-hover:bg-gray-300" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* =================================================
              SELECTED DATE
          ================================================= */}

          <aside className="flex min-h-0 flex-col rounded-xl border border-gray-200 bg-[#FBFCFF] p-3.5">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-100 pb-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black text-[#5873F9]">
                  선택한 날짜
                </p>

                <h3 className="mt-0.5 truncate text-base font-black text-gray-900">
                  {selectedDay
                    ? `${selectedDay.month}월 ${selectedDay.dayNumber}일 ${selectedDay.dayName}요일`
                    : selectedDateKey}
                </h3>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <span className="rounded-full bg-[#EEF2FF] px-2 py-1 text-[9px] font-black text-[#5873F9]">
                  일정 {schedules.length}
                </span>

                <span className="rounded-full bg-gray-100 px-2 py-1 text-[9px] font-black text-gray-500">
                  일지 {devlogs.length}
                </span>
              </div>
            </div>

            <div className="mt-3 min-h-0 flex-1">
              {selectedItems.length === 0 ? (
                <div className="flex min-h-[150px] h-full items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white px-4 text-center text-xs font-medium text-gray-400">
                  이 날짜에는 표시할 작업이 없습니다.
                </div>
              ) : (
                <div className="space-y-3">
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
                    <div className="rounded-lg bg-white px-3 py-1.5 text-center text-[10px] font-bold text-gray-500">
                      외 {hiddenCount}개 더 있음
                    </div>
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
