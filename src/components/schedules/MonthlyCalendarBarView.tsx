// "use client";

// import type React from "react";
// import { useMemo } from "react";

// import {
//   calendarEventStyle,
//   getMonthGridDays,
//   scheduleStatusLabel,
//   statusBadgeStyle,
//   type ScheduleItem,
//   weekLabels,
// } from "@/components/schedules/scheduleMockData";

// /* =========================
//    월간 캘린더 전용 타입
//    - page.tsx의 ProjectScheduleItem도 이 타입에 호환됨
// ========================= */
// export type MonthlyScheduleItem = ScheduleItem & {
//   projectName?: string;
//   customProjectName?: string;
//   startDate?: string;
//   endDate?: string;
// };

// type CalendarBarSegment = {
//   item: MonthlyScheduleItem;
//   lane: number;
// };

// /* =========================
//    날짜 / 일정 유틸
// ========================= */
// function getScheduleStartDate(schedule: MonthlyScheduleItem) {
//   return schedule.startDate ?? schedule.date;
// }

// function getScheduleEndDate(schedule: MonthlyScheduleItem) {
//   return schedule.endDate ?? schedule.date;
// }

// function getSchedulePeriodText(schedule: MonthlyScheduleItem) {
//   const startDate = getScheduleStartDate(schedule);
//   const endDate = getScheduleEndDate(schedule);

//   return startDate === endDate ? startDate : `${startDate} ~ ${endDate}`;
// }

// function isScheduleVisibleInRange(
//   schedule: MonthlyScheduleItem,
//   rangeStartKey: string,
//   rangeEndKey: string,
// ) {
//   const startDate = getScheduleStartDate(schedule);
//   const endDate = getScheduleEndDate(schedule);

//   return startDate <= rangeEndKey && endDate >= rangeStartKey;
// }

// function getScheduleProjectName(schedule: MonthlyScheduleItem) {
//   return (
//     schedule.customProjectName?.trim() ||
//     schedule.projectName?.trim() ||
//     "기존 프로젝트"
//   );
// }

// /* =========================
//    월간 바 형태 캘린더
//    - 월간 행 높이 고정
//    - 일정 바 absolute 배치
//    - 일정 이동 시 다른 일정이 밀리지 않음
//    - 바에는 제목 + 상태만 표시
// ========================= */
// export function MonthlyCalendarBarView({
//   schedules,
//   selectedScheduleId,
//   currentYear,
//   currentMonth,
//   todayDate,
//   onSelectSchedule,
//   onMoveScheduleDate,
// }: {
//   schedules: MonthlyScheduleItem[];
//   selectedScheduleId: string | null;
//   currentYear: number;
//   currentMonth: number;
//   todayDate: string;
//   onSelectSchedule: (id: string) => void;
//   onMoveScheduleDate: (id: string, nextDate: string) => void;
// }) {
//   const days = getMonthGridDays(currentYear, currentMonth);

//   const weeks = useMemo(() => {
//     const result: (typeof days)[] = [];

//     for (let index = 0; index < days.length; index += 7) {
//       result.push(days.slice(index, index + 7));
//     }

//     return result;
//   }, [days]);

//   const getDropDateFromPointer = (
//     event: React.DragEvent<HTMLDivElement>,
//     weekDays: typeof days,
//   ) => {
//     const rect = event.currentTarget.getBoundingClientRect();
//     const x = event.clientX - rect.left;
//     const columnWidth = rect.width / 7;

//     const columnIndex = Math.min(6, Math.max(0, Math.floor(x / columnWidth)));

//     return weekDays[columnIndex]?.key;
//   };

//   const handleWeekDrop = (
//     event: React.DragEvent<HTMLDivElement>,
//     weekDays: typeof days,
//   ) => {
//     event.preventDefault();

//     const scheduleId = event.dataTransfer.getData("scheduleId");
//     if (!scheduleId) return;

//     const nextDate = getDropDateFromPointer(event, weekDays);
//     if (!nextDate) return;

//     onMoveScheduleDate(scheduleId, nextDate);
//   };

//   const getBarPosition = (
//     schedule: MonthlyScheduleItem,
//     weekDays: typeof days,
//   ) => {
//     const startDate = getScheduleStartDate(schedule);
//     const endDate = getScheduleEndDate(schedule);

//     const startIndex = weekDays.findIndex((day) => day.key >= startDate);
//     const endIndexFromRight = [...weekDays]
//       .reverse()
//       .findIndex((day) => day.key <= endDate);

//     const safeStartIndex = startIndex === -1 ? 0 : startIndex;
//     const safeEndIndex = endIndexFromRight === -1 ? 6 : 6 - endIndexFromRight;

//     const columnCount = safeEndIndex - safeStartIndex + 1;

//     return {
//       left: `calc(${(safeStartIndex / 7) * 100}% + 7px)`,
//       width: `calc(${(columnCount / 7) * 100}% - 14px)`,
//     };
//   };

//   const buildSegments = (weekDays: typeof days) => {
//     const weekStartKey = weekDays[0]?.key ?? "";
//     const weekEndKey = weekDays[6]?.key ?? "";

//     const visibleSchedules = schedules
//       .filter((item) =>
//         isScheduleVisibleInRange(item, weekStartKey, weekEndKey),
//       )
//       .sort((a, b) => {
//         const startCompare = getScheduleStartDate(a).localeCompare(
//           getScheduleStartDate(b),
//         );

//         if (startCompare !== 0) return startCompare;

//         return a.title.localeCompare(b.title);
//       });

//     const lanes: MonthlyScheduleItem[][] = [];
//     const segments: CalendarBarSegment[] = [];

//     visibleSchedules.forEach((item) => {
//       const startDate = getScheduleStartDate(item);
//       const endDate = getScheduleEndDate(item);

//       const startIndex = weekDays.findIndex((day) => day.key >= startDate);
//       const endIndexFromRight = [...weekDays]
//         .reverse()
//         .findIndex((day) => day.key <= endDate);

//       const safeStartIndex = startIndex === -1 ? 0 : startIndex;
//       const safeEndIndex = endIndexFromRight === -1 ? 6 : 6 - endIndexFromRight;

//       let assignedLane = -1;

//       // 한 주 안에서 최대 3줄까지만 일정 바 표시
//       for (let laneIndex = 0; laneIndex < 3; laneIndex += 1) {
//         const laneItems = lanes[laneIndex] ?? [];

//         const hasConflict = laneItems.some((laneItem) => {
//           const laneStart = getScheduleStartDate(laneItem);
//           const laneEnd = getScheduleEndDate(laneItem);

//           const laneStartIndex = weekDays.findIndex(
//             (day) => day.key >= laneStart,
//           );
//           const laneEndIndexFromRight = [...weekDays]
//             .reverse()
//             .findIndex((day) => day.key <= laneEnd);

//           const safeLaneStartIndex = laneStartIndex === -1 ? 0 : laneStartIndex;
//           const safeLaneEndIndex =
//             laneEndIndexFromRight === -1 ? 6 : 6 - laneEndIndexFromRight;

//           return !(
//             safeEndIndex < safeLaneStartIndex ||
//             safeStartIndex > safeLaneEndIndex
//           );
//         });

//         if (!hasConflict) {
//           assignedLane = laneIndex;
//           lanes[laneIndex] = [...laneItems, item];
//           break;
//         }
//       }

//       if (assignedLane !== -1) {
//         segments.push({
//           item,
//           lane: assignedLane,
//         });
//       }
//     });

//     return {
//       segments,
//       hiddenCount: Math.max(0, visibleSchedules.length - segments.length),
//     };
//   };

//   return (
//     <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
//       {/* 요일 헤더 */}
//       <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
//         {weekLabels.map((label) => (
//           <div
//             key={label}
//             className="h-10 border-r border-slate-100 text-center text-sm font-bold leading-10 text-slate-500 last:border-r-0"
//           >
//             {label}
//           </div>
//         ))}
//       </div>

//       {/* 주 단위 행 */}
//       <div>
//         {weeks.map((weekDays, weekIndex) => {
//           const weekStartKey = weekDays[0]?.key ?? "";
//           const { segments, hiddenCount } = buildSegments(weekDays);

//           return (
//             <div
//               key={`${weekStartKey}-${weekIndex}`}
//               onDragOver={(event) => event.preventDefault()}
//               onDrop={(event) => handleWeekDrop(event, weekDays)}
//               className="relative h-[126px] border-b border-slate-100 last:border-b-0"
//             >
//               {/* 날짜 배경 칸 */}
//               <div className="absolute inset-0 grid grid-cols-7">
//                 {weekDays.map((day) => {
//                   const isCurrentMonth = day.month === currentMonth;
//                   const isToday = day.key === todayDate;

//                   return (
//                     <div
//                       key={day.key}
//                       className={`border-r border-slate-100 p-2 last:border-r-0 ${
//                         isToday ? "bg-blue-50/40" : "bg-white"
//                       }`}
//                     >
//                       <div className="flex justify-end">
//                         <span
//                           className={`grid h-7 min-w-7 place-items-center rounded-full px-1 text-xs font-black ${
//                             isToday
//                               ? "bg-blue-600 text-white"
//                               : isCurrentMonth
//                                 ? "text-slate-700"
//                                 : "text-slate-300"
//                           }`}
//                         >
//                           {day.date}
//                         </span>
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>

//               {/* 일정 바 */}
//               <div className="absolute inset-x-0 top-[42px] z-10 h-[70px]">
//                 {segments.map(({ item, lane }) => {
//                   const position = getBarPosition(item, weekDays);

//                   return (
//                     <button
//                       key={`${item.id}-${weekIndex}`}
//                       draggable
//                       onDragStart={(event) => {
//                         event.dataTransfer.setData("scheduleId", item.id);
//                       }}
//                       onClick={() => onSelectSchedule(item.id)}
//                       className={`absolute flex h-[18px] min-w-0 cursor-grab items-center justify-between gap-1 rounded-md border px-2 text-left text-[10px] font-bold shadow-sm transition hover:shadow-md active:cursor-grabbing ${
//                         calendarEventStyle[item.status]
//                       } ${
//                         selectedScheduleId === item.id
//                           ? "ring-2 ring-blue-300"
//                           : ""
//                       }`}
//                       style={{
//                         left: position.left,
//                         width: position.width,
//                         top: `${lane * 22}px`,
//                       }}
//                       title={`${item.title} · ${getScheduleProjectName(
//                         item,
//                       )} · ${getSchedulePeriodText(item)}`}
//                     >
//                       <span className="min-w-0 truncate">{item.title}</span>

//                       <span
//                         className={`shrink-0 rounded-full border px-1 py-0 text-[8px] font-black leading-3 ${
//                           statusBadgeStyle[item.status]
//                         }`}
//                       >
//                         {scheduleStatusLabel[item.status]}
//                       </span>
//                     </button>
//                   );
//                 })}
//               </div>

//               {/* 더보기 표시 */}
//               {hiddenCount > 0 && (
//                 <div className="pointer-events-none absolute bottom-2 left-3 z-10 rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-bold text-slate-400 shadow-sm">
//                   +{hiddenCount}개 더 있음
//                 </div>
//               )}
//             </div>
//           );
//         })}
//       </div>
//     </section>
//   );
// }
