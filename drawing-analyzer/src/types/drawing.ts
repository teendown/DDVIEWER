export type DrawingSystemType = "electrical" | "hydraulic" | "mechanical" | "other";

export interface BackgroundSheet {
  id: string;
  title: string;
  imagePath: string; // Data URL or Blob URL
  x: number; // 월드 씬 좌표계 X
  y: number; // 월드 씬 좌표계 Y
  width: number; // 원본 너비
  height: number; // 원본 높이
  scaleX?: number; // 가로 배율 (기본 1)
  scaleY?: number; // 세로 배율 (기본 1)
  rotation: number; // 0, 90, 180, 270 deg
  flipX: boolean;
  flipY: boolean;
  opacity: number; // 0.1 ~ 1.0
  locked: boolean;
  zIndex?: number;
  crop?: { x: number; y: number; width: number; height: number }; // 도면 자르기 영역
}

export interface Drawing {
  id: string;
  projectId: string;
  number?: string;
  title?: string;
  type: DrawingSystemType;
  imagePath: string; // 기본 대표 이미지 URL
  imageData?: Blob;
  originalWidth: number;
  originalHeight: number;
  backgroundSheets?: BackgroundSheet[]; // 2장 이상의 다중 도면 시트 목록
  createdAt: string;
  updatedAt: string;
}

