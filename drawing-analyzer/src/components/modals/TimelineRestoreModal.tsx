import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { History, X, Clock, RotateCcw, CheckCircle2, Layers } from "lucide-react";
import { storageService } from "../../services/storageService";
import { useProjectStore } from "../../store/projectStore";
import { useDrawingStore } from "../../store/drawingStore";
import { useHistoryStore } from "../../store/historyStore";
import type { ProjectSnapshot } from "../../types/project";

interface TimelineRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TimelineRestoreModal: React.FC<TimelineRestoreModalProps> = ({ isOpen, onClose }) => {
  const [snapshots, setSnapshots] = useState<ProjectSnapshot[]>([]);
  const [selectedSnap, setSelectedSnap] = useState<ProjectSnapshot | null>(null);
  const [restoredSuccess, setRestoredSuccess] = useState(false);

  const { currentProject } = useProjectStore();
  const { setObjects, objects } = useDrawingStore();
  const { pushState } = useHistoryStore();

  const loadSnapshots = async () => {
    const projId = currentProject?.id || "proj_default";
    const list = await storageService.listSnapshots(projId);
    setSnapshots(list);
    if (list.length > 0) {
      setSelectedSnap(list[0]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSnapshots();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRestore = (snap: ProjectSnapshot) => {
    try {
      const parsedObjects = JSON.parse(snap.dataJson);
      pushState(objects);
      setObjects(parsedObjects);
      setRestoredSuccess(true);
      setTimeout(() => {
        setRestoredSuccess(false);
        onClose();
      }, 1000);
    } catch (e: any) {
      alert("복구 실패: " + e.message);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-white space-y-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-600/20 text-amber-400 rounded-xl border border-amber-500/30">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">시간별 자동 임시저장 타임라인 복구</h3>
              <p className="text-[11px] text-slate-400">작업 중단이나 실수 시 이전 시점으로 자유롭게 롤백</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 타임라인 목록 */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[260px]">
          {snapshots.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
              <Clock className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
              <span>기록된 임시저장 스냅샷이 없습니다.</span>
              <span className="text-[11px] text-slate-600 mt-1">도면을 편집하면 1분 주기로 자동 기록됩니다.</span>
            </div>
          ) : (
            snapshots.map((snap, idx) => {
              const isSelected = selectedSnap?.id === snap.id;
              const date = new Date(snap.timestamp);
              const isLatest = idx === 0;

              return (
                <div
                  key={snap.id}
                  onClick={() => setSelectedSnap(snap)}
                  className={`group p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? "bg-amber-600/20 border-amber-500/60 text-white"
                      : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/60 text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        isLatest ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-100">
                          {date.toLocaleDateString("ko-KR")} {date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                        {isLatest && (
                          <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded">
                            가장 최근
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 bg-slate-800 text-slate-400 text-[10px] rounded">
                          {snap.label || "자동 임시저장"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                        <Layers className="w-3 h-3 text-slate-500" />
                        <span>주석 객체 {snap.objectCount}개 포함</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRestore(snap);
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-md shadow-amber-600/20 flex items-center gap-1 shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>이 시점으로 복구</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* 하단 피드백 */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
          {restoredSuccess ? (
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>성공적으로 복구되었습니다!</span>
            </div>
          ) : (
            <span className="text-slate-400">
              복구 시 현재 작업 상태는 `실행 취소(Ctrl+Z)`로 언제든 다시 되돌릴 수 있습니다.
            </span>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
