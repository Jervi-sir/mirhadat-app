// zustand/authStore.ts
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "@/utils/api/axios-instance";
import { ApiRoutes, buildRoute } from "@/utils/api/api";
import { UserType } from "@/utils/types";

// NEW: use the unified token manager (memory + SecureStore)
import {
  setToken,                   // sets mem + SecureStore (or web fallback)
  hydrateTokenFromStorage,    // loads token from SecureStore into memory
  getToken,                   // reads the in-memory token (fast)
} from "@/utils/api/token-manager";

/** Legacy keys kept for user persistence + migration */
const STORAGE_TOKEN_KEY = "auth_token";  // legacy (AsyncStorage) — will be cleaned
const STORAGE_USER_KEY  = "auth_user";

type AuthState = {
  user: UserType | null;
  token: string | null;
  loading: boolean;
  error: string | null;

  setUser: (user: UserType) => void;
  setAuth: (user: UserType, token: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
  refreshMe: () => Promise<void>;

  /** New helpers */
  updateUser: (user: UserType) => Promise<void>;
  upgradeToHost: () => Promise<UserType | null>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  loading: false,
  error: null,

  setUser: (user) => set({ user }),

  /** Save token via token-manager + persist user in AsyncStorage */
  setAuth: async (user, token) => {
    // 1) persist token (SecureStore / web)
    await setToken(token);

    // 2) persist user (AsyncStorage) — fast JSON
    await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));

    // 3) update store
    set({ user, token, error: null });
  },

  /** Clear token (token-manager) + remove user from storage */
  clearAuth: async () => {
    try {
      // optional: inform server but don't block on errors
      await api.post(buildRoute(ApiRoutes.auth.logout), {}, { authIfAvailable: true });
    } catch {}

    await setToken(null); // clears mem + SecureStore
    set({ user: null, token: null, error: null });
    await AsyncStorage.removeItem(STORAGE_USER_KEY);
    // Also clean any legacy token value that might still exist
    await AsyncStorage.removeItem(STORAGE_TOKEN_KEY);

    set({ user: null, token: null, error: null });
  },

  /**
   * Load token from SecureStore into memory, migrate legacy token if found,
   * then load user from AsyncStorage (or call /auth/me if missing).
   */
  loadFromStorage: async () => {
    try {
      set({ loading: true, error: null });

      // 1) hydrate token from SecureStore → memory
      let token = await hydrateTokenFromStorage();

      // 1a) migration path: if no token in SecureStore, but legacy AsyncStorage has it
      if (!token) {
        const legacyToken = await AsyncStorage.getItem(STORAGE_TOKEN_KEY);
        if (legacyToken) {
          // move to SecureStore
          await setToken(legacyToken);
          await AsyncStorage.removeItem(STORAGE_TOKEN_KEY);
          token = legacyToken;
        }
      }

      // 2) load cached user (if any)
      let user: UserType | null = null;
      const userJson = await AsyncStorage.getItem(STORAGE_USER_KEY);
      if (userJson) {
        try {
          user = JSON.parse(userJson) as UserType;
        } catch {
          await AsyncStorage.removeItem(STORAGE_USER_KEY);
        }
      }

      set({ token: token ?? null, user: user ?? null });

      // 3) if we have a token but no user, fetch /auth/me
      if (token && !user) {
        await get().refreshMe();
      }

      set({ loading: false });
    } catch (e: any) {
      set({
        loading: false,
        error: e?.message ?? "Failed to load auth from storage",
      });
    }
  },

  /** Refresh current user (requires token); clears auth on failure */
  refreshMe: async () => {
    try {
      const token = getToken();
      if (!token) return;

      const url = buildRoute(ApiRoutes.auth.me);
      const res = await api.get(url, { authRequired: true });
      const user = (res.data?.data ?? res.data ?? null) as UserType | null;

      if (user) {
        await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
        set({ user });
      } else {
        // if server returns nothing meaningful, consider it invalid
        await get().clearAuth();
      }
    } catch {
      await get().clearAuth();
    }
  },

  /** Persist user change locally + storage */
  updateUser: async (user) => {
    await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
    set({ user });
  },

  /** Call /auth/upgrade-to-host and persist returned user */
  upgradeToHost: async () => {
    try {
      const url = buildRoute(ApiRoutes.auth.upgradeToHost);
      const res = await api.post(url, {}, { authRequired: true });

      const userFromApi: UserType | null =
        res?.data?.data ?? res?.data?.user ?? res?.data ?? null;

      if (userFromApi) {
        await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userFromApi));
        set({ user: userFromApi });
        return userFromApi;
      }

      // If API returns only message/status, fall back to a fresh /me
      await get().refreshMe();
      return get().user;
    } catch (e) {
      // Surface to caller (UI can toast/alert)
      throw e;
    }
  },
}));
