export interface Annotation {
  id: string;
  projectId: string;
  drawingId: string;
  type: "text" | "arrow" | "rectangle" | "highlight";
  text?: string;
  // 정규화 좌표
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
  createdAt: string;
  updatedAt: string;
}
