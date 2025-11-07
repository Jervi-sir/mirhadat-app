// ui/Badge.tsx
import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { theme } from "./theme";
import { Text } from "./text";

type Tone = "neutral" | "success" | "warning" | "error" | "info" | "primary";

export const Badge: React.FC<{ text: string; tone?: Tone; style?: ViewStyle | ViewStyle[] }> = ({
  text,
  tone = "neutral",
  style,
}) => {
  const map: Record<Tone, { bg: string; fg: string }> = {
    neutral: { bg: "rgba(13,14,12,0.08)", fg: theme.text.strong },
    success: { bg: "rgba(34,197,94,0.12)", fg: theme.colors.success },
    warning: { bg: "rgba(245,158,11,0.12)", fg: theme.colors.warning },
    error:   { bg: "rgba(239,68,68,0.12)",  fg: theme.colors.error },
    info:    { bg: "rgba(59,130,246,0.12)", fg: theme.colors.info },
    primary: { bg: theme.bg.primaryTint,    fg: theme.colors.primary },
  };

  return (
    <View style={[styles.base, { backgroundColor: map[tone].bg }, style]}>
      <Text variant="label" style={{ color: map[tone].fg }}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
