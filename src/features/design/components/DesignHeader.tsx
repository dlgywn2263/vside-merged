"use client";

// 경로: src/features/design/components/DesignHeader.tsx
//
// 저장 버튼이 없다. 자동 저장이라 누를 것이 없기 때문이다.
// 대신 지금 상태가 어떤지(저장됐는지, 연결돼 있는지, 몇 명이 보고 있는지)를
// 항상 보이게 둔다. 사용자가 저장을 신경 쓰지 않아도 되려면, 저장되고 있다는
// 사실이 눈에 보여야 한다.

import { useEffect, useState } from "react";
import { AlertTriangle, Check, CloudOff, Loader2, Sparkles, Stethoscope, Users } from "lucide-react";

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
      <span className="flex items-center gap-1.5 text-xs text-slate-500">
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
    return <span className="text-xs text-slate-400">변경사항 저장 대기 중</span>;
  }

  return (
    <span className="flex items-center gap-1.5 text-xs text-slate-500">
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
}

export function DesignHeader({
  workspaceName,
  state,
  issueCount,
  onOpenAiDraft,
}: DesignHeaderProps) {
  const activeTab = useDesignUiStore((s) => s.activeTab);
  const setActiveTab = useDesignUiStore((s) => s.setActiveTab);
  const doctorOpen = useDesignUiStore((s) => s.doctorOpen);
  const toggleDoctor = useDesignUiStore((s) => s.toggleDoctor);

  return (
    <header className="flex flex-col gap-3 border-b border-slate-200 bg-white px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-slate-900">
            {workspaceName || "설계 관리"}
          </h1>
          <SaveIndicator state={state} />
        </div>

        <div className="flex items-center gap-2">
          {state.peerCount > 1 ? (
            <span className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
              <Users className="h-3.5 w-3.5" />
              {state.peerCount}명이 함께 보는 중
            </span>
          ) : null}

          <Button
            variant="outline"
            size="sm"
            onClick={onOpenAiDraft}
            className="gap-1.5"
          >
            <Sparkles className="h-4 w-4 text-indigo-500" />
            AI 초안
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
      </div>

      <nav className="flex gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition",
              activeTab === tab.id
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100",
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>
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
