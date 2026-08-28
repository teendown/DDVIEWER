import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { FolderOpen, X, Search, Trash2, Calendar, User, FileText, Upload, RefreshCw } from "lucide-react";
import { storageService } from "../../services/storageService";
import { exportService } from "../../services/exportService";
import { useCategoryStore } from "../../store/categoryStore";
import { useProjectStore } from "../../store/projectStore";
import { useDrawingStore } from "../../store/drawingStore";
import type { Project } from "../../types/project";

interface ProjectLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectLoadModal: React.FC<ProjectLoadModalProps> = ({ isOpen, onClose }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMaker, setFilterMaker] = useState("전체");
  const [filterCat, setFilterCat] = useState("전체");
  const [isLoading, setIsLoading] = useState(false);

  const { categories, setSelectedManufacturer, setSelectedModel, setSelectedSystemCategory, setDrawingTitle } = useCategoryStore();
  const { setCurrentProject } = useProjectStore();
  const { setObjects, setCurrentDrawing } = useDrawingStore();

  const loadList = async () => {
    setIsLoading(true);
    try {
      const list = await storageService.listProjects({
        manufacturer: filterMaker,
        systemCategory: filterCat,
        searchTerm,
      });
      setProjects(list);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadList();
    }
  }, [isOpen, filterMaker, filterCat, searchTerm]);

  if (!isOpen) return null;

  const handleOpenProject = async (proj: Project) => {
    try {
      const data = await storageService.loadProject(proj.id);
      if (!data) {
        alert("프로젝트 데이터를 찾을 수 없습니다.");
        return;
      }

      // 1. 프로젝트 및 분류 스토어 복원
      setCurrentProject(data.project);
      setSelectedManufacturer(data.project.manufacturer || "기타 제조사");
      setSelectedModel(data.project.model || "기본 기종");
      setSelectedSystemCategory(data.project.systemCategory || "일반");
      setDrawingTitle(data.project.drawingTitle || data.project.name);

      // 2. 도면 이미지 복원
      if (data.asset) {
        setCurrentDrawing({
          id: data.asset.id,
          projectId: data.project.id,
          title: data.asset.filename,
          type: "electrical",
          imagePath: data.asset.dataBlobOrUrl,
          originalWidth: data.asset.originalWidth,
          originalHeight: data.asset.originalHeight,
          createdAt: data.asset.createdAt,
          updatedAt: data.asset.createdAt,
        });
      }

      // 3. 주석 객체 복원
      setObjects(data.objects || []);

      onClose();
    } catch (e: any) {
      alert("프로젝트를 여는 중 오류가 발생했습니다: " + e.message);
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, projId: string) => {
    e.stopPropagation();
    if (!confirm("해당 프로젝트와 도면 데이터를 삭제하시겠습니까?")) return;
    try {
      await storageService.deleteProject(projId);
      await loadList();
    } catch (e: any) {
      alert("삭제 실패: " + e.message);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imported = await exportService.importProjectPackage(file);

      // IndexedDB에 저장 및 열기
      let assetData: any = undefined;
      if (imported.drawingImageDataUrl) {
        assetData = {
          filename: `${imported.project.drawingTitle || "drawing"}.png`,
          mimeType: "image/png",
          originalWidth: imported.project.originalWidth || 1600,
          originalHeight: imported.project.originalHeight || 1200,
          dataBlobOrUrl: imported.drawingImageDataUrl,
        };
      }

      const saved = await storageService.saveProject(imported.project, imported.objects, assetData);
      await handleOpenProject(saved);
    } catch (e: any) {
      alert("프로젝트 패키지 불러오기 실패: " + e.message);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-white space-y-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">저장된 도면 프로젝트 열기</h3>
              <p className="text-[11px] text-slate-400">제조사 / 기종 / 계통별 보관함</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* .cadproj 파일 불러오기 버튼 */}
            <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer flex items-center gap-1.5 border border-slate-700">
              <Upload className="w-3.5 h-3.5 text-indigo-400" />
              <span>.cadproj 파일 열기</span>
              <input type="file" accept=".cadproj,.zip" onChange={handleImportFile} className="hidden" />
            </label>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 검색 및 필터 바 */}
        <div className="grid grid-cols-3 gap-2 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="도면명 / 제조사 검색..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <select
            value={filterMaker}
            onChange={(e) => setFilterMaker(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 cursor-pointer"
          >
            <option value="전체">전체 제조사</option>
            {categories.manufacturers.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 cursor-pointer"
          >
            <option value="전체">전체 계통/부위</option>
            {categories.systemCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* 프로젝트 목록 */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[260px]">
          {isLoading ? (
            <div className="h-40 flex items-center justify-center text-slate-400 text-xs gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
              <span>프로젝트 목록 불러오는 중...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
              <FileText className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
              <span>저장된 도면 프로젝트가 없습니다.</span>
              <span className="text-[11px] text-slate-600 mt-1">상단 [저장] 버튼으로 현재 작업을 저장해 보세요.</span>
            </div>
          ) : (
            projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => handleOpenProject(proj)}
                className="group p-3.5 bg-slate-950/70 border border-slate-800/80 hover:border-indigo-500/60 rounded-xl transition cursor-pointer flex items-center justify-between gap-3 hover:bg-indigo-950/20"
              >
                <div className="space-y-1 truncate min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-[10px] font-bold rounded-md">
                      {proj.manufacturer || "기타"}
                    </span>
                    <span className="px-2 py-0.5 bg-amber-600/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold rounded-md">
                      {proj.model || "기본 기종"}
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-medium rounded-md">
                      {proj.systemCategory || "일반"}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-100 group-hover:text-indigo-200 truncate">
                    {proj.drawingTitle || proj.name}
                  </h4>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      {new Date(proj.updatedAt).toLocaleDateString("ko-KR")} {new Date(proj.updatedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {proj.author && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-500" />
                        {proj.author}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => handleDeleteProject(e, proj.id)}
                    title="프로젝트 삭제"
                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition cursor-pointer opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-md shadow-indigo-600/20">
                    열기
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
