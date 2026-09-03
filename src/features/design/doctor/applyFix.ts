"use client";

// 경로: src/features/design/doctor/applyFix.ts
//
// 설계 점검이 알려 준 수정을 문서에 적용한다.
//
// 여기서 하는 일은 "옮기기"뿐이다. 무엇을 어떻게 바꿀지는 서버가 정했고,
// 쓰기는 mutations 의 기존 메서드를 그대로 부른다. 새 쓰기 경로를 만들지
// 않으므로 양방향 연결 규칙도, Ctrl+Z 도 저절로 따라온다.

import type { Fix } from "../api/designDoctorApi";
import type { DesignMutations } from "../realtime/mutations";

export function applyDoctorFix(mutations: DesignMutations, fix: Fix): void {
  switch (fix.kind) {
    case "RENAME_COLUMN":
      if (fix.columnId && fix.value) {
        mutations.updateColumn(fix.targetId, fix.columnId, { name: fix.value });
      }
      return;

    case "ALIGN_FK_TYPE":
      if (fix.columnId && fix.value) {
        mutations.updateColumn(fix.targetId, fix.columnId, {
          type: fix.value,
          length: fix.length ?? null,
        });
      }
      return;

    case "SET_SCREEN_ROUTE":
      mutations.updateScreen(fix.targetId, { key: fix.value ?? "" });
      return;

    case "ADD_PK_COLUMN":
      mutations.addColumn(fix.targetId, {
        name: "id",
        type: "BIGINT",
        isPk: true,
        nullable: false,
      });
      return;

    case "DELETE_RELATION":
      mutations.removeRelation(fix.targetId);
      return;

    case "DELETE_TRANSITION":
      mutations.removeTransition(fix.targetId);
      return;
  }
}

/** 버튼에 쓸 짧은 설명. 무엇으로 바뀌는지 눌러 보기 전에 알 수 있어야 한다. */
export function describeFix(fix: Fix): string {
  switch (fix.kind) {
    case "RENAME_COLUMN":
      return `${fix.value} 로 바꾸기`;
    case "ALIGN_FK_TYPE":
      return `${fix.value} 로 맞추기`;
    case "SET_SCREEN_ROUTE":
      return `${fix.value} 로 바꾸기`;
    case "ADD_PK_COLUMN":
      return "id 기본키 넣기";
    case "DELETE_RELATION":
      return "이 관계 지우기";
    case "DELETE_TRANSITION":
      return "이 화살표 지우기";
  }
}
