import { Request } from "express";
import fs from "fs/promises";
import path from "path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { env } from "../../config/env";

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

export function shouldServeLocalUploads() {
  return env.UPLOADS_DRIVER === "local";
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

  return `${Date.now()}-${safeBase || "image"}.webp`;
}

export async function optimizeCommerceImageUpload(input: {
  buffer: Buffer;
}) {
  const optimizedBuffer = await sharp(input.buffer)
    .rotate()
    .resize({
      width: COMMERCE_IMAGE_MAX_WIDTH,
      height: COMMERCE_IMAGE_MAX_HEIGHT,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({
      quality: COMMERCE_IMAGE_QUALITY,
      effort: 5,
    })
    .toBuffer();

  return {
    buffer: optimizedBuffer,
    mimeType: "image/webp" as const,
    size: optimizedBuffer.byteLength,
  };
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
