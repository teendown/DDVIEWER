import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Download, X, Image as ImageIcon, FileText, Package, Check, Sparkles } from "lucide-react";
import { exportService } from "../../services/exportService";
import { useCategoryStore } from "../../store/categoryStore";
import { useProjectStore } from "../../store/projectStore";
import { useDrawingStore } from "../../store/drawingStore";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const [exportType, setExportType] = useState<"png" | "jpg" | "pdf" | "cadproj">("png");
  const [isExporting, setIsExporting] = useState(false);

  const { selectedManufacturer, selectedModel, selectedSystemCategory, drawingTitle } = useCategoryStore();
  const { currentProject } = useProjectStore();
  const { objects, currentDrawing } = useDrawingStore();

  if (!isOpen) return null;

  const cleanFilename = `[${selectedManufacturer || "제조사"}]_${selectedModel || "기종"}_${drawingTitle || "도면분석"}`;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // 캔버스 엘리먼트 탐색
      const canvasEl = document.querySelector("canvas") as HTMLCanvasElement;

      if (exportType === "png") {
        if (!canvasEl) throw new Error("캔버스를 찾을 수 없습니다.");
        await exportService.exportMergedImage(canvasEl, cleanFilename, "image/png", 1.0, selectedManufacturer, selectedModel);
      } else if (exportType === "jpg") {
        if (!canvasEl) throw new Error("캔버스를 찾을 수 없습니다.");
        await exportService.exportMergedImage(canvasEl, cleanFilename, "image/jpeg", 0.95, selectedManufacturer, selectedModel);
      } else if (exportType === "pdf") {
        if (!canvasEl) throw new Error("캔버스를 찾을 수 없습니다.");
        const proj = currentProject || {
          id: "proj_default",
          name: cleanFilename,
          manufacturer: selectedManufacturer,
          model: selectedModel,
          systemCategory: selectedSystemCategory,
          drawingTitle,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          schemaVersion: 1,
          appVersion: "1.0.0",
        };
        await exportService.exportPdfReport(canvasEl, proj, objects.length);
      } else if (exportType === "cadproj") {
        const proj = currentProject || {
          id: `proj_${Date.now()}`,
          name: cleanFilename,
          manufacturer: selectedManufacturer,
          model: selectedModel,
          systemCategory: selectedSystemCategory,
          drawingTitle,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          schemaVersion: 1,
          appVersion: "1.0.0",
        };
        await exportService.exportProjectPackage(proj, objects, currentDrawing?.imagePath);
      }

      onClose();
    } catch (e: any) {
      alert("내보내기 실패: " + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-white space-y-5 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">작업물 내보내기 (Export)</h3>
              <p className="text-[11px] text-slate-400">고해상도 이미지, PDF 보고서 및 프로젝트 패키지</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 내보내기 포맷 옵션 카드 */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* 1. PNG */}
          <div
            onClick={() => setExportType("png")}
            className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
              exportType === "png"
                ? "bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                : "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <ImageIcon className="w-5 h-5 text-indigo-400" />
              {exportType === "png" && <Check className="w-4 h-4 text-indigo-400" />}
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-100">고해상도 PNG</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">투명도 및 무손실 화질 합성</p>
            </div>
          </div>

          {/* 2. JPG */}
          <div
            onClick={() => setExportType("jpg")}
            className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
              exportType === "jpg"
                ? "bg-amber-600/20 border-amber-500 text-white shadow-lg shadow-amber-600/20"
                : "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <ImageIcon className="w-5 h-5 text-amber-400" />
              {exportType === "jpg" && <Check className="w-4 h-4 text-amber-400" />}
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-100">JPEG 압축 이미지</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">문서 삽입 및 이메일 전송용</p>
            </div>
          </div>

          {/* 3. PDF */}
          <div
            onClick={() => setExportType("pdf")}
            className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
              exportType === "pdf"
                ? "bg-emerald-600/20 border-emerald-500 text-white shadow-lg shadow-emerald-600/20"
                : "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              {exportType === "pdf" && <Check className="w-4 h-4 text-emerald-400" />}
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-100">PDF 분석 보고서</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">A3/A4 규격 + 메타데이터 헤더</p>
            </div>
          </div>

          {/* 4. .cadproj 패키지 */}
          <div
            onClick={() => setExportType("cadproj")}
            className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
              exportType === "cadproj"
                ? "bg-purple-600/20 border-purple-500 text-white shadow-lg shadow-purple-600/20"
                : "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Package className="w-5 h-5 text-purple-400" />
              {exportType === "cadproj" && <Check className="w-4 h-4 text-purple-400" />}
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-100">.cadproj 프로젝트</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">다른 PC/태블릿 연동 패키지</p>
            </div>
          </div>
        </div>

        {/* 파일명 미리보기 */}
        <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1 text-xs">
          <span className="text-[11px] text-slate-400 font-medium">출력 파일명</span>
          <div className="text-slate-200 font-mono truncate font-semibold">
            {cleanFilename}.{exportType === "cadproj" ? "cadproj" : exportType}
          </div>
        </div>

        {/* 하단 액션 */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>원본 도면 비파괴 렌더링</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
            >
              취소
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition cursor-pointer shadow-lg shadow-indigo-600/30 flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? "내보내는 중..." : "다운로드"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
