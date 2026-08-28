import React from "react";
import {
  MousePointer,
  Hand,
  Share2,
  MoveRight,
  Square,
  Circle as CircleIcon,
  Pentagon,
  Type,
  Highlighter,
  Undo2,
  Redo2,
} from "lucide-react";
import { useUIStore, type ActiveTool } from "../../store/uiStore";
import { useHistoryStore } from "../../store/historyStore";

export const LeftToolbar: React.FC = () => {
  const {
    editorMode,
    activeTool,
    setActiveTool,
    isLeftSidebarOpen,
  } = useUIStore();
  const { canUndo, canRedo, undo, redo } = useHistoryStore();

  if (!isLeftSidebarOpen || editorMode === "viewer") return null;

  const tools: Array<{
    id: ActiveTool;
    label: string;
    icon: React.ReactNode;
    shortcut?: string;
    color: string;
  }> = [
    {
      id: "select",
      label: "선택 도구 (Select)",
      icon: <MousePointer className="w-4 h-4" />,
      shortcut: "V",
      color: "text-slate-200",
    },
    {
      id: "arrow",
      label: "화살표 (Arrow)",
      icon: <MoveRight className="w-4 h-4" />,
      shortcut: "A",
      color: "text-emerald-400",
    },
    {
      id: "connector",
      label: "스마트 커넥터 (Connector)",
      icon: <Share2 className="w-4 h-4" />,
      shortcut: "C",
      color: "text-indigo-400",
    },
    {
      id: "rect",
      label: "사각형 노드 (Rect)",
      icon: <Square className="w-4 h-4" />,
      shortcut: "R",
      color: "text-blue-400",
    },
    {
      id: "circle",
      label: "원형 노드 (Circle)",
      icon: <CircleIcon className="w-4 h-4" />,
      shortcut: "O",
      color: "text-purple-400",
    },
    {
      id: "polygon",
      label: "다각형 (Polygon)",
      icon: <Pentagon className="w-4 h-4" />,
      shortcut: "P",
      color: "text-pink-400",
    },
    {
      id: "text",
      label: "텍스트 노드 (Text)",
      icon: <Type className="w-4 h-4" />,
      shortcut: "T",
      color: "text-amber-300",
    },
    {
      id: "highlight",
      label: "형광펜 (Highlight)",
      icon: <Highlighter className="w-4 h-4" />,
      shortcut: "H",
      color: "text-yellow-400",
    },
    {
      id: "pan",
      label: "화면 이동 (Pan)",
      icon: <Hand className="w-4 h-4" />,
      shortcut: "Space",
      color: "text-slate-300",
    },
  ];

  return (
    <aside className="w-14 bg-slate-900 border-r border-slate-800/80 flex flex-col items-center py-2.5 justify-between select-none z-20 shrink-0 shadow-2xl backdrop-blur-md">
      {/* 도구 아이콘 버튼 목록 */}
      <div className="flex flex-col items-center gap-1 w-full px-2">
        {tools.map((tool) => {
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              title={`${tool.label} ${tool.shortcut ? `[${tool.shortcut}]` : ""}`}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative group ${
                isActive
                  ? "bg-indigo-600/30 text-white border border-indigo-400/50 shadow-lg shadow-indigo-500/20"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
              }`}
            >
              <span className={isActive ? "text-indigo-300 scale-110 transition-transform" : tool.color}>
                {tool.icon}
              </span>

              {/* 툴팁 */}
              <div className="absolute left-14 px-2.5 py-1 bg-slate-950 text-slate-100 text-xs rounded-md shadow-xl border border-slate-800 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 font-medium">
                {tool.label} {tool.shortcut && <span className="text-slate-400 font-mono">[{tool.shortcut}]</span>}
              </div>

              {isActive && (
                <span className="absolute -left-1 top-2.5 bottom-2.5 w-1 bg-indigo-400 rounded-r-full shadow-md shadow-indigo-400/50" />
              )}
            </button>
          );
        })}
      </div>

      {/* 하단 Undo / Redo */}
      <div className="flex flex-col items-center gap-1 border-t border-slate-800/80 pt-2 w-full px-2">
        <button
          onClick={() => undo()}
          disabled={!canUndo}
          title="실행 취소 (Undo / Ctrl+Z)"
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition cursor-pointer ${
            canUndo
              ? "text-slate-300 hover:bg-slate-800 hover:text-white"
              : "text-slate-600 opacity-40 cursor-not-allowed"
          }`}
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => redo()}
          disabled={!canRedo}
          title="다시 실행 (Redo / Ctrl+Y)"
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition cursor-pointer ${
            canRedo
              ? "text-slate-300 hover:bg-slate-800 hover:text-white"
              : "text-slate-600 opacity-40 cursor-not-allowed"
          }`}
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
