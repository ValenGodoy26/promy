const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

const categories = [
  { name: "Gastronomia", slug: "gastronomia", icon: "utensils" },
  { name: "Cafeterias", slug: "cafeterias", icon: "coffee" },
  { name: "Heladerias", slug: "heladerias", icon: "ice-cream" },
  { name: "Bares", slug: "bares", icon: "beer" },
  { name: "Estetica", slug: "estetica", icon: "sparkles" },
  { name: "Peluquerias", slug: "peluquerias", icon: "scissors" },
  { name: "Gimnasios", slug: "gimnasios", icon: "dumbbell" },
  { name: "Servicios", slug: "servicios", icon: "briefcase" },
];

async function ensureBaseCatalog() {
  const concordia = await prisma.city.upsert({
    where: { slug: "concordia" },
    update: {
      isActive: true,
    },
    create: {
      name: "Concordia",
      province: "Entre Rios",
      slug: "concordia",
      isActive: true,
    },
  });

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        icon: category.icon,
        isActive: true,
      },
      create: category,
    });
  }

  return {
    concordia,
  };
}

async function ensureBootstrapAdmin(options = {}) {
  const requirePassword = options.requirePassword === true;
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@promy.com").trim().toLowerCase();
  const fullName = (process.env.SEED_ADMIN_NAME || "Admin PROMY").trim();
  const phone = (process.env.SEED_ADMIN_PHONE || "3454000001").trim();
  const providedPassword = process.env.SEED_ADMIN_PASSWORD?.trim();

  if (requirePassword && !providedPassword) {
    throw new Error(
      "SEED_ADMIN_PASSWORD es obligatoria cuando APP_ENV=production. El seed bootstrap no puede usar una password por defecto."
    );
  }

  const password = providedPassword || "Admin1234";
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      fullName,
      role: "ADMIN",
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
      role: "ADMIN",
      status: "ACTIVE",
      phone,
    },
  });

  console.log(`[seed] admin bootstrap listo: ${admin.email}`);
  return admin;
}

async function upsertPromotionByTitle(commerceId, title, data) {
  const existingPromotion = await prisma.promotion.findFirst({
    where: {
      commerceId,
      title,
    },
  });

  if (existingPromotion) {
    return prisma.promotion.update({
      where: { id: existingPromotion.id },
      data,
    });
  }

  return prisma.promotion.create({
    data: {
      commerceId,
      title,
      ...data,
    },
  });
}

module.exports = {
  prisma,
  ensureBaseCatalog,
  ensureBootstrapAdmin,
  upsertPromotionByTitle,
};
