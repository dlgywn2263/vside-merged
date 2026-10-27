import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isSidebarVisible: true,
  isTerminalVisible: true,
  isAgentVisible: true,
  isAboutVisible: false,
  isProjectModalVisible: false,
  isCommandPaletteVisible: false,

  // 오른쪽 패널 (팀채팅 & AI) 접힘 상태 관리
  // isRightPanelVisible 은 사용자가 고른 값이다. 창이 좁을 때(isRightPanelCompact) 자동으로 접는 것은
  // 이 값을 건드리지 않고 화면에서만 접어서, 다시 넓히면 사용자가 고른 상태로 돌아온다.
  isRightPanelVisible: true,
  isRightPanelCompact: false,
  // 좁은 창에서 아이콘 바로 연 패널. 에디터를 밀지 않고 위에 겹쳐 띄운다.
  isRightPanelOverlayOpen: false,

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

  // 음성채팅 상태
  isVoiceConnected: false,
  isPIPMode: false,

  isPreviewVisible: false,
  previewUrl: "",

  // Swing 같은 창 프로그램의 화면 주소. 서버가 화면 중계를 켰을 때만 값이 있다.
  // previewUrl(API 서버 주소)과 따로 둔다. 둘이 동시에 살아 있고 탭으로 오간다.
  guiPreviewUrl: "",
  // 앱이 다 켜졌는지. 켜지기 전의 빈 화면을 고장으로 오해하지 않게 안내를 덮어 둔다.
  isGuiAppReady: false,

  conflictNavigationTarget: null,
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.isSidebarVisible = !state.isSidebarVisible;
    },

    // 접기 버튼·아이콘 바·Ctrl+Shift+P 가 모두 이 액션을 쓰므로, 좁은 창이면 겹쳐 띄운 패널을 여닫는다.
    toggleRightPanel: (state) => {
      if (state.isRightPanelCompact) {
        state.isRightPanelOverlayOpen = !state.isRightPanelOverlayOpen;
      } else {
        state.isRightPanelVisible = !state.isRightPanelVisible;
      }
    },

    setRightPanelCompact: (state, action) => {
      const compact = Boolean(action.payload);
      if (state.isRightPanelCompact === compact) return;
      // 좁은 창에서 열어 둔 채로 넓히면 쓰던 패널을 그대로 붙여 보여 준다.
      if (!compact && state.isRightPanelOverlayOpen) state.isRightPanelVisible = true;
      state.isRightPanelCompact = compact;
      state.isRightPanelOverlayOpen = false;
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

      if (action.payload) {
        state.activeBottomTab = "output";
      }
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

    setVoiceConnected: (state, action) => {
      state.isVoiceConnected = action.payload;

      // 통화가 끊기면 PIP 상태도 같이 초기화
      if (!action.payload) {
        state.isPIPMode = false;
      }
    },

    setIsPIPMode: (state, action) => {
      state.isPIPMode = action.payload;
    },

    setIsPreviewVisible: (state, action) => {
      state.isPreviewVisible = action.payload;
    },

    setPreviewUrl: (state, action) => {
      state.previewUrl = action.payload;
    },

    setGuiPreviewUrl: (state, action) => {
      state.guiPreviewUrl = action.payload;
      state.isGuiAppReady = false;
    },

    setGuiAppReady: (state, action) => {
      state.isGuiAppReady = action.payload;
    },

    requestConflictNavigation: (state, action) => {
      const payload = action.payload || {};
      state.conflictNavigationTarget = {
        filePath: payload.filePath || "",
        requestedAt: payload.requestedAt || Date.now(),
      };
    },

    clearConflictNavigation: (state) => {
      state.conflictNavigationTarget = null;
    },
  },
});

export const {
  toggleSidebar,
  toggleRightPanel,
  setRightPanelCompact,
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

  setVoiceConnected,
  setIsPIPMode,

  setIsPreviewVisible,
  setPreviewUrl,
  setGuiPreviewUrl,
  setGuiAppReady,

  requestConflictNavigation,
  clearConflictNavigation,
} = uiSlice.actions;

export default uiSlice.reducer;