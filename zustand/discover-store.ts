import { create } from "zustand";
import api from "@/utils/api/axios-instance";
import axios, { AxiosError } from "axios";
import type { WilayaType, ToiletWithRelationsType } from "@/utils/types";
import { ApiRoutes, buildRoute } from "@/utils/api/api";

/* ============================ Request Types ============================ */
export type DiscoverParams = {
  wilaya_id?: number;
  lat?: number;
  lng?: number;
  radius_km?: number;

  is_free?: boolean;
  access_method?: "public" | "code" | "staff" | "key" | "app";
  pricing_model?: "flat" | "per-visit" | "per-30-min" | "per-60-min";
  min_rating?: number;
  amenities?: string[];

  page?: number;
  perPage?: number;
  sort?: "distance" | "avg_rating" | "reviews_count" | "created_at";
  order?: "asc" | "desc";
  use_bbox?: boolean;
};

type DiscoverResponse = {
  data: ToiletWithRelationsType[];
  meta?: { page?: number; perPage?: number; total?: number };
  center?: { lat: number; lng: number; radius_km: number } | null;
};

/* ============================ Local Request Helper ============================ */
async function fetchDiscover(params: DiscoverParams, opts?: { signal?: AbortSignal }) {
  const res = await api.get<DiscoverResponse>('/toilets', {
    authIfAvailable: true,
    params,
    signal: opts?.signal, // AbortController support
  });
  return res.data;
}

/* ============================ Filters & Store Types ============================ */
export type ToiletFilters = {
  isFree?: boolean;
  accessMethod?: "public" | "code" | "staff" | "key" | "app";
  pricingModel?: "flat" | "per-visit" | "per-30-min" | "per-60-min" | null;
  minRating?: number;
  amenities?: string[]; // array of codes
};

type DiscoverState = {
  // Controls
  selectedWilaya?: WilayaType;
  setSelectedWilaya: (wilaya?: WilayaType) => void;

  filters: ToiletFilters;
  setFilters: (f: ToiletFilters) => void;

  coords?: { lat: number; lng: number };
  setCoords: (lat: number, lng: number) => void;

  // Results
  items: ToiletWithRelationsType[];
  page: number;
  perPage: number;
  total: number;
  hasMore: boolean;

  // Flags
  loading: boolean;
  refreshing: boolean;
  error: string | null;

  // Actions
  fetchFirst: () => Promise<void>;
  fetchNext: () => Promise<void>;
  refresh: () => Promise<void>;
  clear: () => void;
};

/* ============================ Helpers & Cancellation ============================ */
function buildParams(get: () => DiscoverState): DiscoverParams {
  const s = get();
  const w = s.selectedWilaya;
  const f = s.filters;

  return {
    // Region: prefer wilaya center server-side by sending its id
    wilaya_id: w?.id,
    radius_km: w?.default_radius_km ?? 25,

    // Optional override with device location (uncomment if desired)
    // lat: s.coords?.lat,
    // lng: s.coords?.lng,

    // Filters
    is_free: f.isFree,
    access_method: f.accessMethod,
    pricing_model: f.pricingModel ?? undefined,
    min_rating: f.minRating,
    amenities: f.amenities && f.amenities.length ? f.amenities : undefined,

    // Paging / sort
    page: 1,
    perPage: s.perPage,
    sort: "distance",
    order: "asc",
    use_bbox: true,
  };
}

let inflightCtrl: AbortController | null = null;
function cancelInflight() {
  try { inflightCtrl?.abort(); } catch {}
  inflightCtrl = null;
}
function isCanceled(e: unknown) {
  // axios v1+ cancel codes
  return axios.isCancel?.(e) || (e as any)?.code === "ERR_CANCELED" || (e as any)?.name === "CanceledError";
}

/* ============================ The Store (single file) ============================ */
export const useDiscoverStore = create<DiscoverState>((set, get) => ({
  /* ---- controls ---- */
  selectedWilaya: undefined,
  setSelectedWilaya: (wilaya) => set({ selectedWilaya: wilaya }),

  coords: undefined,
  setCoords: (lat, lng) => set({ coords: { lat, lng } }),

  filters: {
    isFree: undefined,
    accessMethod: undefined,
    pricingModel: undefined,
    minRating: undefined,
    amenities: [],
  },
  setFilters: (filters) => set({ filters }),

  /* ---- results ---- */
  items: [],
  page: 1,
  perPage: 20,
  total: 0,
  hasMore: false,

  /* ---- flags ---- */
  loading: false,
  refreshing: false,
  error: null,

  /* ---- actions ---- */
  clear: () =>
    set({
      items: [],
      page: 1,
      total: 0,
      hasMore: false,
      error: null,
    }),

  fetchFirst: async () => {
    cancelInflight();
    inflightCtrl = new AbortController();

    const base = buildParams(get);
    set({ loading: true, error: null, page: 1 });

    try {
      const res = await fetchDiscover(base, { signal: inflightCtrl.signal });
      const total = res.meta?.total ?? res.data.length;
      const perPage = base.perPage ?? 20;

      set({
        items: res.data,
        page: 1,
        total,
        hasMore: (1 * perPage) < total,
        loading: false,
        error: null,
      });
    } catch (e) {
      if (isCanceled(e)) return;
      set({ loading: false, error: (e as AxiosError)?.message ?? "Failed to load" });
    } finally {
      cancelInflight();
    }
  },

  fetchNext: async () => {
    const s = get();
    if (s.loading || !s.hasMore) return;

    cancelInflight();
    inflightCtrl = new AbortController();

    const nextPage = s.page + 1;
    const params = { ...buildParams(get), page: nextPage, perPage: s.perPage };

    set({ loading: true, error: null });

    try {
      const res = await fetchDiscover(params, { signal: inflightCtrl.signal });
      const total = res.meta?.total ?? s.total;
      const merged = [...s.items, ...res.data];

      set({
        items: merged,
        page: nextPage,
        total,
        hasMore: (nextPage * (params.perPage ?? s.perPage)) < total,
        loading: false,
      });
    } catch (e) {
      if (isCanceled(e)) return;
      set({ loading: false, error: (e as AxiosError)?.message ?? "Failed to load" });
    } finally {
      cancelInflight();
    }
  },

  refresh: async () => {
    cancelInflight();
    inflightCtrl = new AbortController();

    const base = { ...buildParams(get), page: 1 };
    set({ refreshing: true, error: null });

    try {
      const res = await fetchDiscover(base, { signal: inflightCtrl.signal });
      const total = res.meta?.total ?? res.data.length;
      const perPage = base.perPage ?? get().perPage;

      set({
        items: res.data,
        page: 1,
        total,
        hasMore: (1 * perPage) < total,
        refreshing: false,
        error: null,
      });
    } catch (e) {
      if (isCanceled(e)) return;
      set({ refreshing: false, error: (e as AxiosError)?.message ?? "Failed to refresh" });
    } finally {
      cancelInflight();
    }
  },
}));
