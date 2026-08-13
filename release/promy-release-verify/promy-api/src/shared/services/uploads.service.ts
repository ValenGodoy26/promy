import { Request } from "express";
import fs from "fs/promises";
import path from "path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "../../config/env";

type StoredUpload = {
  filename: string;
  storageDriver: typeof env.UPLOADS_DRIVER;
  url: string;
  relativeUrl: string;
};

const commerceUploadDir = path.resolve(process.cwd(), "uploads", "commerce");
let s3Client: S3Client | null = null;

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
  const ext = path.extname(originalName || "").toLowerCase() || ".jpg";
  const safeBase = path
    .basename(originalName || "image", ext)
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/-+/g, "-")
    .slice(0, 48)
    .toLowerCase();

  return `${Date.now()}-${safeBase || "image"}${ext}`;
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
  };
}

export async function storeCommerceImageUpload(input: {
  buffer: Buffer;
  originalName?: string | null;
  mimeType: string;
  req?: Request;
}) {
  const filename = buildSafeUploadFilename(input.originalName);

  if (env.UPLOADS_DRIVER === "s3") {
    return storeS3CommerceImage({
      buffer: input.buffer,
      filename,
      mimeType: input.mimeType,
    });
  }

  return storeLocalCommerceImage({
    buffer: input.buffer,
    filename,
    req: input.req,
  });
}
