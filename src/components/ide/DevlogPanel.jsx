"use client";

import { usePathname } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  VscAdd,
  VscCalendar,
  VscChevronLeft,
  VscClose,
  VscEdit,
  VscRefresh,
  VscSearch,
  VscTrash,
} from "react-icons/vsc";

import {
  createWorkspaceDevlogApi,
  deleteDevlogApi,
  fetchMainMonthSchedulesApi,
  fetchWorkspaceDevlogsApi,
  getMyWorkspacesByTokenApi,
  updateDevlogApi,
} from "@/lib/ide/api";

const scheduleStatusLabel = {
  todo: "할 일",
  progress: "진행 중",
  done: "완료",
  delayed: "지연",
};

const scheduleStatusStyle = {
  todo: "bg-slate-100 text-slate-600 border-slate-200",
  progress: "bg-blue-50 text-blue-700 border-blue-200",
  done: "bg-indigo-50 text-indigo-700 border-indigo-200",
  delayed: "bg-rose-50 text-rose-700 border-rose-200",
};

const emptyForm = {
  scheduleId: "",
  title: "",
  content: "",
  workedDate: getTodayDateKey(),
  scheduleStatusAfterWrite: "none",
};

function getTodayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const date = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${date}`;
}

function getCurrentYearMonth() {
  const now = new Date();

  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}

function normalizeDate(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function normalizeScheduleStatus(value) {
  if (!value) return "todo";
  if (value === "doing") return "progress";
  return value;
}

function normalizeWorkspaceId(value) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function findWorkspaceNameFromList(workspaces, workspaceId) {
  if (!Array.isArray(workspaces) || !workspaceId) return "";

  const targetId = normalizeWorkspaceId(workspaceId);

  const matched = workspaces.find((workspace) => {
    const ids = [
      workspace?.id,
      workspace?.workspaceId,
      workspace?.uuid,
      workspace?.workspaceUuid,
    ].map(normalizeWorkspaceId);

    return ids.includes(targetId);
  });

  return (
    matched?.name ||
    matched?.workspaceName ||
    matched?.projectName ||
    matched?.title ||
    ""
  );
}

function normalizeSchedule(item) {
  const startDate =
    item.startDate ||
    item.startDateISO ||
    item.date ||
    item.startedAt ||
    getTodayDateKey();

  const endDate = item.endDate || item.endDateISO || startDate;

  return {
    id: String(item.id ?? item.scheduleId ?? ""),
    workspaceId: String(item.workspaceId ?? ""),
    projectName: item.projectName ?? item.customProjectName ?? "워크스페이스",
    title: item.title ?? "",
    description: item.description ?? "",
    startDate: normalizeDate(startDate),
    endDate: normalizeDate(endDate),
    status: normalizeScheduleStatus(item.status),
    category: item.category ?? "General",
    hasDevlog: Boolean(item.hasDevlog),
  };
}

function normalizeDevlog(item) {
  return {
    id: String(item.id ?? item.devlogId ?? ""),
    workspaceId: String(item.workspaceId ?? ""),
    projectName: item.projectName ?? "워크스페이스",
    title: item.title ?? "",
    content: item.content ?? "",
    workedDate: normalizeDate(item.workedDate ?? item.date),
    date: normalizeDate(item.workedDate ?? item.date),
    type: item.type ?? (item.scheduleId ? "linked" : "general"),
    scheduleId:
      item.scheduleId === undefined || item.scheduleId === null
        ? null
        : String(item.scheduleId),
    scheduleTitle: item.scheduleTitle ?? null,
    status: normalizeScheduleStatus(item.scheduleStatus ?? item.status),
    tags: Array.isArray(item.tags) ? item.tags : [],
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function getWorkspaceNameFromState(fileSystem) {
  return (
    fileSystem?.activeWorkspace?.name ||
    fileSystem?.workspace?.name ||
    fileSystem?.currentWorkspace?.name ||
    fileSystem?.selectedWorkspace?.name ||
    fileSystem?.workspaceName ||
    ""
  );
}

function DevlogTypeBadge({ type }) {
  const isLinked = type === "linked";

  return (
    <span
      className={
        isLinked
          ? "rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700"
          : "rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600"
      }
    >
      {isLinked ? "일정 연결" : "일반 일지"}
    </span>
  );
}

function ScheduleStatusBadge({ status }) {
  const normalized = normalizeScheduleStatus(status);

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
        scheduleStatusStyle[normalized] || scheduleStatusStyle.todo
      }`}
    >
      {scheduleStatusLabel[normalized] || "할 일"}
    </span>
  );
}

function DevlogFormModal({
  open,
  mode,
  form,
  schedules,
  selectedSchedule,
  onChange,
  onClose,
  onSubmit,
  isSubmitting,
}) {
  if (!open) return null;

  const isLinked = Boolean(form.scheduleId);
  const selectedScheduleTitle =
    selectedSchedule?.title ||
    schedules.find((schedule) => String(schedule.id) === String(form.scheduleId))
      ?.title ||
    "";

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-slate-950/35 px-4 py-5 backdrop-blur-[2px]">
      <div className="flex max-h-[calc(100dvh-40px)] w-full max-w-[820px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
        <div className="flex shrink-0 items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-[11px] font-black tracking-[0.16em] text-[#5873F9]">
                DEVELOPMENT LOG
              </span>

              <span className="rounded-full bg-[#EEF3FF] px-2 py-0.5 text-[10px] font-black text-[#5873F9]">
                {mode === "edit" ? "EDIT" : "NEW"}
              </span>
            </div>

            <h3 className="text-[20px] font-black tracking-[-0.02em] text-slate-950">
              {mode === "edit" ? "개발일지 수정" : "개발일지 작성"}
            </h3>

            <p className="mt-1 text-[12px] font-medium text-slate-400">
              프로젝트 작업 과정과 결과를 간단하게 기록합니다.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="닫기"
          >
            <VscClose size={19} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            <section>
              <p className="mb-2 text-[11px] font-black tracking-[0.08em] text-slate-400">
                TITLE
              </p>

              <input
                value={form.title}
                onChange={(event) => onChange({ title: event.target.value })}
                placeholder="오늘 작업한 내용을 한 줄로 정리해주세요."
                className="h-12 w-full border-b border-slate-200 bg-transparent px-0 text-[18px] font-black text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-[#5873F9]"
              />
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200">
              <div className="grid min-h-[58px] grid-cols-[120px_minmax(0,1fr)] items-center border-b border-slate-100">
                <div className="px-4 text-[12px] font-black text-slate-500">
                  일지 유형
                </div>

                <div className="flex flex-wrap gap-2 px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        scheduleId: "",
                        scheduleStatusAfterWrite: "none",
                      })
                    }
                    className={`h-9 rounded-lg border px-3 text-[11px] font-black transition ${
                      !form.scheduleId
                        ? "border-[#AAB8FF] bg-[#F4F6FF] text-[#4058D8]"
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    일반 일지
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const firstSchedule = schedules[0];

                      if (!firstSchedule) {
                        alert("연결할 수 있는 일정이 없습니다.");
                        return;
                      }

                      onChange({
                        scheduleId: String(firstSchedule.id),
                        title:
                          form.title.trim() || `${firstSchedule.title} 개발일지`,
                        workedDate: firstSchedule.startDate || getTodayDateKey(),
                        scheduleStatusAfterWrite: "none",
                      });
                    }}
                    className={`h-9 rounded-lg border px-3 text-[11px] font-black transition ${
                      form.scheduleId
                        ? "border-[#AAB8FF] bg-[#F4F6FF] text-[#4058D8]"
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    일정 연결
                  </button>
                </div>
              </div>

              {form.scheduleId ? (
                <div className="grid min-h-[58px] grid-cols-[120px_minmax(0,1fr)] items-center border-b border-slate-100">
                  <div className="px-4 text-[12px] font-black text-slate-500">
                    연결 일정
                  </div>

                  <div className="px-4 py-2.5">
                    <select
                      value={form.scheduleId}
                      onChange={(event) => {
                        const schedule = schedules.find(
                          (item) => String(item.id) === String(event.target.value),
                        );

                        onChange({
                          scheduleId: event.target.value,
                          title:
                            form.title.trim() ||
                            (schedule ? `${schedule.title} 개발일지` : ""),
                          workedDate:
                            schedule?.startDate ||
                            form.workedDate ||
                            getTodayDateKey(),
                        });
                      }}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-700 outline-none transition focus:border-[#5873F9] focus:ring-2 focus:ring-[#5873F9]/10"
                    >
                      {schedules.map((schedule) => (
                        <option key={schedule.id} value={schedule.id}>
                          {schedule.title} · {schedule.startDate}
                        </option>
                      ))}
                    </select>

                    {selectedScheduleTitle ? (
                      <p className="mt-1.5 text-[11px] font-semibold text-[#5873F9]">
                        현재 연결: {selectedScheduleTitle}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="grid min-h-[58px] grid-cols-[120px_minmax(0,1fr)] items-center border-b border-slate-100">
                <div className="px-4 text-[12px] font-black text-slate-500">
                  작업 날짜
                </div>

                <div className="px-4 py-2.5">
                  <input
                    type="date"
                    value={form.workedDate}
                    onChange={(event) =>
                      onChange({ workedDate: event.target.value })
                    }
                    className="h-10 w-full max-w-[220px] rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-700 outline-none transition focus:border-[#5873F9] focus:ring-2 focus:ring-[#5873F9]/10"
                  />
                </div>
              </div>

              {form.scheduleId ? (
                <div className="grid min-h-[58px] grid-cols-[120px_minmax(0,1fr)] items-center">
                  <div className="px-4 text-[12px] font-black text-slate-500">
                    일정 상태
                  </div>

                  <div className="px-4 py-2.5">
                    <select
                      value={form.scheduleStatusAfterWrite}
                      onChange={(event) =>
                        onChange({ scheduleStatusAfterWrite: event.target.value })
                      }
                      className="h-10 w-full max-w-[260px] rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-700 outline-none transition focus:border-[#5873F9] focus:ring-2 focus:ring-[#5873F9]/10"
                    >
                      <option value="none">변경하지 않음</option>
                      <option value="todo">할 일</option>
                      <option value="progress">진행 중</option>
                      <option value="done">완료</option>
                      <option value="delayed">지연</option>
                    </select>
                  </div>
                </div>
              ) : null}
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-black tracking-[0.08em] text-slate-400">
                    WORK LOG
                  </p>
                  <p className="mt-1 text-[12px] font-black text-slate-700">
                    작업 내용
                  </p>
                </div>

                <span className="text-[10px] font-bold text-slate-300">
                  {form.content.length}자
                </span>
              </div>

              <textarea
                value={form.content}
                onChange={(event) => onChange({ content: event.target.value })}
                placeholder={`오늘 수행한 작업을 기록해주세요.

예)
- 로그인 API 요청/응답 구현
- JWT 토큰 검증 로직 추가
- 로그인 실패 예외 처리 수정`}
                className="min-h-[280px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-4 text-[13px] leading-7 text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-[#5873F9] focus:bg-white focus:ring-2 focus:ring-[#5873F9]/10"
              />
            </section>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-slate-100 px-6 py-3">
          <p className="text-[11px] font-medium text-slate-400">
            제목, 작업 날짜, 작업 내용은 필수입니다.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl border border-slate-200 px-4 text-[12px] font-black text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
            >
              취소
            </button>

            <button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting}
              className="h-10 rounded-xl bg-[#5873F9] px-5 text-[12px] font-black text-white shadow-sm transition hover:bg-[#4863E8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "저장 중..." : mode === "edit" ? "수정 완료" : "작성 완료"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DevlogDetailModal({
  log,
  onClose,
  onEdit,
  onDelete,
}) {
  if (!log) return null;

  return (
    <div className="fixed inset-0 z-[9000] flex items-start justify-center overflow-y-auto bg-slate-950/35 px-4 py-6 backdrop-blur-[2px]">
      <div className="w-full max-w-[760px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <p className="text-[11px] font-black tracking-[0.15em] text-[#5873F9]">
              DEVELOPMENT LOG
            </p>

            <h2 className="mt-1 text-[22px] font-black leading-8 tracking-[-0.02em] text-slate-950">
              {log.title}
            </h2>

            <p className="mt-1 text-[11px] font-semibold text-slate-400">
              {log.projectName || "프로젝트"} · {log.workedDate}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="닫기"
          >
            <VscClose size={19} />
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <DevlogTypeBadge type={log.type} />

            {log.status ? (
              <ScheduleStatusBadge status={log.status} />
            ) : null}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
              <p className="text-[10px] font-black tracking-[0.08em] text-slate-400">
                WORKED DATE
              </p>
              <p className="mt-1 text-[12px] font-black text-slate-700">
                {log.workedDate}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
              <p className="text-[10px] font-black tracking-[0.08em] text-slate-400">
                LINKED SCHEDULE
              </p>
              <p className="mt-1 truncate text-[12px] font-black text-slate-700">
                {log.scheduleTitle || "연결 일정 없음"}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-[11px] font-black tracking-[0.08em] text-slate-400">
              WORK LOG
            </p>

            <div className="min-h-[260px] whitespace-pre-wrap rounded-xl border border-slate-200 bg-white px-5 py-4 text-[13px] leading-7 text-slate-700">
              {log.content || "작성된 내용이 없습니다."}
            </div>
          </div>

          {log.updatedAt ? (
            <p className="mt-3 text-[10px] font-medium text-slate-400">
              마지막 수정 · {log.updatedAt}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-3">
          <button
            type="button"
            onClick={() => onDelete(log)}
            className="flex h-10 items-center gap-2 rounded-xl border border-rose-200 px-4 text-[12px] font-black text-rose-600 transition hover:bg-rose-50"
          >
            <VscTrash size={15} />
            삭제
          </button>

          <button
            type="button"
            onClick={() => onEdit(log)}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#5873F9] px-4 text-[12px] font-black text-white transition hover:bg-[#4863E8]"
          >
            <VscEdit size={15} />
            수정
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DevlogPanel() {
  const fileSystem = useSelector((state) => state.fileSystem);
  const { workspaceId } = fileSystem || {};

  const pathname = usePathname();

  const workspaceNameFromState = useMemo(
    () => getWorkspaceNameFromState(fileSystem),
    [fileSystem],
  );

  const [logs, setLogs] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [workspaceDisplayName, setWorkspaceDisplayName] = useState("");

  const [selectedLog, setSelectedLog] = useState(null);
  const [showMissingSchedules, setShowMissingSchedules] = useState(false);
  const [filter, setFilter] = useState("all");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [editingLog, setEditingLog] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const isIdePage = useMemo(() => pathname?.includes("/ide/"), [pathname]);

  const displayWorkspaceName = useMemo(() => {
    return (
      workspaceDisplayName ||
      workspaceNameFromState ||
      logs[0]?.projectName ||
      "프로젝트"
    );
  }, [workspaceDisplayName, workspaceNameFromState, logs]);

  const filteredLogs = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    return logs.filter((log) => {
      if (filter === "linked" && !log.scheduleId) return false;
      if (filter === "general" && log.scheduleId) return false;
      if (filter === "progress" && log.status !== "progress") return false;
      if (filter === "done" && log.status !== "done") return false;

      if (startDateFilter && log.workedDate < startDateFilter) return false;
      if (endDateFilter && log.workedDate > endDateFilter) return false;

      if (keyword) {
        const searchableText = [
          log.title,
          log.content,
          log.scheduleTitle,
          log.projectName,
          log.workedDate,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchableText.includes(keyword)) return false;
      }

      return true;
    });
  }, [filter, logs, searchKeyword, startDateFilter, endDateFilter]);

  const selectedSchedule = useMemo(() => {
    if (!form.scheduleId) return null;

    return schedules.find(
      (schedule) => String(schedule.id) === String(form.scheduleId),
    );
  }, [form.scheduleId, schedules]);

  const missingDevlogSchedules = useMemo(
    () => schedules.filter((schedule) => !schedule.hasDevlog),
    [schedules],
  );

  const linkedLogCount = useMemo(
    () => logs.filter((log) => Boolean(log.scheduleId)).length,
    [logs],
  );

  const generalLogCount = useMemo(
    () => logs.filter((log) => !log.scheduleId).length,
    [logs],
  );

  const loadWorkspaceName = useCallback(async () => {
    if (!workspaceId) return;

    try {
      const workspaces = await getMyWorkspacesByTokenApi();
      const foundName = findWorkspaceNameFromList(workspaces, workspaceId);

      if (foundName) {
        setWorkspaceDisplayName(foundName);
      } else {
        setWorkspaceDisplayName("");
      }
    } catch (error) {
      console.error("워크스페이스 이름 로드 실패:", error);
      setWorkspaceDisplayName("");
    }
  }, [workspaceId]);

  const loadLogs = useCallback(async () => {
    if (!workspaceId) return;

    setIsLoadingLogs(true);

    try {
      const data = await fetchWorkspaceDevlogsApi(workspaceId);
      const normalized = Array.isArray(data) ? data.map(normalizeDevlog) : [];

      normalized.sort((a, b) => {
        const dateCompare = String(b.workedDate).localeCompare(
          String(a.workedDate),
        );

        if (dateCompare !== 0) return dateCompare;

        return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
      });

      setLogs(normalized);

      setSelectedLog((current) => {
        if (!current) return null;

        return (
          normalized.find((item) => String(item.id) === String(current.id)) ||
          null
        );
      });
    } catch (error) {
      console.error("개발일지 로드 실패:", error);
      alert(error?.message || "개발일지 목록을 불러오지 못했습니다.");
      setLogs([]);
      setSelectedLog(null);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [workspaceId]);

  const loadSchedules = useCallback(async () => {
    if (!workspaceId) return;

    setIsLoadingSchedules(true);

    try {
      const { year, month } = getCurrentYearMonth();

      const data = await fetchMainMonthSchedulesApi({
        workspaceId,
        year,
        month,
      });

      const normalized = Array.isArray(data) ? data.map(normalizeSchedule) : [];

      normalized.sort((a, b) => {
        const dateCompare = String(a.startDate).localeCompare(
          String(b.startDate),
        );

        if (dateCompare !== 0) return dateCompare;

        return String(a.title).localeCompare(String(b.title));
      });

      setSchedules(normalized);
    } catch (error) {
      console.error("일정 로드 실패:", error);
      setSchedules([]);
    } finally {
      setIsLoadingSchedules(false);
    }
  }, [workspaceId]);

  const reloadAll = useCallback(async () => {
    await Promise.all([loadWorkspaceName(), loadLogs(), loadSchedules()]);
  }, [loadWorkspaceName, loadLogs, loadSchedules]);

  useEffect(() => {
    if (!workspaceId) return;
    reloadAll();
  }, [workspaceId, reloadAll]);

  useEffect(() => {
    if (!selectedLog) return;

    const exists = filteredLogs.some(
      (log) => String(log.id) === String(selectedLog.id),
    );

    if (!exists) {
      setSelectedLog(null);
    }
  }, [filteredLogs, selectedLog]);

  const updateForm = (patch) => {
    setForm((prev) => ({
      ...prev,
      ...patch,
    }));
  };

  const resetFilters = () => {
    setFilter("all");
    setSearchKeyword("");
    setStartDateFilter("");
    setEndDateFilter("");
  };

  const openCreateGeneral = () => {
    setFormMode("create");
    setEditingLog(null);
    setForm({
      ...emptyForm,
      workedDate: getTodayDateKey(),
    });
    setFormOpen(true);
  };

  const openCreateFromSchedule = (schedule) => {
    setFormMode("create");
    setEditingLog(null);
    setForm({
      scheduleId: String(schedule.id),
      title: `${schedule.title} 개발일지`,
      content: "",
      workedDate: schedule.startDate || getTodayDateKey(),
      scheduleStatusAfterWrite: "none",
    });
    setFormOpen(true);
  };

  const openEdit = (log) => {
    if (!log) return;

    setFormMode("edit");
    setEditingLog(log);
    setForm({
      scheduleId: log.scheduleId ? String(log.scheduleId) : "",
      title: log.title || "",
      content: log.content || "",
      workedDate: log.workedDate || getTodayDateKey(),
      scheduleStatusAfterWrite: "none",
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    if (isSubmitting) return;

    setFormOpen(false);
    setEditingLog(null);
    setForm(emptyForm);
  };

  const handleSubmit = async () => {
    if (!workspaceId) {
      alert("워크스페이스 정보를 찾을 수 없습니다.");
      return;
    }

    if (!form.title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }

    if (!form.content.trim()) {
      alert("내용을 입력해주세요.");
      return;
    }

    if (!form.workedDate) {
      alert("작업 날짜를 선택해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (formMode === "edit" && editingLog) {
        await updateDevlogApi({
          devlogId: editingLog.id,
          scheduleId: form.scheduleId || null,
          title: form.title.trim(),
          content: form.content.trim(),
          workedDate: form.workedDate,
        });
      } else {
        await createWorkspaceDevlogApi({
          workspaceId,
          scheduleId: form.scheduleId || null,
          title: form.title.trim(),
          content: form.content.trim(),
          workedDate: form.workedDate,
          scheduleStatusAfterWrite: form.scheduleId
            ? form.scheduleStatusAfterWrite
            : "none",
        });
      }

      setFormOpen(false);
      setEditingLog(null);

      await reloadAll();
    } catch (error) {
      console.error("개발일지 저장 실패:", error);
      alert(error?.message || "개발일지 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (log) => {
    if (!log) return;

    const confirmed = window.confirm("이 개발일지를 삭제하시겠습니까?");
    if (!confirmed) return;

    try {
      await deleteDevlogApi(log.id);
      await reloadAll();
    } catch (error) {
      console.error("개발일지 삭제 실패:", error);
      alert(error?.message || "개발일지 삭제 중 오류가 발생했습니다.");
    }
  };

  if (!workspaceId) {
    return (
      <div className="flex h-full w-full flex-1 items-center justify-center bg-[#f5f7fb]">
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-10 py-8 text-center shadow-sm">
          <p className="text-[15px] font-extrabold text-slate-700">
            워크스페이스 정보를 불러올 수 없습니다.
          </p>
          <p className="mt-2 text-[13px] font-medium text-slate-400">
            메인 화면에서 프로젝트를 선택한 뒤 다시 들어와주세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-[#F7F8FA] font-sans">
      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
        <section className="mx-auto flex min-h-full w-full max-w-[1870px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* =================================================
              HEADER
             ================================================= */}
          <header className="shrink-0 border-b border-slate-100 px-5 py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-black tracking-[0.16em] text-[#5873F9]">
                    DEVLOG
                  </span>

                  {isIdePage ? (
                    <span className="rounded-full bg-[#EEF3FF] px-2.5 py-1 text-[10px] font-black text-[#5873F9]">
                      IDE
                    </span>
                  ) : null}
                </div>

                <div className="mt-1 flex flex-wrap items-baseline gap-2">
                  <h1 className="truncate text-[20px] font-black tracking-[-0.02em] text-slate-950">
                    {displayWorkspaceName}
                  </h1>

                  <span className="text-[12px] font-bold text-slate-400">
                    개발일지 관리
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] font-bold text-slate-400">
                  <span>
                    전체
                    <strong className="ml-1 text-slate-800">
                      {logs.length}
                    </strong>
                  </span>

                  <span>
                    일정 연결
                    <strong className="ml-1 text-[#5873F9]">
                      {linkedLogCount}
                    </strong>
                  </span>

                  <span>
                    일반
                    <strong className="ml-1 text-slate-800">
                      {generalLogCount}
                    </strong>
                  </span>

                  <span>
                    일지 미작성
                    <strong className="ml-1 text-amber-600">
                      {missingDevlogSchedules.length}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={reloadAll}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                  title="새로고침"
                >
                  <VscRefresh
                    size={17}
                    className={
                      isLoadingLogs || isLoadingSchedules ? "animate-spin" : ""
                    }
                  />
                </button>

                <button
                  type="button"
                  onClick={openCreateGeneral}
                  className="flex h-10 items-center gap-2 rounded-xl bg-[#5873F9] px-4 text-[12px] font-black text-white shadow-sm transition hover:bg-[#4863E8]"
                >
                  <VscAdd size={17} />
                  새 개발일지
                </button>
              </div>
            </div>
          </header>

          {/* =================================================
              TOOLBAR
             ================================================= */}
          <div className="shrink-0 border-b border-slate-100 px-5 py-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowMissingSchedules((prev) => !prev)}
                  className={`h-9 rounded-xl border px-3 text-[11px] font-black transition ${
                    showMissingSchedules
                      ? "border-amber-300 bg-amber-50 text-amber-700"
                      : "border-amber-200 bg-white text-amber-700 hover:bg-amber-50"
                  }`}
                >
                  일지 미작성 {missingDevlogSchedules.length}
                </button>

                {[
                  ["all", "전체"],
                  ["linked", "일정 연결"],
                  ["general", "일반 일지"],
                  ["progress", "진행 중"],
                  ["done", "완료"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilter(key)}
                    className={`h-9 rounded-xl px-3 text-[11px] font-black transition ${
                      filter === key
                        ? "bg-[#5873F9] text-white shadow-sm"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="grid w-full gap-2 xl:w-auto xl:grid-cols-[320px_138px_138px_auto]">
                <div className="relative">
                  <VscSearch
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={searchKeyword}
                    onChange={(event) => setSearchKeyword(event.target.value)}
                    placeholder="제목, 내용, 연결 일정 검색"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-[12px] font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#AAB8FF] focus:ring-2 focus:ring-[#5873F9]/10"
                  />
                </div>

                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(event) => setStartDateFilter(event.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-600 outline-none transition focus:border-[#AAB8FF] focus:ring-2 focus:ring-[#5873F9]/10"
                />

                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(event) => setEndDateFilter(event.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-600 outline-none transition focus:border-[#AAB8FF] focus:ring-2 focus:ring-[#5873F9]/10"
                />

                <button
                  type="button"
                  onClick={resetFilters}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                >
                  초기화
                </button>
              </div>
            </div>
          </div>

          {/* =================================================
              일지 미작성 일정 - 필요할 때만 펼침
             ================================================= */}
          {showMissingSchedules ? (
            <div className="shrink-0 border-b border-slate-100 bg-[#FFFDF7] px-5 py-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-[13px] font-black text-slate-800">
                    일지 미작성 일정
                  </h2>
                  <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                    아직 개발일지가 연결되지 않은 일정에서 바로 작성할 수 있습니다.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadSchedules}
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700"
                  title="일정 새로고침"
                >
                  <VscRefresh
                    size={15}
                    className={isLoadingSchedules ? "animate-spin" : ""}
                  />
                </button>
              </div>

              {isLoadingSchedules ? (
                <div className="rounded-xl border border-dashed border-amber-200 bg-white py-8 text-center text-[11px] font-bold text-slate-400">
                  일정을 불러오는 중입니다.
                </div>
              ) : missingDevlogSchedules.length === 0 ? (
                <div className="rounded-xl border border-dashed border-emerald-200 bg-white py-8 text-center">
                  <p className="text-[12px] font-black text-emerald-700">
                    모든 일정에 개발일지가 작성되어 있습니다.
                  </p>
                </div>
              ) : (
                <div className="grid max-h-[230px] gap-2 overflow-y-auto pr-1 md:grid-cols-2 2xl:grid-cols-3">
                  {missingDevlogSchedules.map((schedule) => (
                    <article
                      key={schedule.id}
                      className="flex items-center gap-3 rounded-xl border border-amber-100 bg-white px-3 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-1.5">
                          <ScheduleStatusBadge status={schedule.status} />

                          <span className="text-[10px] font-bold text-slate-400">
                            {schedule.startDate}
                            {schedule.startDate !== schedule.endDate
                              ? ` ~ ${schedule.endDate}`
                              : ""}
                          </span>
                        </div>

                        <h3 className="truncate text-[12px] font-black text-slate-800">
                          {schedule.title}
                        </h3>
                      </div>

                      <button
                        type="button"
                        onClick={() => openCreateFromSchedule(schedule)}
                        className="shrink-0 rounded-lg bg-[#FFF7E6] px-3 py-2 text-[10px] font-black text-amber-700 transition hover:bg-[#FFF0CC]"
                      >
                        작성
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* =================================================
              DEVLOG LIST
             ================================================= */}
          <div className="min-h-0 flex-1 px-5 py-4">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-black text-slate-900">
                  개발일지 목록
                </h2>
                <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                  일지를 선택하면 중앙 팝업에서 상세 내용을 확인할 수 있습니다.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {(searchKeyword || startDateFilter || endDateFilter) ? (
                  <span className="rounded-full bg-[#EEF3FF] px-2.5 py-1 text-[10px] font-black text-[#5873F9]">
                    필터 적용 중
                  </span>
                ) : null}

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500">
                  {filteredLogs.length}개
                </span>
              </div>
            </div>

            {isLoadingLogs ? (
              <div className="rounded-xl border border-dashed border-slate-200 py-20 text-center text-[12px] font-bold text-slate-400">
                개발일지를 불러오는 중입니다.
              </div>
            ) : filteredLogs.length === 0 ? (
              <button
                type="button"
                onClick={openCreateGeneral}
                className="w-full rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-20 text-center transition hover:bg-slate-50"
              >
                <p className="text-[13px] font-black text-slate-500">
                  조건에 맞는 개발일지가 없습니다.
                </p>
                <p className="mt-1 text-[11px] font-medium text-slate-400">
                  검색 조건을 변경하거나 새 일지를 작성해주세요.
                </p>
              </button>
            ) : (
              <div className="space-y-2">
                {filteredLogs.map((log) => (
                  <article
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-3.5 transition hover:border-[#AAB8FF] hover:bg-[#FBFCFF] hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-5">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-black text-slate-400">
                            {log.workedDate}
                          </span>

                          <DevlogTypeBadge type={log.type} />

                          {log.status ? (
                            <ScheduleStatusBadge status={log.status} />
                          ) : null}
                        </div>

                        <h3 className="truncate text-[14px] font-black text-slate-900">
                          {log.title}
                        </h3>

                        <p className="mt-1.5 line-clamp-2 text-[11px] leading-5 text-slate-500">
                          {log.content || "내용이 없습니다."}
                        </p>

                        {log.scheduleTitle ? (
                          <p className="mt-2 inline-flex rounded-full bg-[#EEF3FF] px-2.5 py-1 text-[10px] font-black text-[#5873F9]">
                            연결 일정: {log.scheduleTitle}
                          </p>
                        ) : null}
                      </div>

                      <span className="mt-1 shrink-0 text-[10px] font-black text-slate-300">
                        상세 보기
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <DevlogDetailModal
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      <DevlogFormModal
        open={formOpen}
        mode={formMode}
        form={form}
        schedules={schedules}
        selectedSchedule={selectedSchedule}
        onChange={updateForm}
        onClose={closeForm}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
  
}