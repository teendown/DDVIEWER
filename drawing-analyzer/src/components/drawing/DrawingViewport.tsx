import React, { useRef, useCallback, useEffect } from "react";
import type { Canvas as FabricCanvas } from "fabric";
import { DrawingCanvas } from "./DrawingCanvas";
import { SmartConnectorModal } from "../connector/SmartConnectorModal";
import { useDrawingStore } from "../../store/drawingStore";
import { useProjectStore } from "../../store/projectStore";
import { generateSampleDrawingDataUrl } from "../../utils/sampleDrawing";
import {
  UploadCloud,
  Sparkles,
  FileText,
  Image as ImageIcon,
  RotateCw,
  RotateCcw,
  Maximize,
  ZoomIn,
  ZoomOut,
  Compass,
} from "lucide-react";
import type { Drawing } from "../../types";

interface DrawingViewportProps {
  onUploadClick: () => void;
}

export const DrawingViewport: React.FC<DrawingViewportProps> = ({ onUploadClick }) => {
  const canvasInstanceRef = useRef<FabricCanvas | null>(null);
  const {
    currentDrawing,
    zoom,
    viewportRotation,
    setZoom,
    setPan,
    setViewportRotation,
    addDrawing,
    setCurrentDrawing,
  } = useDrawingStore();
  const { currentProject } = useProjectStore();

  const handleCanvasReady = useCallback((canvas: FabricCanvas) => {
    canvasInstanceRef.current = canvas;
  }, []);

  // 화면 맞춤 (Fit to Screen - 회전 각도 완벽 반영)
  const handleFitScreen = useCallback(() => {
    const canvas = canvasInstanceRef.current;
    if (!canvas || !currentDrawing) return;

    const containerW = canvas.getWidth();
    const containerH = canvas.getHeight();
    const imgW = currentDrawing.originalWidth || 1600;
    const imgH = currentDrawing.originalHeight || 1200;
    const rot = useDrawingStore.getState().viewportRotation || 0;
    const isSideways = rot === 90 || rot === 270;

    const effectiveW = isSideways ? imgH : imgW;
    const effectiveH = isSideways ? imgW : imgH;

    // 패딩 여유를 두고 비율 계산
    const scaleX = (containerW - 80) / effectiveW;
    const scaleY = (containerH - 80) / effectiveH;
    const fitZoom = Math.min(scaleX, scaleY, 1.0);

    const rad = (rot * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const a = fitZoom * cos;
    const b = fitZoom * sin;
    const c = -fitZoom * sin;
    const d = fitZoom * cos;

    const centerDwgX = imgW / 2;
    const centerDwgY = imgH / 2;
    const centerScreenX = containerW / 2;
    const centerScreenY = containerH / 2;

    const e = centerScreenX - (a * centerDwgX + c * centerDwgY);
    const f = centerScreenY - (b * centerDwgX + d * centerDwgY);

    canvas.setViewportTransform([a, b, c, d, e, f]);
    canvas.requestRenderAll();

    setZoom(fitZoom);
    setPan({ x: e, y: f });
  }, [currentDrawing, setZoom, setPan]);

  // 원본 크기 (100% - 회전 각도 반영)
  const handleActualSize = useCallback(() => {
    const canvas = canvasInstanceRef.current;
    if (!canvas || !currentDrawing) return;

    const containerW = canvas.getWidth();
    const containerH = canvas.getHeight();
    const imgW = currentDrawing.originalWidth || 1600;
    const imgH = currentDrawing.originalHeight || 1200;
    const rot = useDrawingStore.getState().viewportRotation || 0;

    const rad = (rot * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const a = 1.0 * cos;
    const b = 1.0 * sin;
    const c = -1.0 * sin;
    const d = 1.0 * cos;

    const centerDwgX = imgW / 2;
    const centerDwgY = imgH / 2;
    const centerScreenX = containerW / 2;
    const centerScreenY = containerH / 2;

    const e = centerScreenX - (a * centerDwgX + c * centerDwgY);
    const f = centerScreenY - (b * centerDwgX + d * centerDwgY);

    canvas.setViewportTransform([a, b, c, d, e, f]);
    canvas.requestRenderAll();

    setZoom(1.0);
    setPan({ x: e, y: f });
  }, [currentDrawing, setZoom, setPan]);

  // 뷰포트 중심 기준 회전 (+90° / -90°)
  const handleRotate = useCallback(
    (deltaDeg: number) => {
      const canvas = canvasInstanceRef.current;
      if (!canvas) return;

      const store = useDrawingStore.getState();
      const currentRot = store.viewportRotation || 0;
      const newRot = (((currentRot + deltaDeg) % 360) + 360) % 360;
      store.setViewportRotation(newRot);

      const containerW = canvas.getWidth();
      const containerH = canvas.getHeight();
      const px = containerW / 2;
      const py = containerH / 2;

      const vpt = canvas.viewportTransform;
      if (vpt) {
        const deltaRad = (deltaDeg * Math.PI) / 180;
        const cosD = Math.cos(deltaRad);
        const sinD = Math.sin(deltaRad);

        const [a, b, c, d, e, f] = vpt;

        const newA = cosD * a - sinD * b;
        const newB = sinD * a + cosD * b;
        const newC = cosD * c - sinD * d;
        const newD = sinD * c + cosD * d;
        const newE = px + (cosD * (e - px) - sinD * (f - py));
        const newF = py + (sinD * (e - px) + cosD * (f - py));

        canvas.setViewportTransform([newA, newB, newC, newD, newE, newF]);
        canvas.requestRenderAll();
        setPan({ x: newE, y: newF });
      }
    },
    [setPan]
  );

  // 회전 각도 0° 리셋
  const handleResetRotation = useCallback(() => {
    const store = useDrawingStore.getState();
    const currentRot = store.viewportRotation || 0;
    if (currentRot === 0) return;
    handleRotate(-currentRot);
  }, [handleRotate]);

  // 줌 조절 (화면 중심 기준)
  const handleZoom = useCallback(
    (factor: number) => {
      const canvas = canvasInstanceRef.current;
      if (!canvas) return;

      const currentZoom = useDrawingStore.getState().zoom || 1;
      let newZoom = Math.min(Math.max(currentZoom * factor, 0.1), 50.0);
      const k = newZoom / currentZoom;

      const px = canvas.getWidth() / 2;
      const py = canvas.getHeight() / 2;

      const vpt = canvas.viewportTransform;
      if (vpt) {
        vpt[0] *= k;
        vpt[1] *= k;
        vpt[2] *= k;
        vpt[3] *= k;
        vpt[4] = px + k * (vpt[4] - px);
        vpt[5] = py + k * (vpt[5] - py);
        canvas.setViewportTransform(vpt);
        canvas.requestRenderAll();
        setPan({ x: vpt[4], y: vpt[5] });
      }
      setZoom(newZoom);
    },
    [setZoom, setPan]
  );

  // 상단 헤더 툴바 및 글로벌 이벤트 리스너 연동
  useEffect(() => {
    const handleFit = () => handleFitScreen();
    const handleActual = () => handleActualSize();
    const handleZIn = () => handleZoom(1.25);
    const handleZOut = () => handleZoom(1 / 1.25);
    const handleRotCW = () => handleRotate(90);
    const handleRotCCW = () => handleRotate(-90);
    const handleResetRot = () => handleResetRotation();
    const handleResetAll = () => {
      setViewportRotation(0);
      handleFitScreen();
    };

    window.addEventListener("canvas:fit-screen", handleFit);
    window.addEventListener("canvas:actual-size", handleActual);
    window.addEventListener("canvas:zoom-in", handleZIn);
    window.addEventListener("canvas:zoom-out", handleZOut);
    window.addEventListener("canvas:rotate-cw", handleRotCW);
    window.addEventListener("canvas:rotate-ccw", handleRotCCW);
    window.addEventListener("canvas:reset-rotation", handleResetRot);
    window.addEventListener("canvas:reset-view", handleResetAll);

    return () => {
      window.removeEventListener("canvas:fit-screen", handleFit);
      window.removeEventListener("canvas:actual-size", handleActual);
      window.removeEventListener("canvas:zoom-in", handleZIn);
      window.removeEventListener("canvas:zoom-out", handleZOut);
      window.removeEventListener("canvas:rotate-cw", handleRotCW);
      window.removeEventListener("canvas:rotate-ccw", handleRotCCW);
      window.removeEventListener("canvas:reset-rotation", handleResetRot);
      window.removeEventListener("canvas:reset-view", handleResetAll);
    };
  }, [
    handleFitScreen,
    handleActualSize,
    handleRotate,
    handleResetRotation,
    handleZoom,
    setViewportRotation,
  ]);

  // 샘플 도면 불러오기
  const handleLoadSample = (type: "electrical" | "hydraulic") => {
    const dataUrl = generateSampleDrawingDataUrl(type);
    const newDrawing: Drawing = {
      id: "dwg_" + Math.random().toString(36).substring(2, 9),
      projectId: currentProject?.id || "proj_default",
      number: type === "electrical" ? "SCH-02" : "HYD-01",
      title:
        type === "electrical"
          ? "시동 및 점화 전장 회로도"
          : "파일럿 밸브 유압 회로도",
      type,
      imagePath: dataUrl,
      originalWidth: 1600,
      originalHeight: 1200,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addDrawing(newDrawing);
    setCurrentDrawing(newDrawing);
  };

  return (
    <div className="relative flex-1 w-full h-full bg-slate-950 overflow-hidden select-none">
      {currentDrawing ? (
        <>
          <DrawingCanvas onCanvasReady={handleCanvasReady} />
          <SmartConnectorModal />

          {/* 하단 우측 플로팅 CAD 뷰포트 HUD 바 */}
          <div className="absolute bottom-4 right-4 flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-2xl rounded-2xl p-1.5 gap-1.5 z-20 text-xs text-slate-300">
            {/* 1. 캔버스 회전 컨트롤 그룹 */}
            <div className="flex items-center gap-1 pr-1 border-r border-slate-800">
              <button
                onClick={() => handleRotate(-90)}
                className="p-1.5 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
                title="90° 반시계방향 회전 (Ctrl+[)"
              >
                <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
              </button>

              <button
                onClick={handleResetRotation}
                className={`flex items-center gap-1 px-2 py-1 rounded-xl font-mono text-[11px] font-bold transition cursor-pointer ${
                  viewportRotation !== 0
                    ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
                title="클릭하여 각도 초기화 (0°)"
              >
                <Compass className="w-3 h-3 text-sky-400" />
                <span>{viewportRotation}°</span>
              </button>

              <button
                onClick={() => handleRotate(90)}
                className="p-1.5 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
                title="90° 시계방향 회전 (Ctrl+])"
              >
                <RotateCw className="w-3.5 h-3.5 text-sky-400" />
              </button>
            </div>

            {/* 2. 줌 및 화면 맞춤 그룹 */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleZoom(1 / 1.25)}
                className="p-1.5 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
                title="축소"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleActualSize}
                className="px-2 py-1 font-mono text-[11px] font-bold text-sky-400 hover:bg-slate-800 rounded-xl transition cursor-pointer"
                title="100% 원본 크기"
              >
                {Math.round(zoom * 100)}%
              </button>

              <button
                onClick={() => handleZoom(1.25)}
                className="p-1.5 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
                title="확대"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleFitScreen}
                className="p-1.5 hover:text-white hover:bg-slate-800 rounded-xl text-sky-400 transition cursor-pointer"
                title="화면 맞춤"
              >
                <Maximize className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      ) : (
        /* 도면이 없을 때: 깨끗한 빈 페이지 업로드 존 */
        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-8">
          <div className="max-w-xl w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-10 flex flex-col items-center text-center shadow-2xl backdrop-blur-xl">
            <div className="w-20 h-20 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-6 shadow-inner text-sky-400">
              <ImageIcon className="w-10 h-10" />
            </div>

            <h2 className="text-2xl font-bold text-slate-100 mb-2">
              도면 이미지를 불러오세요
            </h2>
            <p className="text-sm text-slate-400 mb-8 max-w-md leading-relaxed">
              분석할 중장비 전기 배선도 또는 유압 회로도 파일을 선택하거나, 화면으로 드래그 앤 드롭하세요.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
              <button
                onClick={onUploadClick}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-sky-500/25 transition cursor-pointer"
              >
                <UploadCloud className="w-5 h-5" />
                도면 파일 선택 (JPG / PNG / PDF)
              </button>

              <button
                onClick={() => handleLoadSample("electrical")}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-sky-300 font-medium text-sm rounded-xl border border-slate-700 transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-sky-400" />
                샘플 회로도 열기
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-center gap-6 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" /> 고해상도 이미지 지원
              </span>
              <span>&bull;</span>
              <span>최대 5000% 무손실 줌</span>
              <span>&bull;</span>
              <span>완전 오프라인 저장</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
