export type LocationFallbackReason =
  | "permission_not_requested"
  | "permission_denied"
  | "permission_permanently_denied"
  | "location_services_disabled"
  | "device_error"
  | "timeout";

export type LocationPermission = {
  status: string;
  canAskAgain?: boolean;
};

export type LocationProvider = {
  getPermission: () => Promise<LocationPermission>;
  requestPermission: () => Promise<LocationPermission>;
  hasServicesEnabled?: () => Promise<boolean>;
  getPosition: () => Promise<{ latitude: number; longitude: number }>;
};

export type LocationSnapshot = {
  latitude: number;
  longitude: number;
  source: "device" | "city_fallback";
  label: string;
  citySlug: string;
  permissionStatus?: string;
  canAskAgain?: boolean;
  fallbackReason?: LocationFallbackReason | null;
};

type ResolvePromyLocationOptions = {
  requestPermission?: boolean;
  timeoutMs?: number;
  fallback: Pick<LocationSnapshot, "latitude" | "longitude" | "label" | "citySlug">;
};

const DEFAULT_LOCATION_TIMEOUT_MS = 8_000;

function fallbackReasonFor(permission: LocationPermission, requested: boolean): LocationFallbackReason {
  if (permission.canAskAgain === false) return "permission_permanently_denied";
  if (permission.status === "denied") return "permission_denied";
  return requested ? "permission_denied" : "permission_not_requested";
}

function createFallback(
  fallback: ResolvePromyLocationOptions["fallback"],
  reason: LocationFallbackReason,
  permission?: LocationPermission,
): LocationSnapshot {
  return {
    ...fallback,
    source: "city_fallback",
    permissionStatus: permission?.status,
    canAskAgain: permission?.canAskAgain,
    fallbackReason: reason,
  };
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("location_timeout")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function resolvePromyLocation(
  provider: LocationProvider,
  options: ResolvePromyLocationOptions,
): Promise<LocationSnapshot> {
  try {
    let permission = await provider.getPermission();

    if (permission.status !== "granted" && options.requestPermission && permission.canAskAgain !== false) {
      permission = await provider.requestPermission();
    }

    if (permission.status !== "granted") {
      return createFallback(
        options.fallback,
        fallbackReasonFor(permission, Boolean(options.requestPermission)),
        permission,
      );
    }

    if (provider.hasServicesEnabled && !(await provider.hasServicesEnabled())) {
      return createFallback(options.fallback, "location_services_disabled", permission);
    }

    const position = await withTimeout(
      provider.getPosition(),
      options.timeoutMs ?? DEFAULT_LOCATION_TIMEOUT_MS,
    );

    return {
      latitude: position.latitude,
      longitude: position.longitude,
      source: "device",
      label: "Tu ubicación",
      citySlug: options.fallback.citySlug,
      permissionStatus: permission.status,
      canAskAgain: permission.canAskAgain,
      fallbackReason: null,
    };
  } catch (error) {
    const reason = error instanceof Error && error.message === "location_timeout" ? "timeout" : "device_error";
    return createFallback(options.fallback, reason);
  }
}
