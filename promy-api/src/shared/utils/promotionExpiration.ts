import { PromotionStatus } from "@prisma/client";
import prisma from "../../config/prisma";
import { invalidatePublicCatalogCache } from "../cache/publicCatalogCache";
import { logError, logInfo } from "../logging/logger";

const EXPIRATION_CHECK_COOLDOWN_MS = 60 * 1000;
const EXPIRATION_LOOP_INTERVAL_MS = 5 * 60 * 1000;

let lastExpirationRunAt = 0;
let activeExpirationRun: Promise<number> | null = null;
let expirationLoopHandle: NodeJS.Timeout | null = null;

async function executeExpirationSweep(source: string) {
  const now = new Date();

  const result = await prisma.promotion.updateMany({
    where: {
      status: PromotionStatus.APPROVED_VISIBLE,
      endDate: {
        lt: now,
      },
    },
    data: {
      status: PromotionStatus.EXPIRED,
    },
  });

  lastExpirationRunAt = Date.now();

  if (result.count > 0) {
    await invalidatePublicCatalogCache();
    logInfo(undefined, "Promociones expiradas automaticamente", {
      source,
      affectedCount: result.count,
    });
  }

  return result.count;
}

export async function expireOverduePromotions(options?: {
  force?: boolean;
  source?: string;
}) {
  const source = options?.source || "manual";
  const force = options?.force ?? false;
  const shouldReuseCooldown =
    !force && Date.now() - lastExpirationRunAt < EXPIRATION_CHECK_COOLDOWN_MS;

  if (shouldReuseCooldown) {
    return 0;
  }

  if (activeExpirationRun) {
    return activeExpirationRun;
  }

  activeExpirationRun = executeExpirationSweep(source).finally(() => {
    activeExpirationRun = null;
  });

  return activeExpirationRun;
}

export function startPromotionExpirationLoop() {
  if (expirationLoopHandle) {
    return expirationLoopHandle;
  }

  void expireOverduePromotions({ force: true, source: "startup" }).catch((error) => {
    logError(undefined, error, "Error inicializando expiracion automatica");
  });

  expirationLoopHandle = setInterval(() => {
    void expireOverduePromotions({ force: true, source: "interval" }).catch((error) => {
      logError(undefined, error, "Error en expiracion periodica");
    });
  }, EXPIRATION_LOOP_INTERVAL_MS);

  return expirationLoopHandle;
}

export function stopPromotionExpirationLoop() {
  if (!expirationLoopHandle) {
    return;
  }

  clearInterval(expirationLoopHandle);
  expirationLoopHandle = null;
}
