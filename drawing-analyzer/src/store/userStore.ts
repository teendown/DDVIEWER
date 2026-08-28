import { create } from "zustand";
import type { UserProfile } from "../types/user";

interface UserState {
  currentUser: UserProfile | null;
  users: UserProfile[];
  login: (userId: string, pin?: string) => boolean;
  logout: () => void;
  createUser: (profile: Omit<UserProfile, "id" | "createdAt" | "lastLoginAt">) => UserProfile;
  updateUser: (id: string, updates: Partial<UserProfile>) => void;
  deleteUser: (id: string) => void;
  setCurrentUser: (user: UserProfile | null) => void;
}

const STORAGE_KEY_USERS = "dwg_analyzer_users_v1";
const STORAGE_KEY_CURRENT_USER = "dwg_analyzer_current_user_v1";

const DEFAULT_USERS: UserProfile[] = [
  {
    id: "user_default_01",
    name: "허강 선임연구원",
    department: "전장개발팀",
    role: "admin",
    avatarColor: "#6366f1",
    email: "heokang@engineering.com",
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  },
  {
    id: "user_default_02",
    name: "김필드 엔지니어",
    department: "서비스품질팀",
    role: "engineer",
    avatarColor: "#10b981",
    email: "kimfield@engineering.com",
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  },
];

const loadStoredUsers = (): UserProfile[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to load users from localStorage", e);
  }
  return DEFAULT_USERS;
};

const loadStoredCurrentUser = (users: UserProfile[]): UserProfile | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
    if (raw) {
      const currentId = JSON.parse(raw);
      const matched = users.find((u) => u.id === currentId);
      if (matched) return matched;
    }
  } catch (e) {
    console.error("Failed to load current user from localStorage", e);
  }
  return null;
};

export const useUserStore = create<UserState>((set, get) => {
  const initialUsers = loadStoredUsers();
  const initialCurrentUser = loadStoredCurrentUser(initialUsers);

  return {
    users: initialUsers,
    currentUser: initialCurrentUser,

    login: (userId: string, pin?: string) => {
      const target = get().users.find((u) => u.id === userId);
      if (!target) return false;

      // 핀코드 검증 (설정되어 있는 경우)
      if (target.pinCode && target.pinCode !== pin) {
        return false;
      }

      const now = new Date().toISOString();
      const updatedUser = { ...target, lastLoginAt: now };
      const nextUsers = get().users.map((u) => (u.id === userId ? updatedUser : u));

      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(nextUsers));
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(userId));

      set({
        currentUser: updatedUser,
        users: nextUsers,
      });
      return true;
    },

    logout: () => {
      localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
      set({ currentUser: null });
    },

    createUser: (profileData) => {
      const now = new Date().toISOString();
      const newUser: UserProfile = {
        ...profileData,
        id: "user_" + Math.random().toString(36).substring(2, 9),
        createdAt: now,
        lastLoginAt: now,
      };

      const nextUsers = [...get().users, newUser];
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(nextUsers));
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(newUser.id));

      set({
        users: nextUsers,
        currentUser: newUser,
      });
      return newUser;
    },

    updateUser: (id, updates) => {
      const nextUsers = get().users.map((u) => (u.id === id ? { ...u, ...updates } : u));
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(nextUsers));

      const nextCurrentUser = get().currentUser?.id === id ? { ...get().currentUser!, ...updates } : get().currentUser;
      set({
        users: nextUsers,
        currentUser: nextCurrentUser,
      });
    },

    deleteUser: (id) => {
      const nextUsers = get().users.filter((u) => u.id !== id);
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(nextUsers));

      const nextCurrentUser = get().currentUser?.id === id ? nextUsers[0] || null : get().currentUser;
      if (nextCurrentUser) {
        localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(nextCurrentUser.id));
      } else {
        localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
      }

      set({
        users: nextUsers,
        currentUser: nextCurrentUser,
      });
    },

    setCurrentUser: (user) => {
      if (user) {
        localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user.id));
      } else {
        localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
      }
      set({ currentUser: user });
    },
  };
});
