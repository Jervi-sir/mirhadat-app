// screens/boot-screen.tsx
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import api from "@/utils/api/axios-instance";
import { ApiRoutes, buildRoute } from "@/utils/api/api";
import { hydrateTokenFromStorage, setToken, getToken } from "@/utils/api/token-manager";
import { useAuthStore } from "@/zustand/auth-store";
import { Routes } from "@/utils/variables/routes";

const BootScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const setUser = useAuthStore((s: any) => s.setUser ?? null);
  const setAuth = useAuthStore((s: any) => s.setAuth ?? null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // 1) Load token into memory
        const token = await hydrateTokenFromStorage();

        if (token) {
          try {
            // 2) Validate token silently (NO prompt on 401)
            const { data } = await api.get(buildRoute(ApiRoutes.auth.me), {
              authIfAvailable: true,
              skipAuthPromptOn401: true,
            });

            // 3) Persist user into Zustand
            if (mounted) {
              if (typeof setAuth === "function") {
                // If your store expects setAuth(user, token)
                await setAuth(data?.data ?? data, getToken() ?? token);
              } else if (typeof setUser === "function") {
                setUser(data?.data ?? data);
              }
            }
          } catch (err) {
            // Invalid/expired token → clear it and continue
            await setToken(null);
          }
        }
      } finally {
        // 4) Go to main app regardless
        if (mounted) {
          navigation.reset({
            index: 0,
            routes: [{ name: Routes.NavigationScreen }],
          });
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [navigation, setUser, setAuth]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
};

export default BootScreen;
