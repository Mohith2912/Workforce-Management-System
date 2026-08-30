import axios from "axios";
import { useAuth } from "../features/auth/store";

export const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = useAuth.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = useAuth.getState().refreshToken;
      if (!refreshToken) {
        useAuth.getState().logout();
        return Promise.reject(error);
      }
      try {
        const { data } = await axios.post("/api/auth/refresh", { refreshToken });
        useAuth.getState().setAccessToken(data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        useAuth.getState().logout();
      }
    }
    return Promise.reject(error);
  },
);
