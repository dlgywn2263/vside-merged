"use client";

import React, { useMemo, useCallback, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  VscChevronDown,
  VscCheck,
} from "react-icons/vsc";
import { DiReact, DiPython } from "react-icons/di";
import { closeCodeMap, setActiveActivity, setCodeMapMode } from "@/store/slices/uiSlice";
import { openFile, mergeProjectFiles, updateFileContent, closeFilesByPath, closeFile } from "@/store/slices/fileSystemSlice";
import {
  createCodeMapComponentApi,
  createCodeMapRelationApi,
  deleteCodeMapRelationApi,
  fetchProjectFilesApi,
  fetchFileContentApi,
  deleteFileApi,
  generateCodeComponentApi,
  saveFileApi, 
} from "@/lib/ide/api";

// 💡 [핵심 수정] 위에서 새로 작성한 싱글톤 인스턴스 훅을 가져옵니다.
import { globalSyncInstance } from "@/hooks/useWorkspaceGlobalSync";
import { apiFetch, apiJson } from "@/lib/api/apiClient";
import { useDemoAutoInput } from "@/hooks/useDemoAutoInput";
import { recordDemoCreatedFile } from "@/lib/demo/demoRunner";



const CustomNode = ({ data }) => {
  let roleColor = "text-gray-500";
  let borderStyle = "border-gray-200";
  let displayRole = "FILE";

  const r = (data.role || "").toLowerCase();

  if (r === "main") {
    displayRole = "ENTRY POINT";
    roleColor = "text-red-500";
    borderStyle = "border-red-400 ring-4 ring-red-50 bg-white";
  } else if (r === "controller") {
    displayRole = "@REST_CONTROLLER";
    roleColor = "text-indigo-600";
    borderStyle = "border-indigo-400 ring-4 ring-indigo-50 bg-indigo-50/30";
  } else if (r === "service") {
    displayRole = "@SERVICE";
    roleColor = "text-emerald-600";
    borderStyle = "border-emerald-400 ring-4 ring-emerald-50 bg-emerald-50/30";
  } else if (r === "repository" || r === "mapper") {
    displayRole = "@REPOSITORY";
    roleColor = "text-amber-600";
    borderStyle = "border-amber-400 ring-4 ring-amber-50 bg-amber-50/30";
  } else if (r === "entity" || r === "table") {
    displayRole = "@ENTITY";
    roleColor = "text-rose-600";
    borderStyle = "border-rose-400 ring-4 ring-rose-50 bg-rose-50/30";
  } else if (r === "component" || r === "configuration") {
    displayRole = "@" + r.toUpperCase();
    roleColor = "text-slate-600";
    borderStyle = "border-slate-400 ring-4 ring-slate-50 bg-white";
  } else if (data.type === "REACT_COMPONENT") {
    displayRole = "REACT COMPONENT";
    roleColor = "text-cyan-500";
    borderStyle = "border-cyan-400 ring-4 ring-cyan-50 bg-white";
  } else if (data.type === "PYTHON_CLASS") {
    displayRole = "PYTHON CLASS";
    roleColor = "text-blue-500";
    borderStyle = "border-blue-400 ring-4 ring-blue-50 bg-white";
  } else if (r === "interface") {
    displayRole = "INTERFACE";
    roleColor = "text-purple-500";
    borderStyle = "border-purple-400 ring-4 ring-purple-50 bg-white";
  } else if (r === "abstract") {
    displayRole = "ABSTRACT CLASS";
    roleColor = "text-orange-500";
    borderStyle = "border-orange-400 ring-4 ring-orange-50 border-dashed bg-white";
  } else if (r === "class") {
    displayRole = "CONCRETE CLASS";
    roleColor = "text-blue-500";
    borderStyle = "border-blue-400 ring-4 ring-blue-50 bg-white";
  } else if (r === "enum") {
    displayRole = "ENUM";
    roleColor = "text-green-500";
    borderStyle = "border-green-400 ring-4 ring-green-50 bg-white";
  } else if (r === "exception") {
    displayRole = "EXCEPTION";
    roleColor = "text-rose-500";
    borderStyle = "border-rose-400 ring-4 ring-rose-50 bg-white";
  }

  const TypeIcon =
    data.type === "REACT_COMPONENT" ? DiReact :
    data.type === "PYTHON_CLASS" ? DiPython :
    r === "interface" ? VscSymbolInterface :
    r === "enum" ? VscSymbolEnum : VscSymbolClass;

  const isGeneral = r === "file";
  const cardPadding = isGeneral ? "px-4 py-3" : "px-6 py-5";
  const cardWidth = isGeneral ? "min-w-[180px]" : "min-w-[240px]";
  const titleSize = isGeneral ? "text-[13px]" : "text-[15px]";

  // 설계 관리의 코드 생성이 만든 파일(백엔드가 헤더 주석으로 판별해 실어 준다).
  //
  // 테두리 색은 역할을 뜻하므로 그대로 두고, 그 바깥에 그라데이션 테를 한 겹
  // 더 두른다. 생성 파일은 거의 다 컨트롤러·서비스·엔티티라 테두리를 한 색으로
  // 덮으면 역할 구분이 통째로 사라지고, 보라 단색은 이미 인터페이스가 쓴다.
  // 그라데이션은 단색만 쓰는 역할 색 누구와도 겹치지 않는다.
  //
  // 역할 링(ring-4)은 카드 바깥 4px 에 그려져서 바깥 테를 덮어 버리므로 AI
  // 노드에서만 뺀다. 역할은 테두리 색과 위쪽 역할 글자로 여전히 보인다.
  //
  // 코드맵은 fitView 로 전체를 담느라 0.3~0.5배쯤으로 줄여 보인다. 처음에는
  // 3px 테와 10px 모서리 배지로 표시했는데, 그 배율에서는 1px 선과 4px 글자가
  // 되어 아무도 알아보지 못했다. 그래서 가는 선이 아니라 "면적"으로 구분한다.
  // 카드 윗부분을 가로지르는 띠와 바깥 테는 줄여도 색 덩어리로 남는다.
  //
  // 한때 진한 보라→자홍 그라데이션(600/500) + 6px 테 + 보라 빛번짐으로 했더니
  // 생성 파일이 여러 개 모이면 눈이 아프다는 피드백이 있었다. 면적은 그대로 두고
  // 채도만 낮춰 연한 파스텔 띠(글자는 진한 보라)와 연한 테로 바꿨다. 빛번짐은 뺐다.
  const isAiGenerated = Boolean(data.aiGenerated);
  const cardBorder = isAiGenerated
    ? borderStyle.replace(/\bring-\S+/g, "").trim()
    : borderStyle;

  // 띠가 카드 폭 전체를 채우도록 카드 안쪽 여백만큼 밖으로 당긴다.
  // 모서리는 카드(rounded-xl 12px)에서 테두리 2px 를 뺀 값이다.
  const aiBandMargin = isGeneral ? "-mx-4 -mt-3 mb-2" : "-mx-6 -mt-5 mb-3";

  const card = (
    <div className={`relative ${cardPadding} rounded-xl border-2 ${cardBorder} shadow-sm group-hover:shadow-lg ${cardWidth} text-center transition-all duration-300 backdrop-blur-sm`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-full h-4 top-[-8px] opacity-0 hover:opacity-50 bg-blue-400 z-50 transition-opacity"
      />
      {isAiGenerated && (
        <div
          title="설계 관리의 코드 생성으로 만든 파일"
          className={`${aiBandMargin} rounded-t-[10px] border-b border-violet-200 bg-gradient-to-r from-violet-100 to-fuchsia-100 py-1.5 text-[12px] font-bold tracking-wide text-violet-700`}
        >
          ✨ AI 생성
        </div>
      )}
      <div className={`text-[10px] font-extrabold ${roleColor} uppercase tracking-widest mb-1.5 flex items-center justify-center gap-1`}>
        <TypeIcon size={14} /> {displayRole}
      </div>
      <div className={`${titleSize} font-bold text-gray-900 truncate`} title={data.label}>
        {data.label}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-full h-4 bottom-[-8px] opacity-0 hover:opacity-50 bg-blue-400 z-50 transition-opacity"
      />
    </div>
  );

  return (
    <div className="flex flex-col items-center group cursor-pointer hover:-translate-y-1 transition-transform">
      {data.showLayerLabel && (
        <div className="text-[12px] font-extrabold text-gray-500 mb-3 tracking-wide bg-gray-100/80 px-4 py-1.5 rounded-full shadow-sm border border-gray-200">
          {data.layerName}
        </div>
      )}
      {isAiGenerated ? (
        // 카드 배경이 반투명(bg-indigo-50/30 등)이라 흰 바탕을 한 겹 깔지 않으면
        // 그라데이션이 카드 안까지 비쳐 카드 전체가 보라로 물든다.
        <div className="rounded-[16px] bg-gradient-to-r from-violet-300 to-fuchsia-300 p-[4px]">
          <div className="rounded-[12px] bg-white">{card}</div>
        </div>
      ) : (
        card
      )}
    </div>
  );
};

const nodeTypes = { custom: CustomNode };

export default function CodeMap() {
  const dispatch = useDispatch();
  const { workspaceId, activeProject, activeBranch, activeFileId, projectList, fileContents } = useSelector((state) => state.fileSystem);
  const { codeMapMode } = useSelector((state) => state.ui);

  const isSplit = codeMapMode === "split" || codeMapMode === "SPLIT";
  const isFull = codeMapMode === "full" || codeMapMode === "FULL";

  const [portalTarget, setPortalTarget] = useState(null);
  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  const [rfNodes, setRfNodes] = useState([]);
  const [rfEdges, setRfEdges] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);

  const [aiSummary, setAiSummary] = useState("");
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

 const lastRequestKeyRef = useRef("");
  const lastContextKeyRef = useRef("");
  const requestSeqRef = useRef(0);
  const dragStartNodeRef = useRef(null);
  


  const [contextMenuPos, setContextMenuPos] = useState(null);
  const [nodeContextMenu, setNodeContextMenu] = useState(null);
  const [edgeContextMenu, setEdgeContextMenu] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCompName, setNewCompName] = useState("");
  const demoCompName = useDemoAutoInput({
    targetId: "codemap.createComponent.name",
    value: newCompName,
    onChange: setNewCompName,
  });
  const [newCompType, setNewCompType] = useState("CLASS");
  const [basePath, setBasePath] = useState(""); 

  const [pendingRelation, setPendingRelation] = useState(null);
  const [relationType, setRelationType] = useState("COMPOSITION");
  
  const [isRelationDropdownOpen, setIsRelationDropdownOpen] = useState(false);

  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [genTargetType, setGenTargetType] = useState("VARIABLE");
  const [genAccessModifier, setGenAccessModifier] = useState("private");
  const [genDataType, setGenDataType] = useState("String");
  const [genName, setGenName] = useState("");
  const [genInitialValue, setGenInitialValue] = useState("");
  const [genParameters, setGenParameters] = useState("");
  const [genBody, setGenBody] = useState("");

  const relationOptions = useMemo(
    () => [
      {
        value: "COMPOSITION",
        label: "참조",
        desc: "Composition / Import",
        color: "bg-[#6366f1]",
      },
      {
        value: "EXTENDS",
        label: "상속",
        desc: "Extends",
        color: "bg-blue-500",
      },
      {
        value: "IMPLEMENTS",
        label: "구현",
        desc: "Implements",
        color: "bg-green-500",
      },
      {
        value: "INJECTS",
        label: "DI 주입",
        desc: "Injects",
        color: "bg-amber-500",
      },
    ],
    [],
  );

  const selectedRelationOption = useMemo(
    () =>
      relationOptions.find((option) => option.value === relationType) ||
      relationOptions[0],
    [relationOptions, relationType],
  );

  const resetCodeMapState = useCallback(() => {
    requestSeqRef.current += 1;
    lastRequestKeyRef.current = "";

    setRfNodes([]);
    setRfEdges([]);
    setSelectedNode(null);
    setAiSummary("");

    setContextMenuPos(null);
    setNodeContextMenu(null);
    setEdgeContextMenu(null);
    setPendingRelation(null);
  }, []);

  const isMapTab =
    activeFileId === "Architecture Map" ||
    activeFileId === "CodeMap" ||
    activeFileId?.includes("codemap");

  const currentProjectData =
    projectList?.find((project) => project.name === activeProject) || {};

  let currentLang =
    currentProjectData.templateType || currentProjectData.language || "JAVA";

  const projLower = (activeProject || "").toLowerCase();
  const activeFilePath = activeFileId || "";

  const hasSpringIndicator =
    projLower.includes("spring") ||
    projLower.includes("스프링") ||
    activeFilePath.includes("src/main/java") ||
    activeFilePath.includes("build.gradle") ||
    activeFilePath.includes("pom.xml") ||
    (currentProjectData.files &&
      currentProjectData.files.some((file) => {
        const path = (file.path || file.name || file.id || "").toLowerCase();
        return (
          path.includes("build.gradle") ||
          path.includes("pom.xml") ||
          path.includes("src/main/java")
        );
      }));

  if (hasSpringIndicator) {
    currentLang = "SPRING_BOOT";
  } else if (
    projLower.includes("react") ||
    projLower.includes("리액트") ||
    activeFilePath.includes("src/components") ||
    activeFilePath.endsWith(".jsx")
  ) {
    currentLang = "REACT";
  } else if (
    projLower.includes("python") ||
    projLower.includes("파이썬") ||
    activeFilePath.endsWith(".py")
  ) {
    currentLang = "PYTHON";
  }

  useEffect(() => {
    const branch = activeBranch || "master";
    const nextContextKey = `${workspaceId || ""}::${activeProject || ""}::${branch}::${currentLang}`;

    if (lastContextKeyRef.current === nextContextKey) return;

    lastContextKeyRef.current = nextContextKey;
    resetCodeMapState();
  }, [workspaceId, activeProject, activeBranch, currentLang, resetCodeMapState]);

  useEffect(() => {
    const handleBranchContextChanged = (event) => {
      const detail = event.detail || {};

      if (detail.workspaceId && detail.workspaceId !== workspaceId) return;
      if (detail.projectName && detail.projectName !== activeProject) return;

      resetCodeMapState();
    };

    window.addEventListener(
      "waivs:branch-context-changed",
      handleBranchContextChanged,
    );

    return () => {
      window.removeEventListener(
        "waivs:branch-context-changed",
        handleBranchContextChanged,
      );
    };
  }, [workspaceId, activeProject, resetCodeMapState]);

  useEffect(() => {
    // 새 클래스는 시작 클래스(@SpringBootApplication) 옆에 두는 것이 기본이다.
    // 언어 판정보다 먼저 본다. 프로젝트 목록에 템플릿 종류가 실려 오지 않아
    // 이름에 spring 이 없는 Spring Boot 프로젝트도 JAVA 로 판정되어 "src/" 가 나왔다.
    // XxxApplication.java 로 찾는 것은 백엔드 코드 생성(ProjectStackDetector)과 같은 기준이다.
    const applicationNode = rfNodes.find(
      (node) =>
        node.id &&
        node.id.includes("src/main/java/") &&
        node.id.endsWith("Application.java"),
    );

    if (applicationNode) {
      const parts = applicationNode.id.split("/");
      parts.pop();
      setBasePath(`${parts.join("/")}/`);
      return;
    }

    if (currentLang === "SPRING_BOOT") {
      const mainNode = rfNodes.find(
        (node) => (node.data?.role || "").toLowerCase() === "main",
      );

      if (mainNode && mainNode.id) {
        const parts = mainNode.id.split("/");
        parts.pop();
        setBasePath(`${parts.join("/")}/`);
        return;
      }

      const javaNode = rfNodes.find(
        (node) => node.id && node.id.includes("src/main/java/"),
      );

      if (javaNode) {
        const match = javaNode.id.match(
          /(.*src\/main\/java\/[^/]+\/[^/]+\/[^/]+\/)/,
        );

        if (match) {
          setBasePath(match[1]);
          return;
        }

        const parts = javaNode.id.split("/");
        parts.pop();
        setBasePath(`${parts.join("/")}/`);
        return;
      }

      setBasePath("src/main/java/com/example/demo/");
      return;
    }

    if (currentLang === "REACT") {
      setBasePath("src/components/");
      return;
    }

    setBasePath("src/");
  }, [rfNodes, currentLang]);

const handleOpenNewComponentModal = (x, y) => {

    setContextMenuPos(x && y ? { x, y } : null);
    setNewCompType(currentLang === "REACT" ? "REACT_COMPONENT" : currentLang === "PYTHON" ? "PYTHON_CLASS" : "CLASS");
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (codeMapMode === "full" && !isMapTab) dispatch(closeCodeMap());
  }, [codeMapMode, isMapTab, dispatch]);

  useEffect(() => {
    if (isMapTab && !codeMapMode) dispatch(setCodeMapMode("full"));
  }, [isMapTab, codeMapMode, dispatch]);

  const onNodesChange = useCallback((changes) => setRfNodes((nds) => applyNodeChanges(changes, nds)), []);

  const onConnectStart = useCallback((event, params) => {
    if (params && params.nodeId) {
      dragStartNodeRef.current = params.nodeId;
    }
  }, []);

  const onConnect = useCallback((connection) => {
    if (!connection.source || !connection.target) return;
    if (connection.source === connection.target) return;

    const actualSource = dragStartNodeRef.current || connection.source;
    const actualTarget = actualSource === connection.source ? connection.target : connection.source;

    setPendingRelation({ source: actualSource, target: actualTarget });

    dragStartNodeRef.current = null;
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

  const flushDirtyState = async (targetFilePath) => {
    const localContent = fileContents[targetFilePath];
    if (localContent !== undefined) {
      await saveFileApi(workspaceId, activeProject, activeBranch || "master", targetFilePath, localContent);
    }
  };

  const fetchAndLayoutCodeMap = useCallback(async (isRefresh = false) => {
    if (!workspaceId || !activeProject) {
      if (isRefresh) alert("프로젝트가 선택되지 않았습니다. 워크스페이스를 다시 로드해주세요.");
      return;
    }

    const branch = activeBranch || "master";
    const currentRequestKey = `${workspaceId}-${activeProject}-${branch}-${currentLang}`;

    if (!isRefresh && lastRequestKeyRef.current === currentRequestKey && rfNodes.length > 0) return;

    lastRequestKeyRef.current = currentRequestKey;

    const requestId = requestSeqRef.current + 1;
    requestSeqRef.current = requestId;

    setIsLoading(true);
    setSelectedNode(null);

    try {
      const query = new URLSearchParams({
        workspaceId,
        projectName: activeProject,
        branchName: branch,
        language: currentLang,
        t: String(Date.now()),
      });

      const data = await apiJson(`/api/codemap/analyze?${query}`, {
      cache: "no-store",
    });

    if (requestSeqRef.current !== requestId) {
      return;
    }

    const backendNodes = Array.isArray(data?.nodes) ? data.nodes : [];
    const backendEdges = Array.isArray(data?.edges) ? data.edges : [];

      const grouped = {
        main: [],
        springControllers: [],
        springServices: [],
        springRepositories: [],
        springEntities: [],
        springOthers: [],
        react: [],
        abstractions: [],
        concrete: [],
        others: [],
        file: []
      };

      backendNodes.forEach((node) => {
        const r = (node.role || "").toLowerCase();
        
        if (node.type === "REACT_COMPONENT") {
          grouped.react.push(node);
          return;
        }
        if (node.type === "PYTHON_CLASS") {
          grouped.concrete.push(node);
          return;
        }

        if (r === "main") grouped.main.push(node);
        else if (r === "controller") grouped.springControllers.push(node);
        else if (r === "service") grouped.springServices.push(node);
        else if (r === "repository" || r === "mapper") grouped.springRepositories.push(node);
        else if (r === "entity" || r === "table") grouped.springEntities.push(node);
        else if (r === "component" || r === "configuration") grouped.springOthers.push(node);
        else if (r === "interface" || r === "abstract") grouped.abstractions.push(node);
        else if (r === "class") grouped.concrete.push(node);
        else if (r === "enum" || r === "exception") grouped.others.push(node);
        else grouped.file.push(node);
      });

      const generatedNodes = [];
      let currentY = 50;
      const layerGapY = 160;
      const nodeWidth = 260;
      const nodeGapX = 40;

      const layoutLayer = (nodesInLayer, layerName) => {
        if (nodesInLayer.length === 0) return;
        const totalWidth = nodesInLayer.length * nodeWidth + (nodesInLayer.length - 1) * nodeGapX;
        let startX = -(totalWidth / 2) + nodeWidth / 2;
        nodesInLayer.forEach((n, idx) => {
          generatedNodes.push({
            id: n.id,
            type: "custom",
            position: { x: startX + idx * (nodeWidth + nodeGapX), y: currentY },
            data: { ...n, layerName: layerName, showLayerLabel: idx === 0 }
          });
        });
        currentY += layerGapY;
      };

      const layoutGrid = (nodesInLayer, gridLabel) => {
        if (nodesInLayer.length === 0) return;
        currentY += 20;
        const cols = 4;
        const smallWidth = 180, smallGapX = 20, smallGapY = 80;
        nodesInLayer.forEach((n, idx) => {
          const row = Math.floor(idx / cols);
          const col = idx % cols;
          const itemsInRow = row === Math.ceil(nodesInLayer.length / cols) - 1 ? nodesInLayer.length % cols || cols : cols;
          const startX = -((itemsInRow * smallWidth + (itemsInRow - 1) * smallGapX) / 2) + smallWidth / 2;
          generatedNodes.push({
            id: n.id,
            type: "custom",
            position: { x: startX + col * (smallWidth + smallGapX), y: currentY + row * smallGapY },
            data: { ...n, layerName: gridLabel, showLayerLabel: idx === 0 }
          });
        });
        currentY += Math.ceil(nodesInLayer.length / cols) * smallGapY + 50;
      };

      layoutLayer(grouped.main, "🚀 어플리케이션 진입점 (Entry Point)");
      layoutLayer(grouped.springControllers, "🌐 프레젠테이션 계층 (Controllers)");
      layoutLayer(grouped.springServices, "⚙️ 비즈니스 계층 (Services)");
      layoutLayer(grouped.springRepositories, "💾 데이터 접근 계층 (Repositories/Mappers)");
      layoutLayer(grouped.springEntities, "📦 영속성 도메인 (Entities/Tables)");
      layoutLayer(grouped.springOthers, "🛠️ 구성 및 기타 빈 (Configs & Components)");
      
      layoutLayer(grouped.react, "⚛️ 리액트 UI 컴포넌트");
      layoutLayer(grouped.abstractions, "💡 추상화 계층 (Interfaces & Abstract Classes)");
      layoutLayer(grouped.concrete, "🧱 구현체 (Concrete Classes)");
      layoutGrid([...grouped.others, ...grouped.file], "📦 기타 요소");

      const generatedEdges = backendEdges.map((e) => {
        let strokeColor = "#94a3b8";
        let strokeDasharray = "5 5";
        let animated = false;
        const rType = e.relationType;

        if (rType === "IMPLEMENTS") {
          strokeColor = "#10b981";
          animated = true;
        } else if (rType === "EXTENDS") {
          strokeColor = "#3b82f6";
          strokeDasharray = "none";
          animated = true;
        } else if (rType === "COMPOSITION") {
          strokeColor = "#6366f1";
          strokeDasharray = "none";
          animated = true;
        } else if (rType === "INJECTS") {
          strokeColor = "#f59e0b";
          animated = true;
        }

        return {
          id: e.id,
          source: e.source,
          target: e.target,
          type: "smoothstep",
          animated: animated,
          style: { stroke: strokeColor, strokeWidth: 2, strokeDasharray: strokeDasharray },
          markerEnd: { type: MarkerType.ArrowClosed, color: strokeColor },
          data: { relationType: rType },
        };
      });

      if (requestSeqRef.current !== requestId) {
        return;
      }

      setRfNodes(generatedNodes);
      setRfEdges(generatedEdges);
    } catch (error) {
      if (requestSeqRef.current === requestId) {
        console.error(error);
      }
    } finally {
      if (requestSeqRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, [workspaceId, activeProject, activeBranch, rfNodes.length, currentLang]);

  useEffect(() => {
    fetchAndLayoutCodeMap();
  }, [fetchAndLayoutCodeMap]);

  useEffect(() => {
  if (!selectedNode?.id || !workspaceId || !activeProject) {
    return;
  }

  let cancelled = false;

  const loadSummary = async () => {
    try {
      setAiSummary("");
      setIsSummaryLoading(true);

      const query = new URLSearchParams({
        workspaceId,
        projectName: activeProject,
        branchName: activeBranch || "master",
        filePath: selectedNode.id,
        t: String(Date.now()),
      });

      const response = await apiFetch(`/api/codemap/summary?${query}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "AI 요약 오류");
      }

      const text = await response.text();

      if (!cancelled) {
        setAiSummary(text);
      }
    } catch (error) {
      console.error("[CodeMap] summary fetch error:", error);

      if (!cancelled) {
        setAiSummary("AI 요약 오류");
      }
    } finally {
      if (!cancelled) {
        setIsSummaryLoading(false);
      }
    }
  };

  loadSummary();

  return () => {
    cancelled = true;
  };
}, [selectedNode, workspaceId, activeProject, activeBranch]);

  const handleNodeClick = useCallback((event, node) => {
    setSelectedNode(node.data);
  }, []);

  const openFileInEditor = async () => {
    if (selectedNode && selectedNode.id) {
      try {
        let filePath = selectedNode.id;
        if (!filePath.includes(".")) {
            if (currentLang === "REACT") filePath += ".jsx";
            else if (currentLang === "PYTHON") filePath += ".py";
            else filePath += ".java"; 
        }
        dispatch(openFile({ id: filePath, name: filePath.split("/").pop(), type: "file" }));
        const content = await fetchFileContentApi(workspaceId, activeProject, activeBranch || "master", filePath);
        dispatch(updateFileContent({ filePath: filePath, content: content }));
        dispatch(setActiveActivity("editor"));
        if (!isSplit) dispatch(closeCodeMap());
      } catch (error) {
        alert("파일 오픈 실패: " + error.message);
      }
    }
  };

  const handleCreateComponentSubmit = async () => {
    if (!newCompName.trim()) return alert("컴포넌트 이름을 입력해주세요!");
    if (!activeProject) return alert("프로젝트가 활성화되지 않았습니다!");
    try {
      setIsLoading(true);
      const safeBasePath = basePath.endsWith('/') ? basePath : basePath + '/';
      const finalPath = safeBasePath + newCompName;
      await createCodeMapComponentApi(workspaceId, activeProject, activeBranch || "master", finalPath, newCompType);
      recordDemoCreatedFile(workspaceId, activeProject, finalPath);

      setIsModalOpen(false);
      setNewCompName("");
      alert("✨ 컴포넌트가 올바른 패키지에 생성되었습니다!");
      
      const files = await fetchProjectFilesApi(workspaceId, activeProject, activeBranch || "master");
      dispatch(mergeProjectFiles({ projectName: activeProject, files }));
      await fetchAndLayoutCodeMap(true);

      // 💡 [협업 동기화 추가] 생성 성공 후 즉시 브로드캐스트
      globalSyncInstance.trigger();

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
      
      let sourcePath = pendingRelation.source;
      if (!sourcePath.includes(".")) sourcePath += ".java"; 

      await flushDirtyState(sourcePath);

      await createCodeMapRelationApi(workspaceId, activeProject, activeBranch || "master", pendingRelation.source, pendingRelation.target, relationType);
      alert(`🔗 의존성 코드가 성공적으로 삽입되었습니다!`);
      setPendingRelation(null);
      setIsRelationDropdownOpen(false);
      
      const files = await fetchProjectFilesApi(workspaceId, activeProject, activeBranch || "master");
      dispatch(mergeProjectFiles({ projectName: activeProject, files }));
      await fetchAndLayoutCodeMap(true);

      const newContent = await fetchFileContentApi(workspaceId, activeProject, activeBranch || "master", sourcePath);
      dispatch(updateFileContent({ filePath: sourcePath, content: newContent }));
      
      // 💡 [협업 동기화 추가] 주입 성공 후 즉시 브로드캐스트
      globalSyncInstance.trigger();

    } catch (e) {
      alert(e.message);
      setPendingRelation(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteNode = async () => {
    if (!nodeContextMenu) return;
    const nodeData = nodeContextMenu.node.data;
    if (!window.confirm(`정말 '${nodeData.label}' 삭제하시겠습니까?`)) return;

    try {
      setIsLoading(true);
      let filePath = nodeData.id;
      if (!filePath.includes(".")) filePath += ".java";

      await deleteFileApi(workspaceId, activeProject, activeBranch || "master", filePath);
      dispatch(closeFilesByPath(filePath));
      
      const files = await fetchProjectFilesApi(workspaceId, activeProject, activeBranch || "master");
      dispatch(mergeProjectFiles({ projectName: activeProject, files }));
      setNodeContextMenu(null);
      if (selectedNode && selectedNode.id === nodeData.id) setSelectedNode(null);
      await fetchAndLayoutCodeMap(true);

      // 💡 [협업 동기화 추가] 삭제 성공 후 즉시 브로드캐스트
      globalSyncInstance.trigger();

    } catch (e) {
      alert("삭제 실패: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEdge = async () => {
    if (!edgeContextMenu) return;
    const { source, target, data } = edgeContextMenu.edge;
    if (!window.confirm(`정말 관계를 삭제하시겠습니까?`)) return;

    try {
      setIsLoading(true);
      await deleteCodeMapRelationApi(workspaceId, activeProject, activeBranch || "master", source, target, data?.relationType || "COMPOSITION");
      setEdgeContextMenu(null);
      await fetchAndLayoutCodeMap(true);

      // 💡 [협업 동기화 추가] 관계 삭제 후 즉시 브로드캐스트
      globalSyncInstance.trigger();

    } catch (e) {
      alert(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSubmit = async () => {
    if (!genName.trim() || !genDataType.trim()) return alert("입력 오류!");
    if (!activeProject) return alert("프로젝트가 활성화되지 않았습니다!");
    try {
      setIsLoading(true);
      
      let targetFilePath = selectedNode.id;
      if (!targetFilePath.includes(".")) {
          if (currentLang === "REACT") targetFilePath += ".jsx";
          else if (currentLang === "PYTHON") targetFilePath += ".py";
          else targetFilePath += ".java"; 
      }

      await flushDirtyState(targetFilePath);

      const exactClassName = selectedNode.label.replace(/\.[^/.]+$/, "");

      let safeBody = genBody.trim();
      if (safeBody && !safeBody.endsWith(";") && !safeBody.endsWith("}")) {
          safeBody += ";";
      }

      let processedInitialValue = genInitialValue.trim();
      if (processedInitialValue && genTargetType === "VARIABLE") {
        const typeLower = genDataType.trim().toLowerCase();
        
        if (typeLower === "string" && !/^["'].*["']$/.test(processedInitialValue)) {
          processedInitialValue = `"${processedInitialValue}"`;
        }
        else if ((typeLower === "char" || typeLower === "character") && !/^'.*'$/.test(processedInitialValue)) {
          processedInitialValue = `'${processedInitialValue}'`;
        }
      }

      const payload = {
        filePath: targetFilePath,  
        className: exactClassName, 
        targetType: genTargetType,
        accessModifier: genAccessModifier,
        dataType: genDataType,
        name: genName,
        initialValue: processedInitialValue,
        parameters: genParameters,
        body: safeBody 
      };
      
      await generateCodeComponentApi(workspaceId, activeProject, activeBranch || "master", payload);
      setIsGenerateModalOpen(false);
      setGenName(""); setGenInitialValue(""); setGenParameters(""); setGenBody(""); setGenDataType("String");
      
      const files = await fetchProjectFilesApi(workspaceId, activeProject, activeBranch || "master");
      dispatch(mergeProjectFiles({ projectName: activeProject, files }));
      await fetchAndLayoutCodeMap(true);

      const newContent = await fetchFileContentApi(workspaceId, activeProject, activeBranch || "master", targetFilePath);
      dispatch(updateFileContent({ filePath: targetFilePath, content: newContent }));

      // 💡 [협업 동기화 추가] 생성 성공 후 즉시 브로드캐스트
      globalSyncInstance.trigger();

    } catch (e) {
      alert(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const dependencies = useMemo(() => {
    if (!selectedNode) return { imports: [], importedBy: [] };
    const imports = rfEdges.filter((e) => e.source === selectedNode.id).map((e) => rfNodes.find((n) => n.id === e.target)?.data).filter(Boolean);
    const importedBy = rfEdges.filter((e) => e.target === selectedNode.id).map((e) => rfNodes.find((n) => n.id === e.source)?.data).filter(Boolean);
    return { imports, importedBy };
  }, [selectedNode, rfEdges, rfNodes]);

  const panelSizeClass = isSplit ? "absolute right-4 top-4 w-[280px] max-h-[calc(100%-2rem)]" : "absolute right-10 top-10 w-[340px] max-h-[calc(100%-5rem)]";
  
  if (!codeMapMode) return null;
  
  const wrapperClass = isFull ? "absolute inset-0 z-[500] flex flex-col w-full h-full bg-[#fafafa]" : "flex-1 flex flex-col relative w-full h-full min-h-0 bg-[#fafafa]";

  const renderLegend = () => {
    if (currentLang === "SPRING_BOOT") {
      return (
        <div className="flex gap-4">
          <div className="flex-1 flex flex-col gap-2 border-r border-gray-100 pr-4">
            <div className="text-[10px] font-bold text-gray-400 mb-1">스프링 계층 구조</div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600"><span className="w-2.5 h-2.5 rounded-full bg-red-50 border-2 border-red-400"></span> 진입점 (Main)</div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600"><span className="w-2.5 h-2.5 rounded-full bg-indigo-100 border-2 border-indigo-400"></span> Controller</div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600"><span className="w-2.5 h-2.5 rounded-full bg-emerald-100 border-2 border-emerald-400"></span> Service</div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600"><span className="w-2.5 h-2.5 rounded-full bg-amber-100 border-2 border-amber-400"></span> Repository</div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600"><span className="w-2.5 h-2.5 rounded-full bg-rose-100 border-2 border-rose-400"></span> Entity</div>
          </div>
          <div className="flex-1 flex flex-col gap-2 border-r border-gray-100 pr-4">
            <div className="text-[10px] font-bold text-gray-400 mb-1">기타 컴포넌트</div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600"><span className="w-2.5 h-2.5 rounded-full bg-slate-100 border-2 border-slate-400"></span> Component</div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600"><span className="w-2.5 h-2.5 rounded-full bg-purple-50 border-2 border-purple-400"></span> 인터페이스</div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600"><span className="w-2.5 h-2.5 rounded-full bg-blue-50 border-2 border-blue-400"></span> 일반 클래스</div>
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <div className="text-[10px] font-bold text-gray-400 mb-1">의존성 관계 (Edges)</div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600"><div className="w-5 h-[2px] bg-blue-500 rounded-full relative"><div className="absolute -right-1 -top-1 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-blue-500"></div></div> 상속 (Extends)</div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600"><div className="w-5 h-[2px] border-b-2 border-dashed border-green-500 relative"><div className="absolute -right-1 -top-[3px] border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-green-500"></div></div> 구현 (Implements)</div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600"><div className="w-5 h-[2px] border-b-2 border-dashed border-amber-500 relative"><div className="absolute -right-1 -top-[3px] border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-amber-500"></div></div> DI 주입 (Injects)</div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600"><div className="w-5 h-[2px] border-b-2 border-dashed border-[#6366f1] relative"><div className="absolute -right-1 -top-[3px] border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-[#6366f1]"></div></div> 참조 (Composition)</div>
          </div>
        </div>
      );
    } else if (currentLang === "REACT") {
      return (
        <div className="flex gap-4">
          <div className="flex-1 flex flex-col gap-2 border-r border-gray-100 pr-4">
            <div className="text-[10px] font-bold text-gray-400 mb-1">컴포넌트</div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600"><span className="w-2.5 h-2.5 rounded-full bg-cyan-50 border-2 border-cyan-400"></span> 리액트 컴포넌트</div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600"><span className="w-2.5 h-2.5 rounded-full bg-gray-50 border-2 border-gray-300"></span> 일반 파일</div>
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <div className="text-[10px] font-bold text-gray-400 mb-1">의존성 관계</div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600"><div className="w-5 h-[2px] border-b-2 border-dashed border-gray-400 relative"><div className="absolute -right-1 -top-[3px] border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-gray-400"></div></div> Import 참조</div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex gap-4">
          <div className="flex-1 flex flex-col gap-2 border-r border-gray-100 pr-4">
            <div className="text-[10px] font-bold text-gray-400 mb-1">객체 지향 설계</div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600"><span className="w-2.5 h-2.5 rounded-full bg-purple-50 border-2 border-purple-400"></span> 인터페이스</div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600"><span className="w-2.5 h-2.5 rounded-full bg-orange-50 border-2 border-orange-400 border-dashed"></span> 추상 클래스</div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600"><span className="w-2.5 h-2.5 rounded-full bg-blue-50 border-2 border-blue-400"></span> 구현 클래스</div>
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <div className="text-[10px] font-bold text-gray-400 mb-1">의존성 관계 (Edges)</div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600"><div className="w-5 h-[2px] bg-blue-500 rounded-full relative"><div className="absolute -right-1 -top-1 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-blue-500"></div></div> 상속 (Extends)</div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600"><div className="w-5 h-[2px] border-b-2 border-dashed border-green-500 relative"><div className="absolute -right-1 -top-[3px] border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-green-500"></div></div> 구현 (Implements)</div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600"><div className="w-5 h-[2px] border-b-2 border-dashed border-amber-500 relative"><div className="absolute -right-1 -top-[3px] border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-amber-500"></div></div> DI 주입 (Injects)</div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600"><div className="w-5 h-[2px] border-b-2 border-dashed border-[#6366f1] relative"><div className="absolute -right-1 -top-[3px] border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-[#6366f1]"></div></div> 참조 (Composition)</div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className={wrapperClass}>
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <h2 className="text-[15px] font-extrabold text-gray-900">Architecture Map</h2>
          {isLoading ? (
            <div className="flex items-center gap-1.5 text-blue-600 text-xs font-bold bg-blue-50 px-2 py-1 rounded">
              <VscRefresh className="animate-spin" size={14} /> 맵 동기화 중...
            </div>
          ) : (
            <div className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded flex items-center gap-1">
              <VscFile /> 총 {rfNodes.length}개 컴포넌트
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => handleOpenNewComponentModal()} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold shadow-sm flex items-center gap-1 transition-colors">
            <VscAdd size={14} /> 새 컴포넌트
          </button>
          <button type="button" onClick={() => fetchAndLayoutCodeMap(true)} className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 rounded text-gray-700 text-xs font-bold shadow-sm flex items-center gap-1 transition-colors">
            <VscRefresh size={14} /> 새로고침
          </button>
          <button type="button" onClick={() => { dispatch(closeCodeMap()); if (isMapTab) dispatch(closeFile(activeFileId)); }} className="ml-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="코드맵 닫기">
            <VscClose size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 relative w-full min-h-0">
        <div className="absolute inset-0 z-0">
          <ReactFlow
            nodes={rfNodes} edges={rfEdges} nodeTypes={nodeTypes}
            onNodesChange={onNodesChange} 
            onConnectStart={onConnectStart}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            onPaneClick={() => setSelectedNode(null)} onPaneContextMenu={onPaneContextMenu}
            onNodeContextMenu={onNodeContextMenu} onEdgeContextMenu={onEdgeContextMenu}
            fitView fitViewOptions={{ padding: isSplit ? 0.2 : 0.15 }} attributionPosition="bottom-right" minZoom={0.1}
          >
            <Background color="#e2e8f0" gap={16} />
            <Controls className="shadow-md border border-gray-200 rounded-lg bg-white" />
          </ReactFlow>
        </div>

        {portalTarget && contextMenuPos && createPortal(
          <div className="fixed bg-white border border-gray-200 shadow-xl rounded-lg py-1.5 w-48 z-[999999]" style={{ top: contextMenuPos.y, left: contextMenuPos.x }}>
            <div className="px-4 py-2 hover:bg-blue-50 hover:text-blue-700 cursor-pointer text-[13px] font-bold text-gray-700 flex items-center gap-2" onClick={() => handleOpenNewComponentModal(contextMenuPos.x, contextMenuPos.y)}>
              <VscAdd size={16} className="text-blue-500" /> 새 컴포넌트 생성...
            </div>
          </div>,
          portalTarget
        )}

        {portalTarget && nodeContextMenu && createPortal(
          <div className="fixed bg-white border border-gray-200 shadow-xl rounded-lg py-1.5 w-48 z-[999999]" style={{ top: nodeContextMenu.y, left: nodeContextMenu.x }}>
            <div className="px-3 py-1.5 border-b border-gray-100 bg-gray-50">
              <span className="text-xs font-bold text-gray-600 truncate block">{nodeContextMenu.node.data.label}</span>
            </div>
            <div className="px-4 py-2 hover:bg-red-50 hover:text-red-700 cursor-pointer text-[13px] font-bold text-red-600 flex items-center gap-2" onClick={handleDeleteNode}>
              <VscTrash size={16} /> 컴포넌트 삭제
            </div>
          </div>,
          portalTarget
        )}

        {portalTarget && edgeContextMenu && createPortal(
          <div className="fixed bg-white border border-gray-200 shadow-xl rounded-lg py-1.5 w-48 z-[999999]" style={{ top: edgeContextMenu.y, left: edgeContextMenu.x }}>
            <div className="px-3 py-1.5 border-b border-gray-100 bg-gray-50">
              <span className="text-[11px] font-bold text-gray-500 block">의존성 관계 ({edgeContextMenu.edge.data?.relationType || "IMPORT"})</span>
            </div>
            <div className="px-4 py-2 hover:bg-red-50 hover:text-red-700 cursor-pointer text-[13px] font-bold text-red-600 flex items-center gap-2" onClick={handleDeleteEdge}>
              <VscLink size={16} className="rotate-45" /> 관계(코드) 끊기
            </div>
          </div>,
          portalTarget
        )}

        {portalTarget && isModalOpen && createPortal(
          <div className="fixed inset-0 bg-black/40 z-[999999] flex items-center justify-center backdrop-blur-sm pointer-events-auto">
            <div className="bg-white rounded-xl shadow-2xl w-[420px] flex flex-col overflow-hidden animate-fade-in-up">
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-extrabold text-gray-800 flex items-center gap-2">
                  <VscAdd className="text-blue-600" size={18} /> 새 컴포넌트 생성
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <VscClose size={20} />
                </button>
              </div>
              
              <div className="p-6 flex flex-col gap-5">
                <div>
                  <label className="block text-[12px] font-bold text-gray-600 mb-1.5">생성 경로 (패키지 / 폴더)</label>
                  <input
                    type="text"
                    value={basePath}
                    onChange={(e) => setBasePath(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-[13px] font-mono focus:ring-1 focus:ring-blue-500 outline-none bg-gray-50 text-gray-700 transition-shadow"
                    placeholder="src/main/java/com/example/demo/"
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[12px] font-bold text-gray-600 mb-1.5">컴포넌트 이름 (확장자 제외)</label>
                    <input
                      type="text"
                      value={newCompName}
                      onChange={(e) => setNewCompName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-[13px] font-mono focus:ring-1 focus:ring-blue-500 outline-none transition-shadow"
                      placeholder="UserService"
                      {...demoCompName.props}
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[12px] font-bold text-gray-600 mb-1.5">타입</label>
                    <select 
                      value={newCompType} 
                      onChange={(e) => setNewCompType(e.target.value)} 
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-[13px] focus:ring-1 focus:ring-blue-500 outline-none bg-white cursor-pointer transition-shadow"
                    >
                      {currentLang === "REACT" ? (
                        <><option value="REACT_COMPONENT">React</option><option value="FILE">File</option></>
                      ) : currentLang === "PYTHON" ? (
                        <><option value="PYTHON_CLASS">Python</option><option value="FILE">File</option></>
                      ) : (
                        <><option value="CLASS">Class</option><option value="INTERFACE">Interface</option><option value="ENUM">Enum</option></>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end gap-2">
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">취소</button>
                <button onClick={handleCreateComponentSubmit} disabled={!newCompName.trim() || isLoading} className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg flex items-center gap-1 transition-colors">
                  생성하기
                </button>
              </div>
            </div>
          </div>,
          portalTarget
        )}

        {portalTarget && pendingRelation && createPortal(
          <div className="fixed inset-0 bg-black/40 z-[999999] flex items-center justify-center backdrop-blur-sm pointer-events-auto">
            <div className="bg-white rounded-xl shadow-2xl w-[400px] flex flex-col animate-fade-in-up border border-gray-100 relative">
              <div className="bg-gray-50 px-5 py-3.5 border-b border-gray-200 flex justify-between items-center rounded-t-xl">
                <h3 className="font-extrabold text-gray-800 flex items-center gap-2.5">
                  <VscLink className="text-blue-600" size={18} /> 의존성 관계 설정
                </h3>
                <button onClick={() => setPendingRelation(null)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <VscClose size={22} />
                </button>
              </div>
              <div className="p-6 flex flex-col gap-5">
                <div className="text-[13px] font-bold text-gray-700 bg-gray-100 p-3 rounded-lg flex items-center justify-between shadow-inner border border-gray-200">
                  <span className="truncate flex-1 text-center font-mono">{pendingRelation.source.split('/').pop()}</span>
                  <span className="mx-2 text-gray-400">➡️</span>
                  <span className="truncate flex-1 text-center font-mono">{pendingRelation.target.split('/').pop()}</span>
                </div>
                
                <div className="relative">
                  <label className="block text-[12px] font-bold text-gray-600 mb-1.5">관계 타입</label>
                  <div 
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-[13px] bg-white cursor-pointer transition-all flex items-center justify-between shadow-inner focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500"
                    onClick={() => setIsRelationDropdownOpen(!isRelationDropdownOpen)}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2 h-2 rounded-full ${selectedRelationOption.color}`}></span>
                      <span className="font-bold text-gray-900">{selectedRelationOption.label}</span>
                      <span className="text-gray-500 text-xs">{selectedRelationOption.desc}</span>
                    </div>
                    <VscChevronDown className={`text-gray-400 transition-transform ${isRelationDropdownOpen ? "rotate-180" : ""}`} size={18} />
                  </div>
                  
                  {isRelationDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1 flex flex-col animate-fade-in">
                      {relationOptions.map(opt => (
                        <div 
                          key={opt.value} 
                          className="px-4 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between"
                          onClick={() => { setRelationType(opt.value); setIsRelationDropdownOpen(false); }}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`w-2 h-2 rounded-full ${opt.color}`}></span>
                            <span className={`font-bold text-[13px] ${relationType === opt.value ? "text-blue-700" : "text-gray-900"}`}>{opt.label}</span>
                            <span className="text-gray-500 text-xs">{opt.desc}</span>
                          </div>
                          {relationType === opt.value && <VscCheck size={18} className="text-blue-600" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end gap-2.5 rounded-b-xl">
                <button onClick={() => setPendingRelation(null)} className="px-5 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">취소</button>
                <button onClick={handleRelationSubmit} disabled={isLoading} className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg flex items-center gap-1.5 transition-colors shadow-md">
                  <VscLink size={16} /> 연결하기
                </button>
              </div>
            </div>
          </div>,
          portalTarget
        )}

        {portalTarget && isGenerateModalOpen && createPortal(
          <div className="fixed inset-0 bg-black/40 z-[999999] flex items-center justify-center backdrop-blur-sm pointer-events-auto">
            <div className="bg-white rounded-xl shadow-2xl w-[440px] flex flex-col overflow-hidden animate-fade-in-up">
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-extrabold text-gray-800 flex items-center gap-2">
                  {genTargetType === "VARIABLE" ? <VscSymbolVariable className="text-indigo-600" size={18} /> : <VscSymbolMethod className="text-green-600" size={18} />}
                  {genTargetType === "VARIABLE" ? "멤버 변수 추가" : "멤버 메서드 추가"}
                </h3>
                <button onClick={() => setIsGenerateModalOpen(false)} className="text-gray-400 hover:text-red-500"><VscClose size={20} /></button>
              </div>
              <div className="p-6 flex flex-col gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="bg-blue-50 text-blue-700 text-[11px] font-bold px-3 py-2 rounded-lg border border-blue-100 flex items-center gap-2">
                  <VscFile size={14} /> 대상 클래스: {selectedNode?.label}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-bold text-gray-600 mb-1.5">접근 제어자</label>
                    <select value={genAccessModifier} onChange={(e) => setGenAccessModifier(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none">
                      <option value="private">private</option><option value="protected">protected</option><option value="public">public</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-gray-600 mb-1.5">타입</label>
                    <input type="text" value={genDataType} onChange={(e) => setGenDataType(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm font-mono focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-gray-600 mb-1.5">{genTargetType === "VARIABLE" ? "변수명" : "메서드명"}</label>
                  <input 
                    type="text" 
                    value={genName} 
                    onChange={(e) => {
                      const sanitizedValue = e.target.value.replace(/[^a-zA-Z0-9_]/g, "").replace(/^[0-9]/, "");
                      setGenName(sanitizedValue);
                    }} 
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-mono focus:ring-1 focus:ring-blue-500 outline-none" 
                  />
                </div>
                {genTargetType === "VARIABLE" && (
                  <div>
                    <label className="block text-[12px] font-bold text-gray-600 mb-1.5">초기값 (선택)</label>
                    <input type="text" value={genInitialValue} onChange={(e) => setGenInitialValue(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-mono focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                )}
                {genTargetType === "METHOD" && (
                  <>
                    <div>
                      <label className="block text-[12px] font-bold text-gray-600 mb-1.5">파라미터 (선택, 콤마구분)</label>
                      <input type="text" value={genParameters} onChange={(e) => setGenParameters(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-mono focus:ring-1 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-gray-600 mb-1.5">메서드 내용 (선택)</label>
                      <textarea value={genBody} onChange={(e) => setGenBody(e.target.value)} rows={3} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-mono focus:ring-1 focus:ring-blue-500 outline-none resize-none" />
                    </div>
                  </>
                )}
              </div>
              <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end gap-2">
                <button onClick={() => setIsGenerateModalOpen(false)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">취소</button>
                <button onClick={handleGenerateSubmit} disabled={!genName.trim() || isLoading} className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg flex items-center gap-1 transition-colors">주입하기</button>
              </div>
            </div>
          </div>,
          portalTarget
        )}

        <div className="absolute left-4 bottom-4 bg-white/95 backdrop-blur-md p-4 rounded-xl border border-gray-200 shadow-lg z-10 flex flex-col pointer-events-none min-w-[360px]">
          <div className="text-[12px] font-extrabold text-gray-800 border-b border-gray-100 pb-2 mb-3 flex items-center gap-1.5">🎨 아키텍처 맵 범례 (Legend)</div>
          {renderLegend()}
          {/* renderLegend 는 언어별로 세 갈래라, 언어와 무관한 이 항목은 셋에
              따로 넣지 않고 공통으로 한 번만 둔다. */}
          <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-2.5 text-[11px] font-bold text-gray-700">
            <span className="rounded-md border border-violet-200 bg-gradient-to-r from-violet-100 to-fuchsia-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
              ✨ AI 생성
            </span>
            설계 관리의 코드 생성으로 만든 파일
          </div>
        </div>

        {selectedNode && (
          <div className={`${panelSizeClass} bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)] rounded-2xl z-[100] flex flex-col overflow-hidden animate-fade-in border border-gray-100`}>
            <div className={`p-6 overflow-y-auto custom-scrollbar flex-1`}>
              <h3 className="font-extrabold text-gray-900 text-lg mb-4">컴포넌트 개요</h3>
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm relative overflow-hidden">
                  <div className="text-[12px] font-extrabold text-indigo-800 mb-2 flex items-center gap-1.5"><span className="text-base animate-pulse">✨</span> AI 컴포넌트 분석</div>
                  {isSummaryLoading ? (
                    <div className="animate-pulse flex flex-col gap-2 mt-2"><div className="h-2.5 bg-blue-200/50 rounded w-full"></div><div className="h-2.5 bg-blue-200/50 rounded w-5/6"></div></div>
                  ) : (<div className="text-[11px] text-gray-700 leading-relaxed font-semibold whitespace-pre-wrap">{aiSummary}</div>)}
                </div>

                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="text-[10px] font-bold text-gray-400 mb-0.5">파일 이름</div>
                  <div className="text-[13px] font-bold text-blue-600 truncate">{selectedNode.label}</div>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[10px] font-bold bg-gray-200 text-gray-700 px-2 py-0.5 rounded">{selectedNode.type}</span>
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase">{selectedNode.role}</span>
                    {selectedNode.aiGenerated && (
                      <span
                        title="설계 관리의 코드 생성으로 만든 파일"
                        className="text-[10px] font-bold text-violet-700 px-2 py-0.5 rounded border border-violet-200 bg-gradient-to-r from-violet-100 to-fuchsia-100"
                      >
                        ✨ AI 생성
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 mb-2"><VscAdd /> 내부 구조 조작</div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setGenTargetType("VARIABLE"); setIsGenerateModalOpen(true); }} className="flex-1 py-2 bg-white border hover:border-indigo-400 hover:text-indigo-600 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1"><VscSymbolVariable size={16} /> 변수 추가</button>
                    <button type="button" onClick={() => { setGenTargetType("METHOD"); setIsGenerateModalOpen(true); }} className="flex-1 py-2 bg-white border hover:border-green-400 hover:text-green-600 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1"><VscSymbolMethod size={16} /> 메서드 추가</button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 mb-2"><VscLink className="rotate-45" /> 의존성 (Imports)</div>
                  <div className="flex flex-wrap gap-1.5">
                    {dependencies.imports.length > 0 ? dependencies.imports.map((dep, idx) => (
                      <div key={idx} className="text-[10px] font-bold border px-2 py-1 rounded cursor-pointer hover:border-blue-400" onClick={() => setSelectedNode(dep)}>{dep.label}</div>
                    )) : <div className="text-[10px] text-gray-400">외부 의존성이 없습니다.</div>}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 mb-2"><VscLink className="-rotate-45" /> 호출하는 곳 (Imported By)</div>
                  <div className="flex flex-wrap gap-1.5">
                    {dependencies.importedBy.length > 0 ? dependencies.importedBy.map((dep, idx) => (
                      <div key={idx} className="text-[10px] font-bold border border-blue-200 bg-blue-50 text-blue-700 px-2 py-1 rounded cursor-pointer hover:bg-blue-100" onClick={() => setSelectedNode(dep)}>{dep.label}</div>
                    )) : <div className="text-[10px] text-gray-400">호출하는 곳이 없습니다.</div>}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-3 bg-gray-50 border-t border-gray-100 shrink-0">
              <button type="button" onClick={openFileInEditor} className="w-full py-2 bg-gray-900 hover:bg-black text-white rounded-lg text-[12px] font-bold transition-colors flex items-center justify-center gap-1.5 shadow-md">에디터에서 열기 <VscGoToFile size={14} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}