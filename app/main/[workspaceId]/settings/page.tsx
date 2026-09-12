"use client";

import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  FolderOpen,
  Loader2,
  LogOut,
  Mail,
  Save,
  Settings2,
  Trash2,
  UserPlus,
  UsersRound,
  X,
  XCircle,
} from "lucide-react";

import { getMyWorkspacesByTokenApi } from "@/lib/ide/api";

import {
  apiFetch,
  apiJson,
} from "@/lib/api/apiClient";

import type {
  WorkspaceListResponse,
  WorkspaceMode,
} from "@/components/main-dashboard/dashboard.types";

import ProjectSidebar, {
  type WorkspaceSidebarItem,
} from "@/components/layout/ProjectSidebar";

/* =========================================================
   TYPE
========================================================= */

type WorkspaceMemberResponse = {
  userId: number;
  email: string;
  nickname?: string | null;
  role: string;
};

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

type ModalType =
  | "duplicate"
  | "delete"
  | "leave"
  | null;

/* =========================================================
   UTIL
========================================================= */

function normalizeRole(
  role?: string | null,
) {
  return role
    ?.trim()
    .toLowerCase() === "owner"
    ? "owner"
    : "member";
}

function normalizeMode(
  mode?: string | null,
): WorkspaceMode {
  return mode
    ?.trim()
    .toLowerCase() === "team"
    ? "team"
    : "personal";
}

function getWorkspaceName(
  workspace?: WorkspaceListResponse | null,
) {
  return (
    workspace?.name?.trim() ||
    "이름 없는 프로젝트"
  );
}

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
    // ignore
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
   PAGE
========================================================= */

export default function ProjectSettingsPage() {
  const router = useRouter();

  const params =
    useParams<{
      workspaceId?:
        | string
        | string[];
    }>();

  const searchParams =
    useSearchParams();

  const rawWorkspaceId =
    Array.isArray(
      params.workspaceId,
    )
      ? params.workspaceId[0]
      : params.workspaceId;

  const workspaceId =
    rawWorkspaceId ?? "";

  const queryMode =
    normalizeMode(
      searchParams.get("mode"),
    );

  /* =======================================================
     DATA
  ======================================================= */

  const [
    allWorkspaces,
    setAllWorkspaces,
  ] = useState<
    WorkspaceListResponse[]
  >([]);

  const [
    workspace,
    setWorkspace,
  ] =
    useState<WorkspaceListResponse | null>(
      null,
    );

  const [
    members,
    setMembers,
  ] = useState<
    WorkspaceMemberResponse[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  /* =======================================================
     BASIC INFO
  ======================================================= */

  const [
    editName,
    setEditName,
  ] = useState("");

  const [
    editDescription,
    setEditDescription,
  ] = useState("");

  const [
    saving,
    setSaving,
  ] = useState(false);

  /* =======================================================
     TEAM INVITE
  ======================================================= */

  const [
    inviteEmail,
    setInviteEmail,
  ] = useState("");

  const [
    inviting,
    setInviting,
  ] = useState(false);

  /* =======================================================
     MODAL
  ======================================================= */

  const [
    modalType,
    setModalType,
  ] = useState<ModalType>(
    null,
  );

  const [
    duplicateName,
    setDuplicateName,
  ] = useState("");

  const [
    duplicateDescription,
    setDuplicateDescription,
  ] = useState("");

  const [
    duplicating,
    setDuplicating,
  ] = useState(false);

  const [
    deleteConfirmText,
    setDeleteConfirmText,
  ] = useState("");

  const [
    dangerSubmitting,
    setDangerSubmitting,
  ] = useState(false);

  /* =======================================================
     TOAST
  ======================================================= */

  const [
    toast,
    setToast,
  ] = useState<ToastState>(
    null,
  );

  const mode: WorkspaceMode =
    workspace?.mode
      ? normalizeMode(
          workspace.mode,
        )
      : queryMode;

  const role =
    normalizeRole(
      workspace?.role,
    );

  const isOwner =
    role === "owner";

  const isTeam =
    mode === "team";

  const projectName =
    getWorkspaceName(
      workspace,
    );

  /* =======================================================
     TOAST
  ======================================================= */

  function showToast(
    type: "success" | "error",
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
      window.setTimeout(
        () => {
          setToast(null);
        },
        3000,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [toast]);

  /* =======================================================
     LOAD
  ======================================================= */

  async function loadPageData() {
    if (!workspaceId) {
      setErrorMessage(
        "워크스페이스 ID가 없습니다.",
      );

      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const result =
        await getMyWorkspacesByTokenApi();

      const workspaceList:
        WorkspaceListResponse[] =
        Array.isArray(result)
          ? result
          : [];

      const current =
        workspaceList.find(
          (item) =>
            String(item.id) ===
            String(workspaceId),
        ) ?? null;

      if (!current) {
        throw new Error(
          "선택한 프로젝트를 찾을 수 없습니다.",
        );
      }

      setAllWorkspaces(
        workspaceList,
      );

      setWorkspace(current);

      setEditName(
        current.name ?? "",
      );

      setEditDescription(
        current.description ?? "",
      );

      if (
        normalizeMode(
          current.mode,
        ) === "team"
      ) {
        try {
          const memberData =
            (await apiJson(
              `/api/workspaces/${encodeURIComponent(
                workspaceId,
              )}/members`,
              {
                cache:
                  "no-store",
              },
            )) as WorkspaceMemberResponse[];

          setMembers(
            Array.isArray(
              memberData,
            )
              ? memberData
              : [],
          );
        } catch (memberError) {
          console.error(
            "[settings members]",
            memberError,
          );

          setMembers([]);
        }
      } else {
        setMembers([]);
      }
    } catch (error) {
      console.error(
        "[settings load]",
        error,
      );

      setAllWorkspaces([]);
      setWorkspace(null);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "프로젝트 설정 정보를 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPageData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  /* =======================================================
     SIDEBAR
  ======================================================= */

  const sidebarWorkspaces =
    useMemo<
      WorkspaceSidebarItem[]
    >(
      () =>
        allWorkspaces.map(
          (item) => ({
            id: String(
              item.id,
            ),

            name:
              item.name?.trim() ||
              "이름 없는 프로젝트",

            mode:
              normalizeMode(
                item.mode,
              ),

            role:
              item.role,

            childCount:
              Array.isArray(
                item.projects,
              )
                ? item.projects
                    .length
                : 0,
          }),
        ),
      [allWorkspaces],
    );

  function handleSelectWorkspace(
    target: WorkspaceSidebarItem,
  ) {
    router.push(
      `/main/${encodeURIComponent(
        target.id,
      )}?mode=${target.mode}`,
    );
  }

  /* =======================================================
     UPDATE BASIC INFO
  ======================================================= */

  async function handleSaveProject(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!workspace) {
      return;
    }

    if (!isOwner) {
      showToast(
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
      showToast(
        "error",
        "프로젝트 이름을 입력해주세요.",
      );

      return;
    }

    try {
      setSaving(true);

      const response =
        await apiFetch(
          `/api/workspaces/${encodeURIComponent(
            workspaceId,
          )}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              name,
              description,
            }),
          },
        );

      await assertApiSuccess(
        response,
        "프로젝트 수정에 실패했습니다.",
      );

      showToast(
        "success",
        "프로젝트 정보가 수정되었습니다.",
      );

      await loadPageData();
    } catch (error) {
      console.error(
        "[settings update]",
        error,
      );

      showToast(
        "error",
        error instanceof Error
          ? error.message
          : "프로젝트 수정 중 오류가 발생했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     DUPLICATE
  ======================================================= */

  function openDuplicateModal() {
    setDuplicateName(
      `${projectName} 복사본`,
    );

    setDuplicateDescription(
      workspace?.description ?? "",
    );

    setModalType(
      "duplicate",
    );
  }

  async function handleDuplicateWorkspace(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!workspace) {
      return;
    }

    if (!isOwner) {
      showToast(
        "error",
        "OWNER만 프로젝트를 복제할 수 있습니다.",
      );

      return;
    }

    const name =
      duplicateName.trim();

    const description =
      duplicateDescription.trim();

    if (!name) {
      showToast(
        "error",
        "복제할 프로젝트 이름을 입력해주세요.",
      );

      return;
    }

    try {
      setDuplicating(true);

      const response =
        await apiFetch(
          `/api/workspaces/${encodeURIComponent(
            workspaceId,
          )}/duplicate`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              name,
              description,
            }),
          },
        );

      await assertApiSuccess(
        response,
        "프로젝트 복제에 실패했습니다.",
      );

      setModalType(null);

      setDuplicateName("");
      setDuplicateDescription("");

      await loadPageData();

      showToast(
        "success",
        "프로젝트가 복제되었습니다.",
      );
    } catch (error) {
      console.error(
        "[settings duplicate]",
        error,
      );

      showToast(
        "error",
        error instanceof Error
          ? error.message
          : "프로젝트 복제 중 오류가 발생했습니다.",
      );
    } finally {
      setDuplicating(false);
    }
  }

  /* =======================================================
     TEAM INVITE
  ======================================================= */

  async function handleInviteMember(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !isTeam ||
      !isOwner
    ) {
      return;
    }

    const email =
      inviteEmail.trim();

    if (!email) {
      showToast(
        "error",
        "초대할 이메일을 입력해주세요.",
      );

      return;
    }

    try {
      setInviting(true);

      const response =
        await apiFetch(
          "/api/workspaces/invite",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              workspaceId,
              email,
            }),
          },
        );

      await assertApiSuccess(
        response,
        "팀원 초대에 실패했습니다.",
      );

      setInviteEmail("");

      showToast(
        "success",
        "팀원 초대를 보냈습니다.",
      );
    } catch (error) {
      console.error(
        "[settings invite]",
        error,
      );

      showToast(
        "error",
        error instanceof Error
          ? error.message
          : "팀원 초대 중 오류가 발생했습니다.",
      );
    } finally {
      setInviting(false);
    }
  }

  /* =======================================================
     DELETE
  ======================================================= */

  async function handleDeleteWorkspace() {
    if (!workspace) {
      return;
    }

    if (
      deleteConfirmText.trim() !==
      projectName
    ) {
      return;
    }

    try {
      setDangerSubmitting(
        true,
      );

      const response =
        await apiFetch(
          `/api/workspaces/${encodeURIComponent(
            workspaceId,
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

      showToast(
        "success",
        "프로젝트가 삭제되었습니다.",
      );

      window.setTimeout(
        () => {
          router.replace(
            "/main",
          );
        },
        500,
      );
    } catch (error) {
      console.error(
        "[settings delete]",
        error,
      );

      showToast(
        "error",
        error instanceof Error
          ? error.message
          : "프로젝트 삭제 중 오류가 발생했습니다.",
      );
    } finally {
      setDangerSubmitting(
        false,
      );
    }
  }

  /* =======================================================
     LEAVE
  ======================================================= */

  async function handleLeaveWorkspace() {
    try {
      setDangerSubmitting(
        true,
      );

      const response =
        await apiFetch(
          `/api/workspaces/${encodeURIComponent(
            workspaceId,
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

      showToast(
        "success",
        "팀 프로젝트에서 나왔습니다.",
      );

      window.setTimeout(
        () => {
          router.replace(
            "/main",
          );
        },
        500,
      );
    } catch (error) {
      console.error(
        "[settings leave]",
        error,
      );

      showToast(
        "error",
        error instanceof Error
          ? error.message
          : "프로젝트 나가기 중 오류가 발생했습니다.",
      );
    } finally {
      setDangerSubmitting(
        false,
      );
    }
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loading &&
    !workspace
  ) {
    return (
      <main className="waivs-page p-4 md:p-5">
        <div className="mx-auto grid h-[420px] max-w-[1680px] place-items-center rounded-2xl border border-slate-200 bg-white">
          <div className="text-center">
            <Loader2
              size={25}
              className="mx-auto animate-spin text-[#5873F9]"
            />

            <p className="mt-3 text-sm font-bold text-slate-500">
              프로젝트 설정을 불러오는 중입니다.
            </p>
          </div>
        </div>
      </main>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <main className="waivs-page p-4 font-sans md:p-5">
        <div className="mx-auto flex max-w-[1680px] gap-5">
          {/* =================================================
              SIDEBAR
          ================================================= */}

          <ProjectSidebar
            workspaces={
              sidebarWorkspaces
            }
            selectedWorkspaceId={
              workspaceId
            }
            loading={loading}
            errorMessage={
              errorMessage
            }
            onSelectWorkspace={
              handleSelectWorkspace
            }
          />

          {/* =================================================
              CONTENT
          ================================================= */}

          <div className="min-w-0 flex-1">
            {/* =================================================
                HEADER
            ================================================= */}

            <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#EEF3FF] text-[#5873F9]">
                  <Settings2
                    size={18}
                    strokeWidth={2.4}
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-lg font-black text-slate-900">
                      프로젝트 설정
                    </h1>

                    {workspace && (
                      <>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">
                          {isTeam
                            ? "TEAM"
                            : "PERSONAL"}
                        </span>

                        <span className="rounded-md bg-[#EEF3FF] px-2 py-0.5 text-[10px] font-black text-[#5873F9]">
                          {isOwner
                            ? "OWNER"
                            : "MEMBER"}
                        </span>
                      </>
                    )}
                  </div>

                  <p className="mt-0.5 truncate text-xs font-semibold text-slate-400">
                    {projectName}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/main/${encodeURIComponent(
                      workspaceId,
                    )}?mode=${mode}`,
                  )
                }
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition hover:bg-slate-50 hover:text-[#5873F9]"
              >
                <ArrowLeft
                  size={14}
                />
                대시보드
              </button>
            </section>

            {/* =================================================
                ERROR
            ================================================= */}

            {errorMessage &&
              !workspace && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-600">
                  {
                    errorMessage
                  }
                </div>
              )}

            {workspace && (
              <div className="space-y-4">
                {/* =================================================
                    BASIC + MANAGEMENT
                ================================================= */}

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(330px,0.65fr)]">
                  {/* ===============================================
                      BASIC INFO
                  =============================================== */}

                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-[15px] font-black text-slate-900">
                          기본 정보
                        </h2>

                        <p className="mt-0.5 text-xs font-medium text-slate-400">
                          프로젝트 이름과 설명을 관리합니다.
                        </p>
                      </div>

                      {!isOwner && (
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500">
                          읽기 전용
                        </span>
                      )}
                    </div>

                    <form
                      onSubmit={
                        handleSaveProject
                      }
                    >
                      {/* 프로젝트 이름 */}

                      <div>
                        <label className="mb-1.5 block text-xs font-black text-slate-600">
                          프로젝트 이름
                        </label>

                        <input
                          value={
                            editName
                          }
                          onChange={(
                            event,
                          ) =>
                            setEditName(
                              event
                                .target
                                .value,
                            )
                          }
                          disabled={
                            !isOwner ||
                            saving
                          }
                          maxLength={
                            100
                          }
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition focus:border-[#AAB8FF] focus:ring-2 focus:ring-[#5873F9]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                        />
                      </div>

                      {/* 프로젝트 설명 */}

                      <div className="mt-4">
                        <div className="mb-1.5 flex items-center justify-between">
                          <label className="text-xs font-black text-slate-600">
                            프로젝트 설명
                          </label>

                          <span className="text-[10px] font-bold text-slate-300">
                            {
                              editDescription.length
                            }
                            /500
                          </span>
                        </div>

                        <textarea
                          value={
                            editDescription
                          }
                          onChange={(
                            event,
                          ) =>
                            setEditDescription(
                              event
                                .target
                                .value,
                            )
                          }
                          disabled={
                            !isOwner ||
                            saving
                          }
                          rows={3}
                          maxLength={
                            500
                          }
                          placeholder="프로젝트 설명을 입력해주세요."
                          className="min-h-[82px] w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold leading-5 text-slate-800 outline-none transition focus:border-[#AAB8FF] focus:ring-2 focus:ring-[#5873F9]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                        />
                      </div>

                      {isOwner && (
                        <div className="mt-3 flex justify-end">
                          <button
                            type="submit"
                            disabled={
                              saving ||
                              !editName.trim()
                            }
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#5873F9] px-4 text-xs font-black text-white transition hover:bg-[#4863E8] disabled:cursor-not-allowed disabled:bg-slate-300"
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
                                <Save
                                  size={14}
                                />
                                변경사항 저장
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </form>
                  </section>

                  {/* ===============================================
                      PROJECT MANAGEMENT
                  =============================================== */}

                  <section className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4">
                      <h2 className="text-[15px] font-black text-slate-900">
                        프로젝트 관리
                      </h2>

                      <p className="mt-0.5 text-xs font-medium text-slate-400">
                        현재 프로젝트의 기본 권한과 관리 기능입니다.
                      </p>
                    </div>

                    {/* 프로젝트 유형 */}

                    <div className="flex items-center justify-between border-b border-slate-100 py-2.5">
                      <span className="text-xs font-bold text-slate-400">
                        프로젝트 유형
                      </span>

                      <div className="flex items-center gap-1.5">
                        {isTeam ? (
                          <UsersRound
                            size={13}
                            className="text-emerald-600"
                          />
                        ) : (
                          <FolderOpen
                            size={13}
                            className="text-[#5873F9]"
                          />
                        )}

                        <span className="text-xs font-black text-slate-700">
                          {isTeam
                            ? "팀 프로젝트"
                            : "개인 프로젝트"}
                        </span>
                      </div>
                    </div>

                    {/* 역할 */}

                    <div className="flex items-center justify-between border-b border-slate-100 py-2.5">
                      <span className="text-xs font-bold text-slate-400">
                        내 권한
                      </span>

                      <span
                        className={
                          isOwner
                            ? "rounded-md bg-[#EEF3FF] px-2 py-1 text-[10px] font-black text-[#5873F9]"
                            : "rounded-md bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500"
                        }
                      >
                        {isOwner
                          ? "OWNER"
                          : "MEMBER"}
                      </span>
                    </div>

                    {/* 프로젝트 복제 */}

                    {isOwner && (
                      <div className="mt-auto pt-4">
                        <div className="rounded-xl bg-slate-50 p-3.5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Copy
                                  size={14}
                                  className="text-[#5873F9]"
                                />

                                <p className="text-xs font-black text-slate-800">
                                  프로젝트 복제
                                </p>
                              </div>

                              <p className="mt-1.5 text-[11px] font-medium leading-5 text-slate-400">
                                현재 프로젝트의 작업 폴더를 복사해
                                새로운 프로젝트를 만듭니다.
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={
                                openDuplicateModal
                              }
                              className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-[#D9E1FF] bg-white px-3 text-[11px] font-black text-[#5873F9] transition hover:bg-[#EEF3FF]"
                            >
                              복제
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {!isOwner && (
                      <div className="mt-auto pt-4">
                        <div className="rounded-xl bg-slate-50 px-3.5 py-3 text-[11px] font-semibold leading-5 text-slate-400">
                          프로젝트 관리 기능은 OWNER만 사용할 수 있습니다.
                        </div>
                      </div>
                    )}
                  </section>
                </div>

                {/* =================================================
                    TEAM MANAGEMENT
                ================================================= */}

                {isTeam && (
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <UsersRound
                            size={16}
                            className="text-[#5873F9]"
                          />

                          <h2 className="text-[15px] font-black text-slate-900">
                            팀 관리
                          </h2>

                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">
                            {
                              members.length
                            }
                            명
                          </span>
                        </div>

                        <p className="mt-1 text-xs font-medium text-slate-400">
                          프로젝트에 참여 중인 멤버를 확인합니다.
                        </p>
                      </div>

                      {isOwner && (
                        <form
                          onSubmit={
                            handleInviteMember
                          }
                          className="flex w-full gap-2 lg:w-[430px]"
                        >
                          <div className="relative min-w-0 flex-1">
                            <Mail
                              size={14}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />

                            <input
                              type="email"
                              value={
                                inviteEmail
                              }
                              onChange={(
                                event,
                              ) =>
                                setInviteEmail(
                                  event
                                    .target
                                    .value,
                                )
                              }
                              placeholder="팀원 이메일"
                              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-bold outline-none transition focus:border-[#AAB8FF] focus:bg-white focus:ring-2 focus:ring-[#5873F9]/10"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={
                              inviting ||
                              !inviteEmail.trim()
                            }
                            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#5873F9] px-3 text-xs font-black text-white transition hover:bg-[#4863E8] disabled:bg-slate-300"
                          >
                            {inviting ? (
                              <Loader2
                                size={13}
                                className="animate-spin"
                              />
                            ) : (
                              <UserPlus
                                size={13}
                              />
                            )}

                            초대
                          </button>
                        </form>
                      )}
                    </div>

                    {/* 팀원 */}

                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      {members.length ===
                      0 ? (
                        <div className="py-8 text-center text-xs font-semibold text-slate-400">
                          참여 중인 팀원이 없습니다.
                        </div>
                      ) : (
                        <div className="grid md:grid-cols-2 xl:grid-cols-3">
                          {members.map(
                            (
                              member,
                            ) => {
                              const memberRole =
                                normalizeRole(
                                  member.role,
                                );

                              const displayName =
                                member.nickname?.trim() ||
                                member.email;

                              return (
                                <div
                                  key={
                                    member.userId
                                  }
                                  className="flex min-w-0 items-center justify-between gap-3 border-b border-r border-slate-100 px-4 py-3 last:border-b-0"
                                >
                                  <div className="flex min-w-0 items-center gap-2.5">
                                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#EEF3FF] text-xs font-black text-[#5873F9]">
                                      {displayName
                                        .charAt(
                                          0,
                                        )
                                        .toUpperCase()}
                                    </div>

                                    <div className="min-w-0">
                                      <p className="truncate text-xs font-black text-slate-800">
                                        {
                                          displayName
                                        }
                                      </p>

                                      <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-400">
                                        {
                                          member.email
                                        }
                                      </p>
                                    </div>
                                  </div>

                                  <span
                                    className={
                                      memberRole ===
                                      "owner"
                                        ? "rounded-md bg-[#EEF3FF] px-2 py-1 text-[9px] font-black text-[#5873F9]"
                                        : "rounded-md bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-500"
                                    }
                                  >
                                    {memberRole ===
                                    "owner"
                                      ? "OWNER"
                                      : "MEMBER"}
                                  </span>
                                </div>
                              );
                            },
                          )}
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* =================================================
                    DANGER
                ================================================= */}

                <section className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-500">
                      {isOwner ? (
                        <Trash2
                          size={14}
                        />
                      ) : (
                        <LogOut
                          size={14}
                        />
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-black text-slate-900">
                        {isOwner
                          ? "프로젝트 삭제"
                          : "프로젝트 나가기"}
                      </p>

                      <p className="mt-0.5 text-xs font-medium text-slate-400">
                        {isOwner
                          ? "프로젝트 데이터와 실제 작업 폴더가 모두 삭제되며 복구할 수 없습니다."
                          : "프로젝트 데이터는 유지되고 현재 계정의 멤버십만 제거됩니다."}
                      </p>
                    </div>
                  </div>

                  {isOwner ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteConfirmText(
                          "",
                        );

                        setModalType(
                          "delete",
                        );
                      }}
                      className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-black text-rose-600 transition hover:bg-rose-100"
                    >
                      <Trash2
                        size={13}
                      />
                      프로젝트 삭제
                    </button>
                  ) : isTeam ? (
                    <button
                      type="button"
                      onClick={() =>
                        setModalType(
                          "leave",
                        )
                      }
                      className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs font-black text-amber-700 transition hover:bg-amber-100"
                    >
                      <LogOut
                        size={13}
                      />
                      프로젝트 나가기
                    </button>
                  ) : null}
                </section>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* =================================================
          DUPLICATE MODAL
      ================================================= */}

      {modalType ===
        "duplicate" && (
        <Modal
          title="프로젝트 복제"
          description="현재 프로젝트를 새로운 프로젝트로 복제합니다."
          onClose={() => {
            if (duplicating) {
              return;
            }

            setModalType(null);
          }}
        >
          <form
            onSubmit={
              handleDuplicateWorkspace
            }
          >
            <div className="rounded-xl border border-[#DDE4FF] bg-[#F7F9FF] px-4 py-3">
              <div className="flex items-start gap-2.5">
                <Copy
                  size={17}
                  className="mt-0.5 shrink-0 text-[#5873F9]"
                />

                <div>
                  <p className="text-xs font-black text-slate-700">
                    작업 폴더 복제
                  </p>

                  <p className="mt-1 text-[11px] font-medium leading-5 text-slate-500">
                    현재 프로젝트의 작업 폴더가 새 프로젝트로 복사됩니다.
                    팀 프로젝트의 경우 기존 팀원은 복제되지 않습니다.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-black text-slate-600">
                새 프로젝트 이름
              </label>

              <input
                value={
                  duplicateName
                }
                onChange={(
                  event,
                ) =>
                  setDuplicateName(
                    event.target
                      .value,
                  )
                }
                autoFocus
                disabled={
                  duplicating
                }
                maxLength={
                  100
                }
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-800 outline-none transition focus:border-[#AAB8FF] focus:ring-2 focus:ring-[#5873F9]/10"
              />
            </div>

            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-black text-slate-600">
                  프로젝트 설명
                </label>

                <span className="text-[10px] font-bold text-slate-300">
                  {
                    duplicateDescription.length
                  }
                  /500
                </span>
              </div>

              <textarea
                value={
                  duplicateDescription
                }
                onChange={(
                  event,
                ) =>
                  setDuplicateDescription(
                    event.target
                      .value,
                  )
                }
                disabled={
                  duplicating
                }
                rows={3}
                maxLength={
                  500
                }
                className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#AAB8FF] focus:ring-2 focus:ring-[#5873F9]/10"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={
                  duplicating
                }
                onClick={() =>
                  setModalType(
                    null,
                  )
                }
                className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 transition hover:bg-slate-50"
              >
                취소
              </button>

              <button
                type="submit"
                disabled={
                  duplicating ||
                  !duplicateName.trim()
                }
                className="inline-flex h-9 min-w-[90px] items-center justify-center gap-1.5 rounded-xl bg-[#5873F9] px-4 text-xs font-black text-white transition hover:bg-[#4863E8] disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {duplicating ? (
                  <>
                    <Loader2
                      size={13}
                      className="animate-spin"
                    />
                    복제 중
                  </>
                ) : (
                  <>
                    <Copy
                      size={13}
                    />
                    복제
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* =================================================
          DELETE MODAL
      ================================================= */}

      {modalType ===
        "delete" && (
        <Modal
          title="프로젝트 삭제"
          description="삭제한 프로젝트는 복구할 수 없습니다."
          onClose={() => {
            if (
              dangerSubmitting
            ) {
              return;
            }

            setModalType(
              null,
            );
          }}
        >
          <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3">
            <div className="flex gap-2.5">
              <AlertTriangle
                size={17}
                className="mt-0.5 shrink-0 text-rose-500"
              />

              <p className="text-xs font-semibold leading-5 text-slate-600">
                프로젝트 관련 데이터와 실제 작업 폴더가 모두 삭제됩니다.
              </p>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-black text-slate-600">
              확인을 위해{" "}
              <span className="text-rose-600">
                {projectName}
              </span>
              을 입력하세요.
            </label>

            <input
              value={
                deleteConfirmText
              }
              onChange={(event) =>
                setDeleteConfirmText(
                  event.target
                    .value,
                )
              }
              autoFocus
              disabled={
                dangerSubmitting
              }
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
            />
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              disabled={
                dangerSubmitting
              }
              onClick={() =>
                setModalType(
                  null,
                )
              }
              className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600"
            >
              취소
            </button>

            <button
              type="button"
              onClick={
                handleDeleteWorkspace
              }
              disabled={
                dangerSubmitting ||
                deleteConfirmText.trim() !==
                  projectName
              }
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 text-xs font-black text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {dangerSubmitting ? (
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
          </div>
        </Modal>
      )}

      {/* =================================================
          LEAVE MODAL
      ================================================= */}

      {modalType ===
        "leave" && (
        <Modal
          title="프로젝트 나가기"
          description="팀 프로젝트에서 나가시겠습니까?"
          onClose={() => {
            if (
              dangerSubmitting
            ) {
              return;
            }

            setModalType(
              null,
            );
          }}
        >
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
            <p className="text-sm font-black text-slate-800">
              {projectName}
            </p>

            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              프로젝트 자체는 삭제되지 않으며 현재 계정의 MEMBER 정보만
              제거됩니다.
            </p>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              disabled={
                dangerSubmitting
              }
              onClick={() =>
                setModalType(
                  null,
                )
              }
              className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600"
            >
              취소
            </button>

            <button
              type="button"
              onClick={
                handleLeaveWorkspace
              }
              disabled={
                dangerSubmitting
              }
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-4 text-xs font-black text-white transition hover:bg-amber-600 disabled:bg-slate-300"
            >
              {dangerSubmitting ? (
                <Loader2
                  size={13}
                  className="animate-spin"
                />
              ) : (
                <LogOut
                  size={13}
                />
              )}

              프로젝트 나가기
            </button>
          </div>
        </Modal>
      )}

      {/* =================================================
          TOAST
      ================================================= */}

      {toast && (
        <div className="fixed right-5 top-[88px] z-[150] w-[330px] max-w-[calc(100vw-40px)]">
          <div
            className={
              toast.type ===
              "success"
                ? "flex items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 shadow-xl"
                : "flex items-center gap-3 rounded-xl border border-rose-200 bg-white px-4 py-3 shadow-xl"
            }
          >
            <div
              className={
                toast.type ===
                "success"
                  ? "grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600"
                  : "grid h-7 w-7 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-600"
              }
            >
              {toast.type ===
              "success" ? (
                <Check
                  size={14}
                />
              ) : (
                <XCircle
                  size={14}
                />
              )}
            </div>

            <p className="min-w-0 flex-1 text-xs font-bold text-slate-700">
              {toast.message}
            </p>

            <button
              type="button"
              onClick={() =>
                setToast(null)
              }
              className="text-slate-400 hover:text-slate-700"
            >
              <X
                size={14}
              />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* =========================================================
   MODAL
========================================================= */

function Modal({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(
        event,
      ) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-[500px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              {title}
            </h2>

            <p className="mt-0.5 text-xs font-medium text-slate-400">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X
              size={16}
            />
          </button>
        </div>

        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  );
}