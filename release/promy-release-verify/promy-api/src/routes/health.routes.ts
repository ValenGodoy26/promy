import { Router } from "express";
import prisma from "../config/prisma";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      ok: true,
      message: "OK",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health DB error:", error);

    res.status(500).json({
      ok: false,
      message: "Healthcheck failed",
    });
  }
});

export default router;
