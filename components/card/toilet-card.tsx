import { ToiletWithRelationsType } from "@/utils/types";
import React, { useMemo } from "react";
import { View, Text, Pressable, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Routes } from "@/utils/variables/routes";
import { theme as T, S, R, shadow, withAlpha, pressableStyles, C } from "@/ui/theme";
import { Divider } from "@/ui/divider";
import { makeFakeToilet } from "@/utils/fake-data/toilet-card-data";

export function ToiletCard({
  item,
  onPress,
}: {
  item?: ToiletWithRelationsType;
  onPress?: () => void;
}) {
  const data = useMemo<ToiletWithRelationsType>(() => item ?? makeFakeToilet(), [item]);
  const navigation: any = useNavigation();

  const categoryLabel =
    data.category?.en || data.category?.fr || data.category?.ar || "—";

  const priceText = data.is_free
    ? "Free"
    : data.price_cents != null
      ? `${(data.price_cents / 100).toFixed(0)} DZD`
      : "—";

  const pricingModelText =
    data.pricing_model === "per-visit"
      ? "per visit"
      : data.pricing_model === "per-30-min"
        ? "per 30 min"
        : data.pricing_model === "per-60-min"
          ? "per hour"
          : data.pricing_model === "flat"
            ? "flat rate"
            : "";

  const amenitiesPreview = (data.amenities ?? []).slice(0, 4).join(", ");
  const hasMoreAmenities = (data.amenities?.length ?? 0) > 4 ? "…" : "";

  const coverUri =
    typeof data?.cover_photo === "string"
      ? data.cover_photo
      : typeof (data as any)?.cover_photo?.url === "string"
        ? (data as any).cover_photo.url
        : undefined;

  return (
    <Pressable
      onPress={() => {
        if (onPress) onPress();
        else navigation.navigate(Routes.ToiletOfferScreen, { toiletId: item?.id });
      }}
      android_ripple={{ color: T.state.ripple }}
      style={({ pressed }) => [
        {
          backgroundColor: T.bg.surface,
          borderRadius: R.xl,
          overflow: 'hidden',
          marginBottom: 12,
          borderWidth: 1,
          borderColor: T.border.subtle,
          ...shadow(1),
        },
        pressableStyles(pressed),
      ]}
    >
      <View style={{
        flexDirection: "row",
        alignItems: 'center',
        gap: S.md,
        padding: S.md,
      }}>
        {/* Cover */}
        <View
          style={{
            width: 69,
            height: 69,
            backgroundColor: T.bg.primaryTint,
            overflow: "hidden",
            borderRadius: R.md,
            borderWidth: 1,
            borderColor: withAlpha(T.text.default, 0.06),
          }}
        >
          {coverUri && (
            <Image source={{ uri: coverUri }} style={{ width: 69, height: 69 }} resizeMode="cover" />
          )}
        </View>
        {/* Content */}
        <View style={{ flex: 1 }}>
          {/* Title + rating */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: S.sm }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: T.text.default }} numberOfLines={1}>
              {data.name}
            </Text>

          </View>


          {/* Address */}
          <Text numberOfLines={1} style={{ fontSize: 12, marginTop: 4, color: T.text.tertiary }}>
            {data.address_line}
          </Text>

          {/* Amenities */}
          {Boolean(data.amenities?.length) && (
            <Text style={{ fontSize: 11, marginTop: 6, color: T.text.secondary }}>
              Amenities: {amenitiesPreview}
              {hasMoreAmenities}
            </Text>
          )}
        </View>
      </View>
      <Divider />
      <View style={{
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: S.md,
        paddingVertical: S.sm,
        backgroundColor: 'rgba(0,123,122,0.1)'
      }}>
        {/* Category + price */}
        <Text style={{ ...T.typography.label , color: T.text.default }}>
          {categoryLabel}
          {" · "}
          {priceText}
          {pricingModelText ? ` (${pricingModelText})` : ""}
        </Text>
        {/* Rating pill */}
        <View
          style={{
            backgroundColor: withAlpha("#F59E0B", 0.12),
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: R.pill,
            borderWidth: 1,
            borderColor: withAlpha("#F59E0B", 0.2),
            minWidth: 44,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 12, color: "#F59E0B", fontWeight: "700" }}>
            {(data.avg_rating ?? 0).toFixed(1)} ★
          </Text>
        </View>
      </View>

    </Pressable>
  );
}
