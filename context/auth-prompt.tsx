// providers/AuthPromptProvider.tsx
import React, {
  createContext, useCallback, useContext, useMemo, useRef, useEffect,
} from "react";
import ActionSheet, { ActionSheetRef } from "react-native-actions-sheet";
import { hasAuthToken, setAuthPrompt } from "@/utils/api/axios-instance";
import AuthScreen from "@/screens/auth/auth-screen";

export type AuthPromptFn = () => Promise<boolean>;
type Ctx = { promptAuth: AuthPromptFn; ensureAuth: (fn?: () => Promise<any> | any) => Promise<boolean> };

const AuthPromptContext = createContext<Ctx | null>(null);
export function useAuthPrompt() {
  const ctx = useContext(AuthPromptContext);
  if (!ctx) throw new Error("useAuthPrompt must be used inside <AuthPromptProvider/>");
  return ctx;
}

export const AuthPromptProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const sheetRef = useRef<ActionSheetRef>(null);
  const resolverRef = useRef<((ok: boolean) => void) | null>(null);
  const inflightRef = useRef<Promise<boolean> | null>(null);

  // Wait until ref is available before calling .show()
  const openSheet = useCallback(async () => {
    let tries = 0;
    while (!sheetRef.current && tries < 10) {
      // wait ~1 frame each loop
      await new Promise((r) => setTimeout(r, 16));
      tries++;
    }
    if (sheetRef.current) {
      // console.log("[AuthPrompt] Opening ActionSheet");
      sheetRef.current.show();
    } else {
      // console.warn("[AuthPrompt] Could not open sheet (ref not ready)");
    }
  }, []);

  const closeSheet = useCallback(() => {
    if (sheetRef.current) {
      // console.log("[AuthPrompt] Closing ActionSheet");
      sheetRef.current.hide();
    }
  }, []);

  const promptAuth = useCallback<AuthPromptFn>(() => {
    if (inflightRef.current) return inflightRef.current;

    // console.log("[AuthPrompt] promptAuth invoked");
    inflightRef.current = new Promise<boolean>((resolve) => {
      resolverRef.current = (ok: boolean) => {
        // console.log("[AuthPrompt] promptAuth resolved:", ok);
        resolverRef.current = null;
        inflightRef.current = null;
        resolve(ok);
      };
      void openSheet();
    });

    return inflightRef.current;
  }, [openSheet]);

  const ensureAuth = useCallback(
    async (fn?: () => Promise<any> | any) => {
      if (hasAuthToken()) {
        if (fn) await Promise.resolve(fn());
        return true;
      }
      const ok = await promptAuth();
      if (ok && hasAuthToken()) {
        if (fn) await Promise.resolve(fn());
        return true;
      }
      return false;
    },
    [promptAuth]
  );

  useEffect(() => {
    // console.log("[AuthPrompt] Registering setAuthPrompt bridge");
    setAuthPrompt(promptAuth);
    return () => {
      // console.log("[AuthPrompt] Unregistering setAuthPrompt bridge");
      setAuthPrompt(null);
    };
  }, [promptAuth]);

  const handleSuccess = useCallback(() => {
    closeSheet();
    resolverRef.current?.(true);
  }, [closeSheet]);
  const handleCancel = useCallback(() => {
    closeSheet();
    resolverRef.current?.(false);
  }, [closeSheet]);

  const value = useMemo<Ctx>(() => ({ promptAuth, ensureAuth }), [promptAuth, ensureAuth]);

  return (
    <AuthPromptContext.Provider value={value}>
      {children}
      <ActionSheet
        ref={sheetRef}
        gestureEnabled
        closeOnTouchBackdrop
        defaultOverlayOpacity={0.3}
        springOffset={100}
        statusBarTranslucent
        safeAreaInsets={{ top: 180, left: 0, right: 0, bottom: 0 }}
        containerStyle={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: "#fff" }}
        indicatorStyle={{ width: 60, height: 5, borderRadius: 3, backgroundColor: "#111" }}
        onClose={handleCancel}
      >
        <AuthScreen onSuccess={handleSuccess} />
      </ActionSheet>
    </AuthPromptContext.Provider>
  );
};
