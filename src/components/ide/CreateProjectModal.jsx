"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { VscClose, VscChevronLeft, VscCheck } from "react-icons/vsc";
import { DiJava, DiPython, DiJsBadge, DiHtml5, DiReact } from "react-icons/di";

import { closeProjectModal, writeToTerminal } from "@/store/slices/uiSlice";
import {
  setProjectList,
  setWorkspaceTree,
  setActiveProject,
} from "@/store/slices/fileSystemSlice";
import {
  createProjectInWorkspaceApi,
  fetchWorkspaceProjectsApi,
} from "@/lib/ide/api";

const TEMPLATES = [
  { id: "spring", type: "SPRING_BOOT", lang: "JAVA", category: "server", name: "Spring Boot", desc: "엔터프라이즈급 REST API 및 JPA 활용", icon: <DiJava size={44} className="text-green-600" /> },
  { id: "react", type: "REACT", lang: "JAVASCRIPT", category: "frontend", name: "React / Next.js", desc: "컴포넌트 기반 모던 웹 프론트엔드", icon: <DiReact size={44} className="text-blue-400" /> },
  { id: "vanilla", type: "VANILLA", lang: "HTML", category: "frontend", name: "Vanilla Web", desc: "HTML / CSS / JS 빌드 없는 기본 웹", icon: <DiHtml5 size={44} className="text-orange-500" /> },
  { id: "console_java", type: "CONSOLE", lang: "JAVA", category: "console", name: "Java Console", desc: "객체지향 기본 학습 및 알고리즘", icon: <DiJava size={44} className="text-orange-400" /> },
  { id: "console_py", type: "CONSOLE", lang: "PYTHON", category: "console", name: "Python Console", desc: "가벼운 스크립트, 코딩 테스트", icon: <DiPython size={44} className="text-blue-500" /> },
  { id: "console_cpp", type: "CONSOLE", lang: "CPP", category: "console", name: "C / C++ Console", desc: "알고리즘 및 시스템 프로그래밍", icon: <div className="text-2xl font-black text-blue-600">C++</div> },
];

const FILTERS = [
  { id: "all", label: "전체" },
  { id: "frontend", label: "프론트엔드" },
  { id: "server", label: "서버" },
  { id: "console", label: "콘솔" },
];

export default function CreateProjectModal() {
  const dispatch = useDispatch();
  const { isProjectModalVisible } = useSelector((state) => state.ui);
  const { workspaceId } = useSelector((state) => state.fileSystem);

  const [step, setStep] = useState(1);
  const [filter, setFilter] = useState("all");
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  
  const [formData, setFormData] = useState({ name: "", description: "", gitUrl: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isProjectModalVisible) return null;

  const filteredTemplates = TEMPLATES.filter((t) => filter === "all" || t.category === filter);

  const handleNext = () => {
    if (!selectedTemplateId) return alert("원하시는 템플릿을 선택해주세요.");
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return alert("프로젝트 이름을 입력해주세요.");
    setIsSubmitting(true);
    const chosenTemplate = TEMPLATES.find((t) => t.id === selectedTemplateId);

    try {
      // 💡 [수정 완료] 이제 객체 형태로 감싸서 파라미터가 누락되거나 순서가 꼬이지 않게 보냅니다!
      await createProjectInWorkspaceApi({
        workspaceId: workspaceId,
        projectName: formData.name,
        language: chosenTemplate.lang,
        description: formData.description,
        gitUrl: formData.gitUrl,
        templateType: chosenTemplate.type,
      });

      dispatch(writeToTerminal(`[System] '${formData.name}' 프로젝트가 [${chosenTemplate.name}] 템플릿으로 생성되었습니다.\n`));

      const projectsRoot = await fetchWorkspaceProjectsApi(workspaceId);
      dispatch(setProjectList(projectsRoot.children || []));
      dispatch(setWorkspaceTree(projectsRoot));
      dispatch(setActiveProject(formData.name));
      dispatch(writeToTerminal(`[System] 시작 프로젝트가 변경되었습니다: ${formData.name}\n`));

      dispatch(closeProjectModal());
      setStep(1);
      setFormData({ name: "", description: "", gitUrl: "" });
      setSelectedTemplateId(null);
    } catch (e) {
      alert("생성 실패: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-[#fbfbfc] flex flex-col font-sans animate-fade-in">
      
      <header className="h-16 bg-[#1e1e1e] flex items-center justify-between px-6 shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <span className="font-black text-white tracking-widest text-lg">VSIDE</span>
          <span className="text-gray-600 font-light">/</span>
          <span className="font-bold text-sm text-gray-300">새로운 프로젝트 생성</span>
        </div>
        <button 
          onClick={() => dispatch(closeProjectModal())} 
          className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors flex items-center gap-2 text-sm font-bold"
        >
          돌아가기 <VscClose size={22} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto flex flex-col items-center pt-10 pb-20 px-4 custom-scrollbar">
        <div className="w-full max-w-[800px] bg-white border border-gray-200 rounded-2xl shadow-xl flex flex-col overflow-hidden min-h-[600px]">
          
          <div className="h-20 px-8 border-b border-gray-100 flex items-center shrink-0 bg-gray-50/50">
            <div className="flex items-center gap-4">
              {step === 2 && (
                <button onClick={() => setStep(1)} className="p-2 hover:bg-gray-200 rounded-full transition shadow-sm bg-white border border-gray-200">
                  <VscChevronLeft size={20} className="text-gray-600" />
                </button>
              )}
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">
                  {step === 1 ? "템플릿 선택" : "프로젝트 설정"}
                </h2>
                <p className="text-[12px] font-bold text-gray-400 mt-1">
                  {step === 1
                    ? "원하시는 개발 환경의 템플릿을 선택해주세요."
                    : "프로젝트 이름과 설명을 입력해주세요."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {step === 1 ? (
              <div className="flex flex-col h-full p-8 pb-4">
                <div className="flex gap-2 mb-8 bg-gray-50 p-1.5 rounded-xl border border-gray-100 w-fit">
                  {FILTERS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFilter(f.id)}
                      className={`px-5 py-2 text-[13px] font-bold rounded-lg transition-all ${
                        filter === f.id ? "bg-white text-blue-600 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                  <div className="grid grid-cols-2 gap-5 pb-8">
                    {filteredTemplates.map((template) => {
                      const isSelected = selectedTemplateId === template.id;
                      return (
                        <div
                          key={template.id}
                          onClick={() => setSelectedTemplateId(template.id)}
                          className={`relative flex items-center p-5 border-2 rounded-2xl cursor-pointer transition-all duration-200 ${
                            isSelected ? "border-blue-500 bg-blue-50/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]" : "border-gray-100 hover:border-blue-300 hover:shadow-md bg-white"
                          }`}
                        >
                          <div className="w-16 h-16 flex items-center justify-center bg-gray-50 rounded-xl mr-5 shrink-0 shadow-inner border border-gray-100">
                            {template.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-extrabold text-gray-800 text-[15px] truncate">{template.name}</div>
                            <div className="text-[12px] text-gray-500 mt-1.5 leading-snug break-keep">{template.desc}</div>
                          </div>
                          {isSelected && (
                            <div className="absolute top-4 right-4 bg-blue-500 rounded-full p-0.5 shadow-sm animate-fade-in">
                              <VscCheck size={14} className="text-white" strokeWidth={1} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-10 space-y-8 max-w-xl mx-auto w-full pt-12">
                <div className="flex items-center gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-gray-100">
                    {TEMPLATES.find((t) => t.id === selectedTemplateId)?.icon}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 mb-0.5">선택된 템플릿</p>
                    <p className="text-[15px] font-black text-gray-800">{TEMPLATES.find((t) => t.id === selectedTemplateId)?.name}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-extrabold text-gray-700 mb-2.5">프로젝트 이름 <span className="text-red-500">*</span></label>
                  <input
                    autoFocus
                    placeholder="my-awesome-project"
                    className="w-full bg-white border border-gray-300 rounded-xl px-5 py-3.5 text-[14px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all font-medium"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-extrabold text-gray-700 mb-2.5">프로젝트 설명</label>
                  <input
                    placeholder="이 프로젝트에 대한 간단한 설명을 적어주세요."
                    className="w-full bg-white border border-gray-300 rounded-xl px-5 py-3.5 text-[14px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-extrabold text-gray-700 mb-1.5">GitHub 저장소 (선택사항)</label>
                  <p className="text-[11px] font-bold text-gray-400 mb-3">나중에 설정에서 연결할 수도 있습니다.</p>
                  <input
                    className="w-full bg-white border border-gray-300 rounded-xl px-5 py-3.5 text-[14px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all placeholder-gray-300 font-mono"
                    placeholder="https://github.com/username/repository.git"
                    value={formData.gitUrl}
                    onChange={(e) => setFormData({ ...formData, gitUrl: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="h-20 px-8 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-4 shrink-0">
            <button
              onClick={() => dispatch(closeProjectModal())}
              className="px-6 py-3 rounded-xl border border-gray-300 bg-white text-[14px] font-bold text-gray-600 hover:bg-gray-100 transition-colors shadow-sm"
            >
              취소
            </button>
            
            {step === 1 ? (
              <button
                onClick={handleNext}
                disabled={!selectedTemplateId}
                className="px-10 py-3 rounded-xl bg-blue-600 text-white text-[14px] font-extrabold hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 disabled:shadow-none active:scale-95"
              >
                다음 단계로
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-10 py-3 rounded-xl bg-[#2B2D31] text-white text-[14px] font-extrabold hover:bg-black transition-all shadow-md active:scale-95 flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? "생성 중..." : "🚀 프로젝트 생성"}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}