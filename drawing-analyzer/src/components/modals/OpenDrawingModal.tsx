import React, { useState, useRef } from "react";
import {
  X,
  Upload,
  ArrowRight,
  ArrowDown,
  Layers,
  Sparkles,
  FileImage,
  CheckCircle2,
  Plus,
} from "lucide-react";
import { useDrawingStore } from "../../store/drawingStore";
import { useCategoryStore } from "../../store/categoryStore";
import type { Drawing, BackgroundSheet } from "../../types";

interface OpenDrawingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ImageFilePreview {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  sizeKb: number;
}

export const OpenDrawingModal: React.FC<OpenDrawingModalProps> = ({
  isOpen,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<ImageFilePreview | null>(null);
  const [sheetTitle, setSheetTitle] = useState("");
  const [placementMode, setPlacementMode] = useState<"new" | "appendRight" | "appendBottom">("new");
  const [isDragging, setIsDragging] = useState(false);

  const {
    currentDrawing,
    setCurrentDrawing,
    addDrawing,
    backgroundSheets,
  } = useDrawingStore();

  const { setDrawingTitle } = useCategoryStore();

  if (!isOpen) return null;

  const hasExistingDrawing = !!currentDrawing && (backgroundSheets.length > 0 || !!currentDrawing.imagePath);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("이미지 파일(PNG, JPG, WEBP)만 선택할 수 있습니다.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const preview: ImageFilePreview = {
          file,
          previewUrl: dataUrl,
          width: img.width,
          height: img.height,
          sizeKb: Math.round(file.size / 1024),
        };
        setSelectedImage(preview);
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        setSheetTitle(nameWithoutExt);

        // 기존 도면이 있으면 기본적으로 우측 이어붙이기를 추천
        if (hasExistingDrawing) {
          setPlacementMode("appendRight");
        } else {
          setPlacementMode("new");
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleConfirm = () => {
    if (!selectedImage) return;

    const title = sheetTitle.trim() || selectedImage.file.name.replace(/\.[^/.]+$/, "");

    // 1. 새 도면으로 열기
    if (placementMode === "new" || !hasExistingDrawing) {
      const newSheet: BackgroundSheet = {
        id: "sheet_1",
        title: `${title} (시트 1)`,
        imagePath: selectedImage.previewUrl,
        x: 0,
        y: 0,
        width: selectedImage.width,
        height: selectedImage.height,
        rotation: 0,
        flipX: false,
        flipY: false,
        opacity: 1.0,
        locked: false,
      };

      const newDwg: Drawing = {
        id: "dwg_" + Math.random().toString(36).substring(2, 9),
        projectId: "proj_default",
        number: `DWG-${Math.floor(10 + Math.random() * 90)}`,
        title,
        type: "electrical",
        imagePath: selectedImage.previewUrl,
        originalWidth: selectedImage.width,
        originalHeight: selectedImage.height,
        backgroundSheets: [newSheet],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      addDrawing(newDwg);
      setCurrentDrawing(newDwg);
      setDrawingTitle(title);
    }
    // 2. 기존 도면에 시트 이어붙이기 (우측 또는 하단)
    else {
      let currentSheets = [...backgroundSheets];
      // 기존 도면이 있는데 backgroundSheets가 비어있다면 Sheet 1을 먼저 등록
      if (currentSheets.length === 0 && currentDrawing?.imagePath) {
        currentSheets = [
          {
            id: "sheet_1",
            title: currentDrawing.title || "도면 시트 1",
            imagePath: currentDrawing.imagePath,
            x: 0,
            y: 0,
            width: currentDrawing.originalWidth || 1600,
            height: currentDrawing.originalHeight || 1200,
            rotation: 0,
            flipX: false,
            flipY: false,
            opacity: 1.0,
            locked: false,
          },
        ];
      }

      // 기존 시트들의 바운딩 영역 계산
      let targetX = 0;
      let targetY = 0;

      if (currentSheets.length > 0) {
        if (placementMode === "appendRight") {
          // 가장 우측 끝 지점 계산
          const maxRight = Math.max(
            ...currentSheets.map((s) => (s.x || 0) + (s.width || 1600))
          );
          targetX = maxRight + 40; // 40px 여백을 두고 우측에 도킹
          targetY = 0;
        } else if (placementMode === "appendBottom") {
          // 가장 하단 끝 지점 계산
          const maxBottom = Math.max(
            ...currentSheets.map((s) => (s.y || 0) + (s.height || 1200))
          );
          targetX = 0;
          targetY = maxBottom + 40; // 40px 여백을 두고 하단에 도킹
        }
      }

      const sheetNum = currentSheets.length + 1;
      const appendedSheet: BackgroundSheet = {
        id: `sheet_${Date.now()}`,
        title: `${title} (시트 ${sheetNum})`,
        imagePath: selectedImage.previewUrl,
        x: targetX,
        y: targetY,
        width: selectedImage.width,
        height: selectedImage.height,
        rotation: 0,
        flipX: false,
        flipY: false,
        opacity: 1.0,
        locked: false,
      };

      const finalSheets = [...currentSheets, appendedSheet];
      useDrawingStore.getState().setBackgroundSheets(finalSheets);
      useDrawingStore.getState().setActiveSheetId(appendedSheet.id);
      useDrawingStore.setState({ isBackgroundLocked: true });
    }

    onClose();
    setSelectedImage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-600/20 p-2 rounded-xl border border-indigo-500/30 text-indigo-400">
              <FileImage className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                도면 열기 및 시트 추가
              </h2>
              <p className="text-xs text-slate-400">
                도면 이미지를 불러오거나 기존 캔버스에 2번째 시트로 이어붙입니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* 1. 파일 업로드 드롭 영역 */}
          {!selectedImage ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition ${
                isDragging
                  ? "border-indigo-500 bg-indigo-600/10 text-indigo-300"
                  : "border-slate-700 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-950/60 text-slate-400"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 flex items-center justify-center text-indigo-400 mb-3 border border-indigo-500/30 shadow-lg">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-200 mb-1">
                도면 이미지 파일을 클릭하거나 드래그하여 놓으세요
              </p>
              <p className="text-xs text-slate-500">
                PNG, JPG, WEBP 고해상도 도면 파일 지원
              </p>
            </div>
          ) : (
            /* 2. 이미지 선택 완료 후 썸네일 미리보기 카드 */
            <div className="space-y-4">
              <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl flex gap-3.5 items-center">
                {/* 썸네일 */}
                <div className="w-28 h-20 bg-slate-900 rounded-lg overflow-hidden border border-slate-700/80 shrink-0 relative flex items-center justify-center group">
                  <img
                    src={selectedImage.previewUrl}
                    alt="미리보기"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[11px] bg-slate-800/90 text-white px-2 py-0.5 rounded border border-slate-600"
                    >
                      변경
                    </button>
                  </div>
                </div>

                {/* 메타데이터 정보 */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 truncate">
                      {selectedImage.file.name}
                    </span>
                    <button
                      onClick={() => setSelectedImage(null)}
                      className="text-xs text-rose-400 hover:underline cursor-pointer"
                    >
                      다시 선택
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-400 font-mono">
                    <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                      해상도: {selectedImage.width} × {selectedImage.height} px
                    </span>
                    <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                      용량: {selectedImage.sizeKb} KB
                    </span>
                  </div>
                </div>
              </div>

              {/* 도면 / 시트 이름 입력 */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  도면 / 시트 명칭
                </label>
                <input
                  type="text"
                  value={sheetTitle}
                  onChange={(e) => setSheetTitle(e.target.value)}
                  placeholder="예: 메인 배선도 Sheet 2"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 outline-none"
                />
              </div>

              {/* 불러오기 모드 선택 (단일 열기 vs 이어붙이기) */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  캔버스 배치 방식 선택
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* 옵션 1. 새 도면으로 열기 */}
                  <button
                    type="button"
                    onClick={() => setPlacementMode("new")}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-2 ${
                      placementMode === "new"
                        ? "bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-md"
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      {placementMode === "new" && (
                        <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-100">새 도면으로 시작</div>
                      <div className="text-[10px] text-slate-400">캔버스 초기화 후 단일 열기</div>
                    </div>
                  </button>

                  {/* 옵션 2. 우측(가로) 이어붙이기 */}
                  <button
                    type="button"
                    disabled={!hasExistingDrawing}
                    onClick={() => setPlacementMode("appendRight")}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-2 ${
                      !hasExistingDrawing
                        ? "opacity-40 cursor-not-allowed bg-slate-950/20 border-slate-900"
                        : placementMode === "appendRight"
                        ? "bg-emerald-600/20 border-emerald-500 text-emerald-200 shadow-md cursor-pointer"
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <ArrowRight className="w-4 h-4 text-emerald-400" />
                      {placementMode === "appendRight" && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-100">가로 이어붙이기</div>
                      <div className="text-[10px] text-slate-400">기존 도면 우측에 나란히 배치</div>
                    </div>
                  </button>

                  {/* 옵션 3. 하단(세로) 이어붙이기 */}
                  <button
                    type="button"
                    disabled={!hasExistingDrawing}
                    onClick={() => setPlacementMode("appendBottom")}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-2 ${
                      !hasExistingDrawing
                        ? "opacity-40 cursor-not-allowed bg-slate-950/20 border-slate-900"
                        : placementMode === "appendBottom"
                        ? "bg-sky-600/20 border-sky-500 text-sky-200 shadow-md cursor-pointer"
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <ArrowDown className="w-4 h-4 text-sky-400" />
                      {placementMode === "appendBottom" && (
                        <CheckCircle2 className="w-4 h-4 text-sky-400" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-100">세로 이어붙이기</div>
                      <div className="text-[10px] text-slate-400">기존 도면 아래쪽에 배치</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* 안내 메시지 */}
              {hasExistingDrawing && placementMode !== "new" && (
                <div className="bg-indigo-950/40 border border-indigo-800/60 p-2.5 rounded-xl text-[11px] text-indigo-300 flex items-center gap-2">
                  <Layers className="w-4 h-4 shrink-0 text-indigo-400" />
                  <span>
                    기존 도면과 객체는 안전하게 유지되며, 추가된 도면만 개별적으로 회전/반전/위치를 조절할 수 있습니다.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 모달 푸터 */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-800 bg-slate-900/80">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedImage}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>
              {placementMode === "new" ? "새 도면 열기" : "시트 추가하여 이어붙이기"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
