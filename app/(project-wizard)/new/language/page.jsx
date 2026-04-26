"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { VscCheck } from "react-icons/vsc";
import { DiJava, DiPython, DiHtml5, DiReact } from "react-icons/di";
import WizardShell from "@/components/new/WizardShell";
import { useWorkspaceWizard } from "@/store/workspaceWizardStore";

// 💡 우리가 이전에 만든 완벽한 템플릿 메타데이터입니다.
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

export default function Page() {
  const router = useRouter();
  
  const mode = useWorkspaceWizard((s) => s.mode);
  const language = useWorkspaceWizard((s) => s.language);
  const setLanguage = useWorkspaceWizard((s) => s.setLanguage);

  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [filter, setFilter] = useState("all");

  // 기존에 선택했던 언어가 있다면 해당 템플릿을 자동으로 찾아줍니다.
  useEffect(() => {
    if (language && !selectedTemplate) {
      const found = TEMPLATES.find(t => t.lang === language);
      if (found) setSelectedTemplate(found);
    }
  }, [language]);

  const goNext = () => {
    if (!selectedTemplate) return;
    
    // 1. 기존 Zustand 스토어 호환성을 위해 lang을 저장합니다.
    setLanguage(selectedTemplate.lang);

    // 2. 💡 [핵심 트릭] 다음 단계(config)에서 백엔드로 넘길 '템플릿 타입'을 임시 보관합니다.
    if (typeof window !== "undefined") {
      localStorage.setItem("wizard_template_type", selectedTemplate.type);
    }

    router.push("/new/config");
  };

  const goBack = () => router.push("/new/workspace");

  useEffect(() => {
    if (!mode) {
      router.replace("/new/workspace");
    }
  }, [mode, router]);

  if (!mode) return null;

  const filteredTemplates = TEMPLATES.filter((t) => filter === "all" || t.category === filter);

  return (
    <WizardShell>
      <div className="max-w-4xl mx-auto animate-fade-in-up">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          
          <div className="mb-8">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">템플릿 선택</h2>
            <p className="text-sm font-semibold text-gray-500 mt-1.5">원하시는 개발 환경의 템플릿을 선택해주세요.</p>
          </div>

          <div className="flex gap-2 mb-6 bg-gray-50 p-1.5 rounded-xl border border-gray-100 w-fit">
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

          <div className="grid grid-cols-2 gap-4 min-h-[300px] content-start">
            {filteredTemplates.map((template) => {
              const isSelected = selectedTemplate?.id === template.id;
              return (
                <div
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`relative flex items-center p-5 border-2 rounded-2xl cursor-pointer transition-all duration-200 ${
                    isSelected ? "border-blue-500 bg-blue-50/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]" : "border-gray-100 hover:border-blue-300 hover:shadow-sm bg-white"
                  }`}
                >
                  <div className="w-16 h-16 flex items-center justify-center bg-gray-50 rounded-xl mr-5 shrink-0 shadow-inner border border-gray-100">
                    {template.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-gray-800 text-[15px] truncate">{template.name}</div>
                    <div className="text-[12px] font-medium text-gray-500 mt-1.5 leading-snug break-keep">{template.desc}</div>
                  </div>
                  {isSelected && (
                    <div className="absolute top-4 right-4 bg-blue-500 rounded-full p-1 shadow-sm animate-fade-in">
                      <VscCheck size={14} className="text-white" strokeWidth={1} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-3 mt-10 pt-6 border-t border-gray-100">
            <button onClick={goBack} className="px-6 py-3 rounded-xl border border-gray-300 font-bold text-gray-600 hover:bg-gray-50 transition-colors">
              뒤로(B)
            </button>
            <button
              onClick={goNext}
              disabled={!selectedTemplate}
              className={`px-8 py-3 rounded-xl font-extrabold transition-all active:scale-95 ${
                !selectedTemplate
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-md"
              }`}
            >
              다음 단계로(N)
            </button>
          </div>
          
        </div>
      </div>
    </WizardShell>
  );
}