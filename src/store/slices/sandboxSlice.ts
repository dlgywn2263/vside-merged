// 경로: src/store/slices/sandboxSlice.ts
//
// 샌드박스(개인 레이어)의 화면 상태.
//
// 정본은 서버다. 여기 있는 것은 서버가 알려 준 "켜짐 여부"와 "반영 안 된 파일 목록"의
// 사본이고, 에디터와 탐색기가 "이 파일을 팀 방으로 열지, 내 샌드박스 방으로 열지"를
// 정하는 데 쓴다.

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { SandboxFileKind, SandboxPendingFile, SandboxScope } from "@/lib/ide/sandbox/sandboxApi";

export interface SandboxState {
  /** 이 상태가 어느 워크스페이스·프로젝트·브랜치의 것인지. 아직 받아 오지 못했으면 null. */
  scopeKey: string | null;
  enabled: boolean;
  files: SandboxPendingFile[];
  /**
   * 충돌을 해결하는 중인 파일 → 그 충돌을 계산할 때 팀 파일로 삼았던 내용.
   * 해결을 마칠 때 서버에 이 값을 돌려보내야 비교 기준이 옮겨진다.
   */
  conflicts: Record<string, string>;
}

const initialState: SandboxState = {
  scopeKey: null,
  enabled: false,
  files: [],
  conflicts: {},
};

export function sandboxScopeKey(scope: SandboxScope): string {
  return `${scope.workspaceId}:${scope.projectName}:${scope.branchName}`;
}

/** 이 파일이 지금 내 샌드박스에 있는가(지운 것은 뺀다). 있으면 sbx 방으로 열어야 한다. */
export function isSandboxFile(state: SandboxState, filePath: string | null | undefined): boolean {
  if (!state.enabled || !filePath) return false;

  return state.files.some((file) => file.filePath === filePath && file.kind !== "DELETED");
}

const sandboxSlice = createSlice({
  name: "sandbox",
  initialState,
  reducers: {
    /** 서버가 준 상태로 통째로 갈아 끼운다. */
    setSandbox: (
      state,
      action: PayloadAction<{ scopeKey: string; enabled: boolean; files: SandboxPendingFile[] }>,
    ) => {
      const { scopeKey, enabled, files } = action.payload;

      // 다른 브랜치로 넘어왔으면 그 브랜치에서 해결하던 충돌은 의미가 없다.
      if (state.scopeKey !== scopeKey) state.conflicts = {};

      state.scopeKey = scopeKey;
      state.enabled = enabled;
      state.files = files;
    },

    /** 방금 사본을 뜬 파일을 목록에 넣는다. 서버에 다시 묻지 않고 에디터가 바로 방을 바꿀 수 있게. */
    addSandboxFile: (state, action: PayloadAction<{ filePath: string; kind: SandboxFileKind }>) => {
      const { filePath, kind } = action.payload;
      const existing = state.files.find((file) => file.filePath === filePath);

      if (existing) {
        // 지웠던 파일을 다시 고치기 시작한 경우. 서버도 삭제 표시를 푼다.
        if (existing.kind === "DELETED") existing.kind = kind;
        return;
      }

      state.files.push({ filePath, kind });
    },

    /**
     * 팀 변경을 방금 가져왔다. 그 파일의 "팀이 고쳤어요" 표시를 내린다.
     *
     * 서버에 다시 묻지 않고 여기서 내리는 이유: 서버는 팀 파일을 디스크로 보는데 디스크는
     * 몇 초 늦다. 방금 팀 문서에서 직접 읽어 가져온 내용이 아직 디스크에 없으면, 서버는
     * 잠깐 "아직 다르다"고 답한다. 팀 쪽 저장이 끝나면 알림이 와서 다시 맞춰진다.
     */
    markSandboxTeamSynced: (state, action: PayloadAction<string>) => {
      const file = state.files.find((item) => item.filePath === action.payload);

      if (file) file.teamChanged = false;
    },

    setSandboxConflict: (state, action: PayloadAction<{ filePath: string; liveContent: string }>) => {
      state.conflicts[action.payload.filePath] = action.payload.liveContent;
    },

    clearSandboxConflict: (state, action: PayloadAction<string>) => {
      delete state.conflicts[action.payload];
    },

    resetSandbox: () => initialState,
  },
});

export const {
  setSandbox,
  addSandboxFile,
  markSandboxTeamSynced,
  setSandboxConflict,
  clearSandboxConflict,
  resetSandbox,
} = sandboxSlice.actions;

export default sandboxSlice.reducer;
