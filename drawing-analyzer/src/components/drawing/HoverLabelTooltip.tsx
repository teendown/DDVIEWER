import React from "react";

export interface HoverInfo {
  x: number;
  y: number;
  id: string;
  label?: string;
  type: string;
  strokeColor?: string;
}

interface HoverLabelTooltipProps {
  hoverInfo: HoverInfo | null;
}

export const HoverLabelTooltip: React.FC<HoverLabelTooltipProps> = ({ hoverInfo }) => {
  if (!hoverInfo) return null;

  return (
    <div
      className="absolute pointer-events-none z-40 transition-all duration-75"
      style={{
        left: hoverInfo.x + 16,
        top: hoverInfo.y + 16,
      }}
    >
      <div className="bg-slate-900/95 text-slate-100 border border-slate-700/80 rounded-xl px-3.5 py-2 shadow-2xl backdrop-blur-md flex flex-col gap-1 min-w-[140px] max-w-[260px] animate-in fade-in zoom-in-95 duration-100">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-bold text-xs text-sky-400 font-mono">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block border border-slate-600"
              style={{ backgroundColor: hoverInfo.strokeColor || "#38bdf8" }}
            />
            <span>{hoverInfo.id}</span>
          </div>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">
            {hoverInfo.type}
          </span>
        </div>

        {hoverInfo.label && (
          <div className="text-xs text-slate-200 font-medium truncate">
            {hoverInfo.label}
          </div>
        )}
      </div>
    </div>
  );
};
