// "use client";

// import { useMemo, useState } from "react";
// import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import type { ScheduleItem } from "./devlogWorkspaceView";

// type Props = {
//   schedules: ScheduleItem[];
// };

// const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

// function formatDateKey(date: Date) {
//   const year = date.getFullYear();
//   const month = String(date.getMonth() + 1).padStart(2, "0");
//   const day = String(date.getDate()).padStart(2, "0");
//   return `${year}-${month}-${day}`;
// }

// function formatDateTitle(dateStr: string) {
//   const [year, month, day] = dateStr.split("-");
//   return `${year}.${month}.${day} 일정`;
// }

// function monthLabel(date: Date) {
//   return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
// }

// function startOfMonth(date: Date) {
//   return new Date(date.getFullYear(), date.getMonth(), 1);
// }

// export function ScheduleCalendarPanel({ schedules }: Props) {
//   const today = new Date();
//   const todayKey = formatDateKey(today);

//   /**
//    * 오늘 일정이 있으면 오늘,
//    * 없으면 일정 첫 날짜,
//    * 그것도 없으면 오늘
//    */
//   const initialSelectedDate = useMemo(() => {
//     if (schedules.some((item) => item.date === todayKey)) {
//       return todayKey;
//     }

//     if (schedules.length > 0) {
//       return schedules[0].date;
//     }

//     return todayKey;
//   }, [schedules, todayKey]);

//   const initialMonth = useMemo(() => {
//     const [year, month] = initialSelectedDate.split("-");
//     return new Date(Number(year), Number(month) - 1, 1);
//   }, [initialSelectedDate]);

//   const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
//   const [currentMonth, setCurrentMonth] = useState(initialMonth);
//   const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(
//     null,
//   );

//   /**
//    * 현재 달력에 표시할 6주(42칸) 날짜 생성
//    */
//   const calendarDays = useMemo(() => {
//     const year = currentMonth.getFullYear();
//     const month = currentMonth.getMonth();

//     const firstDay = new Date(year, month, 1);
//     const firstWeekday = firstDay.getDay();

//     const gridStartDate = new Date(year, month, 1 - firstWeekday);

//     return Array.from({ length: 42 }, (_, index) => {
//       const date = new Date(gridStartDate);
//       date.setDate(gridStartDate.getDate() + index);
//       return date;
//     });
//   }, [currentMonth]);

//   /**
//    * 일정이 있는 날짜 표시용
//    */
//   const scheduleDateSet = useMemo(() => {
//     return new Set(schedules.map((item) => item.date));
//   }, [schedules]);

//   /**
//    * 선택한 날짜의 일정 목록
//    */
//   const selectedDateSchedules = useMemo(() => {
//     return schedules
//       .filter((item) => item.date === selectedDate)
//       .sort((a, b) => {
//         const aStart = a.startTime ?? "";
//         const bStart = b.startTime ?? "";
//         return aStart.localeCompare(bStart);
//       });
//   }, [schedules, selectedDate]);

//   /**
//    * 현재 선택된 일정 상세
//    */
//   const selectedSchedule = useMemo(() => {
//     if (selectedDateSchedules.length === 0) return null;

//     if (selectedScheduleId == null) {
//       return selectedDateSchedules[0];
//     }

//     return (
//       selectedDateSchedules.find((item) => item.id === selectedScheduleId) ??
//       selectedDateSchedules[0]
//     );
//   }, [selectedDateSchedules, selectedScheduleId]);

//   /**
//    * 날짜 바꾸면 해당 날짜 첫 일정 자동 선택
//    */
//   function handleSelectDate(dateKey: string, dateObj: Date) {
//     setSelectedDate(dateKey);
//     setCurrentMonth(startOfMonth(dateObj));

//     const schedulesOnDate = schedules
//       .filter((item) => item.date === dateKey)
//       .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));

//     if (schedulesOnDate.length > 0) {
//       setSelectedScheduleId(schedulesOnDate[0].id);
//     } else {
//       setSelectedScheduleId(null);
//     }
//   }

//   return (
//     <Card className="h-full rounded-2xl">
//       <CardHeader className="flex flex-row items-center justify-between space-y-0">
//         <CardTitle className="text-3xl font-bold">일정관리</CardTitle>
//         <CalendarDays className="h-5 w-5 text-muted-foreground" />
//       </CardHeader>

//       <CardContent className="space-y-6">
//         {/* 캘린더 */}
//         <div className="rounded-3xl bg-muted/40 p-5">
//           <div className="mb-6 flex items-center justify-between">
//             <button
//               type="button"
//               onClick={() =>
//                 setCurrentMonth(
//                   new Date(
//                     currentMonth.getFullYear(),
//                     currentMonth.getMonth() - 1,
//                     1,
//                   ),
//                 )
//               }
//               className="rounded-full p-2 transition hover:bg-background"
//             >
//               <ChevronLeft className="h-5 w-5" />
//             </button>

//             <div className="text-lg font-semibold">
//               {monthLabel(currentMonth)}
//             </div>

//             <button
//               type="button"
//               onClick={() =>
//                 setCurrentMonth(
//                   new Date(
//                     currentMonth.getFullYear(),
//                     currentMonth.getMonth() + 1,
//                     1,
//                   ),
//                 )
//               }
//               className="rounded-full p-2 transition hover:bg-background"
//             >
//               <ChevronRight className="h-5 w-5" />
//             </button>
//           </div>

//           <div className="mb-3 grid grid-cols-7 text-center text-sm text-muted-foreground">
//             {DAY_LABELS.map((label) => (
//               <div key={label}>{label}</div>
//             ))}
//           </div>

//           <div className="grid grid-cols-7 gap-y-3 text-center">
//             {calendarDays.map((date) => {
//               const dateKey = formatDateKey(date);
//               const isCurrentMonth =
//                 date.getMonth() === currentMonth.getMonth();
//               const isSelected = dateKey === selectedDate;
//               const hasSchedule = scheduleDateSet.has(dateKey);

//               return (
//                 <button
//                   key={dateKey}
//                   type="button"
//                   onClick={() => handleSelectDate(dateKey, date)}
//                   className="flex justify-center"
//                 >
//                   <div
//                     className={[
//                       "relative flex h-10 w-10 items-center justify-center rounded-full text-sm transition",
//                       isSelected
//                         ? "bg-slate-900 text-white"
//                         : isCurrentMonth
//                           ? "text-foreground hover:bg-background"
//                           : "text-muted-foreground/40 hover:bg-background",
//                     ].join(" ")}
//                   >
//                     {date.getDate()}

//                     {hasSchedule && !isSelected && (
//                       <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-slate-500" />
//                     )}
//                   </div>
//                 </button>
//               );
//             })}
//           </div>
//         </div>

//         {/* 선택 날짜 일정 목록 */}
//         <div className="space-y-3">
//           <h3 className="text-xl font-semibold">
//             {formatDateTitle(selectedDate)}
//           </h3>

//           {selectedDateSchedules.length === 0 ? (
//             <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
//               선택한 날짜의 일정이 없습니다.
//             </div>
//           ) : (
//             <div className="space-y-3">
//               {selectedDateSchedules.map((schedule) => {
//                 const isActive = selectedSchedule?.id === schedule.id;

//                 return (
//                   <button
//                     key={schedule.id}
//                     type="button"
//                     onClick={() => setSelectedScheduleId(schedule.id)}
//                     className={[
//                       "w-full rounded-2xl border p-4 text-left transition",
//                       isActive
//                         ? "border-slate-900 bg-slate-50"
//                         : "border-slate-200 bg-white hover:bg-muted/30",
//                     ].join(" ")}
//                   >
//                     <div className="flex items-start justify-between gap-3">
//                       <div className="min-w-0">
//                         <div className="font-semibold">{schedule.title}</div>
//                         <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">
//                           {schedule.content || "일정 내용이 없습니다."}
//                         </div>
//                       </div>

//                       {(schedule.startTime || schedule.endTime) && (
//                         <div className="shrink-0 text-sm text-muted-foreground">
//                           {schedule.startTime || "--:--"} ~{" "}
//                           {schedule.endTime || "--:--"}
//                         </div>
//                       )}
//                     </div>
//                   </button>
//                 );
//               })}
//             </div>
//           )}
//         </div>

//         {/* 선택한 일정 상세 */}
//         <div className="space-y-3">
//           <h3 className="text-lg font-semibold">선택한 일정 내용</h3>

//           {!selectedSchedule ? (
//             <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
//               선택된 일정이 없습니다.
//             </div>
//           ) : (
//             <div className="rounded-2xl border bg-white p-5">
//               <div className="space-y-3">
//                 <div>
//                   <div className="text-xs text-muted-foreground">제목</div>
//                   <div className="mt-1 font-semibold">
//                     {selectedSchedule.title}
//                   </div>
//                 </div>

//                 <div>
//                   <div className="text-xs text-muted-foreground">날짜</div>
//                   <div className="mt-1">{selectedSchedule.date}</div>
//                 </div>

//                 <div>
//                   <div className="text-xs text-muted-foreground">시간</div>
//                   <div className="mt-1">
//                     {selectedSchedule.startTime || "--:--"} ~{" "}
//                     {selectedSchedule.endTime || "--:--"}
//                   </div>
//                 </div>

//                 <div>
//                   <div className="text-xs text-muted-foreground">내용</div>
//                   <div className="mt-1 whitespace-pre-wrap text-sm leading-6">
//                     {selectedSchedule.content || "일정 내용이 없습니다."}
//                   </div>
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>
//       </CardContent>
//     </Card>
//   );
// }
