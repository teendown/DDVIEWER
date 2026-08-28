import { create } from "zustand";
import type { DrawingObject } from "../types";
import { useDrawingStore } from "./drawingStore";

interface HistoryState {
  undoStack: DrawingObject[][];
  redoStack: DrawingObject[][];
  canUndo: boolean;
  canRedo: boolean;

  pushState: (currentObjects: DrawingObject[]) => void;
  undo: () => DrawingObject[] | null;
  redo: () => DrawingObject[] | null;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  undoStack: [],
  redoStack: [],
  canUndo: false,
  canRedo: false,

  pushState: (currentObjects) => {
    // 깊은 복사로 스냅샷 저장
    const snapshot = JSON.parse(JSON.stringify(currentObjects));
    set((state) => {
      const newUndoStack = [...state.undoStack, snapshot].slice(-50); // 최대 50단계 저장
      return {
        undoStack: newUndoStack,
        redoStack: [], // 새로운 액션이 생기면 redo는 초기화
        canUndo: newUndoStack.length > 0,
        canRedo: false,
      };
    });
  },

  undo: () => {
    const { undoStack, redoStack } = get();
    if (undoStack.length === 0) return null;

    const currentObjs = useDrawingStore.getState().objects;
    const previousState = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);
    const newRedoStack = [...redoStack, JSON.parse(JSON.stringify(currentObjs))];

    set({
      undoStack: newUndoStack,
      redoStack: newRedoStack,
      canUndo: newUndoStack.length > 0,
      canRedo: true,
    });

    return previousState;
  },

  redo: () => {
    const { undoStack, redoStack } = get();
    if (redoStack.length === 0) return null;

    const currentObjs = useDrawingStore.getState().objects;
    const nextState = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);
    const newUndoStack = [...undoStack, JSON.parse(JSON.stringify(currentObjs))];

    set({
      undoStack: newUndoStack,
      redoStack: newRedoStack,
      canUndo: true,
      canRedo: newRedoStack.length > 0,
    });

    return nextState;
  },

  clearHistory: () => set({ undoStack: [], redoStack: [], canUndo: false, canRedo: false }),
}));
