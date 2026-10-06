import { assert, safeErrorMessage, validateReleaseArtifact } from "./lib.mjs";
import { pathToFileURL } from "node:url";

export async function runRollbackCheck(env = process.env) {
  try {
    assert(env.CURRENT_RELEASE_SHA && env.PREVIOUS_RELEASE_SHA, "CURRENT_RELEASE_SHA y PREVIOUS_RELEASE_SHA son obligatorios.");
    assert(env.CURRENT_RELEASE_SHA !== env.PREVIOUS_RELEASE_SHA, "El rollback requiere un SHA anterior distinto.");
    const [current, previous] = await Promise.all([
      validateReleaseArtifact(env.CURRENT_ARTIFACT_PATH, env.CURRENT_RELEASE_SHA),
      validateReleaseArtifact(env.PREVIOUS_ARTIFACT_PATH, env.PREVIOUS_RELEASE_SHA),
    ]);
    return { ok: true, current, previous, nextStep: "El operador debe activar el artifact anterior mediante el mecanismo documentado y ejecutar health/readiness/smoke." };
  } catch (error) {
    return { ok: false, error: safeErrorMessage(error) };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runRollbackCheck().then((result) => {
    console.log(JSON.stringify({ status: result.ok ? "PASS" : "FAIL", ...result }, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  });
}
