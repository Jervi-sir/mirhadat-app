// src/utils/axios-instance.ts
import axios, { AxiosRequestConfig, AxiosError } from "axios";
import { BASE_URL } from "./api";

type CreateOpts = {
  baseURL?: string;
  requiresAuth?: boolean; // default behavior for this instance
};

// ---- Auth prompt bridge (wired by your <AuthPromptProvider/>) ----
export type AuthPromptFn = () => Promise<boolean>;
let authPromptFn: AuthPromptFn | null = null;
export const setAuthPrompt = (fn: AuthPromptFn | null) => { authPromptFn = fn; };
export const getAuthPrompt = () => authPromptFn;

// token lives in this module (no zustand import)
let currentToken: string | null = null;

// avoid opening multiple sheets at once
let loginInFlight = false;

export function createAxiosInstance(opts: CreateOpts = {}) {
  const { baseURL = BASE_URL, requiresAuth = true } = opts;
  console.log('currentToken: ', currentToken)
  const instance = axios.create({
    baseURL,
    timeout: 15000,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  // --- REQUEST: ensure token (and optionally prompt) BEFORE the request goes out ---
  instance.interceptors.request.use(async (config: AxiosRequestConfig) => {
    let needsAuth = requiresAuth;
    const h: any = config.headers || {};
    if (h["X-Requires-Auth"] !== undefined) {
      const v = h["X-Requires-Auth"];
      needsAuth = !(v === false || v === "false" || v === 0 || v === "0");
      delete h["X-Requires-Auth"];
    }

    // If this request doesn't need auth, just pass through
    if (!needsAuth) {
      config.headers = h;
      return config;
    }

    // If we *do* need auth but don't have a token, pop the ActionSheet and wait
    if (!currentToken) {
      const fn = getAuthPrompt();
      if (fn) {
        // Prevent multiple concurrent sheets
        if (!loginInFlight) {
          loginInFlight = true;
          try {
            const ok = await fn(); // shows your ActionSheet; resolves after user action
            if (!ok) {
              // User dismissed / failed login — cancel the request quietly
              return Promise.reject(new axios.Cancel("auth-cancelled"));
            }
            // If ok, your LoginScreen should have called setAuthToken(...)
            // so currentToken is now set; continue below to attach it.
          } finally {
            loginInFlight = false;
          }
        } else {
          // Another request already triggered the sheet; wait until it settles
          // Simple polling: wait until loginInFlight flips; in practice this is quick
          await new Promise((r) => {
            const id = setInterval(() => {
              if (!loginInFlight) {
                clearInterval(id);
                r(null);
              }
            }, 50);
          });
          if (!currentToken) {
            return Promise.reject(new axios.Cancel("auth-cancelled"));
          }
        }
      } else {
        // Provider not mounted yet; cancel without UI
        return Promise.reject(new axios.Cancel("auth-unavailable"));
      }
    }

    // Attach bearer once we have a token
    if (currentToken) {
      h.Authorization = `Bearer ${currentToken}`;
    }
    config.headers = h;
    return config;
  });

  // --- RESPONSE: optional 401 handling (kept minimal; no alerts) ---
  instance.interceptors.response.use(
    (res) => res,
    (error: AxiosError) => {
      // You can add retry logic here if you also refresh tokens, etc.
      return Promise.reject(error);
    }
  );

  return instance;
}

// Default instance requires auth by default.
const api = createAxiosInstance({ requiresAuth: true });
export default api;

// If you ever need a dedicated public instance:
export const apiPublic = createAxiosInstance({ requiresAuth: false });

// Or build custom ones on the fly:
export const getCustomAxios = (customBaseURL: string, requiresAuth = true) =>
  createAxiosInstance({ baseURL: customBaseURL, requiresAuth });

// Example per-request public call:
// api.get('/public', { headers: { 'X-Requires-Auth': false } });

export const setAuthToken = (token: string | null) => {
  currentToken = token;

  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
  // If you want apiPublic to explicitly avoid the header:
  // delete apiPublic.defaults.headers.common["Authorization"];
};

