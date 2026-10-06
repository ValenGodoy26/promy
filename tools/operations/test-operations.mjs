import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { validateStagingConfiguration, runStagingPreflight } from "./staging-preflight.mjs";
import { buildProviderCheckPlan } from "./staging-provider-check.mjs";
import { assertSmokeSafety } from "./staging-smoke.mjs";
import { assertIsolatedRestoreTarget } from "./lib.mjs";
import { buildBackupPlan } from "./staging-backup.mjs";
import { verifyBackup } from "./verify-backup.mjs";
import { runReleasePreflight } from "./release-preflight.mjs";
import { runRollbackCheck } from "./rollback-check.mjs";
import { buildRestorePlan } from "./staging-restore.mjs";

const SHA = "a".repeat(40);
const goodConfig = {
  APP_ENV: "production", NODE_ENV: "production", TRUST_PROXY: "10.0.0.10,10.0.1.0/24",
  DATABASE_URL: "mysql://staging_user:long-real-password@db.staging.invalid:3306/promy_staging",
  JWT_SECRET: "A7zQ9mK2pR4sT6vW8yB1cD3fG5hJ7kL9nP2qS4uV6xZ8", JWT_REFRESH_SECRET: "R8xV6uS4qP2nL9kJ7hG5fD3cB1yW8vT6sR4pK2mQ9zA7",
  PUBLIC_WEB_URL: "https://panel.staging.invalid", PUBLIC_API_BASE_URL: "https://api.staging.invalid",
  CORS_ORIGIN: "https://panel.staging.invalid,https://www.staging.invalid", PUBLIC_REGISTRATION_ENABLED: "0",
  AUTH_EMAIL_PROVIDER: "resend", AUTH_EMAIL_FROM: "PROMY <no-reply@staging.invalid>", RESEND_API_KEY: "re_A9kLm3Np857nPqRs6VwX2",
  UPLOADS_DRIVER: "s3", S3_ENDPOINT: "https://storage.staging.invalid", S3_BUCKET: "promy-staging", S3_ACCESS_KEY_ID: "staging-access-key-123", S3_SECRET_ACCESS_KEY: "staging-secret-key-123", UPLOADS_PUBLIC_BASE_URL: "https://cdn.staging.invalid",
};

async function makeArtifact(root, sha = SHA) {
  const projects = ["promy-api", "promy-web", "promy-landing", "promy-mobile"];
  const artifacts = [];
  for (const project of projects) {
    const file = `${project}.zip`;
    const content = Buffer.from(`${project}-${sha}`);
    await fs.writeFile(path.join(root, file), content);
    artifacts.push({ file, sha256: createHash("sha256").update(content).digest("hex") });
  }
  await fs.writeFile(path.join(root, "release-manifest.json"), JSON.stringify({ commitSha: sha, projects, artifacts }));
  await fs.writeFile(path.join(root, "SHA256SUMS.txt"), artifacts.map((item) => `${item.sha256}  ${item.file}`).join("\n"));
}

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "promy-ops-"));
try {
  assert.deepEqual(validateStagingConfiguration(goodConfig).errors, []);
  assert.ok(validateStagingConfiguration({ ...goodConfig, CORS_ORIGIN: "*" }).errors.length > 0, "wildcard CORS must fail");
  assert.ok(validateStagingConfiguration({ ...goodConfig, CORS_ORIGIN: "https://localhost" }).errors.length > 0, "localhost CORS must fail");
  assert.ok(validateStagingConfiguration({ ...goodConfig, PUBLIC_API_BASE_URL: "http://localhost:4000" }).errors.length > 0, "localhost public URL must fail");
  const artifactRoot = path.join(tempRoot, "artifact");
  await fs.mkdir(artifactRoot);
  await makeArtifact(artifactRoot);
  const preflight = await runStagingPreflight({ ...goodConfig, STAGING_ARTIFACT_PATH: artifactRoot, STAGING_EXPECTED_SHA: SHA });
  assert.equal(preflight.ok, true, preflight.errors.join(" "));
  assert.equal(buildProviderCheckPlan(goodConfig).ok, true);
  assert.equal((await runReleasePreflight({ STAGING_ARTIFACT_PATH: artifactRoot, STAGING_EXPECTED_SHA: SHA })).ok, true);
  const invalidArtifact = await runStagingPreflight({ ...goodConfig, STAGING_ARTIFACT_PATH: artifactRoot, STAGING_EXPECTED_SHA: "b".repeat(40) });
  assert.equal(invalidArtifact.ok, false);
  const previousArtifactRoot = path.join(tempRoot, "previous-artifact");
  await fs.mkdir(previousArtifactRoot);
  await makeArtifact(previousArtifactRoot, "b".repeat(40));
  assert.equal((await runRollbackCheck({ CURRENT_ARTIFACT_PATH: artifactRoot, CURRENT_RELEASE_SHA: SHA, PREVIOUS_ARTIFACT_PATH: previousArtifactRoot, PREVIOUS_RELEASE_SHA: "b".repeat(40) })).ok, true);
  assert.throws(() => assertSmokeSafety({ STAGING_QA_ENVIRONMENT: "1", STAGING_ALLOWED_HOSTS: "api.staging.invalid,panel.staging.invalid", STAGING_API_URL: "https://api.production.invalid", STAGING_WEB_URL: "https://panel.staging.invalid" }));
  assert.throws(() => assertSmokeSafety({ STAGING_QA_ENVIRONMENT: "1", STAGING_ALLOWED_HOSTS: "api.staging.invalid,panel.staging.invalid", STAGING_API_URL: "https://api.staging.invalid", STAGING_WEB_URL: "https://panel.staging.invalid" }, { mutating: true }));
  assert.throws(() => assertIsolatedRestoreTarget("mysql://user:password@db.invalid/prom y_staging"));
  assert.throws(() => assertIsolatedRestoreTarget("mysql://user:password@db.invalid/promy_staging"));
  assert.equal(assertIsolatedRestoreTarget("mysql://user:password@db.invalid/promy_restore_qa").database, "promy_restore_qa");
  assert.throws(() => buildBackupPlan({ BACKUP_DATABASE_URL: goodConfig.DATABASE_URL, BACKUP_DESTINATION: tempRoot, RELEASE_SHA: "short" }));
  const backupFile = path.join(tempRoot, "backup.sql");
  const backupContent = "-- QA fixture\n";
  const backupHash = createHash("sha256").update(backupContent).digest("hex");
  await fs.writeFile(backupFile, backupContent);
  await fs.writeFile(`${backupFile}.sha256`, `${backupHash}  backup.sql\n`);
  await fs.writeFile(`${backupFile}.metadata.json`, JSON.stringify({ backupFile: "backup.sql", sha256: backupHash, releaseSha: SHA, timestampUtc: "2026-09-23T00:00:00.000Z" }));
  assert.equal((await verifyBackup(backupFile)).checksum, backupHash);
  assert.equal((await buildRestorePlan({ BACKUP_FILE: backupFile, RESTORE_TARGET_DATABASE_URL: "mysql://user:password@db.invalid/promy_restore_qa" })).target.database, "promy_restore_qa");
  console.log("[operations] PASS preflight, artifact, smoke safety and backup/restore guards");
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}
