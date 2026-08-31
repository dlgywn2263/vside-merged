"use client";

// 경로: src/features/design/store/designUiStore.ts
//
// 화면에만 필요한 상태를 담는다. 탭 선택, 검색어, 지금 보고 있는 항목 같은 것들.
//
// 문서 데이터는 여기에 절대 복제하지 않는다. Y.Doc 이 유일한 진짜이고,
// 복제본을 두는 순간 어느 쪽이 맞는지 알 수 없어지며 양방향 동기화 버그가
// 시작된다. 여기 들어오는 것은 새로고침하면 사라져도 아무 문제 없는 값들뿐이다.
//
// Redux 대신 zustand 를 쓰는 이유는 기존 관례를 따르기 위해서다.
// Redux 스토어는 IDE 전용이고, 워크스페이스 위저드가 이미 zustand 를 쓴다.

import { create } from "zustand";

export type DesignTab = "requirements" | "screens" | "erd" | "apis";

export interface DesignSelection {
  requirementId: string | null;
  screenId: string | null;
  apiId: string | null;
  tableId: string | null;
}

interface DesignUiState {
  activeTab: DesignTab;
  search: Record<DesignTab, string>;
  selection: DesignSelection;

  /** 설계 닥터 패널을 펼쳐 두었는지. */
  doctorOpen: boolean;

  /** ERD 탭에서 텍스트 패널이 차지하는 비율(0~1). */
  erdTextRatio: number;

  setActiveTab: (tab: DesignTab) => void;
  setSearch: (tab: DesignTab, keyword: string) => void;
  select: (patch: Partial<DesignSelection>) => void;
  clearSelection: () => void;
  toggleDoctor: (open?: boolean) => void;
  setErdTextRatio: (ratio: number) => void;
}

const EMPTY_SELECTION: DesignSelection = {
  requirementId: null,
  screenId: null,
  apiId: null,
  tableId: null,
};

export const useDesignUiStore = create<DesignUiState>((set) => ({
  activeTab: "requirements",
  search: { requirements: "", screens: "", erd: "", apis: "" },
  selection: EMPTY_SELECTION,
  doctorOpen: true,
  erdTextRatio: 0.42,

  setActiveTab: (tab) => set({ activeTab: tab }),

  setSearch: (tab, keyword) =>
    set((state) => ({ search: { ...state.search, [tab]: keyword } })),

  select: (patch) =>
    set((state) => ({ selection: { ...state.selection, ...patch } })),

  clearSelection: () => set({ selection: EMPTY_SELECTION }),

  toggleDoctor: (open) =>
    set((state) => ({ doctorOpen: open ?? !state.doctorOpen })),

  setErdTextRatio: (ratio) =>
    set({ erdTextRatio: Math.min(0.8, Math.max(0.2, ratio)) }),
}));

/**
 * 설계 닥터가 보고한 항목을 클릭했을 때 해당 탭으로 이동하고 그 항목을 고른다.
 * 닥터의 가치는 "여기가 문제다"에서 끝나지 않고 그 자리로 데려다주는 데 있다.
 */
export function focusDesignTarget(kind: string, id: string): void {
  const store = useDesignUiStore.getState();

  switch (kind) {
    case "requirement":
      store.setActiveTab("requirements");
      store.select({ requirementId: id });
      break;
    case "screen":
    case "transition":
      store.setActiveTab("screens");
      store.select({ screenId: id });
      break;
    case "api":
      store.setActiveTab("apis");
      store.select({ apiId: id });
      break;
    case "table":
    case "column":
    case "relation":
      store.setActiveTab("erd");
      store.select({ tableId: id });
      break;
    default:
      break;
  }
}
