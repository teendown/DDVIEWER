import { create } from "zustand";
import type { Drawing, DrawingObject, Component, Wire, Connection, BackgroundSheet, NormalizedPoint } from "../types";
import {
  findOptimalAnchors,
  generateConnectorPoints,
  findClosestPointOnPolyline,
  getPointAlongPolyline,
  routeBranchConnector,
} from "../utils/connectorRouter";

export interface BackgroundTransform {
  rotation: number; // 0, 90, 180, 270 deg
  flipX: boolean;
  flipY: boolean;
  opacity: number; // 0.0 ~ 1.0
  crop?: { x: number; y: number; width: number; height: number };
}

interface DrawingState {
  currentDrawing: Drawing | null;
  drawings: Drawing[];
  objects: DrawingObject[];
  components: Component[];
  wires: Wire[];
  connections: Connection[];
  selectedObjectId: string | null;
  selectedObjectIds: string[]; // 캔버스 다중 선택
  checkedObjectIds: string[];  // 사이드바 그룹화 체크박스 전용 독립 상태 (클릭해도 안 풀림)
  highlightedObjectIds: string[];
  zoom: number; // 0.1 ~ 50.0 (10% ~ 5000%)
  pan: { x: number; y: number };
  viewportRotation: number; // 0, 90, 180, 270 deg (시점 회전)
  saveStatus: "saved" | "saving" | "unsaved" | "error";

  // 포토샵 도면 배경 레이어 상태
  isBackgroundLocked: boolean;
  backgroundTransform: BackgroundTransform;
  backgroundSheets: BackgroundSheet[]; // 다중 도면 시트 레이어 목록 (2장 이상 이어붙이기)
  activeSheetId: string | null; // 현재 선택/조작 중인 시트 ID

  setCurrentDrawing: (drawing: Drawing | null) => void;
  setDrawings: (drawings: Drawing[]) => void;
  addDrawing: (drawing: Drawing) => void;
  setObjects: (objects: DrawingObject[]) => void;
  addObject: (object: DrawingObject) => void;
  updateObject: (id: string, updates: Partial<DrawingObject>) => void;
  batchUpdateObjects: (ids: string[], updates: Partial<DrawingObject>) => void;
  updateObjectId: (oldId: string, newId: string) => void;
  generateNextId: (type: string) => string;
  removeObject: (id: string) => void;
  removeObjects: (ids: string[]) => void;
  duplicateObject: (id: string) => string | null;
  createGroup: (objectIds: string[]) => string | null;
  ungroup: (groupId: string) => void;
  groupConnectedComponents: (objectId: string) => string | null;
  reorderObject: (id: string, action: "bringToFront" | "sendToBack" | "bringForward" | "sendBackward") => void;

  // 뷰포트 시점 회전 (CAD View Rotate)
  setViewportRotation: (rotation: number) => void;
  rotateViewport: (deltaDeg: number) => void;

  // 도면 배경 조작
  toggleBackgroundLock: () => void;
  setBackgroundTransform: (patch: Partial<BackgroundTransform>) => void;
  rotateBackground: (deltaDeg: number) => void;
  flipBackground: (axis: "x" | "y") => void;

  // 다중 배경 시트 (Multi-Sheet) 관리
  setBackgroundSheets: (sheets: BackgroundSheet[]) => void;
  addBackgroundSheet: (sheet: BackgroundSheet) => void;
  updateBackgroundSheet: (id: string, patch: Partial<BackgroundSheet>) => void;
  removeBackgroundSheet: (id: string) => void;
  setActiveSheetId: (id: string | null) => void;
  rotateSheet: (id: string, deltaDeg: number) => void;
  flipSheet: (id: string, axis: "x" | "y") => void;
  cropSheet: (id: string, crop: { x: number; y: number; width: number; height: number } | undefined) => void;

  setComponents: (components: Component[]) => void;
  addComponent: (component: Component) => void;
  updateComponentPosition: (id: string, x: number, y: number) => void;
  updateComponent: (id: string, patch: Partial<Component>) => void;
  removeComponent: (id: string) => void;

  setWires: (wires: Wire[]) => void;
  addWire: (wire: Wire) => void;
  updateWire: (id: string, patch: Partial<Wire>) => void;
  removeWire: (id: string) => void;

  setConnections: (connections: Connection[]) => void;
    connectObjectsBatch: (
    parentId: string,
    childIds: string[],
    mode: "1:N" | "N:1" | "chain",
    options?: Partial<DrawingObject>
  ) => DrawingObject[];
  swapConnectorDirection: (connectorId: string) => void;
  addBranchConnector: (
    parentConnectorId: string,
    clickPoint: NormalizedPoint,
    targetChildId: string,
    options?: Partial<DrawingObject>
  ) => DrawingObject | null;
  updateBranchJunctionPosition: (
    parentConnectorId: string,
    junctionId: string,
    newRatio: number
  ) => void;
  recomputeConnectedLines: (movedObjectIds: string[]) => void;
  setSelectedObjectId: (id: string | null) => void;
  setSelectedObjectIds: (ids: string[]) => void;
  setCheckedObjectIds: (ids: string[]) => void;
  toggleCheckObjectId: (id: string) => void;
  toggleCheckAllObjects: () => void;
  toggleGroupSelection: (groupId: string) => void;
  selectGroupOnly: (groupId: string) => void;
  setHighlightedObjectIds: (ids: string[]) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setSaveStatus: (status: "saved" | "saving" | "unsaved" | "error") => void;
}

export const INITIAL_COMPONENTS: Component[] = [];

export const INITIAL_WIRES: Wire[] = [];

export const useDrawingStore = create<DrawingState>((set, get) => ({
  currentDrawing: null,
  drawings: [],
  objects: [],
  components: INITIAL_COMPONENTS,
  wires: INITIAL_WIRES,
  connections: [],
  selectedObjectId: null,
  selectedObjectIds: [],
  checkedObjectIds: [],
  highlightedObjectIds: [],
  zoom: 1.0,
  pan: { x: 0, y: 0 },
  viewportRotation: 0,
  saveStatus: "saved",

  isBackgroundLocked: true,
  backgroundTransform: {
    rotation: 0,
    flipX: false,
    flipY: false,
    opacity: 1.0,
  },
  backgroundSheets: [],
  activeSheetId: null,

  setViewportRotation: (rotation) => set({ viewportRotation: ((rotation % 360) + 360) % 360 }),
  rotateViewport: (deltaDeg) =>
    set((state) => ({
      viewportRotation: ((state.viewportRotation + deltaDeg) % 360 + 360) % 360,
    })),

  setCurrentDrawing: (drawing) => {
    let initialSheets: BackgroundSheet[] = [];
    if (drawing) {
      if (drawing.backgroundSheets && drawing.backgroundSheets.length > 0) {
        initialSheets = drawing.backgroundSheets;
      } else if (drawing.imagePath) {
        initialSheets = [
          {
            id: "sheet_1",
            title: drawing.title || "도면 시트 1",
            imagePath: drawing.imagePath,
            x: 0,
            y: 0,
            width: drawing.originalWidth || 1600,
            height: drawing.originalHeight || 1200,
            rotation: 0,
            flipX: false,
            flipY: false,
            opacity: 1.0,
            locked: false,
          },
        ];
      }
    }

    set({
      currentDrawing: drawing,
      selectedObjectId: null,
      selectedObjectIds: [],
      highlightedObjectIds: [],
      viewportRotation: 0,
      backgroundTransform: { rotation: 0, flipX: false, flipY: false, opacity: 1.0 },
      isBackgroundLocked: true,
      backgroundSheets: initialSheets,
      activeSheetId: initialSheets[0]?.id || null,
    });
  },
  setDrawings: (drawings) => set({ drawings }),
  addDrawing: (drawing) =>
    set((state) => ({
      drawings: [...state.drawings, drawing],
      currentDrawing: state.currentDrawing || drawing,
    })),

  setObjects: (objects) => set({ objects }),
  generateNextId: (type: string) => {
    const objs = get().objects;
    let prefix = "선";
    if (type === "connector") prefix = "커넥터";
    else if (type === "component") prefix = "부품";
    else if (type === "polygon") prefix = "다각형";
    else if (type === "polyline") prefix = "다각선";
    else if (type === "rectangle" || type === "rect") prefix = "사각형";
    else if (type === "circle") prefix = "원";
    else if (type === "text") prefix = "텍스트";
    else if (type === "arrow") prefix = "화살표";
    else if (type === "highlight") prefix = "형광펜";
    else if (type === "wire" || type === "line") prefix = "선";
    else if (type === "group") prefix = "그룹";

    if (type === "group") {
      const existingGroupNums = objs
        .map((o) => o.groupId)
        .filter((gid): gid is string => !!gid && gid.startsWith(prefix))
        .map((gid) => {
          const match = gid.match(/\d+$/);
          return match ? parseInt(match[0], 10) : 0;
        })
        .filter((n) => !isNaN(n));
      const maxNum = existingGroupNums.length > 0 ? Math.max(...existingGroupNums) : 0;
      return `${prefix} ${maxNum + 1}`;
    }

    const existingNums = objs
      .filter((o) => o.id.startsWith(prefix) || o.type === type)
      .map((o) => {
        const match = o.id.match(/\d+$/);
        return match ? parseInt(match[0], 10) : 0;
      })
      .filter((n) => !isNaN(n));
    const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 0;
    return `${prefix} ${maxNum + 1}`;
  },
  addObject: (object) =>
    set((state) => ({
      objects: [...state.objects, object],
      saveStatus: "unsaved",
    })),
  updateObject: (id, updates) =>
    set((state) => ({
      objects: state.objects.map((obj) =>
        obj.id === id ? { ...obj, ...updates, updatedAt: new Date().toISOString() } : obj
      ),
      saveStatus: "unsaved",
    })),
  batchUpdateObjects: (ids, updates) =>
    set((state) => {
      const idSet = new Set(ids);
      return {
        objects: state.objects.map((obj) =>
          idSet.has(obj.id) ? { ...obj, ...updates, updatedAt: new Date().toISOString() } : obj
        ),
        saveStatus: "unsaved",
      };
    }),

  updateObjectId: (oldId, newId) =>
    set((state) => ({
      objects: state.objects.map((obj) =>
        obj.id === oldId ? { ...obj, id: newId, updatedAt: new Date().toISOString() } : obj
      ),
      selectedObjectId: state.selectedObjectId === oldId ? newId : state.selectedObjectId,
      selectedObjectIds: state.selectedObjectIds.map((id) => (id === oldId ? newId : id)),
      saveStatus: "unsaved",
    })),
  removeObject: (id) =>
    set((state) => ({
      objects: state.objects.filter((obj) => obj.id !== id),
      selectedObjectId: state.selectedObjectId === id ? null : state.selectedObjectId,
      selectedObjectIds: state.selectedObjectIds.filter((item) => item !== id),
      checkedObjectIds: state.checkedObjectIds.filter((item) => item !== id),
      saveStatus: "unsaved",
    })),
  removeObjects: (ids) =>
    set((state) => {
      const setIds = new Set(ids);
      return {
        objects: state.objects.filter((obj) => !setIds.has(obj.id)),
        selectedObjectId:
          state.selectedObjectId && setIds.has(state.selectedObjectId) ? null : state.selectedObjectId,
        selectedObjectIds: state.selectedObjectIds.filter((id) => !setIds.has(id)),
        checkedObjectIds: state.checkedObjectIds.filter((id) => !setIds.has(id)),
        saveStatus: "unsaved",
      };
    }),

  duplicateObject: (id) => {
    const target = get().objects.find((o) => o.id === id);
    if (!target) return null;

    const newId = get().generateNextId(target.type);
    const duplicated: DrawingObject = {
      ...JSON.parse(JSON.stringify(target)),
      id: newId,
      label: target.label ? `${target.label} (복사본)` : undefined,
      x: (target.x || 0) + 0.02, // 살짝 오프셋하여 복제
      y: (target.y || 0) + 0.02,
      points: target.points?.map((p) => ({
        x: p.x + 0.02,
        y: p.y + 0.02,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({
      objects: [...state.objects, duplicated],
      selectedObjectId: newId,
      selectedObjectIds: [newId],
      saveStatus: "unsaved",
    }));

    return newId;
  },

  createGroup: (objectIds) => {
    if (objectIds.length < 2) return null;
    const groupId = get().generateNextId("group");

    set((state) => ({
      objects: state.objects.map((obj) =>
        objectIds.includes(obj.id) ? { ...obj, groupId, updatedAt: new Date().toISOString() } : obj
      ),
      selectedObjectId: groupId,
      selectedObjectIds: objectIds,
      saveStatus: "unsaved",
    }));

    return groupId;
  },

  ungroup: (groupId) => {
    set((state) => ({
      objects: state.objects.map((obj) =>
        obj.groupId === groupId ? { ...obj, groupId: undefined, updatedAt: new Date().toISOString() } : obj
      ),
      saveStatus: "unsaved",
    }));
  },

  groupConnectedComponents: (startId) => {
    const state = get();
    const allObjs = state.objects;
    const startObj = allObjs.find((o) => o.id === startId);
    if (!startObj) return null;

    // BFS를 통해 연결된 모든 커넥터와 부품/도형 탐색
    const visitedIds = new Set<string>();
    const queue: string[] = [startId];
    visitedIds.add(startId);

    while (queue.length > 0) {
      const currId = queue.shift()!;
      const curr = allObjs.find((o) => o.id === currId);
      if (!curr) continue;

      // 1) curr가 커넥터인 경우 -> fromNodeId, toNodeId
      if (curr.type === "connector") {
        if (curr.fromNodeId && !visitedIds.has(curr.fromNodeId)) {
          visitedIds.add(curr.fromNodeId);
          queue.push(curr.fromNodeId);
        }
        if (curr.toNodeId && !visitedIds.has(curr.toNodeId)) {
          visitedIds.add(curr.toNodeId);
          queue.push(curr.toNodeId);
        }
      }

      // 2) curr를 부모 또는 자식으로 두고 있는 모든 커넥터들
      const relatedConns = allObjs.filter(
        (o) => o.type === "connector" && (o.fromNodeId === currId || o.toNodeId === currId)
      );
      for (const conn of relatedConns) {
        if (!visitedIds.has(conn.id)) {
          visitedIds.add(conn.id);
          queue.push(conn.id);
        }
        if (conn.fromNodeId && !visitedIds.has(conn.fromNodeId)) {
          visitedIds.add(conn.fromNodeId);
          queue.push(conn.fromNodeId);
        }
        if (conn.toNodeId && !visitedIds.has(conn.toNodeId)) {
          visitedIds.add(conn.toNodeId);
          queue.push(conn.toNodeId);
        }
      }
    }

    const connectedMemberIds = Array.from(visitedIds);
    if (connectedMemberIds.length < 2) return null;

    return state.createGroup(connectedMemberIds);
  },

  reorderObject: (id, action) => {
    const objs = [...get().objects];
    const index = objs.findIndex((o) => o.id === id);
    if (index === -1) return;

    const [item] = objs.splice(index, 1);
    if (action === "bringToFront") {
      objs.push(item);
    } else if (action === "sendToBack") {
      objs.unshift(item);
    } else if (action === "bringForward") {
      objs.splice(Math.min(index + 1, objs.length), 0, item);
    } else if (action === "sendBackward") {
      objs.splice(Math.max(index - 1, 0), 0, item);
    }

    set({ objects: objs, saveStatus: "unsaved" });
  },

  toggleBackgroundLock: () =>
    set((state) => ({ isBackgroundLocked: !state.isBackgroundLocked })),

  setBackgroundTransform: (patch) =>
    set((state) => ({
      backgroundTransform: { ...state.backgroundTransform, ...patch },
      saveStatus: "unsaved",
    })),

  // 다중 배경 시트 (Multi-Sheet) 액션 구현
  setBackgroundSheets: (sheets) =>
    set({ backgroundSheets: sheets, saveStatus: "unsaved" }),

  addBackgroundSheet: (sheet) =>
    set((state) => {
      const nextSheets = [...state.backgroundSheets, sheet];
      return {
        backgroundSheets: nextSheets,
        activeSheetId: sheet.id,
        saveStatus: "unsaved",
      };
    }),

  updateBackgroundSheet: (id, patch) =>
    set((state) => ({
      backgroundSheets: state.backgroundSheets.map((s) =>
        s.id === id ? { ...s, ...patch } : s
      ),
      saveStatus: "unsaved",
    })),

  removeBackgroundSheet: (id) =>
    set((state) => {
      const remaining = state.backgroundSheets.filter((s) => s.id !== id);
      return {
        backgroundSheets: remaining,
        activeSheetId: state.activeSheetId === id ? (remaining[0]?.id || null) : state.activeSheetId,
        saveStatus: "unsaved",
      };
    }),

  setActiveSheetId: (id) => set({ activeSheetId: id }),

  rotateSheet: (id, deltaDeg) =>
    set((state) => ({
      backgroundSheets: state.backgroundSheets.map((s) =>
        s.id === id ? { ...s, rotation: ((s.rotation || 0) + deltaDeg + 360) % 360 } : s
      ),
      saveStatus: "unsaved",
    })),

  flipSheet: (id, axis) =>
    set((state) => ({
      backgroundSheets: state.backgroundSheets.map((s) =>
        s.id === id
          ? axis === "x"
            ? { ...s, flipX: !s.flipX }
            : { ...s, flipY: !s.flipY }
          : s
      ),
      saveStatus: "unsaved",
    })),

  cropSheet: (id, crop) =>
    set((state) => ({
      backgroundSheets: state.backgroundSheets.map((s) =>
        s.id === id ? { ...s, crop } : s
      ),
      saveStatus: "unsaved",
    })),

  rotateBackground: (deltaDeg) =>
    set((state) => {
      const newRotation = (state.backgroundTransform.rotation + deltaDeg + 360) % 360;
      const isClockwise = deltaDeg > 0;

      // 도면 정중앙 (0.5, 0.5) 기준 모든 객체 일체화 회전 변환
      const rotatedObjects = state.objects.map((obj) => {
        const w = obj.width || 0;
        const h = obj.height || 0;
        const cx = (obj.x || 0) + w / 2;
        const cy = (obj.y || 0) + h / 2;

        let newCx: number;
        let newCy: number;
        const newW = h;
        const newH = w;

        if (isClockwise) {
          // 90° 시계 회전: (cx', cy') = (1 - cy, cx)
          newCx = 1.0 - cy;
          newCy = cx;
        } else {
          // 90° 반시계 회전: (cx', cy') = (cy, 1 - cx)
          newCx = cy;
          newCy = 1.0 - cx;
        }

        const newRot = isClockwise
          ? ((obj.rotation || 0) + 90) % 360
          : ((obj.rotation || 0) - 90 + 360) % 360;

        // points 좌표도 동일하게 회전 변환
        const rotatedPoints = obj.points?.map((p) => {
          if (isClockwise) {
            return { x: 1.0 - p.y, y: p.x };
          } else {
            return { x: p.y, y: 1.0 - p.x };
          }
        });

        return {
          ...obj,
          x: newCx - newW / 2,
          y: newCy - newH / 2,
          width: newW,
          height: newH,
          points: rotatedPoints,
          rotation: newRot,
          updatedAt: new Date().toISOString(),
        };
      });

      return {
        backgroundTransform: { ...state.backgroundTransform, rotation: newRotation },
        objects: rotatedObjects,
        saveStatus: "unsaved",
      };
    }),

  flipBackground: (axis) =>
    set((state) => {
      const newFlipX = axis === "x" ? !state.backgroundTransform.flipX : state.backgroundTransform.flipX;
      const newFlipY = axis === "y" ? !state.backgroundTransform.flipY : state.backgroundTransform.flipY;

      // 도면 반전 시 모든 객체 일체화 반전 변환
      const flippedObjects = state.objects.map((obj) => {
        const w = obj.width || 0;
        const h = obj.height || 0;
        let newX = obj.x || 0;
        let newY = obj.y || 0;

        if (axis === "x") {
          const cx = (obj.x || 0) + w / 2;
          const newCx = 1.0 - cx;
          newX = newCx - w / 2;
        }
        if (axis === "y") {
          const cy = (obj.y || 0) + h / 2;
          const newCy = 1.0 - cy;
          newY = newCy - h / 2;
        }

        const flippedPoints = obj.points?.map((p) => {
          return {
            x: axis === "x" ? 1.0 - p.x : p.x,
            y: axis === "y" ? 1.0 - p.y : p.y,
          };
        });

        return {
          ...obj,
          x: newX,
          y: newY,
          points: flippedPoints,
          updatedAt: new Date().toISOString(),
        };
      });

      return {
        backgroundTransform: {
          ...state.backgroundTransform,
          flipX: newFlipX,
          flipY: newFlipY,
        },
        objects: flippedObjects,
        saveStatus: "unsaved",
      };
    }),

  setComponents: (components) => set({ components, saveStatus: "unsaved" }),
  addComponent: (component) =>
    set((state) => ({
      components: [...state.components, component],
      saveStatus: "unsaved",
    })),
  updateComponentPosition: (id, x, y) =>
    set((state) => ({
      components: state.components.map((c) =>
        c.id === id ? { ...c, x, y, updatedAt: new Date().toISOString() } : c
      ),
      saveStatus: "unsaved",
    })),
  updateComponent: (id, patch) =>
    set((state) => ({
      components: state.components.map((c) =>
        c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c
      ),
      saveStatus: "unsaved",
    })),
  removeComponent: (id) =>
    set((state) => ({
      components: state.components.filter((c) => c.id !== id),
      wires: state.wires.filter((w) => w.source.componentId !== id && w.target.componentId !== id),
      saveStatus: "unsaved",
    })),

  setWires: (wires) => set({ wires, saveStatus: "unsaved" }),
  addWire: (wire) =>
    set((state) => ({
      wires: [...state.wires, wire],
      saveStatus: "unsaved",
    })),
  updateWire: (id, patch) =>
    set((state) => ({
      wires: state.wires.map((w) =>
        w.id === id ? { ...w, ...patch, updatedAt: new Date().toISOString() } : w
      ),
      saveStatus: "unsaved",
    })),
  removeWire: (id) =>
    set((state) => ({
      wires: state.wires.filter((w) => w.id !== id),
      saveStatus: "unsaved",
    })),
  setConnections: (connections) => set({ connections }),

  connectObjectsBatch: (parentId, childIds, mode, options) => {
    const state = get();
    const allObjs = state.objects;
    const parentObj = allObjs.find((o) => o.id === parentId);
    if (!parentObj) return [];

    const dwg = state.currentDrawing;
    const origW = dwg?.originalWidth || 1600;
    const origH = dwg?.originalHeight || 1200;
    const now = new Date().toISOString();

    const pairs: Array<{ src: DrawingObject; tgt: DrawingObject }> = [];

    if (mode === "1:N") {
      childIds.forEach((cid) => {
        if (cid === parentId) return;
        const childObj = allObjs.find((o) => o.id === cid);
        if (childObj) {
          pairs.push({ src: parentObj, tgt: childObj });
        }
      });
    } else if (mode === "N:1") {
      childIds.forEach((cid) => {
        if (cid === parentId) return;
        const childObj = allObjs.find((o) => o.id === cid);
        if (childObj) {
          pairs.push({ src: childObj, tgt: parentObj });
        }
      });
    } else if (mode === "chain") {
      const fullList = [parentObj, ...childIds.filter((cid) => cid !== parentId).map((cid) => allObjs.find((o) => o.id === cid)).filter(Boolean) as DrawingObject[]];
      for (let i = 0; i < fullList.length - 1; i++) {
        pairs.push({ src: fullList[i], tgt: fullList[i + 1] });
      }
    }

    // 스마트 연결된 모든 부품과 선을 하나의 그룹 ID로 통일
    let sharedGroupId = parentObj.groupId;
    if (!sharedGroupId) {
      const existingChildGroup = childIds.map((cid) => allObjs.find((o) => o.id === cid)?.groupId).find(Boolean);
      sharedGroupId = existingChildGroup || `group_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    }

    const createdConnectors: DrawingObject[] = pairs.map(({ src, tgt }, index) => {
      const { sourceAnchor, targetAnchor } = findOptimalAnchors(src, tgt, origW, origH, index, pairs.length);
      const connType = options?.connectorType || "polyline";
      const pts = generateConnectorPoints(sourceAnchor, targetAnchor, connType, origW, origH);

      const srcName = src.label || src.id;
      const tgtName = tgt.label || tgt.id;
      const autoLabel = `${srcName} ➔ ${tgtName}`;
      const connId = `conn_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`;

      const newConnector: DrawingObject = {
        id: connId,
        projectId: dwg?.projectId || "proj_default",
        drawingId: dwg?.id || "dwg_01",
        type: "connector",
        label: autoLabel,
        points: pts,
        fromNodeId: src.id,
        toNodeId: tgt.id,
        fromAnchor: sourceAnchor.position as any,
        toAnchor: targetAnchor.position as any,
        connectorType: connType,
        strokeColor: options?.strokeColor || "#38bdf8",
        strokeWidth: options?.strokeWidth || 3,
        lineStyle: options?.lineStyle || "solid",
        startCap: options?.startCap || "none",
        endCap: options?.endCap || "arrow",
        jointCap: options?.jointCap || "circle",
        arrowScaleRatio: options?.arrowScaleRatio || 1.0,
        groupId: sharedGroupId,
        visible: true,
        locked: false,
        createdAt: now,
        updatedAt: now,
      };

      return newConnector;
    });

    if (createdConnectors.length > 0) {
      // 부모와 자식 객체들에도 동일한 groupId 부여
      const updatedObjs = allObjs.map((o) => {
        if (o.id === parentId || childIds.includes(o.id)) {
          return { ...o, groupId: sharedGroupId, updatedAt: now };
        }
        return o;
      });

      const nextObjs = [...updatedObjs, ...createdConnectors];
      const allGroupMemberIds = [parentId, ...childIds, ...createdConnectors.map((c) => c.id)];

      set({
        objects: nextObjs,
        selectedObjectIds: allGroupMemberIds,
        checkedObjectIds: allGroupMemberIds,
        selectedObjectId: createdConnectors[0].id,
        saveStatus: "unsaved",
      });
    }

    return createdConnectors;
  },

  swapConnectorDirection: (connectorId: string) => {
    const state = get();
    const allObjs = state.objects;
    const conn = allObjs.find((o) => o.id === connectorId);
    if (!conn || conn.type !== "connector" || !conn.fromNodeId || !conn.toNodeId) return;

    const dwg = state.currentDrawing;
    const origW = dwg?.originalWidth || 1600;
    const origH = dwg?.originalHeight || 1200;

    const newFromNodeId = conn.toNodeId;
    const newToNodeId = conn.fromNodeId;
    const src = allObjs.find((o) => o.id === newFromNodeId);
    const tgt = allObjs.find((o) => o.id === newToNodeId);
    if (!src || !tgt) return;

    const { sourceAnchor, targetAnchor } = findOptimalAnchors(src, tgt, origW, origH);
    const pts = generateConnectorPoints(sourceAnchor, targetAnchor, conn.connectorType || "polyline", origW, origH);

    const srcName = src.label || src.id;
    const tgtName = tgt.label || tgt.id;
    const autoLabel = `${srcName} ➔ ${tgtName}`;

    const updatedObjs = allObjs.map((o) =>
      o.id === connectorId
        ? {
            ...o,
            fromNodeId: newFromNodeId,
            toNodeId: newToNodeId,
            fromAnchor: sourceAnchor.position as any,
            toAnchor: targetAnchor.position as any,
            label: autoLabel,
            points: pts,
            updatedAt: new Date().toISOString(),
          }
        : o
    );

    set({ objects: updatedObjs, saveStatus: "unsaved" });
  },

  addBranchConnector: (parentConnectorId, clickPoint, targetChildId, options) => {
    const state = get();
    const allObjs = state.objects;
    const parentConn = allObjs.find((o) => o.id === parentConnectorId);
    if (!parentConn || parentConn.type !== "connector" || !parentConn.points) return null;

    const targetChild = allObjs.find((o) => o.id === targetChildId);
    if (!targetChild) return null;

    const dwg = state.currentDrawing;
    const origW = dwg?.originalWidth || 1600;
    const origH = dwg?.originalHeight || 1200;
    const now = new Date().toISOString();

    // 1) 클릭한 위치와 가장 가까운 메인 와이어 경로 상의 분기점(Junction Tap) 계산
    const { point: branchPoint, ratio } = findClosestPointOnPolyline(parentConn.points, clickPoint, origW, origH);
    const junctionId = `junc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const existingJunctions = parentConn.branchJunctionPoints || [];
    const updatedJunctions = [...existingJunctions, { id: junctionId, ratio, point: branchPoint }];

    // 2) 분기점에서 타겟 자식 객체로의 최단거리 직각/직선 경로 생성
    const connType = options?.connectorType || parentConn.connectorType || "polyline";
    const { points: branchPts, targetAnchor } = routeBranchConnector(branchPoint, targetChild, origW, origH, connType);

    const parentLabel = parentConn.label || parentConn.id;
    const childLabel = targetChild.label || targetChild.id;
    const branchLabel = `${parentLabel} ↳ ${childLabel}`;
    const branchConnId = `conn_branch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newBranchConn: DrawingObject = {
      id: branchConnId,
      projectId: dwg?.projectId || "proj_default",
      drawingId: dwg?.id || "dwg_01",
      type: "connector",
      label: branchLabel,
      points: branchPts,
      fromNodeId: parentConn.id,
      toNodeId: targetChild.id,
      branchFromConnectorId: parentConn.id,
      branchRatio: ratio,
      fromAnchor: "center",
      toAnchor: targetAnchor.position as any,
      connectorType: connType,
      strokeColor: options?.strokeColor || parentConn.strokeColor || "#38bdf8",
      strokeWidth: options?.strokeWidth || parentConn.strokeWidth || 3,
      lineStyle: options?.lineStyle || parentConn.lineStyle || "solid",
      startCap: "circle", // 분기점 시작은 원형 접점 마커
      endCap: options?.endCap || "arrow",
      jointCap: options?.jointCap || "circle",
      arrowScaleRatio: options?.arrowScaleRatio || 1.0,
      visible: true,
      locked: false,
      createdAt: now,
      updatedAt: now,
    };

    const nextObjs = allObjs
      .map((o) => (o.id === parentConnectorId ? { ...o, branchJunctionPoints: updatedJunctions } : o))
      .concat(newBranchConn);

    set({
      objects: nextObjs,
      selectedObjectId: branchConnId,
      selectedObjectIds: [branchConnId],
      checkedObjectIds: [branchConnId],
      saveStatus: "unsaved",
    });

    return newBranchConn;
  },

  updateBranchJunctionPosition: (parentConnectorId, junctionId, newRatio) => {
    const state = get();
    const allObjs = state.objects;
    const parentConn = allObjs.find((o) => o.id === parentConnectorId);
    if (!parentConn || !parentConn.points || !parentConn.branchJunctionPoints) return;

    const dwg = state.currentDrawing;
    const origW = dwg?.originalWidth || 1600;
    const origH = dwg?.originalHeight || 1200;

    const clampedRatio = Math.max(0.05, Math.min(0.95, newRatio));
    const newBranchPt = getPointAlongPolyline(parentConn.points, clampedRatio, origW, origH);

    const updatedJunctions = parentConn.branchJunctionPoints.map((j) =>
      j.id === junctionId ? { ...j, ratio: clampedRatio, point: newBranchPt } : j
    );

    const updatedObjs = allObjs.map((obj) => {
      if (obj.id === parentConnectorId) {
        return { ...obj, branchJunctionPoints: updatedJunctions };
      }
      if (obj.type === "connector" && obj.branchFromConnectorId === parentConnectorId && Math.abs((obj.branchRatio ?? 0) - clampedRatio) < 0.08) {
        const tgtObj = allObjs.find((o) => o.id === obj.toNodeId);
        if (tgtObj) {
          const { points: newPts, targetAnchor } = routeBranchConnector(newBranchPt, tgtObj, origW, origH, obj.connectorType || "polyline");
          return {
            ...obj,
            points: newPts,
            branchRatio: clampedRatio,
            toAnchor: targetAnchor.position as any,
            updatedAt: new Date().toISOString(),
          };
        }
      }
      return obj;
    });

    set({ objects: updatedObjs, saveStatus: "unsaved" });
  },

  recomputeConnectedLines: (movedObjectIds) => {
    const state = get();
    const allObjs = state.objects;
    const dwg = state.currentDrawing;
    const origW = dwg?.originalWidth || 1600;
    const origH = dwg?.originalHeight || 1200;

    let hasChanges = false;
    const movedSet = new Set(movedObjectIds);

    // 각 부모별 연결된 커넥터 목록 그룹화 (중복 겹침 방지 인덱싱)
    const parentToConnMap = new Map<string, DrawingObject[]>();
    allObjs.forEach((o) => {
      if (o.type === "connector" && o.fromNodeId) {
        const list = parentToConnMap.get(o.fromNodeId) || [];
        list.push(o);
        parentToConnMap.set(o.fromNodeId, list);
      }
    });

    let updatedObjs = allObjs.map((obj) => {
      if (obj.type !== "connector") return obj;

      // 1) 일반 메인 커넥터 (부모 객체 ➔ 자식 객체)
      if (!obj.branchFromConnectorId && obj.fromNodeId && obj.toNodeId) {
        const isSrcMoved = movedSet.has(obj.fromNodeId);
        const isTgtMoved = movedSet.has(obj.toNodeId);
        if (!isSrcMoved && !isTgtMoved) return obj;

        const src = allObjs.find((o) => o.id === obj.fromNodeId);
        const tgt = allObjs.find((o) => o.id === obj.toNodeId);
        if (!src || !tgt) return obj;

        const siblingConns = parentToConnMap.get(obj.fromNodeId) || [obj];
        const offsetIndex = Math.max(0, siblingConns.findIndex((c) => c.id === obj.id));
        const totalOffsets = siblingConns.length;

        const { sourceAnchor, targetAnchor } = findOptimalAnchors(src, tgt, origW, origH, offsetIndex, totalOffsets);
        const pts = generateConnectorPoints(sourceAnchor, targetAnchor, obj.connectorType || "polyline", origW, origH);

        // 메인 커넥터에 분기점(Junctions)이 있다면 새 경로 상의 동일 비율(ratio) 위치로 분기점 좌표도 자동 갱신
        let updatedJunctions = obj.branchJunctionPoints;
        if (updatedJunctions && updatedJunctions.length > 0) {
          updatedJunctions = updatedJunctions.map((j) => ({
            ...j,
            point: getPointAlongPolyline(pts, j.ratio, origW, origH),
          }));
        }

        hasChanges = true;
        movedSet.add(obj.id); // 메인 커넥터가 이동되었으므로 하위 분기선들도 갱신 대상에 추가
        return {
          ...obj,
          points: pts,
          branchJunctionPoints: updatedJunctions,
          fromAnchor: sourceAnchor.position as any,
          toAnchor: targetAnchor.position as any,
          updatedAt: new Date().toISOString(),
        };
      }

      return obj;
    });

    // 2) 메인 커넥터에서 파생된 하위 분기선(Branch Connectors) 갱신
    updatedObjs = updatedObjs.map((obj) => {
      if (obj.type !== "connector" || !obj.branchFromConnectorId) return obj;

      const isHostMoved = movedSet.has(obj.branchFromConnectorId);
      const isTgtMoved = movedSet.has(obj.toNodeId || "");
      if (!isHostMoved && !isTgtMoved) return obj;

      const hostConn = updatedObjs.find((o) => o.id === obj.branchFromConnectorId);
      const tgt = updatedObjs.find((o) => o.id === obj.toNodeId);
      if (!hostConn || !hostConn.points || !tgt) return obj;

      const ratio = obj.branchRatio ?? 0.5;
      const branchPt = getPointAlongPolyline(hostConn.points, ratio, origW, origH);
      const { points: branchPts, targetAnchor } = routeBranchConnector(branchPt, tgt, origW, origH, obj.connectorType || "polyline");

      hasChanges = true;
      return {
        ...obj,
        points: branchPts,
        toAnchor: targetAnchor.position as any,
        updatedAt: new Date().toISOString(),
      };
    });

    if (hasChanges) {
      set({ objects: updatedObjs, saveStatus: "unsaved" });
    }
  },

  setSelectedObjectId: (id) => {
    if (!id) {
      set({ selectedObjectId: null, selectedObjectIds: [], checkedObjectIds: [] });
      return;
    }
    const objs = get().objects;
    const isGroup = objs.some((o) => o.groupId === id);
    if (isGroup) {
      const memberIds = objs.filter((o) => o.groupId === id).map((o) => o.id);
      set({ selectedObjectId: id, selectedObjectIds: memberIds, checkedObjectIds: memberIds });
    } else {
      set({ selectedObjectId: id, selectedObjectIds: [id], checkedObjectIds: [id] });
    }
  },

  setSelectedObjectIds: (ids) => {
    const objs = get().objects;
    let selId: string | null = null;
    if (ids.length === 1) {
      selId = ids[0];
    } else if (ids.length > 1) {
      const selectedMembers = objs.filter((o) => ids.includes(o.id));
      const firstGid = selectedMembers[0]?.groupId;
      if (firstGid && selectedMembers.every((o) => o.groupId === firstGid)) {
        const allGroupMembers = objs.filter((o) => o.groupId === firstGid);
        if (allGroupMembers.length === ids.length) {
          selId = firstGid;
        }
      }
    }
    set({ selectedObjectIds: ids, checkedObjectIds: ids, selectedObjectId: selId });
  },

  setCheckedObjectIds: (ids) => {
    const selId = ids.length === 1 ? ids[0] : null;
    set({ checkedObjectIds: ids, selectedObjectIds: ids, selectedObjectId: selId });
  },

  toggleCheckObjectId: (id) => {
    const current = get().selectedObjectIds;
    let next: string[];
    if (current.includes(id)) {
      next = current.filter((item) => item !== id);
    } else {
      next = [...current, id];
    }
    const selId = next.length === 1 ? next[0] : (next.includes(id) ? id : next[0] || null);
    set({
      selectedObjectIds: next,
      checkedObjectIds: next,
      selectedObjectId: selId,
    });
  },

  toggleCheckAllObjects: () => {
    const allObjs = get().objects;
    const current = get().selectedObjectIds;
    if (current.length === allObjs.length && allObjs.length > 0) {
      set({ selectedObjectIds: [], checkedObjectIds: [], selectedObjectId: null });
    } else {
      const allIds = allObjs.map((o) => o.id);
      set({ selectedObjectIds: allIds, checkedObjectIds: allIds, selectedObjectId: null });
    }
  },

  toggleGroupSelection: (groupId) => {
    const objs = get().objects;
    const memberIds = objs.filter((o) => o.groupId === groupId).map((o) => o.id);
    if (memberIds.length === 0) return;

    const current = get().selectedObjectIds;
    const allSelected = memberIds.every((id) => current.includes(id));

    let next: string[];
    if (allSelected) {
      next = current.filter((id) => !memberIds.includes(id));
    } else {
      next = Array.from(new Set([...current, ...memberIds]));
    }

    set({
      selectedObjectIds: next,
      checkedObjectIds: next,
      selectedObjectId: allSelected ? (next.length === 1 ? next[0] : null) : groupId,
    });
  },

  selectGroupOnly: (groupId) => {
    const objs = get().objects;
    const memberIds = objs.filter((o) => o.groupId === groupId).map((o) => o.id);
    if (memberIds.length === 0) return;

    const current = get().selectedObjectIds;
    const currentSelId = get().selectedObjectId;

    // 이미 이 그룹 전체만 단독 선택되어 있는 상태라면 -> 토글 해제
    const isCurrentlyOnlyThisGroup =
      (currentSelId === groupId && current.length === memberIds.length) ||
      (current.length === memberIds.length && memberIds.every((id) => current.includes(id)));

    if (isCurrentlyOnlyThisGroup) {
      set({ selectedObjectId: null, selectedObjectIds: [], checkedObjectIds: [] });
    } else {
      set({ selectedObjectId: groupId, selectedObjectIds: memberIds, checkedObjectIds: memberIds });
    }
  },

  setHighlightedObjectIds: (ids) => set({ highlightedObjectIds: ids }),
  setZoom: (zoom) => set({ zoom }),
  setPan: (pan) => set({ pan }),
  setSaveStatus: (status) => set({ saveStatus: status }),
}));
