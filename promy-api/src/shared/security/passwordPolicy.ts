import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 8;
export const BCRYPT_PASSWORD_MAX_UTF8_BYTES = 72;
export const PASSWORD_MAX_BYTES_MESSAGE =
  `La contrasena no debe superar ${BCRYPT_PASSWORD_MAX_UTF8_BYTES} bytes UTF-8`;

export function getPasswordUtf8ByteLength(password: string) {
  return Buffer.byteLength(password, "utf8");
}

export function isPasswordWithinBcryptByteLimit(password: string) {
  return getPasswordUtf8ByteLength(password) <= BCRYPT_PASSWORD_MAX_UTF8_BYTES;
}

export const newPasswordSchema = z
  .string()
  .min(
    PASSWORD_MIN_LENGTH,
    `La contrasena debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`,
  )
  .refine(isPasswordWithinBcryptByteLimit, PASSWORD_MAX_BYTES_MESSAGE)
  .regex(/[A-Z]/, "La contrasena debe incluir al menos una mayuscula")
  .regex(/[a-z]/, "La contrasena debe incluir al menos una minuscula")
  .regex(/\d/, "La contrasena debe incluir al menos un numero");
