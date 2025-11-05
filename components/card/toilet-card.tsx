import {
  ISODateTimeType,
  ToiletCategoryType,
  ToiletWithRelationsType,
  UserType,
  WilayaType,
  PricingModelType,
} from "@/utils/types";
import React, { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { Image } from 'expo-image';
import { useNavigation } from "@react-navigation/native";
import { Routes } from "@/utils/variables/routes";

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

  const priceText =
    data.is_free
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
  const hasMoreAmenities =
    (data.amenities?.length ?? 0) > 4 ? "…" : "";

  return (
    <Pressable
      onPress={() => {
        if(onPress) onPress();
        else {
          navigation.navigate(Routes.ToiletOfferScreen, { toiletId: item?.id })
        }
      }}
      style={{
        backgroundColor: "#fff",
        padding: 12,
        borderRadius: 12,
        marginVertical: 6,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
        flexDirection: 'row',  gap: 8
      }}
    >
      <View style={{ width: 76, height: 76, backgroundColor: '#111', overflow: "hidden", borderRadius: 8 }}>
        {data.cover_photo
          && <Image
            source={{ uri: data.cover_photo }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        }
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 16, fontWeight: "600" }}>{data.name}</Text>
          <Text style={{ fontSize: 12, opacity: 0.7 }}>
            {(data.avg_rating ?? 0).toFixed(1)} ★
          </Text>
        </View>

        <Text style={{ fontSize: 13, marginTop: 4, color: "#555" }}>
          {categoryLabel}
          {" · "}
          {priceText}
          {pricingModelText ? ` (${pricingModelText})` : ""}
        </Text>

        <Text
          numberOfLines={1}
          style={{ fontSize: 12, marginTop: 4, color: "#777" }}
        >
          {data.address_line}
        </Text>

        {Boolean(data.amenities?.length) && (
          <Text style={{ fontSize: 11, marginTop: 6, color: "#888" }}>
            Amenities: {amenitiesPreview}
            {hasMoreAmenities}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

/* ---------- Helper & Fake Data ---------- */
function nowISO(): ISODateTimeType {
  return new Date().toISOString() as ISODateTimeType;
}

function makeFakeToilet(): ToiletWithRelationsType {
  const created = nowISO();
  const updated = created;

  const fakeCategory: ToiletCategoryType = {
    id: 1,
    code: "cafeteria",
    icon: "mdi:cup",
    en: "Cafeteria",
    fr: "Cafétéria",
    ar: "مقهى",
    created_at: created,
    updated_at: updated,
  };

  const fakeWilaya: WilayaType = {
    id: 16,
    code: "DZ-16",
    number: 16,
    en: "Algiers",
    fr: "Alger",
    ar: "الجزائر",
    created_at: created,
    updated_at: updated,
  };

  const fakeOwner: Pick<UserType, "id" | "name"> = { id: 42, name: "Octa Place" };

  return {
    id: 1001,
    owner_id: 42,
    toilet_category_id: fakeCategory.id,

    name: "Octa Mall — Level 2",
    description:
      "Clean facilities near the food court. Staff checks every hour.",
    phone_numbers: ["0550 000 000"],

    lat: 36.7525,
    lng: 3.04197,

    address_line: "Centre Commercial Octa Mall, Alger",
    wilaya_id: fakeWilaya.id,
    place_hint: "By the escalators, next to Kiosque Z",

    access_method: "public",
    capacity: 4,
    is_unisex: true,

    amenities: ["paper", "soap", "water", "bidet"],
    rules: ["no_smoking", "for_customers_only"],

    is_free: false,
    price_cents: 50,
    pricing_model: "per-visit" as PricingModelType,

    status: "active",
    avg_rating: 4.3,
    reviews_count: 128,
    photos_count: 6,

    created_at: created,
    updated_at: updated,

    category: fakeCategory,
    wilaya: fakeWilaya,
    owner: fakeOwner,
    photos: [],
    open_hours: [],
    is_favorite: false,
  };
}
