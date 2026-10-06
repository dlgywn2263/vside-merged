"use client";

// 경로: src/lib/ide/activeEditorContent.ts
//
// 지금 에디터가 들고 있는 내용을 에디터 밖에서 읽는 통로.
//
// 실행·디버그는 파일을 먼저 저장한 뒤에 돌린다. 그런데 그 저장이 Redux
// 스냅샷을 쓰고 있었고, 그 스냅샷은 타이핑이 멈추고 0.4초 뒤에야 갱신된다.
// 그래서 고치자마자 실행하면 마지막 몇 글자가 빠진 코드가 저장되고, 화면과
// 다른 결과가 나왔다.
//
// Monaco 인스턴스는 CodeEditor 안에만 있으므로, 그 값을 읽는 함수를 여기에
// 등록해 두고 MenuBar 가 꺼내 쓴다. Redux 를 또 하나 만드는 것이 아니라
// "지금 화면의 값"을 그때그때 물어보는 것뿐이다.

interface ActiveEditorSnapshot {
  filePath: string | null;
  content: string;
}

type Reader = () => ActiveEditorSnapshot | null;

let read: Reader | null = null;

/** CodeEditor 가 마운트될 때 등록한다. */
export function registerActiveEditorReader(reader: Reader): void {
  read = reader;
}

/** 등록한 것과 같은 함수일 때만 지운다. 늦게 언마운트된 옛 에디터가 새 것을 지우면 안 된다. */
export function unregisterActiveEditorReader(reader: Reader): void {
  if (read === reader) read = null;
}

/**
 * 그 파일을 지금 에디터가 보고 있으면 화면의 내용을, 아니면 null 을 준다.
 *
 * null 이면 부르는 쪽이 평소대로 Redux 스냅샷을 쓰면 된다. 다른 파일을 보고
 * 있는데 그 내용을 돌려주면 엉뚱한 파일을 덮어쓰게 되므로 반드시 확인한다.
 */
export function readActiveEditorContent(filePath: string): string | null {
  if (!read || !filePath) return null;

  const snapshot = read();

  if (!snapshot || snapshot.filePath !== filePath) return null;

  return snapshot.content;
}

type Flusher = () => Promise<void>;

let flush: Flusher | null = null;

/** CodeEditor 가 마운트될 때 등록한다. 지금 붙어 있는 동시편집 세션의 저장을 밀어내는 함수다. */
export function registerActiveEditorFlusher(flusher: Flusher): void {
  flush = flusher;
}

export function unregisterActiveEditorFlusher(flusher: Flusher): void {
  if (flush === flusher) flush = null;
}

/**
 * 지금 에디터가 붙어 있는 동시편집 세션의 저장을 끝까지 기다린다.
 *
 * 탭을 닫으면 세션이 "아직 저장 안 한 것"을 마지막으로 한 번 저장하는데, 그 저장은
 * 기다려 주지 않고 나간다. 샌드박스를 반영하거나 버리기 직전에 탭을 닫으면, 그 늦은
 * 저장이 방금 반영한(버린) 파일을 샌드박스에 다시 만들어 버린다. 그래서 먼저 이것으로
 * 저장을 끝낸 뒤에 탭을 닫는다. 그러면 닫을 때는 저장할 것이 남아 있지 않다.
 *
 * 세션이 없으면(개인 모드, 열린 파일 없음) 아무것도 하지 않는다.
 */
export async function flushActiveEditorSession(): Promise<void> {
  if (flush) await flush();
}
