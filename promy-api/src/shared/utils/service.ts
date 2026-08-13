import { Prisma } from "@prisma/client";
import { logWarn } from "../logging/logger";

export class ServiceError extends Error {
  statusCode: number;
  details?: Record<string, unknown>;

  constructor(message: string, statusCode = 400, details?: Record<string, unknown>) {
    super(message);
    this.name = "ServiceError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError;
}

export function cleanText(value?: string | null) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : undefined;
}

export function normalizeSearchTerm(value?: string | null) {
  return cleanText(value)?.toLowerCase();
}

export function isMissingFullTextIndexError(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2030" &&
    /fulltext index/i.test(error.message)
  ) {
    return true;
  }

  return error instanceof Error && /fulltext index/i.test(error.message);
}

export async function withFullTextSearchFallback<T>(
  primaryQuery: () => Promise<T>,
  fallbackQuery: () => Promise<T>,
  context = "catalog search",
) {
  try {
    return await primaryQuery();
  } catch (error) {
    if (!isMissingFullTextIndexError(error)) {
      throw error;
    }

    logWarn(undefined, "Missing fulltext index detected. Using contains fallback.", {
      context,
    });
    return fallbackQuery();
  }
}
