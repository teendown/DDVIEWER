import { storageService } from "./storageService";
import { useDrawingStore } from "../store/drawingStore";
import { useProjectStore } from "../store/projectStore";
import { useCategoryStore } from "../store/categoryStore";
import type { ProjectSnapshot } from "../types/project";

let autoSaveTimer: any = null;
let lastSavedStateHash: string = "";

export const autoSaveService = {
  /**
   * 백그라운드 주기적 자동 임시저장 시작 (기본 60초 주기)
   */
  start(intervalMs: number = 60000) {
    if (autoSaveTimer) clearInterval(autoSaveTimer);

    autoSaveTimer = setInterval(async () => {
      await autoSaveService.triggerAutoSave("자동 임시저장");
    }, intervalMs);
  },

  /**
   * 자동 저장 중지
   */
  stop() {
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer);
      autoSaveTimer = null;
    }
  },

  /**
   * 즉시 자동 임시저장 스냅샷 실행
   */
  async triggerAutoSave(label: string = "자동 임시저장"): Promise<ProjectSnapshot | null> {
    const drawingState = useDrawingStore.getState();
    const projectState = useProjectStore.getState();
    const categoryState = useCategoryStore.getState();

    const objects = drawingState.objects;
    if (!objects || objects.length === 0) return null;

    const currentHash = JSON.stringify(objects.map((o) => ({ id: o.id, x: o.x, y: o.y, w: o.width, h: o.height, c: o.strokeColor, p: o.points })));
    if (currentHash === lastSavedStateHash && label.includes("자동")) {
      // 변경사항 없음 -> 불필요한 중복 저장 스킵
      return null;
    }

    lastSavedStateHash = currentHash;
    const projectId = projectState.currentProject?.id || "proj_default";

    // 1. 스냅샷 타임라인에 기록
    const snap = await storageService.saveSnapshot(projectId, label, objects);

    // 2. 최신 프로젝트 상태도 로컬 DB에 자동 동기화
    if (projectState.currentProject) {
      const updatedProj = {
        ...projectState.currentProject,
        manufacturer: categoryState.selectedManufacturer,
        model: categoryState.selectedModel,
        systemCategory: categoryState.selectedSystemCategory,
        drawingTitle: categoryState.drawingTitle,
        updatedAt: new Date().toISOString(),
      };
      await storageService.saveProject(updatedProj, objects);
    }

    return snap;
  },

  /**
   * 비정상 종료 시 이전 자동 저장본 복구 감지
   */
  async checkForEmergencyRecovery(): Promise<ProjectSnapshot | null> {
    try {
      const latest = await storageService.getLatestEmergencySnapshot();
      if (!latest) return null;

      const snapshotTime = new Date(latest.timestamp).getTime();
      const now = Date.now();
      // 최근 24시간 이내의 임시저장본이고 1개 이상 객체가 있을 때
      if (now - snapshotTime < 24 * 60 * 60 * 1000 && latest.objectCount > 0) {
        return latest;
      }
    } catch (e) {
      console.error("Emergency recovery check failed:", e);
    }
    return null;
  },
};
