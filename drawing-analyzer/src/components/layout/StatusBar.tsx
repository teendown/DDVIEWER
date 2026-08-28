import React, { useState } from "react";
import { useDrawingStore } from "../../store/drawingStore";
import { Monitor, Layers, Activity, ShieldCheck, Sliders } from "lucide-react";
import { ResolutionSettingsModal } from "../common/ResolutionSettingsModal";

export const StatusBar: React.FC = () => {
  const { currentDrawing, zoom, objects, connections } = useDrawingStore();
  const [isResModalOpen, setIsResModalOpen] = useState(false);

  const zoomPercent = Math.round(zoom * 100);

  const connectorCount =
    objects.filter((o) => o.type === "connector" || o.type === "wire").length +
    connections.length;

  return (
    <>
      <footer className="h-7 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between px-4 text-[11px] text-slate-400 select-none z-20 font-mono">
        {/* 좌측 정보 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Monitor className="w-3.5 h-3.5 text-sky-400" />
            <span>도면: {currentDrawing ? `${currentDrawing.number || "DWG"} (${currentDrawing.title})` : "없음"}</span>
          </div>

          {currentDrawing && (
            <button
              onClick={() => setIsResModalOpen(true)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-sky-400 hover:text-sky-300 border border-slate-800 hover:border-slate-700 transition cursor-pointer"
              title="도면 해상도 및 외곽 메모 작업대 규격 설정 열기"
            >
              <Sliders className="w-3 h-3" />
              <span>해상도: {currentDrawing.originalWidth} &times; {currentDrawing.originalHeight}px</span>
            </button>
          )}
        </div>

      {/* 우측 정보 */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <span>객체: {objects.length}개</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-sky-400" />
          <span>연결: {connectorCount}개</span>
        </div>

        <div className="h-3 w-px bg-slate-800" />

        <div className="text-slate-300">
          배율: <span className="text-sky-400 font-semibold">{zoomPercent}%</span>
        </div>

        <div className="flex items-center gap-1 text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>오프라인 준비됨</span>
        </div>
        </div>
      </footer>

      <ResolutionSettingsModal
        isOpen={isResModalOpen}
        onClose={() => setIsResModalOpen(false)}
      />
    </>
  );
};
