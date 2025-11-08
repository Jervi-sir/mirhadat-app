import React, { useEffect, useRef } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import api from "@/utils/api/axios-instance";
import { ApiRoutes, buildRoute } from "@/utils/api/api";
import { hydrateTokenFromStorage, setToken, getToken } from "@/utils/api/token-manager";
import { useAuthStore } from "@/zustand/auth-store";
import { Routes } from "@/utils/variables/routes";
import LottieView from "lottie-react-native";
import { C, T } from "@/ui/theme";

const { width, height } = Dimensions.get("window");

const BootScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const setUser = useAuthStore((s: any) => s.setUser ?? null);
  const setAuth = useAuthStore((s: any) => s.setAuth ?? null);
  const bgAnim = useRef<LottieView>(null);
  const iconAnim = useRef<LottieView>(null);

  useEffect(() => {
    let mounted = true;
    let timer: NodeJS.Timeout | null = null;

    (async () => {
      try {
        const token = await hydrateTokenFromStorage();

        if (token) {
          try {
            const { data } = await api.get(buildRoute(ApiRoutes.auth.me), {
              authIfAvailable: true,
              skipAuthPromptOn401: true,
            });

            if (mounted) {
              if (typeof setAuth === "function") {
                await setAuth(data?.data ?? data, getToken() ?? token);
              } else if (typeof setUser === "function") {
                setUser(data?.data ?? data);
              }
            }
          } catch {
            await setToken(null);
          }
        }
      } finally {
        if (mounted) {
          // wait 1 second, then navigate with no animation (see stack options below)
          timer = setTimeout(() => {
            navigation.reset({
              index: 0,
              routes: [{ name: Routes.NavigationScreen }],
            });
          }, 1000);
        }
      }
    })();

    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [navigation, setUser, setAuth]);

  return (
    <View style={styles.container}>
      <LottieView
        ref={bgAnim}
        source={require("@/assets/lotties/splash.json")}
        autoPlay
        loop
        resizeMode="cover"
        style={styles.fullscreenAnimation}
        speed={0.9}
      />
      <LottieView
        ref={iconAnim}
        source={require("@/assets/lotties/toilet-seat.json")}
        autoPlay
        loop
        style={styles.logoAnimation}
      />
      <Text style={{ ...T.h2, color: C.primary600 }}>Mirhadati dz</Text>
    </View>
  );
};

export default BootScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  fullscreenAnimation: {
    position: "absolute",
    top: 0,
    left: 0,
    width,
    height,
    // keep the background BEHIND the logo/text
    zIndex: 99,
  },
  logoAnimation: {
    width: 200,
    height: 200,
  },
});
