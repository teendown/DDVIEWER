import React, { useState } from "react";
import { Check, Pipette } from "lucide-react";

interface ColorPalettePickerProps {
  selectedColor?: string;
  onChange: (color: string) => void;
  label?: string;
  showCustomInput?: boolean;
}

const DEFAULT_PALETTE = [
  "#38bdf8", // 하늘색 (Sky)
  "#3b82f6", // 파란색 (Blue)
  "#6366f1", // 인디고 (Indigo)
  "#a855f7", // 보라색 (Purple)
  "#ec4899", // 핑크 (Pink)
  "#ef4444", // 빨간색 (Red)
  "#f97316", // 주황색 (Orange)
  "#eab308", // 노란색 (Yellow)
  "#84cc16", // 라임 (Lime)
  "#10b981", // 초록색 (Emerald)
  "#14b8a6", // 청록색 (Teal)
  "#f8fafc", // 흰색 (White)
  "#94a3b8", // 회색 (Slate)
  "#0f172a", // 어두운 남색 (Dark)
];

export const ColorPalettePicker: React.FC<ColorPalettePickerProps> = ({
  selectedColor = "#ef4444",
  onChange,
  label,
  showCustomInput = true,
}) => {
  const [customHex, setCustomHex] = useState(selectedColor);

  React.useEffect(() => {
    setCustomHex(selectedColor);
  }, [selectedColor]);

  const handleColorSelect = (color: string) => {
    setCustomHex(color);
    onChange(color);
  };

  const handleCustomInput = (inputVal: string) => {
    const cleanHex = inputVal.replace(/[^0-9A-Fa-f]/g, "").slice(0, 6);
    const formatted = cleanHex ? `#${cleanHex}` : "#";
    setCustomHex(formatted);
    if (/^#[0-9A-Fa-f]{6}$/.test(formatted)) {
      onChange(formatted);
    }
  };

  return (
    <div className="space-y-2 select-none">
      {label && (
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span>{label}</span>
          <span className="font-mono text-[10px] text-slate-500 uppercase">{selectedColor}</span>
        </div>
      )}

      {/* 1. 프리셋 및 커스텀 컬러 그리드 */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-900/90 rounded-xl border border-slate-800">
        {DEFAULT_PALETTE.map((color) => {
          const isSelected = selectedColor.toLowerCase() === color.toLowerCase();
          return (
            <button
              key={color}
              type="button"
              onClick={() => handleColorSelect(color)}
              style={{ backgroundColor: color }}
              className={`relative w-5 h-5 rounded-full border transition-all cursor-pointer flex items-center justify-center ${
                isSelected
                  ? "scale-115 border-white ring-2 ring-sky-400/80 shadow-md"
                  : "border-slate-700/80 hover:scale-110 hover:border-slate-400 opacity-90 hover:opacity-100"
              }`}
              title={color}
            >
              {isSelected && (
                <Check
                  className={`w-2.5 h-2.5 ${
                    color === "#f8fafc" || color === "#eab308" || color === "#84cc16" || color === "#38bdf8"
                      ? "text-slate-950"
                      : "text-white"
                  }`}
                />
              )}
            </button>
          );
        })}

        {/* 현재 선택 색상이 프리셋에 없을 때만 단 1개의 커스텀 색상 칩 표시 */}
        {!DEFAULT_PALETTE.some((c) => c.toLowerCase() === selectedColor.toLowerCase()) &&
          selectedColor.startsWith("#") && (
            <button
              type="button"
              style={{ backgroundColor: selectedColor }}
              className="relative w-5 h-5 rounded-full border border-white ring-2 ring-amber-400 shadow-md flex items-center justify-center cursor-pointer scale-110"
              title={`현재 커스텀 색상: ${selectedColor}`}
            >
              <Check className="w-2.5 h-2.5 text-white drop-shadow" />
            </button>
          )}

        {/* 2. 네이티브 컬러 피커 버튼 */}
        <label className="relative w-5 h-5 rounded-full bg-slate-800 hover:bg-slate-700 border border-dashed border-slate-600 hover:border-sky-400 flex items-center justify-center cursor-pointer transition" title="새로운 색상 직접 선택 (Color Picker)">
          <Pipette className="w-2.5 h-2.5 text-sky-400" />
          <input
            type="color"
            value={selectedColor.startsWith("#") ? selectedColor : "#38bdf8"}
            onChange={(e) => handleCustomInput(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </label>
      </div>

      {/* 3. HEX 직접 입력창 */}
      {showCustomInput && (
        <div className="flex items-center gap-1.5 bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800">
          <div
            className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0"
            style={{ backgroundColor: selectedColor }}
          />
          <span className="text-[10px] text-slate-500 font-mono">#</span>
          <input
            type="text"
            value={customHex.replace("#", "")}
            onChange={(e) => handleCustomInput(e.target.value)}
            placeholder="HEX 코드 (예: 38BDF8)"
            maxLength={6}
            className="w-full bg-transparent text-[11px] font-mono text-slate-200 uppercase focus:outline-none placeholder:text-slate-600"
          />
        </div>
      )}
    </div>
  );
};
