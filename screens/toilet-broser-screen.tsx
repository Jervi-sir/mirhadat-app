// ToiletBrowseScreen.tsx
import { ApiRoutes, buildRoute } from "@/utils/api";
import api from "@/utils/axios-instance";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import ActionSheet, { ActionSheetRef } from "react-native-actions-sheet";
import { SafeAreaView } from "react-native-safe-area-context";

/* ---------- Types ---------- */
type ID = number;
type ISODateTime = string;
type AccessMethod = "public" | "code" | "staff" | "key" | "app";
type PricingModel = "flat" | "per-visit" | "per-30-min" | "per-60-min" | null;
type ToiletStatus = "pending" | "active" | "suspended";
type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface Wilaya {
  id: ID;
  code: string;
  number: number;
  label: string;
  lat?: number;
  lng?: number;
}
interface ToiletCategory {
  id: ID;
  code: string;
  icon: string | null;
  label: string;
}
interface StaticTaxItem {
  code: string;
  icon?: string | null;
  label: string;
}
interface Toilet {
  id: ID;
  ownerId: ID | null;
  toiletCategoryId: ID;
  name: string;
  description: string | null;
  phoneNumbers: string[] | null;
  lat: number;
  lng: number;
  addressLine: string;
  wilayaId: ID;
  placeHint: string | null;
  accessMethod: AccessMethod;
  capacity: number;
  isUnisex: boolean;
  amenities: string[] | null;
  rules: string[] | null;
  isFree: boolean;
  priceCents: number | null;
  pricingModel: PricingModel;
  status: ToiletStatus;
  avgRating: number;
  reviewsCount: number;
  photosCount: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/* ---------- Mock data while wiring ---------- */
const SEED_TOILETS: Toilet[] = [
  {
    id: 101,
    ownerId: null,
    toiletCategoryId: 2,
    name: "Café El Qahwa",
    description: "Clean small restroom inside the café",
    phoneNumbers: null,
    lat: 36.75,
    lng: 3.06,
    addressLine: "Rue Didouche Mourad",
    wilayaId: 16,
    placeHint: "Ask staff for key",
    accessMethod: "staff",
    capacity: 2,
    isUnisex: true,
    amenities: ["paper", "soap", "water"],
    rules: ["for_customers_only"],
    isFree: true,
    priceCents: null,
    pricingModel: null,
    status: "active",
    avgRating: 4.4,
    reviewsCount: 27,
    photosCount: 3,
    createdAt: "2025-10-01T10:00:00Z",
    updatedAt: "2025-11-01T11:00:00Z",
  },
  {
    id: 102,
    ownerId: null,
    toiletCategoryId: 1,
    name: "Bab Ezzouar Mall WC",
    description: "Large mall toilets, regular cleaning",
    phoneNumbers: null,
    lat: 36.705,
    lng: 3.183,
    addressLine: "Centre Commercial Bab Ezzouar",
    wilayaId: 16,
    placeHint: null,
    accessMethod: "public",
    capacity: 8,
    isUnisex: false,
    amenities: ["paper", "soap", "water", "dryers", "wheelchair", "baby_change"],
    rules: ["no_smoking"],
    isFree: true,
    priceCents: null,
    pricingModel: null,
    status: "active",
    avgRating: 4.1,
    reviewsCount: 87,
    photosCount: 9,
    createdAt: "2025-09-10T10:00:00Z",
    updatedAt: "2025-10-13T11:00:00Z",
  },
  {
    id: 103,
    ownerId: null,
    toiletCategoryId: 3,
    name: "Station El Bahia",
    description: "Paid, decent cleanliness, shattaf available",
    phoneNumbers: null,
    lat: 35.698,
    lng: -0.634,
    addressLine: "RN2, outskirts",
    wilayaId: 31,
    placeHint: "Cashier gives code",
    accessMethod: "code",
    capacity: 3,
    isUnisex: true,
    amenities: ["water", "bidet", "soap"],
    rules: [],
    isFree: false,
    priceCents: 50,
    pricingModel: "per-visit",
    status: "active",
    avgRating: 3.9,
    reviewsCount: 12,
    photosCount: 2,
    createdAt: "2025-07-10T10:00:00Z",
    updatedAt: "2025-10-13T11:00:00Z",
  },
  {
    id: 104,
    ownerId: null,
    toiletCategoryId: 4,
    name: "Public WC Place 1er Novembre",
    description: "Older facility, cheap, often busy",
    phoneNumbers: null,
    lat: 36.47,
    lng: 2.83,
    addressLine: "Centre-ville",
    wilayaId: 9,
    placeHint: null,
    accessMethod: "public",
    capacity: 4,
    isUnisex: false,
    amenities: ["water"],
    rules: ["no_smoking"],
    isFree: false,
    priceCents: 20,
    pricingModel: "per-visit",
    status: "active",
    avgRating: 3.4,
    reviewsCount: 44,
    photosCount: 1,
    createdAt: "2025-08-21T10:00:00Z",
    updatedAt: "2025-10-13T11:00:00Z",
  },
];

/* ---------- UI Bits ---------- */
const Chip = ({
  label,
  active,
  onPress,
  onLongPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}) => (
  <Pressable
    onPress={onPress}
    onLongPress={onLongPress}
    style={[styles.chip, active ? { backgroundColor: "#111" } : { backgroundColor: "#eee" }]}
  >
    <Text style={[styles.chipText, active ? { color: "white" } : { color: "#111" }]}>{label}</Text>
  </Pressable>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={{ marginBottom: 16 }}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const Badge = ({ text }: { text: string }) => (
  <View style={styles.badge}>
    <Text style={styles.badgeText}>{text}</Text>
  </View>
);

/* ---------- Main Screen ---------- */
export default function ToiletBrowseScreen() {
  const filtersRef = useRef<ActionSheetRef>(null);
  const wilayaRef = useRef<ActionSheetRef>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  const [loadingTax, setLoadingTax] = useState(true);
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [categories, setCategories] = useState<ToiletCategory[]>([]);
  const [accessMethods, setAccessMethods] = useState<StaticTaxItem[]>([]);
  const [amenities, setAmenities] = useState<StaticTaxItem[]>([]);
  const [rules, setRules] = useState<StaticTaxItem[]>([]);

  // filters
  const [selectedWilayaId, setSelectedWilayaId] = useState<ID | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<ID[]>([]);
  const [selectedAccess, setSelectedAccess] = useState<AccessMethod[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedRules, setSelectedRules] = useState<string[]>([]);

  const [toilets] = useState<Toilet[]>(SEED_TOILETS);

  // taxonomy load
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingTax(true);
      try {
        const res = await api.get(buildRoute(ApiRoutes.taxonomy), {
          params: { type: "all", with_counts: 0, scope: "all" },
        });
        if (!mounted) return;
        const d = res.data.data;
        setWilayas(d.wilayas ?? []);
        setCategories(d.categories ?? []);
        setAccessMethods(d.access_methods ?? []);
        setAmenities(d.amenities ?? []);
        setRules(d.rules ?? []);
      } catch {
        // keep empty if fails
      } finally {
        setLoadingTax(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 220);
    return () => clearTimeout(t);
  }, [search]);

  const categoryById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  );
  const wilayaById = useMemo(
    () => Object.fromEntries(wilayas.map((w) => [w.id, w])),
    [wilayas]
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch;
    return toilets.filter((t) => {
      if (selectedWilayaId && t.wilayaId !== selectedWilayaId) return false;
      if (selectedCategoryIds.length > 0 && !selectedCategoryIds.includes(t.toiletCategoryId))
        return false;
      if (selectedAccess.length > 0 && !selectedAccess.includes(t.accessMethod)) return false;
      if (selectedAmenities.length > 0) {
        const has = new Set(t.amenities ?? []);
        for (const a of selectedAmenities) if (!has.has(a)) return false;
      }
      if (selectedRules.length > 0) {
        const has = new Set(t.rules ?? []);
        for (const r of selectedRules) if (!has.has(r)) return false;
      }
      if (q.length > 0) {
        const hay = `${t.name} ${t.description ?? ""} ${t.addressLine}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    toilets,
    debouncedSearch,
    selectedWilayaId,
    selectedCategoryIds,
    selectedAccess,
    selectedAmenities,
    selectedRules,
  ]);

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; clear: () => void }[] = [];
    if (selectedWilayaId) {
      const w = wilayaById[selectedWilayaId];
      if (w) chips.push({ key: `wilaya:${w.id}`, label: w.label, clear: () => setSelectedWilayaId(null) });
    }
    if (selectedCategoryIds.length) {
      chips.push({
        key: "cats",
        label: `${selectedCategoryIds.length} category${selectedCategoryIds.length > 1 ? "ies" : ""}`,
        clear: () => setSelectedCategoryIds([]),
      });
    }
    if (selectedAccess.length) {
      chips.push({
        key: "access",
        label: `${selectedAccess.length} access`,
        clear: () => setSelectedAccess([]),
      });
    }
    if (selectedAmenities.length) {
      chips.push({
        key: "amenities",
        label: `${selectedAmenities.length} amenit${selectedAmenities.length > 1 ? "ies" : "y"}`,
        clear: () => setSelectedAmenities([]),
      });
    }
    if (selectedRules.length) {
      chips.push({
        key: "rules",
        label: `${selectedRules.length} rule${selectedRules.length > 1 ? "s" : ""}`,
        clear: () => setSelectedRules([]),
      });
    }
    return chips;
  }, [selectedWilayaId, selectedCategoryIds, selectedAccess, selectedAmenities, selectedRules, wilayaById]);

  const clearAll = () => {
    setSelectedWilayaId(null);
    setSelectedCategoryIds([]);
    setSelectedAccess([]);
    setSelectedAmenities([]);
    setSelectedRules([]);
  };

  const openFilters = () => {
    Keyboard.dismiss();
    filtersRef.current?.show();
  };

  const openWilayaPicker = () => {
    Keyboard.dismiss();
    wilayaRef.current?.show();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Find a restroom</Text>
        <Text style={styles.subtitle}>Search & filter nearby toilets</Text>

        <View style={styles.searchRow}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, address, description"
            placeholderTextColor="#777"
            style={styles.searchInput}
            returnKeyType="search"
          />
          <Pressable onPress={openFilters} style={styles.filterBtn}>
            <Text style={styles.filterBtnText}>Filters</Text>
          </Pressable>
        </View>

        {activeChips.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {activeChips.map((c) => (
              <Chip key={c.key} label={c.label} active onPress={c.clear} />
            ))}
            <Chip label="Clear all" onPress={clearAll} />
          </ScrollView>
        )}
      </View>

      <View style={styles.content}>
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          ListHeaderComponent={
            <Text style={styles.resultsCount}>
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </Text>
          }
          renderItem={({ item }) => {
            const cat = categoryById[item.toiletCategoryId];
            const wil = wilayaById[item.wilayaId];
            return (
              <View style={styles.card}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.rating}>★ {item.avgRating.toFixed(1)}</Text>
                </View>
                <Text style={styles.cardMeta}>
                  {cat ? cat.label : "—"} • {wil ? wil.label : "—"}
                </Text>
                <Text style={styles.addr}>{item.addressLine}</Text>
                {item.description ? (
                  <Text style={styles.desc} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}

                <View style={styles.badgeRow}>
                  <Badge text={item.accessMethod} />
                  {item.isFree ? (
                    <Badge text="Free" />
                  ) : (
                    <Badge
                      text={
                        item.priceCents
                          ? `${(item.priceCents / 100).toFixed(2)} DZD${
                              item.pricingModel ? ` / ${item.pricingModel.replace("per-", "")}` : ""
                            }`
                          : "Paid"
                      }
                    />
                  )}
                  {item.isUnisex && <Badge text="Unisex" />}
                </View>

                {item.amenities?.length ? (
                  <Text numberOfLines={1}>Amenities: {item.amenities.join(", ")}</Text>
                ) : null}
              </View>
            );
          }}
        />
      </View>

      {/* Filters ActionSheet */}
      <ActionSheet
        ref={filtersRef}
        gestureEnabled
        closeOnTouchBackdrop
        drawUnderStatusBar
        defaultOverlayOpacity={0.3}
        containerStyle={{ height: "69%", borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
        indicatorStyle={{ width: 60, height: 5, borderRadius: 3, backgroundColor: "#111" }}
      >
        <FiltersSheet
          loadingTax={loadingTax}
          wilayas={wilayas}
          categories={categories}
          accessMethods={accessMethods}
          amenities={amenities}
          rules={rules}
          selectedWilayaId={selectedWilayaId}
          onSelectWilaya={setSelectedWilayaId}
          selectedCategoryIds={selectedCategoryIds}
          setSelectedCategoryIds={setSelectedCategoryIds}
          selectedAccess={selectedAccess}
          setSelectedAccess={setSelectedAccess}
          selectedAmenities={selectedAmenities}
          setSelectedAmenities={setSelectedAmenities}
          selectedRules={selectedRules}
          setSelectedRules={setSelectedRules}
          onOpenWilayaPicker={openWilayaPicker}
          onClose={() => filtersRef.current?.hide()}
          onReset={clearAll}
        />
      </ActionSheet>

      {/* Wilaya Picker ActionSheet */}
      <ActionSheet
        ref={wilayaRef}
        gestureEnabled
        closeOnTouchBackdrop
        drawUnderStatusBar
        defaultOverlayOpacity={0.3}
        containerStyle={{ height: "69%", borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
        indicatorStyle={{ width: 60, height: 5, borderRadius: 3, backgroundColor: "#111" }}
      >
        <WilayaPickerSheet
          wilayas={wilayas}
          selectedWilayaId={selectedWilayaId}
          onSelect={(id) => {
            setSelectedWilayaId(id);
            wilayaRef.current?.hide();
          }}
          onClear={() => {
            setSelectedWilayaId(null);
            wilayaRef.current?.hide();
          }}
        />
      </ActionSheet>
    </SafeAreaView>
  );
}

/* ---------- Filters Sheet (with Scroll fix + Wilaya trigger) ---------- */
function FiltersSheet(props: {
  loadingTax: boolean;
  wilayas: Wilaya[];
  categories: ToiletCategory[];
  accessMethods: StaticTaxItem[];
  amenities: StaticTaxItem[];
  rules: StaticTaxItem[];
  selectedWilayaId: ID | null;
  onSelectWilaya: (id: ID | null) => void;

  selectedCategoryIds: ID[];
  setSelectedCategoryIds: (ids: ID[]) => void;

  selectedAccess: AccessMethod[];
  setSelectedAccess: (codes: AccessMethod[]) => void;

  selectedAmenities: string[];
  setSelectedAmenities: (codes: string[]) => void;

  selectedRules: string[];
  setSelectedRules: (codes: string[]) => void;

  onOpenWilayaPicker: () => void;
  onClose: () => void;
  onReset: () => void;
}) {
  const {
    loadingTax,
    wilayas,
    categories,
    accessMethods,
    amenities,
    rules,
    selectedWilayaId,
    onSelectWilaya,
    selectedCategoryIds,
    setSelectedCategoryIds,
    selectedAccess,
    setSelectedAccess,
    selectedAmenities,
    setSelectedAmenities,
    selectedRules,
    setSelectedRules,
    onOpenWilayaPicker,
    onClose,
    onReset,
  } = props;

  const toggleId = (arr: number[], id: number, setArr: (v: number[]) => void) => {
    setArr(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  };
  const toggleCode = (arr: string[], code: string, setArr: (v: string[]) => void) => {
    setArr(arr.includes(code) ? arr.filter((x) => x !== code) : [...arr, code]);
  };

  const selectedWilaya =
    selectedWilayaId != null ? wilayas.find((w) => w.id === selectedWilayaId) : null;

  return (
    <View style={{ paddingHorizontal: 16 }}>
      <View style={styles.sheetHeaderRow}>
        <Text style={styles.sheetTitle}>Filters</Text>
        <Pressable onPress={onReset} hitSlop={8}>
          <Text style={styles.resetText}>Reset</Text>
        </Pressable>
      </View>

      {loadingTax ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8, color: "#666" }}>Loading options…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Wilaya header row → opens its own sheet */}
          <Section title="Wilaya">
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <Pressable
                onPress={onOpenWilayaPicker}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 999,
                  backgroundColor: "#111",
                }}
              >
                <Text style={{ color: "white", fontWeight: "700" }}>
                  {selectedWilaya ? `${selectedWilaya.number} • ${selectedWilaya.label}` : "Choose wilaya"}
                </Text>
              </Pressable>
              {selectedWilaya && (
                <Pressable onPress={() => onSelectWilaya(null)}>
                  <Text style={{ color: "#b00", fontWeight: "700" }}>Clear</Text>
                </Pressable>
              )}
            </View>
          </Section>

          <Section title="Categories">
            <Wrap>
              {categories.map((c) => (
                <Chip
                  key={c.id}
                  label={c.label}
                  active={selectedCategoryIds.includes(c.id)}
                  onPress={() => toggleId(selectedCategoryIds, c.id, setSelectedCategoryIds)}
                />
              ))}
            </Wrap>
          </Section>

          <Section title="Access Methods">
            <Wrap>
              {accessMethods.map((a) => (
                <Chip
                  key={a.code}
                  label={a.label}
                  active={selectedAccess.includes(a.code as AccessMethod)}
                  onPress={() =>
                    toggleCode(selectedAccess as string[], a.code, (v) =>
                      setSelectedAccess(v as AccessMethod[])
                    )
                  }
                />
              ))}
            </Wrap>
          </Section>

          <Section title="Amenities (must include)">
            <Wrap>
              {amenities.map((a) => (
                <Chip
                  key={a.code}
                  label={a.label}
                  active={selectedAmenities.includes(a.code)}
                  onPress={() => toggleCode(selectedAmenities, a.code, setSelectedAmenities)}
                />
              ))}
            </Wrap>
          </Section>

          <Section title="Rules (must include)">
            <Wrap>
              {rules.map((r) => (
                <Chip
                  key={r.code}
                  label={r.label}
                  active={selectedRules.includes(r.code)}
                  onPress={() => toggleCode(selectedRules, r.code, setSelectedRules)}
                />
              ))}
            </Wrap>
          </Section>
        </ScrollView>
      )}

      <View style={styles.sheetFooter}>
        <Pressable style={[styles.footerBtn, { backgroundColor: "#eee" }]} onPress={onClose}>
          <Text style={[styles.footerBtnText, { color: "#111" }]}>Close</Text>
        </Pressable>
        <Pressable style={[styles.footerBtn, { backgroundColor: "#111" }]} onPress={onClose}>
          <Text style={[styles.footerBtnText, { color: "white" }]}>Apply</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ---------- Wilaya Picker Sheet ---------- */
function WilayaPickerSheet({
  wilayas,
  selectedWilayaId,
  onSelect,
  onClear,
}: {
  wilayas: Wilaya[];
  selectedWilayaId: ID | null;
  onSelect: (id: ID | null) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return wilayas;
    return wilayas.filter(
      (w) =>
        String(w.number) === q ||
        w.code.toLowerCase().includes(q) ||
        w.label.toLowerCase().includes(q)
    );
  }, [query, wilayas]);

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, flex: 1 }}>
      <View style={styles.sheetHeaderRow}>
        <Text style={styles.sheetTitle}>Choose Wilaya</Text>
        <Pressable onPress={onClear} hitSlop={8}>
          <Text style={styles.resetText}>Any</Text>
        </Pressable>
      </View>

      <View style={{ marginBottom: 10 }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search code, number, or name…"
          placeholderTextColor="#777"
          style={styles.searchInput}
          returnKeyType="search"
        />
      </View>

      <FlatList
        data={list}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => {
          const active = selectedWilayaId === item.id;
          return (
            <Pressable
              onPress={() => onSelect(item.id)}
              style={[
                {
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: "#eee",
                  backgroundColor: "white",
                },
                active && { borderColor: "#111" },
              ]}
            >
              <Text style={{ fontWeight: "700", color: "#111" }}>
                {item.number} • {item.label}
              </Text>
              <Text style={{ color: "#666", marginTop: 2 }}>{item.code}</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

/* ---------- Layout helpers ---------- */
const Wrap = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.wrap}>{children}</View>
);

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "white" },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: "700", color: "#111" },
  subtitle: { color: "#666", marginTop: 2 },
  searchRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.select({ ios: 12, android: 10 }),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
    borderRadius: 10,
    backgroundColor: "#fafafa",
    color: "#111",
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#111",
    borderRadius: 10,
  },
  filterBtnText: { color: "white", fontWeight: "600" },
  content: { flex: 1 },
  resultsCount: { marginHorizontal: 0, marginVertical: 8, color: "#666" },
  card: {
    backgroundColor: "white",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#eee",
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#111", flex: 1, paddingRight: 8 },
  rating: { color: "#111", fontWeight: "600" },
  cardMeta: { color: "#444", marginTop: 2 },
  addr: { color: "#666", marginTop: 2 },
  desc: { color: "#666", marginTop: 6 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  badge: {
    backgroundColor: "#f1f1f1",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: { color: "#111", fontWeight: "600", fontSize: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 8,
  },
  chipText: { fontWeight: "600" },
  sectionTitle: { fontWeight: "700", marginBottom: 10, color: "#111" },
  wrap: { flexDirection: "row", flexWrap: "wrap" },
  sheetHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 10,
  },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: "#111" },
  resetText: { color: "#b00", fontWeight: "700" },
  sheetFooter: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 12,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  footerBtnText: { fontWeight: "700" },
});
