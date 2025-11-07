// ui/Button.tsx
import React from "react";
import { ActivityIndicator, GestureResponderEvent, Pressable, StyleSheet, ViewStyle } from "react-native";
import { pressableStyles, shadow, theme, withAlpha } from "./theme";
import { Text } from "./text";

type Variant = "filled" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

type Props = {
  title: string;
  onPress?: (e: GestureResponderEvent) => void;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: Variant;
  size?: Size;
  style?: ViewStyle | ViewStyle[];
  fullWidth?: boolean;
};

const HEIGHT = { sm: 36, md: 44, lg: 52 };
const PADX   = { sm: 12, md: 16, lg: 20 };

export const Button: React.FC<Props> = ({
  title,
  leftIcon,
  rightIcon,
  onPress,
  disabled,
  loading,
  variant = "filled",
  size = "md",
  style,
  fullWidth,
}) => {
  return (
    <Pressable
      hitSlop={theme.hitSlop}
      onPress={onPress}
      disabled={disabled || loading}
      android_ripple={{ color: theme.state.ripple, borderless: false }}
      style={({ pressed }) => [
        base.base,
        variantStyles[variant],
        { height: HEIGHT[size], paddingHorizontal: PADX[size] },
        fullWidth && { alignSelf: "stretch" },
        pressableStyles(pressed),
        (variant === "filled") && shadow(1),
        disabled && base.disabled,
        style,
      ]}
    >
      {({ pressed }) => (
        <>
          {leftIcon ? leftIcon : null}
          <Text
            variant="body"
            color={variant === "filled" ? "onPrimary" : "strong"}
            style={{ marginHorizontal: leftIcon || rightIcon ? theme.spacing.sm : 0, fontWeight: "700" }}
          >
            {title}
          </Text>
          {loading ? <ActivityIndicator size="small" color={variant === "filled" ? "#fff" : theme.colors.ink} /> : rightIcon}
        </>
      )}
    </Pressable>
  );
};

const base = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.5,
  },
});

const variantStyles = StyleSheet.create({
  filled: {
    backgroundColor: theme.colors.primary,
    borderColor: withAlpha(theme.colors.primary, 0.16),
  },
  outline: {
    backgroundColor: theme.bg.surface,
    borderColor: withAlpha(theme.text.default, 0.12),
  },
  ghost: {
    backgroundColor: withAlpha(theme.colors.primary, 0.08),
    borderColor: "transparent",
  },
});
