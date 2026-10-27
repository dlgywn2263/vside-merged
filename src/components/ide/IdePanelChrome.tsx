"use client";

// 경로: src/components/ide/IdePanelChrome.tsx
// 개인(IdeMain)·팀(TeamIdeMain) 셸이 같이 쓰는 패널 장식: 너비/높이 조절 손잡이와
// 오른쪽 패널을 접었을 때 보이는 세로 아이콘 바. 화면 모양만 담당하고 상태는 셸이 넘긴다.

import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";

export const IDE_BRAND = "#5873F9";

type ResizeHandleProps = {
  orientation: "vertical" | "horizontal";
  // 손잡이가 패널의 어느 가장자리에 붙는지
  edge: "left" | "right" | "top";
  active: boolean;
  title: string;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
};

export function PanelResizeHandle({ orientation, edge, active, title, onPointerDown }: ResizeHandleProps) {
  const isVertical = orientation === "vertical";
  const position =
    edge === "right"
      ? "right-0 top-0 h-full w-2 translate-x-1/2"
      : edge === "left"
        ? "left-0 top-0 h-full w-2 -translate-x-1/2"
        : "left-0 top-0 h-2 w-full -translate-y-1/2";

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      title={title}
      onPointerDown={onPointerDown}
      className={`group absolute z-[700] touch-none ${position} ${isVertical ? "cursor-col-resize" : "cursor-row-resize"}`}
    >
      <div
        className={`transition-colors ${
          isVertical ? "mx-auto h-full w-[2px]" : "my-auto h-[2px] w-full translate-y-[3px]"
        } ${active ? "bg-[#5873F9]" : "bg-transparent group-hover:bg-[#5873F9]/70"}`}
      />
    </div>
  );
}

export type RailItem = {
  id: string;
  label: string;
  icon: ReactNode;
};

type RightPanelRailProps = {
  items: RailItem[];
  activeId: string;
  onSelect: (id: string) => void;
};

// 오른쪽 패널을 접었을 때 화면 오른쪽 가장자리에 고정되는 아이콘 바.
// 예전 화살표 버튼은 음수 여백으로 걸쳐 있어 화면 끝에서 잘렸다. 이 바는 레이아웃 흐름 안에서
// 고정 폭을 차지하므로 창 너비가 바뀌어도 가려지지 않는다.
export function RightPanelRail({ items, activeId, onSelect }: RightPanelRailProps) {
  return (
    <div className="z-30 flex h-full w-11 shrink-0 flex-col items-center gap-1 border-l border-gray-200 bg-[#f8f8f8] pt-2">
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            aria-label={`${item.label} 열기`}
            className={`group relative flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
              active ? "text-[#5873F9]" : "text-gray-400 hover:bg-gray-200/60 hover:text-gray-600"
            }`}
          >
            {active && <span className="absolute bottom-1.5 right-[-2px] top-1.5 w-[3px] rounded-l-full bg-[#5873F9]" />}
            {item.icon}
            {/* 툴팁은 바 왼쪽(에디터 쪽)으로 띄워야 화면 밖으로 안 나간다 */}
            <span className="pointer-events-none absolute right-full top-1/2 z-50 mr-2 -translate-y-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
