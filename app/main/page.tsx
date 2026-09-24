"use client";

import Link from "next/link";
import React, {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  Code2,
  Copy,
  FileText,
  LayoutDashboard,
  Loader2,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
  XCircle,
  Filter,
} from "lucide-react";

import {
  getAivsHref,
  getDevlogHref,
  getScheduleHref,
} from "@/components/main-dashboard/dashboard.utils";

import { apiFetch, apiJson } from "@/lib/api/apiClient";
import { SortType } from "@/lib/devlog/types";

/* =========================================================
   타입
========================================================= */

type ProjectType = "personal" | "team";

type ProjectRole = "owner" | "member";

type ProjectListSortType = "recent" | "name" | "progress";

type WorkspaceProject = {
  id?: string | number;
  name?: string;
  language?: string;
  updatedAt?: string;
};

type RawWorkspaceItem = {
  uuid?: string;
  name?: string;
  description?: string | null;
  updatedAt?: string | null;
  type?: "PERSONAL" | "TEAM" | "personal" | "team";

  id?: string;
  mode?: ProjectType;

  /*
   * 백엔드 WorkspaceListResponse.role
   *
   * owner | member
   */
  role?: "owner" | "member" | "OWNER" | "MEMBER";

  teamName?: string | null;
  projects?: WorkspaceProject[];
};

type WorkspaceItem = {
  id: string;
  name: string;
  description: string;
  type: ProjectType;
  role: ProjectRole;
  updatedAt: string;
  projectCount: number;
};

type ScheduleProgressResponse = {
  workspaceId: string;
  workspaceName: string;
  type: string;
  totalCount: number;
  doneCount: number;
  progress: number;
};

type RawScheduleItem = {
  id?: string;
  uuid?: string;
  title?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
};

type ProjectStatus = "active" | "completed";

type DashboardCardItem = {
  id: string;
  title: string;
  description: string;
  tech: string;
  type: ProjectType;
  role: ProjectRole;
  progress: number;
  status: ProjectStatus;
  memberCount?: number;
  lastModified: string;
};

type ProjectModalType =
  | "edit"
  | "duplicate"
  | "delete"
  | "leave"
  | null;

type ToastType = "success" | "error";

type ToastState = {
  type: ToastType;
  message: string;
} | null;

/* =========================================================
   필터
========================================================= */

const FILTERS = [
  { key: "all", label: "전체" },
  { key: "team", label: "팀" },
  { key: "personal", label: "개인" },
] as const;

type FilterType = (typeof FILTERS)[number]["key"];

/* =========================================================
   링크
========================================================= */

function getDashboardHref(project: DashboardCardItem) {
  return `/main/${project.id}?mode=${project.type}`;
}

function getAiReportHref(project: DashboardCardItem) {
  return `/archive?workspaceId=${encodeURIComponent(
    project.id,
  )}&mode=${project.type}`;
}

/* =========================================================
   데이터 정규화
========================================================= */

function normalizeWorkspaceType(
  value?: string | null,
): ProjectType {
  if (!value) {
    return "personal";
  }

  const normalized = value
    .trim()
    .toLowerCase();

  if (normalized === "team") {
    return "team";
  }

  return "personal";
}

function normalizeWorkspaceRole(
  value?: string | null,
): ProjectRole {
  if (!value) {
    return "member";
  }

  const normalized = value
    .trim()
    .toLowerCase();

  if (normalized === "owner") {
    return "owner";
  }

  return "member";
}

function normalizeWorkspace(
  workspace: RawWorkspaceItem,
): WorkspaceItem {
  const id =
    workspace.uuid ??
    workspace.id ??
    "";

  const type = normalizeWorkspaceType(
    workspace.type ?? workspace.mode,
  );

  const role = normalizeWorkspaceRole(
    workspace.role,
  );

  const projectCount = Array.isArray(
    workspace.projects,
  )
    ? workspace.projects.length
    : 0;

  return {
    id,
    name:
      workspace.name?.trim() ||
      "이름 없는 프로젝트",
    description:
      workspace.description?.trim() ||
      "설명이 없습니다.",
    type,
    role,
    updatedAt:
      workspace.updatedAt || "-",
    projectCount,
  };
}

/* =========================================================
   일정 진행률
========================================================= */

function isDoneScheduleStatus(
  status: unknown,
) {
  const normalized = String(
    status ?? "",
  )
    .trim()
    .toLowerCase();

  return (
    normalized === "done" ||
    normalized === "completed" ||
    normalized === "complete" ||
    normalized === "완료"
  );
}

function calculateScheduleProgress(
  workspace: WorkspaceItem,
  schedules: RawScheduleItem[],
): ScheduleProgressResponse {
  const totalCount =
    schedules.length;

  const doneCount =
    schedules.filter(
      (schedule) =>
        isDoneScheduleStatus(
          schedule.status,
        ),
    ).length;

  return {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    type: workspace.type,
    totalCount,
    doneCount,
    progress:
      totalCount === 0
        ? 0
        : Math.round(
            (doneCount / totalCount) *
              100,
          ),
  };
}

/* =========================================================
   공통 유틸
========================================================= */

function formatDate(value: string) {
  if (!value || value === "-") {
    return "-";
  }

  const parsed = new Date(value);

  if (
    Number.isNaN(parsed.getTime())
  ) {
    return value;
  }

  const year =
    parsed.getFullYear();

  const month = String(
    parsed.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    parsed.getDate(),
  ).padStart(2, "0");

  return `${year}.${month}.${day}`;
}

function getTypeLabel(
  type: ProjectType,
) {
  return type === "team"
    ? "팀 프로젝트"
    : "개인 프로젝트";
}

function getTypeStyle(
  type: ProjectType,
) {
  return type === "team"
    ? "bg-emerald-50 text-emerald-700"
    : "bg-blue-50 text-blue-700";
}


/* =========================================================
   API 오류 처리
========================================================= */

async function getApiErrorMessage(
  response: Response,
  fallbackMessage: string,
) {
  try {
    const cloned =
      response.clone();

    const data =
      (await cloned.json()) as {
        message?: string;
        error?: string;
      };

    if (data?.message) {
      return data.message;
    }

    if (data?.error) {
      return data.error;
    }
  } catch {
    // JSON이 아닌 경우 text로 확인
  }

  try {
    const text =
      await response.text();

    if (text.trim()) {
      return text;
    }
  } catch {
    // ignore
  }

  return fallbackMessage;
}

async function assertApiSuccess(
  response: Response,
  fallbackMessage: string,
) {
  if (response.ok) {
    return;
  }

  const message =
    await getApiErrorMessage(
      response,
      fallbackMessage,
    );

  throw new Error(message);
}

/* =========================================================
   메인 페이지
========================================================= */

export default function DashboardProjectSelectPage() {
  const [filter, setFilter] =
    useState<FilterType>("all");

  const [search, setSearch] =
    useState("");

  const [projects, setProjects] =
    useState<DashboardCardItem[]>(
      [],
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [toast, setToast] =
    useState<ToastState>(null);

  useEffect(() => {
    loadDashboardProjects();
  }, []);

  /* =======================================================
     토스트
  ======================================================= */

  function showToast(
    type: ToastType,
    message: string,
  ) {
    setToast({
      type,
      message,
    });
  }

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer =
      window.setTimeout(() => {
        setToast(null);
      }, 3000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toast]);

  /* =======================================================
     프로젝트 조회
  ======================================================= */

  async function loadDashboardProjects() {
    try {
      setLoading(true);
      setError("");

      const rawWorkspaces =
        (await apiJson(
          "/api/workspaces/me",
          {
            cache: "no-store",
          },
        )) as RawWorkspaceItem[];

      const workspaceList =
        Array.isArray(rawWorkspaces)
          ? rawWorkspaces
              .map(normalizeWorkspace)
              .filter(
                (workspace) =>
                  workspace.id,
              )
          : [];

      /*
       * 각 Workspace의 일정 진행률 조회
       */
      const progressResults =
        await Promise.all(
          workspaceList.map(
            async (workspace) => {
              try {
                const schedules =
                  (await apiJson(
                    `/api/workspaces/${encodeURIComponent(
                      workspace.id,
                    )}/schedules`,
                    {
                      cache:
                        "no-store",
                    },
                  )) as RawScheduleItem[];

                return calculateScheduleProgress(
                  workspace,
                  Array.isArray(
                    schedules,
                  )
                    ? schedules
                    : [],
                );
              } catch (err) {
                console.warn(
                  `[main schedules] 일정 진행률 조회 실패: ${workspace.id}`,
                  err,
                );

                return {
                  workspaceId:
                    workspace.id,
                  workspaceName:
                    workspace.name,
                  type:
                    workspace.type,
                  totalCount: 0,
                  doneCount: 0,
                  progress: 0,
                } satisfies ScheduleProgressResponse;
              }
            },
          ),
        );

      const progressMap =
        new Map<
          string,
          ScheduleProgressResponse
        >();

      progressResults.forEach(
        (item) => {
          progressMap.set(
            item.workspaceId,
            item,
          );
        },
      );

      /*
       * 화면 카드 데이터
       */
      const merged:
        DashboardCardItem[] =
        workspaceList.map(
          (workspace) => {
            const progressInfo =
              progressMap.get(
                workspace.id,
              );

            const progress =
              progressInfo?.progress ??
              0;

            return {
              id: workspace.id,
              title:
                workspace.name,
              description:
                workspace.description,
              tech: `작업폴더 ${workspace.projectCount}개`,
              type:
                workspace.type,

              /*
               * 중요
               * 백엔드의 role 전달
               */
              role:
                workspace.role,

              progress,
              status:
                progress >= 100
                  ? "completed"
                  : "active",
              lastModified:
                workspace.updatedAt,
              memberCount:
                undefined,
            };
          },
        );

      setProjects(merged);
    } catch (err) {
      console.error(err);

      setProjects([]);

      setError(
        err instanceof Error
          ? err.message
          : "대시보드 프로젝트 목록 조회 중 오류가 발생했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

    /* ====================================================
      필터
    ======================================================= */

    const [projectListSortType, setProjectListSortType] =
      useState<ProjectListSortType>("recent");

    const filteredProjects =
      useMemo(() => {
        const keyword =
          search
            .trim()
            .toLowerCase();

        const filtered =
          projects.filter(
            (project) => {
              const matchesFilter =
                filter === "all" ||
                project.type ===
                  filter;

              const matchesSearch =
                keyword === "" ||
                project.title
                  .toLowerCase()
                  .includes(keyword) ||
                project.description
                  .toLowerCase()
                  .includes(keyword) ||
                project.tech
                  .toLowerCase()
                  .includes(keyword);

              return (
                matchesFilter &&
                matchesSearch
              );
            },
          );

        return [...filtered].sort(
          (a, b) => {
            // 이름순
            if (
              projectListSortType ===
              "name"
            ) {
              return a.title.localeCompare(
                b.title,
                "ko",
              );
            }

            // 진행률 높은순
            if (
              projectListSortType ===
              "progress"
            ) {
              return (
                b.progress -
                a.progress
              );
            }

            // 최근 수정순
            return (
              new Date(
                b.lastModified,
              ).getTime() -
              new Date(
                a.lastModified,
              ).getTime()
            );
          },
        );
      }, [
        filter,
        search,
        projects,
        projectListSortType,
      ]);

    const totalCount =
      projects.length;

    const teamCount =
      projects.filter(
        (project) =>
          project.type === "team",
      ).length;

    const personalCount =
      projects.filter(
        (project) =>
          project.type ===
          "personal",
      ).length;

    const averageProgress =
      totalCount === 0
        ? 0
        : Math.round(
            projects.reduce(
              (sum, project) =>
                sum +
                project.progress,
              0,
            ) / totalCount,
          );

  return (
    <>
      <main className="min-h-screen bg-[#F6F8FC] px-4 py-4 text-slate-900 md:px-5 md:py-5">
        <div className="mx-auto flex max-w-[1520px] flex-col gap-3.5">

          {/* =============================================
              프로젝트 선택 헤더
          ============================================= */}

          <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] md:px-6">
            <div className="flex flex-col gap-3.5">

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <h1 className="text-xl font-black tracking-tight text-slate-950">
                      프로젝트
                    </h1>

                    <span className="hidden h-4 w-px bg-slate-200 sm:block" />

                    <p className="text-xs font-semibold text-slate-400 sm:text-[13px]">
                      작업할 프로젝트를 선택하거나 새 프로젝트를 생성하세요.
                    </p>
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-slate-400">
                    <SummaryChip label="전체" value={`${totalCount}`} />
                    <span className="text-slate-200">·</span>
                    <SummaryChip label="팀" value={`${teamCount}`} />
                    <span className="text-slate-200">·</span>
                    <SummaryChip label="개인" value={`${personalCount}`} />
                    <span className="text-slate-200">·</span>
                    <SummaryChip label="평균 진행률" value={`${averageProgress}%`} />

                    {(filteredProjects.length !== totalCount || search.trim()) && (
                      <>
                        <span className="text-slate-200">·</span>
                        <span className="font-black text-[#5873F9]">
                          {filteredProjects.length}개 표시
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={loadDashboardProjects}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-black text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <RefreshCw size={14} />
                    새로고침
                  </button>

                  <Link
                    href="/new/workspace"
                    onClick={() => {
                      sessionStorage.setItem(
                        "workspace_create_entry",
                        "dashboard",
                      );
                    }}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#5873F9] px-4 text-xs font-black text-white shadow-sm transition hover:bg-[#4863E8]"
                  >
                    <Plus size={15} />
                    새 프로젝트 생성
                  </Link>
                </div>
              </div>

              {/* =========================================
                  검색 + 정렬 + 필터
              ========================================= */}

              <div className="flex flex-col gap-2.5 border-t border-slate-100 pt-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <div className="relative min-w-0 flex-1 lg:max-w-[560px]">
                    <Search
                      size={15}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="프로젝트 검색"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3.5 text-xs font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#AAB8FF] focus:bg-white focus:ring-2 focus:ring-[#5873F9]/10"
                    />
                  </div>

                  <div className="relative shrink-0">
                    <Filter
                      size={12}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <select
                      value={projectListSortType}
                      onChange={(event) =>
                        setProjectListSortType(
                          event.target.value as ProjectListSortType,
                        )
                      }
                      className="h-10 w-[142px] appearance-none rounded-xl border border-slate-200 bg-white pl-8 pr-7 text-[11px] font-bold text-slate-600 outline-none transition hover:border-slate-300 focus:border-[#AAB8FF] focus:ring-2 focus:ring-[#5873F9]/10"
                    >
                      <option value="recent">최근 수정순</option>
                      <option value="name">이름순</option>
                      <option value="progress">진행률 높은순</option>
                    </select>

                    <svg
                      className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path
                        d="m6 8 4 4 4-4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>

                <div className="grid w-full grid-cols-3 rounded-xl bg-slate-100 p-1 lg:w-[220px]">
                  {FILTERS.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setFilter(item.key)}
                      className={`h-8 rounded-lg px-3 text-[11px] font-black transition ${
                        filter === item.key
                          ? "bg-white text-[#5873F9] shadow-[0_1px_4px_rgba(15,23,42,0.08)]"
                          : "text-slate-400 hover:text-slate-700"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* =============================================
              오류
          ============================================= */}

          {error && (
            <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
              {error}
            </section>
          )}

          {/* =============================================
              로딩
          ============================================= */}

          {loading && (
            <section className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <ProjectCardSkeleton key={index} />
              ))}
            </section>
          )}

          {/* =============================================
              결과 없음
          ============================================= */}

          {!loading && !error && filteredProjects.length === 0 && (
            <section className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
              <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-400">
                <Search size={20} />
              </div>

              <h2 className="mt-4 text-base font-black text-slate-900">
                검색 결과가 없습니다
              </h2>

              <p className="mt-1.5 text-xs font-medium text-slate-500">
                다른 키워드로 검색하거나 필터를 전체로 변경해보세요.
              </p>
            </section>
          )}

          {/* =============================================
              카드 목록
          ============================================= */}

          {!loading && !error && filteredProjects.length > 0 && (
            <section className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
              {filteredProjects.map((project) => (
                <ProjectDashboardCard
                  key={project.id}
                  project={project}
                  onChanged={loadDashboardProjects}
                  onNotify={showToast}
                />
              ))}
            </section>
          )}
        </div>
      </main>

      {/* ===============================================
          토스트
      =============================================== */}

      {toast && (
        <ToastNotification
          toast={toast}
          onClose={() =>
            setToast(null)
          }
        />
      )}
    </>
  );
}

/* =========================================================
   Summary
========================================================= */

function SummaryChip({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <span>{label}</span>

      <span className="font-black text-slate-950">
        {value}
      </span>
    </span>
  );
}

/* =========================================================
   프로젝트 카드
========================================================= */

function ProjectDashboardCard({
  project,
  onChanged,
  onNotify,
}: {
  project: DashboardCardItem;
  onChanged: () => Promise<void>;
  onNotify: (
    type: ToastType,
    message: string,
  ) => void;
}) {
  const isCompleted =
    project.status ===
    "completed";

  /*
   * OWNER / MEMBER 판단
   */
  const isOwner =
    project.role === "owner";

  const menuRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [
    modalType,
    setModalType,
  ] =
    useState<ProjectModalType>(
      null,
    );

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  /* =======================================================
     수정 데이터
  ======================================================= */

  const [editName, setEditName] =
    useState(project.title);

  const [
    editDescription,
    setEditDescription,
  ] = useState(
    project.description ===
      "설명이 없습니다."
      ? ""
      : project.description,
  );

  /* =======================================================
     복제 데이터
  ======================================================= */

  const [
    duplicateName,
    setDuplicateName,
  ] = useState(
    `${project.title} 복사본`,
  );

  const [
    duplicateDescription,
    setDuplicateDescription,
  ] = useState(
    project.description ===
      "설명이 없습니다."
      ? ""
      : project.description,
  );

  /* =======================================================
     삭제 확인
  ======================================================= */

  const [
    deleteConfirmText,
    setDeleteConfirmText,
  ] = useState("");

  /* =======================================================
     메뉴 외부 클릭
  ======================================================= */

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handleMouseDown = (
      event: MouseEvent,
    ) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target as Node,
        )
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleMouseDown,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleMouseDown,
      );
    };
  }, [menuOpen]);

  /* =======================================================
     모달 열기
  ======================================================= */

  function openModal(
    type: ProjectModalType,
  ) {
    setMenuOpen(false);

    if (type === "edit") {
      setEditName(
        project.title,
      );

      setEditDescription(
        project.description ===
          "설명이 없습니다."
          ? ""
          : project.description,
      );
    }

    if (
      type === "duplicate"
    ) {
      setDuplicateName(
        `${project.title} 복사본`,
      );

      setDuplicateDescription(
        project.description ===
          "설명이 없습니다."
          ? ""
          : project.description,
      );
    }

    if (type === "delete") {
      setDeleteConfirmText("");
    }

    setModalType(type);
  }

  function closeModal() {
    if (submitting) {
      return;
    }

    setModalType(null);
  }

  /* =======================================================
     프로젝트 수정
  ======================================================= */

  async function handleEditSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!isOwner) {
      onNotify(
        "error",
        "프로젝트 OWNER만 수정할 수 있습니다.",
      );

      return;
    }

    const name =
      editName.trim();

    const description =
      editDescription.trim();

    if (!name) {
      onNotify(
        "error",
        "프로젝트 이름을 입력해주세요.",
      );

      return;
    }

    try {
      setSubmitting(true);

      const response =
        await apiFetch(
          `/api/workspaces/${encodeURIComponent(
            project.id,
          )}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(
              {
                name,
                description,
              },
            ),
          },
        );

      await assertApiSuccess(
        response,
        "프로젝트 수정에 실패했습니다.",
      );

      setModalType(null);

      onNotify(
        "success",
        "프로젝트 정보가 수정되었습니다.",
      );

      await onChanged();
    } catch (err) {
      console.error(
        "[workspace edit]",
        err,
      );

      onNotify(
        "error",
        err instanceof Error
          ? err.message
          : "프로젝트 수정 중 오류가 발생했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* =======================================================
     프로젝트 복제
  ======================================================= */

  async function handleDuplicateSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!isOwner) {
      onNotify(
        "error",
        "프로젝트 OWNER만 복제할 수 있습니다.",
      );

      return;
    }

    const name =
      duplicateName.trim();

    const description =
      duplicateDescription.trim();

    if (!name) {
      onNotify(
        "error",
        "복제할 프로젝트 이름을 입력해주세요.",
      );

      return;
    }

    try {
      setSubmitting(true);

      const response =
        await apiFetch(
          `/api/workspaces/${encodeURIComponent(
            project.id,
          )}/duplicate`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(
              {
                name,
                description,
              },
            ),
          },
        );

      await assertApiSuccess(
        response,
        "프로젝트 복제에 실패했습니다.",
      );

      setModalType(null);

      onNotify(
        "success",
        `"${project.title}" 프로젝트가 복제되었습니다.`,
      );

      await onChanged();
    } catch (err) {
      console.error(
        "[workspace duplicate]",
        err,
      );

      onNotify(
        "error",
        err instanceof Error
          ? err.message
          : "프로젝트 복제 중 오류가 발생했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* =======================================================
     프로젝트 삭제
  ======================================================= */

  async function handleDeleteProject() {
    if (!isOwner) {
      onNotify(
        "error",
        "프로젝트 OWNER만 삭제할 수 있습니다.",
      );

      return;
    }

    if (
      deleteConfirmText.trim() !==
      project.title
    ) {
      return;
    }

    try {
      setSubmitting(true);

      const response =
        await apiFetch(
          `/api/workspaces/${encodeURIComponent(
            project.id,
          )}`,
          {
            method: "DELETE",
          },
        );

      await assertApiSuccess(
        response,
        "프로젝트 삭제에 실패했습니다.",
      );

      setModalType(null);

      onNotify(
        "success",
        `"${project.title}" 프로젝트가 삭제되었습니다.`,
      );

      await onChanged();
    } catch (err) {
      console.error(
        "[workspace delete]",
        err,
      );

      onNotify(
        "error",
        err instanceof Error
          ? err.message
          : "프로젝트 삭제 중 오류가 발생했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* =======================================================
     프로젝트 나가기
  ======================================================= */

  async function handleLeaveProject() {
    /*
     * 개인 프로젝트는 나가기 대상 아님
     */
    if (
      project.type !== "team"
    ) {
      onNotify(
        "error",
        "개인 프로젝트에서는 나가기 기능을 사용할 수 없습니다.",
      );

      return;
    }

    /*
     * OWNER는 나가기 불가
     */
    if (isOwner) {
      onNotify(
        "error",
        "프로젝트 OWNER는 프로젝트를 나갈 수 없습니다.",
      );

      return;
    }

    try {
      setSubmitting(true);

      const response =
        await apiFetch(
          `/api/workspaces/${encodeURIComponent(
            project.id,
          )}/leave`,
          {
            method: "DELETE",
          },
        );

      await assertApiSuccess(
        response,
        "프로젝트 나가기에 실패했습니다.",
      );

      setModalType(null);

      onNotify(
        "success",
        `"${project.title}" 프로젝트에서 나갔습니다.`,
      );

      await onChanged();
    } catch (err) {
      console.error(
        "[workspace leave]",
        err,
      );

      onNotify(
        "error",
        err instanceof Error
          ? err.message
          : "프로젝트 나가기 중 오류가 발생했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <article
        className={`group relative flex min-h-[320px] flex-col overflow-visible rounded-2xl border bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] ${
          isCompleted
            ? "border-violet-200 hover:border-violet-300"
            : project.type === "team"
              ? "border-emerald-100 hover:border-[#BFCBFF]"
              : "border-slate-200 hover:border-[#BFCBFF]"
        }`}
      >
        {/* ===============================================
            카드 상단
        =============================================== */}

        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-black ${getTypeStyle(
                project.type,
              )}`}
            >
              {project.type === "team" ? (
                <Users size={12} strokeWidth={2.4} />
              ) : (
                <UserRound size={12} strokeWidth={2.4} />
              )}
              {getTypeLabel(project.type)}
            </span>

            <span className="inline-flex h-6 items-center rounded-full bg-slate-100 px-2.5 text-[10px] font-bold text-slate-500">
              {project.tech}
            </span>

            {project.type === "team" && (
              <span className="inline-flex h-6 items-center rounded-full border border-slate-200 bg-white px-2.5 text-[9px] font-black text-slate-500">
                {isOwner ? "OWNER" : "MEMBER"}
              </span>
            )}

            {isCompleted && (
              <span className="inline-flex h-6 items-center rounded-full bg-violet-50 px-2.5 text-[10px] font-black text-violet-600">
                완료
              </span>
            )}
          </div>

          <div ref={menuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="프로젝트 메뉴"
              className={`grid h-8 w-8 place-items-center rounded-lg border transition ${
                menuOpen
                  ? "border-[#C8D2FF] bg-[#F2F5FF] text-[#5873F9]"
                  : "border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              <MoreHorizontal size={17} />
            </button>

            {/* =========================================
                OWNER / MEMBER 메뉴
            ========================================= */}

            {menuOpen && (
              <div className="absolute right-0 top-9 z-40 w-[190px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70">
                {isOwner ? (
                  <>
                    <button
                      type="button"
                      onClick={() => openModal("edit")}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                    >
                      <Pencil size={15} className="text-slate-400" />
                      프로젝트 수정
                    </button>

                    <button
                      type="button"
                      onClick={() => openModal("duplicate")}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                    >
                      <Copy size={15} className="text-slate-400" />
                      프로젝트 복제
                    </button>

                    <div className="my-1 h-px bg-slate-100" />

                    <button
                      type="button"
                      onClick={() => openModal("delete")}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-bold text-rose-600 transition hover:bg-rose-50"
                    >
                      <Trash2 size={15} />
                      프로젝트 삭제
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => openModal("leave")}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-bold text-rose-600 transition hover:bg-rose-50"
                  >
                    <LogOut size={15} />
                    프로젝트 나가기
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ===============================================
            프로젝트 정보
        =============================================== */}

        <div className="mt-4 min-w-0">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <h3
              className={`min-w-0 flex-1 truncate text-[17px] font-black leading-6 tracking-tight transition ${
                isCompleted
                  ? "text-violet-700"
                  : "text-slate-950 group-hover:text-[#4F68E8]"
              }`}
            >
              {project.title}
            </h3>

            <span className="shrink-0 text-[15px] font-black text-[#5873F9]">
              {project.progress}%
            </span>
          </div>

          <p className="mt-1.5 line-clamp-1 min-h-[18px] text-[11px] font-medium leading-[18px] text-slate-400">
            {project.description}
          </p>
        </div>

        {/* ===============================================
            진행률 / 최근 수정
        =============================================== */}

        <div className="mt-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#5873F9] transition-all duration-500"
              style={{ width: `${project.progress}%` }}
            />
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-3 text-[10px] font-semibold text-slate-400">
            <span>최근 수정</span>
            <span className="font-bold text-slate-500">
              {formatDate(project.lastModified)}
            </span>
          </div>
        </div>

        {/* ===============================================
            하단 바로가기
        =============================================== */}

        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="grid grid-cols-2 gap-2">
            <CardActionLink
              href={getDashboardHref(project)}
              icon={<LayoutDashboard size={14} />}
              label="프로젝트 열기"
              primary
              className="col-span-2"
            />

            <CardActionLink
              href={getScheduleHref(project.id, project.type)}
              icon={<CalendarDays size={13} />}
              label="일정관리"
            />

            <CardActionLink
              href={getDevlogHref(project.id)}
              icon={<BookOpenText size={13} />}
              label="개발일지"
            />

            <CardActionLink
              href={getAivsHref(project.id, project.type)}
              icon={<Code2 size={13} />}
              label="AIVS"
            />

            <CardActionLink
              href={getAiReportHref(project)}
              icon={<FileText size={13} />}
              label="AI 보고서"
            />
          </div>
        </div>
      </article>

      {/* =================================================
          수정 모달
      ================================================= */}

      {modalType === "edit" && (
        <ProjectModal
          title="프로젝트 수정"
          description="프로젝트의 이름과 설명을 수정할 수 있습니다."
          onClose={closeModal}
          disabled={submitting}
        >
          <form
            onSubmit={
              handleEditSubmit
            }
          >
            <div className="space-y-5">

              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  프로젝트 이름
                </label>

                <input
                  type="text"
                  value={editName}
                  onChange={(e) =>
                    setEditName(
                      e.target
                        .value,
                    )
                  }
                  autoFocus
                  maxLength={100}
                  placeholder="프로젝트 이름"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  프로젝트 설명
                </label>

                <textarea
                  value={
                    editDescription
                  }
                  onChange={(e) =>
                    setEditDescription(
                      e.target
                        .value,
                    )
                  }
                  rows={4}
                  maxLength={500}
                  placeholder="프로젝트 설명을 입력해주세요."
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />

                <div className="mt-1.5 text-right text-xs font-semibold text-slate-400">
                  {
                    editDescription.length
                  }
                  /500
                </div>
              </div>
            </div>

            <div className="mt-7 flex justify-end gap-2">

              <button
                type="button"
                onClick={
                  closeModal
                }
                disabled={
                  submitting
                }
                className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                취소
              </button>

              <button
                type="submit"
                disabled={
                  submitting ||
                  !editName.trim()
                }
                className="flex h-11 min-w-[120px] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {submitting ? (
                  <>
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />

                    수정 중
                  </>
                ) : (
                  <>
                    <Pencil
                      size={15}
                    />

                    수정 완료
                  </>
                )}
              </button>
            </div>
          </form>
        </ProjectModal>
      )}

      {/* =================================================
          복제 모달
      ================================================= */}

      {modalType ===
        "duplicate" && (
        <ProjectModal
          title="프로젝트 복제"
          description="현재 프로젝트를 기반으로 새로운 프로젝트를 생성합니다."
          onClose={closeModal}
          disabled={submitting}
        >
          <form
            onSubmit={
              handleDuplicateSubmit
            }
          >
            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">

              <div className="flex items-start gap-3">

                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-blue-600 shadow-sm">
                  <Copy
                    size={17}
                  />
                </div>

                <div>
                  <p className="text-sm font-black text-slate-900">
                    원본 프로젝트
                  </p>

                  <p className="mt-1 text-sm font-semibold text-blue-700">
                    {project.title}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-5">

              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  새 프로젝트 이름
                </label>

                <input
                  type="text"
                  value={
                    duplicateName
                  }
                  onChange={(e) =>
                    setDuplicateName(
                      e.target
                        .value,
                    )
                  }
                  autoFocus
                  maxLength={100}
                  placeholder="복제할 프로젝트 이름"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  프로젝트 설명
                </label>

                <textarea
                  value={
                    duplicateDescription
                  }
                  onChange={(e) =>
                    setDuplicateDescription(
                      e.target
                        .value,
                    )
                  }
                  rows={4}
                  maxLength={500}
                  placeholder="복제된 프로젝트의 설명"
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs font-semibold leading-5 text-slate-500">
                기존 프로젝트의
                하위 프로젝트와 실제
                작업 폴더를 복제합니다.
                팀 프로젝트를 복제할
                경우 기존 팀원은 새
                프로젝트에 자동으로
                포함되지 않습니다.
              </div>
            </div>

            <div className="mt-7 flex justify-end gap-2">

              <button
                type="button"
                onClick={
                  closeModal
                }
                disabled={
                  submitting
                }
                className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                취소
              </button>

              <button
                type="submit"
                disabled={
                  submitting ||
                  !duplicateName.trim()
                }
                className="flex h-11 min-w-[130px] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {submitting ? (
                  <>
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />

                    복제 중
                  </>
                ) : (
                  <>
                    <Copy
                      size={16}
                    />

                    프로젝트 복제
                  </>
                )}
              </button>
            </div>
          </form>
        </ProjectModal>
      )}

      {/* =================================================
          삭제 모달
      ================================================= */}

      {modalType ===
        "delete" && (
        <ProjectModal
          title="프로젝트 삭제"
          description="삭제하기 전에 아래 내용을 확인해주세요."
          onClose={closeModal}
          disabled={submitting}
          danger
        >
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">

            <div className="flex items-start gap-3">

              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-rose-600 shadow-sm">
                <AlertTriangle
                  size={19}
                />
              </div>

              <div>
                <p className="text-sm font-black text-rose-900">
                  이 작업은 되돌릴
                  수 없습니다.
                </p>

                <p className="mt-1.5 text-xs font-semibold leading-5 text-rose-700">
                  프로젝트와 연결된
                  하위 프로젝트, 일정,
                  개발일지, 설계 데이터
                  등이 함께 삭제될 수
                  있습니다.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5">

            <p className="text-sm font-semibold leading-6 text-slate-600">
              계속하려면 프로젝트
              이름
              <span className="mx-1 font-black text-slate-950">
                {project.title}
              </span>
              을(를) 아래에
              입력해주세요.
            </p>

            <input
              type="text"
              value={
                deleteConfirmText
              }
              onChange={(e) =>
                setDeleteConfirmText(
                  e.target.value,
                )
              }
              autoFocus
              placeholder={
                project.title
              }
              className="mt-3 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
            />
          </div>

          <div className="mt-7 flex justify-end gap-2">

            <button
              type="button"
              onClick={
                closeModal
              }
              disabled={
                submitting
              }
              className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              취소
            </button>

            <button
              type="button"
              onClick={
                handleDeleteProject
              }
              disabled={
                submitting ||
                deleteConfirmText.trim() !==
                  project.title
              }
              className="flex h-11 min-w-[140px] items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 text-sm font-black text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {submitting ? (
                <>
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />

                  삭제 중
                </>
              ) : (
                <>
                  <Trash2
                    size={16}
                  />

                  프로젝트 삭제
                </>
              )}
            </button>
          </div>
        </ProjectModal>
      )}

      {/* =================================================
          MEMBER 프로젝트 나가기 모달
      ================================================= */}

      {modalType ===
        "leave" && (
        <ProjectModal
          title="프로젝트 나가기"
          description="팀 프로젝트에서 나가시겠습니까?"
          onClose={closeModal}
          disabled={submitting}
          danger
        >
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">

            <div className="flex items-start gap-3">

              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-amber-600 shadow-sm">
                <LogOut
                  size={19}
                />
              </div>

              <div className="min-w-0">

                <p className="break-words text-sm font-black text-slate-900">
                  {project.title}
                </p>

                <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-600">
                  프로젝트에서 나가면
                  더 이상 해당
                  프로젝트에 접근할 수
                  없습니다.
                </p>

                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                  프로젝트 자체와 다른
                  팀원의 데이터는
                  삭제되지 않습니다.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold leading-5 text-slate-500">
              다시 참여하려면 프로젝트
              OWNER에게 새로운 초대를
              받아야 합니다.
            </p>
          </div>

          <div className="mt-7 flex justify-end gap-2">

            <button
              type="button"
              onClick={
                closeModal
              }
              disabled={
                submitting
              }
              className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              취소
            </button>

            <button
              type="button"
              onClick={
                handleLeaveProject
              }
              disabled={
                submitting
              }
              className="flex h-11 min-w-[140px] items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 text-sm font-black text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {submitting ? (
                <>
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />

                  나가는 중
                </>
              ) : (
                <>
                  <LogOut
                    size={16}
                  />

                  프로젝트 나가기
                </>
              )}
            </button>
          </div>
        </ProjectModal>
      )}
    </>
  );
}

/* =========================================================
   공통 모달
========================================================= */

function ProjectModal({
  title,
  description,
  children,
  onClose,
  disabled = false,
  danger = false,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onClose: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key ===
          "Escape" &&
        !disabled
      ) {
        onClose();
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    const originalOverflow =
      document.body.style
        .overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      document.body.style.overflow =
        originalOverflow;
    };
  }, [
    disabled,
    onClose,
  ]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !disabled
        ) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[540px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">

          <div>

            <h2
              className={`text-xl font-black ${
                danger
                  ? "text-rose-700"
                  : "text-slate-950"
              }`}
            >
              {title}
            </h2>

            <p className="mt-1 text-sm font-medium text-slate-500">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            aria-label="닫기"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={19} />
          </button>
        </div>

        <div className="px-6 py-6">
          {children}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   토스트
========================================================= */

function ToastNotification({
  toast,
  onClose,
}: {
  toast: Exclude<
    ToastState,
    null
  >;
  onClose: () => void;
}) {
  const success =
    toast.type ===
    "success";

  return (
    <div
      className={`fixed right-5 top-24 z-[200] flex w-[360px] max-w-[calc(100vw-40px)] items-start gap-3 rounded-2xl border bg-white p-4 shadow-xl ${
        success
          ? "border-emerald-200"
          : "border-rose-200"
      }`}
    >

      <div
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
          success
            ? "bg-emerald-50 text-emerald-600"
            : "bg-rose-50 text-rose-600"
        }`}
      >
        {success ? (
          <CheckCircle2
            size={18}
          />
        ) : (
          <XCircle
            size={18}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">

        <p className="text-sm font-black text-slate-900">
          {success
            ? "처리 완료"
            : "처리 실패"}
        </p>

        <p className="mt-1 break-words text-sm font-medium leading-5 text-slate-500">
          {toast.message}
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
      >
        <X size={16} />
      </button>
    </div>
  );
}

/* =========================================================
   카드 하단 링크
========================================================= */

function CardActionLink({
  href,
  icon,
  label,
  primary = false,
  className = "",
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-center gap-1.5 rounded-xl text-[11px] font-black transition ${className} ${
        primary
          ? "h-10 bg-[#5873F9] text-white shadow-sm hover:bg-[#4863E8]"
          : "h-10 border border-slate-200 bg-white text-slate-600 hover:border-[#C8D2FF] hover:bg-[#F7F9FF] hover:text-[#5873F9]"
      }`}
    >
      {icon}

      <span>
        {label}
      </span>

      {primary && (
        <ArrowRight
          size={14}
        />
      )}
    </Link>
  );
}

/* =========================================================
   스켈레톤
========================================================= */

function ProjectCardSkeleton() {
  return (
    <div className="min-h-[320px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />
          <div className="h-6 w-24 animate-pulse rounded-full bg-slate-100" />
        </div>

        <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-100" />
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="h-5 w-1/2 animate-pulse rounded-md bg-slate-100" />
        <div className="h-5 w-10 animate-pulse rounded-md bg-slate-100" />
      </div>

      <div className="mt-2.5 h-3.5 w-3/4 animate-pulse rounded-md bg-slate-100" />
      <div className="mt-5 h-1.5 w-full animate-pulse rounded-full bg-slate-100" />
      <div className="mt-2.5 ml-auto h-3 w-20 animate-pulse rounded-md bg-slate-100" />

      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100" />

        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
