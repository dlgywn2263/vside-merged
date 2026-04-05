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

  stop: () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "STOP" }));
    }
  },

  disconnect: () => {
    if (socket) {
      socket.onclose = null;
      socket.close();
      socket = null;
    }
  },
};
