"use client";

import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import Editor, { DiffEditor, useMonaco } from "@monaco-editor/react";
import { useDispatch, useSelector } from "react-redux";
import { usePathname } from "next/navigation";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import { VscCheck, VscClose, VscSparkle, VscLoading, VscLock } from "react-icons/vsc";

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
} from "@/store/slices/uiSlice";

import { useAuth } from "@/lib/ide/AuthContext";

const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE_URL || "ws://localhost:8080";

class CustomWebSocket extends WebSocket {
  constructor(url, protocols) {
    const parsedUrl = new URL(url);
    const pathParts = parsedUrl.pathname.split("/ws/collab/");
    const roomName =
      pathParts.length > 1 ? decodeURIComponent(pathParts[1]) : "default-room";
    
    const safeUrl = `${WS_BASE}/ws/collab?room=${encodeURIComponent(
      roomName,
    )}`;
    super(safeUrl, protocols);
  }
}

const applyConflictEdit = (monacoInstance, editor, conflict, type) => {
  const model = editor.getModel();
  if (!model) return;

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
};

export default function CodeEditor() {
  const dispatch = useDispatch();
  const monaco = useMonaco();
  const pathname = usePathname();
  const { user } = useAuth();

  const editorRef = useRef(null);
  const monacoRef = useRef(null); 
  const decorationsRef = useRef([]);
  
  const lockedLinesRef = useRef({});
  const lockDecosRef = useRef([]);
  const cursorListenerRef = useRef(null); 

  const [fontSize, setFontSize] = useState(14);
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [fetchedNickname, setFetchedNickname] = useState("");

  const [lockWarning, setLockWarning] = useState({ show: false, msg: "" });
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

  const { editorCmd, debugLine, breakpoints } = useSelector(
    (state) => state.ui,
  );

  const editorSettings = useSelector((state) => state.ui.editorSettings) || {
    autoComplete: true,
    formatOnType: true,
    minimap: true,
  };

  const stateRef = useRef({
    activeFileId,
    workspaceId,
    activeProject,
    activeBranch,
  });

  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const bindingRef = useRef(null);

  const isTeamMode = pathname?.includes("/team");
  
  const isTeamModeRef = useRef(isTeamMode);
  useEffect(() => {
    isTeamModeRef.current = isTeamMode;
  }, [isTeamMode]);

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

  const cleanupCollaboration = () => {
    const originalConsoleError = console.error;
    console.error = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes('[yjs] Tried to remove event handler')) {
        return; 
      }
      originalConsoleError.apply(console, args);
    };

    try {
      if (cursorListenerRef.current) {
        cursorListenerRef.current.dispose();
        cursorListenerRef.current = null;
      }
      if (editorRef.current && lockDecosRef.current.length > 0) {
        editorRef.current.deltaDecorations(lockDecosRef.current, []);
        lockDecosRef.current = [];
      }
      lockedLinesRef.current = {};

      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
      if (providerRef.current) {
        if (providerRef.current.awareness) {
          providerRef.current.awareness.setLocalState(null);
        }
        providerRef.current.disconnect();
        providerRef.current = null;
      }
      if (ydocRef.current) {
        ydocRef.current.destroy();
        ydocRef.current = null;
      }
    } catch (e) {
    } finally {
      console.error = originalConsoleError;
    }
  };

  const setupCollaboration = (editor) => {
    cleanupCollaboration();
    if (!activeFileId || !workspaceId || !activeProject) return;

    const model = editor.getModel();
    if (!model) return;

    // 💡 [핵심 해결 1] Windows(CRLF)와 Yjs(LF)의 줄바꿈 계산 차이로 인한 "커서 밀림 현상" 완벽 방지!
    if (monacoRef.current) {
      model.setEOL(monacoRef.current.editor.EndOfLineSequence.LF);
    }

    const roomName = `${workspaceId}:${activeProject}:${activeBranch || "master"}:${activeFileId}`;

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
    const myColor = "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
    const myName = getMyDisplayName();

    const initialPos = editor.getPosition();
    
    // Yjs Awareness에 내 정보(커서 색상, 이름, 락 데이터) 등록
    awareness.setLocalStateField("user", {
      name: myName,
      color: myColor,
    });
    
    awareness.setLocalStateField("lockData", {
      name: myName,
      line: initialPos ? initialPos.lineNumber : 1, 
    });

    // 커서 이동 시 내 위치를 실시간으로 상대방에게 전송 및 ReadOnly 처리
    cursorListenerRef.current = editor.onDidChangeCursorPosition((e) => {
      if (!isTeamModeRef.current) return;
      const line = e.position.lineNumber;
      
      // 내 위치 서버로 전송
      awareness.setLocalStateField("lockData", {
        name: myName,
        line: line,
      });

      // 💡 [핵심 해결 2] 내가 이동한 줄이 상대방이 점유 중이라면 "읽기 전용"으로 철벽 방어!
      if (lockedLinesRef.current[line]) {
        editor.updateOptions({ readOnly: true });
      } else {
        editor.updateOptions({ readOnly: false });
      }
    });

    // 상대방이 있는 줄에 락(빨간색 시각 효과) 그리기
    const updateLockDecorations = () => {
      if (!editorRef.current || !monacoRef.current) return; 
      
      const decos = [];
      Object.entries(lockedLinesRef.current).forEach(([lineStr, lockerName]) => {
        const line = Number(lineStr);
        decos.push({
          range: new monacoRef.current.Range(line, 1, line, 1),
          options: {
            isWholeLine: true,
            className: "locked-line-bg",
            linesDecorationsClassName: "locked-line-margin", 
            glyphMarginClassName: "locked-glyph", 
            hoverMessage: { value: `🚫 **${lockerName}**님이 이 줄을 수정 중입니다.` },
          },
        });
      });

      lockDecosRef.current = editorRef.current.deltaDecorations(lockDecosRef.current, decos);
    };

    awareness.on("change", () => {
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
        // 상대방 이름표(커서) 스타일링 주입
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

        // 상대방 락(Lock) 위치 갱신
        if (clientId !== awareness.clientID && state.lockData && state.lockData.line) {
          newLockedLines[state.lockData.line] = state.lockData.name;
        }
      });
      styleEl.innerHTML = styles.join("\n");
      
      lockedLinesRef.current = newLockedLines;
      updateLockDecorations();

      // 💡 상대방이 내 위치로 다가와서 선점했다면, 즉시 내 에디터를 읽기 전용으로 차단!
      const currentPos = editorRef.current?.getPosition();
      if (currentPos && lockedLinesRef.current[currentPos.lineNumber]) {
        editorRef.current.updateOptions({ readOnly: true });
      } else if (editorRef.current) {
        editorRef.current.updateOptions({ readOnly: false });
      }
    });

    const yText = ydoc.getText("monaco");
    
    // 로컬 데이터 역시 LF(\n) 규격으로 완벽히 맞춰서 빈 화면/밀림 충돌을 방지합니다.
    const rawContent = fileContentsRef.current[activeFileId] || "";
    const localContent = rawContent.replace(/\r\n/g, "\n");

    // 💡 [해결 3: 복붙 더블링 방지 및 정석 바인딩]
    const doBind = () => {
      if (bindingRef.current) return;

      // 1. 서버가 비어있다면, 방장(가장 먼저 들어온 사람)만 초기 데이터를 주입
      if (yText.length === 0 && localContent !== "") {
        const clients = Array.from(awareness.getStates().keys()).sort();
        if (clients.length === 0 || clients[0] === awareness.clientID) {
           yText.insert(0, localContent);
        }
      }

      // 2. 바인딩 직전에 모델과 서버 텍스트를 정확히 일치시킵니다.
      if (model.getValue() !== yText.toString()) {
        model.setValue(yText.toString());
      }

      // 3. 결합!
      bindingRef.current = new MonacoBinding(yText, model, new Set([editor]), awareness);
    };

    // 무한 멈춤 방지를 위해 연결 상태가 확인되면 즉각적으로 바인딩 시도
    if (provider.synced) {
      doBind();
    } else {
      provider.on('status', ({ status }) => {
        if (status === 'connected') {
          setTimeout(doBind, 300);
        }
      });
      setTimeout(doBind, 1500); // 최후의 보루
    }
  };

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

  const isContentLoaded = fileContents[activeFileId] !== undefined;

  useEffect(() => {
    if (isEditorReady && editorRef.current && isContentLoaded) {
      if (isTeamMode) setupCollaboration(editorRef.current);
      else cleanupCollaboration();
    }

    return () => cleanupCollaboration();
  }, [
    isEditorReady,
    activeFileId,
    workspaceId,
    activeProject,
    activeBranch,
    isContentLoaded,
    isTeamMode,
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

  const handleEditorChange = (value) => {
    if (!isTeamModeRef.current && activeFileId) {
      dispatch(updateFileContent({ filePath: activeFileId, content: value }));
    }
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
        alert("AI 거절: " + response.explanation);
      }
    } catch (error) {
      alert("AI 요청 실패: " + error.message);
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
      if (model) {
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

  const handleEditorDidMount = (editor, monacoInstance) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;
    setIsEditorReady(true);

    // 💡 키보드 타이핑 시 경고 토스트 띄우기 및 튕겨내기 로직
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

        // 허용되지 않은 쓰기/삭제 작업을 시도하면 막고 경고창 띄움
        if (!allowedKeys.includes(e.keyCode) && !isCopy && !isSelectAll) {
          e.preventDefault();
          e.stopPropagation();
          showWarningToast(`🚫 ${lockerName}님이 작업 중인 구역입니다! (수정 불가)`);
        }
      }
    });

    const cmdCurrent = editor.addCommand(0, (_, conflict) => applyConflictEdit(monacoInstance, editor, conflict, "current"));
    const cmdIncoming = editor.addCommand(0, (_, conflict) => applyConflictEdit(monacoInstance, editor, conflict, "incoming"));
    const cmdBoth = editor.addCommand(0, (_, conflict) => applyConflictEdit(monacoInstance, editor, conflict, "both"));

    const codeLensProvider = monacoInstance.languages.registerCodeLensProvider("*", {
      provideCodeLenses: function (model, token) {
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
    });

    editor.onDidChangeCursorSelection((e) => {
      const selection = e.selection;
      const model = editor.getModel();
      if (model) {
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
        const { activeFileId, workspaceId, activeProject, activeBranch } =
          stateRef.current;
        if (!activeFileId || !workspaceId || !activeProject) return;

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
            if (token.isCancellationRequested) {
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

  return (
    <div className="relative h-full w-full overflow-hidden bg-white flex flex-col">
      
      <style dangerouslySetInnerHTML={{ __html: `
        .debug-current-line { background-color: rgba(255, 230, 0, 0.3) !important; border-left: 3px solid #eab308; }
        .debug-breakpoint-glyph { background: #ef4444; width: 10px !important; height: 10px !important; border-radius: 50%; margin-left: 6px; margin-top: 5px; cursor: pointer; z-index: 10; }
        .conflict-current-bg { background-color: rgba(60, 179, 113, 0.2) !important; }
        .conflict-current-margin { border-left: 4px solid #3cb371 !important; }
        .conflict-incoming-bg { background-color: rgba(65, 105, 225, 0.2) !important; }
        .conflict-incoming-margin { border-left: 4px solid #4169e1 !important; }

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
            <DiffEditor height="100%" theme="light" language={getLanguage(activeFileId)} original={aiSuggestion?.originalCode || "// 코드 분석 중..."} modified={aiSuggestion?.suggestedCode || "// 코드 분석 중..."} options={{ renderSideBySide: true, readOnly: false, fontSize, fontFamily: "'D2Coding', 'Consolas', monospace", minimap: { enabled: editorSettings.minimap }, originalEditable: false }} />
          </div>
        )}

        <div className={`absolute inset-0 z-10 bg-white ${isDiffMode ? "invisible" : ""}`}>
          <Editor
            height="100%"
            theme="light"
            path={activeFileId}
            language={getLanguage(activeFileId)}
            value={fileContents[activeFileId] || ""}
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