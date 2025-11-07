import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ArrowLeft, Eye, EyeOff } from "lucide-react-native";
import api from "@/utils/api/axios-instance";
import { ApiRoutes, buildRoute } from "@/utils/api/api";
import { theme as T, S, R, withAlpha, shadow } from "@/ui/theme";
import { useAuthStore } from "@/zustand/auth-store";
import { ScreenWrapper } from "@/components/screen-wrapper";

/* ---------- Helpers ---------- */
function sanitizePhone(raw: string) {
  const only = raw.replace(/[^\d+]/g, "");
  return only[0] === "+" ? "+" + only.slice(1).replace(/\+/g, "") : only.replace(/\+/g, "");
}
function looksLikePhone(s: string) {
  const plain = s.startsWith("+") ? s.slice(1) : s;
  return /^\d{7,15}$/.test(plain);
}
function normalizeDZ(s: string) {
  if (!s) return s?.trim?.() ?? s;
  let val = s.replace(/[^\d+]/g, "");
  if (val.startsWith("+")) return val;
  if (val.startsWith("00")) return val.slice(2);
  if (/^\d{9,15}$/.test(val)) return val;
  return val;
}

/* ---------- Small UI bits ---------- */
function Card({ children }: React.PropsWithChildren) {
  return (
    <View
      style={{
        backgroundColor: T.bg.surface,
        borderRadius: R.xl,
        padding: S.lg,
        borderWidth: 1,
        borderColor: T.border.subtle,
        ...shadow(1),
      }}
    >
      {children}
    </View>
  );
}

function Field({
  label,
  multiline,
  helperText,
  error,
  style,
  passwordToggle = true,   // optional: set to false to disable eye even if secureTextEntry
  ...props
}: any & { helperText?: string; error?: string; passwordToggle?: boolean }) {
  const [focused, setFocused] = useState(false);
  const [show, setShow] = useState(false);

  const isPassword = !!props.secureTextEntry && passwordToggle;

  const baseStyle = {
    borderWidth: 1,
    borderColor: error
      ? (T.colors.error as string)
      : focused
        ? (T.colors.primary as string)
        : (T.border.subtle as string),
    borderRadius: R.sm,
    backgroundColor: T.bg.surface as string,
    minHeight: multiline ? 84 : 40,
    paddingHorizontal: S.md,
    paddingVertical: multiline ? 10 : 8,
  } as const;

  return (
    <View style={{ marginBottom: S.sm }}>
      {label ? (
        <Text style={{ marginBottom: 6, color: T.text.strong, fontWeight: "800" }}>{label}</Text>
      ) : null}

      {isPassword ? (
        // Password mode: wrap input to place the eye icon on the right
        <View
          style={[
            baseStyle,
            { flexDirection: "row", alignItems: "center", paddingRight: 6 },
            focused ? shadow(1) : shadow(0),
            style,
          ]}
        >
          <TextInput
            {...props}
            secureTextEntry={!show}
            multiline={false} // passwords should not be multiline
            onFocus={(e) => {
              setFocused(true);
              props?.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              props?.onBlur?.(e);
            }}
            placeholderTextColor={T.text.tertiary as string}
            style={{
              flex: 1,
              minHeight: 40,
              color: T.text.default as string,
              paddingVertical: 0,
              paddingHorizontal: 0,
            }}
          />
          <TouchableOpacity onPress={() => setShow((v) => !v)} hitSlop={8} style={{ padding: 6 }}>
            {show ? (
              <EyeOff size={18} color={T.text.secondary as string} />
            ) : (
              <Eye size={18} color={T.text.secondary as string} />
            )}
          </TouchableOpacity>
        </View>
      ) : (
        // Normal mode: your original TextInput
        <TextInput
          {...props}
          onFocus={(e) => {
            setFocused(true);
            props?.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props?.onBlur?.(e);
          }}
          placeholderTextColor={T.text.tertiary as string}
          style={[
            baseStyle,
            focused ? shadow(1) : shadow(0),
            style,
          ]}
          multiline={!!multiline}
        />
      )}

      {!!error && (
        <Text style={{ marginTop: 6, color: T.colors.error as string, fontSize: 12 }}>{error}</Text>
      )}
      {!error && !!helperText && (
        <Text style={{ marginTop: 6, color: T.text.tertiary as string, fontSize: 12 }}>
          {helperText}
        </Text>
      )}
    </View>
  );
}

function RiskPill({ children }: React.PropsWithChildren) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: withAlpha(T.colors.error as string, 0.12),
        borderWidth: 1,
        borderColor: withAlpha(T.colors.error as string, 0.5),
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        marginBottom: 8,
      }}
    >
      <Text style={{ color: T.colors.error as string, fontSize: 12, fontWeight: "800" }}>
        {children}
      </Text>
    </View>
  );
}

function WarnBanner({ text }: { text: string }) {
  return (
    <View
      style={{
        backgroundColor: withAlpha("#F59E0B", 0.12), // amber-ish
        borderColor: withAlpha("#F59E0B", 0.5),
        borderWidth: 1,
        padding: 10,
        borderRadius: R.md,
        marginBottom: 10,
      }}
    >
      <Text style={{ color: "#B45309", fontSize: 12 }}>{text}</Text>
    </View>
  );
}

/* ---------- Screen ---------- */
const EditProfileScreen: React.FC = () => {
  const navigation: any = useNavigation();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  // basics
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");

  // risky: phone
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [savingPhone, setSavingPhone] = useState(false);

  // risky: password
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  const [savingBasics, setSavingBasics] = useState(false);

  // separate error maps
  const [errBasics, setErrBasics] = useState<{ [k: string]: string | undefined }>({});
  const [errPhone, setErrPhone] = useState<{ [k: string]: string | undefined }>({});
  const [errPwd, setErrPwd] = useState<{ [k: string]: string | undefined }>({});

  const title = useMemo(() => "Edit Profile", []);

  /* ---------- Validators ---------- */
  const validateBasics = () => {
    const e: any = {};
    if (!name?.trim()) e.name = "Required";
    if (email && !/^\S+@\S+\.\S+$/.test(email)) e.email = "Invalid email";
    setErrBasics(e);
    return Object.keys(e).length === 0;
  };

  const validatePhone = () => {
    const e: any = {};
    const normalized = normalizeDZ(sanitizePhone(phone));
    if (!normalized || !looksLikePhone(normalized)) e.phone = "Invalid phone";
    setErrPhone(e);
    return Object.keys(e).length === 0;
  };

  const validatePwd = () => {
    const e: any = {};
    if (!password) e.password = "Required";
    if (password && password.length < 6) e.password = "Min 6 chars";
    if (password && password !== passwordConfirm) e.password_confirmation = "Does not match";
    setErrPwd(e);
    return Object.keys(e).length === 0;
  };

  /* ---------- Save handlers (separated) ---------- */
  const onSaveBasics = async () => {
    if (savingBasics) return;
    if (!validateBasics()) return;

    const payload: any = {
      name: name.trim(),
      email: email?.trim() || null,
    };

    setSavingBasics(true);
    try {
      const { data } = await api.put(buildRoute(ApiRoutes.auth.profile), payload, { authRequired: true, });
      await updateUser(data?.data ?? data);
      Alert.alert("Saved", "Your basic info has been updated.");
    } catch (err: any) {
      const v = err?.response?.data?.errors;
      if (v && typeof v === "object") {
        const map: any = {};
        Object.keys(v).forEach((k) => (map[k] = Array.isArray(v[k]) ? v[k][0] : String(v[k])));
        setErrBasics(map);
      } else {
        Alert.alert("Error", err?.response?.data?.message || "Failed to update profile.");
      }
    } finally {
      setSavingBasics(false);
    }
  };

  const onSavePhone = async () => {
    if (savingPhone) return;
    if (!validatePhone()) return;

    // Final confirmation for risky change
    Alert.alert(
      "Confirm phone update",
      "Changing your phone number is a sensitive action. Proceed?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, update",
          style: "destructive",
          onPress: async () => {
            const payload: any = { phone: normalizeDZ(sanitizePhone(phone)) };
            setSavingPhone(true);
            try {
              const { data } = await api.put(buildRoute(ApiRoutes.auth.profile), payload, { authRequired: true, });
              await updateUser(data?.data ?? data);
              Alert.alert("Saved", "Your phone number has been updated.");
            } catch (err: any) {
              const v = err?.response?.data?.errors;
              if (v && typeof v === "object") {
                const map: any = {};
                Object.keys(v).forEach(
                  (k) => (map[k] = Array.isArray(v[k]) ? v[k][0] : String(v[k]))
                );
                setErrPhone(map);
              } else {
                Alert.alert("Error", err?.response?.data?.message || "Failed to update phone.");
              }
            } finally {
              setSavingPhone(false);
            }
          },
        },
      ]
    );
  };

  const onSavePwd = async () => {
    if (savingPwd) return;
    if (!validatePwd()) return;

    Alert.alert(
      "Confirm password change",
      "This will sign you out on other devices. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Change password",
          style: "destructive",
          onPress: async () => {
            const payload: any = {
              password,
              password_confirmation: passwordConfirm,
            };
            setSavingPwd(true);
            try {
              const { data } = await api.put(buildRoute(ApiRoutes.auth.profile), payload, { authRequired: true, });
              await updateUser(data?.data ?? data);
              setPassword("");
              setPasswordConfirm("");
              Alert.alert("Saved", "Your password has been updated.");
            } catch (err: any) {
              const v = err?.response?.data?.errors;
              if (v && typeof v === "object") {
                const map: any = {};
                Object.keys(v).forEach(
                  (k) => (map[k] = Array.isArray(v[k]) ? v[k][0] : String(v[k]))
                );
                setErrPwd(map);
              } else {
                Alert.alert("Error", err?.response?.data?.message || "Failed to update password.");
              }
            } finally {
              setSavingPwd(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={{ flex: 1, backgroundColor: T.bg.app as string }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: S.sm,
            paddingHorizontal: S.md,
            paddingVertical: S.sm,
            backgroundColor: T.bg.app,
          }}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
            style={{
              height: 40,
              width: 40,
              borderRadius: 999,
              backgroundColor: T.bg.surface,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: T.border.subtle,
              ...shadow(1),
            }}
          >
            <ArrowLeft color={T.text.strong as string} />
          </TouchableOpacity>

          <Text style={{ fontSize: 20, fontWeight: "800", flex: 1, color: T.text.default }}>
            {title}
          </Text>
        </View>

        {/* Form */}
        <ScrollView
          contentContainerStyle={{ padding: S.md, gap: S.md }}
          keyboardShouldPersistTaps="handled"
        >
          {/* BASICS */}
          <Card>
            <Text style={{ fontWeight: "800", color: T.text.strong, marginBottom: 8 }}>
              Basic Information
            </Text>
            <Field
              label="Name"
              placeholder="Your name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              error={errBasics.name}
            />
            <Field
              label="Email"
              placeholder="email@example.com"
              value={email ?? ""}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              error={errBasics.email}
              helperText="Optional"
            />
            <Pressable
              onPress={onSaveBasics}
              android_ripple={{ color: withAlpha("#000", 0.06) }}
              style={({ pressed }) => [
                {
                  alignSelf: "flex-start",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: S.lg,
                  paddingVertical: 12,
                  borderRadius: R.lg,
                  borderWidth: 1,
                  borderColor: T.border.subtle,
                  backgroundColor: T.bg.surface,
                  width: '100%',
                  ...shadow(1),
                },
                pressed ? { opacity: 0.95, transform: [{ scale: 0.99 }] } : null,
              ]}
            >
              {savingBasics ? (
                <ActivityIndicator size={16} />
              ) : (
                <Text style={{ fontWeight: "800", color: T.text.strong as string }}>
                  Save basics
                </Text>
              )}
            </Pressable>
          </Card>

          {/* PHONE — RISKY */}
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontWeight: "800", color: T.text.strong, marginBottom: 8 }}>Phone</Text>
              <RiskPill>Sensitive change</RiskPill>
            </View>
            <WarnBanner text="Updating your phone may affect login and verification. Make sure you control this number." />
            <Field
              label="Phone number"
              placeholder=""
              value={phone}
              onChangeText={(t: string) => setPhone(sanitizePhone(t))}
              onBlur={() => {
                const n = normalizeDZ(phone);
                if (n !== phone) setPhone(n);
              }}
              autoCapitalize="none"
              keyboardType="phone-pad"
              error={errPhone.phone}
            />
            <Pressable
              onPress={onSavePhone}
              android_ripple={{ color: withAlpha("#000", 0.06) }}
              style={({ pressed }) => [
                {
                  marginTop: 10,
                  alignSelf: "flex-start",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: S.lg,
                  paddingVertical: 12,
                  borderRadius: R.lg,
                  borderWidth: 1,
                  borderColor: withAlpha(T.colors.error as string, 0.5),
                  backgroundColor: withAlpha(T.colors.error as string, 0.08),
                  width: '100%',
                  ...shadow(0),
                },
                pressed ? { opacity: 0.95, transform: [{ scale: 0.99 }] } : null,
              ]}
            >
              {savingPhone ? (
                <ActivityIndicator size={16} />
              ) : (
                <Text style={{ fontWeight: "800", color: T.colors.error as string }}>
                  Save phone
                </Text>
              )}
            </Pressable>
          </Card>

          {/* PASSWORD — RISKY */}
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontWeight: "800", color: T.text.strong, marginBottom: 8 }}>
                Change Password
              </Text>
              <RiskPill>Sensitive change</RiskPill>
            </View>
            <WarnBanner text="Changing your password will sign you out on other devices." />
            <Field
              label="New password"
              placeholder="••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              error={errPwd.password}
            />

            <Field
              label="Confirm password"
              placeholder="••••••"
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              secureTextEntry
              error={errPwd.password_confirmation}
            />

            <Pressable
              onPress={onSavePwd}
              android_ripple={{ color: withAlpha("#000", 0.06) }}
              style={({ pressed }) => [
                {
                  marginTop: 10,
                  alignSelf: "flex-start",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: S.lg,
                  paddingVertical: 12,
                  borderRadius: R.lg,
                  borderWidth: 1,
                  borderColor: withAlpha(T.colors.error as string, 0.5),
                  backgroundColor: withAlpha(T.colors.error as string, 0.08),
                  width: '100%',
                  ...shadow(0),
                },
                pressed ? { opacity: 0.95, transform: [{ scale: 0.99 }] } : null,
              ]}
            >
              {savingPwd ? (
                <ActivityIndicator size={16} />
              ) : (
                <Text style={{ fontWeight: "800", color: T.colors.error as string }}>
                  Save password
                </Text>
              )}
            </Pressable>
          </Card>
          <View style={{ height: 50 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

export default EditProfileScreen;
