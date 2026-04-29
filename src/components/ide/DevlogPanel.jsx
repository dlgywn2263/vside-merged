"use client";

import { usePathname } from "next/navigation";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  VscAdd,
  VscRefresh,
  VscChevronLeft,
  VscEdit,
  VscTrash,
  VscCalendar,
} from "react-icons/vsc";

import {
  fetchWorkspaceDevlogs,
  createDevlog,
  updateDevlog,
  deleteDevlog,
} from "@/lib/devlog/api";

import { DevlogFormModal } from "@/components/devlog/DevlogFormModal";

import { fetchDevlogMonthSchedules } from "@/lib/devlog/devlogScheduleApi";

import {
  mapApiScheduleToCalendarEvent,
  dedupeEvents,
} from "@/components/schedule/schedule.utils";

import {
  STAGE_BADGE_COLORS,
  STAGE_LABELS,
} from "@/components/schedule/schedule.colors";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const defaultForm = {
  projectId: "",
  scheduleId: "",
  title: "",
  summary: "",
  content: "",
  date: new Date().toISOString().split("T")[0],
  tagsText: "",
  stage: "implementation",
  goal: "",
  design: "",
  issue: "",
  solution: "",
  nextPlan: "",
  commitHash: "",
  progress: "0",
};

function getCurrentYearMonth() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}

function toDateValue(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function getScheduleStatus(event) {
  const today = new Date();
  const todayISO = today.toISOString().split("T")[0];

  const start = event.startDateISO;
  const end = event.endDateISO || event.startDateISO;

  if (end < todayISO) return "done";
  if (start > todayISO) return "todo";
  return "doing";
}

function ScheduleStatusBadge({ status }) {
  const config = {
    todo: "bg-slate-100 text-slate-600",
    doing: "bg-blue-50 text-blue-600",
    done: "bg-emerald-50 text-emerald-600",
  };

  const label = {
    todo: "예정",
    doing: "진행중",
    done: "완료",
  };

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${config[status]}`}
    >
      {label[status]}
    </span>
  );
}

export default function DevlogPanel() {
  const { workspaceId, activeProject } = useSelector(
    (state) => state.fileSystem,
  );

  const pathname = usePathname();
  const scheduleView = useMemo(() => {
    if (pathname?.includes("/ide/team/")) return "team";
    if (pathname?.includes("/ide/personal/")) return "personal";
    return "all";
  }, [pathname]);

  const [view, setView] = useState("list");
  const [logs, setLogs] = useState([]);
  const [schedules, setSchedules] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);

  const [selectedLog, setSelectedLog] = useState(null);

  const [workspaceName, setWorkspaceName] = useState("워크스페이스");
  const [defaultProjectId, setDefaultProjectId] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState(null);
  const [form, setForm] = useState(defaultForm);

  const loadLogs = useCallback(async () => {
    if (!workspaceId) return;

    setIsLoading(true);

    try {
      const data = await fetchWorkspaceDevlogs(workspaceId);

      setWorkspaceName(data.name || "워크스페이스");

      let targetId = "";

      if (data.projects && data.projects.length > 0) {
        const matched = data.projects.find(
          (p) => p.name === activeProject || p.projectTitle === activeProject,
        );

        targetId = matched
          ? matched.projectId || matched.id
          : data.projects[0].projectId || data.projects[0].id;
      }

      setDefaultProjectId(String(targetId || ""));

      let allLogs = [];

      data.projects?.forEach((p) => {
        const pLogs = p.posts || p.devlogs || [];
        allLogs = [...allLogs, ...pLogs];
      });

      allLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
      setLogs(allLogs);
    } catch (error) {
      console.error("개발일지 로드 실패:", error);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, activeProject]);

  const loadSchedules = useCallback(async () => {
    if (!workspaceId) return;

    setIsScheduleLoading(true);

    try {
      const { year, month } = getCurrentYearMonth();

      const numericYear = Number(year);
      const numericMonth = Number(month);

      if (!workspaceId || !numericYear || !numericMonth) {
        console.warn("일정 요청값이 올바르지 않습니다.", {
          workspaceId,
          year,
          month,
          view: scheduleView,
        });
        setSchedules([]);
        return;
      }

      console.log("IDE 개발일지 일정 요청값:", {
        view: scheduleView,
        workspaceId,
        year: numericYear,
        month: numericMonth,
      });

      const data = await fetchDevlogMonthSchedules(
        scheduleView,
        workspaceId,
        numericYear,
        numericMonth,
      );

      const rawSchedules = Array.isArray(data)
        ? data
        : data.schedules || data.events || data.data || [];

      const mapped = rawSchedules.map(mapApiScheduleToCalendarEvent);
      const unique = dedupeEvents(mapped);

      unique.sort((a, b) => {
        const aDate = a.startDateISO || "";
        const bDate = b.startDateISO || "";
        return aDate.localeCompare(bDate);
      });

      setSchedules(unique);
    } catch (error) {
      console.error("일정 로드 실패:", error);
      setSchedules([]);
    } finally {
      setIsScheduleLoading(false);
    }
  }, [workspaceId, scheduleView]);

  const reloadAll = useCallback(async () => {
    await loadLogs();
    await loadSchedules();
  }, [loadLogs, loadSchedules]);

  useEffect(() => {
    if (!workspaceId) return;
    reloadAll();
  }, [workspaceId, reloadAll]);

  const handleOpenCreate = () => {
    if (!defaultProjectId) {
      alert("데이터를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setEditingTarget(null);

    setForm({
      ...defaultForm,
      projectId: defaultProjectId,
      scheduleId: "",
      stage: "implementation",
      date: new Date().toISOString().split("T")[0],
      progress: "0",
    });

    setIsFormOpen(true);
  };

  const handleOpenCreateFromSchedule = (event) => {
    if (!defaultProjectId) {
      alert("데이터를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setEditingTarget(null);

    setForm({
      ...defaultForm,
      projectId: defaultProjectId,

      // 백엔드에서 일정과 개발일지를 연결할 때 필요한 값
      // 백엔드 필드명이 scheduleId가 아니라면 이 이름만 맞춰주면 됨
      scheduleId: String(event.id || event.scheduleId || ""),

      title: `${event.title} 개발일지`,
      summary: "",
      content: "",
      date: toDateValue(event.startDateISO) || defaultForm.date,

      tagsText: event.category ? String(event.category) : "",

      // 일정 단계와 일지 단계가 같은 enum이면 event.stage 사용 가능
      // 다르면 "implementation" 고정 유지
      stage: event.stage || "implementation",

      goal: event.description || "",
      design: "",
      issue: "",
      solution: "",
      nextPlan: "",
      commitHash: "",

      // 진행률을 사용자가 모달에서 입력하게 할 값
      progress: "0",
    });

    setIsFormOpen(true);
  };

  const handleOpenEdit = (log) => {
    setEditingTarget(log);

    setForm({
      projectId: String(log.projectId || defaultProjectId),
      scheduleId: String(log.scheduleId || ""),
      title: log.title || "",
      summary: log.summary || "",
      content: log.content || "",
      date: log.date || defaultForm.date,
      tagsText: log.tags
        ? Array.isArray(log.tags)
          ? log.tags.join(", ")
          : log.tags
        : "",
      stage: log.stage || "implementation",
      goal: log.goal || "",
      design: log.design || "",
      issue: log.issue || "",
      solution: log.solution || "",
      nextPlan: log.nextPlan || "",
      commitHash: log.commitHash || "",
      progress: String(log.progress || 0),
    });

    setIsFormOpen(true);
  };

  const handleDelete = async (logId, logProjectId) => {
    if (!window.confirm("정말 이 개발일지를 삭제하시겠습니까?")) return;

    try {
      await deleteDevlog(
        logId,
        workspaceId,
        Number(logProjectId || defaultProjectId),
      );
      await reloadAll();
      setView("list");
    } catch (e) {
      alert(e.message);
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }

    const payload = {
      ...form,
      projectId: Number(form.projectId),
      scheduleId: form.scheduleId ? Number(form.scheduleId) : null,
      progress: Number(form.progress || 0),
      stage: form.stage || "implementation",
    };

    try {
      if (editingTarget) {
        await updateDevlog(Number(editingTarget.id), workspaceId, payload);
      } else {
        await createDevlog(workspaceId, payload);
      }

      setIsFormOpen(false);

      await sleep(300);
      await loadLogs();

      await sleep(300);
      await loadSchedules();

      if (view === "detail") {
        setView("list");
      }
    } catch (error) {
      alert(error.message || "개발일지 저장 중 오류가 발생했습니다.");
    }
  };

  const scheduleCount = useMemo(() => schedules.length, [schedules]);

  if (!workspaceId) {
    return (
      <div className="flex-1 w-full flex flex-col h-full items-center justify-center bg-[#f8fafc] text-slate-400 text-sm">
        <p>워크스페이스 정보를 불러올 수 없습니다.</p>
      </div>
    );
  }

  if (view === "list") {
    return (
      <div className="flex-1 w-full h-full bg-[#f8fafc] font-sans p-6 overflow-y-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto flex flex-col gap-6 h-full">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center justify-between shrink-0">
            <div>
              <div className="flex gap-2 items-center mb-3">
                <span className="bg-slate-800 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                  개발일지
                </span>
              </div>

              <h2 className="text-[24px] font-extrabold text-slate-900 leading-tight">
                {workspaceName} 개발일지
              </h2>

              <p className="text-[13px] text-slate-500 mt-1.5">
                현재 작업 중인 워크스페이스의 일정과 개발 과정을 함께
                기록합니다.
              </p>
            </div>

            <button
              onClick={handleOpenCreate}
              className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl flex items-center gap-2 text-[14px] font-bold transition-all shadow-md"
            >
              <VscAdd size={18} />새 개발일지
            </button>
          </div>

          <div className="grid grid-cols-[360px_1fr] gap-6 flex-1 min-h-[500px]">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-[17px] font-extrabold text-slate-900">
                    워크스페이스 일정
                  </h3>
                  <p className="text-[12px] text-slate-400 mt-1">
                    일정의 일지 쓰기를 누르면 해당 일정과 연결됩니다.
                  </p>
                </div>

                <button
                  onClick={loadSchedules}
                  className="text-slate-400 hover:text-slate-800 transition-colors p-2 rounded-lg hover:bg-slate-100"
                >
                  <VscRefresh
                    size={18}
                    className={isScheduleLoading ? "animate-spin" : ""}
                  />
                </button>
              </div>

              <div className="mb-4 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <VscCalendar className="text-slate-500" size={17} />
                  <span className="text-[13px] font-bold text-slate-700">
                    이번 달 일정
                  </span>
                </div>

                <span className="text-[12px] font-bold text-blue-600">
                  {scheduleCount}개
                </span>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-3">
                {isScheduleLoading ? (
                  <div className="text-xs font-bold text-slate-400 text-center py-16 animate-pulse">
                    일정을 불러오는 중입니다...
                  </div>
                ) : schedules.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center">
                    <p className="text-[13px] font-bold text-slate-400">
                      등록된 일정이 없습니다.
                    </p>
                    <p className="text-[12px] text-slate-400 mt-1">
                      일정관리에서 일정을 먼저 등록해주세요.
                    </p>
                  </div>
                ) : (
                  schedules.map((event) => {
                    const status = getScheduleStatus(event);

                    return (
                      <div
                        key={event.id}
                        className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-slate-300 transition-all"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {event.category ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                              {event.category}
                            </span>
                          ) : null}

                          {event.stage ? (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                STAGE_BADGE_COLORS[event.stage] ||
                                "bg-blue-50 text-blue-600"
                              }`}
                            >
                              {STAGE_LABELS[event.stage] || event.stage}
                            </span>
                          ) : null}

                          <ScheduleStatusBadge status={status} />
                        </div>

                        <h4 className="text-[14px] font-extrabold text-slate-900 leading-snug line-clamp-2">
                          {event.title}
                        </h4>

                        <p className="text-[12px] text-slate-500 mt-2">
                          {event.startDateISO}
                          {event.startDateISO !== event.endDateISO
                            ? ` ~ ${event.endDateISO}`
                            : ""}
                        </p>

                        {event.description ? (
                          <p className="text-[12px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                            {event.description}
                          </p>
                        ) : null}

                        <div className="mt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleOpenCreateFromSchedule(event)}
                            className="rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-bold text-white hover:bg-slate-800 transition-colors"
                          >
                            일지 쓰기
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[18px] font-extrabold text-slate-900">
                  작성된 일지 목록
                </h3>

                <button
                  onClick={loadLogs}
                  className="text-slate-400 hover:text-slate-800 transition-colors p-2 rounded-lg hover:bg-slate-100"
                >
                  <VscRefresh
                    size={20}
                    className={isLoading ? "animate-spin" : ""}
                  />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-4">
                {isLoading ? (
                  <div className="text-xs font-bold text-slate-400 text-center py-20 animate-pulse">
                    일지를 불러오는 중입니다...
                  </div>
                ) : logs.length === 0 ? (
                  <button
                    onClick={handleOpenCreate}
                    className="text-[13px] font-bold text-slate-400 text-center py-10 border border-dashed border-slate-300 rounded-2xl hover:bg-slate-50 transition-colors"
                  >
                    + 첫 개발일지를 작성해보세요
                  </button>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-5 rounded-2xl border border-slate-100 hover:border-slate-300 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-all cursor-pointer group flex flex-col gap-1"
                      onClick={() => {
                        setSelectedLog(log);
                        setView("detail");
                      }}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-400">
                            {log.date}
                          </span>

                          {log.scheduleId ? (
                            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md">
                              일정 연결
                            </span>
                          ) : null}
                        </div>

                        <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md">
                          {STAGE_LABELS[log.stage] || "구현"}
                        </span>
                      </div>

                      <h4 className="text-[16px] font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors tracking-tight">
                        {log.title}
                      </h4>

                      <p className="text-[13px] text-slate-500 line-clamp-2 leading-relaxed mb-2">
                        {log.summary || "내용이 없습니다."}
                      </p>

                      {log.tags && (
                        <div>
                          <span className="text-[11px] text-slate-400 font-mono truncate bg-slate-50 inline-block px-2 py-1 rounded-md">
                            #
                            {Array.isArray(log.tags)
                              ? log.tags.join(" #")
                              : log.tags}
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {isFormOpen && (
          <DevlogFormModal
            editingTarget={editingTarget}
            form={form}
            projects={[{ id: defaultProjectId, name: workspaceName }]}
            setForm={setForm}
            onClose={() => setIsFormOpen(false)}
            onSubmit={handleSubmit}
            isStageFixed={false}
            isProjectFixed={true}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 w-full flex flex-col h-full bg-[#f8fafc] font-sans p-6 overflow-hidden">
      <div className="max-w-5xl mx-auto w-full bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
        <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 shrink-0 bg-white">
          <button
            onClick={() => setView("list")}
            className="flex items-center gap-1 text-[13px] font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <VscChevronLeft size={18} />
            목록으로
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenEdit(selectedLog)}
              className="px-3 py-1.5 text-[12px] font-bold text-slate-600 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1"
            >
              <VscEdit size={14} />
              수정
            </button>

            <button
              onClick={() =>
                handleDelete(selectedLog.id, selectedLog.projectId)
              }
              className="px-3 py-1.5 text-[12px] font-bold text-slate-600 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1"
            >
              <VscTrash size={14} />
              삭제
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <div className="flex gap-2 items-center mb-4">
                <span className="text-[11px] font-bold bg-slate-800 text-white px-3 py-1 rounded-full">
                  {workspaceName}
                </span>

                <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                  {STAGE_LABELS[selectedLog?.stage] || "구현"}
                </span>

                {selectedLog?.scheduleId ? (
                  <span className="text-[11px] font-bold bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full">
                    일정 연결
                  </span>
                ) : null}

                <span className="text-[13px] font-medium text-slate-400 ml-1">
                  {selectedLog?.date}
                </span>
              </div>

              <h2 className="text-[28px] font-extrabold text-slate-900 leading-snug">
                {selectedLog?.title}
              </h2>

              {selectedLog?.tags && (
                <div className="text-[13px] text-slate-400 mt-3 font-mono">
                  #
                  {Array.isArray(selectedLog.tags)
                    ? selectedLog.tags.join(" #")
                    : selectedLog.tags}
                </div>
              )}
            </div>

            <div className="space-y-8">
              {selectedLog?.summary && (
                <div>
                  <h4 className="text-[14px] font-bold text-slate-900 mb-3 border-b pb-2">
                    한 줄 요약
                  </h4>
                  <p className="text-[14px] text-slate-700 bg-slate-50 p-5 rounded-2xl border border-slate-100 leading-relaxed">
                    {selectedLog.summary}
                  </p>
                </div>
              )}

              {selectedLog?.goal && (
                <div>
                  <h4 className="text-[14px] font-bold text-slate-900 mb-3 border-b pb-2">
                    목표
                  </h4>
                  <p className="text-[14px] text-slate-700 whitespace-pre-wrap leading-relaxed px-1">
                    {selectedLog.goal}
                  </p>
                </div>
              )}

              {selectedLog?.design && (
                <div>
                  <h4 className="text-[14px] font-bold text-slate-900 mb-3 border-b pb-2">
                    설계
                  </h4>
                  <p className="text-[14px] text-slate-700 whitespace-pre-wrap leading-relaxed px-1">
                    {selectedLog.design}
                  </p>
                </div>
              )}

              {selectedLog?.issue && (
                <div>
                  <h4 className="text-[14px] font-bold text-slate-900 mb-3 border-b pb-2">
                    문제 상황
                  </h4>
                  <p className="text-[14px] text-slate-700 whitespace-pre-wrap leading-relaxed px-1">
                    {selectedLog.issue}
                  </p>
                </div>
              )}

              {selectedLog?.solution && (
                <div>
                  <h4 className="text-[14px] font-bold text-slate-900 mb-3 border-b pb-2">
                    해결 방법
                  </h4>
                  <p className="text-[14px] text-slate-700 whitespace-pre-wrap leading-relaxed px-1">
                    {selectedLog.solution}
                  </p>
                </div>
              )}

              {selectedLog?.nextPlan && (
                <div>
                  <h4 className="text-[14px] font-bold text-slate-900 mb-3 border-b pb-2">
                    다음 계획
                  </h4>
                  <p className="text-[14px] text-slate-700 whitespace-pre-wrap leading-relaxed px-1">
                    {selectedLog.nextPlan}
                  </p>
                </div>
              )}

              {selectedLog?.commitHash && (
                <div>
                  <h4 className="text-[14px] font-bold text-slate-900 mb-3 border-b pb-2">
                    커밋 / 브랜치
                  </h4>
                  <p className="font-mono text-[13px] text-slate-600 bg-slate-100 px-4 py-2 rounded-lg inline-block">
                    {selectedLog.commitHash}
                  </p>
                </div>
              )}

              {selectedLog?.content && (
                <div>
                  <h4 className="text-[14px] font-bold text-slate-900 mb-3 border-b pb-2">
                    상세 내용
                  </h4>
                  <div className="text-[14px] text-slate-800 bg-white p-6 rounded-2xl border border-slate-200 whitespace-pre-wrap leading-relaxed shadow-sm">
                    {selectedLog.content}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isFormOpen && (
        <DevlogFormModal
          editingTarget={editingTarget}
          form={form}
          projects={[{ id: defaultProjectId, name: workspaceName }]}
          setForm={setForm}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleSubmit}
          isStageFixed={false}
          isProjectFixed={true}
        />
      )}
    </div>
  );
}
