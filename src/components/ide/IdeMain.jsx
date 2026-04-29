"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "next/navigation";

import MenuBar from "@/components/ide/MenuBar";
import ActivityBar from "@/components/ide/ActivityBar";
import Sidebar from "@/components/ide/Sidebar";
import CodeEditor from "@/components/ide/CodeEditor";
import BottomPanel from "@/components/ide/BottomPanel";
import FileTabs from "@/components/ide/FileTabs";
import DebugPanel from "@/components/ide/DebugPanel";
import AgentPanel from "@/components/ide/AgentPanel";
import ApiTesterPage from "@/components/api-test/ApiTesterPage";
import CommandPalette from "@/components/ide/CommandPalette";
import GitDashboard from "@/components/ide/GitDashboard";
import CodeMap from "@/components/ide/CodeMap";
// import MyPageShell from "@/components/MyPageShell";

// 💡 [추가] 우리가 방금 만든 개발일지 패널 임포트!
import DevlogPanel from "@/components/ide/DevlogPanel";

// 💡 [추가] 전체 화면을 덮을 페이지형 모달 및 웹 미리보기 창 임포트
import CreateProjectModal from "@/components/ide/CreateProjectModal";
import WebPreview from "@/components/ide/WebPreview";

import { fetchWorkspaceProjectsApi, fetchVirtualViewsApi } from "@/lib/ide/api";

import {
  setWorkspaceTree,
  setWorkspaceId,
  setProjectList,
  setVirtualTree,
  clearVirtualTree,
  setActiveProject,
  setActiveBranch,
  closeAllFiles,
} from "@/store/slices/fileSystemSlice";
import MyPageShell from "../mypage/MyPageShell";

// const ApiTestPanel = () => (
//   <div className="flex-1 flex items-center justify-center text-gray-500 bg-white font-bold">
//     API Test Panel
//   </div>
// );

// const MyPagePanel = () => (
//   <div className="flex-1 flex items-center justify-center text-gray-500 bg-white font-bold">
//     My Page Panel
//   </div>
// );

export default function IdeMain() {
  const params = useParams();
  const id = params?.id;

  const dispatch = useDispatch();

  const {
    activeActivity,
    isTerminalVisible,
    isSidebarVisible,
    isAgentVisible,
    isDebugMode,
  } = useSelector((state) => state.ui);

  const { workspaceId, activeProject, activeBranch } = useSelector(
    (state) => state.fileSystem,
  );

  useEffect(() => {
    if (!id) return;

    dispatch(closeAllFiles());
    dispatch(setWorkspaceId(id));

    fetchWorkspaceProjectsApi(id)
      .then((root) => {
        dispatch(setWorkspaceTree(root));

        if (root && root.children && root.children.length > 0) {
          dispatch(setProjectList(root.children));

          const savedProject = localStorage.getItem(`lastProject_${id}`);
          const savedBranch = localStorage.getItem(`lastBranch_${id}`);

          const isValidProject = root.children.some(
            (p) => p.name === savedProject,
          );

          const targetProject = isValidProject
            ? savedProject
            : root.children[0].name;
          const targetBranch = savedBranch || "master";

          dispatch(setActiveProject(targetProject));
          dispatch(setActiveBranch(targetBranch));
        }
      })
      .catch((error) => {
        console.error("fetchWorkspaceProjectsApi error:", error);
      });
  }, [id, dispatch]);

  useEffect(() => {
    if (workspaceId && activeProject) {
      localStorage.setItem(`lastProject_${workspaceId}`, activeProject);
    }
    if (workspaceId && activeBranch) {
      localStorage.setItem(`lastBranch_${workspaceId}`, activeBranch);
    }
  }, [workspaceId, activeProject, activeBranch]);

  useEffect(() => {
    if (!workspaceId || !activeBranch) return;

    const syncBranchVirtualView = async () => {
      try {
        const views = await fetchVirtualViewsApi(workspaceId, activeBranch);
        const activeView = views.find(
          (v) => v.isActive === true || v.active === true,
        );

        if (activeView) {
          let parsedData = [];

          if (typeof activeView.treeDataJson === "string") {
            parsedData = JSON.parse(activeView.treeDataJson);
          } else {
            parsedData = activeView.treeDataJson || activeView.treeData || [];
          }

          dispatch(
            setVirtualTree({
              name: activeView.viewName || activeView.name || "가상 뷰",
              children: parsedData,
              branchName: activeBranch,
            }),
          );
        } else {
          dispatch(clearVirtualTree());
        }
      } catch (error) {
        console.error("fetchVirtualViewsApi error:", error);
        dispatch(clearVirtualTree());
      }
    };

    syncBranchVirtualView();
  }, [workspaceId, activeBranch, dispatch]);

  const renderMainContent = () => {
    switch (activeActivity) {
      case "docs":
        // 💡 [변경] 기존의 단순 글자(DocsPanel)를 지우고, 우리가 만든 DevlogPanel 렌더링!
        return <DevlogPanel />;
      case "api-test":
        return <ApiTesterPage />;
      case "mypage":
        return (
          <div className="flex-1 min-w-0 h-full overflow-y-auto bg-white">
            <MyPageShell />
          </div>
        );
      case "git":
        return <GitDashboard />;
      case "editor":
      default:
        return (
          <div className="flex-1 flex overflow-hidden">
            {isSidebarVisible && (
              <div className="w-[260px] shrink-0 border-r border-gray-200 flex flex-col bg-[#f8f9fa]">
                <Sidebar />
              </div>
            )}

            <div className="flex-1 flex flex-col min-w-0 bg-white">
              <FileTabs />
              <div className="flex-1 flex relative overflow-hidden">
                <div className="flex-1 flex flex-col min-w-0 relative">
                  <CodeEditor />
                  <CodeMap />
                </div>
              </div>

              {isTerminalVisible && (
                <div className="h-[250px] border-t border-gray-200 bg-white shrink-0 z-[600]">
                  <BottomPanel />
                </div>
              )}
            </div>

            {(isAgentVisible || isDebugMode) && (
              <div className="w-[320px] shrink-0 border-l border-gray-200 flex flex-col bg-[#f8f9fa] z-[600]">
                {isDebugMode ? <DebugPanel /> : <AgentPanel />}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-white text-[#333] overflow-hidden font-sans relative">
      <CommandPalette />
      <MenuBar mode="personal" />
      <div className="flex-1 flex overflow-hidden">
        <ActivityBar />
        {renderMainContent()}
      </div>

      <CreateProjectModal />
      <WebPreview />
    </div>
  );
}
