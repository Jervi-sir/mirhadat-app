// components/phone-input-section.tsx
import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { useToiletForm } from "../toilet-form-context";
import { Minus, Plus } from "lucide-react-native";
import { theme as T, S, R, withAlpha, shadow, pressableStyles } from "@/ui/theme";

type ErrMap = Record<number, string | undefined>;

function sanitizePhone(raw: string) {
  const only = raw.replace(/[^\d+]/g, "");
  return only[0] === "+" ? "+" + only.slice(1).replace(/\+/g, "") : only.replace(/\+/g, "");
}

function looksLikePhone(s: string) {
  const plain = s.startsWith("+") ? s.slice(1) : s;
  return /^\d{7,15}$/.test(plain);
}

// Algeria helper: "0XXXXXXXXX" -> "+213XXXXXXXXX"
function normalizeDZ(s: string) {
  if (!s) return s;
  if (s.startsWith("+")) return s;
  if (s.startsWith("00")) return "+" + s.slice(2);
  if (s.length >= 9 && s[0] === "0") return "+213" + s.slice(1);
  return s;
}

export const PhoneInputSection: React.FC = () => {
  const { phoneNumbers, setPhoneNumbers } = useToiletForm(); // string[]
  const [errors, setErrors] = useState<ErrMap>({});
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);

  const rows = useMemo(() => (phoneNumbers?.length ? phoneNumbers : [""]), [phoneNumbers]);

  const setAt = (idx: number, value: string) => {
    const next = [...rows];
    next[idx] = sanitizePhone(value);
    setPhoneNumbers(next);
  };

  const onBlur = (idx: number) => {
    const val = rows[idx];
    const normalized = normalizeDZ(val);
    if (normalized !== val) {
      const next = [...rows];
      next[idx] = normalized;
      setPhoneNumbers(next);
    }
    setErrors((e) => ({
      ...e,
      [idx]: normalized && !looksLikePhone(normalized) ? "Numéro invalide" : undefined,
    }));
    setFocusedIdx((cur) => (cur === idx ? null : cur));
  };

  const addRow = () => setPhoneNumbers([...rows, ""]);
  const removeRow = (idx: number) => {
    const next = rows.filter((_, i) => i !== idx);
    setPhoneNumbers(next.length ? next : [""]);
    setErrors((e) => {
      const copy = { ...e };
      delete copy[idx];
      return copy;
    });
    if (focusedIdx === idx) setFocusedIdx(null);
  };

  return (
    <View style={{ gap: S.sm }}>
      <Text style={{ fontWeight: "800", color: T.text.strong }}>Phones</Text>

      {rows.map((val, idx) => {
        const hasError = !!errors[idx];
        const focused = focusedIdx === idx;

        return (
          <View key={idx} style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", gap: S.sm, alignItems: "center" }}>
              <TextInput
                value={val}
                onChangeText={(t) => setAt(idx, t)}
                onFocus={() => setFocusedIdx(idx)}
                onBlur={() => onBlur(idx)}
                placeholder={idx === 0 ? "+213XXXXXXXXX" : "Autre numéro"}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor={T.text.tertiary as string}
                style={[
                  {
                    flex: 1,
                    borderWidth: 1,
                    borderColor: hasError
                      ? (T.colors.error as string)
                      : focused
                      ? (T.colors.primary as string)
                      : (T.border.subtle as string),
                    borderRadius: R.sm,
                    paddingHorizontal: S.md,
                    paddingVertical: 10,
                    backgroundColor: T.bg.surface as string,
                    color: T.text.default as string,
                    minHeight: 42,
                  },
                  focused ? shadow(1) : shadow(0),
                ]}
              />

              {rows.length > 1 ? (
                <Pressable
                  onPress={() => removeRow(idx)}
                  android_ripple={{ color: withAlpha("#000", 0.06) }}
                  style={({ pressed }) => [
                    {
                      height: 42,
                      width: 42,
                      borderRadius: R.sm,
                      borderWidth: 1,
                      borderColor: T.border.subtle as string,
                      backgroundColor: T.bg.surface as string,
                      alignItems: "center",
                      justifyContent: "center",
                      ...shadow(0),
                    },
                    pressableStyles(pressed),
                  ]}
                  accessibilityLabel="Remove phone"
                >
                  <Minus size={18} color={T.text.strong as string} />
                </Pressable>
              ) : null}
            </View>

            {hasError ? (
              <Text style={{ color: T.colors.error as string, fontSize: 12 }}>{errors[idx]}</Text>
            ) : null}
          </View>
        );
      })}

      <Pressable
        onPress={addRow}
        android_ripple={{ color: withAlpha("#000", 0.06) }}
        style={({ pressed }) => [
          {
            alignSelf: "flex-start",
            flexDirection: "row",
            alignItems: "center",
            gap: S.sm,
            paddingHorizontal: S.md,
            paddingVertical: 10,
            borderRadius: R.sm,
            borderWidth: 1,
            borderColor: T.border.subtle as string,
            backgroundColor: T.bg.surface as string,
            ...shadow(0),
          },
          pressableStyles(pressed),
        ]}
      >
        <Plus size={18} color={T.text.strong as string} />
        <Text style={{ fontWeight: "800", color: T.text.strong as string }}>Ajouter un numéro</Text>
      </Pressable>
    </View>
  );
};
