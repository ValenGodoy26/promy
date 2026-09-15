import { Request } from "express";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { DeleteObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { env } from "../../config/env";
import { ServiceError } from "../utils/service";

type StoredUpload = {
  filename: string;
  storageDriver: typeof env.UPLOADS_DRIVER;
  url: string;
  relativeUrl: string;
  mimeType: string;
  size: number;
};

const commerceUploadDir = path.resolve(process.cwd(), "uploads", "commerce");
let s3Client: S3Client | null = null;
const COMMERCE_IMAGE_MAX_WIDTH = 1600;
const COMMERCE_IMAGE_MAX_HEIGHT = 1600;
const COMMERCE_IMAGE_QUALITY = 82;
export const COMMERCE_IMAGE_INPUT_MAX_WIDTH = 12_000;
export const COMMERCE_IMAGE_INPUT_MAX_HEIGHT = 12_000;
export const COMMERCE_IMAGE_INPUT_MAX_PIXELS = 40_000_000;
export const COMMERCE_IMAGE_PROCESSING_CONCURRENCY = 2;
export const COMMERCE_IMAGE_PROCESSING_MAX_QUEUE = 6;

let activeImageProcessors = 0;
const imageProcessingQueue: Array<() => void> = [];

export function assertCommerceImageMetadataWithinBudget(metadata: {
  width?: number;
  height?: number;
}) {
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (!width || !height) {
    throw new ServiceError("No pudimos determinar las dimensiones de la imagen", 415);
  }
  if (
    width > COMMERCE_IMAGE_INPUT_MAX_WIDTH ||
    height > COMMERCE_IMAGE_INPUT_MAX_HEIGHT ||
    width * height > COMMERCE_IMAGE_INPUT_MAX_PIXELS
  ) {
    throw new ServiceError(
      `La imagen excede el límite de ${COMMERCE_IMAGE_INPUT_MAX_PIXELS / 1_000_000} megapíxeles`,
      413,
    );
  }
}

export async function withCommerceImageProcessingSlot<T>(work: () => Promise<T>) {
  if (activeImageProcessors >= COMMERCE_IMAGE_PROCESSING_CONCURRENCY) {
    if (imageProcessingQueue.length >= COMMERCE_IMAGE_PROCESSING_MAX_QUEUE) {
      throw new ServiceError("Hay demasiadas imágenes procesándose. Reintentá en unos segundos", 429);
    }
    await new Promise<void>((resolve) => imageProcessingQueue.push(resolve));
  }

  activeImageProcessors += 1;
  try {
    return await work();
  } finally {
    activeImageProcessors -= 1;
    imageProcessingQueue.shift()?.();
  }
}

export function shouldServeLocalUploads() {
  return env.UPLOADS_DRIVER === "local";
}

export function setUploadsS3ClientForTests(client: Pick<S3Client, "send"> | null) {
  if (env.APP_ENV === "production") {
    throw new Error("El reemplazo del cliente S3 no está disponible en producción");
  }
  s3Client = client as S3Client | null;
}

export function buildUploadPublicUrl(relativeUrl: string, req?: Request) {
  const normalizedPath = relativeUrl.startsWith("/") ? relativeUrl : `/${relativeUrl}`;

  if (env.UPLOADS_PUBLIC_BASE_URL) {
    return new URL(normalizedPath, env.UPLOADS_PUBLIC_BASE_URL).toString();
  }

  if (env.PUBLIC_API_BASE_URL) {
    return new URL(normalizedPath, env.PUBLIC_API_BASE_URL).toString();
  }

  if (req) {
    const requestBaseUrl = `${req.protocol}://${req.get("host")}`;
    return new URL(normalizedPath, requestBaseUrl).toString();
  }

  return normalizedPath;
}

export function buildSafeUploadFilename(originalName?: string | null) {
  const originalExt = path.extname(originalName || "").toLowerCase();
  const safeBase = path
    .basename(originalName || "image", originalExt)
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/-+/g, "-")
    .slice(0, 48)
    .toLowerCase();

  return `${randomUUID()}-${safeBase || "image"}.webp`;
}

export async function optimizeCommerceImageUpload(input: {
  buffer: Buffer;
}) {
  return withCommerceImageProcessingSlot(async () => {
    let optimizedBuffer: Buffer;

    try {
      const image = sharp(input.buffer, { limitInputPixels: false });
      const metadata = await image.metadata();
      assertCommerceImageMetadataWithinBudget(metadata);
      optimizedBuffer = await image
        .rotate()
        .resize({
          width: COMMERCE_IMAGE_MAX_WIDTH,
          height: COMMERCE_IMAGE_MAX_HEIGHT,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: COMMERCE_IMAGE_QUALITY, effort: 5 })
        .toBuffer();
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      if (
        error instanceof Error &&
        /(unsupported image format|corrupt|unexpected end|pngload|jpegload|webpload|input buffer)/i.test(error.message)
      ) {
        throw new ServiceError("La imagen está corrupta o usa un formato no soportado", 415);
      }
      throw error;
    }

    return {
      buffer: optimizedBuffer,
      mimeType: "image/webp" as const,
      size: optimizedBuffer.byteLength,
    };
  });
}

function getS3Client() {
  if (s3Client) {
    return s3Client;
  }

  s3Client = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID!,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
    },
  });

  return s3Client;
}

async function storeLocalCommerceImage(input: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  req?: Request;
}): Promise<StoredUpload> {
  await fs.mkdir(commerceUploadDir, { recursive: true });
  await fs.writeFile(path.join(commerceUploadDir, input.filename), input.buffer);

  const relativeUrl = `/uploads/commerce/${input.filename}`;

  return {
    filename: input.filename,
    storageDriver: "local",
    relativeUrl,
    url: buildUploadPublicUrl(relativeUrl, input.req),
    mimeType: input.mimeType,
    size: input.buffer.byteLength,
  };
}

async function storeS3CommerceImage(input: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}): Promise<StoredUpload> {
  const key = `commerce/${input.filename}`;

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: input.buffer,
      ContentType: input.mimeType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  const relativeUrl = `/${key}`;

  return {
    filename: input.filename,
    storageDriver: "s3",
    relativeUrl,
    url: buildUploadPublicUrl(relativeUrl),
    mimeType: input.mimeType,
    size: input.buffer.byteLength,
  };
}

function managedUploadPathFromUrl(value?: string | null) {
  if (!value) return null;
  let pathname = value;
  try {
    const parsed = new URL(value, "http://promy.local");
    if (/^https?:\/\//i.test(value)) {
      const allowedOrigins = [env.UPLOADS_PUBLIC_BASE_URL, env.PUBLIC_API_BASE_URL]
        .filter((candidate): candidate is string => Boolean(candidate))
        .map((candidate) => new URL(candidate).origin);
      if (!allowedOrigins.includes(parsed.origin)) return null;
    }
    pathname = parsed.pathname;
  } catch {
    return null;
  }
  const match = pathname.match(/^\/(?:uploads\/)?commerce\/([0-9a-f-]+-[a-z0-9-_]+\.webp)$/i);
  if (!match) return null;
  return { filename: match[1], key: `commerce/${match[1]}` };
}

export function isManagedCommerceUploadUrl(value?: string | null) {
  return managedUploadPathFromUrl(value) !== null;
}

export function getManagedCommerceUploadKey(value?: string | null) {
  return managedUploadPathFromUrl(value)?.key ?? null;
}

export async function listCommerceImageUploads() {
  if (env.UPLOADS_DRIVER === "s3") {
    const objects: Array<{ key: string; modifiedAt: Date | null }> = [];
    let continuationToken: string | undefined;
    do {
      const page = await getS3Client().send(new ListObjectsV2Command({
        Bucket: env.S3_BUCKET,
        Prefix: "commerce/",
        ContinuationToken: continuationToken,
      }));
      for (const item of page.Contents ?? []) {
        if (item.Key && managedUploadPathFromUrl(`/${item.Key}`)) {
          objects.push({ key: item.Key, modifiedAt: item.LastModified ?? null });
        }
      }
      continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (continuationToken);
    return objects;
  }

  try {
    const entries = await fs.readdir(commerceUploadDir, { withFileTypes: true });
    return Promise.all(entries.filter((entry) => entry.isFile() && managedUploadPathFromUrl(`/uploads/commerce/${entry.name}`)).map(async (entry) => {
      const stats = await fs.stat(path.join(commerceUploadDir, entry.name));
      return { key: `commerce/${entry.name}`, modifiedAt: stats.mtime };
    }));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function deleteCommerceImageUpload(value?: string | null) {
  const managed = managedUploadPathFromUrl(value);
  if (!managed) return false;

  if (env.UPLOADS_DRIVER === "s3") {
    await getS3Client().send(
      new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: managed.key }),
    );
    return true;
  }

  try {
    await fs.unlink(path.join(commerceUploadDir, managed.filename));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return true;
}

export async function cleanupCommerceImages(values: Array<string | null | undefined>) {
  const failures: Array<{ value: string; error: unknown }> = [];
  for (const value of new Set(values.filter((item): item is string => Boolean(item)))) {
    try {
      await deleteCommerceImageUpload(value);
    } catch (error) {
      failures.push({ value, error });
    }
  }
  return failures;
}

export async function storeCommerceImageUpload(input: {
  buffer: Buffer;
  originalName?: string | null;
  mimeType: string;
  req?: Request;
}) {
  const optimizedImage = await optimizeCommerceImageUpload({
    buffer: input.buffer,
  });
  const filename = buildSafeUploadFilename(input.originalName);

  if (env.UPLOADS_DRIVER === "s3") {
    return storeS3CommerceImage({
      buffer: optimizedImage.buffer,
      filename,
      mimeType: optimizedImage.mimeType,
    });
  }

  return storeLocalCommerceImage({
    buffer: optimizedImage.buffer,
    filename,
    mimeType: optimizedImage.mimeType,
    req: input.req,
  });
}
