"use client";

// 경로: src/components/design/store/designUiStore.ts
// 문서 데이터는 Y.Doc에서 관리하고, 이 스토어는 화면 상태만 관리한다.

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

  /** 설계 현황(닥터) 패널. 상세 정보 패널과 별도로 관리한다. */
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
  selection: { ...EMPTY_SELECTION },
  doctorOpen: false,
  erdTextRatio: 0.42,

  // 탭 이동만으로 상세 패널이나 설계 현황 패널이 열리지 않도록 한다.
  // 같은 탭을 다시 누르는 경우에는 현재 상태를 유지한다.
  setActiveTab: (tab) =>
    set((state) =>
      state.activeTab === tab
        ? {}
        : {
            activeTab: tab,
            selection: { ...EMPTY_SELECTION },
            doctorOpen: false,
          },
    ),

  setSearch: (tab, keyword) =>
    set((state) => ({ search: { ...state.search, [tab]: keyword } })),

  // 목록/카드 선택 시 해당 항목의 ID를 저장한다.
  // 각 탭은 selection의 ID를 기준으로 상세 정보 패널을 렌더링한다.
  // 이때 설계 현황 패널은 함께 열지 않고 닫는다.
  select: (patch) =>
    set((state) => ({
      selection: { ...state.selection, ...patch },
      doctorOpen: false,
    })),

  clearSelection: () => set({ selection: { ...EMPTY_SELECTION } }),

  // 설계 현황 버튼에서만 호출해야 한다. 다른 곳에서 호출하면 안 된다.
  toggleDoctor: (open) =>
    set((state) => ({ doctorOpen: open ?? !state.doctorOpen })),

  setErdTextRatio: (ratio) =>
    set({ erdTextRatio: Math.min(0.8, Math.max(0.2, ratio)) }),
}));

/** 설계 현황에서 특정 문제를 클릭하면 해당 탭과 항목으로 이동한다. */
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
