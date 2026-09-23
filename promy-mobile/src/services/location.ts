import * as Location from "expo-location";
import { DEFAULT_LAT, DEFAULT_LNG } from "../utils/promy";
import {
  resolvePromyLocation,
  type LocationFallbackReason,
  type LocationSnapshot,
} from "./locationCore";

export const DEFAULT_CITY_SLUG = "concordia";
export const DEFAULT_CITY_LABEL = "Concordia";

export type { LocationFallbackReason, LocationSnapshot };

export async function getPromyLocation(options?: {
  requestPermission?: boolean;
  timeoutMs?: number;
}): Promise<LocationSnapshot> {
  return resolvePromyLocation(
    {
      getPermission: () => Location.getForegroundPermissionsAsync(),
      requestPermission: () => Location.requestForegroundPermissionsAsync(),
      hasServicesEnabled: () => Location.hasServicesEnabledAsync(),
      getPosition: async () => {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        return {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
      },
    },
    {
      requestPermission: options?.requestPermission,
      timeoutMs: options?.timeoutMs,
      fallback: {
        latitude: DEFAULT_LAT,
        longitude: DEFAULT_LNG,
        label: DEFAULT_CITY_LABEL,
        citySlug: DEFAULT_CITY_SLUG,
      },
    },
  );
}

export async function getLocationPermissionSnapshot() {
  return Location.getForegroundPermissionsAsync();
}
