import React, { useState } from "react";
import {
  X,
  User,
  UserPlus,
  Lock,
  Building,
  Mail,
  Check,
  Trash2,
  LogOut,
} from "lucide-react";
import { useUserStore } from "../../store/userStore";
import type { UserProfile, UserRole } from "../../types/user";

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
  { id: "engineer", label: "엔지니어 (Engineer)", desc: "도면 분석 및 편집 권한" },
  { id: "viewer", label: "뷰어 (Viewer)", desc: "도면 열람 및 주석 조회 전용" },
];

interface UserAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserAuthModal: React.FC<UserAuthModalProps> = ({ isOpen, onClose }) => {
  const { users, currentUser, login, logout, createUser, deleteUser } = useUserStore();

  const [activeTab, setActiveTab] = useState<"select" | "create">("select");
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser?.id || users[0]?.id || "");
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  // 새 유저 생성 폼 상태
  const [newName, setNewName] = useState("");
  const [newDept, setNewDept] = useState("전장개발팀");
  const [newRole, setNewRole] = useState<UserRole>("engineer");
  const [newEmail, setNewEmail] = useState("");
  const [newColor, setNewColor] = useState(AVATAR_COLORS[0]);
  const [newPin, setNewPin] = useState("");

  if (!isOpen) return null;

  const handleSelectLogin = (user: UserProfile) => {
    if (user.pinCode) {
      // PIN 입력 필요
      setSelectedUserId(user.id);
      setPinInput("");
      setPinError(false);
      return;
    }
    login(user.id);
    onClose();
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(selectedUserId, pinInput);
    if (success) {
      setPinError(false);
      onClose();
    } else {
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

    setNewName("");
    setNewPin("");
    setActiveTab("select");
  };

  const selectedTargetUser = users.find((u) => u.id === selectedUserId);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                엔지니어 프로필 & 작업자 전환
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                  Multi-User
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                도면 분석 작업 이력 및 변경 사항이 선택된 프로필로 기록됩니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-6 pt-2">
          <button
            onClick={() => {
              setActiveTab("select");
              setPinError(false);
            }}
            className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 cursor-pointer ${
              activeTab === "select"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            작업자 선택 ({users.length})
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "create"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            새 작업자 등록
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {activeTab === "select" && (
            <div className="space-y-4">
              {/* 현재 로그인된 유저 안내 */}
              {currentUser && (
                <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow"
                      style={{ backgroundColor: currentUser.avatarColor }}
                    >
                      {currentUser.name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{currentUser.name}</span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded font-semibold">
                          현재 접속 중
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {currentUser.department} · {currentUser.role.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    className="px-2.5 py-1.5 text-xs text-rose-300 hover:bg-rose-500/20 rounded-lg transition border border-rose-500/30 flex items-center gap-1 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    로그아웃
                  </button>
                </div>
              )}

              {/* 등록된 사용자 카드 목록 */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-400 mb-1">
                  전환할 작업자 프로필 선택:
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {users.map((user) => {
                    const isCurrent = currentUser?.id === user.id;
                    const isSelectedForPin = selectedUserId === user.id;

                    return (
                      <div
                        key={user.id}
                        onClick={() => handleSelectLogin(user)}
                        className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                          isCurrent
                            ? "bg-indigo-600/15 border-indigo-500/50 shadow-sm"
                            : isSelectedForPin && user.pinCode
                            ? "bg-slate-800/90 border-amber-500/50"
                            : "bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shrink-0 shadow-sm"
                            style={{ backgroundColor: user.avatarColor }}
                          >
                            {user.name.slice(0, 1)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-200">
                                {user.name}
                              </span>
                              {user.pinCode && (
                                <span className="p-0.5 text-amber-400" title="PIN 잠금 활성화됨">
                                  <Lock className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-2">
                              <span>{user.department}</span>
                              <span>·</span>
                              <span className="capitalize">{user.role}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isCurrent ? (
                            <span className="flex items-center gap-1 text-xs text-indigo-400 font-bold px-2 py-1 bg-indigo-500/10 rounded-lg">
                              <Check className="w-3.5 h-3.5" />
                              선택됨
                            </span>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectLogin(user);
                              }}
                              className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-indigo-600 hover:text-white rounded-lg transition cursor-pointer border border-slate-700 hover:border-indigo-500"
                            >
                              전환하기
                            </button>
                          )}

                          {users.length > 1 && !isCurrent && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`${user.name} 프로필을 삭제하시겠습니까?`)) {
                                  deleteUser(user.id);
                                }
                              }}
                              className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                              title="프로필 삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* PIN 번호 입력창 (선택된 유저가 PIN 잠금된 경우) */}
              {selectedTargetUser?.pinCode && currentUser?.id !== selectedTargetUser.id && (
                <form
                  onSubmit={handlePinSubmit}
                  className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-3 animate-fadeIn"
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                    <Lock className="w-4 h-4" />
                    <span>{selectedTargetUser.name} 보안 PIN 번호 입력</span>
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
                      className="flex-1 px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-400"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition cursor-pointer shadow"
                    >
                      확인 & 로그인
                    </button>
                  </div>
                  {pinError && (
                    <p className="text-[11px] text-rose-400 font-semibold">
                      PIN 번호가 일치하지 않습니다. 다시 입력해주세요.
                    </p>
                  )}
                </form>
              )}
            </div>
          )}

          {activeTab === "create" && (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
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
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-950/60 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    소속 부서
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={newDept}
                      onChange={(e) => setNewDept(e.target.value)}
                      placeholder="예: 전장설계1팀"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-950/60 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    이메일 / 사번 (선택)
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="engineer@company.com"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-950/60 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  직무 역할 (Role)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => setNewRole(r.id)}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                        newRole === r.id
                          ? "bg-indigo-600/20 border-indigo-500 text-white"
                          : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div className="text-xs font-bold">{r.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 truncate">{r.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  프로필 아바타 색상
                </label>
                <div className="flex items-center gap-2">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={`w-7 h-7 rounded-full transition flex items-center justify-center cursor-pointer ${
                        newColor === c ? "ring-2 ring-white scale-110 shadow" : "opacity-70 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {newColor === c && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  간이 보안 PIN 번호 (선택사항, 4~6자리)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="미입력 시 비밀번호 없이 로그인"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-950/60 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("select")}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition cursor-pointer shadow-lg shadow-indigo-500/25 flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  등록 & 바로 시작
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
