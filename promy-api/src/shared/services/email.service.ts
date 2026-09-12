import { env, isDevelopment, isTest } from "../../config/env";
import { ExternalRequestTimeoutError, withRequestDeadline } from "../http/deadline";
import { ServiceError } from "../utils/service";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

type EmailDeliveryResult = {
  delivery: "console" | "test" | "resend";
};

const testEmailOutbox: SendEmailInput[] = [];

export function clearTestEmailOutbox() {
  testEmailOutbox.length = 0;
}

export function getTestEmailOutbox() {
  return testEmailOutbox.map((email) => ({ ...email }));
}

function ensureConfiguredForProvider() {
  if (!env.AUTH_EMAIL_FROM) {
    throw new ServiceError(
      "Falta configurar AUTH_EMAIL_FROM para enviar emails transaccionales.",
      500,
      { code: "EMAIL_FROM_NOT_CONFIGURED" },
    );
  }

  if (env.AUTH_EMAIL_PROVIDER === "resend" && !env.RESEND_API_KEY) {
    throw new ServiceError(
      "Falta configurar RESEND_API_KEY para enviar emails reales.",
      500,
      { code: "EMAIL_PROVIDER_NOT_CONFIGURED" },
    );
  }
}

async function sendWithResend(input: SendEmailInput) {
  ensureConfiguredForProvider();

  let response: Response;
  let detail = "";
  try {
    ({ response, detail } = await withRequestDeadline(10_000, async (signal) => {
      const nextResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.AUTH_EMAIL_FROM,
          to: [input.to],
          subject: input.subject,
          html: input.html,
          text: input.text,
          ...(env.AUTH_EMAIL_REPLY_TO ? { reply_to: env.AUTH_EMAIL_REPLY_TO } : {}),
        }),
        signal,
      });
      return { response: nextResponse, detail: await nextResponse.text().catch(() => "") };
    }));
  } catch (error) {
    if (error instanceof ExternalRequestTimeoutError) {
      throw new ServiceError("El proveedor de email no respondio a tiempo.", 504, {
        code: "EMAIL_PROVIDER_TIMEOUT",
        provider: "resend",
      });
    }
    throw error;
  }

  if (!response.ok) {
    throw new ServiceError("No se pudo enviar el email transaccional.", 502, {
      code: "EMAIL_PROVIDER_ERROR",
      provider: "resend",
      detail,
    });
  }
}

export async function sendTransactionalEmail(input: SendEmailInput): Promise<EmailDeliveryResult> {
  if (env.AUTH_EMAIL_PROVIDER === "test") {
    if (!isTest) {
      throw new ServiceError(
        "El proveedor de email de test no puede utilizarse fuera de APP_ENV=test.",
        500,
        { code: "EMAIL_TEST_PROVIDER_FORBIDDEN" },
      );
    }

    testEmailOutbox.push({ ...input });

    return {
      delivery: "test",
    };
  }

  if (env.AUTH_EMAIL_PROVIDER === "console") {
    if (!isDevelopment) {
      throw new ServiceError(
        "El envio real de emails no esta configurado para este entorno.",
        500,
        { code: "EMAIL_PROVIDER_NOT_CONFIGURED" },
      );
    }

    console.info("[auth-email:console]", {
      to: input.to,
      subject: input.subject,
      text: input.text,
    });

    return {
      delivery: "console",
    };
  }

  await sendWithResend(input);

  return {
    delivery: "resend",
  };
}
