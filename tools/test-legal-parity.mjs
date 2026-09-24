import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sources = {
  web: path.join(root, "promy-web/src/features/public/legalContent.ts"),
  mobile: path.join(root, "promy-mobile/src/screens/legal/legalContent.ts"),
  landing: path.join(root, "promy-landing/src/App.tsx"),
};

const stalePublishedClaims = [
  "privacidad@promy.app",
  "soporte@promy.app",
  "moderacion@promy.app",
  "PROMY conserva un registro de aceptación con fecha, hora, IP y versión",
  "Version vigente: mayo 2026",
  "Versión vigente: mayo 2026",
  "30 días",
  "12 meses",
];

const expectedPrePilotSignals = ["pre-piloto", "pendiente", "revisión jurídica"];

const requestedSurface = process.argv.find((argument) => argument.startsWith("--surface="));
const selectedNames = requestedSurface
  ? [requestedSurface.split("=", 2)[1]]
  : Object.keys(sources);

for (const name of selectedNames) {
  assert.ok(name in sources, `Superficie legal desconocida: ${name}`);
  const source = await readFile(sources[name], "utf8");
  const normalized = source.toLocaleLowerCase("es-AR");

  for (const claim of stalePublishedClaims) {
    assert.equal(
      normalized.includes(claim.toLocaleLowerCase("es-AR")),
      false,
      `${name} volvió a publicar la afirmación retirada: ${claim}`,
    );
  }

  for (const signal of expectedPrePilotSignals) {
    assert.equal(
      normalized.includes(signal.toLocaleLowerCase("es-AR")),
      true,
      `${name} debe declarar el estado pre-piloto: falta ${signal}`,
    );
  }

  assert.equal(
    normalized.includes("1.1-prepiloto"),
    true,
    `${name} debe publicar la versión legal técnica 1.1-prepiloto`,
  );
}

console.log(`Legal parity gate PASS (${selectedNames.join(", ")})`);
