import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { assert, assertIsolatedRestoreTarget, safeErrorMessage } from "./lib.mjs";
import { verifyBackup } from "./verify-backup.mjs";

export async function buildRestorePlan(env = process.env) {
  assert(env.BACKUP_FILE, "BACKUP_FILE es obligatoria.");
  const backup = await verifyBackup(env.BACKUP_FILE);
  const target = assertIsolatedRestoreTarget(env.RESTORE_TARGET_DATABASE_URL);
  return { backup, target: { host: target.host, port: target.port, database: target.database }, postRestore: ["npx prisma migrate status", "curl -fsS <ISOLATED_API_URL>/api/health", "ejecutar staging-smoke en modo read con cuentas QA aisladas"] };
}

function runRestore(command, args, inputPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false, stdio: ["pipe", "ignore", "pipe"] });
    let stderr = "";
    createReadStream(inputPath).pipe(child.stdin);
    child.stderr.on("data", (chunk) => { stderr = `${stderr}${chunk}`.slice(-2_000); });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`mysql restore falló (exit ${code}): ${stderr || "sin detalle"}`)));
  });
}

export async function executeRestore(env = process.env) {
  assert(env.RESTORE_EXECUTE === "1", "Restore real bloqueado: requiere RESTORE_EXECUTE=1.");
  assert(env.RESTORE_CONFIRM === "RESTORE_ISOLATED_DATABASE", "Restore real requiere RESTORE_CONFIRM=RESTORE_ISOLATED_DATABASE.");
  assert(env.MYSQL_DEFAULTS_FILE, "Restore real requiere MYSQL_DEFAULTS_FILE; no se aceptan passwords en argumentos.");
  const plan = await buildRestorePlan(env);
  await fs.access(plan.backup.backupFile);
  const target = assertIsolatedRestoreTarget(env.RESTORE_TARGET_DATABASE_URL);
  await runRestore(env.MYSQL_BIN || "mysql", [`--defaults-extra-file=${env.MYSQL_DEFAULTS_FILE}`, "--host", target.host, "--port", target.port, "--user", target.username, target.database], plan.backup.backupFile);
  return plan;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const execute = process.argv.includes("--execute");
  Promise.resolve(execute ? executeRestore() : buildRestorePlan()).then((result) => console.log(JSON.stringify({ status: "PASS", mode: execute ? "execute" : "dry-run", ...result }, null, 2))).catch((error) => { console.error(JSON.stringify({ status: "FAIL", error: safeErrorMessage(error) })); process.exitCode = 1; });
}
