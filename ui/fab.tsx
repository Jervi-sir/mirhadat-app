// ui/FAB.tsx
import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { theme, shadow, pressableStyles } from "./theme";

export const FAB: React.FC<{ icon: React.ReactNode; onPress?: () => void }> = ({ icon, onPress }) => (
  <Pressable
    onPress={onPress}
    hitSlop={theme.hitSlop}
    android_ripple={{ color: "rgba(255,255,255,0.2)", borderless: true }}
    style={({ pressed }) => [styles.fab, pressableStyles(pressed)]}
  >
    {icon}
  </Pressable>
);

const SIZE = 56;

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: theme.spacing["xxl"],
    bottom: theme.spacing["xxl"],
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadow(3),
  },
});
