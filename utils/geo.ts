import type { Region } from "react-native-maps";

export const DEFAULT_CENTER = { latitude: 36.7525, longitude: 3.04197 }; // Algiers

export function kmToLatDelta(km: number) {
  return km / 111;
}
export function kmToLngDelta(km: number, atLat: number) {
  const denom = 111 * Math.cos((Math.PI / 180) * atLat);
  return denom === 0 ? km / 111 : km / denom;
}

export function makeRegion(lat: number, lng: number, radiusKm: number): Region {
  return {
    latitude: lat,
    longitude: lng,
    latitudeDelta: kmToLatDelta(radiusKm * 2),
    longitudeDelta: kmToLngDelta(radiusKm * 2, lat),
  };
}
