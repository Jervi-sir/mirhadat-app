import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthToken } from "../utils/axios-instance";

type User = {
  id: number;
  name: string;
  email: string;
  role_id?: number | null;
};

type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;

  setAuth: (user: User, token: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  loadTokenFromStorage: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  loading: false,
  error: null,

  setAuth: async (user, token) => {
    await AsyncStorage.setItem("auth_token", token);
    setAuthToken(token);
    set({ user, token, error: null });
  },

  clearAuth: async () => {
    await AsyncStorage.removeItem("auth_token");
    setAuthToken(null);
    set({ user: null, token: null, error: null });
  },

  loadTokenFromStorage: async () => {
    const token = await AsyncStorage.getItem("auth_token");
    if (token && !get().token) {
      setAuthToken(token);
      set({ token });
      // optionally fetch /api/auth/me to hydrate user
    }
  },
}));
