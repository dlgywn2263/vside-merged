"use client";

import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import Editor, { DiffEditor, useMonaco } from "@monaco-editor/react";
import { useDispatch, useSelector } from "react-redux";
import { usePathname } from "next/navigation";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import { CollabWebSocket } from "@/lib/ide/collabSocket";
import { CollabFileSaver } from "@/lib/ide/collabFileSaver";
import { VscCheck, VscClose, VscSparkle, VscLoading, VscLock, VscWarning, VscArrowRight } from "react-icons/vsc";

import {
  updateFileContent,
  setAiSuggestion,
  clearAiSuggestion,
} from "@/store/slices/fileSystemSlice";

import {
  claimCollabSeedApi,
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

const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE_URL || "ws://localhost:8080";
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

// 방 접속 규약은 /ws/collab 을 쓰는 세 곳이 공유한다.
// 서버가 핸드셰이크에서 토큰을 확인하므로 공용 폴리필을 써야 한다.
const CustomWebSocket = CollabWebSocket;

const normalizeCollabKeyPart = (value, fallback = "") => {
  return String(value ?? fallback)
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/+/, "")
    .trim();
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
  
  const lockedLinesRef = useRef({});
  const lockDecosRef = useRef([]);

  /** 이 방의 최초 내용을 넣어도 되는지. 서버가 방마다 한 사람에게만 준다. */
  const seedGrantedRef = useRef(false);

  /** 넣을 디스크 내용. 허락이 늦게 와도 넣을 수 있게 들고 있는다. */
  const localContentRef = useRef("");

  /** 팀 모드에서 파일을 자동으로 저장하는 담당. */
  const fileSaverRef = useRef(null);
  const conflictDecosRef = useRef([]);
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

  const [lockWarning, setLockWarning] = useState({ show: false, msg: "" });
  const [mergeConflicts, setMergeConflicts] = useState([]);
  const [conflictSessionFileId, setConflictSessionFileId] = useState(null);
  const [lastConflictCount, setLastConflictCount] = useState(0);
  const [conflictResetDialog, setConflictResetDialog] = useState({
    isOpen: false,
    type: "confirm",
  });
  const [editorNotice, setEditorNotice] = useState(null);
  const warningTimeoutRef = useRef(null);

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

  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const bindingRef = useRef(null);
  const collabSessionRef = useRef(0);
  const providerStatusListenerRef = useRef(null);
  const providerSyncListenerRef = useRef(null);
  const bindTimeoutsRef = useRef([]);
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

  const showWarningToast = (msg) => {
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    setLockWarning({ show: true, msg });
    warningTimeoutRef.current = setTimeout(() => {
      setLockWarning({ show: false, msg: "" });
    }, 2500);
  };

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

  const getMyDisplayName = () => {
    if (fetchedNickname) return fetchedNickname;
    if (user?.nickname) return user.nickname;
    if (user?.email) return user.email.split("@")[0];

    try {
      if (typeof window !== "undefined") {
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        if (storedUser?.nickname) return storedUser.nickname;
        if (storedUser?.email) return storedUser.email.split("@")[0];
      }
    } catch (e) {}

    return "익명 개발자"; 
  };

  const cleanupCollaboration = useCallback(() => {
  collabSessionRef.current += 1;

  bindTimeoutsRef.current.forEach((timerId) => {
    window.clearTimeout(timerId);
  });
  bindTimeoutsRef.current = [];

  // 저장 담당인지는 연결을 끊기 전에 물어봐야 한다.
  //
  // 끊고 나면 누가 접속해 있는지 알 수 없어 모두가 자기를 담당이라고
  // 여기게 되고, 나가는 사람마다 저장을 보내면서 남아서 계속 고치던
  // 팀원의 최신 내용을 옛 것으로 덮을 수 있다.
  const saver = fileSaverRef.current;
  fileSaverRef.current = null;

  if (saver) {
    const shouldSave = saver.shouldSaveOnLeave();

    // 저장이 끝난 뒤에 정리한다. 저장이 문서를 읽어야 한다.
    if (shouldSave) {
      void saver.flush().finally(() => saver.destroy());
    } else {
      saver.destroy();
    }
  }

  const provider = providerRef.current;
  const statusListener = providerStatusListenerRef.current;
  const syncListener = providerSyncListenerRef.current;
  const awarenessListener = awarenessChangeListenerRef.current;

  try {
    if (provider && statusListener && typeof provider.off === "function") {
      provider.off("status", statusListener);
    }
  } catch {
    // provider status listener cleanup failure ignored
  }

  try {
    if (provider && syncListener && typeof provider.off === "function") {
      provider.off("sync", syncListener);
    }
  } catch {
    // provider sync listener cleanup failure ignored
  }

  try {
    if (
      provider?.awareness &&
      awarenessListener &&
      typeof provider.awareness.off === "function"
    ) {
      provider.awareness.off("change", awarenessListener);
    }
  } catch {
    // awareness listener cleanup failure ignored
  }

  providerStatusListenerRef.current = null;
  providerSyncListenerRef.current = null;
  awarenessChangeListenerRef.current = null;

  try {
    if (cursorListenerRef.current) {
      cursorListenerRef.current.dispose();
      cursorListenerRef.current = null;
    }

    const editor = editorRef.current;
    const model = editor?.getModel?.();

    if (
      editor &&
      model &&
      !model.isDisposed() &&
      lockDecosRef.current.length > 0
    ) {
      editor.deltaDecorations(lockDecosRef.current, []);
    }

    lockDecosRef.current = [];
    lockedLinesRef.current = {};

    try {
      const editor = editorRef.current;
      const model = editor?.getModel?.();

      if (editor && model && !model.isDisposed()) {
        editor.updateOptions({ readOnly: false });
      }
    } catch {
      // readOnly reset failure ignored
    }

    const binding = bindingRef.current;
    bindingRef.current = null;

    if (binding) {
      const originalConsoleError = console.error;

      console.error = (...args) => {
        const firstArg = String(args?.[0] || "");

        if (
          firstArg.includes("[yjs] Tried to remove event handler") ||
          firstArg.includes("Tried to remove event handler that doesn't exist")
        ) {
          return;
        }

        originalConsoleError.apply(console, args);
      };

      try {
        binding.destroy();
      } catch (error) {
        const message = String(error?.message || error || "");

        if (
          !message.includes("Tried to remove event handler") &&
          !message.includes("event handler that doesn't exist")
        ) {
          throw error;
        }
      } finally {
        console.error = originalConsoleError;
      }
    }

    if (providerRef.current) {
      try {
        providerRef.current.awareness?.setLocalState(null);
      } catch {}

      try {
        providerRef.current.disconnect();
      } catch {}

      try {
        providerRef.current.destroy?.();
      } catch {}

      providerRef.current = null;
    }

    if (ydocRef.current) {
      try {
        ydocRef.current.destroy();
      } catch {}

      ydocRef.current = null;
    }
  } catch {
    // Monaco/Yjs cleanup race condition ignored
  }
}, []);

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
        providerRef.current &&
        ydocRef.current
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

    // 이 방의 최초 내용을 넣을 권한을 서버에 물어본다.
    //
    // 답이 오기 전에 연결이 끝나 bind 가 실행될 수 있으므로 기본값은
    // "넣지 않음"이다. 넣지 않아 잠깐 비어 보이는 것은 상대의 내용이 오면
    // 채워지지만, 잘못 넣은 중복은 되돌리기 어렵다.
    seedGrantedRef.current = false;

    claimCollabSeedApi(roomName)
      .then((granted) => {
        if (collabSessionRef.current !== sessionId) return;

        seedGrantedRef.current = granted;

        // 이미 bind 가 끝났는데 이제야 허락이 왔고 문서가 비어 있다면
        // 여기서 넣는다. 아니면 파일이 빈 채로 남는다.
        if (granted) {
          const yText = ydocRef.current?.getText("monaco");

          if (yText && yText.length === 0 && localContentRef.current !== "") {
            yText.insert(0, localContentRef.current);
          }
        }
      })
      .catch(() => {
        // 물어보지 못했으면 넣지 않는다. 위와 같은 이유다.
      });

    console.log("[COLLAB ROOM ENTER]", {
      activeFileId,
      collabFileKey: normalizeCollabKeyPart(activeFileId),
      roomName,
      workspaceId,
      activeProject,
      activeBranch,
    });

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const provider = new WebsocketProvider(
      `${WS_BASE}/ws/collab`,
      roomName,
      ydoc,
      {
        WebSocketPolyfill: CustomWebSocket,
      },
    );

    providerRef.current = provider;

    const awareness = provider.awareness;
    const myColor =
      "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
    const myName = getMyDisplayName();

    const initialPos = editor.getPosition();

    awareness.setLocalStateField("user", {
      name: myName,
      color: myColor,
    });

    awareness.setLocalStateField("lockData", {
      name: myName,
      line: initialPos ? initialPos.lineNumber : 1,
    });

    cursorListenerRef.current = editor.onDidChangeCursorPosition((event) => {
      if (!isTeamModeRef.current || !isLiveSession()) return;

      const line = event.position.lineNumber;

      awareness.setLocalStateField("lockData", {
        name: myName,
        line,
      });

      
    });

    const updateLockDecorations = () => {
      if (!isLiveSession() || !monacoRef.current) return;

      const currentEditor = editorRef.current;
      const model = currentEditor?.getModel?.();

      if (!currentEditor || !model || model.isDisposed()) return;

      const decorations = [];

      Object.entries(lockedLinesRef.current).forEach(
        ([lineStr, lockerName]) => {
          const line = Number(lineStr);

          decorations.push({
            range: new monacoRef.current.Range(line, 1, line, 1),
            options: {
              isWholeLine: true,
              className: "locked-line-bg",
              linesDecorationsClassName: "locked-line-margin",
              glyphMarginClassName: "locked-glyph",
              hoverMessage: {
                value: `🚫 **${lockerName}**님이 이 줄을 수정 중입니다.`,
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
            .yRemoteSelectionHead-${clientId}::after {
              position: absolute !important;
              content: "${state.user.name}" !important;
              top: -20px !important;
              left: -2px !important;
              background-color: ${state.user.color} !important;
              color: white !important;
              font-size: 11px !important;
              font-weight: bold !important;
              padding: 2px 6px !important;
              border-radius: 4px !important;
              border-bottom-left-radius: 0 !important;
              white-space: nowrap !important;
              z-index: 100 !important;
              pointer-events: none !important;
            }
            .yRemoteSelection-${clientId} {
              background-color: ${state.user.color}44 !important;
            }
          `);
        }

        if (
          clientId !== awareness.clientID &&
          state.lockData &&
          state.lockData.line
        ) {
          newLockedLines[state.lockData.line] = state.lockData.name;
        }
      });

      styleEl.innerHTML = styles.join("\n");

      lockedLinesRef.current = newLockedLines;
      updateLockDecorations();

      const currentEditor = editorRef.current;
      const currentPos = currentEditor?.getPosition?.();

      if (!currentEditor || !currentPos) return;

    };

    awarenessChangeListenerRef.current = awarenessChangeHandler;
    awareness.on("change", awarenessChangeHandler);

    const yText = ydoc.getText("monaco");

    const rawContent =
      latestContentRef.current[activeFileId] ??
      fileContentsRef.current[activeFileId] ??
      "";

    const localContent = String(rawContent).replace(/\r\n/g, "\n");
    localContentRef.current = localContent;

    const doBind = () => {
      if (!isLiveSession()) return;
      if (bindingRef.current) return;

      const currentModel = editor.getModel();

      if (!currentModel || currentModel.isDisposed()) return;

      // 최초 내용을 넣을지는 서버가 준 허락으로만 정한다.
      //
      // 예전에는 awareness 에 누가 있는지를 보고 정했는데, bind 가 타이머로
      // 먼저 실행되면 상대 정보가 아직 안 와서 양쪽 다 자기가 처음이라고
      // 판단해 같은 내용을 두 번 넣었다.
      if (seedGrantedRef.current && yText.length === 0 && localContent !== "") {
        yText.insert(0, localContent);
      }

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

        console.log("[YJS MonacoBinding created]", {
          roomName,
          hasBinding: Boolean(bindingRef.current),
          yTextLength: yText.length,
          modelLength: currentModel.getValue().length,
        });
      } catch (error) {
        console.error("[YJS MonacoBinding failed]", error);
      }

      // 자동 저장을 붙인다.
      //
      // 방이 비면 서버에는 아무것도 남지 않으므로, 아무도 Ctrl+S 를 누르지
      // 않고 창을 닫으면 함께 고친 것이 통째로 사라진다. 접속자 중 한 명을
      // 담당으로 정해 그 사람만 저장한다.
      if (!fileSaverRef.current) {
        const savedFileId = activeFileId;
        const savedProject = activeProject;
        const savedBranch = activeBranch || "master";

        fileSaverRef.current = new CollabFileSaver({
          yText,
          awareness,
          clientId: ydoc.clientID,
          save: async (content) => {
            await saveFileApi(
              workspaceId,
              savedProject,
              savedBranch,
              savedFileId,
              content,
            );

            // 파일 트리와 미저장 표시가 어긋나지 않게 맞춰 준다.
            // 팀 모드는 편집 중에 Redux 를 갱신하지 않기 때문이다.
            latestContentRef.current[savedFileId] = content;
            dispatch(updateFileContent({ filePath: savedFileId, content }));
          },
          onError: (error) => {
            console.error("[협업] 자동 저장 실패", error);
          },
        });
      }
    };

    const safeDoBind = (reason) => {
  if (!isLiveSession()) return;
  if (bindingRef.current) return;

  console.log("[YJS bind start]", {
    reason,
    roomName,
    wsBase: WS_BASE,
    providerSynced: provider.synced,
    yTextLength: yText.length,
    modelLength: editor.getModel()?.getValue()?.length,
    awarenessClients: Array.from(awareness.getStates().keys()),
    myClientId: awareness.clientID,
  });

  doBind();

  console.log("[YJS bind done]", {
    reason,
    hasBinding: Boolean(bindingRef.current),
    yTextLength: yText.length,
    modelLength: editor.getModel()?.getValue()?.length,
  });
};

const statusHandler = ({ status }) => {
  console.log("[YJS status]", status, roomName, WS_BASE);

  if (status !== "connected") return;

  const timerId = window.setTimeout(() => {
    safeDoBind("connected-fallback");
  }, 800);

  bindTimeoutsRef.current.push(timerId);
};

providerStatusListenerRef.current = statusHandler;
provider.on("status", statusHandler);

const syncHandler = (isSynced) => {
    console.log("[YJS sync]", isSynced, roomName, yText.toString().length);

    if (!isSynced) return;

    if (typeof provider.off === "function") {
      provider.off("sync", syncHandler);
    }

    providerSyncListenerRef.current = null;
    safeDoBind("sync");
  };

  providerSyncListenerRef.current = syncHandler;
  provider.on("sync", syncHandler);

  if (provider.synced) {
    safeDoBind("already-synced");
  }

  const finalFallbackTimerId = window.setTimeout(() => {
    safeDoBind("final-fallback");
  }, 2000);

  // 허락을 못 받았는데 문서가 계속 비어 있고 방에 나 혼자라면, 먼저 있던
  // 사람이 그새 나간 것이다. 그대로 두면 파일이 빈 채로 열리므로 한 번 더
  // 물어본다.
  const reclaimTimerId = window.setTimeout(() => {
    if (!isLiveSession()) return;
    if (seedGrantedRef.current) return;
    if (yText.length > 0) return;
    if (awareness.getStates().size > 1) return;

    claimCollabSeedApi(roomName)
      .then((granted) => {
        if (!isLiveSession() || !granted) return;

        seedGrantedRef.current = true;

        if (yText.length === 0 && localContentRef.current !== "") {
          yText.insert(0, localContentRef.current);
        }
      })
      .catch(() => {});
  }, 3000);

  bindTimeoutsRef.current.push(reclaimTimerId);

  bindTimeoutsRef.current.push(finalFallbackTimerId);
  },
  [
    activeBranch,
    activeFileId,
    activeProject,
    collabFileKey,
    cleanupCollaboration,
    dispatch,
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

  useEffect(() => {
    if (providerRef.current && providerRef.current.awareness) {
      const awareness = providerRef.current.awareness;
      const currentState = awareness.getLocalState();
      const currentName = getMyDisplayName();

      if (currentName !== "익명 개발자" && currentState?.user?.name !== currentName) {
        awareness.setLocalStateField("user", {
          ...currentState?.user,
          name: currentName,
          color: currentState?.user?.color || "#ff9900",
        });
      }
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

    if (isTeamModeRef.current) {
      return;
    }

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

    editor.onKeyDown((e) => {
      if (!isTeamModeRef.current) return;

      const position = editor.getPosition();
      if (!position) return;

      const lockerName = lockedLinesRef.current[position.lineNumber];
      
      if (lockerName) {
        const m = monacoInstance.KeyCode;
        const allowedKeys = [
          m.LeftArrow, m.RightArrow, m.UpArrow, m.DownArrow,
          m.Home, m.End, m.PageUp, m.PageDown,
          m.Ctrl, m.Alt, m.Shift, m.Meta, m.Escape, m.Insert,
          m.F1, m.F2, m.F3, m.F4, m.F5, m.F6, m.F7, m.F8, m.F9, m.F10, m.F11, m.F12
        ];

        const isCopy = (e.ctrlKey || e.metaKey) && e.keyCode === m.KeyC;
        const isSelectAll = (e.ctrlKey || e.metaKey) && e.keyCode === m.KeyA;

        if (!allowedKeys.includes(e.keyCode) && !isCopy && !isSelectAll) {
          e.preventDefault();
          e.stopPropagation();
          showWarningToast(`🚫 ${lockerName}님이 작업 중인 구역입니다! (수정 불가)`);
        }
      }
    });

    const cmdCurrent = editor.addCommand(0, (_, conflict) => applyConflictResolution("current", conflict));
    const cmdIncoming = editor.addCommand(0, (_, conflict) => applyConflictResolution("incoming", conflict));
    const cmdBoth = editor.addCommand(0, (_, conflict) => applyConflictResolution("both", conflict));

    const codeLensProvider = monacoInstance.languages.registerCodeLensProvider("*", {
      provideCodeLenses: function (model, token) {
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
      resolveCodeLens: function (model, codeLens, token) {
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
    });

    editor.onMouseDown((e) => {
      if (
        e.target.type === monacoInstance.editor.MouseTargetType.GUTTER_GLYPH_MARGIN &&
        !lockedLinesRef.current[e.target.position.lineNumber]
      ) {
        const line = e.target.position.lineNumber;
        const currentFile = stateRef.current.activeFileId;
        if (currentFile) {
          dispatch(toggleBreakpoint({ path: currentFile, line }));
        }
      }
    });

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
      case "undo": editor.trigger("keyboard", "undo", null); break;
      case "redo": editor.trigger("keyboard", "redo", null); break;
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
  }, [editorCmd, dispatch, activeFileId]);

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

        .locked-line-bg { 
          background-color: rgba(255, 0, 0, 0.12) !important; 
        }
        .locked-line-margin {
          border-left: 4px solid #ff0000 !important;
          background-color: rgba(255, 0, 0, 0.12) !important;
          z-index: 50 !important;
        }
        .locked-glyph {
          background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" fill="%23ff0000" viewBox="0 0 16 16"><path d="M11 7V5a3 3 0 0 0-6 0v2H4v7h8V7h-1zm-1.5 0h-3V5a1.5 1.5 0 0 1 3 0v2z"/></svg>') no-repeat center center !important;
          background-size: 14px !important;
          margin-left: 3px !important;
          z-index: 50 !important;
        }
      `}} />

      {lockWarning.show && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[99999] bg-red-600/95 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-[0_10px_40px_rgba(255,0,0,0.4)] font-extrabold text-[14px] flex items-center gap-2 animate-bounce border border-red-400">
          <VscLock size={18} />
          {lockWarning.msg}
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
<Editor
  key={`${monacoModelPath}-${getLanguage(activeFileId)}`}
  height="100%"
  theme="light"
  path={monacoModelPath || activeFileId}
  language={getLanguage(activeFileId)}
  value={fileContents[activeFileId] || ""}
  beforeMount={handleEditorWillMount}
  onChange={handleEditorChange}
  onMount={handleEditorDidMount}
  options={{
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