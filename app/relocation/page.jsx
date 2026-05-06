"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import ReactFlow, { 
  MiniMap, Controls, Background, useNodesState, useEdgesState, addEdge, Handle, Position, useReactFlow, ReactFlowProvider
} from "reactflow";
import "reactflow/dist/style.css";

// 아이콘 임포트
import {
  VscTrash, VscAdd, VscKey, VscCopy, VscClearAll, VscClose, VscSave, VscFileMedia, VscLayout,
  VscServer, VscDatabase, VscGlobe, VscCloud, VscDesktopDownload, VscFolderOpened, VscMarkdown, VscSearch,
  VscArrowUp, VscArrowDown, VscGripper // 💡 드래그 손잡이 아이콘 추가
} from "react-icons/vsc";

import { v4 as uuidv4 } from "uuid";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { toPng } from "html-to-image";

import MenuBar from "@/components/ide/MenuBar";

const SAVE_KEY = "devw-architecture-pro-v18";

// ==========================================
// 🗄️ 1. ERD 테이블 커스텀 노드
// ==========================================
const TableNode = ({ id, data }) => {
  const { setNodes } = useReactFlow();

  const updateName = (name) => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, name } } : n));
  const addColumn = () => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, columns: [...n.data.columns, { id: uuidv4(), name: 'new_column', type: 'VARCHAR', isPk: false, isFk: false }] } } : n));
  const updateColumn = (colId, field, value) => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, columns: n.data.columns.map((c) => c.id === colId ? { ...c, [field]: value } : c) } } : n));
  const deleteColumn = (colId) => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, columns: n.data.columns.filter((c) => c.id !== colId) } } : n));
  const deleteTable = () => setNodes((nds) => nds.filter((n) => n.id !== id));

  return (
    <div className="w-[260px] bg-white border border-gray-300 rounded-xl shadow-lg flex flex-col overflow-hidden transition-shadow hover:shadow-xl">
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-indigo-500 border-2 border-white shadow-sm" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-pink-500 border-2 border-white shadow-sm" />

      <div className="custom-drag-handle bg-gray-900 px-3 py-2 flex justify-between items-center cursor-move border-b border-gray-950">
        <div className="flex items-center gap-2 w-full">
          <div className="w-2 h-2 rounded-full bg-green-400 shrink-0"></div>
          <input value={data.name} onChange={(e) => updateName(e.target.value)} className="nodrag bg-transparent text-white font-bold text-[12px] outline-none w-full tracking-wider" placeholder="TABLE_NAME" />
        </div>
        <button onMouseDown={(e)=>e.stopPropagation()} onClick={deleteTable} className="nodrag text-gray-400 hover:text-red-400 p-1 rounded-md hover:bg-gray-800 transition-colors"><VscTrash size={14} /></button>
      </div>

      <div className="flex flex-col bg-white">
        {data.columns.map((col) => (
          <div key={col.id} className="flex items-center gap-1.5 px-2 py-1 border-b border-gray-100 hover:bg-gray-50 group">
            <div className="flex gap-1 shrink-0 nodrag">
              <label className="flex items-center cursor-pointer text-[10px]" title="Primary Key">
                <input type="checkbox" checked={col.isPk} onChange={(e) => updateColumn(col.id, 'isPk', e.target.checked)} className="hidden" />
                <div className={`p-1 rounded transition-colors ${col.isPk ? 'bg-yellow-100 text-yellow-600' : 'text-gray-300 hover:bg-gray-100'}`}><VscKey size={12} /></div>
              </label>
              <label className="flex items-center cursor-pointer text-[10px]" title="Foreign Key">
                <input type="checkbox" checked={col.isFk} onChange={(e) => updateColumn(col.id, 'isFk', e.target.checked)} className="hidden" />
                <div className={`p-1 rounded transition-colors ${col.isFk ? 'bg-blue-100 text-blue-600' : 'text-gray-300 hover:bg-gray-100'}`}><VscKey size={12} style={{ transform: 'rotate(180deg)' }} /></div>
              </label>
            </div>
            <input value={col.name} onChange={(e) => updateColumn(col.id, 'name', e.target.value)} className="nodrag flex-1 text-[11px] font-semibold text-gray-900 bg-transparent outline-none min-w-0" placeholder="column_name" />
            <select value={col.type} onChange={(e) => updateColumn(col.id, 'type', e.target.value)} className="nodrag text-[9px] font-mono font-bold text-indigo-600 bg-indigo-50 border-none rounded px-1 py-1 outline-none w-[75px] shrink-0 cursor-pointer">
              <option>VARCHAR</option><option>INT</option><option>BIGINT</option><option>DATETIME</option><option>BOOLEAN</option><option>TEXT</option>
            </select>
            <button onClick={() => deleteColumn(col.id)} className="nodrag text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"><VscTrash size={13} /></button>
          </div>
        ))}
        <button onClick={addColumn} className="nodrag p-1.5 w-full text-center text-[11px] font-bold text-gray-500 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center justify-center gap-1">
          <VscAdd size={12}/> 속성 추가
        </button>
      </div>
    </div>
  );
};

// ==========================================
// 🌟 2. 시스템 데이터 플로우 커스텀 노드
// ==========================================
const SystemNode = ({ id, data }) => {
  const { setNodes } = useReactFlow();
  const updateLabel = (e) => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, label: e.target.value } } : n));
  const deleteNode = () => setNodes((nds) => nds.filter((n) => n.id !== id));

  const getStyle = () => {
    switch(data.type) {
      case 'client': return { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-900', icon: <VscGlobe className="text-blue-600" size={18}/> };
      case 'server': return { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-900', icon: <VscServer className="text-emerald-600" size={18}/> };
      case 'db': return { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-900', icon: <VscDatabase className="text-orange-600" size={18}/> };
      case 'cloud': return { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-900', icon: <VscCloud className="text-purple-600" size={18}/> };
      default: return { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-900', icon: <VscAdd size={18}/> };
    }
  };
  const style = getStyle();

  return (
    <div className={`relative min-w-[160px] px-3 py-2.5 flex items-center gap-2 rounded-2xl border-2 ${style.bg} ${style.border} shadow-sm group hover:shadow-md transition-all`}>
      <Handle type="target" position={Position.Top} id="top-t" className="w-2 h-2 bg-gray-400 border-2 border-white" />
      <Handle type="source" position={Position.Bottom} id="bottom-s" className="w-2 h-2 bg-gray-400 border-2 border-white" />
      <Handle type="target" position={Position.Left} id="left-t" className="w-2 h-2 bg-gray-400 border-2 border-white" />
      <Handle type="source" position={Position.Right} id="right-s" className="w-2 h-2 bg-gray-400 border-2 border-white" />

      <div className="p-1.5 bg-white rounded-lg shadow-sm shrink-0">{style.icon}</div>
      <input value={data.label} onChange={updateLabel} className={`nodrag bg-transparent font-extrabold text-[12px] outline-none w-full ${style.text}`} placeholder="컴포넌트 이름" />
      
      <button onClick={deleteNode} className="nodrag absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"><VscTrash size={12} /></button>
    </div>
  );
};

// ==========================================
// 🚀 메인 기획설계 컴포넌트
// ==========================================
export default function ArchitecturePage() {
  const [activeTab, setActiveTab] = useState('flow'); // 확인을 위해 플로우 탭 우선

  // 데이터 플로우 상태
  const [flowNodes, setFlowNodes, onFlowNodesChange] = useNodesState([
    { id: 'f1', type: 'systemNode', position: { x: 100, y: 200 }, data: { label: 'Web Browser', type: 'client' } },
    { id: 'f2', type: 'systemNode', position: { x: 500, y: 200 }, data: { label: 'Spring Boot API', type: 'server' } },
  ]);
  const [flowEdges, setFlowEdges, onFlowEdgesChange] = useEdgesState([
    { id: 'e1-2', source: 'f1', target: 'f2', sourceHandle: 'right-s', targetHandle: 'left-t', label: 'REST API 요청', animated: true, style: { stroke: '#6366f1', strokeWidth: 2 }, labelStyle: { fill: '#1e293b', fontWeight: 700 } }
  ]);
  const flowNodeTypes = useMemo(() => ({ systemNode: SystemNode }), []);

  // ERD 캔버스 상태
  const [erdNodes, setErdNodes, onErdNodesChange] = useNodesState([
    { id: 'table-1', type: 'tableNode', position: { x: 100, y: 100 }, dragHandle: '.custom-drag-handle', data: { name: 'USER', columns: [{ id: uuidv4(), name: 'user_id', type: 'VARCHAR', isPk: true, isFk: false }] } }
  ]);
  const [erdEdges, setErdEdges, onErdEdgesChange] = useEdgesState([]);
  const erdNodeTypes = useMemo(() => ({ tableNode: TableNode }), []);
  
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [generatedSql, setGeneratedSql] = useState('');

  // 요구사항 & API 상태
  const [requirements, setRequirements] = useState([{ id: uuidv4(), category: '에디터', name: '실시간 동시편집', desc: '웹소켓을 활용한 딜레이 없는 코드 에디팅', note: '핵심' }]);
  const [apiSpecs, setApiSpecs] = useState([{ id: uuidv4(), method: 'GET', endpoint: '/api/workspace', desc: '워크스페이스 목록 조회' }]);
  
  // 검색 필터
  const [reqSearch, setReqSearch] = useState('');
  const [apiSearch, setApiSearch] = useState('');

  // 모달 & 타겟 관리
  const [isReqModalOpen, setIsReqModalOpen] = useState(false);
  const [newReq, setNewReq] = useState({ category: '', name: '', desc: '', note: '' });
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [newApi, setNewApi] = useState({ method: 'GET', endpoint: '', desc: '' });
  const [insertTarget, setInsertTarget] = useState(null); 

  const [contextMenu, setContextMenu] = useState(null);

  // 💡 [NEW] 도크(Dock) 드래그 상태 관리
  const [dockPos, setDockPos] = useState({ x: 0, y: 0 }); // 초기 위치(화면 중앙 하단을 맞추기 위해 x=0, y=0에서 시작하고 css 레이아웃으로 위치 잡음)
  const dockRef = useRef(null);

  // 로컬 스토리지 연동 (자동 저장)
  useEffect(() => {
    const savedData = localStorage.getItem(SAVE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.requirements) setRequirements(parsed.requirements);
        if (parsed.apiSpecs) setApiSpecs(parsed.apiSpecs);
        if (parsed.flowNodes?.length) setFlowNodes(parsed.flowNodes);
        if (parsed.flowEdges?.length) setFlowEdges(parsed.flowEdges);
        if (parsed.erdNodes?.length) setErdNodes(parsed.erdNodes);
        if (parsed.erdEdges?.length) setErdEdges(parsed.erdEdges);
      } catch (e) { console.error(e); }
    }
  }, [setFlowNodes, setFlowEdges, setErdNodes, setErdEdges]);

  useEffect(() => {
    const dataToSave = { requirements, apiSpecs, flowNodes, flowEdges, erdNodes, erdEdges };
    localStorage.setItem(SAVE_KEY, JSON.stringify(dataToSave));
  }, [requirements, apiSpecs, flowNodes, flowEdges, erdNodes, erdEdges]);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  // ----------------------------------------------------
  // 💾 파일 내보내기 & 불러오기
  // ----------------------------------------------------
  const handleExportProject = () => {
    const data = { requirements, apiSpecs, erdNodes, erdEdges, flowNodes, flowEdges };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `architecture-design-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success("프로젝트가 파일로 저장되었습니다.");
  };

  const handleImportProject = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.requirements) setRequirements(parsed.requirements);
        if (parsed.apiSpecs) setApiSpecs(parsed.apiSpecs);
        if (parsed.erdNodes) setErdNodes(parsed.erdNodes);
        if (parsed.erdEdges) setErdEdges(parsed.erdEdges);
        if (parsed.flowNodes) setFlowNodes(parsed.flowNodes);
        if (parsed.flowEdges) setFlowEdges(parsed.flowEdges);
        toast.success("프로젝트를 성공적으로 불러왔습니다.");
      } catch (err) { toast.error("잘못된 프로젝트 파일 형식입니다."); }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  // ----------------------------------------------------
  // 📝 마크다운 추출 기능
  // ----------------------------------------------------
  const handleExportMarkdown = (type) => {
    let mdContent = "";
    if (type === 'req') {
      mdContent = "# 요구사항 및 기능 명세서\n\n| 구분 | 기능명 | 세부 명세 | 비고 |\n|---|---|---|---|\n";
      requirements.forEach(req => { mdContent += `| ${req.category} | **${req.name}** | ${req.desc} | ${req.note} |\n`; });
    } else {
      mdContent = "# REST API 명세서\n\n| Method | Endpoint URL | Description |\n|---|---|---|\n";
      apiSpecs.forEach(api => { mdContent += `| \`${api.method}\` | **${api.endpoint}** | ${api.desc} |\n`; });
    }
    
    const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = type === 'req' ? `Requirements-${Date.now()}.md` : `API-Specs-${Date.now()}.md`; a.click();
    URL.revokeObjectURL(url);
    toast.success("마크다운 파일로 추출되었습니다.");
  };

  // ----------------------------------------------------
  // 👉 핸들러 모음
  // ----------------------------------------------------
  const onFlowConnect = useCallback((params) => {
    const label = window.prompt("연결 선의 설명(라벨)을 입력하세요.", "데이터 전달");
    setFlowEdges((eds) => addEdge({ ...params, label, animated: true, style: { stroke: '#6366f1', strokeWidth: 2 }, labelStyle: { fill: '#1e293b', fontWeight: 700, fontSize: 11 } }, eds));
  }, [setFlowEdges]);

  const onErdConnect = useCallback((params) => setErdEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#94a3b8', strokeWidth: 2 } }, eds)), [setErdEdges]);

  const onEdgeDoubleClick = (e, edge, setEdgesFunc) => {
    e.stopPropagation();
    if(window.confirm('이 연결선을 삭제하시겠습니까?')) {
      setEdgesFunc((eds) => eds.filter((ed) => ed.id !== edge.id));
    }
  };

  const handleRightClick = (e, type, targetId = null) => {
    e.preventDefault(); e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, type, targetId });
  };

  const moveItem = (listType, id, direction) => {
    const isReq = listType === 'req';
    const list = isReq ? requirements : apiSpecs;
    const setList = isReq ? setRequirements : setApiSpecs;

    const idx = list.findIndex(item => item.id === id);
    if (idx < 0) return;

    const newList = [...list];
    if (direction === 'up' && idx > 0) {
      [newList[idx - 1], newList[idx]] = [newList[idx], newList[idx - 1]];
      setList(newList);
    } else if (direction === 'down' && idx < list.length - 1) {
      [newList[idx], newList[idx + 1]] = [newList[idx + 1], newList[idx]];
      setList(newList);
    }
    setContextMenu(null);
  };

  const handleAddFlowNode = (type) => {
    const newX = 100 + (flowNodes.length * 30) % 300; const newY = 100 + (flowNodes.length * 30) % 300;
    let label = 'New Component';
    if(type === 'client') label = 'Client'; else if(type === 'server') label = 'Server API'; else if(type === 'db') label = 'Database'; else if(type === 'cloud') label = 'External Service';
    setFlowNodes(nds => [...nds, { id: uuidv4(), type: 'systemNode', position: { x: newX, y: newY }, data: { label, type } }]);
  };

  const handleAutoLayoutFlow = () => {
    setFlowNodes(nds => nds.map((node, i) => ({ ...node, position: { x: (i % 4) * 250 + 50, y: Math.floor(i / 4) * 150 + 100 } }))); 
    toast.success('플로우 자동 정렬 완료');
  };

  const duplicateFlowNode = (nodeId) => {
    const target = flowNodes.find(n => n.id === nodeId);
    if (target) {
      setFlowNodes(nds => [...nds, { ...target, id: uuidv4(), position: { x: target.position.x + 30, y: target.position.y + 30 } }]);
      toast.success('컴포넌트가 복제되었습니다.');
    }
  };

  const handleAddTable = (x = 100, y = 100) => setErdNodes(nds => [...nds, { id: uuidv4(), type: 'tableNode', position: { x, y }, dragHandle: '.custom-drag-handle', data: { name: 'NEW_TABLE', columns: [] } }]);
  const handleAutoLayoutERD = () => { setErdNodes(nds => nds.map((node, i) => ({ ...node, position: { x: (i % 3) * 320 + 50, y: Math.floor(i / 3) * 250 + 50 } }))); toast.success('자동 정렬 완료'); };

  const handleExportImage = (className) => {
    const element = document.querySelector(className);
    if (!element) return toast.error('캔버스를 찾을 수 없습니다.');
    toast.loading('이미지 변환 중...', { id: 'img-export' });
    toPng(element, { backgroundColor: '#f8fafc' }).then((dataUrl) => {
      const link = document.createElement('a'); link.download = `architecture-${Date.now()}.png`; link.href = dataUrl; link.click();
      toast.success('이미지가 저장되었습니다.', { id: 'img-export' });
    }).catch(() => toast.error('저장 실패', { id: 'img-export' }));
  };

  const handleExportSql = () => {
    let sql = `-- Devw ERD Generated SQL\n-- Date: ${new Date().toLocaleString()}\n\n`;
    erdNodes.forEach(node => {
      sql += `CREATE TABLE ${node.data.name} (\n`;
      const cols = node.data.columns.map((c) => { let line = `  ${c.name} ${c.type}`; if (c.isPk) line += ` PRIMARY KEY`; return line; });
      sql += cols.join(',\n'); sql += `\n);\n\n`;
    });
    setGeneratedSql(sql); setShowSqlModal(true);
  };
  const copySql = () => { navigator.clipboard.writeText(generatedSql); toast.success('SQL 복사 완료!'); setShowSqlModal(false); };

  const updateReq = (id, field, value) => setRequirements(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  const updateApi = (id, field, value) => setApiSpecs(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));

  const handleAddReq = () => {
    if (!newReq.category || !newReq.name) return toast.error('구분과 기능명을 입력해주세요.');
    const newItem = { ...newReq, id: uuidv4() };
    if (insertTarget?.type === 'req') {
      const idx = requirements.findIndex(r => r.id === insertTarget.id);
      const newArray = [...requirements]; newArray.splice(idx + 1, 0, newItem);
      setRequirements(newArray);
    } else { setRequirements([...requirements, newItem]); }
    setNewReq({ category: '', name: '', desc: '', note: '' }); setIsReqModalOpen(false); setInsertTarget(null); toast.success('요구사항 추가됨');
  };
  const handleDeleteReq = (id) => { setRequirements(prev => prev.filter(r => r.id !== id)); toast.error('삭제됨'); };

  const handleAddApi = () => {
    if (!newApi.endpoint) return toast.error('엔드포인트를 입력해주세요.');
    const newItem = { ...newApi, id: uuidv4() };
    if (insertTarget?.type === 'api') {
      const idx = apiSpecs.findIndex(a => a.id === insertTarget.id);
      const newArray = [...apiSpecs]; newArray.splice(idx + 1, 0, newItem);
      setApiSpecs(newArray);
    } else { setApiSpecs([...apiSpecs, newItem]); }
    setNewApi({ method: 'GET', endpoint: '', desc: '' }); setIsApiModalOpen(false); setInsertTarget(null); toast.success('API 추가됨');
  };
  const handleDeleteApi = (id) => { setApiSpecs(prev => prev.filter(a => a.id !== id)); toast.error('삭제됨'); };

  const duplicateTable = (nodeId) => {
    const target = erdNodes.find(n => n.id === nodeId);
    if (target) {
      setErdNodes(nds => [...nds, { ...target, id: uuidv4(), position: { x: target.position.x + 30, y: target.position.y + 30 }, data: { ...target.data, name: `${target.data.name}_COPY`, columns: target.data.columns.map((c) => ({...c, id: uuidv4()})) } }]);
    }
  };

  const filteredReqs = requirements.filter(r => r.name.includes(reqSearch) || r.desc.includes(reqSearch) || r.category.includes(reqSearch));
  const filteredApis = apiSpecs.filter(a => a.endpoint.includes(apiSearch) || a.desc.includes(apiSearch));

  const tabs = [
    { id: 'requirements', label: '요구사항 정의' },
    { id: 'erd', label: 'ERD 스키마 설계' },
    { id: 'flow', label: '시스템 아키텍처' },
    { id: 'api', label: 'API 명세서' },
  ];

  return (
    <div className="w-screen h-screen flex flex-col bg-[#f8fafc] font-sans overflow-hidden text-gray-900">
      <Toaster position="top-center" toastOptions={{ duration: 2500, style: { fontWeight: 'bold', fontSize: '13px', borderRadius: '8px', color: '#000' } }} />
      <MenuBar /> 

      {/* 우클릭 메뉴 */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} style={{ top: contextMenu.y, left: contextMenu.x }} className="fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-2xl py-2 w-48 overflow-hidden">
            {contextMenu.type === 'erdPane' && (
              <button onClick={() => { handleAddTable(contextMenu.x - 300, contextMenu.y - 150); setContextMenu(null); }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-gray-800 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2"><VscAdd size={14}/> 이 위치에 새 테이블 추가</button>
            )}
            {contextMenu.type === 'erdNode' && contextMenu.targetId && (
              <>
                <button onClick={() => { duplicateTable(contextMenu.targetId); setContextMenu(null); }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-gray-800 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2"><VscCopy size={14}/> 이 테이블 복제</button>
                <button onClick={() => { setErdNodes(nds => nds.filter(n => n.id !== contextMenu.targetId)); setContextMenu(null); }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"><VscTrash size={14}/> 테이블 삭제</button>
              </>
            )}
            {contextMenu.type === 'flowNode' && contextMenu.targetId && (
              <>
                <button onClick={() => { duplicateFlowNode(contextMenu.targetId); setContextMenu(null); }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-gray-800 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2"><VscCopy size={14}/> 이 컴포넌트 복제</button>
                <button onClick={() => { setFlowNodes(nds => nds.filter(n => n.id !== contextMenu.targetId)); setContextMenu(null); }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"><VscTrash size={14}/> 컴포넌트 삭제</button>
              </>
            )}
            {contextMenu.type === 'req' && contextMenu.targetId && (
              <>
                <button onClick={() => moveItem('req', contextMenu.targetId, 'up')} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-gray-800 hover:bg-gray-100 flex items-center gap-2"><VscArrowUp size={14}/> 위로 이동</button>
                <button onClick={() => moveItem('req', contextMenu.targetId, 'down')} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-gray-800 hover:bg-gray-100 flex items-center gap-2"><VscArrowDown size={14}/> 아래로 이동</button>
                <div className="h-px bg-gray-100 my-1"></div>
                <button onClick={() => { setInsertTarget({type: 'req', id: contextMenu.targetId}); setIsReqModalOpen(true); setContextMenu(null); }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2"><VscAdd size={14}/> ➕ 아래에 새 항목 추가</button>
                <div className="h-px bg-gray-100 my-1"></div>
                <button onClick={() => { handleDeleteReq(contextMenu.targetId); setContextMenu(null); }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"><VscTrash size={14}/> 항목 삭제</button>
              </>
            )}
            {contextMenu.type === 'api' && contextMenu.targetId && (
              <>
                <button onClick={() => moveItem('api', contextMenu.targetId, 'up')} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-gray-800 hover:bg-gray-100 flex items-center gap-2"><VscArrowUp size={14}/> 위로 이동</button>
                <button onClick={() => moveItem('api', contextMenu.targetId, 'down')} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-gray-800 hover:bg-gray-100 flex items-center gap-2"><VscArrowDown size={14}/> 아래로 이동</button>
                <div className="h-px bg-gray-100 my-1"></div>
                <button onClick={() => { setInsertTarget({type: 'api', id: contextMenu.targetId}); setIsApiModalOpen(true); setContextMenu(null); }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2"><VscAdd size={14}/> ➕ 아래에 새 항목 추가</button>
                <div className="h-px bg-gray-100 my-1"></div>
                <button onClick={() => { handleDeleteApi(contextMenu.targetId); setContextMenu(null); }} className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"><VscTrash size={14}/> API 삭제</button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 모달: 요구사항 추가 */}
      <AnimatePresence>
        {isReqModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-[500px] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h3 className="font-black text-gray-900">새 요구사항 추가</h3>
                <button onClick={() => {setIsReqModalOpen(false); setInsertTarget(null);}} className="text-gray-400 hover:text-gray-700"><VscClose size={20}/></button>
              </div>
              <div className="p-5 flex flex-col gap-3">
                <div><label className="block text-xs font-bold text-gray-800 mb-1">구분</label><input value={newReq.category} onChange={e=>setNewReq({...newReq, category: e.target.value})} placeholder="예: 로그인" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-gray-900 text-[13px]"/></div>
                <div><label className="block text-xs font-bold text-gray-800 mb-1">기능명</label><input value={newReq.name} onChange={e=>setNewReq({...newReq, name: e.target.value})} placeholder="기능의 이름" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-gray-900 text-[13px]"/></div>
                <div><label className="block text-xs font-bold text-gray-800 mb-1">세부 명세</label><textarea value={newReq.desc} onChange={e=>setNewReq({...newReq, desc: e.target.value})} placeholder="자세히 적어주세요." rows={3} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-gray-900 text-[13px] resize-none"/></div>
                <div><label className="block text-xs font-bold text-gray-800 mb-1">비고</label><input value={newReq.note} onChange={e=>setNewReq({...newReq, note: e.target.value})} placeholder="참고사항" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-gray-900 text-[13px]"/></div>
              </div>
              <div className="p-3 bg-gray-50 border-t flex justify-end gap-2">
                <button onClick={() => {setIsReqModalOpen(false); setInsertTarget(null);}} className="px-4 py-1.5 rounded-lg font-bold text-gray-600 hover:bg-gray-200 text-[13px]">취소</button>
                <button onClick={handleAddReq} className="px-4 py-1.5 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 text-[13px]">추가하기</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 모달: API 추가 */}
      <AnimatePresence>
        {isApiModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-[500px] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b flex justify-between items-center bg-gray-50">
                <h3 className="font-black text-gray-900">새 API 명세 추가</h3>
                <button onClick={() => {setIsApiModalOpen(false); setInsertTarget(null);}} className="text-gray-400 hover:text-gray-700"><VscClose size={20}/></button>
              </div>
              <div className="p-5 flex flex-col gap-3">
                <div><label className="block text-xs font-bold text-gray-800 mb-1">HTTP Method</label><select value={newApi.method} onChange={e=>setNewApi({...newApi, method: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-gray-900 font-bold outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-[13px]"><option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option></select></div>
                <div><label className="block text-xs font-bold text-gray-800 mb-1">Endpoint URL</label><input value={newApi.endpoint} onChange={e=>setNewApi({...newApi, endpoint: e.target.value})} placeholder="/api/users" className="w-full px-3 py-2 border rounded-lg text-gray-900 font-mono outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-[13px]"/></div>
                <div><label className="block text-xs font-bold text-gray-800 mb-1">설명</label><textarea value={newApi.desc} onChange={e=>setNewApi({...newApi, desc: e.target.value})} placeholder="데이터 설명" rows={3} className="w-full px-3 py-2 border rounded-lg text-gray-900 outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-[13px] resize-none"/></div>
              </div>
              <div className="p-3 bg-gray-50 border-t flex justify-end gap-2">
                <button onClick={() => {setIsApiModalOpen(false); setInsertTarget(null);}} className="px-4 py-1.5 rounded-lg font-bold text-gray-600 hover:bg-gray-200 text-[13px]">취소</button>
                <button onClick={handleAddApi} className="px-4 py-1.5 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 text-[13px]">추가하기</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 모달: SQL 생성 */}
      <AnimatePresence>
        {showSqlModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="bg-white w-[600px] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b flex justify-between items-center bg-gray-50">
                <h3 className="font-black text-gray-900 flex items-center gap-2"><VscSave size={18} className="text-indigo-600"/> 생성된 SQL 쿼리</h3>
                <button onClick={() => setShowSqlModal(false)} className="text-gray-400 hover:text-gray-700"><VscClose size={20}/></button>
              </div>
              <textarea readOnly value={generatedSql} className="w-full h-[350px] p-5 bg-gray-900 text-green-400 font-mono text-[12px] outline-none resize-none custom-scrollbar" />
              <div className="p-3 bg-gray-50 flex justify-end gap-2"><button onClick={() => setShowSqlModal(false)} className="px-4 py-1.5 rounded-lg font-bold text-gray-600 hover:bg-gray-200 text-[13px]">닫기</button><button onClick={copySql} className="px-4 py-1.5 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 text-[13px]">복사하기</button></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 💡 [핵심 해결] 메인 레이아웃 높이 계산 안정화 (min-h-0 추가) */}
      <div className="flex-1 px-5 py-4 overflow-hidden flex flex-col min-h-0">
        <div className="mb-4 flex items-center justify-between shrink-0">
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3"><span className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">🏗️</span> 시스템 기획설계 센터</h1>
          <div className="flex items-center gap-2">
            <input type="file" id="file-upload" className="hidden" accept=".json" onChange={handleImportProject} />
            <label htmlFor="file-upload" className="px-3 py-2 bg-white border border-gray-300 text-gray-700 text-[12px] font-bold rounded-lg shadow-sm hover:bg-gray-50 cursor-pointer flex items-center gap-1.5 transition-colors">
              <VscFolderOpened size={14}/> 파일 불러오기
            </label>
            <button onClick={handleExportProject} className="px-3 py-2 bg-gray-900 text-white text-[12px] font-bold rounded-lg shadow-sm hover:bg-black flex items-center gap-1.5 transition-colors">
              <VscDesktopDownload size={14}/> 파일 저장
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col flex-1 overflow-hidden relative min-h-0">
          <div className="flex px-4 border-b border-gray-200 bg-white z-10 overflow-x-auto shrink-0">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative px-5 py-3 text-[13px] font-extrabold transition-all outline-none whitespace-nowrap ${activeTab === tab.id ? 'text-indigo-700' : 'text-gray-400 hover:text-gray-700'}`}>
                {tab.label}
                {activeTab === tab.id && <motion.div layoutId="activeTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full" />}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden bg-gray-50/50 relative min-h-0 flex flex-col">
            <AnimatePresence mode="wait">
              
              {/* 📋 요구사항 탭 */}
              {activeTab === 'requirements' && (
                <motion.div key="req" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 max-w-[1400px] w-full mx-auto h-full flex flex-col min-h-0">
                  <div className="flex justify-between items-end mb-3 shrink-0">
                    <div>
                      <h2 className="text-lg font-black text-gray-900">요구사항 명세서</h2>
                      <p className="text-gray-500 text-[12px] mt-0.5">글자를 클릭해 바로 수정하거나, 우클릭으로 새 항목을 삽입/이동하세요.</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className="flex items-center bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 shadow-sm">
                        <VscSearch className="text-gray-400 mr-2" size={14} />
                        <input value={reqSearch} onChange={e=>setReqSearch(e.target.value)} placeholder="기능 검색..." className="text-[12px] outline-none w-32 bg-transparent text-gray-900" />
                      </div>
                      <button onClick={() => {if(window.confirm('전체 삭제하시겠습니까?')) setRequirements([]);}} className="px-3 py-1.5 bg-white border border-red-200 text-red-600 text-[12px] font-bold rounded-lg shadow-sm hover:bg-red-50 flex items-center gap-1.5"><VscClearAll size={14}/> 전체 비우기</button>
                      <button onClick={() => handleExportMarkdown('req')} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-[12px] font-bold rounded-lg shadow-sm hover:bg-gray-50 flex items-center gap-1.5"><VscMarkdown size={14}/> 마크다운</button>
                      <button onClick={() => {setInsertTarget(null); setIsReqModalOpen(true);}} className="px-3 py-1.5 bg-indigo-600 text-white text-[12px] font-bold rounded-lg shadow-md hover:bg-indigo-700 flex items-center gap-1.5"><VscAdd size={14}/> 새 요구사항</button>
                    </div>
                  </div>
                  {/* 💡 [핵심 해결] 내부 테이블 스크롤 컨테이너 안정화 */}
                  <div className="flex-1 overflow-y-auto bg-white rounded-lg shadow-sm border border-gray-200 min-h-0">
                    <table className="w-full text-left border-collapse relative">
                      <thead className="bg-gray-100 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                        <tr><th className="p-3 font-bold text-gray-800 text-[12px] w-[15%]">구분</th><th className="p-3 font-bold text-gray-800 text-[12px] w-[25%]">기능명</th><th className="p-3 font-bold text-gray-800 text-[12px] w-[45%]">세부 명세</th><th className="p-3 font-bold text-gray-800 text-[12px] w-[10%]">비고</th><th className="p-3 font-bold text-gray-800 text-[12px] text-center w-[5%]">삭제</th></tr>
                      </thead>
                      <tbody>
                        {filteredReqs.length === 0 ? (<tr><td colSpan="5" className="p-8 text-center text-gray-400 font-medium text-[12px]">데이터가 없습니다.</td></tr>) : (filteredReqs.map((req) => (
                          <tr key={req.id} onContextMenu={(e) => handleRightClick(e, 'req', req.id)} className="border-b border-gray-100 hover:bg-indigo-50/30 cursor-context-menu transition-colors">
                            <td className="p-2.5 font-bold text-gray-900 text-[12px]">
                              <input value={req.category} onChange={(e)=>updateReq(req.id, 'category', e.target.value)} className="w-full bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-indigo-300 rounded px-1.5 py-1" />
                            </td>
                            <td className="p-2.5 font-medium text-gray-900 text-[12px]">
                              <input value={req.name} onChange={(e)=>updateReq(req.id, 'name', e.target.value)} className="w-full bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-indigo-300 rounded px-1.5 py-1" />
                            </td>
                            <td className="p-2.5 text-gray-700 text-[12px]">
                              <textarea value={req.desc} onChange={(e)=>updateReq(req.id, 'desc', e.target.value)} rows={1} className="w-full bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-indigo-300 rounded px-1.5 py-1 resize-none custom-scrollbar" />
                            </td>
                            <td className="p-2.5">
                              <input value={req.note} onChange={(e)=>updateReq(req.id, 'note', e.target.value)} className="w-full bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-indigo-300 rounded px-1.5 py-1 text-gray-500 text-[11px] font-bold" />
                            </td>
                            <td className="p-2.5 text-center"><button onClick={() => handleDeleteReq(req.id)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md"><VscTrash size={14}/></button></td>
                          </tr>
                        )))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* 🗄️ ERD 탭 */}
              {activeTab === 'erd' && (
                <motion.div key="erd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                  <ReactFlowProvider>
                    <ReactFlow nodes={erdNodes} edges={erdEdges} onNodesChange={onErdNodesChange} onEdgesChange={onErdEdgesChange} onConnect={onErdConnect} nodeTypes={erdNodeTypes} fitView minZoom={0.1} maxZoom={2} onPaneContextMenu={(e) => handleRightClick(e, 'erdPane')} onNodeContextMenu={(e, node) => handleRightClick(e, 'erdNode', node.id)} onEdgeDoubleClick={(e, edge) => onEdgeDoubleClick(e, edge, setErdEdges)}>
                      <Background color="#cbd5e1" gap={24} size={1.5} />
                      <Controls className="bg-white shadow-md border-gray-200 rounded-lg m-4" />
                      
                      {/* 💡 [NEW] 자유롭게 이동 가능한(Draggable) 도크 메뉴 적용 */}
                      <motion.div 
                        drag 
                        dragMomentum={false} // 관성 효과 제거
                        dragElastic={0} // 튕기는 느낌 제거
                        className="absolute z-50 shadow-2xl rounded-xl border border-gray-200 overflow-hidden bg-white/95 backdrop-blur-md"
                        // 초기 위치 화면 하단 고정
                        style={{ bottom: "2rem", left: "50%", x: "-50%" }}
                        initial={false}
                      >
                        <div className="px-3 py-2 flex items-center gap-1.5 flex-nowrap w-max max-w-[90vw]">
                           {/* 드래그 손잡이 추가 */}
                          <div className="flex items-center justify-center p-1 text-gray-300 hover:text-indigo-500 cursor-move shrink-0">
                            <VscGripper size={18} />
                          </div>
                          <div className="w-px h-4 bg-gray-200 mx-1 shrink-0"></div>
                          
                          <button onClick={()=>handleAddTable()} className="px-3 py-1.5 font-bold text-[12px] text-gray-800 hover:bg-gray-100 rounded-lg flex items-center gap-1.5 whitespace-nowrap"><VscAdd className="text-indigo-600" size={14}/> 새 테이블</button>
                          <button onClick={handleAutoLayoutERD} className="px-3 py-1.5 font-bold text-[12px] text-gray-800 hover:bg-gray-100 rounded-lg flex items-center gap-1.5 whitespace-nowrap"><VscLayout className="text-indigo-600" size={14}/> 자동 정렬</button>
                          <div className="w-px h-4 bg-gray-200 mx-1 shrink-0"></div>
                          <button onClick={handleExportSql} className="px-3 py-1.5 font-bold text-[12px] text-gray-800 hover:bg-gray-100 rounded-lg flex items-center gap-1.5 whitespace-nowrap"><VscSave className="text-emerald-600" size={14}/> SQL 추출</button>
                          <button onClick={()=>handleExportImage('.react-flow__viewport')} className="px-3 py-1.5 font-bold text-[12px] text-gray-800 hover:bg-gray-100 rounded-lg flex items-center gap-1.5 whitespace-nowrap"><VscFileMedia className="text-blue-600" size={14}/> PNG 저장</button>
                          <div className="w-px h-4 bg-gray-200 mx-1 shrink-0"></div>
                          <button onClick={()=>{if(window.confirm('캔버스를 모두 지우시겠습니까?')){setErdNodes([]);setErdEdges([]);}}} className="px-3 py-1.5 font-bold text-[12px] text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1.5 whitespace-nowrap"><VscTrash size={14}/> 비우기</button>
                        </div>
                      </motion.div>
                    </ReactFlow>
                  </ReactFlowProvider>
                </motion.div>
              )}

              {/* 🌊 시스템 데이터 플로우 탭 */}
              {activeTab === 'flow' && (
                <motion.div key="flow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                  <ReactFlowProvider>
                    <ReactFlow nodes={flowNodes} edges={flowEdges} onNodesChange={onFlowNodesChange} onEdgesChange={onFlowEdgesChange} onConnect={onFlowConnect} nodeTypes={flowNodeTypes} fitView minZoom={0.2} maxZoom={2} onEdgeDoubleClick={(e, edge) => onEdgeDoubleClick(e, edge, setFlowEdges)} onNodeContextMenu={(e, node) => handleRightClick(e, 'flowNode', node.id)}>
                      <Background color="#cbd5e1" gap={20} size={1} />
                      <Controls className="bg-white shadow-md border-gray-200 rounded-lg m-4" />
                      
                      {/* 💡 [NEW] 자유롭게 이동 가능한(Draggable) 도크 메뉴 적용 */}
                      <motion.div 
                        drag 
                        dragMomentum={false} 
                        dragElastic={0}
                        className="absolute z-50 shadow-2xl rounded-xl border border-gray-200 overflow-hidden bg-white/95 backdrop-blur-md"
                        // 초기 위치 화면 하단 고정
                        style={{ bottom: "2rem", left: "50%", x: "-50%" }}
                        initial={false}
                      >
                        <div className="px-3 py-2 flex items-center gap-1 flex-nowrap w-max max-w-[90vw]">
                           {/* 드래그 손잡이 추가 */}
                          <div className="flex items-center justify-center p-1 text-gray-300 hover:text-indigo-500 cursor-move shrink-0">
                            <VscGripper size={18} />
                          </div>
                          <div className="w-px h-4 bg-gray-200 mx-1 shrink-0"></div>

                          <span className="text-[11px] font-bold text-gray-400 mx-1.5 shrink-0">추가:</span>
                          <button onClick={()=>handleAddFlowNode('client')} className="px-2.5 py-1.5 font-bold text-[12px] text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1.5 whitespace-nowrap"><VscGlobe size={14}/> 클라이언트</button>
                          <button onClick={()=>handleAddFlowNode('server')} className="px-2.5 py-1.5 font-bold text-[12px] text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center gap-1.5 whitespace-nowrap"><VscServer size={14}/> 서버/API</button>
                          <button onClick={()=>handleAddFlowNode('db')} className="px-2.5 py-1.5 font-bold text-[12px] text-orange-800 bg-orange-50 hover:bg-orange-100 rounded-lg flex items-center gap-1.5 whitespace-nowrap"><VscDatabase size={14}/> 데이터베이스</button>
                          <button onClick={()=>handleAddFlowNode('cloud')} className="px-2.5 py-1.5 font-bold text-[12px] text-purple-800 bg-purple-50 hover:bg-purple-100 rounded-lg flex items-center gap-1.5 whitespace-nowrap"><VscCloud size={14}/> 외부 서비스</button>
                          
                          <div className="w-px h-4 bg-gray-200 mx-1 shrink-0"></div>
                          <button onClick={handleAutoLayoutFlow} className="px-2.5 py-1.5 font-bold text-[12px] text-gray-800 hover:bg-gray-100 rounded-lg flex items-center gap-1.5 whitespace-nowrap"><VscLayout className="text-indigo-600" size={14}/> 정렬</button>
                          <button onClick={()=>handleExportImage('.react-flow__viewport')} className="px-2.5 py-1.5 font-bold text-[12px] text-gray-800 hover:bg-gray-100 rounded-lg flex items-center gap-1.5 whitespace-nowrap"><VscFileMedia className="text-indigo-600" size={14}/> PNG</button>
                          <button onClick={()=>{if(window.confirm('캔버스를 비우시겠습니까?')){setFlowNodes([]);setFlowEdges([]);}}} className="px-2.5 py-1.5 font-bold text-[12px] text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1.5 whitespace-nowrap"><VscTrash size={14}/> 비우기</button>
                        </div>
                      </motion.div>
                    </ReactFlow>
                  </ReactFlowProvider>
                </motion.div>
              )}

              {/* 📋 API 탭 */}
              {activeTab === 'api' && (
                <motion.div key="api" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 max-w-[1400px] w-full mx-auto h-full flex flex-col min-h-0">
                  <div className="flex justify-between items-end mb-3 shrink-0">
                    <div>
                      <h2 className="text-lg font-black text-gray-900">REST API 명세서</h2>
                      <p className="text-gray-500 text-[12px] mt-0.5">글자를 클릭해 바로 수정하거나, 우클릭으로 새 항목을 삽입/이동하세요.</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className="flex items-center bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 shadow-sm">
                        <VscSearch className="text-gray-400 mr-2" size={14} />
                        <input value={apiSearch} onChange={e=>setApiSearch(e.target.value)} placeholder="API 검색..." className="text-[12px] outline-none w-32 bg-transparent text-gray-900" />
                      </div>
                      <button onClick={() => {if(window.confirm('전체 삭제하시겠습니까?')) setApiSpecs([]);}} className="px-3 py-1.5 bg-white border border-red-200 text-red-600 text-[12px] font-bold rounded-lg shadow-sm hover:bg-red-50 flex items-center gap-1.5"><VscClearAll size={14}/> 전체 비우기</button>
                      <button onClick={() => handleExportMarkdown('api')} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-[12px] font-bold rounded-lg shadow-sm hover:bg-gray-50 flex items-center gap-1.5"><VscMarkdown size={14}/> 마크다운</button>
                      <button onClick={() => {setInsertTarget(null); setIsApiModalOpen(true);}} className="px-3 py-1.5 bg-indigo-600 text-white text-[12px] font-bold rounded-lg shadow-md hover:bg-indigo-700 flex items-center gap-1.5"><VscAdd size={14}/> 새 API</button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto bg-white rounded-lg shadow-sm border border-gray-200 min-h-0">
                    <table className="w-full text-left border-collapse relative">
                      <thead className="bg-gray-100 border-b border-gray-200 sticky top-0 z-10 shadow-sm"><tr><th className="p-3 font-bold text-gray-800 text-[12px] w-[15%] text-center">Method</th><th className="p-3 font-bold text-gray-800 text-[12px] w-[35%]">Endpoint URL</th><th className="p-3 font-bold text-gray-800 text-[12px] w-[40%]">설명 (Description)</th><th className="p-3 font-bold text-gray-800 text-[12px] text-center w-[10%]">삭제</th></tr></thead>
                      <tbody>
                        {filteredApis.length === 0 ? (<tr><td colSpan="4" className="p-8 text-center text-gray-400 font-medium text-[12px]">데이터가 없습니다.</td></tr>) : (filteredApis.map((api) => (
                          <tr key={api.id} onContextMenu={(e) => handleRightClick(e, 'api', api.id)} className="border-b border-gray-100 hover:bg-indigo-50/30 font-mono cursor-context-menu transition-colors">
                            <td className="p-2.5 text-center">
                              <select value={api.method} onChange={(e)=>updateApi(api.id, 'method', e.target.value)} className={`px-2 py-1 text-[11px] font-black rounded border outline-none cursor-pointer
                                ${api.method === 'GET' ? 'bg-blue-50 text-blue-700 border-blue-200' : api.method === 'POST' ? 'bg-green-50 text-green-700 border-green-200' : api.method === 'PUT' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option>
                              </select>
                            </td>
                            <td className="p-2.5 font-bold text-gray-900 text-[12px]">
                              <input value={api.endpoint} onChange={(e)=>updateApi(api.id, 'endpoint', e.target.value)} className="w-full bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-indigo-300 rounded px-1.5 py-1" />
                            </td>
                            <td className="p-2.5 font-sans text-gray-700 text-[12px]">
                              <textarea value={api.desc} onChange={(e)=>updateApi(api.id, 'desc', e.target.value)} rows={1} className="w-full bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-indigo-300 rounded px-1.5 py-1 resize-none custom-scrollbar" />
                            </td>
                            <td className="p-2.5 text-center"><button onClick={() => handleDeleteApi(api.id)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md"><VscTrash size={14}/></button></td>
                          </tr>
                        )))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}