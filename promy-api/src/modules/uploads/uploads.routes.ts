import { Router } from "express";
import multer from "multer";
import { UserRole } from "@prisma/client";
import {
  requireActiveSession,
  requireAuth,
  requireRole,
} from "../../middlewares/auth.middleware";
import { uploadLimiter } from "../../middlewares/rateLimiters";
import { storeCommerceImageUpload } from "../../shared/services/uploads.service";

const allowedImageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const uploadLimits = {
  fileSize: 5 * 1024 * 1024,
  fieldArrayIndexLimit: 0,
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: uploadLimits,
  fileFilter: (_req, file, cb) => {
    if (!allowedImageMimeTypes.has(file.mimetype)) {
      cb(new Error("Solo se permiten imagenes JPG, PNG o WebP"));
      return;
    }

    cb(null, true);
  },
});

function detectImageMimeType(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

const router = Router();

router.post(
  "/commerce-image",
  uploadLimiter,
  requireAuth,
  requireActiveSession,
  requireRole(UserRole.COMMERCE, UserRole.ADMIN),
  upload.single("file"),
  async (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        message: "No se recibio ninguna imagen",
      });
    }

    const fileHeader = req.file.buffer.subarray(0, 16);
    const detectedMimeType = detectImageMimeType(fileHeader);

    if (!detectedMimeType || detectedMimeType !== req.file.mimetype) {
      return res.status(400).json({
        ok: false,
        message: "La imagen no coincide con un formato permitido",
      });
    }

    try {
      const storedUpload = await storeCommerceImageUpload({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        req,
      });

      return res.status(201).json({
        ok: true,
        message: "Imagen subida correctamente",
        file: {
          ...storedUpload,
          originalMimeType: req.file.mimetype,
          originalSize: req.file.size,
        },
      });
    } catch (error) {
      return next(error);
    }
  },
);

export default router;
