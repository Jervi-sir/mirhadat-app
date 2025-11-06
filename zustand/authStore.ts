import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthToken } from "../utils/axios-instance";
import api from "../utils/axios-instance";
import { ApiRoutes, buildRoute } from "../utils/api";

const STORAGE_TOKEN_KEY = "auth_token";
const STORAGE_USER_KEY  = "auth_user";

type User = { id: number; name: string; email: string | null; role_id?: number | null; wilaya_id?: number | null };

type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;

  setAuth: (user: User, token: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  loading: false,
  error: null,

  setAuth: async (user, token) => {
    // 1) Persist to AsyncStorage
    await AsyncStorage.multiSet([
      [STORAGE_TOKEN_KEY, token],
      [STORAGE_USER_KEY, JSON.stringify(user)],
    ]);

    // 2) Push into axios auth header
    setAuthToken(token);

    // 3) Push into zustand
    set({ user, token, error: null });
  },

  clearAuth: async () => {
    await AsyncStorage.multiRemove([STORAGE_TOKEN_KEY, STORAGE_USER_KEY]);
    setAuthToken(null);
    set({ user: null, token: null, error: null });
  },

  loadFromStorage: async () => {
    try {
      set({ loading: true, error: null });

      const [[, token], [, userJson]] = await AsyncStorage.multiGet([
        STORAGE_TOKEN_KEY,
        STORAGE_USER_KEY,
      ]);

      if (token) {
        // set axios header immediately
        setAuthToken(token);
      }

      let user: User | null = null;
      if (userJson) {
        try {
          user = JSON.parse(userJson) as User;
        } catch {
          // corrupted user payload; clear it
          await AsyncStorage.removeItem(STORAGE_USER_KEY);
        }
      }

      set({ token: token ?? null, user: user ?? null, loading: false });

      // Optionally, if token exists but user missing/stale, hydrate from /auth/me
      if (token && !user) {
        await get().refreshMe();
      }
    } catch (e: any) {
      set({ loading: false, error: e?.message ?? "Failed to load auth from storage" });
    }
  },

  refreshMe: async () => {
    try {
      const token = get().token;
      if (!token) return;

      const url = buildRoute(ApiRoutes.auth.me); // GET /api/auth/me
      const res = await api.get(url);
      const user = res.data?.data ?? null;

      if (user) {
        await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
        set({ user });
      }
    } catch {
      // If /me fails (token revoked), clear everything
      await get().clearAuth();
    }
  },
}));
