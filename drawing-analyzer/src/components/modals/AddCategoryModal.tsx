import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Plus, X, Factory, Truck, Wrench } from "lucide-react";
import { useCategoryStore } from "../../store/categoryStore";

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "manufacturer" | "model" | "systemCategory";
  targetMaker?: string; // model 추가 시 기준 제조사
}

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
  isOpen,
  onClose,
  type,
  targetMaker,
}) => {
  const [name, setName] = useState("");
  const { addManufacturer, addModel, addSystemCategory, selectedManufacturer } = useCategoryStore();

  if (!isOpen) return null;

  const currentMaker = targetMaker || selectedManufacturer;

  const getTitle = () => {
    switch (type) {
      case "manufacturer":
        return "새 제조사 추가";
      case "model":
        return `[${currentMaker}] 새 기종/모델 추가`;
      case "systemCategory":
        return "새 계통/부위 추가";
    }
  };

  const getPlaceholder = () => {
    switch (type) {
      case "manufacturer":
        return "예: 타타대우, 삼표건설기계, 케이스(CASE) 등";
      case "model":
        return "예: DX140W-7, EC210D, HW210A 등";
      case "systemCategory":
        return "예: ⚡ CAN 통신 회로, 💧 메인 컨트롤 밸브 등";
    }
  };

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      alert("항목 이름을 입력해 주세요.");
      return;
    }

    if (type === "manufacturer") {
      addManufacturer(trimmed);
    } else if (type === "model") {
      addModel(currentMaker, trimmed);
    } else if (type === "systemCategory") {
      addSystemCategory(trimmed);
    }

    setName("");
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-white space-y-5 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            {type === "manufacturer" && <Factory className="w-5 h-5 text-indigo-400" />}
            {type === "model" && <Truck className="w-5 h-5 text-amber-400" />}
            {type === "systemCategory" && <Wrench className="w-5 h-5 text-emerald-400" />}
            <h3 className="text-base font-bold text-slate-100">{getTitle()}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 폼 입력 */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-300">
            추가할 분류명
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            placeholder={getPlaceholder()}
            autoFocus
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          />
          <p className="text-[11px] text-slate-400">
            추가된 분류는 상단 캐스케이딩 드롭다운 및 프로젝트 저장 시 즉시 선택할 수 있습니다.
          </p>
        </div>

        {/* 하단 버튼 */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
          >
            취소
          </button>
          <button
            onClick={handleAdd}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition cursor-pointer shadow-lg shadow-indigo-600/30 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>추가하기</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
