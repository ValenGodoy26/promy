import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || "dist");
const expected = [
  process.env.EXPO_PUBLIC_API_URL,
  ...(process.env.EXPO_PUBLIC_API_URLS || "").split(",").map((value) => value.trim()),
].filter(Boolean);

if (expected.length === 0) {
  throw new Error("Set EXPO_PUBLIC_API_URL or EXPO_PUBLIC_API_URLS before verifying the bundle");
}

function readBundleFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return readBundleFiles(target);
    return /\.(?:js|hbc)$/.test(entry.name) ? [fs.readFileSync(target)] : [];
  });
}

const bundle = Buffer.concat(readBundleFiles(root));
for (const value of expected) {
  if (!bundle.includes(Buffer.from(value))) {
    throw new Error(`Mobile bundle did not inline expected public API value: ${value}`);
  }
}
if (/process\.env\[(?:name|["']EXPO_PUBLIC_API_(?:URLS|HOSTS)["'])\]/.test(bundle.toString("latin1"))) {
  throw new Error("Mobile bundle still contains dynamic EXPO_PUBLIC API lookup");
}

console.log(`[mobile-config] PASS inlined=${expected.length}`);
