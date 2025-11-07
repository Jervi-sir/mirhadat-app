// ui/Input.tsx
import React, { useState } from "react";
import { TextInput, View, StyleSheet, ViewStyle } from "react-native";
import { theme } from "./theme";
import { Text } from "./text";

type Props = {
  label?: string;
  placeholder?: string;
  value?: string;
  onChangeText?: (t: string) => void;
  secureTextEntry?: boolean;
  left?: React.ReactNode;
  right?: React.ReactNode;
  error?: string;
  style?: ViewStyle | ViewStyle[];
};

export const Input: React.FC<Props> = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  left,
  right,
  error,
  style,
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={style}>
      {label ? <Text variant="label" style={{ marginBottom: 6 }}>{label}</Text> : null}
      <View
        style={[
          styles.wrap,
          focused && { borderColor: theme.border.focus },
          error && { borderColor: theme.border.error },
        ]}
      >
        {left}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.text.tertiary}
          secureTextEntry={secureTextEntry}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={styles.input}
        />
        {right}
      </View>
      {!!error && <Text variant="caption" color="secondary" style={{ color: theme.border.error, marginTop: 6 }}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.bg.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    paddingHorizontal: 12,
    height: 48,
  },
  input: {
    flex: 1,
    color: theme.text.default,
    ...theme.typography.body,
  },
});
