const bcrypt = require("bcrypt");
const { prisma, ensureBaseCatalog, ensureBootstrapAdmin, upsertPromotionByTitle } = require("./seed.shared");

async function ensureDemoData({ concordia }) {
  const hashedPassword = await bcrypt.hash("demo1234", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@promy.com" },
    update: {
      fullName: "Admin PROMY",
      role: "ADMIN",
      status: "ACTIVE",
      phone: "3454000001",
      emailVerifiedAt: new Date(),
      passwordHash: hashedPassword,
    },
    create: {
      fullName: "Admin PROMY",
      email: "admin@promy.com",
      passwordHash: hashedPassword,
      emailVerifiedAt: new Date(),
      role: "ADMIN",
      status: "ACTIVE",
      phone: "3454000001",
    },
  });

  const client = await prisma.user.upsert({
    where: { email: "cliente@promy.com" },
    update: {
      fullName: "Cliente Demo",
      role: "CLIENT",
      status: "ACTIVE",
      phone: "3454000002",
      emailVerifiedAt: new Date(),
      passwordHash: hashedPassword,
    },
    create: {
      fullName: "Cliente Demo",
      email: "cliente@promy.com",
      passwordHash: hashedPassword,
      emailVerifiedAt: new Date(),
      role: "CLIENT",
      status: "ACTIVE",
      phone: "3454000002",
    },
  });

  const commerceUser = await prisma.user.upsert({
    where: { email: "comercio@promy.com" },
    update: {
      fullName: "Comercio Demo",
      role: "COMMERCE",
      status: "ACTIVE",
      phone: "3454000003",
      emailVerifiedAt: new Date(),
      passwordHash: hashedPassword,
    },
    create: {
      fullName: "Comercio Demo",
      email: "comercio@promy.com",
      passwordHash: hashedPassword,
      emailVerifiedAt: new Date(),
      role: "COMMERCE",
      status: "ACTIVE",
      phone: "3454000003",
    },
  });

  const [gastronomia, cafeterias, gimnasios, servicios] = await Promise.all([
    prisma.category.findUnique({ where: { slug: "gastronomia" } }),
    prisma.category.findUnique({ where: { slug: "cafeterias" } }),
    prisma.category.findUnique({ where: { slug: "gimnasios" } }),
    prisma.category.findUnique({ where: { slug: "servicios" } }),
  ]);

  if (!gastronomia || !cafeterias || !gimnasios || !servicios) {
    throw new Error("No se encontraron categorias necesarias para el seed demo.");
  }

  const burgerHouse = await prisma.commerce.upsert({
    where: { slug: "burger-house-concordia" },
    update: {
      ownerUserId: commerceUser.id,
      cityId: concordia.id,
      categoryId: gastronomia.id,
      status: "APPROVED",
    },
    create: {
      ownerUserId: commerceUser.id,
      cityId: concordia.id,
      categoryId: gastronomia.id,
      name: "Burger House Concordia",
      slug: "burger-house-concordia",
      shortDescription: "Hamburguesas y combos con promos exclusivas.",
      description: "Local gastronomico de Concordia enfocado en hamburguesas, combos y promos semanales.",
      address: "San Luis 742, Concordia",
      latitude: -31.3929,
      longitude: -58.0209,
      phone: "3454123456",
      instagram: "@burgerhousecdia",
      logoUrl: "https://placehold.co/200x200?text=Burger+House",
      coverUrl: "https://placehold.co/1200x500?text=Burger+House+Cover",
      status: "APPROVED",
    },
  });

  const cafeCentral = await prisma.commerce.upsert({
    where: { slug: "cafe-central-concordia" },
    update: {
      ownerUserId: commerceUser.id,
      cityId: concordia.id,
      categoryId: cafeterias.id,
      status: "APPROVED",
    },
    create: {
      ownerUserId: commerceUser.id,
      cityId: concordia.id,
      categoryId: cafeterias.id,
      name: "Cafe Central Concordia",
      slug: "cafe-central-concordia",
      shortDescription: "Cafe de especialidad y meriendas.",
      description: "Cafeteria local con promos en desayunos, meriendas y combos para estudiantes.",
      address: "Entre Rios 515, Concordia",
      latitude: -31.3942,
      longitude: -58.0178,
      phone: "3454234567",
      instagram: "@cafecentralcdia",
      logoUrl: "https://placehold.co/200x200?text=Cafe+Central",
      coverUrl: "https://placehold.co/1200x500?text=Cafe+Central+Cover",
      status: "APPROVED",
    },
  });

  const fitZone = await prisma.commerce.upsert({
    where: { slug: "fitzone-concordia" },
    update: {
      ownerUserId: commerceUser.id,
      cityId: concordia.id,
      categoryId: gimnasios.id,
      status: "APPROVED",
    },
    create: {
      ownerUserId: commerceUser.id,
      cityId: concordia.id,
      categoryId: gimnasios.id,
      name: "FitZone Concordia",
      slug: "fitzone-concordia",
      shortDescription: "Entrenamiento funcional y musculacion con promos mensuales.",
      description: "Gimnasio urbano con promociones para nuevos socios y planes por temporada.",
      address: "Urquiza 980, Concordia",
      latitude: -31.4012,
      longitude: -58.0164,
      phone: "3454345678",
      instagram: "@fitzonecdia",
      logoUrl: "https://placehold.co/200x200?text=FitZone",
      coverUrl: "https://placehold.co/1200x500?text=FitZone+Cover",
      status: "APPROVED",
    },
  });

  const spaRelax = await prisma.commerce.upsert({
    where: { slug: "spa-relax-concordia" },
    update: {
      ownerUserId: commerceUser.id,
      cityId: concordia.id,
      categoryId: servicios.id,
      status: "APPROVED",
    },
    create: {
      ownerUserId: commerceUser.id,
      cityId: concordia.id,
      categoryId: servicios.id,
      name: "Spa Relax Concordia",
      slug: "spa-relax-concordia",
      shortDescription: "Masajes, relax y bienestar con promos especiales.",
      description: "Centro de bienestar con sesiones promocionales para usuarios nuevos y frecuentes.",
      address: "Mitre 455, Concordia",
      latitude: -31.3905,
      longitude: -58.0127,
      phone: "3454456789",
      instagram: "@sparelaxcdia",
      logoUrl: "https://placehold.co/200x200?text=Spa+Relax",
      coverUrl: "https://placehold.co/1200x500?text=Spa+Relax+Cover",
      status: "APPROVED",
    },
  });

  await upsertPromotionByTitle(burgerHouse.id, "20% OFF en combo doble", {
    description: "Descuento exclusivo en combo doble de hamburguesa con papas.",
    promotionType: "PERCENTAGE",
    validationMethod: "QR",
    discountValue: 20,
    conditions: "Valido de lunes a jueves. Un uso por usuario.",
    startDate: new Date("2026-04-01"),
    endDate: new Date("2026-12-31"),
    startTime: "18:00",
    endTime: "23:30",
    imageUrl: "https://placehold.co/800x400?text=20%25+OFF+Burger",
    status: "APPROVED_VISIBLE",
  });

  await upsertPromotionByTitle(cafeCentral.id, "2x1 en cafe y medialunas", {
    description: "Promo especial de desayuno para usuarios de PROMY.",
    promotionType: "SPECIAL_COMBO",
    validationMethod: "MANUAL_CODE",
    discountValue: null,
    conditions: "Valido de 08:00 a 11:30. Una vez por dia por usuario.",
    startDate: new Date("2026-04-01"),
    endDate: new Date("2026-12-31"),
    startTime: "08:00",
    endTime: "11:30",
    imageUrl: "https://placehold.co/800x400?text=2x1+Cafe",
    status: "APPROVED_VISIBLE",
  });

  await upsertPromotionByTitle(burgerHouse.id, "Combo burger + papas", {
    description: "Promo destacada del dia en combo clasico.",
    promotionType: "FIXED_AMOUNT",
    validationMethod: "QR",
    discountValue: 1400,
    conditions: "Valido todos los dias hasta agotar stock.",
    startDate: new Date("2026-04-01"),
    endDate: new Date("2026-12-31"),
    startTime: "12:00",
    endTime: "23:00",
    imageUrl: "https://placehold.co/800x400?text=Combo+Burger",
    status: "APPROVED_VISIBLE",
  });

  await upsertPromotionByTitle(fitZone.id, "Pase mensual promo", {
    description: "Accede a tu pase mensual con descuento exclusivo.",
    promotionType: "PERCENTAGE",
    validationMethod: "MANUAL_CODE",
    discountValue: 35,
    conditions: "Solo nuevos socios. Valido una vez por usuario.",
    startDate: new Date("2026-04-01"),
    endDate: new Date("2026-12-31"),
    startTime: "07:00",
    endTime: "22:00",
    imageUrl: "https://placehold.co/800x400?text=FitZone+Promo",
    status: "APPROVED_VISIBLE",
  });

  await upsertPromotionByTitle(spaRelax.id, "Sesion de masajes", {
    description: "Sesion promocional de 45 minutos para usuarios PROMY.",
    promotionType: "PERCENTAGE",
    validationMethod: "QR",
    discountValue: 40,
    conditions: "Reservando con 24 horas de anticipacion.",
    startDate: new Date("2026-04-01"),
    endDate: new Date("2026-12-31"),
    startTime: "10:00",
    endTime: "20:00",
    imageUrl: "https://placehold.co/800x400?text=Spa+Promo",
    status: "APPROVED_VISIBLE",
  });

  const burgerDiscount = await prisma.promotion.findFirst({
    where: {
      commerceId: burgerHouse.id,
      title: "20% OFF en combo doble",
    },
  });

  if (burgerDiscount) {
    await prisma.redemption.upsert({
      where: {
        promotionId_userId: {
          promotionId: burgerDiscount.id,
          userId: client.id,
        },
      },
      update: {
        status: "SUCCESS",
        validationMethod: "QR",
      },
      create: {
        promotionId: burgerDiscount.id,
        userId: client.id,
        commerceId: burgerHouse.id,
        validationMethod: "QR",
        status: "SUCCESS",
      },
    });
  }

  console.log("[seed] demo listo");
  console.log(`[seed] admin: ${admin.email}`);
  console.log(`[seed] cliente: ${client.email}`);
  console.log(`[seed] comercio: ${commerceUser.email}`);
  console.log("[seed] password demo: demo1234");
}

async function runDemoSeed() {
  const baseCatalog = await ensureBaseCatalog();
  await ensureBootstrapAdmin({
    requirePassword: process.env.APP_ENV === "production",
  });
  await ensureDemoData(baseCatalog);
}

module.exports = {
  runDemoSeed,
};
