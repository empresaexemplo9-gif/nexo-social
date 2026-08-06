// Utilitários de geolocalização (cálculo de proximidade de eventos).
// Funções puras — podem ser usadas tanto no servidor quanto no cliente.

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

/**
 * Distância em quilômetros entre dois pontos usando a fórmula de Haversine.
 */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Ordena itens geolocalizados por proximidade de uma origem, anexando a
 * distância calculada. Não filtra — apenas ordena.
 */
export function sortByProximity<T extends { coords: LatLng }>(
  items: T[],
  origin: LatLng | null,
): (T & { distanceKm: number | null })[] {
  const list = items.map((item) => ({
    ...item,
    distanceKm: origin ? haversineKm(origin, item.coords) : null,
  }));
  if (!origin) return list;
  return list.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
}

/**
 * Formata uma distância (km) de forma amigável para o usuário.
 */
export function formatDistance(km: number): string {
  if (!Number.isFinite(km)) return '';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`;
  return `${Math.round(km)} km`;
}
