import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidates = [
  "public/promy-logo.png",
  "public/promy-logo-square.png",
  "public/promy-p-phone.png",
  "public/promy-p-mail.png",
  "public/hero-app-screen.webp",
];

let removed = 0;
for (const relativePath of candidates) {
  const absolutePath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(absolutePath)) continue;
  fs.rmSync(absolutePath);
  removed += 1;
  console.log(`removed ${relativePath}`);
}

console.log(`PROMY legacy assets cleanup: ${removed} archivo(s) eliminado(s).`);
