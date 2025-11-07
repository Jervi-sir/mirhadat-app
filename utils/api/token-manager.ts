// @utils/api/token-manager.ts
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const STORAGE_KEY = "auth_token_v1";
let memToken: string | null = null;

export function getToken() {
  return memToken;
}

export async function setToken(token: string | null) {
  memToken = token;
  if (token) {
    if (Platform.OS === "web") {
      // Fallback for web (not secure, but avoids runtime errors)
      localStorage.setItem(STORAGE_KEY, token);
    } else {
      await SecureStore.setItemAsync(STORAGE_KEY, token);
    }
  } else {
    if (Platform.OS === "web") {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
    }
  }
}

export async function hydrateTokenFromStorage() {
  let t: string | null = null;
  if (Platform.OS === "web") {
    t = localStorage.getItem(STORAGE_KEY);
  } else {
    t = await SecureStore.getItemAsync(STORAGE_KEY);
  }
  memToken = t ?? null;
  return memToken;
}
