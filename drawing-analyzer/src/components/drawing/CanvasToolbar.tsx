import React from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  RotateCcw,
  MousePointer,
  PenTool,
} from "lucide-react";
import { useDrawingStore } from "../../store/drawingStore";
import { useUIStore } from "../../store/uiStore";

interface CanvasToolbarProps {
  onFitScreen: () => void;
  onActualSize: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  onFitScreen,
  onActualSize,
  onZoomIn,
  onZoomOut,
  onResetView,
}) => {
  const { zoom } = useDrawingStore();
  const { editorMode, setEditorMode } = useUIStore();

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-2xl">
      {/* 모드 전환 토글 */}
      <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg mr-1 border border-slate-700">
        <button
          onClick={() => setEditorMode("viewer")}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
            editorMode === "viewer"
              ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
              : "text-slate-400 hover:text-slate-200"
          }`}
          title="뷰어 모드 (도면 탐색 및 이동)"
        >
          <MousePointer className="w-3.5 h-3.5" />
          뷰어 모드
        </button>
        <button
          onClick={() => setEditorMode("editor")}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
            editorMode === "editor"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-400 hover:text-slate-200"
          }`}
          title="편집 모드 (도면 마킹 및 객체 생성)"
        >
          <PenTool className="w-3.5 h-3.5" />
          편집 모드
        </button>
      </div>

      <div className="h-4 w-px bg-slate-700 mx-1" />

      {/* 줌 컨트롤 */}
      <button
        onClick={onZoomOut}
        className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
        title="축소 (Ctrl + Wheel Down)"
      >
        <ZoomOut className="w-4 h-4" />
      </button>

      <span
        onClick={onActualSize}
        className="text-xs font-mono font-medium text-slate-300 px-2 py-0.5 hover:bg-slate-800 rounded cursor-pointer min-w-[50px] text-center"
        title="클릭 시 100% 원본 크기"
      >
        {zoomPercent}%
      </span>

      <button
        onClick={onZoomIn}
        className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
        title="확대 (Ctrl + Wheel Up)"
      >
        <ZoomIn className="w-4 h-4" />
      </button>

      <div className="h-4 w-px bg-slate-700 mx-1" />

      {/* 화면 맞춤 및 리셋 */}
      <button
        onClick={onFitScreen}
        className="flex items-center gap-1 px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
        title="화면 맞춤 (Fit to Screen)"
      >
        <Maximize className="w-3.5 h-3.5 text-sky-400" />
        <span>화면 맞춤</span>
      </button>

      <button
        onClick={onResetView}
        className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
        title="뷰포트 초기화"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
