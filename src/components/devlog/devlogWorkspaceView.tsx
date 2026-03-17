"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

const API_BASE = "http://localhost:8080";
const USER_ID = "user-001";

type StageType = "planning" | "implementation" | "wrapup";

type DevlogItem = {
  id: number;
  workspaceId: string;
  projectId: number;
  projectTitle: string;
  title: string;
  summary: string;
  content: string;
  date: string;
  tags: string[];
  stage: StageType;
  goal?: string;
  issue?: string;
  solution?: string;
  nextPlan?: string;
  commitHash?: string;
  progress?: number;
};

type ApiDevlogResponse = {
  id: number | string;
  workspaceId?: string;
  projectId?: number | string;
  title: string;
  summary: string;
  content: string;
  date: string;
  tags?: string[];
  stage?: StageType;
  goal?: string;
  issue?: string;
  solution?: string;
  nextPlan?: string;
  commitHash?: string;
  progress?: number;
};

type ApiProjectDevlogGroupResponse = {
  projectId?: number | string;
  id?: number | string;
  projectTitle?: string;
  name?: string;
  posts: ApiDevlogResponse[];
};
type ApiWorkspaceDetailResponse = {
  uuid: string;
  name: string;
  mode: "personal" | "team";
  teamName: string | null;
  projects: ApiProjectDevlogGroupResponse[];
};

type FormValue = {
  projectId: string;
  title: string;
  summary: string;
  content: string;
  date: string;
  tagsText: string;
  stage: StageType;
  goal: string;
  issue: string;
  solution: string;
  nextPlan: string;
  commitHash: string;
  progress: string;
};

const stageMeta: Record<StageType, { label: string; description: string }> = {
  planning: {
    label: "기획",
    description: "요구사항 정리, 설계, 구조화",
  },
  implementation: {
    label: "구현",
    description: "기능 개발, 테스트, 적용",
  },
  wrapup: {
    label: "마무리",
    description: "리팩토링, 문서화, 점검",
  },
};

const emptyForm: FormValue = {
  projectId: "",
  title: "",
  summary: "",
  content: "",
  date: todayYmd(),
  tagsText: "",
  stage: "planning",
  goal: "",
  issue: "",
  solution: "",
  nextPlan: "",
  commitHash: "",
  progress: "0",
};

export function DevlogWorkspaceView({ workspaceId }: { workspaceId: string }) {
  const [workspaceName, setWorkspaceName] = useState("프로젝트 관리");
  const [workspaceModeLabel, setWorkspaceModeLabel] = useState("워크스페이스");

  const [logs, setLogs] = useState<DevlogItem[]>([]);
  const [projects, setProjects] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedStage, setSelectedStage] = useState<StageType | "all">("all");
  const [selectedTag, setSelectedTag] = useState("all");
  const [sort, setSort] = useState<"latest" | "oldest">("latest");

  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(todayYmd());

  const [detailTarget, setDetailTarget] = useState<DevlogItem | null>(null);
  const [editingTarget, setEditingTarget] = useState<DevlogItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<FormValue>(emptyForm);

  useEffect(() => {
    if (!workspaceId) return;
    loadWorkspace();
  }, [workspaceId]);

  async function loadWorkspace() {
    setLoading(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/devlogs/workspaces/${workspaceId}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            "X-USER-ID": USER_ID,
          },
        },
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error("워크스페이스 개발일지 조회 실패", {
          status: res.status,
          body: errorText,
        });
        throw new Error(`워크스페이스 개발일지 조회 실패 (${res.status})`);
      }

      const data: ApiWorkspaceDetailResponse = await res.json();
      console.log("개발일지 조회 응답", data);

      setWorkspaceName(data.name);
      setWorkspaceModeLabel(
        data.mode === "team"
          ? data.teamName || "팀 워크스페이스"
          : "개인 워크스페이스",
      );

      const mappedProjects = (data.projects ?? [])
        .map((project, index) => {
          const rawId = project.projectId ?? project.id;
          const numericProjectId = Number(rawId);

          return {
            id: numericProjectId,
            name:
              project.projectTitle ?? project.name ?? `프로젝트 ${index + 1}`,
          };
        })
        .filter((project) => !Number.isNaN(project.id) && project.id > 0);

      setProjects(mappedProjects);

      const flattenedLogs: DevlogItem[] = (data.projects ?? []).flatMap(
        (project) => {
          const rawProjectId = project.projectId ?? project.id;
          const numericProjectId = Number(rawProjectId);

          return (project.posts ?? []).map((post) => ({
            id: Number(post.id),
            workspaceId: data.uuid,
            projectId: Number.isNaN(numericProjectId) ? -1 : numericProjectId,
            projectTitle: project.projectTitle ?? project.name ?? "프로젝트",
            title: post.title ?? "",
            summary: post.summary ?? "",
            content: post.content ?? "",
            date: normalizeDate(post.date),
            tags: post.tags ?? [],
            stage:
              post.stage ??
              inferStage(post.title ?? "", post.summary ?? "", post.tags ?? []),
            goal: post.goal ?? "",
            issue: post.issue ?? "",
            solution: post.solution ?? "",
            nextPlan: post.nextPlan ?? "",
            commitHash: post.commitHash ?? "",
            progress: post.progress ?? 0,
          }));
        },
      );

      setLogs(flattenedLogs);

      const today = todayYmd();
      const hasToday = flattenedLogs.some((item) => item.date === today);

      if (hasToday) {
        setSelectedDate(today);
      } else if (flattenedLogs.length > 0) {
        setSelectedDate(flattenedLogs[0].date);
      } else {
        setSelectedDate(today);
      }
    } catch (error) {
      console.error("loadWorkspace error:", error);
      alert("개발일지 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    logs.forEach((log) => {
      log.tags.forEach((tag) => tagSet.add(tag));
    });
    return ["all", ...Array.from(tagSet)];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const next = logs.filter((log) => {
      const text = [
        log.title,
        log.summary,
        log.content,
        log.projectTitle,
        log.goal ?? "",
        log.issue ?? "",
        log.solution ?? "",
        log.nextPlan ?? "",
        ...(log.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();

      const matchesKeyword = !keyword || text.includes(keyword);
      const matchesStage =
        selectedStage === "all" || log.stage === selectedStage;
      const matchesTag =
        selectedTag === "all" || log.tags.includes(selectedTag);

      return matchesKeyword && matchesStage && matchesTag;
    });

    next.sort((a, b) => {
      return sort === "latest"
        ? b.date.localeCompare(a.date)
        : a.date.localeCompare(b.date);
    });

    return next;
  }, [logs, search, selectedStage, selectedTag, sort]);

  const logsByStage = useMemo(() => {
    return {
      planning: filteredLogs.filter((log) => log.stage === "planning"),
      implementation: filteredLogs.filter(
        (log) => log.stage === "implementation",
      ),
      wrapup: filteredLogs.filter((log) => log.stage === "wrapup"),
    };
  }, [filteredLogs]);

  const selectedDateLogs = useMemo(() => {
    return filteredLogs.filter((log) => log.date === selectedDate);
  }, [filteredLogs, selectedDate]);

  const markedDates = useMemo(() => {
    return new Set(filteredLogs.map((item) => item.date));
  }, [filteredLogs]);

  const monthGrid = useMemo(() => {
    return buildCalendarGrid(calendarMonth);
  }, [calendarMonth]);

  function openCreateModal(defaultStage?: StageType) {
    setEditingTarget(null);
    setForm({
      ...emptyForm,
      projectId: projects[0]?.id ? String(projects[0].id) : "",
      date: selectedDate || todayYmd(),
      stage: defaultStage ?? "planning",
    });
    setIsCreateOpen(true);
  }

  function openEditModal(item: DevlogItem) {
    setIsCreateOpen(false);
    setEditingTarget(item);
    setForm({
      projectId: String(item.projectId),
      title: item.title,
      summary: item.summary,
      content: item.content,
      date: item.date,
      tagsText: item.tags.join(", "),
      stage: item.stage,
      goal: item.goal ?? "",
      issue: item.issue ?? "",
      solution: item.solution ?? "",
      nextPlan: item.nextPlan ?? "",
      commitHash: item.commitHash ?? "",
      progress: String(item.progress ?? 0),
    });
  }

  function closeFormModal() {
    setIsCreateOpen(false);
    setEditingTarget(null);
    setForm(emptyForm);
  }

  async function handleSubmit() {
    const payload = {
      workspaceId,
      projectId: Number(form.projectId),
      title: form.title.trim(),
      summary: form.summary.trim(),
      content: form.content.trim(),
      date: form.date,
      tags: form.tagsText
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
      stage: form.stage,
      goal: form.goal.trim(),
      issue: form.issue.trim(),
      solution: form.solution.trim(),
      nextPlan: form.nextPlan.trim(),
      commitHash: form.commitHash.trim(),
      progress: Number(form.progress || 0),
    };

    if (
      !payload.workspaceId ||
      !payload.projectId ||
      !payload.title ||
      !payload.content
    ) {
      alert("워크스페이스, 프로젝트, 제목, 상세 내용은 필수입니다.");
      return;
    }

    try {
      if (editingTarget) {
        const res = await fetch(`${API_BASE}/api/devlogs/${editingTarget.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-USER-ID": USER_ID,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error("개발일지 수정 실패", {
            status: res.status,
            body: errorText,
          });
          throw new Error(`수정 실패 (${res.status})`);
        }
      } else {
        const res = await fetch(`${API_BASE}/api/devlogs`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-USER-ID": USER_ID,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error("개발일지 생성 실패", {
            status: res.status,
            body: errorText,
          });
          throw new Error(`생성 실패 (${res.status})`);
        }
      }

      await loadWorkspace();
      closeFormModal();
    } catch (error) {
      console.error("handleSubmit error:", error);
      alert("저장 중 오류가 발생했습니다.");
    }
  }

  async function handleDelete(id: number, projectId: number) {
    const ok = window.confirm("이 개발일지를 삭제할까요?");
    if (!ok) return;

    try {
      const query = new URLSearchParams({
        workspaceId,
        projectId: String(projectId),
      });

      const res = await fetch(
        `${API_BASE}/api/devlogs/${id}?${query.toString()}`,
        {
          method: "DELETE",
          headers: {
            "X-USER-ID": USER_ID,
          },
        },
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error("개발일지 삭제 실패", {
          status: res.status,
          body: errorText,
        });
        throw new Error(`삭제 실패 (${res.status})`);
      }

      await loadWorkspace();
      alert("개발일지가 삭제되었습니다.");
    } catch (error) {
      console.error(error);
      alert("개발일지 삭제에 실패했습니다.");
    }
  }
  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            프로젝트 관리
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {workspaceName} · {workspaceModeLabel}의 개발일지를 단계와 일정
            기준으로 관리합니다.
          </p>
        </div>

        <button
          onClick={() => openCreateModal()}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          <Plus size={16} />새 개발일지
        </button>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
              <Search size={16} className="text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="제목, 요약, 내용, 태그 검색"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <select
            value={selectedStage}
            onChange={(e) =>
              setSelectedStage(e.target.value as StageType | "all")
            }
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none"
          >
            <option value="all">전체 단계</option>
            <option value="planning">기획</option>
            <option value="implementation">구현</option>
            <option value="wrapup">마무리</option>
          </select>

          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none"
          >
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag === "all" ? "전체 태그" : tag}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSort("latest")}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              sort === "latest"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            최신순
          </button>
          <button
            onClick={() => setSort("oldest")}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              sort === "oldest"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            오래된순
          </button>

          {(search || selectedStage !== "all" || selectedTag !== "all") && (
            <button
              onClick={() => {
                setSearch("");
                setSelectedStage("all");
                setSelectedTag("all");
                setSort("latest");
              }}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
            >
              필터 초기화
            </button>
          )}
        </div>
      </section>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          개발일지를 불러오는 중...
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[460px_minmax(0,1fr)]">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">개발일지</h2>
              </div>
              <CalendarDays className="text-slate-400" size={20} />
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="mb-4 flex items-center justify-between">
                <button
                  onClick={() => setCalendarMonth(addMonths(calendarMonth, -1))}
                  className="rounded-lg p-2 hover:bg-white"
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="text-sm font-semibold text-slate-800">
                  {calendarMonth.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                  })}
                </div>

                <button
                  onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                  className="rounded-lg p-2 hover:bg-white"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-y-2 text-center text-xs text-slate-400">
                {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                  <div key={day} className="py-2 font-medium">
                    {day}
                  </div>
                ))}

                {monthGrid.map((cell, idx) => {
                  const isCurrentMonth =
                    cell.getMonth() === calendarMonth.getMonth();
                  const ymd = toYmd(cell);
                  const isSelected = ymd === selectedDate;
                  const hasLog = markedDates.has(ymd);

                  return (
                    <button
                      key={`${ymd}-${idx}`}
                      onClick={() => setSelectedDate(ymd)}
                      className={`relative mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm transition ${
                        isSelected
                          ? "bg-slate-900 text-white"
                          : isCurrentMonth
                            ? "text-slate-700 hover:bg-white"
                            : "text-slate-300 hover:bg-white"
                      }`}
                    >
                      {cell.getDate()}
                      {hasLog && !isSelected && (
                        <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-slate-900" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-3 text-sm font-semibold text-slate-700">
                {formatKoreanDate(selectedDate)} 개발일지
              </div>

              <div className="space-y-3">
                {selectedDateLogs.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                    선택한 날짜의 개발일지가 없습니다.
                  </div>
                ) : (
                  selectedDateLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className="min-w-0 cursor-pointer"
                          onClick={() => setDetailTarget(log)}
                        >
                          <div className="text-sm font-semibold text-slate-900">
                            {log.title}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {log.projectTitle}
                          </div>
                          <div className="mt-2 line-clamp-2 text-xs text-slate-600">
                            {log.summary}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(log)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-white"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(log.id, log.projectId)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-white"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
                          {stageMeta[log.stage].label}
                        </span>
                        {log.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-white px-2.5 py-1 text-[11px] text-slate-500"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}

                <button
                  onClick={() => openCreateModal()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-500 hover:bg-slate-50"
                >
                  <Plus size={16} />새 개발일지 작성
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-3">
              {(["planning", "implementation", "wrapup"] as StageType[]).map(
                (stage) => (
                  <div key={stage} className="rounded-2xl bg-slate-50 p-4">
                    <div className="mb-4">
                      <div className="text-xl font-bold text-slate-900">
                        {stageMeta[stage].label}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {stageMeta[stage].description}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {logsByStage[stage].length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-xs text-slate-400">
                          해당 단계의 개발일지가 없습니다.
                        </div>
                      ) : (
                        logsByStage[stage].map((log) => (
                          <div
                            key={log.id}
                            className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
                          >
                            <button
                              onClick={() => setDetailTarget(log)}
                              className="block w-full text-left"
                            >
                              <div className="text-xs font-semibold text-slate-400">
                                {shortDate(log.date)}
                              </div>
                              <div className="mt-1 line-clamp-2 text-base font-bold text-slate-900">
                                {log.title}
                              </div>
                              <div className="mt-1 line-clamp-2 text-sm text-slate-500">
                                {log.summary}
                              </div>
                            </button>

                            <div className="mt-3 text-xs text-slate-400">
                              {log.projectTitle}
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {log.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full bg-slate-50 px-2 py-1 text-[11px] text-slate-500"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>

                            <div className="mt-4 flex items-center justify-between">
                              <div className="text-[11px] text-slate-400">
                                진행률 {log.progress ?? 0}%
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => openEditModal(log)}
                                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-50"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() =>
                                    handleDelete(log.id, log.projectId)
                                  }
                                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-50"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}

                      <button
                        onClick={() => openCreateModal(stage)}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-500 hover:bg-slate-50"
                      >
                        <Plus size={16} />
                        {stageMeta[stage].label} 일지 추가
                      </button>
                    </div>
                  </div>
                ),
              )}
            </div>
          </section>
        </div>
      )}

      {detailTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-slate-400">
                  {detailTarget.projectTitle} ·{" "}
                  {formatKoreanDate(detailTarget.date)}
                </div>
                <h3 className="mt-1 text-2xl font-bold text-slate-900">
                  {detailTarget.title}
                </h3>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {stageMeta[detailTarget.stage].label}
                  </span>
                  {detailTarget.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setDetailTarget(null)}
                className="rounded-xl p-2 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <InfoBlock title="요약" value={detailTarget.summary} />
              <InfoBlock
                title="진행률"
                value={`${detailTarget.progress ?? 0}%`}
              />
              <InfoBlock title="목표" value={detailTarget.goal} />
              <InfoBlock title="문제 상황" value={detailTarget.issue} />
              <InfoBlock title="해결 방법" value={detailTarget.solution} />
              <InfoBlock title="다음 계획" value={detailTarget.nextPlan} />
              <InfoBlock
                title="커밋 해시 / 브랜치"
                value={detailTarget.commitHash}
                mono
              />
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 p-5">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <FileText size={16} />
                상세 내용
              </div>
              <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {detailTarget.content}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  const item = detailTarget;
                  setDetailTarget(null);
                  openEditModal(item);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                수정
              </button>
              <button
                onClick={() =>
                  handleDelete(detailTarget.id, detailTarget.projectId)
                }
                className="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {(isCreateOpen || editingTarget) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">
                  {editingTarget ? "개발일지 수정" : "새 개발일지 작성"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  단계와 일정 기준으로 개발 흐름을 기록합니다.
                </p>
              </div>

              <button
                onClick={closeFormModal}
                className="rounded-xl p-2 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="프로젝트">
                <select
                  value={form.projectId}
                  disabled={!!editingTarget}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, projectId: e.target.value }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none disabled:text-slate-400"
                >
                  <option value="">프로젝트 선택</option>
                  {projects.map((project, index) => (
                    <option key={`${project.id}-${index}`} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="단계">
                <select
                  value={form.stage}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      stage: e.target.value as StageType,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none"
                >
                  <option value="planning">기획</option>
                  <option value="implementation">구현</option>
                  <option value="wrapup">마무리</option>
                </select>
              </Field>

              <Field label="제목" className="md:col-span-2">
                <input
                  value={form.title}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="예: 로그인 API 구현"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none"
                />
              </Field>

              <Field label="날짜">
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, date: e.target.value }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none"
                />
              </Field>

              <Field label="진행률">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.progress}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, progress: e.target.value }))
                  }
                  placeholder="0~100"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none"
                />
              </Field>

              <Field label="요약" className="md:col-span-2">
                <input
                  value={form.summary}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, summary: e.target.value }))
                  }
                  placeholder="한 줄 요약"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none"
                />
              </Field>

              <Field label="태그" className="md:col-span-2">
                <input
                  value={form.tagsText}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, tagsText: e.target.value }))
                  }
                  placeholder="React, API, UI"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none"
                />
              </Field>

              <Field label="목표">
                <textarea
                  value={form.goal}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, goal: e.target.value }))
                  }
                  placeholder="오늘 작업 목표"
                  className="min-h-[110px] w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none"
                />
              </Field>

              <Field label="문제 상황">
                <textarea
                  value={form.issue}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, issue: e.target.value }))
                  }
                  placeholder="막혔던 점, 에러, 고민"
                  className="min-h-[110px] w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none"
                />
              </Field>

              <Field label="해결 방법">
                <textarea
                  value={form.solution}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, solution: e.target.value }))
                  }
                  placeholder="해결한 방식, 수정 포인트"
                  className="min-h-[110px] w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none"
                />
              </Field>

              <Field label="다음 계획">
                <textarea
                  value={form.nextPlan}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, nextPlan: e.target.value }))
                  }
                  placeholder="다음 개발 예정 사항"
                  className="min-h-[110px] w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none"
                />
              </Field>

              <Field label="커밋 해시 / 브랜치" className="md:col-span-2">
                <input
                  value={form.commitHash}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, commitHash: e.target.value }))
                  }
                  placeholder="예: feat/devlog-board, a1b2c3d"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none"
                />
              </Field>

              <Field label="상세 내용" className="md:col-span-2">
                <textarea
                  value={form.content}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, content: e.target.value }))
                  }
                  placeholder="구현 내용, 테스트 결과, 회고 등을 자세히 작성"
                  className="min-h-[240px] w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none"
                />
              </Field>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={closeFormModal}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                {editingTarget ? "수정 저장" : "작성 완료"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function InfoBlock({
  title,
  value,
  mono = false,
}: {
  title: string;
  value?: string | number;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </div>
      <div
        className={`mt-2 whitespace-pre-wrap text-sm text-slate-700 ${
          mono ? "font-mono" : ""
        }`}
      >
        {String(value || "-")}
      </div>
    </div>
  );
}

function inferStage(title: string, summary: string, tags: string[]): StageType {
  const source = `${title} ${summary} ${tags.join(" ")}`.toLowerCase();

  if (
    source.includes("기획") ||
    source.includes("설계") ||
    source.includes("erd") ||
    source.includes("주제")
  ) {
    return "planning";
  }

  if (
    source.includes("정리") ||
    source.includes("문서") ||
    source.includes("리팩토링") ||
    source.includes("마무리")
  ) {
    return "wrapup";
  }

  return "implementation";
}

function normalizeDate(input: string) {
  if (!input) return todayYmd();
  if (input.includes("T")) return input.slice(0, 10);
  return input;
}

function todayYmd() {
  return toYmd(new Date());
}

function toYmd(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function buildCalendarGrid(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const lastDay = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth() + 1,
    0,
  );

  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  const end = new Date(lastDay);
  end.setDate(lastDay.getDate() + (6 - lastDay.getDay()));

  const result: Date[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    result.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

function shortDate(ymd: string) {
  const [, month, day] = ymd.split("-");
  return `${month}.${day}`;
}

function formatKoreanDate(ymd: string) {
  const [year, month, day] = ymd.split("-");
  return `${year}.${month}.${day}`;
}
