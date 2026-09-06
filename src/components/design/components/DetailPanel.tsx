"use client";

// 경로: src/components/design/components/DetailPanel.tsx
//
// 오른쪽 편집 패널의 공용 껍데기.
//
// 요구사항·화면 흐름·API 세 탭이 "왼쪽에서 고르고 오른쪽에서 편집한다"는
// 같은 짜임을 쓰는데, 예전에는 그 껍데기가 세 파일에 각각 복제돼 있었다.
// 한쪽만 고치면 탭을 옮길 때마다 모양이 달라져 오히려 어색해진다.
//
// 생김새는 팀이 새로 만든 개발일지 상세 패널
// (src/components/devlogs/components/DevlogDetailPanel.tsx)을 따랐다.
// 흰 바탕에 고정된 머리를 얹고, 내용은 카드로 나눈다.

import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

export function DetailPanel({
  width = "w-[340px]",
  children,
}: {
  /** API 탭은 JSON 예시가 들어가 더 넓어야 한다. */
  width?: string;
  children: React.ReactNode;
}) {
  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-l border-[var(--waivs-border)] bg-white",
        width,
      )}
    >
      {children}
    </aside>
  );
}

/**
 * 패널 머리. 무엇을 편집하는 중인지 항상 보이게 한다.
 *
 * 예전에는 "화면 정보" 같은 작은 회색 글씨 하나뿐이라, 목록에서 눈을 떼면
 * 지금 고른 것이 무엇이었는지 다시 확인해야 했다.
 */
export function DetailPanelHeader({
  eyebrow,
  title,
  icon: Icon,
  onClose,
}: {
  /** 위에 붙는 작은 대문자 라벨. 예: "REQUIREMENT" */
  eyebrow: string;
  title: string;
  icon: LucideIcon;
  onClose: () => void;
}) {
  return (
    <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-[var(--waivs-border)] px-4">
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-wide text-[#5873F9]">
          {eyebrow}
        </p>
        <h2 className="truncate text-sm font-black text-[var(--waivs-text)]">
          {title}
        </h2>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#EEF3FF] text-[#5873F9]">
          <Icon size={16} />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-lg text-[var(--waivs-text-muted)] transition hover:bg-[var(--waivs-surface-soft)] hover:text-[var(--waivs-text-sub)]"
          title="편집 패널 닫기"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

/** 머리 아래 스크롤되는 몸통. */
export function DetailPanelBody({ children }: { children: React.ReactNode }) {
  return <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">{children}</div>;
}

/**
 * 내용 한 덩어리. 카드로 감싸야 어디까지가 한 묶음인지 눈에 들어온다.
 *
 * tone="soft" 는 맨 위 요약 카드용이다. 개발일지 패널도 첫 카드만
 * 회색으로 깔아 "이건 지금 고른 것의 요약"임을 알린다.
 */
export function DetailSection({
  title,
  action,
  tone = "plain",
  children,
}: {
  title?: string;
  /** 제목 오른쪽에 놓는 버튼 같은 것. */
  action?: React.ReactNode;
  tone?: "plain" | "soft";
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--waivs-border)] p-4",
        tone === "soft" ? "bg-[var(--waivs-surface-soft)]" : "bg-white",
      )}
    >
      {title ? (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-xs font-black text-[var(--waivs-text)]">{title}</h3>
          {action}
        </div>
      ) : null}

      {children}
    </section>
  );
}

/** 라벨 + 입력칸 + 도움말. 간격을 여기 한곳에서 정한다. */
export function DetailField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[11px] font-bold text-[var(--waivs-text-sub)]">{label}</label>
      <div className="mt-1.5">{children}</div>
      {hint ? (
        <p className="mt-1.5 text-[11px] text-[var(--waivs-text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

/** 아무것도 고르지 않았을 때. 맨 글자보다 점선 상자가 "여기가 빈 자리"임을 알린다. */
export function DetailEmpty({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-4">
      <div className="w-full rounded-2xl border border-dashed border-[var(--waivs-border)] bg-[var(--waivs-surface-soft)] p-6 text-center">
        <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-white text-[var(--waivs-text-muted)]">
          <Icon size={18} />
        </div>
        <p className="mt-3 text-sm font-bold text-[var(--waivs-text-sub)]">{title}</p>
        <p className="mt-1 text-xs leading-5 text-[var(--waivs-text-muted)]">{description}</p>
      </div>
    </div>
  );
}

/**
 * 삭제 버튼.
 *
 * 예전에는 패널 구석의 작은 아이콘이었다. 눈에 안 띄어 못 찾거나,
 * 다른 버튼을 누르려다 잘못 누르기 쉬웠다. 맨 아래에 글씨까지 붙여 둔다.
 */
export function DetailDangerButton({
  label,
  onClick,
  icon: Icon,
}: {
  label: string;
  onClick: () => void;
  icon: LucideIcon;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-xs font-black text-red-600 transition hover:border-red-200 hover:bg-red-100"
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
