export interface ProjectSnapshot {
  id: string;
  projectId: string;
  timestamp: string;
  label?: string; // e.g. "자동 임시저장", "수동 저장"
  objectCount: number;
  dataJson: string; // serialized objects, wires, components
  thumbnail?: string; // small base64 preview
}

export interface ProjectAsset {
  id: string;
  projectId: string;
  filename: string;
  mimeType: string;
  originalWidth: number;
  originalHeight: number;
  dataBlobOrUrl: string; // Base64 or Blob storage key
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  
  // 4단계 계층 분류 메타데이터
  manufacturer: string;       // 제조사 (예: 볼보건설기계, 두산인프라코어, HD현대 등)
  model: string;              // 기종 (예: EC60E, DX140W, HW210A 등)
  systemCategory: string;     // 부위 (예: ⚡ 전기, 💧 유압, 🚗 엔진, 🕹️ 제어 등)
  drawingTitle: string;       // 도면/작업명 (예: 메인 시동 회로도)
  
  maker?: string;             // 이전 버전 호환 필드
  serialNumber?: string;
  author?: string;
  description?: string;
  
  // 원본 도면 에셋 참조 (비파괴 분리 보존)
  assetId?: string;
  originalImageSrc?: string;
  originalWidth?: number;
  originalHeight?: number;

  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
  appVersion: string;
}

export interface ProjectPackage {
  project: Project;
  asset?: ProjectAsset;
  objects: any[];
  wires?: any[];
  components?: any[];
  groups?: any[];
  exportedAt: string;
  version: string;
}
