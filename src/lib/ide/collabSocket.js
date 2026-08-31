import { getAccessToken } from "@/lib/auth/tokenStore";

const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE_URL || "ws://localhost:8080";

/**
 * y-websocket은 접속 주소를 `serverUrl + "/" + roomName` 경로 형식으로 만든다.
 * 하지만 백엔드 CollaborationWebSocketHandler는 쿼리스트링 `?room=` 값을
 * 방 키로 사용하므로, 경로 형식으로 붙으면 방을 찾지 못한다.
 *
 * 이 클래스를 `WebSocketPolyfill`로 넘겨 주소를 쿼리 형식으로 바꾼다.
 * /ws/collab을 쓰는 모든 곳(에디터 동시편집, 설계 문서, 워크스페이스 전역
 * 동기화)이 같은 형식으로 붙어야 하므로 공용으로 둔다.
 *
 * 인증 토큰도 여기서 붙인다. 서버가 핸드셰이크 때 JWT와 워크스페이스 멤버십을
 * 확인하기 때문이다.
 *
 * 토큰을 생성자 안에서 매번 읽는 것이 중요하다. 액세스 토큰 수명은 15분인데
 * y-websocket은 연결이 끊기면 같은 주소로 자동 재접속한다. 토큰을 한 번
 * 박아 두면 15분 뒤 네트워크가 한 번만 끊겨도 그때부터 재접속이 영원히
 * 실패한다. 재접속마다 새 인스턴스가 만들어지므로, 여기서 읽으면 항상
 * 최신 토큰이 붙는다.
 */
export class CollabWebSocket extends WebSocket {
  constructor(url, protocols) {
    const parsedUrl = new URL(url);
    const pathParts = parsedUrl.pathname.split("/ws/collab/");
    const roomName =
      pathParts.length > 1 ? decodeURIComponent(pathParts[1]) : "default-room";

    const token = getAccessToken();
    const query = [`room=${encodeURIComponent(roomName)}`];

    if (token) {
      query.push(`token=${encodeURIComponent(token)}`);
    }

    super(`${WS_BASE}/ws/collab?${query.join("&")}`, protocols);
  }
}
