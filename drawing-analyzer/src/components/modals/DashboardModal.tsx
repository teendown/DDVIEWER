import React, { useState, useEffect } from "react";
import {
  X,
  LayoutDashboard,
  FolderPlus,
  FolderOpen,
  Sparkles,
  Cpu,
  Share2,
  Building,
  ChevronRight,
  TrendingUp,
  Trash2,
  Search,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Zap,
} from "lucide-react";
import { useDrawingStore } from "../../store/drawingStore";
import { useProjectStore } from "../../store/projectStore";
import { useUserStore } from "../../store/userStore";
import { useUIStore } from "../../store/uiStore";
import { storageService } from "../../services/storageService";
import { generateSampleDrawingDataUrl } from "../../utils/sampleDrawing";
import type { Project } from "../../types/project";
import type { Drawing } from "../../types/drawing";

interface DashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewDrawing: () => void;
  onOpenLoadProject: () => void;
}

export const DashboardModal: React.FC<DashboardModalProps> = ({
  isOpen,
  onClose,
  onOpenNewDrawing,
  onOpenLoadProject,
}) => {
  const { objects, setObjects, setCurrentDrawing, currentDrawing } = useDrawingStore();
  const { projects, setProjects, setCurrentProject } = useProjectStore();
  const { currentUser } = useUserStore();
  const { setAuthModalOpen } = useUIStore();

  const [searchQuery, setSearchQuery] = useState("");

  // 프로젝트 목록 로드
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
        const storedProjects = await storageService.listProjects();
        setProjects(storedProjects);
      } catch (e) {
        console.error("Failed to load dashboard data:", e);
      }
    };

    loadData();
  }, [isOpen, setProjects]);

  if (!isOpen) return null;

  // 샘플 도면 불러오기
  const handleLoadSample = () => {
    const origW = currentDrawing?.originalWidth || 1600;
    const origH = currentDrawing?.originalHeight || 1200;
    const dataUrl = generateSampleDrawingDataUrl("electrical", origW, origH);
    const defaultDwg: Drawing = {
      id: "dwg_sample_" + Math.random().toString(36).substring(2, 7),
      projectId: "proj_sample",
      number: "SCH-EC60E",
      title: "시동 및 점화 전장 회로도 (EC60E)",
      type: "electrical",
      imagePath: dataUrl,
      originalWidth: origW,
      originalHeight: origH,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCurrentDrawing(defaultDwg);
    setObjects([]);
    onClose();
  };

  // 프로젝트 열기
  const handleOpenProject = async (project: Project) => {
    try {
      const data = await storageService.loadProject(project.id);
      if (data) {
        setCurrentProject(data.project);
        setObjects(data.objects);
        if (data.asset?.dataBlobOrUrl) {
          setCurrentDrawing({
            id: project.id,
            projectId: project.id,
            type: "electrical",
            imagePath: data.asset.dataBlobOrUrl,
            originalWidth: data.asset.originalWidth || 1600,
            originalHeight: data.asset.originalHeight || 1200,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
          });
        }
        onClose();
      }
    } catch (e) {
      console.error("Failed to load project:", e);
      alert("프로젝트를 불러오는데 실패했습니다.");
    }
  };

  // 프로젝트 삭제
  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!confirm("정말 이 프로젝트를 삭제하시겠습니까?")) return;
    try {
      await storageService.deleteProject(projectId);
      const updated = await storageService.listProjects();
      setProjects(updated);
    } catch (e) {
      console.error("Failed to delete project:", e);
    }
  };

  // 필터링된 프로젝트 목록
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      (p.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.manufacturer || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.model || "").toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  // 제조사별 프로젝트 통계 계산
  const manufacturerCounts = projects.reduce<Record<string, number>>((acc, p) => {
    const maker = p.manufacturer || "기타 제조사";
    acc[maker] = (acc[maker] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-6xl h-[90vh] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* 상단 헤더 바 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-white tracking-tight">
                  스마트 도면 분석 허브 대시보드
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                  V2.5 CAD HUB
                </span>
              </div>
              <p className="text-xs text-slate-400">
                중장비/산업 회로도 분석 프로젝트 및 작업자 통합 관리 센터
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 현재 사용자 프로필 버튼 */}
            {currentUser && (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition cursor-pointer text-left"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-sm shrink-0"
                  style={{ backgroundColor: currentUser.avatarColor }}
                >
                  {currentUser.name.slice(0, 1)}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-bold text-slate-200">{currentUser.name}</div>
                  <div className="text-[10px] text-slate-400">{currentUser.department}</div>
                </div>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              title="닫기 (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 대시보드 본문 스크롤 영역 */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6">
          {/* 1. 작업자 환영 카드 & 핵심 KPI 통계 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 사용자 환영 카드 */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/30 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center justify-between text-indigo-400 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    Engineer Profile
                  </span>
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-lg font-extrabold text-white">
                  {currentUser?.name || "엔지니어"} 님
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {currentUser?.department || "전장기술팀"} · {currentUser?.role?.toUpperCase() || "ADMIN"}
                </div>
              </div>
              <button
                onClick={() => setAuthModalOpen(true)}
                className="mt-3 w-full py-1.5 text-xs font-semibold text-indigo-300 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-xl transition cursor-pointer text-center"
              >
                작업자 전환 / 프로필
              </button>
            </div>

            {/* 통계 카드 1: 저장된 프로젝트 */}
            <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400">보관된 프로젝트</div>
                <div className="text-xl font-black text-white">{projects.length} <span className="text-xs font-normal text-slate-500">개</span></div>
                <div className="text-[10px] text-sky-400 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                  로컬 DB 동기화 완료
                </div>
              </div>
            </div>

            {/* 통계 카드 2: 현재 분석 부품 수 */}
            <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400">분석 중인 부품(노드)</div>
                <div className="text-xl font-black text-white">{objects.filter((o) => o.type === "component" || o.type === "rectangle").length} <span className="text-xs font-normal text-slate-500">개</span></div>
                <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                  <Zap className="w-3 h-3" />
                  스마트 객체 바인딩
                </div>
              </div>
            </div>

            {/* 통계 카드 3: 스마트 연결선 */}
            <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400">스마트 배선망(와이어)</div>
                <div className="text-xl font-black text-white">{objects.filter((o) => o.type === "connector" || o.type === "wire").length} <span className="text-xs font-normal text-slate-500">개</span></div>
                <div className="text-[10px] text-purple-400 flex items-center gap-1 mt-0.5">
                  <TrendingUp className="w-3 h-3" />
                  동적 배선 추적 중
                </div>
              </div>
            </div>
          </div>

          {/* 2. 빠른 시작 (Quick Actions) 섹션 */}
          <div>
            <div className="text-xs font-bold text-slate-400 mb-2.5 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              빠른 작업 (Quick Actions)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 새 도면 업로드 */}
              <button
                onClick={() => {
                  onClose();
                  onOpenNewDrawing();
                }}
                className="p-4 rounded-2xl bg-gradient-to-r from-indigo-900/40 to-slate-900 border border-indigo-500/40 hover:border-indigo-400 transition cursor-pointer text-left group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
                    <FolderPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                      ➕ 새 도면 업로드 & 분석
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      PDF, JPG, PNG 도면 불러오기
                    </div>
                  </div>
                </div>
                <ArrowUpRight className="w-5 h-5 text-slate-500 group-hover:text-indigo-300 transition-colors" />
              </button>

              {/* EC60E 샘플 체험 */}
              <button
                onClick={handleLoadSample}
                className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-500/40 hover:border-amber-400 transition cursor-pointer text-left group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-lg shadow-amber-600/30 group-hover:scale-105 transition-transform">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                      ⚡ EC60E 샘플 회로도 체험
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      볼보 굴착기 전장 샘플 즉시 생성
                    </div>
                  </div>
                </div>
                <ArrowUpRight className="w-5 h-5 text-slate-500 group-hover:text-amber-300 transition-colors" />
              </button>

              {/* 프로젝트 불러오기 */}
              <button
                onClick={() => {
                  onClose();
                  onOpenLoadProject();
                }}
                className="p-4 rounded-2xl bg-gradient-to-r from-sky-950/40 to-slate-900 border border-sky-500/40 hover:border-sky-400 transition cursor-pointer text-left group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-lg shadow-sky-600/30 group-hover:scale-105 transition-transform">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
                      📁 기존 프로젝트 열기
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      저장된 도면 및 주석 복원
                    </div>
                  </div>
                </div>
                <ArrowUpRight className="w-5 h-5 text-slate-500 group-hover:text-sky-300 transition-colors" />
              </button>
            </div>
          </div>

          {/* 3. 최근 작업 프로젝트 갤러리 & 검색 */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                보관된 프로젝트 목록 ({filteredProjects.length})
              </div>

              {/* 검색 바 */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="도면명 / 제조사 / 모델 검색..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-950/60 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500 w-48 sm:w-64"
                  />
                </div>
              </div>
            </div>

            {/* 프로젝트 카드 그리드 */}
            {filteredProjects.length === 0 ? (
              <div className="p-8 rounded-2xl border border-slate-800 bg-slate-950/30 text-center text-slate-500 space-y-2">
                <FolderOpen className="w-8 h-8 mx-auto text-slate-700" />
                <div className="text-sm font-medium">검색된 프로젝트가 없습니다</div>
                <p className="text-xs text-slate-600">
                  상단의 "새 도면 업로드"를 눌러 새로운 도면 분석을 시작해 보세요.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredProjects.map((proj) => (
                  <div
                    key={proj.id}
                    onClick={() => handleOpenProject(proj)}
                    className="p-4 rounded-2xl bg-slate-950/40 hover:bg-slate-800/60 border border-slate-800 hover:border-indigo-500/50 transition cursor-pointer group flex flex-col justify-between shadow-sm space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md truncate max-w-[140px]">
                          {proj.manufacturer || "볼보건설기계"} · {proj.model || "EC60E"}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(proj.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                        {proj.name}
                      </div>
                      <div className="text-xs text-slate-400 mt-1 truncate">
                        {proj.systemCategory || "⚡ 전기/전장 회로 (Electric)"}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <span className="text-[11px] text-slate-500 font-mono">
                        ID: {proj.id.slice(0, 8)}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleDeleteProject(e, proj.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-700 transition cursor-pointer"
                          title="프로젝트 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold text-indigo-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                          열기 <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. 제조사별 분포 통계 바 */}
          {Object.keys(manufacturerCounts).length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-indigo-400" />
                장비 제조사별 프로젝트 분포
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(manufacturerCounts).map(([maker, count]) => {
                  const percentage = Math.round((count / projects.length) * 100);
                  return (
                    <div
                      key={maker}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2"
                    >
                      <span className="text-xs font-semibold text-slate-200">{maker}</span>
                      <span className="px-1.5 py-0.2 text-[10px] bg-indigo-500/20 text-indigo-300 rounded-full font-bold">
                        {count}건 ({percentage}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
