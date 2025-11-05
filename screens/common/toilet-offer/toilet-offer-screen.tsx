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
import api from "@/utils/axios-instance";
import type {
  ToiletWithRelationsType,
  DayOfWeekType,
  AccessMethodType,
  PricingModelType,
} from "@/utils/types";
import { ScreenWrapper } from "@/components/screen-wrapper";
import { ArrowLeft } from "lucide-react-native";
import { mapsUrl, telUrl, useExternalOpener } from "@/context/external-opener";

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

  const fetchToilet = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<{ data: ToiletWithRelationsType }>(`/toilets/${toiletId}`, {
        params: {
          include:
            "relations,labels,coords,pricing,counts,meta", // your controller already maps these
        },
      });
      setData(res.data.data);
      setFav(res.data.data.is_favorite ?? false);
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
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading toilet…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Error: {error}</Text>
        <Pressable style={styles.retryBtn} onPress={fetchToilet}>
          <Text style={styles.retryTxt}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Not found.</Text>
      </View>
    );
  }

  return (
    <ScreenWrapper>
      <View style={{ position: 'relative' }}>
        <View style={{ position: 'absolute', top: 10, left: 10, zIndex: 99 }}>
          <TouchableOpacity
            style={{
              height: 40, width: 40,
              borderRadius: 100, backgroundColor: '#fff',
              justifyContent: 'center', alignItems: 'center'
            }}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.container}>
          {/* Cover */}
          <View style={{ position: "relative" }}>

            {coverUrl ? (
              <Image source={{ uri: coverUrl }} style={styles.cover} resizeMode="cover" />
            ) : (
              <View style={[styles.cover, styles.coverFallback]}>
                <Text style={styles.coverFallbackTxt}>No photo</Text>
              </View>
            )}

            {/* Rating badge */}
            {Number.isFinite(data.avg_rating) && (
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingTxt}>{Number(data.avg_rating).toFixed(1)} ★</Text>
              </View>
            )}

            {/* Favorite quick toggle (local) */}
            <Pressable
              style={styles.favBadge}
              onPress={() => {
                // TODO: wire to POST/DELETE /favorites
                setFav((v) => !(v ?? false));
              }}
              hitSlop={10}
            >
              <Text style={styles.favTxt}>{fav ? "♥" : "♡"}</Text>
            </Pressable>
          </View>

          {/* Title + meta */}
          <View style={styles.card}>
            <Text style={styles.title}>{data.name}</Text>

            {/* Address + wilaya */}
            <Text style={styles.sub}>
              {data.address_line}
              {data.wilaya?.en ? ` • ${data.wilaya.en}` : data.wilaya?.fr ? ` • ${data.wilaya.fr}` : ""}
            </Text>

            {/* Category / Access / Unisex / Capacity */}
            <Text style={styles.metaLine}>
              {categoryLabel ? `${categoryLabel} · ` : ""}
              {accessText} · {data.is_unisex ? "Unisex" : "Separate"}
              {" · "}
              Cap. {data.capacity ?? "—"}
            </Text>

            {/* Place hint */}
            {!!data.place_hint && <Text style={styles.hint}>Hint: {data.place_hint}</Text>}

            {/* Status row */}
            <View style={[styles.row, { alignItems: "center" }]}>
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
          <View style={[styles.card, { flexDirection: "row", gap: 12 }]}>
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
          <View style={styles.card}>
            <Text style={styles.h2}>Address</Text>
            <Text style={{ color: "#4B5563", marginTop: 4 }}>{data.address_line}</Text>

            {/* quick actions */}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <Pressable
                onPress={() => openExternal(mapsUrl(data.lat, data.lng, data.name), { label: "Opening Maps…" })}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnTxt}>Directions</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  const phone = data.phone_numbers?.[0];
                  if (!phone) return;
                  openExternal(telUrl(phone), { label: "Calling…" });
                }}
                style={styles.secondaryBtn}
              >
                <Text style={styles.secondaryBtnTxt}>Call</Text>
              </Pressable>

            </View>

            {/* phones list if more than 1 */}
            {Array.isArray(data.phone_numbers) && data.phone_numbers.length > 1 && (
              <View style={{ marginTop: 10 }}>
                {data.phone_numbers.map((ph, i) => (
                  <Pressable key={`${ph}-${i}`} onPress={() => Linking.openURL(`tel:${ph}`)} style={{ paddingVertical: 6 }}>
                    <Text style={{ color: "#111827" }}>• {ph}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Opening hours (weekly) */}
          {!!data.open_hours?.length && (
            <View style={styles.card}>
              <Text style={styles.h2}>Opening Hours</Text>
              {weekRows(data.open_hours).map(({ label, value }) => (
                <View key={label} style={styles.line}>
                  <Text style={styles.lineKey}>{label}</Text>
                  <Text style={styles.lineVal}>{value || "—"}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Amenities */}
          {!!data.amenities?.length && (
            <View style={styles.card}>
              <Text style={styles.h2}>Amenities</Text>
              <View style={styles.wrap}>
                {data.amenities.map((code, i) => (
                  <Chip key={`${code}-${i}`} text={AMENITY_LABEL[code] ?? pretty(code)} />
                ))}
              </View>
            </View>
          )}

          {/* Rules */}
          {!!data.rules?.length && (
            <View style={styles.card}>
              <Text style={styles.h2}>Rules</Text>
              <View style={styles.wrap}>
                {data.rules.map((code, i) => (
                  <Chip key={`${code}-${i}`} text={RULE_LABEL[code] ?? pretty(code)} />
                ))}
              </View>
            </View>
          )}

          {/* Host */}
          {data.owner && (
            <View style={styles.card}>
              <Text style={styles.h2}>Host</Text>
              <Text>{data.owner.name ?? `#${data.owner.id}`}</Text>
            </View>
          )}

          {/* Photos Gallery */}
          {Array.isArray(data.photos) && data.photos.length > 1 && (
            <View style={styles.card}>
              <Text style={styles.h2}>Photos</Text>
              <FlatList
                horizontal
                data={data.photos}
                keyExtractor={(p) => String(p.id ?? p.url)}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10 }}
                renderItem={({ item }) => <Image source={{ uri: item.url }} style={styles.gallery} />}
              />
            </View>
          )}

          {/* About */}
          {data.description ? (
            <View style={styles.card}>
              <Text style={styles.h2}>About</Text>
              <Text style={{ color: "#4B5563", lineHeight: 20 }}>{data.description}</Text>
            </View>
          ) : null}

          {/* Meta */}
          <View style={[styles.card, { paddingVertical: 10 }]}>
            <Text style={{ color: "#6B7280", fontSize: 12 }}>
              Created {fmtDate(data.created_at)} · Updated {fmtDate(data.updated_at)}
            </Text>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </View>

    </ScreenWrapper>

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
/**
 * Your DB uses 0..6 for Mon..Sun (per migration comment). JS Date.getDay() is Sun=0..Sat=6.
 * We support either thanks to a detection heuristic.
 */
function computeOpenState(
  items?: NonNullable<ToiletWithRelationsType["open_hours"]>
): null | {
  isOpen: boolean;
  opensAt?: string; // "09:00"
  closesAt?: string; // "22:00"
  todayText: string; // joined "09:00–22:00, ..."
} {
  if (!items || items.length === 0) return null;

  const now = new Date();
  const jsDaySun0 = now.getDay(); // 0..6 Sun..Sat
  const minutesNow = now.getHours() * 60 + now.getMinutes();

  // Detect whether incoming day_of_week is Mon=0 or Sun=0 by checking distribution
  // Heuristic: if we see rows with day_of_week===0 and also rows with ===6,
  // we still can't be sure. Instead: if there is ANY row for JS Sunday (Sun=0)
  // when mapping as Sun=0 -> OK; else try Mon=0 mapping.
  const todayRowsSun0 = items.filter((r) => r.day_of_week === (jsDaySun0 as DayOfWeekType));
  const useMon0 = todayRowsSun0.length === 0; // if empty, likely Mon=0 scheme

  const dayIndexToday = useMon0 ? ((jsDaySun0 + 6) % 7) : jsDaySun0; // map JS to Mon=0 when needed
  const labelToday = useMon0 ? DAY_NAMES_MON0[dayIndexToday] : DAY_NAMES_SUN0[dayIndexToday];

  const todays = items
    .filter((r) => r.day_of_week === (dayIndexToday as DayOfWeekType))
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

  const todayText = todays
    .map((r) => `${(r.opens_at ?? "").slice(0, 5)}–${(r.closes_at ?? "").slice(0, 5)}`)
    .join(", ");

  // Determine open now
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
    // Find the next opening interval today
    const nextToday = todays.find((r) => minutesNow < hhmmToMinutes(r.opens_at));
    if (nextToday) {
      opensAt = (nextToday.opens_at ?? "").slice(0, 5);
    } else {
      // Find the next open on upcoming days (within 7 days)
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

/** Weekly rows (UI order based on detected scheme) */
function weekRows(
  items: NonNullable<ToiletWithRelationsType["open_hours"]>
): { label: string; value: string }[] {
  if (!items.length) return [];
  // detect if dataset looks like Mon=0 by checking if any "0" exists but today's Sun rows (Sun=0) are empty
  // We'll just present Monday-first if most zeros appear attached to workweek shape; simpler: prefer Mon=0 (your migration).
  const useMon0 = true; // your migration states 0..6 (Mon..Sun)

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
    <View style={styles.badge}>
      <Text style={styles.badgeTxt}>{label}</Text>
    </View>
  );
}

function Chip({ text }: { text: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipTxt}>{text}</Text>
    </View>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoKey}>{label}</Text>
      <Text style={styles.infoVal} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/* -------------------------------- Styles -------------------------------- */

const styles = StyleSheet.create({
  container: { paddingBottom: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  muted: { color: "#6B7280", marginTop: 8 },
  error: { color: "#EF4444", marginBottom: 12, textAlign: "center" },
  retryBtn: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#111827", borderRadius: 8 },
  retryTxt: { color: "white", fontWeight: "600" },

  cover: { width: "100%", height: 220, backgroundColor: "#E5E7EB" },
  coverFallback: { alignItems: "center", justifyContent: "center" },
  coverFallbackTxt: { color: "#6B7280" },

  ratingBadge: {
    position: "absolute",
    right: 12,
    bottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#111827",
  },
  ratingTxt: { color: "#fff", fontWeight: "700" },

  favBadge: {
    position: "absolute",
    right: 10,
    top: 10,
    width: 40,
    height: 40,
    borderRadius: 100,
    backgroundColor: "#ffffffcc",
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#E5E7EB",
    borderWidth: 1,
  },
  favTxt: { fontSize: 26, color: "#EF4444" },

  card: {
    padding: 16,
    borderBottomColor: "#E5E7EB",
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: "#fff",
  },
  title: { fontSize: 22, fontWeight: "700", color: "#111827" },
  sub: { marginTop: 6, color: "#4B5563" },
  metaLine: { marginTop: 6, color: "#374151" },
  row: { marginTop: 10, flexDirection: "row", gap: 8, flexWrap: "wrap" },
  hint: { marginTop: 10, color: "#374151" },

  h2: { fontSize: 18, fontWeight: "700", marginBottom: 8, color: "#111827" },

  line: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  lineKey: { color: "#374151", width: 72, fontWeight: "600" },
  lineVal: { color: "#111827", flex: 1, textAlign: "right" },

  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  chip: { paddingHorizontal: 10, paddingVertical: 6, borderColor: "#E5E7EB", borderWidth: 1, borderRadius: 999 },
  chipTxt: { color: "#111827" },

  gallery: { width: 230, height: 140, borderRadius: 10, backgroundColor: "#E5E7EB" },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  thumb: { width: "31%", aspectRatio: 1, borderRadius: 8, backgroundColor: "#E5E7EB" },

  badge: { backgroundColor: "#F3F4F6", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  badgeTxt: { color: "#111827", fontWeight: "600" },

  infoBox: {
    flex: 1,
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  infoKey: { fontSize: 12, color: "#777" },
  infoVal: { fontSize: 16, fontWeight: "700", marginTop: 2 },

  primaryBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#111827",
    alignItems: "center",
  },
  primaryBtnTxt: { color: "#fff", fontWeight: "700" },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#111827",
    alignItems: "center",
  },
  secondaryBtnTxt: { color: "#111827", fontWeight: "700" },
});
