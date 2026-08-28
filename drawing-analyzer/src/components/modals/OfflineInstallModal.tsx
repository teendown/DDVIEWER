import React, { useState, useEffect } from "react";
import {
  X,
  Download,
  WifiOff,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

interface OfflineInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OfflineInstallModal: React.FC<OfflineInstallModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1. PWA 설치 프롬프트 이벤트 감지
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // 2. 이미 PWA로 설치되어 독립 실행 중인지 확인
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else {
      alert(
        "브라우저 주소창 우측 상단의 [설치(💻)] 아이콘 또는 메뉴(⋮) -> [스마트 도면 분석기 앱 설치]를 클릭해주세요.\n설치 후 바탕화면 아이콘으로 인터넷 없이 즉시 실행됩니다!"
      );
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white tracking-tight">
                  오프라인(인터넷 차단) 사용 및 앱 설치 안내
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                  100% Offline
                </span>
              </div>
              <p className="text-xs text-slate-400">
                인터넷이 연결되지 않는 공장, 현장, 출장지에서도 완벽하게 작동합니다.
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

        {/* 본문 */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-5">
          {/* 옵션 1: PWA 원클릭 데스크톱 앱 설치 */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/40 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    현재 PC에 "스마트 도면 분석기" 데스크톱 앱 설치
                  </h3>
                  <p className="text-xs text-slate-400">
                    바탕화면 바로가기 아이콘 생성 + 오프라인 캐싱 자동 적용
                  </p>
                </div>
              </div>
              {isInstalled ? (
                <span className="px-2.5 py-1 text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  설치 완료됨
                </span>
              ) : (
                <button
                  onClick={handleInstallPWA}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>앱 설치하기</span>
                </button>
              )}
            </div>
            <div className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-indigo-300 font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                설치 후 장점:
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-400 pl-1">
                <li>인터넷 연결을 완전히 끄거나 끊어도 바탕화면 아이콘으로 바로 실행됩니다.</li>
                <li>브라우저 상단 주소창 없이 깔끔한 단독 창(Standalone App)으로 실행됩니다.</li>
                <li>저장된 모든 도면, 주석, 프로젝트가 로컬 PC(IndexedDB)에 영구 보존됩니다.</li>
              </ul>
            </div>
          </div>

          {/* 옵션 2: 윈도우 바탕화면 바로가기 원클릭 생성 & 포터블 설치 */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-600/30 text-amber-300 border border-amber-500/30 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  윈도우 원클릭 설치기 (바탕화면 바로가기 자동 생성)
                </h3>
                <p className="text-xs text-slate-400">
                  더블클릭 한 번으로 바탕화면에 아이콘 생성 및 무음 오프라인 실행
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-2">
              <div className="font-bold text-slate-200">⚡ 원클릭 설치 방법:</div>
              <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-1">
                <li>
                  프로젝트 폴더 내의 <code className="px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-500/40 rounded font-mono font-bold">1-원클릭-설치_바탕화면바로가기생성.bat</code> 파일을 더블클릭합니다.
                </li>
                <li>
                  바탕화면에 <strong>[스마트 도면 분석기]</strong> 바로가기가 자동으로 만들어집니다.
                </li>
                <li>
                  이후부터는 인터넷이 없어도 <strong>바탕화면 아이콘만 더블클릭</strong>하면 즉시 실행됩니다!
                </li>
              </ol>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>모든 도면 및 주석 데이터는 100% 사용자 로컬 PC에만 안전하게 보관됩니다.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
