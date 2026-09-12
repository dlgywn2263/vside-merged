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
} from "lucide-react";

import {
  getAivsHref,
  getDevlogHref,
  getScheduleHref,
} from "@/components/main-dashboard/dashboard.utils";

import { apiFetch, apiJson } from "@/lib/api/apiClient";

/* =========================================================
   타입
========================================================= */

type ProjectType = "personal" | "team";

type ProjectRole = "owner" | "member";

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
  return `/ai-report?workspaceId=${encodeURIComponent(
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

function getProgressTextStyle(
  type: ProjectType,
) {
  return type === "team"
    ? "text-emerald-600"
    : "text-blue-600";
}

function getProgressBarStyle(
  type: ProjectType,
) {
  return type === "team"
    ? "bg-emerald-500"
    : "bg-blue-600";
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

  /* =======================================================
     필터
  ======================================================= */

  const filteredProjects =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      return projects.filter(
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
    }, [
      filter,
      search,
      projects,
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
      <main className="min-h-screen bg-[#f5f6fa] p-4 text-slate-900 md:p-5">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4">

          {/* =============================================
              프로젝트 선택 헤더
          ============================================= */}

          <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-sm">
            <div className="flex flex-col gap-4">

              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-950">
                    프로젝트 선택
                  </h1>

                  <p className="mt-1.5 text-sm font-medium text-slate-500">
                    작업할 최상위 프로젝트를
                    선택하세요. 선택 후 해당
                    프로젝트의 메인, AIVS,
                    일정관리, 개발일지, AI
                    보고서로 이동할 수 있습니다.
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">

                  <button
                    type="button"
                    onClick={
                      loadDashboardProjects
                    }
                    className="flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    <RefreshCw
                      size={16}
                    />

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
                    className="flex h-10 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700"
                  >
                    <Plus size={17} />

                    새 프로젝트 생성
                  </Link>
                </div>
              </div>

              {/* =========================================
                  요약
              ========================================= */}

              <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-500">

                <SummaryChip
                  label="전체"
                  value={`${totalCount}개`}
                />

                <span className="text-slate-300">
                  ·
                </span>

                <SummaryChip
                  label="팀"
                  value={`${teamCount}개`}
                />

                <span className="text-slate-300">
                  ·
                </span>

                <SummaryChip
                  label="개인"
                  value={`${personalCount}개`}
                />

                <span className="text-slate-300">
                  ·
                </span>

                <SummaryChip
                  label="평균 진행률"
                  value={`${averageProgress}%`}
                />

                <span className="text-slate-300">
                  ·
                </span>

                <span className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-500">
                  표시{" "}
                  {
                    filteredProjects.length
                  }
                  개 / 전체{" "}
                  {totalCount}개
                </span>
              </div>

              {/* =========================================
                  검색 + 필터
              ========================================= */}

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 lg:flex-row lg:items-center lg:justify-between">

                <div className="relative w-full lg:max-w-[620px]">

                  <Search
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    value={search}
                    onChange={(e) =>
                      setSearch(
                        e.target
                          .value,
                      )
                    }
                    placeholder="최상위 프로젝트 검색"
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div className="flex w-full items-center rounded-2xl bg-slate-100 p-1 lg:w-auto">
                  {FILTERS.map(
                    (item) => (
                      <button
                        key={
                          item.key
                        }
                        type="button"
                        onClick={() =>
                          setFilter(
                            item.key,
                          )
                        }
                        className={`h-9 flex-1 rounded-xl px-5 text-sm font-black transition lg:flex-none ${
                          filter ===
                          item.key
                            ? "bg-slate-950 text-white shadow-sm"
                            : "text-slate-500 hover:bg-white hover:text-slate-900"
                        }`}
                      >
                        {
                          item.label
                        }
                      </button>
                    ),
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* =============================================
              오류
          ============================================= */}

          {error && (
            <section className="rounded-[24px] border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700">
              {error}
            </section>
          )}

          {/* =============================================
              로딩
          ============================================= */}

          {loading && (
            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({
                length: 6,
              }).map(
                (_, index) => (
                  <ProjectCardSkeleton
                    key={index}
                  />
                ),
              )}
            </section>
          )}

          {/* =============================================
              결과 없음
          ============================================= */}

          {!loading &&
            !error &&
            filteredProjects.length ===
              0 && (
              <section className="rounded-[28px] border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">

                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                  <Search
                    size={24}
                  />
                </div>

                <h2 className="mt-5 text-xl font-black">
                  검색 결과가
                  없습니다
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  다른 키워드로
                  검색하거나 필터를
                  전체로 변경해보세요.
                </p>
              </section>
            )}

          {/* =============================================
              카드 목록
          ============================================= */}

          {!loading &&
            !error &&
            filteredProjects.length >
              0 && (
              <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredProjects.map(
                  (project) => (
                    <ProjectDashboardCard
                      key={
                        project.id
                      }
                      project={
                        project
                      }
                      onChanged={
                        loadDashboardProjects
                      }
                      onNotify={
                        showToast
                      }
                    />
                  ),
                )}
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
        className={`group relative flex min-h-[350px] flex-col rounded-[26px] border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
          isCompleted
            ? "border-purple-200 hover:border-purple-300"
            : "border-slate-200 hover:border-blue-200"
        }`}
      >

        {/* ===============================================
            카드 상단
        =============================================== */}

        <div className="flex items-start justify-between gap-4">

          <div className="flex flex-wrap items-center gap-2">

            <span
              className={`rounded-full px-3 py-1 text-xs font-black ${getTypeStyle(
                project.type,
              )}`}
            >
              {getTypeLabel(
                project.type,
              )}
            </span>

            {isCompleted && (
              <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-black text-purple-700">
                완료
              </span>
            )}

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
              {project.tech}
            </span>
          </div>

          {/* =============================================
              진행률 + 메뉴
          ============================================= */}

          <div className="flex shrink-0 items-start gap-2">

            <div className="rounded-2xl bg-slate-50 px-3.5 py-2.5 text-right">

              <p className="text-[11px] font-bold text-slate-400">
                진행률
              </p>

              <p
                className={`mt-0.5 text-xl font-black ${
                  isCompleted
                    ? "text-purple-600"
                    : getProgressTextStyle(
                        project.type,
                      )
                }`}
              >
                {project.progress}%
              </p>
            </div>

            <div
              ref={menuRef}
              className="relative"
            >

              <button
                type="button"
                onClick={() =>
                  setMenuOpen(
                    (prev) =>
                      !prev,
                  )
                }
                aria-label="프로젝트 메뉴"
                className={`grid h-9 w-9 place-items-center rounded-xl border transition ${
                  menuOpen
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <MoreHorizontal
                  size={19}
                />
              </button>

              {/* =========================================
                  OWNER / MEMBER 메뉴
              ========================================= */}

              {menuOpen && (
                <div className="absolute right-0 top-11 z-40 w-[190px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70">

                  {isOwner ? (
                    <>
                      {/* 수정 */}
                      <button
                        type="button"
                        onClick={() =>
                          openModal(
                            "edit",
                          )
                        }
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                      >
                        <Pencil
                          size={16}
                          className="text-slate-400"
                        />

                        프로젝트 수정
                      </button>

                      {/* 복제 */}
                      <button
                        type="button"
                        onClick={() =>
                          openModal(
                            "duplicate",
                          )
                        }
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                      >
                        <Copy
                          size={16}
                          className="text-slate-400"
                        />

                        프로젝트 복제
                      </button>

                      <div className="my-1 h-px bg-slate-100" />

                      {/* 삭제 */}
                      <button
                        type="button"
                        onClick={() =>
                          openModal(
                            "delete",
                          )
                        }
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-rose-600 transition hover:bg-rose-50"
                      >
                        <Trash2
                          size={16}
                        />

                        프로젝트 삭제
                      </button>
                    </>
                  ) : (
                    <>
                      {/* MEMBER 나가기 */}
                      <button
                        type="button"
                        onClick={() =>
                          openModal(
                            "leave",
                          )
                        }
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-rose-600 transition hover:bg-rose-50"
                      >
                        <LogOut
                          size={16}
                        />

                        프로젝트 나가기
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===============================================
            프로젝트 정보
        =============================================== */}

        <div className="flex-1">

          <h3
            className={`mt-3 line-clamp-2 text-2xl font-black leading-tight transition ${
              isCompleted
                ? "text-purple-700"
                : "text-slate-950"
            }`}
          >
            {project.title}
          </h3>

          <p className="mt-3 line-clamp-2 min-h-[44px] text-sm leading-6 text-slate-500">
            {project.description}
          </p>
        </div>

        {/* ===============================================
            진행률
        =============================================== */}

        <div className="mt-5">

          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">

            <span>
              최근 수정일
            </span>

            <span>
              {formatDate(
                project.lastModified,
              )}
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-slate-100">

            <div
              className={`h-full rounded-full transition-all ${
                isCompleted
                  ? "bg-purple-500"
                  : getProgressBarStyle(
                      project.type,
                    )
              }`}
              style={{
                width: `${project.progress}%`,
              }}
            />
          </div>
        </div>

        {/* ===============================================
            프로젝트 유형
        =============================================== */}

        <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-500">

          {project.type ===
          "team" ? (
            <Users size={16} />
          ) : (
            <UserRound
              size={16}
            />
          )}

          <span>
            {project.type ===
            "team"
              ? "팀 작업"
              : "개인 작업"}
          </span>

          {project.type ===
            "team" && (
            <>
              <span className="text-slate-300">
                ·
              </span>

              <span
                className={
                  isOwner
                    ? "font-bold text-emerald-600"
                    : "font-bold text-slate-500"
                }
              >
                {isOwner
                  ? "OWNER"
                  : "MEMBER"}
              </span>
            </>
          )}
        </div>

        {/* ===============================================
            하단 바로가기
        =============================================== */}

        <div className="mt-5 border-t border-slate-100 pt-4">

          <div className="grid grid-cols-2 gap-2">

            <CardActionLink
              href={getDashboardHref(
                project,
              )}
              icon={
                <LayoutDashboard
                  size={16}
                />
              }
              label="프로젝트 열기"
              primary
              className="col-span-2"
            />

            <CardActionLink
              href={getScheduleHref(
                project.id,
                project.type,
              )}
              icon={
                <CalendarDays
                  size={15}
                />
              }
              label="일정관리"
            />

            <CardActionLink
              href={getDevlogHref(
                project.id,
              )}
              icon={
                <BookOpenText
                  size={15}
                />
              }
              label="개발일지"
            />

            <CardActionLink
              href={getAivsHref(
                project.id,
                project.type,
              )}
              icon={
                <Code2
                  size={15}
                />
              }
              label="AIVS"
            />

            <CardActionLink
              href={getAiReportHref(
                project,
              )}
              icon={
                <FileText
                  size={15}
                />
              }
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
      className={`flex items-center justify-center gap-1.5 rounded-2xl text-xs font-black transition ${className} ${
        primary
          ? "h-10 bg-blue-600 text-white shadow-sm hover:bg-blue-700"
          : "h-10 border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
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
    <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-center justify-between">

        <div className="h-7 w-28 animate-pulse rounded-full bg-slate-100" />

        <div className="flex gap-2">

          <div className="h-14 w-16 animate-pulse rounded-2xl bg-slate-100" />

          <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>

      <div className="mt-6 h-6 w-2/3 animate-pulse rounded-lg bg-slate-100" />

      <div className="mt-4 h-4 w-full animate-pulse rounded-lg bg-slate-100" />

      <div className="mt-2 h-4 w-3/4 animate-pulse rounded-lg bg-slate-100" />

      <div className="mt-6 h-2 w-full animate-pulse rounded-full bg-slate-100" />

      <div className="mt-6 grid grid-cols-2 gap-2">

        <div className="col-span-2 h-12 animate-pulse rounded-2xl bg-slate-100" />

        <div className="h-10 animate-pulse rounded-2xl bg-slate-100" />

        <div className="h-10 animate-pulse rounded-2xl bg-slate-100" />

        <div className="h-10 animate-pulse rounded-2xl bg-slate-100" />

        <div className="h-10 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    </div>
  );
}