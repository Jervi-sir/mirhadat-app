// components/Button.tsx
import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { colors, radius, spacing } from "@/utils/theme";

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "danger";
  disabled?: boolean;
}) {
  const backgroundColor =
    variant === "primary"
      ? colors.text
      : variant === "danger"
      ? colors.danger
      : "transparent";

  const textColor = variant === "outline" ? colors.background : "#fff";
  const borderColor = variant === "outline" ? colors.primary : "transparent";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.base,
        { backgroundColor, borderColor, opacity: disabled ? 0.6 : 1 },
      ]}
    >
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 40,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
});
