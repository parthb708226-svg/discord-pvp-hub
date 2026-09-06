// Starts the built site on Railway (or any Node host).
// Nitro's node-server preset writes its entry to one of a few places
// depending on version, so we look for the first one that exists.
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const candidates = [
  ".output/server/index.mjs",
  "dist/server/index.mjs",
  ".nitro/server/index.mjs",
  "dist/server/server.mjs",
];

const found = candidates.map((p) => resolve(process.cwd(), p)).find((p) => existsSync(p));

if (!found) {
  console.error(
    "[start] Could not find the built server entry. Run `npm run build` first " +
      "with NITRO_PRESET=node-server set. Looked in:\n  " +
      candidates.join("\n  "),
  );
  process.exit(1);
}

console.log(`[start] Booting ${found} on port ${process.env.PORT ?? 3000}`);
await import(pathToFileURL(found).href);
