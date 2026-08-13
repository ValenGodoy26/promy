import { PrismaClient } from "@prisma/client";
import { isDevelopment } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var __promyPrisma__: PrismaClient | undefined;
}

const createPrismaClient = () =>
  new PrismaClient({
    log: isDevelopment ? ["warn", "error"] : ["error"],
  });

const prisma = global.__promyPrisma__ ?? createPrismaClient();

if (isDevelopment) {
  global.__promyPrisma__ = prisma;
}

export default prisma;
