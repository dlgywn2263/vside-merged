"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FilePenLine,
  Menu,
  ArrowRight,
  PanelRight,
  Plus,
  Search,
  Settings2,
} from "lucide-react";

import {
  calendarEventStyle,
  formatDateKey,
  getMonthGridDays,
  initialSchedules,
  scheduleStatusLabel,
  statusBadgeStyle,
  type ScheduleItem,
  type ScheduleStatus,
  weekLabels,
} from "@/components/schedules/scheduleMockData";

export default function ScheduleCalendarManageMock() {
  // =========================
  // 1. 기본 상태 관리
  // =========================
  const [schedules, setSchedules] = useState<ScheduleItem[]>(initialSchedules);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(
    initialSchedules[0]?.id ?? null,
  );
  const [query, setQuery] = useState("");
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(4);

  // =========================
  // 2. 검색 필터링
  // =========================
  const filteredSchedules = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return schedules.filter((item) => {
      if (!keyword) return true;

      return (
        item.title.toLowerCase().includes(keyword) ||
        item.description.toLowerCase().includes(keyword) ||
        item.category.toLowerCase().includes(keyword)
      );
    });
  }, [schedules, query]);

  // =========================
  // 3. 선택 일정 / 통계 계산
  // =========================
  const selectedSchedule =
    schedules.find((item) => item.id === selectedScheduleId) ?? null;

  const totalCount = schedules.length;
  const doneCount = schedules.filter((item) => item.status === "done").length;

  const progressRate =
    totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  const todayDate = "2026-05-01";

  const todayTodos = schedules.filter(
    (item) => item.date === todayDate && item.status !== "done",
  );

  const noDevlogSchedules = schedules.filter((item) => !item.hasDevlog);

  // =========================
  // 4. 월 이동 / 오늘 이동
  // =========================
  const moveMonth = (amount: number) => {
    const nextDate = new Date(currentYear, currentMonth + amount, 1);
    setCurrentYear(nextDate.getFullYear());
    setCurrentMonth(nextDate.getMonth());
  };

  const goToday = () => {
    setCurrentYear(2026);
    setCurrentMonth(4);
  };

  // =========================
  // 5. 일정 추가 / 상태 변경 / 날짜 이동
  // =========================
  const addMockSchedule = () => {
    const newItem: ScheduleItem = {
      id: `s${Date.now()}`,
      title: "새 작업 일정",
      description: "새로 추가된 프로젝트 작업입니다.",
      date: formatDateKey(currentYear, currentMonth, 1),
      status: "todo",
      category: "New",
      hasDevlog: false,
    };

    setSchedules((prev) => [newItem, ...prev]);
    setSelectedScheduleId(newItem.id);
  };

  const changeStatus = (id: string, status: ScheduleStatus) => {
    setSchedules((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item)),
    );
  };

  const moveScheduleDate = (id: string, nextDate: string) => {
    setSchedules((prev) =>
      prev.map((item) => (item.id === id ? { ...item, date: nextDate } : item)),
    );
  };

  const markDevlogWritten = (id: string) => {
    setSchedules((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, hasDevlog: true } : item,
      ),
    );
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* =========================
          전체 레이아웃
          - 왼쪽: 미니 캘린더 / 메뉴
          - 가운데: 월간 캘린더 + 선택 일정 상세
          - 오른쪽: 검색 / 진행률 / 오늘 할 일 / 일지 미작성 일정
      ========================= */}
      <div className="grid min-h-screen grid-cols-[240px_1fr_320px]">
        {/* =========================
            왼쪽 사이드바
        ========================= */}
        <aside className="border-r border-slate-200 bg-[#fbfbfa] p-4">
          <div className="mb-5 flex items-center justify-between">
            <Link
              href="/schedules"
              className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100"
              title="일정관리로 돌아가기"
            >
              <ArrowLeft size={17} />
            </Link>

            <div className="flex items-center gap-1">
              <button className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100">
                <Search size={16} />
              </button>
              <button className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100">
                <Settings2 size={16} />
              </button>
            </div>
          </div>

          <MiniCalendar
            currentYear={currentYear}
            currentMonth={currentMonth}
            schedules={schedules}
            onMoveMonth={moveMonth}
          />

          <div className="mt-6 space-y-2">
            <SidebarAction
              icon={<CalendarDays size={16} />}
              label="일정 잡기"
            />
            <SidebarAction icon={<Plus size={16} />} label="캘린더 계정 추가" />
          </div>

          <div className="mt-6 border-t border-slate-200 pt-5">
            <p className="mb-3 text-xs font-bold text-slate-400">
              프로젝트 캘린더
            </p>
            <CalendarCheckItem color="bg-blue-500" label="개인 일정" />
            <CalendarCheckItem color="bg-emerald-500" label="팀 일정" />
            <CalendarCheckItem color="bg-rose-500" label="지연 일정" />
          </div>

          <div className="mt-6 border-t border-slate-200 pt-5">
            <p className="mb-3 text-xs font-bold text-slate-400">
              워크스페이스
            </p>
            <SidebarAction icon={<Menu size={16} />} label="오늘 할 일 요약" />
            <SidebarAction
              icon={<Plus size={16} />}
              label="데이터베이스 추가"
            />
          </div>
        </aside>

        {/* =========================
            가운데 메인 영역
            - 캘린더 자체에는 내부 스크롤을 주지 않음
            - 선택 일정 상세는 캘린더 아래에 배치
        ========================= */}
        <main className="min-w-0 bg-white">
          {/* 상단 툴바 */}
          <div className="flex h-14 items-center justify-between border-b border-slate-200 px-5">
            <h1 className="text-xl font-bold">
              {currentYear}년 {currentMonth + 1}월
            </h1>

            <div className="flex items-center gap-2">
              <button
                onClick={addMockSchedule}
                className="flex h-8 items-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-bold text-white hover:bg-blue-700"
              >
                새로 만들기
                <ChevronDown size={14} />
              </button>

              <button className="h-8 rounded-lg border border-slate-200 px-3 text-sm font-semibold hover:bg-slate-50">
                월
              </button>

              <button
                onClick={goToday}
                className="h-8 rounded-lg border border-slate-200 px-3 text-sm font-semibold hover:bg-slate-50"
              >
                오늘
              </button>

              <button
                onClick={() => moveMonth(-1)}
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100"
              >
                <ChevronLeft size={17} />
              </button>

              <button
                onClick={() => moveMonth(1)}
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>

          {/* 월간 캘린더 */}
          <LargeMonthlyCalendar
            schedules={filteredSchedules}
            selectedScheduleId={selectedScheduleId}
            currentYear={currentYear}
            currentMonth={currentMonth}
            onSelectSchedule={setSelectedScheduleId}
            onMoveScheduleDate={moveScheduleDate}
          />

          {/* 캘린더 아래 선택 일정 상세 */}
          <SelectedScheduleBottomPanel
            selectedSchedule={selectedSchedule}
            onChangeStatus={changeStatus}
            onMarkDevlogWritten={markDevlogWritten}
          />
        </main>

        {/* =========================
            오른쪽 사이드바
            - 선택 일정은 제거
            - 검색, 진행률, 오늘 할 일, 일지 미작성 일정만 유지
        ========================= */}
        <aside className="border-l border-slate-200 bg-[#fbfbfa] p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="이벤트 검색"
                className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-400"
              />
            </div>

            <button className="ml-2 grid h-9 w-9 place-items-center rounded-xl hover:bg-slate-100">
              <PanelRight size={16} />
            </button>
          </div>

          <RightInfoPanel
            progressRate={progressRate}
            totalCount={totalCount}
            doneCount={doneCount}
            todayTodos={todayTodos}
            noDevlogSchedules={noDevlogSchedules}
            onSelectSchedule={setSelectedScheduleId}
            onMarkDevlogWritten={markDevlogWritten}
          />
        </aside>
      </div>
    </div>
  );
}

/* =========================
   월간 캘린더
   - 기존 h-[calc(...)] overflow-auto 제거
   - 내부 스크롤 없이 6주 전체가 자연스럽게 보이도록 구성
   - 일정 드래그로 날짜 이동 가능
========================= */
function LargeMonthlyCalendar({
  schedules,
  selectedScheduleId,
  currentYear,
  currentMonth,
  onSelectSchedule,
  onMoveScheduleDate,
}: {
  schedules: ScheduleItem[];
  selectedScheduleId: string | null;
  currentYear: number;
  currentMonth: number;
  onSelectSchedule: (id: string) => void;
  onMoveScheduleDate: (id: string, nextDate: string) => void;
}) {
  const days = getMonthGridDays(currentYear, currentMonth);

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>,
    nextDate: string,
  ) => {
    event.preventDefault();

    const scheduleId = event.dataTransfer.getData("scheduleId");
    if (!scheduleId) return;

    onMoveScheduleDate(scheduleId, nextDate);
  };

  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-white">
        {weekLabels.map((label) => (
          <div
            key={label}
            className="h-9 border-r border-slate-100 text-center text-sm font-semibold leading-9 text-slate-500 last:border-r-0"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const daySchedules = schedules.filter(
            (item) => item.date === day.key,
          );
          const isCurrentMonth = day.month === currentMonth;
          const isToday = day.key === "2026-05-01";

          return (
            <div
              key={day.key}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDrop(event, day.key)}
              className="min-h-[118px] border-r border-b border-slate-100 p-2 last:border-r-0"
            >
              <div className="mb-2 flex justify-end">
                <span
                  className={`grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs font-bold ${
                    isToday
                      ? "bg-red-500 text-white"
                      : isCurrentMonth
                        ? "text-slate-700"
                        : "text-slate-300"
                  }`}
                >
                  {isToday ? "5월 1" : day.date}
                </span>
              </div>

              <div className="flex min-w-0 flex-col gap-1">
                {daySchedules.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("scheduleId", item.id);
                    }}
                    onClick={() => onSelectSchedule(item.id)}
                    className={`min-w-0 cursor-grab truncate rounded-md border px-2 py-1 text-left text-xs font-bold active:cursor-grabbing ${
                      calendarEventStyle[item.status]
                    } ${
                      selectedScheduleId === item.id
                        ? "ring-2 ring-blue-300"
                        : ""
                    }`}
                    title={item.description}
                  >
                    {item.title}
                  </button>
                ))}

                {daySchedules.length > 3 && (
                  <p className="px-1 text-[11px] font-semibold text-slate-400">
                    +{daySchedules.length - 3}개 더 있음
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* =========================
   캘린더 아래 선택 일정 상세 패널
   - 오른쪽 aside에서 빼서 메인 아래로 이동
   - 일정 제목, 내용, 날짜, 분류, 상태, 개발일지 여부 표시
========================= */
function SelectedScheduleBottomPanel({
  selectedSchedule,
  onChangeStatus,
  onMarkDevlogWritten,
}: {
  selectedSchedule: ScheduleItem | null;
  onChangeStatus: (id: string, status: ScheduleStatus) => void;
  onMarkDevlogWritten: (id: string) => void;
}) {
  if (!selectedSchedule) {
    return (
      <section className="m-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5">
        <h2 className="text-lg font-bold">선택 일정</h2>
        <p className="mt-2 text-sm text-slate-500">
          캘린더에서 일정을 선택하면 이곳에 일정 상세 내용이 표시됩니다.
        </p>
      </section>
    );
  }

  return (
    <section className="m-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold text-blue-600">
            Selected Schedule
          </p>
          <h2 className="mt-1 text-xl font-black">{selectedSchedule.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            {selectedSchedule.description}
          </p>
        </div>

        <span
          className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${
            statusBadgeStyle[selectedSchedule.status]
          }`}
        >
          {scheduleStatusLabel[selectedSchedule.status]}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
        {/* 일정 내용 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-bold text-slate-700">작성한 일정 내용</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {selectedSchedule.description}
          </p>
        </div>

        {/* 일정 정보 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-bold text-slate-700">일정 정보</h3>

          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <InfoRow label="날짜" value={selectedSchedule.date} />
            <InfoRow label="분류" value={selectedSchedule.category} />
            <InfoRow
              label="상태"
              value={scheduleStatusLabel[selectedSchedule.status]}
            />
            <InfoRow
              label="개발일지"
              value={selectedSchedule.hasDevlog ? "작성됨" : "미작성"}
            />
          </div>
        </div>

        {/* 상태 변경 / 개발일지 연결 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-bold text-slate-700">상태 변경</h3>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            완료 상태로 변경하면 프로젝트 진행률에 반영됩니다.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => onChangeStatus(selectedSchedule.id, "progress")}
              className="h-9 rounded-xl bg-blue-50 text-xs font-bold text-blue-700 hover:bg-blue-100"
            >
              진행 중
            </button>
            <button
              onClick={() => onChangeStatus(selectedSchedule.id, "done")}
              className="h-9 rounded-xl bg-emerald-50 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
            >
              완료
            </button>
          </div>

          {selectedSchedule.hasDevlog ? (
            <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs font-semibold leading-5 text-emerald-700">
              개발일지가 작성된 일정입니다.
            </div>
          ) : (
            <button
              onClick={() => onMarkDevlogWritten(selectedSchedule.id)}
              className="mt-4 flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-blue-50 text-xs font-bold text-blue-700 hover:bg-blue-100"
            >
              <FilePenLine size={14} />
              개발일지 작성 처리
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

/* =========================
   오른쪽 정보 패널
   - 선택 일정 상세 제거
   - 진행률 / 오늘 할 일 / 일지 미작성 일정만 표시
========================= */
function RightInfoPanel({
  progressRate,
  totalCount,
  doneCount,
  todayTodos,
  noDevlogSchedules,
  onSelectSchedule,
  onMarkDevlogWritten,
}: {
  progressRate: number;
  totalCount: number;
  doneCount: number;
  todayTodos: ScheduleItem[];
  noDevlogSchedules: ScheduleItem[];
  onSelectSchedule: (id: string) => void;
  onMarkDevlogWritten: (id: string) => void;
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-bold">프로젝트 진행률</p>
        <p className="mt-1 text-xs text-slate-500">
          완료된 일정 {doneCount}개 / 전체 일정 {totalCount}개
        </p>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-blue-600"
            style={{ width: `${progressRate}%` }}
          />
        </div>

        <p className="mt-2 text-right text-sm font-bold text-blue-600">
          {progressRate}%
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-bold">오늘 할 일</p>

        <div className="mt-3 space-y-2">
          {todayTodos.length === 0 ? (
            <EmptyBox text="오늘 남은 일정 없음" />
          ) : (
            todayTodos.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelectSchedule(item.id)}
                className="w-full rounded-xl border border-slate-200 p-3 text-left hover:border-blue-300"
              >
                <p className="text-sm font-bold">{item.title}</p>
                <p className="mt-1 text-xs text-slate-500">{item.category}</p>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-bold">일지 미작성 일정</p>
        <p className="mt-1 text-xs text-slate-500">
          작업은 있지만 아직 수행 기록이 없는 일정입니다.
        </p>

        <div className="mt-3 space-y-2">
          {noDevlogSchedules.length === 0 ? (
            <EmptyBox text="모든 일정에 일지가 작성됨" />
          ) : (
            noDevlogSchedules.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 p-3"
              >
                <button
                  onClick={() => onSelectSchedule(item.id)}
                  className="block w-full text-left"
                >
                  <p className="text-sm font-bold">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.date}</p>
                </button>

                <button
                  onClick={() => onMarkDevlogWritten(item.id)}
                  className="mt-2 flex h-8 w-full items-center justify-center gap-1 rounded-lg bg-blue-50 text-xs font-bold text-blue-700 hover:bg-blue-100"
                >
                  <FilePenLine size={14} />
                  개발일지 작성 처리
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

/* =========================
   왼쪽 미니 캘린더
========================= */
function MiniCalendar({
  currentYear,
  currentMonth,
  schedules,
  onMoveMonth,
}: {
  currentYear: number;
  currentMonth: number;
  schedules: ScheduleItem[];
  onMoveMonth: (amount: number) => void;
}) {
  const days = getMonthGridDays(currentYear, currentMonth);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="font-bold">
          {currentYear}. {currentMonth + 1}
        </p>

        <div className="flex gap-1">
          <button
            onClick={() => onMoveMonth(-1)}
            className="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-100"
          >
            <ChevronLeft size={15} />
          </button>

          <button
            onClick={() => onMoveMonth(1)}
            className="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-100"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
        {weekLabels.map((label) => (
          <div key={label} className="py-1 text-slate-400">
            {label}
          </div>
        ))}

        {days.map((day) => {
          const hasSchedule = schedules.some((item) => item.date === day.key);
          const isCurrentMonth = day.month === currentMonth;
          const isToday = day.key === "2026-05-01";

          return (
            <div
              key={day.key}
              className={`relative grid h-7 place-items-center rounded-lg text-xs ${
                isToday
                  ? "bg-red-500 font-bold text-white"
                  : isCurrentMonth
                    ? "text-slate-700 hover:bg-slate-100"
                    : "text-slate-300"
              }`}
            >
              {day.date}
              {hasSchedule && !isToday && (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-blue-500" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================
   공통 UI 컴포넌트
========================= */
function SidebarAction({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
      <span className="text-slate-400">{icon}</span>
      {label}
    </button>
  );
}

function CalendarCheckItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm text-slate-600 hover:bg-slate-100">
      <span className={`h-3 w-3 rounded ${color}`} />
      <span>{label}</span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-400">{label}</span>
      <span className="text-right font-semibold text-slate-700">{value}</span>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}
