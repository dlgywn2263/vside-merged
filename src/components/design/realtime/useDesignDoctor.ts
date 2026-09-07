"use client";

// 경로: src/components/design/realtime/useDesignDoctor.ts
//
// 편집하는 동안 설계 점검 결과를 갱신한다.
//
// 서버는 문서를 통째로 받아 검사하므로 요청 본문이 수백 KB까지 커질 수 있다.
// 팀원 다섯 명이 동시에 타이핑하면 초당 여러 번이 되므로 두 가지로 막는다.
//  1. 타이핑이 멈추고 800ms 뒤에만 보낸다.
//  2. 문서 내용이 실제로 달라졌을 때만 보낸다. 커서 이동이나 남의 접속처럼
//     내용과 무관한 변화로는 요청하지 않는다.

import { useEffect, useRef, useState } from "react";

import {
  EMPTY_REPORT,
  inspectDesignApi,
  type DoctorReport,
} from "../api/designDoctorApi";
import type { DesignModel } from "../model/schema";

const DEBOUNCE_MS = 800;

export function useDesignDoctor(
  workspaceId: string | null | undefined,
  model: DesignModel,
  enabled: boolean,
): DoctorReport {
  const [report, setReport] = useState<DoctorReport>(EMPTY_REPORT);
  const lastSentRef = useRef<string>("");

  useEffect(() => {
    if (!workspaceId || !enabled) {
      setReport(EMPTY_REPORT);
      return;
    }

    const signature = JSON.stringify(model);
    if (signature === lastSentRef.current) return;

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const next = await inspectDesignApi(workspaceId, model);
        if (cancelled) return;

        lastSentRef.current = signature;
        setReport(next);
      } catch (error) {
        // 점검이 실패해도 편집을 막지 않는다. 다음 변경에서 다시 시도한다.
        if (!cancelled) console.error("[설계] 점검 실패", error);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [workspaceId, model, enabled]);

  return report;
}
