// 경로: src/features/design/model/ids.ts
//
// 설계 문서의 모든 식별자는 여기서만 만든다.
// 접두사를 붙이는 이유는 두 가지다.
//  1. 링크 배열(apiIds, tableIds ...)에 잘못된 종류의 id 가 섞였을 때
//     눈으로 바로 알아볼 수 있다.
//  2. 설계 닥터가 "존재하지 않는 id 참조"를 잡을 때 어느 컬렉션을
//     뒤져야 하는지 id 만 보고 판단할 수 있다.
//
// AI 초안은 여기서 만든 id 를 쓰지 않는다. AI 는 tempKey("req-login")만
// 내고 서버의 정규화 단계가 이 함수들로 실제 id 를 발급한다.

import { v4 as uuidv4 } from "uuid";

export const ID_PREFIX = {
  requirement: "req",
  screen: "scr",
  transition: "trn",
  api: "api",
  table: "tbl",
  column: "col",
  relation: "rel",
} as const;

export type IdKind = keyof typeof ID_PREFIX;

function shortHex(): string {
  return uuidv4().replace(/-/g, "").slice(0, 8);
}

function make(kind: IdKind): string {
  return `${ID_PREFIX[kind]}_${shortHex()}`;
}

export const newRequirementId = () => make("requirement");
export const newScreenId = () => make("screen");
export const newTransitionId = () => make("transition");
export const newApiId = () => make("api");
export const newTableId = () => make("table");
export const newColumnId = () => make("column");
export const newRelationId = () => make("relation");

/** id 가 기대한 종류인지 확인한다. 링크를 붙이기 전 방어용. */
export function isIdOf(kind: IdKind, id: string): boolean {
  return typeof id === "string" && id.startsWith(`${ID_PREFIX[kind]}_`);
}

/**
 * 요구사항 표시 번호(R-01)를 만든다.
 * 표시용일 뿐이라 중복이나 빈틈이 생겨도 무방하며, 참조에는 쓰지 않는다.
 */
export function nextRequirementCode(existingCodes: string[]): string {
  let max = 0;

  for (const code of existingCodes) {
    const matched = /^R-(\d+)$/.exec(code ?? "");
    if (!matched) continue;

    const value = Number(matched[1]);
    if (Number.isFinite(value) && value > max) max = value;
  }

  return `R-${String(max + 1).padStart(2, "0")}`;
}
