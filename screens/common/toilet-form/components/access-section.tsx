import React, { useMemo } from "react";
import { ActivityIndicator, Switch, Text, View } from "react-native";
import { Field, RowChips } from "./wrappers";
import { useToiletForm } from "../toilet-form-context";
import { theme as T, S, R } from "@/ui/theme";

export const AccessSection = () => {
  const {
    taxLoading,
    accessMethods,
    accessMethod, setAccessMethod,
    capacity, setCapacity,
    isUnisex, setIsUnisex,
  } = useToiletForm();

  const chipOptions = useMemo(
    () => accessMethods.map((a) => ({ code: a.code, label: a.label })),
    [accessMethods]
  );

  return (
    <View style={{ gap: S.md }}>
      {/* Access method */}
      <View>
        <Text style={{ marginBottom: 6, color: T.text.strong, fontWeight: "800" }}>
          Access method
        </Text>
        {taxLoading ? (
          <ActivityIndicator color={T.colors.primary as string} />
        ) : (
          <RowChips
            options={chipOptions}
            value={accessMethod}
            onChange={(v) => (v ? setAccessMethod(v as any) : null)}
            allowUnset
          />
        )}
      </View>

      {/* Capacity + Unisex */}
      <View style={{ gap: S.sm }}>
        <Field
          label="Capacity"
          value={capacity}
          onChangeText={setCapacity}
          keyboardType="numeric"
          helperText="How many stalls/places available."
          // you can pass error if you add validation upstream
        />

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 2,
          }}
        >
          <Text style={{ color: T.text.strong, fontWeight: "700" }}>Unisex</Text>
          <Switch
            value={isUnisex}
            onValueChange={setIsUnisex}
            trackColor={{ false: "#D1D5DB", true: T.colors.primary as string }}
            thumbColor={"#FFFFFF"}
          />
        </View>
      </View>
    </View>
  );
};
