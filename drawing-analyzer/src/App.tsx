import React, { useRef, useState, useEffect } from "react";
import { Header } from "./components/layout/Header";
import { TopToolbar } from "./components/layout/TopToolbar";
import { LeftToolbar } from "./components/layout/LeftToolbar";
import { RightSidebar } from "./components/layout/RightSidebar";
import { StatusBar } from "./components/layout/StatusBar";
import { DrawingViewport } from "./components/drawing/DrawingViewport";
import { useDrawingStore } from "./store/drawingStore";
import { useUIStore } from "./store/uiStore";
import { useProjectStore } from "./store/projectStore";
import { generateSampleDrawingDataUrl } from "./utils/sampleDrawing";
import { autoSaveService } from "./services/autoSaveService";
import type { Drawing } from "./types";
import type { ProjectSnapshot } from "./types/project";
import { AlertCircle, RotateCcw, X } from "lucide-react";
import { DashboardModal } from "./components/modals/DashboardModal";
import { UserAuthModal } from "./components/modals/UserAuthModal";
import { OpenDrawingModal } from "./components/modals/OpenDrawingModal";
import { ProjectLoadModal } from "./components/modals/ProjectLoadModal";
import { ProjectSaveModal } from "./components/modals/ProjectSaveModal";
import { TimelineRestoreModal } from "./components/modals/TimelineRestoreModal";
import { ExportModal } from "./components/modals/ExportModal";
import { ResolutionSettingsModal } from "./components/common/ResolutionSettingsModal";
import { KeyboardShortcutsModal } from "./components/modals/KeyboardShortcutsModal";
import { OfflineInstallModal } from "./components/modals/OfflineInstallModal";
import { useUserStore } from "./store/userStore";
import { LoginScreen } from "./components/auth/LoginScreen";

// 개발 및 디버그용 전역 스토어 연결
if (typeof window !== "undefined") {
  (window as any).useDrawingStore = useDrawingStore;
  (window as any).useUIStore = useUIStore;
}

export function App() {
  const hiddenFileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [emergencySnap, setEmergencySnap] = useState<ProjectSnapshot | null>(null);

  const { addDrawing, setCurrentDrawing, currentDrawing, setObjects } = useDrawingStore();
  const { currentProject } = useProjectStore();
  const { currentUser } = useUserStore();
  const {
    isDashboardOpen,
    setDashboardOpen,
    isAuthModalOpen,
    setAuthModalOpen,
    isOpenDrawingModalOpen,
    setOpenDrawingModalOpen,
    isLoadModalOpen,
    setLoadModalOpen,
    isSaveModalOpen,
    setSaveModalOpen,
    isExportModalOpen,
    setExportModalOpen,
    isTimelineModalOpen,
    setTimelineModalOpen,
    isResModalOpen,
    setResModalOpen,
    isShortcutsHelpOpen,
    setShortcutsHelpOpen,
    isOfflineInstallOpen,
    setOfflineInstallOpen,
  } = useUIStore();

  // 1. 첫 실행 시 자동 도면 로드 & 자동 임시저장 서비스 시작 & 긴급 복구 확인
  useEffect(() => {
    if (!currentDrawing) {
      const dataUrl = generateSampleDrawingDataUrl("electrical");
      const defaultDwg: Drawing = {
        id: "dwg_schematic_01",
        projectId: currentProject?.id || "proj_default",
        number: "SCH-02",
        title: "시동 및 점화 전장 회로도 (EC60E)",
        type: "electrical",
        imagePath: dataUrl,
        originalWidth: 1600,
        originalHeight: 1200,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addDrawing(defaultDwg);
      setCurrentDrawing(defaultDwg);
    }

    // 자동 임시저장 타이머 시작 (60초 주기)
    autoSaveService.start(60000);

    // 긴급 복구 확인
    autoSaveService.checkForEmergencyRecovery().then((snap) => {
      if (snap) {
        setEmergencySnap(snap);
      }
    });

    return () => {
      autoSaveService.stop();
    };
  }, []);

  const handleRestoreEmergency = () => {
    if (!emergencySnap) return;
    try {
      const parsed = JSON.parse(emergencySnap.dataJson);
      setObjects(parsed);
      setEmergencySnap(null);
    } catch (e: any) {
      alert("복구 실패: " + e.message);
    }
  };

  // 파일 처리 공통 함수
  const processDrawingFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) return;

      const img = new Image();
      img.onload = () => {
        const newDrawing: Drawing = {
          id: "dwg_" + Math.random().toString(36).substring(2, 9),
          projectId: currentProject?.id || "proj_default",
          number: `DWG-${Math.floor(10 + Math.random() * 90)}`,
          title: file.name.replace(/\.[^/.]+$/, ""),
          type: "electrical",
          imagePath: result,
          originalWidth: img.width,
          originalHeight: img.height,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        addDrawing(newDrawing);
        setCurrentDrawing(newDrawing);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  // 파일 인풋 변경 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processDrawingFile(file);
    }
    e.target.value = "";
  };

  // 드래그 앤 드롭 이벤트
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);

    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith("image/") || file.type === "application/pdf")) {
      processDrawingFile(file);
    }
  };

  // 로그인되지 않은 경우 전체화면 로그인 및 작업자 선택 화면 표시
  if (!currentUser) {
    return <LoginScreen />;
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="w-screen h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans relative"
    >
      {/* 긴급 자동복구 알림 배너 */}
      {emergencySnap && (
        <div className="bg-amber-600/95 text-white px-4 py-2 text-xs flex items-center justify-between z-50 shadow-lg animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-amber-200 shrink-0" />
            <span>
              이전 작업 중단 시점(
              {new Date(emergencySnap.timestamp).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
              )의 자동 임시저장 데이터(객체 {emergencySnap.objectCount}개)가 있습니다.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRestoreEmergency}
              className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold rounded-lg transition cursor-pointer flex items-center gap-1 shadow"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>지금 복구하기</span>
            </button>
            <button
              onClick={() => setEmergencySnap(null)}
              className="p-1 hover:bg-amber-700 rounded transition cursor-pointer text-amber-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 드래그 오버레이 */}
      {isDraggingFile && (
        <div className="absolute inset-0 z-50 bg-sky-950/80 backdrop-blur-md border-4 border-dashed border-sky-400 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-xl font-bold text-sky-200">
            도면 파일을 여기에 놓으세요 (Drop Drawing Here)
          </div>
          <div className="text-sm text-sky-400 mt-2">
            JPG, PNG, WebP, PDF 파일을 바로 로드합니다.
          </div>
        </div>
      )}

      {/* 1. 상단 메인 헤더 및 상단 퀵 드롭다운 도구바 */}
      <Header onFileSelect={handleFileSelect} />
      <TopToolbar />

      {/* 2. 메인 작업 영역 (좌측 56px 고정 툴바 + 캔버스 뷰포트 + 우측 사이드바) */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        <LeftToolbar />
        <DrawingViewport
          onUploadClick={() => hiddenFileInputRef.current?.click()}
        />
        <RightSidebar />
      </div>

      {/* 3. 하단 상태바 */}
      <StatusBar />

      {/* 숨겨진 파일 업로드 인풋 */}
      <input
        ref={hiddenFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,application/pdf"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* 4. 전역 최상위 모달 렌더링 (헤더/툴바에 가려지지 않는 완벽한 z-index 오버레이) */}
      <DashboardModal
        isOpen={isDashboardOpen}
        onClose={() => setDashboardOpen(false)}
        onOpenNewDrawing={() => setOpenDrawingModalOpen(true)}
        onOpenLoadProject={() => setLoadModalOpen(true)}
      />
      <UserAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
      <OpenDrawingModal
        isOpen={isOpenDrawingModalOpen}
        onClose={() => setOpenDrawingModalOpen(false)}
      />
      <ResolutionSettingsModal
        isOpen={isResModalOpen}
        onClose={() => setResModalOpen(false)}
      />
      <ProjectSaveModal
        isOpen={isSaveModalOpen}
        onClose={() => setSaveModalOpen(false)}
      />
      <ProjectLoadModal
        isOpen={isLoadModalOpen}
        onClose={() => setLoadModalOpen(false)}
      />
      <TimelineRestoreModal
        isOpen={isTimelineModalOpen}
        onClose={() => setTimelineModalOpen(false)}
      />
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setExportModalOpen(false)}
      />
      <KeyboardShortcutsModal
        isOpen={isShortcutsHelpOpen}
        onClose={() => setShortcutsHelpOpen(false)}
      />
      <OfflineInstallModal
        isOpen={isOfflineInstallOpen}
        onClose={() => setOfflineInstallOpen(false)}
      />
    </div>
  );
}

export default App;
