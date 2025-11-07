// ToiletMapScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, Platform, Pressable, Text, View } from "react-native";
import MapView, { Circle, Marker, Region } from "react-native-maps";
import { ScreenWrapper } from "@/components/screen-wrapper";
import WilayaPicker from "@/components/filters/wilaya-picker";
import { FilterSheet } from "@/components/filters/filter-sheet";
import { Routes } from "@/utils/variables/routes";
import { useNavigation } from "@react-navigation/native";
import { useDiscoverMapStore } from "@/zustand/discover-map-store";
import type { WilayaType, ToiletMarkerType } from "@/utils/types";
import { DEFAULT_CENTER, kmToLatDelta, kmToLngDelta, makeRegion } from "@/utils/geo";
import { ArrowLeft } from "lucide-react-native";
import { NearbyToiletsSheet, NearbyToiletsSheetRef } from "./nearby-toilets-action-sheet";
import { theme as T, S, R, withAlpha, shadow, pressableStyles } from "@/ui/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const zoomForLongitudeDelta = (lonDelta: number) => {
  const delta = clamp(lonDelta, 0.0005, 360);
  const tiles = SCREEN_WIDTH / 256;
  const z = Math.log2((360 * tiles) / delta);
  return clamp(Math.round(z), 2, 18);
};
const QUERY_DEBOUNCE_MS = 350;

export default function DiscoverMapScreen() {
  const navigation: any = useNavigation();
  const mapRef = useRef<MapView>(null);
  const filterRef = useRef<any>(null);
  const nearbySheetRef = useRef<NearbyToiletsSheetRef>(null);

  const {
    selectedWilaya, setSelectedWilaya,
    filters, setFilters,
    center, setCenter,
    items, loading,
    fetchFirst, fetchFirstDebounced,
  } = useDiscoverMapStore();

  const initialRegionRef = useRef<Region>(makeRegion(DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude, 50));
  const [region, setRegion] = useState<Region>(initialRegionRef.current);

  // animation guards
  const isAnimatingRef = useRef(false);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // derive radius
  const rawRadiusKm = selectedWilaya?.default_radius_km ?? center?.radius_km ?? 50;
  const safeRadiusKm = Number.isFinite(rawRadiusKm as number) && (rawRadiusKm as number) > 0 ? (rawRadiusKm as number) : 50;

  // keep store center in sync
  useEffect(() => {
    if (isAnimatingRef.current) return;
    if ([region.latitude, region.longitude, safeRadiusKm].every(Number.isFinite)) {
      setCenter({ lat: region.latitude, lng: region.longitude, radius_km: safeRadiusKm });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region.latitude, region.longitude, safeRadiusKm]);

  // debounce markers fetch
  const filtersKey = useMemo(() => {
    try { return JSON.stringify(filters); } catch { return ""; }
  }, [filters]);

  const centerKey = useMemo(() => {
    const lat = center?.lat ?? region.latitude;
    const lng = center?.lng ?? region.longitude;
    const r = center?.radius_km ?? safeRadiusKm;
    if (![lat, lng, r].every(Number.isFinite)) return "NaN";
    return `${lat.toFixed(5)}|${lng.toFixed(5)}|${r}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.lat, center?.lng, center?.radius_km, region.latitude, region.longitude, safeRadiusKm]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (fetchFirstDebounced) fetchFirstDebounced().catch(() => {});
      else if (fetchFirst) fetchFirst().catch(() => {});
    }, QUERY_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [fetchFirstDebounced, fetchFirst, selectedWilaya?.id, filtersKey, centerKey]);

  const onWilayaChange = useCallback((w?: WilayaType) => {
    setSelectedWilaya(w);
    animateToWilaya(w || undefined);
  }, [setSelectedWilaya]);

  function regionFromWilaya(w: WilayaType): Region | null {
    const cLat = Number(w.center_lat);
    const cLng = Number(w.center_lng);
    if (Number.isFinite(cLat) && Number.isFinite(cLng)) {
      const r = Number.isFinite(Number(w.default_radius_km)) ? Number(w.default_radius_km) : 30;
      const latDelta = clamp(kmToLatDelta(r * 2), 0.002, 40);
      const lngDelta = clamp(kmToLngDelta(r * 2, cLat), 0.002, 40);
      return {
        latitude: clamp(cLat, -85, 85),
        longitude: clamp(cLng, -179.999, 179.999),
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      };
    }
    const minLat = Number(w.min_lat), maxLat = Number(w.max_lat);
    const minLng = Number(w.min_lng), maxLng = Number(w.max_lng);
    if ([minLat, maxLat, minLng, maxLng].every(Number.isFinite)) {
      const latCenter = clamp((minLat + maxLat) / 2, -85, 85);
      const lngCenter = clamp((minLng + maxLng) / 2, -179.999, 179.999);
      const latDelta = clamp(Math.max(0.05, Math.abs(maxLat - minLat) * 1.2), 0.002, 40);
      const lngDelta = clamp(Math.max(0.05, Math.abs(maxLng - minLng) * 1.2), 0.002, 40);
      return {
        latitude: latCenter,
        longitude: lngCenter,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      };
    }
    return null;
  }

  function animateToWilaya(w?: WilayaType, { delayMs = 220 }: { delayMs?: number } = {}) {
    const next = w ? regionFromWilaya(w) : makeRegion(DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude, 50);
    if (!next || !mapRef.current) return;

    const vals = [next.latitude, next.longitude, next.latitudeDelta, next.longitudeDelta];
    if (!vals.every(Number.isFinite)) return;

    isAnimatingRef.current = true;
    if (animTimerRef.current) clearTimeout(animTimerRef.current);

    setRegion(next);

    animTimerRef.current = setTimeout(() => {
      if (!mapRef.current) return;
      try {
        if (Platform.OS === "android") {
          mapRef.current.animateCamera(
            { center: { latitude: next.latitude, longitude: next.longitude }, zoom: zoomForLongitudeDelta(next.longitudeDelta), heading: 0, pitch: 0 },
            { duration: 500 }
          );
        } else {
          mapRef.current.animateToRegion(next, 500);
        }
      } finally {
        setTimeout(() => { isAnimatingRef.current = false; }, 550);
      }
    }, delayMs);
  }

  const handleRegionChangeComplete = (r: Region) => {
    const vals = [r.latitude, r.longitude, r.latitudeDelta, r.longitudeDelta];
    if (!vals.every(Number.isFinite)) return;
    if (isAnimatingRef.current) return;

    const safe: Region = {
      latitude: clamp(r.latitude, -85, 85),
      longitude: clamp(r.longitude, -179.999, 179.999),
      latitudeDelta: clamp(r.latitudeDelta, 0.0008, 60),
      longitudeDelta: clamp(r.longitudeDelta, 0.0008, 60),
    };
    setRegion(safe);
  };

  const markers: ToiletMarkerType[] = useMemo(
    () => (Array.isArray(items) ? items.filter(m => Number.isFinite(m?.lat) && Number.isFinite(m?.lng)) : []),
    [items]
  );

  const canDrawCircle =
    [region.latitude, region.longitude, safeRadiusKm].every(Number.isFinite) && safeRadiusKm > 0;

  return (
    <>
      <View style={{ flex: 1, backgroundColor: T.bg.app }}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={initialRegionRef.current}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation
          showsCompass
          pitchEnabled
          rotateEnabled
        >
          {canDrawCircle && (
            <Circle
              center={{ latitude: region.latitude, longitude: region.longitude }}
              radius={safeRadiusKm * 1000}
              strokeColor={withAlpha(T.colors.primary, 0.5)}
              fillColor={withAlpha(T.colors.primary, 0.10)}
              strokeWidth={2}
            />
          )}

          {markers.map((m) => (
            <Marker
              key={m.id}
              coordinate={{ latitude: m.lat as number, longitude: m.lng as number }}
              // success for free, primary for paid
              pinColor={m.is_free ? T.colors.success : T.colors.primary}
              onPress={() => {
                if ([m.lat, m.lng].every(Number.isFinite)) {
                  try {
                    if (mapRef.current) {
                      if (Platform.OS === "android") {
                        mapRef.current.animateCamera(
                          { center: { latitude: m.lat as number, longitude: m.lng as number }, zoom: zoomForLongitudeDelta(region.longitudeDelta) },
                          { duration: 400 }
                        );
                      } else {
                        mapRef.current.animateToRegion({ ...region, latitude: m.lat as number, longitude: m.lng as number }, 400);
                      }
                    }
                  } catch {}
                }
                nearbySheetRef.current?.openAt(m.lat as number, m.lng as number);
              }}
              tracksViewChanges={Platform.OS === "android"}
            />
          ))}
        </MapView>

        {/* Top overlay */}
        <View pointerEvents="box-none" style={{ position: "absolute", top: 44, left: S.md, right: S.md, gap: S.sm }}>
          <View style={{ flexDirection: "row", alignItems: 'center', gap: S.sm }}>
            {/* Back */}
            {/* <Pressable
              onPress={() => navigation.goBack()}
              android_ripple={{ color: T.state.ripple }}
              style={({ pressed }) => [
                {
                  height: 44,
                  backgroundColor: T.bg.surface,
                  paddingHorizontal: S.lg,
                  borderRadius: R.lg,
                  borderWidth: 1,
                  borderColor: T.border.subtle,
                  alignItems: "center",
                  justifyContent: "center",
                  ...shadow(1),
                },
                pressableStyles(pressed),
              ]}
            >
              <ArrowLeft size={20} color={T.text.strong as string} />
            </Pressable> */}

            {/* Wilaya */}
            <WilayaPicker
              value={selectedWilaya}
              onChangeWilaya={onWilayaChange}
              includeAll={false}
              triggerStyle={{
                height: 44,
                backgroundColor: T.bg.surface,
                paddingHorizontal: S.lg,
                borderRadius: R.lg,
                borderWidth: 1,
                borderColor: T.border.subtle,
                ...shadow(1),
              }}
              triggerTextStyle={{ fontWeight: "800", color: T.text.strong }}
              scope="with_toilets"
              status="active"
              withCounts
              lang="fr"
            />

            {/* Filters */}
            <Pressable
              onPress={() => filterRef.current?.show()}
              android_ripple={{ color: T.state.ripple }}
              style={({ pressed }) => [
                {
                  height: 44,
                  marginLeft: "auto",
                  justifyContent: 'center',
                  backgroundColor: T.bg.surface,
                  paddingHorizontal: S.lg,
                  paddingVertical: 10,
                  borderRadius: R.lg,
                  borderWidth: 1,
                  borderColor: T.border.subtle,
                  ...shadow(1),
                },
                pressableStyles(pressed),
              ]}
            >
              <Text style={{ fontWeight: "800", color: T.text.strong }}>
                Filters 
                {/* {markers.length} */}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Loading HUD */}
        {loading && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 80,
              alignSelf: "center",
              backgroundColor: withAlpha("#fff", 0.92),
              paddingHorizontal: S.lg,
              paddingVertical: S.sm,
              borderRadius: R.pill,
              borderWidth: 1,
              borderColor: T.border.subtle,
              ...shadow(1),
            }}
          >
            <View style={{ flexDirection: "row", gap: S.sm, alignItems: "center" }}>
              <ActivityIndicator color={T.colors.primary} />
              <Text style={{ color: T.text.strong }}>Loading toilets…</Text>
            </View>
          </View>
        )}

        {/* Filters sheet */}
        <FilterSheet sheetRef={filterRef} initial={filters as any} onApply={(f) => setFilters(f)} />

        {/* Nearby list sheet */}
        <NearbyToiletsSheet
          ref={nearbySheetRef}
          wilayaId={selectedWilaya?.id}
          radiusKm={safeRadiusKm}
          filters={filters}
        />
      </View>
    </>
  );
}
