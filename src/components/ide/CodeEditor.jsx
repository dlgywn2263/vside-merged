"use client";

import React, { useRef, useEffect, useState } from "react";
import Editor, { DiffEditor, useMonaco } from "@monaco-editor/react";
import { useDispatch, useSelector } from "react-redux";
import { usePathname } from "next/navigation";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import { VscCheck, VscClose, VscSparkle, VscLoading } from "react-icons/vsc";

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

class CustomWebSocket extends WebSocket {
  constructor(url, protocols) {
    const parsedUrl = new URL(url);
    const pathParts = parsedUrl.pathname.split("/ws/collab/");
    const roomName =
      pathParts.length > 1 ? decodeURIComponent(pathParts[1]) : "default-room";
    const safeUrl = `ws://localhost:8080/ws/collab?room=${encodeURIComponent(
      roomName,
    )}`;
    super(safeUrl, protocols);
  }
}

const applyConflictEdit = (monaco, uri, conflict, type) => {
  const model = monaco.editor.getModel(uri);
  if (!model) return;

  let newText = "";
  const currentRange = new monaco.Range(
    conflict.start + 1,
    1,
    conflict.mid - 1,
    model.getLineMaxColumn(conflict.mid - 1) || 1,
  );
  const incomingRange = new monaco.Range(
    conflict.mid + 1,
    1,
    conflict.end - 1,
    model.getLineMaxColumn(conflict.end - 1) || 1,
  );

  const currentText =
    conflict.mid - conflict.start > 1
      ? model.getValueInRange(currentRange)
      : "";
  const incomingText =
    conflict.end - conflict.mid > 1 ? model.getValueInRange(incomingRange) : "";

  if (type === "current") newText = currentText;
  else if (type === "incoming") newText = incomingText;
  else if (type === "both") {
    newText = currentText;
    if (currentText && incomingText) newText += "\n";
    newText += incomingText;
  }

  const fullRange = new monaco.Range(
    conflict.start,
    1,
    conflict.end,
    model.getLineMaxColumn(conflict.end) || 1,
  );

  model.pushEditOperations(
    [],
    [{ range: fullRange, text: newText }],
    () => null,
  );
};

export default function CodeEditor() {
  const dispatch = useDispatch();
  const monaco = useMonaco();
  const pathname = usePathname();
  const { user } = useAuth();

  const editorRef = useRef(null);
  const decorationsRef = useRef([]);

  const [fontSize, setFontSize] = useState(14);
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [fetchedNickname, setFetchedNickname] = useState("");

  const aiInputRef = useRef(null);

  const {
    activeFileId,
    fileContents,
    workspaceId,
    activeProject,
    activeBranch,
    aiSuggestion,
  } = useSelector((state) => state.fileSystem);

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

  const cleanupCollaboration = () => {
    if (bindingRef.current) {
      bindingRef.current.destroy();
      bindingRef.current = null;
    }
    if (providerRef.current) {
      providerRef.current.disconnect();
      providerRef.current = null;
    }
    if (ydocRef.current) {
      ydocRef.current.destroy();
      ydocRef.current = null;
    }
  };

  const setupCollaboration = (editor) => {
    cleanupCollaboration();
    if (!activeFileId || !workspaceId || !activeProject) return;

    const model = editor.getModel();
    if (!model) return;

    const initialContent = fileContents[activeFileId] || "";
    if (model.getValue() !== initialContent) {
      model.setValue(initialContent);
    }

    const roomName = `${workspaceId}:${activeProject}:${
      activeBranch || "master"
    }:${activeFileId}`;

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const provider = new WebsocketProvider(
      "ws://localhost:8080/ws/collab",
      roomName,
      ydoc,
      {
        WebSocketPolyfill: CustomWebSocket,
        maxBackoffTime: 5000,
      },
    );
    providerRef.current = provider;

    const awareness = provider.awareness;
    const myColor =
      "#" +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0");

    awareness.setLocalStateField("user", {
      name: fetchedNickname || user?.nickname || "익명 개발자",
      color: myColor,
    });

    awareness.on("change", () => {
      const styleId = "yjs-dynamic-cursors";
      let styleEl = document.getElementById(styleId);

      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }

      const styles = [];
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
      });

      styleEl.innerHTML = styles.join("\n");
    });

    const yText = ydoc.getText("monaco");

    const safeBind = () => {
      if (bindingRef.current) return;

      if (yText.length === 0) {
        if (provider.awareness.getStates().size <= 1) {
          yText.insert(0, model.getValue());
        }
      } else if (model.getValue() !== yText.toString()) {
        model.setValue(yText.toString());
      }

      bindingRef.current = new MonacoBinding(
        yText,
        model,
        new Set([editor]),
        awareness,
      );
    };

    if (provider.synced) {
      safeBind();
    } else {
      provider.once("synced", safeBind);
      provider.once("sync", safeBind);
    }

    setTimeout(() => {
      if (!bindingRef.current) {
        safeBind();
      }
    }, 1500);
  };

  useEffect(() => {
    if (!user?.id) return;

    getUserProfileApi(user.id)
      .then((profile) => {
        if (profile?.nickname) {
          setFetchedNickname(profile.nickname);
        }
      })
      .catch(console.error);
  }, [user]);

  useEffect(() => {
    const finalName = fetchedNickname || user?.nickname;
    if (providerRef.current && providerRef.current.awareness && finalName) {
      const awareness = providerRef.current.awareness;
      const currentState = awareness.getLocalState();

      awareness.setLocalStateField("user", {
        name: finalName,
        color: currentState?.user?.color || "#ff9900",
      });
    }
  }, [fetchedNickname, user?.nickname]);

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
      case "java":
        return "java";
      case "py":
        return "python";
      case "js":
      case "jsx":
        return "javascript";
      case "ts":
      case "tsx":
        return "typescript";
      case "html":
        return "html";
      case "css":
        return "css";
      case "cpp":
        return "cpp";
      case "c":
        return "c";
      case "cs":
        return "csharp";
      case "json":
        return "json";
      default:
        return "plaintext";
    }
  };

  const handleEditorChange = (value) => {
    if (activeFileId) {
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
    executeAiAction(
      aiQuery +
        "\n\n(명령어: explanation 필드의 설명은 반드시 핵심만 1~2줄로 아주 짧고 간결하게 작성해.)",
      fileContents[activeFileId] || "",
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
    setIsEditorReady(true);

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
        e.target.type ===
        monacoInstance.editor.MouseTargetType.GUTTER_GLYPH_MARGIN
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
                error?.msg?.includes("canceled")
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
      case "undo":
        editor.trigger("keyboard", "undo", null);
        break;
      case "redo":
        editor.trigger("keyboard", "redo", null);
        break;
      case "cut":
        editor.trigger("keyboard", "editor.action.clipboardCutAction", null);
        break;
      case "copy":
        editor.trigger("keyboard", "editor.action.clipboardCopyAction", null);
        break;
      case "paste":
        editor.trigger("keyboard", "editor.action.clipboardPasteAction", null);
        break;
      case "find":
        editor.trigger("keyboard", "actions.find", null);
        break;
      case "replace":
        editor.trigger(
          "keyboard",
          "editor.action.startFindReplaceAction",
          null,
        );
        break;
      case "zoom_in":
        setFontSize((prev) => prev + 2);
        break;
      case "zoom_out":
        setFontSize((prev) => Math.max(8, prev - 2));
        break;
      case "go_to_line":
        editor.trigger("keyboard", "editor.action.gotoLine", null);
        break;
      case "go_to_definition":
        editor.trigger("keyboard", "editor.action.revealDefinition", null);
        break;
      case "go_to_references":
        editor.trigger(
          "keyboard",
          "editor.action.referenceSearch.trigger",
          null,
        );
        break;
      case "autocomplete":
        editor.trigger("keyboard", "editor.action.triggerSuggest", null);
        break;
      case "format":
        editor.trigger("keyboard", "editor.action.formatDocument", null);
        break;
      case "rename":
        editor.trigger("keyboard", "editor.action.rename", null);
        break;
      case "refactor":
        editor.trigger("keyboard", "editor.action.refactor", null);
        break;
      case "toggle_breakpoint": {
        const position = editor.getPosition();
        if (position && activeFileId) {
          dispatch(
            toggleBreakpoint({ path: activeFileId, line: position.lineNumber }),
          );
        }
        break;
      }
      default:
        break;
    }

    dispatch(triggerEditorCmd(null));
  }, [editorCmd, dispatch, activeFileId]);

  useEffect(() => {
    const styleId = "monaco-debug-styles";

    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.innerHTML = `
        .debug-current-line { background-color: rgba(255, 230, 0, 0.3) !important; border-left: 3px solid #eab308; }
        .debug-breakpoint-glyph { background: #ef4444; width: 10px !important; height: 10px !important; border-radius: 50%; margin-left: 6px; margin-top: 5px; cursor: pointer; z-index: 10; }
        .conflict-current-bg { background-color: rgba(60, 179, 113, 0.2) !important; }
        .conflict-current-margin { border-left: 4px solid #3cb371 !important; }
        .conflict-incoming-bg { background-color: rgba(65, 105, 225, 0.2) !important; }
        .conflict-incoming-margin { border-left: 4px solid #4169e1 !important; }
        .yRemoteSelection { background-color: rgba(250, 129, 0, 0.2) !important; }
        .yRemoteSelectionHead {
          position: absolute !important;
          border-left: 2px solid orange !important;
          box-sizing: border-box !important;
          height: 100% !important;
          z-index: 99 !important;
          display: inline-block !important;
        }
        .yRemoteSelectionHead::after {
          position: absolute !important;
          content: ' ' !important;
          top: -20px !important;
          left: -2px !important;
          background-color: orange !important;
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
      `;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    if (!editorRef.current || !monaco || !activeFileId) return;

    const editor = editorRef.current;
    const model = editor.getModel ? editor.getModel() : null;
    if (!model || !model.getValue) return;

    const updateDecorations = () => {
      const newDecorations = [];
      const currentFileBreakpoints = breakpoints.filter(
        (bp) =>
          activeFileId.endsWith(bp.path) || bp.path.endsWith(activeFileId),
      );

      currentFileBreakpoints.forEach((bp) => {
        newDecorations.push({
          range: new monaco.Range(bp.line, 1, bp.line, 1),
          options: {
            isWholeLine: false,
            glyphMarginClassName: "debug-breakpoint-glyph",
            glyphMarginHoverMessage: { value: "Breakpoint" },
          },
        });
      });

      if (
        debugLine &&
        (activeFileId.endsWith(debugLine.path) ||
          debugLine.path.endsWith(activeFileId))
      ) {
        newDecorations.push({
          range: new monaco.Range(debugLine.line, 1, debugLine.line, 1),
          options: { isWholeLine: true, className: "debug-current-line" },
        });
        editor.revealLineInCenter(debugLine.line);
      }

      const lines = model.getValue().split("\n");
      let currentConflict = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith("<<<<<<<")) currentConflict = { start: i + 1 };
        else if (line.startsWith("=======") && currentConflict) {
          currentConflict.mid = i + 1;
        } else if (line.startsWith(">>>>>>>")) {
          if (currentConflict && currentConflict.mid) {
            currentConflict.end = i + 1;

            newDecorations.push({
              range: new monaco.Range(
                currentConflict.start,
                1,
                currentConflict.mid,
                1,
              ),
              options: {
                isWholeLine: true,
                className: "conflict-current-bg",
                linesDecorationsClassName: "conflict-current-margin",
              },
            });

            newDecorations.push({
              range: new monaco.Range(
                currentConflict.mid,
                1,
                currentConflict.end,
                1,
              ),
              options: {
                isWholeLine: true,
                className: "conflict-incoming-bg",
                linesDecorationsClassName: "conflict-incoming-margin",
              },
            });

            currentConflict = null;
          }
        }
      }

      decorationsRef.current = editor.deltaDecorations(
        decorationsRef.current,
        newDecorations,
      );
    };

    updateDecorations();
    const disposable = editor.onDidChangeModelContent(updateDecorations);
    return () => disposable.dispose();
  }, [breakpoints, debugLine, activeFileId, monaco, fileContents]);

  useEffect(() => {
    if (!monaco) return;

    const provider = monaco.languages.registerInlineCompletionsProvider("*", {
      provideInlineCompletions: (model, position, context, token) => {
        return new Promise((resolve) => {
          let settled = false;

          const finish = (result) => {
            if (settled) return;
            settled = true;
            resolve(result);
          };

          const timer = setTimeout(async () => {
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
                error?.msg?.includes("canceled")
              ) {
                finish({ items: [] });
                return;
              }

              console.error("autocomplete error:", error);
              finish({ items: [] });
            }
          }, 1500);

          token.onCancellationRequested(() => {
            clearTimeout(timer);
            finish({ items: [] });
          });
        });
      },
      freeInlineCompletions: () => {},
      handleItemDidShow: () => {},
      disposeInlineCompletions: () => {},
    });

    return () => provider.dispose();
  }, [monaco]);

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
      {isDiffMode && (
        <div className="bg-indigo-50/90 border-b border-indigo-200 flex items-center justify-between p-3 shrink-0 shadow-sm z-10 backdrop-blur-sm min-h-[50px]">
          <div className="flex items-start gap-2 flex-1 min-w-0 mr-4">
            <VscSparkle
              className="text-indigo-600 animate-pulse shrink-0 mt-0.5"
              size={18}
            />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-extrabold text-indigo-900 mb-1">
                AI 코드 제안 검토
              </span>
              <div className="text-[12px] font-medium text-indigo-800 bg-white/70 p-2 rounded-md border border-indigo-100/50 max-h-[50px] overflow-y-auto custom-scrollbar leading-relaxed">
                {aiSuggestion.explanation}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleAcceptAi}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-md shadow flex items-center gap-1.5 transition-colors"
            >
              <VscCheck size={14} /> 적용 (Accept)
            </button>
            <button
              onClick={handleRejectAi}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white text-xs font-bold rounded-md shadow flex items-center gap-1.5 transition-colors"
            >
              <VscClose size={14} /> 취소 (Reject)
            </button>
          </div>
        </div>
      )}

      {showAiInput && !isDiffMode && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[500px] bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-200 z-50 p-2 flex items-center gap-3 animate-fade-in-up">
          <div className="bg-indigo-100 p-1.5 rounded-lg ml-1">
            <VscSparkle className="text-indigo-600" size={18} />
          </div>
          <input
            ref={aiInputRef}
            type="text"
            className="flex-1 border-none outline-none text-[13px] bg-transparent font-medium text-gray-800 placeholder-gray-400"
            placeholder="AI에게 무엇을 만들어 달라고 할까요? (예: 에러 처리 추가해줘)"
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAiSubmit();
              }
              if (e.key === "Escape") setShowAiInput(false);
            }}
            disabled={isAiLoading}
          />
          {isAiLoading ? (
            <VscLoading
              className="animate-spin text-indigo-500 mr-2"
              size={18}
            />
          ) : (
            <div className="flex items-center gap-2 mr-2 text-[10px] font-bold text-gray-400">
              <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                Enter
              </span>
              <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                Esc
              </span>
            </div>
          )}
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

        <div
          className={`absolute inset-0 z-10 bg-white ${isDiffMode ? "invisible" : ""}`}
        >
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
              snippetSuggestions: editorSettings.autoComplete
                ? "inline"
                : "none",
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
