import { z } from "zod";

const PHONE_ALLOWED_CHARACTERS = /^\+?[0-9 ()-]+$/;
const PHONE_ERROR_MESSAGE =
  "Telefono invalido. Usa un numero argentino local o con prefijo +54.";

export function isValidArgentinaPhone(value: string) {
  const normalized = value.trim();
  if (!normalized) return true;
  if (!PHONE_ALLOWED_CHARACTERS.test(normalized)) return false;

  const compact = normalized.replace(/[\s()-]/g, "");
  const digits = compact.replace(/\D/g, "");

  if (compact.startsWith("+") && !compact.startsWith("+54")) {
    return false;
  }

  return compact.startsWith("+54")
    ? digits.length >= 10 && digits.length <= 13
    : digits.length >= 8 && digits.length <= 11;
}

const commercePhoneInputSchema = z
  .string()
  .trim()
  .max(40, PHONE_ERROR_MESSAGE)
  .refine(isValidArgentinaPhone, PHONE_ERROR_MESSAGE)
  .transform((value) => value || null);

export const optionalCommercePhoneSchema = commercePhoneInputSchema.optional();

export const nullableOptionalCommercePhoneSchema = z
  .union([commercePhoneInputSchema, z.null()])
  .optional();
