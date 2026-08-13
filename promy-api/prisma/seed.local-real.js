const bcrypt = require("bcrypt");
const {
  prisma,
  ensureBaseCatalog,
  ensureBootstrapAdmin,
  upsertPromotionByTitle,
} = require("./seed.shared");

async function ensureUser({
  email,
  fullName,
  role,
  phone,
  password,
}) {
  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.user.upsert({
    where: { email },
    update: {
      fullName,
      role,
      status: "ACTIVE",
      phone,
      emailVerifiedAt: new Date(),
      passwordHash,
    },
    create: {
      fullName,
      email,
      passwordHash,
      emailVerifiedAt: new Date(),
      role,
      status: "ACTIVE",
      phone,
    },
  });
}

async function ensureCommerce({
  ownerUserId,
  cityId,
  categoryId,
  slug,
  name,
  shortDescription,
  description,
  address,
  latitude,
  longitude,
  phone,
  instagram,
  logoUrl,
  coverUrl,
  isFeatured = false,
  featuredRank = 0,
}) {
  const existing = await prisma.commerce.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (existing) {
    await prisma.$executeRaw`
      UPDATE Commerce
      SET
        ownerUserId = ${ownerUserId},
        cityId = ${cityId},
        categoryId = ${categoryId},
        name = ${name},
        shortDescription = ${shortDescription},
        description = ${description},
        address = ${address},
        latitude = ${latitude},
        longitude = ${longitude},
        phone = ${phone},
        instagram = ${instagram},
        logoUrl = ${logoUrl},
        coverUrl = ${coverUrl},
        status = 'APPROVED',
        moderationNote = NULL,
        isFeatured = ${isFeatured},
        featuredRank = ${featuredRank},
        isHiddenByAdmin = false,
        adminNote = NULL
      WHERE id = ${existing.id}
    `;

    return prisma.commerce.findUniqueOrThrow({
      where: { id: existing.id },
    });
  }

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
      isFeatured,
      featuredRank,
      isHiddenByAdmin,
      createdAt,
      updatedAt
    )
    VALUES (
      ${ownerUserId},
      ${cityId},
      ${categoryId},
      ${name},
      ${slug},
      ${shortDescription},
      ${description},
      ${address},
      ${latitude},
      ${longitude},
      ${phone},
      ${instagram},
      ${logoUrl},
      ${coverUrl},
      'APPROVED',
      ${isFeatured},
      ${featuredRank},
      false,
      NOW(),
      NOW()
    )
  `;

  return prisma.commerce.findUniqueOrThrow({
    where: { slug },
  });
}

async function runLocalRealSeed() {
  const { concordia } = await ensureBaseCatalog();
  await ensureBootstrapAdmin({
    requirePassword: process.env.APP_ENV === "production",
  });

  const clientUser = await ensureUser({
    email: "cliente.local@promy.com",
    fullName: "Cliente Local PROMY",
    role: "CLIENT",
    phone: "3454000100",
    password: "Cliente1234",
  });

  const [
    gastronomia,
    cafeterias,
    gimnasios,
    heladerias,
  ] = await Promise.all([
    prisma.category.findUnique({ where: { slug: "gastronomia" } }),
    prisma.category.findUnique({ where: { slug: "cafeterias" } }),
    prisma.category.findUnique({ where: { slug: "gimnasios" } }),
    prisma.category.findUnique({ where: { slug: "heladerias" } }),
  ]);

  if (!gastronomia || !cafeterias || !gimnasios || !heladerias) {
    throw new Error("Faltan categorias base para seed:local-real.");
  }

  const commerceUsers = await Promise.all([
    ensureUser({
      email: "mcd.concordia@promy.com",
      fullName: "McDonald's Concordia",
      role: "COMMERCE",
      phone: "3454001101",
      password: "Comercio1234",
    }),
    ensureUser({
      email: "mostaza.concordia@promy.com",
      fullName: "Mostaza Concordia",
      role: "COMMERCE",
      phone: "3454001102",
      password: "Comercio1234",
    }),
    ensureUser({
      email: "havanna.concordia@promy.com",
      fullName: "Havanna Concordia",
      role: "COMMERCE",
      phone: "3454001103",
      password: "Comercio1234",
    }),
    ensureUser({
      email: "sportclub.concordia@promy.com",
      fullName: "SportClub Concordia",
      role: "COMMERCE",
      phone: "3454001104",
      password: "Comercio1234",
    }),
    ensureUser({
      email: "grido.concordia@promy.com",
      fullName: "Grido Concordia",
      role: "COMMERCE",
      phone: "3454001105",
      password: "Comercio1234",
    }),
  ]);

  const commerces = await Promise.all([
    ensureCommerce({
      ownerUserId: commerceUsers[0].id,
      cityId: concordia.id,
      categoryId: gastronomia.id,
      slug: "mcdonalds-concordia-centro",
      name: "McDonald's Concordia Centro",
      shortDescription: "Combos, cupones y promos activas todos los dias.",
      description:
        "Sucursal de comida rapida para pruebas locales de PROMY con foco en combos, horarios extendidos y canje simple.",
      address: "San Lorenzo 180, Concordia",
      latitude: -31.3934,
      longitude: -58.0201,
      phone: "3454002101",
      instagram: "@mcdonalds_ar",
      logoUrl: "https://placehold.co/240x240?text=McD",
      coverUrl: "https://placehold.co/1200x500?text=McDonalds+Concordia",
      isFeatured: true,
      featuredRank: 1,
    }),
    ensureCommerce({
      ownerUserId: commerceUsers[1].id,
      cityId: concordia.id,
      categoryId: gastronomia.id,
      slug: "mostaza-concordia-costanera",
      name: "Mostaza Concordia Costanera",
      shortDescription: "Combos clasicos y promos por franja horaria.",
      description:
        "Local de comida rapida orientado a testear visibilidad en home, mapa y canjes con alto reconocimiento de marca.",
      address: "Av. Costanera 245, Concordia",
      latitude: -31.3878,
      longitude: -58.0146,
      phone: "3454002102",
      instagram: "@mostazaok",
      logoUrl: "https://placehold.co/240x240?text=Mostaza",
      coverUrl: "https://placehold.co/1200x500?text=Mostaza+Concordia",
      isFeatured: true,
      featuredRank: 2,
    }),
    ensureCommerce({
      ownerUserId: commerceUsers[2].id,
      cityId: concordia.id,
      categoryId: cafeterias.id,
      slug: "havanna-concordia-centro",
      name: "Havanna Concordia Centro",
      shortDescription: "Cafe, alfajores y meriendas con promos suaves.",
      description:
        "Sucursal pensada para validar promociones de cafeteria con horarios de desayuno y merienda.",
      address: "Entre Rios 602, Concordia",
      latitude: -31.394,
      longitude: -58.0184,
      phone: "3454002103",
      instagram: "@havannaarg",
      logoUrl: "https://placehold.co/240x240?text=Havanna",
      coverUrl: "https://placehold.co/1200x500?text=Havanna+Concordia",
      isFeatured: true,
      featuredRank: 3,
    }),
    ensureCommerce({
      ownerUserId: commerceUsers[3].id,
      cityId: concordia.id,
      categoryId: gimnasios.id,
      slug: "sportclub-concordia-norte",
      name: "SportClub Concordia Norte",
      shortDescription: "Pases promo y activaciones para nuevos socios.",
      description:
        "Gimnasio usado para probar rubros no gastronomicos, discovery por cercania y beneficios de alta.",
      address: "Hipolito Yrigoyen 910, Concordia",
      latitude: -31.4016,
      longitude: -58.0167,
      phone: "3454002104",
      instagram: "@sportcluboficial",
      logoUrl: "https://placehold.co/240x240?text=SportClub",
      coverUrl: "https://placehold.co/1200x500?text=SportClub+Concordia",
      isFeatured: true,
      featuredRank: 4,
    }),
    ensureCommerce({
      ownerUserId: commerceUsers[4].id,
      cityId: concordia.id,
      categoryId: heladerias.id,
      slug: "grido-concordia-centro",
      name: "Grido Concordia Centro",
      shortDescription: "Helados, promos familiares y beneficios de verano.",
      description:
        "Sucursal de heladeria para probar promos de impulso y consumo rapido en mapa y home.",
      address: "Mitre 540, Concordia",
      latitude: -31.3909,
      longitude: -58.0132,
      phone: "3454002105",
      instagram: "@gridohelado",
      logoUrl: "https://placehold.co/240x240?text=Grido",
      coverUrl: "https://placehold.co/1200x500?text=Grido+Concordia",
      isFeatured: false,
      featuredRank: 0,
    }),
  ]);

  const [mcdonalds, mostaza, havanna, sportclub, grido] = commerces;

  await Promise.all([
    upsertPromotionByTitle(mcdonalds.id, "McCombo mediano con 25% OFF", {
      description: "Promo exclusiva en McCombo mediano para canje rapido desde la app.",
      promotionType: "PERCENTAGE",
      validationMethod: "QR",
      discountValue: 25,
      conditions: "Valido de lunes a jueves. Un uso por usuario.",
      startDate: new Date("2026-05-01"),
      endDate: new Date("2026-12-31"),
      startTime: "11:30",
      endTime: "23:00",
      imageUrl: "https://placehold.co/900x500?text=McCombo+25%25+OFF",
      status: "APPROVED_VISIBLE",
      isFeatured: true,
      featuredRank: 1,
    }),
    upsertPromotionByTitle(mostaza.id, "Combo Mega + papas a precio promo", {
      description: "Beneficio fuerte para testear conversion desde home y mapa.",
      promotionType: "FIXED_AMOUNT",
      validationMethod: "QR",
      discountValue: 8990,
      conditions: "Valido todos los dias hasta las 20:00.",
      startDate: new Date("2026-05-01"),
      endDate: new Date("2026-12-31"),
      startTime: "12:00",
      endTime: "20:00",
      imageUrl: "https://placehold.co/900x500?text=Mostaza+Combo+Promo",
      status: "APPROVED_VISIBLE",
      isFeatured: true,
      featuredRank: 2,
    }),
    upsertPromotionByTitle(havanna.id, "Cafe + 2 medialunas con 2x1", {
      description: "Promo de merienda simple para validar horarios y rubro cafeteria.",
      promotionType: "SPECIAL_COMBO",
      validationMethod: "MANUAL_CODE",
      discountValue: null,
      conditions: "Valido de 08:00 a 11:30 y de 16:00 a 19:00.",
      startDate: new Date("2026-05-01"),
      endDate: new Date("2026-12-31"),
      imageUrl: "https://placehold.co/900x500?text=Havanna+2x1",
      status: "APPROVED_VISIBLE",
      isFeatured: true,
      featuredRank: 3,
      schedules: {
        deleteMany: {},
        create: [
          { weekday: "MONDAY", startTime: "08:00", endTime: "11:30" },
          { weekday: "TUESDAY", startTime: "08:00", endTime: "11:30" },
          { weekday: "WEDNESDAY", startTime: "08:00", endTime: "11:30" },
          { weekday: "THURSDAY", startTime: "08:00", endTime: "11:30" },
          { weekday: "FRIDAY", startTime: "08:00", endTime: "11:30" },
          { weekday: "MONDAY", startTime: "16:00", endTime: "19:00" },
          { weekday: "TUESDAY", startTime: "16:00", endTime: "19:00" },
          { weekday: "WEDNESDAY", startTime: "16:00", endTime: "19:00" },
          { weekday: "THURSDAY", startTime: "16:00", endTime: "19:00" },
          { weekday: "FRIDAY", startTime: "16:00", endTime: "19:00" },
        ],
      },
    }),
    upsertPromotionByTitle(sportclub.id, "Primer mes con 35% OFF", {
      description: "Promo de onboarding para nuevos socios con canje manual.",
      promotionType: "PERCENTAGE",
      validationMethod: "MANUAL_CODE",
      discountValue: 35,
      conditions: "Solo nuevos socios. Presentar apto fisico luego del alta.",
      startDate: new Date("2026-05-01"),
      endDate: new Date("2026-12-31"),
      startTime: "07:00",
      endTime: "22:00",
      imageUrl: "https://placehold.co/900x500?text=SportClub+35%25+OFF",
      status: "APPROVED_VISIBLE",
      isFeatured: true,
      featuredRank: 4,
    }),
    upsertPromotionByTitle(grido.id, "2do kilo al 50%", {
      description: "Promo familiar para dar volumen al mapa y a favoritos.",
      promotionType: "PERCENTAGE",
      validationMethod: "QR",
      discountValue: 50,
      conditions: "Valido en compra de 2 kilos o mas.",
      startDate: new Date("2026-05-01"),
      endDate: new Date("2026-12-31"),
      startTime: "12:00",
      endTime: "23:30",
      imageUrl: "https://placehold.co/900x500?text=Grido+50%25",
      status: "APPROVED_VISIBLE",
    }),
    upsertPromotionByTitle(mcdonalds.id, "Cafe chico de regalo con desayuno", {
      description: "Beneficio suave para sumar variedad en home y search.",
      promotionType: "BENEFIT",
      validationMethod: "MANUAL_CODE",
      discountValue: null,
      conditions: "Valido de 07:30 a 10:30 con compra de desayuno.",
      startDate: new Date("2026-05-01"),
      endDate: new Date("2026-12-31"),
      startTime: "07:30",
      endTime: "10:30",
      imageUrl: "https://placehold.co/900x500?text=Desayuno+McD",
      status: "APPROVED_VISIBLE",
    }),
  ]);

  const samplePromotion = await prisma.promotion.findFirst({
    where: {
      commerceId: mcdonalds.id,
      title: "McCombo mediano con 25% OFF",
    },
  });

  if (samplePromotion) {
    await prisma.redemption.upsert({
      where: {
        promotionId_userId: {
          promotionId: samplePromotion.id,
          userId: clientUser.id,
        },
      },
      update: {
        commerceId: mcdonalds.id,
        validationMethod: "QR",
        status: "SUCCESS",
      },
      create: {
        promotionId: samplePromotion.id,
        userId: clientUser.id,
        commerceId: mcdonalds.id,
        validationMethod: "QR",
        status: "SUCCESS",
      },
    });
  }

  console.log("[seed] local real listo");
  console.log("[seed] admin: admin@promy.com / Admin1234");
  console.log("[seed] cliente: cliente.local@promy.com / Cliente1234");
  console.log("[seed] comercios: password comun Comercio1234");
}

runLocalRealSeed()
  .catch((error) => {
    console.error("[seed] error local real:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
