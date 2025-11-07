import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useToiletForm } from "../toilet-form-context";
import { MultiChips } from "./wrappers";
import { theme as T, S } from "@/ui/theme";

export const RulesSection = () => {
  const { taxLoading, ruleOptions, rules, setRules } = useToiletForm();

  return (
    <View style={{ gap: S.xs }}>
      <Text style={{ marginBottom: 6, color: T.text.strong, fontWeight: "800" }}>
        Rules
      </Text>

      {taxLoading ? (
        <ActivityIndicator color={T.colors.primary as string} />
      ) : (
        <MultiChips
          options={ruleOptions.map((a) => ({
            code: a.code,
            label: a.label,
          }))}
          values={rules}
          onToggle={(code, next) =>
            setRules((prev) =>
              next ? [...prev, code] : prev.filter((c) => c !== code)
            )
          }
        />
      )}
    </View>
  );
};
