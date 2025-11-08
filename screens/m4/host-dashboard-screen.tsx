// HostDashboardScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  Alert,
  TouchableOpacity,
} from "react-native";
import api from "@/utils/api/axios-instance";
import { ApiRoutes, buildRoute } from "@/utils/api/api";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { ScreenWrapper } from "@/components/screen-wrapper";
import { ToiletCard } from "@/components/card/toilet-card";
import { id, ToiletType, ToiletWithRelationsType, UserType } from "@/utils/types";
import { Routes } from "@/utils/variables/routes";
import { theme as T, T as Typography, S, R, shadow, withAlpha, pressableStyles, theme } from "@/ui/theme";
import { LogOut, Pencil, Plus } from "lucide-react-native";
import { useAuthStore } from "@/zustand/auth-store";
import { useAuthPrompt } from "@/context/auth-prompt";
import { getToken } from "@/utils/api/token-manager";

const MAX_TOILETS = 5;

/* ---------- Types ---------- */
const HostDashboardScreen: React.FC = () => {
  const navigation: any = useNavigation();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { promptAuth } = useAuthPrompt?.() ?? { promptAuth: async () => false };
  const didInitFocusRef = useRef(false);

  const isAuthed = !!token;
  const isHost = useMemo(() => (user?.role_code ?? "").toLowerCase() === "host", [user]);

  const [toilets, setToilets] = useState<ToiletType[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingToilets, setLoadingToilets] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  /* ---------- API: me ---------- */
  const fetchMe = useCallback(async () => {
    setLoadingUser(true);
    setError(null);
    try {
      // No token? treat as logged out and stop here.
      if (!getToken()) {
        setUser(null as any);
        return;
      }
      const res = await api.get(buildRoute(ApiRoutes.auth.me), {
        authIfAvailable: true,
        skipAuthPromptOn401: true, // never show sheet here
      });
      const me = (res.data?.data ?? res.data) as UserType;
      setUser(me);
    } catch (e: any) {
      // Token invalid/expired → clear user (do NOT prompt)
      setUser(null as any);
    } finally {
      setLoadingUser(false);
    }
  }, [setUser]);

  /* ---------- API: host toilets (only if host) ---------- */
  const fetchMyToilets = useCallback(async () => {
    if (!isAuthed || !isHost) {
      setToilets([]);
      return;
    }
    setLoadingToilets(true);
    setError(null);
    try {
      const res = await api.get(buildRoute(ApiRoutes.host.toilets.index), {
        authIfAvailable: true,
        skipAuthPromptOn401: true,
      });
      const list: ToiletType[] = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data) ? res.data.data : [];
      setToilets(list);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to load toilets");
      setToilets([]);
    } finally {
      setLoadingToilets(false);
    }
  }, [isAuthed, isHost]);

  /* ---------- Effects ---------- */
  useEffect(() => {
    // 1) Always fetch the user first
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    // 2) Only fetch toilets after we know user is host
    if (isHost) fetchMyToilets();
  }, [isHost, fetchMyToilets]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await fetchMe();
    // fetch toilets only if host after user is refreshed
    await fetchMyToilets();
    setRefreshing(false);
  }, [fetchMe, fetchMyToilets]);

  // Re-fetch when the screen regains focus (but skip the very first focus to avoid double-loading)
  useFocusEffect(
    useCallback(() => {
      fetchMyToilets();
      // if (didInitFocusRef.current) {
      //   // Screen came back into focus after initial mount
      // } else {
      //   didInitFocusRef.current = true;
      // }
      // No cleanup needed
      return undefined;
    }, [refreshAll])
  );


  /* ---------- Mapping: API row -> card shape ---------- */
  function toCardItem(row: ToiletWithRelationsType) {
    const cover = row.photos?.find((p) => p.is_cover)?.url ?? row.photos?.[0]?.url ?? undefined;

    return {
      id: row.id ?? 0,
      owner_id: row.owner?.id ?? undefined,
      toilet_category_id: row.category?.id ?? 0,
      name: row.name,
      description: undefined,
      phone_numbers: [],
      lat: row.lat as any,
      lng: row.lng as any,
      address_line: row.address_line,
      wilaya_id: row.wilaya?.id ?? 0,
      place_hint: row.place_hint ?? null,
      access_method: row.access_method as any,
      capacity: 0 as any,
      is_unisex: true,
      amenities: [],
      rules: [],
      is_free: !!row.is_free,
      price_cents: row.price_cents,
      pricing_model: row.pricing_model as any,
      status: "active" as any,
      avg_rating: (row as any).avg_rating ?? 0,
      reviews_count: row.reviews_count ?? 0,
      photos_count: row.photos_count ?? (row.photos?.length ?? 0),
      created_at: row.created_at as any,
      updated_at: row.updated_at as any,
      category: row.category
        ? {
          id: row.category.id,
          code: row.category.code,
          icon: row.category.icon ?? null,
          en: row.category.en ?? null,
          fr: row.category.fr ?? null,
          ar: row.category.ar ?? null,
          created_at: null as any,
          updated_at: null as any,
        }
        : (undefined as any),
      wilaya: row.wilaya
        ? {
          id: row.wilaya.id,
          code: row.wilaya.code,
          number: row.wilaya.number ?? 0,
          en: row.wilaya.en ?? null,
          fr: row.wilaya.fr ?? null,
          ar: row.wilaya.ar ?? null,
          created_at: null as any,
          updated_at: null as any,
        }
        : (undefined as any),
      owner: row.owner ? { id: row.owner.id, name: row.owner.name } : (undefined as any),
      photos: (row.photos ?? []).map((p) => ({
        id: p.id ?? 0,
        toilet_id: row.id ?? 0,
        url: p.url,
        is_cover: !!p.is_cover,
        created_at: null as any,
        updated_at: null as any,
      })),
      open_hours: [],
      is_favorite: false,
      ...(cover ? ({ cover_photo: cover } as any) : {}),
    };
  }

  /* ---------- Navigation helpers ---------- */
  const openHostToilet = useCallback(
    (toiletId: id) => navigation.navigate(Routes.ToiletFormScreen, { toiletId }),
    [navigation]
  );

  // ✅ Limit create to 3
  const canAddMore = (toilets?.length ?? 0) < MAX_TOILETS;

  const createToilet = useCallback(() => {
    if (!canAddMore) {
      Alert.alert(
        "Limit reached",
        `You can create up to ${MAX_TOILETS} toilets. Delete an existing one to add a new toilet.`
      );
      return;
    }
    navigation.navigate(Routes.ToiletFormScreen, { toiletId: undefined });
  }, [navigation, canAddMore]);


  /* ---------- Logout ---------- */
  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          try { await api.post(buildRoute(ApiRoutes.auth.logout), {}, { authIfAvailable: true, skipAuthPromptOn401: true }); } catch { }
          await clearAuth(); // sets token=null & user=null
        },
      },
    ]);
  };

  /* ----------------------- Upgrade ----------------------- */
  const { upgradeToHost } = useAuthStore();
  const [upgrading, setUpgrading] = useState(false);

  const handleUpgradeToHost = useCallback(() => {
    Alert.alert(
      "Upgrade to Host",
      "You’ll be able to list toilets and access host tools. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Upgrade",
          onPress: async () => {
            try {
              setUpgrading(true);
              const updated = await upgradeToHost();
              setUpgrading(false);

              if (updated?.role_code?.toLowerCase() === "host") {
                Alert.alert("Success", "Your account is now a Host.");
                // Optionally refresh host data here if you're on the dashboard
                // await fetchMyToilets();
              } else {
                Alert.alert("Requested", "Upgrade requested. Please try again shortly.");
              }
            } catch (e: any) {
              setUpgrading(false);
              const msg = e?.response?.data?.message || e?.message || "Failed to upgrade.";
              Alert.alert("Upgrade failed", msg);
            }
          },
          style: "default",
        },
      ],
      { cancelable: true }
    );
  }, [upgradeToHost]);

  /* ---------- Render: loading user ---------- */
  if (loadingUser && !user) {
    return (
      <ScreenWrapper>
        <View style={[styles.center, { backgroundColor: T.bg.app }]}>
          <ActivityIndicator color={T.colors.primary} />
          <Text style={[styles.mute, { color: T.text.secondary }]}>Loading account…</Text>
        </View>
      </ScreenWrapper>
    );
  }

  /* ---------- Render: error ---------- */
  if (error) {
    return (
      <ScreenWrapper>
        <View style={[styles.center, { backgroundColor: T.bg.app }]}>
          <Text style={[styles.error, { color: T.colors.error }]}>{error}</Text>
          <Pressable
            onPress={refreshAll}
            android_ripple={{ color: withAlpha("#fff", 0.2) }}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: T.colors.primary, ...shadow(1) },
              pressableStyles(pressed),
            ]}
          >
            <Text style={{ color: T.text.onPrimary, fontWeight: "800" }}>Retry</Text>
          </Pressable>
        </View>
      </ScreenWrapper>
    );
  }

  /* ---------- Unauthenticated view ---------- */
  if (!isAuthed) {
    return (
      <ScreenWrapper>
        <View style={[styles.header]}>
          <Text style={[styles.title, { color: T.text.default }]}>Account</Text>
        </View>

        <View style={[styles.center, { flex: 1, backgroundColor: T.bg.app }]}>
          <View style={{ marginTop: -100, alignItems: 'center' }}>
            <Text style={[styles.mute, { color: T.text.secondary, textAlign: "center" }]}>
              You’re not logged in.
            </Text>
            <View style={{ height: S.sm }} />
            <Pressable
              onPress={async () => {
                const ok = await promptAuth();
                if (ok) {
                  await refreshAll(); // refetch user and host data
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
                  borderColor: T.border.subtle,
                  backgroundColor: T.bg.surface,
                  ...shadow(1),
                },
                pressed ? { opacity: 0.95, transform: [{ scale: 0.98 }] } : null,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Log in"
            >
              <Text style={{ color: T.text.strong as string, fontWeight: "800" }}>Log in</Text>
            </Pressable>
          </View>

        </View>
      </ScreenWrapper>
    );
  }

  /* ---------- Non-host view: show Upgrade button ---------- */
  if (!isHost) {
    return (
      <ScreenWrapper>
        <View style={[styles.header]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={[styles.title, { color: T.text.default }]}>Account</Text>

            <Pressable
              onPress={handleLogout}
              android_ripple={{ color: withAlpha("#000", 0.06) }}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: S.md,
                  paddingVertical: 8,
                  borderRadius: R.lg,
                  borderWidth: 1,
                  borderColor: T.border.subtle,
                  backgroundColor: T.bg.surface,
                  ...shadow(0),
                },
                pressed ? { opacity: 0.9, transform: [{ scale: 0.98 }] } : null,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Log out"
            >
              <LogOut size={16} color={T.text.strong as string} />
              <Text style={{ color: T.text.strong as string, fontWeight: "800" }}>Logout</Text>
            </Pressable>
          </View>

          <View style={{ height: S.xs }} />

          <ProfileCard user={user} />
        </View>

        <View style={[styles.center, { flex: 1, backgroundColor: T.bg.app, paddingTop: 0 }]}>
          <View style={{ marginTop: -100 }}>
            <Text style={[styles.mute, { color: T.text.secondary, textAlign: "center" }]}>
              This area is for <Text style={{ fontWeight: "800", color: T.text.strong }}>Hosts</Text>.
            </Text>
            <View style={{ height: S.sm }} />
            <Pressable
              onPress={handleUpgradeToHost}
              disabled={upgrading}
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
                  borderColor: T.border.subtle,
                  backgroundColor: T.bg.surface,
                  opacity: upgrading ? 0.7 : 1,
                  ...shadow(1),
                },
                pressed ? { opacity: 0.95, transform: [{ scale: 0.98 }] } : null,
              ]}
            >
              <Text style={{ color: T.text.strong as string, fontWeight: "800" }}>
                {upgrading ? "Upgrading…" : "Upgrade to host"}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  /* ---------- Host view ---------- */
  return (
    <ScreenWrapper>
      <View style={[styles.header, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
        <Text style={[styles.title, { color: T.text.default }]}>Host dashboard</Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {/* Logout */}
          <Pressable
            onPress={handleLogout}
            android_ripple={{ color: withAlpha("#000", 0.06) }}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: S.md,
                paddingVertical: 8,
                borderRadius: R.md,
                borderWidth: 1,
                borderColor: T.border.subtle,
                backgroundColor: T.bg.surface,
                ...shadow(0),
              },
              pressed ? { opacity: 0.9, transform: [{ scale: 0.98 }] } : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Log out"
          >
            <LogOut size={16} color={T.text.strong as string} />
            <Text style={{ color: T.text.strong as string, fontWeight: "800" }}>Logout</Text>
          </Pressable>
        </View>
      </View>
      <FlatList
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 12 }}>
            <View style={{ height: S.md }} />
            <ProfileCard user={user} />

            <View style={{ height: S.lg }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: T.text.default }]}>My toilets</Text>
              </View>

              <View style={{ flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
                <Text style={{ color: T.text.tertiary, ...T.typography.label }}>
                  {toilets.length}/{MAX_TOILETS} toilets used
                </Text>
                <Pressable
                  onPress={createToilet}
                  disabled={!canAddMore}
                  android_ripple={{ color: withAlpha("#000", 0.06) }}
                  style={({ pressed }) => [
                    {
                      height: 34,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: 'center',
                      alignSelf: 'flex-end',
                      gap: 2,
                      paddingHorizontal: S.sm,
                      borderRadius: R.md,
                      borderWidth: 1,
                      borderColor: T.border.subtle,
                      backgroundColor: T.bg.surface,
                      opacity: canAddMore ? 1 : 0.6, // 🔒 dim when disabled
                      ...shadow(1),
                    },
                    pressed && canAddMore ? { opacity: 0.95, transform: [{ scale: 0.98 }] } : null,
                  ]}
                >
                  {canAddMore 
                    ? <Plus size={16} color={T.text.strong as string} />
                    : <Text style={{ color: T.text.strong as string, ...T.typography.label }}>Limit reached </Text>
                  }
                </Pressable>
              </View>

            </View>
          </View>
        }
        data={toilets}
        keyExtractor={(item) => String(item?.id ?? Math.random())}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: S.md, paddingTop: S.sm }}>
            <ToiletCard item={toCardItem(item)} onPress={() => openHostToilet(item.id ?? 0)} />
          </View>
        )}
        ListEmptyComponent={
          loadingToilets ? (
            <View style={[styles.center]}>
              <ActivityIndicator color={T.colors.primary} />
              <Text style={[styles.mute, { color: T.text.secondary }]}>Loading your toilets…</Text>
            </View>
          ) : (
            <View style={[styles.center]}>
              <Text style={[styles.mute, { color: T.text.secondary }]}>No toilets yet.</Text>
              <View style={{ height: S.sm }} />
              <Pressable
                onPress={createToilet}
                disabled={!canAddMore}
                android_ripple={{ color: withAlpha("#000", 0.06) }}
                style={({ pressed }) => [
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    paddingHorizontal: S.md,
                    paddingVertical: 12,
                    borderRadius: R.lg,
                    borderWidth: 1,
                    borderColor: T.border.subtle,
                    backgroundColor: T.bg.surface,
                    opacity: canAddMore ? 1 : 0.6,
                    ...shadow(1),
                  },
                  pressed && canAddMore ? { opacity: 0.95, transform: [{ scale: 0.98 }] } : null,
                ]}
              >
                <Plus size={16} color={T.text.strong as string} />
                <Text style={{ color: T.text.strong as string, fontWeight: "800" }}>
                  {canAddMore ? "Add toilet" : "Limit reached"}
                </Text>
              </Pressable>
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshAll}
            colors={[T.colors.primary as string]}
            tintColor={T.colors.primary as string}
            progressBackgroundColor={T.bg.surface as string}
          />
        }
        contentContainerStyle={{ paddingBottom: S.xl, backgroundColor: T.bg.app }}
      />
    </ScreenWrapper>
  );
};

export default HostDashboardScreen;

export const ProfileCard = ({ user }: { user?: UserType | null }) => {
  const navigation: any = useNavigation();

  return (
    <View
      style={{
        backgroundColor: T.bg.surface,
        borderRadius: R.xl,
        padding: S.lg,
        borderWidth: 1,
        borderColor: T.border.subtle,
        ...shadow(1),
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: T.text.default }}>
            {user?.name}
          </Text>

          {!!user?.phone && (
            <Text
              style={{
                color: T.text.secondary,
                marginTop: 2,
                ...Typography.label,
              }}
            >
              {user.phone}
            </Text>
          )}

          <Text
            style={{
              color: T.text.tertiary,
              marginTop: 2,
              fontSize: 12,
            }}
          >
            Role: {user?.role_code ?? "user"}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate(Routes.EditProfileScreen)}
          activeOpacity={0.85}
          style={{
            height: 38,
            width: 38,
            borderRadius: R.md,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: T.border.subtle,
            backgroundColor: T.bg.surface,
            ...shadow(0),
          }}
        >
          <Pencil size={18} color={T.text.strong as string} />
        </TouchableOpacity>
      </View>
    </View>
  );
};


/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  header: { paddingHorizontal: S.md, paddingTop: S.sm, paddingBottom: S.xs },
  title: { fontSize: 20, fontWeight: "800" },
  sectionTitle: { fontSize: 16, fontWeight: "800" },

  center: { alignItems: "center", justifyContent: "center", padding: S["xxl"] },
  mute: { marginTop: 8, textAlign: "center" },

  button: {
    marginTop: S.md,
    borderRadius: R.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  error: { textAlign: "center" },
});
