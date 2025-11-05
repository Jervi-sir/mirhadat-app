// components/Header.tsx
import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors, spacing } from "@/utils/theme";
import { ArrowLeft } from "lucide-react-native"; // optional icon lib

export function Header({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <View style={styles.container}>
      {onBack && (
        <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn}>
          <ArrowLeft color={colors.text} size={22} />
        </Pressable>
      )}
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { marginRight: spacing.sm },
  title: { fontSize: 20, fontWeight: "600", color: colors.text },
});
