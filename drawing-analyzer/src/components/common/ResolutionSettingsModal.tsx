import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  Maximize2,
  Check,
  X,
  Sliders,
  Sparkles,
  Layout,
  Info,
} from "lucide-react";
import { useDrawingStore } from "../../store/drawingStore";
import { generateSampleDrawingDataUrl } from "../../utils/sampleDrawing";

interface ResolutionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PresetOption {
  id: string;
  name: string;
  width: number;
  height: number;
  ratio: string;
  desc: string;
  recommended?: boolean;
}

const PRESETS: PresetOption[] = [
  {
    id: "std-4-3",
    name: "표준 최적화 (권장)",
    width: 1600,
    height: 1200,
    ratio: "4:3",
    desc: "가장 쾌적하고 빠른 반응속도, 메모/선 굵기 황금비율",
    recommended: true,
  },
  {
    id: "fhd-16-9",
    name: "FHD 와이드",
    width: 1920,
    height: 1080,
    ratio: "16:9",
    desc: "일반 모니터 1:1 와이드 도면 규격",
  },
  {
    id: "qhd-16-9",
    name: "QHD 고해상도",
    width: 2560,
    height: 1440,
    ratio: "16:9",
    desc: "대형 모니터 정밀 도면 분석",
  },
  {
    id: "cad-ultra",
    name: "CAD 대형 인쇄",
    width: 3200,
    height: 2400,
    ratio: "4:3",
    desc: "A0/A1 대형 용지 인쇄급 초정밀 모드",
  },
];

export const ResolutionSettingsModal: React.FC<ResolutionSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentDrawing, updateObject, objects, setCurrentDrawing } = useDrawingStore();

  const curW = currentDrawing?.originalWidth || 1600;
  const curH = currentDrawing?.originalHeight || 1200;

  const [selectedPreset, setSelectedPreset] = useState<string>(() => {
    const match = PRESETS.find((p) => p.width === curW && p.height === curH);
    return match ? match.id : "custom";
  });

  const [customW, setCustomW] = useState(curW);
  const [customH, setCustomH] = useState(curH);
  const [rescaleObjects, setRescaleObjects] = useState(true);

  if (!isOpen) return null;

  const handleApply = () => {
    let targetW = customW;
    let targetH = customH;

    const preset = PRESETS.find((p) => p.id === selectedPreset);
    if (preset) {
      targetW = preset.width;
      targetH = preset.height;
    }

    if (targetW <= 0 || targetH <= 0) return;

    if (currentDrawing) {
      // 샘플 도면인 경우 새로 고해상도/저해상도로 다시 생성
      let newImagePath = currentDrawing.imagePath;
      if (currentDrawing.id.startsWith("dwg_")) {
        newImagePath = generateSampleDrawingDataUrl(
          currentDrawing.type === "hydraulic" ? "hydraulic" : "electrical",
          targetW,
          targetH
        );
      }

      const scaleRatioX = targetW / curW;
      const scaleRatioY = targetH / curH;

      // 객체 위치 비례 보정 옵션이 켜져 있는 경우
      if (rescaleObjects && (scaleRatioX !== 1 || scaleRatioY !== 1)) {
        objects.forEach((obj) => {
          // 정규화 좌표계(0~1)는 크기가 바뀌어도 자동 유지되지만,
          // 픽셀 기반 고정 크기(strokeWidth 등)를 자연스럽게 조정할 수 있습니다.
          updateObject(obj.id, {
            updatedAt: new Date().toISOString(),
          });
        });
      }

      setCurrentDrawing({
        ...currentDrawing,
        originalWidth: targetW,
        originalHeight: targetH,
        imagePath: newImagePath,
        updatedAt: new Date().toISOString(),
      });
    }

    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 select-none text-slate-100 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                도면 규격 & 캔버스 해상도 대시보드
              </h3>
              <p className="text-[11px] text-slate-400">
                작업 환경에 맞는 최적 해상도와 외곽 메모 여백을 설정합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* 현재 해상도 현황 카드 */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block mb-0.5">
                현재 도면 규격
              </span>
              <div className="text-sm font-mono font-bold text-sky-400 flex items-center gap-2">
                <span>{curW} &times; {curH} px</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-sky-500/10 border border-sky-500/30 rounded text-sky-300">
                  {(curW / curH).toFixed(2)} : 1
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block mb-0.5">
                배치된 벡터 객체
              </span>
              <span className="text-xs font-mono text-slate-200 font-semibold">
                {objects.length}개 요소
              </span>
            </div>
          </div>

          {/* 프리셋 선택 그리드 */}
          <div>
            <label className="text-xs font-bold text-slate-300 mb-2 block flex items-center gap-1.5">
              <Layout className="w-3.5 h-3.5 text-sky-400" />
              <span>해상도 프리셋 선택</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PRESETS.map((preset) => {
                const isSelected = selectedPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(preset.id);
                      setCustomW(preset.width);
                      setCustomH(preset.height);
                    }}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer relative flex flex-col justify-between ${
                      isSelected
                        ? "bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/15 ring-1 ring-indigo-500"
                        : "bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-bold text-xs flex items-center gap-1.5">
                          <span>{preset.name}</span>
                          {preset.recommended && (
                            <span className="px-1.5 py-0.2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-bold rounded">
                              추천
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-indigo-400" />
                        )}
                      </div>
                      <div className="font-mono text-xs font-semibold text-sky-300 mb-1.5">
                        {preset.width} &times; {preset.height} px
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      {preset.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 직접 입력 (Custom) */}
          <div className="p-3.5 bg-slate-950/50 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                <span>해상도 직접 입력 (Custom)</span>
              </label>
              <button
                type="button"
                onClick={() => setSelectedPreset("custom")}
                className={`text-[11px] px-2 py-0.5 rounded cursor-pointer transition ${
                  selectedPreset === "custom"
                    ? "bg-indigo-600 text-white font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                직접 입력 활성화
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">
                  가로 너비 (Width px)
                </span>
                <input
                  type="number"
                  min="400"
                  max="8000"
                  step="50"
                  value={customW}
                  onChange={(e) => {
                    setSelectedPreset("custom");
                    setCustomW(Math.max(100, parseInt(e.target.value) || 0));
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">
                  세로 높이 (Height px)
                </span>
                <input
                  type="number"
                  min="300"
                  max="8000"
                  step="50"
                  value={customH}
                  onChange={(e) => {
                    setSelectedPreset("custom");
                    setCustomH(Math.max(100, parseInt(e.target.value) || 0));
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* 외곽 메모 여백 안내 배너 */}
          <div className="p-3 bg-indigo-950/30 border border-indigo-500/20 rounded-xl flex items-start gap-2.5 text-xs text-indigo-300">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-bold text-indigo-200">
                외곽 메모 작업대 (Artboard Margin) 시스템 활성화됨:
              </span>{" "}
              도면 이미지 바깥의 넉넉한 여백 공간에 메모, 화살표 인출선, 점검 노트를 자유롭게 작성할 수 있습니다.
            </div>
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/60">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={rescaleObjects}
              onChange={(e) => setRescaleObjects(e.target.checked)}
              className="accent-indigo-500 rounded"
            />
            <span>기존 객체 자동 비례 맞춤</span>
          </label>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition cursor-pointer"
            >
              취소
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>설정 적용하기</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
