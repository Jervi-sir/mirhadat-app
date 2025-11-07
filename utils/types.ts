export type id = number;
export type ISODateTimeType = string; // e.g. "2025-11-05T13:37:00Z"

/* ---------- ENUMS ---------- */
export type AccessMethodType = "public" | "code" | "staff" | "key" | "app";
export type PricingModelType = "flat" | "per-visit" | "per-30-min" | "per-60-min" | null;
export type ToiletStatusType = "pending" | "active" | "suspended";
export type ReportReasonType = "closed" | "fake" | "unsafe" | "harassment" | "other";
export type DayOfWeekType = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type FiltersType = {
  isFree?: boolean;
  accessMethod?: "public" | "code" | "staff" | "key" | "app";
  pricingModel?: "flat" | "per-visit" | "per-30-min" | "per-60-min" | null;
  minRating?: number;
  amenities?: string[];
};

/* ---------- CORE MODELS ---------- */
export interface RoleType {
  id: id;
  code: string;
}

export interface UserType {
  id: id;
  name: string;
  phone: string;
  email?: string | null;
  role_code?: string | null;
  role?: RoleType | null;
  created_at: ISODateTimeType;
  updated_at: ISODateTimeType;
}

export interface WilayaType {
  id: id;
  code: string;
  number: number;
  en: string | null;
  fr: string | null;
  ar: string | null;

  center_lat?: number | null;
  center_lng?: number | null;
  default_radius_km?: number | null;
  min_lat?: number | null;
  max_lat?: number | null;
  min_lng?: number | null;
  max_lng?: number | null;

  created_at: ISODateTimeType;
  updated_at: ISODateTimeType;
}

export interface ToiletCategoryType {
  id: id;
  code: string;
  icon: string | null;
  en: string | null;
  fr: string | null;
  ar: string | null;
  created_at: ISODateTimeType;
  updated_at: ISODateTimeType;
}

export type ToiletMarkerType = {
  id: number;
  lat: number;
  lng: number;
  is_free: boolean;
  distance_km?: number | null;
};

export interface ToiletType {
  id: id;
  owner_id: id | null;
  toilet_category_id: id;

  name: string;
  description: string | null;
  phone_numbers: string[] | null;

  lat: number;
  lng: number;

  address_line: string;
  wilaya_id: id;
  place_hint: string | null;

  access_method: AccessMethodType;
  capacity: number;
  is_unisex: boolean;

  amenities: string[] | null;
  rules: string[] | null;

  is_free: boolean;
  price_cents: number | null;
  pricing_model: PricingModelType;

  status: ToiletStatusType;
  avg_rating: number;
  reviews_count: number;

  photos_count: number;
  photos?: ToiletPhotoType[];
  cover_photo?: ToiletPhotoType;

  created_at: ISODateTimeType;
  updated_at: ISODateTimeType;
}

export interface ToiletPhotoType {
  id: id;
  toilet_id: id;
  url: string;
  is_cover: boolean;
  created_at: ISODateTimeType;
  updated_at: ISODateTimeType;
}

export interface ToiletOpenHourType {
  id: id;
  toilet_id: id;
  day_of_week: DayOfWeekType;
  opens_at: string; // "HH:MM:SS"
  closes_at: string;
  sequence: number;
  created_at: ISODateTimeType;
  updated_at: ISODateTimeType;
}

export interface FavoriteType {
  id: id;
  user_id: id;
  toilet_id: id;
  created_at: ISODateTimeType;
  updated_at: ISODateTimeType;
}

export interface ToiletSessionType {
  id: id;
  toilet_id: id;
  user_id: id | null;
  started_at: ISODateTimeType;
  ended_at: ISODateTimeType | null;
  charge_cents: number | null;
  start_method: string | null;
  end_method: string | null;
  created_at: ISODateTimeType;
  updated_at: ISODateTimeType;
}

export interface ToiletReviewType {
  id: id;
  toilet_id: id;
  user_id: id;
  rating: number;
  text: string | null;
  cleanliness: number | null;
  smell: number | null;
  stock: number | null;
  created_at: ISODateTimeType;
  updated_at: ISODateTimeType;
}

export interface ToiletReportType {
  id: id;
  toilet_id: id;
  user_id: id | null;
  reason: ReportReasonType;
  details: string | null;
  resolved_at: ISODateTimeType | null;
  created_at: ISODateTimeType;
  updated_at: ISODateTimeType;
}

/* ---------- RELATIONAL VIEWS ---------- */
export interface ToiletWithRelationsType extends ToiletType {
  category?: ToiletCategoryType | null;
  wilaya?: WilayaType | null;
  owner?: UserType | null;
  photos?: ToiletPhotoType[] | [];
  open_hours?: ToiletOpenHourType[] | [];
  is_favorite?: boolean;
}

/* ---------- GENERIC API TYPES ---------- */
export interface PaginatedType<T> {
  data: T[];
  page: number;
  per_page: number;
  total: number;
}

export interface ApiListResponseType<T> {
  data: T[];
  meta?: { page?: number; per_page?: number; total?: number };
}

export interface ApiItemResponseType<T> {
  data: T;
}
