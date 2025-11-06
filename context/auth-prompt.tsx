import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import ActionSheet, { ActionSheetRef } from "react-native-actions-sheet";
import { setAuthPrompt } from "@/utils/axios-instance";
import LoginScreen from "@/screens/auth/login-screen";

export type AuthPromptFn = () => Promise<boolean>;

type Ctx = {
  promptAuth: AuthPromptFn;
  ensureAuth: (fn?: () => Promise<any> | any) => Promise<boolean>;
};

const AuthPromptContext = createContext<Ctx | null>(null);

export function useAuthPrompt() {
  const ctx = useContext(AuthPromptContext);
  if (!ctx) throw new Error("useAuthPrompt must be used inside <AuthPromptProvider/>");
  return ctx;
}

export const AuthPromptProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const sheetRef = useRef<ActionSheetRef>(null);
  const resolveRef = useRef<(ok: boolean) => void>();
  const isOpenRef = useRef(false);

  const reallyShow = useCallback(() => {
    requestAnimationFrame(() => setTimeout(() => sheetRef.current?.show?.(), 0));
  }, []);

  const close = useCallback((ok: boolean) => {
    if (!isOpenRef.current) return;
    isOpenRef.current = false;
    sheetRef.current?.hide?.();
    const res = resolveRef.current;
    resolveRef.current = undefined;
    res?.(ok);
  }, []);

  const promptAuth: AuthPromptFn = useCallback(() => {
    if (!isOpenRef.current) {
      isOpenRef.current = true;
      reallyShow();
    }
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, [reallyShow]);

  const ensureAuth = useCallback(
    async (fn?: () => Promise<any> | any) => {
      const ok = await promptAuth();
      if (!ok) return false;
      if (fn) await fn();
      return true;
    },
    [promptAuth]
  );

  // Bridge to axios immediately on mount
  useEffect(() => {
    setAuthPrompt(() => promptAuth);
    return () => setAuthPrompt(null);
  }, [promptAuth]);

  const value = useMemo(() => ({ promptAuth, ensureAuth }), [promptAuth, ensureAuth]);

  return (
    <AuthPromptContext.Provider value={value}>
      {children}

      <ActionSheet
        ref={sheetRef}
        gestureEnabled
        closeOnTouchBackdrop
        defaultOverlayOpacity={0.3}
        onClose={() => close(false)}
        /* --- Limiter settings so it never flings full-screen or off-screen --- */
        springOffset={100}
        statusBarTranslucent
        /* Push the sheet down a bit; also cap the height */
        safeAreaInsets={{ top: 180, left: 0, right: 0, bottom: 0 }}
        containerStyle={{
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          backgroundColor: "#fff",
        }}
        indicatorStyle={{ width: 60, height: 5, borderRadius: 3, backgroundColor: "#111" }}
      >
        <LoginScreen onSuccess={() => close(true)} />
      </ActionSheet>
    </AuthPromptContext.Provider>
  );
};
