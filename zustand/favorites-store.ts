import { create } from "zustand";
import type { ToiletWithRelationsType } from "@/utils/types";

type ID = number;
type Mode = "replace" | "append";

type FavoritesState = {
  byId: Record<ID, ToiletWithRelationsType>;
  ids: ID[];
  total: number | null;
  page: number;
  perPage: number;

  /** Replace or append a page of items (deduped) and set paging totals */
  setPageData: (page: number, items: ToiletWithRelationsType[], total: number | null, mode: Mode) => void;

  /** Add one item (deduped) */
  add: (item: ToiletWithRelationsType) => void;

  /** Add many (deduped, keeps existing order + new ids at the end) */
  addMany: (items: ToiletWithRelationsType[]) => void;

  /** Remove one */
  remove: (id: ID) => void;

  /** Clear everything */
  clear: () => void;
};

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  byId: {},
  ids: [],
  total: null,
  page: 1,
  perPage: 20,

  setPageData: (page, items, total, mode) =>
    set((state) => {
      const nextById = { ...state.byId };
      const newIds: ID[] = [];

      for (const it of items) {
        nextById[it.id] = it;
        newIds.push(it.id);
      }

      let nextIds: ID[];
      if (mode === "replace") {
        // Fresh order = incoming page (dedup built-in by Set)
        nextIds = Array.from(new Set(newIds));
      } else {
        // Append new ids to existing list, dedup
        nextIds = Array.from(new Set([...state.ids, ...newIds]));
      }

      return {
        byId: nextById,
        ids: nextIds,
        page,
        total,
      };
    }),

  add: (item) =>
    set((state) => {
      if (state.byId[item.id]) {
        // Update the existing item but don't duplicate id in list
        return {
          byId: { ...state.byId, [item.id]: item },
        };
      }
      return {
        byId: { ...state.byId, [item.id]: item },
        ids: [item.id, ...state.ids], // prepend or append—your call
        total: state.total != null ? state.total + 1 : state.total,
      };
    }),

  addMany: (items) =>
    set((state) => {
      const nextById = { ...state.byId };
      const mergedIds = new Set(state.ids);

      for (const it of items) {
        nextById[it.id] = it;
        mergedIds.add(it.id);
      }

      // Keep existing order first, then any new ids appended (Set already contains existing order).
      return {
        byId: nextById,
        ids: Array.from(mergedIds),
        total: state.total, // total typically comes from API; don’t auto-bump here
      };
    }),

  remove: (id) =>
    set((state) => {
      if (!state.byId[id]) return state;
      const { [id]: _, ...rest } = state.byId;
      return {
        byId: rest,
        ids: state.ids.filter((x) => x !== id),
        total: state.total != null ? Math.max(0, state.total - 1) : state.total,
      };
    }),

  clear: () => ({ byId: {}, ids: [], total: null, page: 1 }),
}));
