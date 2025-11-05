import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";
import ActionSheet, { ActionSheetRef } from "react-native-actions-sheet";
import api from "@/utils/axios-instance";
import { ApiRoutes, buildRoute } from "@/utils/api";
import { WilayaType } from "@/utils/types";

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
  triggerStyle?: any;
  triggerTextStyle?: any;
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
      // Recompute (language may have changed)
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
    } else {
      // Shouldn't happen, but no-op if item not found
    }
    sheetRef.current?.hide();
  };

  return (
    <View>
      {/* Trigger */}
      <Pressable
        onPress={handleOpen}
        style={[
          {
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#ddd",
            backgroundColor: "#fff",
          },
          triggerStyle,
        ]}
      >
        <Text style={[{ fontWeight: "600" }, triggerTextStyle]}>
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
        containerStyle={{ height: "69%", borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
        indicatorStyle={{ width: 60, height: 5, borderRadius: 3, backgroundColor: "#111" }}
      >
        <View style={{ padding: 12, gap: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: "700" }}>
            {lang === "fr" ? "Choisir la wilaya" : "Choose wilaya"}
          </Text>
          {/* 
          <TextInput
            placeholder={lang === "fr" ? "Rechercher..." : "Search..."}
            value={qInternal}
            onChangeText={setQInternal}
            style={{
              borderWidth: 1,
              borderColor: "#e5e5e5",
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 8,
              backgroundColor: "#fff",
            }}
          /> */}

          {loading ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator />
            </View>
          ) : err ? (
            <View style={{ paddingVertical: 16, alignItems: "center", gap: 8 }}>
              <Text>{lang === "fr" ? "Échec du chargement." : "Failed to load. Check connection."}</Text>
              <Pressable
                onPress={() => fetchWilayas()}
                style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: "#111" }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>
                  {lang === "fr" ? "Réessayer" : "Retry"}
                </Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={listData}
              keyExtractor={(item) => String(item.id ?? "all")}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />}
              getItemLayout={(_, index) => ({ length: 48, offset: 48 * index, index })}
              initialNumToRender={20}
              renderItem={({ item }) => {
                const selected = isSelected(item.id as ID | undefined);
                return (
                  <Pressable
                    onPress={() => chooseWilaya(item.id as ID | undefined)}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 4,
                      backgroundColor: selected ? "#F2F8FF" : "transparent",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: selected ? ("700" as const) : ("400" as const) }}>
                      {item.label}
                    </Text>
                    {selected ? <Text style={{ fontSize: 16 }}>✓</Text> : null}
                  </Pressable>
                );
              }}
              ListFooterComponent={<View style={{ height: 120 }} />}
            />
          )}
        </View>
      </ActionSheet>
    </View>
  );
}
