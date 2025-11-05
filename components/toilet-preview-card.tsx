import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ImageBackground,
} from "react-native";
import { Heart, MapPin, Users, BadgeCheck, Toilet as ToiletIcon, Star } from "lucide-react-native";
import type { ToiletWithRelations, ToiletOpenHour } from "@/utils/types"; // adjust path
import { colors as C, radius as R, spacing as S } from "@/utils/theme"; // or inline your palette

/* ---------- Fallback theme if you didn't add theme.ts yet ---------- */
const colors = C ?? {
  primary: "#007AFF",
  background: "#FFFFFF",
  surface: "#F7F7F8",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  danger: "#EF4444",
};
const spacing = S ?? { xs: 4, sm: 8, md: 16, lg: 24 };
const radius = R ?? { sm: 6, md: 12, lg: 20 };

/* ---------- Helpers ---------- */
function formatWilayaLabel(w?: ToiletWithRelations["wilaya"]) {
  if (!w) return "";
  return w.en || w.fr || w.ar || w.code || "";
}
function priceLabel(item: ToiletWithRelations) {
  if (item.isFree) return "Free";
  if (item.priceCents == null) return "—";
  const euros = (item.priceCents / 100).toFixed(2);
  const unit =
    item.pricingModel === "per-30-min" ? "/30m" :
    item.pricingModel === "per-60-min" ? "/60m" :
    item.pricingModel === "per-visit"  ? "/visit" : "";
  return `${euros}€${unit}`;
}
function getTodayOpenState(hours?: ToiletOpenHour[]) {
  if (!hours || hours.length === 0) return { label: "Hours unknown", open: undefined as boolean|undefined, today: null as null|ToiletOpenHour[] };
  const now = new Date();
  const dow = now.getDay() as 0|1|2|3|4|5|6;
  const today = hours.filter(h => h.dayOfWeek === dow).sort((a,b)=>a.sequence-b.sequence);
  if (today.length === 0) return { label: "Closed today", open: false, today: null };
  const curStr = now.toTimeString().slice(0,8);
  const isOpen = today.some(h => h.opensAt <= curStr && curStr < h.closesAt);
  const first = today[0], last = today[today.length-1];
  const label = isOpen
    ? `Open now • ${first.opensAt.slice(0,5)}–${last.closesAt.slice(0,5)}`
    : `Closed • ${first.opensAt.slice(0,5)}–${last.closesAt.slice(0,5)}`;
  return { label, open: isOpen, today };
}
function accessBadgeText(method: ToiletWithRelations["accessMethod"]) {
  switch (method) {
    case "public": return "Public";
    case "code":   return "Code";
    case "staff":  return "Ask staff";
    case "key":    return "Key";
    case "app":    return "Via app";
  }
}
/* ---------- Component ---------- */
export function ToiletPreviewCard({
  item,
  loading = false,
  onPress,
  onToggleFavorite,
}: {
  item?: ToiletWithRelations | null;
  loading?: boolean;
  onPress?: () => void;
  onToggleFavorite?: (next: boolean) => void;
}) {
  const data: ToiletWithRelations = useMemo(
    () => item ?? {
      id: 1,
      ownerId: null,
      toiletCategoryId: 1,
      name: "City Center Public WC",
      description: "Clean, accessible, near the tram stop.",
      phoneNumbers: null,
      lat: 36.7525,
      lng: 3.0419,
      addressLine: "Place Audin, Algiers",
      wilayaId: 16,
      placeHint: "Inside the underpass",
      accessMethod: "public",
      capacity: 4,
      isUnisex: true,
      amenities: ["paper","soap","wheelchair"],
      rules: ["no-smoking"],
      isFree: true,
      priceCents: null,
      pricingModel: null,
      status: "active",
      avgRating: 4.5,
      reviewsCount: 27,
      photosCount: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: { id:1, code:"public", icon:"🚻", en:"Public", fr:"Public", ar:"عمومي", createdAt:"", updatedAt:"" },
      wilaya: { id:16, code:"ALG", number:16, en:"Algiers", fr:"Alger", ar:"الجزائر", createdAt:"", updatedAt:"" },
      owner: null,
      photos: [{ id:1, toiletId:1, url:"https://picsum.photos/seed/wc/800/600", isCover:true, createdAt:"", updatedAt:"" }],
      openHours: [{ id:1, toiletId:1, dayOfWeek:(new Date().getDay() as any), opensAt:"08:00:00", closesAt:"22:00:00", sequence:1, createdAt:"", updatedAt:"" }],
      isFavorite: false,
    },
    [item]
  );

  const cover = data.photos?.find(p => p.isCover)?.url ?? data.photos?.[0]?.url;
  const openState = getTodayOpenState(data.openHours);
  const fav = !!data.isFavorite;

  return (
    <Pressable onPress={onPress} style={styles.card}>
      {/* COVER */}
      {cover ? (
        <ImageBackground source={{ uri: cover }} style={styles.cover} imageStyle={styles.coverImage}>
          <View style={styles.coverOverlay} />
          <View style={styles.coverBar}>
            <View style={[styles.pill, { backgroundColor: "rgba(17,24,39,0.7)", borderColor: "transparent" }]}>
              <Text style={[styles.pillText, { color: "#fff" }]} numberOfLines={1}>
                {data.category?.en || data.category?.fr || data.category?.ar || "Toilet"}
              </Text>
            </View>
            <Pressable
              onPress={() => onToggleFavorite?.(!fav)}
              hitSlop={12}
              style={[styles.pill, { backgroundColor: "rgba(17,24,39,0.7)", borderColor: "transparent" }]}
            >
              <Heart size={14} color={fav ? "#F43F5E" : "#fff"} fill={fav ? "#F43F5E" : "transparent"} />
              <Text style={[styles.pillText, { color: "#fff" }]}>{fav ? "Saved" : "Save"}</Text>
            </Pressable>
          </View>
        </ImageBackground>
      ) : (
        <View style={[styles.cover, styles.placeholder]}>
          <MapPin size={22} color={colors.muted} />
        </View>
      )}

      {/* CONTENT */}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{data.name}</Text>

        <View style={styles.row}>
          <MapPin size={14} color={colors.muted} />
          <Text style={styles.subtle} numberOfLines={1}>
            {data.addressLine}{data.wilaya ? `, ${formatWilayaLabel(data.wilaya)}` : ""}
          </Text>
        </View>

        <View style={[styles.row, { marginTop: spacing.xs, flexWrap: "wrap" }]}>
          <Badge text={accessBadgeText(data.accessMethod)!} />
          <Badge text={priceLabel(data)} />
          {data.isUnisex && <Badge text="Unisex" />}
          {!!data.capacity && <Badge icon={<Users size={12} color={colors.text} />} text={`x${data.capacity}`} />}
        </View>

        <View style={[styles.row, { marginTop: spacing.sm, justifyContent: "space-between" }]}>
          <View style={styles.row}>
            <StarRow rating={data.avgRating} />
            <Text style={[styles.subtle, { marginLeft: 6 }]}>{data.avgRating.toFixed(1)} ({data.reviewsCount})</Text>
          </View>
          <Text style={[styles.openLabel, { color: openState.open ? "#10B981" : colors.muted }]}>
            {openState.label}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

/* ---------- Small subcomponents ---------- */
function Badge({ text, icon }: { text: string; icon?: React.ReactNode }) {
  return (
    <View style={styles.pill}>
      {icon}
      {!!icon && <View style={{ width: 4 }} />}
      <Text style={styles.pillText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

function StarRow({ rating }: { rating: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <View style={styles.row}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={14}
          color={i < filled ? "#F59E0B" : colors.border}
          fill={i < filled ? "#F59E0B" : "transparent"}
        />
      ))}
    </View>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  card: { backgroundColor: colors.background, borderRadius: radius.lg, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  cover: { height: 140, width: "100%" },
  coverImage: { resizeMode: "cover" },
  placeholder: { backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  coverOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.15)" },
  coverBar: { position: "absolute", left: spacing.md, right: spacing.md, bottom: spacing.md, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  body: { padding: spacing.md },
  title: { fontSize: 16, fontWeight: "700", color: colors.text },
  row: { flexDirection: "row", alignItems: "center" },
  subtle: { color: colors.muted, fontSize: 13, marginLeft: 6, flexShrink: 1 },
  pill: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, paddingVertical: 4, paddingHorizontal: 8, borderRadius: radius.md, marginRight: 8, marginTop: 6 },
  pillText: { fontSize: 12, color: colors.text },
  openLabel: { fontSize: 12, fontWeight: "600" },
});
