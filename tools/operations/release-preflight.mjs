import { safeErrorMessage, validateReleaseArtifact } from "./lib.mjs";
import { pathToFileURL } from "node:url";

export async function runReleasePreflight(env = process.env) {
  try {
    const artifact = await validateReleaseArtifact(env.STAGING_ARTIFACT_PATH, env.STAGING_EXPECTED_SHA);
    return { ok: true, artifact, activation: "No activa releases: sólo valida el artifact y SHA." };
  } catch (error) {
    return { ok: false, error: safeErrorMessage(error) };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runReleasePreflight().then((result) => {
    console.log(JSON.stringify({ status: result.ok ? "PASS" : "FAIL", ...result }, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  });
}
