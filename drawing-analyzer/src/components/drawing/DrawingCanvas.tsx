import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Canvas as FabricCanvas,
  FabricImage,
  Point,
  Rect,
  Line,
  Circle,
  Ellipse,
  Polygon,
  Polyline,
  IText,
  FabricObject,
  ActiveSelection,
  Control,
  util,
} from "fabric";
import {
  Trash2,
  Sliders,
  Maximize2,
  Share2,
  Link2,
  Edit3,
  Type,
  RotateCw,
  GitFork,
  Check,
  Keyboard,
} from "lucide-react";
import { useDrawingStore } from "../../store/drawingStore";

import { useUIStore } from "../../store/uiStore";
import { useHistoryStore } from "../../store/historyStore";
import {
  normalizeX,
  normalizeY,
  denormalizeX,
  denormalizeY,
  getPortWorldPosition,
  calculateOrthogonalWirePath,
} from "../../utils/coordinates";
import { HoverLabelTooltip, type HoverInfo } from "./HoverLabelTooltip";
import { findOptimalAnchors, generateConnectorPoints } from "../../utils/connectorRouter";
import type { DrawingObject, DrawingObjectType, ArrowHeadType, NormalizedPoint } from "../../types";



// 2. 다각형(Polygon) / 다각선(Polyline) 정점(Vertex) 제어 핸들 동적 생성
const createPolygonVertexControls = (
  polyObj: Polygon | Polyline,
  initialScenePoints: Array<{ x: number; y: number }>,
  onModified?: (updatedPoints: Array<{ x: number; y: number }>) => void
) => {
  polyObj.hasBorders = false;
  polyObj.hasControls = true;
  polyObj.lockScalingX = true;
  polyObj.lockScalingY = true;
  polyObj.lockRotation = true;
  polyObj.perPixelTargetFind = true;
  (polyObj as any).targetFindTolerance = 8;
  (polyObj as any)._scenePoints = [...initialScenePoints];

  const controls: Record<string, Control> = {};

  initialScenePoints.forEach((_pt, index) => {
    controls[`v_${index}`] = new Control({
      positionHandler: (_dim, _finalMatrix, fabricObject) => {
        const scenePts = (fabricObject as any)._scenePoints || [];
        const point = scenePts[index] || { x: 0, y: 0 };
        const vpt = fabricObject.canvas?.viewportTransform || [1, 0, 0, 1, 0, 0];
        return util.transformPoint(new Point(point.x, point.y), vpt);
      },
      actionHandler: (eventData, transform) => {
        const pObj = transform.target as Polygon | Polyline;
        const canvas = pObj.canvas;
        if (!canvas) return false;
        const scenePt = canvas.getScenePoint(eventData);
        const scenePts = [...((pObj as any)._scenePoints || [])];
        scenePts[index] = { x: scenePt.x, y: scenePt.y };
        (pObj as any)._scenePoints = scenePts;

        const xs = scenePts.map((p) => p.x);
        const ys = scenePts.map((p) => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);
        const width = Math.max(maxX - minX, 1);
        const height = Math.max(maxY - minY, 1);

        pObj.set({
          points: scenePts.map((p) => ({ x: p.x - minX, y: p.y - minY })),
          left: minX,
          top: minY,
          width,
          height,
          pathOffset: new Point(width / 2, height / 2),
        });
        pObj.setCoords();
        if (onModified) onModified(scenePts);
        return true;
      },
      cursorStyle: "crosshair",
      render: (ctx, left, top, _styleOverride, fabricObject) => {
        const zoom = fabricObject.canvas?.getZoom() || 1;
        const r = 6 / zoom;
        ctx.save();
        ctx.beginPath();
        ctx.arc(left, top, r, 0, Math.PI * 2, false);
        ctx.fillStyle = index === 0 ? "#22c55e" : "#ec4899";
        ctx.fill();
        ctx.lineWidth = 2 / zoom;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
        ctx.restore();
      },
    });
  });

  polyObj.controls = controls;
};



// 화살표 캡 렌더링 헬퍼 (7종 헤드 모양 및 크기 배율 계수 지원)
const renderArrowCap = (
  ctx: CanvasRenderingContext2D,
  tipX: number,
  tipY: number,
  angle: number,
  capType: ArrowHeadType | undefined,
  baseSize: number,
  color: string,
  scaleRatio: number = 1.0
) => {
  if (!capType || capType === "none") return;
  const size = baseSize * (scaleRatio || 1.0);

  ctx.save();
  ctx.translate(tipX, tipY);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;

  switch (capType) {
    case "arrow": {
      // 개방형 화살표 (V)
      ctx.lineWidth = Math.max(2, size / 4.5);
      ctx.beginPath();
      ctx.moveTo(-size, -size * 0.5);
      ctx.lineTo(0, 0);
      ctx.lineTo(-size, size * 0.5);
      ctx.stroke();
      break;
    }
    case "triangle": {
      // 채워진 삼각 화살표 (▶)
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-size, -size * 0.55);
      ctx.lineTo(-size, size * 0.55);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "circle": {
      // 원형 점 (●)
      ctx.beginPath();
      ctx.arc(-size * 0.35, 0, size * 0.35, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "square": {
      // 사각형 블록 (■)
      ctx.beginPath();
      ctx.rect(-size * 0.7, -size * 0.35, size * 0.7, size * 0.7);
      ctx.fill();
      break;
    }
    case "diamond": {
      // 마름모 다이아몬드 (◆)
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-size * 0.5, -size * 0.4);
      ctx.lineTo(-size, 0);
      ctx.lineTo(-size * 0.5, size * 0.4);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "slash": {
      // 사선 슬래시 (/)
      ctx.lineWidth = Math.max(2, size / 4.5);
      ctx.beginPath();
      ctx.moveTo(-size * 0.2, -size * 0.5);
      ctx.lineTo(-size * 0.6, size * 0.5);
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
};

// 스마트 커넥터 P1, P2 및 P_mid 동적 변형 제어점 컨트롤 (화면 픽셀 오차 및 왜곡 완전 차단)
const createConnectorMorphControls = (
  polyObj: Polyline,
  initialScenePoints: Array<{ x: number; y: number }>,
  onModified?: (pts: Array<{ x: number; y: number }>, midPt?: { x: number; y: number }) => void
) => {
  polyObj.hasBorders = false;
  polyObj.hasControls = true;
  polyObj.lockScalingX = true;
  polyObj.lockScalingY = true;
  polyObj.lockRotation = true;
  polyObj.perPixelTargetFind = true;
  (polyObj as any).targetFindTolerance = 8;
  (polyObj as any)._scenePoints = [...initialScenePoints];

  const controls: Record<string, Control> = {
    // 1. 시작점 P1 핸들
    p1: new Control({
      positionHandler: (_dim, _finalMatrix, fabricObject) => {
        const scenePts = (fabricObject as any)._scenePoints || [];
        const p = scenePts[0] || { x: fabricObject.left || 0, y: fabricObject.top || 0 };
        const vpt = fabricObject.canvas?.viewportTransform || [1, 0, 0, 1, 0, 0];
        return util.transformPoint(new Point(p.x, p.y), vpt);
      },
      actionHandler: (eventData, transform) => {
        const target = transform.target as Polyline;
        const canvas = target.canvas;
        if (!canvas) return false;
        const scenePt = canvas.getScenePoint(eventData);
        const scenePts = [...((target as any)._scenePoints || [])];
        scenePts[0] = { x: scenePt.x, y: scenePt.y };
        (target as any)._scenePoints = scenePts;

        const xs = scenePts.map((p) => p.x);
        const ys = scenePts.map((p) => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);
        const width = Math.max(maxX - minX, 1);
        const height = Math.max(maxY - minY, 1);

        target.set({
          points: scenePts.map((p) => ({ x: p.x - minX, y: p.y - minY })),
          left: minX,
          top: minY,
          width,
          height,
          pathOffset: new Point(width / 2, height / 2),
        });
        target.setCoords();
        if (onModified) onModified(scenePts);
        return true;
      },
      cursorStyle: "crosshair",
      render: (ctx, left, top, _style, fabricObject) => {
        const zoom = fabricObject.canvas?.getZoom() || 1;
        ctx.save();
        ctx.beginPath();
        ctx.arc(left, top, 6 / zoom, 0, Math.PI * 2);
        ctx.fillStyle = "#38bdf8";
        ctx.fill();
        ctx.lineWidth = 2 / zoom;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
        ctx.restore();
      },
    }),

    // 2. 중간점 P_mid 동적 변형 핸들
    p_mid: new Control({
      positionHandler: (_dim, _finalMatrix, fabricObject) => {
        const scenePts = (fabricObject as any)._scenePoints || [];
        const p1 = scenePts[0] || { x: 0, y: 0 };
        const p2 = scenePts[scenePts.length - 1] || { x: 0, y: 0 };
        const mid = scenePts.length >= 3 ? scenePts[Math.floor(scenePts.length / 2)] : { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        const vpt = fabricObject.canvas?.viewportTransform || [1, 0, 0, 1, 0, 0];
        return util.transformPoint(new Point(mid.x, mid.y), vpt);
      },
      actionHandler: (eventData, transform) => {
        const target = transform.target as Polyline;
        const canvas = target.canvas;
        if (!canvas) return false;
        const scenePt = canvas.getScenePoint(eventData);
        const scenePts = [...((target as any)._scenePoints || [])];
        const p1 = scenePts[0] || { x: 0, y: 0 };
        const p2 = scenePts[scenePts.length - 1] || { x: 0, y: 0 };
        const midPt = { x: scenePt.x, y: scenePt.y };
        const newScenePts = [p1, midPt, p2];
        (target as any)._scenePoints = newScenePts;

        const xs = newScenePts.map((p) => p.x);
        const ys = newScenePts.map((p) => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);
        const width = Math.max(maxX - minX, 1);
        const height = Math.max(maxY - minY, 1);

        target.set({
          points: newScenePts.map((p) => ({ x: p.x - minX, y: p.y - minY })),
          left: minX,
          top: minY,
          width,
          height,
          pathOffset: new Point(width / 2, height / 2),
        });
        target.setCoords();
        if (onModified) onModified(newScenePts, midPt);
        return true;
      },
      cursorStyle: "grab",
      render: (ctx, left, top, _style, fabricObject) => {
        const zoom = fabricObject.canvas?.getZoom() || 1;
        ctx.save();
        ctx.beginPath();
        ctx.arc(left, top, 6 / zoom, 0, Math.PI * 2);
        ctx.fillStyle = "#6366f1";
        ctx.fill();
        ctx.lineWidth = 2 / zoom;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
        ctx.restore();
      },
    }),

    // 3. 끝점 P2 핸들
    p2: new Control({
      positionHandler: (_dim, _finalMatrix, fabricObject) => {
        const scenePts = (fabricObject as any)._scenePoints || [];
        const p = scenePts[scenePts.length - 1] || { x: (fabricObject.left || 0) + (fabricObject.width || 0), y: (fabricObject.top || 0) + (fabricObject.height || 0) };
        const vpt = fabricObject.canvas?.viewportTransform || [1, 0, 0, 1, 0, 0];
        return util.transformPoint(new Point(p.x, p.y), vpt);
      },
      actionHandler: (eventData, transform) => {
        const target = transform.target as Polyline;
        const canvas = target.canvas;
        if (!canvas) return false;
        const scenePt = canvas.getScenePoint(eventData);
        const scenePts = [...((target as any)._scenePoints || [])];
        scenePts[scenePts.length - 1] = { x: scenePt.x, y: scenePt.y };
        (target as any)._scenePoints = scenePts;

        const xs = scenePts.map((p) => p.x);
        const ys = scenePts.map((p) => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);
        const width = Math.max(maxX - minX, 1);
        const height = Math.max(maxY - minY, 1);

        target.set({
          points: scenePts.map((p) => ({ x: p.x - minX, y: p.y - minY })),
          left: minX,
          top: minY,
          width,
          height,
          pathOffset: new Point(width / 2, height / 2),
        });
        target.setCoords();
        if (onModified) onModified(scenePts);
        return true;
      },
      cursorStyle: "crosshair",
      render: (ctx, left, top, _style, fabricObject) => {
        const zoom = fabricObject.canvas?.getZoom() || 1;
        ctx.save();
        ctx.beginPath();
        ctx.arc(left, top, 6 / zoom, 0, Math.PI * 2);
        ctx.fillStyle = "#ef4444";
        ctx.fill();
        ctx.restore();
      },
    }),
  };

  polyObj.controls = controls;
};


// 객체의 순수 정점(Sequential Vertices) 추출 함수 - 시작점, 꺾임점, 끝점 순서 엄격 보장!
const getObjectSceneVertices = (obj: FabricObject): Array<{ x: number; y: number }> => {
  const matrix = obj.calcTransformMatrix();
  const w = obj.width || 0;
  const h = obj.height || 0;

  if (obj instanceof Polygon || obj instanceof Polyline) {
    const pts = ((obj as any).points as Array<{ x: number; y: number }>) || [];
    if (pts.length === 0) return [];
    const offsetX = (obj as any).pathOffset?.x || 0;
    const offsetY = (obj as any).pathOffset?.y || 0;
    const originX = obj.originX || "left";
    const originY = obj.originY || "top";
    const baseOffsetX = originX === "center" ? offsetX : offsetX - w / 2;
    const baseOffsetY = originY === "center" ? offsetY : offsetY - h / 2;

    return pts.map((p) => {
      const localPt = new Point(p.x - baseOffsetX, p.y - baseOffsetY);
      return util.transformPoint(localPt, matrix);
    });
  } else if (obj instanceof Line) {
    const x1 = obj.x1 || 0;
    const y1 = obj.y1 || 0;
    const x2 = obj.x2 || 0;
    const y2 = obj.y2 || 0;
    const originX = obj.originX || "left";
    const originY = obj.originY || "top";
    const offsetX = (obj as any).pathOffset?.x || 0;
    const offsetY = (obj as any).pathOffset?.y || 0;
    const baseOffsetX = originX === "center" ? offsetX : offsetX - w / 2;
    const baseOffsetY = originY === "center" ? offsetY : offsetY - h / 2;

    const p1 = util.transformPoint(new Point(x1 - baseOffsetX, y1 - baseOffsetY), matrix);
    const p2 = util.transformPoint(new Point(x2 - baseOffsetX, y2 - baseOffsetY), matrix);
    return [p1, p2];
  } else if (obj instanceof Circle || obj instanceof Ellipse || (obj as any).dataType === "circle") {
    // 원 / 타원: 4방위 꼭짓점 (상, 우, 하, 좌)
    const rx = (obj as any).rx || (obj as any).radius || w / 2;
    const ry = (obj as any).ry || (obj as any).radius || h / 2;
    const pTop = util.transformPoint(new Point(0, -ry), matrix);
    const pRight = util.transformPoint(new Point(rx, 0), matrix);
    const pBottom = util.transformPoint(new Point(0, ry), matrix);
    const pLeft = util.transformPoint(new Point(-rx, 0), matrix);
    return [pTop, pRight, pBottom, pLeft];
  } else {
    // 사각형, 텍스트, 컴포넌트 등 모든 2D 박스형 객체 (4개 꼭짓점: TL, TR, BR, BL)
    const pTopLeft = util.transformPoint(new Point(-w / 2, -h / 2), matrix);
    const pTopRight = util.transformPoint(new Point(w / 2, -h / 2), matrix);
    const pBottomRight = util.transformPoint(new Point(w / 2, h / 2), matrix);
    const pBottomLeft = util.transformPoint(new Point(-w / 2, h / 2), matrix);
    return [pTopLeft, pTopRight, pBottomRight, pBottomLeft];
  }
};

// 객체의 외곽선(선, 사각형 변, 원 둘레, 다각형 세그먼트) 상에서 마우스 위치와 가장 가까운 정확한 선 위 지점 투영 계산 함수
const getClosestPointOnObjectBoundary = (
  pt: { x: number; y: number },
  obj: FabricObject
): { x: number; y: number } => {
  const matrix = obj.calcTransformMatrix();
  const dataId = (obj as any).dataId;
  const dwg = useDrawingStore.getState().currentDrawing;
  const origW = dwg?.originalWidth || 1600;
  const origH = dwg?.originalHeight || 1200;

  // 점을 선분 [A, B] 위로 수직 투영하는 헬퍼 함수
  const projectPointToSegment = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return { x: a.x, y: a.y, dist: Math.hypot(p.x - a.x, p.y - a.y) };
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
    const projX = a.x + t * dx;
    const projY = a.y + t * dy;
    return { x: projX, y: projY, dist: Math.hypot(p.x - projX, p.y - projY) };
  };

  // 1. 다각형 / 폴리라인 / 연속선
  if (obj instanceof Polygon || obj instanceof Polyline) {
    const scenePts = getObjectSceneVertices(obj);

    if (scenePts.length >= 2) {
      let best = { x: scenePts[0].x, y: scenePts[0].y, dist: Infinity };
      const count = obj instanceof Polygon ? scenePts.length : scenePts.length - 1;
      for (let i = 0; i < count; i++) {
        const a = scenePts[i];
        const b = scenePts[(i + 1) % scenePts.length];
        const proj = projectPointToSegment(pt, a, b);
        if (proj.dist < best.dist) {
          best = proj;
        }
      }
      return { x: best.x, y: best.y };
    }
  }

  // 2. 스토어 객체 포인트 기반
  if (dataId) {
    const matched = useDrawingStore.getState().objects.find((o) => o.id === dataId);
    if (matched?.points && matched.points.length >= 2) {
      const scenePts = matched.points.map((p) => ({
        x: denormalizeX(p.x, origW),
        y: denormalizeY(p.y, origH),
      }));
      let best = { x: scenePts[0].x, y: scenePts[0].y, dist: Infinity };
      const count = matched.type === "polygon" ? scenePts.length : scenePts.length - 1;
      for (let i = 0; i < count; i++) {
        const a = scenePts[i];
        const b = scenePts[(i + 1) % scenePts.length];
        const proj = projectPointToSegment(pt, a, b);
        if (proj.dist < best.dist) {
          best = proj;
        }
      }
      return { x: best.x, y: best.y };
    }
  }

  // 3. 직선
  if (obj instanceof Line) {
    const vertices = getObjectSceneVertices(obj);
    const p1 = vertices[0] || { x: 0, y: 0 };
    const p2 = vertices[1] || { x: 0, y: 0 };
    const proj = projectPointToSegment(pt, p1, p2);
    return { x: proj.x, y: proj.y };
  }

  // 4. 원 / 타원 (Circle / Ellipse) - 마우스 각도에 맞추어 둘레 선상으로 정밀 투영
  if (obj instanceof Circle || obj instanceof Ellipse || (obj as any).dataType === "circle") {
    const rx = (obj as any).rx || (obj as any).radius || (obj.width || 0) / 2;
    const ry = (obj as any).ry || (obj as any).radius || (obj.height || 0) / 2;
    const centerWorld = util.transformPoint(new Point(0, 0), matrix);
    const angle = Math.atan2(pt.y - centerWorld.y, pt.x - centerWorld.x);
    const pPerimeter = new Point(rx * Math.cos(angle), ry * Math.sin(angle));
    const worldPerimeter = util.transformPoint(pPerimeter, matrix);
    return { x: worldPerimeter.x, y: worldPerimeter.y };
  }

  // 5. 사각형 / 부품 / 텍스트 박스 - 마우스가 올려진 4개 변(상/우/하/좌) 중 가장 가까운 선상의 지점으로 투영
  const w = obj.width || 0;
  const h = obj.height || 0;
  const pTL = util.transformPoint(new Point(-w / 2, -h / 2), matrix);
  const pTR = util.transformPoint(new Point(w / 2, -h / 2), matrix);
  const pBR = util.transformPoint(new Point(w / 2, h / 2), matrix);
  const pBL = util.transformPoint(new Point(-w / 2, h / 2), matrix);

  const topProj = projectPointToSegment(pt, pTL, pTR);
  const rightProj = projectPointToSegment(pt, pTR, pBR);
  const bottomProj = projectPointToSegment(pt, pBR, pBL);
  const leftProj = projectPointToSegment(pt, pBL, pTL);

  let best = topProj;
  if (rightProj.dist < best.dist) best = rightProj;
  if (bottomProj.dist < best.dist) best = bottomProj;
  if (leftProj.dist < best.dist) best = leftProj;

  return { x: best.x, y: best.y };
};


interface DrawingCanvasProps {
  onCanvasReady?: (canvas: FabricCanvas) => void;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ onCanvasReady }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const bgImageRef = useRef<FabricImage | null>(null);

  // 클립보드 버퍼
  const clipboardRef = useRef<DrawingObject | null>(null);
  const isRebuildingRef = useRef(false);
  const bgSheetsMapRef = useRef<Map<string, FabricImage>>(new Map());
  const prevObjectsCountRef = useRef<number>(0);

  // 팬 및 그리기 인터랙션 상태
  const isPanningRef = useRef(false);
  const lastPanPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDrawingRef = useRef(false);
  const isProgrammaticSelectionRef = useRef(false);
  const drawStartPointRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const currentShapeRef = useRef<FabricObject | null>(null);

  // 연속 벡터 패스 드로잉 전용 상태
  const pathPointsRef = useRef<Array<{ x: number; y: number }>>([]);
  const isPathDrawingRef = useRef(false);
  const currentMouseScenePointRef = useRef<{ x: number; y: number } | null>(null);
  const isSnappedToFirstRef = useRef(false);
  const isShiftPressedRef = useRef(false);
  const [pathDrawingHint, setPathDrawingHint] = useState<string | null>(null);

  // 🖍️ 형광펜 자유 드로잉 상태
  const isFreehandDrawingRef = useRef(false);
  const freehandPointsRef = useRef<Array<{ x: number; y: number }>>([]);
  const freehandPreviewRef = useRef<Polyline | null>(null);

  // 정점 자석 스냅 및 자동 그룹화 분기 추적 상태
  const branchSnapInfoRef = useRef<{
    point: { x: number; y: number };
    sourceObjectId: string;
    vertexIndex?: number;
  } | null>(null);
  const branchStartObjectIdRef = useRef<string | null>(null);

  // 🔗 스마트 객체 간 자동 연결선 (Object-to-Object Auto-Connecting) 상태
  const autoConnectingFromRef = useRef<{
    sourceObjectId: string;
    startPoint: { x: number; y: number };
  } | null>(null);
  const autoConnectingTargetRef = useRef<{
    targetObjectId: string;
    targetPoint: { x: number; y: number };
  } | null>(null);

  // ✏️ 선/정점 모양 직접 수정 모드 상태
  const [, setVertexEditObjectId] = useState<string | null>(null);
  const vertexEditObjectIdRef = useRef<string | null>(null);

  // 선택된 벡터 패스 객체의 정점(Anchor Point) 직접 드래그 조작 전용 상태
  const activeVertexDragRef = useRef<{
    object: FabricObject;
    vertexIndex: number;
    initialScenePoints: Array<{ x: number; y: number }>;
  } | null>(null);

  // 🔲 CAD 스타일 영역 드래그 다중 선택(Marquee Box Selection) 전용 상태
  const isMarqueeSelectingRef = useRef(false);
  const marqueeStartPtRef = useRef<{ x: number; y: number } | null>(null);
  const selectionBoxRef = useRef<Rect | null>(null);

  // ⚡ 스마트 커넥터 중간 분기선 연결 대기 상태
  const pendingBranchSourceRef = useRef<{ connectorId: string; clickPoint: { x: number; y: number } } | null>(null);

  // 호버 툴팁 및 우클릭 컨텍스트 메뉴 상태
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    objectId?: string;
    branchPoint?: { x: number; y: number };
    pointType?: "start" | "end" | "mid" | "body" | "shape";
    pointLabel?: string;
  } | null>(null);


  const {
    currentDrawing,
    objects,
    setObjects,
    addObject,
    removeObject,
    duplicateObject,
    createGroup,
    ungroup,
    reorderObject,
    setZoom,
    setPan,
    setSelectedObjectId,
    setSelectedObjectIds,
    selectedObjectId,
    selectedObjectIds,
    checkedObjectIds,
    isBackgroundLocked,
    backgroundTransform,
    backgroundSheets,
    activeSheetId,
    setActiveSheetId,
  } = useDrawingStore();

  const { editorMode, activeTool } = useUIStore();
  const { pushState, undo, redo } = useHistoryStore();

  // 선 대시 어레이 계산 헬퍼
  const getStrokeDashArray = (style?: "solid" | "dashed" | "dotted") => {
    if (style === "dashed") return [8, 6];
    if (style === "dotted") return [3, 4];
    return undefined;
  };

  // 채우기 색상(투명도 포함) 계산 헬퍼 (기본: 채우기 꺼짐)
  const getComputedFill = (obj: Partial<DrawingObject>) => {
    if (obj.fillEnabled !== true) return "transparent";
    const opacity = obj.fillOpacity ?? 0.75;
    const baseColor = obj.fillColor || "#ef4444";

    if (baseColor.startsWith("rgba")) {
      return baseColor;
    }
    if (baseColor.startsWith("#")) {
      const hex = baseColor.replace("#", "");
      if (hex.length === 6) {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
      }
    }
    return baseColor;
  };

  // 도면 배경 시트 여부 판별 헬퍼
  const isBgSheetObject = (obj: any) => {
    return (
      obj === bgImageRef.current ||
      Boolean(obj?.isBgSheet) ||
      (obj?.sheetId ? bgSheetsMapRef.current.has(obj.sheetId) : false)
    );
  };

  // 스토어 상태 기반으로 캔버스 객체 전체 재생성 (Wires, Components, Annotation Objects)
  const rebuildCanvasObjects = useCallback((targetObjects: DrawingObject[]) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    isRebuildingRef.current = true;

    // 배경 시트들은 절대 지우지 않고 순수 벡터 객체들만 제거
    const objectsToRemove = canvas.getObjects().filter((obj) => !isBgSheetObject(obj));
    objectsToRemove.forEach((obj) => canvas.remove(obj));


    const state = useDrawingStore.getState();
    const dwg = state.currentDrawing;
    const origW = dwg?.originalWidth || 1600;
    const origH = dwg?.originalHeight || 1200;
    const isEditor = useUIStore.getState().editorMode === "editor";
    const isSelect = isEditor && (useUIStore.getState().activeTool === "select" || useUIStore.getState().activeTool === "connector");

    // ==========================================
    // 순수 2D 벡터 그래픽 객체 일원화 렌더링
    // ==========================================
    targetObjects.forEach((dataObj) => {
      const left = denormalizeX(dataObj.x || 0, origW);
      const top = denormalizeY(dataObj.y || 0, origH);
      const width = denormalizeX(dataObj.width || 0, origW);
      const height = denormalizeY(dataObj.height || 0, origH);

      let shape: FabricObject | null = null;
      const strokeDashArray = getStrokeDashArray(dataObj.lineStyle);
      const computedFill = getComputedFill(dataObj);

      // 1. 다각형 (Polygon)
      if (dataObj.type === "polygon") {
        const pts = (dataObj.points && dataObj.points.length >= 3)
          ? dataObj.points.map((p) => ({ x: denormalizeX(p.x, origW), y: denormalizeY(p.y, origH) }))
          : [
              { x: left, y: top },
              { x: left + Math.max(width, 60), y: top },
              { x: left + Math.max(width, 60) / 2, y: top + Math.max(height, 60) },
            ];

        const poly = new Polygon(pts, {
          fill: computedFill,
          stroke: dataObj.strokeColor || "#ec4899",
          strokeWidth: dataObj.strokeWidth || 3,
          strokeDashArray,
          strokeUniform: true,
          selectable: isSelect,
          evented: true,
          hasBorders: false,
          lockMovementX: !isSelect,
          lockMovementY: !isSelect,
          lockScalingX: true,
          lockScalingY: true,
          lockRotation: true,
          padding: 6,
        });

        // 다각형 내부 텍스트 렌더링
        const origPolyRender = poly._render.bind(poly);
        poly._render = function (ctx: CanvasRenderingContext2D) {
          origPolyRender(ctx);
          const textContent = (this as any)._innerShapeText ?? dataObj.text ?? dataObj.label;
          if (textContent && typeof textContent === "string" && textContent.trim()) {
            ctx.save();
            const w = this.width || 40;
            const h = this.height || 40;
            const fontSize = Math.max(11, Math.min(22, Math.min(w * 0.2, h * 0.35)));
            ctx.font = `bold ${fontSize}px Pretendard, -apple-system, sans-serif`;
            ctx.fillStyle = dataObj.textColor || "#ffffff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(textContent, 0, 0);
            ctx.restore();
          }
        };

        createPolygonVertexControls(poly, pts, (updatedPoints) => {
          const normPts = updatedPoints.map((p) => ({
            x: normalizeX(p.x, origW),
            y: normalizeY(p.y, origH),
          }));
          const xs = updatedPoints.map((p) => p.x);
          const ys = updatedPoints.map((p) => p.y);
          const minX = Math.min(...xs);
          const minY = Math.min(...ys);
          const maxX = Math.max(...xs);
          const maxY = Math.max(...ys);

          useDrawingStore.getState().updateObject(dataObj.id, {
            points: normPts,
            x: normalizeX(minX, origW),
            y: normalizeY(minY, origH),
            width: normalizeX(maxX - minX, origW),
            height: normalizeY(maxY - minY, origH),
          });
        });
        shape = poly;
      }

      // 2. 스마트 커넥터 (Connector)
      else if (dataObj.type === "connector") {
        const pts = (dataObj.points && dataObj.points.length >= 2)
          ? dataObj.points.map((p) => ({ x: denormalizeX(p.x, origW), y: denormalizeY(p.y, origH) }))
          : [
              { x: left, y: top },
              { x: left + width, y: top + height },
            ];

        const polyline = new Polyline(pts, {
          fill: "transparent",
          stroke: dataObj.strokeColor || "#6366f1",
          strokeWidth: dataObj.strokeWidth || 3,
          strokeDashArray,
          strokeUniform: true,
          selectable: true,
          evented: true,
          hasBorders: false,
          hasControls: false,
          lockMovementX: true,
          lockMovementY: true,
          lockScalingX: true,
          lockScalingY: true,
          lockRotation: true,
          padding: 8,
          perPixelTargetFind: true,
          targetFindTolerance: 8,
        });

        // 시작/끝 화살표 캡 및 라벨 렌더링
        const originalRender = polyline._render.bind(polyline);
        polyline._render = function (ctx: CanvasRenderingContext2D) {
          originalRender(ctx);
          const curPts = this.points || [];
          if (curPts.length < 2) return;

          const offsetX = (this as any).pathOffset?.x || 0;
          const offsetY = (this as any).pathOffset?.y || 0;
          const currentStrokeW = (this as any).strokeWidth || dataObj.strokeWidth || 3;
          const baseHeadSize = Math.max(10, currentStrokeW * 3.5);
          const scale = (this as any)._arrowScaleRatio ?? dataObj.arrowScaleRatio ?? 1.0;
          const strokeColor = (this as any).stroke || dataObj.strokeColor || "#6366f1";
          const startCap = (this as any)._startCap ?? dataObj.startCap;
          const endCap = (this as any)._endCap ?? dataObj.endCap;

          // 시작점 캡
          if (startCap && startCap !== "none") {
            const p0 = curPts[0];
            const p1 = curPts[1];
            const startAngle = Math.atan2(p0.y - p1.y, p0.x - p1.x);
            renderArrowCap(ctx, p0.x - offsetX, p0.y - offsetY, startAngle, startCap, baseHeadSize, strokeColor, scale);
          }

          // 끝점 캡
          if (endCap && endCap !== "none") {
            const pLast = curPts[curPts.length - 1];
            const pPrev = curPts[curPts.length - 2];
            const endAngle = Math.atan2(pLast.y - pPrev.y, pLast.x - pPrev.x);
            renderArrowCap(ctx, pLast.x - offsetX, pLast.y - offsetY, endAngle, endCap, baseHeadSize, strokeColor, scale);
          }

          // 꺾임점(Joint) 마커 렌더링
          const jointCap = (this as any)._jointCap ?? dataObj.jointCap;
          if (jointCap && jointCap !== "none" && curPts.length > 2) {
            for (let i = 1; i < curPts.length - 1; i++) {
              const pt = curPts[i];
              renderArrowCap(ctx, pt.x - offsetX, pt.y - offsetY, 0, jointCap, baseHeadSize * 0.75, strokeColor, scale);
            }
          }

          // ⚡ 와이어 중간 분기점(Junction Points / T-Junctions) 원형 접점 마커 렌더링
          const junctions = dataObj.branchJunctionPoints || [];
          if (junctions.length > 0) {
            junctions.forEach((j) => {
              const jx = denormalizeX(j.point.x, origW) - offsetX;
              const jy = denormalizeY(j.point.y, origH) - offsetY;
              ctx.save();
              ctx.beginPath();
              ctx.arc(jx, jy, Math.max(5, currentStrokeW * 1.8), 0, Math.PI * 2);
              ctx.fillStyle = strokeColor;
              ctx.fill();
              ctx.lineWidth = 1.5;
              ctx.strokeStyle = "#ffffff";
              ctx.stroke();
              ctx.restore();
            });
          }
        };

        shape = polyline;
      }
      // 3. 선 / 배선 / 다각선 (Wire / Line / Polyline)
      else if (dataObj.type === "wire" || dataObj.type === "line" || dataObj.type === "polyline") {
        const pts = (dataObj.points && dataObj.points.length >= 2)
          ? dataObj.points.map((p) => ({ x: denormalizeX(p.x, origW), y: denormalizeY(p.y, origH) }))
          : [
              { x: left, y: top },
              { x: left + width, y: top + height },
            ];

        const polyline = new Polyline(pts, {
          fill: "transparent",
          stroke: dataObj.strokeColor || "#38bdf8",
          strokeWidth: dataObj.strokeWidth || 3,
          strokeDashArray,
          strokeUniform: true,
          selectable: true,
          evented: true,
          hasBorders: false,
          lockScalingX: true,
          lockScalingY: true,
          lockRotation: true,
          padding: 8,
          perPixelTargetFind: true,
          targetFindTolerance: 8,
        });

        const originalRender = polyline._render.bind(polyline);
        polyline._render = function (ctx: CanvasRenderingContext2D) {
          originalRender(ctx);
          const curPts = this.points || [];
          if (curPts.length < 2) return;
          const offsetX = (this as any).pathOffset?.x || 0;
          const offsetY = (this as any).pathOffset?.y || 0;
          const currentStrokeW = (this as any).strokeWidth || dataObj.strokeWidth || 3;
          const baseHeadSize = Math.max(10, currentStrokeW * 3.5);
          const scale = (this as any)._arrowScaleRatio ?? dataObj.arrowScaleRatio ?? 1.0;
          const strokeColor = (this as any).stroke || dataObj.strokeColor || "#38bdf8";
          const startCap = (this as any)._startCap ?? dataObj.startCap;
          const endCap = (this as any)._endCap ?? dataObj.endCap;

          if (startCap && startCap !== "none") {
            const p0 = curPts[0];
            const p1 = curPts[1];
            const startAngle = Math.atan2(p0.y - p1.y, p0.x - p1.x);
            renderArrowCap(ctx, p0.x - offsetX, p0.y - offsetY, startAngle, startCap, baseHeadSize, strokeColor, scale);
          }
          if (endCap && endCap !== "none") {
            const pLast = curPts[curPts.length - 1];
            const pPrev = curPts[curPts.length - 2];
            const endAngle = Math.atan2(pLast.y - pPrev.y, pLast.x - pPrev.x);
            renderArrowCap(ctx, pLast.x - offsetX, pLast.y - offsetY, endAngle, endCap, baseHeadSize, strokeColor, scale);
          }

          // 꺾임점(Joint) 마커 렌더링
          const jointCap = (this as any)._jointCap ?? dataObj.jointCap;
          if (jointCap && jointCap !== "none" && curPts.length > 2) {
            for (let i = 1; i < curPts.length - 1; i++) {
              const pt = curPts[i];
              renderArrowCap(ctx, pt.x - offsetX, pt.y - offsetY, 0, jointCap, baseHeadSize * 0.75, strokeColor, scale);
            }
          }
        };

        createPolygonVertexControls(polyline, pts, (updatedPoints) => {
          const normPts = updatedPoints.map((p) => ({
            x: normalizeX(p.x, origW),
            y: normalizeY(p.y, origH),
          }));
          const xs = updatedPoints.map((p) => p.x);
          const ys = updatedPoints.map((p) => p.y);
          const minX = Math.min(...xs);
          const minY = Math.min(...ys);
          const maxX = Math.max(...xs);
          const maxY = Math.max(...ys);

          useDrawingStore.getState().updateObject(dataObj.id, {
            points: normPts,
            x: normalizeX(minX, origW),
            y: normalizeY(minY, origH),
            width: normalizeX(maxX - minX, origW),
            height: normalizeY(maxY - minY, origH),
          });
        });
        shape = polyline;
      }
      // 4. 화살표 (Arrow)
      else if (dataObj.type === "arrow") {
        const pts = (dataObj.points && dataObj.points.length >= 2)
          ? dataObj.points.map((p) => ({ x: denormalizeX(p.x, origW), y: denormalizeY(p.y, origH) }))
          : [
              { x: left, y: top },
              { x: left + width, y: top + height },
            ];

        const polyline = new Polyline(pts, {
          fill: "transparent",
          stroke: dataObj.strokeColor || "#10b981",
          strokeWidth: dataObj.strokeWidth || 3,
          strokeDashArray,
          strokeUniform: true,
          selectable: true,
          evented: true,
          hasBorders: false,
          lockScalingX: true,
          lockScalingY: true,
          lockRotation: true,
          padding: 8,
          perPixelTargetFind: true,
          targetFindTolerance: 8,
        });

        const originalRender = polyline._render.bind(polyline);
        polyline._render = function (ctx: CanvasRenderingContext2D) {
          originalRender(ctx);
          const curPts = this.points || [];
          if (curPts.length < 2) return;
          const offsetX = (this as any).pathOffset?.x || 0;
          const offsetY = (this as any).pathOffset?.y || 0;
          const currentStrokeW = (this as any).strokeWidth || dataObj.strokeWidth || 3;
          const baseHeadSize = Math.max(10, currentStrokeW * 3.5);
          const scale = (this as any)._arrowScaleRatio ?? dataObj.arrowScaleRatio ?? 1.0;
          const strokeColor = (this as any).stroke || dataObj.strokeColor || "#10b981";
          const startCap = (this as any)._startCap ?? dataObj.startCap;
          const endCap = (this as any)._endCap ?? dataObj.endCap ?? "arrow";

          if (startCap && startCap !== "none") {
            const p0 = curPts[0];
            const p1 = curPts[1];
            const startAngle = Math.atan2(p0.y - p1.y, p0.x - p1.x);
            renderArrowCap(ctx, p0.x - offsetX, p0.y - offsetY, startAngle, startCap, baseHeadSize, strokeColor, scale);
          }

          const pLast = curPts[curPts.length - 1];
          const pPrev = curPts[curPts.length - 2];
          const endAngle = Math.atan2(pLast.y - pPrev.y, pLast.x - pPrev.x);
          renderArrowCap(ctx, pLast.x - offsetX, pLast.y - offsetY, endAngle, endCap, baseHeadSize, strokeColor, scale);

          // 꺾임점(Joint) 마커 렌더링
          const jointCap = (this as any)._jointCap ?? dataObj.jointCap;
          if (jointCap && jointCap !== "none" && curPts.length > 2) {
            for (let i = 1; i < curPts.length - 1; i++) {
              const pt = curPts[i];
              renderArrowCap(ctx, pt.x - offsetX, pt.y - offsetY, 0, jointCap, baseHeadSize * 0.75, strokeColor, scale);
            }
          }
        };

        createConnectorMorphControls(polyline, pts, (updatedPoints) => {
          const normPts = updatedPoints.map((p) => ({
            x: normalizeX(p.x, origW),
            y: normalizeY(p.y, origH),
          }));
          const xs = updatedPoints.map((p) => p.x);
          const ys = updatedPoints.map((p) => p.y);
          const minX = Math.min(...xs);
          const minY = Math.min(...ys);
          const maxX = Math.max(...xs);
          const maxY = Math.max(...ys);

          useDrawingStore.getState().updateObject(dataObj.id, {
            points: normPts,
            x: normalizeX(minX, origW),
            y: normalizeY(minY, origH),
            width: normalizeX(maxX - minX, origW),
            height: normalizeY(maxY - minY, origH),
          });
        });
        shape = polyline;
      }
      // 5. 하이라이트 (Highlight) - 자유 드로잉 및 점과점 다각선 렌더링
      else if (dataObj.type === "highlight") {
        const pts = (dataObj.points && dataObj.points.length >= 2)
          ? dataObj.points.map((p) => ({ x: denormalizeX(p.x, origW), y: denormalizeY(p.y, origH) }))
          : [
              { x: left, y: top },
              { x: left + width, y: top + height },
            ];

        const polyline = new Polyline(pts, {
          fill: "transparent",
          stroke: dataObj.strokeColor || "#facc15",
          strokeWidth: dataObj.strokeWidth || 20,
          strokeLineCap: "round",
          strokeLineJoin: "round",
          opacity: dataObj.opacity ?? 0.45,
          strokeUniform: true,
          selectable: true,
          evented: true,
          hasBorders: false,
          lockScalingX: true,
          lockScalingY: true,
          lockRotation: true,
          padding: 8,
          perPixelTargetFind: true,
          targetFindTolerance: 8,
        });

        if (dataObj.highlightMode === "point") {
          createPolygonVertexControls(polyline, pts, (updatedPoints) => {
            const normPts = updatedPoints.map((p) => ({
              x: normalizeX(p.x, origW),
              y: normalizeY(p.y, origH),
            }));
            const xs = updatedPoints.map((p) => p.x);
            const ys = updatedPoints.map((p) => p.y);
            const minX = Math.min(...xs);
            const minY = Math.min(...ys);
            const maxX = Math.max(...xs);
            const maxY = Math.max(...ys);

            useDrawingStore.getState().updateObject(dataObj.id, {
              points: normPts,
              x: normalizeX(minX, origW),
              y: normalizeY(minY, origH),
              width: normalizeX(maxX - minX, origW),
              height: normalizeY(maxY - minY, origH),
            });
          });
        }

        shape = polyline;
      }
      // 6. 사각형 / 부품 (Rectangle / Component) - 완벽한 90도 직각 벡터 도형 & 내부 텍스트
      else if (dataObj.type === "component" || dataObj.type === "rectangle") {
        const radius = dataObj.borderRadius ?? 0;
        const rectObj = new Rect({
          left,
          top,
          angle: dataObj.rotation || 0,
          originX: "left",
          originY: "top",
          width: Math.max(width, 1),
          height: Math.max(height, 1),
          fill: computedFill,
          stroke: dataObj.strokeColor || "#6366f1",
          strokeWidth: dataObj.strokeWidth || 2,
          strokeDashArray,
          selectable: isSelect,
          evented: true,
          lockMovementX: !isSelect,
          lockMovementY: !isSelect,
          hasBorders: true,
          hasControls: true,
          borderColor: "#6366f1",
          cornerColor: "#ffffff",
          cornerStrokeColor: "#6366f1",
          cornerStyle: "circle",
          cornerSize: 8,
          transparentCorners: false,
          strokeUniform: true,
          rx: radius,
          ry: radius,
        });

        // 사각형 내부 텍스트 렌더링
        const origRectRender = rectObj._render.bind(rectObj);
        rectObj._render = function (ctx: CanvasRenderingContext2D) {
          origRectRender(ctx);
          const textContent = (this as any)._innerShapeText ?? dataObj.text ?? dataObj.label;
          if (textContent && typeof textContent === "string" && textContent.trim()) {
            ctx.save();
            const w = this.width || 40;
            const h = this.height || 40;
            const fontSize = dataObj.fontSize || Math.max(11, Math.min(24, Math.min(w * 0.22, h * 0.4)));
            ctx.font = `bold ${fontSize}px Pretendard, -apple-system, sans-serif`;
            ctx.fillStyle = dataObj.textColor || "#ffffff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(textContent, 0, 0);
            ctx.restore();
          }
        };

        shape = rectObj;
      }
      // 6. 원 / 타원 (Circle / Ellipse) & 내부 텍스트
      else if (dataObj.type === "circle") {
        const rx = Math.max(width / 2, 1);
        const ry = Math.max(height / 2, 1);
        const ellipseObj = new Ellipse({
          left,
          top,
          rx,
          ry,
          angle: dataObj.rotation || 0,
          originX: "left",
          originY: "top",
          fill: computedFill,
          stroke: dataObj.strokeColor || "#6366f1",
          strokeWidth: dataObj.strokeWidth || 2,
          strokeDashArray,
          selectable: isSelect,
          evented: true,
          lockMovementX: !isSelect,
          lockMovementY: !isSelect,
          hasBorders: true,
          hasControls: true,
          borderColor: "#6366f1",
          cornerColor: "#ffffff",
          cornerStrokeColor: "#6366f1",
          cornerStyle: "circle",
          cornerSize: 8,
          transparentCorners: false,
          strokeUniform: true,
        });

        // 원/타원 내부 텍스트 렌더링
        const origEllipseRender = ellipseObj._render.bind(ellipseObj);
        ellipseObj._render = function (ctx: CanvasRenderingContext2D) {
          origEllipseRender(ctx);
          const textContent = (this as any)._innerShapeText ?? dataObj.text ?? dataObj.label;
          if (textContent && typeof textContent === "string" && textContent.trim()) {
            ctx.save();
            const curRx = (this as any).rx || 20;
            const curRy = (this as any).ry || 20;
            const minR = Math.min(curRx, curRy);
            const fontSize = dataObj.fontSize || Math.max(11, Math.min(24, minR * 0.5));
            ctx.font = `bold ${fontSize}px Pretendard, -apple-system, sans-serif`;
            ctx.fillStyle = dataObj.textColor || "#ffffff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(textContent, 0, 0);
            ctx.restore();
          }
        };

        shape = ellipseObj;
      }
      // 7. 텍스트 노트 (Text Note)
      else if (dataObj.type === "text") {
        const textContent = dataObj.text || dataObj.label || "메모";
        const itext = new IText(textContent, {
          left,
          top,
          angle: dataObj.rotation || 0,
          fontSize: dataObj.fontSize || 16,
          fontFamily: dataObj.fontFamily || "Pretendard, sans-serif",
          fontWeight: dataObj.fontWeight || "normal",
          fontStyle: dataObj.fontStyle || "normal",
          charSpacing: (dataObj.letterSpacing || 0) * 100,
          textAlign: dataObj.textAlign || "left",
          fill: dataObj.textColor || "#ffffff",
          backgroundColor: "transparent",
          padding: 0,
          selectable: isSelect,
          evented: true,
          lockMovementX: !isSelect,
          lockMovementY: !isSelect,
          hasBorders: true,
          hasControls: true,
          borderColor: "#6366f1",
          cornerColor: "#ffffff",
          cornerStrokeColor: "#6366f1",
          cornerStyle: "circle",
          cornerSize: 8,
          transparentCorners: false,
        });

        // 텍스트 박스 커스텀 테두리(Border) & 배경 채우기 & 모서리 곡률(Corner Radius) 렌더링
        const origRender = itext._render.bind(itext);
        itext._render = function (ctx: CanvasRenderingContext2D) {
          const w = this.width || 0;
          const h = this.height || 0;
          const pad = dataObj.padding ?? 8;
          const boxX = -w / 2 - pad;
          const boxY = -h / 2 - pad;
          const boxW = w + pad * 2;
          const boxH = h + pad * 2;
          const rad = Math.min(dataObj.borderRadius ?? 6, boxW / 2, boxH / 2);

          const hasBg = Boolean(dataObj.fillEnabled);
          const hasBorder =
            dataObj.borderEnabled !== false &&
            (dataObj.borderWidth ?? dataObj.strokeWidth ?? 1.5) > 0;

          if (hasBg || hasBorder) {
            ctx.save();
            ctx.beginPath();
            if (rad > 0 && typeof (ctx as any).roundRect === "function") {
              (ctx as any).roundRect(boxX, boxY, boxW, boxH, rad);
            } else {
              ctx.rect(boxX, boxY, boxW, boxH);
            }

            // 1) 테두리 안쪽 배경 채우기
            if (hasBg) {
              ctx.fillStyle = dataObj.fillColor || "#1e1b4b";
              ctx.globalAlpha = dataObj.fillOpacity ?? 0.9;
              ctx.fill();
            }

            // 2) 테두리 선 그리기
            if (hasBorder) {
              ctx.globalAlpha = 1.0;
              ctx.strokeStyle = dataObj.borderColor || dataObj.strokeColor || "#38bdf8";
              ctx.lineWidth = dataObj.borderWidth || 1.5;
              const dash = getStrokeDashArray(dataObj.borderStyle || dataObj.lineStyle);
              if (dash) {
                ctx.setLineDash(dash);
              } else {
                ctx.setLineDash([]);
              }
              ctx.stroke();
            }
            ctx.restore();
          }

          // 글자 색상 보장
          this.fill = dataObj.textColor || "#ffffff";
          origRender(ctx);
        };

        itext.on("changed", () => {
          useDrawingStore.getState().updateObject(dataObj.id, {
            text: itext.text || "",
            width: normalizeX(itext.width || 0, origW),
            height: normalizeY(itext.height || 0, origH),
          });
        });

        shape = itext;
      }


      if (shape) {
        (shape as any).dataId = dataObj.id;
        (shape as any).dataType = dataObj.type;
        (shape as any).dataLabel = dataObj.label;
        if (dataObj.visible === false) {
          shape.visible = false;
          shape.evented = false;
          shape.selectable = false;
        }
        canvas.add(shape);
      }
    });

    const currentSelId = useDrawingStore.getState().selectedObjectId;
    const currentSelIds = useDrawingStore.getState().selectedObjectIds;
    const currentCheckedIds = useDrawingStore.getState().checkedObjectIds;

    const targetIds =
      currentCheckedIds.length > 0
        ? currentCheckedIds
        : currentSelIds.length > 0
        ? currentSelIds
        : currentSelId
        ? [currentSelId]
        : [];

    if (targetIds.length === 1) {
      const target = canvas.getObjects().find((o) => (o as any).dataId === targetIds[0]);
      if (target) {
        canvas.setActiveObject(target);
      }
    } else if (targetIds.length > 1) {
      const targets = canvas.getObjects().filter((o) => targetIds.includes((o as any).dataId));
      if (targets.length > 0) {
        const selection = new ActiveSelection(targets, { canvas });
        selection.setCoords();
        canvas.setActiveObject(selection);
      }
    }

    canvas.requestRenderAll();
    setTimeout(() => {
      isRebuildingRef.current = false;
    }, 60);
  }, []);


  // 연속 패스 드로잉 완료 처리 함수
  const finishPathDrawing = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isPathDrawingRef.current) return;

    const points = [...pathPointsRef.current];
    const curTool = useUIStore.getState().activeTool;
    const isPolygon = curTool === "polygon";

    isPathDrawingRef.current = false;
    pathPointsRef.current = [];
    currentMouseScenePointRef.current = null;
    isSnappedToFirstRef.current = false;
    setPathDrawingHint(null);

    const minPts = isPolygon ? 3 : 2;
    if (points.length < minPts) {
      useUIStore.getState().setActiveTool("select");
      canvas.requestRenderAll();
      return;
    }

    pushState(useDrawingStore.getState().objects);

    const dwg = useDrawingStore.getState().currentDrawing;
    const origW = dwg?.originalWidth || 1600;
    const origH = dwg?.originalHeight || 1200;

    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    const normPoints: NormalizedPoint[] = points.map((p) => ({
      x: normalizeX(p.x, origW),
      y: normalizeY(p.y, origH),
    }));

    let finalType: DrawingObjectType = "wire";
    if (curTool === "connector") finalType = "connector";
    else if (curTool === "polygon") finalType = "polygon";
    else if (curTool === "arrow") finalType = "arrow";
    else if (curTool === "wire" || curTool === "line") finalType = "wire";
    else if (curTool === "polyline") finalType = "polyline";

    const dataId = useDrawingStore.getState().generateNextId(finalType);
    const defaults = useUIStore.getState().toolDefaults;

    let strokeColor = "#6366f1";
    let strokeWidth = 3;
    let lineStyle: "solid" | "dashed" | "dotted" = "solid";
    let fillEnabled = false;
    let fillColor = "#6366f1";
    let fillOpacity = 0.2;
    let startCap: ArrowHeadType = "none";
    let endCap: ArrowHeadType = "none";
    let arrowScaleRatio = 1.0;
    let connectorType: "polyline" | "curve" | "straight" = "polyline";

    if (curTool === "connector") {
      strokeColor = defaults.connector.strokeColor;
      strokeWidth = defaults.connector.strokeWidth;
      lineStyle = defaults.connector.lineStyle;
      startCap = defaults.connector.startCap;
      endCap = defaults.connector.endCap;
      arrowScaleRatio = defaults.connector.arrowScaleRatio || 1.0;
      connectorType = defaults.connector.connectorType || "polyline";
    } else if (curTool === "polygon") {
      strokeColor = defaults.polygon.strokeColor;
      strokeWidth = defaults.polygon.strokeWidth;
      lineStyle = defaults.polygon.lineStyle;
      fillEnabled = defaults.polygon.fillEnabled;
      fillColor = defaults.polygon.fillColor;
      fillOpacity = defaults.polygon.fillOpacity;
    } else if (curTool === "arrow") {
      strokeColor = defaults.arrow.strokeColor;
      strokeWidth = defaults.arrow.strokeWidth;
      lineStyle = defaults.arrow.lineStyle;
      startCap = defaults.arrow.startCap;
      endCap = defaults.arrow.endCap;
      arrowScaleRatio = defaults.arrow.arrowScaleRatio || 1.0;
    } else if (curTool === "highlight") {
      strokeColor = defaults.highlight.strokeColor || "#facc15";
      strokeWidth = defaults.highlight.strokeWidth || 20;
    } else {
      strokeColor = defaults.wire.strokeColor;
      strokeWidth = defaults.wire.strokeWidth;
      lineStyle = defaults.wire.lineStyle;
      startCap = defaults.wire.startCap;
      endCap = defaults.wire.endCap;
    }

    const newObj: DrawingObject = {
      id: dataId,
      projectId: dwg?.projectId || "proj_default",
      drawingId: dwg?.id || "dwg_01",
      type: curTool === "highlight" ? "highlight" : finalType,
      highlightMode: curTool === "highlight" ? "point" : undefined,
      opacity: curTool === "highlight" ? 0.45 : undefined,
      label: `${dataId}`,
      x: normalizeX(minX, origW),
      y: normalizeY(minY, origH),
      width: normalizeX(maxX - minX, origW),
      height: normalizeY(maxY - minY, origH),
      points: normPoints,
      strokeColor,
      strokeWidth,
      lineStyle,
      fillEnabled,
      fillColor,
      fillOpacity,
      startCap,
      endCap,
      arrowScaleRatio,
      connectorType,
      visible: true,
      locked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };


    // 🔗 분기 시작점 자동 그룹화 및 부모 객체 이름 계승 (형광펜 제외)
    if (curTool !== "highlight" && branchStartObjectIdRef.current) {
      const sourceId = branchStartObjectIdRef.current;
      const state = useDrawingStore.getState();
      const allObjs = state.objects;
      const sourceObj = allObjs.find((o) => o.id === sourceId);

      if (sourceObj) {
        // 1) 분기선은 화살표(Arrow) 타입 및 스타일 계승
        newObj.type = "arrow";
        newObj.endCap = "arrow";
        newObj.strokeColor = sourceObj.strokeColor || defaults.arrow.strokeColor;
        newObj.strokeWidth = sourceObj.strokeWidth || defaults.arrow.strokeWidth;
        newObj.lineStyle = sourceObj.lineStyle || defaults.arrow.lineStyle;

        // 2) 부모 객체 명칭 계승 (화살표 1 -> 화살표 1-1, 화살표 1-2)
        const parentName = sourceObj.label || sourceObj.id;
        const existingChildCount = allObjs.filter(
          (o) => o.label?.startsWith(`${parentName}-`) || o.id?.startsWith(`${parentName}-`)
        ).length;
        const branchName = `${parentName}-${existingChildCount + 1}`;
        newObj.id = branchName;
        newObj.label = branchName;

        // 3) 그룹화
        let gid = sourceObj.groupId;
        if (!gid) {
          gid = state.generateNextId("group");
          sourceObj.groupId = gid;
          state.updateObject(sourceObj.id, { groupId: gid });
        }
        newObj.groupId = gid;
      }
      branchStartObjectIdRef.current = null;
    }

    addObject(newObj);
    const nextObjects = useDrawingStore.getState().objects;
    rebuildCanvasObjects(nextObjects);
    setSelectedObjectId(newObj.id);
    useUIStore.getState().setActiveTool("select");
    canvas.requestRenderAll();
  }, [addObject, rebuildCanvasObjects, pushState, setSelectedObjectId]);

  // 기존 객체들의 정점(Points) 중 마우스 부근(스냅 반경)에 있는 정점 탐색 함수
  const findNearbyObjectVertex = useCallback((scenePt: Point, zoom: number, excludeId?: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return null;
    const snapRadius = 24 / (zoom || 1);

    const objects = canvas.getObjects();
    for (const obj of objects) {
      if (isBgSheetObject(obj)) continue;
      const dataId = (obj as any).dataId;
      if (!dataId || (excludeId && dataId === excludeId)) continue;

      const vertices = getObjectSceneVertices(obj);
      for (let i = 0; i < vertices.length; i++) {
        const v = vertices[i];
        const dist = Math.hypot(scenePt.x - v.x, scenePt.y - v.y);
        if (dist <= snapRadius) {
          return {
            point: { x: v.x, y: v.y },
            sourceObjectId: dataId,
            vertexIndex: i,
          };
        }
      }
    }
    return null;
  }, []);

  // 연속 패스 및 자동 연결선 드로잉 취소 함수
  const cancelPathDrawing = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    if (isPathDrawingRef.current || autoConnectingFromRef.current) {
      isPathDrawingRef.current = false;
      pathPointsRef.current = [];
      currentMouseScenePointRef.current = null;
      isSnappedToFirstRef.current = false;
      branchSnapInfoRef.current = null;
      branchStartObjectIdRef.current = null;
      autoConnectingFromRef.current = null;
      autoConnectingTargetRef.current = null;
      setPathDrawingHint(null);
      useUIStore.getState().setActiveTool("select");
      canvas.requestRenderAll();
    }
  }, []);

  // 실행 취소 핸들러
  const handleUndo = useCallback(() => {
    const prevState = undo();
    if (prevState) {
      setObjects(prevState);
      rebuildCanvasObjects(prevState);
    }
  }, [undo, setObjects, rebuildCanvasObjects]);

  // 다시 실행 핸들러
  const handleRedo = useCallback(() => {
    const nextState = redo();
    if (nextState) {
      setObjects(nextState);
      rebuildCanvasObjects(nextState);
    }
  }, [redo, setObjects, rebuildCanvasObjects]);

  // 1. Fabric Canvas 초기화 및 리사이즈
  useEffect(() => {
    if (!canvasElRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 1200;
    const height = containerRef.current.clientHeight || 800;

    FabricObject.ownDefaults.hasBorders = false;
    FabricObject.ownDefaults.borderColor = "transparent";
    FabricObject.ownDefaults.cornerColor = "transparent";
    FabricObject.ownDefaults.cornerStrokeColor = "transparent";
    FabricObject.ownDefaults.cornerSize = 0;
    FabricObject.ownDefaults.transparentCorners = true;
    ActiveSelection.prototype.hasBorders = true;
    ActiveSelection.prototype.hasControls = true;
    ActiveSelection.prototype.borderColor = "rgba(99, 102, 241, 0.9)";
    ActiveSelection.prototype.borderDashArray = [4, 4];
    ActiveSelection.prototype.cornerColor = "#ffffff";
    ActiveSelection.prototype.cornerStrokeColor = "#6366f1";
    ActiveSelection.prototype.cornerStyle = "circle";
    ActiveSelection.prototype.cornerSize = 8;
    ActiveSelection.prototype.transparentCorners = false;
    ActiveSelection.prototype.padding = 6;

    const canvas = new FabricCanvas(canvasElRef.current, {
      width,
      height,
      backgroundColor: "#090d16",
      selection: false,
      preserveObjectStacking: true,
      renderOnAddRemove: true,
      fireRightClick: true,
      stopContextMenu: true,
    });

    fabricCanvasRef.current = canvas;
    if (onCanvasReady) onCanvasReady(canvas);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0 && fabricCanvasRef.current) {
          fabricCanvasRef.current.setDimensions({ width: newW, height: newH });
          fabricCanvasRef.current.requestRenderAll();
        }
      }
    });
    resizeObserver.observe(containerRef.current);

    // 줌 (마우스 휠 - 정확한 마우스 오프셋 중심점 & 회전 각도 완벽 보존)
    canvas.on("mouse:wheel", (opt) => {
      const evt = opt.e as WheelEvent;
      evt.preventDefault();
      evt.stopPropagation();

      const delta = evt.deltaY;
      let currentZoom = useDrawingStore.getState().zoom || 1;
      const zoomFactor = delta < 0 ? 1.15 : 1 / 1.15;
      let newZoom = currentZoom * zoomFactor;

      if (newZoom > 50) newZoom = 50;
      if (newZoom < 0.1) newZoom = 0.1;

      const k = newZoom / currentZoom;
      const px = evt.offsetX;
      const py = evt.offsetY;

      const vpt = canvas.viewportTransform;
      if (vpt) {
        vpt[0] *= k;
        vpt[1] *= k;
        vpt[2] *= k;
        vpt[3] *= k;
        vpt[4] = px + k * (vpt[4] - px);
        vpt[5] = py + k * (vpt[5] - py);
        canvas.setViewportTransform(vpt);
      }

      setZoom(newZoom);
      if (vpt) setPan({ x: vpt[4], y: vpt[5] });
      canvas.requestRenderAll();
    });

    // 실시간 벡터 패스 가이드 및 선택 객체 정점 핸들 렌더링 (after:render)
    canvas.on("after:render", (opt) => {
      const ctx = opt.ctx;
      if (!ctx) return;

      const vpt = canvas.viewportTransform;
      if (!vpt) return;

      ctx.save();
      // 뷰포트 변환 행렬 적용 (씬 좌표계 -> 화면 좌표계)
      ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);

      // A. 연속 벡터 패스 드로잉 중 가이드 및 러버밴드 렌더링
      if (isPathDrawingRef.current && pathPointsRef.current.length > 0) {
        const pts = pathPointsRef.current;
        const currentMouse = currentMouseScenePointRef.current;
        const curTool = useUIStore.getState().activeTool;
        const isPolygon = curTool === "polygon";
        const isArrow = curTool === "arrow";

        // 1. 지금까지 찍힌 정점들을 잇는 실선 경로
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.strokeStyle = isPolygon ? "#ec4899" : isArrow ? "#10b981" : "#38bdf8";
        ctx.lineWidth = 3 / (vpt[0] || 1);
        ctx.stroke();

        // 2. 마지막 점에서 현재 마우스 위치까지의 러버밴드 가이드 선 (점선)
        if (currentMouse) {
          ctx.beginPath();
          ctx.setLineDash([6 / (vpt[0] || 1), 4 / (vpt[0] || 1)]);
          const lastPt = pts[pts.length - 1];
          ctx.moveTo(lastPt.x, lastPt.y);
          ctx.lineTo(currentMouse.x, currentMouse.y);

          // 다각형인 경우, 마우스에서 시작점으로 이어지는 닫힘 가이드 점선도 함께 표시
          if (isPolygon && pts.length >= 2) {
            ctx.lineTo(pts[0].x, pts[0].y);
          }

          ctx.strokeStyle = isPolygon ? "rgba(236, 72, 153, 0.85)" : isArrow ? "rgba(16, 185, 129, 0.85)" : "rgba(56, 189, 248, 0.85)";
          ctx.lineWidth = 2 / (vpt[0] || 1);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // 3. 찍힌 각 정점들 위치에 원형 앵커 포인트 렌더링
        const anchorRadius = 5 / (vpt[0] || 1);
        pts.forEach((p, idx) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, anchorRadius, 0, Math.PI * 2);
          ctx.fillStyle = idx === 0 && isPolygon ? "#22c55e" : "#ec4899";
          ctx.fill();
          ctx.lineWidth = 2 / (vpt[0] || 1);
          ctx.strokeStyle = "#ffffff";
          ctx.stroke();
        });

        // 4. 시작점 자석 스냅 상태일 때 펄스 링 렌더링
        if (isSnappedToFirstRef.current && pts.length >= 2) {
          const snapRadius = 12 / (vpt[0] || 1);
          ctx.beginPath();
          ctx.arc(pts[0].x, pts[0].y, snapRadius, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(34, 197, 94, 0.35)";
          ctx.fill();
          ctx.lineWidth = 2.5 / (vpt[0] || 1);
          ctx.strokeStyle = "#22c55e";
          ctx.stroke();
        }
      }



      // C. 분기점 자석 스냅(Branch Magnet Snap) 상태일 때 시각적 피드백 링 및 접속점 렌더링 (드로잉 모드에서만 표시!)
      const activeToolNow = useUIStore.getState().activeTool;
      if (
        branchSnapInfoRef.current &&
        (isPathDrawingRef.current ||
          activeToolNow === "wire" ||
          activeToolNow === "line" ||
          activeToolNow === "connector" ||
          activeToolNow === "polygon")
      ) {
        const snapPt = branchSnapInfoRef.current.point;
        const zoom = vpt[0] || 1;
        const snapRadius = 10 / zoom;

        // 외곽 펄스 링
        ctx.beginPath();
        ctx.arc(snapPt.x, snapPt.y, snapRadius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(6, 182, 212, 0.3)";
        ctx.fill();
        ctx.lineWidth = 2 / zoom;
        ctx.strokeStyle = "#06b6d4";
        ctx.stroke();

        // 중심 접속점 (Junction Dot)
        ctx.beginPath();
        ctx.arc(snapPt.x, snapPt.y, 4 / zoom, 0, Math.PI * 2);
        ctx.fillStyle = "#22c55e";
        ctx.fill();
        ctx.lineWidth = 1.5 / zoom;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();

        // 라벨 태그 뱃지
        const badgeW = 90 / zoom;
        const badgeH = 20 / zoom;
        ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1 / zoom;
        ctx.beginPath();
        if (typeof (ctx as any).roundRect === "function") {
          (ctx as any).roundRect(snapPt.x + 12 / zoom, snapPt.y - 10 / zoom, badgeW, badgeH, 4 / zoom);
        } else {
          ctx.rect(snapPt.x + 12 / zoom, snapPt.y - 10 / zoom, badgeW, badgeH);
        }
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#38bdf8";
        ctx.font = `bold ${Math.max(10, 11 / zoom)}px sans-serif`;
        ctx.fillText("⚡ 꺾임점 스냅", snapPt.x + 16 / zoom, snapPt.y + 4 / zoom);
      }

      // D. 스마트 객체 간 자동 연결선 (Auto-Connecting Preview) 렌더링
      if (autoConnectingFromRef.current) {
        const from = autoConnectingFromRef.current;
        const zoom = vpt[0] || 1;
        const mousePt = currentMouseScenePointRef.current || from.startPoint;
        const targetSnap = autoConnectingTargetRef.current;
        const endPt = targetSnap ? targetSnap.targetPoint : mousePt;

        // 1) 시작점 하이라이트 (Cyan Pulsing Dot)
        ctx.beginPath();
        ctx.arc(from.startPoint.x, from.startPoint.y, 8 / zoom, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(6, 182, 212, 0.4)";
        ctx.fill();
        ctx.lineWidth = 2 / zoom;
        ctx.strokeStyle = "#06b6d4";
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(from.startPoint.x, from.startPoint.y, 4 / zoom, 0, Math.PI * 2);
        ctx.fillStyle = "#38bdf8";
        ctx.fill();

        // 2) 실시간 자동 라우팅 연결선 (직교 또는 곡선) 프리뷰 그리기
        const pathPts = calculateOrthogonalWirePath(
          from.startPoint,
          endPt,
          [],
          from.startPoint.x < endPt.x ? "right" : "left",
          from.startPoint.x < endPt.x ? "left" : "right"
        );

        ctx.beginPath();
        ctx.moveTo(pathPts[0].x, pathPts[0].y);
        for (let i = 1; i < pathPts.length; i++) {
          ctx.lineTo(pathPts[i].x, pathPts[i].y);
        }
        ctx.strokeStyle = targetSnap ? "#10b981" : "#38bdf8";
        ctx.lineWidth = 2.5 / zoom;
        ctx.setLineDash([6 / zoom, 4 / zoom]);
        ctx.stroke();
        ctx.setLineDash([]);

        // 3) 목표 대상 객체에 스냅된 경우 녹색 타겟 링 & 완료 가이드 뱃지
        if (targetSnap) {
          ctx.beginPath();
          ctx.arc(endPt.x, endPt.y, 10 / zoom, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(16, 185, 129, 0.35)";
          ctx.fill();
          ctx.lineWidth = 2.5 / zoom;
          ctx.strokeStyle = "#10b981";
          ctx.stroke();

          // 타겟 뱃지
          const badgeW = 150 / zoom;
          const badgeH = 22 / zoom;
          ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
          ctx.strokeStyle = "#10b981";
          ctx.lineWidth = 1.5 / zoom;
          ctx.beginPath();
          if (typeof (ctx as any).roundRect === "function") {
            (ctx as any).roundRect(endPt.x + 14 / zoom, endPt.y - 11 / zoom, badgeW, badgeH, 5 / zoom);
          } else {
            ctx.rect(endPt.x + 14 / zoom, endPt.y - 11 / zoom, badgeW, badgeH);
          }
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#34d399";
          ctx.font = `bold ${Math.max(10, 11 / zoom)}px sans-serif`;
          ctx.fillText("🎯 클릭하여 연결선 자동 생성", endPt.x + 18 / zoom, endPt.y + 4 / zoom);
        }
      }

      // E. ✏️ 선/정점 모양 수정 모드 전용 세련된 CAD 스타일 인터랙티브 핸들 렌더링 (호버 시에만 뱃지 표시하여 겹침 방지)
      const editId = vertexEditObjectIdRef.current;
      if (editId) {
        const editObj = canvas.getObjects().find((o) => (o as any).dataId === editId);
        if (editObj) {
          const zoom = vpt[0] || 1;
          const vertices = getObjectSceneVertices(editObj);
          const mousePt = currentMouseScenePointRef.current;
          const isFewPoints = vertices.length <= 4;

          // 마우스가 올려진 정점 인덱스 실시간 탐색
          let hoveredVertexIdx = -1;
          if (mousePt) {
            const hitThreshold = 18 / zoom;
            for (let i = 0; i < vertices.length; i++) {
              if (Math.hypot(mousePt.x - vertices[i].x, mousePt.y - vertices[i].y) <= hitThreshold) {
                hoveredVertexIdx = i;
                break;
              }
            }
          }

          const activeDragIdx = activeVertexDragRef.current ? activeVertexDragRef.current.vertexIndex : -1;

          if (vertices.length >= 2) {
            vertices.forEach((v, idx) => {
              const isStart = idx === 0;
              const isEnd = idx === vertices.length - 1;
              const isHovered = idx === hoveredVertexIdx || idx === activeDragIdx;

              // 깔끔한 핸들 반경: 기본 4.5~5.5px, 호버 시 7.5px
              const handleRadius = (isHovered ? 7.5 : isStart || isEnd ? 5.5 : 4.5) / zoom;

              // 외곽 링
              if (isHovered || isStart || isEnd) {
                ctx.beginPath();
                ctx.arc(v.x, v.y, handleRadius + (isHovered ? 3.5 : 2) / zoom, 0, Math.PI * 2);
                ctx.fillStyle = isStart
                  ? "rgba(34, 197, 94, 0.45)"
                  : isEnd
                  ? "rgba(239, 68, 68, 0.45)"
                  : isHovered
                  ? "rgba(129, 140, 248, 0.5)"
                  : "rgba(99, 102, 241, 0.3)";
                ctx.fill();
              }

              // 중심 핸들 원
              ctx.beginPath();
              ctx.arc(v.x, v.y, handleRadius, 0, Math.PI * 2);
              ctx.fillStyle = isStart ? "#22c55e" : isEnd ? "#ef4444" : isHovered ? "#818cf8" : "#ffffff";
              ctx.fill();
              ctx.lineWidth = (isHovered ? 2 : 1.5) / zoom;
              ctx.strokeStyle = isStart ? "#ffffff" : isEnd ? "#ffffff" : isHovered ? "#ffffff" : "#6366f1";
              ctx.stroke();

              // 🌟 라벨 뱃지는 마우스 호버 중이거나 점이 4개 이하일 때만 단일 표시하여 겹침 완벽 방지!
              if (isHovered || (isFewPoints && (isStart || isEnd))) {
                const label = isStart ? "🟢 시작점" : isEnd ? "🔴 끝점" : `🟣 꺾임점 ${idx}`;
                const tagW = (isStart || isEnd ? 58 : 68) / zoom;
                const tagH = 18 / zoom;
                ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
                ctx.strokeStyle = isStart ? "#22c55e" : isEnd ? "#ef4444" : "#818cf8";
                ctx.lineWidth = 1.2 / zoom;
                ctx.beginPath();
                if (typeof (ctx as any).roundRect === "function") {
                  (ctx as any).roundRect(v.x + 12 / zoom, v.y - 9 / zoom, tagW, tagH, 4 / zoom);
                } else {
                  ctx.rect(v.x + 12 / zoom, v.y - 9 / zoom, tagW, tagH);
                }
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = isStart ? "#86efac" : isEnd ? "#fca5a5" : "#c7d2fe";
                ctx.font = `bold ${Math.max(9, 10.5 / zoom)}px sans-serif`;
                ctx.fillText(label, v.x + 16 / zoom, v.y + 4 / zoom);
              }
            });

            // ➕ 선분 중간 스마트 꺾임점 추가 핸들 (Midpoint Insertion Ghost Handles)
            const segCount = editObj instanceof Polygon ? vertices.length : vertices.length - 1;
            for (let i = 0; i < segCount; i++) {
              const a = vertices[i];
              const b = vertices[(i + 1) % vertices.length];
              const midX = (a.x + b.x) / 2;
              const midY = (a.y + b.y) / 2;

              const isHoveredMid = mousePt && Math.hypot(mousePt.x - midX, mousePt.y - midY) <= 14 / zoom;
              const midRadius = (isHoveredMid ? 6.5 : 4) / zoom;

              // 외곽 링
              ctx.beginPath();
              ctx.arc(midX, midY, midRadius + (isHoveredMid ? 2.5 : 1.5) / zoom, 0, Math.PI * 2);
              ctx.fillStyle = isHoveredMid ? "rgba(56, 189, 248, 0.45)" : "rgba(56, 189, 248, 0.2)";
              ctx.fill();

              // 중심 원
              ctx.beginPath();
              ctx.arc(midX, midY, midRadius, 0, Math.PI * 2);
              ctx.fillStyle = isHoveredMid ? "#38bdf8" : "#0284c7";
              ctx.fill();
              ctx.lineWidth = 1.2 / zoom;
              ctx.strokeStyle = "#ffffff";
              ctx.stroke();

              // ➕ 기호 그리기
              const plusSize = (isHoveredMid ? 3.5 : 2.5) / zoom;
              ctx.beginPath();
              ctx.moveTo(midX - plusSize, midY);
              ctx.lineTo(midX + plusSize, midY);
              ctx.moveTo(midX, midY - plusSize);
              ctx.lineTo(midX, midY + plusSize);
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 1.2 / zoom;
              ctx.stroke();

              // 호버 시 가이드 뱃지
              if (isHoveredMid) {
                const tagW = 96 / zoom;
                const tagH = 18 / zoom;
                ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
                ctx.strokeStyle = "#38bdf8";
                ctx.lineWidth = 1.2 / zoom;
                ctx.beginPath();
                if (typeof (ctx as any).roundRect === "function") {
                  (ctx as any).roundRect(midX + 10 / zoom, midY - 9 / zoom, tagW, tagH, 4 / zoom);
                } else {
                  ctx.rect(midX + 10 / zoom, midY - 9 / zoom, tagW, tagH);
                }
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = "#7dd3fc";
                ctx.font = `bold ${Math.max(9, 10 / zoom)}px sans-serif`;
                ctx.fillText("➕ 꺾임점 추가 & 꺾기", midX + 13 / zoom, midY + 4 / zoom);
              }
            }
          }
        }
      }

      // F. 🎯 선택된 객체들(단일/다중 드래그 선택, 사이드바 선택) 시각적 CAD 하이라이트 박스 및 뱃지 렌더링
      const curSelId = useDrawingStore.getState().selectedObjectId;
      const curSelIds = useDrawingStore.getState().selectedObjectIds;
      const curCheckedIds = useDrawingStore.getState().checkedObjectIds;
      const allSelectedIds = Array.from(
        new Set([
          ...curSelIds,
          ...curCheckedIds,
          ...(curSelId && !curSelId.startsWith("group_") ? [curSelId] : []),
        ])
      );

      if (allSelectedIds.length > 0) {
        const zoom = vpt[0] || 1;
        const allCanvasObjs = canvas.getObjects();
        const matchedCanvasObjs = allCanvasObjs.filter(
          (o) => !isBgSheetObject(o) && allSelectedIds.includes((o as any).dataId)
        );

        if (matchedCanvasObjs.length > 0) {
          matchedCanvasObjs.forEach((fObj) => {
            const dataId = (fObj as any).dataId;
            const stateObj = useDrawingStore.getState().objects.find((o) => o.id === dataId);
            const vertices = getObjectSceneVertices(fObj);
            if (!vertices || vertices.length === 0) return;

            // 1) 객체의 회전각/형태에 100% 일치하는 외곽선 및 반투명 채우기
            ctx.beginPath();
            ctx.moveTo(vertices[0].x, vertices[0].y);
            for (let i = 1; i < vertices.length; i++) {
              ctx.lineTo(vertices[i].x, vertices[i].y);
            }
            if (vertices.length > 2) {
              ctx.closePath();
              ctx.fillStyle = "rgba(56, 189, 248, 0.12)";
              ctx.fill();
            }
            ctx.strokeStyle = "#38bdf8";
            ctx.lineWidth = 1.8 / zoom;
            ctx.setLineDash([5 / zoom, 3 / zoom]);
            ctx.stroke();
            ctx.setLineDash([]);

            // 2) 각 정점 코너에 깔끔한 앵커 포인트 렌더링
            const anchorRadius = 3 / zoom;
            vertices.forEach((v) => {
              ctx.beginPath();
              ctx.arc(v.x, v.y, anchorRadius, 0, Math.PI * 2);
              ctx.fillStyle = "#38bdf8";
              ctx.fill();
              ctx.lineWidth = 1 / zoom;
              ctx.strokeStyle = "#ffffff";
              ctx.stroke();
            });

            // 3) 다중 선택 시 개별 객체 상단에 콤팩트 라벨 뱃지 표시
            if (allSelectedIds.length > 1) {
              const labelText = stateObj?.label || stateObj?.text || dataId;
              const badgeText = `✓ ${labelText}`;
              const badgeW = Math.min(130 / zoom, (badgeText.length * 7.5 + 16) / zoom);
              const badgeH = 16 / zoom;
              const topV = vertices.reduce((min, v) => (v.y < min.y ? v : min), vertices[0]);

              ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
              ctx.strokeStyle = "#0284c7";
              ctx.lineWidth = 1 / zoom;
              ctx.beginPath();
              if (typeof (ctx as any).roundRect === "function") {
                (ctx as any).roundRect(topV.x - badgeW / 2, topV.y - badgeH - 4 / zoom, badgeW, badgeH, 3 / zoom);
              } else {
                ctx.rect(topV.x - badgeW / 2, topV.y - badgeH - 4 / zoom, badgeW, badgeH);
              }
              ctx.fill();
              ctx.stroke();

              ctx.fillStyle = "#38bdf8";
              ctx.font = `bold ${Math.max(8, 9.5 / zoom)}px sans-serif`;
              ctx.fillText(badgeText, topV.x - badgeW / 2 + 5 / zoom, topV.y - 7 / zoom);
            }
          });
        }
      }

      ctx.restore();
    });

    // 호버 이벤트
    canvas.on("mouse:over", (opt) => {
      const target = opt.target;
      if (target && !isBgSheetObject(target)) {
        const dataId = (target as any).dataId;
        const dataType = (target as any).dataType || "객체";
        const matchedObj = useDrawingStore.getState().objects.find((o) => o.id === dataId);

        const pointer = opt.e as MouseEvent;
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setHoverInfo({
            x: pointer.clientX - rect.left,
            y: pointer.clientY - rect.top,
            id: dataId || "객체",
            label: matchedObj?.label || (target as any).dataLabel,
            type: dataType,
            strokeColor: (target as any).stroke,
          });
        }
      }
    });

    canvas.on("mouse:out", () => {
      setHoverInfo(null);
    });

    // ⚡ 객체 이동 중(Drag Move): 캔버스 상의 연결 커넥터 선을 60fps로 부드럽게 실시간 리라우팅 (스토어 재생성 방지)
    canvas.on("object:moving", (opt) => {
      const target = opt.target;
      if (!target || isBgSheetObject(target)) return;
      const dataId = (target as any).dataId;
      if (!dataId) return;

      const allObjs = useDrawingStore.getState().objects;
      const connectedConns = allObjs.filter(
        (o) => o.type === "connector" && (o.fromNodeId === dataId || o.toNodeId === dataId)
      );
      if (connectedConns.length === 0) return;

      const dwg = useDrawingStore.getState().currentDrawing;
      const origW = dwg?.originalWidth || 1600;
      const origH = dwg?.originalHeight || 1200;

      // 대상 객체들의 실시간 캔버스 좌표를 기반으로 연결선 즉시 갱신
      connectedConns.forEach((conn) => {
        const srcData = allObjs.find((o) => o.id === conn.fromNodeId);
        const tgtData = allObjs.find((o) => o.id === conn.toNodeId);
        if (!srcData || !tgtData) return;

        const srcFabric = canvas.getObjects().find((o) => (o as any).dataId === conn.fromNodeId);
        const tgtFabric = canvas.getObjects().find((o) => (o as any).dataId === conn.toNodeId);

        const getFabBounds = (fObj: any, dObj: DrawingObject) => {
          if (fObj) {
            const coords = typeof fObj.getCoords === "function" ? fObj.getCoords() : [];
            if (coords.length > 0) {
              const xs = coords.map((p: any) => p.x);
              const ys = coords.map((p: any) => p.y);
              const minX = Math.min(...xs);
              const maxX = Math.max(...xs);
              const minY = Math.min(...ys);
              const maxY = Math.max(...ys);
              return {
                x: minX / origW,
                y: minY / origH,
                width: (maxX - minX) / origW,
                height: (maxY - minY) / origH,
              };
            }
          }
          return {
            x: dObj.x ?? 0,
            y: dObj.y ?? 0,
            width: dObj.width ?? 0.1,
            height: dObj.height ?? 0.1,
          };
        };

        const liveSrcObj: DrawingObject = { ...srcData, ...getFabBounds(srcFabric, srcData) };
        const liveTgtObj: DrawingObject = { ...tgtData, ...getFabBounds(tgtFabric, tgtData) };

        const { sourceAnchor, targetAnchor } = findOptimalAnchors(liveSrcObj, liveTgtObj, origW, origH);
        const pts = generateConnectorPoints(sourceAnchor, targetAnchor, conn.connectorType || "polyline", origW, origH);

        const connFabric = canvas.getObjects().find((o) => (o as any).dataId === conn.id);
        if (connFabric && (connFabric instanceof Polyline || connFabric instanceof Polygon)) {
          const denormPts = pts.map((p) => ({
            x: denormalizeX(p.x, origW),
            y: denormalizeY(p.y, origH),
          }));
          const xs = denormPts.map((p) => p.x);
          const ys = denormPts.map((p) => p.y);
          const minX = Math.min(...xs);
          const minY = Math.min(...ys);
          const maxX = Math.max(...xs);
          const maxY = Math.max(...ys);
          const width = Math.max(maxX - minX, 1);
          const height = Math.max(maxY - minY, 1);

          connFabric.set({
            points: denormPts,
            left: minX,
            top: minY,
            width: width,
            height: height,
            pathOffset: new Point(minX + width / 2, minY + height / 2),
          });
          connFabric.setCoords();
        }
      });

      canvas.requestRenderAll();
    });

    // ⚡ 객체 이동 완료(Drag End): 스토어에 새 위치 및 연결선 최종 영구 동기화
    canvas.on("object:modified", (opt) => {
      const target = opt.target;
      if (!target || isBgSheetObject(target)) return;
      const dataId = (target as any).dataId;
      if (!dataId) return;

      const dwg = useDrawingStore.getState().currentDrawing;
      const origW = dwg?.originalWidth || 1600;
      const origH = dwg?.originalHeight || 1200;

      const left = target.left || 0;
      const top = target.top || 0;
      const width = target.getScaledWidth ? target.getScaledWidth() : target.width || 0;
      const height = target.getScaledHeight ? target.getScaledHeight() : target.height || 0;

      const normX = left / origW;
      const normY = top / origH;
      const normW = width / origW;
      const normH = height / origH;

      const state = useDrawingStore.getState();
      const existing = state.objects.find((o) => o.id === dataId);
      if (existing) {
        pushState(state.objects);
        if (existing.points && existing.points.length > 0) {
          const curCoords = typeof target.getCoords === "function" ? target.getCoords() : [];
          if (curCoords.length > 0) {
            const xs = curCoords.map((p: any) => p.x);
            const ys = curCoords.map((p: any) => p.y);
            const minX = Math.min(...xs);
            const minY = Math.min(...ys);
            const dx = (minX - denormalizeX(existing.x || 0, origW)) / origW;
            const dy = (minY - denormalizeY(existing.y || 0, origH)) / origH;
            const updatedPts = existing.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
            state.updateObject(dataId, { x: normX, y: normY, width: normW, height: normH, points: updatedPts });
          } else {
            state.updateObject(dataId, { x: normX, y: normY, width: normW, height: normH });
          }
        } else {
          state.updateObject(dataId, { x: normX, y: normY, width: normW, height: normH });
        }
        state.recomputeConnectedLines([dataId]);
      }
    });

    // 우클릭 컨텍스트 메뉴 열기 헬퍼 함수
    const triggerContextMenu = (evt: MouseEvent, clickedOptTarget?: FabricObject) => {
      evt.preventDefault();
      evt.stopPropagation();
      const scenePt = canvas.getScenePoint(evt);
      const zoom = canvas.getZoom() || 1;

      // 1) 클릭된 타겟 탐색: 전달된 opt.target -> canvas.getActiveObject() -> canvas.findTarget -> 주변 근접 객체
      let target = clickedOptTarget && !isBgSheetObject(clickedOptTarget) ? clickedOptTarget : null;
      if (!target) {
        const activeObj = canvas.getActiveObject();
        if (activeObj && !isBgSheetObject(activeObj)) {
          target = activeObj;
        }
      }
      if (!target) {
        const raw = canvas.findTarget(evt) as any;
        const found = raw && raw.target ? raw.target : raw;
        if (found && !isBgSheetObject(found)) {
          target = found;
        }
      }
      // 마우스 커서 부근(35px)의 가장 가까운 객체 자동 탐색 폴백
      if (!target || isBgSheetObject(target)) {
        const allObjs = canvas.getObjects().filter((o) => !isBgSheetObject(o) && (o as any).dataId);
        let bestDist = 35 / zoom;
        for (const obj of allObjs) {
          const closestPt = getClosestPointOnObjectBoundary(scenePt, obj);
          const dist = Math.hypot(scenePt.x - closestPt.x, scenePt.y - closestPt.y);
          if (dist < bestDist) {
            bestDist = dist;
            target = obj;
          }
        }
      }

      const dataId = target && !isBgSheetObject(target) ? (target as any).dataId : undefined;

      let branchPoint: { x: number; y: number } | undefined = undefined;
      let pointType: "start" | "end" | "mid" | "body" | "shape" = "body";
      let pointLabel = "선로";

      if (dataId && target) {
        setSelectedObjectId(dataId);
        setSelectedObjectIds([dataId]);
        canvas.setActiveObject(target as FabricObject);
        canvas.requestRenderAll();

        // 선/도형 위의 가장 가까운 경계선상 지점으로 정밀 투영
        const projectedOnEdge = getClosestPointOnObjectBoundary(scenePt, target);
        branchPoint = projectedOnEdge;

        const vertices = getObjectSceneVertices(target);

        if (vertices.length >= 2) {
          const p1 = vertices[0];
          const pEnd = vertices[vertices.length - 1];
          const distToP1 = Math.hypot(scenePt.x - p1.x, scenePt.y - p1.y);
          const distToEnd = Math.hypot(scenePt.x - pEnd.x, scenePt.y - pEnd.y);

          let closestV = vertices[0];
          let minDist = Math.hypot(scenePt.x - closestV.x, scenePt.y - closestV.y);
          for (let i = 1; i < vertices.length; i++) {
            const v = vertices[i];
            const d = Math.hypot(scenePt.x - v.x, scenePt.y - v.y);
            if (d < minDist) {
              minDist = d;
              closestV = v;
            }
          }

          if (distToP1 <= 24 / zoom) {
            pointType = "start";
            pointLabel = "시작점";
            branchPoint = { x: p1.x, y: p1.y };
          } else if (distToEnd <= 24 / zoom) {
            pointType = "end";
            pointLabel = "끝점";
            branchPoint = { x: pEnd.x, y: pEnd.y };
          } else if (minDist <= 24 / zoom) {
            pointType = "mid";
            pointLabel = "중간 꺾임점";
            branchPoint = { x: closestV.x, y: closestV.y };
          } else {
            pointType = "body";
            pointLabel = "선로";
          }
        } else {
          pointType = "shape";
          pointLabel = "도형 테두리";
        }
      } else if (branchSnapInfoRef.current) {
        branchPoint = branchSnapInfoRef.current.point;
      }

      // 전역 뷰포트 기준 좌표로 안전하게 클램핑 (화면 밖으로 나가지 않음)
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      const menuW = 260;
      const menuH = 340;

      setContextMenu({
        x: Math.max(10, Math.min(evt.clientX, winW - menuW)),
        y: Math.max(10, Math.min(evt.clientY, winH - menuH)),
        objectId: dataId || branchSnapInfoRef.current?.sourceObjectId,
        branchPoint: branchPoint || (dataId ? { x: scenePt.x, y: scenePt.y } : undefined),
        pointType,
        pointLabel,
      });
    };

    // 마우스 더블클릭: 선/도형 꺾임점/정점 수정 모드 즉시 진입
    canvas.on("mouse:dblclick", (opt) => {
      const target = opt.target;
      if (!target || isBgSheetObject(target)) return;
      const dataId = (target as any).dataId;
      if (!dataId) return;

      const allObjs = useDrawingStore.getState().objects;
      const targetObj = allObjs.find((o) => o.id === dataId);
      if (targetObj && targetObj.type !== "text") {
        vertexEditObjectIdRef.current = dataId;
        setVertexEditObjectId(dataId);
        useUIStore.getState().setActiveTool("select");
        setPathDrawingHint("✏️ 선/꺾임점 수정 모드: 🔵 점 드래그로 조절 | ➕ 클릭으로 꺾임점 추가 | Del 키로 점 삭제 (Enter: 완료)");
        canvas.requestRenderAll();
      }
    });

    // 마우스 다운
    canvas.on("mouse:down", (opt) => {
      const evt = opt.e as MouseEvent;
      const curMode = useUIStore.getState().editorMode;
      const curTool = useUIStore.getState().activeTool;

      // 0) 우클릭 시 컨텍스트 메뉴 즉시 실행
      const isRightClick = (opt as any).button === 3 || evt.button === 2;
      if (isRightClick) {
        const clickedTarget = opt.target && !isBgSheetObject(opt.target) ? opt.target : undefined;
        triggerContextMenu(evt, clickedTarget);
        return;
      }

      setContextMenu(null);

      // ✏️ 선/정점 수정 모드 상태에서 점 조작 또는 ➕ 중간 꺾임점 추가 처리
      if (vertexEditObjectIdRef.current && evt.button === 0) {
        const editId = vertexEditObjectIdRef.current;
        const editObj = canvas.getObjects().find((o) => (o as any).dataId === editId);
        if (editObj) {
          // Fabric의 기본 전체 객체 이동(Drag Transform)을 취소하여 다른 점들이 따라 움직이지 않도록 완전 분리!
          (canvas as any)._currentTransform = null;
          editObj.selectable = false;
          canvas.discardActiveObject();

          const scenePt = canvas.getScenePoint(evt);
          const zoom = canvas.getZoom() || 1;
          const vertices = getObjectSceneVertices(editObj);
          const dwg = useDrawingStore.getState().currentDrawing;
          const origW = dwg?.originalWidth || 1600;
          const origH = dwg?.originalHeight || 1200;

          // 1) 기존 정점 클릭 -> 드래그 조작
          const hitRadius = 24 / zoom;
          let hitIdx = -1;
          for (let i = 0; i < vertices.length; i++) {
            if (Math.hypot(scenePt.x - vertices[i].x, scenePt.y - vertices[i].y) <= hitRadius) {
              hitIdx = i;
              break;
            }
          }

          if (hitIdx >= 0) {
            pushState(useDrawingStore.getState().objects);
            activeVertexDragRef.current = {
              object: editObj,
              vertexIndex: hitIdx,
              initialScenePoints: vertices,
            };
            (canvas as any)._currentTransform = null;
            canvas.requestRenderAll();
            return;
          }

          // 2) ➕ 선분 중간 스마트 추가 핸들 클릭 -> 새로운 꺾임점 삽입 후 즉시 드래그 변형!
          const midHitRadius = 18 / zoom;
          const segCount = editObj instanceof Polygon ? vertices.length : vertices.length - 1;
          let insertSegmentIdx = -1;
          let insertPt = { x: scenePt.x, y: scenePt.y };

          for (let i = 0; i < segCount; i++) {
            const a = vertices[i];
            const b = vertices[(i + 1) % vertices.length];
            const midX = (a.x + b.x) / 2;
            const midY = (a.y + b.y) / 2;
            if (Math.hypot(scenePt.x - midX, scenePt.y - midY) <= midHitRadius) {
              insertSegmentIdx = i;
              insertPt = { x: scenePt.x, y: scenePt.y };
              break;
            }
          }

          if (insertSegmentIdx >= 0) {
            pushState(useDrawingStore.getState().objects);
            const state = useDrawingStore.getState();
            const matched = state.objects.find((o) => o.id === editId);
            if (matched && matched.points) {
              const newPoints = [...matched.points];
              const newNormPt = {
                x: normalizeX(insertPt.x, origW),
                y: normalizeY(insertPt.y, origH),
              };
              newPoints.splice(insertSegmentIdx + 1, 0, newNormPt);
              state.updateObject(editId, { points: newPoints });

              const denormPts = newPoints.map((p) => ({
                x: denormalizeX(p.x, origW),
                y: denormalizeY(p.y, origH),
              }));

              if (editObj instanceof Polyline || editObj instanceof Polygon) {
                const xs = denormPts.map((p) => p.x);
                const ys = denormPts.map((p) => p.y);
                const minX = Math.min(...xs);
                const minY = Math.min(...ys);
                const maxX = Math.max(...xs);
                const maxY = Math.max(...ys);
                const width = Math.max(maxX - minX, 1);
                const height = Math.max(maxY - minY, 1);

                editObj.set({
                  points: denormPts,
                  left: minX,
                  top: minY,
                  width: width,
                  height: height,
                  pathOffset: new Point(minX + width / 2, minY + height / 2),
                });
                editObj.setCoords();
              }

              activeVertexDragRef.current = {
                object: editObj,
                vertexIndex: insertSegmentIdx + 1,
                initialScenePoints: denormPts,
              };
              canvas.requestRenderAll();
              return;
            }
          }
        }
      }

      // 스마트 객체 간 자동 연결선 (Object-to-Object Auto-Connecting) 완성 처리
      if (autoConnectingFromRef.current && evt.button === 0) {
        const from = autoConnectingFromRef.current;
        const target = autoConnectingTargetRef.current;

        if (target) {
          pushState(useDrawingStore.getState().objects);
          const dwg = useDrawingStore.getState().currentDrawing;
          const origW = dwg?.originalWidth || 1600;
          const origH = dwg?.originalHeight || 1200;
          const id = useDrawingStore.getState().generateNextId("connector");

          const pathPts = calculateOrthogonalWirePath(
            from.startPoint,
            target.targetPoint,
            [],
            from.startPoint.x < target.targetPoint.x ? "right" : "left",
            from.startPoint.x < target.targetPoint.x ? "left" : "right"
          );

          const normPoints = pathPts.map((p) => ({
            x: normalizeX(p.x, origW),
            y: normalizeY(p.y, origH),
          }));

          const xs = pathPts.map((p) => p.x);
          const ys = pathPts.map((p) => p.y);
          const minX = Math.min(...xs);
          const minY = Math.min(...ys);
          const maxX = Math.max(...xs);
          const maxY = Math.max(...ys);

          const defaults = useUIStore.getState().toolDefaults.connector;

          const newConnectorObj: DrawingObject = {
            id,
            projectId: dwg?.projectId || "proj_default",
            drawingId: dwg?.id || "dwg_01",
            type: "connector",
            label: `연결선 ${id}`,
            x: normalizeX(minX, origW),
            y: normalizeY(minY, origH),
            width: normalizeX(maxX - minX, origW),
            height: normalizeY(maxY - minY, origH),
            points: normPoints,
            strokeColor: defaults.strokeColor || "#38bdf8",
            strokeWidth: defaults.strokeWidth || 2.5,
            lineStyle: defaults.lineStyle || "solid",
            startCap: "circle",
            endCap: "arrow",
            arrowScaleRatio: 1.0,
            connectorType: "polyline",
            visible: true,
            locked: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const allObjs = useDrawingStore.getState().objects;
          const srcObj = allObjs.find((o) => o.id === from.sourceObjectId);
          const tgtObj = allObjs.find((o) => o.id === target.targetObjectId);

          let finalGroupId = srcObj?.groupId || tgtObj?.groupId;
          if (!finalGroupId) {
            finalGroupId = useDrawingStore.getState().generateNextId("group");
          }

          if (srcObj) srcObj.groupId = finalGroupId;
          if (tgtObj) tgtObj.groupId = finalGroupId;
          newConnectorObj.groupId = finalGroupId;

          if (srcObj) useDrawingStore.getState().updateObject(srcObj.id, { groupId: finalGroupId });
          if (tgtObj) useDrawingStore.getState().updateObject(tgtObj.id, { groupId: finalGroupId });

          addObject(newConnectorObj);
          rebuildCanvasObjects([...useDrawingStore.getState().objects, newConnectorObj]);
          setSelectedObjectId(id);

          setPathDrawingHint("✅ 스마트 연결선이 성공적으로 생성되었습니다!");
          setTimeout(() => setPathDrawingHint(null), 3000);
        }

        autoConnectingFromRef.current = null;
        autoConnectingTargetRef.current = null;
        canvas.requestRenderAll();
        return;
      }

      // 1) 팬(Pan) 모드 동작 (휠클릭, Alt+드래그, 또는 전용 Pan 도구)
      const isPanMode = evt.button === 1 || evt.altKey || curTool === "pan";

      if (isPanMode) {
        isPanningRef.current = true;
        canvas.selection = false;
        lastPanPosRef.current = { x: evt.clientX, y: evt.clientY };
        return;
      }


      // ⚡ 스마트 커넥터 중간 분기선(Branch Tap) 대상 객체 클릭 완성 처리
      if (pendingBranchSourceRef.current && evt.button === 0) {
        const target = opt.target;
        if (target && !isBgSheetObject(target) && (target as any).dataId) {
          const childId = (target as any).dataId;
          const { connectorId, clickPoint } = pendingBranchSourceRef.current;
          if (childId !== connectorId) {
            pushState(useDrawingStore.getState().objects);
            const dwg = useDrawingStore.getState().currentDrawing;
            const origW = dwg?.originalWidth || 1600;
            const origH = dwg?.originalHeight || 1200;
            const normPt = { x: normalizeX(clickPoint.x, origW), y: normalizeY(clickPoint.y, origH) };
            useDrawingStore.getState().addBranchConnector(connectorId, normPt, childId);
            setPathDrawingHint("✅ 스마트 중간 분기선(Branch Connector)이 생성되었습니다!");
            setTimeout(() => setPathDrawingHint(null), 3000);
            pendingBranchSourceRef.current = null;
            canvas.defaultCursor = "default";
            canvas.requestRenderAll();
            return;
          }
        }
      }

      // 2) 선택(Select) 및 스마트 커넥터(Connector) 도구 동작 -> 객체 선택 및 마키 다중 선택
      if ((curTool === "select" || curTool === "connector") && evt.button === 0) {
        const target = opt.target;
        // 2-1) 일반 객체를 직접 클릭한 경우 -> 단일/다중 클릭 선택 처리
        if (target && !isBgSheetObject(target) && (target as any).dataId) {
          return;
        }

        // 2-2) 빈 캔버스 또는 배경 영역을 클릭한 경우 -> CAD 마키 박스 드래그 다중 선택 시작
        isMarqueeSelectingRef.current = true;
        const scenePt = canvas.getScenePoint(evt);
        marqueeStartPtRef.current = { x: scenePt.x, y: scenePt.y };

        if (!selectionBoxRef.current) {
          const zoom = canvas.getZoom() || 1;
          const selBox = new Rect({
            left: scenePt.x,
            top: scenePt.y,
            originX: "left",
            originY: "top",
            width: 0,
            height: 0,
            fill: "rgba(99, 102, 241, 0.15)",
            stroke: "#6366f1",
            strokeWidth: 1.5 / zoom,
            selectable: false,
            evented: false,
            excludeFromExport: true,
            visible: false,
          });
          (selBox as any).isSelectionBox = true;
          selectionBoxRef.current = selBox;
          canvas.add(selBox);
        }
        return;
      }

      // 3) 편집 모드 그리기 도구 동작
      if (curMode === "editor") {

        let scenePt = canvas.getScenePoint(evt);
        if (branchSnapInfoRef.current) {
          scenePt = new Point(branchSnapInfoRef.current.point.x, branchSnapInfoRef.current.point.y);
        }
        const defaults = useUIStore.getState().toolDefaults;

        // A. 벡터 패스 드로잉 도구 (선/배선, 다각형, 화살표, 폴리라인, 커넥터)
        // A. 벡터 패스 드로잉 도구 (선/배선, 다각형, 화살표, 폴리라인, 커넥터, 또는 형광펜 점과 점 모드)
        const isHighlightPointMode = curTool === "highlight" && useUIStore.getState().highlightMode === "point";
        if (curTool === "wire" || curTool === "line" || curTool === "polyline" || curTool === "polygon" || curTool === "arrow" || curTool === "connector" || isHighlightPointMode) {
          const isPolygon = curTool === "polygon";
          const isArrow = curTool === "arrow";
          const isConnector = curTool === "connector";
          const isHighlight = curTool === "highlight";

          if (isShiftPressedRef.current && pathPointsRef.current.length > 0) {
            const lastPt = pathPointsRef.current[pathPointsRef.current.length - 1];
            const dx = scenePt.x - lastPt.x;
            const dy = scenePt.y - lastPt.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 0) {
              const angle = Math.atan2(dy, dx);
              const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
              scenePt = new Point(lastPt.x + dist * Math.cos(snapAngle), lastPt.y + dist * Math.sin(snapAngle));
            }
          }

          if (isPathDrawingRef.current) {
            const firstPt = pathPointsRef.current[0];
            const zoom = canvas.getZoom() || 1;
            const distToFirst = Math.hypot(scenePt.x - firstPt.x, scenePt.y - firstPt.y);

            // 시작점 부근을 클릭하면 다각형 닫고 완성!
            if (isPolygon && pathPointsRef.current.length >= 2 && distToFirst <= 22 / zoom) {
              finishPathDrawing();
              return;
            }

            pathPointsRef.current.push({ x: scenePt.x, y: scenePt.y });
            currentMouseScenePointRef.current = { x: scenePt.x, y: scenePt.y };

            // 단일 화살표, 선, 커넥터는 2번째 점 클릭 시 즉시 객체 완성!
            if ((isArrow || curTool === "line" || isConnector) && pathPointsRef.current.length >= 2) {
              finishPathDrawing();
              return;
            }

            canvas.requestRenderAll();
          } else {
            // 패스 드로잉 시작 (형광펜 제외한 도구만 분기 스냅 부모 추적)
            isPathDrawingRef.current = true;
            if (!isHighlight && branchSnapInfoRef.current) {
              branchStartObjectIdRef.current = branchSnapInfoRef.current.sourceObjectId;
            } else {
              branchStartObjectIdRef.current = null;
            }
            pathPointsRef.current = [{ x: scenePt.x, y: scenePt.y }];
            currentMouseScenePointRef.current = { x: scenePt.x, y: scenePt.y };
            isSnappedToFirstRef.current = false;

            setPathDrawingHint(
              isPolygon
                ? "점 클릭: 정점 추가 | 시작점 클릭 or Enter: 다각형 완성 | Esc: 취소 | Shift: 45° 직교"
                : isArrow
                ? "점 클릭: 정점 추가 | 더블클릭 or Enter: 화살표 완성 | Esc: 취소 | Shift: 45° 직교"
                : isConnector
                ? "점 클릭: 연결점 추가 | 더블클릭 or Enter: 커넥터 완성 | Esc: 취소 | Shift: 45° 직교"
                : isHighlight
                ? "점 클릭: 정점 추가 | 더블클릭 or Enter: 형광펜 완성 | Esc: 취소"
                : "점 클릭: 정점 추가 | 더블클릭 or Enter: 선 패스 완성 | Esc: 취소 | Shift: 45° 직교"
            );
            canvas.requestRenderAll();
          }
          return;
        }

        // B. 형광펜 자유 그리기 모드 (Freehand Stroke)
        if (curTool === "highlight") {
          const d = defaults.highlight;
          isFreehandDrawingRef.current = true;
          freehandPointsRef.current = [{ x: scenePt.x, y: scenePt.y }];
          const hlPreview = new Polyline(
            [{ x: scenePt.x, y: scenePt.y }, { x: scenePt.x, y: scenePt.y }],
            {
              fill: "transparent",
              stroke: d.strokeColor || "#facc15",
              strokeWidth: d.strokeWidth || 20,
              strokeLineCap: "round",
              strokeLineJoin: "round",
              opacity: 0.45,
              strokeUniform: true,
              selectable: false,
              evented: false,
            }
          );
          freehandPreviewRef.current = hlPreview;
          canvas.add(hlPreview);
          return;
        }

        // C. 사각형, 원, 텍스트 그리기 도구
        isDrawingRef.current = true;
        drawStartPointRef.current = { x: scenePt.x, y: scenePt.y };

        const id = useDrawingStore.getState().generateNextId(curTool);

        if (curTool === "component" || curTool === "rect") {
          const isComp = curTool === "component";
          const d = isComp ? defaults.component : defaults.rect;
          const rect = new Rect({
            left: scenePt.x,
            top: scenePt.y,
            originX: "left",
            originY: "top",
            width: 0,
            height: 0,
            fill: getComputedFill({ fillEnabled: d.fillEnabled, fillColor: d.fillColor, fillOpacity: d.fillOpacity }),
            stroke: d.strokeColor,
            strokeWidth: d.strokeWidth,
            strokeUniform: true,
            rx: d.borderRadius || 0,
            ry: d.borderRadius || 0,
            selectable: false,
            evented: false,
          });
          (rect as any).dataId = id;
          (rect as any).dataType = isComp ? "component" : "rectangle";
          currentShapeRef.current = rect;
          canvas.add(rect);
        } else if (curTool === "circle") {
          const d = defaults.circle;
          const ellipse = new Ellipse({
            left: scenePt.x,
            top: scenePt.y,
            originX: "left",
            originY: "top",
            rx: 0,
            ry: 0,
            fill: getComputedFill({ fillEnabled: d.fillEnabled, fillColor: d.fillColor, fillOpacity: d.fillOpacity }),
            stroke: d.strokeColor,
            strokeWidth: d.strokeWidth,
            strokeUniform: true,
            selectable: false,
            evented: false,
          });
          (ellipse as any).dataId = id;
          (ellipse as any).dataType = "circle";
          currentShapeRef.current = ellipse;
          canvas.add(ellipse);
        } else if (curTool === "text") {
          const d = defaults.text;
          const rect = new Rect({
            left: scenePt.x,
            top: scenePt.y,
            originX: "left",
            originY: "top",
            width: 0,
            height: 0,
            fill: (d as any).fillEnabled ? ((d as any).fillColor || "#1e1b4b") : "rgba(99, 102, 241, 0.15)",
            stroke: d.strokeColor || "#38bdf8",
            strokeWidth: 1.5,
            strokeDashArray: [4, 4],
            strokeUniform: true,
            rx: 6,
            ry: 6,
            selectable: false,
            evented: false,
          });
          (rect as any).dataId = id;
          (rect as any).dataType = "text";
          currentShapeRef.current = rect;
          canvas.add(rect);
        }
      }
    });

    // 마우스 무브
    canvas.on("mouse:move", (opt) => {
      const evt = opt.e as MouseEvent;

      if (isPanningRef.current) {
        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] += evt.clientX - lastPanPosRef.current.x;
          vpt[5] += evt.clientY - lastPanPosRef.current.y;
          canvas.requestRenderAll();
          setPan({ x: vpt[4], y: vpt[5] });
        }
        lastPanPosRef.current = { x: evt.clientX, y: evt.clientY };
        return;
      }

      // 🖍️ 형광펜 자유 드로잉 실시간 궤적 갱신
      if (isFreehandDrawingRef.current) {
        const scenePt = canvas.getScenePoint(evt);
        const pts = freehandPointsRef.current;
        const lastPt = pts[pts.length - 1];
        if (!lastPt || Math.hypot(scenePt.x - lastPt.x, scenePt.y - lastPt.y) > 2) {
          pts.push({ x: scenePt.x, y: scenePt.y });
          if (freehandPreviewRef.current) {
            freehandPreviewRef.current.set({ points: [...pts] });
            canvas.requestRenderAll();
          }
        }
        return;
      }

      // 0) 정점(시작점/끝점/꺾임점) 직접 드래그 조작 중인 경우 -> 실시간 정밀 좌표 수정
      if (activeVertexDragRef.current) {
        const { object, vertexIndex } = activeVertexDragRef.current;
        let scenePt = canvas.getScenePoint(evt);
        const dataId = (object as any).dataId;
        const dwg = useDrawingStore.getState().currentDrawing;
        const origW = dwg?.originalWidth || 1600;
        const origH = dwg?.originalHeight || 1200;

        if (dataId) {
          const state = useDrawingStore.getState();
          const matched = state.objects.find((o) => o.id === dataId);
          if (matched && matched.points) {
            const zoom = canvas.getZoom() || 1;
            const isStart = vertexIndex === 0;
            const isEnd = vertexIndex === matched.points.length - 1;

            // A. 시작점 또는 끝점 이동 시: 부모/자식 객체 또는 근처 연결 객체의 테두리(Boundary Edge) 선상으로 슬라이딩 구속!
            if (isStart) {
              let targetParentObj: FabricObject | null = null;
              if (matched.fromNodeId) {
                targetParentObj = canvas.getObjects().find((o) => (o as any).dataId === matched.fromNodeId) || null;
              }
              if (!targetParentObj) {
                const candidates = canvas.getObjects().filter((o) => !isBgSheetObject(o) && (o as any).dataId !== dataId);
                for (const cand of candidates) {
                  const bPt = getClosestPointOnObjectBoundary(scenePt, cand);
                  if (Math.hypot(scenePt.x - bPt.x, scenePt.y - bPt.y) <= 60 / zoom || (typeof cand.containsPoint === "function" && cand.containsPoint(scenePt))) {
                    targetParentObj = cand;
                    break;
                  }
                }
              }
              if (targetParentObj) {
                const bPt = getClosestPointOnObjectBoundary(scenePt, targetParentObj);
                scenePt = new Point(bPt.x, bPt.y);
              }
            } else if (isEnd) {
              let targetChildObj: FabricObject | null = null;
              if (matched.toNodeId) {
                targetChildObj = canvas.getObjects().find((o) => (o as any).dataId === matched.toNodeId) || null;
              }
              if (!targetChildObj) {
                const candidates = canvas.getObjects().filter((o) => !isBgSheetObject(o) && (o as any).dataId !== dataId);
                for (const cand of candidates) {
                  const bPt = getClosestPointOnObjectBoundary(scenePt, cand);
                  if (Math.hypot(scenePt.x - bPt.x, scenePt.y - bPt.y) <= 60 / zoom || (typeof cand.containsPoint === "function" && cand.containsPoint(scenePt))) {
                    targetChildObj = cand;
                    break;
                  }
                }
              }
              if (targetChildObj) {
                const bPt = getClosestPointOnObjectBoundary(scenePt, targetChildObj);
                scenePt = new Point(bPt.x, bPt.y);
              }
            }

            // B. 중간 꺾임점 또는 부모/자식 외곽선 밖일 때 자석 스냅핑 (스냅이 활성화되어 있고 드래그 중인 다른 정점에 근접했을 때)
            if (useUIStore.getState().isSnappingEnabled && !isStart && !isEnd) {
              const nearbySnap = findNearbyObjectVertex(scenePt, zoom, dataId);
              if (nearbySnap) {
                scenePt = new Point(nearbySnap.point.x, nearbySnap.point.y);
              }
            }

            // C. Shift 키 직교 스냅 (인접 정점 기준 45도 / 90도 / 180도 고정)
            if (isShiftPressedRef.current && matched.points.length >= 2) {
              const refIdx = vertexIndex > 0 ? vertexIndex - 1 : 1;
              const refNormPt = matched.points[refIdx];
              if (refNormPt) {
                const refScenePt = {
                  x: denormalizeX(refNormPt.x, origW),
                  y: denormalizeY(refNormPt.y, origH),
                };
                const dx = scenePt.x - refScenePt.x;
                const dy = scenePt.y - refScenePt.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 0) {
                  const angle = Math.atan2(dy, dx);
                  const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
                  scenePt = new Point(
                    refScenePt.x + dist * Math.cos(snapAngle),
                    refScenePt.y + dist * Math.sin(snapAngle)
                  );
                }
              }
            }

            const newPoints = matched.points.map((p, idx) => {
              if (idx === vertexIndex) {
                return {
                  x: normalizeX(scenePt.x, origW),
                  y: normalizeY(scenePt.y, origH),
                };
              }
              return p;
            });

            const denormPts = newPoints.map((p) => ({
              x: denormalizeX(p.x, origW),
              y: denormalizeY(p.y, origH),
            }));

            const xs = denormPts.map((p) => p.x);
            const ys = denormPts.map((p) => p.y);
            const minX = Math.min(...xs);
            const minY = Math.min(...ys);
            const maxX = Math.max(...xs);
            const maxY = Math.max(...ys);
            const width = Math.max(maxX - minX, 1);
            const height = Math.max(maxY - minY, 1);

            state.updateObject(dataId, {
              points: newPoints,
              x: normalizeX(minX, origW),
              y: normalizeY(minY, origH),
              width: normalizeX(width, origW),
              height: normalizeY(height, origH),
            });

            (object as any)._scenePoints = [...denormPts];

            if (object instanceof Polyline || object instanceof Polygon) {
              object.set({
                points: denormPts,
                left: minX,
                top: minY,
                width: width,
                height: height,
                pathOffset: new Point(minX + width / 2, minY + height / 2),
              });
              object.setCoords();
            } else if (object instanceof Line) {
              if (vertexIndex === 0) {
                object.set({ x1: denormPts[0].x, y1: denormPts[0].y });
              } else {
                object.set({ x2: denormPts[1].x, y2: denormPts[1].y });
              }
              object.setCoords();
            }
          }
        }
        canvas.requestRenderAll();
        return;
      }

      // 🔲 CAD 마키 박스 드래그 선택 중 실시간 박스 갱신
      if (isMarqueeSelectingRef.current && marqueeStartPtRef.current && selectionBoxRef.current) {
        const scenePt = canvas.getScenePoint(evt);
        const startPt = marqueeStartPtRef.current;
        const left = Math.min(startPt.x, scenePt.x);
        const top = Math.min(startPt.y, scenePt.y);
        const width = Math.abs(scenePt.x - startPt.x);
        const height = Math.abs(scenePt.y - startPt.y);
        const zoom = canvas.getZoom() || 1;

        const isCrossing = scenePt.x < startPt.x;
        selectionBoxRef.current.set({
          left,
          top,
          originX: "left",
          originY: "top",
          width,
          height,
          fill: isCrossing ? "rgba(34, 197, 94, 0.15)" : "rgba(99, 102, 241, 0.15)",
          stroke: isCrossing ? "#22c55e" : "#6366f1",
          strokeWidth: 1.5 / zoom,
          visible: width > 2 || height > 2,
        });
        canvas.bringObjectToFront(selectionBoxRef.current);
        canvas.requestRenderAll();
        return;
      }

      // ✏️ 선/정점 수정 모드 상태에서 마우스 호버 위치 갱신
      if (vertexEditObjectIdRef.current) {
        const scenePt = canvas.getScenePoint(evt);
        currentMouseScenePointRef.current = { x: scenePt.x, y: scenePt.y };
        canvas.requestRenderAll();
      }

      // 정점 호버 시 커서 변경 피드백
      const activeObj = canvas.getActiveObject();
      if (activeObj && !isBgSheetObject(activeObj)) {
        const scenePt = canvas.getScenePoint(evt);
        const vertices = getObjectSceneVertices(activeObj);
        const hitRadius = 24 / (canvas.getZoom() || 1);
        const isHoveringVertex = vertices.some(
          (v) => Math.hypot(scenePt.x - v.x, scenePt.y - v.y) <= hitRadius
        );
        if (isHoveringVertex) {
          canvas.defaultCursor = "crosshair";
        } else if (useUIStore.getState().activeTool === "select" || useUIStore.getState().activeTool === "connector") {
          canvas.defaultCursor = "default";
        }
      }

      // 스마트 객체 간 자동 연결선 (Auto-Connecting) 마우스 이동 및 타겟 객체 경계선 실시간 투영 탐색
      if (autoConnectingFromRef.current) {
        const rawScenePt = canvas.getScenePoint(evt);
        currentMouseScenePointRef.current = { x: rawScenePt.x, y: rawScenePt.y };
        const srcId = autoConnectingFromRef.current.sourceObjectId;
        const zoom = canvas.getZoom() || 1;
        let foundTarget: { targetObjectId: string; targetPoint: { x: number; y: number } } | null = null;
        const objects = canvas.getObjects().filter((o) => !isBgSheetObject(o) && (o as any).dataId !== srcId);

        for (const obj of objects) {
          const dataId = (obj as any).dataId;
          if (!dataId) continue;

          // 목표 객체의 외곽선(변/둘레) 상에서 마우스 커서와 가장 가까운 정확한 지점 실시간 계산
          const boundaryPt = getClosestPointOnObjectBoundary(rawScenePt, obj);
          const distToEdge = Math.hypot(rawScenePt.x - boundaryPt.x, rawScenePt.y - boundaryPt.y);

          // 마우스가 도형 테두리 부근(50px)에 있거나 도형 내부에 올려져 있는 경우, 마우스가 가리키는 바로 그 선(경계선) 위치로 정밀 고정!
          if (distToEdge <= 50 / zoom || (typeof obj.containsPoint === "function" && obj.containsPoint(rawScenePt))) {
            foundTarget = { targetObjectId: dataId, targetPoint: { x: boundaryPt.x, y: boundaryPt.y } };
            break;
          }
        }
        autoConnectingTargetRef.current = foundTarget;
        canvas.defaultCursor = foundTarget ? "pointer" : "crosshair";
        canvas.requestRenderAll();
        return;
      }

      // 정점 자석 스냅핑 (선택 모드 및 드로잉 모드 모두에서 마우스 호버 시 분기점 감지)
      const curTool = useUIStore.getState().activeTool;
      if (!activeVertexDragRef.current && !isPanningRef.current && !isDrawingRef.current) {
        const rawScenePt = canvas.getScenePoint(evt);
        const zoom = canvas.getZoom() || 1;
        const snap = findNearbyObjectVertex(rawScenePt, zoom);
        if (snap) {
          branchSnapInfoRef.current = snap;
          canvas.defaultCursor = "crosshair";
          canvas.requestRenderAll();
        } else if (branchSnapInfoRef.current) {
          branchSnapInfoRef.current = null;
          canvas.defaultCursor = curTool === "pan" ? "grab" : curTool === "select" ? "default" : "crosshair";
          canvas.requestRenderAll();
        }
      } else {
        branchSnapInfoRef.current = null;
      }

      if (hoverInfo) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setHoverInfo((prev) =>
            prev ? { ...prev, x: evt.clientX - rect.left, y: evt.clientY - rect.top } : null
          );
        }
      }

      // 연속 벡터 패스 드로잉 중 프리뷰 좌표 실시간 갱신
      if (isPathDrawingRef.current && pathPointsRef.current.length > 0) {
        let scenePt = canvas.getScenePoint(evt);
        if (branchSnapInfoRef.current) {
          scenePt = new Point(branchSnapInfoRef.current.point.x, branchSnapInfoRef.current.point.y);
        }
        if (isShiftPressedRef.current && pathPointsRef.current.length > 0) {
          const lastPt = pathPointsRef.current[pathPointsRef.current.length - 1];
          const dx = scenePt.x - lastPt.x;
          const dy = scenePt.y - lastPt.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 0) {
            const angle = Math.atan2(dy, dx);
            const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
            scenePt = new Point(lastPt.x + dist * Math.cos(snapAngle), lastPt.y + dist * Math.sin(snapAngle));
          }
        }

        const firstPt = pathPointsRef.current[0];
        const zoom = canvas.getZoom() || 1;
        const distToFirst = Math.hypot(scenePt.x - firstPt.x, scenePt.y - firstPt.y);
        const isPolygon = useUIStore.getState().activeTool === "polygon";

        if (isPolygon && pathPointsRef.current.length >= 2 && distToFirst <= 22 / zoom) {
          scenePt = new Point(firstPt.x, firstPt.y);
          isSnappedToFirstRef.current = true;
        } else {
          isSnappedToFirstRef.current = false;
        }

        currentMouseScenePointRef.current = { x: scenePt.x, y: scenePt.y };
        canvas.requestRenderAll();
        return;
      }

      if (isDrawingRef.current && currentShapeRef.current) {
        const scenePt = canvas.getScenePoint(evt);
        const startPt = drawStartPointRef.current;
        const shape = currentShapeRef.current;
        const dataType = (shape as any).dataType;

        if (dataType === "wire" || dataType === "line" || dataType === "arrow" || dataType === "highlight") {
          (shape as Line).set({ x2: scenePt.x, y2: scenePt.y });
          shape.setCoords();
        } else if (dataType === "rectangle" || dataType === "component" || dataType === "text") {
          const left = Math.min(startPt.x, scenePt.x);
          const top = Math.min(startPt.y, scenePt.y);
          const width = Math.abs(scenePt.x - startPt.x);
          const height = Math.abs(scenePt.y - startPt.y);

          (shape as Rect).set({
            left,
            top,
            originX: "left",
            originY: "top",
            width: Math.max(width, 1),
            height: Math.max(height, 1),
          });
          shape.setCoords();
        } else if (dataType === "circle") {
          const left = Math.min(startPt.x, scenePt.x);
          const top = Math.min(startPt.y, scenePt.y);
          let width = Math.abs(scenePt.x - startPt.x);
          let height = Math.abs(scenePt.y - startPt.y);
          if (isShiftPressedRef.current) {
            const size = Math.max(width, height);
            width = size;
            height = size;
          }
          (shape as Ellipse).set({
            left,
            top,
            originX: "left",
            originY: "top",
            rx: Math.max(width / 2, 1),
            ry: Math.max(height / 2, 1),
          });
          shape.setCoords();
        }
        canvas.requestRenderAll();
      }
    });

    // 더블클릭 이벤트 (패스 드로잉 완성)
    canvas.on("mouse:dblclick", () => {
      if (isPathDrawingRef.current) {
        finishPathDrawing();
      }
    });

    // 마우스 업
    canvas.on("mouse:up", (opt) => {
      // 🔲 CAD 마키 박스 드래그 다중 선택 완료 처리
      if (isMarqueeSelectingRef.current) {
        isMarqueeSelectingRef.current = false;
        const startPt = marqueeStartPtRef.current;
        const evt = (opt?.e as MouseEvent) || (opt as any);
        const curPt = canvas.getScenePoint(evt);
        marqueeStartPtRef.current = null;

        if (selectionBoxRef.current) {
          canvas.remove(selectionBoxRef.current);
          selectionBoxRef.current = null;
        }

        const dragDist = startPt ? Math.hypot(curPt.x - startPt.x, curPt.y - startPt.y) : 0;
        const zoom = canvas.getZoom() || 1;

        if (startPt && dragDist > 6 / zoom) {
          const minX = Math.min(startPt.x, curPt.x);
          const maxX = Math.max(startPt.x, curPt.x);
          const minY = Math.min(startPt.y, curPt.y);
          const maxY = Math.max(startPt.y, curPt.y);
          const isCrossing = curPt.x < startPt.x;

          // 영역 내 객체 탐색
          const matchedObjects = canvas.getObjects().filter((obj) => {
            if (isBgSheetObject(obj) || (obj as any).isSelectionBox) return false;
            const dataId = (obj as any).dataId;
            if (!dataId) return false;

            const coords = typeof obj.getCoords === "function" ? obj.getCoords() : [];
            if (coords.length === 0) return false;

            const objMinX = Math.min(...coords.map((p: any) => p.x));
            const objMaxX = Math.max(...coords.map((p: any) => p.x));
            const objMinY = Math.min(...coords.map((p: any) => p.y));
            const objMaxY = Math.max(...coords.map((p: any) => p.y));

            if (!isCrossing) {
              // 좌->우 (Window 선택): 객체 전체가 영역 안에 완전히 들어와야 선택
              return objMinX >= minX && objMaxX <= maxX && objMinY >= minY && objMaxY <= maxY;
            } else {
              // 우->좌 (Crossing 선택): 객체가 영역에 걸치거나 포함되면 선택
              const hasPointInside = coords.some((p: any) => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY);
              if (hasPointInside) return true;
              const intersects = !(objMaxX < minX || objMinX > maxX || objMaxY < minY || objMinY > maxY);
              return intersects;
            }
          });

          const matchedIds = matchedObjects.map((o) => (o as any).dataId).filter(Boolean);
          const isShiftOrCtrl = evt?.shiftKey || evt?.ctrlKey || evt?.metaKey;

          if (matchedIds.length > 0) {
            const currentSelIds = useDrawingStore.getState().selectedObjectIds;
            const finalIds = isShiftOrCtrl
              ? Array.from(new Set([...currentSelIds, ...matchedIds]))
              : matchedIds;

            useDrawingStore.getState().setSelectedObjectIds(finalIds);

            isProgrammaticSelectionRef.current = true;
            if (finalIds.length === 1) {
              const singleObj = canvas.getObjects().find((o) => (o as any).dataId === finalIds[0]);
              if (singleObj) canvas.setActiveObject(singleObj);
            } else {
              const allSelectedObjs = canvas.getObjects().filter((o) => !isBgSheetObject(o) && finalIds.includes((o as any).dataId));
              if (allSelectedObjs.length > 0) {
                const activeSel = new ActiveSelection(allSelectedObjs, { canvas });
                canvas.setActiveObject(activeSel);
              }
            }
            isProgrammaticSelectionRef.current = false;
            useUIStore.getState().setPropertyTabOpen(true);
          } else {
            if (!isShiftOrCtrl) {
              useDrawingStore.getState().setSelectedObjectIds([]);
              useDrawingStore.getState().setSelectedObjectId(null);
              canvas.discardActiveObject();
            }
          }
        } else {
          // 단순 빈 영역 클릭 (드래그하지 않음)
          if (!evt?.shiftKey && !evt?.ctrlKey && !evt?.metaKey) {
            useDrawingStore.getState().setSelectedObjectIds([]);
            useDrawingStore.getState().setSelectedObjectId(null);
            canvas.discardActiveObject();
          }
        }

        canvas.requestRenderAll();
        return;
      }
      // 0) 정점 드래그 완료 시 스토어 영구 동기화
      if (activeVertexDragRef.current) {
        const { object } = activeVertexDragRef.current;
        object.lockMovementX = false;
        object.lockMovementY = false;
        activeVertexDragRef.current = null;
        canvas.selection = true;

        const dataId = (object as any).dataId;
        if (dataId) {
          pushState(useDrawingStore.getState().objects);
          canvas.setActiveObject(object);
          setSelectedObjectId(dataId);
        }
        canvas.requestRenderAll();
        return;
      }

      // 🖍️ 형광펜 자유 드로잉 완료 처리
      if (isFreehandDrawingRef.current) {
        isFreehandDrawingRef.current = false;
        if (freehandPreviewRef.current) {
          canvas.remove(freehandPreviewRef.current);
          freehandPreviewRef.current = null;
        }

        const pts = freehandPointsRef.current;
        if (pts.length >= 2) {
          pushState(useDrawingStore.getState().objects);
          const state = useDrawingStore.getState();
          const dwg = state.currentDrawing;
          const origW = dwg?.originalWidth || 1600;
          const origH = dwg?.originalHeight || 1200;
          const dataId = state.generateNextId("highlight");
          const defaults = useUIStore.getState().toolDefaults;

          const xs = pts.map((p) => p.x);
          const ys = pts.map((p) => p.y);
          const minX = Math.min(...xs);
          const minY = Math.min(...ys);
          const maxX = Math.max(...xs);
          const maxY = Math.max(...ys);

          const normPts = pts.map((p) => ({
            x: normalizeX(p.x, origW),
            y: normalizeY(p.y, origH),
          }));

          const newObj: DrawingObject = {
            id: dataId,
            projectId: dwg?.projectId || "proj_default",
            drawingId: dwg?.id || "dwg_01",
            type: "highlight",
            highlightMode: "freehand",
            label: dataId,
            x: normalizeX(minX, origW),
            y: normalizeY(minY, origH),
            width: normalizeX(maxX - minX, origW),
            height: normalizeY(maxY - minY, origH),
            points: normPts,
            strokeColor: defaults.highlight.strokeColor || "#facc15",
            strokeWidth: defaults.highlight.strokeWidth || 20,
            opacity: 0.45,
            visible: true,
            locked: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          addObject(newObj);
          const nextObjects = useDrawingStore.getState().objects;
          rebuildCanvasObjects(nextObjects);
          setSelectedObjectId(dataId);
          useUIStore.getState().setActiveTool("select");
        }

        freehandPointsRef.current = [];
        canvas.requestRenderAll();
        return;
      }

      if (isPanningRef.current) {
        isPanningRef.current = false;
        const isSelectMode = useUIStore.getState().editorMode === "editor" && useUIStore.getState().activeTool === "select";
        canvas.selection = isSelectMode;
      }

      // 분기 화살표 드래그 완료 처리 (마우스 드래그로 그렸을 때도 즉시 완성)
      if (isPathDrawingRef.current && pathPointsRef.current.length >= 2) {
        const curTool = useUIStore.getState().activeTool;
        if (curTool === "arrow" || curTool === "line" || curTool === "connector") {
          finishPathDrawing();
          return;
        }
      }

      if (isDrawingRef.current && currentShapeRef.current) {
        isDrawingRef.current = false;
        const shape = currentShapeRef.current;
        shape.setCoords();

        pushState(useDrawingStore.getState().objects);

        const dwg = useDrawingStore.getState().currentDrawing;
        const origW = dwg?.originalWidth || 1600;
        const origH = dwg?.originalHeight || 1200;
        const dataId = (shape as any).dataId;
        const dataType = (shape as any).dataType;
        const startPt = drawStartPointRef.current;

        let normX: number, normY: number, normW: number, normH: number;
        if (dataType === "wire" || dataType === "line" || dataType === "arrow" || dataType === "highlight") {
          const line = shape as Line;
          const x1 = line.x1 ?? startPt.x;
          const y1 = line.y1 ?? startPt.y;
          const x2 = line.x2 ?? startPt.x;
          const y2 = line.y2 ?? startPt.y;
          normX = normalizeX(x1, origW);
          normY = normalizeY(y1, origH);
          normW = normalizeX(x2 - x1, origW);
          normH = normalizeY(y2 - y1, origH);
        } else if (dataType === "circle") {
          const ellipse = shape as Ellipse;
          normX = normalizeX(ellipse.left || 0, origW);
          normY = normalizeY(ellipse.top || 0, origH);
          normW = normalizeX((ellipse.rx || 0) * 2, origW);
          normH = normalizeY((ellipse.ry || 0) * 2, origH);
        } else {
          normX = normalizeX(shape.left || 0, origW);
          normY = normalizeY(shape.top || 0, origH);
          normW = normalizeX(shape.width || 0, origW);
          normH = normalizeY(shape.height || 0, origH);
        }

        const defaults = useUIStore.getState().toolDefaults;
        let objStrokeColor = "#ef4444";
        let objStrokeWidth = 3;
        let objFillEnabled = false;
        let objFillColor = "#ef4444";
        let objFillOpacity = 0.5;
        let objBorderRadius = 0;
        let objStartCap: ArrowHeadType = "none";
        let objEndCap: ArrowHeadType = "none";
        let objLineStyle: "solid" | "dashed" | "dotted" = "solid";
        let objOpacity = 1.0;
        let objFontSize = 16;
        let objFontFamily = "monospace";
        let textMemoContent = "메모";

        if (dataType === "arrow") {
          objStrokeColor = defaults.arrow.strokeColor;
          objStrokeWidth = defaults.arrow.strokeWidth;
          objStartCap = defaults.arrow.startCap;
          objEndCap = defaults.arrow.endCap;
        } else if (dataType === "rectangle") {
          objStrokeColor = defaults.rect.strokeColor;
          objStrokeWidth = defaults.rect.strokeWidth;
          objBorderRadius = defaults.rect.borderRadius;
          objFillEnabled = defaults.rect.fillEnabled;
          objFillColor = defaults.rect.fillColor;
          objFillOpacity = defaults.rect.fillOpacity;
        } else if (dataType === "component") {
          objStrokeColor = defaults.component.strokeColor;
          objStrokeWidth = defaults.component.strokeWidth;
          objBorderRadius = defaults.component.borderRadius;
          objFillEnabled = defaults.component.fillEnabled;
          objFillColor = defaults.component.fillColor;
          objFillOpacity = defaults.component.fillOpacity;
        } else if (dataType === "circle") {
          objStrokeColor = defaults.circle.strokeColor;
          objStrokeWidth = defaults.circle.strokeWidth;
          objFillEnabled = defaults.circle.fillEnabled;
          objFillColor = defaults.circle.fillColor;
          objFillOpacity = defaults.circle.fillOpacity;
        } else if (dataType === "wire" || dataType === "line") {
          objStrokeColor = defaults.wire.strokeColor;
          objStrokeWidth = defaults.wire.strokeWidth;
          objLineStyle = defaults.wire.lineStyle;
          objStartCap = defaults.wire.startCap;
          objEndCap = defaults.wire.endCap;
        } else if (dataType === "highlight") {
          objStrokeColor = defaults.highlight.strokeColor;
          objStrokeWidth = defaults.highlight.strokeWidth;
          objOpacity = defaults.highlight.opacity;
        } else if (dataType === "text") {
          const draggedH = Math.abs(shape.height || 0);
          const draggedW = Math.abs(shape.width || 0);
          const dynamicFontSize = (draggedH > 14 || draggedW > 20)
            ? Math.max(12, Math.min(64, Math.round(draggedH * 0.55)))
            : (defaults.text.fontSize || 16);

          textMemoContent = prompt("작성할 텍스트 메모 내용을 입력하세요:", "텍스트 메모") || "텍스트 메모";

          objStrokeColor = defaults.text.strokeColor || "#38bdf8";
          objFontSize = dynamicFontSize;
          objFontFamily = defaults.text.fontFamily || "Pretendard, sans-serif";
          objFillEnabled = (defaults.text as any).fillEnabled ?? true;
          objFillColor = (defaults.text as any).fillColor || "#1e1b4b";
          objFillOpacity = (defaults.text as any).fillOpacity ?? 0.9;
          objBorderRadius = (defaults.text as any).borderRadius ?? 6;
        }

        let normPoints: NormalizedPoint[] | undefined = undefined;
        if (dataType === "wire" || dataType === "line" || dataType === "arrow" || dataType === "highlight") {
          const line = shape as Line;
          const x1 = line.x1 ?? startPt.x;
          const y1 = line.y1 ?? startPt.y;
          const x2 = line.x2 ?? startPt.x;
          const y2 = line.y2 ?? startPt.y;
          normPoints = [
            { x: normalizeX(x1, origW), y: normalizeY(y1, origH) },
            { x: normalizeX(x2, origW), y: normalizeY(y2, origH) },
          ];
        } else if (dataType === "rectangle" || dataType === "component") {
          normPoints = undefined;
        }

        const newObj: DrawingObject = {
          id: dataId,
          projectId: dwg?.projectId || "proj_default",
          drawingId: dwg?.id || "dwg_01",
          type: dataType,
          label: dataType === "text" ? textMemoContent : `${dataId}`,
          text: dataType === "text" ? textMemoContent : undefined,
          textColor: dataType === "text" ? ((defaults.text as any).textColor || "#ffffff") : undefined,
          x: normX,
          y: normY,
          width: normW,
          height: normH,
          points: normPoints,
          strokeColor: objStrokeColor,
          fillColor: objFillColor,
          fillOpacity: objFillOpacity,
          fillEnabled: objFillEnabled,
          strokeWidth: objStrokeWidth,
          opacity: objOpacity,
          startCap: objStartCap,
          endCap: objEndCap,
          lineStyle: objLineStyle,
          borderRadius: objBorderRadius,
          borderEnabled: dataType === "text" ? true : undefined,
          borderColor: dataType === "text" ? objStrokeColor : undefined,
          borderWidth: dataType === "text" ? 1.5 : undefined,
          borderStyle: dataType === "text" ? "solid" : undefined,
          padding: dataType === "text" ? ((defaults.text as any).padding ?? 8) : undefined,
          fontSize: objFontSize,
          fontFamily: objFontFamily,
          visible: true,
          locked: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // 🔗 분기 시작점 자동 그룹화 및 부모 객체 이름 계승 (예: 화살표 1 -> 화살표 1-1, 화살표 1-2)
        if (branchStartObjectIdRef.current) {
          const sourceId = branchStartObjectIdRef.current;
          const state = useDrawingStore.getState();
          const allObjs = state.objects;
          const sourceObj = allObjs.find((o) => o.id === sourceId);

          if (sourceObj) {
            newObj.type = "arrow";
            newObj.endCap = "arrow";
            newObj.strokeColor = sourceObj.strokeColor || defaults.arrow.strokeColor;
            newObj.strokeWidth = sourceObj.strokeWidth || defaults.arrow.strokeWidth;
            newObj.lineStyle = sourceObj.lineStyle || defaults.arrow.lineStyle;

            const parentName = sourceObj.label || sourceObj.id;
            const existingChildCount = allObjs.filter(
              (o) => o.label?.startsWith(`${parentName}-`) || o.id?.startsWith(`${parentName}-`)
            ).length;
            const branchName = `${parentName}-${existingChildCount + 1}`;
            newObj.id = branchName;
            newObj.label = branchName;

            let gid = sourceObj.groupId;
            if (!gid) {
              gid = state.generateNextId("group");
              sourceObj.groupId = gid;
              state.updateObject(sourceObj.id, { groupId: gid });
            }
            newObj.groupId = gid;
          }
          branchStartObjectIdRef.current = null;
        }

        canvas.remove(shape);
        addObject(newObj);
        const nextObjects = useDrawingStore.getState().objects;
        rebuildCanvasObjects(nextObjects);
        setSelectedObjectId(newObj.id);
        currentShapeRef.current = null;
        useUIStore.getState().setActiveTool("select");
      }
    });

    // 더블클릭 시 패스 드로잉 즉시 완성, 선/와이어 정점 수정 모드 진입 또는 도형 내부 텍스트 입력 처리
    canvas.on("mouse:dblclick", (opt) => {
      if (isPathDrawingRef.current) {
        finishPathDrawing();
        return;
      }
      const target = opt.target;
      if (target && !isBgSheetObject(target)) {
        const dataId = (target as any).dataId;
        if (dataId) {
          const obj = useDrawingStore.getState().objects.find((o) => o.id === dataId);
          if (obj) {
            // 선, 와이어, 커넥터, 폴리라인 등 정점 기반 객체 더블클릭 시 즉시 정점/꺾임점 수정 모드 활성화!
            if (
              obj.type === "line" ||
              obj.type === "polyline" ||
              obj.type === "connector" ||
              obj.type === "wire" ||
              obj.type === "highlight" ||
              obj.type === "polygon"
            ) {
              vertexEditObjectIdRef.current = dataId;
              setVertexEditObjectId(dataId);
              target.selectable = false;
              canvas.discardActiveObject();
              setPathDrawingHint("✏️ 꺾임점/선 모양 수정: 시작/끝점은 부모·자식 테두리를 따라 이동 | 꺾임점 드래그로 경로 편집 (선 클릭: 꺾임점 추가, Del: 꺾임점 삭제, Enter/Esc: 완료)");
              canvas.requestRenderAll();
              return;
            }

            if (obj.type === "rectangle" || obj.type === "circle" || obj.type === "component") {
              const currentText = obj.text ?? (obj.label || "");
              const nextText = prompt("도형 내부에 표시할 텍스트를 입력하세요:", currentText);
              if (nextText !== null) {
                pushState(useDrawingStore.getState().objects);
                useDrawingStore.getState().updateObject(obj.id, { text: nextText, label: nextText });
              }
            }
          }
        }
      }
    });



    // 객체 선택 이벤트 (단일 클릭, Shift+클릭 다중 선택, 마키 영역 박스 드래그 선택 통합 처리)
    const handleSelectionChange = (selected: FabricObject[]) => {
      if (isRebuildingRef.current || isProgrammaticSelectionRef.current) return;

      const filtered = selected.filter((o) => !isBgSheetObject(o));
      const ids = filtered.map((o) => (o as any).dataId).filter(Boolean);

      if (ids.length === 0) {
        const selectedSheet = selected.find((o) => isBgSheetObject(o));
        if (selectedSheet) {
          const sheetId = (selectedSheet as any).sheetId;
          if (sheetId) {
            setActiveSheetId(sheetId);
          }
        }
        setSelectedObjectIds([]);
        setSelectedObjectId(null);
        canvas.requestRenderAll();
        return;
      }

      setSelectedObjectIds(ids);
      setSelectedObjectId(ids.length === 1 ? ids[0] : null);
      useUIStore.getState().setPropertyTabOpen(true);
      canvas.requestRenderAll();
    };

    canvas.on("selection:created", (e) => handleSelectionChange(e.selected || []));
    canvas.on("selection:updated", (e) => handleSelectionChange(e.selected || []));
    canvas.on("selection:cleared", () => {
      if (isRebuildingRef.current || isProgrammaticSelectionRef.current) return;
      setSelectedObjectIds([]);
      setSelectedObjectId(null);
      canvas.requestRenderAll();
    });

    // 컴포넌트 이동 시 연결된 와이어 실시간 업데이트 함수
    const updateConnectedWires = (compId: string, compX: number, compY: number) => {
      const state = useDrawingStore.getState();
      const components = state.components;
      const wires = state.wires;

      const currentComp = components.find((c) => c.id === compId);
      if (!currentComp) return;
      const tempComp = { ...currentComp, x: compX, y: compY };

      wires.forEach((wire) => {
        if (wire.source.componentId !== compId && wire.target.componentId !== compId) return;

        const sourceComp = wire.source.componentId === compId ? tempComp : components.find((c) => c.id === wire.source.componentId);
        const targetComp = wire.target.componentId === compId ? tempComp : components.find((c) => c.id === wire.target.componentId);
        if (!sourceComp || !targetComp) return;

        const sourcePort = sourceComp.ports.find((p) => p.id === wire.source.portId);
        const targetPort = targetComp.ports.find((p) => p.id === wire.target.portId);
        if (!sourcePort || !targetPort) return;

        const startPt = getPortWorldPosition(sourceComp, sourcePort);
        const endPt = getPortWorldPosition(targetComp, targetPort);

        const newPath = calculateOrthogonalWirePath(
          startPt,
          endPt,
          wire.waypoints,
          sourcePort.direction,
          targetPort.direction
        );

        const wireObj = canvas.getObjects().find((obj) => (obj as any).wireId === wire.id) as Polyline;
        if (wireObj) {
          wireObj.set({ points: newPath });
          wireObj.setCoords();
        }
      });
      canvas.requestRenderAll();
    };

    // 마우스 드래그 이동 중 실시간 와이어 갱신
    canvas.on("object:moving", (e) => {
      const target = e.target;
      if (target && (target as any).isComponent) {
        const compId = (target as any).componentId;
        updateConnectedWires(compId, target.left || 0, target.top || 0);
      }
    });

    // 객체 수정 이벤트 (단일 시작/끝점 포인트 조절, 사각형 크기조절, 이동 등 스토어 실시간 동기화)
    canvas.on("object:modified", (e) => {
      const target = e.target;
      if (!target) return;

      // 0) 도면 배경 시트 이동/크기조절/회전된 경우 스토어 시트 좌표 및 배율 업데이트
      if ((target as any).isBgSheet) {
        const sheetId = (target as any).sheetId;
        if (sheetId) {
          const curScaleX = target.scaleX || 1;
          const curScaleY = target.scaleY || 1;
          const baseW = (target as any)._originalElement?.width || target.width || 1600;
          const baseH = (target as any)._originalElement?.height || target.height || 1200;
          const finalW = baseW * curScaleX;
          const finalH = baseH * curScaleY;

          const newX = (target.left || 0) - finalW / 2;
          const newY = (target.top || 0) - finalH / 2;
          const rot = Math.round(target.angle || 0);

          useDrawingStore.getState().updateBackgroundSheet(sheetId, {
            x: newX,
            y: newY,
            scaleX: curScaleX,
            scaleY: curScaleY,
            rotation: rot,
          });
        }
        return;
      }

      if ((target as any).isComponent) {
        const compId = (target as any).componentId;
        useDrawingStore.getState().updateComponentPosition(compId, target.left || 0, target.top || 0);
        return;
      }

      const dwg = useDrawingStore.getState().currentDrawing;
      const origW = dwg?.originalWidth || 1600;
      const origH = dwg?.originalHeight || 1200;

      // 1) 다중 선택(ActiveSelection)인 경우
      if (target instanceof ActiveSelection) {
        const selectedObjs = target.getObjects();
        selectedObjs.forEach((obj) => {
          const dataId = (obj as any).dataId;
          if (!dataId) return;
          const matrix = obj.calcTransformMatrix();
          const decomposed = util.qrDecompose(matrix);

          if (obj instanceof Polygon || obj instanceof Polyline) {
            const updatedScenePoints = getObjectSceneVertices(obj);
            (obj as any)._scenePoints = [...updatedScenePoints];
            const xs = updatedScenePoints.map((p: any) => p.x);
            const ys = updatedScenePoints.map((p: any) => p.y);
            const minX = Math.min(...xs);
            const minY = Math.min(...ys);
            const maxX = Math.max(...xs);
            const maxY = Math.max(...ys);

            const normPts = updatedScenePoints.map((p: any) => ({
              x: normalizeX(p.x, origW),
              y: normalizeY(p.y, origH),
            }));

            useDrawingStore.getState().updateObject(dataId, {
              points: normPts,
              x: normalizeX(minX, origW),
              y: normalizeY(minY, origH),
              width: normalizeX(maxX - minX, origW),
              height: normalizeY(maxY - minY, origH),
            });
          } else if (obj instanceof Line) {
            const vertices = getObjectSceneVertices(obj);
            (obj as any)._scenePoints = [...vertices];
            const p1 = vertices[0] || { x: 0, y: 0 };
            const p2 = vertices[1] || { x: 0, y: 0 };
            const minX = Math.min(p1.x, p2.x);
            const minY = Math.min(p1.y, p2.y);
            const normPoints = [
              { x: normalizeX(p1.x, origW), y: normalizeY(p1.y, origH) },
              { x: normalizeX(p2.x, origW), y: normalizeY(p2.y, origH) },
            ];
            useDrawingStore.getState().updateObject(dataId, {
              x: normalizeX(minX, origW),
              y: normalizeY(minY, origH),
              width: normalizeX(Math.abs(p2.x - p1.x), origW),
              height: normalizeY(Math.abs(p2.y - p1.y), origH),
              points: normPoints,
            });
          } else if (obj instanceof IText || (obj as any).dataType === "text") {
            const w = obj.width || 0;
            const h = obj.height || 0;
            const localTopLeft = new Point(-w / 2, -h / 2);
            const sceneTopLeft = util.transformPoint(localTopLeft, matrix);
            const scale = Math.max(decomposed.scaleX, decomposed.scaleY);
            const currentFontSize = (obj as any).fontSize || 16;
            const nextFontSize = Math.max(10, Math.min(140, Math.round(currentFontSize * scale)));
            const rot = Math.round(decomposed.angle % 360);

            useDrawingStore.getState().updateObject(dataId, {
              x: normalizeX(sceneTopLeft.x, origW),
              y: normalizeY(sceneTopLeft.y, origH),
              fontSize: nextFontSize,
              rotation: rot,
            });
          } else {
            const w = obj.width || 0;
            const h = obj.height || 0;
            const localTopLeft = new Point(-w / 2, -h / 2);
            const sceneTopLeft = util.transformPoint(localTopLeft, matrix);
            const finalW = w * decomposed.scaleX;
            const finalH = h * decomposed.scaleY;
            const rot = Math.round(decomposed.angle % 360);

            useDrawingStore.getState().updateObject(dataId, {
              x: normalizeX(sceneTopLeft.x, origW),
              y: normalizeY(sceneTopLeft.y, origH),
              width: normalizeX(finalW, origW),
              height: normalizeY(finalH, origH),
              rotation: rot,
            });
          }
        });
        pushState(useDrawingStore.getState().objects);
        return;
      }

      // 2) 단일 객체인 경우
      const dataId = (target as any).dataId;
      if (!dataId) return;

      if (target instanceof Polygon || target instanceof Polyline) {
        const updatedScenePoints = getObjectSceneVertices(target);
        (target as any)._scenePoints = [...updatedScenePoints];
        const xs = updatedScenePoints.map((p: any) => p.x);
        const ys = updatedScenePoints.map((p: any) => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);

        const normPts = updatedScenePoints.map((p: any) => ({
          x: normalizeX(p.x, origW),
          y: normalizeY(p.y, origH),
        }));

        useDrawingStore.getState().updateObject(dataId, {
          points: normPts,
          x: normalizeX(minX, origW),
          y: normalizeY(minY, origH),
          width: normalizeX(maxX - minX, origW),
          height: normalizeY(maxY - minY, origH),
        });
      } else if (target instanceof Line) {
        const vertices = getObjectSceneVertices(target);
        (target as any)._scenePoints = [...vertices];
        const p1 = vertices[0] || { x: 0, y: 0 };
        const p2 = vertices[1] || { x: 0, y: 0 };
        const minX = Math.min(p1.x, p2.x);
        const minY = Math.min(p1.y, p2.y);
        const normPoints = [
          { x: normalizeX(p1.x, origW), y: normalizeY(p1.y, origH) },
          { x: normalizeX(p2.x, origW), y: normalizeY(p2.y, origH) },
        ];
        useDrawingStore.getState().updateObject(dataId, {
          x: normalizeX(minX, origW),
          y: normalizeY(minY, origH),
          width: normalizeX(Math.abs(p2.x - p1.x), origW),
          height: normalizeY(Math.abs(p2.y - p1.y), origH),
          points: normPoints,
        });
      } else if (target instanceof IText || (target as any).dataType === "text") {
        const normX = normalizeX(target.left || 0, origW);
        const normY = normalizeY(target.top || 0, origH);
        const scale = Math.max(target.scaleX || 1, target.scaleY || 1);
        const currentFontSize = (target as any).fontSize || 16;
        const nextFontSize = Math.max(10, Math.min(140, Math.round(currentFontSize * scale)));
        const rot = Math.round(target.angle || 0);

        target.scaleX = 1;
        target.scaleY = 1;
        (target as any).fontSize = nextFontSize;

        useDrawingStore.getState().updateObject(dataId, {
          x: normX,
          y: normY,
          fontSize: nextFontSize,
          rotation: rot,
        });
      } else if (target instanceof Ellipse || (target as any).dataType === "circle") {
        const normX = normalizeX(target.left || 0, origW);
        const normY = normalizeY(target.top || 0, origH);
        const curW = (target as Ellipse).rx ? (target as Ellipse).rx * 2 : (target.width || 0);
        const curH = (target as Ellipse).ry ? (target as Ellipse).ry * 2 : (target.height || 0);
        const finalW = curW * (target.scaleX || 1);
        const finalH = curH * (target.scaleY || 1);
        const rot = Math.round(target.angle || 0);

        target.scaleX = 1;
        target.scaleY = 1;
        (target as Ellipse).set({
          rx: Math.max(finalW / 2, 1),
          ry: Math.max(finalH / 2, 1),
          width: Math.max(finalW, 2),
          height: Math.max(finalH, 2),
        });
        target.setCoords();

        useDrawingStore.getState().updateObject(dataId, {
          x: normX,
          y: normY,
          width: normalizeX(finalW, origW),
          height: normalizeY(finalH, origH),
          rotation: rot,
        });
      } else {
        const normX = normalizeX(target.left || 0, origW);
        const normY = normalizeY(target.top || 0, origH);
        const normW = normalizeX((target.width || 0) * (target.scaleX || 1), origW);
        const normH = normalizeY((target.height || 0) * (target.scaleY || 1), origH);
        const rot = target.angle || 0;
        useDrawingStore.getState().updateObject(dataId, {
          x: normX,
          y: normY,
          width: normW,
          height: normH,
          rotation: rot,
        });
      }
      pushState(useDrawingStore.getState().objects);
    });

    // 이전 활성 도구 보관 (Space 키 손도구 토글용)
    const prevToolBeforeSpaceRef = { current: null as string | null };
    const isSpacePressedRef = { current: false };

    // 포토샵/CAD 스타일 키보드 단축키 핸들러
    const handleKeyDown = (e: KeyboardEvent) => {
      // 텍스트 인풋 또는 편집 중일 때는 전역 단축키 차단
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      // 0. 단축키 도움말 (F1 또는 ?)
      if (e.key === "F1" || (!e.ctrlKey && !e.metaKey && (e.key === "?" || (e.shiftKey && e.key === "/")))) {
        e.preventDefault();
        useUIStore.getState().setShortcutsHelpOpen(true);
        return;
      }

      // Enter 키로 패스 드로잉 완성 또는 정점 수정 모드 완료
      if (e.key === "Enter") {
        if (isPathDrawingRef.current) {
          e.preventDefault();
          finishPathDrawing();
          return;
        }
        if (vertexEditObjectIdRef.current) {
          e.preventDefault();
          const prevObj = canvas.getObjects().find((o) => (o as any).dataId === vertexEditObjectIdRef.current);
          if (prevObj) prevObj.selectable = true;
          vertexEditObjectIdRef.current = null;
          setVertexEditObjectId(null);
          setPathDrawingHint(null);
          useUIStore.getState().setActiveTool("select");
          canvas.requestRenderAll();
          return;
        }
      }

      // Escape 키로 패스 드로잉 취소 또는 정점 수정 모드 종료 또는 선택 해제
      if (e.key === "Escape") {
        e.preventDefault();
        if (isPathDrawingRef.current || autoConnectingFromRef.current) {
          cancelPathDrawing();
          return;
        }
        if (vertexEditObjectIdRef.current) {
          const prevObj = canvas.getObjects().find((o) => (o as any).dataId === vertexEditObjectIdRef.current);
          if (prevObj) prevObj.selectable = true;
          vertexEditObjectIdRef.current = null;
          setVertexEditObjectId(null);
          setPathDrawingHint(null);
          useUIStore.getState().setActiveTool("select");
          canvas.requestRenderAll();
          return;
        }
        // 선택 해제 및 기본 도구 복귀
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        setSelectedObjectId(null);
        setSelectedObjectIds([]);
        useUIStore.getState().setActiveTool("select");
        return;
      }

      // ✏️ 정점 수정 모드에서 Delete/Backspace: 마우스가 올려진 꺾임점 삭제 (최소 2개 점 유지)
      if ((e.key === "Delete" || e.key === "Backspace") && vertexEditObjectIdRef.current) {
        e.preventDefault();
        const editId = vertexEditObjectIdRef.current;
        const editObj = canvas.getObjects().find((o) => (o as any).dataId === editId);
        const mousePt = currentMouseScenePointRef.current;
        if (editObj && mousePt) {
          const zoom = canvas.getZoom() || 1;
          const vertices = getObjectSceneVertices(editObj);
          const hitThreshold = 18 / zoom;
          let hitIdx = -1;
          for (let i = 0; i < vertices.length; i++) {
            if (Math.hypot(mousePt.x - vertices[i].x, mousePt.y - vertices[i].y) <= hitThreshold) {
              hitIdx = i;
              break;
            }
          }

          if (hitIdx >= 0) {
            const state = useDrawingStore.getState();
            const matched = state.objects.find((o) => o.id === editId);
            if (matched && matched.points && matched.points.length > 2) {
              pushState(state.objects);
              const newPoints = matched.points.filter((_, idx) => idx !== hitIdx);
              const dwg = state.currentDrawing;
              const origW = dwg?.originalWidth || 1600;
              const origH = dwg?.originalHeight || 1200;
              const denormPts = newPoints.map((p) => ({
                x: denormalizeX(p.x, origW),
                y: denormalizeY(p.y, origH),
              }));

              const xs = denormPts.map((p) => p.x);
              const ys = denormPts.map((p) => p.y);
              const minX = Math.min(...xs);
              const minY = Math.min(...ys);
              const maxX = Math.max(...xs);
              const maxY = Math.max(...ys);
              const width = Math.max(maxX - minX, 1);
              const height = Math.max(maxY - minY, 1);

              state.updateObject(editId, {
                points: newPoints,
                x: normalizeX(minX, origW),
                y: normalizeY(minY, origH),
                width: normalizeX(width, origW),
                height: normalizeY(height, origH),
              });

              (editObj as any)._scenePoints = [...denormPts];

              if (editObj instanceof Polyline || editObj instanceof Polygon) {
                editObj.set({
                  points: denormPts,
                  left: minX,
                  top: minY,
                  width: width,
                  height: height,
                  pathOffset: new Point(minX + width / 2, minY + height / 2),
                });
                editObj.setCoords();
              }
              canvas.requestRenderAll();
              return;
            }
          }
        }
      }

      if (e.key === "Shift") {
        isShiftPressedRef.current = true;
      }

      const isCtrl = e.ctrlKey || e.metaKey;

      // ----------------------------------------------------
      // [Ctrl 조합 단축키]
      // ----------------------------------------------------
      if (isCtrl) {
        const key = e.key.toLowerCase();

        // 1. 실행 취소 (Ctrl + Z)
        if (key === "z" && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
          return;
        }

        // 2. 다시 실행 (Ctrl + Y 또는 Ctrl + Shift + Z)
        if (key === "y" || (key === "z" && e.shiftKey)) {
          e.preventDefault();
          handleRedo();
          return;
        }

        // 3. 복사 (Ctrl + C)
        if (key === "c") {
          const activeObj = canvas.getActiveObject();
          if (activeObj && !isBgSheetObject(activeObj)) {
            const id = (activeObj as any).dataId;
            const target = useDrawingStore.getState().objects.find((o) => o.id === id);
            if (target) clipboardRef.current = target;
          }
          return;
        }

        // 4. 붙여넣기 (Ctrl + V)
        if (key === "v" && clipboardRef.current) {
          e.preventDefault();
          pushState(useDrawingStore.getState().objects);
          duplicateObject(clipboardRef.current.id);
          return;
        }

        // 5. 즉시 복제 (Ctrl + D)
        if (key === "d") {
          e.preventDefault();
          const activeObjs = canvas.getActiveObjects().filter((o) => !isBgSheetObject(o));
          if (activeObjs.length > 0) {
            pushState(useDrawingStore.getState().objects);
            activeObjs.forEach((o) => {
              const id = (o as any).dataId;
              if (id) duplicateObject(id);
            });
          }
          return;
        }

        // 6. 전체 선택 (Ctrl + A)
        if (key === "a") {
          e.preventDefault();
          const selectableObjs = canvas
            .getObjects()
            .filter((o) => !isBgSheetObject(o) && (o as any).dataId);

          if (selectableObjs.length > 0) {
            canvas.discardActiveObject();
            const sel = new ActiveSelection(selectableObjs, { canvas });
            canvas.setActiveObject(sel);
            canvas.requestRenderAll();
            const ids = selectableObjs.map((o) => (o as any).dataId);
            setSelectedObjectIds(ids);
            setSelectedObjectId(ids[0] || null);
          }
          return;
        }

        // 7. 그룹화 (Ctrl + G) / 그룹 해제 (Ctrl + Shift + G)
        if (key === "g") {
          e.preventDefault();
          const activeObjects = canvas.getActiveObjects().filter((o) => !isBgSheetObject(o));
          if (e.shiftKey) {
            // 그룹 해제
            if (activeObjects.length > 0) {
              const id = (activeObjects[0] as any).dataId;
              const target = useDrawingStore.getState().objects.find((o) => o.id === id);
              if (target?.groupId) ungroup(target.groupId);
            }
          } else {
            // 그룹 묶기
            const ids = activeObjects.map((o) => (o as any).dataId).filter(Boolean);
            if (ids.length >= 2) {
              pushState(useDrawingStore.getState().objects);
              createGroup(ids);
            }
          }
          return;
        }

        // 8. 프로젝트 저장 (Ctrl + S)
        if (key === "s" && !e.shiftKey) {
          e.preventDefault();
          useUIStore.getState().setSaveModalOpen(true);
          return;
        }

        // 9. 도면/프로젝트 내보내기 (Ctrl + Shift + S 또는 Ctrl + E)
        if ((key === "s" && e.shiftKey) || key === "e") {
          e.preventDefault();
          useUIStore.getState().setExportModalOpen(true);
          return;
        }

        // 10. 도면 열기 / 추가 (Ctrl + O)
        if (key === "o") {
          e.preventDefault();
          useUIStore.getState().setOpenDrawingModalOpen(true);
          return;
        }

        // 11. 화면 맞춤 (Ctrl + 0)
        if (e.key === "0") {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("canvas:fit-screen"));
          return;
        }

        // 12. 100% 원본 크기 보기 (Ctrl + 1)
        if (e.key === "1") {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("canvas:actual-size"));
          return;
        }

        // 13. 확대 (Ctrl + + / Ctrl + =)
        if (e.key === "+" || e.key === "=") {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("canvas:zoom-in"));
          return;
        }

        // 14. 축소 (Ctrl + - / Ctrl + _)
        if (e.key === "-" || e.key === "_") {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("canvas:zoom-out"));
          return;
        }

        // 15. 캔버스 시점 회전 단축키 (Ctrl + [ / Ctrl + ])
        if (e.key === "[" || e.key === "{") {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("canvas:rotate-ccw"));
          return;
        }
        if (e.key === "]" || e.key === "}") {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("canvas:rotate-cw"));
          return;
        }

        return;
      }

      // ----------------------------------------------------
      // [단일 키 단축키 (Ctrl 미입력)]
      // ----------------------------------------------------

      // A. 도구 선택 단축키 (V, A, C, R, O, P, T, H, W)
      const singleKey = e.key.toLowerCase();
      if (!isPathDrawingRef.current && !vertexEditObjectIdRef.current) {
        if (singleKey === "v") {
          e.preventDefault();
          useUIStore.getState().setActiveTool("select");
          return;
        }
        if (singleKey === "a") {
          e.preventDefault();
          useUIStore.getState().setActiveTool("arrow");
          return;
        }
        if (singleKey === "c" || singleKey === "w") {
          e.preventDefault();
          useUIStore.getState().setActiveTool("connector");
          return;
        }
        if (singleKey === "r") {
          e.preventDefault();
          useUIStore.getState().setActiveTool("rect");
          return;
        }
        if (singleKey === "o") {
          e.preventDefault();
          useUIStore.getState().setActiveTool("circle");
          return;
        }
        if (singleKey === "p") {
          e.preventDefault();
          useUIStore.getState().setActiveTool("polygon");
          return;
        }
        if (singleKey === "t") {
          e.preventDefault();
          useUIStore.getState().setActiveTool("text");
          return;
        }
        if (singleKey === "h") {
          e.preventDefault();
          useUIStore.getState().setActiveTool("highlight");
          return;
        }
      }

      // B. Space 바 손도구(Pan) 토글
      if (e.code === "Space" && !isSpacePressedRef.current && !isPathDrawingRef.current) {
        e.preventDefault();
        isSpacePressedRef.current = true;
        prevToolBeforeSpaceRef.current = useUIStore.getState().activeTool;
        useUIStore.getState().setActiveTool("pan");
        canvas.defaultCursor = "grab";
        canvas.setCursor("grab");
        return;
      }

      // C. 레이어 순서 단축키 ([ / ], Shift + [ / Shift + ])
      if (e.key === "[" || e.key === "]") {
        const activeObj = canvas.getActiveObject();
        if (activeObj && !isBgSheetObject(activeObj)) {
          const id = (activeObj as any).dataId;
          if (id) {
            if (e.key === "[") {
              reorderObject(id, e.shiftKey ? "sendToBack" : "sendBackward");
              if (e.shiftKey) canvas.sendObjectToBack(activeObj);
              else canvas.sendObjectBackwards(activeObj);
            } else {
              reorderObject(id, e.shiftKey ? "bringToFront" : "bringForward");
              if (e.shiftKey) canvas.bringObjectToFront(activeObj);
              else canvas.bringObjectForward(activeObj);
            }
            canvas.requestRenderAll();
          }
        }
        return;
      }

      // D. 방향키 미세 이동 (Nudge: 1px, Shift + 방향키: 10px)
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        const activeObjs = canvas.getActiveObjects().filter((o) => !isBgSheetObject(o));
        if (activeObjs.length > 0) {
          e.preventDefault();
          const stepPx = e.shiftKey ? 10 : 1;
          let deltaX = 0;
          let deltaY = 0;

          if (e.key === "ArrowLeft") deltaX = -stepPx;
          if (e.key === "ArrowRight") deltaX = stepPx;
          if (e.key === "ArrowUp") deltaY = -stepPx;
          if (e.key === "ArrowDown") deltaY = stepPx;

          const state = useDrawingStore.getState();
          const dwg = state.currentDrawing;
          const origW = dwg?.originalWidth || 1600;
          const origH = dwg?.originalHeight || 1200;

          pushState(state.objects);

          activeObjs.forEach((obj) => {
            const dataId = (obj as any).dataId;
            if (!dataId) return;

            obj.set({
              left: (obj.left || 0) + deltaX,
              top: (obj.top || 0) + deltaY,
            });
            obj.setCoords();

            const targetObj = state.objects.find((o) => o.id === dataId);
            if (targetObj) {
              const curX = targetObj.x ?? 0;
              const curY = targetObj.y ?? 0;
              const nextNormX = curX + deltaX / origW;
              const nextNormY = curY + deltaY / origH;

              let nextPoints = targetObj.points;
              if (targetObj.points && targetObj.points.length > 0) {
                nextPoints = targetObj.points.map((p) => ({
                  x: p.x + deltaX / origW,
                  y: p.y + deltaY / origH,
                }));
              }

              state.updateObject(dataId, {
                x: nextNormX,
                y: nextNormY,
                points: nextPoints,
              });
            }
          });

          canvas.requestRenderAll();
          return;
        }
      }

      // E. Delete/Backspace: 선택 객체 삭제
      if (e.key === "Delete" || e.key === "Backspace") {
        const activeObjs = canvas.getActiveObjects().filter((o) => !isBgSheetObject(o));
        const storeSelectedId = useDrawingStore.getState().selectedObjectId;
        const storeSelectedIds = useDrawingStore.getState().selectedObjectIds;

        if (activeObjs.length > 0 || storeSelectedId || storeSelectedIds.length > 0) {
          e.preventDefault();
          pushState(useDrawingStore.getState().objects);

          const idsToDelete = new Set<string>();
          if (storeSelectedId) idsToDelete.add(storeSelectedId);
          storeSelectedIds.forEach((id) => idsToDelete.add(id));
          activeObjs.forEach((o) => {
            const dataId = (o as any).dataId;
            if (dataId) idsToDelete.add(dataId);
            canvas.remove(o);
          });

          idsToDelete.forEach((id) => {
            removeObject(id);
          });

          canvas.discardActiveObject();
          canvas.requestRenderAll();
          setSelectedObjectId(null);
          setSelectedObjectIds([]);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        isShiftPressedRef.current = false;
      }
      if (e.code === "Space" && isSpacePressedRef.current) {
        isSpacePressedRef.current = false;
        if (prevToolBeforeSpaceRef.current) {
          useUIStore.getState().setActiveTool(prevToolBeforeSpaceRef.current as any);
          prevToolBeforeSpaceRef.current = null;
        } else {
          useUIStore.getState().setActiveTool("select");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    const handleCustomUndo = () => handleUndo();
    const handleCustomRedo = () => handleRedo();
    window.addEventListener("app:undo", handleCustomUndo);
    window.addEventListener("app:redo", handleCustomRedo);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("app:undo", handleCustomUndo);
      window.removeEventListener("app:redo", handleCustomRedo);
      resizeObserver.disconnect();
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [
    handleUndo,
    handleRedo,
    finishPathDrawing,
    cancelPathDrawing,
    pushState,
    addObject,
    removeObject,
    duplicateObject,
    createGroup,
    ungroup,
    reorderObject,
    setSelectedObjectId,
    setSelectedObjectIds,
    setZoom,
    setPan,
    onCanvasReady,
  ]);

  // 2. 에디터/뷰어 모드 및 도구 변경 시 선택 및 조작 제어
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const isEditor = editorMode === "editor";
    const isDrawingTool = isEditor && activeTool !== "select" && activeTool !== "connector" && activeTool !== "pan";
    const canSelect = activeTool === "select" || activeTool === "connector";

    canvas.selection = false;
    canvas.defaultCursor =
      activeTool === "pan"
        ? "grab"
        : isDrawingTool
        ? "crosshair"
        : "default";

    if (!canSelect) {
      canvas.discardActiveObject();
      setSelectedObjectId(null);
      setSelectedObjectIds([]);
    }

    canvas.forEachObject((obj) => {
      if (!isBgSheetObject(obj)) {
        const isConnector = (obj as any).dataType === "connector" || (obj as any).type === "connector";
        obj.selectable = canSelect;
        obj.hasControls = canSelect && !isConnector;
        obj.hasBorders = canSelect && !isConnector;
        obj.lockMovementX = isConnector ? true : !canSelect;
        obj.lockMovementY = isConnector ? true : !canSelect;
        obj.lockScalingX = isConnector ? true : (!canSelect || !isEditor);
        obj.lockScalingY = isConnector ? true : (!canSelect || !isEditor);
        obj.lockRotation = isConnector ? true : (!canSelect || !isEditor);
        obj.evented = true;
      }
    });
    canvas.requestRenderAll();
  }, [editorMode, activeTool, setSelectedObjectId, setSelectedObjectIds]);

  // 3. 도면 배경 레이어(잠금/해제, 회전, 반전, 투명도) 실시간 동기화
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    const bgImg = bgImageRef.current;
    if (!canvas || !bgImg) return;

    bgImg.selectable = !isBackgroundLocked;
    bgImg.evented = !isBackgroundLocked;
    bgImg.set({
      angle: backgroundTransform.rotation,
      flipX: backgroundTransform.flipX,
      flipY: backgroundTransform.flipY,
      opacity: backgroundTransform.opacity,
    });
    bgImg.setCoords();
    canvas.requestRenderAll();
  }, [isBackgroundLocked, backgroundTransform]);

  // 4. 객체 속성(선모양/점선/캡/채우기/폰트/자간/ID/라벨) 변경 시 캔버스 실시간 동기화
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    let hasChanged = false;
    canvas.forEachObject((obj) => {
      if (isBgSheetObject(obj)) return;
      const dataId = (obj as any).dataId;
      if (!dataId) return;

      const matched = objects.find((o) => o.id === dataId);
      if (matched) {
        // 1) 선 색상
        if (matched.strokeColor && obj.get("stroke") !== matched.strokeColor) {
          obj.set("stroke", matched.strokeColor);
          hasChanged = true;
        }
        // 2) 선 굵기
        if (matched.strokeWidth && obj.get("strokeWidth") !== matched.strokeWidth) {
          obj.set("strokeWidth", matched.strokeWidth);
          hasChanged = true;
        }
        // 3) 선 점선/실선 스타일
        const dashArray = getStrokeDashArray(matched.lineStyle);
        if (obj.get("strokeDashArray") !== dashArray) {
          obj.set("strokeDashArray", dashArray);
          hasChanged = true;
        }
        // 4) 채우기 및 투명도
        const computedFill = getComputedFill(matched);
        if (obj.type !== "line" && obj.get("fill") !== computedFill) {
          obj.set("fill", computedFill);
          hasChanged = true;
        }
        // 4-1) 사각형 모서리 라운드 (borderRadius / rx, ry)
        if (obj.type === "rect" || (obj as any).dataType === "rectangle" || (obj as any).dataType === "component") {
          const targetRadius = matched.borderRadius ?? 6;
          if ((obj as Rect).rx !== targetRadius) {
            (obj as Rect).set({ rx: targetRadius, ry: targetRadius });
            hasChanged = true;
          }
        }
        // 4-2) 불투명도 (opacity)
        if (matched.opacity !== undefined && obj.get("opacity") !== matched.opacity) {
          obj.set("opacity", matched.opacity);
          hasChanged = true;
        }
        // 4-3) 화살표 / 커넥터 캡 및 배율 계수 변경 시 다시 그리기 플래그
        if (matched.type === "arrow" || matched.type === "connector" || matched.type === "wire" || matched.type === "line") {
          (obj as any)._startCap = matched.startCap;
          (obj as any)._endCap = matched.endCap;
          (obj as any)._arrowScaleRatio = matched.arrowScaleRatio;
          hasChanged = true;
        }
        // 5) 타이포그래피 (폰트, 크기, 자간, 정렬, 굵기)
        if (obj.type === "i-text" || obj.type === "text") {
          const textObj = obj as IText;
          if (matched.text && textObj.text !== matched.text) {
            textObj.set("text", matched.text);
            hasChanged = true;
          }
          if (matched.fontSize && textObj.fontSize !== matched.fontSize) {
            textObj.set("fontSize", matched.fontSize);
            hasChanged = true;
          }
          if (matched.fontFamily && textObj.fontFamily !== matched.fontFamily) {
            textObj.set("fontFamily", matched.fontFamily);
            hasChanged = true;
          }
          if (matched.letterSpacing !== undefined) {
            textObj.set("charSpacing", matched.letterSpacing * 100);
            hasChanged = true;
          }
          if (matched.fontWeight && textObj.fontWeight !== matched.fontWeight) {
            textObj.set("fontWeight", matched.fontWeight);
            hasChanged = true;
          }
          if (matched.textAlign && textObj.textAlign !== matched.textAlign) {
            textObj.set("textAlign", matched.textAlign);
            hasChanged = true;
          }
        }
        (obj as any).dataLabel = matched.label;
        obj.setCoords();
      }
    });

    if (hasChanged) {
      canvas.requestRenderAll();
    }
  }, [objects]);


  // 도면 변경 또는 객체 추가/삭제 시에만 캔버스 객체 전체 재생성 (단순 속성 변경 시 선택 유지)
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      if (prevObjectsCountRef.current !== objects.length) {
        prevObjectsCountRef.current = objects.length;
        rebuildCanvasObjects(objects);
      }
    }
  }, [objects.length, currentDrawing?.id, rebuildCanvasObjects, objects]);


  // selectedObjectId / selectedObjectIds 변경 시 Fabric canvas activeObject / ActiveSelection 동기화
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    if (selectedObjectIds.length === 0 && !selectedObjectId) {
      if (canvas.getActiveObject()) {
        isProgrammaticSelectionRef.current = true;
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        isProgrammaticSelectionRef.current = false;
      }
      return;
    }

    if (selectedObjectIds.length > 1) {
      const matched = canvas.getObjects().filter((o) => !isBgSheetObject(o) && selectedObjectIds.includes((o as any).dataId));
      if (matched.length > 0) {
        isProgrammaticSelectionRef.current = true;
        const activeSel = new ActiveSelection(matched, { canvas });
        canvas.setActiveObject(activeSel);
        canvas.requestRenderAll();
        isProgrammaticSelectionRef.current = false;
      }
    } else {
      const targetId = selectedObjectId || selectedObjectIds[0];
      const target = canvas.getObjects().find((o) => (o as any).dataId === targetId);
      if (target && canvas.getActiveObject() !== target) {
        isProgrammaticSelectionRef.current = true;
        canvas.setActiveObject(target);
        canvas.requestRenderAll();
        isProgrammaticSelectionRef.current = false;
      }
    }
  }, [selectedObjectId, selectedObjectIds]);

  // activeTool 또는 editorMode 변경 시 미완성된 패스 드로잉 점들 깨끗하게 리셋
  useEffect(() => {
    isPathDrawingRef.current = false;
    pathPointsRef.current = [];
    currentMouseScenePointRef.current = null;
    setPathDrawingHint(null);
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.requestRenderAll();
    }
  }, [activeTool, editorMode]);

  // 5. 다중 도면 시트(BackgroundSheets) 이미지 로드 (시트 추가/삭제/도면 변경 시에만 실행!)
  const sheetsKey = backgroundSheets.map((s) => `${s.id}_${s.imagePath}`).join(";");

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    let isSubscribed = true;

    const sheetsToLoad = backgroundSheets.length > 0
      ? backgroundSheets
      : currentDrawing?.imagePath
      ? [
          {
            id: "sheet_1",
            title: currentDrawing.title || "도면 시트 1",
            imagePath: currentDrawing.imagePath,
            x: 0,
            y: 0,
            width: currentDrawing.originalWidth || 1600,
            height: currentDrawing.originalHeight || 1200,
            rotation: backgroundTransform.rotation || 0,
            flipX: backgroundTransform.flipX || false,
            flipY: backgroundTransform.flipY || false,
            opacity: backgroundTransform.opacity ?? 1.0,
            locked: false,
          },
        ]
      : [];

    if (sheetsToLoad.length === 0) return;

    // 모든 시트 이미지 병렬 비동기 로드
    Promise.all(
      sheetsToLoad.map((sheet) =>
        FabricImage.fromURL(sheet.imagePath, { crossOrigin: "anonymous" })
          .then((img) => ({ sheet, img }))
          .catch((err) => {
            console.error(`시트(${sheet.title}) 이미지 로드 실패:`, err);
            return null;
          })
      )
    ).then((results) => {
      if (!isSubscribed || !fabricCanvasRef.current) return;
      const c = fabricCanvasRef.current;

      // 기존 시트 이미지들 캔버스에서 모두 정리
      bgSheetsMapRef.current.forEach((oldImg) => {
        c.remove(oldImg);
      });
      bgSheetsMapRef.current.clear();
      if (bgImageRef.current) {
        c.remove(bgImageRef.current);
        bgImageRef.current = null;
      }

      const validResults = results.filter((r): r is { sheet: typeof sheetsToLoad[0]; img: FabricImage } => r !== null);
      if (validResults.length === 0) return;

      // 캔버스에 추가 및 최하단으로 전송
      validResults.forEach(({ sheet, img }, idx) => {
        const baseW = (img as any)._originalElement?.width || sheet.width || 1600;
        const baseH = (img as any)._originalElement?.height || sheet.height || 1200;
        const curScaleX = sheet.scaleX ?? 1;
        const curScaleY = sheet.scaleY ?? 1;

        if (sheet.crop) {
          img.set({
            cropX: sheet.crop.x,
            cropY: sheet.crop.y,
            width: sheet.crop.width,
            height: sheet.crop.height,
          });
        } else {
          img.set({
            cropX: 0,
            cropY: 0,
            width: baseW,
            height: baseH,
          });
        }

        const renderW = (sheet.crop?.width || baseW) * curScaleX;
        const renderH = (sheet.crop?.height || baseH) * curScaleY;

        img.set({
          selectable: !isBackgroundLocked,
          evented: !isBackgroundLocked,
          originX: "center",
          originY: "center",
          left: (sheet.x || 0) + renderW / 2,
          top: (sheet.y || 0) + renderH / 2,
          scaleX: curScaleX,
          scaleY: curScaleY,
          angle: sheet.rotation || 0,
          flipX: sheet.flipX || false,
          flipY: sheet.flipY || false,
          opacity: sheet.opacity ?? 1.0,
          hasControls: !isBackgroundLocked,
          hasBorders: !isBackgroundLocked,
          lockMovementX: isBackgroundLocked,
          lockMovementY: isBackgroundLocked,
          lockScalingX: isBackgroundLocked,
          lockScalingY: isBackgroundLocked,
          lockRotation: isBackgroundLocked,
          borderColor: "rgba(56, 189, 248, 0.9)",
          cornerColor: "#38bdf8",
          cornerStrokeColor: "#0284c7",
          cornerSize: 10,
          transparentCorners: false,
          perPixelTargetFind: false,
        });

        (img as any).isBgSheet = true;
        (img as any).sheetId = sheet.id;

        bgSheetsMapRef.current.set(sheet.id, img);
        if (idx === 0) {
          bgImageRef.current = img;
        }

        c.add(img);
        c.sendObjectToBack(img);
        img.setCoords();
      });

      // 전체 시트들의 합산 바운딩 영역 계산 및 뷰포트 정렬
      const containerW = containerRef.current?.clientWidth || c.getWidth() || 1200;
      const containerH = containerRef.current?.clientHeight || c.getHeight() || 800;
      c.setDimensions({ width: containerW, height: containerH });

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      sheetsToLoad.forEach((s) => {
        const sw = (s.crop?.width || s.width || 1600) * (s.scaleX ?? 1);
        const sh = (s.crop?.height || s.height || 1200) * (s.scaleY ?? 1);
        minX = Math.min(minX, s.x || 0);
        minY = Math.min(minY, s.y || 0);
        maxX = Math.max(maxX, (s.x || 0) + sw);
        maxY = Math.max(maxY, (s.y || 0) + sh);
      });

      const totalW = Math.max(maxX - minX, 800);
      const totalH = Math.max(maxY - minY, 600);

      const padding = 40;
      const availableW = Math.max(containerW - padding * 2, 100);
      const availableH = Math.max(containerH - padding * 2, 100);
      const scaleX = availableW / totalW;
      const scaleY = availableH / totalH;
      const fitScale = Math.min(scaleX, scaleY);

      const left = (containerW - totalW * fitScale) / 2 - minX * fitScale;
      const top = (containerH - totalH * fitScale) / 2 - minY * fitScale;

      c.setViewportTransform([fitScale, 0, 0, fitScale, left, top]);
      setZoom(fitScale);
      setPan({ x: left, y: top });

      rebuildCanvasObjects(useDrawingStore.getState().objects);
      c.requestRenderAll();
    });

    return () => {
      isSubscribed = false;
    };
  }, [currentDrawing?.id, sheetsKey, rebuildCanvasObjects]);

  // 6. 다중 도면 시트 속성 (회전, 반전, 투명도, 잠금, 위치, 자르기, 배율) 실시간 동기화
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    backgroundSheets.forEach((sheet) => {
      const img = bgSheetsMapRef.current.get(sheet.id);
      if (img) {
        const baseW = (img as any)._originalElement?.width || sheet.width || 1600;
        const baseH = (img as any)._originalElement?.height || sheet.height || 1200;
        const curScaleX = sheet.scaleX ?? 1;
        const curScaleY = sheet.scaleY ?? 1;

        if (sheet.crop) {
          img.set({
            cropX: sheet.crop.x,
            cropY: sheet.crop.y,
            width: sheet.crop.width,
            height: sheet.crop.height,
          });
        } else {
          img.set({
            cropX: 0,
            cropY: 0,
            width: baseW,
            height: baseH,
          });
        }

        const renderW = (sheet.crop?.width || baseW) * curScaleX;
        const renderH = (sheet.crop?.height || baseH) * curScaleY;

        img.set({
          selectable: !isBackgroundLocked,
          evented: !isBackgroundLocked,
          hasControls: !isBackgroundLocked,
          hasBorders: !isBackgroundLocked,
          lockMovementX: isBackgroundLocked,
          lockMovementY: isBackgroundLocked,
          lockScalingX: isBackgroundLocked,
          lockScalingY: isBackgroundLocked,
          lockRotation: isBackgroundLocked,
          left: (sheet.x || 0) + renderW / 2,
          top: (sheet.y || 0) + renderH / 2,
          scaleX: curScaleX,
          scaleY: curScaleY,
          angle: sheet.rotation || 0,
          flipX: sheet.flipX || false,
          flipY: sheet.flipY || false,
          opacity: sheet.opacity ?? 1.0,
        });
        img.setCoords();
      }
    });

    canvas.requestRenderAll();
  }, [backgroundSheets, isBackgroundLocked]);

  // 6-0. 활성 시트(activeSheetId) 선택 시 캔버스 활성화(Selection Box) 동기화
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || isBackgroundLocked) return;

    if (activeSheetId) {
      const targetSheet = bgSheetsMapRef.current.get(activeSheetId);
      if (targetSheet && canvas.getActiveObject() !== targetSheet) {
        canvas.setActiveObject(targetSheet);
        canvas.requestRenderAll();
      }
    }
  }, [activeSheetId, isBackgroundLocked]);

  // 6-1. 스토어의 objects 상태 변경 시 (속성 변경, 테두리/색상 실시간 수정, 삭제 등) 캔버스 자동 동기화
  const storeObjects = useDrawingStore((s) => s.objects);
  useEffect(() => {
    if (isDrawingRef.current || isRebuildingRef.current) return;
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    rebuildCanvasObjects(storeObjects);
  }, [storeObjects, rebuildCanvasObjects]);

  // 6-2. 활성 도구 변경 시 객체 이동 잠금(선택 도구에서만 이동 허용) 및 커서 실시간 동기화
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const isSelect = activeTool === "select";
    canvas.selection = isSelect;
    canvas.defaultCursor = activeTool === "pan" ? "grab" : isSelect ? "default" : "crosshair";

    // 선택 도구(select)가 아닐 때는 모든 캔버스 객체의 이동 및 조작을 완벽히 잠금!
    canvas.getObjects().forEach((obj) => {
      if (isBgSheetObject(obj)) return;
      obj.set({
        selectable: isSelect,
        evented: isSelect || activeTool === "wire" || activeTool === "line" || activeTool === "connector" || activeTool === "arrow" || activeTool === "polygon",
        lockMovementX: !isSelect,
        lockMovementY: !isSelect,
        lockRotation: !isSelect,
        lockScalingX: !isSelect,
        lockScalingY: !isSelect,
        hasControls: isSelect,
        hasBorders: isSelect,
      });
      obj.setCoords();
    });

    if (!isSelect) {
      const activeObj = canvas.getActiveObject();
      if (activeObj && !isBgSheetObject(activeObj)) {
        canvas.discardActiveObject();
      }
    }

    canvas.requestRenderAll();
  }, [activeTool, editorMode]);

  // 7. 스토어의 선택 상태(체크박스 다중선택, 단일객체, 그룹) 변경 시 캔버스 시각적 선택(Active Object/ActiveSelection) 완벽 동기화
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const allObjs = useDrawingStore.getState().objects;
    let targetIds: string[] = [];

    // 1) 체크박스로 1개 이상 체크된 경우 -> 체크된 객체들을 최우선으로 캔버스 다중 선택 반영!
    if (checkedObjectIds.length > 0) {
      targetIds = checkedObjectIds;
    } else if (selectedObjectId && selectedObjectId.startsWith("group_")) {
      // 2) 그룹 폴더 자체가 선택된 경우 -> 그룹 멤버 전체 선택
      targetIds = allObjs.filter((o) => o.groupId === selectedObjectId).map((o) => o.id);
    } else if (selectedObjectIds.length > 0) {
      // 3) 단일 또는 다중 객체 선택 (사이드바 자식 클릭, 캔버스 클릭 등)
      targetIds = selectedObjectIds;
    } else if (selectedObjectId) {
      // 4) 단일 객체 선택
      targetIds = [selectedObjectId];
    }

    if (targetIds.length === 0) {
      const active = canvas.getActiveObject();
      if (active && !isBgSheetObject(active)) {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
      }
      return;
    }

    // 캔버스에 이미 활성화된 객체들의 ID와 targetIds가 완벽히 동일하면 재설정하지 않음 (루프/선택 파괴 방지)
    const activeObjects = canvas.getActiveObjects();
    const activeIds = activeObjects.map((o) => (o as any).dataId).filter(Boolean);

    if (
      targetIds.length === activeIds.length &&
      targetIds.every((id) => activeIds.includes(id))
    ) {
      return;
    }

    const matchedShapes = canvas
      .getObjects()
      .filter((o) => !isBgSheetObject(o) && targetIds.includes((o as any).dataId));

    isProgrammaticSelectionRef.current = true;
    if (matchedShapes.length === 1) {
      canvas.discardActiveObject();
      const target = matchedShapes[0];
      target.setCoords();
      canvas.setActiveObject(target);
      canvas.requestRenderAll();
    } else if (matchedShapes.length > 1) {
      canvas.discardActiveObject();
      const selection = new ActiveSelection(matchedShapes, { canvas });
      selection.setCoords();
      canvas.setActiveObject(selection);
      canvas.requestRenderAll();
    }
    setTimeout(() => {
      isProgrammaticSelectionRef.current = false;
    }, 40);
  }, [selectedObjectId, selectedObjectIds, checkedObjectIds]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const scenePt = canvas.getScenePoint(e.nativeEvent);
    const zoom = canvas.getZoom() || 1;

    // 1) 클릭 지점 타겟 객체 탐색 (findTarget -> activeObject -> 인접 객체 근접 탐색)
    const rawTarget = canvas.findTarget(e.nativeEvent) as any;
    let target = rawTarget && rawTarget.target ? rawTarget.target : rawTarget;
    if (!target || isBgSheetObject(target)) {
      const activeObj = canvas.getActiveObject();
      if (activeObj && !isBgSheetObject(activeObj)) {
        target = activeObj;
      }
    }

    // 마우스 커서 부근(35px)의 가장 가까운 객체 자동 탐색 폴백
    if (!target || isBgSheetObject(target)) {
      const allObjs = canvas.getObjects().filter((o) => !isBgSheetObject(o) && (o as any).dataId);
      let bestDist = 35 / zoom;
      for (const obj of allObjs) {
        const closestPt = getClosestPointOnObjectBoundary(scenePt, obj);
        const dist = Math.hypot(scenePt.x - closestPt.x, scenePt.y - closestPt.y);
        if (dist < bestDist) {
          bestDist = dist;
          target = obj;
        }
      }
    }

    const dataId = target && !isBgSheetObject(target) ? (target as any).dataId : undefined;

    let branchPoint: { x: number; y: number } | undefined = undefined;
    let pointType: "start" | "end" | "mid" | "body" | "shape" = "body";
    let pointLabel = "선로";

    if (dataId && target) {
      setSelectedObjectId(dataId);
      setSelectedObjectIds([dataId]);
      canvas.setActiveObject(target as FabricObject);
      canvas.requestRenderAll();

      // 선/도형 위의 가장 가까운 경계선상 지점으로 정밀 투영
      const projectedOnEdge = getClosestPointOnObjectBoundary(scenePt, target);
      branchPoint = projectedOnEdge;

      const vertices = getObjectSceneVertices(target);

      if (vertices.length >= 2) {
        const p1 = vertices[0];
        const pEnd = vertices[vertices.length - 1];
        const distToP1 = Math.hypot(scenePt.x - p1.x, scenePt.y - p1.y);
        const distToEnd = Math.hypot(scenePt.x - pEnd.x, scenePt.y - pEnd.y);

        let closestV = vertices[0];
        let minDist = Math.hypot(scenePt.x - closestV.x, scenePt.y - closestV.y);
        for (let i = 1; i < vertices.length; i++) {
          const v = vertices[i];
          const d = Math.hypot(scenePt.x - v.x, scenePt.y - v.y);
          if (d < minDist) {
            minDist = d;
            closestV = v;
          }
        }

        if (distToP1 <= 24 / zoom) {
          pointType = "start";
          pointLabel = "시작점";
          branchPoint = { x: p1.x, y: p1.y };
        } else if (distToEnd <= 24 / zoom) {
          pointType = "end";
          pointLabel = "끝점";
          branchPoint = { x: pEnd.x, y: pEnd.y };
        } else if (minDist <= 24 / zoom) {
          pointType = "mid";
          pointLabel = "중간 꺾임점";
          branchPoint = { x: closestV.x, y: closestV.y };
        } else {
          pointType = "body";
          pointLabel = "선로";
        }
      } else {
        pointType = "shape";
        pointLabel = "도형 테두리";
      }
    } else if (branchSnapInfoRef.current) {
      branchPoint = branchSnapInfoRef.current.point;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setContextMenu({
        x: Math.min(e.clientX - rect.left, rect.width - 220),
        y: Math.min(e.clientY - rect.top, rect.height - 290),
        objectId: dataId || branchSnapInfoRef.current?.sourceObjectId,
        branchPoint: branchPoint || (dataId ? { x: scenePt.x, y: scenePt.y } : undefined),
        pointType,
        pointLabel,
      });
    }
  };

  return (
    <div
      ref={containerRef}
      onContextMenu={handleContextMenu}
      onClick={() => {
        if (contextMenu) setContextMenu(null);
      }}
      className="relative w-full h-full overflow-hidden bg-slate-950 flex items-center justify-center cursor-default"
    >
      <canvas ref={canvasElRef} />
      <HoverLabelTooltip hoverInfo={hoverInfo} />

      {/* 우클릭 컨텍스트 메뉴 (수정, 꺾임점 편집, 스마트 그룹화, 복제, 삭제, 순서) */}
      {contextMenu && (
        <div
          style={{ left: contextMenu.x, top: contextMenu.y }}
          className="fixed z-[150] w-64 bg-slate-900/98 border border-slate-700 rounded-2xl shadow-2xl p-2 backdrop-blur-2xl text-xs select-none animate-in fade-in zoom-in-95 duration-150 divide-y divide-slate-800/80"
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.objectId ? (
            (() => {
              const allObjs = useDrawingStore.getState().objects;
              const targetObj = allObjs.find((o) => o.id === contextMenu.objectId);
              const isConnectorObj = targetObj?.type === "connector";
              const isHighlightObj = targetObj?.type === "highlight";
              const canEditVertex = targetObj?.type !== "text" && (!isHighlightObj || targetObj?.highlightMode === "point");
              const isGrouped = Boolean(targetObj?.groupId);

              return (
                <div className="space-y-1 py-1">
                  {/* 1) ✏️ 꺾임점/정점 모양 직접 수정 모드 */}
                  {canEditVertex && (
                    <button
                      onClick={() => {
                        const id = contextMenu.objectId!;
                        vertexEditObjectIdRef.current = id;
                        setVertexEditObjectId(id);
                        useUIStore.getState().setActiveTool("select");
                        setPathDrawingHint("✏️ 선/꺾임점 수정 모드: 🔵 점 드래그로 조절 | ➕ 클릭으로 꺾임점 추가 | Del 키로 점 삭제 (Enter: 완료)");
                        setContextMenu(null);
                        const c = fabricCanvasRef.current;
                        if (c) c.requestRenderAll();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white transition cursor-pointer text-left font-bold"
                    >
                      <Edit3 className="w-4 h-4 text-indigo-400" />
                      <span>✏️ 꺾임점/모양 수정 (더블클릭)</span>
                    </button>
                  )}

                  {/* 2) 🔗 스마트 연결된 전체 객체 그룹화 / 해제 */}
                  {targetObj && (
                    <button
                      onClick={() => {
                        pushState(useDrawingStore.getState().objects);
                        if (isGrouped && targetObj.groupId) {
                          ungroup(targetObj.groupId);
                        } else {
                          const gid = useDrawingStore.getState().groupConnectedComponents(targetObj.id);
                          if (!gid && selectedObjectIds.length > 1) {
                            createGroup(selectedObjectIds);
                          }
                        }
                        setContextMenu(null);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition cursor-pointer text-left font-bold ${
                        isGrouped
                          ? "text-rose-300 hover:bg-rose-950/60 hover:text-rose-100"
                          : "text-emerald-300 hover:bg-emerald-950/60 hover:text-emerald-100"
                      }`}
                    >
                      <Share2 className="w-4 h-4" />
                      <span>
                        {isGrouped ? "🔓 그룹 해제 (Ungroup)" : "🔗 연결된 전체 회로망 그룹화"}
                      </span>
                    </button>
                  )}

                  {/* 3) 커넥터 전용: 방향 반전 & 분기선 & 연결 설정 */}
                  {isConnectorObj && targetObj && (
                    <>
                      <button
                        onClick={() => {
                          pushState(useDrawingStore.getState().objects);
                          useDrawingStore.getState().swapConnectorDirection(targetObj.id);
                          setContextMenu(null);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sky-300 hover:bg-sky-600/20 hover:text-sky-200 transition cursor-pointer text-left font-semibold"
                      >
                        <RotateCw className="w-3.5 h-3.5 text-sky-400" />
                        <span>🔄 연결 방향 반전 (A ➔ B 를 B ➔ A)</span>
                      </button>

                      <button
                        onClick={() => {
                          if (targetObj.fromNodeId) {
                            useUIStore.getState().setConnectorParentId(targetObj.fromNodeId);
                          }
                          useUIStore.getState().setConnectorModalOpen(true);
                          setContextMenu(null);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-indigo-300 hover:bg-indigo-600/20 hover:text-indigo-200 transition cursor-pointer text-left font-semibold"
                      >
                        <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                        <span>⚙️ 스마트 커넥터 연결 설정 팝업</span>
                      </button>

                      <button
                        onClick={() => {
                          const bPt = contextMenu.branchPoint || { x: contextMenu.x, y: contextMenu.y };
                          pendingBranchSourceRef.current = {
                            connectorId: targetObj.id,
                            clickPoint: bPt,
                          };
                          setPathDrawingHint("⚡ 중간 분기점을 연결할 자식 객체(사각형/원/부품)를 캔버스에서 클릭하세요 (Esc: 취소)");
                          setContextMenu(null);
                          const c = fabricCanvasRef.current;
                          if (c) {
                            c.defaultCursor = "crosshair";
                            c.requestRenderAll();
                          }
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-amber-300 hover:bg-amber-600/20 hover:text-amber-200 transition cursor-pointer text-left font-semibold"
                      >
                        <GitFork className="w-3.5 h-3.5 text-amber-400" />
                        <span>⚡ 선 중간에 분기점 추가 & 연결</span>
                      </button>
                    </>
                  )}

                  {/* 4) 텍스트 내용 수정 */}
                  {targetObj && (targetObj.type === "text" || targetObj.type === "rectangle" || targetObj.type === "circle" || targetObj.type === "polygon" || targetObj.type === "component") && (
                    <button
                      onClick={() => {
                        const currentText = targetObj.text ?? (targetObj.label || "");
                        const nextText = prompt("수정할 텍스트 내용을 입력하세요:", currentText);
                        if (nextText !== null) {
                          pushState(useDrawingStore.getState().objects);
                          useDrawingStore.getState().updateObject(targetObj.id, { text: nextText, label: nextText });
                        }
                        setContextMenu(null);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 transition cursor-pointer text-left"
                    >
                      <Type className="w-3.5 h-3.5 text-amber-400" />
                      <span>✏️ 텍스트 내용/라벨 수정</span>
                    </button>
                  )}

                  {/* 1) ✏️ 선/정점 모양 직접 수정 (점과 점 형광펜 및 일반 벡터 객체만 지원) */}
                  {canEditVertex && targetObj?.type !== "text" && (
                    <button
                      onClick={() => {
                        const id = contextMenu.objectId!;
                        vertexEditObjectIdRef.current = id;
                        setVertexEditObjectId(id);
                        useUIStore.getState().setActiveTool("select");
                        setPathDrawingHint("✏️ 선 모양 수정 모드: 점 드래그로 조절 | ➕ 클릭으로 꺾임점 추가 | Del 키로 점 삭제 (Enter: 완료)");
                        setContextMenu(null);
                        const c = fabricCanvasRef.current;
                        if (c) c.requestRenderAll();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-indigo-300 hover:bg-indigo-600/20 hover:text-indigo-200 transition cursor-pointer text-left font-bold"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>✏️ 선/정점 모양 수정 (Enter 완료)</span>
                    </button>
                  )}

                  {/* 2) 📍 끝점 연장 또는 ⚡ 중간 분기선 긋기 (형광펜 제외) */}
                  {!isHighlightObj && contextMenu.branchPoint && (
                <>
                  <button
                    onClick={() => {
                      const bPt = contextMenu.branchPoint;
                      const srcId = contextMenu.objectId;
                      setContextMenu(null);
                      if (bPt) {
                        useUIStore.getState().setActiveTool("arrow");
                        isPathDrawingRef.current = true;
                        pathPointsRef.current = [{ x: bPt.x, y: bPt.y }];
                        currentMouseScenePointRef.current = { x: bPt.x, y: bPt.y };
                        if (srcId) {
                          branchStartObjectIdRef.current = srcId;
                        }
                        const isEndOrStart = contextMenu.pointType === "end" || contextMenu.pointType === "start";
                        setPathDrawingHint(
                          isEndOrStart
                            ? `📍 ${contextMenu.pointLabel || "끝점"}에서 이어서 화살표 연장 중: 원하는 끝 지점을 클릭하세요 (클릭 시 즉시 완성 | Esc: 취소)`
                            : `⚡ 중간 분기 화살표 긋는 중: 원하는 끝 지점을 클릭하세요 (클릭 시 즉시 완성 | Esc: 취소)`
                        );
                        const c = fabricCanvasRef.current;
                        if (c) {
                          c.discardActiveObject();
                          c.defaultCursor = "crosshair";
                          c.requestRenderAll();
                        }
                      }
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-emerald-300 hover:bg-emerald-600/20 hover:text-emerald-200 transition cursor-pointer text-left font-bold"
                  >
                    <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      {contextMenu.pointType === "end" || contextMenu.pointType === "start"
                        ? `📍 ${contextMenu.pointLabel || "끝점"} 이어서 화살표 연장`
                        : contextMenu.pointType === "shape"
                        ? "⚡ 모서리에서 분기 화살표 긋기"
                        : "⚡ 중간 분기 화살표 긋기 (새 가지선)"}
                    </span>
                  </button>

                  {/* 3) 🔗 다른 객체로 연결선 자동 생성 버튼 */}
                  <button
                    onClick={() => {
                      const bPt = contextMenu.branchPoint;
                      const srcId = contextMenu.objectId;
                      setContextMenu(null);
                      if (bPt && srcId) {
                        autoConnectingFromRef.current = {
                          sourceObjectId: srcId,
                          startPoint: { x: bPt.x, y: bPt.y },
                        };
                        autoConnectingTargetRef.current = null;
                        setPathDrawingHint("🔗 다른 객체(사각형/원/다각형/선)에 마우스를 올리고 클릭하면 최적 연결선이 자동 생성됩니다 (Enter/Esc 완료)");
                        const c = fabricCanvasRef.current;
                        if (c) {
                          c.discardActiveObject();
                          c.defaultCursor = "crosshair";
                          c.requestRenderAll();
                        }
                      }
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sky-300 hover:bg-sky-600/20 hover:text-sky-200 transition cursor-pointer text-left font-bold"
                  >
                    <Link2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>🔗 다른 객체로 연결 (자동 생성)</span>
                  </button>

                  <div className="h-px bg-slate-800 my-1" />
                </>
              )}

              <button
                onClick={() => {
                  pushState(useDrawingStore.getState().objects);
                  removeObject(contextMenu.objectId!);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-400 hover:bg-rose-600/20 hover:text-rose-200 transition cursor-pointer text-left font-bold"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>객체 삭제 (Delete)</span>
              </button>
            </div>
          );
        })()
      ) : (
        <div className="space-y-1 py-1">
          <button
            onClick={() => {
              const allObjs = useDrawingStore.getState().objects;
              const ids = allObjs.map((o) => o.id);
              setSelectedObjectIds(ids);
              setSelectedObjectId(ids[0] || null);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-indigo-600 hover:text-white transition cursor-pointer text-left"
          >
            <Check className="w-3.5 h-3.5 text-indigo-400" />
            <span>전체 선택 (Ctrl+A)</span>
          </button>

          <button
            onClick={() => {
              setZoom(1.0);
              setPan({ x: 0, y: 0 });
              window.dispatchEvent(new CustomEvent("canvas:reset-view"));
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-indigo-600 hover:text-white transition cursor-pointer text-left"
          >
            <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
            <span>화면 맞춤 (Ctrl+0)</span>
          </button>

          <button
            onClick={() => {
              useUIStore.getState().setShortcutsHelpOpen(true);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-indigo-600 hover:text-white transition cursor-pointer text-left"
          >
            <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
            <span>키보드 단축키 안내 (F1)</span>
          </button>
        </div>
      )}
        </div>
      )}

      {/* 벡터 패스 드로잉 실시간 가이드 힌트 배너 */}
      {pathDrawingHint && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-pink-500/50 shadow-2xl backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2.5 text-xs text-pink-300 font-medium animate-in fade-in slide-in-from-bottom-2 select-none">
          <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse shadow-sm shadow-pink-500/50" />
          <span>{pathDrawingHint}</span>
          <button
            onClick={cancelPathDrawing}
            className="ml-2 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold transition cursor-pointer border border-slate-700"
          >
            취소 (Esc)
          </button>
        </div>
      )}
    </div>
  );
};

