// src/stores/useToiletStore.ts
import { create } from "zustand";
import api from "@/utils/axios-instance";
import type { ID, ToiletWithRelations } from "@/utils/types";
import { ApiRoutes, buildRoute } from "@/utils/api";

export type ToiletFilters = {
  accessMethod?: "public" | "code" | "staff" | "key" | "app";
  isFree?: boolean;
  minRating?: number;
  pricingModel?: "flat" | "per-visit" | "per-30-min" | "per-60-min";
  amenities?: string[];
  radiusKm?: number;
  sort?: "distance" | "rating" | "recent";
  order?: "asc" | "desc";
};

type ListResponse = {
  data: ToiletWithRelations[];
  meta?: { page?: number; perPage?: number; total?: number };
};

type Query = {
  wilayaId?: ID;
  lat?: number;
  lng?: number;
  perPage?: number;
  filters?: ToiletFilters;
};

type State = {
  items: ToiletWithRelations[];
  loading: boolean;
  page: number;          // current loaded page
  hasMore: boolean;
  initialized: boolean;  // first page landed
  selectedWilayaId?: ID;
  filters: ToiletFilters;
  coords?: { lat: number; lng: number };
  selectedToilet?: ToiletWithRelations;

  setWilaya: (wilayaId?: ID) => void;
  setFilters: (f: ToiletFilters) => void;
  setCoords: (lat: number, lng: number) => void;
  selectToilet: (t?: ToiletWithRelations) => void;

  refresh: (q?: Partial<Query>) => Promise<void>;
  fetchMore: () => Promise<void>;
};

function buildQueryParams(q: Query & { page?: number }) {
  const { lat, lng, wilayaId, perPage = 20, filters = {}, page = 1 } = q;
  const params: Record<string, any> = { page, perPage };

  if (lat != null) params.lat = lat;
  if (lng != null) params.lng = lng;

  // If we have coords (and usually a radius), ignore wilayaId to avoid empty intersections
  const usingGeo = lat != null && lng != null && (filters.radiusKm ?? 10) != null;
  if (!usingGeo && wilayaId != null) params.wilayaId = wilayaId;

  if (filters.isFree != null) params.isFree = filters.isFree ? 1 : 0;
  if (filters.minRating != null) params.minRating = filters.minRating;
  if (filters.pricingModel) params.pricingModel = filters.pricingModel;
  if (filters.accessMethod) params.accessMethod = filters.accessMethod;
  if (filters.amenities?.length) params.amenities = filters.amenities.join(",");
  if (filters.radiusKm != null) params.radiusKm = filters.radiusKm;
  if (filters.sort) params.sort = filters.sort;
  if (filters.order) params.order = filters.order;
  return params;
}

export const useToiletStore = create<State>((set, get) => ({
  items: [],
  loading: false,
  page: 0,                 // start at 0 so first fetchMore would target 1 (but we’ll gate it)
  hasMore: true,
  initialized: false,

  selectedWilayaId: undefined,
  filters: { sort: "distance", order: "asc", radiusKm: 10 },
  coords: undefined,
  selectedToilet: undefined,

  setWilaya: (wilayaId) => set({ selectedWilayaId: wilayaId }),
  setFilters: (f) => set({ filters: { ...get().filters, ...f } }),
  setCoords: (lat, lng) => set({ coords: { lat, lng } }),
  selectToilet: (t) => set({ selectedToilet: t }),

  refresh: async (override = {}) => {
    const { selectedWilayaId, coords, filters } = get();
    const q: Query = {
      wilayaId: override.wilayaId ?? selectedWilayaId,
      lat: override.lat ?? coords?.lat,
      lng: override.lng ?? coords?.lng,
      perPage: override.perPage ?? 20,
      filters: { ...filters, ...(override.filters || {}) },
    };

    set({ loading: true, page: 0, hasMore: true, initialized: false });
    try {
      const url = buildRoute(ApiRoutes.toilets.index, {}, buildQueryParams({ ...q, page: 1 }));
      const { data } = await api.get<ListResponse>(url, { headers: { "X-Requires-Auth": false } });
      const total = data.meta?.total ?? data.data.length;
      const perPage = q.perPage ?? 20;

      set({
        items: data.data,
        page: 1,                                // now we *have* page 1
        hasMore: data.data.length < total,
        initialized: true,                      // gate opens for fetchMore
      });

      // Optional extra guard: if server under-fills first page, still block fetchMore
      if (data.data.length < perPage) {
        set({ hasMore: data.data.length < total && total > data.data.length });
      }
    } finally {
      set({ loading: false });
    }
  },

  fetchMore: async () => {
    const { loading, hasMore, initialized, page, items, selectedWilayaId, coords, filters } = get();
    if (loading || !hasMore || !initialized) return;

    const perPage = 20;
    // Prevent asking page 2 when we don’t even have a full first page rendered
    if (items.length < perPage && page === 1) return;

    set({ loading: true });
    try {
      const q: Query = { wilayaId: selectedWilayaId, lat: coords?.lat, lng: coords?.lng, perPage, filters };
      const url = buildRoute(ApiRoutes.toilets.index, {}, buildQueryParams({ ...q, page: page + 1 }));
      const { data } = await api.get<ListResponse>(url, { headers: { "X-Requires-Auth": false } });

      const merged = [...items, ...data.data];
      const total = data.meta?.total ?? merged.length;

      set({
        items: merged,
        page: page + 1,
        hasMore: merged.length < total,
      });
    } finally {
      set({ loading: false });
    }
  },
}));
