// ui/Card.tsx
import React from "react";
import { View, StyleSheet, ViewProps } from "react-native";
import { shadow, theme } from "./theme";

export const Card: React.FC<ViewProps> = ({ style, children, ...rest }) => {
  return (
    <View {...rest} style={[styles.card, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.bg.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    padding: theme.spacing.lg,
    ...shadow(1),
  },
});
