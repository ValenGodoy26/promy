/*
 * Dry-run only. The --before timestamp is a reporting reference selected by
 * the operator; it is not a legal retention policy and this script never
 * mutates the database.
 */
const prisma = require("../dist/config/prisma.js").default;

function requireTimestamp(argv) {
  const raw = argv.find((argument) => argument.startsWith("--before="))?.slice("--before=".length);
  if (!raw) {
    throw new Error("Usa --before=<timestamp ISO-8601> como referencia explícita del reporte.");
  }

  const before = new Date(raw);
  if (Number.isNaN(before.getTime())) {
    throw new Error("--before debe ser un timestamp ISO-8601 válido.");
  }

  return before;
}

function toIso(value) {
  return value instanceof Date ? value.toISOString() : null;
}

async function summarize(model, type, field, where) {
  const aggregate = await model.aggregate({
    where,
    _count: { _all: true },
    _min: { [field]: true },
    _max: { [field]: true },
  });

  return {
    type,
    count: aggregate._count._all,
    oldestAt: toIso(aggregate._min[field]),
    newestAt: toIso(aggregate._max[field]),
  };
}

async function createPrivacyRetentionReport(client, { before, now = new Date() }) {
  const categories = await Promise.all([
    summarize(client.session, "expired_sessions", "expiresAt", { expiresAt: { lt: now } }),
    summarize(client.user, "expired_email_verifications", "emailVerificationExpiresAt", {
      emailVerificationExpiresAt: { lt: now },
    }),
    summarize(client.user, "expired_password_resets", "passwordResetExpiresAt", {
      passwordResetExpiresAt: { lt: now },
    }),
    summarize(client.user, "expired_email_change_tokens", "pendingEmailTokenExpiresAt", {
      pendingEmailTokenExpiresAt: { lt: now },
    }),
    summarize(client.appNotification, "notifications_before_reference", "createdAt", {
      createdAt: { lt: before },
    }),
    summarize(client.betaAccessRequest, "beta_requests_before_reference", "createdAt", {
      createdAt: { lt: before },
    }),
    summarize(client.adminActionLog, "admin_audit_logs_before_reference", "createdAt", {
      createdAt: { lt: before },
    }),
    summarize(client.pushToken, "inactive_push_tokens_before_reference", "updatedAt", {
      isActive: false,
      updatedAt: { lt: before },
    }),
  ]);

  return {
    mode: "dry-run",
    generatedAt: now.toISOString(),
    referenceBefore: before.toISOString(),
    note:
      "Los thresholds son una referencia explícita del operador, no una política legal. El reporte no ejecuta DELETE ni expone datos personales.",
    categories,
    uploads: {
      type: "potential_orphan_uploads",
      mode: "separate-dry-run-required",
      command: "npm run uploads:audit",
      note: "El lifecycle de uploads usa un auditor separado con gracia configurada por esa herramienta.",
    },
  };
}

async function main() {
  const before = requireTimestamp(process.argv.slice(2));
  const report = await createPrivacyRetentionReport(prisma, { before });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error instanceof Error ? error.message : "No se pudo generar el reporte.");
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { createPrivacyRetentionReport, requireTimestamp };
