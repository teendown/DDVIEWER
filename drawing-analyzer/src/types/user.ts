export type UserRole = "admin" | "engineer" | "viewer";

export interface UserProfile {
  id: string;
  name: string;
  department: string;
  role: UserRole;
  avatarColor: string;
  pinCode?: string;
  email?: string;
  createdAt: string;
  lastLoginAt: string;
}
