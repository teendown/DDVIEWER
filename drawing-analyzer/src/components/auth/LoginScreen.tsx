import React, { useState } from "react";
import {
  Layers,
  User,
  UserPlus,
  Lock,
  Building,
  Mail,
  Shield,
  Check,
  Power,
  ChevronRight,
  Sparkles,
  Cpu,
  Share2,
  Download,
} from "lucide-react";
import { useUserStore } from "../../store/userStore";
import { useUIStore } from "../../store/uiStore";
import type { UserProfile, UserRole } from "../../types/user";
import { OfflineInstallModal } from "../modals/OfflineInstallModal";

const AVATAR_COLORS = [
  "#6366f1", // Indigo
  "#3b82f6", // Blue
  "#06b6d4", // Cyan
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#8b5cf6", // Purple
  "#ef4444", // Rose
];

const ROLES: { id: UserRole; label: string; desc: string }[] = [
  { id: "admin", label: "관리자 (Admin)", desc: "도면 및 시스템 전체 관리 권한" },
  { id: "engineer", label: "엔지니어 (Engineer)", desc: "도면 분석 및 배선 편집 권한" },
  { id: "viewer", label: "뷰어 (Viewer)", desc: "도면 열람 및 주석 조회 전용" },
];

export const LoginScreen: React.FC = () => {
  const { users, login, createUser } = useUserStore();
  const { isOfflineInstallOpen, setOfflineInstallOpen } = useUIStore();

  const [activeTab, setActiveTab] = useState<"select" | "create">("select");
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || "");
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  // 새 유저 생성 폼 상태
  const [newName, setNewName] = useState("");
  const [newDept, setNewDept] = useState("전장개발팀");
  const [newRole, setNewRole] = useState<UserRole>("engineer");
  const [newEmail, setNewEmail] = useState("");
  const [newColor, setNewColor] = useState(AVATAR_COLORS[0]);
  const [newPin, setNewPin] = useState("");

  const handleSelectUser = (user: UserProfile) => {
    setSelectedUserId(user.id);
    if (!user.pinCode) {
      login(user.id);
    } else {
      setPinInput("");
      setPinError(false);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(selectedUserId, pinInput);
    if (!success) {
      setPinError(true);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    createUser({
      name: newName.trim(),
      department: newDept.trim() || "기술팀",
      role: newRole,
      email: newEmail.trim() || undefined,
      avatarColor: newColor,
      pinCode: newPin.trim() || undefined,
    });
  };

  const selectedTargetUser = users.find((u) => u.id === selectedUserId);

  const handleExitApp = () => {
    if (confirm("도면 분석기 시스템을 종료하시겠습니까?")) {
      window.close();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070b14] text-slate-100 select-none overflow-hidden">
      {/* 배경 그리드 및 글로우 효과 */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-30" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[250px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* 우측 상단 버튼 그룹 */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
        <button
          onClick={() => setOfflineInstallOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/60 hover:border-emerald-500 text-emerald-300 hover:text-emerald-100 text-xs font-bold transition cursor-pointer shadow-lg"
          title="오프라인(인터넷 차단) 사용 및 앱 설치 안내"
        >
          <Download className="w-3.5 h-3.5" />
          <span>앱 설치 / 오프라인</span>
        </button>

        <button
          onClick={handleExitApp}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-rose-950/80 border border-slate-800 hover:border-rose-500/50 text-slate-400 hover:text-rose-300 text-xs font-semibold transition cursor-pointer shadow-lg"
          title="프로그램 종료"
        >
          <Power className="w-3.5 h-3.5" />
          <span>종료</span>
        </button>
      </div>

      <OfflineInstallModal
        isOpen={isOfflineInstallOpen}
        onClose={() => setOfflineInstallOpen(false)}
      />

      {/* 메인 로그인 컨테이너 */}
      <div className="relative z-10 w-full max-w-4xl p-6 flex flex-col md:flex-row gap-8 items-center">
        {/* 좌측: 시스템 브랜딩 및 소개 */}
        <div className="flex-1 space-y-6 text-center md:text-left">
          <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Industrial Schematic & CAD Hub V2.5</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/30">
                <Layers className="w-7 h-7" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                스마트 도면 분석기
              </h1>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-md">
              중장비 및 산업용 전기·유압 회로도 정밀 분석, 스마트 자동 배선 추적 및 엔지니어링 진단 시스템입니다.
            </p>
          </div>

          {/* 주요 기능 뱃지 3종 */}
          <div className="grid grid-cols-3 gap-2.5 pt-2 max-w-md">
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-center">
              <Cpu className="w-4 h-4 text-sky-400 mx-auto mb-1" />
              <div className="text-[11px] font-bold text-slate-300">스마트 노드</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-center">
              <Share2 className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
              <div className="text-[11px] font-bold text-slate-300">자동 배선 추적</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-center">
              <Shield className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <div className="text-[11px] font-bold text-slate-300">비파괴 저장</div>
            </div>
          </div>
        </div>

        {/* 우측: 작업자 로그인 및 프로필 선택 카드 */}
        <div className="w-full md:w-[420px] bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl flex flex-col space-y-4">
          {/* 상단 탭 전환 */}
          <div className="flex border-b border-slate-800 pb-3 gap-2">
            <button
              onClick={() => {
                setActiveTab("select");
                setPinError(false);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer text-center ${
                activeTab === "select"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              작업자 로그인 ({users.length})
            </button>
            <button
              onClick={() => setActiveTab("create")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer text-center flex items-center justify-center gap-1 ${
                activeTab === "create"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>새 작업자 등록</span>
            </button>
          </div>

          {/* 1. 작업자 목록 선택 */}
          {activeTab === "select" && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-400">
                접속할 엔지니어 프로필을 선택하세요:
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                {users.map((user) => {
                  const isSelected = selectedUserId === user.id;

                  return (
                    <div
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between group ${
                        isSelected
                          ? "bg-indigo-600/20 border-indigo-500 shadow-md"
                          : "bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow shrink-0"
                          style={{ backgroundColor: user.avatarColor }}
                        >
                          {user.name.slice(0, 1)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                              {user.name}
                            </span>
                            {user.pinCode && (
                              <span className="text-amber-400 p-0.5" title="PIN 번호 잠김">
                                <Lock className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400">
                            {user.department} · <span className="capitalize">{user.role}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center text-xs font-bold text-indigo-400 group-hover:translate-x-1 transition-transform">
                        <span>접속</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* PIN 번호 입력창 (선택된 유저가 PIN 설정되어 있는 경우) */}
              {selectedTargetUser?.pinCode && (
                <form
                  onSubmit={handlePinSubmit}
                  className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2.5 animate-fadeIn"
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                    <Lock className="w-3.5 h-3.5" />
                    <span>{selectedTargetUser.name} PIN 번호 입력</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      maxLength={6}
                      value={pinInput}
                      onChange={(e) => {
                        setPinInput(e.target.value);
                        setPinError(false);
                      }}
                      placeholder="PIN 번호 입력"
                      className="flex-1 px-3 py-1.5 text-sm bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-400"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition cursor-pointer shadow"
                    >
                      확인
                    </button>
                  </div>
                  {pinError && (
                    <p className="text-[11px] text-rose-400 font-semibold">
                      PIN 번호가 일치하지 않습니다.
                    </p>
                  )}
                </form>
              )}
            </div>
          )}

          {/* 2. 새 작업자 등록 폼 */}
          {activeTab === "create" && (
            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  작업자 이름 (필수)
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="예: 홍길동 책임연구원"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950/60 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">소속 부서</label>
                  <div className="relative">
                    <Building className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="text"
                      value={newDept}
                      onChange={(e) => setNewDept(e.target.value)}
                      placeholder="전장설계팀"
                      className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-950/60 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">이메일/사번 (선택)</label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="text"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="user@company.com"
                      className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-950/60 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">직무 역할</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                >
                  {ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  프로필 아바타 색상
                </label>
                <div className="flex items-center gap-2">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={`w-6 h-6 rounded-full transition flex items-center justify-center cursor-pointer ${
                        newColor === c ? "ring-2 ring-white scale-110 shadow" : "opacity-70 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {newColor === c && <Check className="w-3 h-3 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  간이 보안 PIN 번호 (선택사항, 4~6자리)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="미입력 시 비밀번호 없이 바로 접속"
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950/60 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition cursor-pointer shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                등록 및 바로 시작
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
