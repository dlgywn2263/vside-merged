"use client";

import { useMemo, useState } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  FileText,
  Link2,
  ListTodo,
  Menu,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";

type ScheduleStatus = "todo" | "progress" | "done" | "delayed";
type DevlogType = "linked" | "general";
type DevlogFilter = "all" | "linked" | "general" | "progress" | "done";
type ProjectMode = "personal" | "team";
type ProjectId = "all" | "p-devw" | "p-shop" | "p-ai";

type ProjectItem = {
  id: ProjectId;
  name: string;
  description: string;
  colorClass: string;
  mode: "all" | ProjectMode;
};

type ScheduleOption = {
  id: string;
  title: string;
  status: ScheduleStatus;
  projectId: Exclude<ProjectId, "all">;
  workspaceId: ProjectMode;
};

type DevlogItem = {
  id: string;
  title: string;
  content: string;
  date: string;
  type: DevlogType;
  scheduleId: string | null;
  scheduleTitle: string | null;
  status: ScheduleStatus | null;
  tags: string[];
  projectId: Exclude<ProjectId, "all">;
  workspaceId: ProjectMode;
};

const PROJECTS: ProjectItem[] = [
  {
    id: "all",
    name: "전체 프로젝트",
    description: "모든 프로젝트 일지",
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

const scheduleStatusLabel: Record<ScheduleStatus, string> = {
  todo: "할 일",
  progress: "진행 중",
  done: "완료",
  delayed: "지연",
};

const statusStyle: Record<ScheduleStatus, string> = {
  todo: "bg-slate-100 text-slate-700 border-slate-200",
  progress: "bg-blue-50 text-blue-700 border-blue-200",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  delayed: "bg-rose-50 text-rose-700 border-rose-200",
};

const initialSchedules: ScheduleOption[] = [
  {
    id: "s1",
    title: "로그인 API 구현",
    status: "done",
    projectId: "p-devw",
    workspaceId: "team",
  },
  {
    id: "s2",
    title: "프로젝트 생성 UI 수정",
    status: "progress",
    projectId: "p-devw",
    workspaceId: "team",
  },
  {
    id: "s3",
    title: "GitHub 브랜치 연동",
    status: "todo",
    projectId: "p-shop",
    workspaceId: "personal",
  },
  {
    id: "s4",
    title: "일정 진행률 계산 로직 정리",
    status: "delayed",
    projectId: "p-ai",
    workspaceId: "personal",
  },
];

const initialDevlogs: DevlogItem[] = [
  {
    id: "d1",
    title: "로그인 API 오류 수정",
    content:
      "JWT 인증 필터에서 Authorization 헤더가 누락되었을 때 object Object 오류가 발생하는 문제를 확인했다. 예외 메시지를 문자열로 변환하고, 토큰 검증 실패 시 명확한 에러를 반환하도록 수정했다.",
    date: "2026-05-01",
    type: "linked",
    scheduleId: "s1",
    scheduleTitle: "로그인 API 구현",
    status: "done",
    tags: ["Backend", "Spring Security", "JWT"],
    projectId: "p-devw",
    workspaceId: "team",
  },
  {
    id: "d2",
    title: "프로젝트 생성 화면 레이아웃 개선",
    content:
      "프로젝트 생성 버튼이 상단에서 따로 떠 보이는 문제가 있어 필터 영역과 함께 배치했다. 개인 프로젝트는 blue, 팀 프로젝트는 green 계열로 구분했다.",
    date: "2026-04-30",
    type: "linked",
    scheduleId: "s2",
    scheduleTitle: "프로젝트 생성 UI 수정",
    status: "progress",
    tags: ["Frontend", "UI", "Tailwind"],
    projectId: "p-devw",
    workspaceId: "team",
  },
  {
    id: "d3",
    title: "Next 개발 환경 오류 정리",
    content:
      "개발 중 왼쪽 하단에 나타나는 Next overlay 오류 원인을 확인했다. Promise reject 값이 객체로 전달되는 케이스를 문자열 에러로 바꾸는 방식으로 정리했다.",
    date: "2026-04-29",
    type: "general",
    scheduleId: null,
    scheduleTitle: null,
    status: null,
    tags: ["Next.js", "Debug", "Error"],
    projectId: "p-shop",
    workspaceId: "personal",
  },
];

export default function DevlogManagementMock() {
  const [schedules, setSchedules] =
    useState<ScheduleOption[]>(initialSchedules);
  const [devlogs, setDevlogs] = useState<DevlogItem[]>(initialDevlogs);
  const [selectedDevlogId, setSelectedDevlogId] = useState<string>(
    initialDevlogs[0]?.id ?? "",
  );
  const [selectedProjectId, setSelectedProjectId] = useState<ProjectId>("all");
  const [filter, setFilter] = useState<DevlogFilter>("all");
  const [query, setQuery] = useState("");

  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formScheduleId, setFormScheduleId] = useState("");
  const [formStatusChange, setFormStatusChange] = useState<
    "none" | "progress" | "done"
  >("none");

  // 일정관리 화면과 동일한 노션식 왼쪽 사이드바 상태
  const [isLeftSidebarPinned, setIsLeftSidebarPinned] = useState(false);
  const [isSidebarHovering, setIsSidebarHovering] = useState(false);
  const isFloatingSidebarVisible = !isLeftSidebarPinned && isSidebarHovering;

  const selectedProject =
    PROJECTS.find((project) => project.id === selectedProjectId) ?? PROJECTS[0];

  const visibleSchedules = useMemo(() => {
    return schedules.filter((schedule) => {
      if (selectedProjectId === "all") return true;
      return schedule.projectId === selectedProjectId;
    });
  }, [schedules, selectedProjectId]);

  const filteredDevlogs = useMemo(() => {
    return devlogs.filter((item) => {
      const matchesProject =
        selectedProjectId === "all" || item.projectId === selectedProjectId;

      const matchesFilter =
        filter === "all" || item.type === filter || item.status === filter;

      const keyword = query.trim().toLowerCase();

      const matchesQuery =
        !keyword ||
        item.title.toLowerCase().includes(keyword) ||
        item.content.toLowerCase().includes(keyword) ||
        item.tags.some((tag) => tag.toLowerCase().includes(keyword)) ||
        item.scheduleTitle?.toLowerCase().includes(keyword);

      return matchesProject && matchesFilter && matchesQuery;
    });
  }, [devlogs, filter, query, selectedProjectId]);

  const selectedDevlog =
    filteredDevlogs.find((item) => item.id === selectedDevlogId) ??
    filteredDevlogs[0] ??
    null;

  const totalDevlogs = filteredDevlogs.length;
  const linkedDevlogs = filteredDevlogs.filter(
    (item) => item.type === "linked",
  ).length;
  const generalDevlogs = filteredDevlogs.filter(
    (item) => item.type === "general",
  ).length;
  const weeklyDevlogs = filteredDevlogs.filter(
    (item) => item.date >= "2026-04-27",
  ).length;

  const doneLinkedSchedules = filteredDevlogs.filter(
    (item) => item.type === "linked" && item.status === "done",
  ).length;

  const handleSelectProject = (projectId: ProjectId) => {
    setSelectedProjectId(projectId);
    setSelectedDevlogId("");
    setFormScheduleId("");
  };

  const createDevlog = () => {
    if (!formTitle.trim() || !formContent.trim()) return;

    const linkedSchedule =
      schedules.find((item) => item.id === formScheduleId) ?? null;

    const fallbackProjectId: Exclude<ProjectId, "all"> =
      selectedProjectId === "all" ? "p-devw" : selectedProjectId;

    const nextProjectId = linkedSchedule?.projectId ?? fallbackProjectId;
    const nextWorkspaceId =
      linkedSchedule?.workspaceId ??
      (nextProjectId === "p-devw" ? "team" : "personal");

    const nextStatus =
      linkedSchedule && formStatusChange !== "none"
        ? formStatusChange
        : (linkedSchedule?.status ?? null);

    const newDevlog: DevlogItem = {
      id: `d${Date.now()}`,
      title: formTitle,
      content: formContent,
      date: "2026-05-01",
      type: linkedSchedule ? "linked" : "general",
      scheduleId: linkedSchedule?.id ?? null,
      scheduleTitle: linkedSchedule?.title ?? null,
      status: nextStatus,
      tags: linkedSchedule
        ? ["Schedule", scheduleStatusLabel[nextStatus as ScheduleStatus]]
        : ["General", "Memo"],
      projectId: nextProjectId,
      workspaceId: nextWorkspaceId,
    };

    setDevlogs((prev) => [newDevlog, ...prev]);
    setSelectedDevlogId(newDevlog.id);

    if (linkedSchedule && formStatusChange !== "none") {
      setSchedules((prev) =>
        prev.map((item) =>
          item.id === linkedSchedule.id
            ? { ...item, status: formStatusChange }
            : item,
        ),
      );
    }

    setFormTitle("");
    setFormContent("");
    setFormScheduleId("");
    setFormStatusChange("none");
  };

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-900">
      {/* =========================
          7. 접힌 상태의 왼쪽 아이콘 바
          - 접힌 상태에서는 메뉴 아이콘과 프로젝트 색상 점만 표시
          - 검색 아이콘은 여기서 제거
          - 메뉴 영역에 마우스를 올리면 플로팅 사이드바 표시
          - 메뉴 아이콘 클릭 시 사이드바 고정
      ========================= */}
      {!isLeftSidebarPinned && (
        <div
          className="fixed left-0 top-[58px] z-50"
          onMouseEnter={() => setIsSidebarHovering(true)}
          onMouseLeave={() => setIsSidebarHovering(false)}
        >
          <div className="flex h-[calc(100vh-50px)]">
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

            {isFloatingSidebarVisible && (
              <ProjectFloatingSidebar
                projects={PROJECTS}
                devlogs={devlogs}
                selectedProjectId={selectedProjectId}
                onSelectProject={handleSelectProject}
                onPin={() => setIsLeftSidebarPinned(true)}
              />
            )}
          </div>
        </div>
      )}

      <div
        className={[
          "grid min-h-screen transition-all duration-300",
          isLeftSidebarPinned
            ? "grid-cols-[260px_minmax(0,1fr)]"
            : "grid-cols-[minmax(0,1fr)]",
        ].join(" ")}
      >
        {/* 고정된 왼쪽 사이드바 */}
        {isLeftSidebarPinned && (
          <ProjectPinnedSidebar
            projects={PROJECTS}
            devlogs={devlogs}
            selectedProjectId={selectedProjectId}
            onSelectProject={handleSelectProject}
            onClose={() => setIsLeftSidebarPinned(false)}
          />
        )}

        <main
          className={`min-w-0 p-6 ${!isLeftSidebarPinned ? "pl-[88px]" : ""}`}
        >
          <div className="mx-auto flex max-w-[1480px] flex-col gap-6">
            <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div>
                  <p className="text-sm font-bold text-blue-600">Devlog</p>
                  {/* <h1 className="mt-1 text-2xl font-bold">개발일지</h1> */}
                  <p className="mt-2 text-sm text-slate-500">
                    프로젝트:{" "}
                    <span className="font-bold text-xl text-slate-900">
                      {selectedProject.name}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    일정에 연결된 일지는 작업 진행 근거로, 일반 일지는 회고와
                    오류 해결 기록으로 관리합니다.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const form = document.getElementById("devlog-write-form");
                    form?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }}
                  className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700"
                >
                  <Plus size={17} />새 개발일지 작성
                </button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-4">
                <StatCard
                  title="전체 일지"
                  value={`${totalDevlogs}개`}
                  icon={<FileText size={20} />}
                />
                <StatCard
                  title="일정 연결 일지"
                  value={`${linkedDevlogs}개`}
                  icon={<Link2 size={20} />}
                />
                <StatCard
                  title="일반 일지"
                  value={`${generalDevlogs}개`}
                  icon={<NotebookPen size={20} />}
                />
                <StatCard
                  title="이번 주 작성"
                  value={`${weeklyDevlogs}개`}
                  icon={<CalendarCheck size={20} />}
                  subText={`완료 처리 ${doneLinkedSchedules}개`}
                />
              </div>
            </header>

            {/* =========================
                중앙 디자인 변경
                - 기존 3열 구조 제거
                - 상단: 목록 + 상세 2열
                - 하단: 작성 폼을 넓게 배치
            ========================= */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-xl font-bold">개발일지 목록</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    프로젝트, 일정 연결 여부, 진행 상태 기준으로 일지를
                    확인합니다.
                  </p>
                </div>

                <div className="relative w-full xl:w-[420px]">
                  <Search
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="제목, 내용, 태그, 연결 일정 검색"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <FilterButton
                  active={filter === "all"}
                  label="전체"
                  onClick={() => setFilter("all")}
                />
                <FilterButton
                  active={filter === "linked"}
                  label="일정 연결"
                  onClick={() => setFilter("linked")}
                />
                <FilterButton
                  active={filter === "general"}
                  label="일반 일지"
                  onClick={() => setFilter("general")}
                />
                <FilterButton
                  active={filter === "progress"}
                  label="진행 중"
                  onClick={() => setFilter("progress")}
                />
                <FilterButton
                  active={filter === "done"}
                  label="완료"
                  onClick={() => setFilter("done")}
                />
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
                <DevlogListPanel
                  filteredDevlogs={filteredDevlogs}
                  selectedDevlog={selectedDevlog}
                  onSelectDevlog={setSelectedDevlogId}
                />

                <DevlogDetailPanel selectedDevlog={selectedDevlog} />
              </div>
            </section>

            <section
              id="devlog-write-form"
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">개발일지 작성하기</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    선택한 프로젝트 기준으로 작성하고, 필요한 경우 일정 상태를
                    함께 변경합니다.
                  </p>
                </div>
                <Plus size={20} className="text-slate-400" />
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div>
                    <label className="text-sm font-bold text-slate-700">
                      프로젝트
                    </label>
                    <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700">
                      {selectedProject.name}
                    </div>
                  </div>

                  <div className="mt-5">
                    <label className="text-sm font-bold text-slate-700">
                      연결할 일정
                    </label>
                    <select
                      value={formScheduleId}
                      onChange={(e) => setFormScheduleId(e.target.value)}
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-400"
                    >
                      <option value="">연결 없이 일반 일지 작성</option>
                      {visibleSchedules.map((schedule) => (
                        <option key={schedule.id} value={schedule.id}>
                          {schedule.title} ·{" "}
                          {scheduleStatusLabel[schedule.status]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-5">
                    <label className="text-sm font-bold text-slate-700">
                      진행 상태 변경
                    </label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <StatusOptionButton
                        active={formStatusChange === "none"}
                        label="변경 없음"
                        onClick={() => setFormStatusChange("none")}
                      />
                      <StatusOptionButton
                        active={formStatusChange === "progress"}
                        label="진행 중"
                        onClick={() => setFormStatusChange("progress")}
                      />
                      <StatusOptionButton
                        active={formStatusChange === "done"}
                        label="완료"
                        onClick={() => setFormStatusChange("done")}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-5">
                  <div>
                    <label className="text-sm font-bold text-slate-700">
                      제목
                    </label>
                    <input
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="예: 로그인 API 오류 수정"
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-400"
                    />
                  </div>

                  <div className="mt-5">
                    <label className="text-sm font-bold text-slate-700">
                      내용
                    </label>
                    <textarea
                      value={formContent}
                      onChange={(e) => setFormContent(e.target.value)}
                      placeholder="오늘 수행한 작업, 오류 원인, 해결 방법 등을 작성하세요."
                      className="mt-2 h-44 w-full resize-none rounded-2xl border border-slate-200 p-4 text-sm leading-6 outline-none focus:border-blue-400"
                    />
                  </div>

                  <button
                    onClick={createDevlog}
                    className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-700"
                  >
                    <NotebookPen size={18} />
                    개발일지 저장
                  </button>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function DevlogListPanel({
  filteredDevlogs,
  selectedDevlog,
  onSelectDevlog,
}: {
  filteredDevlogs: DevlogItem[];
  selectedDevlog: DevlogItem | null;
  onSelectDevlog: (id: string) => void;
}) {
  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-3">
        {filteredDevlogs.length === 0 ? (
          <EmptyBox text="조건에 맞는 개발일지가 없습니다." />
        ) : (
          filteredDevlogs.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectDevlog(item.id)}
              className={`rounded-2xl border p-5 text-left transition hover:border-blue-300 ${
                selectedDevlog?.id === item.id
                  ? "border-blue-300 bg-blue-50/40"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate font-bold">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {getProjectName(item.projectId)} · {item.date}
                  </p>
                </div>

                {item.status && (
                  <span
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${statusStyle[item.status]}`}
                  >
                    {scheduleStatusLabel[item.status]}
                  </span>
                )}
              </div>

              <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
                {item.content}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {item.type === "linked" ? (
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    연결 일정: {item.scheduleTitle}
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    일반 개발일지
                  </span>
                )}

                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/* =========================
   13. 플로팅 프로젝트 사이드바
   - 메뉴 아이콘 hover 시 나타나는 임시 사이드바
   - 검색 아이콘은 이 영역에만 표시
   - 고정 버튼을 누르면 왼쪽에 고정됨
========================= */
function ProjectFloatingSidebar({
  projects,
  devlogs,
  selectedProjectId,
  onSelectProject,
  onPin,
}: {
  projects: ProjectItem[];
  devlogs: DevlogItem[];
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
            <p className="text-xs text-slate-400">프로젝트 개발일지</p>
          </div>

          <div className="flex items-center gap-1">
            <button
              className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100"
              title="프로젝트 검색"
            >
              <Search size={16} />
            </button>

            <button
              onClick={onPin}
              className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100"
              title="사이드바 고정"
            >
              <PanelLeftOpen size={17} />
            </button>
          </div>
        </div>

        <SidebarProjectSections
          projects={projects}
          devlogs={devlogs}
          selectedProjectId={selectedProjectId}
          onSelectProject={onSelectProject}
        />
      </div>
    </aside>
  );
}

/* =========================
   14. 고정 프로젝트 사이드바
   - 메뉴 아이콘 클릭 후 고정된 사이드바
   - 검색 아이콘은 이 영역에만 표시
   - 닫기 버튼을 누르면 다시 접힌 아이콘 바 상태로 돌아감
========================= */
function ProjectPinnedSidebar({
  projects,
  devlogs,
  selectedProjectId,
  onSelectProject,
  onClose,
}: {
  projects: ProjectItem[];
  devlogs: DevlogItem[];
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
            <p className="text-xs text-slate-400">프로젝트 개발일지</p>
          </div>

          <div className="flex items-center gap-1">
            <button
              className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100"
              title="프로젝트 검색"
            >
              <Search size={16} />
            </button>

            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100"
              title="사이드바 접기"
            >
              <PanelLeftClose size={17} />
            </button>
          </div>
        </div>

        <SidebarProjectSections
          projects={projects}
          devlogs={devlogs}
          selectedProjectId={selectedProjectId}
          onSelectProject={onSelectProject}
        />
      </div>
    </aside>
  );
}

function SidebarProjectSections({
  projects,
  devlogs,
  selectedProjectId,
  onSelectProject,
}: {
  projects: ProjectItem[];
  devlogs: DevlogItem[];
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
            devlogs={devlogs}
            selectedProjectId={selectedProjectId}
            onSelectProject={onSelectProject}
          />
        </div>
      )}

      <SidebarProjectGroup
        title="개인 프로젝트"
        projects={personalProjects}
        devlogs={devlogs}
        selectedProjectId={selectedProjectId}
        onSelectProject={onSelectProject}
      />

      <SidebarProjectGroup
        title="팀 프로젝트"
        projects={teamProjects}
        devlogs={devlogs}
        selectedProjectId={selectedProjectId}
        onSelectProject={onSelectProject}
      />

      <div className="mt-5 border-t border-slate-200 pt-4">
        <SidebarAction icon={<ListTodo size={16} />} label="최근 작성 일지" />
        <SidebarAction icon={<Plus size={16} />} label="프로젝트 추가" />
      </div>
    </div>
  );
}

function SidebarProjectGroup({
  title,
  projects,
  devlogs,
  selectedProjectId,
  onSelectProject,
}: {
  title: string;
  projects: ProjectItem[];
  devlogs: DevlogItem[];
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
            devlogs={devlogs}
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
  devlogs,
  selectedProjectId,
  onSelectProject,
}: {
  project: ProjectItem;
  devlogs: DevlogItem[];
  selectedProjectId: ProjectId;
  onSelectProject: (projectId: ProjectId) => void;
}) {
  const projectDevlogs =
    project.id === "all"
      ? devlogs
      : devlogs.filter((item) => item.projectId === project.id);

  const total = projectDevlogs.length;
  const linked = projectDevlogs.filter((item) => item.type === "linked").length;
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
            {total}
          </span>
        </div>

        <p className="mt-0.5 truncate text-xs text-slate-400">
          연결 {linked}개 · 일반 {total - linked}개
        </p>
      </div>
    </button>
  );
}

function DevlogDetailPanel({
  selectedDevlog,
}: {
  selectedDevlog: DevlogItem | null;
}) {
  return (
    <aside className="h-fit rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">상세 보기</h2>
        <Sparkles size={20} className="text-blue-500" />
      </div>

      {!selectedDevlog ? (
        <EmptyBox text="선택한 개발일지가 없습니다." />
      ) : (
        <div className="mt-5">
          <p className="text-sm font-semibold text-blue-600">
            {getProjectName(selectedDevlog.projectId)}
          </p>
          <h3 className="mt-1 text-xl font-black leading-8">
            {selectedDevlog.title}
          </h3>
          <p className="mt-2 text-sm text-slate-500">{selectedDevlog.date}</p>

          <div className="mt-5 rounded-2xl bg-white p-4">
            <p className="text-sm font-bold text-slate-700">연결 일정</p>
            <p className="mt-2 text-sm text-slate-500">
              {selectedDevlog.scheduleTitle ?? "연결 없이 작성된 일반 일지"}
            </p>
          </div>

          {selectedDevlog.status && (
            <span
              className={`mt-4 inline-block rounded-full border px-3 py-1 text-xs font-bold ${statusStyle[selectedDevlog.status]}`}
            >
              {scheduleStatusLabel[selectedDevlog.status]}
            </span>
          )}

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-bold text-slate-700">작성 내용</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
              {selectedDevlog.content}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {selectedDevlog.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

function getProjectName(projectId: ProjectId | Exclude<ProjectId, "all">) {
  return (
    PROJECTS.find((project) => project.id === projectId)?.name ??
    "프로젝트 없음"
  );
}

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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className="text-slate-500">{icon}</div>
      </div>
      <p className="mt-3 text-2xl font-bold">{value}</p>
      {subText && <p className="mt-1 text-xs text-slate-500">{subText}</p>}
    </div>
  );
}

function FilterButton({
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
      className={`rounded-full px-4 py-2 text-sm font-bold ${
        active
          ? "bg-blue-600 text-white"
          : "bg-slate-100 text-slate-500 hover:text-slate-900"
      }`}
    >
      {label}
    </button>
  );
}

function StatusOptionButton({
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
      type="button"
      onClick={onClick}
      className={`h-10 rounded-xl text-xs font-bold ${
        active
          ? "bg-blue-600 text-white"
          : "bg-white text-slate-500 hover:text-slate-900"
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

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}
