"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FilePenLine,
  Filter,
  FolderOpen,
  GripVertical,
  ListTodo,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

import {
  formatDateKey,
  type ScheduleStatus,
} from "@/components/schedules/scheduleMockData";

import {
  createWorkspaceScheduleApi,
  deleteScheduleApi,
  fetchWorkspaceSchedulesApi,
  updateScheduleApi,
  updateSchedulePeriodApi,
  updateScheduleStatusApi,
  type ScheduleApiItem,
} from "@/lib/schedules/scheduleApi";

import {
  getMyWorkspacesByTokenApi,
  getWorkspaceMembersApi,
} from "@/lib/ide/api";

/* =========================================================
   TYPES
   ========================================================= */

type ScheduleViewMode = "board" | "calendar" | "gantt" | "list";

type WorkspaceMode = "personal" | "team";

type ProjectFilter = "all" | WorkspaceMode;

type SmartFilter = "all" | "today" | "mine" | "noDevlog";

type TodayScope = "selected" | "all";

type StatusFilter = "all" | ScheduleStatus;

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
  name: string;
  mode: WorkspaceMode;
  role?: string;
  childCount: number;
};

type WorkspaceMember = {
  userId: number;
  email?: string;
  nickname?: string;
  name?: string;
  role: "OWNER" | "MEMBER" | "owner" | "member" | string;
};

type ProjectScheduleItem = {
  id: string;

  workspaceId: string;

  projectName: string;
  customProjectName?: string;

  title: string;
  description: string;

  startDate: string;
  endDate: string;

  status: ScheduleStatus;

  hasDevlog: boolean;

  assigneeUserId?: number | null;
  assigneeName?: string;

  creatorId?: number | null;
  creatorName?: string;

  createdAt?: string;
  updatedAt?: string;
};

type ScheduleForm = {
  title: string;
  startDate: string;
  endDate: string;
  status: ScheduleStatus;
  description: string;

  assigneeUserId: number | null;
};

/* =========================================================
   CONSTANT
   ========================================================= */


const STATUS_META: Record<
  ScheduleStatus,
  {
    label: string;
    dot: string;
    badge: string;
    board: string;
  }
> = {
  todo: {
    label: "할 일",
    dot: "bg-slate-400",
    badge: "border-slate-200 bg-slate-50 text-slate-600",
    board: "border-slate-200 bg-slate-50/70",
  },

  progress: {
    label: "진행 중",
    dot: "bg-[#5873F9]",
    badge: "border-blue-200 bg-blue-50 text-blue-700",
    board: "border-blue-100 bg-blue-50/40",
  },

  done: {
    label: "완료",
    dot: "bg-emerald-500",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    board: "border-emerald-100 bg-emerald-50/40",
  },

  delayed: {
    label: "지연",
    dot: "bg-rose-500",
    badge: "border-rose-200 bg-rose-50 text-rose-700",
    board: "border-rose-100 bg-rose-50/40",
  },
};

const BOARD_STATUSES: ScheduleStatus[] = [
  "todo",
  "progress",
  "done",
  "delayed",
];

const DAY_MS = 1000 * 60 * 60 * 24;

/* =========================================================
   COMMON
   ========================================================= */

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeWorkspaceId(value: string | null) {
  if (!value) return "";

  if (value === "undefined" || value === "null") {
    return "";
  }

  return value;
}

function getTodayLocalDate() {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
}

function getDateKeyFromDate(date: Date) {
  return formatDateKey(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
}

function parseDateKey(value: string) {
  const [year, month, date] = value
    .split("-")
    .map(Number);

  return new Date(
    year,
    month - 1,
    date,
  );
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);

  next.setDate(next.getDate() + amount);

  return next;
}

function getDayDifference(
  start: Date,
  end: Date,
) {
  const startTime = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  ).getTime();

  const endTime = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate(),
  ).getTime();

  return Math.round(
    (endTime - startTime) / DAY_MS,
  );
}

function formatShortDate(value: string) {
  if (!value) return "-";

  const [year, month, date] = value.split("-");

  return `${year}.${month}.${date}`;
}

function formatCompactDate(value: string) {
  if (!value) return "-";

  const [, month, date] = value.split("-");

  return `${Number(month)}/${Number(date)}`;
}

function getInitial(value?: string) {
  return (
    value?.trim().charAt(0).toUpperCase() ||
    "U"
  );
}

/* =========================================================
   WORKSPACE
   ========================================================= */

function extractWorkspaceList(
  value: unknown,
): WorkspaceLike[] {
  if (Array.isArray(value)) {
    return value as WorkspaceLike[];
  }

  if (
    value &&
    typeof value === "object"
  ) {
    const objectValue =
      value as Record<string, unknown>;

    if (
      Array.isArray(
        objectValue.workspaces,
      )
    ) {
      return objectValue.workspaces as WorkspaceLike[];
    }

    if (
      Array.isArray(
        objectValue.data,
      )
    ) {
      return objectValue.data as WorkspaceLike[];
    }

    if (
      Array.isArray(
        objectValue.content,
      )
    ) {
      return objectValue.content as WorkspaceLike[];
    }

    if (
      Array.isArray(
        objectValue.list,
      )
    ) {
      return objectValue.list as WorkspaceLike[];
    }
  }

  return [];
}

function mapWorkspaceFromApi(
  item: WorkspaceLike,
): WorkspaceSidebarItem | null {
  const id =
    item.uuid ||
    item.id ||
    item.workspaceId;

  if (!id) {
    return null;
  }

  const mode =
    item.mode ||
    item.type ||
    "personal";

  return {
    id,

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
      (Array.isArray(item.children)
        ? item.children.length
        : 0),
  };
}

function normalizeWorkspaceRole(
  role?: string,
) {
  return role?.toLowerCase() === "owner"
    ? "OWNER"
    : "MEMBER";
}

/* =========================================================
   MEMBER
   ========================================================= */

function normalizeMember(
  value: unknown,
): WorkspaceMember | null {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  const item =
    value as Record<string, unknown>;

  const rawUserId =
    item.userId ??
    item.id;

  const userId = Number(rawUserId);

  if (
    !Number.isFinite(userId)
  ) {
    return null;
  }

  return {
    userId,

    email:
      typeof item.email === "string"
        ? item.email
        : undefined,

    nickname:
      typeof item.nickname === "string"
        ? item.nickname
        : undefined,

    name:
      typeof item.name === "string"
        ? item.name
        : undefined,

    role:
      typeof item.role === "string"
        ? item.role
        : "MEMBER",
  };
}

function getMemberName(
  member?: WorkspaceMember | null,
) {
  if (!member) {
    return "담당자 없음";
  }

  return (
    member.nickname ||
    member.name ||
    member.email ||
    `User ${member.userId}`
  );
}

function getMemberRole(
  member?: WorkspaceMember | null,
) {
  return member?.role
    ?.toUpperCase() === "OWNER"
    ? "OWNER"
    : "MEMBER";
}

/* =========================================================
   SCHEDULE MAPPING
   ========================================================= */

function getNumberValue(
  record: Record<string, unknown>,
  keys: string[],
) {
  for (const key of keys) {
    const value = record[key];

    if (
      value !== null &&
      value !== undefined &&
      value !== ""
    ) {
      const numberValue = Number(value);

      if (
        Number.isFinite(numberValue)
      ) {
        return numberValue;
      }
    }
  }

  return null;
}

function getStringValue(
  record: Record<string, unknown>,
  keys: string[],
) {
  for (const key of keys) {
    const value = record[key];

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return "";
}

function getAssigneeUserId(
  record: Record<string, unknown>,
) {
  const direct = getNumberValue(
    record,
    [
      "assigneeUserId",
      "assigneeId",
      "assignedUserId",
      "participantUserId",
    ],
  );

  if (direct !== null) {
    return direct;
  }

  const arrays = [
    record.assigneeUserIds,
    record.assigneeIds,
    record.participantUserIds,
  ];

  for (const candidate of arrays) {
    if (
      Array.isArray(candidate) &&
      candidate.length > 0
    ) {
      const first = Number(candidate[0]);

      if (Number.isFinite(first)) {
        return first;
      }
    }
  }

  return null;
}

function getAssigneeName(
  record: Record<string, unknown>,
) {
  const direct = getStringValue(
    record,
    [
      "assigneeName",
      "assignedUserName",
      "participantName",
    ],
  );

  if (direct) {
    return direct;
  }

  const participants =
    record.participants;

  if (
    typeof participants === "string"
  ) {
    return (
      participants
        .split(",")
        .map((value) =>
          value.trim(),
        )
        .filter(Boolean)[0] || ""
    );
  }

  return "";
}

function mapScheduleFromApi(
  item: ScheduleApiItem,
): ProjectScheduleItem {
  const raw =
    item as unknown as Record<
      string,
      unknown
    >;

  return {
    id: String(item.id),

    workspaceId:
      item.workspaceId,

    projectName:
      item.projectName ||
      "프로젝트",

    customProjectName:
      item.customProjectName,

    title:
      item.title || "제목 없는 일정",

    description:
      item.description || "",

    startDate:
      item.startDate,

    endDate:
      item.endDate,

    status:
      item.status,

    hasDevlog:
      Boolean(item.hasDevlog),

    assigneeUserId:
      getAssigneeUserId(raw),

    assigneeName:
      getAssigneeName(raw),

    creatorId:
      getNumberValue(
        raw,
        ["creatorId", "createdByUserId"],
      ),

    creatorName:
      getStringValue(
        raw,
        ["creatorName", "createdByName"],
      ),

    createdAt:
      item.createdAt,

    updatedAt:
      item.updatedAt,
  };
}

function getProjectName(
  schedule: ProjectScheduleItem,
) {
  return (
    schedule.customProjectName ||
    schedule.projectName ||
    "프로젝트"
  );
}

function isDateInScheduleRange(
  schedule: ProjectScheduleItem,
  dateKey: string,
) {
  return (
    schedule.startDate <= dateKey &&
    dateKey <= schedule.endDate
  );
}

function getSchedulePeriodText(
  schedule: ProjectScheduleItem,
) {
  if (
    schedule.startDate ===
    schedule.endDate
  ) {
    return formatShortDate(
      schedule.startDate,
    );
  }

  return `${formatShortDate(
    schedule.startDate,
  )} ~ ${formatShortDate(
    schedule.endDate,
  )}`;
}

/* =========================================================
   CALENDAR
   ========================================================= */

function buildMonthCells(
  year: number,
  month: number,
) {
  const firstDate =
    new Date(year, month, 1);

  const start = new Date(
    year,
    month,
    1 - firstDate.getDay(),
  );

  return Array.from(
    { length: 42 },
    (_, index) =>
      addDays(start, index),
  );
}

/* =========================================================
   MAIN
   ========================================================= */

export default function ScheduleManagementPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams =
    useSearchParams();

  const workspaceId =
    normalizeWorkspaceId(
      searchParams.get("workspaceId") ??
        searchParams.get("id"),
    );

  const today = useMemo(
    () => getTodayLocalDate(),
    [],
  );

  const todayDate =
    useMemo(
      () =>
        getDateKeyFromDate(today),
      [today],
    );

  /* =====================================================
     DATA
     ===================================================== */

  const [
    workspaces,
    setWorkspaces,
  ] = useState<
    WorkspaceSidebarItem[]
  >([]);

  const [
    workspaceName,
    setWorkspaceName,
  ] = useState("프로젝트");

  const [
    schedules,
    setSchedules,
  ] = useState<
    ProjectScheduleItem[]
  >([]);

  const [
    allProjectTodaySchedules,
    setAllProjectTodaySchedules,
  ] = useState<
    ProjectScheduleItem[]
  >([]);

  const [
    teamMembers,
    setTeamMembers,
  ] = useState<
    WorkspaceMember[]
  >([]);

  const [
    currentUserId,
    setCurrentUserId,
  ] = useState<number | null>(
    null,
  );

  /* =====================================================
     LOADING
     ===================================================== */

  const [
    workspaceLoading,
    setWorkspaceLoading,
  ] = useState(true);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    teamMemberLoading,
    setTeamMemberLoading,
  ] = useState(false);

  const [
    allTodayLoading,
    setAllTodayLoading,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  /* =====================================================
     ERROR
     ===================================================== */

  const [
    workspaceErrorMessage,
    setWorkspaceErrorMessage,
  ] = useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    memberErrorMessage,
    setMemberErrorMessage,
  ] = useState("");

  /* =====================================================
     SIDEBAR
     ===================================================== */

  const [
    projectSearch,
    setProjectSearch,
  ] = useState("");

const projectSearchInputRef =
  useRef<HTMLInputElement | null>(null);

  const [
    projectFilter,
    setProjectFilter,
  ] = useState<ProjectFilter>(
    "all",
  );

  const [
    isSidebarPinned,
    setIsSidebarPinned,
  ] = useState(true);

  const [
    isSidebarHovered,
    setIsSidebarHovered,
  ] = useState(false);

  const [
    canSidebarHoverExpand,
    setCanSidebarHoverExpand,
  ] = useState(true);

  // 화면 최상단에서는 메인 영역과 같은 시작 높이를 유지하고,
  // 스크롤이 시작된 뒤에는 사이드바가 WAIVS 헤더 아래에 붙도록 합니다.
  const [
    isPageScrolled,
    setIsPageScrolled,
  ] = useState(false);

  const sidebarExpanded =
    isSidebarPinned ||
    (canSidebarHoverExpand &&
      isSidebarHovered);

  useEffect(() => {
    const handleScroll = () => {
      setIsPageScrolled(
        window.scrollY > 0,
      );
    };

    handleScroll();

    window.addEventListener(
      "scroll",
      handleScroll,
      {
        passive: true,
      },
    );

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll,
      );
    };
  }, []);

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

  /* =====================================================
     VIEW / FILTER
     ===================================================== */

  const [
    viewMode,
    setViewMode,
  ] =
    useState<ScheduleViewMode>(
      "board",
    );

  const [
    query,
    setQuery,
  ] = useState("");

  const [
    smartFilter,
    setSmartFilter,
  ] =
    useState<SmartFilter>("all");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<StatusFilter>("all");

  const [
    todayScope,
    setTodayScope,
  ] =
    useState<TodayScope>("selected");

  const [
    assigneeFilter,
    setAssigneeFilter,
  ] =
    useState<string>("all");

  /* =====================================================
     MODAL
     ===================================================== */

  const [
    selectedScheduleId,
    setSelectedScheduleId,
  ] = useState<
    string | null
  >(null);

  const [
    isDetailModalOpen,
    setIsDetailModalOpen,
  ] = useState(false);

  const [
    isCreateModalOpen,
    setIsCreateModalOpen,
  ] = useState(false);

  const [
    isEditModalOpen,
    setIsEditModalOpen,
  ] = useState(false);

  const [
    editingSchedule,
    setEditingSchedule,
  ] =
    useState<ProjectScheduleItem | null>(
      null,
    );

  /* =====================================================
     CALENDAR
     ===================================================== */

  const [
    currentYear,
    setCurrentYear,
  ] = useState(
    today.getFullYear(),
  );

  const [
    currentMonth,
    setCurrentMonth,
  ] = useState(
    today.getMonth(),
  );

  /* =====================================================
     GANTT
     ===================================================== */

  const [
    ganttStartDate,
    setGanttStartDate,
  ] = useState<Date>(() => {
    const result =
      getTodayLocalDate();

    const day =
      result.getDay();

    const mondayDiff =
      day === 0
        ? -6
        : 1 - day;

    result.setDate(
      result.getDate() +
        mondayDiff,
    );

    return result;
  });

  /* =====================================================
     FORM
     ===================================================== */

  const [
    createForm,
    setCreateForm,
  ] =
    useState<ScheduleForm>({
      title: "",
      description: "",
      startDate: todayDate,
      endDate: todayDate,
      status: "todo",
      assigneeUserId: null,
    });

  const [
    editForm,
    setEditForm,
  ] =
    useState<ScheduleForm>({
      title: "",
      description: "",
      startDate: todayDate,
      endDate: todayDate,
      status: "todo",
      assigneeUserId: null,
    });

  /* =====================================================
     SELECTED WORKSPACE
     ===================================================== */

  const currentWorkspace =
    useMemo(() => {
      return (
        workspaces.find(
          (workspace) =>
            workspace.id ===
            workspaceId,
        ) ?? null
      );
    }, [
      workspaceId,
      workspaces,
    ]);

  const currentMode:
    WorkspaceMode =
    currentWorkspace?.mode ||
    (searchParams.get("mode") ===
    "team"
      ? "team"
      : searchParams.get(
            "view",
          ) === "team"
        ? "team"
        : "personal");

  const isTeam =
    currentMode === "team";

  const currentRole =
    normalizeWorkspaceRole(
      currentWorkspace?.role,
    );

  const ownerMember =
    useMemo(() => {
      return (
        teamMembers.find(
          (member) =>
            getMemberRole(member) ===
            "OWNER",
        ) ?? null
      );
    }, [teamMembers]);

  const myMember =
    useMemo(() => {
      if (!currentUserId) {
        return null;
      }

      return (
        teamMembers.find(
          (member) =>
            member.userId ===
            currentUserId,
        ) ?? null
      );
    }, [
      currentUserId,
      teamMembers,
    ]);

  /* =====================================================
     LOAD CURRENT USER
     ===================================================== */

  useEffect(() => {
    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }

    const storedId =
      localStorage.getItem(
        "userId",
      );

    const parsed =
      Number(storedId);

    if (
      Number.isFinite(parsed)
    ) {
      setCurrentUserId(
        parsed,
      );
    }
  }, []);

  /* =====================================================
     LOAD ALL TODAY
     ===================================================== */

  const loadAllProjectTodaySchedules =
    async (
      workspaceList: WorkspaceSidebarItem[],
    ) => {
      if (
        workspaceList.length ===
        0
      ) {
        setAllProjectTodaySchedules(
          [],
        );
        return;
      }

      try {
        setAllTodayLoading(true);

        const results =
          await Promise.allSettled(
            workspaceList.map(
              (workspace) =>
                fetchWorkspaceSchedulesApi(
                  {
                    workspaceId:
                      workspace.id,
                  },
                ),
            ),
          );

        const merged =
          results.flatMap(
            (result) => {
              if (
                result.status !==
                "fulfilled"
              ) {
                return [];
              }

              return result.value.map(
                mapScheduleFromApi,
              );
            },
          );

        const todayItems =
          merged
            .filter((item) =>
              isDateInScheduleRange(
                item,
                todayDate,
              ),
            )
            .sort((a, b) =>
              a.startDate.localeCompare(
                b.startDate,
              ),
            );

        setAllProjectTodaySchedules(
          todayItems,
        );
      } finally {
        setAllTodayLoading(false);
      }
    };

  /* =====================================================
     LOAD WORKSPACES
     ===================================================== */

  const loadWorkspaces =
    async () => {
      try {
        setWorkspaceLoading(
          true,
        );

        setWorkspaceErrorMessage(
          "",
        );

        const response =
          await getMyWorkspacesByTokenApi();

        const mapped =
          extractWorkspaceList(
            response,
          )
            .map(
              mapWorkspaceFromApi,
            )
            .filter(
              (
                item,
              ): item is WorkspaceSidebarItem =>
                Boolean(item),
            );

        setWorkspaces(mapped);

        void loadAllProjectTodaySchedules(
          mapped,
        );

        const matched =
          mapped.find(
            (workspace) =>
              workspace.id ===
              workspaceId,
          );

        if (matched) {
          setWorkspaceName(
            matched.name,
          );

          if (
            typeof window !==
            "undefined"
          ) {
            localStorage.setItem(
              "currentWorkspaceId",
              matched.id,
            );

            localStorage.setItem(
              "currentWorkspaceMode",
              matched.mode,
            );
          }

          return;
        }

        if (
          !workspaceId &&
          mapped[0]
        ) {
          const first =
            mapped[0];

          const params =
            new URLSearchParams(
              searchParams.toString(),
            );

          params.set(
            "workspaceId",
            first.id,
          );

          params.set(
            "mode",
            first.mode,
          );

          params.set(
            "view",
            first.mode,
          );

          setWorkspaceName(
            first.name,
          );

          router.replace(
            `${pathname}?${params.toString()}`,
          );
        }
      } catch (error) {
        setWorkspaceErrorMessage(
          error instanceof Error
            ? error.message
            : "프로젝트 목록을 불러오지 못했습니다.",
        );
      } finally {
        setWorkspaceLoading(
          false,
        );
      }
    };

  /* =====================================================
     LOAD SCHEDULES
     ===================================================== */

  const loadSchedules =
    async () => {
      if (!workspaceId) {
        setSchedules([]);

        setLoading(false);

        return;
      }

      try {
        setLoading(true);

        setErrorMessage("");

        const data =
          await fetchWorkspaceSchedulesApi(
            {
              workspaceId,
            },
          );

        const mapped =
          data.map(
            mapScheduleFromApi,
          );

        setSchedules(mapped);

        const projectName =
          mapped[0]
            ?.customProjectName ||
          mapped[0]
            ?.projectName;

        if (projectName) {
          setWorkspaceName(
            projectName,
          );
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "일정 목록을 불러오지 못했습니다.",
        );
      } finally {
        setLoading(false);
      }
    };

  /* =====================================================
     LOAD MEMBERS
     ===================================================== */

  const loadTeamMembers =
    async () => {
      if (
        !workspaceId ||
        !isTeam
      ) {
        setTeamMembers([]);
        setMemberErrorMessage(
          "",
        );
        return;
      }

      try {
        setTeamMemberLoading(
          true,
        );

        setMemberErrorMessage(
          "",
        );

        const response =
          await getWorkspaceMembersApi(
            workspaceId,
          );

        const array =
          Array.isArray(response)
            ? response
            : [];

        const mapped =
          array
            .map(normalizeMember)
            .filter(
              (
                item,
              ): item is WorkspaceMember =>
                Boolean(item),
            );

        mapped.sort(
          (a, b) => {
            const aOwner =
              getMemberRole(a) ===
              "OWNER";

            const bOwner =
              getMemberRole(b) ===
              "OWNER";

            if (
              aOwner !==
              bOwner
            ) {
              return aOwner
                ? -1
                : 1;
            }

            return getMemberName(
              a,
            ).localeCompare(
              getMemberName(b),
            );
          },
        );

        setTeamMembers(mapped);
      } catch (error) {
        setTeamMembers([]);

        setMemberErrorMessage(
          error instanceof Error
            ? error.message
            : "팀원 목록을 불러오지 못했습니다.",
        );
      } finally {
        setTeamMemberLoading(
          false,
        );
      }
    };

  /* =====================================================
     LOAD EFFECT
     ===================================================== */

  useEffect(() => {
    void loadWorkspaces();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const matched =
      workspaces.find(
        (workspace) =>
          workspace.id ===
          workspaceId,
      );

    if (matched) {
      setWorkspaceName(
        matched.name,
      );
    }

    setAssigneeFilter("all");
    setSmartFilter("all");

    void loadSchedules();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  useEffect(() => {
    void loadTeamMembers();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    workspaceId,
    isTeam,
  ]);

  /* =====================================================
     SIDEBAR DATA
     ===================================================== */

  const personalCount =
    workspaces.filter(
      (workspace) =>
        workspace.mode ===
        "personal",
    ).length;

  const teamCount =
    workspaces.filter(
      (workspace) =>
        workspace.mode ===
        "team",
    ).length;

  const filteredSidebarWorkspaces =
    useMemo(() => {
      const keyword =
        projectSearch
          .trim()
          .toLowerCase();

      return workspaces.filter(
        (workspace) => {
          const matchesMode =
            projectFilter ===
              "all" ||
            workspace.mode ===
              projectFilter;

          const matchesKeyword =
            !keyword ||
            workspace.name
              .toLowerCase()
              .includes(keyword);

          return (
            matchesMode &&
            matchesKeyword
          );
        },
      );
    }, [
      projectFilter,
      projectSearch,
      workspaces,
    ]);

  const personalWorkspaces =
    filteredSidebarWorkspaces.filter(
      (workspace) =>
        workspace.mode ===
        "personal",
    );

  const teamWorkspaces =
    filteredSidebarWorkspaces.filter(
      (workspace) =>
        workspace.mode ===
        "team",
    );

  /* =====================================================
     SOURCE DATA
     ===================================================== */

  const sourceSchedules =
    useMemo(() => {
      if (
        smartFilter ===
          "today" &&
        todayScope === "all"
      ) {
        return allProjectTodaySchedules;
      }

      return schedules;
    }, [
      allProjectTodaySchedules,
      schedules,
      smartFilter,
      todayScope,
    ]);

  const filteredSchedules =
    useMemo(() => {
      const keyword =
        query
          .trim()
          .toLowerCase();

      return sourceSchedules.filter(
        (schedule) => {
          if (
            statusFilter !==
              "all" &&
            schedule.status !==
              statusFilter
          ) {
            return false;
          }

          if (
            smartFilter ===
              "today" &&
            todayScope ===
              "selected" &&
            !isDateInScheduleRange(
              schedule,
              todayDate,
            )
          ) {
            return false;
          }

          if (
            smartFilter ===
              "noDevlog" &&
            schedule.hasDevlog
          ) {
            return false;
          }

          if (
            smartFilter ===
            "mine"
          ) {
            if (
              !currentUserId
            ) {
              return false;
            }

            const idMatched =
              schedule.assigneeUserId ===
              currentUserId;

            const nameMatched =
              myMember &&
              schedule.assigneeName &&
              schedule.assigneeName ===
                getMemberName(
                  myMember,
                );

            if (
              !idMatched &&
              !nameMatched
            ) {
              return false;
            }
          }

          if (
            assigneeFilter !==
            "all"
          ) {
            const targetId =
              Number(
                assigneeFilter,
              );

            const targetMember =
              teamMembers.find(
                (member) =>
                  member.userId ===
                  targetId,
              );

            const idMatched =
              schedule.assigneeUserId ===
              targetId;

            const nameMatched =
              targetMember &&
              schedule.assigneeName ===
                getMemberName(
                  targetMember,
                );

            if (
              !idMatched &&
              !nameMatched
            ) {
              return false;
            }
          }

          if (
            keyword &&
            !schedule.title
              .toLowerCase()
              .includes(keyword) &&
            !schedule.description
              .toLowerCase()
              .includes(keyword) &&
            !getProjectName(
              schedule,
            )
              .toLowerCase()
              .includes(keyword) &&
            !schedule.assigneeName
              ?.toLowerCase()
              .includes(keyword)
          ) {
            return false;
          }

          return true;
        },
      );
    }, [
      assigneeFilter,
      currentUserId,
      myMember,
      query,
      smartFilter,
      sourceSchedules,
      statusFilter,
      teamMembers,
      todayDate,
      todayScope,
    ]);

  /* =====================================================
     SUMMARY
     ===================================================== */

  const totalCount =
    schedules.length;

  const todoCount =
    schedules.filter(
      (schedule) =>
        schedule.status ===
        "todo",
    ).length;

  const progressCount =
    schedules.filter(
      (schedule) =>
        schedule.status ===
        "progress",
    ).length;

  const doneCount =
    schedules.filter(
      (schedule) =>
        schedule.status ===
        "done",
    ).length;

  const delayedCount =
    schedules.filter(
      (schedule) =>
        schedule.status ===
        "delayed",
    ).length;

  const noDevlogCount =
    schedules.filter(
      (schedule) =>
        !schedule.hasDevlog,
    ).length;

  const todayCount =
    schedules.filter(
      (schedule) =>
        isDateInScheduleRange(
          schedule,
          todayDate,
        ),
    ).length;

  const progressRate =
    totalCount === 0
      ? 0
      : Math.round(
          (doneCount /
            totalCount) *
            100,
        );

  /* =====================================================
     SELECTED SCHEDULE
     ===================================================== */

  const selectedSchedule =
    useMemo(() => {
      if (
        !selectedScheduleId
      ) {
        return null;
      }

      return (
        schedules.find(
          (schedule) =>
            schedule.id ===
            selectedScheduleId,
        ) ??
        allProjectTodaySchedules.find(
          (schedule) =>
            schedule.id ===
            selectedScheduleId,
        ) ??
        null
      );
    }, [
      allProjectTodaySchedules,
      schedules,
      selectedScheduleId,
    ]);

  /* =====================================================
     ACTION: WORKSPACE
     ===================================================== */

  const handleSelectWorkspace = (
    workspace: WorkspaceSidebarItem,
  ) => {
    const params =
      new URLSearchParams(
        searchParams.toString(),
      );

    params.set(
      "workspaceId",
      workspace.id,
    );

    params.set(
      "mode",
      workspace.mode,
    );

    params.set(
      "view",
      workspace.mode,
    );

    if (
      typeof window !==
      "undefined"
    ) {
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
      `${pathname}?${params.toString()}`,
    );
  };

  const handleToggleSidebar =
    () => {
      if (
        isSidebarPinned
      ) {
        setIsSidebarPinned(
          false,
        );

        setIsSidebarHovered(
          false,
        );

        setCanSidebarHoverExpand(
          false,
        );

        return;
      }

      setIsSidebarPinned(true);

      setCanSidebarHoverExpand(
        true,
      );
    };

  /* =====================================================
     STATE UPDATE HELPERS
     ===================================================== */

  const updateScheduleInState = (
    updated: ProjectScheduleItem,
  ) => {
    setSchedules((prev) =>
      prev.map((schedule) =>
        schedule.id ===
        updated.id
          ? updated
          : schedule,
      ),
    );

    setAllProjectTodaySchedules(
      (prev) => {
        const isToday =
          isDateInScheduleRange(
            updated,
            todayDate,
          );

        const exists =
          prev.some(
            (schedule) =>
              schedule.id ===
              updated.id,
          );

        if (!isToday) {
          return prev.filter(
            (schedule) =>
              schedule.id !==
              updated.id,
          );
        }

        if (exists) {
          return prev.map(
            (schedule) =>
              schedule.id ===
              updated.id
                ? updated
                : schedule,
          );
        }

        return [
          updated,
          ...prev,
        ];
      },
    );
  };

  const removeScheduleFromState =
    (
      scheduleId: string,
    ) => {
      setSchedules((prev) =>
        prev.filter(
          (schedule) =>
            schedule.id !==
            scheduleId,
        ),
      );

      setAllProjectTodaySchedules(
        (prev) =>
          prev.filter(
            (schedule) =>
              schedule.id !==
              scheduleId,
          ),
      );

      if (
        selectedScheduleId ===
        scheduleId
      ) {
        setSelectedScheduleId(
          null,
        );

        setIsDetailModalOpen(
          false,
        );
      }
    };

  /* =====================================================
     OPEN DETAIL
     ===================================================== */

  const openScheduleDetail = (
    schedule: ProjectScheduleItem,
  ) => {
    setSelectedScheduleId(
      schedule.id,
    );

    setIsDetailModalOpen(
      true,
    );
  };

  /* =====================================================
     STATUS
     ===================================================== */

  const changeStatus =
    async (
      scheduleId: string,
      status: ScheduleStatus,
    ) => {
      try {
        const updated =
          await updateScheduleStatusApi(
            {
              scheduleId,
              status,
            },
          );

        updateScheduleInState(
          mapScheduleFromApi(
            updated,
          ),
        );
      } catch (error) {
        alert(
          error instanceof Error
            ? error.message
            : "일정 상태 변경에 실패했습니다.",
        );
      }
    };

  /* =====================================================
     MOVE DATE
     ===================================================== */

  const moveScheduleDate =
    async (
      scheduleId: string,
      nextStartDate: string,
    ) => {
      const target =
        [
          ...schedules,
          ...allProjectTodaySchedules,
        ].find(
          (schedule) =>
            schedule.id ===
            scheduleId,
        );

      if (!target) {
        return;
      }

      const start =
        parseDateKey(
          target.startDate,
        );

      const end =
        parseDateKey(
          target.endDate,
        );

      const duration =
        Math.max(
          0,
          getDayDifference(
            start,
            end,
          ),
        );

      const nextStart =
        parseDateKey(
          nextStartDate,
        );

      const nextEnd =
        addDays(
          nextStart,
          duration,
        );

      const nextEndDate =
        getDateKeyFromDate(
          nextEnd,
        );

      if (
        target.startDate ===
          nextStartDate &&
        target.endDate ===
          nextEndDate
      ) {
        return;
      }

      try {
        const updated =
          await updateSchedulePeriodApi(
            {
              scheduleId,
              startDate:
                nextStartDate,
              endDate:
                nextEndDate,
            },
          );

        updateScheduleInState(
          mapScheduleFromApi(
            updated,
          ),
        );
      } catch (error) {
        alert(
          error instanceof Error
            ? error.message
            : "일정 날짜 변경에 실패했습니다.",
        );
      }
    };

  /* =====================================================
     CREATE
     ===================================================== */

  const openCreateModal = (
    defaultDate = todayDate,
  ) => {
    const defaultAssignee =
      isTeam
        ? ownerMember?.userId ??
          null
        : null;

    setCreateForm({
      title: "",
      description: "",
      startDate:
        defaultDate,
      endDate:
        defaultDate,
      status: "todo",
      assigneeUserId:
        defaultAssignee,
    });

    setIsCreateModalOpen(
      true,
    );
  };

  const createSchedule =
    async () => {
      if (!workspaceId) {
        alert(
          "프로젝트를 먼저 선택해주세요.",
        );

        return;
      }

      if (
        !createForm.title.trim()
      ) {
        alert(
          "일정 제목을 입력해주세요.",
        );

        return;
      }

      if (
        !createForm.startDate ||
        !createForm.endDate
      ) {
        alert(
          "시작일과 종료일을 입력해주세요.",
        );

        return;
      }

      if (
        createForm.startDate >
        createForm.endDate
      ) {
        alert(
          "종료일은 시작일보다 빠를 수 없습니다.",
        );

        return;
      }

      const assignee =
        teamMembers.find(
          (member) =>
            member.userId ===
            createForm.assigneeUserId,
        );

      try {
        setSaving(true);

        /*
         * 기존 일정 API 필드는 그대로 유지.
         *
         * assigneeUserId / assigneeUserIds / participants는
         * 현재 백엔드가 담당자 필드를 지원하는 경우 바로 사용할 수 있게
         * 추가 payload로 같이 전달한다.
         */
        type CreatePayload =
          Parameters<
            typeof createWorkspaceScheduleApi
          >[0] & {
            assigneeUserId?: number | null;
            assigneeUserIds?: number[];
            participants?: string;
          };

        const payload: CreatePayload =
          {
            workspaceId,

            title:
              createForm.title.trim(),

            description:
              createForm.description.trim() ||
              "등록된 상세 내용이 없습니다.",

            startDate:
              createForm.startDate,

            endDate:
              createForm.endDate,

            status:
              createForm.status,

            assigneeUserId:
              createForm.assigneeUserId,

            assigneeUserIds:
              createForm.assigneeUserId
                ? [
                    createForm.assigneeUserId,
                  ]
                : [],

            participants:
              assignee
                ? getMemberName(
                    assignee,
                  )
                : "",
          };

        const created =
          await createWorkspaceScheduleApi(
            payload,
          );

        const mapped =
          mapScheduleFromApi(
            created,
          );

        /*
         * API 응답에서 아직 담당자 필드를 반환하지 않는 경우에도
         * 현재 UI에는 선택한 담당자를 즉시 반영한다.
         */
        const nextSchedule: ProjectScheduleItem =
          {
            ...mapped,

            assigneeUserId:
              mapped.assigneeUserId ??
              createForm.assigneeUserId,

            assigneeName:
              mapped.assigneeName ||
              (assignee
                ? getMemberName(
                    assignee,
                  )
                : ""),
          };

        setSchedules(
          (prev) => [
            nextSchedule,
            ...prev,
          ],
        );

        if (
          isDateInScheduleRange(
            nextSchedule,
            todayDate,
          )
        ) {
          setAllProjectTodaySchedules(
            (prev) => [
              nextSchedule,
              ...prev,
            ],
          );
        }

        setSelectedScheduleId(
          nextSchedule.id,
        );

        setIsCreateModalOpen(
          false,
        );
      } catch (error) {
        alert(
          error instanceof Error
            ? error.message
            : "일정 생성에 실패했습니다.",
        );
      } finally {
        setSaving(false);
      }
    };

  /* =====================================================
     EDIT
     ===================================================== */

  const openEditModal = (
    schedule: ProjectScheduleItem,
  ) => {
    setEditingSchedule(
      schedule,
    );

    setEditForm({
      title: schedule.title,
      description:
        schedule.description || "",
      startDate:
        schedule.startDate,
      endDate:
        schedule.endDate,
      status:
        schedule.status,
      assigneeUserId:
        schedule.assigneeUserId ??
        null,
    });

    setIsDetailModalOpen(
      false,
    );

    setIsEditModalOpen(
      true,
    );
  };

  const updateSchedule =
    async () => {
      if (
        !editingSchedule
      ) {
        return;
      }

      if (
        !editForm.title.trim()
      ) {
        alert(
          "일정 제목을 입력해주세요.",
        );

        return;
      }

      if (
        editForm.startDate >
        editForm.endDate
      ) {
        alert(
          "종료일은 시작일보다 빠를 수 없습니다.",
        );

        return;
      }

      const assignee =
        teamMembers.find(
          (member) =>
            member.userId ===
            editForm.assigneeUserId,
        );

      try {
        setSaving(true);

        type UpdatePayload =
          Parameters<
            typeof updateScheduleApi
          >[0] & {
            assigneeUserId?: number | null;
            assigneeUserIds?: number[];
            participants?: string;
          };

        const payload: UpdatePayload =
          {
            scheduleId:
              editingSchedule.id,

            title:
              editForm.title.trim(),

            description:
              editForm.description.trim() ||
              "등록된 상세 내용이 없습니다.",

            startDate:
              editForm.startDate,

            endDate:
              editForm.endDate,

            status:
              editForm.status,

            assigneeUserId:
              editForm.assigneeUserId,

            assigneeUserIds:
              editForm.assigneeUserId
                ? [
                    editForm.assigneeUserId,
                  ]
                : [],

            participants:
              assignee
                ? getMemberName(
                    assignee,
                  )
                : "",
          };

        const updated =
          await updateScheduleApi(
            payload,
          );

        const mapped =
          mapScheduleFromApi(
            updated,
          );

        const nextSchedule: ProjectScheduleItem =
          {
            ...mapped,

            assigneeUserId:
              mapped.assigneeUserId ??
              editForm.assigneeUserId,

            assigneeName:
              mapped.assigneeName ||
              (assignee
                ? getMemberName(
                    assignee,
                  )
                : ""),
          };

        updateScheduleInState(
          nextSchedule,
        );

        setSelectedScheduleId(
          nextSchedule.id,
        );

        setEditingSchedule(
          null,
        );

        setIsEditModalOpen(
          false,
        );
      } catch (error) {
        alert(
          error instanceof Error
            ? error.message
            : "일정 수정에 실패했습니다.",
        );
      } finally {
        setSaving(false);
      }
    };

  /* =====================================================
     DELETE
     ===================================================== */

  const deleteSchedule =
    async (
      scheduleId: string,
    ) => {
      const target =
        [
          ...schedules,
          ...allProjectTodaySchedules,
        ].find(
          (schedule) =>
            schedule.id ===
            scheduleId,
        );

      if (
        !window.confirm(
          `"${target?.title || "선택한 일정"}" 일정을 삭제할까요?\n삭제 후에는 되돌릴 수 없습니다.`,
        )
      ) {
        return;
      }

      try {
        setDeleting(true);

        await deleteScheduleApi({
          scheduleId,
        });

        removeScheduleFromState(
          scheduleId,
        );

        setIsEditModalOpen(
          false,
        );

        setEditingSchedule(
          null,
        );
      } catch (error) {
        alert(
          error instanceof Error
            ? error.message
            : "일정 삭제에 실패했습니다.",
        );
      } finally {
        setDeleting(false);
      }
    };

  /* =====================================================
     DEVLOG
     ===================================================== */

  const goToDevlogWrite = (
    schedule: ProjectScheduleItem,
  ) => {
    const workspace =
      workspaces.find(
        (item) =>
          item.id ===
          schedule.workspaceId,
      );

    const mode =
      workspace?.mode ||
      currentMode;

    const params =
      new URLSearchParams();

    params.set(
      "workspaceId",
      schedule.workspaceId ||
        workspaceId,
    );

    params.set(
      "mode",
      mode,
    );

    params.set(
      "create",
      "1",
    );

    params.set(
      "scheduleId",
      String(schedule.id),
    );

    router.push(
      `/devlogs?${params.toString()}`,
    );
  };

  const goToDevlogs = (
    schedule: ProjectScheduleItem,
  ) => {
    const workspace =
      workspaces.find(
        (item) =>
          item.id ===
          schedule.workspaceId,
      );

    const mode =
      workspace?.mode ||
      currentMode;

    router.push(
      `/devlogs?workspaceId=${encodeURIComponent(
        schedule.workspaceId ||
          workspaceId,
      )}&mode=${mode}`,
    );
  };

  /* =====================================================
     DRAG
     ===================================================== */

  const handleDragStart = (
    event: React.DragEvent,
    schedule: ProjectScheduleItem,
  ) => {
    event.dataTransfer.effectAllowed =
      "move";

    event.dataTransfer.setData(
      "text/schedule-id",
      schedule.id,
    );
  };

  const getDraggedScheduleId = (
    event: React.DragEvent,
  ) => {
    return (
      event.dataTransfer.getData(
        "text/schedule-id",
      ) ||
      event.dataTransfer.getData(
        "text/plain",
      )
    );
  };

  /* =====================================================
     CALENDAR
     ===================================================== */

  const monthCells =
    useMemo(
      () =>
        buildMonthCells(
          currentYear,
          currentMonth,
        ),
      [
        currentMonth,
        currentYear,
      ],
    );

  const moveMonth = (
    amount: number,
  ) => {
    const date = new Date(
      currentYear,
      currentMonth + amount,
      1,
    );

    setCurrentYear(
      date.getFullYear(),
    );

    setCurrentMonth(
      date.getMonth(),
    );
  };

  const moveMonthToday =
    () => {
      const now =
        getTodayLocalDate();

      setCurrentYear(
        now.getFullYear(),
      );

      setCurrentMonth(
        now.getMonth(),
      );
    };

  /* =====================================================
     GANTT
     ===================================================== */

  const ganttDays =
    useMemo(() => {
      return Array.from(
        { length: 28 },
        (_, index) =>
          addDays(
            ganttStartDate,
            index,
          ),
      );
    }, [ganttStartDate]);

  const ganttStartKey =
    getDateKeyFromDate(
      ganttDays[0],
    );

  const ganttEndKey =
    getDateKeyFromDate(
      ganttDays[
        ganttDays.length - 1
      ],
    );

  const ganttSchedules =
    filteredSchedules.filter(
      (schedule) =>
        schedule.startDate <=
          ganttEndKey &&
        schedule.endDate >=
          ganttStartKey,
    );

  /* =====================================================
     MODAL ESC
     ===================================================== */

  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key !== "Escape"
      ) {
        return;
      }

      if (!saving) {
        setIsCreateModalOpen(
          false,
        );

        setIsEditModalOpen(
          false,
        );

        setIsDetailModalOpen(
          false,
        );
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () =>
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
  }, [saving]);

  /* =====================================================
     RENDER
     ===================================================== */

  return (
    <main className="waivs-page min-h-[calc(100dvh-72px)] bg-[#F7F8FA] p-4 text-slate-950 md:p-5">
      <div className="mx-auto flex max-w-[1880px] gap-4">
     {/* =================================================
    PROJECT SIDEBAR
   ================================================= */}
<aside
  onMouseEnter={() => {
    if (
      !isSidebarPinned &&
      canSidebarHoverExpand
    ) {
      setIsSidebarHovered(true);
    }
  }}
  onMouseLeave={() => {
    setIsSidebarHovered(false);
    setCanSidebarHoverExpand(true);
  }}
  className={cn(
    "waivs-sidebar sticky hidden h-[calc(100dvh-104px)] shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-[width] duration-200 lg:flex lg:flex-col",
    isPageScrolled
      ? "top-[88px]"
      : "top-4",
    sidebarExpanded
      ? "w-[288px]"
      : "w-16",
  )}
>
  {/* =================================================
      SIDEBAR HEADER
     ================================================= */}
  <div
    className={cn(
      "border-b border-slate-100",
      sidebarExpanded
        ? "p-3"
        : "flex h-[64px] items-center justify-center p-0",
    )}
  >
    <div
      className={cn(
        "flex items-center",
        sidebarExpanded
          ? "justify-between gap-2"
          : "justify-center",
      )}
    >
      {sidebarExpanded && (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#EEF3FF] text-[#5873F9]">
              <FolderOpen
                size={16}
                strokeWidth={2.4}
              />
            </div>

            <div>
              <p className="text-sm font-black text-slate-900">
                프로젝트
              </p>

              <p className="text-[10px] font-semibold text-slate-400">
                전체 {workspaces.length}
                {" · "}
                개인 {personalCount}
                {" · "}
                팀 {teamCount}
              </p>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleToggleSidebar}
        className={cn(
          "grid shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700",
          sidebarExpanded
            ? "h-8 w-8"
            : "h-9 w-9",
        )}
        title={
          isSidebarPinned
            ? "사이드바 접기"
            : "사이드바 펼치기"
        }
      >
        {sidebarExpanded ? (
          <PanelLeftClose size={17} />
        ) : (
          <PanelLeftOpen size={18} />
        )}
      </button>
    </div>

    {sidebarExpanded && (
      <>
        {/* 프로젝트 검색 */}
        <div className="relative mt-3">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            ref={projectSearchInputRef}
            value={projectSearch}
            onChange={(event) =>
              setProjectSearch(
                event.target.value,
              )
            }
            placeholder="프로젝트 검색"
            className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#AAB8FF] focus:bg-white focus:ring-2 focus:ring-[#5873F9]/10"
          />
        </div>

        {/* 전체 / 개인 / 팀 */}
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
              onClick={() =>
                setProjectFilter(value)
              }
              className={cn(
                "rounded-lg px-2 py-1.5 text-[11px] font-black transition",
                projectFilter === value
                  ? "bg-white text-[#5873F9] shadow-sm"
                  : "text-slate-400 hover:text-slate-700",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </>
    )}
  </div>

  {/* =================================================
      SIDEBAR BODY
     ================================================= */}
  <div
    className={cn(
      "min-h-0 flex-1",
      sidebarExpanded
        ? "overflow-y-auto p-3"
        : "overflow-hidden",
    )}
  >
    {workspaceLoading ? (
      <div className="grid h-32 place-items-center">
        <Loader2
          size={18}
          className="animate-spin text-[#5873F9]"
        />
      </div>
    ) : workspaceErrorMessage ? (
      sidebarExpanded ? (
        <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs font-semibold leading-5 text-rose-600">
          {workspaceErrorMessage}
        </div>
      ) : null
    ) : sidebarExpanded ? (
      /* ===============================================
         펼쳐진 상태
         기존 프로젝트 목록 그대로
         =============================================== */
      <div className="space-y-5">
        {projectFilter !== "team" && (
          <WorkspaceSection
            title="개인 프로젝트"
            mode="personal"
            items={personalWorkspaces}
            selectedWorkspaceId={
              workspaceId
            }
            sidebarExpanded
            onSelect={
              handleSelectWorkspace
            }
          />
        )}

        {projectFilter !==
          "personal" && (
          <WorkspaceSection
            title="팀 프로젝트"
            mode="team"
            items={teamWorkspaces}
            selectedWorkspaceId={
              workspaceId
            }
            sidebarExpanded
            onSelect={
              handleSelectWorkspace
            }
          />
        )}
      </div>
    ) : (
      /* ===============================================
         접힌 상태
         Dashboard Sidebar와 동일
         =============================================== */
      <div className="flex h-full flex-col items-center pt-4">
        {/* 검색 */}
        <button
          type="button"
          onClick={
            openSidebarForSearch
          }
          className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-[#5873F9]"
          title="프로젝트 검색"
        >
          <Search
            size={19}
            strokeWidth={2}
          />
        </button>

        {/* 프로젝트 */}
        <button
          type="button"
          onClick={
            openSidebarForProjects
          }
          className="mt-1 grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-[#5873F9]"
          title="프로젝트 목록"
        >
          <FolderOpen
            size={19}
            strokeWidth={2}
          />
        </button>

        {/* Dashboard와 동일한 구분선 */}
        <div className="my-3 h-px w-8 bg-slate-100" />

        {/* 전체 프로젝트 수 */}
        <div
          className="flex h-8 w-8 items-center justify-center text-xs font-black text-slate-300"
          title={`전체 프로젝트 ${workspaces.length}개`}
        >
          {workspaces.length}
        </div>
      </div>
    )}
  </div>

  {/* =================================================
      SIDEBAR FOOTER
     ================================================= */}
  {sidebarExpanded && (
    <div className="border-t border-slate-100 p-3">
      <button
        type="button"
        onClick={() =>
          router.push("/main")
        }
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#D9E1FF] bg-[#F7F9FF] px-3 py-2 text-xs font-black text-[#5873F9] transition hover:bg-[#EEF3FF]"
      >
        전체 프로젝트

        <ArrowRight size={14} />
      </button>
    </div>
  )}
</aside>

        {/* =================================================
            MAIN WORKSPACE
           ================================================= */}
        <section className="min-w-0 flex-1">
          <div className="waivs-panel overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* ===============================================
                COMPACT HEADER
               =============================================== */}
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#5873F9]">
                      Schedule
                    </p>

                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-black",
                        isTeam
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-blue-50 text-blue-700",
                      )}
                    >
                      {isTeam
                        ? "TEAM"
                        : "PERSONAL"}
                    </span>

                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">
                      {
                        currentRole
                      }
                    </span>
                  </div>

                  <div className="mt-1 flex min-w-0 items-end gap-3">
                    <h1 className="truncate text-xl font-black tracking-tight text-slate-950">
                      {
                        workspaceName
                      }
                    </h1>

                    <span className="hidden pb-0.5 text-xs font-semibold text-slate-400 sm:inline">
                      일정 관리
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void loadSchedules();

                      void loadTeamMembers();

                      void loadAllProjectTodaySchedules(
                        workspaces,
                      );
                    }}
                    className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
                    title="새로고침"
                  >
                    <RefreshCw
                      size={15}
                    />
                  </button>

                  <button
                    type="button"
                    disabled={
                      !workspaceId
                    }
                    onClick={() =>
                      openCreateModal()
                    }
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#5873F9] px-4 text-xs font-black text-white transition hover:bg-[#4863E8] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus
                      size={15}
                    />
                    새 일정
                  </button>
                </div>
              </div>

              {/* compact stats */}
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-3">
                <HeaderMetric
                  label="전체"
                  value={
                    totalCount
                  }
                />

                <HeaderMetric
                  label="할 일"
                  value={
                    todoCount
                  }
                />

                <HeaderMetric
                  label="진행"
                  value={
                    progressCount
                  }
                  active
                />

                <HeaderMetric
                  label="완료"
                  value={
                    doneCount
                  }
                />

                <HeaderMetric
                  label="지연"
                  value={
                    delayedCount
                  }
                  danger
                />

                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400">
                    진행률
                  </span>

                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#5873F9] transition-all"
                      style={{
                        width: `${progressRate}%`,
                      }}
                    />
                  </div>

                  <span className="text-xs font-black text-[#5873F9]">
                    {
                      progressRate
                    }
                    %
                  </span>
                </div>
              </div>
            </div>

            {/* ===============================================
                VIEW BAR
               =============================================== */}
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
                <ViewButton
                  active={
                    viewMode ===
                    "board"
                  }
                  label="보드"
                  icon={
                    ListTodo
                  }
                  onClick={() =>
                    setViewMode(
                      "board",
                    )
                  }
                />

                <ViewButton
                  active={
                    viewMode ===
                    "calendar"
                  }
                  label="캘린더"
                  icon={
                    CalendarDays
                  }
                  onClick={() =>
                    setViewMode(
                      "calendar",
                    )
                  }
                />

                <ViewButton
                  active={
                    viewMode ===
                    "gantt"
                  }
                  label="간트"
                  icon={
                    Clock3
                  }
                  onClick={() =>
                    setViewMode(
                      "gantt",
                    )
                  }
                />

                <ViewButton
                  active={
                    viewMode ===
                    "list"
                  }
                  label="리스트"
                  icon={
                    FilePenLine
                  }
                  onClick={() =>
                    setViewMode(
                      "list",
                    )
                  }
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
                {/* smart filter */}
                <SmartFilterButton
                  active={
                    smartFilter ===
                    "today"
                  }
                  label={`오늘 ${todayCount}`}
                  onClick={() =>
                    setSmartFilter(
                      smartFilter ===
                        "today"
                        ? "all"
                        : "today",
                    )
                  }
                />

                {isTeam && (
                  <SmartFilterButton
                    active={
                      smartFilter ===
                      "mine"
                    }
                    label="내 작업"
                    onClick={() =>
                      setSmartFilter(
                        smartFilter ===
                          "mine"
                          ? "all"
                          : "mine",
                      )
                    }
                  />
                )}

                <SmartFilterButton
                  active={
                    smartFilter ===
                    "noDevlog"
                  }
                  label={`일지 미작성 ${noDevlogCount}`}
                  warning
                  onClick={() =>
                    setSmartFilter(
                      smartFilter ===
                        "noDevlog"
                        ? "all"
                        : "noDevlog",
                    )
                  }
                />

                <div className="relative">
                  <Filter
                    size={13}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <select
                    value={
                      statusFilter
                    }
                    onChange={(
                      event,
                    ) =>
                      setStatusFilter(
                        event.target
                          .value as StatusFilter,
                      )
                    }
                    className="h-9 rounded-xl border border-slate-200 bg-white pl-8 pr-7 text-xs font-bold text-slate-600 outline-none transition focus:border-[#AAB8FF]"
                  >
                    <option value="all">
                      모든 상태
                    </option>

                    <option value="todo">
                      할 일
                    </option>

                    <option value="progress">
                      진행 중
                    </option>

                    <option value="done">
                      완료
                    </option>

                    <option value="delayed">
                      지연
                    </option>
                  </select>
                </div>

                <div className="relative min-w-[170px] flex-1 xl:max-w-[240px]">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={query}
                    onChange={(
                      event,
                    ) =>
                      setQuery(
                        event.target
                          .value,
                      )
                    }
                    placeholder="일정 검색"
                    className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-semibold outline-none transition placeholder:text-slate-400 focus:border-[#AAB8FF] focus:ring-2 focus:ring-[#5873F9]/10"
                  />
                </div>
              </div>
            </div>

            {/* ===============================================
                TODAY SCOPE
               =============================================== */}
            {smartFilter ===
              "today" && (
              <div className="flex items-center gap-2 border-b border-slate-100 bg-[#FBFCFF] px-5 py-2.5">
                <CalendarDays
                  size={14}
                  className="text-[#5873F9]"
                />

                <span className="text-[11px] font-black text-slate-500">
                  오늘 일정
                </span>

                <div className="ml-2 flex rounded-lg bg-slate-100 p-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      setTodayScope(
                        "selected",
                      )
                    }
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[10px] font-black transition",
                      todayScope ===
                        "selected"
                        ? "bg-white text-[#5873F9] shadow-sm"
                        : "text-slate-400",
                    )}
                  >
                    선택 프로젝트
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTodayScope(
                        "all",
                      );

                      setAssigneeFilter(
                        "all",
                      );
                    }}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[10px] font-black transition",
                      todayScope ===
                        "all"
                        ? "bg-white text-[#5873F9] shadow-sm"
                        : "text-slate-400",
                    )}
                  >
                    전체 프로젝트
                  </button>
                </div>

                {allTodayLoading &&
                  todayScope ===
                    "all" && (
                    <Loader2
                      size={13}
                      className="ml-1 animate-spin text-slate-400"
                    />
                  )}
              </div>
            )}

            {/* ===============================================
                TEAM MEMBER BAR
               =============================================== */}
            {isTeam &&
              !(
                smartFilter ===
                  "today" &&
                todayScope ===
                  "all"
              ) && (
                <div className="border-b border-slate-100 bg-white px-5 py-2.5">
                  <div className="flex items-center gap-2 overflow-x-auto">
                    <div className="mr-1 flex shrink-0 items-center gap-1.5 text-[11px] font-black text-slate-400">
                      <UsersRound
                        size={14}
                      />
                      담당자
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setAssigneeFilter(
                          "all",
                        )
                      }
                      className={cn(
                        "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-black transition",
                        assigneeFilter ===
                          "all"
                          ? "border-[#C9D2FF] bg-[#EEF3FF] text-[#5873F9]"
                          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
                      )}
                    >
                      전체
                    </button>

                    {teamMemberLoading ? (
                      <div className="flex items-center gap-2 px-2 text-xs font-semibold text-slate-400">
                        <Loader2
                          size={13}
                          className="animate-spin"
                        />
                        팀원 조회 중
                      </div>
                    ) : (
                      teamMembers.map(
                        (member) => (
                          <MemberFilterChip
                            key={
                              member.userId
                            }
                            member={
                              member
                            }
                            active={
                              assigneeFilter ===
                              String(
                                member.userId,
                              )
                            }
                            currentUserId={
                              currentUserId
                            }
                            onClick={() =>
                              setAssigneeFilter(
                                String(
                                  member.userId,
                                ),
                              )
                            }
                          />
                        ),
                      )
                    )}

                    {memberErrorMessage && (
                      <span className="ml-2 shrink-0 text-[10px] font-semibold text-rose-500">
                        {
                          memberErrorMessage
                        }
                      </span>
                    )}
                  </div>
                </div>
              )}

            {/* ===============================================
                CONTENT
               =============================================== */}
            <div className="min-h-[580px] bg-[#FBFCFE] p-4">
              {loading ? (
                <LoadingBox />
              ) : errorMessage ? (
                <ErrorBox
                  message={
                    errorMessage
                  }
                />
              ) : !workspaceId ? (
                <EmptyBox
                  title="프로젝트를 선택해주세요."
                  description="왼쪽 프로젝트 목록에서 일정을 확인할 프로젝트를 선택해주세요."
                />
              ) : filteredSchedules.length ===
                  0 ? (
                <EmptyBox
                  title="표시할 일정이 없습니다."
                  description="현재 검색 또는 필터 조건에 맞는 일정이 없습니다."
                  action={
                    <button
                      type="button"
                      onClick={() =>
                        openCreateModal()
                      }
                      className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#5873F9] px-4 py-2 text-xs font-black text-white"
                    >
                      <Plus
                        size={14}
                      />
                      일정 만들기
                    </button>
                  }
                />
              ) : (
                <>
                  {viewMode ===
                    "board" && (
                    <BoardView
                      schedules={
                        filteredSchedules
                      }
                      teamMembers={
                        teamMembers
                      }
                      isTeam={
                        isTeam
                      }
                      onOpen={
                        openScheduleDetail
                      }
                      onDragStart={
                        handleDragStart
                      }
                      onStatusDrop={(
                        event,
                        status,
                      ) => {
                        event.preventDefault();

                        const id =
                          getDraggedScheduleId(
                            event,
                          );

                        if (id) {
                          void changeStatus(
                            id,
                            status,
                          );
                        }
                      }}
                      onWriteDevlog={
                        goToDevlogWrite
                      }
                    />
                  )}

                  {viewMode ===
                    "calendar" && (
                    <CalendarView
                      year={
                        currentYear
                      }
                      month={
                        currentMonth
                      }
                      todayDate={
                        todayDate
                      }
                      cells={
                        monthCells
                      }
                      schedules={
                        filteredSchedules
                      }
                      onPrev={() =>
                        moveMonth(
                          -1,
                        )
                      }
                      onNext={() =>
                        moveMonth(
                          1,
                        )
                      }
                      onToday={
                        moveMonthToday
                      }
                      onOpen={
                        openScheduleDetail
                      }
                      onCreateForDate={
                        openCreateModal
                      }
                      onDragStart={
                        handleDragStart
                      }
                      onWriteDevlog={
                        goToDevlogWrite
                      }
                      onDateDrop={(
                        event,
                        dateKey,
                      ) => {
                        event.preventDefault();

                        const id =
                          getDraggedScheduleId(
                            event,
                          );

                        if (id) {
                          void moveScheduleDate(
                            id,
                            dateKey,
                          );
                        }
                      }}
                    />
                  )}

                  {viewMode ===
                    "gantt" && (
                    <GanttView
                      startDate={
                        ganttStartDate
                      }
                      days={
                        ganttDays
                      }
                      schedules={
                        ganttSchedules
                      }
                      teamMembers={
                        teamMembers
                      }
                      isTeam={
                        isTeam
                      }
                      onPrev={() =>
                        setGanttStartDate(
                          (prev) =>
                            addDays(
                              prev,
                              -14,
                            ),
                        )
                      }
                      onNext={() =>
                        setGanttStartDate(
                          (prev) =>
                            addDays(
                              prev,
                              14,
                            ),
                        )
                      }
                      onToday={() => {
                        const now =
                          getTodayLocalDate();

                        const day =
                          now.getDay();

                        now.setDate(
                          now.getDate() +
                            (day ===
                            0
                              ? -6
                              : 1 -
                                day),
                        );

                        setGanttStartDate(
                          now,
                        );
                      }}
                      onOpen={
                        openScheduleDetail
                      }
                      onDragStart={
                        handleDragStart
                      }
                      onWriteDevlog={
                        goToDevlogWrite
                      }
                      onDateDrop={(
                        event,
                        dateKey,
                      ) => {
                        event.preventDefault();

                        const id =
                          getDraggedScheduleId(
                            event,
                          );

                        if (id) {
                          void moveScheduleDate(
                            id,
                            dateKey,
                          );
                        }
                      }}
                    />
                  )}

                  {viewMode ===
                    "list" && (
                    <ListView
                      schedules={
                        filteredSchedules
                      }
                      teamMembers={
                        teamMembers
                      }
                      isTeam={
                        isTeam
                      }
                      onOpen={
                        openScheduleDetail
                      }
                      onStatusChange={
                        changeStatus
                      }
                      onWriteDevlog={
                        goToDevlogWrite
                      }
                      onOpenDevlog={
                        goToDevlogs
                      }
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* =================================================
          DETAIL MODAL
         ================================================= */}
      {isDetailModalOpen &&
        selectedSchedule && (
          <ScheduleDetailModal
            schedule={
              selectedSchedule
            }
            members={
              teamMembers
            }
            isTeam={
              workspaces.find(
                (workspace) =>
                  workspace.id ===
                  selectedSchedule.workspaceId,
              )?.mode ===
                "team" ||
              isTeam
            }
            deleting={
              deleting
            }
            onClose={() =>
              setIsDetailModalOpen(
                false,
              )
            }
            onEdit={() =>
              openEditModal(
                selectedSchedule,
              )
            }
            onDelete={() =>
              void deleteSchedule(
                selectedSchedule.id,
              )
            }
            onStatusChange={(
              status,
            ) =>
              void changeStatus(
                selectedSchedule.id,
                status,
              )
            }
            onWriteDevlog={() =>
              goToDevlogWrite(
                selectedSchedule,
              )
            }
            onOpenDevlog={() =>
              goToDevlogs(
                selectedSchedule,
              )
            }
          />
        )}

      {/* =================================================
          CREATE
         ================================================= */}
      {isCreateModalOpen && (
        <ScheduleFormModal
          mode="create"
          title="새 일정 만들기"
          description="작업 기간과 상태를 설정하고 프로젝트 일정에 추가합니다."
          form={
            createForm
          }
          setForm={
            setCreateForm
          }
          members={
            teamMembers
          }
          isTeam={isTeam}
          saving={saving}
          submitLabel="일정 생성"
          onClose={() => {
            if (!saving) {
              setIsCreateModalOpen(
                false,
              );
            }
          }}
          onSubmit={() =>
            void createSchedule()
          }
        />
      )}

      {/* =================================================
          EDIT
         ================================================= */}
      {isEditModalOpen &&
        editingSchedule && (
          <ScheduleFormModal
            mode="edit"
            title="일정 수정"
            description="일정 내용, 기간, 상태와 담당자를 수정합니다."
            form={
              editForm
            }
            setForm={
              setEditForm
            }
            members={
              teamMembers
            }
            isTeam={isTeam}
            saving={saving}
            submitLabel="변경사항 저장"
            onClose={() => {
              if (!saving) {
                setIsEditModalOpen(
                  false,
                );

                setEditingSchedule(
                  null,
                );
              }
            }}
            onSubmit={() =>
              void updateSchedule()
            }
          />
        )}
    </main>
  );
}

/* =========================================================
   PROJECT SIDEBAR
   ========================================================= */

function WorkspaceSection({
  title,
  mode,
  items,
  selectedWorkspaceId,
  sidebarExpanded,
  onSelect,
}: {
  title: string;
  mode: WorkspaceMode;
  items: WorkspaceSidebarItem[];
  selectedWorkspaceId: string;
  sidebarExpanded: boolean;
  onSelect: (
    workspace: WorkspaceSidebarItem,
  ) => void;
}) {
  if (!sidebarExpanded) {
    return (
      <div className="space-y-1">
        {items.map(
          (workspace) => (
            <WorkspaceButton
              key={
                workspace.id
              }
              workspace={
                workspace
              }
              selected={
                workspace.id ===
                selectedWorkspaceId
              }
              sidebarExpanded={
                false
              }
              onClick={() =>
                onSelect(
                  workspace,
                )
              }
            />
          ),
        )}
      </div>
    );
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between px-2">
        <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-500">
          {mode ===
          "team" ? (
            <UsersRound
              size={13}
            />
          ) : (
            <UserRound
              size={13}
            />
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
          items.map(
            (workspace) => (
              <WorkspaceButton
                key={
                  workspace.id
                }
                workspace={
                  workspace
                }
                selected={
                  workspace.id ===
                  selectedWorkspaceId
                }
                sidebarExpanded
                onClick={() =>
                  onSelect(
                    workspace,
                  )
                }
              />
            ),
          )
        )}
      </div>
    </section>
  );
}

function WorkspaceButton({
  workspace,
  selected,
  sidebarExpanded,
  onClick,
}: {
  workspace: WorkspaceSidebarItem;
  selected: boolean;
  sidebarExpanded: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={
        !sidebarExpanded
          ? workspace.name
          : undefined
      }
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition",
        selected
          ? "bg-[#5873F9] text-white shadow-sm"
          : "text-slate-700 hover:bg-slate-100",
        !sidebarExpanded &&
          "justify-center",
      )}
    >
      <div
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
          selected
            ? "bg-white/15 text-white"
            : workspace.mode ===
                "team"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-blue-50 text-blue-700",
        )}
      >
        {workspace.mode ===
        "team" ? (
          <UsersRound
            size={15}
          />
        ) : (
          <UserRound
            size={15}
          />
        )}
      </div>

      {sidebarExpanded && (
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-black">
            {workspace.name}
          </p>

          <p
            className={cn(
              "mt-0.5 truncate text-[10px] font-semibold",
              selected
                ? "text-white/70"
                : "text-slate-400",
            )}
          >
            {workspace.mode ===
            "team"
              ? "팀 프로젝트"
              : "개인 프로젝트"}
            {" · "}
            {
              normalizeWorkspaceRole(
                workspace.role,
              )
            }
          </p>
        </div>
      )}
    </button>
  );
}

/* =========================================================
   HEADER
   ========================================================= */

function HeaderMetric({
  label,
  value,
  active,
  danger,
}: {
  label: string;
  value: number;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] font-bold text-slate-400">
        {label}
      </span>

      <span
        className={cn(
          "text-sm font-black",
          active
            ? "text-[#5873F9]"
            : danger
              ? "text-rose-500"
              : "text-slate-800",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ViewButton({
  active,
  label,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ComponentType<{
    size?: number;
  }>;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[11px] font-black transition",
        active
          ? "bg-white text-[#5873F9] shadow-sm"
          : "text-slate-500 hover:text-slate-800",
      )}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

function SmartFilterButton({
  active,
  label,
  warning,
  onClick,
}: {
  active: boolean;
  label: string;
  warning?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 rounded-xl border px-3 text-[11px] font-black transition",
        active
          ? warning
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : "border-[#C9D2FF] bg-[#EEF3FF] text-[#5873F9]"
          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
      )}
    >
      {label}
    </button>
  );
}

/* =========================================================
   TEAM FILTER
   ========================================================= */

function MemberFilterChip({
  member,
  active,
  currentUserId,
  onClick,
}: {
  member: WorkspaceMember;
  active: boolean;
  currentUserId: number | null;
  onClick: () => void;
}) {
  const name =
    getMemberName(member);

  const role =
    getMemberRole(member);

  const mine =
    currentUserId ===
    member.userId;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-2.5 transition",
        active
          ? "border-[#C9D2FF] bg-[#EEF3FF]"
          : "border-slate-200 bg-white hover:bg-slate-50",
      )}
    >
      <span
        className={cn(
          "grid h-6 w-6 place-items-center rounded-full text-[9px] font-black",
          active
            ? "bg-[#5873F9] text-white"
            : "bg-slate-100 text-slate-600",
        )}
      >
        {getInitial(name)}
      </span>

      <span className="text-[11px] font-black text-slate-700">
        {name}
        {mine && (
          <span className="ml-1 text-[#5873F9]">
            나
          </span>
        )}
      </span>

      <span
        className={cn(
          "text-[8px] font-black",
          role ===
            "OWNER"
            ? "text-[#5873F9]"
            : "text-slate-400",
        )}
      >
        {role}
      </span>
    </button>
  );
}

/* =========================================================
   BOARD VIEW
   ========================================================= */

function BoardView({
  schedules,
  teamMembers,
  isTeam,
  onOpen,
  onDragStart,
  onStatusDrop,
  onWriteDevlog,
}: {
  schedules: ProjectScheduleItem[];
  teamMembers: WorkspaceMember[];
  isTeam: boolean;
  onOpen: (
    schedule: ProjectScheduleItem,
  ) => void;
  onDragStart: (
    event: React.DragEvent,
    schedule: ProjectScheduleItem,
  ) => void;
  onStatusDrop: (
    event: React.DragEvent,
    status: ScheduleStatus,
  ) => void;
  onWriteDevlog: (
    schedule: ProjectScheduleItem,
  ) => void;
}) {
  return (
    <div className="grid min-h-[550px] grid-cols-1 gap-3 xl:grid-cols-4">
      {BOARD_STATUSES.map(
        (status) => {
          const meta =
            STATUS_META[status];

          const items =
            schedules.filter(
              (schedule) =>
                schedule.status ===
                status,
            );

          return (
            <section
              key={status}
              onDragOver={(
                event,
              ) => {
                event.preventDefault();

                event.dataTransfer.dropEffect =
                  "move";
              }}
              onDrop={(
                event,
              ) =>
                onStatusDrop(
                  event,
                  status,
                )
              }
              className={cn(
                "flex min-h-[500px] min-w-0 flex-col rounded-xl border",
                meta.board,
              )}
            >
              <div className="flex items-center justify-between border-b border-black/5 px-3.5 py-3">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      meta.dot,
                    )}
                  />

                  <h3 className="text-xs font-black text-slate-800">
                    {
                      meta.label
                    }
                  </h3>

                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-black text-slate-400">
                    {
                      items.length
                    }
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-2 p-2.5">
                {items.map(
                  (schedule) => (
                    <ScheduleBoardCard
                      key={
                        schedule.id
                      }
                      schedule={
                        schedule
                      }
                      members={
                        teamMembers
                      }
                      isTeam={
                        isTeam
                      }
                      onOpen={() =>
                        onOpen(
                          schedule,
                        )
                      }
                      onDragStart={(
                        event,
                      ) =>
                        onDragStart(
                          event,
                          schedule,
                        )
                      }
                      onWriteDevlog={() =>
                        onWriteDevlog(
                          schedule,
                        )
                      }
                    />
                  ),
                )}

                {items.length ===
                  0 && (
                  <div className="grid min-h-[120px] place-items-center rounded-xl border border-dashed border-slate-200 bg-white/50 text-center">
                    <p className="text-[11px] font-semibold text-slate-400">
                      여기에 작업을
                      드래그하세요.
                    </p>
                  </div>
                )}
              </div>
            </section>
          );
        },
      )}
    </div>
  );
}

function ScheduleBoardCard({
  schedule,
  members,
  isTeam,
  onOpen,
  onDragStart,
  onWriteDevlog,
}: {
  schedule: ProjectScheduleItem;
  members: WorkspaceMember[];
  isTeam: boolean;
  onOpen: () => void;
  onDragStart: (
    event: React.DragEvent,
  ) => void;
  onWriteDevlog: () => void;
}) {
  const member =
    members.find(
      (item) =>
        item.userId ===
        schedule.assigneeUserId,
    );

  const assigneeName =
    member
      ? getMemberName(member)
      : schedule.assigneeName ||
        "";

  return (
    <article
      draggable
      onDragStart={
        onDragStart
      }
      onClick={onOpen}
      className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-[#C9D2FF] hover:shadow-md"
    >
      <div className="flex items-start gap-2">
        <GripVertical
          size={14}
          className="mt-0.5 shrink-0 cursor-grab text-slate-300 group-hover:text-slate-400"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="line-clamp-2 text-[13px] font-black leading-5 text-slate-900">
              {schedule.title}
            </h4>

            {!schedule.hasDevlog && (
              <span
                title="개발일지 미작성"
                className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-400"
              />
            )}
          </div>

          <p className="mt-2 text-[10px] font-bold text-slate-400">
            {formatCompactDate(
              schedule.startDate,
            )}
            {schedule.startDate !==
              schedule.endDate &&
              ` ~ ${formatCompactDate(
                schedule.endDate,
              )}`}
          </p>

          <div className="mt-3 flex min-w-0 items-center justify-between gap-2">
            {isTeam ? (
              assigneeName ? (
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#EEF3FF] text-[9px] font-black text-[#5873F9]">
                    {getInitial(
                      assigneeName,
                    )}
                  </span>

                  <span className="truncate text-[10px] font-bold text-slate-500">
                    {
                      assigneeName
                    }
                  </span>
                </div>
              ) : (
                <span className="text-[10px] font-bold text-slate-400">
                  담당자 미지정
                </span>
              )
            ) : (
              <span className="truncate text-[10px] font-semibold text-slate-400">
                {getProjectName(
                  schedule,
                )}
              </span>
            )}
          </div>

          {!schedule.hasDevlog && (
            <button
              type="button"
              onClick={(
                event,
              ) => {
                event.stopPropagation();

                onWriteDevlog();
              }}
              onMouseDown={(
                event,
              ) =>
                event.stopPropagation()
              }
              className="mt-3 flex w-full items-center justify-between rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-2 text-[10px] font-black text-amber-700 transition hover:bg-amber-100"
            >
              <span className="flex items-center gap-1.5">
                <FilePenLine
                  size={12}
                />
                개발일지 미작성
              </span>

              <ArrowRight
                size={12}
              />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/* =========================================================
   CALENDAR VIEW
   - 기간 일정은 날짜마다 쪼개지 않고 주 단위의 긴 Bar로 표시
   - 주가 넘어가는 경우에만 다음 주 행으로 자연스럽게 이어짐
   - 일정 Bar Drag & Drop으로 시작일 이동
   - 개발일지 미작성 일정은 Bar 내부 아이콘으로 바로 일지 작성 이동
   ========================================================= */

type CalendarWeekSegment = {
  schedule: ProjectScheduleItem;
  startIndex: number;
  endIndex: number;
  lane: number;
  continuesFromPreviousWeek: boolean;
  continuesToNextWeek: boolean;
};

function buildCalendarWeekSegments(
  weekDates: Date[],
  schedules: ProjectScheduleItem[],
  maxVisibleLanes = 4,
) {
  const weekStartKey =
    getDateKeyFromDate(
      weekDates[0],
    );

  const weekEndKey =
    getDateKeyFromDate(
      weekDates[
        weekDates.length - 1
      ],
    );

  const candidates =
    schedules
      .filter(
        (schedule) =>
          schedule.endDate >=
            weekStartKey &&
          schedule.startDate <=
            weekEndKey,
      )
      .map((schedule) => {
        const visibleStart =
          schedule.startDate <
          weekStartKey
            ? weekStartKey
            : schedule.startDate;

        const visibleEnd =
          schedule.endDate >
          weekEndKey
            ? weekEndKey
            : schedule.endDate;

        const startIndex =
          getDayDifference(
            weekDates[0],
            parseDateKey(
              visibleStart,
            ),
          );

        const endIndex =
          getDayDifference(
            weekDates[0],
            parseDateKey(
              visibleEnd,
            ),
          );

        return {
          schedule,
          startIndex,
          endIndex,
          continuesFromPreviousWeek:
            schedule.startDate <
            weekStartKey,
          continuesToNextWeek:
            schedule.endDate >
            weekEndKey,
        };
      })
      .sort((a, b) => {
        if (
          a.startIndex !==
          b.startIndex
        ) {
          return (
            a.startIndex -
            b.startIndex
          );
        }

        const aLength =
          a.endIndex -
          a.startIndex;

        const bLength =
          b.endIndex -
          b.startIndex;

        return bLength - aLength;
      });

  const laneEndIndexes:
    number[] = [];

  const segments:
    CalendarWeekSegment[] = [];

  let hiddenCount = 0;

  for (
    const candidate of
      candidates
  ) {
    let lane =
      laneEndIndexes.findIndex(
        (endIndex) =>
          endIndex <
          candidate.startIndex,
      );

    if (lane === -1) {
      lane =
        laneEndIndexes.length;
    }

    if (
      lane >=
      maxVisibleLanes
    ) {
      hiddenCount += 1;
      continue;
    }

    laneEndIndexes[lane] =
      candidate.endIndex;

    segments.push({
      ...candidate,
      lane,
    });
  }

  return {
    segments,
    laneCount:
      Math.min(
        maxVisibleLanes,
        Math.max(
          1,
          laneEndIndexes.length,
        ),
      ),
    hiddenCount,
  };
}

function CalendarView({
  year,
  month,
  todayDate,
  cells,
  schedules,
  onPrev,
  onNext,
  onToday,
  onOpen,
  onCreateForDate,
  onDragStart,
  onWriteDevlog,
  onDateDrop,
}: {
  year: number;
  month: number;
  todayDate: string;
  cells: Date[];
  schedules: ProjectScheduleItem[];
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onOpen: (
    schedule: ProjectScheduleItem,
  ) => void;
  onCreateForDate: (
    dateKey: string,
  ) => void;
  onDragStart: (
    event: React.DragEvent,
    schedule: ProjectScheduleItem,
  ) => void;
  onWriteDevlog: (
    schedule: ProjectScheduleItem,
  ) => void;
  onDateDrop: (
    event: React.DragEvent,
    dateKey: string,
  ) => void;
}) {
  const weeks = [
    "일",
    "월",
    "화",
    "수",
    "목",
    "금",
    "토",
  ];

  const calendarWeeks =
    useMemo(() => {
      return Array.from(
        { length: 6 },
        (_, weekIndex) =>
          cells.slice(
            weekIndex * 7,
            weekIndex * 7 + 7,
          ),
      );
    }, [cells]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-[#C9D2FF] hover:bg-[#F7F9FF] hover:text-[#5873F9]"
            aria-label="이전 달"
          >
            <ChevronLeft
              size={15}
            />
          </button>

          <button
            type="button"
            onClick={onNext}
            className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-[#C9D2FF] hover:bg-[#F7F9FF] hover:text-[#5873F9]"
            aria-label="다음 달"
          >
            <ChevronRight
              size={15}
            />
          </button>

          <div className="ml-1">
            <h3 className="text-sm font-black tracking-tight text-slate-900">
              {year}년 {month + 1}월
            </h3>

            {/* <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
              기간 일정은 하나의 Bar로 이어서 표시됩니다.
            </p> */}
          </div>
        </div>

        <button
          type="button"
          onClick={onToday}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-500 transition hover:border-[#C9D2FF] hover:bg-[#F7F9FF] hover:text-[#5873F9]"
        >
          오늘
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-100 bg-[#FAFBFD]">
        {weeks.map(
          (day, index) => (
            <div
              key={day}
              className={cn(
                "px-2 py-2.5 text-center text-[10px] font-black",
                index === 0
                  ? "text-rose-400"
                  : index === 6
                    ? "text-blue-500"
                    : "text-slate-400",
              )}
            >
              {day}
            </div>
          ),
        )}
      </div>

      <div>
        {calendarWeeks.map(
          (
            weekDates,
            weekIndex,
          ) => {
            const {
              segments,
              laneCount,
              hiddenCount,
            } =
              buildCalendarWeekSegments(
                weekDates,
                schedules,
              );

            const rowHeight =
              Math.max(
                122,
                45 +
                  laneCount * 27 +
                  (hiddenCount > 0
                    ? 18
                    : 0),
              );

            return (
              <div
                key={
                  getDateKeyFromDate(
                    weekDates[0],
                  )
                }
                className={cn(
                  "relative border-b border-slate-100 last:border-b-0",
                  weekIndex % 2 === 1 &&
                    "bg-slate-50/15",
                )}
                style={{
                  height:
                    rowHeight,
                }}
              >
                {/* 날짜 셀 / Drop zone */}
                <div className="absolute inset-0 grid grid-cols-7">
                  {weekDates.map(
                    (
                      date,
                      dayIndex,
                    ) => {
                      const dateKey =
                        getDateKeyFromDate(
                          date,
                        );

                      const currentMonth =
                        date.getMonth() ===
                        month;

                      const isToday =
                        dateKey ===
                        todayDate;

                      return (
                        <div
                          key={
                            dateKey
                          }
                          onDragOver={(
                            event,
                          ) => {
                            event.preventDefault();

                            event.dataTransfer.dropEffect =
                              "move";
                          }}
                          onDrop={(
                            event,
                          ) =>
                            onDateDrop(
                              event,
                              dateKey,
                            )
                          }
                          onDoubleClick={() =>
                            onCreateForDate(
                              dateKey,
                            )
                          }
                          className={cn(
                            "group/day relative border-r border-slate-100 transition last:border-r-0 hover:bg-[#F8FAFF]",
                            !currentMonth &&
                              "bg-slate-50/55",
                            isToday &&
                              "bg-[#F4F7FF]",
                          )}
                        >
                          <div className="flex h-[38px] items-center justify-between px-2 pt-1">
                            <span
                              className={cn(
                                "grid h-6 w-6 place-items-center rounded-full text-[10px] font-black",
                                isToday
                                  ? "bg-[#5873F9] text-white shadow-sm"
                                  : currentMonth
                                    ? dayIndex === 0
                                      ? "text-rose-400"
                                      : dayIndex === 6
                                        ? "text-blue-500"
                                        : "text-slate-600"
                                    : "text-slate-300",
                              )}
                            >
                              {date.getDate()}
                            </span>

                            <button
                              type="button"
                              onClick={(
                                event,
                              ) => {
                                event.stopPropagation();

                                onCreateForDate(
                                  dateKey,
                                );
                              }}
                              className="grid h-5 w-5 place-items-center rounded-md text-slate-300 opacity-0 transition hover:bg-white hover:text-[#5873F9] hover:shadow-sm group-hover/day:opacity-100"
                              aria-label={`${dateKey} 일정 추가`}
                            >
                              <Plus
                                size={11}
                              />
                            </button>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>

                {/* 주 단위 Schedule Bar */}
                <div className="pointer-events-none absolute inset-x-0 top-[39px] bottom-1">
                  {segments.map(
                    (segment) => {
                      const spanDays =
                        segment.endIndex -
                        segment.startIndex +
                        1;

                      const startPercent =
                        (segment.startIndex /
                          7) *
                        100;

                      const widthPercent =
                        (spanDays / 7) *
                        100;

                      const leftInset =
                        segment.continuesFromPreviousWeek
                          ? 0
                          : 6;

                      const rightInset =
                        segment.continuesToNextWeek
                          ? 0
                          : 6;

                      const schedule =
                        segment.schedule;

                      return (
                        <div
                          key={`${schedule.id}-${weekIndex}`}
                          draggable
                          role="button"
                          tabIndex={0}
                          onDragStart={(
                            event,
                          ) =>
                            onDragStart(
                              event,
                              schedule,
                            )
                          }
                          onClick={() =>
                            onOpen(
                              schedule,
                            )
                          }
                          onKeyDown={(
                            event,
                          ) => {
                            if (
                              event.key ===
                                "Enter" ||
                              event.key ===
                                " "
                            ) {
                              event.preventDefault();

                              onOpen(
                                schedule,
                              );
                            }
                          }}
                          className={cn(
                            "pointer-events-auto absolute flex h-[22px] cursor-grab items-center gap-1.5 overflow-hidden border px-2 text-[9px] font-black shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition hover:z-20 hover:-translate-y-[1px] hover:brightness-[0.98] hover:shadow-md active:cursor-grabbing",
                            STATUS_META[
                              schedule.status
                            ].badge,
                            segment.continuesFromPreviousWeek
                              ? "rounded-l-none border-l-0"
                              : "rounded-l-md",
                            segment.continuesToNextWeek
                              ? "rounded-r-none border-r-0"
                              : "rounded-r-md",
                          )}
                          style={{
                            left: `calc(${startPercent}% + ${leftInset}px)`,
                            width: `calc(${widthPercent}% - ${leftInset + rightInset}px)`,
                            top:
                              segment.lane *
                              27,
                          }}
                          title={`${schedule.title} · ${getSchedulePeriodText(
                            schedule,
                          )}`}
                        >
                          {!segment.continuesFromPreviousWeek && (
                            <span
                              className={cn(
                                "h-1.5 w-1.5 shrink-0 rounded-full",
                                STATUS_META[
                                  schedule.status
                                ].dot,
                              )}
                            />
                          )}

                          <span className="min-w-0 flex-1 truncate">
                            {schedule.title}
                          </span>

                          {!schedule.hasDevlog &&
                            spanDays >= 2 && (
                              <button
                                type="button"
                                onClick={(
                                  event,
                                ) => {
                                  event.stopPropagation();

                                  onWriteDevlog(
                                    schedule,
                                  );
                                }}
                                onMouseDown={(
                                  event,
                                ) =>
                                  event.stopPropagation()
                                }
                                className="grid h-4 w-4 shrink-0 place-items-center rounded bg-white/80 text-amber-600 transition hover:bg-amber-100"
                                title="이 일정으로 개발일지 작성"
                              >
                                <FilePenLine
                                  size={10}
                                />
                              </button>
                            )}
                        </div>
                      );
                    },
                  )}

                  {hiddenCount > 0 && (
                    <div
                      className="absolute left-2 text-[9px] font-black text-slate-400"
                      style={{
                        top:
                          laneCount *
                            27 +
                          1,
                      }}
                    >
                      +{hiddenCount}개 일정 더 있음
                    </div>
                  )}
                </div>
              </div>
            );
          },
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-[#FBFCFE] px-4 py-2.5">
        <p className="text-[10px] font-semibold text-slate-400">
          일정 Bar를 다른 날짜로 드래그하면 기간 길이를 유지한 채 이동합니다.
        </p>

        <div className="flex items-center gap-3 text-[9px] font-bold text-slate-400">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            완료
          </span>

          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#5873F9]" />
            진행 중
          </span>

          <span className="flex items-center gap-1">
            <FilePenLine
              size={10}
              className="text-amber-500"
            />
            일지 미작성
          </span>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   GANTT VIEW
   ========================================================= */

function GanttView({
  startDate,
  days,
  schedules,
  teamMembers,
  isTeam,
  onPrev,
  onNext,
  onToday,
  onOpen,
  onDragStart,
  onWriteDevlog,
  onDateDrop,
}: {
  startDate: Date;
  days: Date[];
  schedules: ProjectScheduleItem[];
  teamMembers: WorkspaceMember[];
  isTeam: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onOpen: (
    schedule: ProjectScheduleItem,
  ) => void;
  onDragStart: (
    event: React.DragEvent,
    schedule: ProjectScheduleItem,
  ) => void;
  onWriteDevlog: (
    schedule: ProjectScheduleItem,
  ) => void;
  onDateDrop: (
    event: React.DragEvent,
    dateKey: string,
  ) => void;
}) {
  const cellWidth = 38;

  const timelineWidth =
    days.length * cellWidth;

  const rangeStart =
    days[0];

  const rangeEnd =
    days[
      days.length - 1
    ];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <ChevronLeft
              size={15}
            />
          </button>

          <button
            type="button"
            onClick={onNext}
            className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <ChevronRight
              size={15}
            />
          </button>

          <div className="ml-1">
            <p className="text-xs font-black text-slate-800">
              프로젝트 타임라인
            </p>

            <p className="text-[10px] font-semibold text-slate-400">
              {formatCompactDate(
                getDateKeyFromDate(
                  startDate,
                ),
              )}
              {" ~ "}
              {formatCompactDate(
                getDateKeyFromDate(
                  rangeEnd,
                ),
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToday}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-black text-slate-500 hover:bg-slate-50"
        >
          오늘 기준
        </button>
      </div>

      <div className="overflow-x-auto">
        <div
          style={{
            minWidth:
              220 +
              timelineWidth,
          }}
        >
          {/* header */}
          <div className="flex border-b border-slate-100 bg-slate-50">
            <div className="w-[220px] shrink-0 border-r border-slate-200 px-4 py-2 text-[10px] font-black text-slate-400">
              작업
            </div>

            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${days.length}, ${cellWidth}px)`,
              }}
            >
              {days.map(
                (date) => {
                  const weekend =
                    date.getDay() ===
                      0 ||
                    date.getDay() ===
                      6;

                  return (
                    <div
                      key={getDateKeyFromDate(
                        date,
                      )}
                      className={cn(
                        "border-r border-slate-100 py-1.5 text-center",
                        weekend &&
                          "bg-slate-100/50",
                      )}
                    >
                      <p className="text-[8px] font-bold text-slate-400">
                        {
                          [
                            "일",
                            "월",
                            "화",
                            "수",
                            "목",
                            "금",
                            "토",
                          ][
                            date.getDay()
                          ]
                        }
                      </p>

                      <p className="mt-0.5 text-[9px] font-black text-slate-600">
                        {
                          date.getDate()
                        }
                      </p>
                    </div>
                  );
                },
              )}
            </div>
          </div>

          {/* rows */}
          {schedules.map(
            (schedule) => {
              const scheduleStart =
                parseDateKey(
                  schedule.startDate,
                );

              const scheduleEnd =
                parseDateKey(
                  schedule.endDate,
                );

              const clippedStart =
                scheduleStart <
                rangeStart
                  ? rangeStart
                  : scheduleStart;

              const clippedEnd =
                scheduleEnd >
                rangeEnd
                  ? rangeEnd
                  : scheduleEnd;

              const left =
                getDayDifference(
                  rangeStart,
                  clippedStart,
                ) *
                cellWidth;

              const width =
                (getDayDifference(
                  clippedStart,
                  clippedEnd,
                ) +
                  1) *
                cellWidth;

              const member =
                teamMembers.find(
                  (item) =>
                    item.userId ===
                    schedule.assigneeUserId,
                );

              const assigneeName =
                member
                  ? getMemberName(
                      member,
                    )
                  : schedule.assigneeName;

              return (
                <div
                  key={
                    schedule.id
                  }
                  className="flex min-h-[54px] border-b border-slate-100"
                >
                  <div className="flex w-[220px] shrink-0 items-center border-r border-slate-200 hover:bg-slate-50">
                    <button
                      type="button"
                      onClick={() =>
                        onOpen(
                          schedule,
                        )
                      }
                      className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left"
                    >
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          STATUS_META[
                            schedule
                              .status
                          ].dot,
                        )}
                      />

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-black text-slate-800">
                          {
                            schedule.title
                          }
                        </span>

                        <span className="mt-0.5 block truncate text-[9px] font-semibold text-slate-400">
                          {isTeam
                            ? assigneeName ||
                              "담당자 미지정"
                            : getSchedulePeriodText(
                                schedule,
                              )}
                        </span>
                      </span>
                    </button>

                    {!schedule.hasDevlog && (
                      <button
                        type="button"
                        onClick={() =>
                          onWriteDevlog(
                            schedule,
                          )
                        }
                        className="mr-2 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600 transition hover:bg-amber-100"
                        title="이 일정으로 개발일지 작성"
                      >
                        <FilePenLine
                          size={12}
                        />
                      </button>
                    )}
                  </div>

                  <div
                    className="relative"
                    style={{
                      width:
                        timelineWidth,
                    }}
                  >
                    <div
                      className="absolute inset-0 grid"
                      style={{
                        gridTemplateColumns: `repeat(${days.length}, ${cellWidth}px)`,
                      }}
                    >
                      {days.map(
                        (
                          date,
                        ) => {
                          const dateKey =
                            getDateKeyFromDate(
                              date,
                            );

                          return (
                            <div
                              key={
                                dateKey
                              }
                              onDragOver={(
                                event,
                              ) => {
                                event.preventDefault();

                                event.dataTransfer.dropEffect =
                                  "move";
                              }}
                              onDrop={(
                                event,
                              ) =>
                                onDateDrop(
                                  event,
                                  dateKey,
                                )
                              }
                              className={cn(
                                "border-r border-slate-100 transition hover:bg-[#EEF3FF]/60",
                                (date.getDay() ===
                                  0 ||
                                  date.getDay() ===
                                    6) &&
                                  "bg-slate-50",
                              )}
                            />
                          );
                        },
                      )}
                    </div>

                    <button
                      type="button"
                      draggable
                      onDragStart={(
                        event,
                      ) =>
                        onDragStart(
                          event,
                          schedule,
                        )
                      }
                      onClick={() =>
                        onOpen(
                          schedule,
                        )
                      }
                      className={cn(
                        "absolute top-[13px] z-10 flex h-7 items-center gap-1.5 overflow-hidden rounded-lg border px-2 text-[9px] font-black shadow-sm transition hover:brightness-95",
                        STATUS_META[
                          schedule
                            .status
                        ].badge,
                      )}
                      style={{
                        left:
                          left + 2,
                        width:
                          Math.max(
                            width - 4,
                            32,
                          ),
                      }}
                    >
                      <GripVertical
                        size={10}
                        className="shrink-0 opacity-50"
                      />

                      <span className="truncate">
                        {
                          schedule.title
                        }
                      </span>
                    </button>
                  </div>
                </div>
              );
            },
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   LIST VIEW
   ========================================================= */

function ListView({
  schedules,
  teamMembers,
  isTeam,
  onOpen,
  onStatusChange,
  onWriteDevlog,
  onOpenDevlog,
}: {
  schedules: ProjectScheduleItem[];
  teamMembers: WorkspaceMember[];
  isTeam: boolean;
  onOpen: (
    schedule: ProjectScheduleItem,
  ) => void;
  onStatusChange: (
    scheduleId: string,
    status: ScheduleStatus,
  ) => Promise<void>;
  onWriteDevlog: (
    schedule: ProjectScheduleItem,
  ) => void;
  onOpenDevlog: (
    schedule: ProjectScheduleItem,
  ) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div
        className={cn(
          "grid gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-slate-400",
          isTeam
            ? "grid-cols-[minmax(220px,1.7fr)_150px_110px_170px_130px]"
            : "grid-cols-[minmax(260px,2fr)_110px_190px_130px]",
        )}
      >
        <div>Task</div>

        {isTeam && (
          <div>
            Assignee
          </div>
        )}

        <div>Status</div>

        <div>Period</div>

        <div>Devlog</div>
      </div>

      {schedules.map(
        (schedule) => {
          const member =
            teamMembers.find(
              (item) =>
                item.userId ===
                schedule.assigneeUserId,
            );

          const assigneeName =
            member
              ? getMemberName(
                  member,
                )
              : schedule.assigneeName;

          return (
            <div
              key={
                schedule.id
              }
              className={cn(
                "grid items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 hover:bg-[#FBFCFF]",
                isTeam
                  ? "grid-cols-[minmax(220px,1.7fr)_150px_110px_170px_130px]"
                  : "grid-cols-[minmax(260px,2fr)_110px_190px_130px]",
              )}
            >
              <button
                type="button"
                onClick={() =>
                  onOpen(
                    schedule,
                  )
                }
                className="min-w-0 text-left"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      STATUS_META[
                        schedule.status
                      ].dot,
                    )}
                  />

                  <span className="truncate text-xs font-black text-slate-800">
                    {
                      schedule.title
                    }
                  </span>
                </div>

                <p className="mt-1 truncate pl-4 text-[10px] font-semibold text-slate-400">
                  {getProjectName(
                    schedule,
                  )}
                </p>
              </button>

              {isTeam && (
                <div>
                  {assigneeName ? (
                    <div className="flex items-center gap-1.5">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-[#EEF3FF] text-[9px] font-black text-[#5873F9]">
                        {getInitial(
                          assigneeName,
                        )}
                      </span>

                      <span className="truncate text-[10px] font-bold text-slate-600">
                        {
                          assigneeName
                        }
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400">
                      미지정
                    </span>
                  )}
                </div>
              )}

              <div>
                <select
                  value={
                    schedule.status
                  }
                  onChange={(
                    event,
                  ) =>
                    void onStatusChange(
                      schedule.id,
                      event.target
                        .value as ScheduleStatus,
                    )
                  }
                  className={cn(
                    "h-8 rounded-lg border px-2 text-[10px] font-black outline-none",
                    STATUS_META[
                      schedule.status
                    ].badge,
                  )}
                >
                  <option value="todo">
                    할 일
                  </option>

                  <option value="progress">
                    진행 중
                  </option>

                  <option value="done">
                    완료
                  </option>

                  <option value="delayed">
                    지연
                  </option>
                </select>
              </div>

              <div className="text-[10px] font-bold text-slate-500">
                {getSchedulePeriodText(
                  schedule,
                )}
              </div>

              <div>
                {schedule.hasDevlog ? (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenDevlog(
                        schedule,
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-black text-emerald-700"
                  >
                    <CheckCircle2
                      size={11}
                    />
                    작성 완료
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      onWriteDevlog(
                        schedule,
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[10px] font-black text-amber-700 transition hover:bg-amber-100"
                  >
                    <FilePenLine
                      size={11}
                    />
                    작성하기
                  </button>
                )}
              </div>
            </div>
          );
        },
      )}
    </div>
  );
}

/* =========================================================
   DETAIL MODAL
   ========================================================= */

function ScheduleDetailModal({
  schedule,
  members,
  isTeam,
  deleting,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  onWriteDevlog,
  onOpenDevlog,
}: {
  schedule: ProjectScheduleItem;
  members: WorkspaceMember[];
  isTeam: boolean;
  deleting: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (
    status: ScheduleStatus,
  ) => void;
  onWriteDevlog: () => void;
  onOpenDevlog: () => void;
}) {
  const member =
    members.find(
      (item) =>
        item.userId ===
        schedule.assigneeUserId,
    );

  const assigneeName =
    member
      ? getMemberName(member)
      : schedule.assigneeName ||
        "";

  const memberRole =
    member
      ? getMemberRole(member)
      : null;

  return (
    <ModalShell
      onClose={onClose}
      width="max-w-[620px]"
    >
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <StatusBadge
                status={
                  schedule.status
                }
              />

              <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-500">
                {getProjectName(
                  schedule,
                )}
              </span>
            </div>

            <h2 className="text-lg font-black tracking-tight text-slate-950">
              {schedule.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <DetailValue
            label="기간"
            value={getSchedulePeriodText(
              schedule,
            )}
          />

          {isTeam && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                담당자
              </p>

              {assigneeName ? (
                <div className="mt-2 flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[#EEF3FF] text-[10px] font-black text-[#5873F9]">
                    {getInitial(
                      assigneeName,
                    )}
                  </span>

                  <div>
                    <p className="text-xs font-black text-slate-800">
                      {
                        assigneeName
                      }
                    </p>

                    {memberRole && (
                      <p className="text-[9px] font-black text-[#5873F9]">
                        {
                          memberRole
                        }
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-xs font-bold text-slate-400">
                  담당자가 지정되지
                  않았습니다.
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
            설명
          </p>

          <div className="mt-2 min-h-[82px] whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs font-medium leading-6 text-slate-600">
            {schedule.description ||
              "등록된 상세 내용이 없습니다."}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-400">
            상태
          </p>

          <div className="grid grid-cols-4 gap-2">
            {BOARD_STATUSES.map(
              (status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() =>
                    onStatusChange(
                      status,
                    )
                  }
                  className={cn(
                    "rounded-xl border px-2 py-2 text-[10px] font-black transition",
                    schedule.status ===
                      status
                      ? STATUS_META[
                          status
                        ].badge
                      : "border-slate-200 bg-white text-slate-400 hover:bg-slate-50",
                  )}
                >
                  {
                    STATUS_META[
                      status
                    ].label
                  }
                </button>
              ),
            )}
          </div>
        </div>

        {/* devlog */}
        <div
          className={cn(
            "rounded-xl border p-4",
            schedule.hasDevlog
              ? "border-emerald-100 bg-emerald-50/60"
              : "border-amber-100 bg-amber-50/60",
          )}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                {schedule.hasDevlog ? (
                  <CheckCircle2
                    size={15}
                    className="text-emerald-600"
                  />
                ) : (
                  <FilePenLine
                    size={15}
                    className="text-amber-600"
                  />
                )}

                <p
                  className={cn(
                    "text-xs font-black",
                    schedule.hasDevlog
                      ? "text-emerald-800"
                      : "text-amber-800",
                  )}
                >
                  개발일지
                </p>
              </div>

              <p
                className={cn(
                  "mt-1 text-[10px] font-semibold",
                  schedule.hasDevlog
                    ? "text-emerald-600"
                    : "text-amber-600",
                )}
              >
                {schedule.hasDevlog
                  ? "이 일정에 연결된 개발일지가 작성되어 있습니다."
                  : "아직 이 일정에 연결된 개발일지가 없습니다."}
              </p>
            </div>

            {schedule.hasDevlog ? (
              <button
                type="button"
                onClick={
                  onOpenDevlog
                }
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-white px-3 text-[10px] font-black text-emerald-700 shadow-sm"
              >
                개발일지 보기
                <ArrowRight
                  size={11}
                />
              </button>
            ) : (
              <button
                type="button"
                onClick={
                  onWriteDevlog
                }
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 text-[10px] font-black text-white transition hover:bg-amber-600"
              >
                <FilePenLine
                  size={11}
                />
                이 일정으로 일지 작성
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
        <button
          type="button"
          disabled={deleting}
          onClick={onDelete}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 text-[11px] font-black text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
        >
          {deleting ? (
            <Loader2
              size={13}
              className="animate-spin"
            />
          ) : (
            <Trash2
              size={13}
            />
          )}
          삭제
        </button>

        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#5873F9] px-4 text-[11px] font-black text-white transition hover:bg-[#4863E8]"
        >
          <Pencil
            size={13}
          />
          일정 수정
        </button>
      </div>
    </ModalShell>
  );
}

/* =========================================================
   FORM MODAL
   ========================================================= */

function ScheduleFormModal({
  mode,
  title,
  description,
  form,
  setForm,
  members,
  isTeam,
  saving,
  submitLabel,
  onClose,
  onSubmit,
}: {
  mode: "create" | "edit";

  title: string;
  description: string;

  form: ScheduleForm;

  setForm: React.Dispatch<
    React.SetStateAction<ScheduleForm>
  >;

  members: WorkspaceMember[];

  isTeam: boolean;
  saving: boolean;

  submitLabel: string;

  onClose: () => void;
  onSubmit: () => void;
}) {
  const isEdit =
    mode === "edit";

  const selectedMember =
    members.find(
      (member) =>
        member.userId ===
        form.assigneeUserId,
    ) ?? null;

  return (
    <ModalShell
      onClose={onClose}
      width="max-w-[720px]"
    >
      {/* =================================================
          HEADER
         ================================================= */}
      <header className="flex shrink-0 items-start justify-between border-b border-slate-100 px-6 py-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#5873F9]">
              Schedule
            </span>

            <span className="rounded-full bg-[#EEF3FF] px-2 py-0.5 text-[9px] font-black text-[#5873F9]">
              {isEdit
                ? "EDIT"
                : "NEW"}
            </span>
          </div>

          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
            {title}
          </h2>

          <p className="mt-1 text-xs font-medium text-slate-400">
            {description}
          </p>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={onClose}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          aria-label="일정 모달 닫기"
        >
          <X size={17} />
        </button>
      </header>

      {/* =================================================
          CONTENT
         ================================================= */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-6 py-5">
          {/* =============================================
              TITLE
             ============================================= */}
          <div>
            <div className="flex items-center gap-1">
              <label className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                Title
              </label>

              <span className="text-[10px] font-black text-rose-500">
                *
              </span>
            </div>

            <input
              value={form.title}
              onChange={(event) =>
                setForm(
                  (prev) => ({
                    ...prev,
                    title:
                      event.target.value,
                  }),
                )
              }
              placeholder="예: 로그인 API 구현"
              autoFocus
              className="mt-1 w-full border-0 border-b border-slate-200 bg-transparent px-0 pb-3 pt-1 text-[19px] font-black tracking-tight text-slate-950 outline-none transition placeholder:font-semibold placeholder:text-slate-300 focus:border-[#5873F9]"
            />
          </div>

          {/* =============================================
              META INFORMATION
             ============================================= */}
          <section className="mt-5 overflow-hidden rounded-xl border border-slate-200">
            {/* PERIOD */}
            <ScheduleMetaRow
              icon={
                <CalendarDays
                  size={15}
                />
              }
              label="기간"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <input
                  type="date"
                  value={
                    form.startDate
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (prev) => ({
                        ...prev,

                        startDate:
                          event.target
                            .value,

                        endDate:
                          prev.endDate <
                          event.target
                            .value
                            ? event.target
                                .value
                            : prev.endDate,
                      }),
                    )
                  }
                  className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 outline-none transition focus:border-[#AAB8FF] focus:ring-2 focus:ring-[#5873F9]/10"
                />

                <ArrowRight
                  size={14}
                  className="shrink-0 text-slate-300"
                />

                <input
                  type="date"
                  min={
                    form.startDate
                  }
                  value={
                    form.endDate
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (prev) => ({
                        ...prev,

                        endDate:
                          event.target
                            .value,
                      }),
                    )
                  }
                  className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 outline-none transition focus:border-[#AAB8FF] focus:ring-2 focus:ring-[#5873F9]/10"
                />
              </div>
            </ScheduleMetaRow>

            {/* STATUS */}
            <ScheduleMetaRow
              icon={
                <Clock3
                  size={15}
                />
              }
              label="상태"
            >
              <div className="flex flex-wrap gap-1.5">
                {BOARD_STATUSES.map(
                  (status) => (
                    <ScheduleStatusButton
                      key={status}
                      status={status}
                      active={
                        form.status ===
                        status
                      }
                      onClick={() =>
                        setForm(
                          (prev) => ({
                            ...prev,
                            status,
                          }),
                        )
                      }
                    />
                  ),
                )}
              </div>
            </ScheduleMetaRow>

            {/* ASSIGNEE */}
            {isTeam && (
              <ScheduleMetaRow
                icon={
                  <UserRound
                    size={15}
                  />
                }
                label="담당자"
                alignStart
                last
              >
                <div className="min-w-0 flex-1">
                  {members.length ===
                  0 ? (
                    <div className="py-2 text-xs font-semibold text-slate-400">
                      조회된 팀원이 없습니다.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {members.map(
                        (member) => {
                          const active =
                            form.assigneeUserId ===
                            member.userId;

                          const role =
                            getMemberRole(
                              member,
                            );

                          const name =
                            getMemberName(
                              member,
                            );

                          return (
                            <button
                              key={
                                member.userId
                              }
                              type="button"
                              onClick={() =>
                                setForm(
                                  (
                                    prev,
                                  ) => ({
                                    ...prev,

                                    assigneeUserId:
                                      member.userId,
                                  }),
                                )
                              }
                              className={cn(
                                "flex h-9 items-center gap-2 rounded-lg border py-1 pl-1.5 pr-3 transition",
                                active
                                  ? "border-[#BFCBFF] bg-[#EEF3FF]"
                                  : "border-slate-200 bg-white hover:bg-slate-50",
                              )}
                            >
                              <span
                                className={cn(
                                  "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[9px] font-black",
                                  active
                                    ? "bg-[#5873F9] text-white"
                                    : "bg-slate-100 text-slate-600",
                                )}
                              >
                                {getInitial(
                                  name,
                                )}
                              </span>

                              <span className="text-[10px] font-black text-slate-700">
                                {name}
                              </span>

                              <span
                                className={cn(
                                  "text-[8px] font-black",
                                  role ===
                                    "OWNER"
                                    ? "text-[#5873F9]"
                                    : "text-slate-400",
                                )}
                              >
                                {role}
                              </span>

                              {active && (
                                <CheckCircle2
                                  size={12}
                                  className="text-[#5873F9]"
                                />
                              )}
                            </button>
                          );
                        },
                      )}
                    </div>
                  )}

                  {selectedMember && (
                    <p className="mt-2 text-[10px] font-semibold text-slate-400">
                      현재 담당자{" "}
                      <strong className="text-slate-600">
                        {getMemberName(
                          selectedMember,
                        )}
                      </strong>
                      으로 설정되어 있습니다.
                    </p>
                  )}
                </div>
              </ScheduleMetaRow>
            )}

            {!isTeam && (
              <ScheduleMetaRow
                icon={
                  <UserRound
                    size={15}
                  />
                }
                label="담당"
                last
              >
                <span className="text-xs font-bold text-slate-500">
                  개인 프로젝트 일정
                </span>
              </ScheduleMetaRow>
            )}
          </section>

          {/* =============================================
              DESCRIPTION
             ============================================= */}
          <section className="mt-5">
            <div className="mb-2 flex items-end justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                  Detail
                </span>

                <p className="mt-0.5 text-xs font-bold text-slate-700">
                  상세 내용
                </p>
              </div>

              <span className="text-[10px] font-semibold text-slate-300">
                {form.description.length}
                자
              </span>
            </div>

            <textarea
              value={
                form.description
              }
              onChange={(
                event,
              ) =>
                setForm(
                  (prev) => ({
                    ...prev,

                    description:
                      event.target
                        .value,
                  }),
                )
              }
              rows={7}
              placeholder={`작업 내용이나 참고사항을 입력해주세요.\n\n예)\n- 로그인 API 구현\n- 인증 실패 예외 처리\n- Postman 테스트 진행`}
              className="w-full resize-none rounded-xl border border-slate-200 bg-[#FBFCFE] p-4 text-sm font-medium leading-7 text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-[#AAB8FF] focus:bg-white focus:ring-2 focus:ring-[#5873F9]/10"
            />
          </section>
        </div>
      </div>

      {/* =================================================
          FOOTER
         ================================================= */}
      <footer className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-white px-6 py-4">
        <p className="hidden text-[10px] font-medium text-slate-400 sm:block">
          일정 제목과 기간은 필수입니다.
        </p>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
          >
            취소
          </button>

          <button
            type="button"
            disabled={
              saving ||
              !form.title.trim() ||
              !form.startDate ||
              !form.endDate
            }
            onClick={onSubmit}
            className="inline-flex h-9 min-w-[110px] items-center justify-center gap-2 rounded-xl bg-[#5873F9] px-4 text-xs font-black text-white transition hover:bg-[#4863E8] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? (
              <>
                <Loader2
                  size={14}
                  className="animate-spin"
                />

                저장 중
              </>
            ) : (
              <>
                <CalendarDays
                  size={14}
                />

                {submitLabel}
              </>
            )}
          </button>
        </div>
      </footer>
    </ModalShell>
  );
}

/* =========================================================
   SCHEDULE META ROW
   ========================================================= */

function ScheduleMetaRow({
  icon,
  label,
  children,
  last,
  alignStart,
}: {
  icon: React.ReactNode;

  label: string;

  children: React.ReactNode;

  last?: boolean;

  alignStart?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[92px_minmax(0,1fr)] gap-4 px-4 py-3",
        !last &&
          "border-b border-slate-100",
      )}
    >
      <div
        className={cn(
          "flex gap-2 text-slate-400",
          alignStart
            ? "items-start pt-2"
            : "items-center",
        )}
      >
        {icon}

        <span className="text-[10px] font-black text-slate-500">
          {label}
        </span>
      </div>

      <div
        className={cn(
          "min-w-0",
          !alignStart &&
            "flex items-center",
        )}
      >
        {children}
      </div>
    </div>
  );
}

/* =========================================================
   SCHEDULE STATUS BUTTON
   ========================================================= */

function ScheduleStatusButton({
  status,
  active,
  onClick,
}: {
  status: ScheduleStatus;

  active: boolean;

  onClick: () => void;
}) {
  const meta =
    STATUS_META[status];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[10px] font-black transition",
        active
          ? meta.badge
          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          meta.dot,
        )}
      />

      {meta.label}
    </button>
  );
}

/* =========================================================
   GENERIC COMPONENTS
   ========================================================= */

/* =========================================================
   MODAL SHELL
   ========================================================= */

function ModalShell({
  children,
  onClose,
  width,
}: {
  children: React.ReactNode;
  onClose: () => void;
  width: string;
}) {
  /*
   * 모달이 열려 있는 동안
   * 뒤쪽 페이지(body)는 스크롤되지 않도록 잠금.
   *
   * 모달 내부의 overflow-y-auto는 그대로 동작함.
   */
  useEffect(() => {
    const previousOverflow =
      document.body.style.overflow;

    const previousPaddingRight =
      document.body.style.paddingRight;

    /*
     * body scrollbar가 사라질 때
     * 화면이 좌우로 살짝 움직이는 현상 방지.
     */
    const scrollbarWidth =
      window.innerWidth -
      document.documentElement.clientWidth;

    document.body.style.overflow =
      "hidden";

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight =
        `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow =
        previousOverflow;

      document.body.style.paddingRight =
        previousPaddingRight;
    };
  }, []);

  return (
    <>
      {/* =================================================
          BACKDROP

          전체 화면을 덮기 때문에
          WAIVS 헤더까지 blur 처리
         ================================================= */}

      <div
        className="fixed inset-0 z-[9998] bg-slate-950/30 backdrop-blur-[2px]"
        onMouseDown={onClose}
      />

      {/* =================================================
          MODAL POSITION

          기존보다 위쪽 여백을 줄임.
          뒤쪽 페이지는 스크롤되지 않고,
          실제 모달 내부만 스크롤됨.
         ================================================= */}

   <div className="pointer-events-none fixed inset-x-0 bottom-0 top-[25px] z-[9999] flex items-start justify-center overflow-hidden px-4 pt-1 pb-2">
  <div
    onMouseDown={(event) =>
      event.stopPropagation()
    }
    className={cn(
      "pointer-events-auto flex max-h-[calc(100dvh-50px)] w-full flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]",
      width,
    )}
  >
    {children}
  </div>
</div>
    </>
  );
}
function StatusBadge({
  status,
}: {
  status: ScheduleStatus;
}) {
  const meta =
    STATUS_META[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black",
        meta.badge,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          meta.dot,
        )}
      />

      {meta.label}
    </span>
  );
}

function DetailValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-xs font-black text-slate-700">
        {value}
      </p>
    </div>
  );
}

function LoadingBox() {
  return (
    <div className="grid min-h-[500px] place-items-center">
      <div className="flex items-center gap-2 text-xs font-black text-slate-400">
        <Loader2
          size={16}
          className="animate-spin text-[#5873F9]"
        />

        일정 불러오는 중
      </div>
    </div>
  );
}

function ErrorBox({
  message,
}: {
  message: string;
}) {
  return (
    <div className="grid min-h-[500px] place-items-center">
      <div className="max-w-md rounded-xl border border-rose-100 bg-rose-50 p-4 text-center">
        <AlertTriangle
          size={20}
          className="mx-auto text-rose-500"
        />

        <p className="mt-2 text-xs font-black text-rose-700">
          {message}
        </p>
      </div>
    </div>
  );
}

function EmptyBox({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-[500px] place-items-center">
      <div className="max-w-sm text-center">
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-[#EEF3FF] text-[#5873F9]">
          <CalendarDays
            size={20}
          />
        </div>

        <h3 className="mt-3 text-sm font-black text-slate-700">
          {title}
        </h3>

        <p className="mt-1 text-xs font-medium leading-5 text-slate-400">
          {description}
        </p>

        {action}
      </div>
    </div>
  );
}