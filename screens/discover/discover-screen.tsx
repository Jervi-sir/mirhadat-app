import { View, Text, Pressable, FlatList, ActivityIndicator, Alert } from "react-native";
import { ScreenWrapper } from "@/components/screen-wrapper";
import { Routes } from "@/utils/variables/routes";
import WilayaPicker from "@/components/filters/wilaya-picker";
import { ActionSheetRef } from "react-native-actions-sheet";
import { useEffect, useRef, useState } from "react";
import { FilterSheet } from "@/components/filters/filter-sheet";
import { ToiletCard } from "@/components/card/toilet-card";
import { useDiscoverStore } from "@/zustand/discover-store";
import { useNavigation } from "@react-navigation/native";
import { ToiletWithRelationsType, WilayaType } from "@/utils/types";
import FAB from 'react-native-animated-fab';
import { FloatingButton } from "@/components/floating-button";

let Location: any;
try { Location = require("expo-location"); } catch { }

// whatever your shape is; matches FilterSheet props
export type ToiletFilters = {
  isFree?: boolean;
  accessMethod?: "public" | "code" | "staff" | "key" | "app";
  pricingModel?: "flat" | "per-visit" | "per-30-min" | "per-60-min" | null;
  minRating?: number;
  amenities?: string[]; // note: array of codes
};

export default function DiscoverScreen() {
  const navigation: any = useNavigation();
  const {
    selectedWilaya, setSelectedWilaya,
    filters, setFilters,
    items, loading, hasMore, fetchFirst, fetchNext,
  } = useDiscoverStore();

  useEffect(() => {
    fetchFirst();
  }, [selectedWilaya?.id, JSON.stringify(filters)]);

  // Sheets
  const filterRef = useRef<ActionSheetRef>(null);
  const onOpenDetails = (t: ToiletWithRelationsType) => {
    navigation.navigate(Routes.ToiletOfferScreen, { toiletId: t?.id })
    // selectToilet(t);
    // detailsRef.current?.show();
  };

  return (
    <ScreenWrapper>
       
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        {/* Top */}
        
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, backgroundColor: "#fafafa" }}>
          {/* Top 1 */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <WilayaPicker
              // @ts-ignore
              value={selectedWilaya}
              // @ts-ignore
              onChangeWilaya={(w: any) => setSelectedWilaya(w)} // w is full object (or undefined for "All")
              lang="fr"
              scope="with_toilets"
              status="active"
              withCounts={false}
              includeAll={false}
            />
            <Pressable
              onPress={() => navigation?.navigate?.(Routes.DiscoverMapScreen)}  // { lat: coords?.lat, lng: coords?.lng }
              style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: "#111" }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>View map</Text>
            </Pressable>
          </View>
          {/* Top 2 */}
          <View style={{ marginTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "700" }}>Nearby toilets</Text>
            <Pressable
              onPress={() => filterRef.current?.show()}
              style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "#ddd" }}
            >
              <Text>Filters</Text>
            </Pressable>
          </View>
        </View>


        {/* Result */}
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          renderItem={({ item }) => (
            <ToiletCard item={item} />
          )}
          contentContainerStyle={{ padding: 16, paddingTop: 0 }}
          onEndReachedThreshold={0.2}
          onEndReached={() => { if (hasMore && !loading) fetchNext(); }}
          ListFooterComponent={
            loading ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator />
              </View>
            ) : null
          }
        />
      </View>

      {/* Filter Sheet */}
      <FilterSheet
        // @ts-ignore
        sheetRef={filterRef}
        initial={filters}
        onApply={(f) => setFilters(f)}
      />
    </ScreenWrapper>
  );
}
