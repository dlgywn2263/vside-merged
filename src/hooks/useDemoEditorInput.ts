// 경로: src/hooks/useDemoEditorInput.ts

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import {
  DEMO_DEFAULTS,
  findDemoEditorTarget,
  resolveDemoText,
} from "@/config/demoInputConfig";
import { useDemoMode } from "@/hooks/useDemoMode";
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

/**
 * 코드 에디터에 자동 입력을 연결한다. CodeEditor 의 onMount 에서 attach 를 부른다.
 *
 * 글자는 editor.executeEdits 로만 넣는다. 사람이 친 것과 똑같이 모델 변경 이벤트가 나가므로
 * 팀 모드는 y-monaco → Y.Text → 팀원·자동 저장, 개인 모드는 onChange → 디스크 저장을 그대로
 * 탄다. 되돌리기도 y-monaco 의 origin 으로 잡힌다.
 *
 * setValue 는 쓰지 않는다(문서 전체가 갈아 끼워져 팀원 입력이 사라진다). 위치는 매번 지금의
 * 커서에서 읽으므로 팀원이 위쪽을 고쳐 줄이 밀려도 내 자리를 따라간다.
 */
export function useDemoEditorInput(getContext: () => DemoEditorContext) {
  const { role, userKey, isActive } = useDemoMode();
  const runRef = useRef<DemoRun | null>(null);

  const latestRef = useRef({ role, userKey, isActive, getContext });
  useLayoutEffect(() => {
    latestRef.current = { role, userKey, isActive, getContext };
  });

  useEffect(() => {
    if (!isActive) runRef.current?.cancel();
  }, [isActive]);

  useEffect(() => () => runRef.current?.cancel(), []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- monaco 타입은 CodeEditor(JS)에서 넘어온다
  return useCallback((editor: any, monaco: any) => {
    let startTimer: ReturnType<typeof setTimeout> | null = null;

    const stop = () => {
      if (startTimer !== null) clearTimeout(startTimer);
      startTimer = null;
      runRef.current?.cancel();
    };

    const isReadOnly = () => editor.getOption(monaco.editor.EditorOption.readOnly);

    const tryStart = () => {
      const { role, userKey, isActive, getContext } = latestRef.current;
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
      // 기록 없이 들어가는 길은 같은 방의 파일을 함께 고치는 팀 모드에서만 연다.
      const normalizePath = (path: string) => path.replace(/\\/g, "/").replace(/^\/+/, "");
      const isConfiguredFile =
        isTeamMode &&
        Boolean(target.projectName && target.filePath) &&
        target.projectName === projectName &&
        normalizePath(target.filePath ?? "") === normalizePath(filePath);
      if (!isConfiguredFile && !isDemoCreatedFile(userKey, workspaceId, projectName, filePath)) {
        console.info("[시연 입력] 코드맵에서 만든 파일이 아니라 입력하지 않습니다.", { projectName, filePath });
        return;
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
        if (line === "") {
          const linesAbove: string[] = [];
          for (let number = 1; number < position.lineNumber; number += 1) {
            linesAbove.push(model.getLineContent(number));
          }
          text = resolveFieldIndent(linesAbove) + baseText;
        } else {
          editor.setPosition({ lineNumber: position.lineNumber, column: line.length + 1 });
        }
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

      editor.pushUndoStop();

      runRef.current = startDemoRun({
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
            const position = editor.getPosition();
            if (!position) return false;

            const range = replaceRangeOnce
              ? model.getFullModelRange()
              : new monaco.Range(
                  position.lineNumber,
                  position.column,
                  position.lineNumber,
                  position.column,
                );
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
              const next = editor.getPosition();
              if (next) editor.revealPosition(next, monaco.editor.ScrollType.Immediate);
            }
            return applied;
          },
        },
        onFinish: () => {
          runRef.current = null;
          if (editor.getModel() === model && !model.isDisposed()) editor.pushUndoStop();
        },
      });
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
        try {
          tryStart();
        } catch (error) {
          console.warn("[시연 입력] 시작하지 못했습니다", error);
        }
      }, 60);
    };

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
      editor.onMouseDown(stop),
      editor.onKeyDown(stop),
      editor.onDidPaste(stop),
      editor.onDidCompositionStart(stop),
      editor.onDidChangeModel(stop),
    ];

    editor.onDidDispose(() => {
      stop();
      disposables.forEach((disposable) => disposable.dispose());
    });
  }, []);
}
