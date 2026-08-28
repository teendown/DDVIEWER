import { create } from "zustand";
import type { ArrowHeadType } from "../types";

export type EditorMode = "viewer" | "editor";

export type ActiveTool =
  | "select"
  | "pan"
  | "line"
  | "polyline"
  | "polygon"
  | "arrow"
  | "connector"
  | "rect"
  | "circle"
  | "text"
  | "component"
  | "wire"
  | "highlight";

export interface ToolDefaults {
  arrow: {
    strokeColor: string;
    strokeWidth: number;
    lineStyle: "solid" | "dashed" | "dotted";
    startCap: ArrowHeadType;
    endCap: ArrowHeadType;
    jointCap: ArrowHeadType;
    arrowScaleRatio: number;
  };
  line: {
    strokeColor: string;
    strokeWidth: number;
    lineStyle: "solid" | "dashed" | "dotted";
    startCap: ArrowHeadType;
    endCap: ArrowHeadType;
    jointCap: ArrowHeadType;
    arrowScaleRatio: number;
  };
  connector: {
    strokeColor: string;
    strokeWidth: number;
    lineStyle: "solid" | "dashed" | "dotted";
    startCap: ArrowHeadType;
    endCap: ArrowHeadType;
    jointCap: ArrowHeadType;
    arrowScaleRatio: number;
    connectorType: "polyline" | "curve" | "straight";
  };
  rect: {
    strokeColor: string;
    strokeWidth: number;
    borderRadius: number;
    fillEnabled: boolean;
    fillColor: string;
    fillOpacity: number;
    text?: string;
  };
  polygon: {
    strokeColor: string;
    strokeWidth: number;
    lineStyle: "solid" | "dashed" | "dotted";
    fillEnabled: boolean;
    fillColor: string;
    fillOpacity: number;
    text?: string;
  };
  circle: {
    strokeColor: string;
    strokeWidth: number;
    fillEnabled: boolean;
    fillColor: string;
    fillOpacity: number;
    text?: string;
  };
  wire: {
    strokeColor: string;
    strokeWidth: number;
    lineStyle: "solid" | "dashed" | "dotted";
    startCap: ArrowHeadType;
    endCap: ArrowHeadType;
    jointCap: ArrowHeadType;
    arrowScaleRatio: number;
  };
  highlight: {
    strokeColor: string;
    strokeWidth: number;
    opacity: number;
  };
  text: {
    textColor?: string;
    strokeColor: string;
    strokeWidth?: number;
    borderColor?: string;
    borderWidth?: number;
    borderEnabled?: boolean;
    fillEnabled?: boolean;
    fillColor?: string;
    fillOpacity?: number;
    padding?: number;
    borderRadius?: number;
    fontSize: number;
    fontFamily: string;
    letterSpacing: number;
    lineHeight: number;
    textAlign: "left" | "center" | "right";
  };
  component: {
    strokeColor: string;
    strokeWidth: number;
    borderRadius: number;
    fillEnabled: boolean;
    fillColor: string;
    fillOpacity: number;
    text?: string;
  };
}

export const INITIAL_TOOL_DEFAULTS: ToolDefaults = {
  arrow: {
    strokeColor: "#10b981",
    strokeWidth: 3,
    lineStyle: "solid",
    startCap: "none",
    endCap: "arrow",
    jointCap: "none",
    arrowScaleRatio: 1.0,
  },
  line: {
    strokeColor: "#38bdf8",
    strokeWidth: 3,
    lineStyle: "solid",
    startCap: "none",
    endCap: "none",
    jointCap: "none",
    arrowScaleRatio: 1.0,
  },
  connector: {
    strokeColor: "#6366f1",
    strokeWidth: 3,
    lineStyle: "solid",
    startCap: "none",
    endCap: "arrow",
    jointCap: "circle",
    arrowScaleRatio: 1.0,
    connectorType: "polyline",
  },
  rect: {
    strokeColor: "#6366f1",
    strokeWidth: 3,
    borderRadius: 8,
    fillEnabled: true,
    fillColor: "#1e1b4b",
    fillOpacity: 0.8,
    text: "",
  },
  polygon: {
    strokeColor: "#ec4899",
    strokeWidth: 3,
    lineStyle: "solid",
    fillEnabled: true,
    fillColor: "#831843",
    fillOpacity: 0.6,
    text: "",
  },
  circle: {
    strokeColor: "#a855f7",
    strokeWidth: 3,
    fillEnabled: true,
    fillColor: "#3b0764",
    fillOpacity: 0.8,
    text: "",
  },
  wire: {
    strokeColor: "#38bdf8",
    strokeWidth: 3,
    lineStyle: "solid",
    startCap: "none",
    endCap: "none",
    jointCap: "none",
    arrowScaleRatio: 1.0,
  },
  highlight: {
    strokeColor: "#facc15",
    strokeWidth: 20,
    opacity: 0.45,
  },
  text: {
    textColor: "#ffffff",
    strokeColor: "#38bdf8",
    strokeWidth: 1.5,
    borderColor: "#38bdf8",
    borderWidth: 1.5,
    borderEnabled: true,
    fillEnabled: true,
    fillColor: "#1e1b4b",
    fillOpacity: 0.9,
    padding: 8,
    borderRadius: 6,
    fontSize: 16,
    fontFamily: "Pretendard, sans-serif",
    letterSpacing: 0,
    lineHeight: 1.4,
    textAlign: "left",
  },
  component: {
    strokeColor: "#f59e0b",
    strokeWidth: 3,
    borderRadius: 6,
    fillEnabled: true,
    fillColor: "#451a03",
    fillOpacity: 0.7,
    text: "",
  },
};

const TOOL_DEFAULTS_STORAGE_KEY = "cad_tool_defaults_v2";

const loadSavedToolDefaults = (): ToolDefaults => {
  try {
    const raw = localStorage.getItem(TOOL_DEFAULTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        arrow: { ...INITIAL_TOOL_DEFAULTS.arrow, ...(parsed.arrow || {}) },
        line: { ...INITIAL_TOOL_DEFAULTS.line, ...(parsed.line || {}) },
        connector: { ...INITIAL_TOOL_DEFAULTS.connector, ...(parsed.connector || {}) },
        rect: { ...INITIAL_TOOL_DEFAULTS.rect, ...(parsed.rect || {}) },
        polygon: { ...INITIAL_TOOL_DEFAULTS.polygon, ...(parsed.polygon || {}) },
        circle: { ...INITIAL_TOOL_DEFAULTS.circle, ...(parsed.circle || {}) },
        wire: { ...INITIAL_TOOL_DEFAULTS.wire, ...(parsed.wire || {}) },
        highlight: { ...INITIAL_TOOL_DEFAULTS.highlight, ...(parsed.highlight || {}) },
        text: { ...INITIAL_TOOL_DEFAULTS.text, ...(parsed.text || {}) },
        component: { ...INITIAL_TOOL_DEFAULTS.component, ...(parsed.component || {}) },
      };
    }
  } catch (e) {
    console.error("Failed to load tool defaults:", e);
  }
  return INITIAL_TOOL_DEFAULTS;
};

const saveToolDefaultsToStorage = (defaults: ToolDefaults) => {
  try {
    localStorage.setItem(TOOL_DEFAULTS_STORAGE_KEY, JSON.stringify(defaults));
  } catch (e) {
    console.error("Failed to save tool defaults:", e);
  }
};

interface UIState {
  editorMode: EditorMode;
  activeTool: ActiveTool;
  highlightMode: "freehand" | "point"; // 형광펜 모드 (자유 그리기 vs 점과 점 그리기)
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
  toolDefaults: ToolDefaults;
  isLeftSidebarOpen: boolean;
  isRightSidebarOpen: boolean;
  isPropertyTabOpen: boolean; // 우측 슬라이딩 속성 패널
  isSnappingEnabled: boolean;  // 상단 스냅핑 토글 (기본 ON)
  isMultiView: boolean;
  multiViewCount: 1 | 2 | 4;
  zoomSync: boolean;
  panSync: boolean;

  // 스마트 커넥터 2.0 플로팅 HUD 상태
  isConnectorModalOpen: boolean;
  connectorModalPos: { x: number; y: number };
  connectorParentId: string | null;
  connectorConnectionMode: "1:N" | "N:1" | "chain";

  // 대시보드 & 사용자 인증 & 각종 공통 모달 상태
  isDashboardOpen: boolean;
  isAuthModalOpen: boolean;
  isOpenDrawingModalOpen: boolean;
  isLoadModalOpen: boolean;
  isSaveModalOpen: boolean;
  isExportModalOpen: boolean;
  isTimelineModalOpen: boolean;
  isResModalOpen: boolean;
  isShortcutsHelpOpen: boolean;
  isOfflineInstallOpen: boolean;

  setEditorMode: (mode: EditorMode) => void;
  setActiveTool: (tool: ActiveTool) => void;
  setHighlightMode: (mode: "freehand" | "point") => void;
  setStrokeColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setFillColor: (color: string) => void;
  updateToolDefaults: <K extends keyof ToolDefaults>(tool: K, defaults: Partial<ToolDefaults[K]>) => void;
  resetToolDefaults: (tool?: keyof ToolDefaults) => void; // 첫 기본값(Factory Default)으로 리셋
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  togglePropertyTab: () => void;
  setPropertyTabOpen: (open: boolean) => void;
  toggleSnapping: () => void;
  setSnappingEnabled: (enabled: boolean) => void;
  setMultiViewCount: (count: 1 | 2 | 4) => void;
  setZoomSync: (sync: boolean) => void;
  setPanSync: (sync: boolean) => void;

  setConnectorModalOpen: (open: boolean) => void;
  setConnectorModalPos: (pos: { x: number; y: number }) => void;
  setConnectorParentId: (id: string | null) => void;
  setConnectorConnectionMode: (mode: "1:N" | "N:1" | "chain") => void;

  setDashboardOpen: (open: boolean) => void;
  setAuthModalOpen: (open: boolean) => void;
  setOpenDrawingModalOpen: (open: boolean) => void;
  setLoadModalOpen: (open: boolean) => void;
  setSaveModalOpen: (open: boolean) => void;
  setExportModalOpen: (open: boolean) => void;
  setTimelineModalOpen: (open: boolean) => void;
  setResModalOpen: (open: boolean) => void;
  setShortcutsHelpOpen: (open: boolean) => void;
  setOfflineInstallOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => {
  const initialDefaults = loadSavedToolDefaults();

  return {
    editorMode: "viewer",
    activeTool: "select",
    highlightMode: "freehand",
    strokeColor: "#ef4444",
    strokeWidth: 3,
    fillColor: "transparent",
    toolDefaults: initialDefaults,

    isLeftSidebarOpen: true,
    isRightSidebarOpen: true,
    isPropertyTabOpen: true,
    isSnappingEnabled: true,
    isMultiView: false,
    multiViewCount: 1,
    zoomSync: false,
    panSync: false,

    isConnectorModalOpen: false,
    connectorModalPos: { x: 80, y: 80 },
    connectorParentId: null,
    connectorConnectionMode: "1:N",

    isDashboardOpen: false,
    isAuthModalOpen: false,
    isOpenDrawingModalOpen: false,
    isLoadModalOpen: false,
    isSaveModalOpen: false,
    isExportModalOpen: false,
    isTimelineModalOpen: false,
    isResModalOpen: false,
    isShortcutsHelpOpen: false,
    isOfflineInstallOpen: false,

    setEditorMode: (mode) =>
      set({
        editorMode: mode,
        activeTool: "select",
      }),

    setActiveTool: (tool) => {
      set({
        activeTool: tool,
        isConnectorModalOpen: tool === "connector",
      });
    },
    setHighlightMode: (mode) => set({ highlightMode: mode }),
    setStrokeColor: (color) => set({ strokeColor: color }),
    setStrokeWidth: (width) => set({ strokeWidth: width }),
    setFillColor: (color) => set({ fillColor: color }),

    updateToolDefaults: (tool, defaults) =>
      set((state) => {
        const nextDefaults = {
          ...state.toolDefaults,
          [tool]: {
            ...state.toolDefaults[tool],
            ...defaults,
          },
        };
        saveToolDefaultsToStorage(nextDefaults);
        return { toolDefaults: nextDefaults };
      }),

    resetToolDefaults: (tool) =>
      set((state) => {
        let nextDefaults: ToolDefaults;
        if (tool) {
          nextDefaults = {
            ...state.toolDefaults,
            [tool]: INITIAL_TOOL_DEFAULTS[tool],
          };
        } else {
          nextDefaults = INITIAL_TOOL_DEFAULTS;
        }
        saveToolDefaultsToStorage(nextDefaults);
        return { toolDefaults: nextDefaults };
      }),

    toggleLeftSidebar: () =>
      set((state) => ({ isLeftSidebarOpen: !state.isLeftSidebarOpen })),
    toggleRightSidebar: () =>
      set((state) => ({ isRightSidebarOpen: !state.isRightSidebarOpen })),
    togglePropertyTab: () =>
      set((state) => ({ isPropertyTabOpen: !state.isPropertyTabOpen })),
    setPropertyTabOpen: (open) => set({ isPropertyTabOpen: open }),
    toggleSnapping: () =>
      set((state) => ({ isSnappingEnabled: !state.isSnappingEnabled })),
    setSnappingEnabled: (enabled) => set({ isSnappingEnabled: enabled }),
    setMultiViewCount: (count) =>
      set({ multiViewCount: count, isMultiView: count > 1 }),
    setZoomSync: (sync) => set({ zoomSync: sync }),
    setPanSync: (sync) => set({ panSync: sync }),

    setConnectorModalOpen: (open) => set({ isConnectorModalOpen: open }),
    setConnectorModalPos: (pos) => set({ connectorModalPos: pos }),
    setConnectorParentId: (id) => set({ connectorParentId: id }),
    setConnectorConnectionMode: (mode) => set({ connectorConnectionMode: mode }),

    setDashboardOpen: (open) => set({ isDashboardOpen: open }),
    setAuthModalOpen: (open) => set({ isAuthModalOpen: open }),
    setOpenDrawingModalOpen: (open) => set({ isOpenDrawingModalOpen: open }),
    setLoadModalOpen: (open) => set({ isLoadModalOpen: open }),
    setSaveModalOpen: (open) => set({ isSaveModalOpen: open }),
    setExportModalOpen: (open) => set({ isExportModalOpen: open }),
    setTimelineModalOpen: (open) => set({ isTimelineModalOpen: open }),
    setResModalOpen: (open) => set({ isResModalOpen: open }),
    setShortcutsHelpOpen: (open) => set({ isShortcutsHelpOpen: open }),
    setOfflineInstallOpen: (open) => set({ isOfflineInstallOpen: open }),
  };
});
