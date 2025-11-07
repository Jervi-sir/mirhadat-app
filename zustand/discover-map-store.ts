import { create } from "zustand";
import axios, { AxiosError } from "axios";
import { ApiRoutes, buildRoute } from "@/utils/api/api";
import type { WilayaType, ToiletMarkerType } from "@/utils/types";
import api from "@/utils/api/axios-instance";

/* ============================ Request Types ============================ */
export type MapDiscoverParams = {
  wilaya_id?: number;

  lat?: number;
  lng?: number;
  radius_km?: number;

  // filters
  is_free?: boolean;
  access_method?: "public" | "code" | "staff" | "key" | "app";
  pricing_model?: "flat" | "per-visit" | "per-30-min" | "per-60-min";
  min_rating?: number;
  amenities?: string[];

  // paging/sort
  page?: number;
  perPage?: number;
  sort?: "distance" | "created_at"; // markers only need these
  order?: "asc" | "desc";
  use_bbox?: boolean;

  with_distance?: boolean; // NEW: ask backend to include distance_km
};

type MarkerIndexResponse = {
  markers: ToiletMarkerType[];
  meta?: { page?: number; perPage?: number; total?: number };
  center?: { lat: number; lng: number; radius_km: number } | null;
};

/* ============================ Filters & Store Types ============================ */
export type ToiletMapFilters = {
  isFree?: boolean;
  accessMethod?: "public" | "code" | "staff" | "key" | "app";
  pricingModel?: "flat" | "per-visit" | "per-30-min" | "per-60-min" | null;
  minRating?: number;
  amenities?: string[];
};

type RegionCenter = { lat: number; lng: number; radius_km: number };

export type MapDiscoverState = {
  /* ---------- Controls ---------- */
  selectedWilaya?: WilayaType;
  setSelectedWilaya: (w?: WilayaType) => void;

  filters: ToiletMapFilters;
  setFilters: (f: ToiletMapFilters) => void;

  center?: RegionCenter;
  setCenter: (c?: RegionCenter) => void;

  /* ---------- Results ---------- */
  items: ToiletMarkerType[];
  page: number;
  perPage: number;
  total: number;
  hasMore: boolean;

  /* ---------- Flags ---------- */
  loading: boolean;
  error: string | null;

  /* ---------- Actions ---------- */
  clear: () => void;

  // Immediate fetchers
  fetchFirst: () => Promise<void>;
  fetchNext: () => Promise<void>;
  refresh: () => Promise<void>;

  // Debounced variants
  fetchFirstDebounced?: () => Promise<void>;
  refreshDebounced?: () => Promise<void>;
};


// === Debounce controls (module-level) ===
const DEBOUNCE_MS = 400;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingKind: "first" | "refresh" | null = null;

function clearDebounce() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = null;
  pendingKind = null;
}

function schedule(kind: "first" | "refresh", run: () => void) {
  pendingKind = kind;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    const k = pendingKind;
    pendingKind = null;
    if (k) run(); // last-call-wins
  }, DEBOUNCE_MS);
}

/* ============================ Merge ============================ */
function mergeById<T extends { id: number | string }>(prev: T[], next: T[]) {
  const map = new Map<number | string, T>();
  for (const m of prev) map.set(m.id, m);
  for (const m of next) map.set(m.id, map.has(m.id) ? { ...map.get(m.id)!, ...m } : m);
  return Array.from(map.values());
}

/* ============================ Local request helper ============================ */
async function fetchMarkers(params: MapDiscoverParams, opts?: { signal?: AbortSignal }) {
  const res = await api.get<MarkerIndexResponse>('/toilets-markers', {
    authRequired: true,
    params,
    signal: opts?.signal,
  });
  return res.data;
}

/* ============================ Build params ============================ */
function buildParams(get: () => MapDiscoverState): MapDiscoverParams {
  const s = get();
  const w = s.selectedWilaya;
  const f = s.filters;
  const c = s.center;

  return {
    wilaya_id: w?.id,
    lat: c?.lat,
    lng: c?.lng,
    radius_km: c?.radius_km,

    // filters (kept for symmetry, backend will ignore some for markers)
    is_free: f.isFree,
    access_method: f.accessMethod,
    pricing_model: f.pricingModel ?? undefined,
    min_rating: f.minRating,
    amenities: f.amenities && f.amenities.length ? f.amenities : undefined,

    page: 1,
    perPage: s.perPage,
    sort: "distance",
    order: "asc",
    use_bbox: true,

    with_distance: true,
  };
}

let inflight: AbortController | null = null;
function cancelInflight() {
  try { inflight?.abort(); } catch { }
  inflight = null;
}
function isCanceled(e: unknown) {
  return axios.isCancel?.(e) || (e as any)?.code === "ERR_CANCELED" || (e as any)?.name === "CanceledError";
}

/* ============================ Store ============================ */
export const useDiscoverMapStore = create<MapDiscoverState>((set, get) => ({
  /* Controls */
  selectedWilaya: undefined,
  setSelectedWilaya: (w) => set({ selectedWilaya: w }),

  filters: { amenities: [] },
  setFilters: (f) => set({ filters: f }),

  center: undefined,
  setCenter: (c) => set({ center: c }),

  /* Results */
  items: [],
  page: 1,
  perPage: 80,   // can be large for markers
  total: 0,
  hasMore: false,

  /* Flags */
  loading: false,
  error: null,

  /* Actions */
  clear: () => {
    clearDebounce();
    set({ items: [], page: 1, total: 0, hasMore: false, error: null });
  },

  fetchFirst: async () => {
    cancelInflight();
    inflight = new AbortController();

    const params = buildParams(get);
    set({ loading: true, error: null, page: 1 });

    try {
      const res = await fetchMarkers(params, { signal: inflight.signal });
      const s = get();
      const merged = mergeById(s.items, res.markers ?? []);
      const perPage = params.perPage ?? s.perPage;
      const total = res.meta?.total ?? merged.length;
      set({
        items: merged,
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

  fetchFirstDebounced: async () => {
    schedule("first", () => get().fetchFirst());
  },

  fetchNext: async () => {
    const s = get();
    if (s.loading || !s.hasMore) return;

    cancelInflight();
    inflight = new AbortController();

    const nextPage = s.page + 1;
    const params = { ...buildParams(get), page: nextPage, perPage: s.perPage };

    set({ loading: true, error: null });

    try {
      const res = await fetchMarkers(params, { signal: inflight.signal });
      const merged = mergeById(s.items, res.markers ?? []);
      const total = res.meta?.total ?? s.total;

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
    inflight = new AbortController();

    const params = { ...buildParams(get), page: 1 };
    set({ error: null, loading: true });

    try {
      const res = await fetchMarkers(params, { signal: inflight.signal });
      const s = get();
      const merged = mergeById(s.items, res.markers ?? []);
      const perPage = params.perPage ?? s.perPage;
      const total = res.meta?.total ?? merged.length;
      set({
        items: merged,
        page: 1,
        total,
        hasMore: (1 * perPage) < total,
        loading: false,
        error: null,
      });
    } catch (e) {
      if (isCanceled(e)) return;
      set({ loading: false, error: (e as AxiosError)?.message ?? "Failed to refresh" });
    } finally {
      cancelInflight();
    }
  },

  refreshDebounced: async () => {
    schedule("refresh", () => get().refresh());
  },

}));
