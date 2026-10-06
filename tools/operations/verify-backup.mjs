import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { assert, safeErrorMessage, sha256File } from "./lib.mjs";

export async function verifyBackup(backupFile = process.env.BACKUP_FILE) {
  assert(backupFile, "BACKUP_FILE es obligatoria.");
  const absolute = path.resolve(backupFile);
  const metadata = JSON.parse(await fs.readFile(`${absolute}.metadata.json`, "utf8"));
  const checksumLine = (await fs.readFile(`${absolute}.sha256`, "utf8")).trim();
  const [expectedHash, expectedName] = checksumLine.split(/\s+/, 2);
  assert(expectedName === path.basename(absolute), "El archivo indicado no coincide con su checksum.");
  const actualHash = await sha256File(absolute);
  assert(actualHash === expectedHash && actualHash === metadata.sha256, "Checksum de backup inválido.");
  assert(metadata.backupFile === path.basename(absolute), "Metadata de backup inconsistente.");
  assert(/^[0-9a-f]{40}$/i.test(metadata.releaseSha || ""), "Metadata sin releaseSha válido.");
  return { backupFile: absolute, checksum: actualHash, releaseSha: metadata.releaseSha, timestampUtc: metadata.timestampUtc };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyBackup().then((result) => console.log(JSON.stringify({ status: "PASS", ...result }, null, 2))).catch((error) => { console.error(JSON.stringify({ status: "FAIL", error: safeErrorMessage(error) })); process.exitCode = 1; });
}
