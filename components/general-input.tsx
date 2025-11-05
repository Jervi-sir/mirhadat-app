// components/Input.tsx
import React from "react";
import { TextInput, StyleSheet, View, Text, ViewStyle } from "react-native";
import { colors, radius, spacing } from "@/utils/theme";

export function GeneralInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  containerStyle = {}
}: {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  containerStyle?: ViewStyle
}) {
  return (
    <View style={[styles.container, { ...containerStyle }]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, multiline && { height: 100, textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { minHeight: 40 },
  label: { fontSize: 14, color: colors.muted, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: 16,
    color: colors.text,
  },
});
