"use client";

// 경로: src/components/design/components/DesignWorkspace.tsx
//
// 설계 관리 화면의 껍데기.
//
// 워크스페이스가 정해지지 않은 상태에서는 실시간 연결을 아예 열지 않는다.
// 예전 화면은 이때 임시 더미 데이터를 보여 줬는데, 편집할 수 있을 것처럼
// 보이는 데다 방 이름이 워크스페이스에 묶여 있어 엉뚱한 사람들이 한 방에
// 모일 수 있다.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, PencilLine, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { getMyWorkspacesByTokenApi } from "@/lib/ide/api";
import { getAuthUser } from "@/lib/auth/tokenStore";

import { useDesignDoc } from "../realtime/useDesignDoc";
import { useDesignDoctor } from "../realtime/useDesignDoctor";
import { useDesignModel } from "../realtime/useY";
import { createDesignMutations } from "../realtime/mutations";
import { useDesignUndo } from "../realtime/useUndo";
import { useDesignUiStore } from "../store/designUiStore";

import { ConfirmDialogProvider } from "./ConfirmDialog";
import { ConnectionNotice, DesignHeader } from "./DesignHeader";
import { DoctorPanel } from "./DoctorPanel";
import { HistoryDialog } from "./HistoryDialog";

import { AiDraftDialog } from "../ai/AiDraftDialog";
import { useDraftJobStore } from "../ai/draftJobStore";
import { CodegenDialog } from "../codegen/CodegenDialog";
import { DesignPrintCapture } from "../export/DesignPrintCapture";
import {
  buildPrintDocument,
  type PrintImages,
} from "../export/buildPrintDocument";
import { printHtmlDocument } from "../export/printDesign";
import { isEmptyModel } from "../model/schema";

import type { WorkspaceSidebarItem } from "@/components/layout/ProjectSidebar";
import ProjectSwitcher from "@/components/main-dashboard/ProjectSwitcher";

import { RequirementsTab } from "../tabs/requirements/RequirementsTab";
import { ScreenFlowTab } from "../tabs/screens/ScreenFlowTab";
import { ErdTab } from "../tabs/erd/ErdTab";
import { ApiTab } from "../tabs/apis/ApiTab";

/** 접속자 이름을 색과 함께 알린다. 누가 함께 보고 있는지 표시하는 데 쓴다. */
const PRESENCE_COLORS = [
  "#6366f1",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
];

export function DesignWorkspace() {
  const router = useRouter();
  const params = useParams<{
    workspaceId?: string | string[];
  }>();

  const workspaceId = Array.isArray(params?.workspaceId)
    ? params.workspaceId[0] ?? null
    : params?.workspaceId ?? null;

  const [workspaces, setWorkspaces] = useState<WorkspaceSidebarItem[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [workspaceError, setWorkspaceError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const list = await getMyWorkspacesByTokenApi();

        if (cancelled) {
          return;
        }

        setWorkspaces(
          (list ?? []).map(
            (item: {
              id: string;
              name: string;
              mode?: string;
              role?: string;
              projects?: unknown[];
            }) => ({
              id: item.id,
              name: item.name,
              mode: item.mode === "team" ? "team" : "personal",
              role: item.role,
              childCount: Array.isArray(item.projects)
                ? item.projects.length
                : 0,
            }),
          ),
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        setWorkspaceError(
          error instanceof Error
            ? error.message
            : "워크스페이스를 불러오지 못했습니다.",
        );
      } finally {
        if (!cancelled) {
          setLoadingWorkspaces(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const { doc, session, state } = useDesignDoc(workspaceId);
  const model = useDesignModel(doc);

  // Ctrl+Z 는 내가 한 편집만 되돌린다. 팀원의 편집까지 사라지면 안 된다.
  useDesignUndo(doc);

  const activeTab = useDesignUiStore((s) => s.activeTab);
  const doctorOpen = useDesignUiStore((s) => s.doctorOpen);

  // 문서를 열지 못한 상태에서는 점검하지 않는다.
  const report = useDesignDoctor(
    workspaceId,
    model,
    state.status !== "loading" && state.status !== "error",
  );

  // 초안 다이얼로그가 열렸는지는 초안 작업 스토어가 든다. 다른 페이지에서
  // 뜬 "초안 생성이 끝났습니다" 알림이 이 다이얼로그를 열 수 있어야 한다.
  const aiOpen = useDraftJobStore((s) => s.dialogOpen);
  const setAiOpen = useDraftJobStore((s) => s.setDialogOpen);
  const resumeDraftJob = useDraftJobStore((s) => s.resume);

  // 만들어 달라고 해 놓고 자리를 떴다 돌아온 경우. 서버에 남은 작업을
  // 되살리고, 다 만들어져 있으면 검토 화면을 바로 보여 준다.
  useEffect(() => {
    if (!workspaceId) return;

    let cancelled = false;

    void resumeDraftJob(workspaceId).then(() => {
      const job = useDraftJobStore.getState();

      if (!cancelled && job.workspaceId === workspaceId && job.status === "done") {
        setAiOpen(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [workspaceId, resumeDraftJob, setAiOpen]);

  // 이 화면을 떠나면 다이얼로그도 사라진다. 열림 표시를 남겨 두면 다른
  // 페이지에서 완료 알림이 뜨지 않는다.
  useEffect(() => () => setAiOpen(false), [setAiOpen]);

  const [codegenOpen, setCodegenOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState("");

  const documentEmpty = isEmptyModel(model);

  const tabCounts = useMemo(
    () => ({
      requirements: model.requirements.length,
      screens: model.screens.length,
      erd: model.erd.tables.length,
      apis: model.apis.length,
    }),
    [model],
  );

  const [blankStarted, setBlankStarted] = useState(false);

  const mutations = useMemo(
    () => (doc ? createDesignMutations(doc) : null),
    [doc],
  );

  const awareness = session?.provider?.awareness ?? null;

  useEffect(() => {
    if (!awareness) {
      return;
    }

    const user = getAuthUser();

    const colorIndex =
      Math.abs(Number(user?.userId ?? 0)) % PRESENCE_COLORS.length;

    awareness.setLocalStateField("user", {
      id: user?.userId ?? null,
      name: user?.nickname ?? "익명",
      color: PRESENCE_COLORS[colorIndex],
    });
  }, [awareness]);

  const currentWorkspace =
    workspaces.find((item) => item.id === workspaceId) ?? null;

  const handleSelectWorkspace = useCallback(
    (workspace: WorkspaceSidebarItem) => {
      if (workspace.id === workspaceId) {
        return;
      }

      router.push(
        `/design/${encodeURIComponent(workspace.id)}?mode=${workspace.mode}`,
      );
    },
    [router, workspaceId],
  );

  const handlePrintReady = useCallback(
    async (images: PrintImages) => {
      try {
        await printHtmlDocument(
          buildPrintDocument(
            model,
            currentWorkspace?.name ?? "설계 문서",
            images,
          ),
        );
      } catch (error) {
        setPrintError(
          error instanceof Error
            ? error.message
            : "인쇄 창을 열지 못했습니다.",
        );
      } finally {
        setPrinting(false);
      }
    },
    [model, currentWorkspace],
  );

  const handlePrintError = useCallback((message: string) => {
    setPrintError(message);
    setPrinting(false);
  }, []);

  // 사이드바 대신 헤더의 프로젝트 이름 자리에서 다른 프로젝트로 옮겨 간다(일정 관리와 같은 방식).
  const switcher = (
    <ProjectSwitcher
      size="compact"
      label={
        currentWorkspace?.name ||
        (workspaceId ? "설계 관리" : "프로젝트 선택")
      }
      workspaces={workspaces}
      selectedWorkspaceId={workspaceId ?? ""}
      loading={loadingWorkspaces}
      errorMessage={workspaceError}
      onSelectWorkspace={handleSelectWorkspace}
    />
  );

  const roleLabel = currentWorkspace?.role
    ? currentWorkspace.role.toLowerCase() === "owner"
      ? "OWNER"
      : "MEMBER"
    : undefined;

  return (
    <ConfirmDialogProvider>
      {/* 카드 없이 TopNav 아래 화면 전체를 쓰는 작업 공간. 넓은 화면에서는 높이를 고정하고 탭 본문이 스크롤한다. */}
      <div className="waivs-page flex flex-col bg-white text-[var(--waivs-text)] lg:h-[calc(100dvh-65px)] lg:min-h-0 lg:overflow-hidden">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {!workspaceId ? (
            <>
              <header className="flex shrink-0 items-center gap-1 border-y border-slate-200 bg-[#F4F6FA] px-4 py-2.5 text-sm lg:h-[62px] lg:px-5 lg:py-0">
                {switcher}
              </header>

              <NoWorkspace hasWorkspaces={workspaces.length > 0} />
            </>
          ) : (
            <>
              <DesignHeader
                switcher={switcher}
                roleLabel={roleLabel}
                state={state}
                errorCount={report.errorCount}
                progressPercent={report.progress.percent}
                counts={tabCounts}
                mutations={mutations}
                onOpenAiDraft={() => setAiOpen(true)}
                onOpenCodegen={() => setCodegenOpen(true)}
                onPrint={() => {
                  setPrintError("");
                  setPrinting(true);
                }}
                printing={printing}
                onOpenHistory={() => setHistoryOpen(true)}
              />

              <ConnectionNotice
                status={state.status}
                message={state.errorMessage}
              />

              {printError ? (
                <p className="mx-4 mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 lg:mx-5">
                  {printError}
                </p>
              ) : null}

              {state.status === "loading" ? (
                <div className="flex flex-1 items-center justify-center gap-2 text-sm text-[var(--waivs-text-muted)]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  설계 문서를 여는 중
                </div>
              ) : state.status === "error" || !mutations ? null : (
                <div className="flex min-h-[600px] flex-1 lg:min-h-0">
                  <div className="min-w-0 flex-1">
                    {documentEmpty && !blankStarted ? (
                      <EmptyDesign
                        onStartWithAi={() => setAiOpen(true)}
                        onStartBlank={() => setBlankStarted(true)}
                      />
                    ) : activeTab === "requirements" ? (
                      <RequirementsTab
                        model={model}
                        mutations={mutations}
                        findings={report.findings}
                      />
                    ) : activeTab === "screens" ? (
                      <ScreenFlowTab
                        model={model}
                        mutations={mutations}
                        findings={report.findings}
                      />
                    ) : activeTab === "erd" ? (
                      <ErdTab
                        model={model}
                        mutations={mutations}
                        awareness={awareness}
                        findings={report.findings}
                      />
                    ) : (
                      <ApiTab
                        model={model}
                        mutations={mutations}
                        findings={report.findings}
                      />
                    )}
                  </div>

                  {doctorOpen ? (
                    <DoctorPanel
                      report={report}
                      mutations={mutations}
                    />
                  ) : null}
                </div>
              )}

              {mutations && workspaceId ? (
                <>
                  <AiDraftDialog
                    open={aiOpen}
                    onOpenChange={setAiOpen}
                    workspaceId={workspaceId}
                    mutations={mutations}
                    hasExisting={!documentEmpty}
                    session={session}
                    model={model}
                    awareness={awareness}
                    myName={getAuthUser()?.nickname ?? "익명"}
                  />

                  <HistoryDialog
                    open={historyOpen}
                    onOpenChange={setHistoryOpen}
                    workspaceId={workspaceId}
                    mutations={mutations}
                  />

                  <CodegenDialog
                    open={codegenOpen}
                    onOpenChange={setCodegenOpen}
                    workspaceId={workspaceId}
                    model={model}
                    errorCount={report.errorCount}
                    session={session}
                  />

                  {printing ? (
                    <DesignPrintCapture
                      model={model}
                      onReady={handlePrintReady}
                      onError={handlePrintError}
                    />
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </main>
      </div>
    </ConfirmDialogProvider>
  );
}

/**
 * 문서가 비었을 때 첫 화면.
 *
 * 예전 설계 화면은 여기서 "요구사항 추가" 버튼 하나만 보여 줬다.
 * 학생 팀은 무엇을 써야 할지 몰라서 설계를 못 하는데 칸만 하나 더 주는 셈이었다.
 * 이제는 한 줄만 적으면 시작할 수 있다는 것을 가장 먼저 보여 준다.
 */
function EmptyDesign({
  onStartWithAi,
  onStartBlank,
}: {
  onStartWithAi: () => void;
  onStartBlank: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-8">
      <div className="text-center">
        <p className="text-lg font-black text-[var(--waivs-text)]">
          어떻게 시작할까요?
        </p>

        <p className="mt-1 text-sm text-[var(--waivs-text-muted)]">
          둘 중 아무거나 골라도 됩니다. 나중에 바꿔도 됩니다.
        </p>
      </div>

      <div className="grid w-full max-w-2xl gap-3 sm:grid-cols-2">
        <StartChoice
          icon={<Sparkles className="h-5 w-5" />}
          title="AI로 초안 만들기"
          description="한 줄만 알려 주시면 요구사항과 화면, 표, API를 서로 연결해 만들어 드립니다. 마음에 안 드는 것은 빼고 넣을 수 있습니다."
          actionLabel="초안 만들기"
          onClick={onStartWithAi}
          primary
        />

        <StartChoice
          icon={<PencilLine className="h-5 w-5" />}
          title="직접 작성하기"
          description="빈 문서에서 시작합니다. 요구사항부터 하나씩 적어 나가고, 필요하면 나중에 AI 초안을 얹을 수도 있습니다."
          actionLabel="빈 문서로 시작"
          onClick={onStartBlank}
        />
      </div>
    </div>
  );
}

/** 시작 방식 하나. 두 갈래를 나란히 놓아야 고를 수 있다는 것이 눈에 보인다. */
function StartChoice({
  icon,
  title,
  description,
  actionLabel,
  onClick,
  primary = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col gap-2 rounded-2xl border p-5 text-left transition",
        primary
          ? "border-[#5873F9] bg-[#F7F9FF] hover:bg-[#EEF3FF]"
          : "border-[var(--waivs-border)] bg-white hover:border-[#5873F9] hover:bg-[var(--waivs-surface-soft)]",
      )}
    >
      <span
        className={cn(
          "grid h-10 w-10 place-items-center rounded-xl",
          primary
            ? "bg-[#5873F9] text-white"
            : "bg-[var(--waivs-surface-soft)] text-[var(--waivs-text-sub)]",
        )}
      >
        {icon}
      </span>

      <span className="text-sm font-black text-[var(--waivs-text)]">
        {title}
      </span>

      <span className="text-xs leading-5 text-[var(--waivs-text-muted)]">
        {description}
      </span>

      <span
        className={cn(
          "mt-1 text-xs font-black",
          primary
            ? "text-[#5873F9]"
            : "text-[var(--waivs-text-sub)]",
        )}
      >
        {actionLabel} →
      </span>
    </button>
  );
}

function NoWorkspace({
  hasWorkspaces,
}: {
  hasWorkspaces: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
      <p className="text-sm font-medium text-[var(--waivs-text-sub)]">
        워크스페이스를 먼저 선택해 주세요.
      </p>

      <p className="max-w-sm text-xs text-[var(--waivs-text-muted)]">
        {hasWorkspaces
          ? "위쪽 프로젝트 이름을 눌러 설계를 작성할 워크스페이스를 고르면 시작됩니다."
          : "워크스페이스를 만들면 그 안에서 설계를 작성할 수 있습니다."}
      </p>
    </div>
  );
}