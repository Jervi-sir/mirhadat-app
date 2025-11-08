import React, { useMemo } from "react";
import { View, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { withAlpha, S, T } from "@/ui/theme"; // adjust to your paths

// Optional fallback maps if backend doesn't send *_meta
const AMENITY_LABEL: Record<string, string> = {
  wifi: "Wi-Fi",
  soap: "Soap",
  water: "Water",
  handwash: "Hand wash",
  bidet: "Bidet / Shattaf",
  dryers: "Hand dryers",
  wheelchair: "Wheelchair access",
  baby_change: "Baby changing",
  outlets: "Power outlets",
  mirror: "Mirror",
  sanitizer: "Hand sanitizer",
  western_wc: "Western toilet",
  squat_wc: "Squat toilet",
  gender_neutral: "Gender-neutral",
  shower: "Shower",
  hot_water: "Hot water",
  braille: "Braille signage",
  wide_door: "Wide door",
  grab_bars: "Grab bars",
};

const RULE_LABEL: Record<string, string> = {
  no_smoking: "No smoking",
  for_customers_only: "Customers only",
  no_pets: "No pets",
  no_photos: "No photography",
  cctv: "CCTV in operation",
  no_vaping: "No vaping",
  no_alcohol_drugs: "No alcohol/drugs",
  keep_clean: "Keep it clean",
  respect_queue: "Respect the queue",
};

// Tiny chip with icon + text
export const InfoChip = ({ icon, label }: { icon?: string; label: string }) => (
  <View
    style={{
      flexDirection: "row",
      alignItems: "center",
      // backgroundColor: withAlpha(T., 0.08),
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
    }}
  >
    {!!icon && (
      <MaterialCommunityIcons
        name={icon as any}
        size={16}
        // color={T.primary}
        style={{ marginRight: 6 }}
      />
    )}
    <Text style={{ color: '#111', fontWeight: "600" }}>{label}</Text>
  </View>
);

// Utility to prettify unknown codes
const pretty = (s: string) =>
  s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : s;

// Make a list ready for rendering from either *_meta or codes[]
export function useIconList(
  meta: any[] | undefined,
  codes: string[] | undefined
) {
  return useMemo(() => {
    if (Array.isArray(meta) && meta.length) {
      // Backend gives icon names like "mdi:wifi" — strip prefix for MDI
      return meta.map((m) => ({
        key: m.code,
        icon: (m.icon || "").replace(/^mdi:/, "") || undefined,
        label: m.label || m.en || pretty(m.code),
      }));
    }
    // Fallback: only codes came through
    return (codes || []).map((code) => ({
      key: code,
      icon: undefined, // you can map a fallback icon per code if you want
      label: AMENITY_LABEL[code] ?? RULE_LABEL[code] ?? pretty(code),
    }));
  }, [meta, codes]);
}
