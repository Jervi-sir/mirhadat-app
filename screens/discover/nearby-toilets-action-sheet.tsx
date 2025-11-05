import { ToiletCard } from "@/components/card/toilet-card";
import { ApiRoutes, buildRoute } from "@/utils/api";
import { apiPublic } from "@/utils/axios-instance";
import { FiltersType } from "@/utils/types";
import { Routes } from "@/utils/variables/routes";
import { useNavigation } from "@react-navigation/native";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import ActionSheet, { ActionSheetRef, FlatList } from "react-native-actions-sheet";

const PAGE_SIZE = 20;

export type NearbyToiletsSheetRef = {
  openAt: (lat: number, lng: number) => void;
  hide: () => void;
};

export function hashFilters(f: FiltersType): string {
  try {
    return JSON.stringify(f ?? {});
  } catch {
    return "";
  }
}

export const NearbyToiletsSheet = forwardRef<NearbyToiletsSheetRef, { wilayaId?: number; radiusKm: number; filters: FiltersType; }>(({ wilayaId, radiusKm, filters }, ref) => {
  const navigation: any = useNavigation();

  const sheetRef = useRef<ActionSheetRef>(null);
  const anchorRef = useRef<{ lat: number; lng: number } | null>(null);

  const [data, setData] = useState<any[] | null>(null);
  const [meta, setMeta] = useState({ page: 1, perPage: 20, total: 0 });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtersKey = useMemo(() => hashFilters(filters), [filters]);

  const buildParams = useCallback((lat: number, lng: number, p: number) => {
    const hasAnchor = Number.isFinite(lat) && Number.isFinite(lng);

    return {
      lat, lng,
      radius_km: 2,// radiusKm,

      // IMPORTANT: only filter by wilaya if we don't have a precise anchor
      wilaya_id: hasAnchor ? undefined : wilayaId,

      // filters
      is_free: filters.isFree,
      access_method: filters.accessMethod,
      pricing_model: filters.pricingModel ?? undefined,
      min_rating: filters.minRating,
      amenities: (filters.amenities && filters.amenities.length ? filters.amenities : undefined),

      // list paging/sort
      page: p,
      perPage: PAGE_SIZE,
      sort: "distance",
      order: "asc",
      use_bbox: true,
      with_distance: true, // boolean, not string ✅

      // include richer relations
      include: "category,wilaya,owner,photos,open_hours,favorite",
    } as const;
  }, [filters, radiusKm, wilayaId]);

  const fetchPage = useCallback(async (p: number) => {
    const anchor = anchorRef.current;
    if (!anchor) return { rows: [], meta: {} as any };

    const params = buildParams(anchor.lat, anchor.lng, p);
    const resp = await apiPublic.get(buildRoute(ApiRoutes.toilets.index), { params });
    const rows = resp.data?.data ?? [];
    const meta = resp.data?.meta ?? {};
    return { rows, meta };
  }, [buildParams]);

  const openAt = useCallback(async (lat: number, lng: number) => {
    anchorRef.current = { lat, lng };
    setError(null);
    setData(null);
    setPage(1);
    setHasMore(false);
    setLoading(true);
    sheetRef.current?.show();

    try {
      const { rows, meta } = await fetchPage(1);
      setData(rows);
      setHasMore(((meta.page ?? 1) * (meta.perPage ?? PAGE_SIZE)) < (meta.total ?? rows.length));
      setMeta(meta);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load nearby toilets");
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  const hide = useCallback(() => {
    sheetRef.current?.hide();
  }, []);

  // expose methods
  useImperativeHandle(ref, () => ({ openAt, hide }), [openAt, hide]);

  // If filters change while the sheet is open and we have an anchor → refresh page 1
  useEffect(() => {
    if (!sheetRef.current?.isOpen() || !anchorRef.current) return;
    (async () => {
      setError(null);
      setLoading(true);
      setPage(1);
      setHasMore(false);
      try {
        const { rows, meta } = await fetchPage(1);
        setData(rows);
        setHasMore(((meta.page ?? 1) * (meta.perPage ?? PAGE_SIZE)) < (meta.total ?? rows.length));
      } catch (e: any) {
        setError(e?.message ?? "Failed to load nearby toilets");
      } finally {
        setLoading(false);
      }
    })();
  }, [filtersKey, fetchPage]);

  const loadMore = useCallback(async () => {
    if (!data || loading || fetchingMore || !hasMore) return;
    setFetchingMore(true);
    try {
      const next = page + 1;
      const { rows, meta } = await fetchPage(next);
      setData(prev => (prev ? prev.concat(rows) : rows));
      setPage(next);
      setHasMore(((meta.page ?? next) * (meta.perPage ?? PAGE_SIZE)) < (meta.total ?? (data?.length ?? 0)));
    } catch {
      // optional: toast/log
    } finally {
      setFetchingMore(false);
    }
  }, [data, loading, fetchingMore, hasMore, page, fetchPage]);

  return (
    <ActionSheet
      ref={sheetRef}
      gestureEnabled
      closeOnTouchBackdrop
      defaultOverlayOpacity={0.3}
      containerStyle={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: "#fff" }}
      indicatorStyle={{ width: 60, height: 5, borderRadius: 3, backgroundColor: "#111" }}
      safeAreaInsets={{
        top: 240, left: 0, right: 0, bottom: 0
      }}
    >
      <View style={{ padding: 12 }}>
        {loading ? (
          <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 24 }}>
            <ActivityIndicator />
            <Text style={{ marginTop: 8 }}>Loading nearby…</Text>
          </View>
        ) : error ? (
          <Text style={{ color: "red" }}>{error}</Text>
        ) : !data || data.length === 0 ? (
          <Text>No toilets found around this point.</Text>
        ) : (
          <View>
            <Text style={{ fontWeight: "700", textAlign: 'center', marginBottom: 6 }}>
              Found {meta.total} toilets
            </Text>
            <FlatList
              data={data}
              keyExtractor={(it: any) => String(it.id)}

              renderItem={({ item }) => (
                <ToiletCard
                  item={item}
                  onPress={() => {
                    sheetRef.current?.hide();
                    navigation.navigate(Routes.ToiletOfferScreen, { toiletId: item?.id })
                  }}
                />
              )}
              contentContainerStyle={{ paddingTop: 0, paddingBottom: 80 }}
              onEndReachedThreshold={0.35}
              onEndReached={loadMore}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        )}
      </View>
    </ActionSheet>
  );

});
