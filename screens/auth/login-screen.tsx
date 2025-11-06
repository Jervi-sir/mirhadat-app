import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { apiPublic } from "@/utils/axios-instance";
import { useAuthStore } from "@/zustand/authStore";
import { ApiRoutes, buildRoute } from "@/utils/api";
import { ScreenWrapper } from "@/components/screen-wrapper";
import WilayaPicker from "@/components/filters/wilaya-picker";
import type { WilayaType } from "@/utils/types";

type Props = { onSuccess?: () => void };

export default function LoginScreen({ onSuccess }: Props) {
  const setAuth = useAuthStore((s) => s.setAuth);

  // modes: "login" (phone+password) | "register" (name+wilaya+phone+password)
  const [mode, setMode] = useState<"login" | "register">("login");

  const [name, setName] = useState("");
  const [wilaya, setWilaya] = useState<WilayaType | undefined>(undefined);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isLogin = mode === "login";

  const toggleMode = () => {
    setMode((m) => (m === "login" ? "register" : "login"));
  };

  async function handleSubmit() {
    if (isLogin) {
      if (!phone.trim() || !password.trim()) {
        Alert.alert("Missing fields", "Phone and password are required.");
        return;
      }
      try {
        setSubmitting(true);
        const url = buildRoute(ApiRoutes.auth.login) ;
        const res = await apiPublic.post(url, { phone, password });
        const { user, token } = res.data?.data || {};
        if (!user || !token) throw new Error("Invalid response format");
        await setAuth(user, token);
        onSuccess?.();
      } catch (err: any) {
        const msg = err?.response?.data?.message || err.message || "Login failed";
        Alert.alert("Error", msg);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Register
    if (!name.trim() || !phone.trim() || !password.trim()) {
      Alert.alert("Missing fields", "Name, wilaya, phone and password are required.");
      return;
    }
    try {
      setSubmitting(true);
      const url = buildRoute(ApiRoutes.auth.register) ;
      const payload = {
        name,
        phone,
        password,
        wilaya_id: wilaya?.id ?? null,
      };
      const res = await apiPublic.post(url, payload);
      const { user, token } = res.data?.data || {};
      if (!user || !token) throw new Error("Invalid response format");
      await setAuth(user, token);
      onSuccess?.();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || "Registration failed";
      Alert.alert("Error", msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={{ padding: 22 }}>
      <Text style={{ fontSize: 24, fontWeight: "800", marginBottom: 14 }}>
        {isLogin ? "Log In" : "Create account"}
      </Text>

      {!isLogin && (
        <>
          <Text style={{ marginBottom: 6 }}>Full name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Aimen Houalef"
            autoCapitalize="words"
            style={{
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              marginBottom: 12,
              backgroundColor: "#fff",
            }}
          />

          <Text style={{ marginBottom: 6 }}>Wilaya</Text>
          <WilayaPicker
            value={wilaya ?? null}
            onChangeWilaya={(w) => setWilaya(w)}
            includeAll={false}
            triggerStyle={{ marginBottom: 12 }}
            lang="fr"
          />
        </>
      )}

      <Text style={{ marginBottom: 6 }}>Phone</Text>
      <TextInput
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoCapitalize="none"
        placeholder="+213..."
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          marginBottom: 12,
          backgroundColor: "#fff",
        }}
      />

      <Text style={{ marginBottom: 6 }}>Password</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="••••••••"
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          marginBottom: 16,
          backgroundColor: "#fff",
        }}
      />

      <Pressable
        onPress={handleSubmit}
        disabled={submitting}
        style={{
          backgroundColor: submitting ? "#999" : "#111",
          paddingVertical: 14,
          borderRadius: 12,
          alignItems: "center",
        }}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: "#fff", fontWeight: "700" }}>
            {isLogin ? "Sign in" : "Create account"}
          </Text>
        )}
      </Pressable>

      <View style={{ marginTop: 14, alignItems: "center" }}>
        <Pressable onPress={toggleMode} hitSlop={10}>
          <Text style={{ color: "#0a84ff", fontWeight: "600" }}>
            {isLogin ? "No account? Register" : "Already have an account? Log in"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
