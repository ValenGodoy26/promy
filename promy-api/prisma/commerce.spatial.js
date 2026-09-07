/**
 * Creates Commerce fixtures through parameterized SQL so MySQL can execute the
 * production trigger that materializes the required spatial `location` POINT.
 * Prisma cannot write an Unsupported("POINT") field directly.
 */
async function createCommerceWithLocation(prisma, data) {
  const record = {
    shortDescription: null,
    description: null,
    latitude: null,
    longitude: null,
    phone: null,
    instagram: null,
    logoUrl: null,
    coverUrl: null,
    status: "PENDING",
    moderationNote: null,
    isFeatured: false,
    featuredRank: 0,
    isHiddenByAdmin: false,
    adminNote: null,
    ...data,
  };

  await prisma.$executeRaw`
    INSERT INTO Commerce (
      ownerUserId,
      cityId,
      categoryId,
      name,
      slug,
      shortDescription,
      description,
      address,
      latitude,
      longitude,
      phone,
      instagram,
      logoUrl,
      coverUrl,
      status,
      moderationNote,
      isFeatured,
      featuredRank,
      isHiddenByAdmin,
      adminNote,
      createdAt,
      updatedAt
    )
    VALUES (
      ${record.ownerUserId},
      ${record.cityId},
      ${record.categoryId},
      ${record.name},
      ${record.slug},
      ${record.shortDescription},
      ${record.description},
      ${record.address},
      ${record.latitude},
      ${record.longitude},
      ${record.phone},
      ${record.instagram},
      ${record.logoUrl},
      ${record.coverUrl},
      ${record.status},
      ${record.moderationNote},
      ${record.isFeatured},
      ${record.featuredRank},
      ${record.isHiddenByAdmin},
      ${record.adminNote},
      NOW(),
      NOW()
    )
  `;

  return prisma.commerce.findUniqueOrThrow({
    where: { slug: record.slug },
  });
}

async function upsertCommerceWithLocation(prisma, { where, update, create }) {
  const existing = await prisma.commerce.findUnique({
    where,
    select: { id: true },
  });

  if (existing) {
    return prisma.commerce.update({
      where: { id: existing.id },
      data: update,
    });
  }

  return createCommerceWithLocation(prisma, create);
}

module.exports = {
  createCommerceWithLocation,
  upsertCommerceWithLocation,
};
