// 경로: src/hooks/ide/useRightPanelAutoCollapse.ts
"use client";

import { useLayoutEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import { setRightPanelCompact } from "@/store/slices/uiSlice";

// 이 너비 이하면 오른쪽 AI/채팅 패널을 자동으로 접는다. 시연에서 1920px 화면을 반으로 나눈
// 960px 창이 여기에 걸린다. 1100px 에서도 활동 바(48)+탐색기(260)+패널(320)을 빼면 에디터가
// 470px 남짓이라, 그보다 좁아지면 패널이 에디터를 지나치게 압축한다.
export const RIGHT_PANEL_COMPACT_MAX_WIDTH = 1100;

// 접힌 패널 자리에 남는 아이콘 바(RightPanelRail, w-11)의 너비
export const RIGHT_PANEL_RAIL_WIDTH = 44;

type RightPanelUiState = {
  ui: {
    isRightPanelVisible: boolean;
    isRightPanelCompact: boolean;
    isRightPanelOverlayOpen: boolean;
  };
};

// 개인(IdeMain)·팀(TeamIdeMain) 셸이 오른쪽 패널을 어떻게 그릴지 정한다.
// 사용자가 고른 열림 상태(isRightPanelVisible)는 그대로 두고 창 너비만 보고 화면 표시를 바꾼다.
export function useRightPanelAutoCollapse() {
  const dispatch = useDispatch();
  const { isRightPanelVisible, isRightPanelCompact, isRightPanelOverlayOpen } = useSelector(
    (state: RightPanelUiState) => state.ui,
  );

  // 첫 화면부터 지금 창 너비에 맞게 그리도록 페인트 전에 판정한다.
  useLayoutEffect(() => {
    const query = window.matchMedia(`(max-width: ${RIGHT_PANEL_COMPACT_MAX_WIDTH}px)`);
    const sync = () => dispatch(setRightPanelCompact(query.matches));
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, [dispatch]);

  const isOverlay = isRightPanelCompact && isRightPanelOverlayOpen;

  return {
    isCompact: isRightPanelCompact,
    // 패널 내용이 지금 화면에 보이는가(붙어 있든 겹쳐 있든)
    isShown: isRightPanelCompact ? isRightPanelOverlayOpen : isRightPanelVisible,
    isOverlay,
    // 좁은 창에서는 패널을 겹쳐 띄워도 아이콘 바를 남겨 다른 탭으로 바꾸거나 닫을 수 있게 한다.
    showRail: isRightPanelCompact || !isRightPanelVisible,
  };
}
