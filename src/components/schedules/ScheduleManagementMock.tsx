"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FilePenLine,
  LayoutGrid,
  ListTodo,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  Plus,
  Search,
} from "lucide-react";

import {
  boardColumnStyle,
  calendarEventStyle,
  formatDateKey,
  getWeekDays,
  initialSchedules,
  scheduleStatusLabel,
  statusBadgeStyle,
  type ScheduleItem,
  type ScheduleStatus,
  type ViewMode,
} from "@/components/schedules/scheduleMockData";

/* =========================
   1. 프로젝트 타입 / 더미 데이터
========================= */

type ProjectId = "all" | "p-devw" | "p-shop" | "p-ai";

type ProjectMode = "personal" | "team";

type ProjectItem = {
  id: ProjectId;
  name: string;
  description: string;
  colorClass: string;
  mode: "all" | ProjectMode;
};

type ProjectScheduleItem = ScheduleItem & {
  projectId: Exclude<ProjectId, "all">;
  workspaceId: ProjectMode;
};

const PROJECTS: ProjectItem[] = [
  {
    id: "all",
    name: "전체 프로젝트",
    description: "모든 프로젝트 일정",
    colorClass: "bg-slate-900",
    mode: "all",
  },
  {
    id: "p-devw",
    name: "Devw 캡스톤",
    description: "졸업작품 메인 프로젝트",
    colorClass: "bg-blue-500",
    mode: "team",
  },
  {
    id: "p-shop",
    name: "쇼핑몰 웹",
    description: "프론트/백엔드 연습 프로젝트",
    colorClass: "bg-emerald-500",
    mode: "personal",
  },
  {
    id: "p-ai",
    name: "AI 면접 분석",
    description: "AI 기능 실험 프로젝트",
    colorClass: "bg-violet-500",
    mode: "personal",
  },
];

const INITIAL_PROJECT_SCHEDULES: ProjectScheduleItem[] = initialSchedules.map(
  (item, index) => {
    const projectId: ProjectScheduleItem["projectId"] =
      index % 3 === 0 ? "p-devw" : index % 3 === 1 ? "p-shop" : "p-ai";

    return {
      ...item,
      projectId,
      workspaceId: projectId === "p-devw" ? "team" : "personal",
    };
  },
);

export default function ScheduleManagementMock() {
  /* =========================
     2. 기본 상태 관리
  ========================= */

  const [schedules, setSchedules] = useState<ProjectScheduleItem[]>(
    INITIAL_PROJECT_SCHEDULES,
  );

  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [query, setQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<ProjectId>("all");
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(
    INITIAL_PROJECT_SCHEDULES[0]?.id ?? null,
  );

  const [baseWeekDate, setBaseWeekDate] = useState(new Date(2026, 4, 1));

  // 노션식 사이드바 상태
  const [isLeftSidebarPinned, setIsLeftSidebarPinned] = useState(false);
  const [isSidebarHovering, setIsSidebarHovering] = useState(false);

  // 오른쪽 패널 수동 접기
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  const isFloatingSidebarVisible = !isLeftSidebarPinned && isSidebarHovering;

  /* =========================
     3. 프로젝트 필터 + 검색 필터
  ========================= */

  const filteredSchedules = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return schedules.filter((item) => {
      const matchesProject =
        selectedProjectId === "all" || item.projectId === selectedProjectId;

      const matchesKeyword =
        !keyword ||
        item.title.toLowerCase().includes(keyword) ||
        item.description.toLowerCase().includes(keyword) ||
        item.category.toLowerCase().includes(keyword);

      return matchesProject && matchesKeyword;
    });
  }, [schedules, query, selectedProjectId]);

  const selectedSchedule =
    filteredSchedules.find((item) => item.id === selectedScheduleId) ?? null;

  const selectedProject =
    PROJECTS.find((project) => project.id === selectedProjectId) ?? PROJECTS[0];

  /* =========================
     4. 통계 계산
  ========================= */

  const totalCount = filteredSchedules.length;
  const progressCount = filteredSchedules.filter(
    (item) => item.status === "progress",
  ).length;
  const doneCount = filteredSchedules.filter(
    (item) => item.status === "done",
  ).length;
  const delayedCount = filteredSchedules.filter(
    (item) => item.status === "delayed",
  ).length;

  const progressRate =
    totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  const todayDate = "2026-05-01";

  const todayTodos = filteredSchedules.filter(
    (item) => item.date === todayDate && item.status !== "done",
  );

  const noDevlogSchedules = filteredSchedules.filter((item) => !item.hasDevlog);

  const recentDoneSchedule =
    filteredSchedules.find((item) => item.status === "done") ?? null;

  const hasRightPanelContent =
    todayTodos.length > 0 || noDevlogSchedules.length > 0;

  const shouldShowRightSidebar = isRightSidebarOpen && hasRightPanelContent;

  /* =========================
     5. 일정 조작 함수
  ========================= */

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

  const addMockSchedule = () => {
    const targetProjectId: ProjectScheduleItem["projectId"] =
      selectedProjectId === "all" ? "p-devw" : selectedProjectId;

    const newItem: ProjectScheduleItem = {
      id: `s${Date.now()}`,
      title: "새 작업 일정",
      description: "새로 추가된 프로젝트 작업입니다.",
      date: formatDateKey(
        baseWeekDate.getFullYear(),
        baseWeekDate.getMonth(),
        baseWeekDate.getDate(),
      ),
      status: "todo",
      category: "New",
      hasDevlog: false,
      projectId: targetProjectId,
      workspaceId: targetProjectId === "p-devw" ? "team" : "personal",
    };

    setSchedules((prev) => [newItem, ...prev]);
    setSelectedScheduleId(newItem.id);
    setIsRightSidebarOpen(true);
  };

  /* =========================
     6. 주간 이동
  ========================= */

  const moveWeek = (amount: number) => {
    const nextDate = new Date(baseWeekDate);
    nextDate.setDate(baseWeekDate.getDate() + amount * 7);
    setBaseWeekDate(nextDate);
  };

  const goToday = () => {
    setBaseWeekDate(new Date(2026, 4, 1));
  };

  const weekDays = getWeekDays(baseWeekDate);
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];

  const handleSelectProject = (projectId: ProjectId) => {
    setSelectedProjectId(projectId);
    setSelectedScheduleId(null);
  };

  return (
    <div className="min-h-screen bg-[#f5f6fa] text-slate-900">
      {/* =========================
    8. 접힌 왼쪽 아이콘 바
    - 접힌 상태에서는 검색 아이콘을 표시하지 않음
    - Menu 아이콘과 프로젝트 색상 점만 표시
    - hover 시 플로팅 사이드바 표시
    - Menu 클릭 시 사이드바 고정
========================= */}
      {!isLeftSidebarPinned && (
        <div
          className="fixed left-0 top-[58px] z-50"
          onMouseEnter={() => setIsSidebarHovering(true)}
          onMouseLeave={() => setIsSidebarHovering(false)}
        >
          <div className="flex h-[calc(100vh-58px)]">
            <div className="w-[56px] border-r border-slate-200 bg-white">
              <button
                onClick={() => setIsLeftSidebarPinned(true)}
                className="mx-auto grid h-10 w-10 place-items-center rounded-xl hover:bg-slate-100 mt-4"
                title="사이드바 고정"
              >
                <Menu size={20} />
              </button>

              <div className="mx-auto mt-4 h-px w-8 bg-slate-200" />

              <div className="mt-4 flex flex-col items-center gap-3">
                {PROJECTS.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleSelectProject(project.id)}
                    className={`grid h-9 w-9 place-items-center rounded-xl border ${
                      selectedProjectId === project.id
                        ? "border-blue-300 bg-blue-50"
                        : "border-transparent hover:bg-slate-100"
                    }`}
                    title={project.name}
                  >
                    <span
                      className={`h-3 w-3 rounded-full ${project.colorClass}`}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================
          9. 전체 본문 레이아웃
          - 왼쪽 고정 사이드바가 열렸을 때만 260px 차지
          - 닫혀 있으면 중앙이 왼쪽 영역까지 차지
          - 오른쪽 패널도 내용 있을 때만 차지
      ========================= */}
      <div
        className={[
          "grid min-h-[calc(100vh-72px)] transition-all duration-300",
          isLeftSidebarPinned && shouldShowRightSidebar
            ? "grid-cols-[260px_minmax(0,1fr)_360px]"
            : isLeftSidebarPinned && !shouldShowRightSidebar
              ? "grid-cols-[260px_minmax(0,1fr)]"
              : !isLeftSidebarPinned && shouldShowRightSidebar
                ? "grid-cols-[minmax(0,1fr)_360px]"
                : "grid-cols-[minmax(0,1fr)]",
        ].join(" ")}
      >
        {/* =========================
            10. 고정된 왼쪽 사이드바
        ========================= */}
        {isLeftSidebarPinned && (
          <ProjectPinnedSidebar
            projects={PROJECTS}
            schedules={schedules}
            selectedProjectId={selectedProjectId}
            onSelectProject={handleSelectProject}
            onClose={() => setIsLeftSidebarPinned(false)}
          />
        )}

        {/* =========================
            11. 중앙 메인 영역
        ========================= */}
        <main
          className={`min-w-0 bg-[#f5f6fa] p-6 ${
            !isLeftSidebarPinned ? "pl-[88px]" : ""
          }`}
        >
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
              <div>
                <p className="text-sm font-bold text-blue-600">Schedule</p>
                {/* <h1 className="mt-1 text-2xl font-bold">일정관리</h1> */}
                <p className="mt-2 text-sm text-slate-500">
                  현재 보기:{" "}
                  <span className="font-bold text-xl text-slate-900">
                    {selectedProject.name}
                  </span>
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/schedules/calendar"
                  className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <CalendarDays size={17} />
                  캘린더에서 관리하기
                </Link>

                <button
                  onClick={addMockSchedule}
                  className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Plus size={17} />새 일정 추가
                </button>

                {hasRightPanelContent && (
                  <button
                    onClick={() => setIsRightSidebarOpen((prev) => !prev)}
                    className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    title="오른쪽 패널 접기/펼치기"
                  >
                    <PanelRightClose size={18} />
                  </button>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-5">
              <StatCard
                title="전체 일정"
                value={`${totalCount}개`}
                icon={<ListTodo size={20} />}
              />
              <StatCard
                title="진행 중"
                value={`${progressCount}개`}
                icon={<Clock size={20} />}
              />
              <StatCard
                title="완료"
                value={`${doneCount}개`}
                icon={<CheckCircle2 size={20} />}
              />
              <StatCard
                title="지연"
                value={`${delayedCount}개`}
                icon={<AlertTriangle size={20} />}
              />
              <StatCard
                title="진행률"
                value={`${progressRate}%`}
                icon={<LayoutGrid size={20} />}
                subText={`완료 ${doneCount} / 전체 ${totalCount}`}
              />
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
                <span>{selectedProject.name} 진행률</span>
                <span>
                  완료된 일정 {doneCount}개 / 전체 일정 {totalCount}개
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{ width: `${progressRate}%` }}
                />
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex rounded-2xl bg-slate-100 p-1">
                  <ViewButton
                    active={viewMode === "calendar"}
                    onClick={() => setViewMode("calendar")}
                    label="캘린더"
                  />
                  <ViewButton
                    active={viewMode === "board"}
                    onClick={() => setViewMode("board")}
                    label="보드"
                  />
                  <ViewButton
                    active={viewMode === "list"}
                    onClick={() => setViewMode("list")}
                    label="리스트"
                  />
                </div>

                {viewMode === "calendar" && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveWeek(-1)}
                      className="grid h-10 w-10 place-items-center rounded-xl hover:bg-slate-100"
                    >
                      <ChevronLeft size={18} />
                    </button>

                    <button
                      onClick={goToday}
                      className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold hover:bg-slate-50"
                    >
                      오늘
                    </button>

                    <button
                      onClick={() => moveWeek(1)}
                      className="grid h-10 w-10 place-items-center rounded-xl hover:bg-slate-100"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </div>

              <div className="relative w-full xl:w-[420px]">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="일정 검색"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-blue-400"
                />
              </div>
            </div>

            {viewMode === "calendar" && (
              <WeeklyCalendarView
                schedules={filteredSchedules}
                selectedScheduleId={selectedScheduleId}
                weekDays={weekDays}
                weekStartLabel={`${weekStart.month + 1}월 ${weekStart.date}일`}
                weekEndLabel={`${weekEnd.month + 1}월 ${weekEnd.date}일`}
                onSelect={setSelectedScheduleId}
                onMoveScheduleDate={moveScheduleDate}
              />
            )}

            {viewMode === "board" && (
              <HorizontalBoardView
                schedules={filteredSchedules}
                onSelect={setSelectedScheduleId}
                onChangeStatus={changeStatus}
              />
            )}

            {viewMode === "list" && (
              <ListView
                schedules={filteredSchedules}
                onSelect={setSelectedScheduleId}
                onChangeStatus={changeStatus}
              />
            )}

            <SelectedScheduleBottomPanel
              selectedSchedule={selectedSchedule}
              onChangeStatus={changeStatus}
              onMarkDevlogWritten={markDevlogWritten}
            />

            <ProgressRulePanel
              totalCount={totalCount}
              doneCount={doneCount}
              progressRate={progressRate}
              recentDoneSchedule={recentDoneSchedule}
              selectedProjectName={selectedProject.name}
            />
          </section>
        </main>

        {/* =========================
            12. 오른쪽 패널
        ========================= */}
        {shouldShowRightSidebar && (
          <RightAside
            todayTodos={todayTodos}
            noDevlogSchedules={noDevlogSchedules}
            onSelectSchedule={setSelectedScheduleId}
            onMarkDevlogWritten={markDevlogWritten}
            onClose={() => setIsRightSidebarOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

/* =========================
   13. 플로팅 사이드바
   - hover 시 뜨는 노션식 메뉴
========================= */

function ProjectFloatingSidebar({
  projects,
  schedules,
  selectedProjectId,
  onSelectProject,
  onPin,
}: {
  projects: ProjectItem[];
  schedules: ProjectScheduleItem[];
  selectedProjectId: ProjectId;
  onSelectProject: (projectId: ProjectId) => void;
  onPin: () => void;
}) {
  return (
    <aside className="w-[300px] border-r border-slate-200 bg-white shadow-2xl">
      <div className="h-[calc(100vh-72px)] overflow-y-auto p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-900">
              효주 이의 워크스페이스
            </p>
            <p className="text-xs text-slate-400">프로젝트 캘린더</p>
          </div>

          <button
            onClick={onPin}
            className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100"
            title="사이드바 고정"
          >
            <PanelLeftOpen size={17} />
          </button>
        </div>

        <SidebarProjectSections
          projects={projects}
          schedules={schedules}
          selectedProjectId={selectedProjectId}
          onSelectProject={onSelectProject}
        />
      </div>
    </aside>
  );
}

/* =========================
   14. 고정 사이드바
========================= */

function ProjectPinnedSidebar({
  projects,
  schedules,
  selectedProjectId,
  onSelectProject,
  onClose,
}: {
  projects: ProjectItem[];
  schedules: ProjectScheduleItem[];
  selectedProjectId: ProjectId;
  onSelectProject: (projectId: ProjectId) => void;
  onClose: () => void;
}) {
  return (
    <aside className="border-r border-slate-200 bg-white">
      <div className="sticky top-[72px] h-[calc(100vh-72px)] overflow-y-auto p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-900">
              효주 이의 워크스페이스
            </p>
            <p className="text-xs text-slate-400">프로젝트 캘린더</p>
          </div>

          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100"
            title="사이드바 접기"
          >
            <PanelLeftClose size={17} />
          </button>
        </div>

        <SidebarProjectSections
          projects={projects}
          schedules={schedules}
          selectedProjectId={selectedProjectId}
          onSelectProject={onSelectProject}
        />
      </div>
    </aside>
  );
}

/* =========================
   15. 개인 / 팀 프로젝트 분리 리스트
========================= */

function SidebarProjectSections({
  projects,
  schedules,
  selectedProjectId,
  onSelectProject,
}: {
  projects: ProjectItem[];
  schedules: ProjectScheduleItem[];
  selectedProjectId: ProjectId;
  onSelectProject: (projectId: ProjectId) => void;
}) {
  const allProject = projects.find((project) => project.id === "all");
  const personalProjects = projects.filter(
    (project) => project.mode === "personal",
  );
  const teamProjects = projects.filter((project) => project.mode === "team");

  return (
    <div>
      {allProject && (
        <div className="mb-4">
          <SidebarProjectRow
            project={allProject}
            schedules={schedules}
            selectedProjectId={selectedProjectId}
            onSelectProject={onSelectProject}
          />
        </div>
      )}

      <SidebarProjectGroup
        title="개인 프로젝트"
        projects={personalProjects}
        schedules={schedules}
        selectedProjectId={selectedProjectId}
        onSelectProject={onSelectProject}
      />

      <SidebarProjectGroup
        title="팀 프로젝트"
        projects={teamProjects}
        schedules={schedules}
        selectedProjectId={selectedProjectId}
        onSelectProject={onSelectProject}
      />

      <div className="mt-5 border-t border-slate-200 pt-4">
        <SidebarAction icon={<ListTodo size={16} />} label="오늘 할 일 요약" />
        <SidebarAction icon={<Plus size={16} />} label="프로젝트 추가" />
      </div>
    </div>
  );
}

function SidebarProjectGroup({
  title,
  projects,
  schedules,
  selectedProjectId,
  onSelectProject,
}: {
  title: string;
  projects: ProjectItem[];
  schedules: ProjectScheduleItem[];
  selectedProjectId: ProjectId;
  onSelectProject: (projectId: ProjectId) => void;
}) {
  return (
    <section className="mb-5">
      <p className="mb-2 px-2 text-xs font-bold text-slate-400">{title}</p>

      <div className="flex flex-col gap-1">
        {projects.map((project) => (
          <SidebarProjectRow
            key={project.id}
            project={project}
            schedules={schedules}
            selectedProjectId={selectedProjectId}
            onSelectProject={onSelectProject}
          />
        ))}
      </div>
    </section>
  );
}

function SidebarProjectRow({
  project,
  schedules,
  selectedProjectId,
  onSelectProject,
}: {
  project: ProjectItem;
  schedules: ProjectScheduleItem[];
  selectedProjectId: ProjectId;
  onSelectProject: (projectId: ProjectId) => void;
}) {
  const projectSchedules =
    project.id === "all"
      ? schedules
      : schedules.filter((item) => item.projectId === project.id);

  const total = projectSchedules.length;
  const done = projectSchedules.filter((item) => item.status === "done").length;
  const rate = total === 0 ? 0 : Math.round((done / total) * 100);
  const active = selectedProjectId === project.id;

  return (
    <button
      onClick={() => onSelectProject(project.id)}
      className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition ${
        active
          ? "bg-slate-100 text-slate-900"
          : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      <span className={`h-3 w-3 shrink-0 rounded ${project.colorClass}`} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold">{project.name}</p>
          <span className="shrink-0 text-xs font-semibold text-slate-400">
            {rate}%
          </span>
        </div>

        <p className="mt-0.5 truncate text-xs text-slate-400">
          일정 {total}개 · 완료 {done}개
        </p>
      </div>
    </button>
  );
}

/* =========================
   16. 주간 캘린더
========================= */

function WeeklyCalendarView({
  schedules,
  selectedScheduleId,
  weekDays,
  weekStartLabel,
  weekEndLabel,
  onSelect,
  onMoveScheduleDate,
}: {
  schedules: ProjectScheduleItem[];
  selectedScheduleId: string | null;
  weekDays: ReturnType<typeof getWeekDays>;
  weekStartLabel: string;
  weekEndLabel: string;
  onSelect: (id: string) => void;
  onMoveScheduleDate: (id: string, nextDate: string) => void;
}) {
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
    <div>
      <div className="mb-6 flex items-center gap-2">
        <CalendarDays size={20} className="text-slate-600" />
        <h2 className="text-lg font-bold">
          {weekStartLabel} - {weekEndLabel}
        </h2>
      </div>

      <div className="grid min-h-[500px] grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const daySchedules = schedules.filter(
            (item) => item.date === day.key,
          );
          const isToday = day.key === "2026-05-01";

          return (
            <div
              key={day.key}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDrop(event, day.key)}
              className={`min-w-0 rounded-[22px] border bg-slate-50 p-3 transition ${
                isToday ? "border-blue-300 bg-blue-50/30" : "border-slate-200"
              }`}
            >
              <div className="mb-5">
                <p className="text-sm font-semibold text-slate-500">
                  {day.label}
                </p>
                <p className="mt-1 text-xl font-black">{day.date}일</p>
              </div>

              <div className="flex min-w-0 flex-col gap-3">
                {daySchedules.length === 0 ? (
                  <p className="text-sm font-medium text-slate-400">
                    일정 없음
                  </p>
                ) : (
                  daySchedules.map((item) => {
                    const projectName =
                      PROJECTS.find((project) => project.id === item.projectId)
                        ?.name ?? "프로젝트 없음";

                    return (
                      <button
                        key={item.id}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData("scheduleId", item.id);
                        }}
                        onClick={() => onSelect(item.id)}
                        className={`w-full min-w-0 cursor-grab rounded-2xl border p-3 text-left active:cursor-grabbing ${
                          calendarEventStyle[item.status]
                        } ${
                          selectedScheduleId === item.id
                            ? "ring-2 ring-blue-300"
                            : ""
                        }`}
                      >
                        <p className="line-clamp-2 break-keep text-sm font-black leading-5">
                          {item.title}
                        </p>

                        <p className="mt-2 truncate text-[11px] font-semibold text-slate-400">
                          {projectName}
                        </p>

                        <span
                          className={`mt-3 inline-block max-w-full truncate rounded-full border px-2.5 py-1 text-xs font-bold ${
                            statusBadgeStyle[item.status]
                          }`}
                        >
                          {scheduleStatusLabel[item.status]}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-sm text-slate-500">
        일정 카드를 마우스로 잡고 다른 날짜 칸으로 끌어 옮기면 날짜가
        변경됩니다.
      </p>
    </div>
  );
}

/* =========================
   17. 선택 일정 상세
========================= */

function SelectedScheduleBottomPanel({
  selectedSchedule,
  onChangeStatus,
  onMarkDevlogWritten,
}: {
  selectedSchedule: ProjectScheduleItem | null;
  onChangeStatus: (id: string, status: ScheduleStatus) => void;
  onMarkDevlogWritten: (id: string) => void;
}) {
  if (!selectedSchedule) {
    return (
      <section className="mt-8 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-6">
        <h2 className="text-lg font-bold">선택한 일정</h2>
        <p className="mt-2 text-sm text-slate-500">
          캘린더, 보드, 리스트에서 일정을 선택하면 이곳에 상세 정보가
          표시됩니다.
        </p>
      </section>
    );
  }

  const projectName =
    PROJECTS.find((project) => project.id === selectedSchedule.projectId)
      ?.name ?? "프로젝트 없음";

  return (
    <section className="mt-8 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold text-blue-600">
            Selected Schedule
          </p>
          <h2 className="mt-1 text-xl font-black">{selectedSchedule.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
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
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-bold text-slate-700">일정 정보</h3>

          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <InfoRow label="프로젝트" value={projectName} />
            <InfoRow label="날짜" value={selectedSchedule.date} />
            <InfoRow label="분류" value={selectedSchedule.category} />
            <InfoRow
              label="개발일지"
              value={selectedSchedule.hasDevlog ? "작성됨" : "미작성"}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-bold text-slate-700">상태 변경</h3>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            상태를 완료로 변경하면 현재 프로젝트 진행률에 반영됩니다.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => onChangeStatus(selectedSchedule.id, "todo")}
              className="h-10 rounded-xl bg-slate-100 text-sm font-bold text-slate-700 hover:bg-slate-200"
            >
              할 일
            </button>
            <button
              onClick={() => onChangeStatus(selectedSchedule.id, "progress")}
              className="h-10 rounded-xl bg-blue-50 text-sm font-bold text-blue-700 hover:bg-blue-100"
            >
              진행 중
            </button>
            <button
              onClick={() => onChangeStatus(selectedSchedule.id, "done")}
              className="h-10 rounded-xl bg-emerald-50 text-sm font-bold text-emerald-700 hover:bg-emerald-100"
            >
              완료
            </button>
            <button
              onClick={() => onChangeStatus(selectedSchedule.id, "delayed")}
              className="h-10 rounded-xl bg-rose-50 text-sm font-bold text-rose-700 hover:bg-rose-100"
            >
              지연
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-bold text-slate-700">개발일지 연결</h3>

          {selectedSchedule.hasDevlog ? (
            <div className="mt-4 rounded-2xl bg-emerald-50 p-4">
              <p className="text-sm font-bold text-emerald-700">
                개발일지가 작성된 일정입니다.
              </p>
              <p className="mt-2 text-xs leading-5 text-emerald-700">
                이 일정은 수행 기록이 있으므로 진행 근거로 사용할 수 있습니다.
              </p>
            </div>
          ) : (
            <>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                아직 이 일정에 연결된 개발일지가 없습니다.
              </p>

              <button
                onClick={() => onMarkDevlogWritten(selectedSchedule.id)}
                className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-blue-50 text-sm font-bold text-blue-700 hover:bg-blue-100"
              >
                <FilePenLine size={16} />
                개발일지 작성 처리
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/* =========================
   18. 진행률 설명
========================= */

function ProgressRulePanel({
  totalCount,
  doneCount,
  progressRate,
  recentDoneSchedule,
  selectedProjectName,
}: {
  totalCount: number;
  doneCount: number;
  progressRate: number;
  recentDoneSchedule: ProjectScheduleItem | null;
  selectedProjectName: string;
}) {
  return (
    <section className="mt-5 rounded-[24px] border border-slate-200 bg-white p-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h2 className="text-lg font-bold">진행률 계산 기준</h2>
          <p className="mt-2 text-sm text-slate-500">
            현재 선택된 범위는{" "}
            <span className="font-bold text-slate-700">
              {selectedProjectName}
            </span>
            입니다. 진행률은 선택 범위 안의 완료 일정 수를 전체 일정 수로 나누어
            계산합니다.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 px-5 py-4 text-right">
          <p className="text-sm font-semibold text-slate-500">
            완료 {doneCount} / 전체 {totalCount}
          </p>
          <p className="mt-1 text-2xl font-black text-blue-600">
            {progressRate}%
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-bold text-slate-400">계산식</p>
          <p className="mt-2 text-sm font-bold text-slate-700">
            완료된 일정 수 / 전체 일정 수 × 100
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-bold text-slate-400">최근 완료</p>
          <p className="mt-2 text-sm font-bold text-slate-700">
            {recentDoneSchedule ? recentDoneSchedule.title : "완료된 일정 없음"}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-bold text-slate-400">일반 개발일지</p>
          <p className="mt-2 text-sm font-bold text-slate-700">
            진행률에는 미포함
          </p>
        </div>
      </div>
    </section>
  );
}

/* =========================
   19. 오른쪽 패널
========================= */

function RightAside({
  todayTodos,
  noDevlogSchedules,
  onSelectSchedule,
  onMarkDevlogWritten,
  onClose,
}: {
  todayTodos: ProjectScheduleItem[];
  noDevlogSchedules: ProjectScheduleItem[];
  onSelectSchedule: (id: string) => void;
  onMarkDevlogWritten: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <aside className="border-l border-slate-200 bg-[#fbfbfa] p-5">
      <div className="sticky top-[92px] flex max-h-[calc(100vh-112px)] flex-col gap-5 overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-slate-500">보조 패널</p>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl hover:bg-slate-100"
            title="오른쪽 패널 접기"
          >
            <PanelRightClose size={18} />
          </button>
        </div>

        {todayTodos.length > 0 && (
          <section className="rounded-[24px] border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold">오늘 할 일</h2>

            <div className="mt-4 flex flex-col gap-3">
              {todayTodos.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelectSchedule(item.id)}
                  className="rounded-2xl border border-slate-200 p-4 text-left hover:border-blue-300"
                >
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.date} · {item.category}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {noDevlogSchedules.length > 0 && (
          <section className="rounded-[24px] border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold">일지 미작성 일정</h2>
            <p className="mt-1 text-sm text-slate-500">
              작업은 있지만 아직 수행 기록이 없는 일정입니다.
            </p>

            <div className="mt-4 flex flex-col gap-4">
              {noDevlogSchedules.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <button
                    onClick={() => onSelectSchedule(item.id)}
                    className="block w-full text-left"
                  >
                    <p className="font-bold">{item.title}</p>
                    <p className="mt-2 text-sm text-slate-500">
                      {item.date} · {item.category}
                    </p>
                  </button>

                  <button
                    onClick={() => onMarkDevlogWritten(item.id)}
                    className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-2xl bg-blue-50 text-sm font-bold text-blue-700 hover:bg-blue-100"
                  >
                    <FilePenLine size={16} />
                    개발일지 작성 처리
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </aside>
  );
}

/* =========================
   20. 보드
========================= */

function HorizontalBoardView({
  schedules,
  onSelect,
  onChangeStatus,
}: {
  schedules: ProjectScheduleItem[];
  onSelect: (id: string) => void;
  onChangeStatus: (id: string, status: ScheduleStatus) => void;
}) {
  const columns: ScheduleStatus[] = ["todo", "progress", "done", "delayed"];

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>,
    nextStatus: ScheduleStatus,
  ) => {
    event.preventDefault();

    const scheduleId = event.dataTransfer.getData("scheduleId");
    if (!scheduleId) return;

    onChangeStatus(scheduleId, nextStatus);
  };

  return (
    <div className="overflow-x-auto pb-3">
      <div className="flex min-w-max gap-4">
        {columns.map((status) => {
          const items = schedules.filter((item) => item.status === status);

          return (
            <div
              key={status}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDrop(event, status)}
              className={`w-[320px] shrink-0 rounded-2xl border p-4 ${boardColumnStyle[status]}`}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-bold">{scheduleStatusLabel[status]}</h3>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                  {items.length}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {items.length === 0 ? (
                  <EmptyBox text="여기로 드래그 가능" />
                ) : (
                  items.map((item) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("scheduleId", item.id);
                      }}
                      onClick={() => onSelect(item.id)}
                      className="cursor-grab rounded-2xl border border-slate-200 bg-white p-4 hover:border-blue-300 active:cursor-grabbing"
                    >
                      <p className="text-sm font-bold">{item.title}</p>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                        {item.description}
                      </p>

                      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                        <span>{item.date}</span>
                        <span>{item.category}</span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-2 py-1 text-[11px] font-bold ${
                            statusBadgeStyle[item.status]
                          }`}
                        >
                          {scheduleStatusLabel[item.status]}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-sm text-slate-500">
        보드에서도 일정을 드래그해서 다른 상태 칸으로 옮길 수 있습니다.
      </p>
    </div>
  );
}

/* =========================
   21. 리스트
========================= */

function ListView({
  schedules,
  onSelect,
  onChangeStatus,
}: {
  schedules: ProjectScheduleItem[];
  onSelect: (id: string) => void;
  onChangeStatus: (id: string, status: ScheduleStatus) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">일정</th>
            <th className="px-4 py-3">프로젝트</th>
            <th className="px-4 py-3">날짜</th>
            <th className="px-4 py-3">분류</th>
            <th className="px-4 py-3">상태</th>
            <th className="px-4 py-3">일지</th>
            <th className="px-4 py-3">변경</th>
          </tr>
        </thead>

        <tbody>
          {schedules.map((item) => {
            const projectName =
              PROJECTS.find((project) => project.id === item.projectId)?.name ??
              "-";

            return (
              <tr
                key={item.id}
                onClick={() => onSelect(item.id)}
                className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
              >
                <td className="px-4 py-4">
                  <p className="font-bold">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.description}
                  </p>
                </td>

                <td className="px-4 py-4 text-slate-500">{projectName}</td>
                <td className="px-4 py-4 text-slate-500">{item.date}</td>
                <td className="px-4 py-4 text-slate-500">{item.category}</td>

                <td className="px-4 py-4">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${
                      statusBadgeStyle[item.status]
                    }`}
                  >
                    {scheduleStatusLabel[item.status]}
                  </span>
                </td>

                <td className="px-4 py-4 text-slate-500">
                  {item.hasDevlog ? "작성됨" : "미작성"}
                </td>

                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        onChangeStatus(item.id, "progress");
                      }}
                      className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700"
                    >
                      진행
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        onChangeStatus(item.id, "done");
                      }}
                      className="rounded-lg bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
                    >
                      완료
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}

          {schedules.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-10">
                <EmptyBox text="조건에 맞는 일정이 없습니다." />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* =========================
   22. 공통 UI
========================= */

function StatCard({
  title,
  value,
  icon,
  subText,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  subText?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className="text-slate-500">{icon}</div>
      </div>
      <p className="mt-3 text-2xl font-bold">{value}</p>
      {subText && <p className="mt-1 text-xs text-slate-500">{subText}</p>}
    </div>
  );
}

function ViewButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-5 py-2.5 text-sm font-bold ${
        active
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-500 hover:text-slate-900"
      }`}
    >
      {label}
    </button>
  );
}

function SidebarAction({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
      <span className="text-slate-400">{icon}</span>
      {label}
    </button>
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
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}
