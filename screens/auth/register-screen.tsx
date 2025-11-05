import React, { useState } from "react";
import {
  View, Text, TextInput, Pressable, ActivityIndicator, Alert,
} from "react-native";
import { useAuthStore } from "../../zustand/authStore";
import { apiPublic } from "../../utils/axios-instance";
import { ApiRoutes, buildRoute } from "../../utils/api";
import { ScreenWrapper } from "../../components/screen-wrapper";

export default function RegisterScreen({ onSuccess }: { onSuccess?: () => void }) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Missing fields", "Name, email and password are required.");
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiPublic.post(buildRoute(ApiRoutes.auth) + "/register", {
        name,
        email,
        password,
        password_confirmation: passwordConfirm,
      });

      const { user, token } = res.data?.data || {};
      if (!user || !token) throw new Error("Invalid register response format");

      await setAuth(user, token);
      onSuccess?.();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || "Registration failed";
      Alert.alert("Error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenWrapper style={{ flex: 1, padding: 20, justifyContent: "center" }}>
      <Text style={{ fontSize: 28, fontWeight: "700", marginBottom: 20 }}>
        Create Account
      </Text>

      <Text>Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        style={{
          borderWidth: 1, borderColor: "#ccc", borderRadius: 8,
          paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
        }}
      />

      <Text>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
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
          paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
        }}
      />

      <Text>Confirm Password</Text>
      <TextInput
        value={passwordConfirm}
        onChangeText={setPasswordConfirm}
        secureTextEntry
        style={{
          borderWidth: 1, borderColor: "#ccc", borderRadius: 8,
          paddingHorizontal: 12, paddingVertical: 10, marginBottom: 20,
        }}
      />

      <Pressable
        onPress={handleRegister}
        disabled={submitting}
        style={{
          backgroundColor: submitting ? "#999" : "#111",
          paddingVertical: 14, borderRadius: 10, alignItems: "center",
        }}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: "#fff", fontWeight: "600" }}>Sign Up</Text>
        )}
      </Pressable>
    </ScreenWrapper>
  );
}
