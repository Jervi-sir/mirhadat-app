// ToiletOfferScreen.tsx
import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Linking,
  Platform,
} from "react-native";
import type {
  ToiletWithRelations,
  ToiletCategory,
  Wilaya,
  User,
  ISODateTime,
  DayOfWeek,
  AccessMethod,
} from "@/utils/types";
import { ScreenWrapper } from "@/components/screen-wrapper";

/* --------------------------- Fake data fallback --------------------------- */

function nowISO(): ISODateTime {
  return new Date().toISOString() as ISODateTime;
}

function makeFakeToilet(): ToiletWithRelations {
  const created = nowISO();
  const updated = created;

  const fakeCategory: ToiletCategory = {
    id: 2,
    code: "mall",
    icon: "mdi:store",
    en: "Shopping Mall",
    fr: "Centre commercial",
    ar: "مركز تجاري",
    createdAt: created,
    updatedAt: updated,
  };

  const fakeWilaya: Wilaya = {
    id: 16,
    code: "DZ-16",
    number: 16,
    en: "Algiers",
    fr: "Alger",
    ar: "الجزائر",
    createdAt: created,
    updatedAt: updated,
  };

  const fakeOwner: Pick<User, "id" | "name"> = { id: 7, name: "City Facilities" };

  return {
    id: 1002,
    ownerId: 7,
    toiletCategoryId: fakeCategory.id,

    name: "Alger City Mall — L2 Washrooms",
    description: "Clean, regularly serviced. Family room nearby.",
    phoneNumbers: ["0550 123 456"],

    lat: 36.7525,
    lng: 3.04197,

    addressLine: "Alger City Mall, Mohammadia, Alger",
    wilayaId: fakeWilaya.id,
    placeHint: "Near elevators, opposite Food Court",

    accessMethod: "public",
    capacity: 5,
    isUnisex: true,

    amenities: ["paper", "soap", "water", "bidet", "wheelchair", "baby_change"],
    rules: ["no_smoking", "for_customers_only"],

    isFree: false,
    priceCents: 50,
    pricingModel: "per-visit",

    status: "active",
    avgRating: 4.4,
    reviewsCount: 203,
    photosCount: 8,

    createdAt: created,
    updatedAt: updated,

    category: fakeCategory,
    wilaya: fakeWilaya,
    owner: fakeOwner,
    photos: [
      {
        id: 1,
        toiletId: 1002,
        url: "https://picsum.photos/800/450?random=11",
        isCover: true,
        createdAt: created,
        updatedAt: updated,
      },
      {
        id: 2,
        toiletId: 1002,
        url: "https://picsum.photos/800/450?random=12",
        isCover: false,
        createdAt: created,
        updatedAt: updated,
      },
    ],
    openHours: [
      // 0=Sun, 1=Mon,...
      { id: 1, toiletId: 1002, dayOfWeek: 1, opensAt: "09:00:00", closesAt: "22:00:00", sequence: 1, createdAt: created, updatedAt: updated },
      { id: 2, toiletId: 1002, dayOfWeek: 2, opensAt: "09:00:00", closesAt: "22:00:00", sequence: 1, createdAt: created, updatedAt: updated },
      { id: 3, toiletId: 1002, dayOfWeek: 3, opensAt: "09:00:00", closesAt: "22:00:00", sequence: 1, createdAt: created, updatedAt: updated },
      { id: 4, toiletId: 1002, dayOfWeek: 4, opensAt: "09:00:00", closesAt: "22:00:00", sequence: 1, createdAt: created, updatedAt: updated },
      { id: 5, toiletId: 1002, dayOfWeek: 5, opensAt: "09:00:00", closesAt: "23:00:00", sequence: 1, createdAt: created, updatedAt: updated },
      { id: 6, toiletId: 1002, dayOfWeek: 6, opensAt: "10:00:00", closesAt: "23:00:00", sequence: 1, createdAt: created, updatedAt: updated },
      { id: 7, toiletId: 1002, dayOfWeek: 0, opensAt: "10:00:00", closesAt: "21:00:00", sequence: 1, createdAt: created, updatedAt: updated },
    ],
    isFavorite: false,
  };
}

/* ------------------------------ Mappings ------------------------------ */

const DAY_NAMES: Record<DayOfWeek, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

const ACCESS_LABEL: Record<AccessMethod, string> = {
  public: "Public",
  code: "Door code",
  staff: "Ask staff",
  key: "Key required",
  app: "App controlled",
};

const AMENITY_LABEL: Record<string, string> = {
  paper: "Toilet paper",
  soap: "Soap",
  water: "Water",
  bidet: "Bidet / Shattaf",
  handwash: "Hand wash",
  dryers: "Hand dryers",
  wheelchair: "Wheelchair access",
  baby_change: "Baby changing",
};

const RULE_LABEL: Record<string, string> = {
  no_smoking: "No smoking",
  for_customers_only: "Customers only",
  no_pets: "No pets",
  no_photos: "No photography",
};

/* ------------------------------ Helpers ------------------------------ */

function formatPriceDZD(priceCents: number | null): string {
  if (priceCents == null) return "—";
  return `${Math.round(priceCents).toFixed(0)} DZD`;
}

function formatTodayHours(openHours?: { dayOfWeek: DayOfWeek; opensAt: string; closesAt: string }[]) {
  if (!openHours || !openHours.length) return "—";
  const today = new Date().getDay() as DayOfWeek; // 0-6 (Sun-Sat)
  const todayRows = openHours.filter((r) => r.dayOfWeek === today);
  if (!todayRows.length) return "—";
  // If multiple intervals per day (sequence), join them
  return todayRows
    .map((r) => `${r.opensAt.slice(0, 5)}–${r.closesAt.slice(0, 5)}`)
    .join(", ");
}

function mapsLink(lat: number, lng: number, label?: string) {
  const q = encodeURIComponent(label ?? `${lat},${lng}`);
  if (Platform.OS === "ios") {
    return `http://maps.apple.com/?ll=${lat},${lng}&q=${q}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${q}`;
}

/* ------------------------------ UI atoms ------------------------------ */

function Chip({ text, active = false }: { text: string; active?: boolean }) {
  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? "#111" : "#ddd",
        backgroundColor: active ? "#111" : "#fff",
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      <Text style={{ color: active ? "#fff" : "#111", fontSize: 12 }}>{text}</Text>
    </View>
  );
}

/* ------------------------------ Main Screen ------------------------------ */

export default function ToiletOfferScreen({
  item,
  onBack,
}: {
  item?: ToiletWithRelations;
  onBack?: () => void;
}) {
  const data = useMemo<ToiletWithRelations>(() => item ?? makeFakeToilet(), [item]);

  const categoryLabel =
    data.category?.en || data.category?.fr || data.category?.ar || "—";

  const priceText = data.isFree ? "Free" : formatPriceDZD(data.priceCents);
  const accessText = ACCESS_LABEL[data.accessMethod] ?? data.accessMethod;

  const todayHours = formatTodayHours(data.openHours);

  return (
    <ScreenWrapper>
      <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
        {/* Header */}
        <View
          style={{
            paddingTop: 10,
            paddingHorizontal: 12,
            paddingBottom: 8,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#fff",
            borderBottomWidth: 1,
            borderBottomColor: "#eee",
          }}
        >
          <Pressable onPress={onBack} hitSlop={10}>
            <Text style={{ fontSize: 16 }}>{onBack ? "‹ Back" : ""}</Text>
          </Pressable>
          <Text style={{ fontWeight: "700", fontSize: 16 }} numberOfLines={1}>
            {data.name}
          </Text>
          <View style={{ width: 48 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          {/* Cover / gallery */}
          <View style={{ position: "relative" }}>
            {data.photos?.length ? (
              <Image
                source={{ uri: data.photos[0].url }}
                style={{ width: "100%", height: 210, backgroundColor: "#eaeaea" }}
                resizeMode="cover"
              />
            ) : (
              <View style={{ width: "100%", height: 210, backgroundColor: "#e5e5e5", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#666" }}>No photo</Text>
              </View>
            )}

            {/* Rating badge */}
            <View
              style={{
                position: "absolute",
                right: 12,
                bottom: 12,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: "#111",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>
                {data.avgRating.toFixed(1)} ★
              </Text>
            </View>
          </View>

          {/* Title + meta */}
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <Text style={{ fontSize: 20, fontWeight: "700" }}>{data.name}</Text>
            <Text style={{ marginTop: 4, color: "#555" }}>
              {categoryLabel} · {accessText} · {data.isUnisex ? "Unisex" : "Separate"}
              {" · "}
              Cap. {data.capacity}
            </Text>

            {data.placeHint ? (
              <Text style={{ marginTop: 6, color: "#777", fontSize: 12 }}>{data.placeHint}</Text>
            ) : null}
          </View>

          {/* Price & hours */}
          <View style={{ paddingHorizontal: 16, marginTop: 12, flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1, padding: 12, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#eee" }}>
              <Text style={{ fontSize: 12, color: "#777" }}>Price</Text>
              <Text style={{ fontSize: 16, fontWeight: "700", marginTop: 2 }}>
                {data.isFree ? "Free" : `${priceText}${data.pricingModel ? ` · ${data.pricingModel}` : ""}`}
              </Text>
            </View>
            <View style={{ flex: 1, padding: 12, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#eee" }}>
              <Text style={{ fontSize: 12, color: "#777" }}>Today</Text>
              <Text style={{ fontSize: 16, fontWeight: "700", marginTop: 2 }}>{todayHours}</Text>
            </View>
          </View>

          {/* Address + actions */}
          <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
            <View style={{ backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#eee", padding: 12 }}>
              <Text style={{ fontWeight: "700" }}>Address</Text>
              <Text style={{ marginTop: 4, color: "#555" }}>{data.addressLine}</Text>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                <Pressable
                  onPress={() => Linking.openURL(mapsLink(data.lat, data.lng, data.name))}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: "#111", alignItems: "center" }}
                >
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Directions</Text>
                </Pressable>

                <Pressable
                  onPress={() => data.phoneNumbers?.[0] && Linking.openURL(`tel:${data.phoneNumbers[0]}`)}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: "#111", alignItems: "center" }}
                >
                  <Text style={{ color: "#111", fontWeight: "700" }}>Call</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Amenities */}
          {!!data.amenities?.length && (
            <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
              <View style={{ backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#eee", padding: 12 }}>
                <Text style={{ fontWeight: "700", marginBottom: 8 }}>Amenities</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {data.amenities.map((code) => (
                    <Chip key={code} text={AMENITY_LABEL[code] ?? code} />
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Rules */}
          {!!data.rules?.length && (
            <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
              <View style={{ backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#eee", padding: 12 }}>
                <Text style={{ fontWeight: "700", marginBottom: 8 }}>Rules</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {data.rules.map((code) => (
                    <Chip key={code} text={RULE_LABEL[code] ?? code} />
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Opening hours list */}
          {!!data.openHours?.length && (
            <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
              <View style={{ backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#eee", padding: 12 }}>
                <Text style={{ fontWeight: "700", marginBottom: 8 }}>Opening Hours</Text>
                {([0,1,2,3,4,5,6] as DayOfWeek[]).map((d) => {
                  const rows = data.openHours!.filter((r) => r.dayOfWeek === d);
                  const text = rows.length
                    ? rows.map((r) => `${r.opensAt.slice(0,5)}–${r.closesAt.slice(0,5)}`).join(", ")
                    : "—";
                  return (
                    <View
                      key={d}
                      style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}
                    >
                      <Text style={{ color: "#555", width: 60 }}>{DAY_NAMES[d]}</Text>
                      <Text style={{ fontWeight: "600" }}>{text}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* About / description */}
          {data.description ? (
            <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
              <View style={{ backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#eee", padding: 12 }}>
                <Text style={{ fontWeight: "700", marginBottom: 6 }}>About</Text>
                <Text style={{ color: "#555", lineHeight: 20 }}>{data.description}</Text>
              </View>
            </View>
          ) : null}

          {/* Footer spacing */}
          <View style={{ height: 18 }} />
        </ScrollView>
      </View>
    </ScreenWrapper>

  );
}
