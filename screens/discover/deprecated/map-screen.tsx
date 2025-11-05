import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Platform, Alert } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import type { ToiletWithRelations } from "@/utils/types";
import ActionSheet, { ActionSheetRef } from "react-native-actions-sheet";
import { useToiletStore } from "@/zustand/useToiletStore";
import { FilterSheet } from "@/components/filters/filter-sheet";
import { ToiletDetailsSheet } from "@/components/toilet-details-sheet";
import { ScreenWrapper } from "@/components/screen-wrapper";
import { useNavigation } from "@react-navigation/native";

// Optional location (fallback to Algiers if permission denied)
let Location: any;
try {
  Location = require("expo-location");
} catch {}

function debounce<T extends (...args: any[]) => void>(fn: T, delay = 400) {
  let t: any;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

const INITIAL_REGION: Region = {
  latitude: 36.7538,  // Algiers center (fallback)
  longitude: 3.0588,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function MapScreen({ route }: any) {
  const navigation: any = useNavigation();
  const mapRef = useRef<MapView>(null);
  const filterRef = useRef<ActionSheetRef>(null);
  const detailsRef = useRef<ActionSheetRef>(null);

  const {
    items, loading, hasMore,
    filters, setFilters,
    coords, setCoords,
    selectedToilet, selectToilet,
    refresh,
  } = useToiletStore();

  const [region, setRegion] = useState<Region>(INITIAL_REGION);

  // Boot: get current location if available, else keep fallback
  useEffect(() => {
    (async () => {
      try {
        if (!Location) throw new Error("expo-location not available");
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") throw new Error("perm denied");
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude, longitude } = pos.coords;
        const newRegion = { ...INITIAL_REGION, latitude, longitude };
        setRegion(newRegion);
        setCoords(latitude, longitude);
      } catch {
        // keep fallback Algiers silently
        setCoords(INITIAL_REGION.latitude, INITIAL_REGION.longitude);
      }
    })();
  }, [setCoords]);

  // Fetch nearby on coords change (first load & recenter)
  useEffect(() => {
    if (!coords?.lat || !coords?.lng) return;
    refresh({ lat: coords.lat, lng: coords.lng });
  }, [coords?.lat, coords?.lng, refresh]);

  // If navigated with lat/lng, recenter once
  useEffect(() => {
    const lat = route?.params?.lat;
    const lng = route?.params?.lng;
    if (typeof lat === "number" && typeof lng === "number") {
      const r = { ...INITIAL_REGION, latitude: lat, longitude: lng };
      setRegion(r);
      setCoords(lat, lng);
      mapRef.current?.animateToRegion(r, 600);
    }
  }, [route?.params, setCoords]);

  // Debounced fetch when user stops panning/zooming
  const onRegionChangeComplete = useMemo(
    () =>
      debounce((r: Region) => {
        setRegion(r);
        setCoords(r.latitude, r.longitude);
        refresh({ lat: r.latitude, lng: r.longitude });
      }, 500),
    [refresh, setCoords]
  );

  const openDetails = useCallback((t: ToiletWithRelations) => {
    selectToilet(t);
    detailsRef.current?.show();
  }, [selectToilet]);

  const recenter = () => {
    if (!coords) return;
    const r = { ...region, latitude: coords.lat, longitude: coords.lng };
    mapRef.current?.animateToRegion(r, 500);
  };

  const goToList = () => navigation?.navigate?.("DiscoverScreen");

  const fitAllMarkers = () => {
    if (!mapRef.current || items.length === 0) return;
    mapRef.current.fitToCoordinates(
      items.map((t) => ({ latitude: Number(t.lat), longitude: Number(t.lng) })),
      { edgePadding: { top: 80, right: 80, bottom: 80, left: 80 }, animated: true }
    );
  };

  return (
    <ScreenWrapper>
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          initialRegion={region}
          onRegionChangeComplete={onRegionChangeComplete}
          showsUserLocation
          showsMyLocationButton={false}
          toolbarEnabled={false}
          pitchEnabled
          rotateEnabled
        >
          {items.map((t) => (
            <Marker
              key={String(t.id)}
              coordinate={{ latitude: Number(t.lat), longitude: Number(t.lng) }}
              title={t.name}
              description={(t.category?.en || t.category?.fr || t.category?.ar || "") + (t.isFree ? " · Free" : "")}
              onPress={() => openDetails(t)}
              pinColor={t.isFree ? "#00A884" : "#E67E22"} // green for free, orange otherwise
            />
          ))}
        </MapView>

        {/* Floating controls */}
        <View style={{ position: "absolute", top: 16, left: 16, right: 16, flexDirection: "row", justifyContent: "space-between" }}>
          <Pressable
            onPress={goToList}
            style={{ backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }}
          >
            <Text style={{ fontWeight: "700" }}>List</Text>
          </Pressable>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={() => filterRef.current?.show()}
              style={{ backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }}
            >
              <Text style={{ fontWeight: "700" }}>Filters</Text>
            </Pressable>
            <Pressable
              onPress={fitAllMarkers}
              style={{ backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }}
            >
              <Text style={{ fontWeight: "700" }}>Fit</Text>
            </Pressable>
            <Pressable
              onPress={recenter}
              style={{ backgroundColor: "#111", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>Me</Text>
            </Pressable>
          </View>
        </View>

        {/* Loading badge */}
        {loading && (
          <View style={{ position: "absolute", top: 70, left: 16, backgroundColor: "#fff", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flexDirection: "row", alignItems: "center", gap: 8, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }}>
            <ActivityIndicator />
            <Text>Loading…</Text>
          </View>
        )}

        {/* Filter Sheet (same config you use) */}
        <FilterSheet
          sheetRef={filterRef}
          initial={filters}
          onApply={(f) => {
            setFilters(f);
            if (coords) refresh({ lat: coords.lat, lng: coords.lng, filters: f });
          }}
        />

        {/* Details Sheet (click marker) */}
        <ToiletDetailsSheet
          sheetRef={detailsRef}
          toilet={selectedToilet}
          onStartSession={(toiletId) => {
            // Wire later to your sessions route
            Alert.alert("Start session", `Toilet #${toiletId}`);
          }}
        />
      </View>
    </ScreenWrapper>
  );
}
