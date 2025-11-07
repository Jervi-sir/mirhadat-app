import { ISODateTimeType, PricingModelType, ToiletCategoryType, ToiletWithRelationsType, UserType, WilayaType } from "../types";

function nowISO(): ISODateTimeType {
  return new Date().toISOString() as ISODateTimeType;
}

export function makeFakeToilet(): ToiletWithRelationsType {
  const created = nowISO();
  const updated = created;

  const fakeCategory: ToiletCategoryType = {
    id: 1,
    code: "cafeteria",
    icon: "mdi:cup",
    en: "Cafeteria",
    fr: "Cafétéria",
    ar: "مقهى",
    created_at: created,
    updated_at: updated,
  };

  const fakeWilaya: WilayaType = {
    id: 16,
    code: "DZ-16",
    number: 16,
    en: "Algiers",
    fr: "Alger",
    ar: "الجزائر",
    created_at: created,
    updated_at: updated,
  };

  const fakeOwner: Pick<UserType, "id" | "name"> = { id: 42, name: "Octa Place" };

  return {
    id: 1001,
    owner_id: 42,
    toilet_category_id: fakeCategory.id,

    name: "Octa Mall — Level 2",
    description: "Clean facilities near the food court. Staff checks every hour.",
    phone_numbers: ["0550 000 000"],

    lat: 36.7525,
    lng: 3.04197,

    address_line: "Centre Commercial Octa Mall, Alger",
    wilaya_id: fakeWilaya.id,
    place_hint: "By the escalators, next to Kiosque Z",

    access_method: "public",
    capacity: 4,
    is_unisex: true,

    amenities: ["paper", "soap", "water", "bidet"],
    rules: ["no_smoking", "for_customers_only"],

    is_free: false,
    price_cents: 50,
    pricing_model: "per-visit" as PricingModelType,

    status: "active",
    avg_rating: 4.3,
    reviews_count: 128,
    photos_count: 6,

    created_at: created,
    updated_at: updated,

    category: fakeCategory,
    wilaya: fakeWilaya,
    // @ts-ignore
    owner: fakeOwner,
    photos: [],
    open_hours: [],
    is_favorite: false,
  };
}
