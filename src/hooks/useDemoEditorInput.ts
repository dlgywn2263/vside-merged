// 경로: src/hooks/useDemoEditorInput.ts

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useStore } from "react-redux";
import {
  DEMO_DEFAULTS,
  findDemoEditorTarget,
  resolveDemoText,
  type DemoEditorTargetConfig,
} from "@/config/demoInputConfig";
import { useDemoMode } from "@/hooks/useDemoMode";
import { getMyWorkspacesByTokenApi } from "@/lib/ide/api";
import {
  isClassFieldPosition,
  resolveFieldIndent,
  stripJavaNoise,
} from "@/lib/demo/javaPlacement";
import {
  isDemoCreatedFile,
  isDemoRunActive,
  isDemoTargetDone,
  startDemoRun,
  type DemoRun,
} from "@/lib/demo/demoRunner";

/** CodeEditor 가 클릭 시점의 상태를 알려 준다. */
type DemoEditorContext = {
  filePath: string | null;
  workspaceId: unknown;
  projectName: unknown;
  isTeamMode: boolean;
  /** 팀 모드의 MonacoBinding. 없으면 아직 방에 붙지 않은 것이다. */
  binding: unknown;
  /** 지금 붙어 있는 CodeDocSession */
  session: { awareness?: { getStates: () => Map<number, unknown> } | null } | null;
};

const DEMO_EDIT_SOURCE = "demo-auto-input";

const normalizePath = (path: string) => path.replace(/\\/g, "/").replace(/^\/+/, "");

/* 보조 시연자의 파일 확인 ─────────────────────────────────────────────────────────── */

type FileTreeNode = { id?: unknown; name?: unknown; type?: unknown; children?: FileTreeNode[] | null };
type FileSystemState = {
  workspaceId?: unknown;
  activeProject?: unknown;
  activeBranch?: unknown;
  tree?: FileTreeNode | null;
};
type WorkspaceSummary = { id?: unknown; uuid?: unknown; name?: unknown; mode?: unknown; type?: unknown };

/** Sidebar 의 파일 판정과 같다(type 이 없고 children 도 없으면 파일). */
const isFileNode = (node: FileTreeNode) => {
  const type = String(node.type ?? "file").toLowerCase();
  return type === "file" || (type !== "project" && type !== "folder" && type !== "virtual_folder" && !node.children);
};

const hasFileInTree = (nodes: FileTreeNode[] | null | undefined, path: string): boolean =>
  (nodes ?? []).some(
    (node) =>
      (isFileNode(node) && typeof node.id === "string" && normalizePath(node.id) === path) ||
      hasFileInTree(node.children, path),
  );

// 워크스페이스 이름·종류는 바뀌지 않으므로 페이지에 있는 동안 한 번만 묻는다. 실패하면 다음에 다시 묻는다.
const workspaceCache = new Map<string, Promise<WorkspaceSummary | null>>();

const loadWorkspace = (workspaceId: string) => {
  let pending = workspaceCache.get(workspaceId);
  if (!pending) {
    pending = getMyWorkspacesByTokenApi()
      .then((list: unknown) => {
        const found =
          (Array.isArray(list) ? (list as WorkspaceSummary[]) : []).find(
            (item) => String(item?.id) === workspaceId || String(item?.uuid) === workspaceId,
          ) ?? null;
        if (!found) workspaceCache.delete(workspaceId);
        return found;
      })
      .catch(() => {
        workspaceCache.delete(workspaceId);
        return null;
      });
    workspaceCache.set(workspaceId, pending);
  }
  return pending;
};

/**
 * 보조 시연자는 파일을 직접 만들지 않아 코드맵 생성 기록이 없다. 그 대신 이 계정이 지금 보고 있는 것이
 * 시연용 팀 워크스페이스(id)·작업폴더·브랜치의 그 경로이고, 그 브랜치의 파일 트리(서버에서 받은 것)에 그 파일이
 * 실제로 있는지를 하나씩 본다. 시연자가 같은 파일을 열고 있을 필요는 없다.
 */
async function verifyAssistantFile(
  target: DemoEditorTargetConfig,
  context: DemoEditorContext,
  fileSystem: FileSystemState | undefined,
) {
  const { filePath, workspaceId, projectName, isTeamMode } = context;
  const path = normalizePath(filePath ?? "");
  const projectNode = (fileSystem?.tree?.children ?? []).find(
    (node) => node.name === projectName && String(node.type ?? "").toLowerCase() === "project",
  );

  const checks: Record<string, boolean> = {
    teamMode: isTeamMode,
    workspaceId: Boolean(target.workspaceId) && String(workspaceId) === target.workspaceId,
    path: Boolean(target.filePath) && normalizePath(target.filePath ?? "") === path,
    project: Boolean(target.projectName) && projectName === target.projectName,
    // 파일 트리는 지금 브랜치 것이므로, 브랜치가 맞으면 fileExists 가 그 브랜치에 파일이 있다는 뜻이다.
    branch: Boolean(target.branchName) && fileSystem?.activeBranch === target.branchName,
    // 에디터가 보는 워크스페이스·작업폴더가 탐색기(트리를 받은 곳)와 같은지
    activeContext:
      String(fileSystem?.workspaceId) === String(workspaceId) && fileSystem?.activeProject === projectName,
    fileExists: hasFileInTree(projectNode?.children, path),
  };

  // 다른 조건이 틀려도 묻는다. 로그에 실제 워크스페이스 이름·종류가 찍혀야 어긋난 곳을 바로 안다.
  // 내 워크스페이스 목록에 있어야 하고(멤버), 팀 워크스페이스여야 한다.
  const workspace = workspaceId != null ? await loadWorkspace(String(workspaceId)) : null;
  checks.teamWorkspace = String(workspace?.mode ?? workspace?.type ?? "").toLowerCase() === "team";

  const ok = Object.values(checks).every(Boolean);
  if (!ok) {
    console.info("[시연 입력] 시연 대상 파일이 아니라 입력하지 않습니다.", {
      checks,
      workspaceId,
      workspaceName: workspace?.name,
      workspaceMode: workspace?.mode ?? workspace?.type,
      projectName,
      branch: fileSystem?.activeBranch,
      filePath,
    });
  }
  return ok;
}

/* ─────────────────────────────────────────────────────────────────────────────── */

const MODIFIER_KEYS = new Set(["Control", "Shift", "Alt", "Meta"]);

const isPauseKey = (event: KeyboardEvent) =>
  event.code === "F8" && event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey;

/**
 * 코드 에디터에 자동 입력을 연결한다. CodeEditor 의 onMount 에서 attach 를 부른다.
 *
 * 글자는 editor.executeEdits 로만 넣는다. 사람이 친 것과 똑같이 모델 변경 이벤트가 나가므로
 * 팀 모드는 y-monaco → Y.Text → 팀원·자동 저장, 개인 모드는 onChange → 디스크 저장을 그대로
 * 탄다. 되돌리기도 y-monaco 의 origin 으로 잡힌다.
 *
 * setValue 는 쓰지 않는다(문서 전체가 갈아 끼워져 팀원 입력이 사라진다). 쓰는 자리는 첫 글자 뒤로
 * 모델 장식(decoration)으로 따라가므로 팀원이 위쪽을 고쳐 줄이 밀려도, 일시정지 중에 커서를 옮겨도
 * 내가 치던 자리에 잇는다.
 *
 * 보조 시연자는 Ctrl+F8 로 타이핑을 멈추고 이어 갈 수 있다. 상태는 메모리에만 있어 새로고침하면
 * 진행 중이던 입력은 끝난 것이 되고, 이미 들어간 글자는 문서에 그대로 남는다(이어서 치지 않는다).
 */
export function useDemoEditorInput(getContext: () => DemoEditorContext) {
  const { role, userKey, isActive } = useDemoMode();
  const store = useStore();
  const runRef = useRef<DemoRun | null>(null);

  const getFileSystem = () => (store.getState() as { fileSystem?: FileSystemState }).fileSystem;
  const latestRef = useRef({ role, userKey, isActive, getContext, getFileSystem });
  useLayoutEffect(() => {
    latestRef.current = { role, userKey, isActive, getContext, getFileSystem };
  });

  useEffect(() => {
    if (!isActive) runRef.current?.cancel();
  }, [isActive]);

  useEffect(() => () => runRef.current?.cancel(), []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- monaco 타입은 CodeEditor(JS)에서 넘어온다
  return useCallback((editor: any, monaco: any) => {
    let startTimer: ReturnType<typeof setTimeout> | null = null;
    // 이 에디터가 시작한 입력과 그 일시정지 상태. Ctrl+F8 은 이 에디터의 입력에만 듣는다.
    let ownRun: DemoRun | null = null;
    let ownRunPausable = false;
    let paused = false;

    const stop = () => {
      if (startTimer !== null) clearTimeout(startTimer);
      startTimer = null;
      runRef.current?.cancel();
    };

    const isReadOnly = () => editor.getOption(monaco.editor.EditorOption.readOnly);

    const tryStart = async () => {
      const { role, userKey, isActive, getContext, getFileSystem } = latestRef.current;
      if (!isActive || !role || !userKey || isDemoRunActive()) return;

      const context = getContext();
      const { filePath, workspaceId, projectName, isTeamMode, binding, session } = context;
      if (!filePath || filePath.startsWith("virtual:")) return;

      const target = findDemoEditorTarget(filePath, role);
      if (!target) return;

      const baseText = resolveDemoText(target, role);
      if (!baseText) return;
      if (!target.rerun && isDemoTargetDone(target.id)) return;

      // 이름만 같은 다른 파일에 들어가지 않도록 작업폴더와 상대경로까지 맞춰 본다.
      // 시연자는 자기 코드맵 기록으로, 보조 시연자는 워크스페이스·작업폴더·경로·파일 존재로 확인한다.
      if (role === "presenter") {
        if (!isDemoCreatedFile(userKey, workspaceId, projectName, filePath)) {
          console.info("[시연 입력] 코드맵에서 만든 파일이 아니라 입력하지 않습니다.", { projectName, filePath });
          return;
        }
      } else {
        if (!(await verifyAssistantFile(target, context, getFileSystem()))) return;
        // 확인을 기다리는 사이 파일·방을 갈아탔거나 시연 모드를 껐으면 시작하지 않는다.
        const now = latestRef.current;
        const after = now.getContext();
        if (
          !now.isActive ||
          now.userKey !== userKey ||
          isDemoRunActive() ||
          after.filePath !== filePath ||
          after.binding !== binding ||
          after.session !== session
        ) {
          return;
        }
      }

      const model = editor.getModel();
      if (!model || model.isDisposed()) return;

      // 팀 방에 아직 안 붙었으면 넣은 글자가 곧 덮인다. 샌드박스의 "팀 보기"·문서 로딩 중·
      // 팀원이 잡은 줄은 전부 읽기 전용이므로 여기서 함께 걸러진다.
      if (isTeamMode && !binding) return;
      if (isReadOnly()) return;

      // 드래그로 선택한 것이면 사용자가 뭔가 하려는 것이다.
      const selection = editor.getSelection();
      if (!selection || !selection.isEmpty()) return;

      const content = model.getValue();
      // 충돌 해결 중인 파일은 "내 것/상대 것" 화면이 줄 번호로 동작한다. 끼어들지 않는다.
      if (content.includes("<<<<<<<")) return;

      if (target.skipIfPresent?.test(stripJavaNoise(content))) {
        console.info("[시연 입력] 이미 같은 선언이 있어 입력하지 않습니다.");
        return;
      }

      let text = baseText;

      if (target.placement === "class-field") {
        const position = selection.getPosition();
        const line: string = model.getLineContent(position.lineNumber);

        // 이 줄에 코드가 있으면 줄바꿈 없이는 한 줄로 넣을 수 없다. 코드를 밀어내지 않는다.
        if (
          line.trim() !== "" ||
          !isClassFieldPosition(content, model.getOffsetAt(position))
        ) {
          console.info("[시연 입력] 클래스 본문의 빈 줄이 아니라 입력하지 않습니다.", position);
          return;
        }

        // 공백만 있는 줄이면 그 들여쓰기를 그대로 쓰고, 완전히 빈 줄이면 위쪽 코드에 맞춘다.
        let indent = line;
        if (line === "") {
          const linesAbove: string[] = [];
          for (let number = 1; number < position.lineNumber; number += 1) {
            linesAbove.push(model.getLineContent(number));
          }
          indent = resolveFieldIndent(linesAbove);
        } else {
          editor.setPosition({ lineNumber: position.lineNumber, column: line.length + 1 });
        }

        // 여러 줄 코드는 둘째 줄부터도 같은 들여쓰기를 붙인다. executeEdits 는 자동 들여쓰기를 하지 않는다.
        text =
          (line === "" ? indent : "") +
          baseText
            .split("\n")
            .map((codeLine, index) => (index === 0 || codeLine === "" ? codeLine : indent + codeLine))
            .join("\n");
      }

      const existing = target.existing ?? "insert";
      const hasExisting = content.trim() !== "";
      if (existing === "skip" && hasExisting) return;

      let replaceExisting = false;
      if (existing === "replace" && hasExisting) {
        // 전체 교체는 같은 방의 다른 사람이 치던 내용까지 지운다.
        const peers = session?.awareness?.getStates().size ?? 1;
        if (isTeamMode && peers > 1) {
          console.warn("[시연 입력] 다른 사람이 같은 파일에 있어 전체 교체를 하지 않았습니다.");
          return;
        }
        replaceExisting = true;
      }

      // 비어 있는 파일은 전체 범위에 넣어도, 커서 자리에 넣어도 같다.
      let replaceRangeOnce = replaceExisting;

      // 다음 글자를 넣을 자리. 첫 글자는 커서 자리에, 그다음부터는 이 장식이 가리키는 자리에 넣는다.
      let anchor: string[] = [];
      // 지금까지 넣은 글자. 넣기 직전마다 그 자리 바로 앞이 이것으로 끝나는지 본다.
      let written = "";

      const anchorPosition = () => {
        const range = anchor.length ? model.getDecorationRange(anchor[0]) : null;
        return range ? range.getStartPosition() : null;
      };

      // 팀원이 내가 치던 코드를 고쳤거나 그 자리에 끼어들었으면 이어 쓰면 엉뚱한 곳에 섞인다.
      const isAnchorIntact = (position: { lineNumber: number; column: number }) => {
        const tail = written.slice(-40);
        const lineCount = tail.split("\n").length;
        const before = model
          .getValueInRange(
            new monaco.Range(Math.max(1, position.lineNumber - lineCount), 1, position.lineNumber, position.column),
          )
          .replace(/\r\n/g, "\n");
        return before.endsWith(tail);
      };

      editor.pushUndoStop();

      const run = startDemoRun({
        targetId: target.id,
        ownerKey: userKey,
        text,
        mode: target.mode,
        replaceExisting,
        intervalMs: target.typingIntervalMs ?? DEMO_DEFAULTS.editorTypingIntervalMs,
        charsPerTick: target.charsPerTick ?? DEMO_DEFAULTS.editorCharsPerTick,
        selectDelayMs: DEMO_DEFAULTS.selectDelayMs,
        clearDelayMs: DEMO_DEFAULTS.clearDelayMs,
        blockedTimeoutMs: DEMO_DEFAULTS.editorBlockedTimeoutMs,
        sink: {
          // 파일·브랜치·방을 갈아탔으면 여기서 끝낸다. 늦게 쓴 글자가 다른 문서에 들어가면 안 된다.
          isValid: () => {
            if (editor.getModel() !== model || model.isDisposed()) return false;
            const now = latestRef.current.getContext();
            return (
              now.filePath === filePath &&
              now.binding === binding &&
              now.session === session
            );
          },
          isBlocked: isReadOnly,
          select: () => editor.setSelection(model.getFullModelRange()),
          // clear 는 두지 않는다. 지우고 넣기를 나누면 문서가 잠깐 비고 그 상태가 팀원에게 퍼진다.
          write: (chunk) => {
            let range;
            if (replaceRangeOnce) {
              range = model.getFullModelRange();
            } else {
              const position = written ? anchorPosition() : editor.getPosition();
              if (!position) return false;
              if (written && !isAnchorIntact(position)) {
                console.warn("[시연 입력] 입력하던 자리가 바뀌어 멈췄습니다.");
                return false;
              }
              range = new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column);
            }
            replaceRangeOnce = false;

            // 읽기 전용이면 false 가 돌아온다. 이 경로로는 절대 잠긴 문서에 쓰지 않는다.
            const applied = editor.executeEdits(
              DEMO_EDIT_SOURCE,
              [{ range, text: chunk, forceMoveMarkers: true }],
              (inverse: Array<{ range: { endLineNumber: number; endColumn: number } }>) => {
                const { endLineNumber, endColumn } = inverse[0].range;
                return [new monaco.Selection(endLineNumber, endColumn, endLineNumber, endColumn)];
              },
            );

            if (applied) {
              written += chunk;
              const next = editor.getPosition();
              if (next) {
                anchor = model.deltaDecorations(anchor, [
                  {
                    range: new monaco.Range(next.lineNumber, next.column, next.lineNumber, next.column),
                    options: { stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges },
                  },
                ]);
                editor.revealPosition(next, monaco.editor.ScrollType.Immediate);
              }
            }
            return applied;
          },
        },
        onFinish: () => {
          runRef.current = null;
          if (ownRun === run) {
            ownRun = null;
            paused = false;
          }
          if (editor.getModel() === model && !model.isDisposed()) {
            model.deltaDecorations(anchor, []);
            editor.pushUndoStop();
          }
        },
      });

      runRef.current = run;
      if (run) {
        ownRun = run;
        ownRunPausable = role === "assistant" && Boolean(target.pausable);
        paused = false;
      }
    };

    // 팀원 커서가 있던 줄에서 다른 줄을 클릭하면 줄 잠금은 React 렌더 뒤에야 풀린다.
    // mouseup 시점에 판정하면 아직 읽기 전용이라 시작하지 못하므로 잠깐 기다려 준다.
    // 샌드박스 "팀 보기"처럼 계속 읽기 전용인 경우는 끝내 시작하지 않는다.
    const scheduleStart = (retries: number) => {
      startTimer = setTimeout(() => {
        startTimer = null;
        if (isReadOnly() && retries > 0) {
          scheduleStart(retries - 1);
          return;
        }
        tryStart().catch((error) => console.warn("[시연 입력] 시작하지 못했습니다", error));
      }, 60);
    };

    // Ctrl+F8: 보조 시연자의 타이핑 일시정지/재개. 에디터가 키를 먼저 가져가지 못하도록 capture 로 받는다.
    // 시작은 하지 않는다(시작은 빈 줄 클릭). 진행 중인 입력이 없으면 키를 그냥 흘려보낸다.
    const handlePauseKey = (event: KeyboardEvent) => {
      if (!isPauseKey(event)) return;
      const { role, isActive } = latestRef.current;
      if (!isActive || role !== "assistant" || !ownRun || !ownRunPausable || runRef.current !== ownRun) return;

      event.preventDefault();
      event.stopPropagation();
      if (event.repeat) return;
      paused = ownRun.togglePause();
    };
    window.addEventListener("keydown", handlePauseKey, true);

    const { MouseTargetType } = monaco.editor;

    const disposables = [
      editor.onMouseUp((event: { event: { leftButton: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; metaKey: boolean }; target: { type: number } }) => {
        const { leftButton, ctrlKey, shiftKey, altKey, metaKey } = event.event;
        if (!leftButton || ctrlKey || shiftKey || altKey || metaKey) return;
        // 줄 번호·스크롤바·충돌 버튼을 누른 것은 입력하려는 클릭이 아니다.
        if (
          event.target.type !== MouseTargetType.CONTENT_TEXT &&
          event.target.type !== MouseTargetType.CONTENT_EMPTY
        ) {
          return;
        }
        if (!latestRef.current.isActive) return;
        scheduleStart(5);
      }),
      // 사람이 직접 건드리면 바로 멈춘다. 이미 들어간 글자는 그대로 둔다.
      // 일시정지 중의 클릭은 멈추지 않는다. 쓰는 자리는 장식이 따로 기억하므로 커서가 옮겨 가도 된다.
      editor.onMouseDown(() => {
        if (!paused) stop();
      }),
      // Ctrl+F8·Ctrl+F9 를 누르면 Ctrl 이 먼저 눌린다. 보조키만 누른 것은 입력이 아니므로 멈추지 않는다.
      editor.onKeyDown((event: { browserEvent: KeyboardEvent }) => {
        const { browserEvent } = event;
        if (MODIFIER_KEYS.has(browserEvent.key) || isPauseKey(browserEvent)) return;
        stop();
      }),
      editor.onDidPaste(stop),
      editor.onDidCompositionStart(stop),
      editor.onDidChangeModel(stop),
    ];

    editor.onDidDispose(() => {
      stop();
      window.removeEventListener("keydown", handlePauseKey, true);
      disposables.forEach((disposable) => disposable.dispose());
    });
  }, []);
}
