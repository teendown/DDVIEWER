import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Save, X, CloudUpload, Plus, CheckCircle2 } from "lucide-react";
import { useCategoryStore } from "../../store/categoryStore";
import { useProjectStore } from "../../store/projectStore";
import { useDrawingStore } from "../../store/drawingStore";
import { storageService } from "../../services/storageService";
import { AddCategoryModal } from "./AddCategoryModal";
import type { Project } from "../../types/project";

interface ProjectSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectSaveModal: React.FC<ProjectSaveModalProps> = ({ isOpen, onClose }) => {
  const { categories, selectedManufacturer, selectedModel, selectedSystemCategory, drawingTitle, setSelectedManufacturer, setSelectedModel, setSelectedSystemCategory, setDrawingTitle } = useCategoryStore();
  const { currentProject, setCurrentProject } = useProjectStore();
  const { objects, currentDrawing } = useDrawingStore();

  const [author, setAuthor] = useState(currentProject?.author || "정비엔지니어");
  const [description, setDescription] = useState(currentProject?.description || "");
  const [syncServer, setSyncServer] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [addModalType, setAddModalType] = useState<"manufacturer" | "model" | "systemCategory" | null>(null);

  if (!isOpen) return null;

  const availableModels = categories.modelsByMaker[selectedManufacturer] || ["기본 기종"];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const projectId = currentProject?.id || `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const projectName = `[${selectedManufacturer}] ${selectedModel} - ${drawingTitle || "도면 분석"}`;

      const projectData: Project = {
        id: projectId,
        name: projectName,
        manufacturer: selectedManufacturer || "기타 제조사",
        model: selectedModel || "기본 기종",
        systemCategory: selectedSystemCategory || "일반",
        drawingTitle: drawingTitle || "무제 도면",
        author,
        description,
        schemaVersion: 1,
        appVersion: "1.0.0",
        createdAt: currentProject?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 원본 도면 에셋 메타데이터
      let assetData: any = undefined;
      if (currentDrawing?.imagePath) {
        assetData = {
          filename: currentDrawing.title || "drawing.png",
          mimeType: "image/png",
          originalWidth: currentDrawing.originalWidth || 1600,
          originalHeight: currentDrawing.originalHeight || 1200,
          dataBlobOrUrl: currentDrawing.imagePath,
        };
      }

      // 1. 로컬 IndexedDB에 비파괴 저장
      const saved = await storageService.saveProject(projectData, objects, assetData);
      setCurrentProject(saved);

      // 2. 서버 업로드 동기화 (옵션)
      if (syncServer) {
        await storageService.uploadToServer(saved, objects);
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1000);
    } catch (e: any) {
      alert("저장 중 오류가 발생했습니다: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
        <div
          className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-white space-y-5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                <Save className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">도면 분석 프로젝트 저장</h3>
                <p className="text-[11px] text-slate-400">제조사/기종/부위별 체계적인 분류 및 비파괴 보존</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 4단계 순차 캐스케이딩 분류 폼 */}
          <div className="space-y-4">
            {/* 1. 제조사 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  1. 제조사 (Manufacturer)
                </label>
                <button
                  type="button"
                  onClick={() => setAddModalType("manufacturer")}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 cursor-pointer font-medium"
                >
                  <Plus className="w-3 h-3" />
                  <span>새 제조사</span>
                </button>
              </div>
              <select
                value={selectedManufacturer}
                onChange={(e) => setSelectedManufacturer(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {categories.manufacturers.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. 기종 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  2. 기종/모델 (Model)
                </label>
                <button
                  type="button"
                  onClick={() => setAddModalType("model")}
                  className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-0.5 cursor-pointer font-medium"
                >
                  <Plus className="w-3 h-3" />
                  <span>새 기종</span>
                </button>
              </div>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {availableModels.map((mod) => (
                  <option key={mod} value={mod}>
                    {mod}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. 계통 / 부위 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  3. 계통/부위 (System Category)
                </label>
                <button
                  type="button"
                  onClick={() => setAddModalType("systemCategory")}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 cursor-pointer font-medium"
                >
                  <Plus className="w-3 h-3" />
                  <span>새 계통</span>
                </button>
              </div>
              <select
                value={selectedSystemCategory}
                onChange={(e) => setSelectedSystemCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {categories.systemCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. 도면명 */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                4. 도면/작업명 (Drawing Title)
              </label>
              <input
                type="text"
                value={drawingTitle}
                onChange={(e) => setDrawingTitle(e.target.value)}
                placeholder="예: 메인 시동 배선도, 파일럿 유압 밸브 블록 등"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* 작업자 & 메모 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">작업자</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">작업 메모</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="특이사항 메모"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200"
                />
              </div>
            </div>

            {/* 서버 동기화 체크박스 */}
            <label className="flex items-center gap-2 p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-950">
              <input
                type="checkbox"
                checked={syncServer}
                onChange={(e) => setSyncServer(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded bg-slate-900 border-slate-700"
              />
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <CloudUpload className="w-4 h-4 text-indigo-400" />
                <span>원격 서버 및 클라우드 동기화 패키지 전송</span>
              </div>
            </label>
          </div>

          {/* 하단 액션 버튼 */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <span className="text-[11px] text-slate-400">
              총 <strong className="text-indigo-300">{objects.length}개</strong>의 주석 요소가 비파괴 보존됩니다.
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
              >
                닫기
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || saveSuccess}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 rounded-xl transition cursor-pointer shadow-lg shadow-indigo-600/30 flex items-center gap-1.5"
              >
                {saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>저장 완료!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? "저장 중..." : "작업물 저장"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 새 분류 추가 팝업 모달 */}
      {addModalType && (
        <AddCategoryModal
          isOpen={true}
          onClose={() => setAddModalType(null)}
          type={addModalType}
        />
      )}
    </>,
    document.body
  );
};
