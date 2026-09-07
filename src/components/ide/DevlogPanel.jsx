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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-6">
          <div>
            <h3 className="text-[18px] font-extrabold text-slate-950">
              {mode === "edit" ? "개발일지 수정" : "새 개발일지 작성"}
            </h3>
            <p className="mt-0.5 text-[12px] font-medium text-slate-400">
              {isLinked
                ? "선택한 일정과 연결된 개발일지입니다."
                : "일정과 연결하지 않는 일반 개발일지입니다."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <VscClose size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-[13px] font-extrabold text-slate-800">
                일지 유형
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      scheduleId: "",
                      scheduleStatusAfterWrite: "none",
                    })
                  }
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    !form.scheduleId
                      ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-[13px] font-extrabold">일반 일지</p>
                  <p
                    className={`mt-1 text-[11px] ${
                      !form.scheduleId ? "text-blue-100" : "text-slate-400"
                    }`}
                  >
                    일정 연결 없이 작성
                  </p>
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
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    form.scheduleId
                      ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-[13px] font-extrabold">일정 연결 일지</p>
                  <p
                    className={`mt-1 text-[11px] ${
                      form.scheduleId ? "text-blue-100" : "text-slate-400"
                    }`}
                  >
                    선택한 일정에 기록 연결
                  </p>
                </button>
              </div>
            </div>

            {form.scheduleId ? (
              <div>
                <label className="mb-2 block text-[13px] font-extrabold text-slate-800">
                  연결 일정
                </label>

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
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                >
                  {schedules.map((schedule) => (
                    <option key={schedule.id} value={schedule.id}>
                      {schedule.title} · {schedule.startDate}
                    </option>
                  ))}
                </select>

                {selectedScheduleTitle ? (
                  <p className="mt-2 text-[12px] font-medium text-blue-600">
                    현재 연결된 일정: {selectedScheduleTitle}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div>
              <label className="mb-2 block text-[13px] font-extrabold text-slate-800">
                제목
              </label>

              <input
                value={form.title}
                onChange={(event) => onChange({ title: event.target.value })}
                placeholder="예: 로그인 토큰 저장 로직 수정"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[14px] font-bold text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />
            </div>

            <div>
              <label className="mb-2 block text-[13px] font-extrabold text-slate-800">
                작업 날짜
              </label>

              <input
                type="date"
                value={form.workedDate}
                onChange={(event) =>
                  onChange({ workedDate: event.target.value })
                }
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[14px] font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />
            </div>

            <div>
              <label className="mb-2 block text-[13px] font-extrabold text-slate-800">
                내용
              </label>

              <textarea
                value={form.content}
                onChange={(event) => onChange({ content: event.target.value })}
                placeholder={`오늘 작업한 내용을 작성해주세요.

예)
- 개발일지 화면을 새 API 기준으로 분리
- 일정 연결 일지와 일반 일지 작성 흐름 구성
- 기존 개발일지 API 충돌 제거`}
                className="min-h-[220px] w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-4 text-[14px] leading-7 text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />
            </div>

            {form.scheduleId ? (
              <div>
                <label className="mb-2 block text-[13px] font-extrabold text-slate-800">
                  작성 후 일정 상태 변경
                </label>

                <select
                  value={form.scheduleStatusAfterWrite}
                  onChange={(event) =>
                    onChange({ scheduleStatusAfterWrite: event.target.value })
                  }
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                >
                  <option value="none">변경하지 않음</option>
                  <option value="todo">할 일</option>
                  <option value="progress">진행 중</option>
                  <option value="done">완료</option>
                  <option value="delayed">지연</option>
                </select>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex h-16 shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-6">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-slate-200 px-4 text-[13px] font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
          >
            취소
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="h-10 rounded-xl bg-blue-600 px-5 text-[13px] font-extrabold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "저장 중..." : mode === "edit" ? "수정 완료" : "저장"}
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
        if (!current) return normalized[0] || null;
        return (
          normalized.find((item) => String(item.id) === String(current.id)) ||
          normalized[0] ||
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
      setSelectedLog(filteredLogs[0] || null);
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
    <div className="flex h-full w-full flex-1 flex-col overflow-hidden bg-[#f5f7fb] font-sans">
      <div className="flex-1 overflow-y-auto px-5 py-5 md:px-7 md:py-7 2xl:px-10">
        <div className="mx-auto flex w-full max-w-[1870px] flex-col gap-5">
          <section className="overflow-hidden rounded-[30px] border border-blue-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 via-white to-slate-50 px-6 py-5 md:px-7">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-blue-600 px-3 py-1 text-[11px] font-extrabold text-white">
                      개발일지
                    </span>

                    {isIdePage ? (
                      <span className="rounded-full border border-blue-100 bg-white px-3 py-1 text-[11px] font-bold text-blue-600">
                        IDE 내부 패널
                      </span>
                    ) : null}
                  </div>

                  <h1 className="text-[25px] font-black tracking-[-0.03em] text-slate-950 md:text-[28px]">
                    {displayWorkspaceName} 개발일지
                  </h1>

                  <p className="mt-1.5 text-[13px] font-medium text-slate-500">
                    일정과 연결된 작업 기록, 일반 개발 기록을 한 화면에서 관리합니다.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={reloadAll}
                    className="flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-[13px] font-extrabold text-slate-600 transition hover:bg-slate-50"
                  >
                    <VscRefresh
                      size={17}
                      className={
                        isLoadingLogs || isLoadingSchedules ? "animate-spin" : ""
                      }
                    />
                    새로고침
                  </button>

                  <button
                    type="button"
                    onClick={openCreateGeneral}
                    className="flex h-11 items-center gap-2 rounded-2xl bg-blue-600 px-5 text-[13px] font-extrabold text-white shadow-sm transition hover:bg-blue-700"
                  >
                    <VscAdd size={18} />새 개발일지
                  </button>
                </div>
              </div>
            </div>

          
          </section>

          <section className="grid min-h-[650px] grid-cols-1 gap-5 xl:grid-cols-[340px_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(0,1fr)_430px]">
            <aside className="flex min-h-0 flex-col rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[18px] font-black text-slate-950">
                    워크스페이스 일정
                  </h2>
                  <p className="mt-1 text-[12px] font-medium text-slate-400">
                    일정별로 개발일지를 작성할 수 있습니다.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadSchedules}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <VscRefresh
                    size={18}
                    className={isLoadingSchedules ? "animate-spin" : ""}
                  />
                </button>
              </div>

              <div className="mb-4 flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <VscCalendar className="text-blue-600" size={17} />
                  <span className="text-[13px] font-extrabold text-slate-700">
                    이번 달 일정
                  </span>
                </div>
                <span className="text-[12px] font-black text-blue-600">
                  {schedules.length}개
                </span>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {isLoadingSchedules ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 py-16 text-center text-[13px] font-bold text-slate-400">
                    일정을 불러오는 중입니다.
                  </div>
                ) : schedules.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 px-5 py-10 text-center">
                    <p className="text-[13px] font-extrabold text-slate-500">
                      등록된 일정이 없습니다.
                    </p>
                    <p className="mt-1 text-[12px] font-medium text-slate-400">
                      일정관리에서 일정을 먼저 등록해주세요.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {schedules.map((schedule) => (
                      <article
                        key={schedule.id}
                        className="rounded-3xl border border-slate-100 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.03)] transition hover:border-blue-200 hover:shadow-md"
                      >
                        <div className="mb-2 flex flex-wrap items-center gap-1.5">
                          <ScheduleStatusBadge status={schedule.status} />

                          {schedule.hasDevlog ? (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                              작성됨
                            </span>
                          ) : null}
                        </div>

                        <h3 className="line-clamp-2 text-[14px] font-black leading-snug text-slate-900">
                          {schedule.title}
                        </h3>

                        <p className="mt-2 text-[12px] font-bold text-slate-400">
                          {schedule.startDate}
                          {schedule.startDate !== schedule.endDate
                            ? ` ~ ${schedule.endDate}`
                            : ""}
                        </p>

                        {schedule.description ? (
                          <p className="mt-2 line-clamp-2 text-[12px] leading-5 text-slate-500">
                            {schedule.description}
                          </p>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => openCreateFromSchedule(schedule)}
                          className="mt-4 h-9 w-full rounded-xl bg-blue-600 text-[12px] font-extrabold text-white transition hover:bg-blue-700"
                        >
                          이 일정으로 일지 쓰기
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </aside>

            <main className="flex min-h-0 flex-col rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[18px] font-black text-slate-950">
                      작성된 일지
                    </h2>
                    <p className="mt-1 text-[12px] font-medium text-slate-400">
                      검색하거나 날짜를 지정해 필요한 기록만 확인합니다.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={loadLogs}
                    className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    <VscRefresh
                      size={18}
                      className={isLoadingLogs ? "animate-spin" : ""}
                    />
                  </button>
                </div>

                <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_160px_160px_auto]">
                  <div className="relative">
                    <VscSearch
                      size={17}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      value={searchKeyword}
                      onChange={(event) => setSearchKeyword(event.target.value)}
                      placeholder="제목, 내용, 연결 일정 검색"
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-[13px] font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    />
                  </div>

                  <input
                    type="date"
                    value={startDateFilter}
                    onChange={(event) => setStartDateFilter(event.target.value)}
                    className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-600 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  />

                  <input
                    type="date"
                    value={endDateFilter}
                    onChange={(event) => setEndDateFilter(event.target.value)}
                    className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-600 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  />

                  <button
                    type="button"
                    onClick={resetFilters}
                    className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-[12px] font-extrabold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                  >
                    초기화
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    ["all", "전체"],
                    ["linked", "일정 연결"],
                    ["general", "일반"],
                    ["progress", "진행 중"],
                    ["done", "완료"],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFilter(key)}
                      className={`h-9 rounded-xl px-3 text-[12px] font-extrabold transition ${
                        filter === key
                          ? "bg-blue-600 text-white shadow-sm"
                          : "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-3 flex items-center justify-between text-[12px]">
                <span className="font-bold text-slate-400">
                  총 {filteredLogs.length}개의 일지
                </span>
                {(searchKeyword || startDateFilter || endDateFilter) && (
                  <span className="font-bold text-blue-600">필터 적용 중</span>
                )}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {isLoadingLogs ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 py-20 text-center text-[13px] font-bold text-slate-400">
                    개발일지를 불러오는 중입니다.
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <button
                    type="button"
                    onClick={openCreateGeneral}
                    className="w-full rounded-3xl border border-dashed border-slate-300 py-16 text-center transition hover:bg-slate-50"
                  >
                    <p className="text-[14px] font-extrabold text-slate-500">
                      조건에 맞는 개발일지가 없습니다.
                    </p>
                    <p className="mt-1 text-[12px] font-medium text-slate-400">
                      검색어나 날짜 필터를 조정하거나 새 일지를 작성해보세요.
                    </p>
                  </button>
                ) : (
                  <div className="grid gap-3 2xl:grid-cols-2">
                    {filteredLogs.map((log) => {
                      const active = String(selectedLog?.id) === String(log.id);

                      return (
                        <article
                          key={log.id}
                          onClick={() => setSelectedLog(log)}
                          className={`cursor-pointer rounded-3xl border p-5 transition ${
                            active
                              ? "border-blue-500 bg-blue-50 shadow-md"
                              : "border-slate-100 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.03)] hover:border-blue-200 hover:shadow-md"
                          }`}
                        >
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-black text-slate-400">
                              {log.workedDate}
                            </span>

                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                log.scheduleId
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {log.scheduleId ? "일정 연결" : "일반 일지"}
                            </span>

                            {log.status ? (
                              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700">
                                {scheduleStatusLabel[log.status] || log.status}
                              </span>
                            ) : null}
                          </div>

                          <h3 className="line-clamp-1 text-[16px] font-black text-slate-950">
                            {log.title}
                          </h3>

                          {log.scheduleTitle ? (
                            <p className="mt-2 line-clamp-1 text-[12px] font-bold text-blue-600">
                              연결 일정: {log.scheduleTitle}
                            </p>
                          ) : null}

                          <p className="mt-2 line-clamp-2 text-[13px] leading-6 text-slate-500">
                            {log.content || "내용이 없습니다."}
                          </p>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </main>

            <aside className="flex min-h-0 flex-col rounded-[28px] border border-slate-200 bg-white shadow-sm xl:col-span-2 2xl:col-span-1">
              {selectedLog ? (
                <>
                  <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-5">
                    <button
                      type="button"
                      onClick={() => setSelectedLog(null)}
                      className="flex items-center gap-1 text-[13px] font-extrabold text-slate-500 transition hover:text-slate-900"
                    >
                      <VscChevronLeft size={17} />
                      상세 닫기
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(selectedLog)}
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                      >
                        <VscEdit size={17} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(selectedLog)}
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      >
                        <VscTrash size={17} />
                      </button>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto p-6">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <DevlogTypeBadge type={selectedLog.type} />

                      {selectedLog.status ? (
                        <ScheduleStatusBadge status={selectedLog.status} />
                      ) : null}
                    </div>

                    <h2 className="text-[24px] font-black leading-tight tracking-[-0.03em] text-slate-950">
                      {selectedLog.title}
                    </h2>

                    <p className="mt-3 text-[13px] font-bold text-slate-400">
                      작업 날짜 {selectedLog.workedDate}
                    </p>

                    {selectedLog.scheduleTitle ? (
                      <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                        <p className="text-[12px] font-extrabold text-blue-700">
                          연결 일정
                        </p>
                        <p className="mt-1 text-[13px] font-bold text-blue-950">
                          {selectedLog.scheduleTitle}
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-6">
                      <h3 className="mb-3 text-[14px] font-black text-slate-950">
                        작성 내용
                      </h3>

                      <div className="min-h-[260px] whitespace-pre-wrap rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5 text-[14px] leading-7 text-slate-700">
                        {selectedLog.content || "작성된 내용이 없습니다."}
                      </div>
                    </div>

                    {selectedLog.updatedAt ? (
                      <p className="mt-4 text-[11px] font-medium text-slate-400">
                        마지막 수정: {selectedLog.updatedAt}
                      </p>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center px-8 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-blue-50 text-blue-500">
                    <VscCalendar size={26} />
                  </div>

                  <p className="text-[15px] font-black text-slate-700">
                    선택된 일지가 없습니다.
                  </p>
                  <p className="mt-2 text-[13px] leading-6 text-slate-400">
                    작성된 일지를 선택하면 상세 내용이 이 영역에 표시됩니다.
                  </p>
                </div>
              )}
            </aside>
          </section>
        </div>
      </div>

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