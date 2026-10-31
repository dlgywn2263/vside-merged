"use client";

let socket = null;

export const RunSocket = {
  connectAndRun: (url, payload, onMessage, onError, onClose) => {
    if (socket) {
      socket.onclose = null;
      socket.close();
    }

    const ws = new WebSocket(url);
    socket = ws;

    ws.onopen = () => {
      console.log("[RunSocket] Connected");
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
      }
    };

    ws.onmessage = (e) => {
      if (onMessage) onMessage(e.data);
    };

    ws.onerror = (e) => {
      if (onError) onError(e);
    };

    ws.onclose = () => {
      if (socket === ws) {
        socket = null;
        if (onClose) onClose();
      }
    };
  },

  sendInput: (input) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "INPUT", input }));
    }
  },

  // 앱 화면(Swing)에 한글을 대신 쳐 달라고 한다. 서버가 실행 컨테이너에서 xdotool 로 친다.
  sendGuiText: (text) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "GUI_TYPE", text }));
    }
  },

  stop: () => {
    if (!socket) return;

    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "STOP" }));
      return;
    }

    // 아직 연결 중일 때 누른 중지는 보낼 수가 없어 버려졌다. 그러면 연결이 열리자마자 RUN 이 나가
    // 화면은 멈췄는데 서버에선 앱이 계속 돌았다. 연결을 끊으면 서버가 그 실행을 정리한다.
    socket.close();
  },

  disconnect: () => {
    if (socket) {
      socket.onclose = null;
      socket.close();
      socket = null;
    }
  },
};
