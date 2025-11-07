import React, { useState, useEffect, useMemo } from "react";
import { View, Text, Switch, Pressable, TextInput, ActivityIndicator } from "react-native";
import ActionSheet, { ActionSheetRef, ScrollView } from "react-native-actions-sheet";
import api from "@/utils/api/axios-instance";
import { ApiRoutes, buildRoute } from "@/utils/api/api";
import { ToiletFilters } from "@/zustand/discover-store";
import { theme as T, S, R, withAlpha, shadow, pressableStyles } from "@/ui/theme";

/* ----------------------------- Types ----------------------------- */
type Lang = "en" | "fr" | "ar";

type TaxonomyRow = { code: string; label: string; icon?: string | null };
type TaxonomyAllResp = {
  data: {
    categories?: TaxonomyRow[];
    access_methods?: TaxonomyRow[];
    amenities?: TaxonomyRow[];
    rules?: TaxonomyRow[];
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
  const [amenities, setAmenities] = useState<string[]>(initial.amenities ?? []);
  const [amenitiesText, setAmenitiesText] = useState<string>(initial.amenities?.join(",") || "");

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
      ? amenitiesText.split(",").map((s) => s.trim()).filter(Boolean)
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
      defaultOverlayOpacity={0.3}
      containerStyle={{
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
      safeAreaInsets={{ top: 100, bottom: 0, left: 0, right: 0 }}
    >
      <ScrollView>

        <View style={{ padding: S.lg, gap: S.md }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: T.text.default }}>
            {lang === "fr" ? "Filtres" : lang === "ar" ? "تصفية" : "Filters"}
          </Text>

          {/* Free only */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: S.xs }}>
            <Text style={{ color: T.text.strong }}>
              {lang === "fr" ? "Gratuit uniquement" : lang === "ar" ? "مجاني فقط" : "Free only"}
            </Text>
            <Switch
              value={!!isFree}
              onValueChange={(v) => setIsFree(v)}
              trackColor={{ false: withAlpha(T.text.default, 0.2), true: withAlpha(T.colors.primary, 0.45) }}
              thumbColor={!!isFree ? T.colors.primary : "#f4f3f4"}
            />
          </View>

          {/* Access method */}
          <SectionLabel text={lang === "fr" ? "Méthode d’accès" : lang === "ar" ? "طريقة الوصول" : "Access method"} />
          {loading ? (
            <View style={{ paddingVertical: S.sm }}>
              <ActivityIndicator color={T.colors.primary} />
            </View>
          ) : err ? (
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

          {/* Pricing model */}
          <SectionLabel text={lang === "fr" ? "Modèle de tarification" : lang === "ar" ? "نموذج التسعير" : "Pricing model"} />
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

          {/* Min rating */}
          <SectionLabel text={lang === "fr" ? "Note minimale (0–5)" : lang === "ar" ? "أدنى تقييم (0–5)" : "Min rating (0–5)"} />
          <TextInput
            keyboardType="numeric"
            placeholder="e.g. 3.5"
            placeholderTextColor={T.text.tertiary}
            value={minRating != null ? String(minRating) : ""}
            onChangeText={(t) => setMinRating(t ? Number(t) : undefined)}
            style={{
              borderWidth: 1,
              borderColor: T.border.subtle,
              borderRadius: R.lg,
              paddingHorizontal: S.lg,
              paddingVertical: 10,
              backgroundColor: T.bg.surface,
              color: T.text.default,
            }}
          />

          {/* Amenities */}
          <SectionLabel text={lang === "fr" ? "Équipements" : lang === "ar" ? "التجهيزات" : "Amenities"} />
          {loading ? (
            <View style={{ paddingVertical: S.sm }}>
              <ActivityIndicator color={T.colors.primary} />
            </View>
          ) : err ? (
            <TextInput
              placeholder="paper, soap, bidet"
              placeholderTextColor={T.text.tertiary}
              value={amenitiesText}
              onChangeText={setAmenitiesText}
              style={{
                borderWidth: 1,
                borderColor: T.border.subtle,
                borderRadius: R.lg,
                paddingHorizontal: S.lg,
                paddingVertical: 10,
                backgroundColor: T.bg.surface,
                color: T.text.default,
              }}
            />
          ) : (
            <MultiChips
              options={amenityChipOptions}
              values={amenities}
              onToggle={(code, active) =>
                setAmenities((prev) => (active ? [...prev, code] : prev.filter((c) => c !== code)))
              }
            />
          )}

          {/* Apply */}
          <Pressable
            onPress={apply}
            android_ripple={{ color: withAlpha("#fff", 0.2) }}
            style={({ pressed }) => [
              {
                backgroundColor: T.colors.primary,
                paddingVertical: 12,
                borderRadius: R.xl,
                alignItems: "center",
                marginTop: S.sm,
                ...shadow(1),
              },
              pressableStyles(pressed),
            ]}
          >
            <Text style={{ color: T.text.onPrimary, fontWeight: "800" }}>
              {lang === "fr" ? "Appliquer" : lang === "ar" ? "تطبيق" : "Apply"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

    </ActionSheet>
  );
}

/* ----------------------------- Subcomponents ----------------------------- */

function SectionLabel({ text }: { text: string }) {
  return <Text style={{ marginBottom: 6, color: T.text.strong, fontWeight: "700" }}>{text}</Text>;
}

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
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.sm }}>
      {options.map((opt) => {
        const active = value === opt.code;
        return (
          <Pressable
            key={opt.code}
            onPress={() => onChange(active && allowUnset ? undefined : opt.code)}
            android_ripple={{ color: T.state.ripple }}
            style={({ pressed }) => [
              {
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: R.pill,
                borderWidth: 1,
                borderColor: active ? withAlpha(T.colors.primary, 0.7) : T.border.subtle,
                backgroundColor: active ? withAlpha(T.colors.primary, 0.12) : T.bg.surface,
              },
              pressableStyles(pressed),
            ]}
          >
            <Text style={{ color: active ? T.colors.primary : T.text.strong, fontWeight: "700" }}>{opt.label}</Text>
          </Pressable>
        );
      })}
      {allowUnset && (
        <Pressable
          onPress={() => onChange(undefined)}
          android_ripple={{ color: T.state.ripple }}
          style={({ pressed }) => [
            {
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: R.pill,
              borderWidth: 1,
              borderColor: value ? T.border.subtle : withAlpha(T.colors.primary, 0.7),
              backgroundColor: value ? T.bg.surface : withAlpha(T.colors.primary, 0.12),
            },
            pressableStyles(pressed),
          ]}
        >
          <Text style={{ color: value ? T.text.strong : T.colors.primary, fontWeight: "700" }}>Any</Text>
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
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.sm }}>
      {options.map((opt) => {
        const active = values.includes(opt.code);
        return (
          <Pressable
            key={opt.code}
            onPress={() => onToggle(opt.code, !active)}
            android_ripple={{ color: T.state.ripple }}
            style={({ pressed }) => [
              {
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: R.pill,
                borderWidth: 1,
                borderColor: active ? withAlpha(T.colors.primary, 0.7) : T.border.subtle,
                backgroundColor: active ? withAlpha(T.colors.primary, 0.12) : T.bg.surface,
              },
              pressableStyles(pressed),
            ]}
          >
            <Text style={{ color: active ? T.colors.primary : T.text.strong, fontWeight: "700" }}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
