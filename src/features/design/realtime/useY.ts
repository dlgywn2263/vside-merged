"use client";

// 경로: src/features/design/realtime/useY.ts
//
// Y.Doc 안의 값을 React 로 읽어 오는 얇은 다리.
//
// 문서 데이터를 zustand 나 Redux 로 복제하지 않는다. 복제본을 두는 순간
// 양방향 동기화 버그가 시작되고, 어느 쪽이 진짜인지 알 수 없게 된다.
// 여기서는 Y 타입을 그대로 구독하고 읽기 전용 스냅샷만 만들어 준다.

import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import * as Y from "yjs";

type YArrayAny = Y.Array<Y.Map<unknown>>;

/**
 * Y.Array 를 평문 배열로 읽는다.
 *
 * observeDeep 을 쓰는 이유: 항목의 이름이나 링크를 고치는 것은 배열이 아니라
 * 항목 안쪽 Y.Map 의 변경이라, 얕은 관찰로는 화면이 갱신되지 않는다.
 *
 * 스냅샷은 버전이 오를 때만 새로 만든다. useSyncExternalStore 는 매번
 * 같은 참조를 요구하는데, toJSON 을 그대로 돌려주면 호출마다 새 객체가 나와
 * 무한 렌더링에 빠진다.
 */
export function useYArray<T>(
  array: YArrayAny | null,
  map: (item: Y.Map<unknown>) => T,
): T[] {
  const cache = useRef<{ version: number; value: T[] }>({ version: -1, value: [] });
  const version = useRef(0);

  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!array) return () => {};

      const handler = () => {
        version.current += 1;
        onChange();
      };

      array.observeDeep(handler);
      return () => array.unobserveDeep(handler);
    },
    [array],
  );

  const getSnapshot = useCallback(() => {
    if (!array) return 0;
    return version.current;
  }, [array]);

  const currentVersion = useSyncExternalStore(subscribe, getSnapshot, () => 0);

  return useMemo(() => {
    if (!array) return [];

    if (cache.current.version !== currentVersion) {
      cache.current = {
        version: currentVersion,
        value: (array.toArray() as Y.Map<unknown>[]).map(map),
      };
    }

    return cache.current.value;
    // map 은 렌더마다 새 함수일 수 있어 의존성에서 뺀다. 값이 바뀌는 기준은
    // 문서 버전이지 변환 함수가 아니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [array, currentVersion]);
}

/** Y.Map 하나를 평문으로 읽는다. 상세 패널처럼 한 항목만 볼 때 쓴다. */
export function useYMap<T>(map: Y.Map<unknown> | null, read: (item: Y.Map<unknown>) => T): T | null {
  const version = useRef(0);
  const cache = useRef<{ version: number; value: T | null }>({ version: -1, value: null });

  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!map) return () => {};

      const handler = () => {
        version.current += 1;
        onChange();
      };

      map.observeDeep(handler);
      return () => map.unobserveDeep(handler);
    },
    [map],
  );

  const currentVersion = useSyncExternalStore(
    subscribe,
    useCallback(() => (map ? version.current : 0), [map]),
    () => 0,
  );

  return useMemo(() => {
    if (!map) return null;

    if (cache.current.version !== currentVersion) {
      cache.current = { version: currentVersion, value: read(map) };
    }

    return cache.current.value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, currentVersion]);
}
