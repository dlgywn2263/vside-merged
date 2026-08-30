const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE_URL || "ws://localhost:8080";

/**
 * y-websocket은 접속 주소를 `serverUrl + "/" + roomName` 경로 형식으로 만든다.
 * 하지만 백엔드 CollaborationWebSocketHandler는 쿼리스트링 `?room=` 값을
 * 방 키로 사용하므로, 경로 형식으로 붙으면 방을 찾지 못한다.
 *
 * 이 클래스를 `WebSocketPolyfill`로 넘겨 주소를 쿼리 형식으로 바꾼다.
 * /ws/collab을 쓰는 모든 곳(에디터 동시편집, 워크스페이스 전역 동기화)이
 * 같은 형식으로 붙어야 하므로 공용으로 둔다.
 */
export class CollabWebSocket extends WebSocket {
  constructor(url, protocols) {
    const parsedUrl = new URL(url);
    const pathParts = parsedUrl.pathname.split("/ws/collab/");
    const roomName =
      pathParts.length > 1 ? decodeURIComponent(pathParts[1]) : "default-room";

    super(`${WS_BASE}/ws/collab?room=${encodeURIComponent(roomName)}`, protocols);
  }
}
