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
    <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">이번 달 작업 흐름</h2>

          <p className="text-sm text-gray-500 mt-1">
            {isProjectMode
              ? `${projectName} 프로젝트의 이번 달 일정과 개발일지만 표시합니다.`
              : "이번 달 전체 워크스페이스의 일정과 개발일지를 최신순으로 확인하세요."}
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href={
              workspaceId ? getScheduleHref(workspaceId, mode) : "/schedule"
            }
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:border-[#5873F9] hover:text-[#5873F9] transition-colors"
          >
            일정관리
          </Link>

          <Link
            href={workspaceId ? getDevlogHref(workspaceId) : "/devlog"}
            className="rounded-xl bg-[#5873F9] px-3 py-2 text-xs font-semibold text-white hover:bg-[#4863E8] transition-colors"
          >
            개발일지
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="h-[420px] rounded-2xl border border-dashed border-gray-200 flex items-center justify-center text-sm text-gray-400">
          이번 달 작업 흐름을 불러오는 중입니다.
        </div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[1.35fr_1fr]">
          <div>
            <div className="mb-2 grid grid-cols-7 text-center text-[11px] font-bold text-gray-400">
              {["월", "화", "수", "목", "금", "토", "일"].map((dayName) => (
                <div key={dayName}>{dayName}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
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
                    className={`min-h-[82px] rounded-xl border p-2 text-left transition-all ${
                      active
                        ? "border-[#5873F9] bg-[#F7F9FF] shadow-sm"
                        : "border-gray-200 bg-white hover:border-[#5873F9]/50 hover:bg-gray-50"
                    } ${day.isCurrentMonth ? "" : "opacity-40"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm font-black ${
                          day.isToday ? "text-[#5873F9]" : "text-gray-900"
                        }`}
                      >
                        {day.dayNumber}
                      </span>

                      {day.isToday ? (
                        <span className="rounded-full bg-[#5873F9] px-1.5 py-0.5 text-[9px] font-bold text-white">
                          오늘
                        </span>
                      ) : null}
                    </div>

                    {hasItems ? (
                      <div className="mt-2 space-y-1">
                        {scheduleCount > 0 ? (
                          <div className="flex items-center justify-between rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-bold text-[#5873F9]">
                            <span>일정</span>
                            <span>{scheduleCount}</span>
                          </div>
                        ) : null}

                        {devlogCount > 0 ? (
                          <div className="flex items-center justify-between rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                            <span>일지</span>
                            <span>{devlogCount}</span>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-5 h-1.5 w-1.5 rounded-full bg-gray-200" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="rounded-2xl border border-gray-200 bg-[#FBFCFF] p-4 mt-6">
            <div className="mb-4">
              <p className="text-xs font-semibold text-[#5873F9]">
                선택한 날짜
              </p>

              <h3 className="mt-1 text-lg font-black text-gray-900">
                {selectedDay
                  ? `${selectedDay.month}월 ${selectedDay.dayNumber}일 ${selectedDay.dayName}요일`
                  : selectedDateKey}
              </h3>

              <p className="mt-1 text-xs text-gray-400">
                일정 {schedules.length}개 · 개발일지 {devlogs.length}개
              </p>
            </div>

            {selectedItems.length === 0 ? (
              <div className="flex min-h-[190px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white text-sm text-gray-400">
                이 날짜에는 표시할 작업이 없습니다.
              </div>
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
                  <div className="rounded-xl bg-white px-3 py-2 text-center text-xs font-semibold text-gray-500">
                    외 {hiddenCount}개 더 있음
                  </div>
                ) : null}
              </div>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
