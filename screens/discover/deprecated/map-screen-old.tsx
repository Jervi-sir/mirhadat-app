// screens/MapScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from "react-native";
import MapView, { Marker, Region, PROVIDER_GOOGLE } from "react-native-maps";
import ActionSheet, { ActionSheetRef } from "react-native-actions-sheet";
import api, { apiPublic } from "../../../utils/axios-instance";
import { useAuthStore } from "../../../zustand/authStore";
import { ApiRoutes, buildRoute } from "../../../utils/api";
import { ScreenWrapper } from "../../../components/screen-wrapper";

// ---------------- utils ----------------
function debounce<T extends (...args: any[]) => void>(fn: T, delay = 450) {
  let t: any;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function sortedUniqueById<T extends { id: number }>(arr: T[]) {
  const seen = new Set<number>();
  // stable order for markers
  arr.sort((a, b) => a.id - b.id);
  const out: T[] = [];
  for (const it of arr) {
    if (!seen.has(it.id)) {
      seen.add(it.id);
      out.push(it);
    }
  }
  return out;
}

// ---------------- types ----------------
type Toilet = {
  id: number;
  owner_id: number | null;
  toilet_category_id: number;
  name: string;
  description?: string | null;
  phone_numbers: string[];
  lat: number;
  lng: number;
  address_line: string;
  wilaya_id: number;
  place_hint?: string | null;
  access_method: "public" | "code" | "staff" | "key" | "app";
  capacity: number;
  is_unisex: boolean;
  amenities: string[];
  rules: string[];
  is_free: boolean;
  price_cents: number | null;
  pricing_model: "flat" | "per-visit" | "per-30-min" | "per-60-min" | null;
  status: "pending" | "active" | "suspended";
  avg_rating: number;
  reviews_count: number;
  photos_count: number;
  created_at?: string;
  updated_at?: string;
};

// Quick colors (swap with real categories later)
const categoryColors: Record<number, string> = {
  1: "#1e88e5",
  2: "#43a047",
  3: "#fb8c00",
  4: "#8e24aa",
  5: "#e53935",
};

export default function MapScreen({
  onOpenToiletDetails,
}: {
  onOpenToiletDetails?: (toiletId: number) => void;
}) {
  const auth = useAuthStore();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [toilets, setToilets] = useState<Toilet[]>([]);
  const [region, setRegion] = useState<Region>({
    latitude: 36.7538, // Algiers default
    longitude: 3.0588,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
  });

  // Filters
  const [isFree, setIsFree] = useState<null | boolean>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(5); // used only if backend falls back to center+radius

  // Selection
  const [selected, setSelected] = useState<Toilet | null>(null);

  // Action sheets
  const filterSheetRef = useRef<ActionSheetRef>(null);
  const infoSheetRef = useRef<ActionSheetRef>(null);

  // last fetched region snapshot (to avoid spam)
  const lastFetchRef = useRef<{ lat: number; lng: number; latDelta: number; lngDelta: number } | null>(null);

  // ---- location boot ----
  useEffect(() => {
    const getLocation = () => {
      if (!navigator?.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords as any;
          setRegion((r) => ({ ...r, latitude, longitude }));
        },
        () => {}, // ignore
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
      );
    };
    getLocation();
  }, []);

  // ---- helpers ----
  const hasMovedEnough = useCallback((r: Region) => {
    const last = lastFetchRef.current;
    if (!last) return true;

    const dist = distanceMeters({ lat: r.latitude, lng: r.longitude }, { lat: last.lat, lng: last.lng });
    const zoomChanged =
      Math.abs(r.latitudeDelta - last.latDelta) / Math.max(0.000001, last.latDelta) > 0.25 ||
      Math.abs(r.longitudeDelta - last.lngDelta) / Math.max(0.000001, last.lngDelta) > 0.25;

    return dist > 300 || zoomChanged; // 300m or significant zoom change
  }, []);

  const regionToBBox = (r: Region) => {
    const minLat = r.latitude - r.latitudeDelta / 2;
    const maxLat = r.latitude + r.latitudeDelta / 2;
    const minLng = r.longitude - r.longitudeDelta / 2;
    const maxLng = r.longitude + r.longitudeDelta / 2;
    return { minLat, maxLat, minLng, maxLng };
  };

  // ---- fetch ----
  const fetchToilets = useCallback(async () => {
    const { minLat, maxLat, minLng, maxLng } = regionToBBox(region);

    const params: any = {
      status: "active",
      // Preferred: bbox for map viewport
      min_lat: Number(minLat.toFixed(6)),
      max_lat: Number(maxLat.toFixed(6)),
      min_lng: Number(minLng.toFixed(6)),
      max_lng: Number(maxLng.toFixed(6)),

      // Fallback on backend to center+radius if bbox not supplied/handled
      lat: region.latitude,
      lng: region.longitude,
      radius_km: radiusKm,

      perPage: 300, // big page for maps; server caps to 500
      sort: "reviews_count",
      order: "desc",
    };

    if (search.trim()) params.q = search.trim();
    if (isFree !== null) params.is_free = isFree ? "true" : "false";
    if (categoryId) params.toilet_category_id = String(categoryId);

    try {
      setLoading(true);
      const res = await apiPublic.get(buildRoute(ApiRoutes.toilets.index), {
        params,
        headers: { "X-Requires-Auth": false },
      });

      const items = Array.isArray(res.data?.data) ? (res.data.data as Toilet[]) : [];
      setToilets(sortedUniqueById(items));

      lastFetchRef.current = {
        lat: region.latitude,
        lng: region.longitude,
        latDelta: region.latitudeDelta,
        lngDelta: region.longitudeDelta,
      };
    } catch (e: any) {
      const msg = e?.response?.data?.message || e.message || "Failed to load toilets";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  }, [region, search, isFree, categoryId, radiusKm]);

  // Debounced + thresholded fetch on region changes
  const debouncedFetch = useMemo(
    () =>
      debounce((r: Region) => {
        if (hasMovedEnough(r)) fetchToilets();
      }, 500),
    [fetchToilets, hasMovedEnough]
  );

  useEffect(() => {
    // initial kick
    fetchToilets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRegionChangeComplete = (r: Region) => {
    setRegion(r);
    debouncedFetch(r);
  };

  // ---- marker & UI actions ----
  const onPressMarker = (toilet: Toilet) => {
    setSelected(toilet);
    infoSheetRef.current?.show();
  };

  const goToMyLocation = () => {
    if (!navigator?.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords as any;
        setRegion({
          latitude,
          longitude,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        });
      },
      () => Alert.alert("Location", "Unable to get your location"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
    );
  };

  const onToggleFavorite = async (toilet: Toilet) => {
    if (!auth.token) {
      Alert.alert("Login required", "Please log in to use favorites.");
      return;
    }
    try {
      await api.post(buildRoute(ApiRoutes.toilets.favorite, { toilet: toilet.id }));
      Alert.alert("Favorites", "Added to favorites");
    } catch {
      try {
        await api.delete(buildRoute(ApiRoutes.toilets.favorite, { toilet: toilet.id }));
        Alert.alert("Favorites", "Removed from favorites");
      } catch (err: any) {
        const msg = err?.response?.data?.message || err.message || "Favorite action failed";
        Alert.alert("Error", msg);
      }
    }
  };

  const openInMaps = (toilet: Toilet) => {
    const url =
      Platform.select({
        ios: `http://maps.apple.com/?ll=${toilet.lat},${toilet.lng}&q=${encodeURIComponent(toilet.name)}`,
        android: `geo:${toilet.lat},${toilet.lng}?q=${encodeURIComponent(toilet.name)}`,
      }) || `https://www.google.com/maps/search/?api=1&query=${toilet.lat},${toilet.lng}`;
    Linking.openURL(url);
  };

  const markerColor = (t: Toilet) => {
    if (t.is_free) return "#10b981";
    return categoryColors[t.toilet_category_id] || "#2563eb";
  };

  // ---------------- render ----------------
  return (
    <ScreenWrapper>
      <View style={{ flex: 1 }}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          initialRegion={region}
          onRegionChangeComplete={onRegionChangeComplete}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {toilets.map((t) => (
            <Marker
              key={t.id}
              coordinate={{ latitude: t.lat, longitude: t.lng }}
              onPress={() => onPressMarker(t)}
              tracksViewChanges={false} // keeps markers from re-rendering/flickering
            >
              <View
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: markerColor(t),
                  borderWidth: 2,
                  borderColor: "#fff",
                }}
              />
            </Marker>
          ))}
        </MapView>

        {/* Top search box */}
        <View
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            right: 16,
            backgroundColor: "#fff",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            shadowColor: "#000",
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 4,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <TextInput
            placeholder="Search places…"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={fetchToilets}
            style={{ flex: 1, padding: 0 }}
          />
          {loading ? (
            <ActivityIndicator />
          ) : (
            <Pressable
              onPress={fetchToilets}
              style={{
                backgroundColor: "#111",
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>Search</Text>
            </Pressable>
          )}
        </View>

        {/* Floating buttons */}
        <View
          style={{
            position: "absolute",
            right: 16,
            bottom: 24,
            gap: 10,
            alignItems: "flex-end",
          }}
        >
          <Pressable
            onPress={() => filterSheetRef.current?.show()}
            style={{
              backgroundColor: "#fff",
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderRadius: 12,
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 6,
              elevation: 3,
            }}
          >
            <Text style={{ fontWeight: "700" }}>Filters</Text>
          </Pressable>

          <Pressable
            onPress={goToMyLocation}
            style={{
              backgroundColor: "#fff",
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderRadius: 12,
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 6,
              elevation: 3,
            }}
          >
            <Text style={{ fontWeight: "700" }}>My location</Text>
          </Pressable>
        </View>

        {/* Filter Sheet */}
        <ActionSheet
          ref={filterSheetRef}
          gestureEnabled
          closeOnTouchBackdrop
          drawUnderStatusBar
          defaultOverlayOpacity={0.3}
          containerStyle={{ height: "69%", borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
          indicatorStyle={{ width: 60, height: 5, borderRadius: 3, backgroundColor: "#111" }}
        >
          <View style={{ padding: 16, gap: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: "800" }}>Filter & sort</Text>

            {/* Free / Paid */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Choice
                active={isFree === null}
                onPress={() => setIsFree(null)}
                label="Any"
                activeBg="#111"
                inactiveBg="#eee"
                activeFg="#fff"
                inactiveFg="#111"
              />
              <Choice
                active={isFree === true}
                onPress={() => setIsFree(true)}
                label="Free"
                activeBg="#10b981"
                inactiveBg="#eee"
                activeFg="#fff"
                inactiveFg="#111"
              />
              <Choice
                active={isFree === false}
                onPress={() => setIsFree(false)}
                label="Paid"
                activeBg="#ef4444"
                inactiveBg="#eee"
                activeFg="#fff"
                inactiveFg="#111"
              />
            </View>

            {/* Category quick choices (replace with API-driven pills later) */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontWeight: "700" }}>Category</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {[null, 1, 2, 3, 4, 5].map((id) => (
                  <Pressable
                    key={String(id ?? "any")}
                    onPress={() => setCategoryId(id as any)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor: categoryId === id ? "#111" : "#eee",
                    }}
                  >
                    <Text style={{ color: categoryId === id ? "#fff" : "#111" }}>
                      {id === null ? "Any" : `Cat ${id}`}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Radius (kept for fallback) */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontWeight: "700" }}>Radius</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[1, 2, 5, 10, 20].map((km) => (
                  <Pressable
                    key={km}
                    onPress={() => setRadiusKm(km)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor: radiusKm === km ? "#111" : "#eee",
                    }}
                  >
                    <Text style={{ color: radiusKm === km ? "#fff" : "#111" }}>{km} km</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={{ height: 8 }} />
            <Pressable
              onPress={() => {
                filterSheetRef.current?.hide();
                fetchToilets();
              }}
              style={{
                backgroundColor: "#111",
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "800" }}>Apply</Text>
            </Pressable>
          </View>
        </ActionSheet>

        {/* Info Sheet (toilet card) */}
        <ActionSheet
          ref={infoSheetRef}
          gestureEnabled
          closeOnTouchBackdrop
          drawUnderStatusBar
          defaultOverlayOpacity={0.3}
          containerStyle={{ height: "69%", borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
          indicatorStyle={{ width: 60, height: 5, borderRadius: 3, backgroundColor: "#111" }}
        >
          {!!selected && (
            <View style={{ padding: 16, gap: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: "800" }}>{selected.name}</Text>
              <Text style={{ color: "#555" }}>{selected.address_line}</Text>
              {!!selected.place_hint && <Text style={{ color: "#777" }}>{selected.place_hint}</Text>}

              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                <Badge label={selected.is_free ? "Free" : "Paid"} color={selected.is_free ? "#10b981" : "#ef4444"} />
                <Badge label={selected.access_method} />
                <Badge label={selected.is_unisex ? "Unisex" : "Separated"} />
                <Badge label={`${selected.capacity} seat${selected.capacity > 1 ? "s" : ""}`} />
                <Badge label={`★ ${selected.avg_rating.toFixed(1)} (${selected.reviews_count})`} />
              </View>

              {!!selected.amenities?.length && (
                <View style={{ marginTop: 6 }}>
                  <Text style={{ fontWeight: "700", marginBottom: 4 }}>Amenities</Text>
                  <Text style={{ color: "#555" }}>{selected.amenities.join(" • ")}</Text>
                </View>
              )}

              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <Button text="Favorite" onPress={() => onToggleFavorite(selected)} />
                <Button text="Navigate" onPress={() => openInMaps(selected)} />
                {onOpenToiletDetails && (
                  <Button
                    text="Details"
                    onPress={() => {
                      infoSheetRef.current?.hide();
                      onOpenToiletDetails?.(selected.id);
                    }}
                  />
                )}
              </View>
            </View>
          )}
        </ActionSheet>
      </View>
    </ScreenWrapper>
  );
}

// ------------- small UI helpers -------------
function Badge({ label, color = "#111" }: { label: string; color?: string }) {
  const bg = color === "#111" ? "#eee" : color + "22";
  const fg = color === "#111" ? "#111" : color;
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: bg }}>
      <Text style={{ color: fg, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

function Button({ text, onPress }: { text: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ backgroundColor: "#111", paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10 }}
    >
      <Text style={{ color: "#fff", fontWeight: "700" }}>{text}</Text>
    </Pressable>
  );
}

function Choice({
  active,
  onPress,
  label,
  activeBg,
  inactiveBg,
  activeFg = "#fff",
  inactiveFg = "#111",
}: {
  active: boolean;
  onPress: () => void;
  label: string;
  activeBg: string;
  inactiveBg: string;
  activeFg?: string;
  inactiveFg?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: active ? activeBg : inactiveBg,
      }}
    >
      <Text style={{ color: active ? activeFg : inactiveFg }}>{label}</Text>
    </Pressable>
  );
}
