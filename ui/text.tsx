// ui/Text.tsx
import React from "react";
import { Text as RNText, TextProps, StyleSheet } from "react-native";
import { theme } from "./theme";

type Variant = "display"|"h1"|"h2"|"h3"|"body"|"bodyMuted"|"label"|"caption";

type Props = TextProps & {
  variant?: Variant;
  color?: keyof typeof theme.text | string;
  align?: "left"|"center"|"right";
};

export const Text: React.FC<Props> = ({
  variant = "body",
  color = "default",
  align = "left",
  style,
  children,
  ...rest
}) => {
  const preset = styles[variant];
  const resolvedColor = (theme.text as any)[color] ?? color;
  return (
    <RNText
      {...rest}
      style={[preset, { color: resolvedColor, textAlign: align }, style]}
    >
      {children}
    </RNText>
  );
};

const styles = StyleSheet.create({
  display: { ...theme.typography.display, color: theme.text.default },
  h1: { ...theme.typography.h1, color: theme.text.default },
  h2: { ...theme.typography.h2, color: theme.text.default },
  h3: { ...theme.typography.h3, color: theme.text.default },
  body: { ...theme.typography.body, color: theme.text.default },
  bodyMuted: { ...theme.typography.bodyMuted, color: theme.text.secondary },
  label: { ...theme.typography.label, color: theme.text.secondary, textTransform: "uppercase", letterSpacing: 0.6 },
  caption: { ...theme.typography.caption, color: theme.text.tertiary },
});
