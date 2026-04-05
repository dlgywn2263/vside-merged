"use client";

import { Client } from "@stomp/stompjs";

const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE_URL || "ws://localhost:8080";

let stompClient = null;

export const ChatSocket = {
  connect: (workspaceId, userId, onMessageReceived) => {
    if (stompClient && stompClient.connected) return;

    stompClient = new Client({
      brokerURL: `${WS_BASE}/ws/chat`,
      reconnectDelay: 5000,
      onConnect: () => {
        console.log("✅ 팀 채팅 소켓 연결 완료!");

        stompClient.subscribe(`/topic/workspace/${workspaceId}`, (message) => {
          if (message.body) onMessageReceived(JSON.parse(message.body));
        });

        stompClient.subscribe(
          `/topic/workspace/${workspaceId}/user/${userId}`,
          (message) => {
            if (message.body) onMessageReceived(JSON.parse(message.body));
          },
        );
      },
      onStompError: (frame) => {
        console.error("❌ Broker reported error: " + frame.headers["message"]);
        console.error("❌ Additional details: " + frame.body);
      },
    });

    stompClient.activate();
  },

  sendMessage: (messageData) => {
    if (stompClient && stompClient.connected) {
      stompClient.publish({
        destination: "/app/chat.sendMessage",
        body: JSON.stringify(messageData),
      });
    } else {
      console.warn("소켓이 아직 연결되지 않았습니다.");
    }
  },

  disconnect: () => {
    if (stompClient) {
      stompClient.deactivate();
      stompClient = null;
      console.log("팀 채팅 소켓 연결 해제");
    }
  },
};
