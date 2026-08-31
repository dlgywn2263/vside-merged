"use client";

// 경로: src/features/design/components/DesignWorkspace.tsx
//
// 설계 관리 화면의 껍데기.
//
// 워크스페이스가 정해지지 않은 상태에서는 실시간 연결을 아예 열지 않는다.
// 예전 화면은 이때 임시 더미 데이터를 보여 줬는데, 편집할 수 있을 것처럼
// 보이는 데다 방 이름이 워크스페이스에 묶여 있어 엉뚱한 사람들이 한 방에
// 모일 수 있다.

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { getMyWorkspacesByTokenApi } from "@/lib/ide/api";
import { getAuthUser } from "@/lib/auth/tokenStore";

import { useDesignDoc } from "../realtime/useDesignDoc";
import { useDesignDoctor } from "../realtime/useDesignDoctor";
import { useDesignModel } from "../realtime/useY";
import { createDesignMutations } from "../realtime/mutations";
import { useDesignUiStore } from "../store/designUiStore";
import { ConfirmDialogProvider } from "./ConfirmDialog";
import { ConnectionNotice, DesignHeader } from "./DesignHeader";
import { DoctorPanel } from "./DoctorPanel";
import { WorkspaceSidebar, type WorkspaceSummary } from "./WorkspaceSidebar";
import { RequirementsTab } from "../tabs/requirements/RequirementsTab";
import { ScreenFlowTab } from "../tabs/screens/ScreenFlowTab";
import { ErdTab } from "../tabs/erd/ErdTab";
import { ApiTab } from "../tabs/apis/ApiTab";

/** 접속자 이름을 색과 함께 알린다. 누가 함께 보고 있는지 표시하는 데 쓴다. */
const PRESENCE_COLORS = [
  "#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6",
];

export function DesignWorkspace() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspaceId");

  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [workspaceError, setWorkspaceError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const list = await getMyWorkspacesByTokenApi();
        if (cancelled) return;

        setWorkspaces(
          (list ?? []).map((item: { id: string; name: string; mode?: string }) => ({
            id: item.id,
            name: item.name,
            mode: item.mode === "team" ? "team" : "personal",
          })),
        );
      } catch (error) {
        if (cancelled) return;
        setWorkspaceError(
          error instanceof Error ? error.message : "워크스페이스를 불러오지 못했습니다.",
        );
      } finally {
        if (!cancelled) setLoadingWorkspaces(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const { doc, session, state } = useDesignDoc(workspaceId);
  const model = useDesignModel(doc);
  const activeTab = useDesignUiStore((s) => s.activeTab);
  const doctorOpen = useDesignUiStore((s) => s.doctorOpen);

  // 문서를 열지 못한 상태에서는 점검하지 않는다. 빈 문서를 검사해 봐야
  // 없는 문제를 잔뜩 보고할 뿐이다.
  const report = useDesignDoctor(workspaceId, model, state.status !== "loading" && state.status !== "error");

  const mutations = useMemo(() => (doc ? createDesignMutations(doc) : null), [doc]);

  const awareness = session?.provider?.awareness ?? null;

  // 접속자 표시에 쓸 내 정보를 알린다.
  useEffect(() => {
    if (!awareness) return;

    const user = getAuthUser();
    const colorIndex = Math.abs(Number(user?.userId ?? 0)) % PRESENCE_COLORS.length;

    awareness.setLocalStateField("user", {
      name: user?.nickname ?? "익명",
      color: PRESENCE_COLORS[colorIndex],
    });
  }, [awareness]);

  const currentWorkspace = workspaces.find((item) => item.id === workspaceId) ?? null;

  return (
    <ConfirmDialogProvider>
      <div className="flex h-[calc(100vh-56px)] min-h-0 bg-white">
        <WorkspaceSidebar
          workspaces={workspaces}
          currentWorkspaceId={workspaceId}
          loading={loadingWorkspaces}
          errorMessage={workspaceError}
        />

        <main className="flex min-w-0 flex-1 flex-col">
          {!workspaceId ? (
            <NoWorkspace hasWorkspaces={workspaces.length > 0} />
          ) : (
            <>
              <DesignHeader
                workspaceName={currentWorkspace?.name ?? ""}
                state={state}
                issueCount={report.errorCount + report.warningCount}
              />

              <ConnectionNotice status={state.status} message={state.errorMessage} />

              {state.status === "loading" ? (
                <div className="flex flex-1 items-center justify-center gap-2 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  설계 문서를 여는 중
                </div>
              ) : state.status === "error" || !mutations ? null : (
                <div className="flex min-h-0 flex-1">
                  <div className="min-w-0 flex-1">
                    {activeTab === "requirements" ? (
                      <RequirementsTab model={model} mutations={mutations} />
                    ) : activeTab === "screens" ? (
                      <ScreenFlowTab model={model} mutations={mutations} />
                    ) : activeTab === "erd" ? (
                      <ErdTab model={model} mutations={mutations} awareness={awareness} />
                    ) : (
                      <ApiTab model={model} mutations={mutations} />
                    )}
                  </div>

                  {doctorOpen ? <DoctorPanel report={report} /> : null}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </ConfirmDialogProvider>
  );
}

function NoWorkspace({ hasWorkspaces }: { hasWorkspaces: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
      <p className="text-sm font-medium text-slate-700">워크스페이스를 먼저 선택해 주세요.</p>
      <p className="max-w-sm text-xs text-slate-400">
        {hasWorkspaces
          ? "왼쪽 목록에서 설계를 작성할 워크스페이스를 고르면 시작됩니다."
          : "워크스페이스를 만들면 그 안에서 설계를 작성할 수 있습니다."}
      </p>
    </div>
  );
}
