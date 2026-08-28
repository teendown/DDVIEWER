import React, { useState, useRef, useEffect } from "react";
import {
  Share2,
  X,
  Minus,
  Maximize2,
  GitFork,
  ArrowRightLeft,
  ArrowRight,
  Sparkles,
  Palette,
  Sliders,
  Check,
  ChevronDown,
  Layers,
} from "lucide-react";
import { useDrawingStore } from "../../store/drawingStore";
import { useUIStore } from "../../store/uiStore";
import { useHistoryStore } from "../../store/historyStore";
import type { ArrowHeadType } from "../../types/object";

const CONNECTOR_COLORS = [
  "#38bdf8", // Sky
  "#6366f1", // Indigo
  "#ec4899", // Pink
  "#f43f5e", // Rose
  "#f59e0b", // Amber
  "#10b981", // Emerald
  "#06b6d4", // Cyan
  "#8b5cf6", // Purple
  "#ffffff", // White
  "#94a3b8", // Slate
  "#eab308", // Yellow
  "#ef4444", // Red
];

const LINE_STYLES: { id: "solid" | "dashed" | "dotted"; label: string }[] = [
  { id: "solid", label: "실선" },
  { id: "dashed", label: "파선" },
  { id: "dotted", label: "점선" },
];

const CONNECTOR_TYPES: { id: "polyline" | "curve" | "straight"; label: string; desc: string }[] = [
  { id: "polyline", label: "직각 배선", desc: "CAD 표준 수평/수직 꺾임선" },
  { id: "curve", label: "부드러운 곡선", desc: "유려한 베지어 곡선" },
  { id: "straight", label: "최단 직선", desc: "직접 최단거리 직선" },
];

const CAP_TYPES: { id: ArrowHeadType; label: string }[] = [
  { id: "none", label: "없음" },
  { id: "arrow", label: "화살표(V)" },
  { id: "triangle", label: "삼각 화살표" },
  { id: "circle", label: "원형 접점" },
  { id: "square", label: "사각형 단자" },
  { id: "diamond", label: "다이아" },
];

export const SmartConnectorModal: React.FC = () => {
  const {
    isConnectorModalOpen,
    setConnectorModalOpen,
    connectorModalPos,
    setConnectorModalPos,
    connectorConnectionMode,
    setConnectorConnectionMode,
    toolDefaults,
    updateToolDefaults,
  } = useUIStore();

  const {
    objects,
    selectedObjectIds,
    connectObjectsBatch,
  } = useDrawingStore();

  const { pushState } = useHistoryStore();

  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<"connect" | "style">("connect");
  const [parentId, setParentId] = useState<string>("");
  const [lineLabel, setLineLabel] = useState<string>("");

  const modalRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartOffsetRef = useRef({ x: 0, y: 0 });

  // 선택된 객체들 중 커넥터가 아닌 일반 도형/노드 필터링
  const selectableNodes = objects.filter(
    (o) => selectedObjectIds.includes(o.id) && o.type !== "connector"
  );

  // 부모 객체 기본값 설정 (첫 번째 선택 객체)
  useEffect(() => {
    if (selectableNodes.length > 0) {
      if (!parentId || !selectableNodes.some((n) => n.id === parentId)) {
        setParentId(selectableNodes[0].id);
      }
    }
  }, [selectableNodes, parentId]);

  if (!isConnectorModalOpen) return null;

  const curDefaults = toolDefaults.connector;
  const childNodes = selectableNodes.filter((n) => n.id !== parentId);

  // 헤더 드래그로 팝업창 위치 이동 핸들러
  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("input")) return;
    isDraggingRef.current = true;
    dragStartOffsetRef.current = {
      x: e.clientX - connectorModalPos.x,
      y: e.clientY - connectorModalPos.y,
    };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const nextX = Math.max(10, Math.min(window.innerWidth - 360, ev.clientX - dragStartOffsetRef.current.x));
      const nextY = Math.max(60, Math.min(window.innerHeight - 100, ev.clientY - dragStartOffsetRef.current.y));
      setConnectorModalPos({ x: nextX, y: nextY });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // 일괄 연결 실행 핸들러
  const handleExecuteConnect = () => {
    if (!parentId || childNodes.length === 0) return;
    pushState(objects);

    const childIds = childNodes.map((n) => n.id);
    connectObjectsBatch(parentId, childIds, connectorConnectionMode, {
      connectorType: curDefaults.connectorType,
      strokeColor: curDefaults.strokeColor,
      strokeWidth: curDefaults.strokeWidth,
      lineStyle: curDefaults.lineStyle,
      startCap: curDefaults.startCap,
      endCap: curDefaults.endCap,
      jointCap: curDefaults.jointCap,
      label: lineLabel.trim() || undefined,
    });
  };

  return (
    <div
      ref={modalRef}
      style={{ left: `${connectorModalPos.x}px`, top: `${connectorModalPos.y}px` }}
      className="absolute z-40 w-80 bg-slate-900/95 backdrop-blur-xl border border-indigo-500/40 rounded-2xl shadow-2xl shadow-indigo-950/60 flex flex-col overflow-hidden text-slate-200 select-none animate-in fade-in zoom-in-95 duration-150"
    >
      {/* 1. 드래그 가능한 헤더 바 */}
      <div
        onMouseDown={handleHeaderMouseDown}
        className="px-3.5 py-2.5 bg-gradient-to-r from-indigo-950/80 via-slate-900/90 to-slate-950/80 border-b border-indigo-500/30 flex items-center justify-between cursor-move"
      >
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-400">
            <Share2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
              스마트 커넥터 2.0
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title={isMinimized ? "펼치기" : "접기"}
          >
            {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          </button>
          <button
            type="button"
            onClick={() => {
              setConnectorModalOpen(false);
              useUIStore.getState().setActiveTool("select");
            }}
            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
            title="닫기"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. 최소화 상태가 아닐 때의 메인 컨텐츠 영역 */}
      {!isMinimized && (
        <div className="p-3 space-y-3 max-h-[75vh] overflow-y-auto">
          {/* 상단 탭 전환 (연결 생성 vs 선 스타일 속성) */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950/70 border border-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab("connect")}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === "connect"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>지능형 연결</span>
            </button>
            <button
              onClick={() => setActiveTab("style")}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === "style"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>선 속성 제어</span>
            </button>
          </div>

          {/* TAB 1: 지능형 객체 연결 매니저 */}
          {activeTab === "connect" && (
            <div className="space-y-3">
              {/* 선택 상태 피드백 */}
              <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium flex items-center gap-1">
                    <Layers className="w-3 h-3 text-indigo-400" />
                    선택된 객체
                  </span>
                  <span className="font-bold text-indigo-300">
                    {selectableNodes.length}개 선택됨
                  </span>
                </div>

                {selectableNodes.length < 2 ? (
                  <div className="p-2 bg-slate-950/60 rounded-lg border border-dashed border-slate-800 text-[11px] text-slate-400 text-center">
                    💡 캔버스에서 연결할 객체들을 <strong>2개 이상 선택</strong>하세요.
                  </div>
                ) : (
                  <div className="space-y-2 pt-1 border-t border-indigo-500/20">
                    {/* 부모 객체 선택기 */}
                    <div>
                      <label className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block mb-1">
                        부모(Source / 시작) 객체
                      </label>
                      <div className="relative">
                        <select
                          value={parentId}
                          onChange={(e) => setParentId(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-indigo-500/40 rounded-lg text-xs text-white font-medium focus:outline-none focus:border-indigo-400 appearance-none cursor-pointer"
                        >
                          {selectableNodes.map((node) => (
                            <option key={node.id} value={node.id}>
                              👑 {node.label || node.id} ({node.type})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                      </div>
                    </div>

                    {/* 자식 객체 목록 칩 */}
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">
                        자식(Target / 도착) 객체 ({childNodes.length}개)
                      </label>
                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                        {childNodes.map((child) => (
                          <span
                            key={child.id}
                            className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-md text-[10px] font-mono truncate max-w-[120px]"
                          >
                            {child.label || child.id}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 연결 모드 선택기 */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 block">연결 방식 선택</label>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => setConnectorConnectionMode("1:N")}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                      connectorConnectionMode === "1:N"
                        ? "bg-indigo-600/30 border-indigo-500 text-white font-bold"
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/40"
                    }`}
                  >
                    <GitFork className="w-3.5 h-3.5 text-sky-400" />
                    <span className="text-[10px]">1 : N 분기</span>
                  </button>

                  <button
                    onClick={() => setConnectorConnectionMode("N:1")}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                      connectorConnectionMode === "N:1"
                        ? "bg-indigo-600/30 border-indigo-500 text-white font-bold"
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/40"
                    }`}
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[10px]">N : 1 수렴</span>
                  </button>

                  <button
                    onClick={() => setConnectorConnectionMode("chain")}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                      connectorConnectionMode === "chain"
                        ? "bg-indigo-600/30 border-indigo-500 text-white font-bold"
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/40"
                    }`}
                  >
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px]">직렬 체인</span>
                  </button>
                </div>
              </div>

              {/* 커넥터 라우팅 모양 (직각 / 곡선 / 직선) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 block">배선 라우팅 형태</label>
                <div className="grid grid-cols-3 gap-1">
                  {CONNECTOR_TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => updateToolDefaults("connector", { connectorType: t.id })}
                      className={`p-1.5 rounded-lg border text-center transition cursor-pointer ${
                        curDefaults.connectorType === t.id
                          ? "bg-indigo-600/30 border-indigo-500 text-indigo-200 font-bold"
                          : "bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/40"
                      }`}
                    >
                      <span className="text-[11px] block">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 사용자 커스텀 라벨 (미입력 시 '부모 ➔ 자식' 자동 명명) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 block">
                  커스텀 라벨 (선택 사항)
                </label>
                <input
                  type="text"
                  placeholder="미입력 시 '부모 ➔ 자식' 자동 부여"
                  value={lineLabel}
                  onChange={(e) => setLineLabel(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* 실행 버튼 */}
              <button
                disabled={selectableNodes.length < 2 || !parentId || childNodes.length === 0}
                onClick={handleExecuteConnect}
                className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg ${
                  selectableNodes.length >= 2 && parentId && childNodes.length > 0
                    ? "bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white shadow-indigo-600/25"
                    : "bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700/50"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>최단거리 지능형 연결 실행 ({childNodes.length}개 생성)</span>
              </button>
            </div>
          )}

          {/* TAB 2: 선 스타일 및 속성 제어 */}
          {activeTab === "style" && (
            <div className="space-y-3 text-xs">
              {/* 선 색상 팔레트 */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                  <Palette className="w-3 h-3 text-sky-400" />
                  <span>선 색상</span>
                </label>
                <div className="grid grid-cols-6 gap-1.5 p-2 bg-slate-950/60 rounded-xl border border-slate-800">
                  {CONNECTOR_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => updateToolDefaults("connector", { strokeColor: c })}
                      style={{ backgroundColor: c }}
                      className="w-8 h-8 rounded-lg border border-slate-700 flex items-center justify-center transition hover:scale-110 cursor-pointer shadow-sm"
                    >
                      {curDefaults.strokeColor === c && (
                        <Check className="w-4 h-4 text-black drop-shadow" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* 선 굵기 슬라이더 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-300">선 굵기</span>
                  <span className="font-mono text-indigo-400 font-bold">{curDefaults.strokeWidth}px</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  value={curDefaults.strokeWidth}
                  onChange={(e) => updateToolDefaults("connector", { strokeWidth: Number(e.target.value) })}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              {/* 선 모양 (실선/점선/파선) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 block">선 스타일</label>
                <div className="grid grid-cols-3 gap-1">
                  {LINE_STYLES.map((st) => (
                    <button
                      key={st.id}
                      onClick={() => updateToolDefaults("connector", { lineStyle: st.id })}
                      className={`py-1.5 rounded-lg border text-center text-xs transition cursor-pointer ${
                        curDefaults.lineStyle === st.id
                          ? "bg-indigo-600/30 border-indigo-500 text-white font-bold"
                          : "bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800"
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 시작 / 끝 캡 모양 */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">시작점 캡</label>
                  <select
                    value={curDefaults.startCap}
                    onChange={(e) => updateToolDefaults("connector", { startCap: e.target.value as ArrowHeadType })}
                    className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  >
                    {CAP_TYPES.map((cap) => (
                      <option key={cap.id} value={cap.id}>
                        {cap.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">끝점 캡 (화살표)</label>
                  <select
                    value={curDefaults.endCap}
                    onChange={(e) => updateToolDefaults("connector", { endCap: e.target.value as ArrowHeadType })}
                    className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  >
                    {CAP_TYPES.map((cap) => (
                      <option key={cap.id} value={cap.id}>
                        {cap.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
