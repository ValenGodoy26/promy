import express from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import path from "path";
import routes from "./routes";
import { notFound } from "./middlewares/notFound";
import { errorHandler } from "./middlewares/errorHandler";
import { attachRequestContext } from "./middlewares/requestContext.middleware";
import { publicReadLimiter } from "./middlewares/rateLimiters";
import { allowedOrigins, env, isProduction } from "./config/env";
import { buildExpressTrustProxy, discardUntrustedForwardedHeaders } from "./config/proxy";
import { shouldServeLocalUploads } from "./shared/services/uploads.service";

const app = express();

app.set("trust proxy", buildExpressTrustProxy(env.TRUST_PROXY));
app.disable("x-powered-by");
app.use(compression());
app.use(discardUntrustedForwardedHeaders(env.TRUST_PROXY));

function isLocalDevelopmentOrigin(origin: string) {
  if (isProduction) {
    return false;
  }

  try {
    const url = new URL(origin);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes("*") ||
        allowedOrigins.includes(origin) ||
        isLocalDevelopmentOrigin(origin)
      ) {
        return callback(null, true);
      }

      return callback(new Error("Origin no permitida por CORS"));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(attachRequestContext);
if (shouldServeLocalUploads()) {
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));
}

app.use("/api", publicReadLimiter, routes);

app.use(notFound);
app.use(errorHandler);

export default app;
