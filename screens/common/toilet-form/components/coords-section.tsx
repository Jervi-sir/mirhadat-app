// components/coords-section.tsx
import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useToiletForm } from "../toilet-form-context";
import { MapPin } from "lucide-react-native";
import { Routes } from "@/utils/variables/routes";
import { theme as T, S, R, withAlpha, shadow, pressableStyles } from "@/ui/theme";

export const CoordsSection: React.FC = () => {
  const nav = useNavigation<any>();
  const { lat, setLat, lng, setLng } = useToiletForm();

  const hasCoords = !!lat && !!lng;

  const label = useMemo(() => {
    if (!hasCoords) return "Choose on map";
    return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
  }, [lat, lng, hasCoords]);

  const openPicker = () => {
    nav.navigate(Routes.MapPickerScreen, {
      initial: hasCoords ? { latitude: Number(lat), longitude: Number(lng) } : undefined,
      onPick: ({ latitude, longitude }: { latitude: number; longitude: number }) => {
        setLat(String(latitude));
        setLng(String(longitude));
      },
    });
  };

  return (
    <View style={{ gap: S.xs, paddingBottom: S.md }}>
      <Text style={{ color: T.text.strong, fontWeight: "800" }}>Location</Text>

      <Pressable
        onPress={openPicker}
        android_ripple={{ color: withAlpha("#000", 0.06) }}
        style={({ pressed }) => [
          {
            flexDirection: "row",
            alignItems: "center",
            gap: S.sm,
            borderWidth: 1,
            borderColor: hasCoords ? (T.border.subtle as string) : (T.border.subtle as string),
            borderRadius: R.sm,
            paddingHorizontal: S.sm,
            paddingVertical: 12,
            backgroundColor: T.bg.surface,
            ...shadow(hasCoords ? 1 : 0),
          },
          pressableStyles(pressed),
        ]}
      >
        <MapPin size={18} color={hasCoords ? (T.colors.ink200 as string) : (T.text.strong as string)} />
        <Text
          style={{
            fontWeight: hasCoords ? "800" : "600",
            color: hasCoords ? (T.text.strong as string) : (T.text.default as string),
          }}
        >
          {label}
        </Text>
      </Pressable>
    </View>
  );
};
