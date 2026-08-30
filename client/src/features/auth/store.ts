import { create } from "zustand";
import type { AuthUser } from "../../types";

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
};

const saved = (() => {
  try {
    return JSON.parse(localStorage.getItem("wms-auth") ?? "null");
  } catch {
    return null;
  }
})();

export const useAuth = create<AuthState>((set) => ({
  user: saved?.user ?? null,
  accessToken: saved?.accessToken ?? null,
  refreshToken: saved?.refreshToken ?? null,
  setSession: (user, accessToken, refreshToken) => {
    localStorage.setItem("wms-auth", JSON.stringify({ user, accessToken, refreshToken }));
    set({ user, accessToken, refreshToken });
  },
  setAccessToken: (accessToken) => {
    set((s) => {
      localStorage.setItem("wms-auth", JSON.stringify({ user: s.user, accessToken, refreshToken: s.refreshToken }));
      return { accessToken };
    });
  },
  logout: () => {
    localStorage.removeItem("wms-auth");
    set({ user: null, accessToken: null, refreshToken: null });
  },
}));
