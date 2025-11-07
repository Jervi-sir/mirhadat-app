import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, TextStyle, View, ViewStyle } from "react-native";
import ActionSheet, { ActionSheetRef } from "react-native-actions-sheet";
import api from "@/utils/api/axios-instance";
import { ApiRoutes, buildRoute } from "@/utils/api/api";
import { WilayaType } from "@/utils/types";
import { theme as T, T as Typography, S, R, shadow, pressableStyles, withAlpha } from "@/ui/theme";

/* ---------- Types ---------- */
type ID = number;
type ISODateTime = string;
type Scope = "all" | "with_toilets";
type Lang = "en" | "fr" | "ar";
type Status = "pending" | "active" | "suspended";

/** API adds a computed display label */
type WilayaApi = WilayaType & { label: string; toilets_count?: number | null };
type ApiResp<T> = { data: T };

/* ---------- Helpers ---------- */
function nameByLang(w: WilayaType, lang: Lang) {
  if (lang === "fr") return w.fr ?? w.en ?? w.ar ?? w.code;
  if (lang === "en") return w.en ?? w.fr ?? w.ar ?? w.code;
  return w.ar ?? w.fr ?? w.en ?? w.code;
}

function computeLabelFromWilaya(w: WilayaType, lang: Lang) {
  const name = nameByLang(w, lang);
  return `${w.number} - ${name}`;
}

export default function WilayaPicker({
  value, // FULL OBJECT or null/undefined for "All"
  onChangeWilaya, // (wilaya?: WilayaApi) -> undefined means "All"
  placeholder = "Select wilaya",
  includeAll = false,
  allLabel,
  triggerStyle,
  triggerTextStyle,
  lang = "fr",
  scope = "with_toilets",
  status = "active",
  withCounts = false,
  taxonomyUrl = buildRoute(ApiRoutes.taxonomy),
}: {
  value?: WilayaType | null;
  onChangeWilaya?: (wilaya?: WilayaApi) => void;

  placeholder?: string;
  includeAll?: boolean;
  allLabel?: string;
  triggerStyle?: ViewStyle;
  triggerTextStyle?: TextStyle;
  lang?: Lang;
  scope?: Scope;
  status?: Status;
  withCounts?: boolean;
  taxonomyUrl?: string;
}) {
  const sheetRef = useRef<ActionSheetRef>(null);
  const listRef = useRef<FlatList<{ id?: ID; label: string; number?: number; code?: string }>>(null);

  const [rows, setRows] = useState<WilayaApi[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const [hasOpened, setHasOpened] = useState(false);

  const [qInternal, setQInternal] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQ(qInternal.trim()), 250);
    return () => clearTimeout(t);
  }, [qInternal]);

  // Trigger label
  const [displayLabel, setDisplayLabel] = useState<string | null>(null);
  const labelCache = useRef(new Map<ID, string>());
  const wilayaById = useRef(new Map<ID, WilayaApi>());

  // Seed label immediately from provided value
  useEffect(() => {
    if (value) {
      const label = computeLabelFromWilaya(value, lang);
      labelCache.current.set(value.id, label);
      setDisplayLabel(label);
    } else {
      setDisplayLabel(includeAll ? (allLabel ?? (lang === "fr" ? "Toutes les wilayas" : "All wilayas")) : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.id, lang, includeAll, allLabel]);

  // Keep displayLabel in sync when rows arrive or language changes
  useEffect(() => {
    if (!value) {
      setDisplayLabel(includeAll ? (allLabel ?? (lang === "fr" ? "Toutes les wilayas" : "All wilayas")) : null);
      return;
    }
    const cached = labelCache.current.get(value.id);
    if (cached) {
      setDisplayLabel(cached);
      return;
    }
    const inRows = rows.find((r) => r.id === value.id);
    if (inRows) {
      labelCache.current.set(inRows.id, inRows.label);
      setDisplayLabel(inRows.label);
    } else {
      const recomputed = computeLabelFromWilaya(value, lang);
      labelCache.current.set(value.id, recomputed);
      setDisplayLabel(recomputed);
    }
  }, [value, rows, includeAll, allLabel, lang]);

  const listData = useMemo(() => {
    const base = rows.map((r) => ({
      id: r.id as ID | undefined,
      label: `${r.number} - ${r.label}`,
      number: r.number,
      code: r.code,
    }));
    if (!includeAll) return base;
    const top = allLabel ?? (lang === "fr" ? "Toutes les wilayas" : "All wilayas");
    return [{ id: undefined, label: top }, ...base];
  }, [rows, includeAll, allLabel, lang]);

  const fetchWilayas = async (signal?: AbortSignal) => {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.get<ApiResp<WilayaApi[]>>(taxonomyUrl, {
        params: {
          type: "wilayas",
          scope,
          status,
          with_counts: withCounts ? "1" : "0",
          lang,
          q: q || undefined,
        },
        signal: signal as any,
      });

      const data = res.data.data;
      setRows(data);
      for (const r of data) {
        if (!labelCache.current.has(r.id)) labelCache.current.set(r.id, r.label);
        wilayaById.current.set(r.id, r);
      }
    } catch (e) {
      setErr(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    sheetRef.current?.show();
    if (!hasOpened) {
      setHasOpened(true);
      const ctrl = new AbortController();
      fetchWilayas(ctrl.signal);
    }
  };

  useEffect(() => {
    if (!hasOpened) return;
    const ctrl = new AbortController();
    fetchWilayas(ctrl.signal);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, lang, scope, status, withCounts, taxonomyUrl]);

  // ----- Selected visuals & auto-scroll -----
  const isSelected = (id: ID | undefined) =>
    (id == null && !value && includeAll) || (id != null && value?.id === id);

  const selectedIndex = useMemo(() => {
    return listData.findIndex((item) => isSelected(item.id as ID | undefined));
  }, [listData, value?.id, includeAll]);

  useEffect(() => {
    if (selectedIndex > -1 && listRef.current) {
      const t = setTimeout(() => {
        try {
          listRef.current?.scrollToIndex({ index: selectedIndex, animated: true });
        } catch {}
      }, 50);
      return () => clearTimeout(t);
    }
  }, [selectedIndex, listData.length, hasOpened]);

  const chooseWilaya = (id?: ID) => {
    if (id == null) {
      setDisplayLabel(allLabel ?? (lang === "fr" ? "Toutes les wilayas" : "All wilayas"));
      onChangeWilaya?.(undefined);
      sheetRef.current?.hide();
      return;
    }

    const w = wilayaById.current.get(id) ?? rows.find((r) => r.id === id);
    if (w) {
      labelCache.current.set(id, w.label);
      setDisplayLabel(w.label);
      onChangeWilaya?.(w);
    }
    sheetRef.current?.hide();
  };

  return (
    <>
      {/* Trigger */}
      <Pressable
        onPress={handleOpen}
        android_ripple={{ color: T.state.ripple }}
        style={({ pressed }) => [
          {
            paddingHorizontal: S.lg,
            borderRadius: R.lg,
            borderWidth: 1,
            borderColor: T.border.subtle,
            backgroundColor: T.bg.surface,
            minHeight: 44,
            justifyContent: "center",
            ...shadow(0),
          },
          pressableStyles(pressed),
          triggerStyle,
        ]}
      >
        <Text style={[{ color: T.text.strong, ...Typography.label, fontWeight: displayLabel ? 600 : 500 }, triggerTextStyle]}>
          {displayLabel ?? placeholder}
        </Text>
      </Pressable>

      {/* Sheet */}
      <ActionSheet
        ref={sheetRef}
        gestureEnabled
        closeOnTouchBackdrop
        drawUnderStatusBar
        defaultOverlayOpacity={0.3}
        containerStyle={{
          height: "70%",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          backgroundColor: T.bg.surface,
          borderTopWidth: 1,
          borderColor: T.border.subtle,
        }}
        indicatorStyle={{
          width: 60,
          height: 5,
          borderRadius: 3,
          backgroundColor: withAlpha(T.text.default, 0.2),
        }}
      >
        <View style={{ padding: S.lg, gap: S.md }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: T.text.default }}>
            {lang === "fr" ? "Choisir la wilaya" : "Choose wilaya"}
          </Text>

          {/* Search (optional). Uncomment to enable */}
          {/* <TextInput
            placeholder={lang === "fr" ? "Rechercher..." : "Search..."}
            placeholderTextColor={T.text.tertiary}
            value={qInternal}
            onChangeText={setQInternal}
            style={{
              borderWidth: 1,
              borderColor: T.border.subtle,
              borderRadius: R.lg,
              paddingHorizontal: S.lg,
              paddingVertical: 10,
              backgroundColor: T.bg.surface,
              color: T.text.default,
            }}
          /> */}

          {loading ? (
            <View style={{ paddingVertical: S.lg }}>
              <ActivityIndicator color={T.colors.primary} />
            </View>
          ) : err ? (
            <View style={{ paddingVertical: S.lg, alignItems: "center", gap: S.sm }}>
              <Text style={{ color: T.text.secondary }}>
                {lang === "fr" ? "Échec du chargement." : "Failed to load. Check connection."}
              </Text>
              <Pressable
                onPress={() => fetchWilayas()}
                android_ripple={{ color: withAlpha("#fff", 0.15) }}
                style={({ pressed }) => [
                  {
                    paddingHorizontal: S.lg,
                    paddingVertical: S.sm,
                    borderRadius: R.lg,
                    backgroundColor: T.colors.primary,
                    ...shadow(1),
                  },
                  pressableStyles(pressed),
                ]}
              >
                <Text style={{ color: T.text.onPrimary, fontWeight: "700" }}>
                  {lang === "fr" ? "Réessayer" : "Retry"}
                </Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={listData}
              keyExtractor={(item) => String(item.id ?? "all")}
              ItemSeparatorComponent={() => (
                <View style={{ height: 1, backgroundColor: T.border.subtle }} />
              )}
              getItemLayout={(_, index) => ({ length: 48, offset: 48 * index, index })}
              initialNumToRender={20}
              renderItem={({ item }) => {
                const selected = isSelected(item.id as ID | undefined);
                return (
                  <Pressable
                    onPress={() => chooseWilaya(item.id as ID | undefined)}
                    android_ripple={{ color: T.state.ripple }}
                    style={({ pressed }) => [
                      {
                        paddingVertical: 12,
                        paddingHorizontal: 4,
                        backgroundColor: selected ? withAlpha(T.colors.primary, 0.08) : "transparent",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderRadius: R.md,
                      },
                      pressableStyles(pressed),
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: selected ? (600 as const) : (400 as const),
                        color: selected ? T.colors.primary : T.text.default,
                      }}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                    {selected ? (
                      <Text style={{ fontSize: 16, color: T.colors.primary }}>✓</Text>
                    ) : null}
                  </Pressable>
                );
              }}
              ListFooterComponent={<View style={{ height: 120 }} />}
            />
          )}
        </View>
      </ActionSheet>
    </>
  );
}
