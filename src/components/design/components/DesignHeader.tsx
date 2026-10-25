"use client";

// 경로: src/components/design/components/DesignHeader.tsx

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  useParams,
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  ChevronRight,
  CloudOff,
  Database,
  FileCode,
  History,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Network,
  PenTool,
  Printer,
  Sparkles,
  Stethoscope,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { getIdeHref } from "@/components/main-dashboard/dashboard.utils";

import type {
  ConnectionStatus,
  DesignDocState,
} from "../realtime/designDocProvider";
import type { DesignMutations } from "../realtime/mutations";
import {
  useDesignUiStore,
  type DesignTab,
} from "../store/designUiStore";
import { DesignTabToolbar } from "./DesignTabToolbar";

const TABS: { id: DesignTab; label: string; icon: LucideIcon }[] = [
  { id: "requirements", label: "요구사항", icon: ListChecks },
  { id: "screens", label: "화면 흐름", icon: Workflow },
  { id: "erd", label: "ERD", icon: Database },
  { id: "apis", label: "API 명세", icon: Network },
];

// 헤더 버튼은 일정 관리 헤더와 같은 크기·색을 쓴다(높이 32px, 얇은 테두리).
// 개발일지 페이지 헤더 버튼(DevlogManagementMock)과 같은 높이·여백·글씨·테두리
const HEADER_BUTTON =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50";

const HEADER_ICON_BUTTON =
  "grid h-9 w-9 place-items-center rounded-md border border-slate-300 bg-white text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50";

function relativeTime(
  savedAt: number | null,
  now: number,
): string {
  if (!savedAt) return "";

  const seconds = Math.max(
    0,
    Math.round((now - savedAt) / 1000),
  );

  if (seconds < 10) return "방금 저장됨";
  if (seconds < 60) return `${seconds}초 전 저장됨`;

  const minutes = Math.round(seconds / 60);

  if (minutes < 60) return `${minutes}분 전 저장됨`;

  return `${Math.round(minutes / 60)}시간 전 저장됨`;
}

function SaveIndicator({
  state,
}: {
  state: DesignDocState;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(
      () => setNow(Date.now()),
      15000,
    );

    return () => clearInterval(timer);
  }, []);

  if (state.status === "offline") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-amber-600">
        <CloudOff className="h-3.5 w-3.5" />
        오프라인 · 저장은 됩니다
      </span>
    );
  }

  if (state.saveState === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-[var(--waivs-text-sub)]">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        저장 중
      </span>
    );
  }

  if (state.saveState === "failed") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-red-600">
        <AlertTriangle className="h-3.5 w-3.5" />
        저장 실패 · 곧 다시 시도합니다
      </span>
    );
  }

  if (state.saveState === "pending") {
    return (
      <span className="text-xs text-[var(--waivs-text-muted)]">
        변경사항 저장 대기 중
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 text-xs text-[var(--waivs-text-sub)]">
      <Check className="h-3.5 w-3.5 text-emerald-500" />
      {state.savedAt
        ? relativeTime(state.savedAt, now)
        : "모든 변경사항 저장됨"}
    </span>
  );
}

export interface DesignHeaderProps {
  /** 프로젝트 이름 자리에 들어가는 프로젝트 전환 메뉴(ProjectSwitcher). */
  switcher: ReactNode;
  /** OWNER / MEMBER. 모르면 표시하지 않는다. */
  roleLabel?: string;
  state: DesignDocState;
  errorCount: number;
  progressPercent: number;
  counts: Record<DesignTab, number>;
  mutations: DesignMutations | null;
  onOpenAiDraft: () => void;
  onOpenCodegen: () => void;
  onPrint: () => void;
  printing: boolean;
  onOpenHistory: () => void;
}

// 설계 관리 헤더는 두 줄이다.
// 1) 페이지 헤더(#F4F6FA): 위치(대시보드 › 프로젝트 › 설계), 저장 상태, 문서 전체에 대한 작업
// 2) 탭 줄(흰색): 설계 탭과, 지금 탭에서 쓰는 검색·추가(DesignTabToolbar)
// 일정 관리 페이지 헤더와 같은 높이·색·버튼 크기를 쓴다.
export function DesignHeader({
  switcher,
  roleLabel,
  state,
  errorCount,
  progressPercent,
  counts,
  mutations,
  onOpenAiDraft,
  onOpenCodegen,
  onPrint,
  printing,
  onOpenHistory,
}: DesignHeaderProps) {
  const router = useRouter();
  const params = useParams<{
    workspaceId?: string | string[];
  }>();
  const searchParams = useSearchParams();

  const activeTab = useDesignUiStore(
    (s) => s.activeTab,
  );
  const setActiveTab = useDesignUiStore(
    (s) => s.setActiveTab,
  );
  const doctorOpen = useDesignUiStore(
    (s) => s.doctorOpen,
  );
  const toggleDoctor = useDesignUiStore(
    (s) => s.toggleDoctor,
  );

  const workspaceId = Array.isArray(
    params?.workspaceId,
  )
    ? params.workspaceId[0] ?? ""
    : params?.workspaceId ?? "";

  const currentMode =
    searchParams.get("mode") === "team"
      ? "team"
      : "personal";

  const isTeam = currentMode === "team";

  const dashboardHref = workspaceId
    ? `/dashboard/${encodeURIComponent(workspaceId)}?mode=${currentMode}`
    : "/dashboard";

  return (
    <div className="shrink-0">
      {/* =================================================
          PAGE HEADER
         ================================================= */}
      <header className="flex flex-col gap-3 border-y border-slate-200 bg-[#F4F6FA] px-4 py-2.5 lg:h-[62px] lg:flex-row lg:items-center lg:justify-between lg:px-5 lg:py-0">
        <nav
          aria-label="현재 위치"
          className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm"
        >
          <Link
            href={dashboardHref}
            className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 font-medium text-slate-500 transition-colors hover:bg-white hover:text-slate-900"
          >
            <LayoutDashboard size={14} />
            대시보드
          </Link>

          <ChevronRight size={14} className="text-slate-300" />

          {switcher}

          <ChevronRight size={14} className="text-slate-300" />

          <span className="inline-flex items-center gap-1.5 px-1.5 py-1 text-[15px] font-semibold text-slate-900">
            <PenTool size={14} className="text-[#5873F9]" />
            설계
          </span>

          <span
            className={cn(
              "ml-1.5 rounded border px-1.5 py-px text-[10px] font-semibold",
              isTeam
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-blue-200 bg-blue-50 text-blue-700",
            )}
          >
            {isTeam ? "Team" : "Personal"}
          </span>

          {roleLabel ? (
            <span className="rounded border border-slate-200 bg-white px-1.5 py-px text-[10px] font-semibold text-slate-500">
              {roleLabel}
            </span>
          ) : null}

          <span className="mx-2 hidden h-4 w-px bg-slate-200 sm:block" />

          <SaveIndicator state={state} />

          {state.peerCount > 1 ? (
            <span
              title={`${state.peerCount}명이 함께 보는 중`}
              className="ml-2 flex items-center gap-1 rounded-md bg-[#EEF3FF] px-1.5 py-0.5 text-[11px] font-semibold text-[#4058D6]"
            >
              <Users className="h-3.5 w-3.5" />
              {state.peerCount}
            </span>
          ) : null}
        </nav>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenAiDraft}
            className={HEADER_BUTTON}
          >
            <Sparkles className="h-3.5 w-3.5 text-[#5873F9]" />
            AI 초안
          </button>

          <button
            type="button"
            onClick={onOpenCodegen}
            className={HEADER_BUTTON}
          >
            <FileCode className="h-3.5 w-3.5 text-slate-500" />
            코드 생성
          </button>

          <button
            type="button"
            onClick={onOpenHistory}
            title="기록"
            aria-label="기록"
            className={HEADER_ICON_BUTTON}
          >
            <History className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={onPrint}
            disabled={printing}
            title="PDF / 인쇄"
            aria-label="PDF / 인쇄"
            className={HEADER_ICON_BUTTON}
          >
            {printing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Printer className="h-3.5 w-3.5" />
            )}
          </button>

          <span className="mx-0.5 h-5 w-px bg-slate-200" />

          <button
            type="button"
            disabled={!workspaceId}
            onClick={() => {
              if (!workspaceId) {
                return;
              }

              router.push(
                getIdeHref(
                  workspaceId,
                  currentMode,
                ),
              );
            }}
            className={HEADER_BUTTON}
          >
            작업하러 가기
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* =================================================
          TAB BAR
         ================================================= */}
      <div className="flex h-12 items-center gap-4 border-b border-slate-200 bg-white px-4 lg:px-5">
        <nav
          aria-label="설계 탭"
          className="-mb-px flex h-full shrink-0 items-stretch gap-1 overflow-x-auto"
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.id;

            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setActiveTab(tab.id)
                }
                aria-current={
                  active
                    ? "page"
                    : undefined
                }
                className={cn(
                  "relative inline-flex items-center gap-1.5 border-b-2 px-2.5 text-[13px] font-medium transition-colors",
                  active
                    ? "border-[#5873F9] text-[#4058D6]"
                    : "border-transparent text-slate-500 hover:text-slate-900",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    active
                      ? "text-[#5873F9]"
                      : "text-slate-400",
                  )}
                />

                {tab.label}

                <span
                  className={cn(
                    "rounded px-1.5 py-px text-[11px] font-semibold tabular-nums",
                    active
                      ? "bg-[#EEF2FF] text-[#4058D6]"
                      : "bg-slate-100 text-slate-500",
                  )}
                >
                  {counts[tab.id]}
                </span>
              </button>
            );
          })}
        </nav>

        <DesignTabToolbar mutations={mutations} />

        {/* 설계 현황(점검 패널)은 오른쪽 패널을 여닫는 토글이라 탭 줄 끝, 패널이 열리는 쪽에 둔다 */}
        <button
          type="button"
          onClick={() => toggleDoctor()}
          aria-pressed={doctorOpen}
          className={cn(
            "ml-auto inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors",
            doctorOpen
              ? "border-[#5873F9] bg-[#5873F9] text-white"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
          )}
        >
          <Stethoscope className="h-3.5 w-3.5" />
          설계 현황

          <span
            className={cn(
              "text-[11px] font-semibold tabular-nums",
              doctorOpen
                ? "text-white/80"
                : "text-slate-400",
            )}
          >
            {progressPercent}%
          </span>

          {errorCount > 0 ? (
            <span className="rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white">
              {errorCount}
            </span>
          ) : null}
        </button>
      </div>
    </div>
  );
}

export function ConnectionNotice({
  status,
  message,
}: {
  status: ConnectionStatus;
  message: string;
}) {
  if (status !== "error") {
    return null;
  }

  return (
    <div className="m-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <p className="font-medium">
        설계 문서를 불러오지 못했습니다.
      </p>

      <p className="mt-1 text-red-600">
        {message}
      </p>

      <p className="mt-2 text-xs text-red-500">
        편집을 열지 않은 이유는, 서버에 있는 실제 내용을 빈 문서로
        덮어쓸 수 있기 때문입니다. 새로고침해 주세요.
      </p>
    </div>
  );
}