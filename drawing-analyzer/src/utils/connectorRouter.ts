import type { DrawingObject, NormalizedPoint } from "../types/object";

export interface AnchorPoint {
  position: "top" | "bottom" | "left" | "right";
  point: NormalizedPoint;
  normal: { x: number; y: number }; // Direction normal for orthogonal routing
}

export interface ObjectBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  cx: number;
  cy: number;
  width: number;
  height: number;
}

/**
 * 객체의 바운딩 박스를 계산합니다.
 */
export function getObjectBounds(obj: DrawingObject, origW: number = 1600, origH: number = 1200): ObjectBounds {
  let minX = 0;
  let minY = 0;
  let maxX = 0;
  let maxY = 0;

  if (obj.points && obj.points.length > 0) {
    const xs = obj.points.map((p) => p.x * origW);
    const ys = obj.points.map((p) => p.y * origH);
    minX = Math.min(...xs);
    maxX = Math.max(...xs);
    minY = Math.min(...ys);
    maxY = Math.max(...ys);
  } else {
    minX = (obj.x ?? 0) * origW;
    minY = (obj.y ?? 0) * origH;
    maxX = minX + (obj.width ?? 0.1) * origW;
    maxY = minY + (obj.height ?? 0.1) * origH;
  }

  const width = Math.max(maxX - minX, 10);
  const height = Math.max(maxY - minY, 10);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  return { minX, minY, maxX, maxY, cx, cy, width, height };
}

/**
 * 모서리를 배제하고 4개 변(상/하/좌/우)의 정중앙 또는 분산 앵커 포인트를 반환합니다.
 */
export function getObjectAnchors(
  obj: DrawingObject,
  origW: number = 1600,
  origH: number = 1200,
  targetBounds?: ObjectBounds,
  offsetIndex: number = 0,
  totalOffsets: number = 1
): AnchorPoint[] {
  const bounds = getObjectBounds(obj, origW, origH);

  // 기본 중심점
  let topX = bounds.cx;
  let bottomX = bounds.cx;
  let leftY = bounds.cy;
  let rightY = bounds.cy;

  // 여러 연결선이 동일한 변에 몰릴 때 겹치지 않도록 변을 따라 스마트 분산
  if (totalOffsets > 1) {
    const stepRatio = 0.6 / Math.max(totalOffsets - 1, 1);
    const offsetRatio = 0.2 + offsetIndex * stepRatio; // 20% ~ 80% 범위 내 안전 분산

    topX = bounds.minX + bounds.width * offsetRatio;
    bottomX = bounds.minX + bounds.width * offsetRatio;
    leftY = bounds.minY + bounds.height * offsetRatio;
    rightY = bounds.minY + bounds.height * offsetRatio;
  } else if (targetBounds) {
    // 단일 연결 시 타겟 객체의 중심 방향으로 변의 25% ~ 75% 범위 내에서 살짝 편향
    const clampedX = Math.max(bounds.minX + bounds.width * 0.25, Math.min(bounds.maxX - bounds.width * 0.25, targetBounds.cx));
    const clampedY = Math.max(bounds.minY + bounds.height * 0.25, Math.min(bounds.maxY - bounds.height * 0.25, targetBounds.cy));
    topX = clampedX;
    bottomX = clampedX;
    leftY = clampedY;
    rightY = clampedY;
  }

  return [
    { position: "top", point: { x: topX / origW, y: bounds.minY / origH }, normal: { x: 0, y: -1 } },
    { position: "bottom", point: { x: bottomX / origW, y: bounds.maxY / origH }, normal: { x: 0, y: 1 } },
    { position: "left", point: { x: bounds.minX / origW, y: leftY / origH }, normal: { x: -1, y: 0 } },
    { position: "right", point: { x: bounds.maxX / origW, y: rightY / origH }, normal: { x: 1, y: 0 } },
  ];
}

/**
 * 두 객체 간의 변 중심 최단 거리 최적 앵커 쌍을 계산합니다.
 */
export function findOptimalAnchors(
  sourceObj: DrawingObject,
  targetObj: DrawingObject,
  origW: number = 1600,
  origH: number = 1200,
  offsetIndex: number = 0,
  totalOffsets: number = 1
): { sourceAnchor: AnchorPoint; targetAnchor: AnchorPoint; distance: number } {
  const sourceBounds = getObjectBounds(sourceObj, origW, origH);
  const targetBounds = getObjectBounds(targetObj, origW, origH);

  const sourceAnchors = getObjectAnchors(sourceObj, origW, origH, targetBounds, offsetIndex, totalOffsets);
  const targetAnchors = getObjectAnchors(targetObj, origW, origH, sourceBounds, 0, 1);

  let bestDistance = Infinity;
  let bestSource = sourceAnchors[3]; // 기본 right
  let bestTarget = targetAnchors[2]; // 기본 left

  for (const s of sourceAnchors) {
    const sx = s.point.x * origW;
    const sy = s.point.y * origH;

    for (const t of targetAnchors) {
      const tx = t.point.x * origW;
      const ty = t.point.y * origH;

      const dist = Math.hypot(tx - sx, ty - sy);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestSource = s;
        bestTarget = t;
      }
    }
  }

  return {
    sourceAnchor: bestSource,
    targetAnchor: bestTarget,
    distance: bestDistance,
  };
}

/**
 * 연결 방식에 맞춰 정규화된 경로 정점들을 생성합니다.
 */
export function generateConnectorPoints(
  sourceAnchor: AnchorPoint,
  targetAnchor: AnchorPoint,
  connectorType: "polyline" | "curve" | "straight" = "polyline",
  _origW: number = 1600,
  _origH: number = 1200
): NormalizedPoint[] {
  const p1 = sourceAnchor.point;
  const p2 = targetAnchor.point;

  if (connectorType === "straight") {
    return [p1, p2];
  }

  const sPos = sourceAnchor.position;
  const tPos = targetAnchor.position;

  if (connectorType === "polyline") {
    // 직각 CAD 배선 경로 생성
    const isHorizontalSource = sPos === "left" || sPos === "right";
    const isHorizontalTarget = tPos === "left" || tPos === "right";

    if (isHorizontalSource && isHorizontalTarget) {
      const midX = (p1.x + p2.x) / 2;
      return [
        p1,
        { x: midX, y: p1.y },
        { x: midX, y: p2.y },
        p2,
      ];
    } else if (!isHorizontalSource && !isHorizontalTarget) {
      const midY = (p1.y + p2.y) / 2;
      return [
        p1,
        { x: p1.x, y: midY },
        { x: p2.x, y: midY },
        p2,
      ];
    } else if (isHorizontalSource && !isHorizontalTarget) {
      return [
        p1,
        { x: p2.x, y: p1.y },
        p2,
      ];
    } else {
      return [
        p1,
        { x: p1.x, y: p2.y },
        p2,
      ];
    }
  }

  if (connectorType === "curve") {
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    return [p1, { x: midX, y: midY }, p2];
  }

  return [p1, p2];
}

/**
 * 주어진 클릭 좌표와 가장 가까운 폴리라인 경로 상의 수선의 발 좌표 및 비율 (0.0 ~ 1.0) 계산
 */
export function findClosestPointOnPolyline(
  points: NormalizedPoint[],
  clickPoint: NormalizedPoint,
  origW: number = 1600,
  origH: number = 1200
): { point: NormalizedPoint; ratio: number; segmentIndex: number; distance: number } {
  if (!points || points.length < 2) {
    return { point: clickPoint, ratio: 0.5, segmentIndex: 0, distance: 0 };
  }

  const pixelPts = points.map((p) => ({ x: p.x * origW, y: p.y * origH }));
  const cPt = { x: clickPoint.x * origW, y: clickPoint.y * origH };

  // 각 세그먼트 길이 계산
  const segLengths: number[] = [];
  let totalLength = 0;
  for (let i = 0; i < pixelPts.length - 1; i++) {
    const d = Math.hypot(pixelPts[i + 1].x - pixelPts[i].x, pixelPts[i + 1].y - pixelPts[i].y);
    segLengths.push(d);
    totalLength += d;
  }

  if (totalLength === 0) {
    return { point: points[0], ratio: 0, segmentIndex: 0, distance: 0 };
  }

  let minDistance = Infinity;
  let bestPoint = pixelPts[0];
  let bestSegIndex = 0;
  let bestDistAlongPath = 0;

  let accumulatedDist = 0;
  for (let i = 0; i < pixelPts.length - 1; i++) {
    const p1 = pixelPts[i];
    const p2 = pixelPts[i + 1];
    const segLen = segLengths[i];

    if (segLen === 0) continue;

    // 투영 t 계산 (0 <= u <= 1)
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const u = Math.max(0, Math.min(1, ((cPt.x - p1.x) * dx + (cPt.y - p1.y) * dy) / (segLen * segLen)));

    const projX = p1.x + u * dx;
    const projY = p1.y + u * dy;
    const dist = Math.hypot(cPt.x - projX, cPt.y - projY);

    if (dist < minDistance) {
      minDistance = dist;
      bestPoint = { x: projX, y: projY };
      bestSegIndex = i;
      bestDistAlongPath = accumulatedDist + u * segLen;
    }

    accumulatedDist += segLen;
  }

  const ratio = Math.max(0.05, Math.min(0.95, bestDistAlongPath / totalLength));

  return {
    point: { x: bestPoint.x / origW, y: bestPoint.y / origH },
    ratio,
    segmentIndex: bestSegIndex,
    distance: minDistance,
  };
}

/**
 * 폴리라인 경로 상의 특정 비율 (ratio: 0.0 ~ 1.0)에 위치한 정규화 좌표를 반환
 */
export function getPointAlongPolyline(
  points: NormalizedPoint[],
  ratio: number,
  origW: number = 1600,
  origH: number = 1200
): NormalizedPoint {
  if (!points || points.length === 0) return { x: 0.5, y: 0.5 };
  if (points.length === 1) return points[0];

  const clampedRatio = Math.max(0, Math.min(1, ratio));
  const pixelPts = points.map((p) => ({ x: p.x * origW, y: p.y * origH }));

  const segLengths: number[] = [];
  let totalLength = 0;
  for (let i = 0; i < pixelPts.length - 1; i++) {
    const d = Math.hypot(pixelPts[i + 1].x - pixelPts[i].x, pixelPts[i + 1].y - pixelPts[i].y);
    segLengths.push(d);
    totalLength += d;
  }

  if (totalLength === 0) return points[0];

  const targetDist = clampedRatio * totalLength;
  let currentDist = 0;

  for (let i = 0; i < pixelPts.length - 1; i++) {
    const segLen = segLengths[i];
    if (currentDist + segLen >= targetDist) {
      const u = segLen === 0 ? 0 : (targetDist - currentDist) / segLen;
      const x = pixelPts[i].x + u * (pixelPts[i + 1].x - pixelPts[i].x);
      const y = pixelPts[i].y + u * (pixelPts[i + 1].y - pixelPts[i].y);
      return { x: x / origW, y: y / origH };
    }
    currentDist += segLen;
  }

  return points[points.length - 1];
}

/**
 * 분기점(Branch Tap Point)에서 대상 자식 객체로의 최적 직각/직선 경로를 생성합니다.
 */
export function routeBranchConnector(
  branchPt: NormalizedPoint,
  targetObj: DrawingObject,
  origW: number = 1600,
  origH: number = 1200,
  connectorType: "polyline" | "curve" | "straight" = "polyline"
): { points: NormalizedPoint[]; targetAnchor: AnchorPoint } {
  const targetAnchors = getObjectAnchors(targetObj, origW, origH, undefined, 0, 1);

  const bx = branchPt.x * origW;
  const by = branchPt.y * origH;

  let bestDistance = Infinity;
  let bestTarget = targetAnchors[2]; // 기본 left

  for (const t of targetAnchors) {
    const tx = t.point.x * origW;
    const ty = t.point.y * origH;
    const dist = Math.hypot(tx - bx, ty - by);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestTarget = t;
    }
  }

  const p1 = branchPt;
  const p2 = bestTarget.point;

  let points: NormalizedPoint[] = [p1, p2];

  if (connectorType === "polyline") {
    const isHorizontalTarget = bestTarget.position === "left" || bestTarget.position === "right";
    if (isHorizontalTarget) {
      // 타겟 도착이 수평(좌/우 변)이므로 마지막 선분이 수평으로 직각 진입
      points = [
        p1,
        { x: p1.x, y: p2.y },
        p2,
      ];
    } else {
      // 타겟 도착이 수직(상/하 변)이므로 마지막 선분이 수직으로 직각 진입
      points = [
        p1,
        { x: p2.x, y: p1.y },
        p2,
      ];
    }
  } else if (connectorType === "curve") {
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    points = [p1, { x: midX, y: midY }, p2];
  }

  return { points, targetAnchor: bestTarget };
}
