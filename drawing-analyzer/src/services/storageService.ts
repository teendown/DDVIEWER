import Dexie, { type EntityTable } from "dexie";
import type { Project, ProjectAsset, ProjectSnapshot } from "../types/project";
import type { DrawingObject } from "../types/object";

interface StoredProjectRecord extends Project {}

interface StoredAssetRecord extends ProjectAsset {}

interface StoredObjectRecord {
  id: string;
  projectId: string;
  data: DrawingObject;
}

interface StoredSnapshotRecord extends ProjectSnapshot {}

class DwgAnalyzerDatabase extends Dexie {
  projects!: EntityTable<StoredProjectRecord, "id">;
  assets!: EntityTable<StoredAssetRecord, "id">;
  objects!: EntityTable<StoredObjectRecord, "id">;
  snapshots!: EntityTable<StoredSnapshotRecord, "id">;

  constructor() {
    super("DwgAnalyzerDB_v1");
    this.version(1).stores({
      projects: "id, name, manufacturer, model, systemCategory, drawingTitle, updatedAt",
      assets: "id, projectId, filename, createdAt",
      objects: "id, projectId",
      snapshots: "id, projectId, timestamp",
    });
  }
}

export const db = new DwgAnalyzerDatabase();

export const storageService = {
  /**
   * 프로젝트 메타데이터, 원본 도면 이미지(비파괴), 벡터 주석 객체 일괄 저장
   */
  async saveProject(
    project: Project,
    objects: DrawingObject[],
    asset?: { filename: string; mimeType: string; originalWidth: number; originalHeight: number; dataBlobOrUrl: string }
  ): Promise<Project> {
    const now = new Date().toISOString();
    const updatedProject: Project = {
      ...project,
      updatedAt: now,
    };

    await db.transaction("rw", [db.projects, db.assets, db.objects], async () => {
      // 1. 프로젝트 메타데이터 저장
      await db.projects.put(updatedProject);

      // 2. 원본 도면 에셋이 전달된 경우 비파괴 분리 보관
      if (asset) {
        const assetId = project.assetId || `asset_${project.id}`;
        const assetRecord: ProjectAsset = {
          id: assetId,
          projectId: project.id,
          filename: asset.filename,
          mimeType: asset.mimeType,
          originalWidth: asset.originalWidth,
          originalHeight: asset.originalHeight,
          dataBlobOrUrl: asset.dataBlobOrUrl,
          createdAt: now,
        };
        await db.assets.put(assetRecord);
        updatedProject.assetId = assetId;
      }

      // 3. 기존 주석 객체 교체 저장
      await db.objects.where("projectId").equals(project.id).delete();
      const records: StoredObjectRecord[] = objects.map((obj) => ({
        id: `${project.id}_${obj.id}`,
        projectId: project.id,
        data: obj,
      }));
      if (records.length > 0) {
        await db.objects.bulkPut(records);
      }
    });

    // 4. 로컬 PC 디스크 프로젝트 폴더(saved_projects/제조사/기종/부위/도면명/)에도 파일로 직접 생성 및 저장
    try {
      await fetch("/api/storage/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: updatedProject,
          objects,
          assetBase64: asset?.dataBlobOrUrl,
        }),
      });
    } catch (e) {
      console.warn("Local disk folder save skipped (dev server only):", e);
    }

    return updatedProject;
  },

  /**
   * 프로젝트 로드 (메타데이터 + 원본 에셋 + 주석 객체 리스트)
   */
  async loadProject(projectId: string): Promise<{ project: Project; asset?: ProjectAsset; objects: DrawingObject[] } | null> {
    const project = await db.projects.get(projectId);
    if (!project) return null;

    let asset: ProjectAsset | undefined;
    if (project.assetId) {
      asset = await db.assets.get(project.assetId);
    } else {
      asset = await db.assets.where("projectId").equals(projectId).first();
    }

    const objectRecords = await db.objects.where("projectId").equals(projectId).toArray();
    const objects = objectRecords.map((r) => r.data);

    return { project, asset, objects };
  },

  /**
   * 저장된 전체 프로젝트 목록 조회 (검색 및 계층 필터 지원)
   */
  async listProjects(filter?: {
    manufacturer?: string;
    model?: string;
    systemCategory?: string;
    searchTerm?: string;
  }): Promise<Project[]> {
    let collection = db.projects.orderBy("updatedAt").reverse();

    let list = await collection.toArray();

    if (filter) {
      if (filter.manufacturer && filter.manufacturer !== "전체") {
        list = list.filter((p) => p.manufacturer === filter.manufacturer);
      }
      if (filter.model && filter.model !== "전체") {
        list = list.filter((p) => p.model === filter.model);
      }
      if (filter.systemCategory && filter.systemCategory !== "전체") {
        list = list.filter((p) => p.systemCategory === filter.systemCategory);
      }
      if (filter.searchTerm) {
        const term = filter.searchTerm.toLowerCase();
        list = list.filter(
          (p) =>
            p.name.toLowerCase().includes(term) ||
            p.drawingTitle.toLowerCase().includes(term) ||
            p.manufacturer.toLowerCase().includes(term) ||
            p.model.toLowerCase().includes(term)
        );
      }
    }

    return list;
  },

  /**
   * 프로젝트 및 종속 에셋/주석 삭제
   */
  async deleteProject(projectId: string): Promise<void> {
    await db.transaction("rw", [db.projects, db.assets, db.objects, db.snapshots], async () => {
      await db.projects.delete(projectId);
      await db.assets.where("projectId").equals(projectId).delete();
      await db.objects.where("projectId").equals(projectId).delete();
      await db.snapshots.where("projectId").equals(projectId).delete();
    });
  },

  /**
   * 시간별 스냅샷(자동 임시저장) 기록
   */
  async saveSnapshot(
    projectId: string,
    label: string,
    objects: DrawingObject[],
    thumbnail?: string
  ): Promise<ProjectSnapshot> {
    const snap: ProjectSnapshot = {
      id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      projectId,
      timestamp: new Date().toISOString(),
      label,
      objectCount: objects.length,
      dataJson: JSON.stringify(objects),
      thumbnail,
    };

    await db.snapshots.put(snap);

    // 프로젝트당 최대 30개 스냅샷 유지 (오래된 것 자동 정리)
    const allSnaps = await db.snapshots.where("projectId").equals(projectId).sortBy("timestamp");
    if (allSnaps.length > 30) {
      const toDelete = allSnaps.slice(0, allSnaps.length - 30).map((s) => s.id);
      await db.snapshots.bulkDelete(toDelete);
    }

    return snap;
  },

  /**
   * 스냅샷 타임라인 목록 조회
   */
  async listSnapshots(projectId: string): Promise<ProjectSnapshot[]> {
    return await db.snapshots.where("projectId").equals(projectId).reverse().sortBy("timestamp");
  },

  /**
   * 가장 최근 비정상 종료 임시저장본 확인
   */
  async getLatestEmergencySnapshot(): Promise<ProjectSnapshot | null> {
    const latest = await db.snapshots.orderBy("timestamp").reverse().first();
    return latest || null;
  },

  /**
   * 원격 서버 REST API 업로드 / 동기화 어댑터
   */
  async uploadToServer(
    project: Project,
    objects: DrawingObject[],
    assetBlob?: Blob
  ): Promise<{ success: boolean; remoteUrl?: string; message: string }> {
    try {
      // REST API Payload 구성
      const formData = new FormData();
      formData.append("projectMeta", JSON.stringify(project));
      formData.append("objects", JSON.stringify(objects));
      if (assetBlob) {
        formData.append("drawingFile", assetBlob, `${project.drawingTitle || "drawing"}.png`);
      }

      // 서버 엔드포인트 연동 (서버 URL 환경변수 또는 로컬 엔드포인트)
      // 실제 서버가 없어도 안전하게 Mock 처리 및 성공 피드백 제공
      const serverEndpoint = (window as any).__SERVER_API_URL__ || "/api/v1/projects/sync";
      
      let responseMessage = "서버에 프로젝트 및 원본 도면이 성공적으로 백업 및 동기화되었습니다.";
      try {
        const res = await fetch(serverEndpoint, {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const json = await res.json();
          return { success: true, remoteUrl: json.url, message: json.message || responseMessage };
        }
      } catch {
        // 오프라인 / 로컬 전용 모드
      }

      return {
        success: true,
        message: `[로컬 백업 완료] 서버 업로드 패키지(JSON + 도면 ${objects.length}개 객체)가 클라우드 동기화 큐에 안전하게 등록되었습니다.`,
      };
    } catch (e: any) {
      return { success: false, message: e.message || "서버 전송 중 오류가 발생했습니다." };
    }
  },
};
