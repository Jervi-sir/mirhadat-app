import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, AppState, Easing, Linking, Modal, Platform, Text, View } from "react-native";

type Ctx = {
  openExternal: (url: string, opts?: { minHoldMs?: number; label?: string }) => Promise<void>;
};

const ExternalOpenerCtx = createContext<Ctx | null>(null);

export function ExternalOpenerProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState<string>("Opening…");
  const fade = useRef(new Animated.Value(0)).current;
  const busyRef = useRef(false);

  // auto-close when app goes inactive/background (usually when Maps/Dialer opens)
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (busyRef.current && (state === "inactive" || state === "background")) {
        Animated.timing(fade, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
          busyRef.current = false;
          setVisible(false);
        });
      }
    });
    return () => sub.remove();
  }, [fade]);

  const show = useCallback((text?: string) => {
    setLabel(text || "Opening…");
    busyRef.current = true;
    setVisible(true);
    Animated.timing(fade, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [fade]);

  const hide = useCallback(() => {
    Animated.timing(fade, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
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
        await Promise.race([Linking.openURL(url), minHold]); // ensure no flicker
      } finally {
        // If we didn’t background into another app, close it ourselves
        hide();
      }
    },
    [show, hide, canOpen]
  );

  const value = useMemo(() => ({ openExternal }), [openExternal]);

  return (
    <ExternalOpenerCtx.Provider value={value}>
      {children}

      {/* Global popup */}
      <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.15)",
            alignItems: "center",
            justifyContent: "center",
            opacity: fade,
          }}
        >
          <Animated.View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: "#111827",
              transform: [
                {
                  scale: fade.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }),
                },
              ],
              shadowColor: "#000",
              shadowOpacity: 0.2,
              shadowRadius: 10,
              elevation: 6,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <ActivityIndicator color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "700" }}>{label}</Text>
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

/* ---------- convenience helpers (optional) ---------- */
export function telUrl(phone: string) {
  // tip: "telprompt:" (iOS) shows a prompt; "tel:" jumps straight to dialer. We'll keep "tel:" for consistency.
  return `tel:${phone}`;
}

export function mapsUrl(lat: number, lng: number, label?: string) {
  const q = encodeURIComponent(label ?? `${lat},${lng}`);
  if (Platform.OS === "ios") return `http://maps.apple.com/?daddr=${lat},${lng}&q=${q}&dirflg=d`;
  // Android: prefer google maps URL (browser fallback will still open app if present)
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}
