// 경로: src/lib/ide/collab/roomName.ts
//
// 코드 동시편집 방의 이름. 백엔드 security/CollabRoomName 과 글자까지 같아야 한다.
//
//   팀 공유 방      {workspaceId}:{project}:{branch}:{file}
//   개인 샌드박스 방  sbx:{userId}:{workspaceId}:{project}:{branch}:{file}
//
// 방 이름이 한 글자라도 다르면 에러 없이 서로 다른 방에 들어가 상대 글자가 안 보인다.
// 에디터(CodeEditor)와 샌드박스 반영(sandboxApply)이 같은 방을 가리켜야 하므로 한곳에 둔다.

/** 경로 구분자와 앞뒤 슬래시를 맞춘다. 두 번째 인자는 값이 비었을 때 쓸 값이지 접두사가 아니다. */
export const normalizeCollabKeyPart = (value: unknown, fallback = ""): string => {
  return String(value ?? fallback)
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/+/, "")
    .trim();
};

export interface CollabFileLocation {
  workspaceId: string;
  projectName: string;
  branchName: string | null | undefined;
  filePath: string;
}

/** 팀이 함께 여는 방. */
export function teamRoomName({ workspaceId, projectName, branchName, filePath }: CollabFileLocation): string {
  return [
    normalizeCollabKeyPart(workspaceId, "workspace"),
    normalizeCollabKeyPart(projectName, "project"),
    normalizeCollabKeyPart(branchName, "master"),
    normalizeCollabKeyPart(filePath),
  ].join(":");
}

/**
 * 내 샌드박스 파일을 여는 개인 방. 주인만 들어갈 수 있다 — 서버가 방 이름의 회원번호와
 * 토큰의 회원번호를 비교한다.
 */
export function sandboxRoomName(userId: number | string, location: CollabFileLocation): string {
  return `sbx:${userId}:${teamRoomName(location)}`;
}
