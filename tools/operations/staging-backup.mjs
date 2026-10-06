import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { assert, parseMysqlUrl, redactDatabaseTarget, safeErrorMessage, sha256File } from "./lib.mjs";

export function buildBackupPlan(env = process.env) {
  const errors = [];
  const target = parseMysqlUrl(env.BACKUP_DATABASE_URL, "BACKUP_DATABASE_URL", errors);
  assert(errors.length === 0, errors.join(" "));
  assert(env.BACKUP_DESTINATION, "BACKUP_DESTINATION es obligatoria.");
  assert(env.RELEASE_SHA && /^[0-9a-f]{40}$/i.test(env.RELEASE_SHA), "RELEASE_SHA debe ser un SHA Git de 40 caracteres.");
  return { source: redactDatabaseTarget(target), destination: path.resolve(env.BACKUP_DESTINATION), releaseSha: env.RELEASE_SHA };
}

function runDump(command, args, outputPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false, stdio: ["ignore", "pipe", "pipe"] });
    const output = createWriteStream(outputPath, { flags: "wx" });
    let stderr = "";
    child.stdout.pipe(output);
    child.stderr.on("data", (chunk) => { stderr = `${stderr}${chunk}`.slice(-2_000); });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`mysqldump falló (exit ${code}): ${stderr || "sin detalle"}`)));
  });
}

export async function executeBackup(env = process.env) {
  assert(env.BACKUP_EXECUTE === "1", "Backup real bloqueado: requiere BACKUP_EXECUTE=1.");
  assert(env.MYSQL_DEFAULTS_FILE, "Backup real requiere MYSQL_DEFAULTS_FILE; no se aceptan passwords en argumentos.");
  const plan = buildBackupPlan(env);
  await fs.mkdir(plan.destination, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const base = `promy-${plan.source.database}-${timestamp}`;
  const backupFile = path.join(plan.destination, `${base}.sql`);
  await runDump(env.MYSQLDUMP_BIN || "mysqldump", [`--defaults-extra-file=${env.MYSQL_DEFAULTS_FILE}`, "--single-transaction", "--routines", "--events", "--host", plan.source.host, "--port", plan.source.port, "--user", plan.source.username, plan.source.database], backupFile);
  const checksum = await sha256File(backupFile);
  const metadata = { schemaVersion: 1, timestampUtc: new Date().toISOString(), releaseSha: plan.releaseSha, source: plan.source, backupFile: path.basename(backupFile), sha256: checksum };
  await fs.writeFile(`${backupFile}.sha256`, `${checksum}  ${path.basename(backupFile)}\n`, "utf8");
  await fs.writeFile(`${backupFile}.metadata.json`, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  return { backupFile, checksum, metadata };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const execute = process.argv.includes("--execute");
  Promise.resolve().then(() => execute ? executeBackup() : buildBackupPlan()).then((result) => console.log(JSON.stringify({ status: "PASS", mode: execute ? "execute" : "dry-run", ...result }, null, 2))).catch((error) => { console.error(JSON.stringify({ status: "FAIL", error: safeErrorMessage(error) })); process.exitCode = 1; });
}
