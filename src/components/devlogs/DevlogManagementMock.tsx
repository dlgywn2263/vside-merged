"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  ArrowUpRight,
  BookOpenText,
  ChevronRight,
  UserRound,
  CalendarDays,
  Download,
  FilePenLine,
  Filter,
  FolderOpen,
  Link2,
  Loader2,
  PanelLeftClose,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  ChevronDown,
} from "lucide-react";

import {
  createWorkspaceDevlogApi,
  deleteDevlogApi,
  fetchWorkspaceDevlogsApi,
  getMyWorkspacesByTokenApi,
  getWorkspaceMembersApi,
  updateDevlogApi,
} from "@/lib/ide/api";

import { useAuth } from "@/contexts/AuthContext";
import { getViewerId, normalizeUserId } from "@/lib/messages/identity";

import { getIdeHref } from "@/components/main-dashboard/dashboard.utils";

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
  canManageDevlog,
  extractWorkspaceList,
  getTodayDateKey,
  normalizeWorkspaceId,
  scheduleStatusLabel,
  statusStyle,
} from "./devlog.utils";

import { CreateDevlogModal } from "./components/CreateDevlogModal";
import { DevlogListPanel } from "./components/DevlogListPanel";

import type {
  WorkspaceMode,
  WorkspaceSidebarItem as SharedWorkspaceSidebarItem,
} from "@/components/layout/ProjectSidebar";

import ProjectSwitcher from "@/components/main-dashboard/ProjectSwitcher";

/* =========================================================
   TYPE
========================================================= */

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

type WorkspaceSidebarItem = SharedWorkspaceSidebarItem & {
  uuid?: string;
  workspaceId?: string;
};

type SortFilter = "all" | "latest" | "oldest";

// "all" | "me" | 팀원 사용자 ID(숫자 문자열)
type AuthorFilter = string;

type AuthorFilterOption = {
  userId: string;
  name: string;
};

/* =========================================================
   MAPPING
========================================================= */

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

// api.js normalizeDevlogFromApi 가 돌려주는 모양. 읽는 필드만 적는다.
type DevlogApiRecord = Pick<
  DevlogItem,
  "id" | "workspaceId" | "date" | "workedDate"
> &
  Partial<
    Pick<
      DevlogItem,
      | "projectName"
      | "title"
      | "content"
      | "type"
      | "scheduleId"
      | "scheduleTitle"
      | "status"
      | "tags"
      | "authorName"
      | "createdAt"
      | "updatedAt"
    >
  > & {
    scheduleStatus?: DevlogItem["status"];
    authorId?: unknown;
  };

function mapDevlogFromApi(item: DevlogApiRecord): DevlogItem {
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

    authorId: normalizeUserId(item.authorId),
    authorName: item.authorName ?? "",

    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function mapWorkspaceFromApi(
  item: WorkspaceLike,
): WorkspaceSidebarItem | null {
  const id = item.uuid || item.id || item.workspaceId;

  if (!id) {
    return null;
  }

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

/* =========================================================
   COMMON
========================================================= */

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

function getDevlogSortTime(devlog: DevlogItem) {
  const value =
    devlog.workedDate ||
    devlog.date ||
    devlog.updatedAt ||
    devlog.createdAt;

  if (!value) {
    return 0;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 0;
  }

  return date.getTime();
}

/* =========================================================
   PRINT
========================================================= */

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
  if (devlog.type === "general") {
    return "일반 일지";
  }

  if (!devlog.status) {
    return "일정 연결";
  }

  return (
    scheduleStatusLabel[
      devlog.status as keyof typeof scheduleStatusLabel
    ] ?? "일정 연결"
  );
}

function getDevlogDocumentTypeLabel(devlog: DevlogItem) {
  return devlog.type === "linked" ? "일정 연결" : "일반 일지";
}

/* =========================================================
   MAIN
========================================================= */

export default function DevlogManagementMock() {
  const router = useRouter();

  const pathname = usePathname();
  const params = useParams<{ workspaceId?: string | string[] }>();
  const searchParams = useSearchParams();

  const routeWorkspaceId = Array.isArray(params?.workspaceId)
    ? params.workspaceId[0]
    : params?.workspaceId;

  const workspaceId = normalizeWorkspaceId(routeWorkspaceId ?? null);

  // 수정·삭제 권한과 "내가 작성한 일지" 필터는 닉네임이 아니라 이 ID 로 판단한다.
  const { user } = useAuth();
  const viewerId = getViewerId(user);

  /* =====================================================
     WORKSPACE
  ===================================================== */

  const [workspaces, setWorkspaces] = useState<
    WorkspaceSidebarItem[]
  >([]);

  const [workspaceName, setWorkspaceName] = useState("프로젝트");

  /* =====================================================
     DATA
  ===================================================== */

  const [schedules, setSchedules] = useState<ScheduleOption[]>([]);

  const [devlogs, setDevlogs] = useState<DevlogItem[]>([]);

  /* =====================================================
     LOADING / ERROR
  ===================================================== */

  const [workspaceLoading, setWorkspaceLoading] = useState(true);

  const [workspaceErrorMessage, setWorkspaceErrorMessage] =
    useState("");

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  /* =====================================================
     FILTER / SEARCH
  ===================================================== */

  const [selectedDevlogId, setSelectedDevlogId] = useState("");

  const [filter, setFilter] = useState<DevlogFilter>("all");

  const [query, setQuery] = useState("");

  const [sortFilter, setSortFilter] =
    useState<SortFilter>("all");

  const [authorFilter, setAuthorFilter] =
    useState<AuthorFilter>("all");

  // 작성자 필터의 팀원 목록. 팀 프로젝트에서만 채운다.
  const [members, setMembers] = useState<AuthorFilterOption[]>([]);

  const [showNoDevlogPanel, setShowNoDevlogPanel] =
    useState(false);

  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const [dateFilterMode, setDateFilterMode] =
    useState<"single" | "range">("single");

  const [selectedDate, setSelectedDate] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  /* =====================================================
     MODAL
  ===================================================== */

  const autoCreateHandledRef = useRef("");
  // 프로젝트별 첫 데이터 로딩에서만 상세 패널을 자동으로 엽니다.
  const autoOpenedWorkspaceRef = useRef("");

  const [isDetailModalOpen, setIsDetailModalOpen] =
    useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] =
    useState(false);

  const [isEditModalOpen, setIsEditModalOpen] =
    useState(false);

  const [editingDevlog, setEditingDevlog] =
    useState<DevlogItem | null>(null);

  const [deletingDevlogId, setDeletingDevlogId] = useState("");

  /* =====================================================
     FORM
  ===================================================== */

  const [formTitle, setFormTitle] = useState("");

  const [formContent, setFormContent] = useState("");

  const [formDate, setFormDate] = useState(getTodayDateKey());

  const [formScheduleId, setFormScheduleId] = useState("");

  const [formStatusChange, setFormStatusChange] = useState<
    "none" | "progress" | "done"
  >("none");

  /* =====================================================
     LOAD WORKSPACES
  ===================================================== */

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

        setWorkspaceErrorMessage(
          "접근 가능한 프로젝트가 없습니다.",
        );

        return;
      }

      if (!workspaceId) {
        const firstWorkspace = mapped[0];

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

        router.replace(
          `/devlogs/${encodeURIComponent(firstWorkspace.id)}?mode=${firstWorkspace.mode}`,
        );

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

      setWorkspaceName(firstWorkspace.name);

      setWorkspaceErrorMessage(
        "접근 권한이 없는 프로젝트입니다. 접근 가능한 프로젝트로 이동합니다.",
      );

      router.replace(
        `/devlogs/${encodeURIComponent(firstWorkspace.id)}?mode=${firstWorkspace.mode}`,
      );
    } catch {
      setWorkspaceErrorMessage(
        "프로젝트 목록을 불러오지 못했습니다.",
      );
    } finally {
      setWorkspaceLoading(false);
    }
  };

  /* =====================================================
     LOAD WORKSPACE NAME
  ===================================================== */

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

      const matchedWorkspaceFromApi = workspaceList.find(
        (workspace) => {
          return (
            workspace.uuid === workspaceId ||
            workspace.id === workspaceId ||
            workspace.workspaceId === workspaceId
          );
        },
      );

      const name =
        matchedWorkspaceFromApi?.name ||
        matchedWorkspaceFromApi?.title ||
        matchedWorkspaceFromApi?.projectName;

      setWorkspaceName(name?.trim() || "프로젝트");
    } catch {
      setWorkspaceName("프로젝트");
    }
  };

  /* =====================================================
     LOAD DEVLOG DATA
  ===================================================== */

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

      const mappedSchedules = scheduleResult.map(mapScheduleFromApi);

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

      // 최초 진입 시 작업일 기준 최신 개발일지를 선택하고 상세 패널을 엽니다.
      // 같은 프로젝트에서 다시 데이터를 조회할 때는 사용자가 닫은 상태를 유지합니다.
      const newestDevlog = [...mappedDevlogs].sort(
        (a, b) => getDevlogSortTime(b) - getDevlogSortTime(a),
      )[0];

      if (newestDevlog && autoOpenedWorkspaceRef.current !== workspaceId) {
        autoOpenedWorkspaceRef.current = workspaceId;
        setSelectedDevlogId(newestDevlog.id);
        setIsDetailModalOpen(true);
      } else {
        setSelectedDevlogId((prev) => {
          if (prev && mappedDevlogs.some((item) => item.id === prev)) {
            return prev;
          }
          return newestDevlog?.id ?? "";
        });
      }
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

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    void loadWorkspaces();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (workspaceLoading) {
      return;
    }

    void loadWorkspaceName();

    void loadDevlogData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, workspaceLoading, workspaces]);

  /* =====================================================
     CURRENT WORKSPACE
  ===================================================== */

  const currentWorkspace = useMemo(() => {
    return (
      workspaces.find((workspace) =>
        isSameWorkspace(workspace, workspaceId),
      ) ?? null
    );
  }, [workspaceId, workspaces]);

  const currentWorkspaceMode: WorkspaceMode =
    currentWorkspace?.mode ||
    (searchParams.get("mode") === "team"
      ? "team"
      : "personal");

  const currentWorkspaceRole =
    currentWorkspace?.role?.toUpperCase() === "OWNER"
      ? "OWNER"
      : "MEMBER";

  const isTeamWorkspace = currentWorkspaceMode === "team";

  /* =====================================================
     AUTHOR FILTER
     목록 API 는 전체를 한 번에 받으므로 작성자 필터도 다른 필터처럼 화면에서 거른다.
     (서버 author 파라미터로 다시 받으면 유형 탭 개수·선택 상태가 매번 새로 계산돼 흔들린다.)
  ===================================================== */

  // 프로젝트를 바꾸면 이전 프로젝트의 팀원 선택이 남지 않게 되돌린다.
  useEffect(() => {
    setAuthorFilter("all");
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId || !isTeamWorkspace) {
      setMembers([]);
      return;
    }

    let cancelled = false;

    getWorkspaceMembersApi(workspaceId)
      .then((response: unknown) => {
        if (cancelled) return;

        const list = Array.isArray(response) ? response : [];

        setMembers(
          list.flatMap((item: Record<string, unknown>) => {
            const userId = normalizeUserId(item?.userId ?? item?.id);

            if (!userId) return [];

            const name =
              [item.nickname, item.name, item.email].find(
                (value): value is string =>
                  typeof value === "string" && value.trim() !== "",
              ) ?? `사용자 ${userId}`;

            return [{ userId, name }];
          }),
        );
      })
      .catch(() => {
        // 팀원 목록이 없어도 일지에 실린 작성자로 필터를 만들 수 있다.
        if (!cancelled) setMembers([]);
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId, isTeamWorkspace]);

  // 팀원 목록 + 이미 나간 팀원처럼 목록에 없지만 일지를 남긴 작성자. 나는 "내가 작성한 일지"로 따로 고른다.
  const authorOptions = useMemo<AuthorFilterOption[]>(() => {
    const byId = new Map<string, AuthorFilterOption>();

    members.forEach((member) => byId.set(member.userId, member));

    devlogs.forEach((devlog) => {
      if (devlog.authorId && !byId.has(devlog.authorId)) {
        byId.set(devlog.authorId, {
          userId: devlog.authorId,
          name: devlog.authorName || `사용자 ${devlog.authorId}`,
        });
      }
    });

    return [...byId.values()].filter(
      (option) => option.userId !== viewerId,
    );
  }, [members, devlogs, viewerId]);

  // 개인 프로젝트에서는 필터를 숨기므로 값도 적용하지 않는다.
  const effectiveAuthorFilter: AuthorFilter = isTeamWorkspace
    ? authorFilter
    : "all";

  const authorScopedDevlogs = useMemo(() => {
    if (effectiveAuthorFilter === "all") {
      return devlogs;
    }

    const targetId =
      effectiveAuthorFilter === "me" ? viewerId : effectiveAuthorFilter;

    if (!targetId) {
      return [];
    }

    return devlogs.filter((item) => item.authorId === targetId);
  }, [devlogs, effectiveAuthorFilter, viewerId]);

  /* =====================================================
     NO DEVLOG SCHEDULE
  ===================================================== */

  const noDevlogSchedules = useMemo(() => {
    return schedules.filter((schedule) => {
      const linkedByDevlog = devlogs.some(
        (devlog) => devlog.scheduleId === schedule.id,
      );

      return !schedule.hasDevlog && !linkedByDevlog;
    });
  }, [devlogs, schedules]);

  /* =====================================================
     FILTERED DEVLOG
  ===================================================== */

  const filteredDevlogs = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    const result = authorScopedDevlogs.filter((item) => {
      const matchesFilter =
        filter === "all" ||
        item.type === filter ||
        item.status === filter;

      const matchesQuery =
        !keyword ||
        item.title.toLowerCase().includes(keyword) ||
        item.content.toLowerCase().includes(keyword) ||
        item.tags.some((tag) =>
          tag.toLowerCase().includes(keyword),
        ) ||
        Boolean(
          item.scheduleTitle
            ?.toLowerCase()
            .includes(keyword),
        );

      return matchesFilter && matchesQuery;
    });

    if (sortFilter === "latest") {
      result.sort(
        (a, b) =>
          getDevlogSortTime(b) -
          getDevlogSortTime(a),
      );
    }

    if (sortFilter === "oldest") {
      result.sort(
        (a, b) =>
          getDevlogSortTime(a) -
          getDevlogSortTime(b),
      );
    }

    return result;
  }, [authorScopedDevlogs, filter, query, sortFilter]);

  const selectedDevlog =
    filteredDevlogs.find(
      (item) => item.id === selectedDevlogId,
    ) ??
    filteredDevlogs[0] ??
    null;

  /* =====================================================
     STATISTICS
     검색어와 무관한 전체 데이터 기준. 단 작성자 필터는 반영해
     "완료 + 특정 팀원"처럼 함께 고를 때 탭 개수와 목록 개수가 맞게 한다.
  ===================================================== */

  const totalDevlogs = authorScopedDevlogs.length;

  const linkedDevlogs = authorScopedDevlogs.filter(
    (item) => item.type === "linked",
  ).length;

  const generalDevlogs = authorScopedDevlogs.filter(
    (item) => item.type === "general",
  ).length;

  /* =====================================================
     WORKSPACE SELECT
  ===================================================== */

  const handleSelectWorkspace = (
    workspace: SharedWorkspaceSidebarItem,
  ) => {
    if (workspace.id === workspaceId) {
      return;
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(
        "currentWorkspaceId",
        workspace.id,
      );

      localStorage.setItem(
        "currentWorkspaceMode",
        workspace.mode,
      );
    }

    router.push(
      `/devlogs/${encodeURIComponent(workspace.id)}?mode=${workspace.mode}`,
    );
  };

  /* =====================================================
     SELECT DEVLOG
  ===================================================== */

  const handleSelectDevlog = (devlogId: string) => {
    setSelectedDevlogId(devlogId);

    setIsDetailModalOpen(true);
  };

  /* =====================================================
     FORM
  ===================================================== */

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

  const openCreateModalWithSchedule = (scheduleId: string) => {
    resetForm();

    setFormScheduleId(scheduleId);

    setFormStatusChange("progress");

    setIsCreateModalOpen(true);
  };

  /* =====================================================
     일정관리 -> 개발일지 자동 연결

     /devlogs/[workspaceId]?mode=...&create=1&scheduleId=...
  ===================================================== */

  useEffect(() => {
    const shouldCreate = searchParams.get("create") === "1";

    const requestedScheduleId =
      searchParams.get("scheduleId");

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
      (schedule) =>
        String(schedule.id) ===
        String(requestedScheduleId),
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

    const params = new URLSearchParams(
      searchParams.toString(),
    );

    params.delete("create");

    params.delete("scheduleId");

    const queryString = params.toString();

    router.replace(
      queryString
        ? `${pathname}?${queryString}`
        : pathname,
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

  /* =====================================================
     CREATE
  ===================================================== */

  const closeCreateModal = () => {
    if (saving) {
      return;
    }

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

      const created = await createWorkspaceDevlogApi({
        workspaceId,

        scheduleId: formScheduleId || null,

        title: formTitle.trim(),

        content: formContent.trim(),

        workedDate: formDate,

        scheduleStatusAfterWrite: formScheduleId
          ? formStatusChange
          : "none",
      });

      const mapped = mapDevlogFromApi(created);

      setDevlogs((prev) => [mapped, ...prev]);

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

  /* =====================================================
     EDIT
  ===================================================== */

  const openEditModal = (devlog: DevlogItem) => {
    // 버튼을 숨겨도 다른 경로로 불릴 수 있어 여기서 한 번 더 막는다.
    if (!canManageDevlog(devlog, viewerId)) {
      alert("본인이 작성한 개발일지만 수정할 수 있습니다.");

      return;
    }

    setIsDetailModalOpen(false);

    setEditingDevlog(devlog);

    setFormTitle(devlog.title ?? "");

    setFormContent(devlog.content ?? "");

    setFormDate(
      devlog.workedDate ||
        devlog.date ||
        getTodayDateKey(),
    );

    setFormScheduleId(devlog.scheduleId ?? "");

    setFormStatusChange("none");

    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    if (saving) {
      return;
    }

    setIsEditModalOpen(false);

    setEditingDevlog(null);

    resetForm();
  };

  const updateDevlog = async () => {
    if (!editingDevlog) {
      return;
    }

    if (!canManageDevlog(editingDevlog, viewerId)) {
      alert("본인이 작성한 개발일지만 수정할 수 있습니다.");

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

      const updated = await updateDevlogApi({
        devlogId: editingDevlog.id,

        scheduleId: formScheduleId || null,

        title: formTitle.trim(),

        content: formContent.trim(),

        workedDate: formDate,
      });

      const mapped = mapDevlogFromApi(updated);

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

      setIsEditModalOpen(false);

      setEditingDevlog(null);

      resetForm();
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

  /* =====================================================
     DELETE
  ===================================================== */

  const deleteDevlog = async (devlog: DevlogItem) => {
    if (!canManageDevlog(devlog, viewerId)) {
      alert("본인이 작성한 개발일지만 삭제할 수 있습니다.");

      return;
    }

    const confirmed = window.confirm(
      `"${devlog.title || "제목 없는 개발일지"}" 개발일지를 삭제할까요?\n삭제 후에는 되돌릴 수 없습니다.`,
    );

    if (!confirmed) {
      return;
    }

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

        setSelectedDevlogId((currentId) => {
          if (currentId !== devlog.id) {
            return currentId;
          }

          return next[0]?.id ?? "";
        });

        return next;
      });

      if (editingDevlog?.id === devlog.id) {
        setIsEditModalOpen(false);

        setEditingDevlog(null);

        resetForm();
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

  /* =====================================================
     PDF
  ===================================================== */

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

    const documentTitle = "개발일지 문서";

    const documentDescription =
      query.trim() || filter !== "all" || effectiveAuthorFilter !== "all"
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

              const tags = devlog.tags?.length
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
                    <span class="index">
                      ${index + 1}
                    </span>

                    <div class="header-content">
                      <div class="title-row">
                        <h2>
                          ${escapePrintHtml(
                            devlog.title ||
                              "제목 없는 개발일지",
                          )}
                        </h2>

                        <span class="pill">
                          ${escapePrintHtml(
                            getDevlogDocumentStatusLabel(
                              devlog,
                            ),
                          )}
                        </span>
                      </div>

                      <p class="meta">
                        ${escapePrintHtml(
                          devlog.projectName ||
                            workspaceName,
                        )}
                        ·
                        ${escapePrintHtml(
                          workedDate,
                        )}
                      </p>
                    </div>
                  </div>

                  ${
                    devlog.scheduleTitle
                      ? `
                        <section class="linked-schedule">
                          <span class="linked-label">
                            연결 일정
                          </span>

                          <span class="linked-title">
                            ${escapePrintHtml(
                              devlog.scheduleTitle,
                            )}
                          </span>
                        </section>
                      `
                      : ""
                  }

                  <section class="content-box">
                    <p class="body-text">
                      ${escapePrintHtmlWithLineBreaks(
                        devlog.content ||
                          "작성된 내용이 없습니다.",
                      )}
                    </p>
                  </section>

                  <div class="tag-row">
                    <span>
                      ${escapePrintHtml(
                        getDevlogDocumentTypeLabel(
                          devlog,
                        ),
                      )}
                    </span>

                    <span>
                      ${tags}
                    </span>
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

          <title>
            ${escapePrintHtml(
              documentTitle,
            )}
          </title>

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
              font-family:
                Pretendard,
                -apple-system,
                BlinkMacSystemFont,
                "Segoe UI",
                sans-serif;
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
                grid-template-columns:
                  repeat(2, 1fr);
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

  /* =====================================================
     RENDER
  ===================================================== */

  // 유형 탭 옆 개수. 목록 필터(filteredDevlogs)와 같은 기준으로 센다(type 은 linked/general, 진행·완료는 status).
  const filterTabs: Array<{ value: DevlogFilter; label: string; count: number }> = [
    { value: "all", label: "전체", count: totalDevlogs },
    { value: "linked", label: "일정 연결", count: linkedDevlogs },
    { value: "general", label: "일반 일지", count: generalDevlogs },
    {
      value: "progress",
      label: "진행 중",
      count: authorScopedDevlogs.filter((item) => item.status === "progress").length,
    },
    {
      value: "done",
      label: "완료",
      count: authorScopedDevlogs.filter((item) => item.status === "done").length,
    },
  ];

  const detailOpen = isDetailModalOpen && Boolean(selectedDevlog);

  return (
    <>
      {/* 카드 없이 TopNav 아래 화면 전체를 쓰는 작업 공간(일정·설계·AIVS 와 같은 틀) */}
      <main className="waivs-page flex flex-col bg-white font-sans text-slate-900 lg:h-[calc(100dvh-65px)] lg:min-h-0 lg:overflow-hidden">
        {/* =================================================
            PAGE HEADER
        ================================================= */}
        <header className="flex shrink-0 flex-col gap-3 border-y border-slate-200 bg-[#F4F6FA] px-4 py-2.5 lg:h-[62px] lg:flex-row lg:items-center lg:justify-between lg:px-5 lg:py-0">
          <nav
            aria-label="현재 위치"
            className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm"
          >
            <ProjectSwitcher
              size="compact"
              label={workspaceName}
              workspaces={workspaces}
              selectedWorkspaceId={workspaceId}
              loading={workspaceLoading}
              errorMessage={workspaceErrorMessage}
              onSelectWorkspace={handleSelectWorkspace}
            />

            <ChevronRight size={14} className="text-slate-300" />

            <span className="inline-flex items-center gap-1.5 px-1 py-1 text-[15px] font-semibold text-slate-800">
              <BookOpenText size={14} className="text-[#5873F9]" />
              개발일지
            </span>

            <span
              className={`ml-1.5 rounded border px-1.5 py-px text-[10px] font-semibold ${
                currentWorkspaceMode === "team"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-blue-200 bg-blue-50 text-blue-700"
              }`}
            >
              {currentWorkspaceMode === "team" ? "Team" : "Personal"}
            </span>

            <span className="rounded border border-slate-200 bg-white px-1.5 py-px text-[10px] font-semibold text-slate-500">
              {currentWorkspaceRole}
            </span>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handlePrintDevlogsPdf}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900"
            >
              <Download size={14} />
              PDF 저장
            </button>

            <button
              type="button"
              disabled={!workspaceId}
              onClick={() => {
                if (!workspaceId) {
                  return;
                }

                router.push(getIdeHref(workspaceId, currentWorkspaceMode));
              }}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              작업하러 가기
              <ArrowUpRight size={14} />
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              disabled={!workspaceId}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-[#5873F9] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#4863E8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={14} />
              개발일지 작성
            </button>
          </div>
        </header>

        {/* =================================================
            WORKSPACE ROW
            상세 패널이 페이지 헤더 바로 아래에서 시작하도록 한 격자로 묶는다.
            1행 = [도구 모음 | 패널 머리], 2행 = [목록 | 패널 본문].
            패널은 subgrid 로 이 두 행을 그대로 써서, 도구 모음 아래 선과 패널 머리 아래 선이
            같은 행 경계에 놓인다(높이를 숫자로 맞추지 않는다).
            좁은 화면에서는 패널이 이 격자 안에서만 덮는다(TopNav·헤더는 가리지 않음).
        ================================================= */}
        <div className="relative grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] xl:grid-cols-[minmax(0,1fr)_auto]">
        {/* =================================================
            TOOLBAR: 유형 필터 | 일지 미작성 · 정렬 · 날짜/기간 · 검색
        ================================================= */}
        <div className="col-start-1 row-start-1 flex min-w-0 flex-col gap-2 border-b border-slate-200 px-4 py-2 lg:px-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="-mb-2 flex items-stretch gap-1 overflow-x-auto xl:-my-2">
            {filterTabs.map((tab) => (
              <DevlogSegmentButton
                key={tab.value}
                active={filter === tab.value}
                label={tab.label}
                count={tab.count}
                onClick={() => setFilter(tab.value)}
              />
            ))}
          </div>

          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1.5">
            {/* 일지 미작성 */}
            <button
              type="button"
              onClick={() => setShowNoDevlogPanel((prev) => !prev)}
              aria-pressed={showNoDevlogPanel}
              className={`inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors ${
                showNoDevlogPanel
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <FilePenLine size={13} />
              일지 미작성
              <span className="tabular-nums">{noDevlogSchedules.length}</span>
            </button>

            {/* AUTHOR: 팀 프로젝트에서만. 정렬 드롭다운과 같은 모양이라 도구 모음 높이가 늘지 않는다. */}
            {isTeamWorkspace ? (
              <div className="relative shrink-0">
                <UserRound
                  size={13}
                  className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 ${
                    authorFilter !== "all" ? "text-[#4058D6]" : "text-slate-400"
                  }`}
                />

                <select
                  value={authorFilter}
                  onChange={(event) => setAuthorFilter(event.target.value)}
                  aria-label="작성자"
                  className={`h-8 w-[136px] truncate rounded-md border pl-7 pr-5 text-xs font-medium outline-none transition-colors focus:border-[#AAB8FF] ${
                    authorFilter !== "all"
                      ? "border-[#C9D2FF] bg-[#EEF3FF] text-[#4058D6]"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <option value="all">전체 작성자</option>
                  <option value="me" disabled={!viewerId}>
                    내가 작성한 일지
                  </option>
                  {authorOptions.map((option) => (
                    <option key={option.userId} value={option.userId}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {/* SORT */}
            <div className="relative shrink-0">
              <Filter
                size={13}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <select
                value={sortFilter}
                onChange={(event) =>
                  setSortFilter(event.target.value as SortFilter)
                }
                aria-label="정렬"
                className="h-8 w-[118px] rounded-md border border-slate-200 bg-white pl-7 pr-5 text-xs font-medium text-slate-700 outline-none transition-colors hover:bg-slate-50 focus:border-[#AAB8FF]"
              >
                <option value="all">전체</option>
                <option value="latest">최신순</option>
                <option value="oldest">오래된순</option>
              </select>
            </div>

            {/* 날짜 / 기간 선택 */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setDatePickerOpen((prev) => !prev)}
                aria-expanded={datePickerOpen}
                className={`flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium outline-none transition-colors ${
                  (dateFilterMode === "single" && selectedDate) ||
                  (dateFilterMode === "range" && startDate && endDate)
                    ? "border-[#C9D2FF] bg-[#EEF3FF] text-[#4058D6]"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <CalendarDays size={13} />

                <span>
                  {dateFilterMode === "single" && selectedDate
                    ? selectedDate
                    : dateFilterMode === "range" && startDate && endDate
                      ? `${startDate} ~ ${endDate}`
                      : "날짜/기간"}
                </span>

                <ChevronDown
                  size={13}
                  className={`transition-transform ${
                    datePickerOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {datePickerOpen && (
                <div className="absolute right-0 top-10 z-50 w-[320px] rounded-md border border-slate-300 bg-white p-3">
                  {/* 날짜 / 기간 탭 */}
                  <div className="mb-3 grid grid-cols-2 rounded-md bg-slate-100 p-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setDateFilterMode("single");
                        setStartDate("");
                        setEndDate("");
                      }}
                      className={`h-7 rounded text-xs font-medium transition-colors ${
                        dateFilterMode === "single"
                          ? "bg-white text-[#4058D6]"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      날짜
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDateFilterMode("range");
                        setSelectedDate("");
                      }}
                      className={`h-7 rounded text-xs font-medium transition-colors ${
                        dateFilterMode === "range"
                          ? "bg-white text-[#4058D6]"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      기간
                    </button>
                  </div>

                  {/* 날짜 모드 */}
                  {dateFilterMode === "single" && (
                    <div>
                      <p className="mb-1.5 text-[11px] font-medium text-slate-500">
                        조회할 날짜
                      </p>

                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(event) =>
                          setSelectedDate(event.target.value)
                        }
                        className="h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none transition-colors focus:border-[#AAB8FF]"
                      />
                    </div>
                  )}

                  {/* 기간 모드 */}
                  {dateFilterMode === "range" && (
                    <div className="flex flex-col gap-2.5">
                      <p className="text-[11px] font-medium text-slate-500">
                        조회할 기간
                      </p>

                      <label className="block">
                        <span className="mb-1 block text-[11px] text-slate-400">
                          시작일
                        </span>

                        <input
                          type="date"
                          value={startDate}
                          max={endDate || undefined}
                          onChange={(event) =>
                            setStartDate(event.target.value)
                          }
                          className="h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none transition-colors focus:border-[#AAB8FF]"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-[11px] text-slate-400">
                          종료일
                        </span>

                        <input
                          type="date"
                          value={endDate}
                          min={startDate || undefined}
                          onChange={(event) =>
                            setEndDate(event.target.value)
                          }
                          className="h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none transition-colors focus:border-[#AAB8FF]"
                        />
                      </label>
                    </div>
                  )}

                  {/* 하단 */}
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDate("");
                        setStartDate("");
                        setEndDate("");
                      }}
                      className="h-7 rounded px-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
                    >
                      초기화
                    </button>

                    <button
                      type="button"
                      onClick={() => setDatePickerOpen(false)}
                      className="h-7 rounded-md bg-[#5873F9] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#4863E8]"
                    >
                      적용
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* SEARCH */}
            <div className="relative w-full sm:w-[280px]">
              <Search
                size={13}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="제목, 내용, 태그, 연결 일정 검색"
                className="h-8 w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 text-xs font-medium outline-none transition-colors placeholder:text-slate-400 focus:border-[#AAB8FF]"
              />
            </div>
          </div>
        </div>

        <div className="col-start-1 row-start-2 flex min-h-0 min-w-0 flex-col">
        {/* =================================================
            NO DEVLOG SCHEDULE
        ================================================= */}
        {showNoDevlogPanel ? (
          <NoDevlogMainPanel
            schedules={noDevlogSchedules}
            onCreateWithSchedule={openCreateModalWithSchedule}
            onClose={() => setShowNoDevlogPanel(false)}
          />
        ) : null}

        {/* =================================================
            LIST
        ================================================= */}
          <section className="min-h-0 min-w-0 flex-1 lg:overflow-y-auto">
            <div className="px-4 py-4 lg:px-5">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="text-[15px] font-semibold text-slate-900">
                  개발일지 목록
                  <span className="ml-1.5 text-sm font-semibold tabular-nums text-[#5873F9]">
                    {filteredDevlogs.length}
                  </span>
                  <span className="text-sm font-medium text-slate-400">개</span>
                </h2>

                <p className="hidden truncate text-xs text-slate-500 sm:block">
                  일정 연결 여부와 진행 상태 기준으로 기록을 확인합니다.
                </p>
              </div>

              <DataState loading={loading} errorMessage={errorMessage}>
                <DevlogListPanel
                  filteredDevlogs={filteredDevlogs}
                  // 상세를 열었을 때만 선택 표시를 한다(닫힌 상태에서 첫 행이 선택된 것처럼 보이지 않게)
                  selectedDevlog={detailOpen ? selectedDevlog : null}
                  onSelectDevlog={handleSelectDevlog}
                />
              </DataState>
            </div>
          </section>
          </div>

          {detailOpen && selectedDevlog ? (
            <DevlogDetailPanel
              selectedDevlog={selectedDevlog}
              deletingDevlogId={deletingDevlogId}
              canManage={canManageDevlog(selectedDevlog, viewerId)}
              onClose={() => setIsDetailModalOpen(false)}
              onEdit={openEditModal}
              onDelete={deleteDevlog}
            />
          ) : null}
        </div>
      </main>

      {/* =================================================
          CREATE MODAL
      ================================================= */}

      {isCreateModalOpen ? (
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
      ) : null}

      {/* =================================================
          EDIT MODAL
      ================================================= */}

      {isEditModalOpen && editingDevlog ? (
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
      ) : null}
    </>
  );
}

/* =========================================================
   DEVLOG SEGMENT BUTTON (유형 필터 탭)
========================================================= */

function DevlogSegmentButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;

  label: string;

  count?: number;

  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-10 shrink-0 items-center gap-1.5 border-b-2 px-2.5 text-[13px] font-medium transition-colors ${
        active
          ? "border-[#5873F9] text-[#4058D6]"
          : "border-transparent text-slate-500 hover:text-slate-900"
      }`}
    >
      {label}

      {typeof count === "number" ? (
        <span
          className={`rounded px-1.5 py-px text-[11px] font-semibold tabular-nums ${
            active ? "bg-[#EEF2FF] text-[#4058D6]" : "bg-slate-100 text-slate-500"
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

/* =========================================================
   NO DEVLOG MAIN PANEL
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
    <div className="shrink-0 border-b border-amber-100 bg-[#FFFCF5] px-4 py-3 lg:px-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-amber-100 text-amber-700">
            <FilePenLine size={14} />
          </span>

          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold text-slate-900">
              일지 미작성 일정
              <span className="ml-1.5 tabular-nums text-amber-700">
                {schedules.length}
              </span>
            </h3>

            <p className="mt-0.5 text-[11px] text-slate-500">
              아직 수행 기록이 없는 일정에서 바로 개발일지를 작성할 수 있습니다.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
          aria-label="일지 미작성 일정 닫기"
        >
          <PanelLeftClose size={15} />
        </button>
      </div>

      {schedules.length === 0 ? (
        <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-700">
          모든 일정에 개발일지가 연결되어 있습니다.
        </div>
      ) : (
        <div className="mt-3 grid max-h-[220px] gap-1.5 overflow-y-auto pr-1 md:grid-cols-2 2xl:grid-cols-3">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="flex min-w-0 items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-xs font-semibold text-slate-800">
                    {schedule.title}
                  </p>

                  <span
                    className={`shrink-0 rounded border px-1.5 py-px text-[10px] font-medium ${
                      statusStyle[schedule.status]
                    }`}
                  >
                    {scheduleStatusLabel[schedule.status]}
                  </span>
                </div>

                <p className="mt-0.5 truncate font-mono text-[10px] text-slate-400">
                  {schedule.startDate === schedule.endDate
                    ? schedule.startDate
                    : `${schedule.startDate} ~ ${schedule.endDate}`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onCreateWithSchedule(schedule.id)}
                className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md bg-[#5873F9] px-2.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#4863E8]"
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

/* =========================================================
   DETAIL PANEL
   예전에는 화면 가운데 모달이었다. 목록을 보면서 읽을 수 있게 오른쪽 패널로 연다.
   넓은 화면(xl)에서는 목록 옆에 붙고, 좁은 화면에서는 오른쪽에서 덮는다.
   열고 닫는 상태와 수정·삭제 핸들러는 예전 모달 것을 그대로 쓴다.
========================================================= */

function DevlogDetailPanel({
  selectedDevlog,
  deletingDevlogId,
  canManage,
  onClose,
  onEdit,
  onDelete,
}: {
  selectedDevlog: DevlogItem;

  deletingDevlogId: string;

  /** 본인 일지일 때만 true. 남의 일지·작성자 미상 일지는 조회만 한다. */
  canManage: boolean;

  onClose: () => void;

  onEdit: (devlog: DevlogItem) => void;

  onDelete: (devlog: DevlogItem) => void;
}) {
  const workedDate =
    selectedDevlog.workedDate ||
    selectedDevlog.date ||
    "-";

  const isLinked = selectedDevlog.type === "linked";

  const deleting =
    deletingDevlogId === selectedDevlog.id;

  // 좁은 화면에서 덮을 때만 Esc 로 닫히면 되지만, 넓은 화면에서도 같은 동작이면 헷갈리지 않는다.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      {/* 좁은 화면: 뒤 배경 */}
      <div
        className="absolute inset-0 z-30 bg-slate-950/25 xl:hidden"
        onMouseDown={onClose}
      />

      <aside
        aria-label="개발일지 상세"
        className="absolute inset-y-0 right-0 z-40 flex w-full max-w-[480px] flex-col border-l border-slate-200 bg-white xl:static xl:z-auto xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:grid xl:w-[440px] xl:max-w-none xl:grid-cols-[minmax(0,1fr)] xl:grid-rows-subgrid 2xl:w-[480px]"
      >
        {/* HEADER: 왼쪽 도구 모음과 같은 격자 행이라 아래 구분선이 항상 같은 높이에 놓인다.
            1줄 = 유형·상태 배지 … 날짜 · 닫기, 2줄 = 제목(최대 2줄, 넘치면 생략·전체는 title 로) */}
        <header className="flex min-w-0 flex-col justify-center gap-2 border-b border-slate-200 px-5 py-2">
          <div className="flex h-5 min-w-0 items-center gap-1">
            <span
              className={`inline-flex h-5 shrink-0 items-center gap-1 rounded border px-1.5 text-[10px] font-medium ${
                isLinked
                  ? "border-[#D9E1FF] bg-[#F5F7FF] text-[#4058D6]"
                  : "border-slate-200 bg-slate-50 text-slate-600"
              }`}
            >
              {isLinked ? <Link2 size={10} /> : <FilePenLine size={10} />}
              {isLinked ? "일정 연결" : "일반 일지"}
            </span>

            {selectedDevlog.status ? (
              <span
                className={`inline-flex h-5 shrink-0 items-center rounded border px-1.5 text-[10px] font-medium ${
                  statusStyle[selectedDevlog.status]
                }`}
              >
                {scheduleStatusLabel[selectedDevlog.status]}
              </span>
            ) : null}

            <p className="ml-auto flex shrink-0 items-center gap-x-1.5 pl-2 text-[11px] text-slate-400">
              {selectedDevlog.authorName ? (
                <>
                  <span className="font-medium text-slate-600">
                    {selectedDevlog.authorName}
                  </span>
                  <span className="text-slate-300">·</span>
                </>
              ) : null}
              <span className="font-mono">{workedDate}</span>
            </p>

            <button
              type="button"
              onClick={onClose}
              className="-my-1 -mr-1.5 grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="개발일지 상세 닫기"
            >
              <X size={16} />
            </button>
          </div>

          <h2
            className="line-clamp-2 text-base font-bold leading-tight text-slate-900 [overflow-wrap:anywhere]"
            title={selectedDevlog.title || "제목 없는 개발일지"}
          >
            {selectedDevlog.title || "제목 없는 개발일지"}
          </h2>
        </header>

        {/* 격자 2행: 본문(스크롤) + 하단 버튼(고정) */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* CONTENT: 여기서만 세로 스크롤 */}
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <section className="border-b border-slate-100 px-5 py-1">
            <DevlogDetailMetaRow icon={<FolderOpen size={14} />} label="프로젝트">
              <span className="min-w-0 text-xs font-medium text-slate-800 [overflow-wrap:anywhere]">
                {selectedDevlog.projectName}
              </span>
            </DevlogDetailMetaRow>

            <DevlogDetailMetaRow icon={<UserRound size={14} />} label="작성자">
              {/* 서버가 준 작성자만 보인다. 일정 담당자나 로그인한 나로 대신 채우지 않는다. */}
              <span
                className={`text-xs ${
                  selectedDevlog.authorName ? "text-slate-700" : "text-slate-400"
                }`}
              >
                {selectedDevlog.authorName || "작성자 정보 없음"}
              </span>
            </DevlogDetailMetaRow>

            <DevlogDetailMetaRow icon={<CalendarDays size={14} />} label="작업일">
              <span className="font-mono text-xs text-slate-700">{workedDate}</span>
            </DevlogDetailMetaRow>

            <DevlogDetailMetaRow icon={<Link2 size={14} />} label="연결 일정" last>
              {selectedDevlog.scheduleTitle ? (
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <span
                    className="truncate text-xs font-medium text-[#4058D6]"
                    title={selectedDevlog.scheduleTitle}
                  >
                    {selectedDevlog.scheduleTitle}
                  </span>

                  {selectedDevlog.status ? (
                    <span
                      className={`shrink-0 rounded border px-1.5 py-px text-[10px] font-medium ${
                        statusStyle[selectedDevlog.status]
                      }`}
                    >
                      {scheduleStatusLabel[selectedDevlog.status]}
                    </span>
                  ) : null}
                </span>
              ) : (
                <span className="text-xs text-slate-400">
                  연결된 일정이 없습니다.
                </span>
              )}
            </DevlogDetailMetaRow>
          </section>

          {/* WORK LOG */}
          <section className="px-5 py-4">
            <h3 className="mb-2 text-[11px] font-medium text-slate-500">
              작성 내용
            </h3>

            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-800 [overflow-wrap:anywhere]">
              {selectedDevlog.content || "작성된 내용이 없습니다."}
            </p>
          </section>

          {/* TAGS */}
          {selectedDevlog.tags.length > 0 ? (
            <section className="border-t border-slate-100 px-5 py-4">
              <h3 className="mb-2 text-[11px] font-medium text-slate-500">태그</h3>

              <div className="flex flex-wrap gap-1.5">
                {selectedDevlog.tags.map((tag) => (
                  <span
                    key={tag}
                    className="max-w-full rounded border border-slate-200 px-1.5 py-0.5 text-[11px] text-slate-600 [overflow-wrap:anywhere]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {/* FOOTER: 남의 일지에는 수정·삭제 대신 안내만 둔다(패널 높이는 그대로). */}
        {canManage ? (
        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button
            type="button"
            onClick={() => onDelete(selectedDevlog)}
            disabled={deleting}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-rose-200 bg-white px-3.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
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
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-[#5873F9] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#4863E8]"
          >
            <Pencil size={14} />
            수정
          </button>
        </footer>
        ) : (
          <footer className="flex h-[61px] shrink-0 items-center justify-end border-t border-slate-200 px-5 text-[11px] text-slate-400">
            본인이 작성한 개발일지만 수정·삭제할 수 있습니다.
          </footer>
        )}
        </div>
      </aside>
    </>
  );
}

/* =========================================================
   DETAIL META ROW
========================================================= */

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
      className={`grid grid-cols-[92px_minmax(0,1fr)] items-center gap-3 py-2.5 ${
        last ? "" : "border-b border-slate-100"
      }`}
    >
      <div className="flex items-center gap-1.5 text-slate-400">
        {icon}

        <span className="text-[11px] font-medium text-slate-500">{label}</span>
      </div>

      <div className="flex min-w-0 items-center">{children}</div>
    </div>
  );
}

/* =========================================================
   DATA STATE
========================================================= */

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
      <div className="grid min-h-[240px] place-items-center rounded-md border border-dashed border-slate-200">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Loader2 className="animate-spin" size={15} />
          개발일지 데이터를 불러오는 중입니다.
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
        {errorMessage}
      </div>
    );
  }

  return <>{children}</>;
}
