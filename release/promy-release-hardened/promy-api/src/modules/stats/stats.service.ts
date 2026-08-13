import prisma from "../../config/prisma";
import { buildPublicPromotionWhere } from "../../shared/utils/promotionStatus";

export async function getPublicStats() {
  const now = new Date();

  const [approvedCommerces, activePromotions, activeCities] = await Promise.all([
    prisma.commerce.count({
      where: {
        status: "APPROVED",
        isHiddenByAdmin: false,
      },
    }),
    prisma.promotion.count({
      where: {
        ...buildPublicPromotionWhere(now),
        commerce: {
          status: "APPROVED",
          isHiddenByAdmin: false,
        },
      },
    }),
    prisma.city.count({
      where: {
        isActive: true,
      },
    }),
  ]);

  return {
    approvedCommerces,
    activePromotions,
    activeCities,
  };
}
