"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useDispatch, useSelector, useStore } from "react-redux";
import {
  VscCollapseAll,
  VscEdit,
  VscChevronDown,
  VscChevronRight,
  VscChevronLeft,
  VscFile,
  VscFolder,
  VscNewFile,
  VscNewFolder,
  VscRefresh,
  VscRepo,
  VscRocket,
  VscSparkle,
  VscTrash,
  VscSymbolClass,
  VscSymbolMisc,
} from "react-icons/vsc";
import {
  DiJava,
  DiJsBadge,
  DiMarkdown,
  DiPython,
  DiReact,
} from "react-icons/di";

import {
  openFile,
  closeFilesByPath,
  updateFileContent,
  setActiveProject,
  setWorkspaceTree,
  mergeProjectFiles,
  collapseAllFolders,
} from "@/store/slices/fileSystemSlice";

import {
  startCreation,
  endCreation,
  writeToTerminal,
  toggleSidebar,
} from "@/store/slices/uiSlice";

import {
  createFileApi,
  fetchProjectFilesApi,
  deleteFileApi,
  fetchFileContentApi,
  fetchWorkspaceProjectsApi,
  getMyWorkspacesByTokenApi,
  saveFileApi,
  renameFileApi,
} from "@/lib/ide/api";
import { getWsBase } from "@/lib/ide/wsBase";
import { setSafeRunStatus } from "@/store/slices/safeRunSlice";
import {
  deleteSandboxFileApi,
  fetchSandboxFileApi,
  fetchSandboxStateApi,
  saveSandboxFileApi,
} from "@/lib/ide/sandbox/sandboxApi";
import { overlaySandboxTree } from "@/lib/ide/sandbox/sandboxTree";
import {
  isSandboxFile,
  sandboxScopeKey,
  setSandbox,
} from "@/store/slices/sandboxSlice";

/** 워크스페이스 이벤트 소켓이 끊겼을 때 첫 재시도까지 기다리는 시간. */
const RECONNECT_BASE_DELAY_MS = 1000;

/** 재시도 간격은 두 배씩 늘리되 이 값을 넘지 않는다. */
const RECONNECT_MAX_DELAY_MS = 30000;

const getBaseName = (path = "") => {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] || path;
};

const getParentPath = (path = "") => {
  const parts = path.split("/").filter(Boolean);
  parts.pop();
  return parts.join("/");
};

const buildRenamedPath = (oldPath = "", newName = "") => {
  const parentPath = getParentPath(oldPath);
  return parentPath ? `${parentPath}/${newName}` : newName;
};

/**
 * 새 파일에 넣을 언어별 기본 코드. 해당 확장자가 없으면 빈 문자열이다.
 *
 * "Java 클래스" 메뉴뿐 아니라 "새 파일"로 만들어도 확장자에 맞는 뼈대가
 * 들어가게 한다. 예전에는 "새 파일 → Foo.java"면 빈 파일이 생겼다.
 */
const getFileTemplate = (fileName, parentId) => {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex <= 0) return "";

  const baseName = fileName.slice(0, dotIndex);
  const ext = fileName.slice(dotIndex + 1).toLowerCase();

  switch (ext) {
    case "java": {
      let packageName = "";
      if (parentId && parentId.includes("src/main/java/")) {
        packageName = parentId.split("src/main/java/")[1].replace(/\//g, ".");
      } else if (parentId && parentId !== "root-folder") {
        packageName = parentId.replace(/\//g, ".");
      }

      return packageName
        ? `package ${packageName};\n\npublic class ${baseName} {\n    \n}\n`
        : `public class ${baseName} {\n    \n}\n`;
    }
    case "jsx":
    case "tsx": {
      // 컴포넌트 이름은 대문자로 시작해야 JSX 태그로 쓸 수 있다.
      const componentName =
        baseName
          .split(/[^A-Za-z0-9]+/)
          .filter(Boolean)
          .map((part) => part[0].toUpperCase() + part.slice(1))
          .join("") || "Component";

      return `export default function ${componentName}() {\n  return (\n    <div>\n      <h1>${componentName}</h1>\n    </div>\n  );\n}\n`;
    }
    case "js":
    case "ts":
      return `console.log("Hello, World!");\n`;
    case "py":
      return `def main():\n    print("Hello, World!")\n\n\nif __name__ == "__main__":\n    main()\n`;
    case "c":
      return `#include <stdio.h>\n\nint main(void) {\n    printf("Hello, World!\\n");\n    return 0;\n}\n`;
    case "cpp":
    case "cc":
      return `#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}\n`;
    default:
      return "";
  }
};

const getFileIcon = (name) => {
  if (!name) return <VscFile className="text-gray-400" />;

  const ext = name.split(".").pop().toLowerCase();

  switch (ext) {
    case "java":
      return <DiJava className="text-orange-500 text-lg" />;
    case "py":
      return <DiPython className="text-blue-500 text-lg" />;
    case "js":
      return <DiJsBadge className="text-yellow-400 text-lg" />;
    case "jsx":
    case "tsx":
      return <DiReact className="text-blue-400 text-lg" />;
    case "md":
      return <DiMarkdown className="text-gray-500 text-lg" />;
    default:
      return <VscFile className="text-gray-500 text-lg" />;
  }
};

const FileTreeItem = ({
  node,
  depth,
  projectName,
  onExpandProject,
  onFileClick,
  onContextMenu,
  pendingCreation,
  handleInputKeyDown,
  confirmInput,
  renameTarget,
  confirmRename,
  cancelRename,
}) => {
  const { activeFileId, activeProject, expandedFolders } = useSelector(
    (state) => state.fileSystem,
  );

  const isExpanded = expandedFolders.includes(node.id || node.realPath);
  const inlineInputRef = useRef(null);
  const renameInputRef = useRef(null);
  const dispatch = useDispatch();

  const currentProjectName = node.type === "project" ? node.name : projectName;
  const nodeType = (node.type || "file").toLowerCase();

  const isProject = nodeType === "project";
  const isFolder = nodeType === "folder" || nodeType === "virtual_folder";
  const isFile = nodeType === "file" || (!isProject && !isFolder && !node.children);

  const nodePath = node.realPath || node.id || node.name;
  const isRenaming = renameTarget && renameTarget.path === nodePath;

  const isCreatingHere =
    pendingCreation && pendingCreation.parentId === (node.realPath || node.id);

  useEffect(() => {
    if (isCreatingHere && inlineInputRef.current) {
      inlineInputRef.current.focus();

      if (!isExpanded && (isFolder || isProject)) {
        dispatch({
          type: "fileSystem/toggleFolder",
          payload: node.id || node.realPath,
        });
      }
    }
  }, [
    isCreatingHere,
    isExpanded,
    isFolder,
    isProject,
    node.id,
    node.realPath,
    dispatch,
  ]);

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  const getIcon = () => {
    if (isProject) return <VscRepo className="text-blue-600" />;
    if (isFolder) return <VscFolder className="text-yellow-500" />;
    return getFileIcon(node.name);
  };

  const handleClick = async (e) => {
    e.stopPropagation();

    if (isRenaming) return;

    if (isProject) {
      if (!isExpanded && (!node.children || node.children.length === 0)) {
        await onExpandProject(node.name);
      }

      dispatch({
        type: "fileSystem/toggleFolder",
        payload: node.id || node.realPath,
      });
    } else if (isFolder) {
      dispatch({
        type: "fileSystem/toggleFolder",
        payload: node.id || node.realPath,
      });
    } else {
      onFileClick(node, currentProjectName);
    }
  };

  const isSelected = activeFileId === (node.realPath || node.id);
  const isStartupProject = isProject && activeProject === node.name;

  return (
    <div className="select-none font-sans mt-[1px]">
      <div
        className={`flex items-center justify-between py-1.5 px-3 cursor-pointer text-[13px] transition-all duration-200 border-l-[3px] 
          ${
            isSelected
              ? "bg-blue-50 text-blue-700 border-blue-500 font-extrabold shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]"
              : "border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium"
          }
          ${isStartupProject && !isSelected ? "bg-slate-50 border-slate-200" : ""}
        `}
        style={{ paddingLeft: `${depth * 12 + 10}px` }}
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu(e, node, currentProjectName)}
      >
        <div className="flex items-center overflow-hidden group">
          <span className="mr-1.5 opacity-60 text-gray-500 shrink-0">
            {(isFolder || isProject) &&
              (isExpanded ? (
                <VscChevronDown size={14} />
              ) : (
                <VscChevronRight size={14} />
              ))}
            {isFile && <span className="w-[14px] inline-block" />}
          </span>

          <span className="mr-2 shrink-0">{getIcon()}</span>

          {isRenaming ? (
            <input
              ref={renameInputRef}
              defaultValue={node.name}
              className="bg-white text-gray-800 border-2 border-blue-400 focus:border-blue-600 outline-none h-7 px-2 text-xs font-bold rounded shadow-sm min-w-[120px]"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  confirmRename(e.currentTarget.value);
                }

                if (e.key === "Escape") {
                  e.preventDefault();
                  cancelRename();
                }
              }}
              onBlur={(e) => {
                confirmRename(e.target.value);
              }}
            />
          ) : (
            <span
              className={`truncate tracking-wide ${
                node.name?.startsWith(".") ? "opacity-50" : ""
              } ${isStartupProject ? "font-bold text-blue-700" : ""}`}
            >
              {node.name}
            </span>
          )}

          {node.realPath && !isRenaming && (
            <span className="ml-2 text-[10px] text-gray-400 font-mono opacity-0 group-hover:opacity-100 truncate max-w-[120px]">
              {node.realPath}
            </span>
          )}
        </div>

        {/* 내 샌드박스에서 고쳤거나 새로 만든 파일. 팀원에게는 아직 보이지 않는다. */}
        {node.sandboxKind && (
          <span
            className="shrink-0 ml-2 rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-black text-white"
            title="내 샌드박스에만 있는 변경입니다. 반영하기 전까지 팀원에게 보이지 않아요."
          >
            {node.sandboxKind === "NEW" ? "새 파일" : "수정"}
          </span>
        )}

        {isStartupProject && (
          <span className="shrink-0 ml-2 text-[9px] font-black text-blue-500 bg-blue-100/50 px-1.5 py-0.5 rounded border border-blue-100">
            현재 작업 폴더
          </span>
        )}
      </div>

      {isCreatingHere && (
        <div
          className="py-1 pr-4"
          style={{ paddingLeft: `${(depth + 1) * 12 + 28}px` }}
        >
          <input
            ref={inlineInputRef}
            className="bg-white text-gray-800 border-2 border-blue-400 focus:border-blue-600 outline-none w-full h-8 px-2 text-xs font-bold rounded shadow-sm transition-colors"
            onKeyDown={(e) => handleInputKeyDown(e, pendingCreation.parentId)}
            onBlur={(e) =>
              confirmInput(e.target.value.trim(), pendingCreation.parentId)
            }
            placeholder={
              pendingCreation.type === "package"
                ? "예: domain.user.dto"
                : pendingCreation.type === "java"
                  ? "클래스명 (예: UserController)"
                  : "이름을 입력하세요..."
            }
          />
        </div>
      )}

      {isExpanded && Array.isArray(node.children) && (
        <div>
          {node.children
            .filter(
              (child) =>
                child.name !== "$$codemap$$" &&
                !child.name?.includes("$$codemap$$"),
            )
            .map((child, idx) => (
              <FileTreeItem
                key={child.id || child.realPath || idx}
                node={child}
                depth={depth + 1}
                projectName={currentProjectName}
                onExpandProject={onExpandProject}
                onFileClick={onFileClick}
                onContextMenu={onContextMenu}
                pendingCreation={pendingCreation}
                handleInputKeyDown={handleInputKeyDown}
                confirmInput={confirmInput}
                renameTarget={renameTarget}
                confirmRename={confirmRename}
                cancelRename={cancelRename}
              />
            ))}
        </div>
      )}
    </div>
  );
};

export default function Sidebar() {
  const dispatch = useDispatch();

  const {
  tree,
  virtualTree,
  workspaceId,
  activeProject,
  activeBranch,
  activeFileId,
  openFiles,
} = useSelector((state) => state.fileSystem);

  const { isSidebarVisible, pendingCreation } = useSelector(
    (state) => state.ui,
  );

  const isVirtualMode = virtualTree !== null && virtualTree !== undefined;
  const inputRef = useRef(null);

  // 탐색기 제목에 붙일 이름. 대시보드에서 "프로젝트"라고 보이는 것이 코드상
  // 워크스페이스라, 트리 루트 이름을 쓰면 안 된다 — 백엔드가 루트를 늘
  // "Projects" 로 고정해 보낸다(ProjectService.getProjectList). 그래서 내
  // 워크스페이스 목록에서 id 로 찾아 온다. 못 찾으면 그냥 "탐색기"만 보인다.
  //
  // 이름을 어느 워크스페이스 것인지와 짝지어 둔다. 워크스페이스를 갈아탄
  // 직후에는 짝이 안 맞으므로 옛 이름이 잠깐이라도 보이지 않는다.
  const [loadedWorkspace, setLoadedWorkspace] = useState({ id: null, name: "" });
  const workspaceName =
    loadedWorkspace.id === workspaceId ? loadedWorkspace.name : "";

  useEffect(() => {
    if (!workspaceId) return undefined;

    let cancelled = false;

    getMyWorkspacesByTokenApi()
      .then((workspaces) => {
        if (cancelled) return;
        const found = (workspaces || []).find((item) => item?.id === workspaceId);
        setLoadedWorkspace({ id: workspaceId, name: found?.name || "" });
      })
      .catch((error) => {
        console.error("워크스페이스 이름 로드 실패:", error);
      });

    // 빠르게 갈아타면 늦게 온 응답이 새 이름을 덮지 않게 한다.
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);
  const fileTreeRefreshTimerRef = useRef(null);

  /**
   * 워크스페이스 이벤트 소켓이 메시지를 받았을 때 부를 함수들.
   *
   * 이 둘을 effect 의존성에 직접 넣으면 안 된다. refreshOpenFileContents 는
   * openFiles 와 activeFileId 에 의존해서, 파일을 열거나 탭을 바꿀 때마다
   * 새 함수가 된다. 그러면 소켓이 끊겼다 다시 붙고, 그 공백에 도착한
   * 팀원의 파일 생성·삭제 알림이 통째로 사라진다. 팀원 변경이 반영되다
   * 말다 하던 원인이 이것이다.
   *
   * ref 로 넘기면 소켓은 방이 바뀔 때만 다시 만들고, 메시지를 받는 순간
   * 항상 최신 함수를 읽는다.
   */
  const eventHandlersRef = useRef(null);
  const renameSubmittingRef = useRef(false);
  const renameCancelledRef = useRef(false);

  const [contextMenu, setContextMenu] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);

  const getBranchForProject = useCallback(
    (projectName) => {
      return projectName === activeProject && activeBranch
        ? activeBranch
        : "master";
    },
    [activeProject, activeBranch],
  );

  /*
   * 샌드박스(개인 레이어). 팀 모드의 시작 프로젝트에만 해당한다.
   *
   * 샌드박스가 켜져 있으면 탐색기는 팀 폴더 위에 내 샌드박스를 덧씌워 보여 준다.
   * 내가 새로 만든 파일은 보이고, 지운 파일은 안 보이고, 고친 파일에는 표시가 붙는다.
   * 파일을 열 때도 내가 고친 파일이면 팀 것이 아니라 내 것을 읽는다.
   */
  const isTeamMode = usePathname()?.includes("/team");
  const store = useStore();

  /**
   * 지금 브랜치의 샌드박스 상태. 아직 받아 오지 못했으면 서버에 물어본다.
   *
   * 물어보지 않고 "꺼져 있다"고 넘겨짚으면 안 된다. 켜져 있던 샌드박스의 파일을 팀
   * 내용으로 열게 되고, 그 내용이 내 개인 방의 첫 문서가 돼서 샌드박스 파일을 덮는다.
   */
  const getSandbox = useCallback(
    async (projectName) => {
      if (!isTeamMode || !workspaceId || projectName !== activeProject) {
        return null;
      }

      const scope = {
        workspaceId,
        projectName,
        branchName: activeBranch || "master",
      };
      const scopeKey = sandboxScopeKey(scope);
      const current = store.getState().sandbox;

      if (current.scopeKey === scopeKey) {
        return current.enabled ? { scope, state: current } : null;
      }

      const fetched = await fetchSandboxStateApi(scope);
      dispatch(setSandbox({ scopeKey, enabled: fetched.enabled, files: fetched.files }));

      return fetched.enabled
        ? { scope, state: store.getState().sandbox }
        : null;
    },
    [isTeamMode, workspaceId, activeProject, activeBranch, store, dispatch],
  );

  const handleExpandProject = useCallback(
    async (projectName) => {
      if (isVirtualMode) return;
      if (!workspaceId || !projectName) return;

      try {
        const branchToFetch =
          projectName === activeProject && activeBranch
            ? activeBranch
            : "master";

        const files = await fetchProjectFilesApi(
          workspaceId,
          projectName,
          branchToFetch,
        );

        // 샌드박스가 켜져 있으면 받은 트리에 내 샌드박스의 차이를 얹는다.
        // 상태를 못 받아 왔으면 팀 트리 그대로 보여 준다(트리가 안 뜨는 것보다 낫다).
        const sandbox = await getSandbox(projectName).catch(() => null);

        if (sandbox && files && Array.isArray(files.children)) {
          dispatch(
            mergeProjectFiles({
              projectName,
              files: {
                ...files,
                children: overlaySandboxTree(files.children, sandbox.state.files),
              },
            }),
          );
          return;
        }

        dispatch(mergeProjectFiles({ projectName, files }));
      } catch (e) {
        console.error("파일 로드 실패:", e);
      }
    },
    [workspaceId, activeProject, activeBranch, isVirtualMode, dispatch, getSandbox],
  );

  useEffect(() => {
    if (workspaceId && activeProject && !isVirtualMode) {
      handleExpandProject(activeProject);
    }
  }, [activeBranch, workspaceId, activeProject, isVirtualMode, handleExpandProject]);

  // 샌드박스를 켜고 끄거나, 그 안의 파일 목록이 바뀌면(사본을 떴다, 반영했다, 버렸다)
  // 탐색기를 다시 그린다. 목록이 같으면 다시 받지 않는다.
  const sandboxTreeSignature = useSelector((state) =>
    state.sandbox.enabled
      ? state.sandbox.files.map((file) => `${file.kind}:${file.filePath}`).join("|")
      : "off",
  );
  const lastSandboxTreeSignatureRef = useRef(sandboxTreeSignature);

  useEffect(() => {
    if (lastSandboxTreeSignatureRef.current === sandboxTreeSignature) return;
    lastSandboxTreeSignatureRef.current = sandboxTreeSignature;

    if (workspaceId && activeProject && !isVirtualMode) {
      handleExpandProject(activeProject);
    }
  }, [sandboxTreeSignature, workspaceId, activeProject, isVirtualMode, handleExpandProject]);

  const handleFileClick = async (node, realProjectName) => {
    let targetProject = realProjectName || activeProject;
    let targetFilePath = node.id || node.name;

    if (isVirtualMode && node.realPath) {
      const pathParts = node.realPath.split("/");
      targetProject = pathParts[0];
      targetFilePath = pathParts.slice(1).join("/");
    }

    const fileToOpen = {
      ...node,
      id: isVirtualMode ? node.realPath : node.id,
      type: "file",
    };

    dispatch(openFile(fileToOpen));

    try {
      const branchToFetch =
        targetProject === activeProject && activeBranch
          ? activeBranch
          : "master";

      // 샌드박스에서 내가 고친 파일이면 팀 파일이 아니라 내 것을 읽는다.
      // 에디터는 이 내용으로 내 개인 방의 첫 문서를 만든다. 여기서 팀 내용을 주면
      // 그것이 샌드박스 파일을 덮는다. 그래서 상태를 못 받아 오면 열지 않는다
      // (아래 catch 로 간다).
      const sandbox = isVirtualMode ? null : await getSandbox(targetProject);

      const content =
        sandbox && isSandboxFile(sandbox.state, targetFilePath)
          ? await fetchSandboxFileApi(sandbox.scope, targetFilePath)
          : await fetchFileContentApi(
              workspaceId,
              targetProject,
              branchToFetch,
              targetFilePath,
            );

      dispatch(
        updateFileContent({
          filePath: fileToOpen.id,
          content,
        }),
      );
    } catch (e) {
      console.error("파일 내용 로드 실패:", e);

      // 조용히 넘기면 안 된다.
      //
      // 내용을 못 받아오면 빈 에디터가 열린 채로 남는데, 사용자에게는 그냥
      // "빈 파일"로 보인다. 그 위에 새로 타이핑하면 원본을 덮어쓸 수 있다.
      //
      // 여기서 fileContents 를 빈 문자열로 채우지 않는 것도 같은 이유다.
      // 채우면 협업 세션이 시작되고 자동 저장이 돌아, 디스크에 멀쩡히 있는
      // 내용을 빈 것으로 덮어쓴다. 비워 두면 세션이 시작되지 않아 안전하다.
      dispatch(
        writeToTerminal(
          `[Error] 파일을 불러오지 못했습니다: ${targetFilePath} — ${e.message}\n`,
        ),
      );
    }
  };

  const refreshWorkspace = useCallback(async () => {
    if (!workspaceId || isVirtualMode) return;

    try {
      const rootNode = await fetchWorkspaceProjectsApi(workspaceId);
      dispatch(setWorkspaceTree(rootNode));

      if (activeProject) {
        await handleExpandProject(activeProject);
      }
    } catch (e) {
      console.error("워크스페이스 새로고침 실패:", e);
    }
  }, [
    workspaceId,
    isVirtualMode,
    activeProject,
    dispatch,
    handleExpandProject,
  ]);

  const refreshOpenFileContents = useCallback(
  async (branchName) => {
    if (!workspaceId || !activeProject || isVirtualMode) return;

    const targetBranch = branchName || activeBranch || "master";

    const filesToRefresh = [];

    if (Array.isArray(openFiles)) {
      openFiles.forEach((file) => {
        const fileId = file?.id;

        if (!fileId) return;
        if (String(fileId).startsWith("virtual:")) return;
        if (String(fileId).includes("codemap")) return;

        filesToRefresh.push(fileId);
      });
    }

    if (
      activeFileId &&
      !String(activeFileId).startsWith("virtual:") &&
      !String(activeFileId).includes("codemap") &&
      !filesToRefresh.includes(activeFileId)
    ) {
      filesToRefresh.push(activeFileId);
    }

    if (filesToRefresh.length === 0) return;

    // 샌드박스에서 고치는 파일은 팀 파일로 최신화하지 않는다.
    // 그 탭의 내용은 내 샌드박스 것이다. 팀 내용으로 바꿔 넣으면 다음에 그 탭을 열 때
    // 팀 내용이 내 개인 방의 첫 문서가 될 수 있다.
    const sandboxState = store.getState().sandbox;

    await Promise.allSettled(
      filesToRefresh
        .filter((filePath) => !isSandboxFile(sandboxState, filePath))
        .map(async (filePath) => {
        const latestContent = await fetchFileContentApi(
          workspaceId,
          activeProject,
          targetBranch,
          filePath,
        );

        dispatch(
          updateFileContent({
            filePath,
            content: latestContent,
          }),
        );
      }),
    );

    dispatch(
      writeToTerminal(
        `[System] 열린 파일 최신화 완료: ${activeProject} (${targetBranch})\n`,
      ),
    );
  },
  [
    workspaceId,
    activeProject,
    activeBranch,
    activeFileId,
    openFiles,
    isVirtualMode,
    dispatch,
    store,
  ],
);

  // 소켓이 부를 함수만 최신으로 갈아 끼운다. 소켓 자체는 다시 만들지 않는다.
  useEffect(() => {
    eventHandlersRef.current = {
      handleExpandProject,
      refreshOpenFileContents,
    };
  }, [handleExpandProject, refreshOpenFileContents]);

  /*
   * 팀원의 파일 생성·삭제·이름변경을 내 탐색기에 즉시 반영하는 소켓.
   *
   * 의존성에는 "어느 방에 붙어야 하는가"만 넣는다. 브랜치는 방 이름에
   * 들어가므로 반드시 남겨야 한다 — 같은 브랜치를 보고 있는 사람끼리만
   * 반영되는 것이 이 기능의 요구사항이다.
   *
   * 반대로 handleExpandProject 와 refreshOpenFileContents 는 넣으면 안 된다.
   * 파일을 열 때마다 소켓이 새로 붙으면서 그 사이 알림을 놓치기 때문이다.
   * 두 함수는 eventHandlersRef 로 읽는다.
   */
  useEffect(() => {
    if (!workspaceId || !activeProject || isVirtualMode) return;

    const branchName = activeBranch || "master";
    const room = `workspace:${workspaceId}:project:${activeProject}:branch:${branchName}`;

    /** 정리 중인지. 내가 닫은 소켓의 오류를 사용자에게 보여 주지 않으려고 둔다. */
    let disposed = false;

    let socket = null;
    let retryTimer = null;
    let retryDelayMs = RECONNECT_BASE_DELAY_MS;
    let hasConnectedBefore = false;
    let hasWarnedFailure = false;

    const scheduleReconnect = () => {
      if (disposed || retryTimer) return;

      retryTimer = setTimeout(() => {
        retryTimer = null;
        connect();
      }, retryDelayMs);

      retryDelayMs = Math.min(retryDelayMs * 2, RECONNECT_MAX_DELAY_MS);
    };

    const handleMessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        // 브랜치 생성·삭제는 어느 브랜치를 보고 있든 모두에게 온다.
        //
        // 브랜치 목록은 이 화면이 아니라 useGitBranches 가 들고 있어서,
        // 브라우저 이벤트로 넘겨 그쪽에서 다시 받아 가게 한다. 소켓을
        // 하나 더 열지 않으려고 이 소켓을 같이 쓴다.
        if (message.type === "BRANCH_CHANGED") {
          if (String(message.workspaceId) !== String(workspaceId)) return;
          if (message.projectName !== activeProject) return;

          console.log("🌿 [WorkspaceEvents] 브랜치 변경 감지:", message);

          window.dispatchEvent(
            new CustomEvent("waivs:branch-list-changed", {
              detail: {
                workspaceId: message.workspaceId,
                projectName: message.projectName,
                action: message.action,
                branchName: message.branchName,
              },
            }),
          );

          return;
        }

        // 안전 실행의 작성자 상태·정상 버전 알림. 같은 방으로 온다.
        //
        // 두 알림 모두 "전체 상태"를 싣고 오므로 통째로 갈아 끼우면 된다.
        // 그리는 것은 SafeRunStatusBar 가 한다.
        if (
          message.type === "AUTHOR_STATUS_CHANGED" ||
          message.type === "GREEN_UPDATED"
        ) {
          if (String(message.workspaceId) !== String(workspaceId)) return;
          if (message.projectName !== activeProject) return;
          if ((message.branchName || "master") !== branchName) return;

          dispatch(
            setSafeRunStatus({
              workspaceId: message.workspaceId,
              projectName: message.projectName,
              branchName: message.branchName || "master",
              greenUpdatedAt: message.greenUpdatedAt ?? null,
              authors: Array.isArray(message.authors) ? message.authors : [],
            }),
          );

          return;
        }

        // 팀 파일이 바뀌었는데, 누군가 그 파일을 자기 샌드박스에서 고치고 있다.
        //
        // 샌드박스에서 고치는 파일은 팀원의 편집이 화면에 보이지 않는다. 내 목록에 있는
        // 파일이면 상태를 다시 받아 "팀이 이 파일을 고쳤어요"를 띄운다. 남의 샌드박스
        // 파일이면 나와 무관하므로 넘긴다(서버는 누구 것인지 싣지 않는다).
        if (message.type === "SANDBOX_TEAM_FILE_CHANGED") {
          if (String(message.workspaceId) !== String(workspaceId)) return;
          if (message.projectName !== activeProject) return;
          if ((message.branchName || "master") !== branchName) return;

          const changedPath = String(message.filePath || "");
          const mySandbox = store.getState().sandbox;

          // 폴더가 지워지거나 이름이 바뀌면 그 아래 파일들이 해당된다.
          const isMine =
            mySandbox.enabled &&
            mySandbox.files.some(
              (file) =>
                file.filePath === changedPath ||
                file.filePath.startsWith(changedPath + "/"),
            );

          if (!isMine) return;

          const scope = {
            workspaceId,
            projectName: activeProject,
            branchName,
          };

          fetchSandboxStateApi(scope)
            .then((fresh) =>
              dispatch(
                setSandbox({
                  scopeKey: sandboxScopeKey(scope),
                  enabled: fresh.enabled,
                  files: fresh.files,
                }),
              ),
            )
            .catch((error) => {
              console.error("샌드박스 상태 갱신 실패:", error);
            });

          return;
        }

        if (message.type !== "FILE_TREE_CHANGED") return;

        const sameWorkspace = String(message.workspaceId) === String(workspaceId);
        const sameProject = message.projectName === activeProject;
        const sameBranch = (message.branchName || "master") === branchName;

        if (!sameWorkspace || !sameProject || !sameBranch) return;

        console.log("🔄 [WorkspaceEvents] 파일 트리 변경 감지:", message);

        // 지워졌거나 이름이 바뀐 파일을 내가 열어 두고 있으면 탭을 닫는다.
        //
        // 그대로 두면 이제 없는 경로를 가리키는 탭이 남아서, 트리에서는
        // 사라졌는데 편집기에는 계속 보이고 저장도 실패한다. 폴더가 지워진
        // 경우 그 아래 파일 탭까지 closeFilesByPath 가 함께 닫아 준다.
        if (
          (message.action === "DELETE" || message.action === "RENAME") &&
          message.filePath
        ) {
          dispatch(closeFilesByPath(message.filePath));
        }

        if (fileTreeRefreshTimerRef.current) {
          clearTimeout(fileTreeRefreshTimerRef.current);
        }

        fileTreeRefreshTimerRef.current = setTimeout(async () => {
          const handlers = eventHandlersRef.current;

          if (!handlers) return;

          await handlers.handleExpandProject(message.projectName);
          await handlers.refreshOpenFileContents(
            message.branchName || branchName,
          );
        }, 100);
      } catch (error) {
        console.error("WorkspaceEvents 메시지 처리 실패:", error);
      }
    };

    const connect = () => {
      if (disposed) return;

      const ws = new WebSocket(
        `${getWsBase()}/ws/workspace-events?room=${encodeURIComponent(room)}`,
      );

      socket = ws;

      ws.onopen = () => {
        if (disposed) return;

        console.log("📁 [WorkspaceEvents] 연결됨:", room);

        // 끊겨 있는 동안 온 알림은 받지 못했다. 다시 붙은 김에 트리를 한 번
        // 받아 와서 그 공백을 메운다. 이게 없으면 서버가 잠깐 죽은 사이에
        // 팀원이 만든 파일이 새로고침 전까지 영영 안 보인다.
        if (hasConnectedBefore) {
          eventHandlersRef.current?.handleExpandProject(activeProject);
        }

        hasConnectedBefore = true;
        hasWarnedFailure = false;
        retryDelayMs = RECONNECT_BASE_DELAY_MS;
      };

      ws.onmessage = handleMessage;

      ws.onerror = () => {
        // 브라우저는 보안상 실패 사유를 이 이벤트에 담지 않는다. 찍어 봐야
        // 항상 빈 객체라 원인 파악에 도움이 안 되고, console.error 로 남기면
        // Next.js 개발 오버레이가 빨간 박스로 화면을 가린다. 진짜 사유는
        // 바로 뒤에 오는 onclose 의 code/reason 에 있으므로 거기서 다룬다.
      };

      ws.onclose = (event) => {
        if (disposed) return;

        if (event.code === 1000) {
          console.log("👋 [WorkspaceEvents] 연결 종료:", room);
          return;
        }

        // 재시도할 때마다 찍으면 콘솔이 금방 뒤덮인다. 끊긴 사실은 한 번만
        // 알리고, 다시 붙으면 위에서 hasWarnedFailure 를 풀어 준다.
        if (!hasWarnedFailure) {
          hasWarnedFailure = true;

          console.warn(
            "[WorkspaceEvents] 연결이 끊어져 팀원의 파일 변경이 반영되지 않습니다. 재접속을 시도합니다.",
            {
              room,
              code: event.code,
              reason: event.reason || "(없음)",
              wasClean: event.wasClean,
            },
          );
        }

        scheduleReconnect();
      };
    };

    connect();

    return () => {
      disposed = true;

      if (fileTreeRefreshTimerRef.current) {
        clearTimeout(fileTreeRefreshTimerRef.current);
        fileTreeRefreshTimerRef.current = null;
      }

      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }

      // 정상 종료 코드로 닫는다. disposed 가 이미 true 라 onclose 는 조용히
      // 빠져나가지만, 서버 쪽 로그에도 비정상 종료로 남지 않게 한다.
      if (socket) socket.close(1000, "leaving room");
    };
  }, [workspaceId, activeProject, activeBranch, isVirtualMode, dispatch, store]);



  useEffect(() => {
    if (
      pendingCreation &&
      pendingCreation.parentId === "root-folder" &&
      inputRef.current
    ) {
      inputRef.current.focus();
    }
  }, [pendingCreation]);

  const confirmInput = async (name, parentId) => {
    if (!name) {
      dispatch(endCreation());
      return;
    }

    try {
      let finalName = name;
      let apiType = pendingCreation.type;
      let skeletonCode = "";

      if (apiType === "package") {
        finalName = name.replace(/\./g, "/");
        apiType = "folder";
      } else if (apiType === "java") {
        finalName = name.endsWith(".java") ? name : `${name}.java`;
        apiType = "file";
      }

      if (apiType === "file") {
        skeletonCode = getFileTemplate(finalName, parentId);
      }

      let path = finalName;

      if (parentId !== "root-folder" && parentId !== "") {
        path = parentId + "/" + finalName;
      }

      // 샌드박스가 켜져 있으면 새 파일은 팀 폴더가 아니라 내 샌드박스에 만든다.
      // 팀 폴더에 만들면 샌드박스 안이라고 생각하고 만든 파일이 팀원에게 바로 보인다.
      // (워크스페이스 최상위에 폴더를 만드는 것은 새 프로젝트를 만드는 일이라 샌드박스와 무관하다.)
      const sandbox =
        parentId === "root-folder" ? null : await getSandbox(activeProject);

      if (sandbox) {
        if (apiType !== "file") {
          alert(
            "샌드박스에서는 폴더를 만들 수 없어요.\n샌드박스를 끄고 만들어 주세요.",
          );
          dispatch(endCreation());
          return;
        }

        await saveSandboxFileApi(sandbox.scope, path, skeletonCode || "");

        // 목록을 먼저 갱신한 뒤에 연다. 순서가 바뀌면 에디터가 이 파일을 "아직 안 고친
        // 파일"로 보고 팀 방으로 열어 버린다.
        const fresh = await fetchSandboxStateApi(sandbox.scope);
        dispatch(
          setSandbox({
            scopeKey: sandboxScopeKey(sandbox.scope),
            enabled: fresh.enabled,
            files: fresh.files,
          }),
        );

        dispatch(updateFileContent({ filePath: path, content: skeletonCode || "" }));
        dispatch(openFile({ id: path, name: finalName, type: "file" }));

        dispatch(endCreation());
        return;
      }

      await createFileApi(
        workspaceId,
        activeProject,
        activeBranch || "master",
        path,
        apiType,
      );

      if (parentId === "root-folder" && apiType === "folder") {
        dispatch(setActiveProject(finalName));
        dispatch(
          writeToTerminal(
            `[System] 새 프로젝트 '${finalName}' 이(가) 시작 프로젝트로 자동 지정되었습니다.\n`,
          ),
        );
        handleExpandProject(finalName);
      } else {
        handleExpandProject(activeProject);
      }

      if (apiType === "file") {
        dispatch(
          openFile({
            id: path,
            name: finalName,
            type: "file",
          }),
        );

        // 내용을 반드시 등록한다. 템플릿이 없으면 빈 문자열이다.
        //
        // 협업 세션은 fileContents 에 값이 들어와야 시작된다. 예전에는
        // 템플릿이 있을 때만 등록해서, 템플릿이 없는 확장자로 파일을 만들면
        // 세션이 아예 시작되지 않았다. 그러면 타이핑해도 팀원에게 전파되지
        // 않고 자동 저장도 돌지 않아, 팀원이 그 파일을 열면 빈 파일이 보였다.
        //
        // 새로 만든 파일은 실제로 비어 있으므로 빈 문자열이 정확한 값이다.
        dispatch(
          updateFileContent({
            filePath: path,
            content: skeletonCode || "",
          }),
        );

        if (skeletonCode) {
          try {
            await saveFileApi(
              workspaceId,
              activeProject,
              activeBranch || "master",
              path,
              skeletonCode,
            );

            dispatch(
              writeToTerminal(
                `[System] ${finalName} 템플릿 생성 및 자동 저장 완료!\n`,
              ),
            );
          } catch (saveError) {
            console.error("자동 저장 에러:", saveError);
            dispatch(
              writeToTerminal(
                `[System] 파일은 생성되었으나 자동 저장에 실패했습니다. (직접 저장해주세요)\n`,
              ),
            );
          }
        }
      }
    } catch (e) {
      alert(e.message);
    }

    dispatch(endCreation());
  };

  const handleInputKeyDown = (e, parentId) => {
    if (e.key === "Enter") {
      confirmInput(e.target.value.trim(), parentId);
    }

    if (e.key === "Escape") {
      dispatch(endCreation());
    }
  };

  const handleContextMenu = (e, node, projectName) => {
    e.preventDefault();
    e.stopPropagation();

    if (isVirtualMode) return;

    const targetProj = projectName || activeProject;

    // 이름만 보면 "백엔드"처럼 이름을 붙인 스프링 프로젝트에서 "Java 클래스"
    // 메뉴가 안 나와, 기본 코드 없는 "새 파일"로만 만들 수 있었다. 그래서
    // 프로젝트 최상위에 빌드 파일이 있는지도 본다.
    const projectNode = tree?.children?.find((p) => p.name === targetProj);
    const hasJavaBuildFile = (projectNode?.children || []).some((child) =>
      ["build.gradle", "build.gradle.kts", "pom.xml"].includes(child.name),
    );

    const isJavaEnv =
      hasJavaBuildFile ||
      targetProj?.toLowerCase().includes("스프링") ||
      targetProj?.toLowerCase().includes("java") ||
      targetProj?.toLowerCase().includes("demo");

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      fileId: node.id,
      path: node.realPath || node.id || node.name,
      name: node.name,
      type: node.type,
      projectName: targetProj,
      isRoot: node.type === "project",
      isJavaEnv,
    });
  };

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);

    window.addEventListener("click", closeMenu);

    return () => {
      window.removeEventListener("click", closeMenu);
    };
  }, []);

  const handleDelete = async () => {
    if (!contextMenu) return;

    if (!window.confirm(`정말 '${contextMenu.path}'을(를) 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const targetProject = contextMenu.projectName || activeProject;
      const targetBranch = getBranchForProject(targetProject);

      // 샌드박스가 켜져 있으면 내 샌드박스에서만 지운다. 팀 파일은 반영할 때 지워진다.
      const sandbox = await getSandbox(targetProject);

      if (sandbox) {
        if (contextMenu.type !== "file") {
          alert(
            "샌드박스에서는 폴더를 지울 수 없어요.\n파일을 하나씩 지우거나, 샌드박스를 끄고 지워 주세요.",
          );
          setContextMenu(null);
          return;
        }

        await deleteSandboxFileApi(sandbox.scope, contextMenu.path);
        dispatch(closeFilesByPath(contextMenu.path));

        const fresh = await fetchSandboxStateApi(sandbox.scope);
        dispatch(
          setSandbox({
            scopeKey: sandboxScopeKey(sandbox.scope),
            enabled: fresh.enabled,
            files: fresh.files,
          }),
        );

        setContextMenu(null);
        return;
      }

      await deleteFileApi(
        workspaceId,
        targetProject,
        targetBranch,
        contextMenu.path,
      );

      dispatch(closeFilesByPath(contextMenu.path));
      handleExpandProject(targetProject);
      setContextMenu(null);
    } catch (e) {
      alert("삭제 실패: " + e.message);
    }
  };

  const startRename = () => {
    if (!contextMenu) return;

    if (contextMenu.isRoot) {
      alert(
        "프로젝트 이름 변경은 별도 프로젝트 rename API 연결이 필요합니다. 현재는 파일/폴더 이름 변경만 지원합니다.",
      );
      setContextMenu(null);
      return;
    }

    // 샌드박스는 파일을 만들고 고치고 지우는 것만 따로 보관한다. 이름 변경은 팀 폴더에
    // 바로 적용되는 작업이라, 샌드박스 안이라고 생각하고 한 일이 팀 전체에 퍼진다.
    const sandboxState = store.getState().sandbox;
    const isActiveProjectTarget =
      (contextMenu.projectName || activeProject) === activeProject;

    if (isTeamMode && sandboxState.enabled && isActiveProjectTarget) {
      alert(
        "샌드박스에서는 이름을 바꿀 수 없어요.\n샌드박스를 끄고 바꿔 주세요.",
      );
      setContextMenu(null);
      return;
    }

    setRenameTarget({
      path: contextMenu.path,
      oldName: contextMenu.name || getBaseName(contextMenu.path),
      type: contextMenu.type,
      projectName: contextMenu.projectName || activeProject,
    });

    setContextMenu(null);
  };

  const cancelRename = () => {
    renameCancelledRef.current = true;
    setRenameTarget(null);

    setTimeout(() => {
      renameCancelledRef.current = false;
    }, 0);
  };

  const confirmRename = async (rawName) => {
    if (!renameTarget) return;
    if (renameSubmittingRef.current) return;
    if (renameCancelledRef.current) return;

    const newName = rawName.trim();
    const oldName = renameTarget.oldName;
    const oldPath = renameTarget.path;
    const targetProject = renameTarget.projectName || activeProject;
    const targetBranch = getBranchForProject(targetProject);

    if (!newName || newName === oldName) {
      setRenameTarget(null);
      return;
    }

    if (newName.includes("/") || newName.includes("\\")) {
      alert("이름만 입력해주세요. 경로 구분자(/, \\)는 사용할 수 없습니다.");
      return;
    }

    renameSubmittingRef.current = true;

    try {
      await renameFileApi(
        workspaceId,
        targetProject,
        targetBranch,
        oldPath,
        newName,
      );

      const newPath = buildRenamedPath(oldPath, newName);

      dispatch(closeFilesByPath(oldPath));

      await handleExpandProject(targetProject);

      dispatch(
        writeToTerminal(
          `[System] 이름 변경 완료: ${oldPath} → ${newPath}\n`,
        ),
      );
    } catch (e) {
      alert("이름 변경 실패: " + e.message);
    } finally {
      setRenameTarget(null);
      renameSubmittingRef.current = false;
    }
  };

  const handleSetStartup = () => {
    if (!contextMenu) return;

    const targetProject = contextMenu.fileId;

    dispatch(setActiveProject(targetProject));
    dispatch(
      writeToTerminal(`[System] 시작 프로젝트가 변경되었습니다: ${targetProject}\n`),
    );

    setContextMenu(null);
  };

  const handleContextMenuNew = (creationType) => {
    if (!contextMenu) return;

    let parentId = contextMenu.path;

    if (contextMenu.type === "project") {
      parentId = "";
    } else if (contextMenu.type === "file") {
      const pathParts = parentId.split("/");
      pathParts.pop();
      parentId = pathParts.join("/");
    }

    dispatch(
      startCreation({
        type: creationType,
        parentId,
      }),
    );

    setContextMenu(null);
  };

  if (!isSidebarVisible) return null;

  const displayTreeChildren = isVirtualMode
    ? virtualTree.children
    : tree?.children || [];

  return (
    <div className="h-full w-full bg-white flex flex-col font-sans">
      <div className="flex items-center justify-between px-4 h-[44px] border-b border-gray-100 shrink-0 bg-white">
        {/* 이름이 길면 말줄임으로 자르고 전체 이름은 툴팁으로 보여 준다.
            오른쪽 새로고침·닫기 버튼이 밀려나면 안 되기 때문이다. */}
        <span
          className="min-w-0 text-[12px] font-black text-gray-800 tracking-wider"
          title={workspaceName ? `${workspaceName} 탐색기` : undefined}
        >
          <span className="block truncate whitespace-nowrap">
            {workspaceName ? `${workspaceName} 탐색기` : "탐색기"}
          </span>
        </span>

        <div className="flex shrink-0 items-center gap-1 text-gray-500">
          {!isVirtualMode && (
            <>
              <button
                className="p-1.5 hover:bg-gray-100 rounded-md transition-all text-gray-400 hover:text-blue-600"
                onClick={refreshWorkspace}
                title="새로고침"
              >
                <VscRefresh size={15} />
              </button>

              <button
                className="p-1.5 hover:bg-gray-100 rounded-md transition-all text-gray-400 hover:text-blue-600"
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch(
                    startCreation({
                      type: "file",
                      parentId: activeProject ? "" : "root-folder",
                    }),
                  );
                }}
                title="새 파일"
              >
                <VscNewFile size={15} />
              </button>

              <button
                className="p-1.5 hover:bg-gray-100 rounded-md transition-all text-gray-400 hover:text-blue-600"
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch(
                    startCreation({
                      type: "folder",
                      parentId: activeProject ? "" : "root-folder",
                    }),
                  );
                }}
                title="새 폴더"
              >
                <VscNewFolder size={15} />
              </button>

              <div className="w-[1px] h-3 bg-gray-200 mx-1" />
            </>
          )}

          <button
            onClick={() => dispatch(collapseAllFolders())}
            className="p-1.5 hover:bg-gray-100 rounded-md transition-all text-gray-400 hover:text-gray-800"
            title="폴더 모두 접기"
          >
            <VscCollapseAll size={15} />
          </button>

          <button
            onClick={() => dispatch(toggleSidebar())}
            className="p-1.5 hover:bg-gray-100 rounded-md transition-all text-gray-400 hover:text-gray-800 ml-0.5"
            title="탐색기 닫기"
          >
            <VscChevronLeft size={16} />
          </button>
        </div>
      </div>

      {isVirtualMode && (
        <div className="flex flex-col px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 shrink-0 gap-2 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-extrabold text-indigo-700 flex items-center gap-1.5">
              <VscSparkle size={14} className="animate-pulse" /> AI 뷰 적용 중
            </span>

            <button
              onClick={handleDeactivateVirtualView}
              className="text-[10px] font-bold bg-white text-indigo-600 border border-indigo-200 px-2.5 py-1 rounded-md hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95"
            >
              원본 복구
            </button>
          </div>

          <span
            className="text-[11px] text-indigo-500 font-bold truncate"
            title={virtualTree.name}
          >
            적용된 뷰: {virtualTree.name}
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-2 custom-scrollbar bg-[#fafafa]">
        {displayTreeChildren.length > 0 ? (
          displayTreeChildren.map((node, idx) => (
            <FileTreeItem
              key={node.id || node.realPath || node.name || idx}
              node={node}
              depth={0}
              projectName={isVirtualMode ? "" : node.name}
              onExpandProject={handleExpandProject}
              onFileClick={handleFileClick}
              onContextMenu={handleContextMenu}
              pendingCreation={pendingCreation}
              handleInputKeyDown={handleInputKeyDown}
              confirmInput={confirmInput}
              renameTarget={renameTarget}
              confirmRename={confirmRename}
              cancelRename={cancelRename}
            />
          ))
        ) : (
          <div className="p-4 text-xs font-bold text-gray-400 text-center mt-4 border-2 border-dashed border-gray-200 bg-white mx-4 rounded-xl">
            {isVirtualMode
              ? "가상 뷰에 파일이 없습니다."
              : "프로젝트가 없습니다. 상단에서 생성해주세요."}
          </div>
        )}

        {pendingCreation && pendingCreation.parentId === "root-folder" && (
          <div className="pl-6 pr-4 py-1.5 mt-2">
            <input
              ref={inputRef}
              autoFocus
              className="bg-white text-gray-800 border-2 border-blue-400 focus:border-blue-600 outline-none w-full h-8 px-2 text-xs font-bold rounded shadow-sm transition-colors"
              onKeyDown={(e) =>
                handleInputKeyDown(e, pendingCreation.parentId)
              }
              onBlur={(e) =>
                confirmInput(e.target.value.trim(), pendingCreation.parentId)
              }
              placeholder="이름을 입력하세요..."
            />
          </div>
        )}
      </div>

      {contextMenu && !isVirtualMode && (
        <div
          className="fixed bg-white border border-gray-100 shadow-[0_10px_30px_rgba(0,0,0,0.15)] rounded-xl py-2 w-56 z-[9999]"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
          }}
        >
          {contextMenu.isJavaEnv ? (
            <>
              <div
                className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-[13px] flex items-center gap-2 text-gray-700 font-bold transition-colors"
                onClick={() => handleContextMenuNew("java")}
              >
                <VscSymbolClass size={16} className="text-orange-500" />
                Java 클래스 (Class)
              </div>

              <div
                className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-[13px] flex items-center gap-2 text-gray-700 font-bold transition-colors"
                onClick={() => handleContextMenuNew("package")}
              >
                <VscSymbolMisc size={16} className="text-yellow-600" />
                패키지 (Package)
              </div>
            </>
          ) : (
            <>
              <div
                className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-[13px] flex items-center gap-2 text-gray-700 font-bold transition-colors"
                onClick={() => handleContextMenuNew("file")}
              >
                <VscNewFile size={16} className="text-gray-500" />
                새 파일 (New File)
              </div>

              <div
                className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-[13px] flex items-center gap-2 text-gray-700 font-bold transition-colors"
                onClick={() => handleContextMenuNew("folder")}
              >
                <VscNewFolder size={16} className="text-gray-500" />
                새 폴더 (New Folder)
              </div>
            </>
          )}

          <div className="h-[1px] bg-gray-100 my-1.5 mx-3" />

          {contextMenu.isRoot && (
            <>
              <div
                className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-[13px] flex items-center gap-2 text-blue-700 font-black transition-colors"
                onClick={handleSetStartup}
              >
                <VscRocket size={16} className="text-blue-500" />
                현재 작업 폴더로 설정
              </div>

              <div className="h-[1px] bg-gray-100 my-1.5 mx-3" />
            </>
          )}

          <div
            className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-[13px] flex items-center gap-2 text-gray-700 font-bold transition-colors"
            onClick={startRename}
          >
            <VscEdit size={16} className="text-gray-500" />
            이름 변경
          </div>

          <div
            className="px-4 py-2 hover:bg-red-50 cursor-pointer text-[13px] flex items-center gap-2 text-red-600 font-bold transition-colors"
            onClick={handleDelete}
          >
            <VscTrash size={16} />
            삭제하기
          </div>
        </div>
      )}
    </div>
  );
}