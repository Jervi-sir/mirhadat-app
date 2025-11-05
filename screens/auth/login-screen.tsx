import React, { useState } from "react";
import {
  View, Text, TextInput, Pressable, ActivityIndicator, Alert,
} from "react-native";
import { apiPublic } from "../../utils/axios-instance";
import { useAuthStore } from "../../zustand/authStore";
import { ApiRoutes, buildRoute } from "../../utils/api";
import { ScreenWrapper } from "../../components/screen-wrapper";

export default function LoginScreen({ onSuccess }: { onSuccess?: () => void }) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing fields", "Email and password are required.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiPublic.post(buildRoute(ApiRoutes.auth) + "/login", { email, password });
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
  };

  return (
    <ScreenWrapper style={{ flex: 1, padding: 20, justifyContent: "center" }}>
      <Text style={{ fontSize: 28, fontWeight: "700", marginBottom: 20 }}>
        Log In
      </Text>

      <Text>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={{
          borderWidth: 1, borderColor: "#ccc", borderRadius: 8,
          paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
        }}
      />

      <Text>Password</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{
          borderWidth: 1, borderColor: "#ccc", borderRadius: 8,
          paddingHorizontal: 12, paddingVertical: 10, marginBottom: 20,
        }}
      />

      <Pressable
        onPress={handleLogin}
        disabled={submitting}
        style={{
          backgroundColor: submitting ? "#999" : "#111",
          paddingVertical: 14, borderRadius: 10, alignItems: "center",
        }}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: "#fff", fontWeight: "600" }}>Sign In</Text>
        )}
      </Pressable>
    </ScreenWrapper>
  );
}
