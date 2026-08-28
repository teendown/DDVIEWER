import type { NormalizedPoint, Component, Port, Waypoint, PortDirection } from "../types";

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Port의 실제 World 좌표를 계산하는 유일한 단일 함수
 * World Position = Component.x + Port.position.x, Component.y + Port.position.y
 */
export function getPortWorldPosition(component: Component, port: Port): Point2D {
  return {
    x: component.x + (port.position?.x ?? 0),
    y: component.y + (port.position?.y ?? 0),
  };
}

/**
 * World 좌표 -> Screen/Canvas 뷰포트 좌표 변환
 */
export function worldToScreen(point: Point2D, viewport: Viewport): Point2D {
  return {
    x: (point.x - viewport.x) * viewport.zoom,
    y: (point.y - viewport.y) * viewport.zoom,
  };
}

/**
 * Screen/Canvas 뷰포트 좌표 -> World 좌표 변환
 */
export function screenToWorld(point: Point2D, viewport: Viewport): Point2D {
  if (!viewport.zoom || viewport.zoom === 0) return { x: 0, y: 0 };
  return {
    x: point.x / viewport.zoom + viewport.x,
    y: point.y / viewport.zoom + viewport.y,
  };
}

/**
 * 두 Port와 Waypoint를 잇는 직각 회로도 배선(Orthogonal Routing) 경로 생성
 */
export function calculateOrthogonalWirePath(
  start: Point2D,
  end: Point2D,
  waypoints: Waypoint[] = [],
  startDir: PortDirection = "right",
  endDir: PortDirection = "left"
): Point2D[] {
  // 사용자가 수동으로 지정한 waypoints가 있을 경우, 해당 점들을 순서대로 통과
  if (waypoints && waypoints.length > 0) {
    return [start, ...waypoints, end];
  }

  // 자동 직교 라우팅 (Manhattan Orthogonal Routing)
  const path: Point2D[] = [start];
  const stubLength = 30; // 포트 앞 최소 직선 거리

  let p1: Point2D;
  if (startDir === "right") p1 = { x: start.x + stubLength, y: start.y };
  else if (startDir === "left") p1 = { x: start.x - stubLength, y: start.y };
  else if (startDir === "top") p1 = { x: start.x, y: start.y - stubLength };
  else p1 = { x: start.x, y: start.y + stubLength };

  let p2: Point2D;
  if (endDir === "left") p2 = { x: end.x - stubLength, y: end.y };
  else if (endDir === "right") p2 = { x: end.x + stubLength, y: end.y };
  else if (endDir === "top") p2 = { x: end.x, y: end.y - stubLength };
  else p2 = { x: end.x, y: end.y + stubLength };

  path.push(p1);

  // 중간 절곡점 계산
  if (Math.abs(p1.x - p2.x) > 5) {
    const midX = (p1.x + p2.x) / 2;
    path.push({ x: midX, y: p1.y });
    path.push({ x: midX, y: p2.y });
  } else {
    path.push({ x: p1.x, y: p2.y });
  }

  path.push(p2);
  path.push(end);

  return path;
}

/**
 * 도면 원본 크기 기준 정규화 좌표 (0.0 ~ 1.0) 계산 (하위 호환용)
 */
export function normalizeX(x: number, originalWidth: number): number {
  if (!originalWidth || originalWidth === 0) return 0;
  return Number((x / originalWidth).toFixed(6));
}

export function normalizeY(y: number, originalHeight: number): number {
  if (!originalHeight || originalHeight === 0) return 0;
  return Number((y / originalHeight).toFixed(6));
}

export function normalizePoint(
  pt: { x: number; y: number },
  originalWidth: number,
  originalHeight: number
): NormalizedPoint {
  return {
    x: normalizeX(pt.x, originalWidth),
    y: normalizeY(pt.y, originalHeight),
  };
}

/**
 * 정규화 좌표를 도면 원본 크기 기준 픽셀 좌표로 복원 (하위 호환용)
 */
export function denormalizeX(normX: number, originalWidth: number): number {
  return normX * originalWidth;
}

export function denormalizeY(normY: number, originalHeight: number): number {
  return normY * originalHeight;
}

export function denormalizePoint(
  pt: NormalizedPoint,
  originalWidth: number,
  originalHeight: number
): { x: number; y: number } {
  return {
    x: denormalizeX(pt.x, originalWidth),
    y: denormalizeY(pt.y, originalHeight),
  };
}
