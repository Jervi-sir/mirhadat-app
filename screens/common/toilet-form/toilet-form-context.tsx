// contexts/ToiletFormContext.tsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import api from "@/utils/api/axios-instance";
import { ApiRoutes, buildRoute } from "@/utils/api/api";

/* ----------------------------- Types ----------------------------- */
type ID = number;
export type Lang = "en" | "fr" | "ar";
export type PricingModel = "flat" | "per-visit" | "per-30-min" | "per-60-min" | null;
export type AccessMethod = "public" | "code" | "staff" | "key" | "app";

type TaxRow = { code: string; label: string; icon?: string | null };
type CategoryRow = { id: ID; code: string; label: string; icon?: string | null };

type TaxResp = {
  data: {
    categories: CategoryRow[];
    access_methods: TaxRow[];
    amenities: TaxRow[];
    rules: TaxRow[];
  };
};

export type PhotoItem =
  | { kind: "local"; localUri: string; is_cover?: boolean }
  | { kind: "remote"; url: string; is_cover?: boolean };

export type ToiletDTO = {
  id?: ID;
  owner_id?: ID | null;
  toilet_category_id: ID;
  wilaya_id: ID;

  name: string;
  description?: string | null;
  phone_numbers?: string[] | null;

  lat: number;
  lng: number;
  address_line: string;
  place_hint?: string | null;

  access_method: AccessMethod;
  capacity: number;
  is_unisex: boolean;

  amenities?: string[] | null; // codes
  rules?: string[] | null; // codes

  is_free: boolean;
  price_cents?: number | null;
  pricing_model?: PricingModel;

  photos?: { url: string; is_cover?: boolean }[];
  open_hours?: {
    day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    opens_at: string; // "HH:MM:SS"
    closes_at: string; // "HH:MM:SS"
    sequence?: number;
  }[];
};

/* --------------------- Open-hours helpers/state --------------------- */
export type DayRange = { opens: string; closes: string }; // UI uses HH:MM; we convert to HH:MM:00
export type DayState = { open: boolean; ranges: DayRange[] };

export const DAYS: { idx: 0 | 1 | 2 | 3 | 4 | 5 | 6; label: string }[] = [
  { idx: 0, label: "Mon" },
  { idx: 1, label: "Tue" },
  { idx: 2, label: "Wed" },
  { idx: 3, label: "Thu" },
  { idx: 4, label: "Fri" },
  { idx: 5, label: "Sat" },
  { idx: 6, label: "Sun" },
];

export function isValidHHMM(s: string) {
  if (!s) return false;
  const m = s.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return !!m;
}
export function hhmmToFull(s: string) {
  return s.length === 5 ? `${s}:00` : s;
}

/* ----------------------------- Context ----------------------------- */
type Ctx = {
  // meta
  toiletId?: ID;
  isEditing: boolean;
  lang: Lang;

  // taxonomy
  taxLoading: boolean;
  taxErr: unknown;
  categories: CategoryRow[];
  accessMethods: TaxRow[];
  amenityOptions: TaxRow[];
  ruleOptions: TaxRow[];
  reloadTax: () => Promise<void>;

  // form state
  wilaya: any | null;
  setWilaya: (w: any | null) => void;

  name: string; setName: (s: string) => void;
  categoryId?: ID; setCategoryId: (id: ID | undefined) => void;
  description: string; setDescription: (s: string) => void;
  phoneNumbers: string[];
  setPhoneNumbers: (v: string[]) => void;

  lat: string; setLat: (s: string) => void;
  lng: string; setLng: (s: string) => void;
  address: string; setAddress: (s: string) => void;
  placeHint: string; setPlaceHint: (s: string) => void;

  accessMethod: AccessMethod; setAccessMethod: (a: AccessMethod) => void;
  capacity: string; setCapacity: (s: string) => void;
  isUnisex: boolean; setIsUnisex: (b: boolean) => void;

  isFree: boolean; setIsFree: (b: boolean) => void;
  priceCents: string; setPriceCents: (s: string) => void;
  pricingModel: PricingModel; setPricingModel: (p: PricingModel) => void;

  amenities: string[]; setAmenities: React.Dispatch<React.SetStateAction<string[]>>;
  rules: string[]; setRules: React.Dispatch<React.SetStateAction<string[]>>;

  photos: PhotoItem[]; setPhotos: React.Dispatch<React.SetStateAction<PhotoItem[]>>;
  uploading: boolean;
  uploadProgress: { done: number; total: number };

  oh: Record<number, DayState>;
  setOh: React.Dispatch<React.SetStateAction<Record<number, DayState>>>;

  loading: boolean;
  serverErr: any;

  // actions
  loadExisting: () => Promise<void>;
  submit: () => Promise<void>;
  deleteToilet: () => Promise<void>;   // <-- add
};

const ToiletFormContext = createContext<Ctx | null>(null);

export function useToiletForm() {
  const ctx = useContext(ToiletFormContext);
  if (!ctx) throw new Error("useToiletForm must be used inside <ToiletFormProvider/>");
  return ctx;
}

/* ----------------------------- Provider ----------------------------- */
type ProviderProps = React.PropsWithChildren<{
  toiletId?: ID;
  lang?: Lang;
  onCreated?: (id?: ID) => void;
  onUpdated?: (id?: ID) => void;
  onDeleted?: (id?: ID) => void;       // <-- add
  onError?: (e: any) => void;
}>;

export const ToiletFormProvider: React.FC<ProviderProps> = ({
  children,
  toiletId,
  lang = "fr",
  onCreated,
  onUpdated,
  onDeleted,        // <-- add
  onError,
}) => {
  const isEditing = !!toiletId;

  /* ---------- Taxonomy ---------- */
  const [taxLoading, setTaxLoading] = useState(false);
  const [taxErr, setTaxErr] = useState<unknown>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [accessMethods, setAccessMethods] = useState<TaxRow[]>([]);
  const [amenityOptions, setAmenityOptions] = useState<TaxRow[]>([]);
  const [ruleOptions, setRuleOptions] = useState<TaxRow[]>([]);

  const reloadTax = useCallback(async () => {
    try {
      setTaxLoading(true);
      setTaxErr(null);
      const res = await api.get<TaxResp>(buildRoute(ApiRoutes.taxonomy), {
        params: { type: "all", lang },
      });
      setCategories(res.data.data.categories || []);
      setAccessMethods(res.data.data.access_methods || []);
      setAmenityOptions(res.data.data.amenities || []);
      setRuleOptions(res.data.data.rules || []);
    } catch (e) {
      setTaxErr(e);
    } finally {
      setTaxLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    reloadTax();
  }, [reloadTax]);

  /* ---------- Form state ---------- */
  const [wilaya, setWilaya] = useState<any | null>(null);

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<ID | undefined>(undefined);
  const [description, setDescription] = useState<string>("");
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>([""]);

  const [lat, setLat] = useState<string>("36.7525");
  const [lng, setLng] = useState<string>("3.04197");
  const [address, setAddress] = useState<string>("");
  const [placeHint, setPlaceHint] = useState<string>("");

  const [accessMethod, setAccessMethod] = useState<AccessMethod>("public");
  const [capacity, setCapacity] = useState<string>("1");
  const [isUnisex, setIsUnisex] = useState<boolean>(true);

  const [isFree, setIsFree] = useState<boolean>(true);
  const [priceCents, setPriceCents] = useState<string>("");
  const [pricingModel, setPricingModel] = useState<PricingModel>(null);

  const [amenities, setAmenities] = useState<string[]>([]);
  const [rules, setRules] = useState<string[]>([]);

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });

  const [oh, setOh] = useState<Record<number, DayState>>(() => {
    const base: Record<number, DayState> = {};
    DAYS.forEach((d) => (base[d.idx] = { open: false, ranges: [{ opens: "", closes: "" }] }));
    return base;
  });

  const [loading, setLoading] = useState(false);
  const [serverErr, setServerErr] = useState<any>(null);

  /* ---------- Existing (edit) ---------- */
  const loadExisting = useCallback(async () => {
    if (!isEditing || !toiletId) return;
    try {
      setLoading(true);
      setServerErr(null);
      const res = await api.get<{ data: any }>(buildRoute(ApiRoutes.host.toilets.show, { toilet: toiletId }), { authRequired: true });
      const t = res.data.data;

      setName(t.name);
      setCategoryId(t.toilet_category_id);
      setDescription(t.description ?? "");
      setPhoneNumbers(Array.isArray(t.phone_numbers) ? (t.phone_numbers.length ? t.phone_numbers : [""]) : [""]);

      setLat(String(t.lat));
      setLng(String(t.lng));
      setAddress(t.address_line);
      setPlaceHint(t.place_hint ?? "");

      setAccessMethod(t.access_method);
      setCapacity(String(t.capacity));
      setIsUnisex(!!t.is_unisex);

      setIsFree(!!t.is_free);
      setPriceCents(t.price_cents != null ? String(t.price_cents) : "");
      setPricingModel(t.pricing_model ?? null);

      setAmenities(Array.isArray(t.amenities) ? t.amenities : []);
      setRules(Array.isArray(t.rules) ? t.rules : []);

      if (Array.isArray(t.photos)) {
        setPhotos(
          t.photos.map((p: any) => ({
            kind: "remote",
            url: p.url,
            is_cover: !!p.is_cover,
          }))
        );
      }

      setWilaya({
        id: t.wilaya_id,
        number: t.wilaya?.number,
        code: t.wilaya?.code,
        fr: t.wilaya?.fr,
        en: t.wilaya?.en,
        ar: t.wilaya?.ar,
      });

      if (Array.isArray(t.open_hours)) {
        const next: Record<number, DayState> = {};
        DAYS.forEach((d) => (next[d.idx] = { open: false, ranges: [{ opens: "", closes: "" }] }));
        for (const row of t.open_hours) {
          const dow = Number(row.day_of_week) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
          const opens = String(row.opens_at ?? "").slice(0, 5);
          const closes = String(row.closes_at ?? "").slice(0, 5);
          if (!next[dow].open) next[dow].open = true;
          const seq = Number(row.sequence ?? 0);
          if (!next[dow].ranges[seq]) next[dow].ranges[seq] = { opens: "", closes: "" };
          next[dow].ranges[seq] = { opens, closes };
        }
        DAYS.forEach((d) => {
          if (!next[d.idx].ranges.length) next[d.idx].ranges = [{ opens: "", closes: "" }];
        });
        setOh(next);
      }
    } catch (e) {
      setServerErr(e);
      onError?.(e);
    } finally {
      setLoading(false);
    }
  }, [isEditing, toiletId, onError]);

  useEffect(() => {
    loadExisting();
  }, [loadExisting]);

  /* ---------- Upload helper ---------- */
  const uploadPendingPhotos = useCallback(async (items: PhotoItem[]) => {
    const locals = items
      .map((it, idx) => ({ it, idx }))
      .filter((x) => x.it.kind === "local") as { it: Extract<PhotoItem, { kind: "local" }>; idx: number }[];

    const total = locals.length;
    if (!total) {
      return items.map((it) =>
        it.kind === "remote" ? { url: it.url, is_cover: !!it.is_cover } : { url: it.localUri, is_cover: !!it.is_cover }
      );
    }

    setUploading(true);
    setUploadProgress({ done: 0, total });

    const BATCH = 5;
    const urlByIndex = new Map<number, string>();

    for (let i = 0; i < locals.length; i += BATCH) {
      const slice = locals.slice(i, i + BATCH);
      const form = new FormData();
      for (const { it } of slice) {
        const uri = it.localUri;
        const name = uri.split("/").pop() ?? "photo.jpg";
        // @ts-ignore react-native file
        form.append("files[]", { uri, name, type: "image/jpeg" });
      }

      const res = await api.post(buildRoute(ApiRoutes.uploads.toiletPhoto), form, {
        authRequired: true,
        headers: { "Content-Type": "multipart/form-data" },
      });

      const returned = Array.isArray(res.data?.data) ? res.data.data : [];
      if (returned.length !== slice.length) throw new Error("Upload mismatch: server returned a different number of files.");

      slice.forEach((entry, j) => {
        const u = returned[j]?.url;
        if (!u) throw new Error("Upload failed: missing URL.");
        urlByIndex.set(entry.idx, u);
      });

      setUploadProgress((prev) => ({ done: Math.min(prev.done + slice.length, total), total }));
    }

    setUploading(false);

    const out = items.map((it, idx) => {
      const url = it.kind === "remote" ? it.url : urlByIndex.get(idx) ?? "";
      return { url, is_cover: !!it.is_cover };
    });

    if (!out.some((p) => p.is_cover) && out.length) out[0].is_cover = true;

    return out;
  }, []);

  /* ---------- Submit ---------- */
  const submit = useCallback(async () => {
    try {
      setLoading(true);
      setServerErr(null);

      if (!categoryId) throw new Error("Choose a category.");
      if (!wilaya?.id) throw new Error("Choose a wilaya.");
      if (!name.trim()) throw new Error("Name is required.");
      if (!address.trim()) throw new Error("Address is required.");

      for (const d of DAYS) {
        const day = oh[d.idx];
        if (!day.open) continue;
        for (const r of day.ranges) {
          if (!isValidHHMM(r.opens) || !isValidHHMM(r.closes)) {
            throw new Error(`Invalid time on ${d.label}. Use HH:MM (e.g., 08:30).`);
          }
        }
      }

      const finalPhotos = await uploadPendingPhotos(photos);

      const open_hours: NonNullable<ToiletDTO["open_hours"]> = [];
      DAYS.forEach((d) => {
        const day = oh[d.idx];
        if (!day.open) return;
        day.ranges.forEach((r, i) => {
          if (isValidHHMM(r.opens) && isValidHHMM(r.closes)) {
            open_hours.push({
              day_of_week: d.idx,
              opens_at: hhmmToFull(r.opens),
              closes_at: hhmmToFull(r.closes),
              sequence: i as number,
            });
          }
        });
      });

      const payload: ToiletDTO = {
        toilet_category_id: categoryId!,
        wilaya_id: wilaya!.id,
        name,
        description: description?.trim() || null,
        phone_numbers: (() => {
          const cleaned = (phoneNumbers || []).map((s) => s.trim()).filter(Boolean);
          return cleaned.length ? cleaned : null;
        })(),

        lat: Number(lat),
        lng: Number(lng),
        address_line: address,
        place_hint: placeHint?.trim() || null,
        access_method: accessMethod,
        capacity: Number(capacity || 1),
        is_unisex: isUnisex,
        amenities: amenities.length ? amenities : null,
        rules: rules.length ? rules : null,
        is_free: isFree,
        price_cents: isFree ? null : (priceCents ? Number(priceCents) : 0),
        pricing_model: isFree ? null : (pricingModel ?? "flat"),
        photos: finalPhotos,
        open_hours,
      };

      if (isEditing) {
        await api.put(buildRoute(ApiRoutes.host.toilets.update, { toilet: toiletId }), payload, { authRequired: true });
        onUpdated?.(toiletId);
      } else {
        const res = await api.post(buildRoute(ApiRoutes.host.toilets.store), payload, { authRequired: true });
        const newId: ID | undefined = res?.data?.data?.id;
        onCreated?.(newId);
      }
    } catch (e) {
      setServerErr(e);
      onError?.(e);
      throw e;
    } finally {
      setLoading(false);
      setUploading(false);
    }
  }, [
    isEditing, toiletId,
    categoryId, wilaya, name, address, description, phoneNumbers,
    lat, lng, placeHint, accessMethod, capacity, isUnisex,
    amenities, rules, isFree, priceCents, pricingModel,
    photos, oh, onCreated, onUpdated, onError, uploadPendingPhotos
  ]);

  const deleteToilet = useCallback(async () => {
    if (!toiletId) return;
    try {
      setLoading(true);
      setServerErr(null);

      await api.delete(buildRoute(ApiRoutes.host.toilets.destroy, { toilet: toiletId }), { authRequired: true });
      onDeleted?.(toiletId);
    } catch (e) {
      setServerErr(e);
      onError?.(e);
      throw e;
    } finally {
      setLoading(false);
      setUploading(false);
    }
  }, [toiletId, onDeleted, onError]);

  const value: Ctx = {
    toiletId, isEditing, lang,

    taxLoading, taxErr, categories, accessMethods, amenityOptions, ruleOptions, reloadTax,

    wilaya, setWilaya,
    name, setName,
    categoryId, setCategoryId,
    description, setDescription,
    phoneNumbers, setPhoneNumbers,

    lat, setLat,
    lng, setLng,
    address, setAddress,
    placeHint, setPlaceHint,

    accessMethod, setAccessMethod,
    capacity, setCapacity,
    isUnisex, setIsUnisex,

    isFree, setIsFree,
    priceCents, setPriceCents,
    pricingModel, setPricingModel,

    amenities, setAmenities,
    rules, setRules,

    photos, setPhotos,
    uploading, uploadProgress,

    oh, setOh,

    loading, serverErr,

    loadExisting,
    submit,
    deleteToilet,   // <-- expose
  };

  return <ToiletFormContext.Provider value={value}>{children}</ToiletFormContext.Provider>;
};
