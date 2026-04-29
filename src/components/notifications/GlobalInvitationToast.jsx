"use client";

import React, { useEffect, useState } from "react";
import { VscBellDot, VscCheck, VscClose } from "react-icons/vsc";
import {
  fetchPendingInvitationsApi,
  acceptWorkspaceInvitationApi,
  rejectWorkspaceInvitationApi,
} from "@/lib/ide/api";

export function GlobalInvitationToast() {
  const [invitations, setInvitations] = useState([]);

  // 💡 백엔드에서 대기 중인 초대 목록을 가져오는 함수
  const loadInvitations = async () => {
    // 로그인이 안 되어있으면 요청을 보내지 않도록 방어 (api.js의 getCurrentUserId 활용)
    const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    if (!userId) return;

    try {
      // api.js에 정의된 함수 호출 (파라미터를 안 넣으면 알아서 userId를 가져감!)
      const data = await fetchPendingInvitationsApi();
      if (Array.isArray(data)) {
        setInvitations(data);
      }
    } catch (error) {
      console.error("초대 목록 조회 실패:", error);
    }
  };

  // 💡 처음 켜졌을 때 1번, 그리고 10초마다 계속 확인합니다. (Polling 방식)
  useEffect(() => {
    loadInvitations();
    const intervalId = setInterval(loadInvitations, 10000);
    return () => clearInterval(intervalId);
  }, []);

  // 💡 수락 버튼 클릭 시
  const handleAccept = async (workspaceId, workspaceName) => {
    try {
      await acceptWorkspaceInvitationApi(workspaceId);
      
      // 화면에서 알림창 즉시 제거
      setInvitations((prev) => prev.filter((inv) => inv.workspaceId !== workspaceId));
      alert(`✅ '${workspaceName}' 워크스페이스 초대를 수락했습니다!`);
      
      // (선택) 수락 후 대시보드의 목록을 새로고침 하도록 이벤트를 쏴줍니다.
      window.dispatchEvent(new Event("refreshWorkspaces"));
    } catch (error) {
      alert("초대 수락 실패: " + error.message);
    }
  };

  // 💡 거절 버튼 클릭 시
  const handleReject = async (workspaceId) => {
    try {
      await rejectWorkspaceInvitationApi(workspaceId);
      setInvitations((prev) => prev.filter((inv) => inv.workspaceId !== workspaceId));
    } catch (error) {
      alert("초대 거절 실패: " + error.message);
    }
  };

  if (invitations.length === 0) return null;

  return (
    // 💡 화면 우측 하단에 무조건 고정되도록 fixed, z-[9999] 설정!
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {invitations.map((inv) => (
        <div
          key={inv.workspaceId || inv.id}
          className="pointer-events-auto w-80 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 animate-fade-in-up transition-all"
        >
          <div className="flex items-start gap-3">
            <div className="bg-indigo-100 text-indigo-600 p-2 rounded-full shrink-0">
              <VscBellDot size={20} className="animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-extrabold text-gray-900 truncate">
                팀 초대 도착! 💌
              </h4>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed break-keep">
                <span className="font-bold text-gray-800">
                  {inv.workspaceName || "새로운 팀"}
                </span>{" "}
                워크스페이스에서 회원님을 팀원으로 초대했습니다.
              </p>

              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleAccept(inv.workspaceId, inv.workspaceName)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-bold py-2 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5"
                >
                  <VscCheck size={14} strokeWidth={1} /> 수락
                </button>
                <button
                  onClick={() => handleReject(inv.workspaceId)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[12px] font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-gray-200"
                >
                  <VscClose size={14} /> 거절
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}