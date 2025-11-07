// app/screens/ToiletOfferScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import api from "@/utils/api/axios-instance";
import type {
  ToiletWithRelationsType,
  DayOfWeekType,
  AccessMethodType,
  PricingModelType,
} from "@/utils/types";
import { ScreenWrapper } from "@/components/screen-wrapper";
import { ArrowLeft } from "lucide-react-native";
import { mapsUrl, telUrl, useExternalOpener } from "@/context/external-opener";
import FavoriteToiletButton from "./favorite-toilet-button";
import { theme as T, S, R, withAlpha, shadow, pressableStyles } from "@/ui/theme";

/* ------------------------------ Label maps ------------------------------ */

const ACCESS_LABEL: Record<AccessMethodType, string> = {
  public: "Public",
  code: "Door code",
  staff: "Ask staff",
  key: "Key required",
  app: "App controlled",
};

const PRICING_LABEL: Record<Exclude<PricingModelType, null>, string> = {
  flat: "Flat",
  "per-visit": "Per visit",
  "per-30-min": "Per 30 min",
  "per-60-min": "Per 60 min",
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

const DAY_NAMES_SUN0 = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_MON0 = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* ------------------------------- Screen ------------------------------- */

export default function ToiletOfferScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { params } = useRoute<any>();
  const toiletId: number = params?.toiletId;
  const { openExternal } = useExternalOpener();

  const [data, setData] = useState<ToiletWithRelationsType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fav, setFav] = useState<boolean | null>(null); // local optimistic
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);

  const fetchToilet = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<{ data: ToiletWithRelationsType }>(`/toilets/${toiletId}`, {
        authIfAvailable: true,
        params: {
          include: "relations,labels,coords,pricing,counts,meta",
        },
      });
      setData(res.data.data);
      setFav(res.data.data.is_favorite ?? false);
      setSelectedPhone(res.data.data.phone_numbers?.[0] ?? null);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [toiletId]);

  useEffect(() => {
    fetchToilet();
  }, [fetchToilet]);

  useEffect(() => {
    if (data?.name) navigation.setOptions({ title: data.name });
  }, [data?.name, navigation]);

  useEffect(() => {
    if (Array.isArray(data?.phone_numbers) && data.phone_numbers.length > 0) {
      // keep current selection if still present; otherwise pick first
      setSelectedPhone((curr) =>
        // @ts-ignore
        curr && data?.phone_numbers?.includes(curr) ? curr : data?.phone_numbers[0]
      );
    } else {
      setSelectedPhone(null);
    }
  }, [data?.phone_numbers]);

  const coverUrl = useMemo(() => {
    if (data?.cover_photo?.url) return data.cover_photo.url;
    if (data?.photos?.length) {
      const cover = data.photos.find((p) => p.is_cover) ?? data.photos[0];
      return cover?.url ?? null;
    }
    return null;
  }, [data]);

  const openNowInfo = useMemo(() => computeOpenState(data?.open_hours), [data?.open_hours]);
  const categoryLabel = data?.category?.en || data?.category?.fr || data?.category?.ar || null;
  const priceText = data?.is_free ? "Free" : priceLabel(data?.price_cents ?? null, data?.pricing_model ?? null);
  const accessText = data?.access_method ? ACCESS_LABEL[data.access_method] ?? data.access_method : "—";

  /* ------------------------------ Rendering ------------------------------ */

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: T.bg.app }]}>
        <ActivityIndicator color={T.colors.primary} />
        <Text style={[styles.muted, { color: T.text.secondary }]}>Loading toilet…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: T.bg.app }]}>
        <Text style={[styles.error, { color: T.colors.error }]}>Error: {error}</Text>
        <Pressable
          style={({ pressed }) => [styles.retryBtn, pressableStyles(pressed), { backgroundColor: T.colors.primary, ...shadow(1) }]}
          android_ripple={{ color: withAlpha("#fff", 0.2) }}
          onPress={fetchToilet}
        >
          <Text style={[styles.retryTxt, { color: T.text.onPrimary }]}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.center, { backgroundColor: T.bg.app }]}>
        <Text style={[styles.muted, { color: T.text.secondary }]}>Not found.</Text>
      </View>
    );
  }

  return (
    <>
      <View style={{ position: "relative", backgroundColor: T.bg.app }}>
        {/* Floating back */}
        <View style={{ position: "absolute", top: 44, left: S.md, zIndex: 99 }}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={{
              height: 40,
              width: 40,
              borderRadius: 100,
              backgroundColor: T.bg.surface,
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 1,
              borderColor: T.border.subtle,
              ...shadow(1),
            }}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft color={T.text.strong as string} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={[styles.container]}>
          {/* Cover */}
          <View style={{ position: "relative" }}>
            {coverUrl ? (
              <Image source={{ uri: coverUrl }} style={[styles.cover, { backgroundColor: T.bg.surfaceAlt }]} resizeMode="cover" />
            ) : (
              <View style={[styles.cover, styles.coverFallback, { backgroundColor: T.bg.surfaceAlt }]}>
                <Text style={[styles.coverFallbackTxt, { color: T.text.secondary }]}>No photo</Text>
              </View>
            )}

            {/* Rating badge */}
            {Number.isFinite(data.avg_rating) && (
              <View
                style={[
                  styles.ratingBadge,
                  {
                    backgroundColor: withAlpha("#000", 0.7),
                    ...shadow(1),
                  },
                ]}
              >
                <Text style={[styles.ratingTxt, { color: "#fff" }]}>{Number(data.avg_rating).toFixed(1)} ★</Text>
              </View>
            )}

            {/* Favorite quick toggle */}
            <View
              style={[
                styles.favBadge,
                {
                  backgroundColor: withAlpha("#fff", 0.9),
                  borderColor: T.border.subtle,
                  ...shadow(1),
                },
              ]}
            >
              <FavoriteToiletButton toiletId={data.id} initial={data.is_favorite} />
            </View>
          </View>

          {/* Title + meta */}
          <View style={[styles.card, cardBase]}>
            <Text style={[styles.title, { color: T.text.default }]}>{data.name}</Text>

            {/* Address + wilaya */}
            <Text style={[styles.sub, { color: T.text.secondary }]}>
              {data.address_line}
              {data.wilaya?.en ? ` • ${data.wilaya.en}` : data.wilaya?.fr ? ` • ${data.wilaya.fr}` : ""}
            </Text>

            {/* Category / Access / Unisex / Capacity */}
            <Text style={[styles.metaLine, { color: T.text.strong }]}>
              {categoryLabel ? `${categoryLabel} · ` : ""}
              {accessText} · {data.is_unisex ? "Unisex" : "Separate"}
              {" · "}
              Cap. {data.capacity ?? "—"}
            </Text>

            {/* Place hint */}
            {!!data.place_hint && <Text style={[styles.hint, { color: T.text.strong }]}>Hint: {data.place_hint}</Text>}

            {/* Status row */}
            <View style={[styles.row]}>
              <Badge label={priceText} />
              {!!data.reviews_count && <Badge label={`${data.reviews_count} reviews`} />}
              {openNowInfo && (
                <Badge
                  label={
                    openNowInfo.isOpen
                      ? `Open now · closes ${openNowInfo.closesAt}`
                      : openNowInfo.opensAt
                        ? `Closed · opens ${openNowInfo.opensAt}`
                        : "Closed"
                  }
                />
              )}
            </View>
          </View>

          {/* Price & Today */}
          <View style={[styles.card, cardBase, { flexDirection: "row", gap: S.md }]}>
            <Box
              label="Price"
              value={
                data.is_free
                  ? "Free"
                  : data.pricing_model
                    ? `${priceText} · ${PRICING_LABEL[data.pricing_model] ?? data.pricing_model}`
                    : priceText
              }
            />
            <Box label="Today" value={openNowInfo?.todayText || "—"} />
          </View>

          {/* Address + actions */}
          <View style={[styles.card, cardBase]}>
            <Text style={[styles.h2, { color: T.text.default }]}>Address</Text>
            <Text style={{ color: T.text.secondary, marginTop: 4 }}>{data.address_line}</Text>

            {/* quick actions */}
            <View style={{ flexDirection: "row", gap: S.sm, marginTop: S.sm }}>
              <Pressable
                onPress={() => openExternal(mapsUrl(data.lat, data.lng, data.name), { label: "Opening Maps…" })}
                android_ripple={{ color: withAlpha("#fff", 0.2) }}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  {
                    backgroundColor: T.colors.primary,
                    ...shadow(1),
                  },
                  pressableStyles(pressed),
                ]}
              >
                <Text style={[styles.primaryBtnTxt, { color: T.text.onPrimary }]}>Directions</Text>
              </Pressable>

              <Pressable
                disabled={!selectedPhone}
                onPress={() => {
                  if (!selectedPhone) return;
                  openExternal(telUrl(selectedPhone), { label: "Calling…" });
                }}
                android_ripple={{ color: T.state.ripple }}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  {
                    borderColor: T.border.subtle,
                    backgroundColor: T.bg.surface,
                    opacity: selectedPhone ? 1 : 0.5,
                  },
                  pressableStyles(pressed),
                ]}
              >
                <Text style={[styles.secondaryBtnTxt, { color: T.text.strong }]}>
                  {selectedPhone ? "Call" : "No phone"}
                </Text>
              </Pressable>
            </View>

            {/* phones list if more than 1 */}
            {Array.isArray(data.phone_numbers) && data.phone_numbers.length > 0 && (
              <View style={{ marginTop: S.md, gap: 8 }}>
                <Text style={{ color: T.text.tertiary, fontSize: 12, marginBottom: 2 }}>
                  Choose a number to call
                </Text>
                {data.phone_numbers.map((ph, i) => (
                  <RadioRow
                    key={`${ph}-${i}`}
                    label={ph}
                    selected={selectedPhone === ph}
                    onPress={() => setSelectedPhone(ph)}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Opening hours (weekly) */}
          {!!data.open_hours?.length && (
            <View style={[styles.card, cardBase]}>
              <Text style={[styles.h2, { color: T.text.default }]}>Opening Hours</Text>
              {weekRows(data.open_hours).map(({ label, value }) => (
                <View key={label} style={styles.line}>
                  <Text style={[styles.lineKey, { color: T.text.strong }]}>{label}</Text>
                  <Text style={[styles.lineVal, { color: T.text.default }]}>{value || "—"}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Amenities */}
          {!!data.amenities?.length && (
            <View style={[styles.card, cardBase]}>
              <Text style={[styles.h2, { color: T.text.default }]}>Amenities</Text>
              <View style={[styles.wrap, { gap: S.sm }]}>
                {data.amenities.map((code, i) => (
                  <Chip key={`${code}-${i}`} text={AMENITY_LABEL[code] ?? pretty(code)} />
                ))}
              </View>
            </View>
          )}

          {/* Rules */}
          {!!data.rules?.length && (
            <View style={[styles.card, cardBase]}>
              <Text style={[styles.h2, { color: T.text.default }]}>Rules</Text>
              <View style={[styles.wrap, { gap: S.sm }]}>
                {data.rules.map((code, i) => (
                  <Chip key={`${code}-${i}`} text={RULE_LABEL[code] ?? pretty(code)} />
                ))}
              </View>
            </View>
          )}

          {/* Host */}
          {data.owner && (
            <View style={[styles.card, cardBase]}>
              <Text style={[styles.h2, { color: T.text.default }]}>Host</Text>
              <Text style={{ color: T.text.strong }}>{data.owner.name ?? `#${data.owner.id}`}</Text>
            </View>
          )}

          {/* Photos Gallery */}
          {Array.isArray(data.photos) && data.photos.length > 1 && (
            <View style={[styles.card, cardBase]}>
              <Text style={[styles.h2, { color: T.text.default }]}>Photos</Text>
              <FlatList
                horizontal
                data={data.photos}
                keyExtractor={(p) => String(p.id ?? p.url)}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: S.sm }}
                renderItem={({ item }) => (
                  <Image source={{ uri: item.url }} style={[styles.gallery, { borderRadius: R.lg, backgroundColor: T.bg.surfaceAlt }]} />
                )}
              />
            </View>
          )}

          {/* About */}
          {data.description ? (
            <View style={[styles.card, cardBase]}>
              <Text style={[styles.h2, { color: T.text.default }]}>About</Text>
              <Text style={{ color: T.text.secondary, lineHeight: 20 }}>{data.description}</Text>
            </View>
          ) : null}

          {/* Meta */}
          <View style={[styles.card, cardBase, { paddingVertical: 10 }]}>
            <Text style={{ color: T.text.tertiary, fontSize: 12 }}>
              Created {fmtDate(data.created_at)} · Updated {fmtDate(data.updated_at)}
            </Text>
          </View>

          <View style={{ height: S.lg }} />
        </ScrollView>
      </View>
    </>
  );
}

/* ------------------------------- Helpers ------------------------------- */

function priceLabel(cents: number | null, model: PricingModelType | null) {
  if (cents == null) return "Paid";
  const base = `${Math.round(cents).toFixed(0)} DZD`;
  if (!model || model === "flat") return base;
  const unit =
    model === "per-30-min" ? "/30m" : model === "per-60-min" ? "/60m" : model === "per-visit" ? "/visit" : "";
  return `${base} ${unit}`;
}

function pretty(s: string) {
  return s.replace(/[_-]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function mapsLink(lat: number, lng: number, label?: string) {
  const q = encodeURIComponent(label ?? `${lat},${lng}`);
  if (Platform.OS === "ios") return `http://maps.apple.com/?ll=${lat},${lng}&q=${q}`;
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${q}`;
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString();
  } catch {
    return String(iso);
  }
}

/* --------------------------- Hours & status --------------------------- */
function computeOpenState(
  items?: NonNullable<ToiletWithRelationsType["open_hours"]>
): null | {
  isOpen: boolean;
  opensAt?: string;
  closesAt?: string;
  todayText: string;
} {
  if (!items || items.length === 0) return null;

  const now = new Date();
  const jsDaySun0 = now.getDay(); // 0..6 Sun..Sat
  const minutesNow = now.getHours() * 60 + now.getMinutes();

  const todayRowsSun0 = items.filter((r) => r.day_of_week === (jsDaySun0 as DayOfWeekType));
  const useMon0 = todayRowsSun0.length === 0;

  const dayIndexToday = useMon0 ? ((jsDaySun0 + 6) % 7) : jsDaySun0;
  const labelToday = useMon0 ? DAY_NAMES_MON0[dayIndexToday] : DAY_NAMES_SUN0[dayIndexToday];

  const todays = items
    .filter((r) => r.day_of_week === (dayIndexToday as DayOfWeekType))
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

  const todayText = todays.map((r) => `${(r.opens_at ?? "").slice(0, 5)}–${(r.closes_at ?? "").slice(0, 5)}`).join(", ");

  let isOpen = false;
  let closesAt: string | undefined;
  let opensAt: string | undefined;

  for (const r of todays) {
    const openM = hhmmToMinutes(r.opens_at);
    const closeM = hhmmToMinutes(r.closes_at);
    if (minutesNow >= openM && minutesNow < closeM) {
      isOpen = true;
      closesAt = (r.closes_at ?? "").slice(0, 5);
      break;
    }
  }

  if (!isOpen) {
    const nextToday = todays.find((r) => minutesNow < hhmmToMinutes(r.opens_at));
    if (nextToday) {
      opensAt = (nextToday.opens_at ?? "").slice(0, 5);
    } else {
      for (let offset = 1; offset <= 7; offset++) {
        const target = (dayIndexToday + offset) % 7;
        const rows = items
          .filter((r) => r.day_of_week === (target as DayOfWeekType))
          .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
        if (rows.length) {
          opensAt = `${(rows[0].opens_at ?? "").slice(0, 5)} (${useMon0 ? DAY_NAMES_MON0[target] : DAY_NAMES_SUN0[target]})`;
          break;
        }
      }
    }
  }

  return { isOpen, opensAt, closesAt, todayText: todayText || "—" };
}

function hhmmToMinutes(hhmmss?: string | null): number {
  if (!hhmmss) return 0;
  const [hh, mm] = hhmmss.split(":");
  const h = parseInt(hh, 10) || 0;
  const m = parseInt(mm, 10) || 0;
  return h * 60 + m;
}

function weekRows(
  items: NonNullable<ToiletWithRelationsType["open_hours"]>
): { label: string; value: string }[] {
  if (!items.length) return [];
  const useMon0 = true;
  const order = useMon0 ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4, 5, 6];
  const labels = useMon0 ? DAY_NAMES_MON0 : DAY_NAMES_SUN0;

  return order.map((d) => {
    const rows = items
      .filter((r) => r.day_of_week === (d as DayOfWeekType))
      .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

    const value = rows.length
      ? rows.map((r) => `${(r.opens_at ?? "").slice(0, 5)}–${(r.closes_at ?? "").slice(0, 5)}`).join(", ")
      : "";

    return { label: labels[d], value };
  });
}

/* ------------------------------- UI atoms ------------------------------- */

function Badge({ label }: { label: string }) {
  return (
    <View
      style={{
        backgroundColor: withAlpha(T.colors.primary, 0.08),
        borderRadius: R.pill,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: T.border.subtle,
      }}
    >
      <Text style={{ color: T.colors.primary, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

function Chip({ text }: { text: string }) {
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderColor: T.border.subtle,
        borderWidth: 1,
        borderRadius: R.pill,
        backgroundColor: T.bg.surface,
      }}
    >
      <Text style={{ color: T.text.strong }}>{text}</Text>
    </View>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        padding: 12,
        backgroundColor: T.bg.surface,
        borderRadius: R.lg,
        borderWidth: 1,
        borderColor: T.border.subtle,
        ...shadow(0),
      }}
    >
      <Text style={{ fontSize: 12, color: T.text.tertiary }}>{label}</Text>
      <Text style={{ fontSize: 16, fontWeight: "700", marginTop: 2, color: T.text.default }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function RadioRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: withAlpha("#000", 0.06) }}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          paddingVertical: 10,
          paddingHorizontal: 10,
          borderRadius: R.lg,
          borderWidth: 1,
          borderColor: T.border.subtle,
          backgroundColor: T.bg.surface,
        },
        pressed ? { opacity: 0.96 } : null,
      ]}
    >
      <Text style={{ color: T.text.default, fontWeight: "600" }}>{label}</Text>
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 999,
          borderWidth: 2,
          borderColor: selected ? T.colors.primary : T.border.subtle,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: T.bg.surface,
        }}
      >
        {selected ? (
          <View
            style={{
              width: 9,
              height: 9,
              borderRadius: 999,
              backgroundColor: T.colors.primary,
            }}
          />
        ) : null}
      </View>
    </Pressable>
  );
}


/* -------------------------------- Styles -------------------------------- */

const cardBase = {
  backgroundColor: T.bg.surface,
  borderBottomWidth: 0,
  borderWidth: 1,
  borderColor: T.border.subtle,
  borderRadius: R.xl,
  marginTop: S.lg,
  ...shadow(1),
} as const;

const styles = StyleSheet.create({
  container: { paddingBottom: S.lg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: S["xxl"] },
  muted: { marginTop: 8 },
  error: { marginBottom: 12, textAlign: "center" },
  retryBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: R.lg },
  retryTxt: { fontWeight: "700" },

  cover: { width: "100%", height: 340 },
  coverFallback: { alignItems: "center", justifyContent: "center" },
  coverFallbackTxt: {},

  ratingBadge: {
    position: "absolute",
    right: 12,
    bottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: R.pill,
  },
  ratingTxt: { fontWeight: "800" },

  favBadge: {
    position: "absolute",
    right: S.md,
    top: 44,
    width: 40,
    height: 40,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  card: {
    padding: S.lg,
    marginHorizontal: S.md,
  },
  title: { fontSize: 22, fontWeight: "800" },
  sub: { marginTop: 6 },
  metaLine: { marginTop: 6 },
  row: { marginTop: 10, flexDirection: "row", gap: S.sm, flexWrap: "wrap" },
  hint: { marginTop: 10 },

  h2: { fontSize: 18, fontWeight: "800", marginBottom: 8 },

  line: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  lineKey: { width: 72, fontWeight: "700" },
  lineVal: { flex: 1, textAlign: "right" },

  wrap: { flexDirection: "row", flexWrap: "wrap" },

  gallery: { width: 230, height: 140 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: S.sm },
  thumb: { width: "31%", aspectRatio: 1, borderRadius: R.md, backgroundColor: T.bg.surfaceAlt },

  primaryBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: R.lg,
    alignItems: "center",
  },
  primaryBtnTxt: { fontWeight: "800" },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: R.lg,
    borderWidth: 1,
    alignItems: "center",
  },
  secondaryBtnTxt: { fontWeight: "800" },
});
