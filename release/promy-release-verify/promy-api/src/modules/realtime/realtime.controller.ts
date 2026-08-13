import { Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { signRealtimeStreamToken, verifyRealtimeStreamToken } from "../../shared/utils/jwt";
import {
  registerRealtimeClient,
  startRealtimeHeartbeat,
  unregisterRealtimeClient,
} from "./realtime.service";

export const createRealtimeStreamToken = (req: AuthRequest, res: Response) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      ok: false,
      message: "No autenticado",
    });
  }

  if (user.role !== UserRole.ADMIN && user.role !== UserRole.COMMERCE) {
    return res.status(403).json({
      ok: false,
      message: "Este canal en tiempo real no esta disponible para este rol",
    });
  }

  const streamToken = signRealtimeStreamToken({
    userId: user.userId,
    role: user.role,
  });

  return res.status(200).json({
    ok: true,
    streamToken,
  });
};

export const openRealtimeEventsStream = (req: Request, res: Response) => {
  const streamToken =
    typeof req.query.streamToken === "string" ? req.query.streamToken.trim() : "";

  if (!streamToken) {
    return res.status(401).json({
      ok: false,
      message: "Stream token requerido",
    });
  }

  try {
    const payload = verifyRealtimeStreamToken(streamToken);

    if (payload.kind !== "realtime-stream") {
      throw new Error("Invalid token kind");
    }

    if (payload.role !== UserRole.ADMIN && payload.role !== UserRole.COMMERCE) {
      return res.status(403).json({
        ok: false,
        message: "Este canal en tiempo real no esta disponible para este rol",
      });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const clientId = registerRealtimeClient({
      userId: payload.userId,
      role: payload.role,
      response: res,
    });
    const heartbeat = startRealtimeHeartbeat(res);

    req.on("close", () => {
      clearInterval(heartbeat);
      unregisterRealtimeClient(clientId);
    });

    return;
  } catch {
    return res.status(401).json({
      ok: false,
      message: "Stream token invalido o vencido",
    });
  }
};
