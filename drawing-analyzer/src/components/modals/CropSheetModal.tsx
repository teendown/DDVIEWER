import React, { useState, useEffect } from "react";
import { X, Crop, RotateCcw, Check } from "lucide-react";
import { useDrawingStore } from "../../store/drawingStore";
import type { BackgroundSheet } from "../../types";

interface CropSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: BackgroundSheet | null;
}

export const CropSheetModal: React.FC<CropSheetModalProps> = ({
  isOpen,
  onClose,
  sheet,
}) => {
  const { cropSheet } = useDrawingStore();

  // 상/하/좌/우 잘라낼 픽셀 수치
  const [cropTop, setCropTop] = useState(0);
  const [cropBottom, setCropBottom] = useState(0);
  const [cropLeft, setCropLeft] = useState(0);
  const [cropRight, setCropRight] = useState(0);

  const origW = sheet?.width || 1600;
  const origH = sheet?.height || 1200;

  useEffect(() => {
    if (sheet) {
      if (sheet.crop) {
        setCropLeft(sheet.crop.x);
        setCropTop(sheet.crop.y);
        setCropRight(Math.max(0, origW - (sheet.crop.x + sheet.crop.width)));
        setCropBottom(Math.max(0, origH - (sheet.crop.y + sheet.crop.height)));
      } else {
        setCropTop(0);
        setCropBottom(0);
        setCropLeft(0);
        setCropRight(0);
      }
    }
  }, [sheet, origW, origH, isOpen]);

  if (!isOpen || !sheet) return null;

  const croppedW = Math.max(20, origW - cropLeft - cropRight);
  const croppedH = Math.max(20, origH - cropTop - cropBottom);

  const handleApply = () => {
    if (cropTop === 0 && cropBottom === 0 && cropLeft === 0 && cropRight === 0) {
      cropSheet(sheet.id, undefined);
    } else {
      cropSheet(sheet.id, {
        x: cropLeft,
        y: cropTop,
        width: croppedW,
        height: croppedH,
      });
    }
    onClose();
  };

  const handleReset = () => {
    setCropTop(0);
    setCropBottom(0);
    setCropLeft(0);
    setCropRight(0);
    cropSheet(sheet.id, undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="bg-sky-600/20 p-2 rounded-xl border border-sky-500/30 text-sky-400">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                도면 자르기 / 불필요 영역 제거 (Crop)
              </h2>
              <p className="text-[11px] text-slate-400">
                {sheet.title}의 여백이나 불필요한 테두리를 잘라내어 다른 도면과 매끄럽게 이어붙입니다.
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
          {/* 이미지 크롭 시각적 미리보기 영역 */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center relative min-h-[220px]">
            <div className="relative border border-slate-700 max-w-full max-h-[260px] overflow-hidden rounded-lg bg-slate-900 flex items-center justify-center">
              <img
                src={sheet.imagePath}
                alt="도면 원본"
                className="max-h-[260px] object-contain opacity-40 select-none pointer-events-none"
              />

              {/* 잘려나갈 영역 어둡게 딤드 처리 & 보존 영역 하이라이트 박스 */}
              <div
                className="absolute border-2 border-sky-400 bg-sky-500/20 shadow-2xl transition-all"
                style={{
                  left: `${(cropLeft / origW) * 100}%`,
                  top: `${(cropTop / origH) * 100}%`,
                  right: `${(cropRight / origW) * 100}%`,
                  bottom: `${(cropBottom / origH) * 100}%`,
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[10px] bg-slate-900/90 text-sky-300 font-mono px-2 py-0.5 rounded border border-sky-500/40">
                    유지 영역: {croppedW} × {croppedH} px
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4방향 여백 자르기 슬라이더 컨트롤러 */}
          <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-xs">
            {/* 1. 좌측 자르기 */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>◀ 좌측 자르기</span>
                <span className="font-mono text-sky-400 font-bold">{cropLeft} px</span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.max(0, origW - cropRight - 50)}
                step="5"
                value={cropLeft}
                onChange={(e) => setCropLeft(parseInt(e.target.value, 10) || 0)}
                className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* 2. 우측 자르기 */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>우측 자르기 ▶</span>
                <span className="font-mono text-sky-400 font-bold">{cropRight} px</span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.max(0, origW - cropLeft - 50)}
                step="5"
                value={cropRight}
                onChange={(e) => setCropRight(parseInt(e.target.value, 10) || 0)}
                className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* 3. 상단 자르기 */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>▲ 상단 자르기</span>
                <span className="font-mono text-sky-400 font-bold">{cropTop} px</span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.max(0, origH - cropBottom - 50)}
                step="5"
                value={cropTop}
                onChange={(e) => setCropTop(parseInt(e.target.value, 10) || 0)}
                className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* 4. 하단 자르기 */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>▼ 하단 자르기</span>
                <span className="font-mono text-sky-400 font-bold">{cropBottom} px</span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.max(0, origH - cropTop - 50)}
                step="5"
                value={cropBottom}
                onChange={(e) => setCropBottom(parseInt(e.target.value, 10) || 0)}
                className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-800 bg-slate-900/80">
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 px-3 py-1.5 rounded-lg transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>원래대로 복원</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            >
              취소
            </button>
            <button
              onClick={handleApply}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-600/30 transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>자르기 적용</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
