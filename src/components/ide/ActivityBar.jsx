"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  VscFiles,
  VscBook,
  VscBeaker,
  VscSourceControl,
  VscAccount,
  VscSettingsGear,
  VscSignOut,
} from "react-icons/vsc";
import { setActiveActivity, toggleSidebar } from "@/store/slices/uiSlice";
import { getMyWorkspacesByTokenApi } from "@/lib/ide/api";

export default function ActivityBar() {
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();
  const { activeActivity, isSidebarVisible } = useSelector((state) => state.ui);
  const [workspaceName, setWorkspaceName] = useState("");

  const workspaceInfo = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    const ideIndex = segments.indexOf("ide");
    if (ideIndex >= 0 && ["personal", "team"].includes(segments[ideIndex + 1])) {
      return {
        mode: segments[ideIndex + 1],
        workspaceId: segments[ideIndex + 2] || null,
      };
    }
    const aivsIndex = segments.indexOf("aivs");
    if (aivsIndex >= 0 && segments[aivsIndex + 1]) {
      return {
        mode: searchParams.get("mode") === "team" ? "team" : "personal",
        workspaceId: segments[aivsIndex + 1],
      };
    }
    return { mode: null, workspaceId: null };
  }, [pathname, searchParams]);

  useEffect(() => {
    let cancelled = false;
    const loadWorkspaceName = async () => {
      if (!workspaceInfo.workspaceId) {
        setWorkspaceName("");
        return;
      }
      try {
        const response = await getMyWorkspacesByTokenApi();
        if (cancelled) return;
        const workspaces = Array.isArray(response)
          ? response
          : Array.isArray(response?.workspaces)
            ? response.workspaces
            : Array.isArray(response?.data)
              ? response.data
              : [];
        const currentWorkspace = workspaces.find((workspace) => {
          const id = workspace?.uuid ?? workspace?.id ?? workspace?.workspaceId;
          return String(id) === String(workspaceInfo.workspaceId);
        });
        const name = currentWorkspace?.name ?? currentWorkspace?.workspaceName ?? currentWorkspace?.title ?? "";
        setWorkspaceName(String(name).trim());
      } catch (error) {
        console.error("워크스페이스 이름 조회 실패:", error);
        if (!cancelled) setWorkspaceName("");
      }
    };
    void loadWorkspaceName();
    return () => { cancelled = true; };
  }, [workspaceInfo.workspaceId]);

  // 커밋 알림으로 AIVS에 들어오면 Git 소스 제어 탭을 자동으로 선택한다.
  // 일반 AIVS 진입은 기존에 선택되어 있던 패널을 유지한다.
  const requestedPanel = searchParams.get("panel");
  useEffect(() => {
    if (requestedPanel === "git") {
      dispatch(setActiveActivity("git"));
    }
  }, [dispatch, requestedPanel]);

  const topItems = [
    { id: "editor", icon: <VscFiles size={24} />, label: "에디터" },
    { id: "api-test", icon: <VscBeaker size={24} />, label: "API 테스트" },
    { id: "git", icon: <VscSourceControl size={24} />, label: "Git 연동" },
    { id: "docs", icon: <VscBook size={24} />, label: "문서" },
  ];

  const getWorkspaceMainPath = () => {
    const { mode, workspaceId } = workspaceInfo;
    if (!workspaceId) return "/projects";
    const base = `/dashboard/${encodeURIComponent(workspaceId)}`;
    return mode === "personal" || mode === "team" ? `${base}?mode=${mode}` : base;
  };

  const handleExit = () => {
    const displayName = workspaceName || "현재 프로젝트";
    const confirmed = window.confirm(
      `"${displayName}" 프로젝트 작업 화면에서 나가시겠습니까?\n\n프로젝트 대시보드 화면으로 이동합니다.`,
    );
    if (!confirmed) return;
    router.push(getWorkspaceMainPath());
  };

  const handleActivityClick = (id) => {
    // 이미 에디터 화면이면 탐색기를 접었다 편다(VS Code 와 같은 조작). 탐색기를 접은 뒤
    // 다시 여는 길이 화면 가장자리 버튼뿐이면 가려졌을 때 열 방법이 없다.
    if (id === "editor" && activeActivity === "editor") {
      dispatch(toggleSidebar());
      return;
    }
    dispatch(setActiveActivity(id));
  };

  return (
    <div className="z-30 flex h-full w-12 shrink-0 flex-col justify-between border-r border-gray-200 bg-[#f8f8f8]">
      <div className="flex flex-col gap-2 pt-2">
        {topItems.map((item) => {
          const active = activeActivity === item.id;
          const label =
            item.id === "editor" && activeActivity === "editor"
              ? isSidebarVisible ? "탐색기 접기" : "탐색기 열기"
              : item.label;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleActivityClick(item.id)}
              className={`group relative flex h-12 w-12 cursor-pointer items-center justify-center transition-all ${active ? "text-[#5873F9]" : "text-gray-400 hover:text-gray-600"}`}
              aria-label={label}
              title={label}
            >
              {active && <span className="absolute bottom-0 left-0 top-0 w-[3px] rounded-r-full bg-[#5873F9]" />}
              {item.icon}
              <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                {label}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-2 pb-2">
        <button
          type="button"
          onClick={() => handleActivityClick("mypage")}
          className={`group relative flex h-12 w-12 cursor-pointer items-center justify-center transition-all ${activeActivity === "mypage" ? "text-[#5873F9]" : "text-gray-400 hover:text-gray-600"}`}
          aria-label="마이페이지"
          title="마이페이지"
        >
          {activeActivity === "mypage" && <span className="absolute bottom-0 left-0 top-0 w-[3px] rounded-r-full bg-[#5873F9]" />}
          <VscAccount size={24} />
          <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">마이페이지</span>
        </button>
        <button
          type="button"
          className="group relative flex h-12 w-12 cursor-pointer items-center justify-center text-gray-400 transition-colors hover:text-gray-600"
          aria-label="설정"
          title="설정"
        >
          <VscSettingsGear size={24} />
          <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">설정</span>
        </button>
        <button
          type="button"
          onClick={handleExit}
          className="group relative flex h-12 w-12 cursor-pointer items-center justify-center text-gray-400 transition-colors hover:text-red-500"
          aria-label="프로젝트 나가기"
          title="프로젝트 나가기"
        >
          <VscSignOut size={24} />
          <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">프로젝트 나가기</span>
        </button>
      </div>
    </div>
  );
}
