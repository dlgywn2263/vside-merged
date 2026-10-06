// 경로: src/store/slices/safeRunSlice.ts
//
// 안전 실행의 화면 상태 — 상태바에 보여 줄 작성자 상태와, 마지막 실행의 결과.
//
// 여기 있는 것은 전부 서버가 알려 준 값의 사본이다. 프론트가 직접 계산하지 않는다.

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { SafeRunInfo, SafeRunStatus } from "@/lib/ide/safeRun";

export interface SafeRunState {
  /** 지금 보고 있는 브랜치의 작성자 상태. 아직 받아 오지 못했으면 null. */
  status: SafeRunStatus | null;
  /** 마지막 실행에서 누가 빠졌는지 등. 실행을 새로 시작하면 지운다. */
  lastRun: SafeRunInfo | null;
  /** 다른 사람의 실행이 끝나기를 기다리는 중인지(Spring Boot). */
  isWaitingForSlot: boolean;
}

const initialState: SafeRunState = {
  status: null,
  lastRun: null,
  isWaitingForSlot: false,
};

const safeRunSlice = createSlice({
  name: "safeRun",
  initialState,
  reducers: {
    /** 조회 응답이든 실시간 알림이든 "전체 상태"가 오므로 통째로 갈아 끼운다. */
    setSafeRunStatus: (state, action: PayloadAction<SafeRunStatus | null>) => {
      state.status = action.payload;
    },
    setLastSafeRun: (state, action: PayloadAction<SafeRunInfo | null>) => {
      state.lastRun = action.payload;
    },
    setWaitingForRunSlot: (state, action: PayloadAction<boolean>) => {
      state.isWaitingForSlot = action.payload;
    },
  },
});

export const { setSafeRunStatus, setLastSafeRun, setWaitingForRunSlot } = safeRunSlice.actions;
export default safeRunSlice.reducer;
