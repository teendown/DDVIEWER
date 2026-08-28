import React, { useState } from "react";
import {
  Layers,
  Sliders,
  Trash2,
  Copy,
  FolderPlus,
  FolderMinus,
  Folder,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  X,
  Share2,
  MoveRight,
  Square,
  CheckSquare,
  Circle as CircleIcon,
  Pentagon,
  Type,
  Highlighter,
  Eye,
  EyeOff,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Lock,
  Unlock,
  Image as ImageIcon,
  Plus,
  Crop,
} from "lucide-react";
import { useDrawingStore } from "../../store/drawingStore";
import { useUIStore } from "../../store/uiStore";
import { useHistoryStore } from "../../store/historyStore";
import { ColorPalettePicker } from "../common/ColorPalettePicker";
import { OpenDrawingModal } from "../modals/OpenDrawingModal";
import { CropSheetModal } from "../modals/CropSheetModal";
import type { ArrowHeadType, BackgroundSheet } from "../../types";

const STROKE_WIDTHS = [1, 2, 3, 5, 8, 12];
const TEXT_SIZES = [12, 14, 16, 20, 24, 32, 44];
const BORDER_RADII = [0, 4, 8, 12, 16, 24];

const ARROW_HEAD_OPTIONS: { id: ArrowHeadType; label: string; preview: string }[] = [
  { id: "none", label: "없음", preview: "─" },
  { id: "arrow", label: "화살표", preview: "→" },
  { id: "triangle", label: "삼각 채움", preview: "▶" },
  { id: "circle", label: "원형 점", preview: "●" },
  { id: "square", label: "사각형", preview: "■" },
  { id: "diamond", label: "다이아", preview: "◆" },
  { id: "slash", label: "슬래시", preview: "/" },
];

const FONTS = [
  { name: "기본 고딕 (Sans)", value: "Pretendard, sans-serif" },
  { name: "도면/코드 (Mono)", value: "monospace" },
  { name: "명조체 (Serif)", value: "serif" },
];

export const RightSidebar: React.FC = () => {
  const {
    objects,
    selectedObjectId,
    selectedObjectIds,
    toggleCheckObjectId,
    toggleCheckAllObjects,
    toggleGroupSelection,
    selectGroupOnly,
    updateObject,
    batchUpdateObjects,
    removeObject,
    removeObjects,
    duplicateObject,
    createGroup,
    ungroup,
    reorderObject,
    setSelectedObjectId,
    setSelectedObjectIds,
    backgroundSheets,
    isBackgroundLocked,
    toggleBackgroundLock,
    rotateSheet,
    flipSheet,
    updateBackgroundSheet,
    removeBackgroundSheet,
    activeSheetId,
    setActiveSheetId,
  } = useDrawingStore();

  const { pushState } = useHistoryStore();
  const { isRightSidebarOpen, isPropertyTabOpen, setPropertyTabOpen } = useUIStore();
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [activeRightTab, setActiveRightTab] = useState<"objects" | "sheets">("objects");
  const [isAddSheetModalOpen, setIsAddSheetModalOpen] = useState(false);
  const [croppingSheet, setCroppingSheet] = useState<BackgroundSheet | null>(null);

  if (!isRightSidebarOpen) return null;

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const currentObj = objects.find((o) => o.id === selectedObjectId);
  const isMultipleSelected = selectedObjectIds.length > 1;
  const isSelected = !!currentObj || isMultipleSelected;

  const getObjectIcon = (type: string) => {
    switch (type) {
      case "connector":
        return <Share2 className="w-3.5 h-3.5 text-indigo-400" />;
      case "arrow":
      case "line":
      case "wire":
        return <MoveRight className="w-3.5 h-3.5 text-emerald-400" />;
      case "rectangle":
      case "rect":
      case "component":
        return <Square className="w-3.5 h-3.5 text-blue-400" />;
      case "circle":
        return <CircleIcon className="w-3.5 h-3.5 text-purple-400" />;
      case "polygon":
        return <Pentagon className="w-3.5 h-3.5 text-pink-400" />;
      case "text":
        return <Type className="w-3.5 h-3.5 text-amber-300" />;
      case "highlight":
        return <Highlighter className="w-3.5 h-3.5 text-yellow-400" />;
      case "group":
        return <Layers className="w-3.5 h-3.5 text-sky-400" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="flex h-full z-20 select-none">
      {/* 1. 슬라이딩 속성 패널 (객체 선택 시 우측에서 좌측 방향으로 슬라이드 전개) */}
      {isPropertyTabOpen && isSelected && (
        <aside className="w-80 bg-slate-900/95 border-l border-slate-800 flex flex-col overflow-y-auto backdrop-blur-xl shadow-2xl p-4 animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <div>
                <h3 className="text-xs font-bold text-slate-100 tracking-tight">
                  {isMultipleSelected
                    ? `다중 선택 (${selectedObjectIds.length}개 객체)`
                    : `${currentObj?.label || currentObj?.id} 속성`}
                </h3>
                <span className="text-[10px] text-slate-400">실시간 벡터 프로퍼티</span>
              </div>
            </div>
            <button
              onClick={() => setPropertyTabOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 cursor-pointer"
              title="속성 패널 접기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* 다중 선택 일괄 속성 변경 */}
            {isMultipleSelected && (
              <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">그룹 관리</span>
                  <button
                    onClick={() => createGroup(selectedObjectIds)}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>그룹 생성</span>
                  </button>
                </div>

                <div>
                  <label className="text-slate-400 font-medium mb-1.5 block">공통 선/테두리 색상 일괄 변경</label>
                  <ColorPalettePicker
                    selectedColor="#6366f1"
                    onChange={(color) => batchUpdateObjects(selectedObjectIds, { strokeColor: color })}
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-medium mb-1.5 block">공통 선 두께 일괄 변경</label>
                  <div className="flex gap-1.5">
                    {STROKE_WIDTHS.map((w) => (
                      <button
                        key={w}
                        onClick={() => batchUpdateObjects(selectedObjectIds, { strokeWidth: w })}
                        className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg font-mono font-bold cursor-pointer"
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <button
                    onClick={() => removeObjects(selectedObjectIds)}
                    className="w-full py-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>선택한 {selectedObjectIds.length}개 객체 일괄 삭제</span>
                  </button>
                </div>
              </div>
            )}

            {/* 단일 객체 속성 수정 */}
            {!isMultipleSelected && currentObj && (
              <>
                {/* 1. 객체 라벨 이름 */}
                <div>
                  <label className="text-slate-400 font-medium mb-1 block">객체 식별자 / 라벨</label>
                  <input
                    type="text"
                    value={currentObj.label || currentObj.id}
                    onChange={(e) => updateObject(currentObj.id, { label: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:border-indigo-500 outline-none"
                  />
                </div>

                {/* 2. 커넥터 전용 속성 */}
                {currentObj.type === "connector" && (
                  <div className="space-y-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                    <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                      스마트 커넥터 설정
                    </div>

                    <div>
                      <label className="text-slate-400 font-medium mb-1.5 block">연결선 형태</label>
                      <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                        {(["polyline", "curve", "straight"] as const).map((type) => (
                          <button
                            key={type}
                            onClick={() => updateObject(currentObj.id, { connectorType: type })}
                            className={`py-1 text-[11px] font-medium rounded transition cursor-pointer ${
                              (currentObj.connectorType || "polyline") === type
                                ? "bg-indigo-600 text-white"
                                : "text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {type === "polyline" ? "직각" : type === "curve" ? "곡선" : "직선"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-400 font-medium mb-1.5 block">선 색상</label>
                      <ColorPalettePicker
                        selectedColor={currentObj.strokeColor || "#6366f1"}
                        onChange={(color) => updateObject(currentObj.id, { strokeColor: color })}
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 font-medium mb-1.5">
                        <span>선 두께</span>
                        <span className="text-indigo-400 font-mono">{currentObj.strokeWidth || 3}px</span>
                      </div>
                      <div className="flex gap-1.5">
                        {STROKE_WIDTHS.map((w) => (
                          <button
                            key={w}
                            onClick={() => updateObject(currentObj.id, { strokeWidth: w })}
                            className={`flex-1 py-1 rounded-lg border text-center text-xs font-mono font-bold transition cursor-pointer ${
                              currentObj.strokeWidth === w
                                ? "bg-indigo-600/30 border-indigo-500 text-indigo-300"
                                : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {w}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-400 font-medium mb-1.5 block">선 스타일</label>
                      <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                        {(["solid", "dashed", "dotted"] as const).map((style) => (
                          <button
                            key={style}
                            onClick={() => updateObject(currentObj.id, { lineStyle: style })}
                            className={`py-1 text-xs rounded transition cursor-pointer ${
                              (currentObj.lineStyle || "solid") === style
                                ? "bg-indigo-600 text-white"
                                : "text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {style === "solid" ? "실선" : style === "dashed" ? "점선" : "파선"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-400 font-medium mb-1 block">시작 화살표</label>
                        <select
                          value={currentObj.startCap || "none"}
                          onChange={(e) => updateObject(currentObj.id, { startCap: e.target.value as ArrowHeadType })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:border-indigo-500 outline-none cursor-pointer"
                        >
                          {ARROW_HEAD_OPTIONS.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label} ({opt.preview})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-slate-400 font-medium mb-1 block">끝 화살표</label>
                        <select
                          value={currentObj.endCap || "arrow"}
                          onChange={(e) => updateObject(currentObj.id, { endCap: e.target.value as ArrowHeadType })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:border-indigo-500 outline-none cursor-pointer"
                        >
                          {ARROW_HEAD_OPTIONS.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label} ({opt.preview})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* 화살표 크기 배율 계수 */}
                    <div>
                      <div className="flex justify-between text-slate-400 font-medium mb-1.5">
                        <span>화살표 크기 비율</span>
                        <span className="text-indigo-400 font-mono">{(currentObj.arrowScaleRatio || 1.0).toFixed(1)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="3.0"
                        step="0.1"
                        value={currentObj.arrowScaleRatio || 1.0}
                        onChange={(e) => updateObject(currentObj.id, { arrowScaleRatio: parseFloat(e.target.value) })}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* 3. 선 / 화살표 속성 */}
                {(currentObj.type === "arrow" || currentObj.type === "line" || currentObj.type === "wire") && (
                  <div className="space-y-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                    <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                      선 / 화살표 속성
                    </div>

                    <div>
                      <label className="text-slate-400 font-medium mb-1.5 block">선 색상</label>
                      <ColorPalettePicker
                        selectedColor={currentObj.strokeColor || "#10b981"}
                        onChange={(color) => updateObject(currentObj.id, { strokeColor: color })}
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 font-medium mb-1.5">
                        <span>선 두께</span>
                        <span className="text-emerald-400 font-mono">{currentObj.strokeWidth || 3}px</span>
                      </div>
                      <div className="flex gap-1.5">
                        {STROKE_WIDTHS.map((w) => (
                          <button
                            key={w}
                            onClick={() => updateObject(currentObj.id, { strokeWidth: w })}
                            className={`flex-1 py-1 rounded-lg border text-center text-xs font-mono font-bold transition cursor-pointer ${
                              currentObj.strokeWidth === w
                                ? "bg-emerald-600/30 border-emerald-500 text-emerald-300"
                                : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {w}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-400 font-medium mb-1.5 block">선 스타일</label>
                      <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                        {(["solid", "dashed", "dotted"] as const).map((style) => (
                          <button
                            key={style}
                            onClick={() => updateObject(currentObj.id, { lineStyle: style })}
                            className={`py-1 text-xs rounded transition cursor-pointer ${
                              (currentObj.lineStyle || "solid") === style
                                ? "bg-emerald-600 text-white"
                                : "text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {style === "solid" ? "실선" : style === "dashed" ? "점선" : "파선"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-400 font-medium mb-1 block">시작점</label>
                        <select
                          value={currentObj.startCap || "none"}
                          onChange={(e) => updateObject(currentObj.id, { startCap: e.target.value as ArrowHeadType })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:border-emerald-500 outline-none cursor-pointer"
                        >
                          {ARROW_HEAD_OPTIONS.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label} ({opt.preview})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-slate-400 font-medium mb-1 block">끝점</label>
                        <select
                          value={currentObj.endCap || "arrow"}
                          onChange={(e) => updateObject(currentObj.id, { endCap: e.target.value as ArrowHeadType })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:border-emerald-500 outline-none cursor-pointer"
                        >
                          {ARROW_HEAD_OPTIONS.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label} ({opt.preview})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 font-medium mb-1.5">
                        <span>화살표 크기 비율</span>
                        <span className="text-emerald-400 font-mono">{(currentObj.arrowScaleRatio || 1.0).toFixed(1)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="3.0"
                        step="0.1"
                        value={currentObj.arrowScaleRatio || 1.0}
                        onChange={(e) => updateObject(currentObj.id, { arrowScaleRatio: parseFloat(e.target.value) })}
                        className="w-full accent-emerald-500 cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* 4. 도형 / 노드 속성 (사각형, 원, 다각형) */}
                {(currentObj.type === "rectangle" ||
                  currentObj.type === "circle" ||
                  currentObj.type === "polygon" ||
                  currentObj.type === "component") && (
                  <div className="space-y-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                    <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                      도형 / 노드 속성
                    </div>

                    <div>
                      <label className="text-slate-400 font-medium mb-1.5 block">테두리 색상</label>
                      <ColorPalettePicker
                        selectedColor={currentObj.strokeColor || "#6366f1"}
                        onChange={(color) => updateObject(currentObj.id, { strokeColor: color })}
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 font-medium mb-1.5">
                        <span>테두리 두께</span>
                        <span className="text-blue-400 font-mono">{currentObj.strokeWidth || 3}px</span>
                      </div>
                      <div className="flex gap-1.5">
                        {STROKE_WIDTHS.map((w) => (
                          <button
                            key={w}
                            onClick={() => updateObject(currentObj.id, { strokeWidth: w })}
                            className={`flex-1 py-1 rounded-lg border text-center text-xs font-mono font-bold transition cursor-pointer ${
                              currentObj.strokeWidth === w
                                ? "bg-blue-600/30 border-blue-500 text-blue-300"
                                : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {w}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 모서리 곡률 (사각형/부품 노드) */}
                    {(currentObj.type === "rectangle" || currentObj.type === "component") && (
                      <div>
                        <div className="flex justify-between text-slate-400 font-medium mb-1.5">
                          <span>모서리 둥글기 (곡률)</span>
                          <span className="text-blue-400 font-mono">{currentObj.borderRadius || 0}px</span>
                        </div>
                        <div className="flex gap-1.5">
                          {BORDER_RADII.map((r) => (
                            <button
                              key={r}
                              onClick={() => updateObject(currentObj.id, { borderRadius: r })}
                              className={`flex-1 py-1 rounded-lg border text-center text-xs font-mono transition cursor-pointer ${
                                (currentObj.borderRadius || 0) === r
                                  ? "bg-blue-600/30 border-blue-500 text-blue-300"
                                  : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}


                    {/* 채우기 색상 및 투명도 */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-slate-400 font-medium">채우기 색상</label>
                        <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={currentObj.fillEnabled ?? true}
                            onChange={(e) => updateObject(currentObj.id, { fillEnabled: e.target.checked })}
                            className="accent-blue-500 rounded"
                          />
                          <span>채우기 사용</span>
                        </label>
                      </div>
                      {currentObj.fillEnabled !== false && (
                        <div className="space-y-2">
                          <ColorPalettePicker
                            selectedColor={currentObj.fillColor || "#1e1b4b"}
                            onChange={(color) => updateObject(currentObj.id, { fillColor: color })}
                          />
                          <div>
                            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                              <span>투명도 (Opacity)</span>
                              <span className="font-mono">{Math.round((currentObj.fillOpacity ?? 0.8) * 100)}%</span>
                            </div>
                            <input
                              type="range"
                              min="0.05"
                              max="1.0"
                              step="0.05"
                              value={currentObj.fillOpacity ?? 0.8}
                              onChange={(e) => updateObject(currentObj.id, { fillOpacity: parseFloat(e.target.value) })}
                              className="w-full accent-blue-500 cursor-pointer"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 5. 텍스트 속성 */}
                {currentObj.type === "text" && (
                  <div className="space-y-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                    <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                      텍스트 타이포그래피
                    </div>

                    <div>
                      <label className="text-slate-400 font-medium mb-1 block">내용</label>
                      <textarea
                        value={currentObj.text || ""}
                        onChange={(e) => updateObject(currentObj.id, { text: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 focus:border-amber-500 outline-none resize-none h-16"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 font-medium mb-1.5 block">글자 색상</label>
                      <ColorPalettePicker
                        selectedColor={currentObj.textColor || "#ffffff"}
                        onChange={(color) => updateObject(currentObj.id, { textColor: color })}
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 font-medium mb-1 block">폰트</label>
                      <select
                        value={currentObj.fontFamily || "Pretendard, sans-serif"}
                        onChange={(e) => updateObject(currentObj.id, { fontFamily: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:border-amber-500 outline-none cursor-pointer"
                      >
                        {FONTS.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 font-medium mb-1.5">
                        <span>글자 크기</span>
                        <span className="text-amber-400 font-mono">{currentObj.fontSize || 16}px</span>
                      </div>
                      <div className="flex gap-1">
                        {TEXT_SIZES.map((s) => (
                          <button
                            key={s}
                            onClick={() => updateObject(currentObj.id, { fontSize: s })}
                            className={`flex-1 py-1 rounded-md border text-center text-[11px] font-mono font-bold transition cursor-pointer ${
                              currentObj.fontSize === s
                                ? "bg-amber-600/30 border-amber-500 text-amber-300"
                                : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 정렬 및 스타일 */}
                    <div className="flex gap-2">
                      <div className="flex-1 grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                        {(["left", "center", "right"] as const).map((align) => (
                          <button
                            key={align}
                            onClick={() => updateObject(currentObj.id, { textAlign: align })}
                            className={`py-1 flex items-center justify-center rounded transition cursor-pointer ${
                              (currentObj.textAlign || "left") === align
                                ? "bg-amber-600 text-white"
                                : "text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {align === "left" && <AlignLeft className="w-3.5 h-3.5" />}
                            {align === "center" && <AlignCenter className="w-3.5 h-3.5" />}
                            {align === "right" && <AlignRight className="w-3.5 h-3.5" />}
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                        <button
                          onClick={() =>
                            updateObject(currentObj.id, {
                              fontWeight: currentObj.fontWeight === "bold" ? "normal" : "bold",
                            })
                          }
                          className={`p-1 rounded cursor-pointer ${
                            currentObj.fontWeight === "bold" ? "bg-amber-600 text-white" : "text-slate-400 hover:text-slate-200"
                          }`}
                          title="볼드"
                        >
                          <Bold className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            updateObject(currentObj.id, {
                              fontStyle: currentObj.fontStyle === "italic" ? "normal" : "italic",
                            })
                          }
                          className={`p-1 rounded cursor-pointer ${
                            currentObj.fontStyle === "italic" ? "bg-amber-600 text-white" : "text-slate-400 hover:text-slate-200"
                          }`}
                          title="이탤릭"
                        >
                          <Italic className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* 자간 & 줄간격 */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                          <span>자간</span>
                          <span className="font-mono">{currentObj.letterSpacing || 0}px</span>
                        </div>
                        <input
                          type="range"
                          min="-2"
                          max="10"
                          step="1"
                          value={currentObj.letterSpacing || 0}
                          onChange={(e) => updateObject(currentObj.id, { letterSpacing: parseInt(e.target.value) })}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                          <span>줄간격</span>
                          <span className="font-mono">{(currentObj.lineHeight || 1.4).toFixed(1)}</span>
                        </div>
                        <input
                          type="range"
                          min="1.0"
                          max="2.5"
                          step="0.1"
                          value={currentObj.lineHeight || 1.4}
                          onChange={(e) => updateObject(currentObj.id, { lineHeight: parseFloat(e.target.value) })}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* 텍스트 테두리 & 박스 배경 설정 */}
                    <div className="pt-3 border-t border-slate-800 space-y-3">
                      {/* 1) 테두리(Border) On/Off 및 설정 */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-slate-400 font-medium">메모 테두리 (Border)</label>
                          <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={currentObj.borderEnabled !== false}
                              onChange={(e) => updateObject(currentObj.id, { borderEnabled: e.target.checked })}
                              className="accent-sky-500 rounded"
                            />
                            <span>테두리 사용</span>
                          </label>
                        </div>

                        {currentObj.borderEnabled !== false && (
                          <div className="space-y-2.5 pt-1">
                            {/* 테두리 색상 */}
                            <div>
                              <span className="text-[10px] text-slate-400 block mb-1">테두리 색상</span>
                              <ColorPalettePicker
                                selectedColor={currentObj.borderColor || currentObj.strokeColor || "#38bdf8"}
                                onChange={(color) => updateObject(currentObj.id, { borderColor: color, strokeColor: color })}
                              />
                            </div>

                            {/* 테두리 두께 */}
                            <div>
                              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                                <span>선 두께</span>
                                <span className="font-mono text-sky-400">{currentObj.borderWidth ?? 2}px</span>
                              </div>
                              <div className="flex gap-1.5">
                                {[1, 2, 3, 4, 6].map((bw) => (
                                  <button
                                    key={bw}
                                    onClick={() => updateObject(currentObj.id, { borderWidth: bw })}
                                    className={`flex-1 py-1 text-[11px] font-mono font-bold rounded-lg border transition cursor-pointer ${
                                      (currentObj.borderWidth ?? 2) === bw
                                        ? "bg-sky-500/20 border-sky-500 text-sky-300"
                                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                                    }`}
                                  >
                                    {bw}px
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* 테두리 선 스타일 */}
                            <div>
                              <span className="text-[10px] text-slate-400 block mb-1">선 형태</span>
                              <div className="grid grid-cols-3 gap-1">
                                {[
                                  { id: "solid", label: "실선" },
                                  { id: "dashed", label: "파선" },
                                  { id: "dotted", label: "점선" },
                                ].map((st) => (
                                  <button
                                    key={st.id}
                                    onClick={() => updateObject(currentObj.id, { borderStyle: st.id as any })}
                                    className={`py-1 text-[11px] font-medium rounded-lg border transition cursor-pointer ${
                                      (currentObj.borderStyle || "solid") === st.id
                                        ? "bg-sky-500/20 border-sky-500 text-sky-300"
                                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                                    }`}
                                  >
                                    {st.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* 모서리 둥글기 & 여백 */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                  <span>모서리 둥글기</span>
                                  <span className="font-mono text-sky-400">{currentObj.borderRadius ?? 6}px</span>
                                </div>
                                <div className="flex gap-1">
                                  {[0, 4, 8, 12].map((rad) => (
                                    <button
                                      key={rad}
                                      onClick={() => updateObject(currentObj.id, { borderRadius: rad })}
                                      className={`flex-1 py-1 text-[10px] font-mono rounded border transition cursor-pointer ${
                                        (currentObj.borderRadius ?? 6) === rad
                                          ? "bg-sky-500/20 border-sky-500 text-sky-300"
                                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                                      }`}
                                    >
                                      {rad}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                  <span>내부 여백</span>
                                  <span className="font-mono text-sky-400">{currentObj.padding ?? 8}px</span>
                                </div>
                                <div className="flex gap-1">
                                  {[4, 8, 12, 16].map((pad) => (
                                    <button
                                      key={pad}
                                      onClick={() => updateObject(currentObj.id, { padding: pad })}
                                      className={`flex-1 py-1 text-[10px] font-mono rounded border transition cursor-pointer ${
                                        (currentObj.padding ?? 8) === pad
                                          ? "bg-sky-500/20 border-sky-500 text-sky-300"
                                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                                      }`}
                                    >
                                      {pad}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 2) 배경 박스 채우기 (Background Fill) */}
                      <div className="pt-2 border-t border-slate-800/80">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-slate-400 font-medium">배경 채우기 (Fill)</label>
                          <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={currentObj.fillEnabled !== false}
                              onChange={(e) => updateObject(currentObj.id, { fillEnabled: e.target.checked })}
                              className="accent-amber-500 rounded"
                            />
                            <span>배경 사용</span>
                          </label>
                        </div>

                        {currentObj.fillEnabled !== false && (
                          <div className="space-y-2 pt-1">
                            <ColorPalettePicker
                              selectedColor={currentObj.fillColor || "#0f172a"}
                              onChange={(color) => updateObject(currentObj.id, { fillColor: color })}
                            />
                            <div>
                              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                                <span>불투명도 (Opacity)</span>
                                <span className="font-mono">{Math.round((currentObj.fillOpacity ?? 0.85) * 100)}%</span>
                              </div>
                              <input
                                type="range"
                                min="0.05"
                                max="1.0"
                                step="0.05"
                                value={currentObj.fillOpacity ?? 0.85}
                                onChange={(e) => updateObject(currentObj.id, { fillOpacity: parseFloat(e.target.value) })}
                                className="w-full accent-amber-500 cursor-pointer"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 객체 액션 (복제 및 삭제) */}
                <div className="pt-2 border-t border-slate-800 flex gap-2">
                  <button
                    onClick={() => duplicateObject(currentObj.id)}
                    className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition font-medium"
                  >
                    <Copy className="w-3.5 h-3.5 text-sky-400" />
                    <span>복제</span>
                  </button>
                  <button
                    onClick={() => removeObject(currentObj.id)}
                    className="flex-1 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>삭제</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </aside>
      )}

      {/* 2. 우측 기본 레이어 및 객체 계층(Z-Index) & 도면 시트 관리 패널 */}
      <aside className="w-72 bg-slate-900 border-l border-slate-800/80 flex flex-col h-full shadow-2xl">
        {/* 상단 탭 스위처 (객체 레이어 vs 도면 시트) */}
        <div className="p-2 border-b border-slate-800 bg-slate-950/60">
          <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
            <button
              onClick={() => setActiveRightTab("objects")}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeRightTab === "objects"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>객체 ({objects.length})</span>
            </button>
            <button
              onClick={() => setActiveRightTab("sheets")}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeRightTab === "sheets"
                  ? "bg-sky-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>도면 시트 ({backgroundSheets.length || 1})</span>
            </button>
          </div>
        </div>

        {/* 탭 1. 도면 시트 (배경 레이어 관리) */}
        {activeRightTab === "sheets" ? (
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* 전체 배경 잠금/정렬 토글 바 */}
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isBackgroundLocked ? (
                  <Lock className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Unlock className="w-4 h-4 text-amber-400 animate-pulse" />
                )}
                <div>
                  <div className="text-xs font-bold text-slate-200">
                    {isBackgroundLocked ? "도면 잠금 상태" : "도면 정렬 모드"}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {isBackgroundLocked ? "객체 그리기 안전 모드" : "도면 이동/회전 가능"}
                  </div>
                </div>
              </div>
              <button
                onClick={toggleBackgroundLock}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                  isBackgroundLocked
                    ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                    : "bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border-amber-500/40"
                }`}
              >
                {isBackgroundLocked ? "잠금 해제" : "잠금 완료"}
              </button>
            </div>

            {/* 시트 목록 */}
            <div className="space-y-2.5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                불러온 도면 목록 ({backgroundSheets.length || 1}개)
              </div>

              {(backgroundSheets.length > 0 ? backgroundSheets : [
                {
                  id: "sheet_1",
                  title: "메인 도면 (시트 1)",
                  imagePath: "",
                  x: 0,
                  y: 0,
                  width: 1600,
                  height: 1200,
                  rotation: 0,
                  flipX: false,
                  flipY: false,
                  opacity: 1.0,
                  locked: false,
                }
              ]).map((sheet, sIdx) => {
                const isActive = activeSheetId === sheet.id;
                return (
                  <div
                    key={sheet.id}
                    onClick={() => {
                      setActiveSheetId(sheet.id);
                      useDrawingStore.setState({ isBackgroundLocked: false });
                    }}
                    className={`bg-slate-950/80 rounded-xl p-3 border transition cursor-pointer space-y-2.5 ${
                      isActive
                        ? "border-sky-500 shadow-md shadow-sky-500/10"
                        : "border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {/* 시트 헤더 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-5 h-5 rounded-lg bg-sky-600/20 text-sky-400 flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                          {sIdx + 1}
                        </div>
                        <input
                          type="text"
                          value={sheet.title}
                          onChange={(e) => updateBackgroundSheet(sheet.id, { title: e.target.value })}
                          className="bg-transparent text-xs font-bold text-slate-200 focus:text-sky-300 outline-none truncate"
                        />
                      </div>
                      {backgroundSheets.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`${sheet.title}을(를) 삭제하시겠습니까?`)) {
                              removeBackgroundSheet(sheet.id);
                            }
                          }}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-900 transition"
                          title="시트 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* 개별 변형 툴바 (회전 / 반전) */}
                    <div className="grid grid-cols-4 gap-1 pt-1 border-t border-slate-800/80">
                      {/* 반시계 90도 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          rotateSheet(sheet.id, -90);
                        }}
                        className="flex flex-col items-center justify-center p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 transition"
                        title="반시계 90° 회전"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                        <span className="text-[9px] mt-0.5">-90°</span>
                      </button>

                      {/* 시계 90도 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          rotateSheet(sheet.id, 90);
                        }}
                        className="flex flex-col items-center justify-center p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 transition"
                        title="시계 90° 회전"
                      >
                        <RotateCw className="w-3.5 h-3.5 text-sky-400" />
                        <span className="text-[9px] mt-0.5">+90°</span>
                      </button>

                      {/* 좌우 반전 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          flipSheet(sheet.id, "x");
                        }}
                        className={`flex flex-col items-center justify-center p-1.5 rounded-lg border transition ${
                          sheet.flipX
                            ? "bg-sky-600/30 border-sky-500 text-sky-300"
                            : "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white"
                        }`}
                        title="좌우 반전 (Flip X)"
                      >
                        <FlipHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-[9px] mt-0.5">좌우</span>
                      </button>

                      {/* 상하 반전 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          flipSheet(sheet.id, "y");
                        }}
                        className={`flex flex-col items-center justify-center p-1.5 rounded-lg border transition ${
                          sheet.flipY
                            ? "bg-sky-600/30 border-sky-500 text-sky-300"
                            : "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white"
                        }`}
                        title="상하 반전 (Flip Y)"
                      >
                        <FlipVertical className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-[9px] mt-0.5">상하</span>
                      </button>
                    </div>

                    {/* 투명도 조절 슬라이더 */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span>투명도</span>
                        <span className="font-mono text-sky-400">{Math.round((sheet.opacity ?? 1.0) * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={sheet.opacity ?? 1.0}
                        onChange={(e) => updateBackgroundSheet(sheet.id, { opacity: parseFloat(e.target.value) })}
                        className="w-full accent-sky-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    {/* 도면 자르기 (Crop) 버튼 */}
                    <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCroppingSheet(sheet);
                        }}
                        className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                          sheet.crop
                            ? "bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border-sky-500/40"
                            : "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800"
                        }`}
                      >
                        <Crop className="w-3.5 h-3.5 text-sky-400" />
                        <span>{sheet.crop ? "✂️ 자르기 영역 수정됨" : "✂️ 도면 자르기 (Crop)"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* 새 도면 시트 추가 버튼 */}
              <button
                onClick={() => setIsAddSheetModalOpen(true)}
                className="w-full py-2.5 bg-gradient-to-r from-sky-600/30 to-indigo-600/30 hover:from-sky-600/40 hover:to-indigo-600/40 border border-sky-500/40 hover:border-sky-500/60 text-sky-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4 text-sky-400" />
                <span>+ 새 도면 시트 추가 (이어붙이기)</span>
              </button>
            </div>

            {/* 도면 시트 추가 모달 */}
            <OpenDrawingModal
              isOpen={isAddSheetModalOpen}
              onClose={() => setIsAddSheetModalOpen(false)}
            />

            {/* 도면 자르기 (Crop) 모달 */}
            <CropSheetModal
              isOpen={!!croppingSheet}
              onClose={() => setCroppingSheet(null)}
              sheet={croppingSheet}
            />
          </div>
        ) : (
          /* 탭 2. 객체 레이어 관리 */
          <>
            {/* 상단 탭 헤더 */}
            <div className="p-3 border-b border-slate-800 space-y-2.5 bg-slate-950/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-sky-400" />
                  <h2 className="text-xs font-bold text-slate-100 tracking-tight">
                    객체 레이어 목록 ({objects.length})
                  </h2>
                </div>
                {selectedObjectIds.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full font-bold">
                    {selectedObjectIds.length}개 선택됨
                  </span>
                )}
              </div>

              {/* 다중 선택 일괄 작업 툴바 */}
              <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-slate-800/60">
                <button
                  onClick={toggleCheckAllObjects}
                  className="flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer select-none py-1"
                  title="모든 객체 선택 / 해제"
                >
                  {selectedObjectIds.length === objects.length && objects.length > 0 ? (
                    <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                  ) : selectedObjectIds.length > 0 ? (
                    <div className="w-3.5 h-3.5 border border-indigo-400 bg-indigo-500/30 rounded flex items-center justify-center">
                      <div className="w-2 h-0.5 bg-indigo-300 rounded-full" />
                    </div>
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span className="text-[11px] font-medium">전체 선택</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      if (selectedObjectIds.length >= 2) {
                        pushState(objects);
                        createGroup(selectedObjectIds);
                      }
                    }}
                    disabled={selectedObjectIds.length < 2}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition ${
                      selectedObjectIds.length >= 2
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-sm"
                        : "bg-slate-800/40 text-slate-600 cursor-not-allowed border border-slate-800"
                    }`}
                    title="선택된 객체들을 그룹으로 묶기"
                  >
                    <FolderPlus className="w-3 h-3" />
                    <span>그룹</span>
                  </button>

                  <button
                    onClick={() => {
                      const groupIds = Array.from(
                        new Set(
                          objects
                            .filter((o) => selectedObjectIds.includes(o.id) && o.groupId)
                            .map((o) => o.groupId!)
                        )
                      );
                      if (groupIds.length > 0) {
                        pushState(objects);
                        groupIds.forEach((gid) => ungroup(gid));
                      }
                    }}
                    disabled={!objects.some((o) => selectedObjectIds.includes(o.id) && o.groupId)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition ${
                      objects.some((o) => selectedObjectIds.includes(o.id) && o.groupId)
                        ? "bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer border border-slate-700"
                        : "bg-slate-800/40 text-slate-600 cursor-not-allowed border border-slate-800"
                    }`}
                    title="선택된 객체들의 그룹 해제"
                  >
                    <FolderMinus className="w-3 h-3" />
                    <span>해제</span>
                  </button>

                  <button
                    onClick={() => {
                      if (selectedObjectIds.length > 0) {
                        pushState(objects);
                        removeObjects(selectedObjectIds);
                      }
                    }}
                    disabled={selectedObjectIds.length === 0}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition ${
                      selectedObjectIds.length > 0
                        ? "bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 cursor-pointer"
                        : "bg-slate-800/40 text-slate-600 cursor-not-allowed border border-slate-800"
                    }`}
                    title="선택된 객체 일괄 삭제"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>삭제</span>
                  </button>
                </div>
              </div>
            </div>

        {/* 레이어 스택 목록 (그룹 폴더 아코디언 + 단일 객체 계층 렌더링) */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {objects.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500 text-xs">
              <Layers className="w-8 h-8 text-slate-700 mb-2" />
              <span>캔버스에 객체가 없습니다</span>
              <span className="text-[10px] text-slate-600 mt-1">좌측 도구로 노드나 선을 그려보세요</span>
            </div>
          ) : (
            (() => {
              // 1. 그룹 폴더 및 단일 객체 파티셔닝 (중복 렌더링 완전 방지)
              const processedGroupIds = new Set<string>();

              type LayerEntry =
                | { type: "group"; groupId: string; items: typeof objects }
                | { type: "single"; object: (typeof objects)[0] };

              const layerEntries: LayerEntry[] = [];
              [...objects].reverse().forEach((obj) => {
                if (obj.groupId) {
                  if (!processedGroupIds.has(obj.groupId)) {
                    processedGroupIds.add(obj.groupId);
                    const groupMembers = objects.filter((o) => o.groupId === obj.groupId);
                    layerEntries.push({
                      type: "group",
                      groupId: obj.groupId,
                      items: groupMembers,
                    });
                  }
                } else {
                  layerEntries.push({
                    type: "single",
                    object: obj,
                  });
                }
              });

              return layerEntries.map((entry) => {
                // 1. 그룹 폴더 아코디언 형태 렌더링
                if (entry.type === "group") {
                  const isCollapsed = collapsedGroups[entry.groupId] || false;
                  const memberIds = entry.items.map((i) => i.id);
                  const allGroupChecked =
                    memberIds.length > 0 && memberIds.every((id) => selectedObjectIds.includes(id));
                  const someGroupChecked =
                    !allGroupChecked && memberIds.some((id) => selectedObjectIds.includes(id));
                  const isGroupSelected = selectedObjectId === entry.groupId || allGroupChecked;

                  return (
                    <div
                      key={entry.groupId}
                      className={`rounded-xl border transition shadow-sm overflow-hidden ${
                        allGroupChecked || isGroupSelected
                          ? "border-indigo-500/60 bg-slate-950/80"
                          : someGroupChecked
                          ? "border-indigo-500/40 bg-slate-950/60"
                          : "border-slate-800/80 bg-slate-950/40"
                      }`}
                    >
                      {/* 그룹 폴더 헤더 */}
                      <div
                        onClick={() => {
                          selectGroupOnly(entry.groupId);
                          setPropertyTabOpen(true);
                        }}
                        className={`group p-2 flex items-center justify-between transition cursor-pointer gap-1.5 ${
                          isGroupSelected
                            ? "bg-indigo-600/25 text-white"
                            : someGroupChecked
                            ? "bg-indigo-950/30 text-indigo-200 hover:bg-indigo-950/50"
                            : "text-slate-300 hover:bg-slate-800/60"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate min-w-0 flex-1">
                          {/* 접기/펼치기 버튼 */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleGroupCollapse(entry.groupId);
                            }}
                            className="p-0.5 text-slate-400 hover:text-white rounded cursor-pointer transition"
                            title={isCollapsed ? "그룹 펼치기" : "그룹 접기"}
                          >
                            {isCollapsed ? (
                              <ChevronRight className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* 그룹 전체 선택 체크박스 */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleGroupSelection(entry.groupId);
                              setPropertyTabOpen(true);
                            }}
                            className="p-0.5 text-slate-400 hover:text-indigo-300 transition cursor-pointer shrink-0"
                            title={allGroupChecked ? "전체 해제" : "그룹 전체 선택"}
                          >
                            {allGroupChecked ? (
                              <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                            ) : someGroupChecked ? (
                              <div className="w-3.5 h-3.5 border border-indigo-400 bg-indigo-500/30 rounded flex items-center justify-center">
                                <div className="w-2 h-0.5 bg-indigo-300 rounded-full" />
                              </div>
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                            )}
                          </button>

                          <Folder className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="text-xs font-bold truncate">
                            {entry.groupId}
                          </span>
                          <span className="px-1.5 py-0.2 text-[10px] bg-slate-800/80 text-slate-400 rounded-full font-mono shrink-0">
                            {entry.items.length}
                          </span>
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0">
                          {/* 그룹 해제 버튼 */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              ungroup(entry.groupId);
                            }}
                            title="그룹 해제"
                            className="p-1 text-slate-400 hover:text-amber-400 rounded hover:bg-slate-800 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Unlock className="w-3 h-3" />
                          </button>

                          {/* 그룹 삭제 버튼 */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              pushState(objects);
                              entry.items.forEach((item) => removeObject(item.id));
                            }}
                            title="그룹 전체 삭제"
                            className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* 그룹 내부 멤버 목록 */}
                      {!isCollapsed && (
                        <div className="pl-3 pr-1.5 py-1 border-t border-slate-800/60 bg-slate-950/70 space-y-1">
                          {entry.items.map((obj) => {
                            const isObjSelected = selectedObjectIds.includes(obj.id);
                            const isVisible = obj.visible !== false;

                            return (
                              <div
                                key={obj.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (e.ctrlKey || e.metaKey || e.shiftKey) {
                                    toggleCheckObjectId(obj.id);
                                  } else {
                                    setSelectedObjectId(obj.id);
                                    setSelectedObjectIds([obj.id]);
                                    setPropertyTabOpen(true);
                                  }
                                }}
                                className={`group/item p-1.5 rounded-lg border flex items-center justify-between transition cursor-pointer gap-1.5 ${
                                  !isVisible
                                    ? "opacity-50 bg-slate-950/40 border-slate-800/40 text-slate-500"
                                    : isObjSelected
                                    ? "bg-indigo-600/20 border-indigo-500/50 text-white shadow-sm"
                                    : "bg-slate-900/50 border-slate-800/60 text-slate-300 hover:bg-slate-800/50 hover:text-slate-100"
                                }`}
                              >
                                <div className="flex items-center gap-1.5 truncate min-w-0 flex-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleCheckObjectId(obj.id);
                                      setPropertyTabOpen(true);
                                    }}
                                    className="p-0.5 text-slate-400 hover:text-indigo-300 transition cursor-pointer shrink-0"
                                    title={isObjSelected ? "선택 해제" : "선택"}
                                  >
                                    {isObjSelected ? (
                                      <CheckSquare className="w-3 h-3 text-indigo-400" />
                                    ) : (
                                      <Square className="w-3 h-3 text-slate-600" />
                                    )}
                                  </button>

                                  <span className="shrink-0">{getObjectIcon(obj.type)}</span>
                                  <span className="text-[11px] font-medium truncate">
                                    {obj.label || obj.id}
                                  </span>
                                </div>

                                <div className="flex items-center gap-0.5 shrink-0">
                                  {/* 가리기/보이기 눈동자 토글 버튼 */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      pushState(objects);
                                      useDrawingStore.getState().updateObject(obj.id, { visible: !isVisible });
                                    }}
                                    title={isVisible ? "가리기" : "보이기"}
                                    className={`p-1 rounded hover:bg-slate-800 transition cursor-pointer ${
                                      isVisible ? "text-slate-500 hover:text-white opacity-0 group-hover/item:opacity-100" : "text-amber-400"
                                    }`}
                                  >
                                    {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                  </button>

                                  {/* 삭제 버튼 */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      pushState(objects);
                                      removeObject(obj.id);
                                    }}
                                    title="개별 삭제"
                                    className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 cursor-pointer opacity-0 group-hover/item:opacity-100 transition-opacity"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                // 2. 단일 독립 객체 렌더링
                const obj = entry.object;
                const isSelected = selectedObjectIds.includes(obj.id);
                const isVisible = obj.visible !== false;

                return (
                  <div
                    key={obj.id}
                    onClick={(e) => {
                      if (e.ctrlKey || e.metaKey || e.shiftKey) {
                        toggleCheckObjectId(obj.id);
                      } else {
                        setSelectedObjectId(obj.id);
                        setSelectedObjectIds([obj.id]);
                        setPropertyTabOpen(true);
                      }
                    }}
                    className={`group p-2 rounded-xl border flex items-center justify-between transition cursor-pointer gap-2 ${
                      !isVisible
                        ? "opacity-50 bg-slate-950/40 border-slate-800/40 text-slate-500"
                        : isSelected
                        ? "bg-indigo-600/20 border-indigo-500/60 text-white shadow-md shadow-indigo-500/10"
                        : "bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/60 hover:text-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate min-w-0 flex-1">
                      {/* 체크박스 */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCheckObjectId(obj.id);
                          setPropertyTabOpen(true);
                        }}
                        className="p-0.5 text-slate-400 hover:text-indigo-300 transition cursor-pointer shrink-0"
                        title={isSelected ? "선택 해제" : "선택"}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                        )}
                      </button>

                      {/* 아이콘 */}
                      <span className="shrink-0">{getObjectIcon(obj.type)}</span>

                      {/* 라벨 / ID / 커넥터 동적 경로 라벨링 */}
                      {obj.type === "connector" || obj.type === "wire" ? (() => {
                        const fromObj = obj.fromNodeId ? objects.find((o) => o.id === obj.fromNodeId) : null;
                        const toObj = obj.toNodeId ? objects.find((o) => o.id === obj.toNodeId) : null;
                        const dynamicLabel = fromObj && toObj
                          ? `${fromObj.label || "노드"} ➔ ${toObj.label || "노드"}`
                          : fromObj
                          ? `${fromObj.label || "노드"} ➔ (미지정)`
                          : toObj
                          ? `(미지정) ➔ ${toObj.label || "노드"}`
                          : obj.label || "연결선";

                        return (
                          <div className="flex items-center gap-1.5 truncate min-w-0">
                            <span className="text-xs font-semibold truncate text-sky-300">
                              {dynamicLabel}
                            </span>
                            <span className="px-1.5 py-0.2 text-[9px] bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded font-bold shrink-0">
                              연결선
                            </span>
                          </div>
                        );
                      })() : (() => {
                        const connectedCount = objects.filter(
                          (c) => c.type === "connector" && (c.fromNodeId === obj.id || c.toNodeId === obj.id)
                        ).length;

                        return (
                          <div className="flex items-center gap-1.5 truncate min-w-0">
                            <span className="text-xs font-medium truncate">
                              {obj.label || obj.id}
                            </span>
                            {connectedCount > 0 && (
                              <span className="px-1.5 py-0.2 text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full font-bold flex items-center gap-0.5 shrink-0" title={`연결된 선 ${connectedCount}개`}>
                                <Share2 className="w-2.5 h-2.5" />
                                <span>{connectedCount}</span>
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Z-Index 레이어 순서 제어, 눈동자 가리기 토글 및 개별 삭제 버튼 */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      {/* 가리기 / 보이기 눈동자 버튼 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          pushState(objects);
                          useDrawingStore.getState().updateObject(obj.id, { visible: !isVisible });
                        }}
                        title={isVisible ? "가리기" : "보이기"}
                        className={`p-1 rounded hover:bg-slate-800 transition cursor-pointer ${
                          isVisible ? "text-slate-400 hover:text-white" : "text-amber-400"
                        }`}
                      >
                        {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          reorderObject(obj.id, "bringForward");
                        }}
                        title="위로 이동"
                        className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          reorderObject(obj.id, "sendBackward");
                        }}
                        title="아래로 이동"
                        className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          pushState(objects);
                          removeObject(obj.id);
                        }}
                        title="삭제"
                        className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              });
            })()
          )}
        </div>
          </>
        )}
      </aside>
    </div>
  );
};
