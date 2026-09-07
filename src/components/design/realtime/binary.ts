// 경로: src/components/design/realtime/binary.ts
//
// Yjs 문서 상태를 서버에 실어 보내기 위한 base64 변환.
//
// 서버는 이 바이너리를 해석하지 않고 그대로 보관했다가 돌려준다. 같은
// 업데이트를 여러 번 적용해도 결과가 같기 때문에, 접속하는 모든
// 클라이언트가 이걸 그대로 적용해도 항목이 중복되지 않는다.

import * as Y from "yjs";

/** 큰 문서에서 String.fromCharCode 인자 개수 한계를 넘지 않도록 나눠 처리한다. */
const CHUNK_SIZE = 0x8000;

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
    const chunk = bytes.subarray(offset, offset + CHUNK_SIZE);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

export function encodeDocState(doc: Y.Doc): string {
  return bytesToBase64(Y.encodeStateAsUpdate(doc));
}

export function applyEncodedState(doc: Y.Doc, encoded: string | null | undefined): void {
  if (!encoded) return;
  Y.applyUpdate(doc, base64ToBytes(encoded));
}
