"use client";

// 경로: src/components/design/components/DesignHeader.tsx
//
// 저장 버튼이 없다. 자동 저장이라 누를 것이 없기 때문이다.
// 대신 지금 상태가 어떤지(저장됐는지, 연결돼 있는지, 몇 명이 보고 있는지)를
// 항상 보이게 둔다. 사용자가 저장을 신경 쓰지 않아도 되려면, 저장되고 있다는
// 사실이 눈에 보여야 한다.

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  CloudOff,
  FileCode,
  History,
  Loader2,
  Printer,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import type { ConnectionStatus, DesignDocState } from "../realtime/designDocProvider";
import { useDesignUiStore, type DesignTab } from "../store/designUiStore";

const TABS: { id: DesignTab; label: string }[] = [
  { id: "requirements", label: "요구사항" },
  { id: "screens", label: "화면 흐름" },
  { id: "erd", label: "ERD" },
  { id: "apis", label: "API 명세" },
];

function relativeTime(savedAt: number | null, now: number): string {
  if (!savedAt) return "";

  const seconds = Math.max(0, Math.round((now - savedAt) / 1000));
  if (seconds < 10) return "방금 저장됨";
  if (seconds < 60) return `${seconds}초 전 저장됨`;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}분 전 저장됨`;

  return `${Math.round(minutes / 60)}시간 전 저장됨`;
}

function SaveIndicator({ state }: { state: DesignDocState }) {
  const [now, setNow] = useState(() => Date.now());

  // "3분 전 저장됨" 이 3분 전 그대로 멈춰 있으면 오히려 불안하다.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
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
    return <span className="text-xs text-[var(--waivs-text-muted)]">변경사항 저장 대기 중</span>;
  }

  return (
    <span className="flex items-center gap-1.5 text-xs text-[var(--waivs-text-sub)]">
      <Check className="h-3.5 w-3.5 text-emerald-500" />
      {state.savedAt ? relativeTime(state.savedAt, now) : "모든 변경사항 저장됨"}
    </span>
  );
}

export interface DesignHeaderProps {
  workspaceName: string;
  state: DesignDocState;
  issueCount: number;
  onOpenAiDraft: () => void;
  onOpenCodegen: () => void;
  onPrint: () => void;
  printing: boolean;
  onOpenHistory: () => void;
}

export function DesignHeader({
  workspaceName,
  state,
  issueCount,
  onOpenAiDraft,
  onOpenCodegen,
  onPrint,
  printing,
  onOpenHistory,
}: DesignHeaderProps) {
  const activeTab = useDesignUiStore((s) => s.activeTab);
  const setActiveTab = useDesignUiStore((s) => s.setActiveTab);
  const doctorOpen = useDesignUiStore((s) => s.doctorOpen);
  const toggleDoctor = useDesignUiStore((s) => s.toggleDoctor);

  // 한 줄로 모은다. 예전에는 제목 아래 저장 표시가 세로로 쌓이고 탭이 또 한
  // 줄이라 114px 을 썼는데, 설계 화면에서 그만큼은 캔버스에 주는 편이 낫다.
  // 자주 누르지 않는 두 버튼은 아이콘만 남겨 자리를 뺐다.
  return (
    <header className="flex shrink-0 items-center gap-4 border-b border-[var(--waivs-border-soft)] px-5 py-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <h1 className="truncate text-xl font-black tracking-tight text-[var(--waivs-text)]">
          {workspaceName || "설계 관리"}
        </h1>
        <SaveIndicator state={state} />
      </div>

      <nav className="flex shrink-0 gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-xl px-3 py-1.5 text-sm font-medium transition",
              activeTab === tab.id
                ? "bg-[#5873F9] text-white"
                : "text-[var(--waivs-text-sub)] hover:bg-[var(--waivs-surface-soft)]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        {state.peerCount > 1 ? (
          <span
            title={`${state.peerCount}명이 함께 보는 중`}
            className="flex items-center gap-1 rounded-full bg-[#EEF3FF] px-2 py-1 text-xs font-bold text-[#5873F9]"
          >
            <Users className="h-3.5 w-3.5" />
            {state.peerCount}
          </span>
        ) : null}

        <Button variant="outline" size="sm" onClick={onOpenAiDraft} className="gap-1.5">
          <Sparkles className="h-4 w-4 text-[#5873F9]" />
          AI 초안
        </Button>

        {/* 아래 둘은 가끔 쓰는 것이라 아이콘만 남긴다. 이름은 툴팁으로 뜬다. */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenHistory}
          title="기록"
          aria-label="기록"
          className="px-2"
        >
          <History className="h-4 w-4 text-[var(--waivs-text-sub)]" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onPrint}
          disabled={printing}
          title="PDF / 인쇄"
          aria-label="PDF / 인쇄"
          className="px-2"
        >
          {printing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Printer className="h-4 w-4 text-[var(--waivs-text-sub)]" />
          )}
        </Button>

        <Button variant="outline" size="sm" onClick={onOpenCodegen} className="gap-1.5">
          <FileCode className="h-4 w-4 text-[var(--waivs-text-sub)]" />
          코드 생성
        </Button>

        <Button
          variant={doctorOpen ? "default" : "outline"}
          size="sm"
          onClick={() => toggleDoctor()}
          className="gap-1.5"
        >
          <Stethoscope className="h-4 w-4" />
          설계 점검
          {issueCount > 0 ? (
            <span className="ml-0.5 rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white">
              {issueCount}
            </span>
          ) : null}
        </Button>
      </div>
    </header>
  );
}

export function ConnectionNotice({ status, message }: { status: ConnectionStatus; message: string }) {
  if (status !== "error") return null;

  return (
    <div className="m-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <p className="font-medium">설계 문서를 불러오지 못했습니다.</p>
      <p className="mt-1 text-red-600">{message}</p>
      <p className="mt-2 text-xs text-red-500">
        편집을 열지 않은 이유는, 서버에 있는 실제 내용을 빈 문서로 덮어쓸 수 있기 때문입니다.
        새로고침해 주세요.
      </p>
    </div>
  );
}
