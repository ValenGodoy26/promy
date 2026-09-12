import { CommerceStatus, PromotionStatus, UserStatus } from "@prisma/client";
import { Response } from "express";
import { z } from "zod";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { logControllerError } from "../../shared/http/controllerLogger";
import { adminBetaAccessRequestsQuerySchema, listAdminBetaAccessRequests } from "../beta/beta.service";
import {
  createAdminCategoryRecord,
  getAdminAuditLogsData,
  getAdminCategoriesData,
  getAdminCommercesData,
  getAdminDashboardData,
  getAdminPromotionsData,
  isAdminServiceError,
  updateAdminCategoryRecord,
  updateCommerceByAdmin,
  updateCommerceStatusByAdmin,
  updatePromotionByAdmin,
  updatePromotionStatusByAdmin,
} from "./admin.service";

const cleanNote = (value?: string) =>
  value
    ?.replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || undefined;

const booleanish = z
  .enum(["true", "false"])
  .transform((value) => value === "true")
  .optional();

const updateCommerceStatusSchema = z.object({
  status: z.nativeEnum(CommerceStatus),
  note: z.string().trim().max(500).optional(),
});

const updatePromotionStatusSchema = z.object({
  status: z.nativeEnum(PromotionStatus),
  note: z.string().trim().max(500).optional(),
});

const optionalCleanString = (max = 1000) => z.string().trim().max(max).optional();

const updateCommerceBodySchema = z.object({
  name: optionalCleanString(120),
  shortDescription: optionalCleanString(160).nullable().optional(),
  description: optionalCleanString(1200).nullable().optional(),
  address: optionalCleanString(240),
  phone: optionalCleanString(80).nullable().optional(),
  instagram: optionalCleanString(80).nullable().optional(),
  logoUrl: optionalCleanString(600).nullable().optional(),
  coverUrl: optionalCleanString(600).nullable().optional(),
  latitude: z.number().finite().nullable().optional(),
  longitude: z.number().finite().nullable().optional(),
  cityId: z.number().int().positive().optional(),
  categoryId: z.number().int().positive().optional(),
  isFeatured: z.boolean().optional(),
  featuredRank: z.number().int().min(0).max(9999).optional(),
  isHiddenByAdmin: z.boolean().optional(),
  adminNote: optionalCleanString(500).nullable().optional(),
  note: optionalCleanString(500),
});

const updatePromotionBodySchema = z.object({
  title: optionalCleanString(140),
  description: optionalCleanString(1200),
  conditions: optionalCleanString(1200).nullable().optional(),
  discountValue: z.number().finite().nullable().optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  startTime: optionalCleanString(5).nullable().optional(),
  endTime: optionalCleanString(5).nullable().optional(),
  imageUrl: optionalCleanString(600).nullable().optional(),
  isFeatured: z.boolean().optional(),
  featuredRank: z.number().int().min(0).max(9999).optional(),
  isHiddenByAdmin: z.boolean().optional(),
  adminNote: optionalCleanString(500).nullable().optional(),
  note: optionalCleanString(500),
});

const adminAuditQuerySchema = z.object({
  targetType: z.enum(["COMMERCE", "PROMOTION"]).optional(),
  targetId: z.coerce.number().int().positive().optional(),
  commerceId: z.coerce.number().int().positive().optional(),
  adminUserId: z.coerce.number().int().positive().optional(),
  action: z
    .enum([
      "UPDATE_COMMERCE_STATUS",
      "UPDATE_PROMOTION_STATUS",
      "UPDATE_COMMERCE_CONTENT",
      "UPDATE_PROMOTION_CONTENT",
    ])
    .optional(),
  search: z.string().trim().max(120).optional(),
  incidentOnly: booleanish,
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const adminCommercesQuerySchema = z.object({
  status: z.nativeEnum(CommerceStatus).optional(),
  cityId: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  ownerStatus: z.nativeEnum(UserStatus).optional(),
  hasPromotions: booleanish,
  hasRedemptions: booleanish,
  mapReady: booleanish,
  profileComplete: booleanish,
  missingField: z
    .enum([
      "address",
      "coordinates",
      "shortDescription",
      "description",
      "phone",
      "instagram",
      "logo",
      "cover",
      "emailNotVerified",
      "categoryInactive",
      "cityInactive",
      "status",
    ])
    .optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const adminPromotionsQuerySchema = z.object({
  status: z.nativeEnum(PromotionStatus).optional(),
  commerceStatus: z.nativeEnum(CommerceStatus).optional(),
  cityId: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  hasRedemptions: booleanish,
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const adminCategoriesQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  isActive: booleanish,
});

const adminCategoryBodySchema = z.object({
  name: z.string().trim().min(2).max(80),
  icon: z.string().trim().max(80).optional(),
  isActive: z.boolean().optional(),
});

function handleAdminServiceError(error: unknown, res: Response) {
  if (isAdminServiceError(error)) {
    return res.status(error.statusCode).json({
      ok: false,
      message: error.message,
      ...(error.details ?? {}),
    });
  }

  return null;
}

export const getAdminDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const dashboard = await getAdminDashboardData();

    return res.status(200).json({
      ok: true,
      dashboard,
    });
  } catch (error: unknown) {
    logControllerError(req, "Get admin dashboard error", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno al obtener el dashboard admin",
    });
  }
};

export const getAdminAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = adminAuditQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Filtros de auditoria invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const result = await getAdminAuditLogsData(parsed.data);

    return res.status(200).json({
      ok: true,
      total: result.total,
      page: result.page,
      limit: result.limit,
      hasMore: result.hasMore,
      auditLogs: result.auditLogs,
    });
  } catch (error: unknown) {
    const handled = handleAdminServiceError(error, res);
    if (handled) {
      return handled;
    }

    logControllerError(req, "Get admin audit logs error", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno al obtener auditoria",
    });
  }
};

export const getAdminCommerces = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = adminCommercesQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Filtros de comercios invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const result = await getAdminCommercesData(parsed.data);

    return res.status(200).json({
      ok: true,
      total: result.total,
      page: result.page,
      limit: result.limit,
      hasMore: result.hasMore,
      commerces: result.commerces,
    });
  } catch (error: unknown) {
    const handled = handleAdminServiceError(error, res);
    if (handled) {
      return handled;
    }

    logControllerError(req, "Get admin commerces error", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno al obtener comercios",
    });
  }
};

export const updateCommerceStatus = async (req: AuthRequest, res: Response) => {
  try {
    const commerceId = Number(req.params.id);
    const adminUserId = req.user?.userId;

    if (Number.isNaN(commerceId)) {
      return res.status(400).json({
        ok: false,
        message: "ID de comercio invalido",
      });
    }

    if (!adminUserId) {
      return res.status(401).json({
        ok: false,
        message: "No autenticado",
      });
    }

    const parsed = updateCommerceStatusSchema.safeParse({
      ...req.body,
      note: cleanNote(req.body?.note),
    });

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const commerce = await updateCommerceStatusByAdmin({
      commerceId,
      adminUserId,
      status: parsed.data.status,
      note: parsed.data.note,
    });

    return res.status(200).json({
      ok: true,
      message: "Estado del comercio actualizado correctamente",
      commerce,
    });
  } catch (error: unknown) {
    const handled = handleAdminServiceError(error, res);
    if (handled) {
      return handled;
    }

    logControllerError(req, "Update commerce status error", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno al actualizar el estado del comercio",
    });
  }
};

export const updateCommerce = async (req: AuthRequest, res: Response) => {
  try {
    const commerceId = Number(req.params.id);
    const adminUserId = req.user?.userId;

    if (Number.isNaN(commerceId)) {
      return res.status(400).json({ ok: false, message: "ID de comercio invalido" });
    }

    if (!adminUserId) {
      return res.status(401).json({ ok: false, message: "No autenticado" });
    }

    const parsed = updateCommerceBodySchema.safeParse({
      ...req.body,
      note: cleanNote(req.body?.note),
    });

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const commerce = await updateCommerceByAdmin({
      commerceId,
      adminUserId,
      data: parsed.data,
    });

    return res.status(200).json({
      ok: true,
      message: "Comercio actualizado por admin",
      commerce,
    });
  } catch (error: unknown) {
    const handled = handleAdminServiceError(error, res);
    if (handled) return handled;

    logControllerError(req, "Update commerce by admin error", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno al actualizar comercio",
    });
  }
};

export const getAdminPromotions = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = adminPromotionsQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Filtros de promociones invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const result = await getAdminPromotionsData(parsed.data);

    return res.status(200).json({
      ok: true,
      total: result.total,
      page: result.page,
      limit: result.limit,
      hasMore: result.hasMore,
      promotions: result.promotions,
    });
  } catch (error: unknown) {
    const handled = handleAdminServiceError(error, res);
    if (handled) {
      return handled;
    }

    logControllerError(req, "Get admin promotions error", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno al obtener promociones",
    });
  }
};

export const updatePromotionStatus = async (req: AuthRequest, res: Response) => {
  try {
    const promotionId = Number(req.params.id);
    const adminUserId = req.user?.userId;

    if (Number.isNaN(promotionId)) {
      return res.status(400).json({
        ok: false,
        message: "ID de promocion invalido",
      });
    }

    if (!adminUserId) {
      return res.status(401).json({
        ok: false,
        message: "No autenticado",
      });
    }

    const parsed = updatePromotionStatusSchema.safeParse({
      ...req.body,
      note: cleanNote(req.body?.note),
    });

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const promotion = await updatePromotionStatusByAdmin({
      promotionId,
      adminUserId,
      status: parsed.data.status,
      note: parsed.data.note,
    });

    return res.status(200).json({
      ok: true,
      message: "Estado de la promocion actualizado correctamente",
      promotion,
    });
  } catch (error: unknown) {
    const handled = handleAdminServiceError(error, res);
    if (handled) {
      return handled;
    }

    logControllerError(req, "Update promotion status error", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno al actualizar el estado de la promocion",
    });
  }
};

export const updatePromotion = async (req: AuthRequest, res: Response) => {
  try {
    const promotionId = Number(req.params.id);
    const adminUserId = req.user?.userId;

    if (Number.isNaN(promotionId)) {
      return res.status(400).json({ ok: false, message: "ID de promocion invalido" });
    }

    if (!adminUserId) {
      return res.status(401).json({ ok: false, message: "No autenticado" });
    }

    const parsed = updatePromotionBodySchema.safeParse({
      ...req.body,
      note: cleanNote(req.body?.note),
    });

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const promotion = await updatePromotionByAdmin({
      promotionId,
      adminUserId,
      data: parsed.data,
    });

    return res.status(200).json({
      ok: true,
      message: "Promocion actualizada por admin",
      promotion,
    });
  } catch (error: unknown) {
    const handled = handleAdminServiceError(error, res);
    if (handled) return handled;

    logControllerError(req, "Update promotion by admin error", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno al actualizar promocion",
    });
  }
};

export const getAdminCategories = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = adminCategoriesQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Filtros de categorias invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const result = await getAdminCategoriesData(parsed.data);

    return res.status(200).json({
      ok: true,
      total: result.total,
      categories: result.categories,
    });
  } catch (error: unknown) {
    const handled = handleAdminServiceError(error, res);
    if (handled) {
      return handled;
    }

    logControllerError(req, "Get admin categories error", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno al obtener categorias",
    });
  }
};

export const getAdminBetaRequests = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = adminBetaAccessRequestsQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Filtros de beta requests invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const result = await listAdminBetaAccessRequests(parsed.data);

    return res.status(200).json({
      ok: true,
      total: result.total,
      page: result.page,
      limit: result.limit,
      requests: result.requests,
    });
  } catch (error: unknown) {
    logControllerError(req, "Get admin beta requests error", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno al obtener la lista de espera beta",
    });
  }
};

export const createAdminCategory = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = adminCategoryBodySchema.safeParse({
      ...req.body,
      name: req.body?.name?.trim(),
      icon: req.body?.icon?.trim() || undefined,
      isActive: req.body?.isActive,
    });

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos de categoria invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const category = await createAdminCategoryRecord(parsed.data);

    return res.status(201).json({
      ok: true,
      message: "Categoria creada correctamente",
      category,
    });
  } catch (error: unknown) {
    const handled = handleAdminServiceError(error, res);
    if (handled) {
      return handled;
    }

    logControllerError(req, "Create admin category error", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno al crear la categoria",
    });
  }
};

export const updateAdminCategory = async (req: AuthRequest, res: Response) => {
  try {
    const categoryId = Number(req.params.id);

    if (Number.isNaN(categoryId)) {
      return res.status(400).json({
        ok: false,
        message: "ID de categoria invalido",
      });
    }

    const parsed = adminCategoryBodySchema.safeParse({
      ...req.body,
      name: req.body?.name?.trim(),
      icon: req.body?.icon?.trim() || undefined,
      isActive: req.body?.isActive,
    });

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos de categoria invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const category = await updateAdminCategoryRecord({
      categoryId,
      data: parsed.data,
    });

    return res.status(200).json({
      ok: true,
      message: "Categoria actualizada correctamente",
      category,
    });
  } catch (error: unknown) {
    const handled = handleAdminServiceError(error, res);
    if (handled) {
      return handled;
    }

    logControllerError(req, "Update admin category error", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno al actualizar la categoria",
    });
  }
};
