import React, { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { VscAdd, VscRefresh, VscChevronLeft, VscEdit, VscTrash } from "react-icons/vsc";

import { fetchWorkspaceDevlogs, createDevlog, updateDevlog, deleteDevlog } from "@/lib/devlog/api";
import { DevlogFormModal } from "@/components/devlog/DevlogFormModal"; 

const defaultForm = {
  projectId: "",
  title: "",
  summary: "",
  content: "",
  date: new Date().toISOString().split("T")[0],
  tagsText: "",
  stage: "implementation", 
  goal: "",
  design: "",
  issue: "",
  solution: "",
  nextPlan: "",
  commitHash: "",
  progress: "0",
};

export default function DevlogPanel() {
  const { workspaceId, activeProject } = useSelector((state) => state.fileSystem);
  
  if (!workspaceId) {
    return (
      <div className="flex-1 w-full flex flex-col h-full items-center justify-center bg-[#f8fafc] text-slate-400 text-sm">
        <p>워크스페이스 정보를 불러올 수 없습니다.</p>
      </div>
    );
  }

  const [view, setView] = useState("list"); 
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  const [workspaceName, setWorkspaceName] = useState("워크스페이스");
  const [defaultProjectId, setDefaultProjectId] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState(null);
  const [form, setForm] = useState(defaultForm);

  const loadLogs = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    try {
      const data = await fetchWorkspaceDevlogs(workspaceId);
      setWorkspaceName(data.name || "워크스페이스");

      // 백엔드 전송용 고유 ID 추출 (첫 번째 프로젝트 또는 매칭되는 프로젝트 ID)
      let targetId = "";
      if (data.projects && data.projects.length > 0) {
        const matched = data.projects.find(p => p.name === activeProject || p.projectTitle === activeProject);
        targetId = matched ? (matched.projectId || matched.id) : (data.projects[0].projectId || data.projects[0].id);
      }
      setDefaultProjectId(String(targetId));

      let allLogs = [];
      data.projects?.forEach(p => {
        const pLogs = p.posts || p.devlogs || [];
        allLogs = [...allLogs, ...pLogs];
      });

      allLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
      setLogs(allLogs);

    } catch (error) {
      console.error("개발일지 로드 실패:", error);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, activeProject]);

  useEffect(() => {
    if (view === "list") loadLogs();
  }, [view, loadLogs]);

  const handleOpenCreate = () => {
    if (!defaultProjectId) {
      alert("데이터를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    setEditingTarget(null);
    setForm({ 
      ...defaultForm, 
      projectId: defaultProjectId,
      stage: "implementation" 
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (log) => {
    setEditingTarget(log);
    setForm({
      projectId: String(log.projectId || defaultProjectId),
      title: log.title || "",
      summary: log.summary || "",
      content: log.content || "",
      date: log.date || defaultForm.date,
      tagsText: log.tags ? (Array.isArray(log.tags) ? log.tags.join(", ") : log.tags) : "",
      stage: "implementation",
      goal: log.goal || "",
      design: log.design || "",
      issue: log.issue || "",
      solution: log.solution || "",
      nextPlan: log.nextPlan || "",
      commitHash: log.commitHash || "",
      progress: String(log.progress || 0),
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (logId, logProjectId) => {
    if (!window.confirm("정말 이 개발일지를 삭제하시겠습니까?")) return;
    try {
      await deleteDevlog(logId, workspaceId, Number(logProjectId || defaultProjectId));
      loadLogs();
      setView("list");
    } catch (e) {
      alert(e.message);
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return alert("제목을 입력해주세요.");
    const payload = { ...form, stage: "implementation" };

    try {
      if (editingTarget) {
        await updateDevlog(Number(editingTarget.id), workspaceId, payload);
      } else {
        await createDevlog(workspaceId, payload);
      }
      setIsFormOpen(false);
      loadLogs();
      if (view === "detail") setView("list");
    } catch (error) {
      alert(error.message);
    }
  };

  // ==========================================
  // 리스트 뷰
  // ==========================================
  if (view === "list") {
    return (
      <div className="flex-1 w-full h-full bg-[#f8fafc] font-sans p-6 overflow-y-auto custom-scrollbar">
        {/* 💡 [수정] max-w-5xl을 주어 가로로 너무 찢어지지 않게 방지합니다! */}
        <div className="max-w-5xl mx-auto flex flex-col gap-6 h-full">
          
          {/* 상단 타이틀 카드 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center justify-between shrink-0">
            <div>
              <div className="flex gap-2 items-center mb-3">
                <span className="bg-slate-800 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">개발일지</span>
              </div>
              <h2 className="text-[24px] font-extrabold text-slate-900 leading-tight">
                {workspaceName} 개발일지
              </h2>
              <p className="text-[13px] text-slate-500 mt-1.5">
                현재 작업 중인 워크스페이스의 개발 과정을 상세히 기록합니다.
              </p>
            </div>
            <button 
              onClick={handleOpenCreate} 
              className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl flex items-center gap-2 text-[14px] font-bold transition-all shadow-md"
            >
              <VscAdd size={18} /> 새 개발일지
            </button>
          </div>

          {/* 하단 일지 목록 */}
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col min-h-[400px]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[18px] font-extrabold text-slate-900">작성된 일지 목록</h3>
              <button onClick={loadLogs} className="text-slate-400 hover:text-slate-800 transition-colors p-2 rounded-lg hover:bg-slate-100">
                <VscRefresh size={20} className={isLoading ? "animate-spin" : ""} />
              </button>
            </div>

            <div className="flex-1 flex flex-col gap-4">
              {isLoading ? (
                <div className="text-xs font-bold text-slate-400 text-center py-20 animate-pulse">일지를 불러오는 중입니다...</div>
              ) : logs.length === 0 ? (
                <button onClick={handleOpenCreate} className="text-[13px] font-bold text-slate-400 text-center py-10 border border-dashed border-slate-300 rounded-2xl hover:bg-slate-50 transition-colors">
                  + 첫 개발일지를 작성해보세요
                </button>
              ) : (
                logs.map(log => (
                  <div 
                    key={log.id} 
                    className="p-5 rounded-2xl border border-slate-100 hover:border-slate-300 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-all cursor-pointer group flex flex-col gap-1"
                    onClick={() => { setSelectedLog(log); setView("detail"); }}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-bold text-slate-400">{log.date}</span>
                      <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md">구현</span>
                    </div>
                    <h4 className="text-[16px] font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors tracking-tight">
                      {log.title}
                    </h4>
                    <p className="text-[13px] text-slate-500 line-clamp-2 leading-relaxed mb-2">
                      {log.summary || "내용이 없습니다."}
                    </p>
                    {log.tags && (
                      <div>
                        <span className="text-[11px] text-slate-400 font-mono truncate bg-slate-50 inline-block px-2 py-1 rounded-md">
                          #{Array.isArray(log.tags) ? log.tags.join(' #') : log.tags}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 💡 [핵심] projects에 현재 워크스페이스 1개만 넣고, isProjectFixed=true로 잠가버립니다! */}
        {isFormOpen && (
          <DevlogFormModal 
            editingTarget={editingTarget}
            form={form}
            projects={[{ id: defaultProjectId, name: workspaceName }]} 
            setForm={setForm}
            onClose={() => setIsFormOpen(false)}
            onSubmit={handleSubmit}
            isStageFixed={true} 
            isProjectFixed={true} // 💡 프로젝트 드롭다운 비활성화!
          />
        )}
      </div>
    );
  }

  // ==========================================
  // 상세 뷰
  // ==========================================
  return (
    <div className="flex-1 w-full flex flex-col h-full bg-[#f8fafc] font-sans p-6 overflow-hidden">
      <div className="max-w-5xl mx-auto w-full bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
        
        {/* 헤더 */}
        <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 shrink-0 bg-white">
          <button onClick={() => setView("list")} className="flex items-center gap-1 text-[13px] font-bold text-slate-500 hover:text-slate-900 transition-colors">
            <VscChevronLeft size={18} /> 목록으로
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => handleOpenEdit(selectedLog)} className="px-3 py-1.5 text-[12px] font-bold text-slate-600 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1">
              <VscEdit size={14} /> 수정
            </button>
            <button onClick={() => handleDelete(selectedLog.id, selectedLog.projectId)} className="px-3 py-1.5 text-[12px] font-bold text-slate-600 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1">
              <VscTrash size={14} /> 삭제
            </button>
          </div>
        </div>
        
        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <div className="flex gap-2 items-center mb-4">
                <span className="text-[11px] font-bold bg-slate-800 text-white px-3 py-1 rounded-full">
                  {workspaceName}
                </span>
                <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">구현</span>
                <span className="text-[13px] font-medium text-slate-400 ml-1">{selectedLog.date}</span>
              </div>
              <h2 className="text-[28px] font-extrabold text-slate-900 leading-snug">
                {selectedLog.title}
              </h2>
              {selectedLog.tags && (
                <div className="text-[13px] text-slate-400 mt-3 font-mono">
                  #{Array.isArray(selectedLog.tags) ? selectedLog.tags.join(' #') : selectedLog.tags}
                </div>
              )}
            </div>
            
            <div className="space-y-8">
              {selectedLog.summary && (
                <div>
                  <h4 className="text-[14px] font-bold text-slate-900 mb-3 border-b pb-2">한 줄 요약</h4>
                  <p className="text-[14px] text-slate-700 bg-slate-50 p-5 rounded-2xl border border-slate-100 leading-relaxed">
                    {selectedLog.summary}
                  </p>
                </div>
              )}
              {/* ... (이하 내용 생략 방지 - goal, design, issue, solution, nextPlan, commitHash, content 렌더링 영역 유지) ... */}
              {selectedLog.goal && (
                <div>
                  <h4 className="text-[14px] font-bold text-slate-900 mb-3 border-b pb-2">목표</h4>
                  <p className="text-[14px] text-slate-700 whitespace-pre-wrap leading-relaxed px-1">
                    {selectedLog.goal}
                  </p>
                </div>
              )}
              {selectedLog.design && (
                <div>
                  <h4 className="text-[14px] font-bold text-slate-900 mb-3 border-b pb-2">설계</h4>
                  <p className="text-[14px] text-slate-700 whitespace-pre-wrap leading-relaxed px-1">
                    {selectedLog.design}
                  </p>
                </div>
              )}
              {selectedLog.issue && (
                <div>
                  <h4 className="text-[14px] font-bold text-slate-900 mb-3 border-b pb-2">문제 상황</h4>
                  <p className="text-[14px] text-slate-700 whitespace-pre-wrap leading-relaxed px-1">
                    {selectedLog.issue}
                  </p>
                </div>
              )}
              {selectedLog.solution && (
                <div>
                  <h4 className="text-[14px] font-bold text-slate-900 mb-3 border-b pb-2">해결 방법</h4>
                  <p className="text-[14px] text-slate-700 whitespace-pre-wrap leading-relaxed px-1">
                    {selectedLog.solution}
                  </p>
                </div>
              )}
              {selectedLog.nextPlan && (
                <div>
                  <h4 className="text-[14px] font-bold text-slate-900 mb-3 border-b pb-2">다음 계획</h4>
                  <p className="text-[14px] text-slate-700 whitespace-pre-wrap leading-relaxed px-1">
                    {selectedLog.nextPlan}
                  </p>
                </div>
              )}
              {selectedLog.commitHash && (
                <div>
                  <h4 className="text-[14px] font-bold text-slate-900 mb-3 border-b pb-2">커밋 / 브랜치</h4>
                  <p className="font-mono text-[13px] text-slate-600 bg-slate-100 px-4 py-2 rounded-lg inline-block">
                    {selectedLog.commitHash}
                  </p>
                </div>
              )}
              {selectedLog.content && (
                <div>
                  <h4 className="text-[14px] font-bold text-slate-900 mb-3 border-b pb-2">상세 내용</h4>
                  <div className="text-[14px] text-slate-800 bg-white p-6 rounded-2xl border border-slate-200 whitespace-pre-wrap leading-relaxed shadow-sm">
                    {selectedLog.content}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {isFormOpen && (
        <DevlogFormModal 
          editingTarget={editingTarget}
          form={form}
          projects={[{ id: defaultProjectId, name: workspaceName }]} 
          setForm={setForm}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleSubmit}
          isStageFixed={true} 
          isProjectFixed={true} 
        />
      )}
    </div>
  );
}