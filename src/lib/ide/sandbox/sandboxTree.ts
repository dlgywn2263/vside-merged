// 경로: src/lib/ide/sandbox/sandboxTree.ts
//
// 팀 파일 트리 위에 내 샌드박스를 덧씌운다.
//
// 탐색기는 팀 폴더의 트리를 서버에서 받아 그린다. 샌드박스에서 새로 만든 파일은 팀
// 폴더에 없고, 지운 파일은 팀 폴더에 아직 있다. 그대로 두면 새 파일을 열 길이 없고
// 지운 파일이 계속 보인다. 그래서 받은 트리에 내 샌드박스의 차이만 얹는다.

import type { SandboxFileKind, SandboxPendingFile } from "./sandboxApi";

export interface FileTreeNode {
  id: string;
  name: string;
  type: string;
  children?: FileTreeNode[] | null;
  /** 샌드박스에서 고쳤거나 새로 만든 파일이면 그 종류. 탐색기가 표시를 붙인다. */
  sandboxKind?: SandboxFileKind;
  [key: string]: unknown;
}

/**
 * @param children 프로젝트 폴더 바로 아래의 노드들(서버가 준 것)
 * @param files    내 샌드박스의 반영 안 된 파일
 * @returns 새 배열. 받은 것은 고치지 않는다
 */
export function overlaySandboxTree(children: FileTreeNode[], files: SandboxPendingFile[]): FileTreeNode[] {
  if (files.length === 0) return children;

  const kinds = new Map(files.map((file) => [file.filePath, file.kind]));
  const result = mark(children, kinds);

  for (const file of files) {
    if (file.kind === "NEW") insert(result, file.filePath);
  }

  return result;
}

/** 지운 파일을 빼고, 고친 파일에 표시를 붙인다. */
function mark(nodes: FileTreeNode[], kinds: Map<string, SandboxFileKind>): FileTreeNode[] {
  const result: FileTreeNode[] = [];

  for (const node of nodes) {
    const kind = kinds.get(node.id);

    if (kind === "DELETED") continue;

    result.push({
      ...node,
      ...(kind ? { sandboxKind: kind } : {}),
      ...(Array.isArray(node.children) ? { children: mark(node.children, kinds) } : {}),
    });
  }

  return result;
}

/** 팀 폴더에 없는 새 파일을 제자리에 넣는다. 중간 폴더가 없으면 만든다. */
function insert(nodes: FileTreeNode[], filePath: string): void {
  const parts = filePath.split("/").filter(Boolean);
  let level = nodes;
  let prefix = "";

  for (let index = 0; index < parts.length; index += 1) {
    const name = parts[index];
    const id = prefix ? `${prefix}/${name}` : name;
    const isLast = index === parts.length - 1;
    const existing = level.find((node) => node.id === id);

    if (isLast) {
      if (existing) {
        existing.sandboxKind = "NEW";
      } else {
        level.push({ id, name, type: "file", sandboxKind: "NEW" });
      }
      return;
    }

    if (existing) {
      if (!Array.isArray(existing.children)) existing.children = [];
      level = existing.children;
    } else {
      const folder: FileTreeNode = { id, name, type: "folder", children: [] };
      level.push(folder);
      level = folder.children as FileTreeNode[];
    }

    prefix = id;
  }
}
