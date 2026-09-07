"use client";

import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import Editor, { DiffEditor, useMonaco } from "@monaco-editor/react";
import { useDispatch, useSelector } from "react-redux";
import { usePathname } from "next/navigation";
import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";
import { CodeDocSession } from "@/lib/ide/collab/codeDocSession";
import { VscCheck, VscClose, VscSparkle, VscLoading, VscLock, VscWarning, VscArrowRight } from "react-icons/vsc";

import {
  updateFileContent,
  setAiSuggestion,
  clearAiSuggestion,
} from "@/store/slices/fileSystemSlice";

import {
  saveFileApi,
  fetchAiAssistApi,
  fetchAiAutocompleteApi,
  getUserProfileApi,
} from "@/lib/ide/api";

import {
  writeToTerminal,
  toggleBreakpoint,
  triggerEditorCmd,
  addAgentMessage,
  setSelectedText,
  setActiveActivity,
  clearConflictNavigation,
} from "@/store/slices/uiSlice";

import { useAuth } from "@/contexts/AuthContext";

const configureTypeScriptMonaco = (monacoInstance) => {
  if (!monacoInstance?.languages?.typescript) return;

  const ts = monacoInstance.languages.typescript;

  const compilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    jsx: ts.JsxEmit.ReactJSX ?? ts.JsxEmit.React,
    allowJs: true,
    checkJs: false,
    allowNonTsExtensions: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    strict: false,
    noEmit: true,
    isolatedModules: true,
    skipLibCheck: true,
    resolveJsonModule: true,
  };

  ts.typescriptDefaults.setCompilerOptions(compilerOptions);
  ts.javascriptDefaults.setCompilerOptions(compilerOptions);

  // 브라우저 Monaco는 실제 node_modules 타입을 완전히 못 읽기 때문에
  // 의미 기반 타입 진단은 끄고, 문법 오류만 표시하게 둔다.
  ts.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: true,
  });

  ts.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: true,
  });

  ts.typescriptDefaults.setEagerModelSync(true);

  const reactAndNextTypes = `
    declare namespace React {
      type ReactNode = any;
      type CSSProperties = any;

      interface Attributes {
        key?: string | number;
      }

      interface HTMLAttributes<T> {
        className?: string;
        id?: string;
        style?: CSSProperties;
        children?: ReactNode;
        [key: string]: any;
      }

      interface DetailedHTMLProps<E, T> extends E {}

      function createElement(...args: any[]): any;
    }

    declare namespace JSX {
      interface Element {}
      interface ElementClass {}
      interface ElementAttributesProperty {
        props: {};
      }
      interface ElementChildrenAttribute {
        children: {};
      }
      interface IntrinsicAttributes {
        key?: string | number;
        [key: string]: any;
      }
      interface IntrinsicElements {
        [elemName: string]: any;
      }
    }

    declare module "react" {
      export = React;
      export as namespace React;
    }

    declare module "react/jsx-runtime" {
      export const jsx: any;
      export const jsxs: any;
      export const Fragment: any;

      export namespace JSX {
        interface Element {}
        interface ElementClass {}
        interface ElementAttributesProperty {
          props: {};
        }
        interface ElementChildrenAttribute {
          children: {};
        }
        interface IntrinsicAttributes {
          key?: string | number;
          [key: string]: any;
        }
        interface IntrinsicElements {
          [elemName: string]: any;
        }
      }
    }

    declare module "next" {
      export type Metadata = {
        title?: string;
        description?: string;
        [key: string]: any;
      };
    }

    declare module "next/link" {
      const Link: any;
      export default Link;
    }

    declare module "next/image" {
      const Image: any;
      export default Image;
    }

    declare module "*.css" {
      const content: any;
      export default content;
    }

    declare module "*.module.css" {
      const classes: { readonly [key: string]: string };
      export default classes;
    }
  `;

  ts.typescriptDefaults.addExtraLib(
    reactAndNextTypes,
    "file:///node_modules/@types/wevais-react-next/index.d.ts",
  );

  ts.javascriptDefaults.addExtraLib(
    reactAndNextTypes,
    "file:///node_modules/@types/wevais-react-next/index.d.ts",
  );
};

const normalizeCollabKeyPart = (value, fallback = "") => {
  return String(value ?? fallback)
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/+/, "")
    .trim();
};


/**
 * 디버거가 알려 준 경로와 지금 열려 있는 파일이 같은 파일인지.
 *
 * 백엔드는 실행 컨테이너 안의 경로를 그대로 돌려주기 때문에 앞쪽 접두사가
 * 프론트의 파일 id 와 다를 수 있다. 앞이 달라도 뒤쪽이 통째로 맞으면 같은
 * 파일로 본다. 정확히 같은 문자열만 인정하면 멈춘 줄이 영영 표시되지 않는다.
 */
const isSameDebugFile = (debugPath, fileId) => {
  const normalizedDebugPath = normalizeCollabKeyPart(debugPath);
  const normalizedFileId = normalizeCollabKeyPart(fileId);

  if (!normalizedDebugPath || !normalizedFileId) return false;

  return (
    normalizedDebugPath === normalizedFileId ||
    normalizedDebugPath.endsWith("/" + normalizedFileId) ||
    normalizedFileId.endsWith("/" + normalizedDebugPath)
  );
};

const parseMergeConflicts = (value = "") => {
  const lines = String(value || "").split("\n");
  const conflicts = [];
  let currentConflict = null;

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    if (line.startsWith("<<<<<<<")) {
      currentConflict = {
        start: lineNumber,
        mid: null,
        end: null,
        currentLabel: line.replace(/^<<<<<<<\s*/, "").trim() || "Current",
        incomingLabel: "Incoming",
      };
      return;
    }

    if (line.startsWith("=======") && currentConflict) {
      currentConflict.mid = lineNumber;
      return;
    }

    if (line.startsWith(">>>>>>>") && currentConflict) {
      currentConflict.end = lineNumber;
      currentConflict.incomingLabel =
        line.replace(/^>>>>>>>\s*/, "").trim() || "Incoming";

      if (currentConflict.mid && currentConflict.end) {
        conflicts.push({ ...currentConflict });
      }

      currentConflict = null;
    }
  });

  return conflicts;
};

const applyConflictEdit = (monacoInstance, editor, conflict, type) => {
  const model = editor.getModel();
  if (!model || model.isDisposed()) return false;

  let newText = "";
  let currentText = "";
  
  if (conflict.mid - conflict.start > 1) {
    const curRange = new monacoInstance.Range(
      conflict.start + 1, 1, 
      conflict.mid - 1, model.getLineMaxColumn(conflict.mid - 1) || 1
    );
    currentText = model.getValueInRange(curRange);
  }
  
  let incomingText = "";
  if (conflict.end - conflict.mid > 1) {
    const incRange = new monacoInstance.Range(
      conflict.mid + 1, 1, 
      conflict.end - 1, model.getLineMaxColumn(conflict.end - 1) || 1
    );
    incomingText = model.getValueInRange(incRange);
  }

  if (type === "current") newText = currentText;
  else if (type === "incoming") newText = incomingText;
  else if (type === "both") {
    newText = currentText;
    if (currentText && incomingText) newText += "\n";
    newText += incomingText;
  }

  const fullRange = new monacoInstance.Range(
    conflict.start, 1, 
    conflict.end, model.getLineMaxColumn(conflict.end) || 1
  );

  editor.executeEdits("conflict-resolver", [{
    range: fullRange,
    text: newText,
    forceMoveMarkers: true
  }]);

  editor.focus();
  return true;
};


function EditorModalPortal({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(children, document.body);
}

export default function CodeEditor() {
  const dispatch = useDispatch();
  const monaco = useMonaco();
  const pathname = usePathname();
  const { user } = useAuth();

  const editorRef = useRef(null);
  const monacoRef = useRef(null); 
  
  /**
   * 팀원이 지금 커서를 두고 있는 줄. 값은 그 사람의 표시 이름이다.
   *
   * 내 커서가 이 줄들과 겹치면 에디터를 읽기 전용으로 바꿔 입력을 막는다.
   * 예전에는 onKeyDown 에서 키를 가로챘는데, 그 방식은 한글 조합 입력과
   * 붙여넣기, 여러 줄 선택 후 덮어쓰기를 그대로 통과시켰다. readOnly 는
   * 그 경로를 전부 막는다.
   *
   * 다만 서버가 문서의 주인이 아닌 CRDT 구조라서, 상대가 Yjs 로 보내오는
   * 편집까지 막을 수는 없다. 어디까지나 같은 자리를 동시에 고치는 사고를
   * 줄이기 위한 장치다.
   */
  const lockedLinesRef = useRef({});
  const lockDecosRef = useRef([]);

  /**
   * 팀원 커서 자리에 띄우는 이름표. clientId -> Monaco content widget.
   *
   * 데코레이션(injected text)으로 그렸더니 편집이 일어날 때마다 지워졌다
   * 다시 그려져 이름표가 깜빡였다. content widget 은 문서 위에 얹히는 별도
   * 레이어라 본문 편집에 영향을 받지 않는다.
   */
  const peerWidgetsRef = useRef(new Map());

  /** 팀 모드 되돌리기. 내가 한 편집만 추적한다. */
  const undoManagerRef = useRef(null);

  /** 디스크에 있던 내용. 서버에 저장본이 없을 때 이것으로 문서를 만든다. */
  const localContentRef = useRef("");

  const conflictDecosRef = useRef([]);

  /** 브레이크포인트와 현재 실행 줄에 붙여 둔 데코레이션 id 목록. */
  const debugDecosRef = useRef([]);
  const conflictOriginalContentRef = useRef({});
  const cursorListenerRef = useRef(null); 

  // [아키텍처 개선] 파일별 최신 로컬 상태를 독립적으로 추적하는 딕셔너리 맵 구조 도입 (O(1) 접근성)
  const saveTimerRef = useRef(null);
  const latestContentRef = useRef({}); 
  const prevFileIdRef = useRef(null);

  const [fontSize, setFontSize] = useState(14);
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [editorMountVersion, setEditorMountVersion] = useState(0);
  const [fetchedNickname, setFetchedNickname] = useState("");

  const [mergeConflicts, setMergeConflicts] = useState([]);
  const [conflictSessionFileId, setConflictSessionFileId] = useState(null);
  const [lastConflictCount, setLastConflictCount] = useState(0);
  const [conflictResetDialog, setConflictResetDialog] = useState({
    isOpen: false,
    type: "confirm",
  });
  const [editorNotice, setEditorNotice] = useState(null);

  /** 지금 내 자리를 잡고 있는 팀원 이름. 없으면 null 이고, 있으면 읽기 전용이 된다. */
  const [peerLockName, setPeerLockName] = useState(null);

  /** 디스크에는 내용이 있는데 협업 문서가 아직 비어 있는 상태인지. */
  const [isDocumentLoading, setIsDocumentLoading] = useState(false);

  const aiInputRef = useRef(null);

  const {
    activeFileId,
    fileContents,
    workspaceId,
    activeProject,
    activeBranch,
    aiSuggestion,
  } = useSelector((state) => state.fileSystem);

  const fileContentsRef = useRef(fileContents);
  useEffect(() => {
    fileContentsRef.current = fileContents;
  }, [fileContents]);

  const { editorCmd, debugLine, breakpoints, conflictNavigationTarget } =
    useSelector((state) => state.ui);

  const editorSettings = useSelector((state) => state.ui.editorSettings) || {
    autoComplete: true,
    formatOnType: true,
    minimap: true,
  };

  const activeContent = activeFileId ? fileContents[activeFileId] || "" : "";
  const hasMergeConflicts = mergeConflicts.length > 0;

  const collabFileKey = useMemo(() => {
  if (!activeFileId) return "";

  return normalizeCollabKeyPart(activeFileId);
}, [activeFileId]);

  const monacoModelPath = useMemo(() => {
    if (!collabFileKey) return "";

    return [
      normalizeCollabKeyPart(workspaceId, "workspace"),
      normalizeCollabKeyPart(activeProject, "project"),
      normalizeCollabKeyPart(activeBranch, "master"),
      collabFileKey,
    ]
      .map((part) => encodeURIComponent(String(part)))
      .join("/");
  }, [workspaceId, activeProject, activeBranch, collabFileKey]);

  const stateRef = useRef({
    activeFileId,
    workspaceId,
    activeProject,
    activeBranch,
  });

  /** 이 파일의 동시편집 세션. 문서를 받아 오고 저장하는 일을 맡는다. */
  const sessionRef = useRef(null);

  const bindingRef = useRef(null);
  const collabSessionRef = useRef(0);
  const awarenessChangeListenerRef = useRef(null);

  const isTeamMode = pathname?.includes("/team");
  
  const isTeamModeRef = useRef(isTeamMode);
  useEffect(() => {
    isTeamModeRef.current = isTeamMode;
  }, [isTeamMode]);

  useEffect(() => {
    const parsedConflicts = parseMergeConflicts(activeContent);
    setMergeConflicts(parsedConflicts);

    if (!activeFileId) {
      setConflictSessionFileId(null);
      setLastConflictCount(0);
      return;
    }

    if (parsedConflicts.length > 0) {
      if (conflictSessionFileId !== activeFileId || !conflictOriginalContentRef.current[activeFileId]) {
        conflictOriginalContentRef.current[activeFileId] = activeContent;
      }
      setConflictSessionFileId(activeFileId);
      setLastConflictCount(parsedConflicts.length);
      return;
    }

    if (conflictSessionFileId && conflictSessionFileId !== activeFileId) {
      setConflictSessionFileId(null);
      setLastConflictCount(0);
    }
  }, [activeContent, activeFileId, conflictSessionFileId]);

  // [방어적 코드] 활성 탭이 전환될 때마다, 직전 탭의 Pending 상태를 즉시 Redux로 동기화
  useEffect(() => {
    const prevFileId = prevFileIdRef.current;
    if (prevFileId && prevFileId !== activeFileId) {
      const pendingContent = latestContentRef.current[prevFileId];
      // 추적된 내용이 존재하고, Redux에 반영되지 않은 경우에만 Flush
      if (pendingContent !== undefined && pendingContent !== fileContents[prevFileId]) {
        dispatch(updateFileContent({ filePath: prevFileId, content: pendingContent }));
      }
    }
    prevFileIdRef.current = activeFileId;
  }, [activeFileId, dispatch, fileContents]);

  // [생명주기 클린업] 컴포넌트 완전히 언마운트 될 때 타이머 초기화 및 최종 Flush
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const currentFileId = prevFileIdRef.current;
      if (currentFileId && latestContentRef.current[currentFileId] !== undefined) {
         dispatch(updateFileContent({ filePath: currentFileId, content: latestContentRef.current[currentFileId] }));
      }
    };
  }, [dispatch]);

  // 💡 [핵심 개선 포인트: Yjs Bridge 패턴 적용]
  // 기존의 '!isTeamModeRef.current' 조건을 과감히 제거했습니다.
  // 백엔드가 코드를 조작하여 Redux가 갱신되면, Yjs 팀 모드라 할지라도
  // 변경사항을 에디터에 밀어넣어 y-monaco가 이를 감지하고 B 사용자에게 전파하도록 합니다.
  useEffect(() => {
    if (isTeamModeRef.current && bindingRef.current) {
      return;
    }

    if (editorRef.current && activeFileId) {
      const model = editorRef.current.getModel();
      const reduxContent = fileContents[activeFileId] || "";
      const lastTypedContent = latestContentRef.current[activeFileId];

      if (model && !model.isDisposed()) {
        if (reduxContent !== model.getValue() && reduxContent !== lastTypedContent) {
          model.pushEditOperations(
            [],
            [{ range: model.getFullModelRange(), text: reduxContent }],
            () => null
          );
          latestContentRef.current[activeFileId] = reduxContent;
        }
      }
    }
  }, [fileContents, activeFileId]);

  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      if (
        event.reason &&
        event.reason.type === "cancelation" &&
        event.reason.msg === "operation is manually canceled"
      ) {
        event.preventDefault(); 
      }
    };
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => window.removeEventListener("unhandledrejection", handleUnhandledRejection);
  }, []);

  const getMyDisplayName = useCallback(() => {
    if (fetchedNickname) return fetchedNickname;
    if (user?.nickname) return user.nickname;
    if (user?.email) return user.email.split("@")[0];

    try {
      if (typeof window !== "undefined") {
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        if (storedUser?.nickname) return storedUser.nickname;
        if (storedUser?.email) return storedUser.email.split("@")[0];
      }
    } catch {}

    return "익명 개발자";
  }, [fetchedNickname, user]);

  /**
   * 협업 방에 올릴 표시 이름.
   *
   * 이름을 setupCollaboration 의 의존성으로 넣으면, 프로필 조회가 끝나
   * 닉네임이 바뀌는 순간 방을 통째로 다시 잡는다. 편집 도중에 연결이
   * 끊겼다 붙는 셈이라 위험하다. 그래서 값은 ref 로만 넘겨서 방은 그대로
   * 두고 이름만 갈아 끼운다.
   */
  const displayNameRef = useRef("익명 개발자");

  useEffect(() => {
    displayNameRef.current = getMyDisplayName();
  }, [getMyDisplayName]);

  /**
   * 내 커서나 선택 영역이 팀원이 잡은 줄과 겹치는지 다시 계산한다.
   *
   * 커서가 놓인 한 줄만 보지 않고 선택 범위 전체를 훑는다. 잠긴 줄을
   * 포함해서 드래그한 뒤 덮어쓰는 것이 예전 방식의 가장 큰 구멍이었다.
   */
  const refreshPeerLock = useCallback(() => {
    if (!isTeamModeRef.current) {
      setPeerLockName(null);
      return;
    }

    const selection = editorRef.current?.getSelection?.();

    if (!selection) {
      setPeerLockName(null);
      return;
    }

    const startLine = Math.min(
      selection.startLineNumber,
      selection.endLineNumber,
    );
    const endLine = Math.max(selection.startLineNumber, selection.endLineNumber);

    let blockedBy = null;

    for (let line = startLine; line <= endLine; line += 1) {
      if (lockedLinesRef.current[line]) {
        blockedBy = lockedLinesRef.current[line];
        break;
      }
    }

    setPeerLockName(blockedBy);
  }, []);

  /**
   * 되돌리기 / 다시하기.
   *
   * 팀 모드에서는 Monaco 기본 되돌리기를 쓰지 않는다. 이유는 아래
   * UndoManager 를 만드는 자리에 적어 두었다. 개인 모드는 그대로 둔다.
   */
  const runUndo = useCallback(() => {
    const editor = editorRef.current;

    if (!editor) return;

    if (isTeamModeRef.current && undoManagerRef.current) {
      undoManagerRef.current.undo();
      return;
    }

    editor.trigger("keyboard", "undo", null);
  }, []);

  const runRedo = useCallback(() => {
    const editor = editorRef.current;

    if (!editor) return;

    if (isTeamModeRef.current && undoManagerRef.current) {
      undoManagerRef.current.redo();
      return;
    }

    editor.trigger("keyboard", "redo", null);
  }, []);

  /** 팀원 이름표를 전부 걷어낸다. 방을 바꾸거나 나갈 때 쓴다. */
  const removeAllPeerWidgets = useCallback(() => {
    const editor = editorRef.current;

    peerWidgetsRef.current.forEach((widget) => {
      try {
        editor?.removeContentWidget?.(widget);
      } catch {
        // 에디터가 이미 정리된 경우
      }
    });

    peerWidgetsRef.current.clear();
  }, []);

  /**
   * 협업 세션을 정리한다.
   *
   * 순서가 중요하다. 세션을 파기하면 문서도 함께 사라지므로, 문서를 읽는
   * MonacoBinding 과 되돌리기를 먼저 떼어 낸 뒤에 세션을 파기한다.
   * 떠나기 전 저장 여부는 세션이 연결을 끊기 전에 스스로 판단한다.
   */
  const cleanupCollaboration = useCallback(() => {
    collabSessionRef.current += 1;

    setPeerLockName(null);
    setIsDocumentLoading(false);
    removeAllPeerWidgets();

    lockedLinesRef.current = {};

    if (cursorListenerRef.current) {
      try {
        cursorListenerRef.current.dispose();
      } catch {
        // 에디터가 이미 정리된 경우
      }

      cursorListenerRef.current = null;
    }

    const awareness = sessionRef.current?.awareness;
    const awarenessListener = awarenessChangeListenerRef.current;

    if (awareness && awarenessListener) {
      try {
        awareness.off("change", awarenessListener);
      } catch {
        // 연결이 이미 정리된 경우
      }
    }

    awarenessChangeListenerRef.current = null;

    if (undoManagerRef.current) {
      try {
        undoManagerRef.current.destroy();
      } catch {
        // 이미 정리된 경우
      }

      undoManagerRef.current = null;
    }

    if (bindingRef.current) {
      try {
        bindingRef.current.destroy();
      } catch {
        // y-monaco 가 이미 떼어진 핸들러를 다시 떼려다 던지는 경우가 있다.
        // 정리 중이라 무시해도 안전하다.
      }

      bindingRef.current = null;
    }

    if (lockDecosRef.current.length > 0) {
      try {
        editorRef.current?.deltaDecorations(lockDecosRef.current, []);
      } catch {
        // 에디터가 이미 정리된 경우
      }

      lockDecosRef.current = [];
    }

    const session = sessionRef.current;
    sessionRef.current = null;

    if (session) {
      try {
        session.destroy();
      } catch {
        // 이미 정리된 경우
      }
    }

    try {
      editorRef.current?.updateOptions({ readOnly: false });
    } catch {
      // 에디터가 이미 정리된 경우
    }
  }, [removeAllPeerWidgets]);

  const setupCollaboration = useCallback(
  (editor) => {
    cleanupCollaboration();

    if (!activeFileId || !workspaceId || !activeProject) return;

    const initialModel = editor?.getModel?.();

    if (!initialModel || initialModel.isDisposed()) return;

    const sessionId = collabSessionRef.current + 1;
    collabSessionRef.current = sessionId;

    const isLiveSession = () => {
      const currentModel = editor?.getModel?.();

      return (
        collabSessionRef.current === sessionId &&
        editorRef.current === editor &&
        currentModel &&
        !currentModel.isDisposed() &&
        sessionRef.current
      );
    };

    if (monacoRef.current && !initialModel.isDisposed()) {
      initialModel.setEOL(monacoRef.current.editor.EndOfLineSequence.LF);
    }

    const roomName = [
      normalizeCollabKeyPart(workspaceId, "workspace"),
      normalizeCollabKeyPart(activeProject, "project"),
      normalizeCollabKeyPart(activeBranch, "master"),
      normalizeCollabKeyPart(activeFileId),
    ].join(":");

    // 서버에 저장본이 없을 때 이것으로 문서를 만든다.
    //
    // Redux 를 먼저 본다. 거기에는 파일을 열 때 디스크에서 받아 온 내용이
    // 들어 있다. latestContentRef 는 "에디터가 마지막으로 들고 있던 값"이라
    // 파일을 갈아탈 때 모델이 바뀌면서 잠깐 빈 문자열이 들어올 수 있는데,
    // 그 값으로 시드하면 "이 파일은 비어 있다"가 방의 정본으로 등록되어
    // 뒤에 들어오는 사람까지 전부 빈 문서를 받게 된다.
    const rawContent =
      fileContentsRef.current[activeFileId] ??
      latestContentRef.current[activeFileId] ??
      "";

    const localContent = String(rawContent).replace(/\r\n/g, "\n");
    localContentRef.current = localContent;

    console.log("[COLLAB ROOM ENTER]", {
      activeFileId,
      collabFileKey: normalizeCollabKeyPart(activeFileId),
      roomName,
      workspaceId,
      activeProject,
      activeBranch,
    });

    const savedFileId = activeFileId;
    const savedProject = activeProject;
    const savedBranch = activeBranch || "master";

    // 문서를 받아 오는 일과 저장하는 일은 세션이 맡는다.
    //
    // 세션이 "저장본 조회 → 없으면 시드 → 접속" 순서를 지키므로, 여기서는
    // 문서가 준비된 뒤에 에디터만 붙이면 된다. 예전처럼 빈 문서에 먼저
    // 붙였다가 뒤늦게 채우는 구간이 없어서, 화면이 비었다 채워지지 않는다.
    const session = new CodeDocSession({
      room: roomName,
      diskContent: localContent,
      saveFile: async (content) => {
        await saveFileApi(
          workspaceId,
          savedProject,
          savedBranch,
          savedFileId,
          content,
          { allowEmpty: false },
        );

        // 파일 트리와 미저장 표시가 어긋나지 않게 맞춰 준다.
        latestContentRef.current[savedFileId] = content;
        dispatch(updateFileContent({ filePath: savedFileId, content }));
      },
      onStatusChange: (status, message) => {
        if (collabSessionRef.current !== sessionId) return;

        setIsDocumentLoading(status === "loading");

        if (status === "error") {
          console.error("[협업] 문서를 불러오지 못했습니다.", roomName, message);
        }
      },
      onSaveError: (error) => {
        console.error("[협업] 자동 저장 실패", error);
      },
    });

    sessionRef.current = session;
    setIsDocumentLoading(true);

    const attachEditor = () => {
    const awareness = session.awareness;

    if (!awareness) return;

    const yText = session.yText;
    const myColor =
      "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
    const myName = displayNameRef.current;

    const initialPos = editor.getPosition();

    awareness.setLocalStateField("user", {
      name: myName,
      color: myColor,
    });

    awareness.setLocalStateField("lockData", {
      name: myName,
      line: initialPos ? initialPos.lineNumber : 1,
      column: initialPos ? initialPos.column : 1,
    });

    cursorListenerRef.current = editor.onDidChangeCursorPosition((event) => {
      if (!isTeamModeRef.current || !isLiveSession()) return;

      const line = event.position.lineNumber;

      // 이름은 그때그때 읽는다. 방에 들어온 뒤에 닉네임이 도착하는 일이 잦다.
      awareness.setLocalStateField("lockData", {
        name: displayNameRef.current,
        line,
        column: event.position.column,
      });

      // 내가 옮겨 간 자리가 팀원이 잡은 줄인지 다시 본다.
      refreshPeerLock();

      // 마우스나 방향키로 자리를 옮기면 되돌리기 묶음을 거기서 끊는다.
      // 시간만으로 나누면 쉬지 않고 친 것이 통째로 한 덩어리가 되므로,
      // 자리를 옮긴 지점도 경계로 삼아야 기대하는 단위에 가까워진다.
      const cursorReason = monacoRef.current?.editor?.CursorChangeReason;

      if (cursorReason && event.reason === cursorReason.Explicit) {
        undoManagerRef.current?.stopCapturing();
      }

      
    });

    const updateLockDecorations = () => {
      if (!isLiveSession() || !monacoRef.current) return;

      const currentEditor = editorRef.current;
      const model = currentEditor?.getModel?.();

      if (!currentEditor || !model || model.isDisposed()) return;

      const decorations = [];

      Object.entries(lockedLinesRef.current).forEach(
        ([lineStr, peerName]) => {
          const line = Number(lineStr);

          decorations.push({
            range: new monacoRef.current.Range(line, 1, line, 1),
            options: {
              isWholeLine: true,
              className: "peer-line-bg",
              linesDecorationsClassName: "peer-line-margin",
              hoverMessage: {
                value: `🔒 **${peerName}**님이 편집 중입니다. 이 줄은 수정할 수 없습니다.`,
              },
            },
          });
        },
      );

      lockDecosRef.current = currentEditor.deltaDecorations(
        lockDecosRef.current,
        decorations,
      );
    };

    /**
     * 팀원 커서 자리에 이름표를 붙인다.
     *
     * y-monaco 는 원격 커서를 beforeContentClassName / afterContentClassName
     * 으로 그리는데, 커서만 찍어 범위가 비면 Monaco 가 그 둘을 렌더링하지
     * 않아 이름표가 보이지 않았다. 범위가 비어도 그려지는 injected text 로
     * 여기서 직접 그린다. y-monaco 쪽 ::after 이름표는 CSS 에서 껐다.
     * 둘 다 켜 두면 같은 이름이 두 번 보인다.
     *
     * 위치는 y-monaco 의 selection 이 아니라 우리가 보내는 lockData 에서
     * 가져온다. selection 은 상대가 타이핑할 때만 이쪽에 반영돼서, 클릭이나
     * 드래그만 했을 때는 이름표가 뜨지 않았다. lockData 는 커서를 옮길
     * 때마다 보내고 있고 같은 값으로 노란 줄이 이미 정확히 따라다닌다.
     */
    const updatePeerCursorLabels = (peerCursors = []) => {
      if (!isLiveSession() || !monacoRef.current) return;

      const currentEditor = editorRef.current;
      const model = currentEditor?.getModel?.();

      if (!currentEditor || !model || model.isDisposed()) return;

      const preference = [
        monacoRef.current.editor.ContentWidgetPositionPreference.ABOVE,
        monacoRef.current.editor.ContentWidgetPositionPreference.BELOW,
      ];

      const stillHere = new Set();

      peerCursors.forEach(({ clientId, name, line, column, color }) => {
        if (!name) return;

        // 상대 문서와 내 문서가 잠깐 어긋나 있을 수 있어 위치를 다듬는다.
        const position = model.validatePosition({
          lineNumber: line,
          column,
        });

        stillHere.add(clientId);

        let widget = peerWidgetsRef.current.get(clientId);

        if (!widget) {
          const node = document.createElement("div");
          node.className = "peer-caret-label";

          widget = {
            node,
            position,
            getId: () => `peer-cursor-${clientId}`,
            getDomNode: () => node,
            getPosition: () => ({
              position: widget.position,
              preference,
            }),
          };

          peerWidgetsRef.current.set(clientId, widget);
          currentEditor.addContentWidget(widget);
        }

        widget.position = position;
        widget.node.textContent = name;
        widget.node.style.backgroundColor = color || "#5873f9";

        currentEditor.layoutContentWidget(widget);
      });

      // 나갔거나 다른 파일로 옮겨 간 사람의 이름표는 걷어낸다.
      peerWidgetsRef.current.forEach((widget, clientId) => {
        if (stillHere.has(clientId)) return;

        currentEditor.removeContentWidget(widget);
        peerWidgetsRef.current.delete(clientId);
      });
    };

    const awarenessChangeHandler = () => {
      if (!isLiveSession()) return;

      const styleId = "yjs-dynamic-cursors";
      let styleEl = document.getElementById(styleId);

      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }

      const styles = [];
      const newLockedLines = {};
      const peerCursors = [];

      awareness.getStates().forEach((state, clientId) => {
        if (state.user && state.user.name && state.user.color) {
          styles.push(`
            .yRemoteSelectionHead-${clientId} {
              position: absolute !important;
              border-left: 2px solid ${state.user.color} !important;
              box-sizing: border-box !important;
              height: 100% !important;
              z-index: 99 !important;
              display: inline-block !important;
            }
            /* 이름표는 아래 peer-caret-label 하나로만 그린다.
               y-monaco 의 ::after 까지 켜 두면 같은 사람 이름이 두 번 보인다. */
            .yRemoteSelection-${clientId} {
              background-color: ${state.user.color}44 !important;
            }
            /* 이름표 색은 content widget 에 직접 넣는다. */
          `);
        }

        if (
          clientId !== awareness.clientID &&
          state.lockData &&
          state.lockData.line
        ) {
          newLockedLines[state.lockData.line] = state.lockData.name;

          peerCursors.push({
            clientId,
            name: state.lockData.name,
            line: state.lockData.line,
            column: state.lockData.column || 1,
            color: state.user?.color,
          });
        }
      });

      styleEl.innerHTML = styles.join("\n");

      lockedLinesRef.current = newLockedLines;
      updateLockDecorations();
      updatePeerCursorLabels(peerCursors);

      // 팀원이 자리를 옮기면 내가 막혀야 하는지도 같이 달라진다.
      refreshPeerLock();
    };

    awarenessChangeListenerRef.current = awarenessChangeHandler;
    awareness.on("change", awarenessChangeHandler);


    const doBind = () => {
      if (!isLiveSession()) return;
      if (bindingRef.current) return;

      const currentModel = editor.getModel();

      if (!currentModel || currentModel.isDisposed()) return;

      if (!isLiveSession()) return;

      // 여기서 model.setValue 를 하지 않는다.
      //
      // MonacoBinding 이 붙는 순간 문서 내용이 에디터에 반영된다. 예전에는
      // 손으로 덮었는데, 상대의 내용이 아직 안 온 상태에서 실행되면 빈
      // 문자열로 덮어 화면이 비고 그 빈 상태가 상대에게도 퍼졌다.

      try {
        bindingRef.current = new MonacoBinding(
          yText,
          currentModel,
          new Set([editor]),
          awareness,
        );

        // 되돌리기는 내가 한 편집만 대상으로 한다.
        //
        // Monaco 기본 되돌리기는 모델에 쌓인 모든 변경을 되돌린다. 거기에는
        // 팀원의 편집과, 접속 직후 y-monaco 가 문서를 한 번에 채우며 부른
        // setValue 까지 들어 있다. 그래서 계속 누르면 "빈 문서" 상태까지
        // 되돌아가 내용이 통째로 사라졌고, 그 빈 상태가 Yjs 를 타고 팀원에게도
        // 퍼졌다.
        //
        // y-monaco 는 로컬 편집을 doc.transact(..., binding) 으로 넣는다.
        // 그 origin 만 추적하면 팀원 작업은 건드리지 않고 내 것만 되돌린다.
        // 설계 문서 쪽 realtime/useUndo.ts 도 같은 이유로 같은 방식을 쓴다.
        //
        // 되돌리기 단위는 captureTimeout 으로 정해진다. 그 시간 안에 이어진
        // 편집은 한 덩어리로 묶인다. 기본값(500ms)으로 두면 쉬지 않고 친
        // 내용이 통째로 한 번에 되돌아가 "조금씩 되돌리기"가 되지 않는다.
        undoManagerRef.current = new Y.UndoManager(yText, {
          trackedOrigins: new Set([bindingRef.current]),
          captureTimeout: 400,
        });

        // 붙었으면 더 기다릴 것이 없다.
        setIsDocumentLoading(false);

        console.log("[YJS MonacoBinding created]", {
          roomName,
          hasBinding: Boolean(bindingRef.current),
          yTextLength: yText.length,
          modelLength: currentModel.getValue().length,
        });
      } catch (error) {
        console.error("[YJS MonacoBinding failed]", error);
      }
    };

      // 문서를 이미 받아 온 뒤라 기다릴 것 없이 바로 붙인다.
      doBind();
    };

    void session.open().then(() => {
      if (!isLiveSession()) return;
      if (session.getStatus() !== "ready") return;

      attachEditor();
    });
  },
  [
    activeBranch,
    activeFileId,
    activeProject,
    cleanupCollaboration,
    dispatch,
    refreshPeerLock,
    workspaceId,
  ],
);

  useEffect(() => {
    if (!user?.id) return;
    getUserProfileApi(user.id)
      .then((profile) => {
        if (profile?.nickname) setFetchedNickname(profile.nickname);
      })
      .catch(console.error);
  }, [user]);

  // 방에 들어간 뒤에 닉네임이 도착하면 표시 이름을 갈아 끼운다.
  useEffect(() => {
    const awareness = sessionRef.current?.awareness;

    if (!awareness) return;

    const currentState = awareness.getLocalState();
    const currentName = displayNameRef.current;

    if (currentName === "익명 개발자") return;

    if (currentState?.user?.name !== currentName) {
      awareness.setLocalStateField("user", {
        ...currentState?.user,
        name: currentName,
        color: currentState?.user?.color || "#ff9900",
      });
    }

    // 줄 잠금 안내에도 같은 이름이 쓰인다. 여기를 빠뜨리면 커서를 한 번
    // 옮기기 전까지 상대에게는 "익명 개발자"가 잠근 것으로 보인다.
    if (currentState?.lockData && currentState.lockData.name !== currentName) {
      awareness.setLocalStateField("lockData", {
        ...currentState.lockData,
        name: currentName,
      });
    }
  }, [fetchedNickname, user]);
useEffect(() => {
  if (!monaco) return;

  configureTypeScriptMonaco(monaco);
}, [monaco]);
  const isContentLoaded = fileContents[activeFileId] !== undefined;

  useEffect(() => {
    const currentEditor = editorRef.current;
    const currentModel = currentEditor?.getModel?.();

    if (
      !isEditorReady ||
      !currentEditor ||
      !currentModel ||
      currentModel.isDisposed() ||
      !isContentLoaded
    ) {
      return undefined;
    }

    if (isTeamMode) {
      setupCollaboration(currentEditor);
    } else {
      cleanupCollaboration();
    }

    return () => {
      cleanupCollaboration();
    };
  }, [
    isEditorReady,
    editorMountVersion,
    activeFileId,
    workspaceId,
    activeProject,
    activeBranch,
    collabFileKey,
    isContentLoaded,
    isTeamMode,
    setupCollaboration,
    cleanupCollaboration,
  ]);

  useEffect(() => {
    stateRef.current = {
      activeFileId,
      workspaceId,
      activeProject,
      activeBranch,
    };
  }, [activeFileId, workspaceId, activeProject, activeBranch]);

  // 브레이크포인트와 현재 실행 줄을 에디터에 그린다.
  //
  // 두 값은 진작 Redux 에 들어가 있었지만 그리는 곳이 없어서, 중단점을
  // 찍어도 화면에는 아무 표시가 나지 않았다.
  //
  // 데코레이션은 에디터가 아니라 모델에 붙는다. 파일을 갈아타거나 에디터가
  // 다시 마운트되면 이전 id 가 무효가 되므로 그때마다 전부 다시 그린다.
  // 내용(activeContent)도 같이 보는 이유는, 파일을 열자마자 그리면 아직
  // 본문이 도착하지 않아 줄 수가 0 이고 아래 필터에서 전부 걸러지기 때문이다.
  useEffect(() => {
    const editor = editorRef.current;
    const monacoInstance = monacoRef.current;
    const model = editor?.getModel?.();

    if (!editor || !monacoInstance || !model || model.isDisposed()) return;

    const lineCount = model.getLineCount();
    const decorations = [];

    // 파일이 짧아져 사라진 줄에 남은 중단점은 그리지 않는다.
    breakpoints
      .filter((bp) => bp.path === activeFileId && bp.line <= lineCount)
      .forEach((bp) => {
        decorations.push({
          range: new monacoInstance.Range(bp.line, 1, bp.line, 1),
          options: {
            glyphMarginClassName: "debug-breakpoint-glyph",
            glyphMarginHoverMessage: { value: "중단점 (클릭하면 해제)" },
          },
        });
      });

    if (
      debugLine?.line &&
      debugLine.line <= lineCount &&
      isSameDebugFile(debugLine.path, activeFileId)
    ) {
      decorations.push({
        range: new monacoInstance.Range(debugLine.line, 1, debugLine.line, 1),
        options: {
          isWholeLine: true,
          className: "debug-current-line",
        },
      });
    }

    debugDecosRef.current = editor.deltaDecorations(
      debugDecosRef.current,
      decorations,
    );
  }, [
    breakpoints,
    debugLine,
    activeFileId,
    activeContent,
    isEditorReady,
    editorMountVersion,
  ]);

  // 디버거가 멈춘 줄로 화면을 옮긴다.
  //
  // 멈춘 줄이 스크롤 밖에 있으면 노란 줄을 그려도 사용자 눈에는 아무 일도
  // 일어나지 않은 것처럼 보인다.
  useEffect(() => {
    if (!debugLine?.line) return;
    if (!isSameDebugFile(debugLine.path, activeFileId)) return;

    editorRef.current?.revealLineInCenter(debugLine.line);
  }, [debugLine, activeFileId]);

  useEffect(() => {
    if (showAiInput && aiInputRef.current) {
      aiInputRef.current.focus();
    }
  }, [showAiInput]);

  const getLanguage = (filename) => {
    if (!filename) return "text";
    const ext = filename.split(".").pop();

    switch (ext) {
      case "java": return "java";
      case "py": return "python";
      case "js": case "jsx": return "javascript";
      case "ts": case "tsx": return "typescript";
      case "html": return "html";
      case "css": return "css";
      case "cpp": return "cpp";
      case "c": return "c";
      case "cs": return "csharp";
      case "json": return "json";
      default: return "plaintext";
    }
  };

  const handleEditorChange = (value = "") => {
    if (!activeFileId) return;

    latestContentRef.current[activeFileId] = value;

    if (
      value.includes("<<<<<<<") ||
      value.includes("=======") ||
      value.includes(">>>>>>>")
    ) {
      setMergeConflicts(parseMergeConflicts(value || ""));
    } else if (mergeConflicts.length > 0) {
      setMergeConflicts([]);
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // 팀 모드에서도 Redux 를 최신으로 유지한다.
    //
    // 예전에는 여기서 빠져나가 Redux 를 갱신하지 않았다. 그래서 실행·디버그·
    // 메뉴 저장처럼 Redux 스냅샷을 읽는 경로들이 최대 30초 전 내용을 보고,
    // 방금 고친 것이 빠진 옛 코드를 디스크에 덮고 그 옛 코드를 실행했다.
    //
    // 정본은 여전히 Y.Doc 이다. Redux 는 읽기 전용 스냅샷으로만 남는다 —
    // 팀 모드에서는 <Editor> 에 value 를 넘기지 않고, Redux 브리지 effect 도
    // 바인딩이 있으면 곧바로 빠져나가므로 되밀어 넣는 길이 없다.

    saveTimerRef.current = setTimeout(() => {
      const currentReduxContent = fileContentsRef.current[activeFileId] || "";
      if (currentReduxContent === value) return;

      dispatch(
        updateFileContent({
          filePath: activeFileId,
          content: value,
        }),
      );
    }, 400);
  };

  const executeAiAction = async (queryText, currentCode) => {
    if (!stateRef.current.activeFileId) return;
    setIsAiLoading(true);

    try {
      const response = await fetchAiAssistApi({
        workspaceId: stateRef.current.workspaceId,
        projectName: stateRef.current.activeProject,
        branchName: stateRef.current.activeBranch,
        filePath: stateRef.current.activeFileId,
        userQuery: queryText,
        currentCode,
      });

      if (response.success) {
        dispatch(
          setAiSuggestion({
            originalCode: currentCode,
            suggestedCode: response.suggestedCode,
            targetPath: stateRef.current.activeFileId,
            explanation: response.explanation,
          }),
        );
      } else {
        setEditorNotice({
          title: "AI 요청을 처리하지 못했습니다",
          message: response.explanation || "요청 내용을 다시 확인해주세요.",
          variant: "warning",
        });
      }
    } catch (error) {
      setEditorNotice({
        title: "AI 요청 실패",
        message: error.message || "AI 요청 중 오류가 발생했습니다.",
        variant: "danger",
      });
    } finally {
      setIsAiLoading(false);
      setShowAiInput(false);
      setAiQuery("");
    }
  };

  const handleAiSubmit = () => {
    if (!aiQuery.trim() || !activeFileId) return;
    const currentCode = editorRef.current ? editorRef.current.getValue() : (fileContents[activeFileId] || "");
    executeAiAction(
      aiQuery +
        "\n\n(명령어: explanation 필드의 설명은 반드시 핵심만 1~2줄로 아주 짧고 간결하게 작성해.)",
      currentCode,
    );
  };

  const handleAcceptAi = () => {
    if (
      aiSuggestion.targetPath &&
      aiSuggestion.suggestedCode &&
      editorRef.current
    ) {
      const model = editorRef.current.getModel();
      if (model && !model.isDisposed()) {
        model.pushEditOperations(
          [],
          [
            {
              range: model.getFullModelRange(),
              text: aiSuggestion.suggestedCode,
            },
          ],
          () => null,
        );
      }

      dispatch(
        updateFileContent({
          filePath: aiSuggestion.targetPath,
          content: aiSuggestion.suggestedCode,
        }),
      );
    }

    dispatch(clearAiSuggestion());
  };

  const handleRejectAi = () => dispatch(clearAiSuggestion());

  const updateConflictDecorations = useCallback((conflicts = []) => {
    const editor = editorRef.current;
    const monacoInstance = monacoRef.current;
    const model = editor?.getModel();

    if (!editor || !monacoInstance || !model || model.isDisposed()) return;

    const decorations = [];

    conflicts.forEach((conflict, index) => {
      decorations.push({
        range: new monacoInstance.Range(conflict.start, 1, conflict.start, 1),
        options: {
          isWholeLine: true,
          className: "conflict-marker-bg",
          linesDecorationsClassName: "conflict-marker-margin",
          hoverMessage: {
            value: `Merge conflict #${index + 1}: current / incoming boundary`,
          },
        },
      });

      if (conflict.mid - conflict.start > 1) {
        decorations.push({
          range: new monacoInstance.Range(
            conflict.start + 1,
            1,
            conflict.mid - 1,
            model.getLineMaxColumn(conflict.mid - 1),
          ),
          options: {
            isWholeLine: true,
            className: "conflict-current-bg",
            linesDecorationsClassName: "conflict-current-margin",
            hoverMessage: { value: "Current branch changes" },
          },
        });
      }

      if (conflict.end - conflict.mid > 1) {
        decorations.push({
          range: new monacoInstance.Range(
            conflict.mid + 1,
            1,
            conflict.end - 1,
            model.getLineMaxColumn(conflict.end - 1),
          ),
          options: {
            isWholeLine: true,
            className: "conflict-incoming-bg",
            linesDecorationsClassName: "conflict-incoming-margin",
            hoverMessage: { value: "Incoming changes" },
          },
        });
      }

      decorations.push({
        range: new monacoInstance.Range(conflict.end, 1, conflict.end, 1),
        options: {
          isWholeLine: true,
          className: "conflict-marker-bg",
          linesDecorationsClassName: "conflict-marker-margin",
        },
      });
    });

    conflictDecosRef.current = editor.deltaDecorations(
      conflictDecosRef.current,
      decorations,
    );
  }, []);

  const revealConflict = useCallback((targetConflict = mergeConflicts[0]) => {
    const editor = editorRef.current;

    if (!editor || !targetConflict) return;

    editor.revealLineInCenter(targetConflict.start);
    editor.setPosition({
      lineNumber: targetConflict.start,
      column: 1,
    });
    editor.focus();
  }, [mergeConflicts]);

  const applyConflictResolution = useCallback((type, conflict = mergeConflicts[0]) => {
    const editor = editorRef.current;
    const monacoInstance = monacoRef.current;

    if (!editor || !monacoInstance || !conflict) return;

    const applied = applyConflictEdit(monacoInstance, editor, conflict, type);

    if (!applied) return;

    setConflictSessionFileId(activeFileId);

    const nextValue = editor.getValue();
    const nextConflicts = parseMergeConflicts(nextValue);

    latestContentRef.current[activeFileId] = nextValue;
    setMergeConflicts(nextConflicts);
    updateConflictDecorations(nextConflicts);

    dispatch(
      updateFileContent({
        filePath: activeFileId,
        content: nextValue,
      }),
    );
  }, [activeFileId, dispatch, mergeConflicts, updateConflictDecorations]);

  const handleResetConflictSelection = useCallback(() => {
    if (!activeFileId) return;

    const originalContent = conflictOriginalContentRef.current[activeFileId];

    setConflictResetDialog({
      isOpen: true,
      type: originalContent === undefined ? "missing" : "confirm",
    });
  }, [activeFileId]);

  const handleCloseConflictResetDialog = useCallback(() => {
    setConflictResetDialog({ isOpen: false, type: "confirm" });
  }, []);

  const handleConfirmResetConflictSelection = useCallback(() => {
    const editor = editorRef.current;

    if (!editor || !activeFileId) return;

    const originalContent = conflictOriginalContentRef.current[activeFileId];

    if (originalContent === undefined) {
      setConflictResetDialog({ isOpen: false, type: "confirm" });
      return;
    }

    const model = editor.getModel();

    if (model && !model.isDisposed()) {
      model.pushEditOperations(
        [],
        [
          {
            range: model.getFullModelRange(),
            text: originalContent,
          },
        ],
        () => null,
      );
    }

    latestContentRef.current[activeFileId] = originalContent;

    const nextConflicts = parseMergeConflicts(originalContent);

    setMergeConflicts(nextConflicts);
    setConflictSessionFileId(activeFileId);
    setLastConflictCount(nextConflicts.length || lastConflictCount || 1);
    updateConflictDecorations(nextConflicts);

    dispatch(
      updateFileContent({
        filePath: activeFileId,
        content: originalContent,
      }),
    );

    setConflictResetDialog({ isOpen: false, type: "confirm" });

    if (nextConflicts[0]) {
      window.setTimeout(() => revealConflict(nextConflicts[0]), 0);
    }
  }, [
    activeFileId,
    dispatch,
    lastConflictCount,
    revealConflict,
    updateConflictDecorations,
  ]);

  const handleSaveCurrentFile = useCallback(async () => {
    const editor = editorRef.current;

    if (!editor || !activeFileId || !workspaceId || !activeProject) return;

    const currentContent = editor.getValue();

    dispatch(
      updateFileContent({
        filePath: activeFileId,
        content: currentContent,
      }),
    );

    latestContentRef.current[activeFileId] = currentContent;

    await saveFileApi(
      workspaceId,
      activeProject,
      activeBranch || "master",
      activeFileId,
      currentContent,
    );

    dispatch(writeToTerminal(`[System] Saved: ${activeFileId}\n`));
  }, [activeBranch, activeFileId, activeProject, dispatch, workspaceId]);

  const handleSaveAndReturnToFileStatus = useCallback(async () => {
    await handleSaveCurrentFile();
    setConflictSessionFileId(null);
    setLastConflictCount(0);
    dispatch(setActiveActivity("git"));
  }, [dispatch, handleSaveCurrentFile]);

  const handleEditorWillMount = (monacoInstance) => {
  configureTypeScriptMonaco(monacoInstance);
};

  const handleEditorDidMount = (editor, monacoInstance) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;
    setIsEditorReady(true);
    setEditorMountVersion((prev) => prev + 1);

    const cmdCurrent = editor.addCommand(0, (_, conflict) => applyConflictResolution("current", conflict));
    const cmdIncoming = editor.addCommand(0, (_, conflict) => applyConflictResolution("incoming", conflict));
    const cmdBoth = editor.addCommand(0, (_, conflict) => applyConflictResolution("both", conflict));

    const codeLensProvider = monacoInstance.languages.registerCodeLensProvider("*", {
      provideCodeLenses: function (model) {
        if (model.isDisposed()) return { lenses: [], dispose: () => {} };

        const lenses = [];
        const lines = model.getValue().split('\n');
        let currentConflict = null;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.startsWith("<<<<<<<")) {
            currentConflict = { start: i + 1, mid: null, end: null };
          } else if (line.startsWith("=======") && currentConflict) {
            currentConflict.mid = i + 1;
          } else if (line.startsWith(">>>>>>>") && currentConflict) {
            currentConflict.end = i + 1;
            
            const range = new monacoInstance.Range(currentConflict.start, 1, currentConflict.start, 1);
            
            lenses.push({
              range,
              command: { id: cmdCurrent, title: "✅ 현재 변경 사항 수락 (Current)", arguments: [currentConflict] }
            });
            lenses.push({
              range,
              command: { id: cmdIncoming, title: "📥 수신 변경 사항 수락 (Incoming)", arguments: [currentConflict] }
            });
            lenses.push({
              range,
              command: { id: cmdBoth, title: "🔄 두 변경 사항 모두 수락 (Both)", arguments: [currentConflict] }
            });
            
            currentConflict = null;
          }
        }
        return { lenses, dispose: () => {} };
      },
      resolveCodeLens: function (model, codeLens) {
        return codeLens;
      }
    });

    editor.onDidDispose(() => {
      codeLensProvider.dispose();

      if (editorRef.current === editor) {
        editorRef.current = null;
        setIsEditorReady(false);
      }
    });

    editor.onDidChangeCursorSelection((e) => {
      const selection = e.selection;
      const model = editor.getModel();
      if (model && !model.isDisposed()) {
        const text = model.getValueInRange(selection);
        dispatch(setSelectedText(text));
      }

      // 선택 범위가 잠긴 줄을 물면 그 즉시 읽기 전용으로 바뀌어야 한다.
      refreshPeerLock();
    });

    // 줄 번호 왼쪽 여백을 눌러 중단점을 켜고 끈다.
    //
    // 예전에는 팀원이 커서를 둔 줄이면 무시했는데, 잠금을 표시 전용으로
    // 바꾼 뒤로는 막을 이유가 없어 그 조건을 뺐다.
    editor.onMouseDown((e) => {
      if (e.target.type === monacoInstance.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const line = e.target.position.lineNumber;
        const currentFile = stateRef.current.activeFileId;
        if (currentFile) {
          dispatch(toggleBreakpoint({ path: currentFile, line }));
        }
      }
    });

    // 팀 모드 되돌리기를 Y.UndoManager 로 돌린다. 개인 모드는 기본 동작 그대로다.
    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyZ,
      () => runUndo(),
    );

    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd |
        monacoInstance.KeyMod.Shift |
        monacoInstance.KeyCode.KeyZ,
      () => runRedo(),
    );

    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyY,
      () => runRedo(),
    );

    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS,
      async () => {
        const currentContent = editor.getValue();
        const { activeFileId, workspaceId, activeProject, activeBranch } = stateRef.current;
        if (!activeFileId || !workspaceId || !activeProject) return;

        dispatch(updateFileContent({ filePath: activeFileId, content: currentContent }));
        latestContentRef.current[activeFileId] = currentContent;

        try {
          await saveFileApi(
            workspaceId,
            activeProject,
            activeBranch,
            activeFileId,
            currentContent,
          );
          dispatch(writeToTerminal(`[System] Saved: ${activeFileId}\n`));
        } catch (e) {
          dispatch(writeToTerminal(`[Error] Save failed: ${e.message}\n`));
        }
      },
    );

    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyK,
      () => setShowAiInput((prev) => !prev),
    );

    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyL,
      () => {
        window.dispatchEvent(new CustomEvent("focusAgentPanel"));
      },
    );

    editor.addAction({
      id: "ai-action-explain",
      label: "✨ AI: 이 코드 설명해줘",
      contextMenuGroupId: "1_modification",
      contextMenuOrder: 1,
      run: async (ed) => {
        const selectedText = ed.getModel().getValueInRange(ed.getSelection());
        const query = selectedText
          ? `다음 코드를 설명해줘:\n\n${selectedText}`
          : `이 파일 전체 코드를 설명해줘.`;

        dispatch(addAgentMessage({ role: "user", content: query }));

        try {
          const { workspaceId, activeProject, activeBranch, activeFileId } =
            stateRef.current;

          const response = await fetchAiAssistApi({
            workspaceId,
            projectName: activeProject,
            branchName: activeBranch,
            filePath: activeFileId,
            userQuery:
              query +
              "\n\n(명령어: 코드는 수정하지 말고 explanation에 답변해. 마크다운 불릿 포인트(-)를 써서 3문장 이내로 핵심만 간결하게 요약해. suggestedCode는 빈 문자열로 둬.)",
            currentCode: ed.getValue(),
          });

          if (response.success) {
            dispatch(
              addAgentMessage({ role: "ai", content: response.explanation }),
            );
          } else {
            dispatch(
              addAgentMessage({
                role: "ai",
                content: "❌ " + response.explanation,
              }),
            );
          }
        } catch {
          dispatch(addAgentMessage({ role: "ai", content: "❌ 통신 실패" }));
        }
      },
    });

    editor.addAction({
      id: "ai-action-refactor",
      label: "🛠️ AI: 리팩토링 제안 받기",
      contextMenuGroupId: "1_modification",
      contextMenuOrder: 2,
      run: (ed) => {
        const selectedText = ed.getModel().getValueInRange(ed.getSelection());
        const query = selectedText
          ? `선택된 코드를 리팩토링 해줘:\n${selectedText}\n\n(명령어: explanation은 핵심 이유 1줄로만 짧게 요약해.)`
          : `이 파일 전체를 리팩토링 해줘\n\n(명령어: explanation은 핵심 이유 1줄로만 짧게 요약해.)`;
        executeAiAction(query, ed.getValue());
      },
    });

    editor.addAction({
      id: "ai-action-find-bug",
      label: "🐛 AI: 버그 찾기 및 수정",
      contextMenuGroupId: "1_modification",
      contextMenuOrder: 3,
      run: (ed) => {
        const selectedText = ed.getModel().getValueInRange(ed.getSelection());
        const query = selectedText
          ? `선택된 코드에서 버그를 찾고 수정해줘:\n${selectedText}\n\n(명령어: explanation은 어떤 버그였는지만 1줄로 아주 짧게 요약해.)`
          : `이 파일 전체에서 버그를 찾아 수정해줘\n\n(명령어: explanation은 어떤 버그였는지만 1줄로 아주 짧게 요약해.)`;
        executeAiAction(query, ed.getValue());
      },
    });
  };

  useEffect(() => {
    if (!monaco) return;

    const provider = monaco.languages.registerInlineCompletionsProvider("*", {
      provideInlineCompletions: (model, position, context, token) => {
        return new Promise((resolve) => {
          let settled = false;
          let timer = null;

          const finish = (result) => {
            if (settled) return;
            settled = true;
            if (timer) clearTimeout(timer);
            resolve(result);
          };

          token.onCancellationRequested(() => {
            finish({ items: [] });
          });

          timer = setTimeout(async () => {
            if (token.isCancellationRequested || model.isDisposed()) {
              finish({ items: [] });
              return;
            }

            const prefix = model.getValueInRange(
              new monaco.Range(1, 1, position.lineNumber, position.column),
            );

            const suffix = model.getValueInRange(
              new monaco.Range(
                position.lineNumber,
                position.column,
                model.getLineCount(),
                model.getLineMaxColumn(model.getLineCount()),
              ),
            );

            if (prefix.trim().length < 5) {
              finish({ items: [] });
              return;
            }

            try {
              const suggestion = await fetchAiAutocompleteApi({
                prefix,
                suffix,
              });

              if (token.isCancellationRequested) {
                finish({ items: [] });
                return;
              }

              if (suggestion && suggestion.trim() !== "") {
                finish({
                  items: [
                    {
                      insertText: suggestion,
                      range: new monaco.Range(
                        position.lineNumber,
                        position.column,
                        position.lineNumber,
                        position.column,
                      ),
                    },
                  ],
                });
              } else {
                finish({ items: [] });
              }
            } catch (error) {
              if (
                token.isCancellationRequested ||
                error?.name === "AbortError" ||
                error?.type === "cancellation" ||
                error?.message?.includes("canceled") ||
                error?.msg?.includes("canceled") ||
                error?.type === "cancelation"
              ) {
                finish({ items: [] });
                return;
              }
              console.error("autocomplete error:", error);
              finish({ items: [] });
            }
          }, 1500);
        });
      },
      freeInlineCompletions: () => {},
      handleItemDidShow: () => {},
      disposeInlineCompletions: () => {},
    });

    return () => provider.dispose();
  }, [monaco]);

  useEffect(() => {
    if (!conflictNavigationTarget?.filePath) return;
    if (conflictNavigationTarget.filePath !== activeFileId) return;

    const timer = window.setTimeout(() => {
      const editor = editorRef.current;
      if (!editor) return;

      const editorValue = editor.getValue();
      const conflicts = parseMergeConflicts(editorValue);
      if (conflicts.length > 0) {
        conflictOriginalContentRef.current[activeFileId] = editorValue;
      }
      setMergeConflicts(conflicts);
      setConflictSessionFileId(activeFileId);
      setLastConflictCount(conflicts.length || 1);
      updateConflictDecorations(conflicts);

      if (conflicts[0]) {
        revealConflict(conflicts[0]);
      }

      dispatch(clearConflictNavigation());
    }, 120);

    return () => window.clearTimeout(timer);
  }, [
    activeFileId,
    clearConflictNavigation,
    conflictNavigationTarget,
    dispatch,
    revealConflict,
    updateConflictDecorations,
  ]);

  useEffect(() => {
    if (!editorRef.current || !editorCmd) return;

    const editor = editorRef.current;
    editor.focus();

    switch (editorCmd) {
      case "undo": runUndo(); break;
      case "redo": runRedo(); break;
      case "cut": editor.trigger("keyboard", "editor.action.clipboardCutAction", null); break;
      case "copy": editor.trigger("keyboard", "editor.action.clipboardCopyAction", null); break;
      case "paste": editor.trigger("keyboard", "editor.action.clipboardPasteAction", null); break;
      case "find": editor.trigger("keyboard", "actions.find", null); break;
      case "replace": editor.trigger("keyboard", "editor.action.startFindReplaceAction", null); break;
      case "zoom_in": setFontSize((prev) => prev + 2); break;
      case "zoom_out": setFontSize((prev) => Math.max(8, prev - 2)); break;
      case "go_to_line": editor.trigger("keyboard", "editor.action.gotoLine", null); break;
      case "go_to_definition": editor.trigger("keyboard", "editor.action.revealDefinition", null); break;
      case "go_to_references": editor.trigger("keyboard", "editor.action.referenceSearch.trigger", null); break;
      case "autocomplete": editor.trigger("keyboard", "editor.action.triggerSuggest", null); break;
      case "format": editor.trigger("keyboard", "editor.action.formatDocument", null); break;
      case "rename": editor.trigger("keyboard", "editor.action.rename", null); break;
      case "refactor": editor.trigger("keyboard", "editor.action.refactor", null); break;
      case "toggle_breakpoint": {
        const position = editor.getPosition();
        if (position && activeFileId) {
          dispatch(toggleBreakpoint({ path: activeFileId, line: position.lineNumber }));
        }
        break;
      }
      default: break;
    }
    dispatch(triggerEditorCmd(null));
  }, [editorCmd, dispatch, activeFileId, runUndo, runRedo]);

  const isMapTab =
    activeFileId === "Architecture Map" ||
    activeFileId === "CodeMap" ||
    activeFileId?.includes("codemap");

  if (!activeFileId) {
    return (
      <div className="h-full w-full bg-[#fdfdfd] flex items-center justify-center text-gray-400 text-sm">
        파일을 선택하여 편집을 시작하세요
      </div>
    );
  }

  if (isMapTab) {
    return (
      <div className="h-full w-full bg-[#fdfdfd] flex items-center justify-center text-blue-500 font-bold">
        아키텍처 맵을 불러오는 중입니다...
      </div>
    );
  }

  const isDiffMode =
    aiSuggestion?.isDiffMode && aiSuggestion?.targetPath === activeFileId;

  const isConflictResolutionSession = Boolean(
    activeFileId && conflictSessionFileId === activeFileId,
  );
  const shouldShowConflictResolutionPanel =
    !isDiffMode && Boolean(activeFileId) && (hasMergeConflicts || isConflictResolutionSession);
  const isConflictSelectionComplete = shouldShowConflictResolutionPanel && !hasMergeConflicts;
  const conflictDisplayCount = hasMergeConflicts ? mergeConflicts.length : lastConflictCount || 1;

  return (
    <div className="relative h-full w-full overflow-hidden bg-white flex flex-col">
      
      <style dangerouslySetInnerHTML={{ __html: `
        .debug-current-line { background-color: rgba(255, 230, 0, 0.3) !important; border-left: 3px solid #eab308; }
        .debug-breakpoint-glyph { background: #ef4444; width: 10px !important; height: 10px !important; border-radius: 50%; margin-left: 6px; margin-top: 5px; cursor: pointer; z-index: 10; }
        .conflict-marker-bg { background-color: rgba(248, 113, 113, 0.14) !important; }
        .conflict-marker-margin { border-left: 4px solid #ef4444 !important; }
        .conflict-current-bg { background-color: rgba(59, 130, 246, 0.10) !important; }
        .conflict-current-margin { border-left: 4px solid #3b82f6 !important; }
        .conflict-incoming-bg { background-color: rgba(16, 185, 129, 0.12) !important; }
        .conflict-incoming-margin { border-left: 4px solid #10b981 !important; }

        /* 팀원이 잡고 있어 수정할 수 없는 줄. */
        .peer-line-bg {
          background-color: rgba(245, 158, 11, 0.10) !important;
        }
        .peer-line-margin {
          border-left: 3px solid rgba(245, 158, 11, 0.75) !important;
          z-index: 50 !important;
        }
        /* 팀원 이름표. 배경색은 그 사람 커서 색으로 코드에서 직접 넣는다. */
        .peer-caret-label {
          font-family: system-ui, -apple-system, sans-serif;
          color: #ffffff;
          font-size: 11px;
          font-weight: 700;
          line-height: 1.5;
          padding: 0 6px;
          border-radius: 4px 4px 4px 0;
          white-space: nowrap;
          pointer-events: none;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.25);
        }
      `}} />

      {isDocumentLoading && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[99999] flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/95 px-4 py-2 text-[12px] font-bold text-blue-700 shadow-sm backdrop-blur-sm">
          <VscLoading size={14} className="animate-spin" />
          문서를 불러오는 중입니다 — 잠시만 기다려 주세요
        </div>
      )}

      {peerLockName && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[99999] flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50/95 px-4 py-2 text-[12px] font-bold text-amber-700 shadow-sm backdrop-blur-sm">
          <VscLock size={14} />
          {peerLockName}님이 편집 중인 줄입니다 — 수정할 수 없습니다
        </div>
      )}

      {editorNotice && (
        <EditorModalPortal>
          {(() => {
        const isDanger = editorNotice.variant === "danger";
        const isWarning = editorNotice.variant === "warning";
        const tone = isDanger
          ? "bg-red-50 text-red-600 border-red-100"
          : isWarning
            ? "bg-amber-50 text-amber-600 border-amber-100"
            : "bg-blue-50 text-blue-600 border-blue-100";

        return (
          <div className="fixed inset-0 z-[2147483000] flex items-start justify-center bg-slate-950/50 backdrop-blur-[4px] px-4 pt-[13vh] pointer-events-auto">
            <div className="w-full max-w-[520px] overflow-hidden rounded-3xl border border-white/80 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.32)] animate-fade-in-up">
              <div className="border-b border-slate-100 bg-gradient-to-br from-white via-slate-50 to-blue-50/40 px-6 py-5">
                <div className="flex items-start gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${tone}`}>
                    <VscWarning size={24} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${tone}`}>
                        WEBVAIS Notice
                      </span>
                    </div>
                    <h3 className="text-[17px] font-black text-slate-950">{editorNotice.title}</h3>
                    <p className="mt-2 whitespace-pre-line text-sm font-medium leading-relaxed text-slate-600">
                      {editorNotice.message}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end px-6 py-5">
                <button
                  type="button"
                  onClick={() => setEditorNotice(null)}
                  className="h-10 rounded-xl bg-slate-900 px-5 text-xs font-black text-white shadow-sm transition-colors hover:bg-slate-800"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        );
          })()}
        </EditorModalPortal>
      )}

      {conflictResetDialog.isOpen && (
        <EditorModalPortal>
          <div className="fixed inset-0 z-[2147483000] flex items-start justify-center bg-slate-950/50 backdrop-blur-[4px] px-4 pt-[13vh] pointer-events-auto">
          <div className="w-full max-w-[560px] overflow-hidden rounded-3xl border border-white/80 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.32)] animate-fade-in-up">
            <div className="bg-gradient-to-r from-amber-50 via-white to-red-50 px-6 py-5 border-b border-amber-100">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 shrink-0 rounded-2xl border border-amber-200 bg-amber-100 text-amber-700 flex items-center justify-center shadow-sm">
                  <VscWarning size={24} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[15px] font-black text-slate-900">
                      {conflictResetDialog.type === "missing"
                        ? "되돌릴 충돌 원본을 찾지 못했습니다"
                        : "선택 전 충돌 상태로 되돌릴까요?"}
                    </h3>
                    <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700">
                      MERGE CONFLICT
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    {conflictResetDialog.type === "missing"
                      ? "현재 파일에 저장된 최초 충돌 스냅샷이 없습니다. 충돌 파일 목록에서 파일을 다시 열고 해결을 진행해주세요."
                      : "Current, Incoming, Both 선택이나 직접 수정한 내용이 사라지고, 이 파일을 처음 충돌이 발생했던 상태로 복원합니다."}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-black text-slate-500">대상 파일</span>
                  <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-500 border border-slate-200">
                    {conflictDisplayCount} conflict
                  </span>
                </div>
                <div className="mt-2 truncate font-mono text-[11px] font-bold text-slate-800">
                  {activeFileId || "선택된 파일 없음"}
                </div>
              </div>

              {conflictResetDialog.type === "confirm" && (
                <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] text-slate-500">
                  <div className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-2">
                    <b className="block text-blue-700">Current</b>
                    현재 브랜치 내용
                  </div>
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2">
                    <b className="block text-emerald-700">Incoming</b>
                    병합되는 내용
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
                    <b className="block text-slate-700">Both</b>
                    양쪽 내용 모두
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
              {conflictResetDialog.type === "missing" ? (
                <button
                  type="button"
                  onClick={handleCloseConflictResetDialog}
                  className="h-10 px-5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-black shadow-sm"
                >
                  확인
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleCloseConflictResetDialog}
                    className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-sm"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmResetConflictSelection}
                    className="h-10 px-5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-black shadow-sm flex items-center gap-1.5"
                  >
                    <VscCheck size={14} />
                    처음 충돌 상태로 복원
                  </button>
                </>
              )}
            </div>
          </div>
          </div>
        </EditorModalPortal>
      )}

      {shouldShowConflictResolutionPanel && (
        <div className={`shrink-0 border-b px-4 py-3 z-20 shadow-sm ${
          isConflictSelectionComplete
            ? "border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-blue-50"
            : "border-red-100 bg-gradient-to-r from-red-50 via-white to-blue-50"
        }`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`mt-0.5 h-10 w-10 rounded-2xl flex items-center justify-center border shrink-0 ${
                  isConflictSelectionComplete
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : "bg-red-100 text-red-600 border-red-200"
                }`}
              >
                {isConflictSelectionComplete ? <VscCheck size={21} /> : <VscWarning size={21} />}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-black text-gray-900">
                    {isConflictSelectionComplete ? "충돌 선택 완료" : "충돌 해결 모드"}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isConflictSelectionComplete
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : "bg-red-100 text-red-700 border-red-200"
                    }`}
                  >
                    {conflictDisplayCount} conflict
                  </span>
                  <span className="text-[10px] font-mono text-gray-500 truncate max-w-[360px]">
                    {activeFileId}
                  </span>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-600 leading-relaxed">
                  <span className={isConflictSelectionComplete ? "font-bold text-emerald-700" : "font-bold text-gray-800"}>
                    1. 변경 선택
                  </span>
                  <span className="text-gray-300">→</span>
                  <span className={isConflictSelectionComplete ? "font-bold text-emerald-700" : "text-gray-500"}>
                    2. 저장 후 충돌 목록 복귀
                  </span>
                  <span className="text-gray-300">→</span>
                  <span className="text-gray-500">
                    3. 충돌 목록에서 해결 완료 처리
                  </span>
                  <span className="text-gray-300">→</span>
                  <span className="text-gray-500">
                    4. 병합 커밋
                  </span>
                </div>

                <p className="mt-1 text-[11px] text-gray-500">
                  {isConflictSelectionComplete
                    ? "충돌 마커가 제거되었습니다. 이제 저장 후 충돌 파일 목록으로 돌아가 해당 파일을 ‘해결 완료 처리’하세요."
                    : "Current, Incoming, Both 중 하나를 선택하거나 직접 수정하세요. 잘못 선택했다면 ‘선택 전으로 되돌리기’로 처음 충돌 상태를 복원할 수 있습니다."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!isConflictSelectionComplete && (
                <>
                  <button
                    type="button"
                    onClick={() => revealConflict()}
                    className="h-8 px-3 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <VscArrowRight size={14} />
                    첫 충돌 이동
                  </button>

                  <button
                    type="button"
                    onClick={() => applyConflictResolution("current")}
                    className="h-8 px-3 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold shadow-sm"
                  >
                    Current 적용
                  </button>

                  <button
                    type="button"
                    onClick={() => applyConflictResolution("incoming")}
                    className="h-8 px-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold shadow-sm"
                  >
                    Incoming 적용
                  </button>

                  <button
                    type="button"
                    onClick={() => applyConflictResolution("both")}
                    className="h-8 px-3 rounded-lg border border-slate-200 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold shadow-sm"
                  >
                    Both 적용
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleResetConflictSelection}
                className="h-8 px-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-bold shadow-sm"
              >
                선택 전으로 되돌리기
              </button>

              {isConflictSelectionComplete && (
                <button
                  type="button"
                  onClick={handleSaveAndReturnToFileStatus}
                  className="h-9 px-4 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-black flex items-center gap-1.5 shadow-sm"
                >
                  <VscCheck size={14} />
                  저장 후 충돌 파일 목록으로 돌아가기
                </button>
              )}

            </div>
          </div>
        </div>
      )}

      {isDiffMode && (
        <div className="bg-indigo-50/90 border-b border-indigo-200 flex items-center justify-between p-3 shrink-0 shadow-sm z-10 backdrop-blur-sm min-h-[50px]">
          <div className="flex items-start gap-2 flex-1 min-w-0 mr-4">
            <VscSparkle className="text-indigo-600 animate-pulse shrink-0 mt-0.5" size={18} />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-extrabold text-indigo-900 mb-1">AI 코드 제안 검토</span>
              <div className="text-[12px] font-medium text-indigo-800 bg-white/70 p-2 rounded-md border border-indigo-100/50 max-h-[50px] overflow-y-auto custom-scrollbar leading-relaxed">
                {aiSuggestion.explanation}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handleAcceptAi} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-md shadow flex items-center gap-1.5 transition-colors"><VscCheck size={14} /> 적용</button>
            <button onClick={handleRejectAi} className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white text-xs font-bold rounded-md shadow flex items-center gap-1.5 transition-colors"><VscClose size={14} /> 취소</button>
          </div>
        </div>
      )}

      {showAiInput && !isDiffMode && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[500px] bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-200 z-50 p-2 flex items-center gap-3 animate-fade-in-up">
          <div className="bg-indigo-100 p-1.5 rounded-lg ml-1"><VscSparkle className="text-indigo-600" size={18} /></div>
          <input ref={aiInputRef} type="text" className="flex-1 border-none outline-none text-[13px] bg-transparent font-medium text-gray-800 placeholder-gray-400" placeholder="AI에게 무엇을 만들어 달라고 할까요?" value={aiQuery} onChange={(e) => setAiQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAiSubmit(); } if (e.key === "Escape") setShowAiInput(false); }} disabled={isAiLoading} />
          {isAiLoading ? <VscLoading className="animate-spin text-indigo-500 mr-2" size={18} /> : <div className="flex items-center gap-2 mr-2 text-[10px] font-bold text-gray-400"><span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">Enter</span><span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">Esc</span></div>}
        </div>
      )}

      <div className="flex-1 relative">
        {isDiffMode && (
          <div className="absolute inset-0 z-20 bg-white">
          <DiffEditor
  height="100%"
  theme="light"
  language={getLanguage(activeFileId)}
  original={aiSuggestion?.originalCode || "// 코드 분석 중..."}
  modified={aiSuggestion?.suggestedCode || "// 코드 분석 중..."}
  beforeMount={handleEditorWillMount}
  options={{
    renderSideBySide: true,
    readOnly: false,
    fontSize,
    fontFamily: "'D2Coding', 'Consolas', monospace",
    minimap: { enabled: editorSettings.minimap },
    originalEditable: false,
  }}
/>
          </div>
        )}

        <div className={`absolute inset-0 z-10 bg-white ${isDiffMode ? "invisible" : ""}`}>
{/*
  팀 모드에서는 value 를 넘기지 않는다.

  @monaco-editor/react 는 value 가 에디터 내용과 다르면 문서 전체를
  executeEdits 로 갈아치운다(forceMoveMarkers: true). 팀 모드는 타이핑
  중에 Redux 를 갱신하지 않다가 자동 저장 때만 갱신하는데, 저장 요청이
  오가는 동안 더 친 글자가 있으면 value 와 화면이 어긋난다. 그러면 저장
  시점의 옛 내용으로 문서가 통째로 덮이면서 커서가 엉뚱한 줄로 튀고,
  그 덮어쓰기가 MonacoBinding 을 타고 Yjs 에까지 퍼진다. 되돌리기가
  조각나는 것도 여기서 pushUndoStop 이 계속 끼어들기 때문이다.

  팀 모드의 정본은 Y.Doc 이다. 내용은 MonacoBinding 이 넣어 주므로
  React 가 두 번째 주인 노릇을 하면 안 된다.
*/}
<Editor
  key={`${monacoModelPath}-${getLanguage(activeFileId)}`}
  height="100%"
  theme="light"
  path={monacoModelPath || activeFileId}
  language={getLanguage(activeFileId)}
  value={isTeamMode ? undefined : fileContents[activeFileId] || ""}
  beforeMount={handleEditorWillMount}
  onChange={handleEditorChange}
  onMount={handleEditorDidMount}
  options={{
              // 팀원이 잡고 있는 줄에 있거나, 문서를 아직 불러오는 중이면
              // 입력을 받지 않는다. 불러오는 중에 친 글자는 곧 도착할 문서
              // 내용에 덮여 사라지기 때문이다.
              readOnly: Boolean(peerLockName) || isDocumentLoading,
              fontSize,
              fontFamily: "'D2Coding', 'Consolas', monospace",
              minimap: { enabled: editorSettings.minimap },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              glyphMargin: true,
              renderLineHighlight: "all",
              lineNumbersMinChars: 4,
              padding: { top: 10 },
              quickSuggestions: editorSettings.autoComplete,
              suggestOnTriggerCharacters: editorSettings.autoComplete,
              snippetSuggestions: editorSettings.autoComplete ? "inline" : "none",
              wordBasedSuggestions: editorSettings.autoComplete,
              formatOnType: editorSettings.formatOnType,
              formatOnPaste: editorSettings.formatOnType,
              links: true,
              matchBrackets: "always",
              autoClosingBrackets: "always",
              inlineSuggest: { enabled: true },
            }}
          />
        </div>
      </div>
    </div>
  );
}