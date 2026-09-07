import * as Location from "expo-location";
import { DEFAULT_LAT, DEFAULT_LNG } from "../utils/promy";

export const DEFAULT_CITY_SLUG = "concordia";
export const DEFAULT_CITY_LABEL = "Concordia";

export type LocationSnapshot = {
  latitude: number;
  longitude: number;
  source: "device" | "city_fallback";
  label: string;
  citySlug: string;
  permissionStatus?: string;
  fallbackReason?: "permission_denied" | "device_error" | null;
};

const buildFallbackSnapshot = (
  reason: LocationSnapshot["fallbackReason"],
  permissionStatus?: string,
): LocationSnapshot => ({
  latitude: DEFAULT_LAT,
  longitude: DEFAULT_LNG,
  source: "city_fallback",
  label: DEFAULT_CITY_LABEL,
  citySlug: DEFAULT_CITY_SLUG,
  permissionStatus,
  fallbackReason: reason,
});

export async function getPromyLocation(): Promise<LocationSnapshot> {
  try {
    const currentPermission = await Location.getForegroundPermissionsAsync();
    const permission =
      currentPermission.status === "granted"
        ? currentPermission
        : await Location.requestForegroundPermissionsAsync();

    if (permission.status !== "granted") {
      return buildFallbackSnapshot("permission_denied", permission.status);
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      source: "device",
      label: "Tu ubicacion",
      citySlug: DEFAULT_CITY_SLUG,
      permissionStatus: permission.status,
      fallbackReason: null,
    };
  } catch {
    return buildFallbackSnapshot("device_error");
  }
}

export async function getLocationPermissionSnapshot() {
  return Location.getForegroundPermissionsAsync();
}
