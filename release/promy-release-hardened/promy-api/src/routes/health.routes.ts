import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.status(200).json({
    ok: true,
    message: "Alive",
    requestId: req.requestId,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

export default router;
