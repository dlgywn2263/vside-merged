"use client";

// 경로: src/components/design/realtime/checkpoint.ts
//
// 문서를 크게 바꾸기 직전에 되돌아올 자리를 남긴다.
//
// AI 초안과 코드 생성은 한 번에 수십 개 항목을 넣는 동작이라, 마음에 안 들
// 때 손으로 지우는 것이 사실상 불가능하다. 되돌릴 수 있어야 사용자가 마음
// 놓고 써 본다.

import { createDesignCheckpointApi } from "../api/designDocApi";
import type { DesignDocSession } from "./designDocProvider";

export interface CheckpointResult {
  ok: boolean;
  message: string;
}

/**
 * 저장을 먼저 밀어 넣고 체크포인트를 만든다.
 *
 * 순서가 중요하다. 체크포인트는 <b>서버에 저장된 스냅샷에서</b> 뜨는데 저장은
 * 3초 유휴 뒤에 나가므로, 방금 한 편집이 아직 서버에 없을 수 있다. 그대로
 * 기록을 남기면 되돌렸을 때 그 편집이 사라진다.
 */
export async function createSafetyCheckpoint(
  workspaceId: string,
  session: DesignDocSession | null,
  label: string,
): Promise<CheckpointResult> {
  try {
    await session?.writer?.flush();
    await createDesignCheckpointApi(workspaceId, label);

    return { ok: true, message: "" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "되돌리기 기록을 남기지 못했습니다.",
    };
  }
}
