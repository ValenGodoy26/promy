import prisma from "../../config/prisma";
import { buildPublicCommerceWhere } from "../../shared/utils/promotionStatus";
import { buildPublicPromotionWhere } from "../../shared/utils/promotionStatus";

export async function getPublicStats() {
  const now = new Date();

  const [approvedCommerces, activePromotions, activeCities] = await Promise.all([
    prisma.commerce.count({
      where: {
        ...buildPublicCommerceWhere(),
      },
    }),
    prisma.promotion.count({
      where: {
        ...buildPublicPromotionWhere(now),
        commerce: {
          ...buildPublicCommerceWhere(),
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
