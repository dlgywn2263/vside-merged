// 경로: src/hooks/useDemoAutoInput.ts

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import {
  DEMO_DEFAULTS,
  DEMO_INPUT_TARGETS,
  resolveDemoText,
  type DemoTargetConfig,
  type DemoTargetId,
} from "@/config/demoInputConfig";
import { useDemoMode } from "@/hooks/useDemoMode";
import {
  isDemoRunActive,
  isDemoTargetDone,
  startDemoRun,
  type DemoRun,
} from "@/lib/demo/demoRunner";

type InputElement = HTMLInputElement | HTMLTextAreaElement;

type UseDemoAutoInputArgs = {
  targetId: DemoTargetId;
  /** 입력창의 지금 값(React state) */
  value: string;
  /** 입력창의 기존 상태 변경 함수. 자동 입력도 이 길로만 값을 넣는다. */
  onChange: (value: string) => void;
  /** true 면 이 입력창에서는 동작하지 않는다(수정 화면 등) */
  disabled?: boolean;
};

const NO_PROPS = {};

/**
 * 입력창 하나에 자동 입력을 연결한다.
 *
 *   const demo = useDemoAutoInput({ targetId: "devlog.create.title", value, onChange: setValue });
 *   <input value={value} onChange={...} {...demo.props} />
 *
 * 시연 모드가 꺼져 있으면 props 가 비어 있어 입력창에 아무것도 붙지 않는다.
 * 기존 핸들러와 겹치지 않도록 전부 capture 핸들러로 붙이고, 이벤트를 막지 않는다.
 */
export function useDemoAutoInput({
  targetId,
  value,
  onChange,
  disabled = false,
}: UseDemoAutoInputArgs) {
  const { role, userKey, isActive } = useDemoMode();
  const [isRunning, setIsRunning] = useState(false);
  const runRef = useRef<DemoRun | null>(null);

  // onChange 는 렌더마다 새로 만들어지고 옛 state 를 붙잡고 있을 수 있다. 항상 최신 것을 쓴다.
  const latestRef = useRef({ value, onChange });
  useLayoutEffect(() => {
    latestRef.current = { value, onChange };
  });

  const stop = () => runRef.current?.cancel();

  // 시연 모드 끄기·로그아웃·계정 변경
  useEffect(() => {
    if (!isActive) runRef.current?.cancel();
  }, [isActive]);

  // 페이지 이동·모달 닫힘
  useEffect(() => () => runRef.current?.cancel(), []);

  const props = useMemo(() => {
    if (!isActive || disabled || !role || !userKey) return NO_PROPS;

    const target: DemoTargetConfig = DEMO_INPUT_TARGETS[targetId];
    const text = resolveDemoText(target, role);
    if (!text) return NO_PROPS;

    const handleClick = (event: MouseEvent<InputElement>) => {
      if (event.button !== 0 || event.ctrlKey || event.shiftKey || event.metaKey || event.altKey) return;
      if (isDemoRunActive()) return;

      const element = event.currentTarget;
      if (element.disabled || element.readOnly) return;

      const initial = String(latestRef.current.value ?? "");
      const hasExisting = initial.trim() !== "";
      const existing = target.existing ?? "skip";

      if (hasExisting && existing === "skip") return;
      // 이미 입력한 칸은 다시 입력하지 않는다. rerun 이어도 비어 있을 때만이다.
      if (isDemoTargetDone(targetId) && !(target.rerun && !hasExisting)) return;

      const replaceExisting = hasExisting && existing === "replace";
      const base = hasExisting && existing === "append" ? initial : "";

      let expected = initial;
      let previous = initial;

      const put = (next: string) => {
        previous = expected;
        expected = next;
        latestRef.current.onChange(next);
      };

      runRef.current = startDemoRun({
        targetId,
        ownerKey: userKey,
        text,
        mode: target.mode,
        replaceExisting,
        intervalMs: target.typingIntervalMs ?? DEMO_DEFAULTS.typingIntervalMs,
        charsPerTick: target.charsPerTick ?? DEMO_DEFAULTS.charsPerTick,
        selectDelayMs: DEMO_DEFAULTS.selectDelayMs,
        clearDelayMs: DEMO_DEFAULTS.clearDelayMs,
        sink: {
          // 값이 내가 넣은 것과 다르면 누가 고친 것이다. 멈추고 그 값을 그대로 둔다.
          // 렌더가 늦어 아직 직전 값일 수 있으므로 "내가 넣는 중인 값의 앞부분"까지는 정상으로 본다.
          isValid: () => {
            if (!element.isConnected || element.disabled) return false;
            const current = String(latestRef.current.value ?? "");
            return (
              current === expected ||
              current === previous ||
              (expected.startsWith(current) && current.startsWith(base))
            );
          },
          select: () => element.select(),
          clear: () => put(""),
          write: (chunk) => {
            put(expected === initial && !replaceExisting ? base + chunk : expected + chunk);
            // 값을 넣은 다음 렌더 뒤에 커서와 스크롤을 끝으로 옮긴다.
            requestAnimationFrame(() => {
              if (!element.isConnected) return;
              element.scrollTop = element.scrollHeight;
              const end = element.value.length;
              try {
                element.setSelectionRange(end, end);
              } catch {
                // 커서를 지원하지 않는 input 타입
              }
            });
            return true;
          },
        },
        onFinish: () => {
          runRef.current = null;
          setIsRunning(false);
        },
      });

      if (runRef.current) setIsRunning(true);
    };

    return {
      onClickCapture: handleClick,
      // 사람이 직접 입력하면 바로 멈추고 그 입력을 살린다.
      onKeyDownCapture: stop,
      onPasteCapture: stop,
      onDropCapture: stop,
      onCompositionStartCapture: stop,
      onBlurCapture: () => {
        // 다른 곳을 클릭했다. 창을 잠깐 전환한 경우(포커스가 그대로)는 계속한다.
        if (document.hasFocus()) stop();
      },
    };
  }, [isActive, disabled, role, userKey, targetId]);

  return { props, isRunning };
}
