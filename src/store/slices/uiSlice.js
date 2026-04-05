import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isSidebarVisible: true,
  isTerminalVisible: true,
  isAgentVisible: true,
  isAboutVisible: false,
  isProjectModalVisible: false,
  isCommandPaletteVisible: false,

  codeMapMode: null,

  activeBottomTab: "terminal",
  activeActivity: "editor",
  activeDocsTab: "api",
  activeMyPageTab: "profile",

  isRunning: false,
  isDebugMode: false,

  debugLine: null,
  debugVariables: {},
  breakpoints: [],

  terminalOutput: null,
  editorCmd: null,
  pendingCreation: null,

  agentMessages: [],
  selectedText: "",
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.isSidebarVisible = !state.isSidebarVisible;
    },
    toggleTerminal: (state) => {
      state.isTerminalVisible = !state.isTerminalVisible;
    },
    toggleAgent: (state) => {
      state.isAgentVisible = !state.isAgentVisible;
    },
    toggleAbout: (state) => {
      state.isAboutVisible = !state.isAboutVisible;
    },

    closeCommandPalette: (state) => {
      state.isCommandPaletteVisible = false;
    },
    toggleCommandPalette: (state) => {
      state.isCommandPaletteVisible = !state.isCommandPaletteVisible;
    },

    setCodeMapMode: (state, action) => {
      state.codeMapMode = action.payload;
    },
    closeCodeMap: (state) => {
      state.codeMapMode = null;
    },

    setActiveBottomTab: (state, action) => {
      state.activeBottomTab = action.payload;
    },
    setActiveActivity: (state, action) => {
      state.activeActivity = action.payload;
    },
    setActiveDocsTab: (state, action) => {
      state.activeDocsTab = action.payload;
    },
    setActiveMyPageTab: (state, action) => {
      state.activeMyPageTab = action.payload;
    },

    openProjectModal: (state) => {
      state.isProjectModalVisible = true;
    },
    closeProjectModal: (state) => {
      state.isProjectModalVisible = false;
    },

    setRunning: (state, action) => {
      state.isRunning = action.payload;
    },
    setDebugMode: (state, action) => {
      state.isDebugMode = action.payload;
    },
    setCurrentDebugLine: (state, action) => {
      state.debugLine = action.payload;
      if (action.payload) state.activeBottomTab = "output";
    },
    updateDebugVariables: (state, action) => {
      state.debugVariables = action.payload;
    },

    toggleBreakpoint: (state, action) => {
      const { path, line } = action.payload;
      const exists = state.breakpoints.find(
        (bp) => bp.path === path && bp.line === line,
      );

      if (exists) {
        state.breakpoints = state.breakpoints.filter(
          (bp) => bp.path !== path || bp.line !== line,
        );
      } else {
        state.breakpoints.push({ path, line });
      }
    },

    writeToTerminal: (state, action) => {
      state.terminalOutput = { text: action.payload };
    },
    clearTerminalOutput: (state) => {
      state.terminalOutput = { text: "__CLEAR__" };
    },
    triggerEditorCmd: (state, action) => {
      state.editorCmd = action.payload;
    },

    startCreation: (state, action) => {
      state.pendingCreation = action.payload;
    },
    endCreation: (state) => {
      state.pendingCreation = null;
    },

    addAgentMessage: (state, action) => {
      state.agentMessages.push(action.payload);
      state.isAgentVisible = true;
      state.isDebugMode = false;
    },
    clearAgentMessages: (state) => {
      state.agentMessages = [];
    },
    setSelectedText: (state, action) => {
      state.selectedText = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  toggleTerminal,
  toggleAgent,
  toggleAbout,
  setActiveBottomTab,
  setActiveActivity,
  setActiveDocsTab,
  setActiveMyPageTab,
  openProjectModal,
  closeProjectModal,
  setRunning,
  setDebugMode,
  setCurrentDebugLine,
  updateDebugVariables,
  toggleBreakpoint,
  writeToTerminal,
  clearTerminalOutput,
  triggerEditorCmd,
  startCreation,
  endCreation,
  closeCommandPalette,
  toggleCommandPalette,
  setCodeMapMode,
  closeCodeMap,
  addAgentMessage,
  clearAgentMessages,
  setSelectedText,
} = uiSlice.actions;

export default uiSlice.reducer;
