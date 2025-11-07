import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { MultiChips } from "./wrappers";
import { useToiletForm } from "../toilet-form-context";
import { theme as T, S } from "@/ui/theme";

export const AmenitiesSection = () => {
  const { taxLoading, amenityOptions, amenities, setAmenities } = useToiletForm();

  return (
    <View style={{ gap: S.xs }}>
      <Text style={{ marginBottom: 6, color: T.text.strong, fontWeight: "800" }}>
        Amenities
      </Text>

      {taxLoading ? (
        <ActivityIndicator color={T.colors.primary as string} />
      ) : (
        <MultiChips
          options={amenityOptions.map((a) => ({
            code: a.code,
            label: a.label,
          }))}
          values={amenities}
          onToggle={(code, next) =>
            setAmenities((prev) =>
              next ? [...prev, code] : prev.filter((c) => c !== code)
            )
          }
        />
      )}
    </View>
  );
};
