import { useAuth } from "../features/auth/store";

export function useRole() {
  return useAuth((s) => s.user?.role);
}
