"use client";

let socket = null;

export const DebugSocket = {
  connect: (url, onOpen, onMessage, onClose) => {
    if (socket) {
      socket.close();
    }

    console.log(`[DebugSocket] 웹소켓 연결 시도 중... (${url})`);
    const ws = new WebSocket(url);
    socket = ws;

    ws.onopen = () => {
      console.log("✅ [DebugSocket] 서버와 웹소켓 연결 성공!");
      if (onOpen) onOpen(ws);
    };

    ws.onmessage = (e) => {
      if (onMessage) onMessage(e.data);
    };

    ws.onclose = (e) => {
      console.warn("⚠️ [DebugSocket] 서버와 연결이 끊어졌습니다.");
      if (socket === ws) {
        socket = null;
      }
      if (onClose) onClose(e);
    };

    ws.onerror = (err) => {
      console.error("❌ [DebugSocket] 웹소켓 에러 발생:", err);
      if (socket === ws) {
        socket = null;
      }
    };
  },

  startDebug: (workspaceId, projectName, branchName, filePath, breakpoints) => {
    console.log("🚀 [DebugSocket] 디버깅 시작 요청", {
      workspaceId,
      projectName,
      branchName,
      filePath,
    });

    if (socket && socket.readyState === WebSocket.OPEN) {
      const payload = {
        type: "START",
        workspaceId,
        projectName,
        branchName: branchName || "main-repo",
        filePath: filePath || "",
        breakpoints: breakpoints || [],
      };
      socket.send(JSON.stringify(payload));
      console.log("✅ [DebugSocket] 서버로 데이터 전송 완료");
    } else {
      const state = socket ? socket.readyState : "null";
      console.error(
        `❌ [DebugSocket] 실패: 소켓이 연결되지 않았습니다! (현재 상태: ${state})`,
      );
      console.warn(
        "💡 서버와의 실시간 통신(웹소켓)이 아직 준비되지 않았습니다. 잠시 후 디버깅 시작 버튼을 다시 눌러주세요.",
      );
    }
  },

  stepOver: () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "STEP_OVER" }));
    }
  },

  stepInto: () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "STEP_INTO" }));
    }
  },

  continueDebug: () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "CONTINUE" }));
    }
  },

  stopDebug: () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "STOP" }));
    }
  },

  sendInput: (input) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "INPUT", input }));
    }
  },

  send: (msg) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(msg));
    }
  },

  disconnect: () => {
    if (socket) {
      const wsToClose = socket;
      socket = null;
      if (wsToClose.readyState === WebSocket.OPEN) {
        wsToClose.send(JSON.stringify({ type: "STOP" }));
      }
      wsToClose.close();
    }
  },
};
