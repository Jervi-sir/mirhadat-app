import { View, Text, Pressable, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import { ScreenWrapper } from "@/components/screen-wrapper";
import { Routes } from "@/utils/variables/routes";
import WilayaPicker from "@/components/filters/wilaya-picker";
import { ActionSheetRef } from "react-native-actions-sheet";
import React, { useEffect, useRef, useState } from "react";
import { FilterSheet } from "@/components/filters/filter-sheet";
import { ToiletCard } from "@/components/card/toilet-card";
import { useDiscoverStore } from "@/zustand/discover-store";
import { useNavigation } from "@react-navigation/native";
import { ToiletWithRelationsType } from "@/utils/types";
import { theme as T, S, R, shadow, pressableStyles, withAlpha, theme } from "@/ui/theme";

export default function DiscoverScreen() {
  const navigation: any = useNavigation();
  const {
    selectedWilaya, setSelectedWilaya,
    filters, setFilters,
    items, loading, hasMore, fetchFirst, fetchNext,
  } = useDiscoverStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchFirst();
  }, [selectedWilaya?.id, JSON.stringify(filters)]);

  const filterRef = useRef<ActionSheetRef>(null);

  const onOpenDetails = (t: ToiletWithRelationsType) => {
    navigation.navigate(Routes.ToiletOfferScreen, { toiletId: t?.id });
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchFirst(); // re-fetch first page with current filters/wilaya
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScreenWrapper>
      <View style={{ flex: 1, backgroundColor: T.bg.app }}>
        {/* Top */}
        <View
          style={{
            paddingHorizontal: S.md,
            paddingTop: S.sm,
            paddingBottom: S.lg,
            backgroundColor: T.bg.surface,
            borderBottomWidth: 1,
            borderBottomColor: T.border.subtle,
            gap: S.md,
            ...shadow(0),
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: S.md }}>
            <View style={{ height: 34, justifyContent: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: "800", color: theme.text.default }}>Nearby toilets</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <WilayaPicker
              // @ts-ignore
              value={selectedWilaya}
              // @ts-ignore
              onChangeWilaya={(w: any) => setSelectedWilaya(w)}
              lang="fr"
              scope="with_toilets"
              status="active"
              withCounts={false}
              includeAll={false}
              triggerStyle={{ minHeight: 34, borderRadius: R.md }}
              triggerTextStyle={{ fontWeight: 600 as any, fontSize: 13 }}
            />

            <Pressable
              onPress={() => filterRef.current?.show()}
              android_ripple={{ color: T.state.ripple }}
              style={({ pressed }) => [
                {
                  paddingHorizontal: S.lg,
                  paddingVertical: S.sm,
                  borderRadius: R.md,
                  borderWidth: 1,
                  borderColor: T.border.subtle,
                  backgroundColor: T.bg.surface,
                  height: 34
                },
                pressableStyles(pressed),
              ]}
            >
              <Text style={{ color: T.text.strong, fontWeight: "600" }}>Filters</Text>
            </Pressable>
          </View>
        </View>

        {/* Result list */}
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          renderItem={({ item }) => <ToiletCard item={item} onPress={() => onOpenDetails(item)} />}
          contentContainerStyle={{ padding: S.lg }}
          onEndReachedThreshold={0.2}
          onEndReached={() => { if (hasMore && !loading) fetchNext(); }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[T.colors.primary]}              // Android spinner color
              tintColor={T.colors.primary as string}   // iOS spinner color
              progressBackgroundColor={T.bg.surface as string}
            />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={{ alignItems: "center", paddingVertical: S["xxl"] }}>
                <View
                  style={{
                    backgroundColor: withAlpha(T.colors.primary, 0.08),
                    borderRadius: R.xl,
                    paddingHorizontal: S["xxl"],
                    paddingVertical: S.lg,
                    borderWidth: 1,
                    borderColor: T.border.subtle,
                  }}
                >
                  <Text style={{ color: T.text.secondary }}>No toilets found for these filters.</Text>
                </View>
              </View>
            ) : null
          }
          ListFooterComponent={
            loading ? (
              <View style={{ paddingVertical: S.lg }}>
                <ActivityIndicator color={T.colors.primary} />
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
