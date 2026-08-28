import React, { useState, useRef, useEffect } from "react";
import {
  MousePointer,
  MoveRight,
  Share2,
  Square,
  Circle as CircleIcon,
  Pentagon,
  Type,
  Highlighter,
  ChevronDown,
  Eye,
  EyeOff,
  Trash2,
  RotateCcw,
  Edit3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Spline,
  Pencil,
  PenTool,
} from "lucide-react";
import { useUIStore } from "../../store/uiStore";
import { useDrawingStore } from "../../store/drawingStore";
import { useHistoryStore } from "../../store/historyStore";
import { ColorPalettePicker } from "../common/ColorPalettePicker";
import type { ArrowHeadType } from "../../types";

const STROKE_WIDTHS = [1, 2, 3, 5, 8, 12];
const TEXT_BORDER_WIDTHS = [0, 1, 2, 3, 5, 8];
const PADDING_SIZES = [2, 4, 6, 8, 12, 16, 20, 24];
const HIGHLIGHT_WIDTHS = [12, 20, 32, 48];
const TEXT_SIZES = [11, 12, 14, 16, 20, 24, 32, 44];
const ARROW_SCALES = [0.8, 1.0, 1.2, 1.5, 2.0];
const BORDER_RADII = [0, 4, 8, 16, 24];
const HIGHLIGHT_OPACITIES = [
  { label: "연하게 (25%)", value: 0.25 },
  { label: "보통 (45%)", value: 0.45 },
  { label: "진하게 (70%)", value: 0.7 },
];

const ARROW_START_OPTIONS: { id: ArrowHeadType; label: string; preview: string }[] = [
  { id: "none", label: "없음", preview: "─" },
  { id: "arrow", label: "화살표", preview: "←" },
  { id: "triangle", label: "삼각 채움", preview: "◀" },
  { id: "circle", label: "원형 점", preview: "●" },
  { id: "square", label: "사각형", preview: "■" },
  { id: "diamond", label: "다이아", preview: "◆" },
  { id: "slash", label: "슬래시", preview: "/" },
];

const ARROW_END_OPTIONS: { id: ArrowHeadType; label: string; preview: string }[] = [
  { id: "none", label: "없음", preview: "─" },
  { id: "arrow", label: "화살표", preview: "→" },
  { id: "triangle", label: "삼각 채움", preview: "▶" },
  { id: "circle", label: "원형 점", preview: "●" },
  { id: "square", label: "사각형", preview: "■" },
  { id: "diamond", label: "다이아", preview: "◆" },
  { id: "slash", label: "슬래시", preview: "/" },
];

const JOINT_OPTIONS: { id: ArrowHeadType; label: string; preview: string }[] = [
  { id: "none", label: "없음", preview: "─" },
  { id: "circle", label: "원형 접속점", preview: "●" },
  { id: "diamond", label: "다이아", preview: "◆" },
  { id: "square", label: "사각형", preview: "■" },
];

const CONNECTOR_TYPES: { id: "polyline" | "curve" | "straight"; label: string }[] = [
  { id: "polyline", label: "직각 배선 (Polyline)" },
  { id: "curve", label: "곡선 (Curved)" },
  { id: "straight", label: "직선 (Straight)" },
];

export const TopToolbar: React.FC = () => {
  const {
    editorMode,
    activeTool,
    highlightMode,
    setHighlightMode,
    toolDefaults,
    updateToolDefaults,
    resetToolDefaults,
  } = useUIStore();
  const {
    selectedObjectId,
    selectedObjectIds,
    objects,
    batchUpdateObjects,
    removeObjects,
    setSelectedObjectId,
    setSelectedObjectIds,
  } = useDrawingStore();
  const { pushState } = useHistoryStore();

  // 드롭다운 열림 상태 관리
  const [openDropdown, setOpenDropdown] = useState<
    | "strokeColor"
    | "strokeWidth"
    | "lineStyle"
    | "startCap"
    | "endCap"
    | "jointCap"
    | "arrowScale"
    | "connectorType"
    | "fillColor"
    | "borderRadius"
    | "fontSize"
    | "textColor"
    | "highlightOpacity"
    | "padding"
    | null
  >(null);

  const toolbarRef = useRef<HTMLDivElement>(null);

  // 바깥 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (editorMode === "viewer") return null;

  // 현재 선택된 객체 또는 활성 도구의 기본 속성 계산
  const targetIds = selectedObjectIds.length > 0 ? selectedObjectIds : selectedObjectId ? [selectedObjectId] : [];
  const selectedObj = objects.find((o) => o.id === selectedObjectId) || objects.find((o) => selectedObjectIds.includes(o.id));

  // 현재 도구별 설정값 (선택된 객체 타입 최우선 매핑)
  const selectedType = selectedObj?.type;
  const currentToolKey =
    selectedType === "rectangle" ? "rect" :
    selectedType === "circle" ? "circle" :
    selectedType === "polygon" ? "polygon" :
    selectedType === "component" ? "component" :
    selectedType === "text" ? "text" :
    selectedType === "arrow" ? "arrow" :
    selectedType === "connector" ? "connector" :
    selectedType === "line" || selectedType === "polyline" || selectedType === "wire" ? "wire" :
    selectedType === "highlight" ? "highlight" :
    activeTool === "arrow" ? "arrow" :
    activeTool === "connector" ? "connector" :
    activeTool === "line" || activeTool === "polyline" || activeTool === "wire" ? "wire" :
    activeTool === "rect" ? "rect" :
    activeTool === "circle" ? "circle" :
    activeTool === "polygon" ? "polygon" :
    activeTool === "highlight" ? "highlight" :
    activeTool === "text" ? "text" : "arrow";

  const curStrokeColor = selectedObj?.strokeColor || (toolDefaults as any)[currentToolKey]?.strokeColor || "#38bdf8";
  const curStrokeWidth = selectedObj?.strokeWidth || (toolDefaults as any)[currentToolKey]?.strokeWidth || (activeTool === "highlight" ? 20 : 3);
  const curLineStyle = selectedObj?.lineStyle || (toolDefaults as any)[currentToolKey]?.lineStyle || "solid";
  const curStartCap = selectedObj?.startCap || (toolDefaults as any)[currentToolKey]?.startCap || "none";
  const curEndCap = selectedObj?.endCap || (toolDefaults as any)[currentToolKey]?.endCap || (activeTool === "arrow" ? "arrow" : "none");
  const curJointCap = selectedObj?.jointCap || (toolDefaults as any)[currentToolKey]?.jointCap || (activeTool === "connector" ? "circle" : "none");
  const curArrowScale = selectedObj?.arrowScaleRatio || (toolDefaults as any)[currentToolKey]?.arrowScaleRatio || 1.0;
  const curConnectorType = selectedObj?.connectorType || (toolDefaults as any).connector?.connectorType || "polyline";
  const curBorderRadius = selectedObj?.borderRadius ?? (toolDefaults as any).rect?.borderRadius ?? 8;
  const curFillEnabled = selectedObj?.fillEnabled ?? (toolDefaults as any)[currentToolKey]?.fillEnabled ?? false;
  const curFillColor = selectedObj?.fillColor || (toolDefaults as any)[currentToolKey]?.fillColor || "#1e1b4b";
  const curTextColor = selectedObj?.textColor || (toolDefaults as any).text?.textColor || "#ffffff";
  const curFontSize = selectedObj?.fontSize || (toolDefaults as any)[currentToolKey]?.fontSize || 16;
  const curFontWeight = selectedObj?.fontWeight || "normal";
  const curTextAlign = selectedObj?.textAlign || "left";
  const curPadding = selectedObj?.padding ?? (toolDefaults as any).text?.padding ?? 8;
  const curHighlightOpacity = selectedObj?.opacity ?? (toolDefaults as any).highlight?.opacity ?? 0.45;
  const curInnerText = selectedObj?.text ?? (selectedObj?.label ?? ((toolDefaults as any)[currentToolKey]?.text || ""));
  const isAllVisible = targetIds.length > 0 && targetIds.every((id) => objects.find((o) => o.id === id)?.visible !== false);

  const isShapeSelected =
    activeTool === "rect" ||
    activeTool === "circle" ||
    activeTool === "polygon" ||
    (activeTool === "select" &&
      (selectedObj?.type === "rectangle" ||
        selectedObj?.type === "circle" ||
        selectedObj?.type === "polygon" ||
        selectedObj?.type === "component"));

  const isTextSelected =
    activeTool === "text" ||
    (activeTool === "select" && selectedObj?.type === "text");

  const canHaveFill = isShapeSelected || isTextSelected;

  const isLineOrArrow =
    activeTool === "arrow" ||
    activeTool === "connector" ||
    activeTool === "line" ||
    activeTool === "polyline" ||
    activeTool === "wire" ||
    (activeTool === "select" &&
      (selectedObj?.type === "arrow" ||
        selectedObj?.type === "connector" ||
        selectedObj?.type === "line" ||
        selectedObj?.type === "polyline" ||
        selectedObj?.type === "wire"));

  // 속성 변경 핸들러
  const handleUpdateStrokeColor = (color: string) => {
    if (targetIds.length > 0) {
      pushState(objects);
      batchUpdateObjects(targetIds, { strokeColor: color, borderColor: color });
    }
    updateToolDefaults(currentToolKey as any, { strokeColor: color, borderColor: color } as any);
  };

  const handleUpdateStrokeWidth = (w: number) => {
    if (targetIds.length > 0) {
      pushState(objects);
      batchUpdateObjects(targetIds, { strokeWidth: w, borderWidth: w, borderEnabled: w > 0 });
    }
    updateToolDefaults(currentToolKey as any, { strokeWidth: w, borderWidth: w, borderEnabled: w > 0 });
    setOpenDropdown(null);
  };

  const handleUpdatePadding = (pad: number) => {
    if (targetIds.length > 0) {
      pushState(objects);
      batchUpdateObjects(targetIds, { padding: pad });
    }
    updateToolDefaults("text", { padding: pad } as any);
    setOpenDropdown(null);
  };

  const handleUpdateLineStyle = (style: "solid" | "dashed" | "dotted") => {
    if (targetIds.length > 0) {
      pushState(objects);
      batchUpdateObjects(targetIds, { lineStyle: style });
    }
    updateToolDefaults(currentToolKey as any, { lineStyle: style });
    setOpenDropdown(null);
  };

  const handleUpdateStartCap = (cap: ArrowHeadType) => {
    if (targetIds.length > 0) {
      pushState(objects);
      batchUpdateObjects(targetIds, { startCap: cap });
    }
    updateToolDefaults(currentToolKey as any, { startCap: cap });
    setOpenDropdown(null);
  };

  const handleUpdateEndCap = (cap: ArrowHeadType) => {
    if (targetIds.length > 0) {
      pushState(objects);
      batchUpdateObjects(targetIds, { endCap: cap });
    }
    updateToolDefaults(currentToolKey as any, { endCap: cap });
    setOpenDropdown(null);
  };

  const handleUpdateJointCap = (cap: ArrowHeadType) => {
    if (targetIds.length > 0) {
      pushState(objects);
      batchUpdateObjects(targetIds, { jointCap: cap });
    }
    updateToolDefaults(currentToolKey as any, { jointCap: cap });
    setOpenDropdown(null);
  };

  const handleUpdateArrowScale = (scale: number) => {
    if (targetIds.length > 0) {
      pushState(objects);
      batchUpdateObjects(targetIds, { arrowScaleRatio: scale });
    }
    updateToolDefaults(currentToolKey as any, { arrowScaleRatio: scale });
    setOpenDropdown(null);
  };

  const handleUpdateConnectorType = (type: "polyline" | "curve" | "straight") => {
    if (targetIds.length > 0) {
      pushState(objects);
      batchUpdateObjects(targetIds, { connectorType: type });
    }
    updateToolDefaults("connector", { connectorType: type });
    setOpenDropdown(null);
  };

  const handleUpdateBorderRadius = (radius: number) => {
    if (targetIds.length > 0) {
      pushState(objects);
      batchUpdateObjects(targetIds, { borderRadius: radius });
    }
    updateToolDefaults("rect", { borderRadius: radius });
    setOpenDropdown(null);
  };

  const handleUpdateFill = (enabled: boolean, color?: string) => {
    const updates: any = { fillEnabled: enabled };
    if (color) updates.fillColor = color;
    if (targetIds.length > 0) {
      pushState(objects);
      batchUpdateObjects(targetIds, updates);
    }
    updateToolDefaults(currentToolKey as any, updates);
  };

  const handleUpdateInnerText = (text: string) => {
    if (targetIds.length > 0) {
      pushState(objects);
      batchUpdateObjects(targetIds, { text, label: text });
    }
    updateToolDefaults(currentToolKey as any, { text });
  };

  const handleUpdateTextColor = (color: string) => {
    if (targetIds.length > 0) {
      pushState(objects);
      batchUpdateObjects(targetIds, { textColor: color });
    }
    updateToolDefaults(currentToolKey as any, { textColor: color } as any);
  };

  const handleUpdateFontSize = (size: number) => {
    if (targetIds.length > 0) {
      pushState(objects);
      batchUpdateObjects(targetIds, { fontSize: size });
    }
    updateToolDefaults(currentToolKey as any, { fontSize: size } as any);
    setOpenDropdown(null);
  };

  const handleToggleFontWeight = () => {
    const nextWeight = curFontWeight === "bold" ? "normal" : "bold";
    if (targetIds.length > 0) {
      pushState(objects);
      batchUpdateObjects(targetIds, { fontWeight: nextWeight });
    }
  };

  const handleUpdateTextAlign = (align: "left" | "center" | "right") => {
    if (targetIds.length > 0) {
      pushState(objects);
      batchUpdateObjects(targetIds, { textAlign: align });
    }
    updateToolDefaults("text", { textAlign: align });
  };

  const handleUpdateHighlightOpacity = (op: number) => {
    if (targetIds.length > 0) {
      pushState(objects);
      batchUpdateObjects(targetIds, { opacity: op });
    }
    updateToolDefaults("highlight", { opacity: op });
    setOpenDropdown(null);
  };

  const handleToggleVisibility = () => {
    if (targetIds.length === 0) return;
    pushState(objects);
    const nextVis = !isAllVisible;
    batchUpdateObjects(targetIds, { visible: nextVis });
  };

  const handleDeleteSelected = () => {
    if (targetIds.length === 0) return;
    pushState(objects);
    removeObjects(targetIds);
    setSelectedObjectId(null);
    setSelectedObjectIds([]);
  };

  // 활성 도구 명칭 및 아이콘
  const getToolLabel = () => {
    switch (activeTool) {
      case "select": return { label: "선택", icon: <MousePointer className="w-3.5 h-3.5 text-indigo-400" /> };
      case "arrow": return { label: "화살표", icon: <MoveRight className="w-3.5 h-3.5 text-emerald-400" /> };
      case "connector": return { label: "스마트 커넥터", icon: <Share2 className="w-3.5 h-3.5 text-indigo-400" /> };
      case "rect": return { label: "사각형", icon: <Square className="w-3.5 h-3.5 text-blue-400" /> };
      case "circle": return { label: "원형", icon: <CircleIcon className="w-3.5 h-3.5 text-purple-400" /> };
      case "polygon": return { label: "다각형", icon: <Pentagon className="w-3.5 h-3.5 text-pink-400" /> };
      case "text": return { label: "텍스트", icon: <Type className="w-3.5 h-3.5 text-amber-400" /> };
      case "highlight": return { label: "형광펜", icon: <Highlighter className="w-3.5 h-3.5 text-yellow-400" /> };
      default: return { label: "선택", icon: <MousePointer className="w-3.5 h-3.5 text-slate-400" /> };
    }
  };

  const toolInfo = getToolLabel();

  return (
    <div
      ref={toolbarRef}
      className="h-10 bg-slate-900 border-b border-slate-800 px-3 flex items-center justify-between z-40 select-none text-xs relative overflow-visible"
    >
      {/* 1. 좌측 활성 도구 뱃지 및 상단 퀵 속성 드롭다운 (overflow-visible로 캔버스 위 오버레이 완벽 지원) */}
      <div className="flex items-center gap-1.5 overflow-visible">
        {/* 활성 도구 표시 뱃지 */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 font-bold text-slate-200 shadow-sm shrink-0">
          {toolInfo.icon}
          <span>{toolInfo.label}</span>
          {targetIds.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-indigo-600/40 text-indigo-200 text-[10px] rounded-md font-mono font-semibold">
              {targetIds.length}
            </span>
          )}
        </div>

        <div className="h-4 w-px bg-slate-800 shrink-0" />

        {/* 🖍️ 형광펜 전용: 자유 그리기 vs 점과 점 모드 토글 & 투명도 */}
        {activeTool === "highlight" && (
          <div className="flex items-center gap-1 shrink-0">
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => setHighlightMode("freehand")}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer ${
                  highlightMode === "freehand"
                    ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="자유 드로잉 모드"
              >
                <Pencil className="w-3 h-3" />
                <span>자유</span>
              </button>
              <button
                onClick={() => setHighlightMode("point")}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer ${
                  highlightMode === "point"
                    ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="점과 점 직선/다각선 모드"
              >
                <PenTool className="w-3 h-3" />
                <span>점과 점</span>
              </button>
            </div>

            {/* 형광펜 투명도 드롭다운 */}
            <div className="relative shrink-0">
              <button
                onClick={() => setOpenDropdown(openDropdown === "highlightOpacity" ? null : "highlightOpacity")}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 transition cursor-pointer text-[11px]"
                title="형광펜 투명도"
              >
                <span>투명도: {Math.round(curHighlightOpacity * 100)}%</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {openDropdown === "highlightOpacity" && (
                <div className="absolute left-0 top-full mt-1.5 w-32 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 z-50">
                  {HIGHLIGHT_OPACITIES.map((op) => (
                    <button
                      key={op.value}
                      onClick={() => handleUpdateHighlightOpacity(op.value)}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer text-[11px] ${
                        curHighlightOpacity === op.value
                          ? "bg-yellow-500/20 text-yellow-300 font-bold"
                          : "text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 텍스트 도구 전용: 글씨색 및 폰트 크기 최우선 노출 */}
        {isTextSelected && (
          <>
            {/* 글씨 색상 */}
            <div className="relative shrink-0">
              <button
                onClick={() => setOpenDropdown(openDropdown === "textColor" ? null : "textColor")}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 transition cursor-pointer text-[11px]"
                title="글씨(폰트) 색상 변경"
              >
                <span
                  className="w-3.5 h-3.5 rounded border border-white/30 shrink-0 shadow-sm"
                  style={{ backgroundColor: curTextColor }}
                />
                <span className="font-bold text-sky-300">글씨색:</span>
                <span className="font-mono text-[10px]">{curTextColor}</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {openDropdown === "textColor" && (
                <div className="absolute left-0 top-full mt-1.5 w-60 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 z-50">
                  <ColorPalettePicker
                    selectedColor={curTextColor}
                    onChange={handleUpdateTextColor}
                    label="글씨(폰트) 색상"
                  />
                </div>
              )}
            </div>

            {/* 글자 크기 */}
            <div className="relative shrink-0">
              <button
                onClick={() => setOpenDropdown(openDropdown === "fontSize" ? null : "fontSize")}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 transition cursor-pointer font-mono text-[11px]"
                title="글씨 크기 (Font Size)"
              >
                <span>글자: {curFontSize}px</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {openDropdown === "fontSize" && (
                <div className="absolute left-0 top-full mt-1.5 w-28 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 z-50">
                  {TEXT_SIZES.map((sz) => (
                    <button
                      key={sz}
                      onClick={() => handleUpdateFontSize(sz)}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-left font-mono transition cursor-pointer ${
                        curFontSize === sz ? "bg-indigo-600/30 text-indigo-300 font-bold" : "text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      {sz}px
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 굵게 & 정렬 */}
            <div className="flex items-center gap-0.5 bg-slate-950 p-0.5 rounded-lg border border-slate-800 shrink-0">
              <button
                onClick={handleToggleFontWeight}
                className={`p-1 rounded transition cursor-pointer ${
                  curFontWeight === "bold"
                    ? "bg-indigo-600/30 text-indigo-300 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
                title="굵게 (Bold)"
              >
                <Bold className="w-3 h-3" />
              </button>
              <div className="h-3 w-px bg-slate-800" />
              <button
                onClick={() => handleUpdateTextAlign("left")}
                className={`p-1 rounded transition cursor-pointer ${
                  curTextAlign === "left"
                    ? "bg-indigo-600/30 text-indigo-300"
                    : "text-slate-400 hover:text-white"
                }`}
                title="왼쪽 정렬"
              >
                <AlignLeft className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleUpdateTextAlign("center")}
                className={`p-1 rounded transition cursor-pointer ${
                  curTextAlign === "center"
                    ? "bg-indigo-600/30 text-indigo-300"
                    : "text-slate-400 hover:text-white"
                }`}
                title="가운데 정렬"
              >
                <AlignCenter className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleUpdateTextAlign("right")}
                className={`p-1 rounded transition cursor-pointer ${
                  curTextAlign === "right"
                    ? "bg-indigo-600/30 text-indigo-300"
                    : "text-slate-400 hover:text-white"
                }`}
                title="오른쪽 정렬"
              >
                <AlignRight className="w-3 h-3" />
              </button>
            </div>
          </>
        )}

        {/* 선/테두리 색상 드롭다운 */}
        <div className="relative shrink-0">
          <button
            onClick={() => setOpenDropdown(openDropdown === "strokeColor" ? null : "strokeColor")}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 transition cursor-pointer text-[11px]"
            title={isTextSelected ? "테두리 외곽선 색상" : "선/테두리 색상"}
          >
            <span
              className="w-3.5 h-3.5 rounded-full border border-white/30 shrink-0 shadow-sm"
              style={{ backgroundColor: curStrokeColor }}
            />
            <span>{isTextSelected ? "테두리색:" : ""}</span>
            <span className="font-mono text-[10px]">{curStrokeColor}</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {openDropdown === "strokeColor" && (
            <div className="absolute left-0 top-full mt-1.5 w-60 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 z-50">
              <ColorPalettePicker
                selectedColor={curStrokeColor}
                onChange={handleUpdateStrokeColor}
                label={isTextSelected ? "테두리 외곽선 색상" : "선 및 테두리 색상"}
              />
            </div>
          )}
        </div>

        {/* 선/테두리 굵기 드롭다운 */}
        <div className="relative shrink-0">
          <button
            onClick={() => setOpenDropdown(openDropdown === "strokeWidth" ? null : "strokeWidth")}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 transition cursor-pointer font-mono text-[11px]"
            title={isTextSelected ? "테두리 선 굵기 (0px은 테두리 없음)" : "선 및 테두리 굵기"}
          >
            <span>{isTextSelected ? (curStrokeWidth === 0 ? "테두리: 없음" : `테두리: ${curStrokeWidth}px`) : `${curStrokeWidth}px`}</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {openDropdown === "strokeWidth" && (
            <div className="absolute left-0 top-full mt-1.5 w-28 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 z-50">
              {(activeTool === "highlight"
                ? HIGHLIGHT_WIDTHS
                : isTextSelected
                ? TEXT_BORDER_WIDTHS
                : STROKE_WIDTHS
              ).map((w) => (
                <button
                  key={w}
                  onClick={() => handleUpdateStrokeWidth(w)}
                  className={`w-full px-2.5 py-1 rounded-lg text-left font-mono transition cursor-pointer text-[11px] ${
                    curStrokeWidth === w ? "bg-indigo-600/30 text-indigo-300 font-bold" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {w === 0 ? "0px (없음)" : `${w}px`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 텍스트 박스 여백(내부 사이즈) 드롭다운 */}
        {isTextSelected && (
          <div className="relative shrink-0">
            <button
              onClick={() => setOpenDropdown(openDropdown === "padding" ? null : "padding")}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 transition cursor-pointer text-[11px]"
              title="텍스트 박스 내부 여백 (테두리 사이즈)"
            >
              <span>여백: {curPadding}px</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {openDropdown === "padding" && (
              <div className="absolute left-0 top-full mt-1.5 w-32 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 z-50">
                <div className="px-2 py-1 text-[10px] text-slate-400 font-bold border-b border-slate-800 mb-1">박스 여백 사이즈</div>
                {PADDING_SIZES.map((pad) => (
                  <button
                    key={pad}
                    onClick={() => handleUpdatePadding(pad)}
                    className={`w-full px-2.5 py-1 rounded-lg text-left font-mono transition cursor-pointer text-[11px] ${
                      curPadding === pad ? "bg-indigo-600/30 text-indigo-300 font-bold" : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {pad}px {pad <= 4 ? "(슬림)" : pad === 8 ? "(기본)" : pad >= 16 ? "(넓게)" : ""}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 선 스타일 (실선, 파선, 점선) */}
        {activeTool !== "text" && activeTool !== "highlight" && (
          <div className="relative shrink-0">
            <button
              onClick={() => setOpenDropdown(openDropdown === "lineStyle" ? null : "lineStyle")}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 transition cursor-pointer text-[11px]"
              title="선 스타일"
            >
              <span>{curLineStyle === "solid" ? "── 실선" : curLineStyle === "dashed" ? "- - 파선" : "· · 점선"}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {openDropdown === "lineStyle" && (
              <div className="absolute left-0 top-full mt-1.5 w-28 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 z-50">
                <button
                  onClick={() => handleUpdateLineStyle("solid")}
                  className={`w-full px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer ${
                    curLineStyle === "solid" ? "bg-indigo-600/30 text-indigo-300 font-bold" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  ── 실선
                </button>
                <button
                  onClick={() => handleUpdateLineStyle("dashed")}
                  className={`w-full px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer ${
                    curLineStyle === "dashed" ? "bg-indigo-600/30 text-indigo-300 font-bold" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  - - 파선
                </button>
                <button
                  onClick={() => handleUpdateLineStyle("dotted")}
                  className={`w-full px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer ${
                    curLineStyle === "dotted" ? "bg-indigo-600/30 text-indigo-300 font-bold" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  · · 점선
                </button>
              </div>
            )}
          </div>
        )}

        {/* 🔗 스마트 커넥터 배선 유형 (직각/곡선/직선) */}
        {(activeTool === "connector" || (activeTool === "select" && selectedObj?.type === "connector")) && (
          <div className="relative shrink-0">
            <button
              onClick={() => setOpenDropdown(openDropdown === "connectorType" ? null : "connectorType")}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 transition cursor-pointer text-[11px]"
              title="커넥터 배선 형태"
            >
              <Spline className="w-3 h-3 text-indigo-400" />
              <span>{CONNECTOR_TYPES.find((c) => c.id === curConnectorType)?.label || "직각 배선"}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {openDropdown === "connectorType" && (
              <div className="absolute left-0 top-full mt-1.5 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 z-50">
                {CONNECTOR_TYPES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleUpdateConnectorType(t.id)}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer text-[11px] ${
                      curConnectorType === t.id ? "bg-indigo-600/30 text-indigo-300 font-bold" : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 화살표/선/커넥터: 시작점 모양 드롭다운 */}
        {isLineOrArrow && (
          <div className="relative shrink-0">
            <button
              onClick={() => setOpenDropdown(openDropdown === "startCap" ? null : "startCap")}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 transition cursor-pointer text-[11px]"
              title="시작점 머리 모양"
            >
              <span>시작:</span>
              <span className="font-mono text-indigo-400 font-bold">{ARROW_START_OPTIONS.find((o) => o.id === curStartCap)?.preview || "─"}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {openDropdown === "startCap" && (
              <div className="absolute left-0 top-full mt-1.5 w-36 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 z-50">
                <div className="px-2 py-1 text-[10px] text-slate-400 font-bold border-b border-slate-800 mb-1">시작점 모양</div>
                {ARROW_START_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleUpdateStartCap(opt.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer ${
                      curStartCap === opt.id ? "bg-indigo-600/30 text-indigo-300 font-bold" : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className="font-mono text-indigo-400 font-bold">{opt.preview}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 화살표/선/커넥터: 끝점 모양 드롭다운 */}
        {isLineOrArrow && (
          <div className="relative shrink-0">
            <button
              onClick={() => setOpenDropdown(openDropdown === "endCap" ? null : "endCap")}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 transition cursor-pointer text-[11px]"
              title="끝점 머리 모양"
            >
              <span>끝:</span>
              <span className="font-mono text-indigo-400 font-bold">{ARROW_END_OPTIONS.find((o) => o.id === curEndCap)?.preview || "→"}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {openDropdown === "endCap" && (
              <div className="absolute left-0 top-full mt-1.5 w-36 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 z-50">
                <div className="px-2 py-1 text-[10px] text-slate-400 font-bold border-b border-slate-800 mb-1">끝점 모양</div>
                {ARROW_END_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleUpdateEndCap(opt.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer ${
                      curEndCap === opt.id ? "bg-indigo-600/30 text-indigo-300 font-bold" : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className="font-mono text-indigo-400 font-bold">{opt.preview}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 화살표/선/커넥터: 꺾임점(Joint) 모양 드롭다운 */}
        {isLineOrArrow && (
          <div className="relative shrink-0">
            <button
              onClick={() => setOpenDropdown(openDropdown === "jointCap" ? null : "jointCap")}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 transition cursor-pointer text-[11px]"
              title="꺾이는 중간 정점(Joint) 마커 모양"
            >
              <span>꺾임점:</span>
              <span className="font-mono text-amber-400 font-bold">{JOINT_OPTIONS.find((o) => o.id === curJointCap)?.preview || "─"}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {openDropdown === "jointCap" && (
              <div className="absolute left-0 top-full mt-1.5 w-36 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 z-50">
                <div className="px-2 py-1 text-[10px] text-slate-400 font-bold border-b border-slate-800 mb-1">꺾임점 마커 모양</div>
                {JOINT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleUpdateJointCap(opt.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer ${
                      curJointCap === opt.id ? "bg-indigo-600/30 text-indigo-300 font-bold" : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className="font-mono text-amber-400 font-bold">{opt.preview}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 🏹 화살표 머리 크기 배율 (Arrow Scale) */}
        {(activeTool === "arrow" || (activeTool === "select" && selectedObj?.type === "arrow")) && (
          <div className="relative shrink-0">
            <button
              onClick={() => setOpenDropdown(openDropdown === "arrowScale" ? null : "arrowScale")}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 transition cursor-pointer text-[11px]"
              title="화살표 머리 크기 배율"
            >
              <span>헤드: {curArrowScale}x</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {openDropdown === "arrowScale" && (
              <div className="absolute left-0 top-full mt-1.5 w-28 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 z-50">
                {ARROW_SCALES.map((sc) => (
                  <button
                    key={sc}
                    onClick={() => handleUpdateArrowScale(sc)}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer text-[11px] ${
                      curArrowScale === sc ? "bg-indigo-600/30 text-indigo-300 font-bold" : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {sc}x 배율
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 채우기 색상 드롭다운 (도형 또는 텍스트 선택/활성 시) */}
        {canHaveFill && (
          <div className="relative shrink-0">
            <button
              onClick={() => setOpenDropdown(openDropdown === "fillColor" ? null : "fillColor")}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition cursor-pointer ${
                curFillEnabled
                  ? "bg-slate-950 border-slate-700 text-slate-200"
                  : "bg-slate-950/40 border-slate-800 text-slate-500 hover:text-slate-400"
              }`}
              title={isTextSelected ? "텍스트 배경 채우기" : "도형 내부 채우기"}
            >
              <span
                className="w-3.5 h-3.5 rounded border border-white/20 shrink-0 shadow-sm"
                style={{ backgroundColor: curFillEnabled ? curFillColor : "transparent" }}
              />
              <span className="text-[11px]">{isTextSelected ? "배경" : "채우기"} {curFillEnabled ? "ON" : "OFF"}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {openDropdown === "fillColor" && (
              <div className="absolute left-0 top-full mt-1.5 w-60 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 z-50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">
                    {isTextSelected ? "텍스트 배경 채우기" : "내부 채우기 활성화"}
                  </span>
                  <input
                    type="checkbox"
                    checked={curFillEnabled}
                    onChange={(e) => handleUpdateFill(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-indigo-500 cursor-pointer"
                  />
                </div>
                {curFillEnabled && (
                  <ColorPalettePicker
                    selectedColor={curFillColor}
                    onChange={(color) => handleUpdateFill(true, color)}
                    label={isTextSelected ? "배경 색상" : "채우기 색상"}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* 🔲 사각형 / 텍스트 박스 모서리 둥글기 (Border Radius) */}
        {(activeTool === "rect" || isTextSelected || (activeTool === "select" && (selectedObj?.type === "rectangle" || selectedObj?.type === "component"))) && (
          <div className="relative shrink-0">
            <button
              onClick={() => setOpenDropdown(openDropdown === "borderRadius" ? null : "borderRadius")}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 transition cursor-pointer text-[11px]"
              title="모서리 곡률 (Corner Radius)"
            >
              <span>곡률: {curBorderRadius}px</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {openDropdown === "borderRadius" && (
              <div className="absolute left-0 top-full mt-1.5 w-28 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 z-50">
                {BORDER_RADII.map((r) => (
                  <button
                    key={r}
                    onClick={() => handleUpdateBorderRadius(r)}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer text-[11px] ${
                      curBorderRadius === r ? "bg-indigo-600/30 text-indigo-300 font-bold" : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {r === 0 ? "0px (직각)" : `${r}px 둥글게`}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 도형 내부 텍스트 입력창 (도형 선택 또는 도형 도구 활성 시) */}
        {isShapeSelected && (
          <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-950 border border-slate-800 rounded-lg shrink-0">
            <Edit3 className="w-3 h-3 text-sky-400 shrink-0" />
            <input
              type="text"
              value={curInnerText}
              onChange={(e) => handleUpdateInnerText(e.target.value)}
              placeholder="도형 안 텍스트..."
              className="w-28 bg-transparent text-[11px] text-slate-100 placeholder:text-slate-600 focus:outline-none"
              title="도형 안에 들어갈 텍스트 (더블클릭으로도 수정 가능)"
            />
          </div>
        )}

        {/* 도형 전용 글씨 색상 드롭다운 */}
        {isShapeSelected && (
          <div className="relative shrink-0">
            <button
              onClick={() => setOpenDropdown(openDropdown === "textColor" ? null : "textColor")}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 transition cursor-pointer text-[11px]"
              title="도형 안 글씨 색상 변경"
            >
              <span
                className="w-3.5 h-3.5 rounded border border-white/30 shrink-0 shadow-sm"
                style={{ backgroundColor: curTextColor }}
              />
              <span>글씨색</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {openDropdown === "textColor" && (
              <div className="absolute left-0 top-full mt-1.5 w-60 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 z-50">
                <ColorPalettePicker
                  selectedColor={curTextColor}
                  onChange={handleUpdateTextColor}
                  label="도형 글씨 색상"
                />
              </div>
            )}
          </div>
        )}

        {/* 도형 전용 텍스트 폰트 크기 드롭다운 */}
        {isShapeSelected && (
          <div className="relative shrink-0">
            <button
              onClick={() => setOpenDropdown(openDropdown === "fontSize" ? null : "fontSize")}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 transition cursor-pointer font-mono text-[11px]"
              title="도형 글씨 크기 (Font Size)"
            >
              <span>글자: {curFontSize}px</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {openDropdown === "fontSize" && (
              <div className="absolute left-0 top-full mt-1.5 w-28 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 z-50">
                {TEXT_SIZES.map((sz) => (
                  <button
                    key={sz}
                    onClick={() => handleUpdateFontSize(sz)}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-left font-mono transition cursor-pointer ${
                      curFontSize === sz ? "bg-indigo-600/30 text-indigo-300 font-bold" : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {sz}px
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 텍스트 서식: 굵게(Bold) & 정렬 (텍스트 전용) */}
        {isTextSelected && (
          <div className="flex items-center gap-0.5 bg-slate-950 p-0.5 rounded-lg border border-slate-800 shrink-0">
            <button
              onClick={handleToggleFontWeight}
              className={`p-1 rounded transition cursor-pointer ${
                curFontWeight === "bold"
                  ? "bg-indigo-600/30 text-indigo-300 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
              title="굵게 (Bold)"
            >
              <Bold className="w-3 h-3" />
            </button>
            <div className="h-3 w-px bg-slate-800" />
            <button
              onClick={() => handleUpdateTextAlign("left")}
              className={`p-1 rounded transition cursor-pointer ${
                curTextAlign === "left"
                  ? "bg-indigo-600/30 text-indigo-300"
                  : "text-slate-400 hover:text-white"
              }`}
              title="좌측 정렬"
            >
              <AlignLeft className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleUpdateTextAlign("center")}
              className={`p-1 rounded transition cursor-pointer ${
                curTextAlign === "center"
                  ? "bg-indigo-600/30 text-indigo-300"
                  : "text-slate-400 hover:text-white"
              }`}
              title="중앙 정렬"
            >
              <AlignCenter className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleUpdateTextAlign("right")}
              className={`p-1 rounded transition cursor-pointer ${
                curTextAlign === "right"
                  ? "bg-indigo-600/30 text-indigo-300"
                  : "text-slate-400 hover:text-white"
              }`}
              title="우측 정렬"
            >
              <AlignRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* 2. 우측 도구 기본값 리셋 및 선택 객체 액션 */}
      <div className="flex items-center gap-2 shrink-0">
        {/* 초기 설정값 리셋 버튼 */}
        <button
          onClick={() => {
            if (confirm("모든 도구의 색상, 굵기, 시작/끝/꺾임점 설정을 초기 기본값으로 되돌리시겠습니까?")) {
              resetToolDefaults();
            }
          }}
          className="flex items-center gap-1 px-2 py-1 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-amber-300 rounded-lg border border-slate-800 transition cursor-pointer font-medium text-[11px]"
          title="도구 속성을 초기 기본값으로 리셋"
        >
          <RotateCcw className="w-3 h-3 text-amber-400" />
          <span>초기 설정 리셋</span>
        </button>

        {targetIds.length > 0 ? (
          <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
            {/* 가리기 / 보이기 버튼 */}
            <button
              onClick={handleToggleVisibility}
              className={`flex items-center gap-1 px-2 py-1 rounded transition cursor-pointer font-medium text-[11px] ${
                isAllVisible
                  ? "text-slate-300 hover:bg-slate-800 hover:text-white"
                  : "text-amber-400 bg-amber-500/10 border border-amber-500/30"
              }`}
              title={isAllVisible ? "선택 객체 가리기 (Hide)" : "선택 객체 보이기 (Show)"}
            >
              {isAllVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{isAllVisible ? "가리기" : "보이기"}</span>
            </button>

            <div className="h-3 w-px bg-slate-800" />

            {/* 삭제 버튼 */}
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1 px-2 py-1 rounded text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition cursor-pointer font-medium text-[11px]"
              title="선택 객체 삭제 (Delete)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>지우기</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
