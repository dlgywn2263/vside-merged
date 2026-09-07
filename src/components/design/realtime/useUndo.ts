"use client";

// 경로: src/components/design/realtime/useUndo.ts
//
// Ctrl+Z 로 내가 한 편집만 되돌린다.
//
// 스코프 없이 UndoManager 를 쓰면 Ctrl+Z 한 번에 팀원이 방금 쓴 내용까지
// 사라진다. 실시간 협업에서 가장 흔한 사고라, 여기서는 mutations 가 붙이는
// LOCAL_ORIGIN 표식이 달린 변경만 추적한다.

import { useEffect } from "react";
import * as Y from "yjs";

import { LOCAL_ORIGIN } from "./mutations";
import {
  getApis,
  getMeta,
  getRelations,
  getRequirements,
  getScreenTransitions,
  getScreens,
  getTables,
} from "./yjsSchema";

/**
 * 글자를 치고 있는 중인가.
 *
 * 입력 칸 안에서는 브라우저의 글자 단위 실행취소가 훨씬 자연스럽다.
 * 그것을 가로채 문서 전체를 되돌리면 오히려 쓰기 어려워진다.
 */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) {
    return true;
  }

  // ERD 텍스트 패널(monaco)도 자기 실행취소를 갖고 있다.
  return Boolean(target.closest(".monaco-editor"));
}

export function useDesignUndo(doc: Y.Doc | null): void {
  useEffect(() => {
    if (!doc) return;

    const manager = new Y.UndoManager(
      [
        getMeta(doc),
        getRequirements(doc),
        getScreens(doc),
        getScreenTransitions(doc),
        getApis(doc),
        getTables(doc),
        getRelations(doc),
      ],
      { trackedOrigins: new Set([LOCAL_ORIGIN]) },
    );

    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z") {
        return;
      }

      if (isTyping(event.target)) {
        return;
      }

      event.preventDefault();

      if (event.shiftKey) {
        manager.redo();
      } else {
        manager.undo();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      manager.destroy();
    };
  }, [doc]);
}
