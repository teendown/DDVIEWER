import React from "react";
import { X, Keyboard } from "lucide-react";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutCategory {
  title: string;
  items: ShortcutItem[];
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    title: "🛠️ 도구 선택 (단일 키)",
    items: [
      { keys: ["V"], description: "선택 도구 (Select)" },
      { keys: ["A"], description: "화살표 도구 (Arrow)" },
      { keys: ["C"], description: "스마트 커넥터 (Connector)" },
      { keys: ["R"], description: "사각형 도구 (Rect)" },
      { keys: ["O"], description: "원형 도구 (Circle)" },
      { keys: ["P"], description: "다각형 도구 (Polygon)" },
      { keys: ["T"], description: "텍스트 도구 (Text)" },
      { keys: ["H"], description: "형광펜 도구 (Highlight)" },
      { keys: ["Space", "Drag"], description: "화면 손 이동 (Pan / Hand Tool)" },
      { keys: ["ESC"], description: "선택 해제 / 그리기 취소 / 기본 선택 도구" },
    ],
  },
  {
    title: "✏️ 편집 & 객체 조작",
    items: [
      { keys: ["Ctrl", "Z"], description: "실행 취소 (Undo)" },
      { keys: ["Ctrl", "Y"], description: "다시 실행 (Redo)" },
      { keys: ["Ctrl", "C"], description: "선택 객체 복사 (Copy)" },
      { keys: ["Ctrl", "V"], description: "복사된 객체 붙여넣기 (Paste)" },
      { keys: ["Ctrl", "D"], description: "선택 객체 즉시 복제 (Duplicate)" },
      { keys: ["Ctrl", "A"], description: "캔버스 전체 객체 선택 (Select All)" },
      { keys: ["Ctrl", "G"], description: "선택 객체들 그룹화 (Group)" },
      { keys: ["Ctrl", "Shift", "G"], description: "그룹 해제 (Ungroup)" },
      { keys: ["Del", "/", "Backspace"], description: "선택 객체 즉시 삭제 (Delete)" },
      { keys: ["↑", "↓", "←", "→"], description: "선택 객체 1px 미세 이동 (Nudge)" },
      { keys: ["Shift", "+", "방향키"], description: "선택 객체 10px 고속 이동" },
    ],
  },
  {
    title: "📁 파일 & 프로젝트 관리",
    items: [
      { keys: ["Ctrl", "S"], description: "프로젝트 저장 / 스냅샷 (Save)" },
      { keys: ["Ctrl", "O"], description: "새 도면 열기 / 추가 (Open Drawing)" },
      { keys: ["Ctrl", "Shift", "S"], description: "도면 / 보고서 내보내기 (Export)" },
      { keys: ["F1", "/", "?"], description: "키보드 단축키 안내 팝업" },
    ],
  },
  {
    title: "🔍 화면 뷰포트 & 레이어 순서",
    items: [
      { keys: ["Ctrl", "0"], description: "화면 맞춤 (Fit to Screen)" },
      { keys: ["Ctrl", "1"], description: "100% 원본 크기 (Actual Size)" },
      { keys: ["Ctrl", "+"], description: "화면 확대 (Zoom In)" },
      { keys: ["Ctrl", "-"], description: "화면 축소 (Zoom Out)" },
      { keys: ["Ctrl", "["], description: "뷰포트 90° 반시계 회전" },
      { keys: ["Ctrl", "]"], description: "뷰포트 90° 시계 회전" },
      { keys: ["]"], description: "객체 한 단계 앞으로 가져오기" },
      { keys: ["Shift", "]"], description: "객체 맨 앞으로 가져오기 (Bring to Front)" },
      { keys: ["["], description: "객체 한 단계 뒤로 보내기" },
      { keys: ["Shift", "["], description: "객체 맨 뒤로 보내기 (Send to Back)" },
    ],
  },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white tracking-tight">
                  키보드 단축키 전체 가이드
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                  Shortcuts CheatSheet
                </span>
              </div>
              <p className="text-xs text-slate-400">
                작업 생산성을 극대화하는 CAD & 도면 분석 전용 단축키 목록입니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 본문 그리드 */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-5">
          {SHORTCUT_CATEGORIES.map((category) => (
            <div
              key={category.title}
              className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 flex flex-col space-y-2.5"
            >
              <h3 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider pb-1.5 border-b border-slate-800/80">
                {category.title}
              </h3>
              <div className="space-y-2">
                {category.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-1 px-1.5 rounded-lg hover:bg-slate-800/40 transition"
                  >
                    <span className="text-slate-300">{item.description}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-2 py-0.8 bg-slate-800 text-slate-200 border border-slate-700 rounded-md font-mono text-[11px] font-bold shadow-sm"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>
            언제든지 <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded font-mono text-[11px]">F1</kbd> 또는{" "}
            <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded font-mono text-[11px]">?</kbd> 키를 눌러 이 창을 열 수 있습니다.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition cursor-pointer shadow-md"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
