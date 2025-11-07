import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { theme as T, S, R, withAlpha, shadow, pressableStyles } from "@/ui/theme";

/* ----------------------------- Field ----------------------------- */

export function Field({
  label,
  multiline,
  helperText,
  error,
  style,
  ...props
}: any & { helperText?: string; error?: string }) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ marginBottom: S.sm }}>
      {label ? (
        <Text style={{ marginBottom: 6, color: T.text.strong, fontWeight: "800" }}>
          {label}
        </Text>
      ) : null}

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
          {
            borderWidth: 1,
            borderColor: error
              ? (T.colors.error as string)
              : focused
              ? (T.colors.primary as string)
              : (T.border.subtle as string),
            borderRadius: R.sm,
            paddingHorizontal: S.md,
            paddingVertical: multiline ? 10 : 8,
            backgroundColor: T.bg.surface,
            color: T.text.default as string,
            minHeight: multiline ? 84 : 40,
          },
          focused ? shadow(1) : shadow(0),
          style,
        ]}
        multiline={!!multiline}
      />

      {!!error && (
        <Text style={{ marginTop: 6, color: T.colors.error as string, fontSize: 12 }}>
          {error}
        </Text>
      )}
      {!error && !!helperText && (
        <Text style={{ marginTop: 6, color: T.text.tertiary as string, fontSize: 12 }}>
          {helperText}
        </Text>
      )}
    </View>
  );
}

/* --------------------------- RowChips (single-select) --------------------------- */

export function RowChips({
  options,
  value,
  onChange,
  allowUnset,
}: {
  options: { code: string; label: string }[];
  value?: string;
  onChange: (v?: string) => void;
  allowUnset?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.sm }}>
      {options.map((opt) => {
        const active = value === opt.code;
        return (
          <Pressable
            key={opt.code}
            onPress={() => onChange(active && allowUnset ? undefined : opt.code)}
            android_ripple={{ color: withAlpha("#000", 0.06) }}
            style={({ pressed }) => [
              chipBase,
              {
                borderColor: active ? (T.colors.primary as string) : (T.border.subtle as string),
                backgroundColor: active ? (T.colors.primary as string) : (T.bg.surface as string),
              },
              pressableStyles(pressed),
            ]}
          >
            <Text
              style={{
                color: active ? (T.text.onPrimary as string) : (T.text.strong as string),
                fontWeight: "700",
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}

      {allowUnset && (
        <Pressable
          onPress={() => onChange(undefined)}
          android_ripple={{ color: withAlpha("#000", 0.06) }}
          style={({ pressed }) => [
            chipBase,
            {
              borderColor: value ? (T.border.subtle as string) : (T.colors.primary as string),
              backgroundColor: value ? (T.bg.surface as string) : (T.colors.primary as string),
            },
            pressableStyles(pressed),
          ]}
        >
          <Text
            style={{
              color: value ? (T.text.strong as string) : (T.text.onPrimary as string),
              fontWeight: "700",
            }}
          >
            Any
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/* --------------------------- MultiChips (multi-select) --------------------------- */

export function MultiChips({
  options,
  values,
  onToggle,
}: {
  options: { code: string; label: string }[];
  values: string[];
  onToggle: (code: string, nextActive: boolean) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.sm }}>
      {options.map((opt) => {
        const active = values.includes(opt.code);
        return (
          <Pressable
            key={opt.code}
            onPress={() => onToggle(opt.code, !active)}
            android_ripple={{ color: withAlpha("#000", 0.06) }}
            style={({ pressed }) => [
              chipBase,
              {
                borderColor: active ? (T.colors.primary as string) : (T.border.subtle as string),
                backgroundColor: active ? (T.colors.primary as string) : (T.bg.surface as string),
              },
              pressableStyles(pressed),
            ]}
          >
            <Text
              style={{
                color: active ? (T.text.onPrimary as string) : (T.text.strong as string),
                fontWeight: "700",
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* --------------------------- Shared styles --------------------------- */

const chipBase = {
  paddingHorizontal: S.md,
  paddingVertical: 8,
  borderRadius: R.pill,
  borderWidth: 1,
} as const;
