import type { Logger } from "pino";
import type { AccessTokenPayload } from "../shared/utils/jwt";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      log: Logger;
      user?: AccessTokenPayload;
    }
  }
}

export {};
