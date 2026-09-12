import type { PromotionStatus } from "../../types/api";

const PHONE_ALLOWED_CHARACTERS = /^\+?[0-9 ()-]+$/;

export function getCommercePhoneError(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;
  if (!PHONE_ALLOWED_CHARACTERS.test(normalized)) {
    return "Ingresa un telefono argentino valido, sin letras.";
  }

  const compact = normalized.replace(/[\s()-]/g, "");
  const digits = compact.replace(/\D/g, "");
  if (compact.startsWith("+") && !compact.startsWith("+54")) {
    return "Usa un numero local o el prefijo argentino +54.";
  }

  const validLength = compact.startsWith("+54")
    ? digits.length >= 10 && digits.length <= 13
    : digits.length >= 8 && digits.length <= 11;

  return validLength ? null : "El telefono es demasiado corto o demasiado largo.";
}

export type CommerceProfileValidationInput = {
  name: string;
  address: string;
  phone: string;
  cityId: string;
  categoryId: string;
  latitude: string;
  longitude: string;
};

export function validateCommerceProfileForm(form: CommerceProfileValidationInput) {
  const errors: Partial<Record<keyof CommerceProfileValidationInput, string>> = {};
  const phoneError = getCommercePhoneError(form.phone);

  if (form.name.trim().length < 2) errors.name = "El nombre debe tener al menos 2 caracteres.";
  if (form.address.trim().length < 2) errors.address = "La direccion debe tener al menos 2 caracteres.";
  if (!form.cityId.trim()) errors.cityId = "Selecciona una ciudad.";
  if (!form.categoryId.trim()) errors.categoryId = "Selecciona una categoria.";
  if (phoneError) errors.phone = phoneError;

  const latitude = form.latitude.trim();
  const longitude = form.longitude.trim();
  if (Boolean(latitude) !== Boolean(longitude)) {
    const message = "Completa latitud y longitud juntas.";
    errors.latitude = message;
    errors.longitude = message;
  } else if (latitude && longitude) {
    const parsedLatitude = Number(latitude.replace(",", "."));
    const parsedLongitude = Number(longitude.replace(",", "."));
    if (!Number.isFinite(parsedLatitude) || parsedLatitude < -90 || parsedLatitude > 90) {
      errors.latitude = "La latitud debe estar entre -90 y 90.";
    }
    if (!Number.isFinite(parsedLongitude) || parsedLongitude < -180 || parsedLongitude > 180) {
      errors.longitude = "La longitud debe estar entre -180 y 180.";
    }
  }

  return errors;
}

export function getOwnerEditablePromotionStatus(status: PromotionStatus): PromotionStatus {
  return status === "DRAFT" || status === "PENDING_REVIEW" ? status : "PENDING_REVIEW";
}

export function serializeBusinessDate(value: string) {
  const normalized = value.trim();
  return normalized ? `${normalized}T00:00:00.000Z` : null;
}

export function formatBusinessDate(value?: string | null) {
  if (!value) return null;
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})/)?.slice(1).map(Number);
  if (!dateOnly) return value;

  const [year, month, day] = dateOnly;
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}
