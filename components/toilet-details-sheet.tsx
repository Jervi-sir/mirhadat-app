import React from "react";
import { View, Text, Pressable } from "react-native";
import ActionSheet, { ActionSheetRef } from "react-native-actions-sheet";
import type { ToiletWithRelations } from "@/utils/types";

export function ToiletDetailsSheet({
  sheetRef,
  toilet,
  onStartSession,
}: {
  sheetRef: React.RefObject<ActionSheetRef>;
  toilet?: ToiletWithRelations;
  onStartSession?: (toiletId: number) => void;
}) {
  return (
    <ActionSheet
      ref={sheetRef}
      gestureEnabled
      closeOnTouchBackdrop
      drawUnderStatusBar
      defaultOverlayOpacity={0.3}
      containerStyle={{ height: "69%", borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
      indicatorStyle={{ width: 60, height: 5, borderRadius: 3, backgroundColor: "#111" }}
    >
      <View style={{ padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 18, fontWeight: "700" }}>{toilet?.name ?? "Toilet"}</Text>
        <Text style={{ color: "#666" }}>{toilet?.addressLine}</Text>
        <Text style={{ color: "#666" }}>
          {toilet?.category?.en || toilet?.category?.fr || toilet?.category?.ar || "—"}
          {" · "}
          {toilet?.isFree ? "Free" : toilet?.priceCents != null ? `${(toilet.priceCents / 100).toFixed(0)} DZD` : "—"}
          {" · "}
          {toilet?.avgRating?.toFixed(1) ?? "0.0"} ★
        </Text>

        {!!toilet?.amenities?.length && (
          <Text style={{ color: "#666" }}>Amenities: {toilet.amenities.join(", ")}</Text>
        )}
        {!!toilet?.rules?.length && (
          <Text style={{ color: "#666" }}>Rules: {toilet.rules.join(", ")}</Text>
        )}

        <Pressable
          disabled={!toilet}
          onPress={() => toilet && onStartSession?.(toilet.id)}
          style={{
            backgroundColor: "#111",
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: "center",
            marginTop: 8,
            opacity: toilet ? 1 : 0.6,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Start session</Text>
        </Pressable>
      </View>
    </ActionSheet>
  );
}
