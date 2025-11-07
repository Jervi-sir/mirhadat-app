import React from "react";
import { Switch, Text, View } from "react-native";
import { Field, RowChips } from "./wrappers";
import { useToiletForm } from "../toilet-form-context";
import { theme as T, S, R } from "@/ui/theme";

const pricingOptions = [
  { code: "flat", label: "Flat" },
  { code: "per-visit", label: "Per visit" },
  { code: "per-30-min", label: "Per 30 min" },
  { code: "per-60-min", label: "Per 60 min" },
];

export const PricingSection = () => {
  const {
    isFree,
    setIsFree,
    priceCents,
    setPriceCents,
    pricingModel,
    setPricingModel,
  } = useToiletForm();

  return (
    <View style={{ gap: S.md }}>
      {/* Free toggle */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 2,
        }}
      >
        <Text style={{ color: T.text.strong, fontWeight: "800" }}>Free</Text>
        <Switch
          value={isFree}
          onValueChange={setIsFree}
          trackColor={{ false: "#D1D5DB", true: T.colors.primary as string }}
          thumbColor="#FFFFFF"
        />
      </View>

      {/* Pricing fields when not free */}
      {!isFree && (
        <View style={{ gap: S.sm }}>
          <Field
            label="Price (DZD)"
            value={priceCents}
            onChangeText={setPriceCents}
            keyboardType="numeric"
          />
          <RowChips
            options={pricingOptions}
            value={pricingModel ?? undefined}
            onChange={(v) => setPricingModel((v as any) ?? null)}
          />
        </View>
      )}
    </View>
  );
};
