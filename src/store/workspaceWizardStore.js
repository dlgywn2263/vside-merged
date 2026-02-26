import { create } from "zustand";

export const useWorkspaceWizard = create((set) => ({
  mode: null, // "personal" | "team"
  name: "",
  description: "",
  language: "",
  teamMembers: [],
  projectKey: null,

  setMode: (mode) => set({ mode }),
  setName: (name) => set({ name }),
  setDescription: (description) => set({ description }),
  setLanguage: (language) => set({ language }),
  addTeamMember: (email) =>
    set((state) => ({
      teamMembers: [...state.teamMembers, email],
    })),

  reset: () =>
    set({
      mode: null,
      name: "",
      description: "",
      language: "",
      teamMembers: [],
      projectKey: null,
    }),
}));
