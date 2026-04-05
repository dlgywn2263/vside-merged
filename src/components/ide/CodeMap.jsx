import React, {
  useMemo,
  useCallback,
  useState,
  useEffect,
  useRef,
} from "react";
import { createPortal } from "react-dom"; // 💡 [NEW] 모달을 최상단으로 띄우기 위한 Portal 임포트
import { useSelector, useDispatch } from "react-redux";
import ReactFlow, {
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
  applyNodeChanges,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  VscClose,
  VscGoToFile,
  VscFile,
  VscRefresh,
  VscLink,
  VscSymbolClass,
  VscSymbolInterface,
  VscSymbolEnum,
  VscAdd,
  VscTrash,
  VscSymbolVariable,
  VscSymbolMethod,
} from "react-icons/vsc";
import {
  closeCodeMap,
  setActiveActivity,
  setCodeMapMode,
} from "@/store/slices/uiSlice";

import {
  openFile,
  mergeProjectFiles,
  updateFileContent,
  closeFilesByPath,
  closeFile,
} from "@/store/slices/fileSystemSlice";
import {
  createCodeMapComponentApi,
  createCodeMapRelationApi,
  deleteCodeMapRelationApi,
  fetchProjectFilesApi,
  fetchFileContentApi,
  deleteFileApi,
  generateCodeComponentApi,
} from "@/lib/ide/api";

const CustomNode = ({ data }) => {
  let roleColor = "text-gray-500";
  let borderStyle = "border-gray-200";
  let displayRole = "FILE";

  if (data.role === "main") {
    displayRole = "ENTRY POINT";
    roleColor = "text-red-500";
    borderStyle = "border-red-400 ring-4 ring-red-50";
  } else if (data.role === "interface") {
    displayRole = "INTERFACE";
    roleColor = "text-purple-500";
    borderStyle = "border-purple-400 ring-4 ring-purple-50";
  } else if (data.role === "abstract") {
    displayRole = "ABSTRACT CLASS";
    roleColor = "text-orange-500";
    borderStyle = "border-orange-400 ring-4 ring-orange-50 border-dashed";
  } else if (data.role === "class") {
    displayRole = "CONCRETE CLASS";
    roleColor = "text-blue-500";
    borderStyle = "border-blue-400 ring-4 ring-blue-50";
  } else if (data.role === "enum") {
    displayRole = "ENUM";
    roleColor = "text-green-500";
    borderStyle = "border-green-400 ring-4 ring-green-50";
  } else if (data.role === "exception") {
    displayRole = "EXCEPTION";
    roleColor = "text-rose-500";
    borderStyle = "border-rose-400 ring-4 ring-rose-50";
  }

  const TypeIcon =
    data.type === "INTERFACE"
      ? VscSymbolInterface
      : data.type === "ENUM"
        ? VscSymbolEnum
        : VscSymbolClass;

  const isGeneral = data.role === "file";
  const cardPadding = isGeneral ? "px-4 py-3" : "px-6 py-5";
  const cardWidth = isGeneral ? "min-w-[180px]" : "min-w-[240px]";
  const titleSize = isGeneral ? "text-[13px]" : "text-[15px]";

  return (
    <div className="flex flex-col items-center group cursor-pointer hover:-translate-y-1 transition-transform">
      {data.showLayerLabel && (
        <div className="text-[11px] font-extrabold text-gray-500 mb-2 tracking-wide">
          {data.layerName}
        </div>
      )}

      <div
        className={`relative ${cardPadding} bg-white rounded-xl border-2 ${borderStyle} shadow-sm group-hover:shadow-lg ${cardWidth} text-center transition-all duration-300`}
      >
        <Handle
          type="target"
          position={Position.Top}
          className="w-full h-4 top-[-8px] opacity-0 hover:opacity-50 bg-blue-400 z-50 transition-opacity"
        />
        <div
          className={`text-[9px] font-extrabold ${roleColor} uppercase tracking-widest mb-1.5 flex items-center justify-center gap-1`}
        >
          <TypeIcon size={12} /> {displayRole}
        </div>
        <div
          className={`${titleSize} font-bold text-gray-900 truncate`}
          title={data.label}
        >
          {data.label}
        </div>
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-full h-4 bottom-[-8px] opacity-0 hover:opacity-50 bg-blue-400 z-50 transition-opacity"
        />
      </div>
    </div>
  );
};

const nodeTypes = { custom: CustomNode };

export default function CodeMap() {
  const dispatch = useDispatch();
  const { workspaceId, activeProject, activeBranch, activeFileId } =
    useSelector((state) => state.fileSystem);
  const { codeMapMode } = useSelector((state) => state.ui);

  const isSplit = codeMapMode === "split" || codeMapMode === "SPLIT";
  const isFull = codeMapMode === "full" || codeMapMode === "FULL";

  const [rfNodes, setRfNodes] = useState([]);
  const [rfEdges, setRfEdges] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);

  const [aiSummary, setAiSummary] = useState("");
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  const lastRequestKeyRef = useRef("");

  // 컨텍스트 메뉴 상태
  const [contextMenuPos, setContextMenuPos] = useState(null);
  const [nodeContextMenu, setNodeContextMenu] = useState(null);
  const [edgeContextMenu, setEdgeContextMenu] = useState(null);

  // 새 컴포넌트 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCompName, setNewCompName] = useState("");
  const [newCompType, setNewCompType] = useState("CLASS");

  // 관계 주입 상태
  const [pendingRelation, setPendingRelation] = useState(null);
  const [relationType, setRelationType] = useState("COMPOSITION");

  // 💡 내부 코드 주입 (변수/메서드) 모달용 상태
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [genTargetType, setGenTargetType] = useState("VARIABLE");
  const [genAccessModifier, setGenAccessModifier] = useState("private");
  const [genDataType, setGenDataType] = useState("String");
  const [genName, setGenName] = useState("");
  const [genInitialValue, setGenInitialValue] = useState("");
  const [genParameters, setGenParameters] = useState("");
  const [genBody, setGenBody] = useState("");

  const isMapTab =
    activeFileId === "Architecture Map" ||
    activeFileId === "CodeMap" ||
    activeFileId?.includes("codemap");

  useEffect(() => {
    if (codeMapMode === "full" && !isMapTab) {
      dispatch(closeCodeMap());
    }
  }, [codeMapMode, isMapTab, dispatch]);

  useEffect(() => {
    if (isMapTab && !codeMapMode) {
      dispatch(setCodeMapMode("full"));
    }
  }, [isMapTab, codeMapMode, dispatch]);

  const onNodesChange = useCallback(
    (changes) => setRfNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );

  const onConnect = useCallback((connection) => {
    if (connection.source === connection.target) return;
    setPendingRelation({
      source: connection.source,
      target: connection.target,
    });
  }, []);

  const onPaneContextMenu = useCallback((event) => {
    event.preventDefault();
    setNodeContextMenu(null);
    setEdgeContextMenu(null);
    setContextMenuPos({ x: event.clientX, y: event.clientY });
  }, []);

  const onNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    setContextMenuPos(null);
    setEdgeContextMenu(null);
    setNodeContextMenu({ x: event.clientX, y: event.clientY, node });
  }, []);

  const onEdgeContextMenu = useCallback((event, edge) => {
    event.preventDefault();
    setContextMenuPos(null);
    setNodeContextMenu(null);
    setEdgeContextMenu({ x: event.clientX, y: event.clientY, edge });
  }, []);

  useEffect(() => {
    const handleClick = () => {
      setContextMenuPos(null);
      setNodeContextMenu(null);
      setEdgeContextMenu(null);
    };
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  const fetchAndLayoutCodeMap = useCallback(
    async (isRefresh = false) => {
      if (!workspaceId || !activeProject) return;

      const branch = activeBranch || "master";
      const currentRequestKey = `${workspaceId}-${activeProject}-${branch}`;

      if (
        !isRefresh &&
        lastRequestKeyRef.current === currentRequestKey &&
        rfNodes.length > 0
      )
        return;

      lastRequestKeyRef.current = currentRequestKey;
      setIsLoading(true);
      setSelectedNode(null);

      try {
        const response = await fetch(
          `http://localhost:8080/api/codemap/analyze?workspaceId=${workspaceId}&projectName=${activeProject}&branchName=${branch}&language=JAVA`,
        );
        if (!response.ok) throw new Error("분석 데이터를 가져오지 못했습니다.");

        const data = await response.json();
        const { nodes: backendNodes, edges: backendEdges } = data;

        const grouped = {
          main: [],
          abstractions: [],
          concrete: [],
          others: [],
          file: [],
        };

        backendNodes.forEach((node) => {
          if (node.role === "main") grouped.main.push(node);
          else if (node.role === "interface" || node.role === "abstract")
            grouped.abstractions.push(node);
          else if (node.role === "class") grouped.concrete.push(node);
          else if (node.role === "enum" || node.role === "exception")
            grouped.others.push(node);
          else grouped.file.push(node);
        });

        const generatedNodes = [];
        let currentY = 50;
        const layerGapY = 160;
        const nodeWidth = 260;
        const nodeGapX = 40;

        const layoutLayer = (nodesInLayer, layerName) => {
          if (nodesInLayer.length === 0) return;
          const totalWidth =
            nodesInLayer.length * nodeWidth +
            (nodesInLayer.length - 1) * nodeGapX;
          let startX = -(totalWidth / 2) + nodeWidth / 2;

          nodesInLayer.forEach((n, idx) => {
            generatedNodes.push({
              id: n.id,
              type: "custom",
              position: {
                x: startX + idx * (nodeWidth + nodeGapX),
                y: currentY,
              },
              data: { ...n, layerName: layerName, showLayerLabel: idx === 0 },
            });
          });
          currentY += layerGapY;
        };

        const layoutGrid = (nodesInLayer, gridLabel) => {
          if (nodesInLayer.length === 0) return;
          currentY += 20;
          const cols = 4;
          const smallWidth = 180,
            smallGapX = 20,
            smallGapY = 80;

          nodesInLayer.forEach((n, idx) => {
            const row = Math.floor(idx / cols);
            const col = idx % cols;
            const itemsInRow =
              row === Math.ceil(nodesInLayer.length / cols) - 1
                ? nodesInLayer.length % cols || cols
                : cols;
            const startX =
              -((itemsInRow * smallWidth + (itemsInRow - 1) * smallGapX) / 2) +
              smallWidth / 2;

            generatedNodes.push({
              id: n.id,
              type: "custom",
              position: {
                x: startX + col * (smallWidth + smallGapX),
                y: currentY + row * smallGapY,
              },
              data: { ...n, layerName: gridLabel, showLayerLabel: idx === 0 },
            });
          });
          currentY += Math.ceil(nodesInLayer.length / cols) * smallGapY + 50;
        };

        layoutLayer(grouped.main, "🚀 실행 진입점 (Entry Point)");
        layoutLayer(
          grouped.abstractions,
          "💡 추상화 계층 (Interfaces & Abstract Classes)",
        );
        layoutLayer(grouped.concrete, "🧱 구현체 (Concrete Classes)");

        const remainingOthers = [...grouped.others, ...grouped.file];
        layoutGrid(remainingOthers, "📦 열거형, 예외 및 일반 객체");

        const generatedEdges = backendEdges.map((e) => {
          let strokeColor = "#94a3b8";
          let strokeDasharray = "5 5";
          let animated = false;
          const rType = e.relationType;

          if (rType === "IMPLEMENTS") {
            strokeColor = "#10b981";
            strokeDasharray = "5 5";
            animated = true;
          } else if (rType === "EXTENDS") {
            strokeColor = "#3b82f6";
            strokeDasharray = "none";
            animated = true;
          } else if (rType === "COMPOSITION") {
            strokeColor = "#6366f1";
            strokeDasharray = "none";
            animated = true;
          }

          return {
            id: e.id,
            source: e.source,
            target: e.target,
            type: "smoothstep",
            animated: animated,
            style: {
              stroke: strokeColor,
              strokeWidth: 2,
              strokeDasharray: strokeDasharray,
            },
            markerEnd: { type: MarkerType.ArrowClosed, color: strokeColor },
            data: { relationType: rType },
          };
        });

        setRfNodes(generatedNodes);
        setRfEdges(generatedEdges);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId, activeProject, activeBranch, rfNodes.length],
  );

  useEffect(() => {
    fetchAndLayoutCodeMap();
  }, [fetchAndLayoutCodeMap]);

  useEffect(() => {
    if (selectedNode && selectedNode.id) {
      setAiSummary("");
      setIsSummaryLoading(true);
      const branch = activeBranch || "master";
      fetch(
        `http://localhost:8080/api/codemap/summary?workspaceId=${workspaceId}&projectName=${activeProject}&branchName=${branch}&filePath=${encodeURIComponent(selectedNode.id)}`,
      )
        .then((res) => res.text())
        .then((text) => setAiSummary(text))
        .catch(() => setAiSummary("AI 요약 오류"))
        .finally(() => setIsSummaryLoading(false));
    }
  }, [selectedNode, workspaceId, activeProject, activeBranch]);

  const handleNodeClick = useCallback((event, node) => {
    setSelectedNode(node.data);
  }, []);

  const openFileInEditor = async () => {
    if (selectedNode && selectedNode.id) {
      try {
        let filePath = selectedNode.id;
        if (!filePath.endsWith(".java")) filePath += ".java";

        dispatch(
          openFile({
            id: filePath,
            name: filePath.split("/").pop(),
            type: "file",
          }),
        );
        const content = await fetchFileContentApi(
          workspaceId,
          activeProject,
          activeBranch || "master",
          filePath,
        );
        dispatch(updateFileContent({ filePath: filePath, content: content }));

        dispatch(setActiveActivity("editor"));
        if (!isSplit) dispatch(closeCodeMap());
      } catch (error) {
        alert("파일 내용을 불러오는데 실패했습니다: " + error.message);
      }
    }
  };

  const handleCreateComponentSubmit = async () => {
    if (!newCompName.trim())
      return alert("컴포넌트(클래스) 이름을 입력해주세요!");
    try {
      setIsLoading(true);
      await createCodeMapComponentApi(
        workspaceId,
        activeProject,
        activeBranch || "master",
        newCompName,
        newCompType,
      );
      setIsModalOpen(false);
      setNewCompName("");
      alert("✨ 컴포넌트가 성공적으로 생성되었습니다!");
      await fetchAndLayoutCodeMap(true);
      const files = await fetchProjectFilesApi(
        workspaceId,
        activeProject,
        activeBranch || "master",
      );
      dispatch(mergeProjectFiles({ projectName: activeProject, files }));
    } catch (e) {
      alert("생성 실패: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRelationSubmit = async () => {
    if (!pendingRelation) return;
    try {
      setIsLoading(true);
      await createCodeMapRelationApi(
        workspaceId,
        activeProject,
        activeBranch || "master",
        pendingRelation.source,
        pendingRelation.target,
        relationType,
      );
      alert(`🔗 코드가 성공적으로 삽입되었습니다!`);
      setPendingRelation(null);

      await fetchAndLayoutCodeMap(true);

      let sourcePath = pendingRelation.source;
      if (!sourcePath.endsWith(".java")) sourcePath += ".java";

      if (activeFileId === sourcePath || isSplit) {
        const newContent = await fetchFileContentApi(
          workspaceId,
          activeProject,
          activeBranch || "master",
          sourcePath,
        );
        dispatch(
          updateFileContent({ filePath: sourcePath, content: newContent }),
        );
      }
    } catch (e) {
      alert("관계 연결 실패: " + e.message);
      setPendingRelation(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteNode = async () => {
    if (!nodeContextMenu) return;
    const nodeData = nodeContextMenu.node.data;
    if (
      !window.confirm(
        `정말 '${nodeData.label}' 컴포넌트를 완전히 삭제하시겠습니까?\n실제 파일도 영구 삭제됩니다.`,
      )
    )
      return;

    try {
      setIsLoading(true);
      let filePath = nodeData.id;
      if (!filePath.endsWith(".java")) filePath += ".java";

      await deleteFileApi(
        workspaceId,
        activeProject,
        activeBranch || "master",
        filePath,
      );

      dispatch(closeFilesByPath(filePath));
      const files = await fetchProjectFilesApi(
        workspaceId,
        activeProject,
        activeBranch || "master",
      );
      dispatch(mergeProjectFiles({ projectName: activeProject, files }));

      alert("🗑️ 컴포넌트가 삭제되었습니다.");
      setNodeContextMenu(null);
      if (selectedNode && selectedNode.id === nodeData.id)
        setSelectedNode(null);
      await fetchAndLayoutCodeMap(true);
    } catch (e) {
      alert("삭제 실패: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEdge = async () => {
    if (!edgeContextMenu) return;
    const { source, target, data } = edgeContextMenu.edge;
    const rType = data?.relationType || "COMPOSITION";

    if (
      !window.confirm(
        `정말 이 의존성(${rType}) 코드를 삭제하시겠습니까?\n소스 코드 내부에서 해당 관계가 지워집니다.`,
      )
    )
      return;

    try {
      setIsLoading(true);
      await deleteCodeMapRelationApi(
        workspaceId,
        activeProject,
        activeBranch || "master",
        source,
        target,
        rType,
      );

      alert("🔗 관계(코드)가 성공적으로 삭제되었습니다.");
      setEdgeContextMenu(null);
      await fetchAndLayoutCodeMap(true);

      let sourcePath = source;
      if (!sourcePath.endsWith(".java")) sourcePath += ".java";
      if (activeFileId === sourcePath || isSplit) {
        const newContent = await fetchFileContentApi(
          workspaceId,
          activeProject,
          activeBranch || "master",
          sourcePath,
        );
        dispatch(
          updateFileContent({ filePath: sourcePath, content: newContent }),
        );
      }
    } catch (e) {
      alert("관계 삭제 실패: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 💡 내부 코드 조작 API 호출 함수
  const handleGenerateSubmit = async () => {
    if (!genName.trim() || !genDataType.trim())
      return alert("타입과 이름을 모두 입력해주세요!");
    try {
      setIsLoading(true);
      const payload = {
        className: selectedNode.label,
        targetType: genTargetType,
        accessModifier: genAccessModifier,
        dataType: genDataType,
        name: genName,
        initialValue: genInitialValue,
        parameters: genParameters,
        body: genBody,
      };

      await generateCodeComponentApi(
        workspaceId,
        activeProject,
        activeBranch || "master",
        payload,
      );

      alert(
        `✨ ${genTargetType === "VARIABLE" ? "변수가" : "메서드가"} 성공적으로 추가되었습니다!`,
      );
      setIsGenerateModalOpen(false);

      // 폼 초기화
      setGenName("");
      setGenInitialValue("");
      setGenParameters("");
      setGenBody("");
      setGenDataType("String");

      await fetchAndLayoutCodeMap(true);

      let filePath = selectedNode.id;
      if (!filePath.endsWith(".java")) filePath += ".java";
      if (activeFileId === filePath || isSplit) {
        const newContent = await fetchFileContentApi(
          workspaceId,
          activeProject,
          activeBranch || "master",
          filePath,
        );
        dispatch(
          updateFileContent({ filePath: filePath, content: newContent }),
        );
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const dependencies = useMemo(() => {
    if (!selectedNode) return { imports: [], importedBy: [] };
    const imports = rfEdges
      .filter((e) => e.source === selectedNode.id)
      .map((e) => rfNodes.find((n) => n.id === e.target)?.data)
      .filter(Boolean);
    const importedBy = rfEdges
      .filter((e) => e.target === selectedNode.id)
      .map((e) => rfNodes.find((n) => n.id === e.source)?.data)
      .filter(Boolean);
    return { imports, importedBy };
  }, [selectedNode, rfEdges, rfNodes]);

  const panelSizeClass = isSplit
    ? "absolute right-4 top-4 w-[280px] max-h-[calc(100%-2rem)]"
    : "absolute right-10 top-10 w-[340px] max-h-[calc(100%-5rem)]";

  if (!codeMapMode) return null;

  const wrapperClass = isFull
    ? "absolute inset-0 z-[500] flex flex-col w-full h-full bg-[#fafafa]"
    : "flex-1 flex flex-col relative w-full h-full min-h-0 bg-[#fafafa]";

  return (
    <div className={wrapperClass}>
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <h2 className="text-[15px] font-extrabold text-gray-900">
            Architecture Map (OOP)
          </h2>
          {isLoading ? (
            <div className="flex items-center gap-1.5 text-blue-600 text-xs font-bold bg-blue-50 px-2 py-1 rounded">
              <VscRefresh className="animate-spin" size={14} /> 맵 동기화 중...
            </div>
          ) : (
            <div className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded flex items-center gap-1">
              <VscFile /> 총 {rfNodes.length}개 컴포넌트 감지됨
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold shadow-sm flex items-center gap-1 transition-colors"
          >
            <VscAdd size={14} /> 새 컴포넌트
          </button>
          <button
            onClick={() => fetchAndLayoutCodeMap(true)}
            className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 rounded text-gray-700 transition-colors text-xs font-bold shadow-sm flex items-center gap-1"
          >
            <VscRefresh size={14} /> 새로고침
          </button>
          <button
            onClick={() => {
              dispatch(closeCodeMap());
              if (isMapTab) dispatch(closeFile(activeFileId));
            }}
            className="ml-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
            title="코드맵 닫기"
          >
            <VscClose size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 relative w-full min-h-0">
        <div className="absolute inset-0">
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            onPaneClick={() => setSelectedNode(null)}
            onPaneContextMenu={onPaneContextMenu}
            onNodeContextMenu={onNodeContextMenu}
            onEdgeContextMenu={onEdgeContextMenu}
            fitView
            fitViewOptions={{ padding: isSplit ? 0.2 : 0.15 }}
            attributionPosition="bottom-right"
            minZoom={0.1}
          >
            <Background color="#e2e8f0" gap={16} />{" "}
            <Controls className="shadow-md border border-gray-200 rounded-lg bg-white" />
          </ReactFlow>
        </div>

        {/* 캔버스 배경 우클릭 메뉴 */}
        {contextMenuPos && (
          <div
            className="fixed bg-white border border-gray-200 shadow-xl rounded-lg py-1.5 w-48 z-[9999]"
            style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
          >
            <div
              className="px-4 py-2 hover:bg-blue-50 hover:text-blue-700 cursor-pointer text-[13px] font-bold text-gray-700 flex items-center gap-2 transition-colors"
              onClick={() => {
                setContextMenuPos(null);
                setIsModalOpen(true);
              }}
            >
              <VscAdd size={16} className="text-blue-500" /> 새 컴포넌트 생성...
            </div>
          </div>
        )}

        {/* 노드(클래스) 우클릭 메뉴 */}
        {nodeContextMenu && (
          <div
            className="fixed bg-white border border-gray-200 shadow-xl rounded-lg py-1.5 w-48 z-[9999]"
            style={{ top: nodeContextMenu.y, left: nodeContextMenu.x }}
          >
            <div className="px-3 py-1.5 border-b border-gray-100 bg-gray-50">
              <span className="text-xs font-bold text-gray-600 truncate block">
                {nodeContextMenu.node.data.label}
              </span>
            </div>
            <div
              className="px-4 py-2 hover:bg-red-50 hover:text-red-700 cursor-pointer text-[13px] font-bold text-red-600 flex items-center gap-2 transition-colors"
              onClick={handleDeleteNode}
            >
              <VscTrash size={16} /> 컴포넌트 삭제
            </div>
          </div>
        )}

        {/* 선(엣지) 우클릭 메뉴 */}
        {edgeContextMenu && (
          <div
            className="fixed bg-white border border-gray-200 shadow-xl rounded-lg py-1.5 w-48 z-[9999]"
            style={{ top: edgeContextMenu.y, left: edgeContextMenu.x }}
          >
            <div className="px-3 py-1.5 border-b border-gray-100 bg-gray-50">
              <span className="text-[11px] font-bold text-gray-500 block">
                의존성 관계 (
                {edgeContextMenu.edge.data?.relationType || "IMPORT"})
              </span>
            </div>
            <div
              className="px-4 py-2 hover:bg-red-50 hover:text-red-700 cursor-pointer text-[13px] font-bold text-red-600 flex items-center gap-2 transition-colors"
              onClick={handleDeleteEdge}
            >
              <VscLink size={16} className="rotate-45" /> 관계(코드) 끊기
            </div>
          </div>
        )}

        {/* 💡 [FIX] 내부 코드 조작 (변수/메서드 추가) 모달 - Portal 적용됨! */}
        {isGenerateModalOpen &&
          createPortal(
            <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-[440px] flex flex-col overflow-hidden animate-fade-in-up">
                <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="font-extrabold text-gray-800 flex items-center gap-2">
                    {genTargetType === "VARIABLE" ? (
                      <VscSymbolVariable
                        className="text-indigo-600"
                        size={18}
                      />
                    ) : (
                      <VscSymbolMethod className="text-green-600" size={18} />
                    )}
                    {genTargetType === "VARIABLE"
                      ? "멤버 변수 추가"
                      : "멤버 메서드 추가"}
                  </h3>
                  <button
                    onClick={() => setIsGenerateModalOpen(false)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <VscClose size={20} />
                  </button>
                </div>
                <div className="p-6 flex flex-col gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  <div className="bg-blue-50 text-blue-700 text-[11px] font-bold px-3 py-2 rounded-lg border border-blue-100 flex items-center gap-2 shrink-0">
                    <VscFile size={14} /> 대상 클래스: {selectedNode?.label}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-bold text-gray-600 mb-1.5">
                        접근 제어자
                      </label>
                      <select
                        value={genAccessModifier}
                        onChange={(e) => setGenAccessModifier(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                      >
                        <option value="private">private</option>
                        <option value="protected">protected</option>
                        <option value="public">public</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-gray-600 mb-1.5">
                        반환/데이터 타입
                      </label>
                      <input
                        type="text"
                        placeholder="예: String, void"
                        value={genDataType}
                        onChange={(e) => setGenDataType(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm font-mono focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-gray-600 mb-1.5">
                      {genTargetType === "VARIABLE" ? "변수명" : "메서드명"}
                    </label>
                    <input
                      type="text"
                      placeholder={
                        genTargetType === "VARIABLE"
                          ? "예: count"
                          : "예: calculateSum"
                      }
                      value={genName}
                      onChange={(e) =>
                        setGenName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))
                      }
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-mono focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  {/* 변수용 추가 폼 */}
                  {genTargetType === "VARIABLE" && (
                    <div>
                      <label className="block text-[12px] font-bold text-gray-600 mb-1.5">
                        초기값 (선택)
                      </label>
                      <input
                        type="text"
                        placeholder='예: 100 또는 "홍길동"'
                        value={genInitialValue}
                        onChange={(e) => setGenInitialValue(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-mono focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  )}

                  {/* 메서드용 추가 폼 */}
                  {genTargetType === "METHOD" && (
                    <>
                      <div>
                        <label className="block text-[12px] font-bold text-gray-600 mb-1.5">
                          파라미터 (선택, 콤마로 구분)
                        </label>
                        <input
                          type="text"
                          placeholder="예: String name, int age"
                          value={genParameters}
                          onChange={(e) => setGenParameters(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-mono focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-bold text-gray-600 mb-1.5">
                          메서드 내용 (선택)
                        </label>
                        <textarea
                          placeholder="예: this.name = name;&#10;return true;"
                          value={genBody}
                          onChange={(e) => setGenBody(e.target.value)}
                          rows={3}
                          className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-mono focus:ring-1 focus:ring-blue-500 outline-none custom-scrollbar resize-none"
                        />
                      </div>
                    </>
                  )}
                </div>
                <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end gap-2 shrink-0">
                  <button
                    onClick={() => setIsGenerateModalOpen(false)}
                    className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-lg"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleGenerateSubmit}
                    disabled={!genName.trim() || isLoading}
                    className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg flex items-center gap-1"
                  >
                    주입하기
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}

        {/* 💡 [FIX] 기본 새 컴포넌트 모달 - Portal 적용됨! */}
        {isModalOpen &&
          createPortal(
            <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-[400px] flex flex-col overflow-hidden animate-fade-in-up">
                <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="font-extrabold text-gray-800 flex items-center gap-2">
                    <VscSymbolClass className="text-blue-600" size={18} /> 새
                    자바 컴포넌트 생성
                  </h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <VscClose size={20} />
                  </button>
                </div>
                <div className="p-6 flex flex-col gap-5">
                  <div>
                    <label className="block text-[12px] font-bold text-gray-600 mb-1.5">
                      컴포넌트 (클래스) 이름
                    </label>
                    <input
                      type="text"
                      placeholder="예: PaymentProcessor"
                      value={newCompName}
                      onChange={(e) =>
                        setNewCompName(
                          e.target.value.replace(/[^a-zA-Z0-9_]/g, ""),
                        )
                      }
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-gray-600 mb-1.5">
                      객체 지향 타입 (Type)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {["CLASS", "INTERFACE", "ABSTRACT", "EXCEPTION"].map(
                        (t) => (
                          <label
                            key={t}
                            className={`border rounded-lg p-2 flex items-center gap-2 cursor-pointer transition-colors ${newCompType === t ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 hover:bg-gray-50"}`}
                          >
                            <input
                              type="radio"
                              name="compType"
                              value={t}
                              checked={newCompType === t}
                              onChange={() => setNewCompType(t)}
                              className="hidden"
                            />
                            <span className="text-xs font-bold">{t}</span>
                          </label>
                        ),
                      )}
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end gap-2">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-lg"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleCreateComponentSubmit}
                    disabled={!newCompName.trim() || isLoading}
                    className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg flex items-center gap-1"
                  >
                    생성
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}

        {/* 💡 [FIX] 관계 주입 모달 - Portal 적용됨! */}
        {pendingRelation &&
          createPortal(
            <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-[420px] flex flex-col overflow-hidden animate-fade-in-up">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 flex justify-between items-center text-white">
                  <h3 className="font-extrabold flex items-center gap-2">
                    <VscLink size={18} /> 객체지향 관계 주입
                  </h3>
                  <button
                    onClick={() => setPendingRelation(null)}
                    className="text-blue-100 hover:text-white transition-colors"
                  >
                    <VscClose size={20} />
                  </button>
                </div>
                <div className="p-6 flex flex-col gap-4">
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="flex flex-col text-center">
                      <span className="text-[10px] text-gray-500 font-bold mb-1">
                        Source (주입받을 곳)
                      </span>
                      <span className="text-sm font-mono font-bold text-blue-700">
                        {pendingRelation.source
                          .split("/")
                          .pop()
                          .replace(".java", "")}
                      </span>
                    </div>
                    <VscLink size={20} className="text-gray-400 rotate-45" />
                    <div className="flex flex-col text-center">
                      <span className="text-[10px] text-gray-500 font-bold mb-1">
                        Target (주입할 객체)
                      </span>
                      <span className="text-sm font-mono font-bold text-indigo-700">
                        {pendingRelation.target
                          .split("/")
                          .pop()
                          .replace(".java", "")}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-gray-600 mb-2">
                      어떤 관계로 연결하시겠습니까?
                    </label>
                    <div className="flex flex-col gap-2">
                      <label
                        className={`border rounded-lg p-3 flex flex-col cursor-pointer transition-colors ${relationType === "EXTENDS" ? "border-blue-500 bg-blue-50 shadow-sm" : "border-gray-200 hover:bg-gray-50"}`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={relationType === "EXTENDS"}
                            onChange={() => setRelationType("EXTENDS")}
                            className="hidden"
                          />
                          <span className="font-bold text-blue-700 text-sm">
                            상속 (Extends)
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-500 mt-1 pl-1">
                          Source 클래스가 Target 클래스를 상속받습니다.
                        </span>
                      </label>
                      <label
                        className={`border rounded-lg p-3 flex flex-col cursor-pointer transition-colors ${relationType === "IMPLEMENTS" ? "border-green-500 bg-green-50 shadow-sm" : "border-gray-200 hover:bg-gray-50"}`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={relationType === "IMPLEMENTS"}
                            onChange={() => setRelationType("IMPLEMENTS")}
                            className="hidden"
                          />
                          <span className="font-bold text-green-700 text-sm">
                            구현 (Implements)
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-500 mt-1 pl-1">
                          Source 클래스가 Target 인터페이스를 구현합니다.
                        </span>
                      </label>
                      <label
                        className={`border rounded-lg p-3 flex flex-col cursor-pointer transition-colors ${relationType === "COMPOSITION" ? "border-purple-500 bg-purple-50 shadow-sm" : "border-gray-200 hover:bg-gray-50"}`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={relationType === "COMPOSITION"}
                            onChange={() => setRelationType("COMPOSITION")}
                            className="hidden"
                          />
                          <span className="font-bold text-purple-700 text-sm">
                            참조/합성 (Composition)
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-500 mt-1 pl-1">
                          Source 내부에 Target 객체를 필드(변수)로 선언합니다.
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end gap-2">
                  <button
                    onClick={() => setPendingRelation(null)}
                    className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-lg"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleRelationSubmit}
                    disabled={isLoading}
                    className="px-5 py-2 text-sm font-bold text-white bg-gray-900 hover:bg-black rounded-lg flex items-center gap-1"
                  >
                    {isLoading ? (
                      <VscRefresh className="animate-spin" />
                    ) : (
                      <VscLink />
                    )}{" "}
                    관계 코드 주입하기
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}

        {/* 하단 맵 범례 (Legend) */}
        <div className="absolute left-4 bottom-4 bg-white/95 backdrop-blur-md p-4 rounded-xl border border-gray-200 shadow-lg z-10 flex flex-col pointer-events-none w-[360px]">
          <div className="text-[12px] font-extrabold text-gray-800 border-b border-gray-100 pb-2 mb-3 flex items-center gap-1.5">
            🎨 아키텍처 맵 범례 (Legend)
          </div>
          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-2 border-r border-gray-100 pr-4">
              <div className="text-[10px] font-bold text-gray-400 mb-1">
                컴포넌트 역할
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full bg-red-50 border-2 border-red-400"></span>{" "}
                실행 진입점 (Main)
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-50 border-2 border-purple-400"></span>{" "}
                인터페이스
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-50 border-2 border-orange-400 border-dashed"></span>{" "}
                추상 클래스
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-50 border-2 border-blue-400"></span>{" "}
                구현 클래스
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-50 border-2 border-rose-400"></span>{" "}
                예외 (Exception)
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <div className="text-[10px] font-bold text-gray-400 mb-1">
                의존성 및 관계 (Edges)
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600">
                <div className="w-5 h-[2px] bg-blue-500 rounded-full relative">
                  <div className="absolute -right-1 -top-1 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-blue-500"></div>
                </div>{" "}
                상속 (Extends)
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600">
                <div className="w-5 h-[2px] border-b-2 border-dashed border-green-500 relative">
                  <div className="absolute -right-1 -top-[3px] border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-green-500"></div>
                </div>{" "}
                구현 (Implements)
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600">
                <div className="w-5 h-[2px] border-b-2 border-dashed border-[#6366f1] relative">
                  <div className="absolute -right-1 -top-[3px] border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-[#6366f1]"></div>
                </div>{" "}
                참조 (Composition)
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600">
                <div className="w-5 h-[2px] border-b-2 border-dashed border-gray-400 relative">
                  <div className="absolute -right-1 -top-[3px] border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-gray-400"></div>
                </div>{" "}
                단순 참조 (Import)
              </div>
            </div>
          </div>
        </div>

        {/* 우측 컴포넌트 개요 패널 */}
        {selectedNode && (
          <div
            className={`${panelSizeClass} bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)] rounded-2xl z-[100] flex flex-col overflow-hidden animate-fade-in border border-gray-100`}
          >
            <div className={`p-6 overflow-y-auto custom-scrollbar flex-1`}>
              <h3 className="font-extrabold text-gray-900 text-lg mb-4">
                컴포넌트 개요
              </h3>
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm relative overflow-hidden">
                  <div className="text-[12px] font-extrabold text-indigo-800 mb-2 flex items-center gap-1.5">
                    <span className="text-base animate-pulse">✨</span> AI
                    컴포넌트 분석
                  </div>
                  {isSummaryLoading ? (
                    <div className="animate-pulse flex flex-col gap-2 mt-2">
                      <div className="h-2.5 bg-blue-200/50 rounded w-full"></div>
                      <div className="h-2.5 bg-blue-200/50 rounded w-5/6"></div>
                      <div className="h-2.5 bg-blue-200/50 rounded w-4/6"></div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-gray-700 leading-relaxed font-semibold whitespace-pre-wrap">
                      {aiSummary}
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="text-[10px] font-bold text-gray-400 mb-0.5">
                    파일 이름
                  </div>
                  <div
                    className="text-[13px] font-bold text-blue-600 truncate"
                    title={selectedNode.label}
                  >
                    {selectedNode.label}.java
                  </div>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[10px] font-bold bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                      {selectedNode.type}
                    </span>
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase">
                      {selectedNode.role}
                    </span>
                  </div>
                </div>

                {/* 내부 코드 조작 버튼 */}
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 mb-2">
                    <VscAdd /> 클래스 내부 구조 조작
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setGenTargetType("VARIABLE");
                        setGenAccessModifier("private");
                        setIsGenerateModalOpen(true);
                      }}
                      className="flex-1 py-2 bg-white border border-gray-200 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg text-[11px] font-bold text-gray-600 transition-all shadow-sm flex flex-col items-center gap-1"
                    >
                      <VscSymbolVariable size={16} /> 변수 추가
                    </button>
                    <button
                      onClick={() => {
                        setGenTargetType("METHOD");
                        setGenAccessModifier("public");
                        setIsGenerateModalOpen(true);
                      }}
                      className="flex-1 py-2 bg-white border border-gray-200 hover:border-green-400 hover:text-green-600 hover:bg-green-50 rounded-lg text-[11px] font-bold text-gray-600 transition-all shadow-sm flex flex-col items-center gap-1"
                    >
                      <VscSymbolMethod size={16} /> 메서드 추가
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 mb-2">
                    <VscLink className="rotate-45" /> 의존하고 있는 컴포넌트
                    (Imports)
                  </div>
                  {dependencies.imports.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {dependencies.imports.map((dep, idx) => (
                        <div
                          key={idx}
                          className="text-[10px] font-bold border border-gray-200 bg-white px-2 py-1 rounded text-gray-600 shadow-sm cursor-pointer hover:border-blue-300 hover:text-blue-600 transition-colors"
                          onClick={() => setSelectedNode(dep)}
                        >
                          {dep.label}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[10px] text-gray-400">
                      외부 의존성이 없습니다.
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 mb-2">
                    <VscLink className="-rotate-45" /> 이 컴포넌트를 호출하는 곳
                    (Imported By)
                  </div>
                  {dependencies.importedBy.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {dependencies.importedBy.map((dep, idx) => (
                        <div
                          key={idx}
                          className="text-[10px] font-bold border border-blue-200 bg-blue-50 px-2 py-1 rounded text-blue-700 shadow-sm cursor-pointer hover:bg-blue-100 transition-colors"
                          onClick={() => setSelectedNode(dep)}
                        >
                          {dep.label}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[10px] text-gray-400">
                      호출하는 곳이 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-3 bg-gray-50 border-t border-gray-100 shrink-0">
              <button
                onClick={openFileInEditor}
                className="w-full py-2 bg-gray-900 hover:bg-black text-white rounded-lg text-[12px] font-bold transition-colors flex items-center justify-center gap-1.5 shadow-md"
              >
                에디터에서 열기 <VscGoToFile size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
