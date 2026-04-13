"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import {
  VscCollapseAll,
  VscEdit,
  VscChevronDown,
  VscChevronRight,
  VscFile,
  VscFolder,
  VscNewFile,
  VscNewFolder,
  VscRefresh,
  VscRepo,
  VscRocket,
  VscSparkle,
  VscTrash,
  VscWand,
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
  clearVirtualTree,
} from "@/store/slices/fileSystemSlice";
import {
  startCreation,
  endCreation,
  writeToTerminal,
} from "@/store/slices/uiSlice";

// 💡 [추가] saveFileApi를 import 목록에 추가했습니다!
import {
  createFileApi,
  fetchProjectFilesApi,
  deleteFileApi,
  fetchFileContentApi,
  fetchWorkspaceProjectsApi,
  deactivateVirtualViewApi,
  saveFileApi, 
} from "@/lib/ide/api";

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
}) => {
  const { activeFileId, activeProject } = useSelector(
    (state) => state.fileSystem,
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const inlineInputRef = useRef(null);

  const currentProjectName = node.type === "project" ? node.name : projectName;
  const nodeType = (node.type || "file").toLowerCase();
  const isProject = nodeType === "project";
  const isFolder = nodeType === "folder" || nodeType === "virtual_folder";
  const isFile =
    nodeType === "file" || (!isProject && !isFolder && !node.children);

  const isCreatingHere = pendingCreation && pendingCreation.parentId === (node.realPath || node.id);

  useEffect(() => {
    if (isCreatingHere && inlineInputRef.current) {
      inlineInputRef.current.focus();
      if (!isExpanded && (isFolder || isProject)) setIsExpanded(true);
    }
  }, [isCreatingHere]);

  const getIcon = () => {
    if (isProject) return <VscRepo className="text-blue-600" />;
    if (isFolder) return <VscFolder className="text-yellow-500" />;
    return getFileIcon(node.name);
  };

  const handleClick = async (e) => {
    e.stopPropagation();

    if (isProject) {
      if (!isExpanded && (!node.children || node.children.length === 0)) {
        await onExpandProject(node.name);
      }
      setIsExpanded(!isExpanded);
    } else if (isFolder) {
      setIsExpanded(!isExpanded);
    } else {
      onFileClick(node, currentProjectName);
    }
  };

  const isSelected = activeFileId === (node.realPath || node.id);
  const isStartupProject = isProject && activeProject === node.name;

  return (
    <div className="select-none font-sans">
      <div
        className={`flex items-center justify-between py-[4px] px-3 cursor-pointer text-[13px] border-l-2 transition-colors
          ${
            isSelected
              ? "bg-blue-100 text-blue-800 border-blue-500 font-medium"
              : "border-transparent text-gray-700 hover:bg-gray-200"
          }
          ${isStartupProject ? "bg-blue-50/50" : ""}
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

          <span className="mr-1.5 shrink-0">{getIcon()}</span>

          <span
            className={`truncate ${
              node.name.startsWith(".") ? "opacity-50" : ""
            } ${isStartupProject ? "font-bold text-blue-700" : ""}`}
          >
            {node.name}
          </span>

          {node.realPath && (
            <span className="ml-2 text-[10px] text-gray-400 font-mono opacity-0 group-hover:opacity-100 truncate max-w-[120px]">
              {node.realPath}
            </span>
          )}
        </div>

        {isStartupProject && (
          <span className="shrink-0 ml-2 text-[9px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200">
            시작 프로젝트
          </span>
        )}
      </div>

      {isCreatingHere && (
        <div className="py-1 pr-4" style={{ paddingLeft: `${(depth + 1) * 12 + 28}px` }}>
          <input
            ref={inlineInputRef}
            className="bg-white text-gray-800 border border-blue-400 focus:border-blue-600 outline-none w-full h-7 px-2 text-xs rounded shadow-sm transition-colors"
            onKeyDown={(e) => handleInputKeyDown(e, pendingCreation.parentId)}
            onBlur={(e) => confirmInput(e.target.value.trim(), pendingCreation.parentId)}
            placeholder={
              pendingCreation.type === 'package' ? "예: domain.user.dto" :
              pendingCreation.type === 'java' ? "클래스명 (예: UserController)" : "이름을 입력하세요..."
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
                !child.name.includes("$$codemap$$"),
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
              />
            ))}
        </div>
      )}
    </div>
  );
};

export default function Sidebar() {
  const dispatch = useDispatch();
  const router = useRouter();

  const { tree, virtualTree, workspaceId, activeProject, activeBranch } =
    useSelector((state) => state.fileSystem);
  const { isSidebarVisible, pendingCreation } = useSelector(
    (state) => state.ui,
  );

  const isVirtualMode = virtualTree !== null && virtualTree !== undefined;

  const inputRef = useRef(null);
  const [contextMenu, setContextMenu] = useState(null);

  const handleExpandProject = async (projectName) => {
    if (isVirtualMode) return;

    try {
      const branchToFetch =
        projectName === activeProject && activeBranch ? activeBranch : "master";
      const files = await fetchProjectFilesApi(
        workspaceId,
        projectName,
        branchToFetch,
      );
      dispatch(mergeProjectFiles({ projectName, files }));
    } catch (e) {
      console.error("파일 로드 실패:", e);
    }
  };

  useEffect(() => {
    if (workspaceId && activeProject && !isVirtualMode) {
      handleExpandProject(activeProject);
    }
  }, [activeBranch, workspaceId, activeProject, isVirtualMode]);

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
      const content = await fetchFileContentApi(
        workspaceId,
        targetProject,
        branchToFetch,
        targetFilePath,
      );
      dispatch(updateFileContent({ filePath: fileToOpen.id, content }));
    } catch (e) {
      console.error("파일 내용 로드 실패:", e);
    }
  };

  const refreshWorkspace = async () => {
    if (!workspaceId || isVirtualMode) return;

    try {
      const rootNode = await fetchWorkspaceProjectsApi(workspaceId);
      dispatch(setWorkspaceTree(rootNode));
      if (activeProject) handleExpandProject(activeProject);
    } catch (e) {
      console.error("워크스페이스 새로고침 실패:", e);
    }
  };

  const handleDeactivateVirtualView = async () => {
    if (
      !window.confirm("가상 뷰를 해제하고 원본 파일 구조로 돌아가시겠습니까?")
    )
      return;

    try {
      await deactivateVirtualViewApi(workspaceId, activeBranch);
      dispatch(clearVirtualTree());
    } catch (error) {
      alert("가상 뷰 해제에 실패했습니다: " + error.message);
    }
  };

  useEffect(() => {
    if (pendingCreation && pendingCreation.parentId === "root-folder" && inputRef.current) {
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
      } 
      else if (apiType === "java") {
        finalName = name.endsWith(".java") ? name : `${name}.java`;
        apiType = "file";

        const className = finalName.replace(".java", "");
        let packageName = "";
        
        if (parentId && parentId.includes("src/main/java/")) {
          packageName = parentId.split("src/main/java/")[1].replace(/\//g, ".");
        } else if (parentId && parentId !== "root-folder") {
          packageName = parentId.replace(/\//g, ".");
        }

        if (packageName) {
          skeletonCode = `package ${packageName};\n\npublic class ${className} {\n    \n}\n`;
        } else {
          skeletonCode = `public class ${className} {\n    \n}\n`;
        }
      }

      let path = finalName;
      if (parentId !== "root-folder" && parentId !== "") {
        path = parentId + "/" + finalName;
      }

      // 1. 빈 파일 생성
      await createFileApi(
        workspaceId,
        activeProject,
        activeBranch,
        path,
        apiType,
      );

      if (parentId === "root-folder" && apiType === "folder") {
        dispatch(setActiveProject(finalName));
        dispatch(writeToTerminal(`[System] 새 프로젝트 '${finalName}' 이(가) 시작 프로젝트로 자동 지정되었습니다.\n`));
        handleExpandProject(finalName);
      } else {
        handleExpandProject(activeProject);
      }

      // 2. 파일 열기 및 뼈대 코드 자동 저장 처리
      if (apiType === "file") {
        dispatch(openFile({ id: path, name: finalName, type: "file" }));
        
        if (skeletonCode) {
          // 프론트엔드 에디터 화면에 즉시 주입
          dispatch(updateFileContent({ filePath: path, content: skeletonCode }));
          
          // 💡 [핵심] 백엔드에도 즉시 자동 저장 요청!
          try {
            await saveFileApi(workspaceId, activeProject, activeBranch, path, skeletonCode);
            dispatch(writeToTerminal(`[System] ${finalName} 템플릿 생성 및 자동 저장 완료!\n`));
          } catch (saveError) {
            console.error("자동 저장 에러:", saveError);
            dispatch(writeToTerminal(`[System] 파일은 생성되었으나 자동 저장에 실패했습니다. (직접 저장해주세요)\n`));
          }
        }
      }
    } catch (e) {
      alert(e.message);
    }

    dispatch(endCreation());
  };

  const handleInputKeyDown = (e, parentId) => {
    if (e.key === "Enter") confirmInput(e.target.value.trim(), parentId);
    if (e.key === "Escape") dispatch(endCreation());
  };

  const handleContextMenu = (e, node, projectName) => {
    e.preventDefault();
    e.stopPropagation();
    if (isVirtualMode) return;

    const targetProj = projectName || activeProject;
    const isJavaEnv = targetProj?.toLowerCase().includes("스프링") || targetProj?.toLowerCase().includes("java") || targetProj?.toLowerCase().includes("demo");

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      fileId: node.id,
      path: node.id,
      type: node.type,
      isRoot: node.type === "project",
      isJavaEnv,
    });
  };

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  const handleDelete = async () => {
    if (!contextMenu) return;
    if (!window.confirm(`정말 '${contextMenu.path}'을(를) 삭제하시겠습니까?`))
      return;

    try {
      await deleteFileApi(
        workspaceId,
        activeProject,
        activeBranch,
        contextMenu.path,
      );
      dispatch(closeFilesByPath(contextMenu.path));
      handleExpandProject(activeProject);
    } catch (e) {
      alert("삭제 실패: " + e.message);
    }
  };

  const startRename = () => alert("이름 변경은 아직 지원하지 않습니다.");

  const handleSetStartup = () => {
    if (!contextMenu) return;
    const targetProject = contextMenu.fileId;
    dispatch(setActiveProject(targetProject));
    dispatch(
      writeToTerminal(
        `[System] 시작 프로젝트가 변경되었습니다: ${targetProject}\n`,
      ),
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

    dispatch(startCreation({ type: creationType, parentId }));
    setContextMenu(null);
  };

  if (!isSidebarVisible) return null;

  const displayTreeChildren = isVirtualMode
    ? virtualTree.children
    : tree?.children || [];

  return (
    <div className="h-full w-full bg-[#f8f9fa] flex flex-col font-sans shadow-[inset_-1px_0_0_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between px-4 h-9 border-b border-gray-200 shrink-0 bg-white">
        <span className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider">
          탐색기
        </span>

        <div className="flex items-center gap-2 text-gray-500">
          {!isVirtualMode && (
            <>
              <VscRefresh
                className="cursor-pointer hover:text-black transition-colors"
                onClick={refreshWorkspace}
                title="새로고침"
              />
              <VscNewFile
                className="cursor-pointer hover:text-black transition-colors"
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
              />
              <VscNewFolder
                className="cursor-pointer hover:text-black transition-colors"
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
              />
              <div className="w-[1px] h-3 bg-gray-300 mx-0.5"></div>
              <VscWand
                className="cursor-pointer text-indigo-500 hover:text-indigo-700 transition-colors"
                onClick={() => router.push("/rearrange")}
                title="재배치 매니저로 뷰 켜기"
              />
            </>
          )}

          <VscCollapseAll
            className="cursor-pointer hover:text-black transition-colors"
            title="모두 접기"
          />
        </div>
      </div>

      {isVirtualMode && (
        <div className="flex flex-col px-4 py-2 bg-indigo-50 border-b border-indigo-100 shrink-0 gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-extrabold text-indigo-700 flex items-center gap-1.5">
              <VscSparkle size={14} className="animate-pulse" />
              AI 뷰 적용 중
            </span>
            <button
              onClick={handleDeactivateVirtualView}
              className="text-[10px] font-bold bg-white text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded hover:bg-indigo-600 hover:text-white transition-colors shadow-sm"
            >
              원본 복구
            </button>
          </div>

          <span
            className="text-[10px] text-indigo-400 font-bold truncate"
            title={virtualTree.name}
          >
            적용된 뷰: {virtualTree.name}
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
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
            />
          ))
        ) : (
          <div className="p-4 text-xs text-gray-400 text-center mt-4 border border-dashed border-gray-300 mx-4 rounded-xl">
            {isVirtualMode
              ? "가상 뷰에 파일이 없습니다."
              : "프로젝트가 없습니다. 상단에서 생성해주세요."}
          </div>
        )}

        {pendingCreation && pendingCreation.parentId === "root-folder" && (
          <div className="pl-6 pr-4 py-1.5 mt-1">
            <input
              ref={inputRef}
              autoFocus
              className="bg-white text-gray-800 border border-blue-400 focus:border-blue-600 outline-none w-full h-7 px-2 text-xs rounded shadow-sm transition-colors"
              onKeyDown={(e) => handleInputKeyDown(e, pendingCreation.parentId)}
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
          className="fixed bg-white border border-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.1)] rounded-md py-1.5 w-56 z-[9999]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {contextMenu.isJavaEnv ? (
            <>
              <div
                className="px-4 py-1.5 hover:bg-gray-100 cursor-pointer text-[13px] flex items-center gap-2 text-gray-700 transition-colors"
                onClick={() => handleContextMenuNew("java")}
              >
                <VscSymbolClass size={14} className="text-orange-500" /> Java 클래스 (Class)
              </div>
              <div
                className="px-4 py-1.5 hover:bg-gray-100 cursor-pointer text-[13px] flex items-center gap-2 text-gray-700 transition-colors"
                onClick={() => handleContextMenuNew("package")}
              >
                <VscSymbolMisc size={14} className="text-yellow-600" /> 패키지 (Package)
              </div>
            </>
          ) : (
            <>
              <div
                className="px-4 py-1.5 hover:bg-gray-100 cursor-pointer text-[13px] flex items-center gap-2 text-gray-700 transition-colors"
                onClick={() => handleContextMenuNew("file")}
              >
                <VscNewFile size={14} className="text-gray-500" /> 새 파일 (New File)
              </div>
              <div
                className="px-4 py-1.5 hover:bg-gray-100 cursor-pointer text-[13px] flex items-center gap-2 text-gray-700 transition-colors"
                onClick={() => handleContextMenuNew("folder")}
              >
                <VscNewFolder size={14} className="text-gray-500" /> 새 폴더 (New Folder)
              </div>
            </>
          )}

          <div className="h-[1px] bg-gray-100 my-1 mx-2" />

          {contextMenu.isRoot && (
            <>
              <div
                className="px-4 py-1.5 hover:bg-blue-50 cursor-pointer text-[13px] flex items-center gap-2 text-gray-700 font-bold transition-colors"
                onClick={handleSetStartup}
              >
                <VscRocket size={14} className="text-blue-600" /> 시작 프로젝트로 설정
              </div>
              <div className="h-[1px] bg-gray-100 my-1 mx-2" />
            </>
          )}

          <div
            className="px-4 py-1.5 hover:bg-gray-100 cursor-pointer text-[13px] flex items-center gap-2 text-gray-700 transition-colors"
            onClick={startRename}
          >
            <VscEdit size={14} className="text-gray-500" /> Rename
          </div>

          <div
            className="px-4 py-1.5 hover:bg-red-50 cursor-pointer text-[13px] flex items-center gap-2 text-red-600 transition-colors"
            onClick={handleDelete}
          >
            <VscTrash size={14} /> Delete
          </div>
        </div>
      )}
    </div>
  );
}