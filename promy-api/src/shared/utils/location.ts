export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export type GeoBoundingBox = {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
};

export const DEFAULT_CITY_SLUG = "concordia";

export const hasValidCoordinates = (
  latitude?: number | null,
  longitude?: number | null,
): boolean =>
  typeof latitude === "number" &&
  Number.isFinite(latitude) &&
  latitude >= -90 &&
  latitude <= 90 &&
  typeof longitude === "number" &&
  Number.isFinite(longitude) &&
  longitude >= -180 &&
  longitude <= 180;

export const toRadians = (value: number) => (value * Math.PI) / 180;

export const calculateDistanceKm = (origin: GeoPoint, target: GeoPoint) => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(target.latitude - origin.latitude);
  const dLng = toRadians(target.longitude - origin.longitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(origin.latitude)) *
      Math.cos(toRadians(target.latitude)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

export const getGeoBoundingBox = (origin: GeoPoint, radiusKm: number): GeoBoundingBox => {
  const latitudeDelta = radiusKm / 111.32;
  const longitudeDelta =
    radiusKm / Math.max(111.32 * Math.cos(toRadians(origin.latitude)), 0.0001);

  return {
    minLatitude: origin.latitude - latitudeDelta,
    maxLatitude: origin.latitude + latitudeDelta,
    minLongitude: origin.longitude - longitudeDelta,
    maxLongitude: origin.longitude + longitudeDelta,
  };
};

export const mapDistanceFromOrigin = <
  T extends { latitude?: number | null; longitude?: number | null },
>(
  items: T[],
  origin?: GeoPoint | null,
) =>
  items.map((item) => ({
    ...item,
    distanceKm:
      origin && hasValidCoordinates(item.latitude, item.longitude)
        ? calculateDistanceKm(origin, {
            latitude: item.latitude!,
            longitude: item.longitude!,
          })
        : null,
  }));

export const sortByDistanceThen = <
  T extends {
    distanceKm?: number | null;
  },
>(
  items: T[],
  fallback: (left: T, right: T) => number,
) =>
  [...items].sort((left, right) => {
    const leftDistance = left.distanceKm;
    const rightDistance = right.distanceKm;

    if (leftDistance != null && rightDistance != null && leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }

    if (leftDistance != null) return -1;
    if (rightDistance != null) return 1;
    return fallback(left, right);
  });
