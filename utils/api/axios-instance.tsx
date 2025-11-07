// @utils/api/axios-instance.ts
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { BASE_URL } from "./api";
import { getToken } from "./token-manager";

/* --------------------------- Auth Prompt setup --------------------------- */
type AuthPromptFn = () => Promise<boolean>;
let authPromptFn: AuthPromptFn | null = null;
export function setAuthPrompt(fn?: AuthPromptFn | null) {
  authPromptFn = fn ?? null;
}

/* --------------------------- New helper --------------------------- */
export function hasAuthToken(): boolean {
  try {
    const token = getToken();
    return typeof token === "string" && token.trim().length > 0;
  } catch {
    return false;
  }
}

/* --------------------------- Axios config --------------------------- */
declare module "axios" {
  export interface AxiosRequestConfig {
    authRequired?: boolean;
    authIfAvailable?: boolean;
    /** If true, DON'T show the auth prompt when a 401 happens (BootScreen use-case) */
    skipAuthPromptOn401?: boolean;
  }
}

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { Accept: "application/json", "Content-Type": "application/json" },
});

/* --------------------------- Request interceptor --------------------------- */
api.interceptors.request.use(
  async (config) => {
    const token = getToken();

    if (config.authRequired && !token) {
      if (!authPromptFn) throw new Error("Authentication required but no authPrompt configured.");
      const ok = await authPromptFn();
      const after = getToken();
      if (!ok || !after) throw new Error("Authentication required but user did not authenticate.");
      // @ts-ignore
      config.headers = { ...config.headers, Authorization: `Bearer ${after}` };
      return config;
    }

    if ((config.authRequired || config.authIfAvailable) && token) {
      // @ts-ignore
      config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* --------------------------- Response interceptor --------------------------- */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const orig = error.config as AxiosRequestConfig | undefined;
    if (error.response?.status === 401 && authPromptFn && !orig?.skipAuthPromptOn401) {
      try {
        const ok = await authPromptFn();
        const token = getToken();
        if (ok && token && orig) return api.request(orig);
      } catch {}
    }
    return Promise.reject(error);
  }
);

export default api;
