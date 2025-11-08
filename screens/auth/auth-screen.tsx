// screens/auth/auth-screen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import api from "@/utils/api/axios-instance";
import { useAuthStore } from "@/zustand/auth-store";
import { ApiRoutes, buildRoute } from "@/utils/api/api";
import WilayaPicker from "@/components/filters/wilaya-picker";
import type { WilayaType } from "@/utils/types";
import { theme, S, R, T as Type, shadow, withAlpha } from "@/ui/theme";
import { PasswordField } from "@/components/input/password-filed";
import { ScrollView } from "react-native-actions-sheet";

type Props = { onSuccess?: () => void };

export default function AuthScreen({ onSuccess }: Props) {
  const setAuth = useAuthStore((s) => s.setAuth);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [wilaya, setWilaya] = useState<WilayaType | undefined>(undefined);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isLogin = mode === "login";
  const toggleMode = () => setMode((m) => (m === "login" ? "register" : "login"));

  const inputStyle = (error = false) => ({
    borderWidth: 1,
    borderColor: error ? theme.border.error : theme.border.subtle,
    borderRadius: R.md,
    paddingHorizontal: S.lg,
    height: 42,
    backgroundColor: theme.bg.surface,
    color: theme.text.default,
    ...shadow(0),
  });

  async function handleSubmit() {
    if (isLogin) {
      if (!phone.trim() || !password.trim()) {
        Alert.alert("Missing fields", "Phone and password are required.");
        return;
      }
      try {
        setSubmitting(true);
        const url = buildRoute(ApiRoutes.auth.login);
        const res = await api.post(url, { phone, password }, { authRequired: false, authIfAvailable: false });
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

    if (!name.trim() || !phone.trim() || !password.trim()) {
      Alert.alert("Missing fields", "Name, wilaya, phone and password are required.");
      return;
    }
    try {
      setSubmitting(true);
      const url = buildRoute(ApiRoutes.auth.register);
      const payload = { name, phone, password, wilaya_id: wilaya?.id ?? null };
      const res = await api.post(url, payload, { authRequired: false, authIfAvailable: false });
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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.select({ ios: 12, android: 0 })}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "on-drag" : "none"}
        contentContainerStyle={{ padding: S.xxl, gap: S.lg, paddingBottom: S.xxl + 24 }}
      >
        {/* Title */}
        <View>
          <Text style={{ ...Type.h2, color: theme.text.default }}>
            {isLogin ? "Log In" : "Create account"}
          </Text>
          <Text style={{ ...Type.bodyMuted, color: theme.text.secondary, marginTop: 4 }}>
            {isLogin ? "Welcome back 👋" : "Join and start contributing 🚀"}
          </Text>
        </View>

        {/* Register-only fields */}
        {!isLogin && (
          <View style={{ gap: S.sm }}>
            <Text style={{ ...Type.label, color: theme.text.strong }}>Full name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              placeholder=""
              placeholderTextColor={theme.text.tertiary}
              style={inputStyle()}
              returnKeyType="next"
            />

            <Text style={{ ...Type.label, color: theme.text.strong, marginTop: S.sm }}>Wilaya</Text>
            <WilayaPicker
              value={wilaya ?? null}
              onChangeWilaya={(w) => setWilaya(w)}
              includeAll={false}
              scope={"all"}
              lang="fr"
              triggerStyle={{
                borderWidth: 1,
                borderColor: theme.border.subtle,
                borderRadius: R.md,
                paddingHorizontal: S.lg,
                paddingVertical: 12,
                backgroundColor: theme.bg.surface,
              }}
            />
          </View>
        )}

        {/* Phone */}
        <View style={{ gap: S.sm }}>
          <Text style={{ ...Type.label, color: theme.text.strong }}>Phone</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoCapitalize="none"
            placeholder=""
            placeholderTextColor={theme.text.tertiary}
            style={inputStyle()}
            returnKeyType="next"
          />
        </View>

        {/* Password */}
        {/* <View style={{ gap: S.sm }}>
          <Text style={{ ...Type.label, color: theme.text.strong }}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder=""
            placeholderTextColor={theme.text.tertiary}
            style={inputStyle()}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
        </View> */}
        <PasswordField
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleSubmit}
          inputStyle={inputStyle}
        />

        {/* Submit */}
        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          style={({ pressed }) => [
            {
              marginTop: 10,
              backgroundColor: submitting ? withAlpha(theme.colors.primary, 0.5) : theme.colors.primary,
              paddingVertical: 14,
              borderRadius: R.lg,
              alignItems: "center",
            },
            pressed && { opacity: 0.96 },
          ]}
        >
          {submitting ? (
            <ActivityIndicator color={theme.text.onPrimary} />
          ) : (
            <Text style={{ ...Type.body, color: theme.text.onPrimary, fontWeight: "800" }}>
              {isLogin ? "Sign in" : "Create account"}
            </Text>
          )}
        </Pressable>

        {/* Toggle */}
        <View style={{ alignItems: "center", marginTop: S.sm }}>
          <Pressable onPress={toggleMode} hitSlop={10}>
            <Text style={{ ...Type.bodyMuted, color: theme.colors.primary, fontWeight: "700" }}>
              {isLogin ? "No account? Register" : "Already have an account? Log in"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
