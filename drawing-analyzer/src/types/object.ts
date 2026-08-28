export type DrawingObjectType =
  | "line"
  | "polyline"
  | "arrow"
  | "rectangle"
  | "circle"
  | "text"
  | "component"
  | "connector"
  | "pin"
  | "note"
  | "highlight"
  | "wire"
  | "polygon"
  | "group";

export interface NormalizedPoint {
  x: number; // 0.0 ~ 1.0 (or absolute world space coordinate)
  y: number;
}

export type ArrowHeadType =
  | "none"
  | "arrow"      // 개방형 화살표 (V)
  | "triangle"   // 채워진 삼각 화살표 (▶)
  | "circle"     // 원형 점 (●)
  | "square"     // 사각형 블록 (■)
  | "diamond"    // 마름모 다이아몬드 (◆)
  | "slash";     // 사선 슬래시 (/)

export interface DrawingObject {
  id: string;
  projectId: string;
  drawingId: string;
  type: DrawingObjectType;
  label?: string;
  x?: number; // 월드/정규화 좌표
  y?: number;
  width?: number;
  height?: number;
  points?: NormalizedPoint[];
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  highlightMode?: "freehand" | "point"; // 형광펜 모드 (자유 그리기 vs 점과 점 그리기)
  
  // 고급 선 & 커넥터 스타일링
  lineStyle?: "solid" | "dashed" | "dotted";
  startCap?: ArrowHeadType;
  endCap?: ArrowHeadType;
  jointCap?: ArrowHeadType; // 꺾이는 중간 정점(Joints) 마커 모양 (원형 점, 다이아 등)
  arrowScaleRatio?: number; // 화살표 크기 배율 계수 (기본 1.0)
  
  // 스마트 커넥터 & 노드 바인딩
  fromNodeId?: string;
  toNodeId?: string;
  fromAnchor?: "top" | "bottom" | "left" | "right" | "center";
  toAnchor?: "top" | "bottom" | "left" | "right" | "center";
  midPoint?: NormalizedPoint; // 동적 중간 제어점 (P_mid)
  connectorType?: "polyline" | "curve" | "straight";

  // 스마트 커넥터 와이어 중간 분기점 (Branch Junction / Tap)
  branchFromConnectorId?: string; // 다른 커넥터 선에서 분기되어 나온 경우
  branchRatio?: number; // 분기점의 메인 와이어 경로 상 위치 비율 (0.0 ~ 1.0)
  branchJunctionPoints?: Array<{
    id: string;
    ratio: number; // 0.0 ~ 1.0
    point: NormalizedPoint;
  }>;

  // 도형 내부 텍스트 색상
  textColor?: string;

  // 도형 채우기 및 모서리 곡률
  fillEnabled?: boolean;
  fillOpacity?: number;
  borderRadius?: number; // 모서리 둥글기 (Corner Radius)

  // 테두리 & 박스 (Border & Padding)
  borderEnabled?: boolean;
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: "solid" | "dashed" | "dotted";
  padding?: number; // 내부 여백

  // 타이포그래피 (텍스트)
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  letterSpacing?: number; // 자간
  lineHeight?: number;    // 줄간격
  textAlign?: "left" | "center" | "right";
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  characterStyles?: Record<number, Record<number, any>>; // 글자별 개별 색상/서식

  // 그룹화 & 레이어
  groupId?: string;
  isGroup?: boolean;
  childObjectIds?: string[];
  opacity?: number;
  rotation?: number;

  visible: boolean;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
}
