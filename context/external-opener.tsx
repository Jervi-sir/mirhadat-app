import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  AppState,
  Easing,
  Linking,
  Modal,
  Platform,
  Text,
  View,
} from "react-native";
import { theme, S, R, T, shadow, withAlpha } from "@/ui/theme";

type Ctx = {
  openExternal: (
    url: string,
    opts?: { minHoldMs?: number; label?: string }
  ) => Promise<void>;
};

const ExternalOpenerCtx = createContext<Ctx | null>(null);

export function ExternalOpenerProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState<string>("Opening…");
  const fade = useRef(new Animated.Value(0)).current;
  const busyRef = useRef(false);

  // Close the HUD when we background (e.g., Maps/Dialer takes focus)
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (busyRef.current && (state === "inactive" || state === "background")) {
        Animated.timing(fade, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
          busyRef.current = false;
          setVisible(false);
        });
      }
    });
    return () => sub.remove();
  }, [fade]);

  const show = useCallback(
    (text?: string) => {
      setLabel(text || "Opening…");
      busyRef.current = true;
      setVisible(true);
      Animated.timing(fade, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    },
    [fade]
  );

  const hide = useCallback(() => {
    Animated.timing(fade, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
      busyRef.current = false;
      setVisible(false);
    });
  }, [fade]);

  const canOpen = useCallback(async (url: string) => {
    try {
      return await Linking.canOpenURL(url);
    } catch {
      return false;
    }
  }, []);

  const openExternal = useCallback(
    async (url: string, opts?: { minHoldMs?: number; label?: string }) => {
      const minHoldMs = opts?.minHoldMs ?? 420;
      show(opts?.label);

      const minHold = new Promise<void>((r) => setTimeout(r, minHoldMs));
      try {
        const supported = await canOpen(url);
        if (!supported) throw new Error("This action isn’t supported on your device.");
        await Promise.race([Linking.openURL(url), minHold]); // avoids flicker
      } finally {
        // If we didn’t background into another app, dismiss ourselves
        hide();
      }
    },
    [show, hide, canOpen]
  );

  const value = useMemo(() => ({ openExternal }), [openExternal]);

  return (
    <ExternalOpenerCtx.Provider value={value}>
      {children}

      {/* Themed global HUD */}
      <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: withAlpha(theme.colors.ink, 0.15), // overlay
            alignItems: "center",
            justifyContent: "center",
            opacity: fade,
          }}
        >
          <Animated.View
            style={{
              paddingHorizontal: S.lg,
              paddingVertical: S.md,
              borderRadius: R.lg,
              backgroundColor: theme.colors.ink, // dark pill to match app accents
              transform: [
                {
                  scale: fade.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.96, 1],
                  }),
                },
              ],
              ...shadow(3),
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
              <ActivityIndicator color={theme.text.onPrimary} />
              <Text
                style={{
                  ...T.body,
                  color: theme.text.onPrimary,
                  fontWeight: "800",
                }}
              >
                {label}
              </Text>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </ExternalOpenerCtx.Provider>
  );
}

export function useExternalOpener() {
  const ctx = useContext(ExternalOpenerCtx);
  if (!ctx) throw new Error("useExternalOpener must be used within ExternalOpenerProvider");
  return ctx;
}

/* ---------- convenience helpers (themed-friendly) ---------- */
export function telUrl(phone: string) {
  // iOS: "telprompt:" shows confirmation; "tel:" jumps directly. Keep "tel:" for parity.
  return `tel:${phone}`;
}

export function mapsUrl(lat: number, lng: number, label?: string) {
  const q = encodeURIComponent(label ?? `${lat},${lng}`);
  if (Platform.OS === "ios") {
    // Drive directions; shows native Apple Maps
    return `http://maps.apple.com/?daddr=${lat},${lng}&q=${q}&dirflg=d`;
  }
  // Android → Google Maps (browser fallback still opens the app if present)
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}
