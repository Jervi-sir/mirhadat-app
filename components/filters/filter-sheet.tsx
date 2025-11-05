import React, { useState, useEffect, useMemo } from "react";
import { View, Text, Switch, Pressable, TextInput, ActivityIndicator } from "react-native";
import ActionSheet, { ActionSheetRef } from "react-native-actions-sheet";
import api from "@/utils/axios-instance";
import { ApiRoutes, buildRoute } from "@/utils/api";
import { ToiletFilters } from "@/zustand/discover-store";

/* ----------------------------- Types ----------------------------- */
type Lang = "en" | "fr" | "ar";

type TaxonomyRow = {
  code: string;
  label: string;
  icon?: string | null;
};

type TaxonomyAllResp = {
  data: {
    categories?: TaxonomyRow[];
    access_methods?: TaxonomyRow[];
    amenities?: TaxonomyRow[];
    rules?: TaxonomyRow[];
    // wilayas?: ...
  };
};

/* --------------------------- Taxonomy hook --------------------------- */
function useTaxonomyAll({
  taxonomyUrl = buildRoute(ApiRoutes.taxonomy),
  lang = "fr",
  q = "",
  enabled = true,
}: {
  taxonomyUrl?: string;
  lang?: Lang;
  q?: string;
  enabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const [data, setData] = useState<TaxonomyAllResp["data"] | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const ctrl = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await api.get<TaxonomyAllResp>(taxonomyUrl, {
          params: { type: "all", lang, q: q || undefined },
          signal: ctrl.signal as any,
        });
        if (!cancelled) setData(res.data.data);
      } catch (e) {
        if (!cancelled) setErr(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [taxonomyUrl, lang, q, enabled]);

  return {
    loading,
    err,
    categories: data?.categories ?? [],
    accessMethods: data?.access_methods ?? [],
    amenities: data?.amenities ?? [],
    rules: data?.rules ?? [],
    refetchEnabled: (v: boolean) => {}, // kept simple; could expose a setter if you want open-on-demand fetching
  };
}

/* --------------------------- Filter Sheet --------------------------- */
export function FilterSheet({
  sheetRef,
  initial,
  onApply,
  taxonomyUrl = buildRoute(ApiRoutes.taxonomy),
  lang = "fr",
}: {
  sheetRef: React.RefObject<ActionSheetRef>;
  initial: ToiletFilters;
  onApply: (f: ToiletFilters) => void;
  taxonomyUrl?: string;
  lang?: Lang;
}) {
  const [isFree, setIsFree] = useState<boolean | undefined>(initial.isFree);
  const [accessMethod, setAccessMethod] = useState<ToiletFilters["accessMethod"]>(initial.accessMethod);
  const [pricingModel, setPricingModel] = useState<ToiletFilters["pricingModel"]>(initial.pricingModel);
  const [minRating, setMinRating] = useState<number | undefined>(initial.minRating);

  // CHANGE: keep amenities as string[] to match taxonomy chips cleanly
  const [amenities, setAmenities] = useState<string[]>(initial.amenities ?? []);

  // Fallback text input buffer (used only if taxonomy fails)
  const [amenitiesText, setAmenitiesText] = useState<string>(initial.amenities?.join(",") || "");

  // Fetch taxonomy once (on mount). If you prefer only when opening, you can add a flag you set in onOpen.
  const { loading, err, accessMethods, amenities: amenityOptions } = useTaxonomyAll({
    taxonomyUrl,
    lang,
    enabled: true,
  });

  useEffect(() => {
    setIsFree(initial.isFree);
    setAccessMethod(initial.accessMethod);
    setPricingModel(initial.pricingModel);
    setMinRating(initial.minRating);
    setAmenities(initial.amenities ?? []);
    setAmenitiesText(initial.amenities?.join(",") || "");
  }, [initial]);

  const apply = () => {
    const finalAmenities = err
      ? // if taxonomy failed, use the text input
        amenitiesText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : amenities;

    onApply({
      isFree,
      accessMethod,
      pricingModel,
      minRating,
      amenities: finalAmenities,
    });
    sheetRef.current?.hide();
  };

  // Map taxonomy objects to chip options
  const accessMethodOptions = useMemo(
    () => accessMethods.map((r) => ({ code: r.code, label: r.label })),
    [accessMethods]
  );

  const amenityChipOptions = useMemo(
    () => amenityOptions.map((r) => ({ code: r.code, label: r.label })),
    [amenityOptions]
  );

  return (
    <ActionSheet
      ref={sheetRef}
      gestureEnabled
      closeOnTouchBackdrop
      drawUnderStatusBar
      defaultOverlayOpacity={0.3}
      containerStyle={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
      indicatorStyle={{ width: 60, height: 5, borderRadius: 3, backgroundColor: "#111" }}
      safeAreaInsets={{
        top: 100, bottom: 0, left: 0, right: 0
      }}
    >
      <View style={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: "700" }}>
          {lang === "fr" ? "Filtres" : lang === "ar" ? "تصفية" : "Filters"}
        </Text>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text>{lang === "fr" ? "Gratuit uniquement" : lang === "ar" ? "مجاني فقط" : "Free only"}</Text>
          <Switch 
            value={!!isFree} onValueChange={(v) => setIsFree(v)} 
            thumbColor={'#43a047'}
          />
        </View>

        <View>
          <Text style={{ marginBottom: 6 }}>
            {lang === "fr" ? "Méthode d’accès" : lang === "ar" ? "طريقة الوصول" : "Access method"}
          </Text>

          {loading ? (
            <View style={{ paddingVertical: 10 }}>
              <ActivityIndicator />
            </View>
          ) : err ? (
            // Fallback to your old static list if API failed
            <RowChips
              options={[
                { code: "public", label: "Public" },
                { code: "code", label: "Door code" },
                { code: "staff", label: "Ask staff" },
                { code: "key", label: "Key required" },
                { code: "app", label: "App controlled" },
              ]}
              value={accessMethod ?? undefined}
              onChange={(v) => setAccessMethod(v as any)}
              allowUnset
            />
          ) : (
            <RowChips
              options={accessMethodOptions}
              value={accessMethod ?? undefined}
              onChange={(v) => setAccessMethod(v as any)}
              allowUnset
            />
          )}
        </View>

        <View>
          <Text style={{ marginBottom: 6 }}>
            {lang === "fr" ? "Modèle de tarification" : lang === "ar" ? "نموذج التسعير" : "Pricing model"}
          </Text>
          {/* Pricing model isn't in taxonomy; keep your static list */}
          <RowChips
            options={[
              { code: "flat", label: "Flat" },
              { code: "per-visit", label: "Per visit" },
              { code: "per-30-min", label: "Per 30 min" },
              { code: "per-60-min", label: "Per 60 min" },
            ]}
            value={pricingModel || undefined}
            onChange={(v) => setPricingModel((v as any) ?? null)}
            allowUnset
          />
        </View>

        <View>
          <Text style={{ marginBottom: 6 }}>
            {lang === "fr" ? "Note minimale (0–5)" : lang === "ar" ? "أدنى تقييم (0–5)" : "Min rating (0–5)"}
          </Text>
          <TextInput
            keyboardType="numeric"
            placeholder="e.g. 3.5"
            value={minRating != null ? String(minRating) : ""}
            onChangeText={(t) => setMinRating(t ? Number(t) : undefined)}
            style={{
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 8,
            }}
          />
        </View>

        <View>
          <Text style={{ marginBottom: 6 }}>
            {lang === "fr" ? "Équipements" : lang === "ar" ? "التجهيزات" : "Amenities"}
          </Text>

          {loading ? (
            <View style={{ paddingVertical: 10 }}>
              <ActivityIndicator />
            </View>
          ) : err ? (
            // Fallback to your old text input if taxonomy failed
            <TextInput
              placeholder="paper, soap, bidet"
              value={amenitiesText}
              onChangeText={setAmenitiesText}
              style={{
                borderWidth: 1,
                borderColor: "#ddd",
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 8,
              }}
            />
          ) : (
            <MultiChips
              options={amenityChipOptions}
              values={amenities}
              onToggle={(code, active) =>
                setAmenities((prev) =>
                  active ? [...prev, code] : prev.filter((c) => c !== code)
                )
              }
            />
          )}
        </View>

        <Pressable
          onPress={apply}
          style={{
            backgroundColor: "#111",
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: "center",
            marginTop: 6,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>
            {lang === "fr" ? "Appliquer" : lang === "ar" ? "تطبيق" : "Apply"}
          </Text>
        </Pressable>
      </View>
    </ActionSheet>
  );
}

/* ----------------------------- Chips ----------------------------- */

function RowChips({
  options,
  value,
  onChange,
  allowUnset,
}: {
  options: { code: string; label: string }[];
  value?: string;
  onChange: (v?: string) => void;
  allowUnset?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt) => {
        const active = value === opt.code;
        return (
          <Pressable
            key={opt.code}
            onPress={() => onChange(active && allowUnset ? undefined : opt.code)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: active ? "#111" : "#ccc",
              backgroundColor: active ? "#111" : "#fff",
            }}
          >
            <Text style={{ color: active ? "#fff" : "#111" }}>{opt.label}</Text>
          </Pressable>
        );
      })}
      {allowUnset && (
        <Pressable
          onPress={() => onChange(undefined)}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: value ? "#ccc" : "#111",
            backgroundColor: value ? "#fff" : "#111",
          }}
        >
          <Text style={{ color: value ? "#111" : "#fff" }}>
            Any
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function MultiChips({
  options,
  values,
  onToggle,
}: {
  options: { code: string; label: string }[];
  values: string[];
  onToggle: (code: string, nextActive: boolean) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt) => {
        const active = values.includes(opt.code);
        return (
          <Pressable
            key={opt.code}
            onPress={() => onToggle(opt.code, !active)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: active ? "#111" : "#ccc",
              backgroundColor: active ? "#111" : "#fff",
            }}
          >
            <Text style={{ color: active ? "#fff" : "#111" }}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
