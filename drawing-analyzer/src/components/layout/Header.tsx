import React, { useRef, useState } from "react";
import {
  Layers,
  Magnet,
  FolderPlus,
  FolderMinus,
  CheckCircle2,
  Loader2,
  FilePlus2,
  ZoomIn,
  ZoomOut,
  Maximize,
  RotateCcw,
  RotateCw,
  MousePointer,
  PenTool,
  Sliders,
  Save,
  FolderOpen,
  Download,
  History,
  ChevronDown,
  Plus,
  LayoutDashboard,
  Keyboard,
  Power,
} from "lucide-react";
import { useDrawingStore } from "../../store/drawingStore";
import { useUIStore } from "../../store/uiStore";
import { useCategoryStore } from "../../store/categoryStore";
import { useUserStore } from "../../store/userStore";
import { AddCategoryModal } from "../modals/AddCategoryModal";

interface HeaderProps {
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Header: React.FC<HeaderProps> = ({ onFileSelect }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 캐스케이딩 팝업 추가 모달
  const [addCategoryType, setAddCategoryType] = useState<"manufacturer" | "model" | "systemCategory" | null>(null);

  // 드롭다운 열림 상태
  const [openDropdown, setOpenDropdown] = useState<"maker" | "model" | "cat" | null>(null);

  const {
    saveStatus,
    selectedObjectIds,
    selectedObjectId,
    createGroup,
    ungroup,
    objects,
    zoom,
    viewportRotation,
    setZoom,
    setPan,
  } = useDrawingStore();

  const {
    isSnappingEnabled,
    toggleSnapping,
    editorMode,
    setEditorMode,
    setDashboardOpen,
    setAuthModalOpen,
    setOpenDrawingModalOpen,
    setResModalOpen,
    setSaveModalOpen,
    setLoadModalOpen,
    setTimelineModalOpen,
    setExportModalOpen,
    setShortcutsHelpOpen,
    setOfflineInstallOpen,
  } = useUIStore();

  const { currentUser, logout } = useUserStore();

  const {
    categories,
    selectedManufacturer,
    selectedModel,
    selectedSystemCategory,
    drawingTitle,
    setSelectedManufacturer,
    setSelectedModel,
    setSelectedSystemCategory,
    setDrawingTitle,
  } = useCategoryStore();

  const availableModels = categories.modelsByMaker[selectedManufacturer] || ["기본 기종"];

  const currentObj = objects.find((o) => o.id === selectedObjectId);
  const selectedGroupIds = Array.from(
    new Set(
      objects
        .filter(
          (o) =>
            (selectedObjectId && o.groupId === selectedObjectId) ||
            (selectedObjectIds.includes(o.id) && o.groupId)
        )
        .map((o) => o.groupId!)
    )
  );
  const canGroup = selectedObjectIds.length > 1;
  const canUngroup =
    selectedGroupIds.length > 0 ||
    !!currentObj?.isGroup ||
    !!currentObj?.groupId ||
    (selectedObjectId ? objects.some((o) => o.groupId === selectedObjectId) : false);

  const handleZoomIn = () => {
    window.dispatchEvent(new CustomEvent("canvas:zoom-in"));
  };

  const handleZoomOut = () => {
    window.dispatchEvent(new CustomEvent("canvas:zoom-out"));
  };

  const handleActualSize = () => {
    window.dispatchEvent(new CustomEvent("canvas:actual-size"));
  };

  const handleFitScreen = () => {
    window.dispatchEvent(new CustomEvent("canvas:fit-screen"));
  };

  const handleRotateCCW = () => {
    window.dispatchEvent(new CustomEvent("canvas:rotate-ccw"));
  };

  const handleRotateCW = () => {
    window.dispatchEvent(new CustomEvent("canvas:rotate-cw"));
  };

  const handleResetRotation = () => {
    window.dispatchEvent(new CustomEvent("canvas:reset-rotation"));
  };

  const handleResetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    window.dispatchEvent(new CustomEvent("canvas:reset-view"));
  };

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3 z-30 select-none gap-2.5">
      {/* 1. 좌측 그룹: [분석기 로고] ➡️ [새 파일] ➡️ [불러오기] ➡️ [계층 분류] ➡️ [저장] ➡️ [뷰어 / 편집] */}
      <div className="flex items-center gap-2">
        {/* A. 분석기 로고 */}
        <div className="flex items-center gap-1.5 shrink-0 pr-1">
          <div className="flex items-center gap-1.5 bg-gradient-to-tr from-indigo-600 to-sky-500 p-1.5 rounded-xl text-white shadow-lg shadow-indigo-500/20">
            <Layers className="w-4 h-4" />
          </div>
          <span className="font-bold text-xs text-slate-100 tracking-tight block">
            도면 분석기
          </span>
        </div>

        {/* A-1. [📊 대시보드] 버튼 */}
        <button
          onClick={() => setDashboardOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 border border-indigo-400/30 transition cursor-pointer shrink-0"
          title="대시보드 허브 열기"
        >
          <LayoutDashboard className="w-3.5 h-3.5 text-white" />
          <span>대시보드</span>
        </button>

        {/* 숨겨진 파일 업로드 인풋 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          className="hidden"
          onChange={onFileSelect}
        />

        {/* B. [도면 열기 / 추가] 버튼 */}
        <button
          onClick={() => setOpenDrawingModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 border border-indigo-400/30 transition cursor-pointer shrink-0"
          title="도면 이미지 열기 및 2번째 시트 이어붙이기 (미리보기 지원)"
        >
          <FilePlus2 className="w-3.5 h-3.5 text-white" />
          <span>도면 열기 / 추가</span>
        </button>

        {/* C. [불러오기] 버튼 */}
        <button
          onClick={() => setLoadModalOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer shrink-0"
          title="저장된 프로젝트 / .cadproj 불러오기"
        >
          <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
          <span>불러오기</span>
        </button>

        {/* D. [순차 캐스케이딩 계층 분류 바] (제조사 ➡️ 기종 ➡️ 계통/부위 ➡️ 도면명) */}
        <div className="flex items-center bg-slate-950/80 px-2 py-1 rounded-xl border border-slate-800 gap-1.5 shadow-inner shrink-0">
          {/* 1) 제조사 드롭다운 */}
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === "maker" ? null : "maker")}
              className={`flex items-center gap-1 px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/70 rounded-lg text-xs transition cursor-pointer ${
                selectedManufacturer ? "text-indigo-300 font-semibold" : "text-slate-400 font-normal"
              }`}
              title="제조사 선택"
            >
              <span className="truncate max-w-[95px]">{selectedManufacturer || "제조사 선택"}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {openDropdown === "maker" && (
              <div
                className="absolute left-0 top-full mt-1.5 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 text-xs space-y-1"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  제조사 선택
                </div>
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {categories.manufacturers.map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setSelectedManufacturer(m);
                        setOpenDropdown(null);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg transition cursor-pointer truncate ${
                        selectedManufacturer === m
                          ? "bg-indigo-600/30 text-indigo-200 font-bold border border-indigo-500/40"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <div className="pt-1 border-t border-slate-800">
                  <button
                    onClick={() => {
                      setOpenDropdown(null);
                      setAddCategoryType("manufacturer");
                    }}
                    className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-lg text-xs font-semibold transition cursor-pointer border border-indigo-500/30"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>새 제조사 추가...</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <span className="text-slate-600 text-xs font-semibold">/</span>

          {/* 2) 기종 드롭다운 */}
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === "model" ? null : "model")}
              className={`flex items-center gap-1 px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/70 rounded-lg text-xs transition cursor-pointer ${
                selectedModel ? "text-amber-300 font-semibold" : "text-slate-400 font-normal"
              }`}
              title="기종/모델 선택"
            >
              <span className="truncate max-w-[85px]">{selectedModel || "기종 선택"}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {openDropdown === "model" && (
              <div
                className="absolute left-0 top-full mt-1.5 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 text-xs space-y-1"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  기종 선택
                </div>
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {availableModels.length === 0 ? (
                    <div className="px-2 py-2 text-[11px] text-slate-500 text-center">
                      제조사를 먼저 선택해 주세요
                    </div>
                  ) : (
                    availableModels.map((mod) => (
                      <button
                        key={mod}
                        onClick={() => {
                          setSelectedModel(mod);
                          setOpenDropdown(null);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg transition cursor-pointer truncate ${
                          selectedModel === mod
                            ? "bg-amber-600/30 text-amber-200 font-bold border border-amber-500/40"
                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        {mod}
                      </button>
                    ))
                  )}
                </div>
                <div className="pt-1 border-t border-slate-800">
                  <button
                    onClick={() => {
                      setOpenDropdown(null);
                      setAddCategoryType("model");
                    }}
                    className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 rounded-lg text-xs font-semibold transition cursor-pointer border border-amber-500/30"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>새 기종 추가...</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <span className="text-slate-600 text-xs font-semibold">/</span>

          {/* 3) 계통/부위 드롭다운 */}
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === "cat" ? null : "cat")}
              className={`flex items-center gap-1 px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/70 rounded-lg text-xs transition cursor-pointer ${
                selectedSystemCategory ? "text-emerald-300 font-medium" : "text-slate-400 font-normal"
              }`}
              title="계통/부위 선택"
            >
              <span className="truncate max-w-[120px]">{selectedSystemCategory || "계통/부위 선택"}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {openDropdown === "cat" && (
              <div
                className="absolute left-0 top-full mt-1.5 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 text-xs space-y-1"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  계통/부위 선택
                </div>
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {categories.systemCategories.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setSelectedSystemCategory(c);
                        setOpenDropdown(null);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg transition cursor-pointer truncate ${
                        selectedSystemCategory === c
                          ? "bg-emerald-600/30 text-emerald-200 font-bold border border-emerald-500/40"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div className="pt-1 border-t border-slate-800">
                  <button
                    onClick={() => {
                      setOpenDropdown(null);
                      setAddCategoryType("systemCategory");
                    }}
                    className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-lg text-xs font-semibold transition cursor-pointer border border-emerald-500/30"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>새 계통 추가...</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <span className="text-slate-600 text-xs font-semibold">/</span>

          {/* 4) 도면명 입력 */}
          <div className="flex items-center px-2 py-0.5 bg-slate-900 border border-slate-700/70 rounded-lg">
            <input
              type="text"
              value={drawingTitle}
              onChange={(e) => setDrawingTitle(e.target.value)}
              placeholder="도면명 입력..."
              className="w-36 bg-transparent text-xs text-slate-100 font-medium focus:outline-none placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* E. [저장] 버튼 */}
        <button
          onClick={() => setSaveModalOpen(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-lg shadow-indigo-600/25 shrink-0"
          title="프로젝트 비파괴 저장 및 서버 동기화"
        >
          <Save className="w-3.5 h-3.5" />
          <span>저장</span>
        </button>

        {/* F. [뷰어 / 편집] 모드 전환 토글 */}
        <div className="flex items-center bg-slate-950/80 p-0.5 rounded-xl border border-slate-800 shadow-inner shrink-0">
          <button
            onClick={() => setEditorMode("viewer")}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              editorMode === "viewer"
                ? "bg-sky-500 text-white shadow-md shadow-sky-500/25"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="뷰어 모드"
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>뷰어</span>
          </button>
          <button
            onClick={() => setEditorMode("editor")}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              editorMode === "editor"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="편집 모드"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>편집</span>
          </button>
        </div>
      </div>

      {/* 2. 우측 도구 그룹: [줌/화면맞춤] ➡️ [스냅/그룹] ➡️ [내보내기] ➡️ [복구] ➡️ [규격설정] ➡️ [저장상태] */}
      <div className="flex items-center gap-2 shrink-0">
        {/* 뷰포트 회전 및 줌 컨트롤 */}
        <div className="flex items-center bg-slate-950/80 px-1.5 py-0.5 rounded-xl border border-slate-800 gap-1 text-xs font-mono text-slate-300">
          {/* 회전 컨트롤 */}
          <button
            onClick={handleRotateCCW}
            className="p-1 text-sky-400 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
            title="90° 반시계 회전 (Ctrl+[)"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <button
            onClick={handleResetRotation}
            className={`px-1 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
              viewportRotation !== 0
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
            title="클릭하여 각도 초기화 (0°)"
          >
            {viewportRotation}°
          </button>
          <button
            onClick={handleRotateCW}
            className="p-1 text-sky-400 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
            title="90° 시계 회전 (Ctrl+])"
          >
            <RotateCw className="w-3 h-3" />
          </button>

          <div className="h-3.5 w-px bg-slate-800 mx-0.5" />

          {/* 줌 컨트롤 */}
          <button
            onClick={handleZoomOut}
            className="p-1 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
            title="축소"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <span
            onClick={handleActualSize}
            className="w-10 text-center font-bold text-sky-400 hover:bg-slate-800 px-0.5 py-0.5 rounded cursor-pointer transition text-[11px]"
            title="100% 원본 크기"
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
            title="확대"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
          <button
            onClick={handleFitScreen}
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
            title="화면 맞춤 (Ctrl+0)"
          >
            <Maximize className="w-3 h-3 text-sky-400" />
          </button>
          <button
            onClick={handleResetView}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
            title="뷰포트 전체 초기화 (100% & 0°)"
          >
            <RotateCcw className="w-3 h-3 text-slate-500 hover:text-slate-200" />
          </button>
        </div>

        {/* 스냅핑 토글 */}
        <button
          onClick={toggleSnapping}
          title={isSnappingEnabled ? "스냅핑 켜짐" : "스냅핑 꺼짐"}
          className={`p-1.5 rounded-xl text-xs border transition cursor-pointer ${
            isSnappingEnabled
              ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/50"
              : "bg-slate-950/40 text-slate-500 border-slate-800"
          }`}
        >
          <Magnet className={`w-3.5 h-3.5 ${isSnappingEnabled ? "text-indigo-400" : "text-slate-600"}`} />
        </button>

        {/* 그룹화 / 해제 */}
        {canGroup && (
          <button
            onClick={() => createGroup(selectedObjectIds)}
            className="flex items-center gap-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
            title="그룹화 (Ctrl+G)"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>그룹화</span>
          </button>
        )}
        {canUngroup && (
          <button
            onClick={() => {
              if (selectedGroupIds.length > 0) {
                selectedGroupIds.forEach((gid) => ungroup(gid));
              } else if (currentObj?.groupId) {
                ungroup(currentObj.groupId);
              } else if (selectedObjectId) {
                ungroup(selectedObjectId);
              }
            }}
            className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg cursor-pointer"
            title="그룹 해제 (Ctrl+Shift+G)"
          >
            <FolderMinus className="w-3.5 h-3.5" />
            <span>해제</span>
          </button>
        )}

        <div className="h-4 w-px bg-slate-800" />

        {/* [내보내기] 버튼 */}
        <button
          onClick={() => setExportModalOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
          title="PNG, JPG, PDF, .cadproj 내보내기"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>내보내기</span>
        </button>

        {/* [복구] 버튼 */}
        <button
          onClick={() => setTimelineModalOpen(true)}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 rounded-xl border border-slate-700 transition cursor-pointer"
          title="시간별 자동 임시저장 타임라인 복구"
        >
          <History className="w-4 h-4 text-amber-400" />
        </button>

        {/* [도면 규격] 버튼 */}
        <button
          onClick={() => setResModalOpen(true)}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition cursor-pointer"
          title="도면 해상도 및 규격 설정"
        >
          <Sliders className="w-3.5 h-3.5 text-indigo-400" />
        </button>

        {/* [단축키 안내] 버튼 */}
        <button
          onClick={() => setShortcutsHelpOpen(true)}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-indigo-300 rounded-xl border border-slate-700 transition cursor-pointer"
          title="키보드 단축키 전체 가이드 (F1 / ?)"
        >
          <Keyboard className="w-3.5 h-3.5 text-indigo-400" />
        </button>

        {/* [앱 설치 / 오프라인 다운로드] 버튼 */}
        <button
          onClick={() => setOfflineInstallOpen(true)}
          className="flex items-center gap-1 px-2 py-1 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-700/60 hover:border-emerald-500 text-emerald-300 hover:text-emerald-100 rounded-xl transition cursor-pointer text-xs font-bold shadow-sm"
          title="오프라인(인터넷 차단) 사용 및 앱 설치 안내"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">앱 설치</span>
        </button>

        {/* 저장 상태 인디케이터 */}
        <div className="flex items-center px-2 py-1 bg-slate-950/60 border border-slate-800 rounded-lg text-[10px] font-mono">
          {saveStatus === "saved" && (
            <div className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3 h-3" />
              <span>저장됨</span>
            </div>
          )}
          {saveStatus === "saving" && (
            <div className="flex items-center gap-1 text-amber-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>저장 중</span>
            </div>
          )}
          {saveStatus === "unsaved" && (
            <div className="flex items-center gap-1 text-slate-400">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>미저장</span>
            </div>
          )}
        </div>
        {/* 사용자 프로필 뱃지 / 전환 버튼 */}
        <button
          onClick={() => setAuthModalOpen(true)}
          className="flex items-center gap-2 px-2.5 py-1 bg-slate-950/60 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 rounded-xl transition cursor-pointer shrink-0"
          title="작업자 프로필 & 전환"
        >
          <div
            className="w-5 h-5 rounded-lg flex items-center justify-center font-bold text-white text-[10px] shadow-sm shrink-0"
            style={{ backgroundColor: currentUser?.avatarColor || "#6366f1" }}
          >
            {currentUser?.name ? currentUser.name.slice(0, 1) : "U"}
          </div>
          <span className="text-xs font-bold text-slate-200 truncate max-w-[80px]">
            {currentUser?.name || "로그인"}
          </span>
        </button>

        {/* [🚪 종료] 버튼 */}
        <button
          onClick={() => {
            if (confirm("작업을 종료하고 로그아웃하시겠습니까?\n(작업 내역은 안전하게 자동 임시저장되었습니다)")) {
              logout();
            }
          }}
          className="flex items-center gap-1 px-2.5 py-1 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 hover:border-rose-500/80 text-rose-300 hover:text-rose-100 text-xs font-bold rounded-xl transition cursor-pointer shrink-0 shadow-sm"
          title="작업 종료 및 로그인 화면으로 이동"
        >
          <Power className="w-3.5 h-3.5" />
          <span>종료</span>
        </button>
      </div>

      {/* 팝업 분류 추가 모달 */}
      {addCategoryType && (
        <AddCategoryModal
          isOpen={true}
          onClose={() => setAddCategoryType(null)}
          type={addCategoryType}
        />
      )}
    </header>
  );
};
