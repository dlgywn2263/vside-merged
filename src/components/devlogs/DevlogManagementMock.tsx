"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Download,
  FilePenLine,
  FolderOpen,
  Link2,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

import {
  createWorkspaceDevlogApi,
  deleteDevlogApi,
  fetchWorkspaceDevlogsApi,
  getMyWorkspacesByTokenApi,
  updateDevlogApi,
} from "@/lib/ide/api";

import {
  fetchWorkspaceSchedulesApi,
  type ScheduleApiItem,
} from "@/lib/schedules/scheduleApi";

import type {
  DevlogFilter,
  DevlogItem,
  ScheduleOption,
} from "./devlog.types";

import {
  extractWorkspaceList,
  getTodayDateKey,
  normalizeWorkspaceId,
  scheduleStatusLabel,
  statusStyle,
} from "./devlog.utils";

import { CreateDevlogModal } from "./components/CreateDevlogModal";
import { DevlogEmptyBox } from "./components/DevlogEmptyBox";
import { DevlogFilterButton } from "./components/DevlogFilterButton";
import { DevlogListPanel } from "./components/DevlogListPanel";

type WorkspaceMode = "personal" | "team";
type ProjectFilter = "all" | WorkspaceMode;

type WorkspaceLike = {
  id?: string;
  uuid?: string;
  workspaceId?: string;
  name?: string;
  title?: string;
  projectName?: string;
  mode?: WorkspaceMode;
  type?: WorkspaceMode;
  role?: string;
  childCount?: number;
  subProjectCount?: number;
  childrenCount?: number;
  children?: unknown[];
};

type WorkspaceSidebarItem = {
  id: string;
  uuid?: string;
  workspaceId?: string;
  name: string;
  mode: WorkspaceMode;
  role?: string;
  childCount: number;
};


function mapScheduleFromApi(item: ScheduleApiItem): ScheduleOption {
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    projectName: item.projectName || "프로젝트",
    title: item.title,
    status: item.status,
    hasDevlog: item.hasDevlog,
    startDate: item.startDate,
    endDate: item.endDate,
  };
}

function mapDevlogFromApi(item: any): DevlogItem {
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    projectName: item.projectName ?? "프로젝트",
    title: item.title ?? "",
    content: item.content ?? "",
    date: item.date ?? item.workedDate,
    workedDate: item.workedDate ?? item.date,
    type: item.type ?? (item.scheduleId ? "linked" : "general"),
    scheduleId: item.scheduleId ?? null,
    scheduleTitle: item.scheduleTitle ?? null,
    status: item.status ?? item.scheduleStatus ?? null,
    tags: Array.isArray(item.tags) ? item.tags : [],
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function mapWorkspaceFromApi(
  item: WorkspaceLike,
): WorkspaceSidebarItem | null {
  const id = item.uuid || item.id || item.workspaceId;

  if (!id) return null;

  const mode = item.mode || item.type || "personal";

  return {
    id,
    uuid: item.uuid,
    workspaceId: item.workspaceId,
    name:
      item.name ||
      item.title ||
      item.projectName ||
      "이름 없는 프로젝트",
    mode,
    role: item.role,
    childCount:
      item.childCount ??
      item.subProjectCount ??
      item.childrenCount ??
      (Array.isArray(item.children) ? item.children.length : 0),
  };
}

function isSameWorkspace(
  workspace: WorkspaceSidebarItem,
  targetWorkspaceId: string,
) {
  return (
    workspace.id === targetWorkspaceId ||
    workspace.uuid === targetWorkspaceId ||
    workspace.workspaceId === targetWorkspaceId
  );
}

function escapePrintHtml(value: string) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapePrintHtmlWithLineBreaks(value: string) {
  return escapePrintHtml(value).replaceAll("\n", "<br />");
}

function getPrintDateLabel() {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function getDevlogDocumentStatusLabel(devlog: DevlogItem) {
  if (devlog.type === "general") return "일반 일지";
  if (!devlog.status) return "일정 연결";

  return (
    scheduleStatusLabel[
      devlog.status as keyof typeof scheduleStatusLabel
    ] ?? "일정 연결"
  );
}

function getDevlogDocumentTypeLabel(devlog: DevlogItem) {
  return devlog.type === "linked" ? "일정 연결" : "일반 일지";
}

export default function DevlogManagementMock() {
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const workspaceId = normalizeWorkspaceId(
    searchParams.get("workspaceId") ?? searchParams.get("id"),
  );

  const [workspaces, setWorkspaces] = useState<WorkspaceSidebarItem[]>([]);
  const [workspaceName, setWorkspaceName] = useState("프로젝트");

  const [schedules, setSchedules] = useState<ScheduleOption[]>([]);
  const [devlogs, setDevlogs] = useState<DevlogItem[]>([]);

  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [workspaceErrorMessage, setWorkspaceErrorMessage] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedDevlogId, setSelectedDevlogId] = useState("");
  const [filter, setFilter] = useState<DevlogFilter>("all");
  const [query, setQuery] = useState("");

  const [isSidebarPinned, setIsSidebarPinned] = useState(true);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [canSidebarHoverExpand, setCanSidebarHoverExpand] = useState(true);

  // 화면 최상단에서는 메인과 정확히 같은 시작 위치를 유지하고,
  // 스크롤이 시작된 뒤에만 sticky 기준을 헤더 아래로 바꿉니다.
  const [isPageScrolled, setIsPageScrolled] = useState(false);

  const [projectSearch, setProjectSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>("all");
  const [showNoDevlogPanel, setShowNoDevlogPanel] = useState(false);

  const projectSearchInputRef = useRef<HTMLInputElement | null>(null);
  const autoCreateHandledRef = useRef("");

  const sidebarExpanded =
    isSidebarPinned ||
    (canSidebarHoverExpand && isSidebarHovered);

  useEffect(() => {
    const handleScroll = () => {
      setIsPageScrolled(window.scrollY > 0);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [editingDevlog, setEditingDevlog] =
    useState<DevlogItem | null>(null);

  const [deletingDevlogId, setDeletingDevlogId] = useState("");

  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formDate, setFormDate] = useState(getTodayDateKey());
  const [formScheduleId, setFormScheduleId] = useState("");

  const [formStatusChange, setFormStatusChange] = useState<
    "none" | "progress" | "done"
  >("none");

  const loadWorkspaces = async () => {
    try {
      setWorkspaceLoading(true);
      setWorkspaceErrorMessage("");

      const response = await getMyWorkspacesByTokenApi();

      const mapped = extractWorkspaceList(response)
        .map(mapWorkspaceFromApi)
        .filter(
          (item): item is WorkspaceSidebarItem => Boolean(item),
        );

      setWorkspaces(mapped);

      if (mapped.length === 0) {
        setWorkspaceName("프로젝트");
        setWorkspaceErrorMessage("접근 가능한 프로젝트가 없습니다.");
        return;
      }

      if (!workspaceId) {
        const firstWorkspace = mapped[0];

        const params = new URLSearchParams(searchParams.toString());

        params.set("workspaceId", firstWorkspace.id);
        params.set("mode", firstWorkspace.mode);

        if (typeof window !== "undefined") {
          localStorage.setItem(
            "currentWorkspaceId",
            firstWorkspace.id,
          );

          localStorage.setItem(
            "currentWorkspaceMode",
            firstWorkspace.mode,
          );
        }

        setWorkspaceName(firstWorkspace.name);

        router.replace(`${pathname}?${params.toString()}`);

        return;
      }

      const matchedWorkspace = mapped.find((workspace) =>
        isSameWorkspace(workspace, workspaceId),
      );

      if (matchedWorkspace) {
        setWorkspaceName(matchedWorkspace.name);

        if (typeof window !== "undefined") {
          localStorage.setItem(
            "currentWorkspaceId",
            matchedWorkspace.id,
          );

          localStorage.setItem(
            "currentWorkspaceMode",
            matchedWorkspace.mode,
          );
        }

        return;
      }

      if (typeof window !== "undefined") {
        localStorage.removeItem("currentWorkspaceId");
        localStorage.removeItem("currentWorkspaceMode");
      }

      const firstWorkspace = mapped[0];

      const params = new URLSearchParams(searchParams.toString());

      params.set("workspaceId", firstWorkspace.id);
      params.set("mode", firstWorkspace.mode);

      setWorkspaceName(firstWorkspace.name);

      setWorkspaceErrorMessage(
        "접근 권한이 없는 프로젝트입니다. 접근 가능한 프로젝트로 이동합니다.",
      );

      router.replace(`${pathname}?${params.toString()}`);
    } catch {
      setWorkspaceErrorMessage(
        "프로젝트 목록을 불러오지 못했습니다.",
      );
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const loadWorkspaceName = async () => {
    if (!workspaceId) {
      setWorkspaceName("프로젝트");
      return;
    }

    const matchedWorkspace = workspaces.find((workspace) =>
      isSameWorkspace(workspace, workspaceId),
    );

    if (matchedWorkspace) {
      setWorkspaceName(matchedWorkspace.name);
      return;
    }

    try {
      const response = await getMyWorkspacesByTokenApi();

      const workspaceList = extractWorkspaceList(response);

      const matchedWorkspaceFromApi = workspaceList.find((workspace) => {
        return (
          workspace.uuid === workspaceId ||
          workspace.id === workspaceId ||
          workspace.workspaceId === workspaceId
        );
      });

      const name =
        matchedWorkspaceFromApi?.name ||
        matchedWorkspaceFromApi?.title ||
        matchedWorkspaceFromApi?.projectName;

      setWorkspaceName(name?.trim() || "프로젝트");
    } catch {
      setWorkspaceName("프로젝트");
    }
  };

  const loadDevlogData = async () => {
    if (workspaceLoading) {
      return;
    }

    if (!workspaceId) {
      setLoading(false);

      setErrorMessage(
        "workspaceId가 없습니다. 메인에서 프로젝트를 다시 선택해주세요.",
      );

      return;
    }

    const matchedWorkspace = workspaces.find((workspace) =>
      isSameWorkspace(workspace, workspaceId),
    );

    if (!matchedWorkspace) {
      setLoading(false);
      setSchedules([]);
      setDevlogs([]);

      setErrorMessage(
        "접근 권한이 없는 프로젝트입니다. 메인에서 프로젝트를 다시 선택해주세요.",
      );

      if (typeof window !== "undefined") {
        const savedWorkspaceId =
          localStorage.getItem("currentWorkspaceId");

        if (savedWorkspaceId === workspaceId) {
          localStorage.removeItem("currentWorkspaceId");
          localStorage.removeItem("currentWorkspaceMode");
        }
      }

      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const [scheduleResult, devlogResult] = await Promise.all([
        fetchWorkspaceSchedulesApi({
          workspaceId,
        }),
        fetchWorkspaceDevlogsApi(workspaceId),
      ]);

      const mappedSchedules =
        scheduleResult.map(mapScheduleFromApi);

      const mappedDevlogs = Array.isArray(devlogResult)
        ? devlogResult.map(mapDevlogFromApi)
        : [];

      setSchedules(mappedSchedules);
      setDevlogs(mappedDevlogs);

      const currentProjectName =
        mappedDevlogs[0]?.projectName ||
        mappedSchedules[0]?.projectName;

      if (currentProjectName) {
        setWorkspaceName(currentProjectName);
      }

      setSelectedDevlogId((prev) => {
        if (
          prev &&
          mappedDevlogs.some((item) => item.id === prev)
        ) {
          return prev;
        }

        return mappedDevlogs[0]?.id ?? "";
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "개발일지 데이터를 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkspaces();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (workspaceLoading) return;

    void loadWorkspaceName();
    void loadDevlogData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, workspaceLoading, workspaces]);

  const noDevlogSchedules = useMemo(() => {
    return schedules.filter((schedule) => {
      const linkedByDevlog = devlogs.some(
        (devlog) => devlog.scheduleId === schedule.id,
      );

      return !schedule.hasDevlog && !linkedByDevlog;
    });
  }, [devlogs, schedules]);

  const currentWorkspace = useMemo(() => {
    return (
      workspaces.find((workspace) =>
        isSameWorkspace(workspace, workspaceId),
      ) ?? null
    );
  }, [workspaceId, workspaces]);

  const currentWorkspaceMode: WorkspaceMode =
    currentWorkspace?.mode ||
    (searchParams.get("mode") === "team" ? "team" : "personal");

  const currentWorkspaceRole =
    currentWorkspace?.role?.toUpperCase() === "OWNER"
      ? "OWNER"
      : "MEMBER";

  const filteredDevlogs = useMemo(() => {
    return devlogs.filter((item) => {
      const matchesFilter =
        filter === "all" ||
        item.type === filter ||
        item.status === filter;

      const keyword = query.trim().toLowerCase();

      const matchesQuery =
        !keyword ||
        item.title.toLowerCase().includes(keyword) ||
        item.content.toLowerCase().includes(keyword) ||
        item.tags.some((tag) =>
          tag.toLowerCase().includes(keyword),
        ) ||
        item.scheduleTitle?.toLowerCase().includes(keyword);

      return matchesFilter && matchesQuery;
    });
  }, [devlogs, filter, query]);

  const selectedDevlog =
    filteredDevlogs.find(
      (item) => item.id === selectedDevlogId,
    ) ??
    filteredDevlogs[0] ??
    null;

  const totalDevlogs = filteredDevlogs.length;

  const linkedDevlogs = filteredDevlogs.filter(
    (item) => item.type === "linked",
  ).length;

  const generalDevlogs = filteredDevlogs.filter(
    (item) => item.type === "general",
  ).length;

  const currentWeekRange = useMemo(() => {
    const today = new Date();

    const day = today.getDay();

    const mondayDiff = day === 0 ? -6 : 1 - day;

    const start = new Date(today);

    start.setHours(0, 0, 0, 0);
    start.setDate(today.getDate() + mondayDiff);

    const end = new Date(start);

    end.setDate(start.getDate() + 6);

    const toDateKey = (dateValue: Date) => {
      const year = dateValue.getFullYear();

      const month = String(
        dateValue.getMonth() + 1,
      ).padStart(2, "0");

      const date = String(
        dateValue.getDate(),
      ).padStart(2, "0");

      return `${year}-${month}-${date}`;
    };

    const toShortDateLabel = (dateValue: Date) => {
      const year = String(
        dateValue.getFullYear(),
      ).slice(2);

      const month = String(
        dateValue.getMonth() + 1,
      ).padStart(2, "0");

      const date = String(
        dateValue.getDate(),
      ).padStart(2, "0");

      return `${year}.${month}.${date}`;
    };

    return {
      startKey: toDateKey(start),
      endKey: toDateKey(end),
      label: `${toShortDateLabel(start)} ~ ${toShortDateLabel(end)}`,
    };
  }, []);

  const weeklyDevlogs = filteredDevlogs.filter((item) => {
    const workedDate = item.workedDate || item.date;

    return Boolean(
      workedDate &&
        workedDate >= currentWeekRange.startKey &&
        workedDate <= currentWeekRange.endKey,
    );
  }).length;

  const doneLinkedSchedules = filteredDevlogs.filter(
    (item) =>
      item.type === "linked" &&
      item.status === "done",
  ).length;

  const handleSelectWorkspace = (
    workspace: WorkspaceSidebarItem,
  ) => {
    const params = new URLSearchParams(
      searchParams.toString(),
    );

    params.set("workspaceId", workspace.id);
    params.set("mode", workspace.mode);

    router.push(
      `${pathname}?${params.toString()}`,
    );
  };

  const handleToggleSidebar = () => {
    if (isSidebarPinned) {
      setIsSidebarPinned(false);
      setIsSidebarHovered(false);
      setCanSidebarHoverExpand(false);
      return;
    }

    setIsSidebarPinned(true);
    setIsSidebarHovered(false);
    setCanSidebarHoverExpand(true);
  };

  const openSidebarForSearch = () => {
    setIsSidebarPinned(true);
    setIsSidebarHovered(false);
    setCanSidebarHoverExpand(true);

    requestAnimationFrame(() => {
      projectSearchInputRef.current?.focus();
    });
  };

  const openSidebarForProjects = () => {
    setIsSidebarPinned(true);
    setIsSidebarHovered(false);
    setCanSidebarHoverExpand(true);
    setProjectFilter("all");
  };

  const handleSelectDevlog = (
    devlogId: string,
  ) => {
    setSelectedDevlogId(devlogId);
    setIsDetailModalOpen(true);
  };

  const resetForm = () => {
    setFormTitle("");
    setFormContent("");
    setFormDate(getTodayDateKey());
    setFormScheduleId("");
    setFormStatusChange("none");
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const openCreateModalWithSchedule = (
    scheduleId: string,
  ) => {
    resetForm();
    setFormScheduleId(scheduleId);
    setFormStatusChange("progress");
    setIsCreateModalOpen(true);
  };

  /* =====================================================
     일정관리 -> 개발일지 자동 연결

     /devlogs?workspaceId=...&create=1&scheduleId=...
     로 진입하면 해당 일정을 자동 선택하고 작성 모달을 연다.
     ===================================================== */
  useEffect(() => {
    const shouldCreate = searchParams.get("create") === "1";
    const requestedScheduleId = searchParams.get("scheduleId");

    if (
      !shouldCreate ||
      !requestedScheduleId ||
      !workspaceId ||
      workspaceLoading ||
      loading
    ) {
      return;
    }

    const targetSchedule = schedules.find(
      (schedule) => String(schedule.id) === String(requestedScheduleId),
    );

    if (!targetSchedule) {
      return;
    }

    const handledKey = `${workspaceId}:${requestedScheduleId}`;

    if (autoCreateHandledRef.current === handledKey) {
      return;
    }

    autoCreateHandledRef.current = handledKey;

    openCreateModalWithSchedule(targetSchedule.id);
    setShowNoDevlogPanel(false);

    // 모달을 닫은 뒤 같은 URL 때문에 다시 열리지 않도록
    // 1회 처리용 query만 제거한다. workspaceId/mode는 유지한다.
    const params = new URLSearchParams(searchParams.toString());

    params.delete("create");
    params.delete("scheduleId");

    const queryString = params.toString();

    router.replace(
      queryString ? `${pathname}?${queryString}` : pathname,
    );
  }, [
    loading,
    pathname,
    router,
    schedules,
    searchParams,
    workspaceId,
    workspaceLoading,
  ]);

  const closeCreateModal = () => {
    if (saving) return;

    setIsCreateModalOpen(false);
  };

  const createDevlog = async () => {
    if (!workspaceId) {
      alert(
        "workspaceId가 없습니다. 메인에서 프로젝트를 다시 선택해주세요.",
      );

      return;
    }

    if (!formTitle.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }

    if (!formDate) {
      alert("작업한 날짜를 선택해주세요.");
      return;
    }

    if (!formContent.trim()) {
      alert("내용을 입력해주세요.");
      return;
    }

    try {
      setSaving(true);

      const created =
        await createWorkspaceDevlogApi({
          workspaceId,
          scheduleId: formScheduleId || null,
          title: formTitle.trim(),
          content: formContent.trim(),
          workedDate: formDate,
          scheduleStatusAfterWrite:
            formScheduleId
              ? formStatusChange
              : "none",
        });

      const mapped = mapDevlogFromApi(created);

      setDevlogs((prev) => [
        mapped,
        ...prev,
      ]);

      setSelectedDevlogId(mapped.id);

      setIsDetailModalOpen(true);

      await loadDevlogData();

      resetForm();

      setIsCreateModalOpen(false);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "개발일지 저장에 실패했습니다.",
      );
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (
    devlog: DevlogItem,
  ) => {
    setIsDetailModalOpen(false);
    setEditingDevlog(devlog);

    setFormTitle(devlog.title ?? "");

    setFormContent(devlog.content ?? "");

    setFormDate(
      devlog.workedDate ||
        devlog.date ||
        getTodayDateKey(),
    );

    setFormScheduleId(
      devlog.scheduleId ?? "",
    );

    setFormStatusChange("none");

    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    if (saving) return;

    setIsEditModalOpen(false);

    setEditingDevlog(null);

    resetForm();
  };

  const updateDevlog = async () => {
    if (!editingDevlog) return;

    if (!formTitle.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }

    if (!formDate) {
      alert("작업한 날짜를 선택해주세요.");
      return;
    }

    if (!formContent.trim()) {
      alert("내용을 입력해주세요.");
      return;
    }

    try {
      setSaving(true);

      const updated = await updateDevlogApi({
        devlogId: editingDevlog.id,
        scheduleId: formScheduleId || null,
        title: formTitle.trim(),
        content: formContent.trim(),
        workedDate: formDate,
      });

      const mapped =
        mapDevlogFromApi(updated);

      setDevlogs((prev) =>
        prev.map((item) =>
          item.id === mapped.id
            ? mapped
            : item,
        ),
      );

      setSelectedDevlogId(mapped.id);

      setIsDetailModalOpen(true);

      await loadDevlogData();

      closeEditModal();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "개발일지 수정에 실패했습니다.",
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteDevlog = async (
    devlog: DevlogItem,
  ) => {
    const confirmed = window.confirm(
      `"${devlog.title || "제목 없는 개발일지"}" 개발일지를 삭제할까요?\n삭제 후에는 되돌릴 수 없습니다.`,
    );

    if (!confirmed) return;

    try {
      setDeletingDevlogId(devlog.id);

      await deleteDevlogApi(devlog.id);

      if (selectedDevlogId === devlog.id) {
        setIsDetailModalOpen(false);
      }

      setDevlogs((prev) => {
        const next = prev.filter(
          (item) => item.id !== devlog.id,
        );

        setSelectedDevlogId(
          (currentId) => {
            if (
              currentId !== devlog.id
            ) {
              return currentId;
            }

            return next[0]?.id ?? "";
          },
        );

        return next;
      });

      if (
        editingDevlog?.id ===
        devlog.id
      ) {
        closeEditModal();
      }

      await loadDevlogData();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "개발일지 삭제에 실패했습니다.",
      );
    } finally {
      setDeletingDevlogId("");
    }
  };

  const handlePrintDevlogsPdf = () => {
    const printWindow = window.open(
      "",
      "_blank",
      "width=920,height=1000",
    );

    if (!printWindow) {
      alert(
        "팝업이 차단되어 PDF 저장 창을 열 수 없습니다.",
      );

      return;
    }

    const documentTitle =
      "개발일지 문서";

    const documentDescription =
      query.trim() || filter !== "all"
        ? "현재 검색/필터 조건에 맞는 개발일지만 문서화합니다."
        : "현재 프로젝트의 전체 개발일지를 문서화합니다.";

    const printBody =
      filteredDevlogs.length === 0
        ? `<div class="empty">조건에 맞는 개발일지가 없습니다.</div>`
        : filteredDevlogs
            .map((devlog, index) => {
              const workedDate =
                devlog.workedDate ||
                devlog.date ||
                "-";

              const tags =
                devlog.tags?.length
                  ? devlog.tags
                      .map(
                        (tag) =>
                          `#${escapePrintHtml(tag)}`,
                      )
                      .join(" ")
                  : "태그 없음";

              return `
                <article class="print-card">
                  <div class="print-card-header">
                    <span class="index">${index + 1}</span>

                    <div class="header-content">
                      <div class="title-row">
                        <h2>${escapePrintHtml(
                          devlog.title ||
                            "제목 없는 개발일지",
                        )}</h2>

                        <span class="pill">${escapePrintHtml(
                          getDevlogDocumentStatusLabel(
                            devlog,
                          ),
                        )}</span>
                      </div>

                      <p class="meta">
                        ${escapePrintHtml(
                          devlog.projectName ||
                            workspaceName,
                        )} · ${escapePrintHtml(
                          workedDate,
                        )}
                      </p>
                    </div>
                  </div>

                  ${
                    devlog.scheduleTitle
                      ? `
                        <section class="linked-schedule">
                          <span class="linked-label">연결 일정</span>
                          <span class="linked-title">${escapePrintHtml(
                            devlog.scheduleTitle,
                          )}</span>
                        </section>
                      `
                      : ""
                  }

                  <section class="content-box">
                    <p class="body-text">${escapePrintHtmlWithLineBreaks(
                      devlog.content ||
                        "작성된 내용이 없습니다.",
                    )}</p>
                  </section>

                  <div class="tag-row">
                    <span>${escapePrintHtml(
                      getDevlogDocumentTypeLabel(
                        devlog,
                      ),
                    )}</span>

                    <span>${tags}</span>
                  </div>
                </article>
              `;
            })
            .join("");

    printWindow.document.write(`
      <!doctype html>

      <html lang="ko">
        <head>
          <meta charset="utf-8" />

          <title>${escapePrintHtml(
            documentTitle,
          )}</title>

          <style>
            @page {
              size: A4;
              margin: 18mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              background: #ffffff;
              color: #111827;
              font-family: Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              line-height: 1.65;
            }

            .document-header {
              padding-bottom: 18px;
              margin-bottom: 22px;
              border-bottom: 2px solid #2563eb;
            }

            .eyebrow {
              margin: 0 0 6px;
              color: #2563eb;
              font-size: 12px;
              font-weight: 900;
              letter-spacing: 0.08em;
            }

            h1 {
              margin: 0;
              color: #0f172a;
              font-size: 28px;
              font-weight: 900;
              letter-spacing: -0.04em;
            }

            .description {
              margin: 6px 0 0;
              color: #64748b;
              font-size: 13px;
              font-weight: 700;
            }

            .header-meta {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 8px;
              margin-top: 16px;
            }

            .meta-box {
              padding: 10px 12px;
              border: 1px solid #dbeafe;
              border-radius: 12px;
              background: #eff6ff;
            }

            .meta-label {
              display: block;
              margin-bottom: 2px;
              color: #64748b;
              font-size: 10px;
              font-weight: 900;
            }

            .meta-value {
              color: #0f172a;
              font-size: 13px;
              font-weight: 900;
            }

            .print-card {
              break-inside: avoid;
              page-break-inside: avoid;
              padding: 18px 0;
              border-bottom: 1px solid #e5e7eb;
            }

            .print-card:first-of-type {
              padding-top: 0;
            }

            .print-card-header {
              display: flex;
              gap: 10px;
              align-items: flex-start;
              margin-bottom: 10px;
            }

            .index {
              display: inline-flex;
              width: 28px;
              height: 28px;
              align-items: center;
              justify-content: center;
              border-radius: 9px;
              background: #2563eb;
              color: #ffffff;
              font-size: 12px;
              font-weight: 900;
              flex-shrink: 0;
            }

            .header-content {
              min-width: 0;
              flex: 1;
            }

            .title-row {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 10px;
            }

            h2 {
              margin: 0;
              color: #111827;
              font-size: 17px;
              font-weight: 900;
              letter-spacing: -0.02em;
            }

            .pill {
              flex-shrink: 0;
              border-radius: 999px;
              background: #dbeafe;
              color: #1d4ed8;
              padding: 3px 9px;
              font-size: 10px;
              font-weight: 900;
            }

            .meta {
              margin: 3px 0 0;
              color: #64748b;
              font-size: 11px;
              font-weight: 800;
            }

            .linked-schedule {
              display: flex;
              align-items: center;
              gap: 8px;
              margin: 10px 0;
              padding: 9px 11px;
              border: 1px solid #dbeafe;
              border-radius: 12px;
              background: #eff6ff;
              font-size: 12px;
            }

            .linked-label {
              color: #2563eb;
              font-weight: 900;
            }

            .linked-title {
              color: #334155;
              font-weight: 800;
            }

            .content-box {
              padding: 12px 0;
            }

            .body-text {
              margin: 0;
              color: #374151;
              font-size: 13px;
              font-weight: 650;
              white-space: normal;
            }

            .tag-row {
              display: flex;
              justify-content: space-between;
              gap: 10px;
              margin-top: 8px;
              color: #64748b;
              font-size: 10px;
              font-weight: 800;
            }

            .empty {
              padding: 60px 0;
              color: #64748b;
              font-size: 14px;
              font-weight: 800;
              text-align: center;
            }

            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }

              .header-meta {
                grid-template-columns: repeat(2, 1fr);
              }
            }
          </style>
        </head>

        <body>
          <main class="document">
            <header class="document-header">
              <p class="eyebrow">
                DEVLOG DOCUMENT
              </p>

              <h1>
                ${escapePrintHtml(
                  documentTitle,
                )}
              </h1>

              <p class="description">
                ${escapePrintHtml(
                  documentDescription,
                )}
              </p>

              <section class="header-meta">
                <div class="meta-box">
                  <span class="meta-label">
                    프로젝트
                  </span>

                  <span class="meta-value">
                    ${escapePrintHtml(
                      workspaceName,
                    )}
                  </span>
                </div>

                <div class="meta-box">
                  <span class="meta-label">
                    문서화 일지
                  </span>

                  <span class="meta-value">
                    ${filteredDevlogs.length}개
                  </span>
                </div>

                <div class="meta-box">
                  <span class="meta-label">
                    현재 필터
                  </span>

                  <span class="meta-value">
                    ${escapePrintHtml(
                      filter === "all"
                        ? "전체"
                        : filter,
                    )}
                  </span>
                </div>

                <div class="meta-box">
                  <span class="meta-label">
                    저장일
                  </span>

                  <span class="meta-value">
                    ${escapePrintHtml(
                      getPrintDateLabel(),
                    )}
                  </span>
                </div>
              </section>
            </header>

            ${printBody}
          </main>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    printWindow.onload = () => {
      printWindow.print();
    };
  };

  return (
    <div className="waivs-page min-h-[calc(100dvh-72px)] bg-[#F7F8FA] p-4 text-slate-900 md:p-5">
      <div className="mx-auto flex max-w-[1880px] items-start gap-4">
        {/* =================================================
            PROJECT SIDEBAR
            Dashboard / 일정관리와 동일한 구조
           ================================================= */}
        <DevlogProjectSidebar
          expanded={sidebarExpanded}
          pinned={isSidebarPinned}
          canHoverExpand={canSidebarHoverExpand}
          isPageScrolled={isPageScrolled}
          workspaces={workspaces}
          selectedWorkspaceId={workspaceId}
          loading={workspaceLoading}
          errorMessage={workspaceErrorMessage}
          search={projectSearch}
          filter={projectFilter}
          searchInputRef={projectSearchInputRef}
          onSearch={setProjectSearch}
          onFilter={setProjectFilter}
          onHover={setIsSidebarHovered}
          onCanHoverExpand={setCanSidebarHoverExpand}
          onToggle={handleToggleSidebar}
          onOpenSearch={openSidebarForSearch}
          onOpenProjects={openSidebarForProjects}
          onSelectWorkspace={handleSelectWorkspace}
          onAllProjects={() => router.push("/main")}
        />

        {/* =================================================
            MAIN DEVLOG AREA
           ================================================= */}
        <main className="flex min-h-[calc(100dvh-104px)] min-w-0 flex-1 flex-col gap-4">
          {/* =========================
              개발일지 상단 요약
             ========================= */}
          <section className="waivs-panel shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="px-5 py-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#5873F9]">
                      Devlog
                    </p>

                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                        currentWorkspaceMode === "team"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {currentWorkspaceMode === "team" ? "TEAM" : "PERSONAL"}
                    </span>

                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">
                      {currentWorkspaceRole}
                    </span>
                  </div>

                  <div className="mt-1 flex min-w-0 items-end gap-3">
                    <h1 className="truncate text-xl font-black tracking-tight text-slate-950">
                      {workspaceName}
                    </h1>

                    <span className="hidden pb-0.5 text-xs font-semibold text-slate-400 sm:inline">
                      개발일지 관리
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrintDevlogsPdf}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#D9E1FF] bg-white px-4 text-xs font-black text-[#5873F9] transition hover:bg-[#F7F9FF]"
                  >
                    <Download size={15} />
                    PDF 저장
                  </button>

                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#5873F9] px-4 text-xs font-black text-white transition hover:bg-[#4863E8]"
                  >
                    <Plus size={15} />
                    새 개발일지
                  </button>
                </div>
              </div>

              {/* compact stats */}
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-3">
                <DevlogMetric label="전체" value={totalDevlogs} />
                <DevlogMetric label="일정 연결" value={linkedDevlogs} active />
                <DevlogMetric label="일반" value={generalDevlogs} />
                <DevlogMetric label="이번 주" value={weeklyDevlogs} />
                <DevlogMetric label="완료 처리" value={doneLinkedSchedules} />

                <span className="ml-auto text-[10px] font-bold text-slate-400">
                  {currentWeekRange.label}
                </span>
              </div>
            </div>
          </section>

          {/* =========================
              개발일지 목록 + 사이드 기능 통합
             ========================= */}
          <section className="waivs-panel flex min-h-[560px] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* toolbar */}
            <div className="shrink-0 border-b border-slate-100 px-5 py-3">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNoDevlogPanel((prev) => !prev)}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[11px] font-black transition ${
                      showNoDevlogPanel
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <FilePenLine size={13} />
                    일지 미작성 {noDevlogSchedules.length}
                  </button>

                  <div className="hidden h-5 w-px bg-slate-200 sm:block" />

                  <DevlogFilterButton
                    active={filter === "all"}
                    label="전체"
                    onClick={() => setFilter("all")}
                  />

                  <DevlogFilterButton
                    active={filter === "linked"}
                    label="일정 연결"
                    onClick={() => setFilter("linked")}
                  />

                  <DevlogFilterButton
                    active={filter === "general"}
                    label="일반 일지"
                    onClick={() => setFilter("general")}
                  />

                  <DevlogFilterButton
                    active={filter === "progress"}
                    label="진행 중"
                    onClick={() => setFilter("progress")}
                  />

                  <DevlogFilterButton
                    active={filter === "done"}
                    label="완료"
                    onClick={() => setFilter("done")}
                  />
                </div>

                <div className="relative w-full xl:w-[320px]">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="제목, 내용, 태그, 연결 일정 검색"
                    className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-semibold outline-none transition placeholder:text-slate-400 focus:border-[#AAB8FF] focus:ring-2 focus:ring-[#5873F9]/10"
                  />
                </div>
              </div>
            </div>

            {/* 기존 왼쪽 사이드바의 '일지 미작성 일정' 기능을 메인으로 이동 */}
            {showNoDevlogPanel && (
              <NoDevlogMainPanel
                schedules={noDevlogSchedules}
                onCreateWithSchedule={openCreateModalWithSchedule}
                onClose={() => setShowNoDevlogPanel(false)}
              />
            )}

            {/* list header */}
            <div className="flex items-center justify-between px-5 pt-4">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  개발일지 목록
                </h2>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                  일정 연결 여부와 진행 상태 기준으로 기록을 확인합니다.
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500">
                {filteredDevlogs.length}개
              </span>
            </div>

            <div className="min-h-0 flex-1 px-5 pb-5">
              <DataState loading={loading} errorMessage={errorMessage}>
                <div className="mt-4">
                  <DevlogListPanel
                    filteredDevlogs={filteredDevlogs}
                    selectedDevlog={selectedDevlog}
                    onSelectDevlog={handleSelectDevlog}
                  />
                </div>
              </DataState>
            </div>
          </section>
        </main>

        {isDetailModalOpen && selectedDevlog && (
          <DevlogDetailModal
            selectedDevlog={selectedDevlog}
            deletingDevlogId={deletingDevlogId}
            onClose={() => setIsDetailModalOpen(false)}
            onEdit={openEditModal}
            onDelete={deleteDevlog}
          />
        )}
      </div>

      {isCreateModalOpen && (
        <CreateDevlogModal
          selectedProjectName={workspaceName}
          visibleSchedules={schedules}
          formTitle={formTitle}
          formContent={formContent}
          formDate={formDate}
          formScheduleId={formScheduleId}
          formStatusChange={formStatusChange}
          saving={saving}
          onChangeTitle={setFormTitle}
          onChangeContent={setFormContent}
          onChangeDate={setFormDate}
          onChangeScheduleId={setFormScheduleId}
          onChangeStatus={setFormStatusChange}
          onClose={closeCreateModal}
          onSubmit={createDevlog}
        />
      )}

      {isEditModalOpen && editingDevlog && (
        <CreateDevlogModal
         mode="edit"
          selectedProjectName={workspaceName}
          visibleSchedules={schedules}
          formTitle={formTitle}
          formContent={formContent}
          formDate={formDate}
          formScheduleId={formScheduleId}
          formStatusChange={formStatusChange}
          saving={saving}
          onChangeTitle={setFormTitle}
          onChangeContent={setFormContent}
          onChangeDate={setFormDate}
          onChangeScheduleId={setFormScheduleId}
          onChangeStatus={setFormStatusChange}
          onClose={closeEditModal}
          onSubmit={updateDevlog}
        />
      )}
    </div>
  );
}

/* =========================================================
   PROJECT SIDEBAR
   - Dashboard / 일정관리와 동일
   - 개발일지 전용 기능은 메인 화면으로 이동
   ========================================================= */

function DevlogProjectSidebar({
  expanded,
  pinned,
  canHoverExpand,
  isPageScrolled,
  workspaces,
  selectedWorkspaceId,
  loading,
  errorMessage,
  search,
  filter,
  searchInputRef,
  onSearch,
  onFilter,
  onHover,
  onCanHoverExpand,
  onToggle,
  onOpenSearch,
  onOpenProjects,
  onSelectWorkspace,
  onAllProjects,
}: {
  expanded: boolean;
  pinned: boolean;
  canHoverExpand: boolean;
  isPageScrolled: boolean;
  workspaces: WorkspaceSidebarItem[];
  selectedWorkspaceId: string;
  loading: boolean;
  errorMessage: string;
  search: string;
  filter: ProjectFilter;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onSearch: (value: string) => void;
  onFilter: (value: ProjectFilter) => void;
  onHover: (value: boolean) => void;
  onCanHoverExpand: (value: boolean) => void;
  onToggle: () => void;
  onOpenSearch: () => void;
  onOpenProjects: () => void;
  onSelectWorkspace: (workspace: WorkspaceSidebarItem) => void;
  onAllProjects: () => void;
}) {
  const personalCount = workspaces.filter(
    (workspace) => workspace.mode === "personal",
  ).length;

  const teamCount = workspaces.filter(
    (workspace) => workspace.mode === "team",
  ).length;

  const filteredWorkspaces = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return workspaces.filter((workspace) => {
      const matchesMode = filter === "all" || workspace.mode === filter;
      const matchesKeyword =
        !keyword || workspace.name.toLowerCase().includes(keyword);

      return matchesMode && matchesKeyword;
    });
  }, [filter, search, workspaces]);

  const personalWorkspaces = filteredWorkspaces.filter(
    (workspace) => workspace.mode === "personal",
  );

  const teamWorkspaces = filteredWorkspaces.filter(
    (workspace) => workspace.mode === "team",
  );

  return (
    <aside
      onMouseEnter={() => {
        if (!pinned && canHoverExpand) {
          onHover(true);
        }
      }}
      onMouseLeave={() => {
        onHover(false);
        onCanHoverExpand(true);
      }}
      className={`waivs-sidebar sticky hidden h-[calc(100dvh-104px)] shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-[width] duration-200 lg:flex lg:flex-col ${
        isPageScrolled ? "top-[88px]" : "top-4"
      } ${expanded ? "w-[288px]" : "w-16"}`}
    >
      {/* header */}
      <div
        className={
          expanded
            ? "border-b border-slate-100 p-3"
            : "flex h-[64px] items-center justify-center border-b border-slate-100 p-0"
        }
      >
        <div
          className={`flex items-center ${
            expanded ? "justify-between gap-2" : "justify-center"
          }`}
        >
          {expanded && (
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#EEF3FF] text-[#5873F9]">
                  <FolderOpen size={16} strokeWidth={2.4} />
                </div>

                <div>
                  <p className="text-sm font-black text-slate-900">프로젝트</p>
                  <p className="text-[10px] font-semibold text-slate-400">
                    전체 {workspaces.length} · 개인 {personalCount} · 팀 {teamCount}
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onToggle}
            className={`grid shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 ${
              expanded ? "h-8 w-8" : "h-9 w-9"
            }`}
            title={pinned ? "사이드바 접기" : "사이드바 펼치기"}
          >
            {expanded ? (
              <PanelLeftClose size={17} />
            ) : (
              <PanelLeftOpen size={18} />
            )}
          </button>
        </div>

        {expanded && (
          <>
            <div className="relative mt-3">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                ref={searchInputRef}
                value={search}
                onChange={(event) => onSearch(event.target.value)}
                placeholder="프로젝트 검색"
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#AAB8FF] focus:bg-white focus:ring-2 focus:ring-[#5873F9]/10"
              />
            </div>

            <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
              {(
                [
                  ["all", "전체"],
                  ["personal", "개인"],
                  ["team", "팀"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onFilter(value)}
                  className={`rounded-lg px-2 py-1.5 text-[11px] font-black transition ${
                    filter === value
                      ? "bg-white text-[#5873F9] shadow-sm"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* body */}
      <div
        className={`min-h-0 flex-1 ${
          expanded ? "overflow-y-auto p-3" : "overflow-hidden"
        }`}
      >
        {loading ? (
          <div className="grid h-32 place-items-center">
            <Loader2 size={18} className="animate-spin text-[#5873F9]" />
          </div>
        ) : errorMessage ? (
          expanded ? (
            <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs font-semibold leading-5 text-rose-600">
              {errorMessage}
            </div>
          ) : null
        ) : expanded ? (
          <div className="space-y-5">
            {filter !== "team" && (
              <WorkspaceSection
                title="개인 프로젝트"
                mode="personal"
                items={personalWorkspaces}
                selectedWorkspaceId={selectedWorkspaceId}
                onSelect={onSelectWorkspace}
              />
            )}

            {filter !== "personal" && (
              <WorkspaceSection
                title="팀 프로젝트"
                mode="team"
                items={teamWorkspaces}
                selectedWorkspaceId={selectedWorkspaceId}
                onSelect={onSelectWorkspace}
              />
            )}
          </div>
        ) : (
          /* Dashboard와 동일한 접힌 상태 */
          <div className="flex h-full flex-col items-center pt-4">
            <button
              type="button"
              onClick={onOpenSearch}
              className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-[#5873F9]"
              title="프로젝트 검색"
            >
              <Search size={19} strokeWidth={2} />
            </button>

            <button
              type="button"
              onClick={onOpenProjects}
              className="mt-1 grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-[#5873F9]"
              title="프로젝트 목록"
            >
              <FolderOpen size={19} strokeWidth={2} />
            </button>

            <div className="my-3 h-px w-8 bg-slate-100" />

            <div
              className="flex h-8 w-8 items-center justify-center text-xs font-black text-slate-300"
              title={`전체 프로젝트 ${workspaces.length}개`}
            >
              {workspaces.length}
            </div>
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-slate-100 p-3">
          <button
            type="button"
            onClick={onAllProjects}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#D9E1FF] bg-[#F7F9FF] px-3 py-2 text-xs font-black text-[#5873F9] transition hover:bg-[#EEF3FF]"
          >
            전체 프로젝트
            <ArrowRight size={14} />
          </button>
        </div>
      )}
    </aside>
  );
}

function WorkspaceSection({
  title,
  mode,
  items,
  selectedWorkspaceId,
  onSelect,
}: {
  title: string;
  mode: WorkspaceMode;
  items: WorkspaceSidebarItem[];
  selectedWorkspaceId: string;
  onSelect: (workspace: WorkspaceSidebarItem) => void;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between px-2">
        <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-500">
          {mode === "team" ? (
            <UsersRound size={13} />
          ) : (
            <UserRound size={13} />
          )}
          {title}
        </div>

        <span className="text-[10px] font-black text-slate-400">
          {items.length}
        </span>
      </div>

      <div className="space-y-1">
        {items.length === 0 ? (
          <p className="px-2 py-2 text-[11px] font-medium text-slate-400">
            프로젝트가 없습니다.
          </p>
        ) : (
          items.map((workspace) => (
            <WorkspaceButton
              key={workspace.id}
              workspace={workspace}
              selected={workspace.id === selectedWorkspaceId}
              onClick={() => onSelect(workspace)}
            />
          ))
        )}
      </div>
    </section>
  );
}

function WorkspaceButton({
  workspace,
  selected,
  onClick,
}: {
  workspace: WorkspaceSidebarItem;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition ${
        selected
          ? "bg-[#5873F9] text-white shadow-sm"
          : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      <div
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
          selected
            ? "bg-white/15 text-white"
            : workspace.mode === "team"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-blue-50 text-blue-700"
        }`}
      >
        {workspace.mode === "team" ? (
          <UsersRound size={15} />
        ) : (
          <UserRound size={15} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-black">{workspace.name}</p>
        <p
          className={`mt-0.5 truncate text-[10px] font-semibold ${
            selected ? "text-white/70" : "text-slate-400"
          }`}
        >
          {workspace.mode === "team" ? "팀 프로젝트" : "개인 프로젝트"}
          {workspace.role ? ` · ${workspace.role.toUpperCase()}` : ""}
        </p>
      </div>
    </button>
  );
}

function DevlogMetric({
  label,
  value,
  active,
}: {
  label: string;
  value: number;
  active?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] font-bold text-slate-400">{label}</span>
      <span
        className={`text-sm font-black ${
          active ? "text-[#5873F9]" : "text-slate-800"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/* =========================================================
   기존 사이드바 기능 -> 메인 화면 패널
   ========================================================= */

function NoDevlogMainPanel({
  schedules,
  onCreateWithSchedule,
  onClose,
}: {
  schedules: ScheduleOption[];
  onCreateWithSchedule: (scheduleId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="shrink-0 border-b border-slate-100 bg-[#FBFCFF] px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-amber-600">
              <FilePenLine size={15} />
            </span>

            <div>
              <h3 className="text-sm font-black text-slate-900">
                일지 미작성 일정
              </h3>
              <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                아직 수행 기록이 없는 일정에서 바로 개발일지를 작성할 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700"
          aria-label="일지 미작성 일정 닫기"
        >
          <PanelLeftClose size={15} />
        </button>
      </div>

      {schedules.length === 0 ? (
        <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">
          모든 일정에 개발일지가 연결되어 있습니다.
        </div>
      ) : (
        <div className="mt-3 grid max-h-[260px] gap-2 overflow-y-auto pr-1 md:grid-cols-2 2xl:grid-cols-3">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-xs font-black text-slate-800">
                    {schedule.title}
                  </p>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black ${statusStyle[schedule.status]}`}
                  >
                    {scheduleStatusLabel[schedule.status]}
                  </span>
                </div>

                <p className="mt-1 truncate text-[10px] font-semibold text-slate-400">
                  {schedule.startDate === schedule.endDate
                    ? schedule.startDate
                    : `${schedule.startDate} ~ ${schedule.endDate}`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onCreateWithSchedule(schedule.id)}
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-[#EEF3FF] px-2.5 text-[10px] font-black text-[#5873F9] transition hover:bg-[#E4EAFF]"
              >
                <FilePenLine size={11} />
                작성
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


function DevlogDetailModal({
  selectedDevlog,
  deletingDevlogId,
  onClose,
  onEdit,
  onDelete,
}: {
  selectedDevlog: DevlogItem;
  deletingDevlogId: string;
  onClose: () => void;
  onEdit: (devlog: DevlogItem) => void;
  onDelete: (devlog: DevlogItem) => void;
}) {
  const workedDate =
    selectedDevlog.workedDate ||
    selectedDevlog.date ||
    "-";

  const isLinked =
    selectedDevlog.type === "linked";

  const deleting =
    deletingDevlogId ===
    selectedDevlog.id;

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyPaddingRight = body.style.paddingRight;

    const scrollbarWidth =
      window.innerWidth - html.clientWidth;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.paddingRight = previousBodyPaddingRight;
    };
  }, []);

  return (
    <>
      <div
        className="fixed inset-0 z-[8998] bg-slate-950/25 backdrop-blur-[2px]"
        onMouseDown={onClose}
      />

      <div className="pointer-events-none fixed inset-x-0 bottom-0 top-[72px] z-[8999] flex items-center justify-center overflow-hidden p-4">
        <article
          onMouseDown={(event) => event.stopPropagation()}
          className="pointer-events-auto flex max-h-[calc(100dvh-104px)] w-full max-w-[760px] flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.2)]"
        >
          {/* header */}
          <header className="flex shrink-0 items-start justify-between border-b border-slate-100 px-6 py-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#5873F9]">
                  Development Log
                </span>

                <span className="rounded-full bg-[#EEF3FF] px-2 py-0.5 text-[9px] font-black text-[#5873F9]">
                  DETAIL
                </span>
              </div>

              <h2 className="mt-1 break-keep text-xl font-black leading-snug tracking-tight text-slate-950">
                {selectedDevlog.title || "제목 없는 개발일지"}
              </h2>

              <p className="mt-1 text-xs font-semibold text-slate-400">
                개발 기록의 연결 일정과 작성 내용을 확인합니다.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="개발일지 상세 닫기"
            >
              <X size={17} />
            </button>
          </header>

          {/* content */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-5 px-6 py-5">
              <section className="overflow-hidden rounded-xl border border-slate-200">
                <DevlogDetailMetaRow
                  icon={<FolderOpen size={15} />}
                  label="프로젝트"
                >
                  <span className="text-xs font-black text-slate-700">
                    {selectedDevlog.projectName}
                  </span>
                </DevlogDetailMetaRow>

                <DevlogDetailMetaRow
                  icon={<CalendarDays size={15} />}
                  label="작업일"
                >
                  <span className="text-xs font-bold text-slate-600">
                    {workedDate}
                  </span>
                </DevlogDetailMetaRow>

                <DevlogDetailMetaRow
                  icon={<FilePenLine size={15} />}
                  label="유형"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                        isLinked
                          ? "bg-blue-50 text-blue-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {isLinked ? "일정 연결" : "일반 일지"}
                    </span>

                    {selectedDevlog.status && (
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${
                          statusStyle[selectedDevlog.status]
                        }`}
                      >
                        {scheduleStatusLabel[selectedDevlog.status]}
                      </span>
                    )}
                  </div>
                </DevlogDetailMetaRow>

                <DevlogDetailMetaRow
                  icon={<Link2 size={15} />}
                  label="연결 일정"
                  last
                >
                  {selectedDevlog.scheduleTitle ? (
                    <span className="inline-flex min-w-0 items-center rounded-lg bg-[#F7F9FF] px-3 py-2 text-xs font-black text-[#5873F9]">
                      <span className="truncate">
                        {selectedDevlog.scheduleTitle}
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-400">
                      연결된 일정이 없습니다.
                    </span>
                  )}
                </DevlogDetailMetaRow>
              </section>

              <section>
                <div className="mb-2">
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                    Work Log
                  </p>
                  <h3 className="mt-0.5 text-sm font-black text-slate-800">
                    작성 내용
                  </h3>
                </div>

                <div className="min-h-[220px] rounded-xl border border-slate-200 bg-[#FBFCFE] p-5">
                  <p className="whitespace-pre-wrap break-words text-sm font-medium leading-7 text-slate-700">
                    {selectedDevlog.content ||
                      "작성된 내용이 없습니다."}
                  </p>
                </div>
              </section>

              {selectedDevlog.tags.length > 0 && (
                <section>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-400">
                    Tags
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {selectedDevlog.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>

          {/* footer */}
          <footer className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-white px-6 py-4">
            <p className="hidden text-[10px] font-semibold text-slate-400 sm:block">
              목록으로 돌아가 다른 개발일지를 계속 확인할 수 있습니다.
            </p>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => onDelete(selectedDevlog)}
                disabled={deleting}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-rose-100 bg-white px-4 text-xs font-black text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                삭제
              </button>

              <button
                type="button"
                onClick={() => onEdit(selectedDevlog)}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#5873F9] px-4 text-xs font-black text-white transition hover:bg-[#4863E8]"
              >
                <Pencil size={14} />
                수정
              </button>
            </div>
          </footer>
        </article>
      </div>
    </>
  );
}

function DevlogDetailMetaRow({
  icon,
  label,
  children,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[100px_minmax(0,1fr)] gap-4 px-4 py-3 ${
        last ? "" : "border-b border-slate-100"
      }`}
    >
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <span className="text-[10px] font-black text-slate-500">
          {label}
        </span>
      </div>

      <div className="min-w-0 flex items-center">
        {children}
      </div>
    </div>
  );
}

function DataState({
  loading,
  errorMessage,
  children,
}: {
  loading: boolean;
  errorMessage: string;
  children: React.ReactNode;
}) {
  if (loading) {
    return (
      <div className="mt-6 grid min-h-[360px] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50">
        <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
          <Loader2
            className="animate-spin"
            size={18}
          />

          개발일지 데이터를 불러오는
          중입니다.
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-700">
        {errorMessage}
      </div>
    );
  }

  return <>{children}</>;
}