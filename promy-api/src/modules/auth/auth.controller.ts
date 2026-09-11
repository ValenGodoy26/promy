import { Request, Response } from "express";
import { env, isProduction } from "../../config/env";
import { logControllerError } from "../../shared/http/controllerLogger";
import { AUTH_REFRESH_INVALID_MESSAGE } from "../../shared/http/auth";
import { logOperationalEvent } from "../../shared/logging/logger";
import { getRefreshTtlMs } from "../../shared/utils/jwt";
import { isServiceError } from "../../shared/utils/service";
import {
  forgotPasswordSchema,
  loginSchema,
  loginUser,
  logoutUserSession,
  requestEmailVerification,
  requestEmailVerificationSchema,
  requestPasswordReset,
  refreshUserSession,
  registerCommerceOwner,
  registerCommerceSchema,
  registerClient,
  registerSchema,
  resetPasswordSchema,
  resetUserPassword,
  verifyEmailAddress,
  verifyEmailSchema,
} from "./auth.service";

const REFRESH_COOKIE_NAME = env.REFRESH_COOKIE_NAME;

function readClientPlatform(req: Request) {
  const client = req.get("x-promy-client")?.trim().toLowerCase();
  if (client === "mobile" || client === "native") {
    return "mobile";
  }

  return "web";
}

function shouldExposeRefreshToken(req: Request) {
  return readClientPlatform(req) === "mobile";
}

function readCookie(req: Request, cookieName: string) {
  const rawCookie = req.headers.cookie;

  if (!rawCookie) {
    return null;
  }

  const parsedCookie = rawCookie
    .split(";")
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.startsWith(`${cookieName}=`));

  if (!parsedCookie) {
    return null;
  }

  const [, value = ""] = parsedCookie.split("=");
  return decodeURIComponent(value) || null;
}

function writeRefreshCookie(res: Response, refreshToken: string) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    path: "/api/auth",
    maxAge: getRefreshTtlMs(),
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    path: "/api/auth",
  });
}

export const register = async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const result = await registerClient(parsed.data);

    return res.status(201).json({
      ok: true,
      message: "Usuario registrado correctamente",
      user: result.user,
      ...(result.verification ? { verification: result.verification } : {}),
    });
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json({
        ok: false,
        message: error.message,
        ...(error.details ?? {}),
      });
    }

    logControllerError(req, "Register error", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno al registrar usuario",
    });
  }
};

export const registerCommerce = async (req: Request, res: Response) => {
  try {
    const parsed = registerCommerceSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const result = await registerCommerceOwner(parsed.data);

    return res.status(201).json({
      ok: true,
      message: "Solicitud de comercio creada correctamente",
      user: result.user,
      commerce: result.commerce,
      ...(result.verification ? { verification: result.verification } : {}),
    });
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json({
        ok: false,
        message: error.message,
        ...(error.details ?? {}),
      });
    }

    logControllerError(req, "Register commerce error", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno al registrar el comercio",
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const result = await loginUser({
      email: parsed.data.email,
      password: parsed.data.password,
      userAgent: req.get("user-agent") || null,
      ipAddress: req.ip || null,
    });

    writeRefreshCookie(res, result.refreshToken);

    if (result.user.role === "ADMIN") {
      logOperationalEvent(req, "auth.login_admin", {
        requestId: req.requestId,
        userId: result.user.id,
        email: result.user.email,
        role: result.user.role,
        ipAddress: req.ip || null,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Login correcto",
      accessToken: result.accessToken,
      ...(shouldExposeRefreshToken(req) ? { refreshToken: result.refreshToken } : {}),
      user: result.user,
    });
  } catch (error) {
    if (isServiceError(error)) {
      if (error.statusCode === 401) {
        logOperationalEvent(
          req,
          "auth.login_failed",
          {
            requestId: req.requestId,
            email: typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : null,
            ipAddress: req.ip || null,
          },
          "warn",
        );
      }

      return res.status(error.statusCode).json({
        ok: false,
        message: error.message,
        ...(error.details ?? {}),
      });
    }

    logControllerError(req, "Login error", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno al iniciar sesion",
    });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const cookieRefreshToken = readCookie(req, REFRESH_COOKIE_NAME);
    const bodyRefreshToken =
      typeof req.body?.refreshToken === "string" ? req.body.refreshToken : undefined;
    const refreshToken = cookieRefreshToken || bodyRefreshToken;

    if (!refreshToken) {
      return res.status(400).json({
        ok: false,
        message: "Refresh token requerido",
      });
    }

    const result = await refreshUserSession({
      refreshToken,
    });

    writeRefreshCookie(res, result.refreshToken);

    return res.status(200).json({
      ok: true,
      message: "Token renovado correctamente",
      accessToken: result.accessToken,
      ...(shouldExposeRefreshToken(req) ? { refreshToken: result.refreshToken } : {}),
      user: result.user,
    });
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json({
        ok: false,
        message: error.message,
        ...(error.details ?? {}),
      });
    }

    logControllerError(req, "Refresh error", error);

    return res.status(401).json({
      ok: false,
      message: AUTH_REFRESH_INVALID_MESSAGE,
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const cookieRefreshToken = readCookie(req, REFRESH_COOKIE_NAME);
    const bodyRefreshToken =
      typeof req.body?.refreshToken === "string" ? req.body.refreshToken : undefined;
    const refreshToken = cookieRefreshToken || bodyRefreshToken;

    if (refreshToken) {
      await logoutUserSession({
        refreshToken,
      });
    }

    clearRefreshCookie(res);

    return res.status(200).json({
      ok: true,
      message: refreshToken ? "Logout correcto" : "Sesion cerrada",
    });
  } catch (error) {
    clearRefreshCookie(res);

    if (isServiceError(error)) {
      return res.status(error.statusCode).json({
        ok: false,
        message: error.message,
        ...(error.details ?? {}),
      });
    }

    logControllerError(req, "Logout error", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno al cerrar sesion",
    });
  }
};

export const resendEmailVerification = async (req: Request, res: Response) => {
  try {
    const parsed = requestEmailVerificationSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const result = await requestEmailVerification({
      email: parsed.data.email,
    });

    return res.status(200).json({
      ok: true,
      message: "Si el email existe y esta pendiente, enviamos un nuevo enlace de verificacion.",
      ...(result.verification ? { verification: result.verification } : {}),
    });
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json({
        ok: false,
        message: error.message,
        ...(error.details ?? {}),
      });
    }

    logControllerError(req, "Request email verification error", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno al generar la verificacion de email",
    });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const parsed = verifyEmailSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const result = await verifyEmailAddress({
      token: parsed.data.token,
    });

    return res.status(200).json({
      ok: true,
      message: "Email verificado correctamente",
      user: result.user,
    });
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json({
        ok: false,
        message: error.message,
        ...(error.details ?? {}),
      });
    }

    logControllerError(req, "Verify email error", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno al verificar el email",
    });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const result = await requestPasswordReset({
      email: parsed.data.email,
    });

    return res.status(200).json({
      ok: true,
      message: "Si el email existe, enviamos instrucciones para recuperar la contrasena.",
      ...(result.reset ? { reset: result.reset } : {}),
    });
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json({
        ok: false,
        message: error.message,
        ...(error.details ?? {}),
      });
    }

    logControllerError(req, "Forgot password error", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno al iniciar la recuperacion de contrasena",
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos invalidos",
        errors: parsed.error.flatten(),
      });
    }

    await resetUserPassword({
      token: parsed.data.token,
      password: parsed.data.password,
    });

    return res.status(200).json({
      ok: true,
      message: "Contrasena actualizada correctamente",
    });
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json({
        ok: false,
        message: error.message,
        ...(error.details ?? {}),
      });
    }

    logControllerError(req, "Reset password error", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno al restablecer la contrasena",
    });
  }
};
