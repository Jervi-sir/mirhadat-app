// screens/favorites/favorites-screen.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import api from "@/utils/api/axios-instance";
import { ApiRoutes, buildRoute } from "@/utils/api/api";
import { ScreenWrapper } from "@/components/screen-wrapper";
import { ToiletCard } from "@/components/card/toilet-card";
import type { ToiletWithRelationsType } from "@/utils/types";
import { theme, S, R, T as Type, shadow, withAlpha } from "@/ui/theme";
import { useAuthStore } from "@/zustand/auth-store";
import { useAuthPrompt } from "@/context/auth-prompt";
import { useFavoritesStore } from "@/zustand/favorites-store"; // ✅ NEW

type ApiWrappedList<T> = { data: T[]; meta?: { page?: number; perPage?: number; total?: number } };
const PAGE_SIZE = 20;

const FavoritesScreen: React.FC = () => {
  const { promptAuth } = useAuthPrompt?.() ?? { promptAuth: async () => false };

  // select stable references only (no computed arrays/objects)
  const ids = useFavoritesStore((s) => s.ids);
  const byId = useFavoritesStore((s) => s.byId);
  const total = useFavoritesStore((s) => s.total);
  const page = useFavoritesStore((s) => s.page);
  const items = useMemo(() => ids.map((id) => byId[id]), [ids, byId]);

  const setPageData = useFavoritesStore((s) => s.setPageData);
  const removeFromStore = useFavoritesStore((s) => s.remove);

  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = useAuthStore((s) => s.token);
  const isAuthed = !!token;

  const canLoadMore = useMemo(() => {
    if (total == null) return false;
    return items.length < total;
  }, [items.length, total]);

  const mapRowToCard = (row: ToiletWithRelationsType) => {
    const cover =
      row.cover_photo?.url ??
      row.photos?.find((p) => p.is_cover)?.url ??
      row.photos?.[0]?.url ??
      undefined;
    return cover ? { ...row, cover_photo: { url: cover } } : row;
  };

  const fetchPage = useCallback(
    async (targetPage: number, mode: "initial" | "refresh" | "more") => {
      const params = {
        page: targetPage,
        perPage: PAGE_SIZE,
        include: "category,wilaya,owner,photos,open_hours,favorite",
      };

      try {
        mode === "initial" && setInitialLoading(true);
        mode === "refresh" && setRefreshing(true);
        mode === "more" && setFetchingMore(true);
        setError(null);

        const url = buildRoute(ApiRoutes.toilets.favorite.mine);
        const res = await api.get<ApiWrappedList<ToiletWithRelationsType>>(url, {
          authRequired: true,
          params,
        });

        const payload = Array.isArray(res.data?.data) ? res.data.data : [];
        const meta = res.data?.meta ?? {};
        const mapped = payload.map(mapRowToCard);

        // ✅ Push page into the store (dedup-aware)
        setPageData(
          targetPage,
          // @ts-ignore
          mapped,
          meta.total ?? null,
          mode === "more" ? "append" : "replace"
        );
      } catch (e: any) {
        setError(e?.response?.data?.message || e?.message || "Failed to load favorites");
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
        setFetchingMore(false);
      }
    },
    [setPageData]
  );

  // Initial load
  useEffect(() => {
    if (!isAuthed) return;
    fetchPage(1, "initial");
  }, [isAuthed, fetchPage]);

  const onRefresh = useCallback(() => {
    if (!isAuthed) return;
    fetchPage(1, "refresh");
  }, [isAuthed, fetchPage]);

  const loadMore = useCallback(() => {
    if (!canLoadMore || fetchingMore || initialLoading || refreshing) return;
    fetchPage(page + 1, "more");
  }, [canLoadMore, fetchingMore, initialLoading, refreshing, page, fetchPage]);

  // ✅ When a card’s favorite toggles off, remove from store
  const handleFavoriteChange = useCallback((id: number, nextFav: boolean) => {
    if (!nextFav) removeFromStore(id);
  }, [removeFromStore]);

  /* ------------------------------- Render ------------------------------- */
  if (!isAuthed) {
    return (
      <ScreenWrapper>
        <View style={{ paddingHorizontal: S.md, paddingTop: S.sm, paddingBottom: S.xs }}>
          <Text style={{ fontSize: 20, fontWeight: "800", color: theme.text.default }}>Favorites</Text>
        </View>

        <View style={[{ flex: 1, backgroundColor: theme.bg.app, alignItems: "center", justifyContent: "center", padding: S["xxl"] }]}>
          <View style={{ marginTop: -100, alignItems: 'center' }}>
            <Text style={[{ marginTop: 8, textAlign: "center", color: theme.text.secondary }]}>
              You’re not logged in.
            </Text>
            <View style={{ height: S.sm }} />
            <Pressable
              onPress={async () => {
                const ok = await promptAuth();
                if (ok) {
                  await onRefresh();
                }
              }}
              android_ripple={{ color: withAlpha("#000", 0.06) }}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingHorizontal: S.lg,
                  paddingVertical: 12,
                  borderRadius: R.lg,
                  borderWidth: 1,
                  borderColor: theme.border.subtle,
                  backgroundColor: theme.bg.surface,
                  ...shadow(1),
                },
                pressed ? { opacity: 0.95, transform: [{ scale: 0.98 }] } : null,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Log in"
            >
              <Text style={{ color: theme.text.strong as string, fontWeight: "800" }}>Log in</Text>
            </Pressable>
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  if (initialLoading && !items.length && !error) {
    return (
      <ScreenWrapper>
        <View style={{ alignItems: "center", justifyContent: "center", padding: 32 }}>
          <ActivityIndicator />
          <Text style={{ color: theme.text.secondary, marginTop: 8 }}>Loading favorites…</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (error && !items.length) {
    return (
      <ScreenWrapper>
        <View style={{ alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Text style={{ color: theme.colors.error, textAlign: "center" }}>{error}</Text>
          <Pressable
            onPress={() => fetchPage(1, "initial")}
            style={({ pressed }) => [
              {
                marginTop: S.md,
                paddingHorizontal: S.lg,
                paddingVertical: 12,
                borderRadius: R.lg,
                backgroundColor: theme.colors.primary,
              },
              pressed && { opacity: 0.96 },
            ]}
          >
            <Text style={{ color: theme.text.onPrimary, fontWeight: "800" }}>Retry</Text>
          </Pressable>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={{ paddingHorizontal: S.md, marginTop: S.sm, height: 34, justifyContent: 'center' }}>
        <Text style={{ fontSize: 20, fontWeight: "800", color: theme.text.default }}>Saved toilets</Text>
      </View>
      <FlatList
        contentContainerStyle={{ paddingBottom: S.xxxl }}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: S.xl, paddingBottom: S.sm }}>
            <Text style={{ ...Type.bodyMuted, color: theme.text.secondary, marginTop: 4 }}>
              Your favorites in one place.
            </Text>
          </View>
        }
        data={items}
        keyExtractor={(it) => String(it.id)}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: S.lg }}>
            <ToiletCard
              item={item}
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: "center", padding: 32 }}>
            <Text style={{ color: theme.text.secondary }}>No favorites yet.</Text>
            <Text style={{ color: theme.text.tertiary, marginTop: 4, fontSize: 12 }}>
              Tap the heart on a toilet to save it here.
            </Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        ListFooterComponent={
          fetchingMore ? (
            <View style={{ paddingVertical: S.md }}>
              <ActivityIndicator />
            </View>
          ) : (
            <View style={{ height: 100 }} />
          )
        }
      />
    </ScreenWrapper>
  );
};

export default FavoritesScreen;
