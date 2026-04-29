import { create } from "zustand";

const initialState = {
  mode: null, // "personal" | "team"
  
  // 💡 1단계: 화면의 "프로젝트 생성" (실제로는 워크스페이스)
  projectName: "",
  projectDescription: "",
  
  // 💡 3단계: 화면의 "새 프로젝트 구성" (실제로는 내부 템플릿 프로젝트)
  templateName: "",
  templateDescription: "",
  
  language: "",
  path: "C:\\WebIDE\\workspaces", 
  teamMembers: [],
  projectKey: null,
};

export const useWorkspaceWizard = create((set) => ({
  ...initialState,

  setMode: (mode) => set({ mode }),
  
  // 💡 상태 변경 함수명도 변경 완료
  setProjectName: (projectName) => set({ projectName }),
  setProjectDescription: (projectDescription) => set({ projectDescription }),
  
  setTemplateName: (templateName) => set({ templateName }),
  setTemplateDescription: (templateDescription) => set({ templateDescription }),

  setLanguage: (language) => set({ language }),
  setPath: (path) => set({ path }), 
  setProjectKey: (projectKey) => set({ projectKey }),

  addTeamMember: (email) =>
    set((state) => {
      const normalized = email.trim();
      if (!normalized) return state;
      if (state.teamMembers.includes(normalized)) return state;

      return {
        teamMembers: [...state.teamMembers, normalized],
      };
    }),

  removeTeamMember: (emailToRemove) =>
    set((state) => ({
      teamMembers: state.teamMembers.filter((email) => email !== emailToRemove),
    })),

  setTeamMembers: (teamMembers) => set({ teamMembers }),

  reset: () => set({ ...initialState }),
}));