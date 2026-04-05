import { create } from "zustand";

const initialState = {
  mode: null, // "personal" | "team"
  name: "",
  description: "",
  language: "",
  teamMembers: [],
  projectKey: null,
};

export const useWorkspaceWizard = create((set) => ({
  ...initialState,

  setMode: (mode) => set({ mode }),
  setName: (name) => set({ name }),
  setDescription: (description) => set({ description }),
  setLanguage: (language) => set({ language }),
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
