// Node entry point used when hosting the site on a plain Node host (Railway).
//
// Depending on the build preset, nitro emits either:
//   1. a standalone Node server (dist/server/index.mjs that listens on PORT), or
//   2. a fetch-style module (default export with a `fetch` handler).
// This wrapper supports both so the container always boots.
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { pathToFileURL } from "node:url";

const port = Number(process.env.PORT ?? 3000);
const serverEntry = join(process.cwd(), "dist", "server", "index.mjs");
const clientDir = join(process.cwd(), "dist", "client");

if (!existsSync(serverEntry)) {
  console.error(`[start] Missing ${serverEntry}. Run "npm run build" first.`);
  process.exit(1);
}

const mod = await import(pathToFileURL(serverEntry).href);
const fetchHandler = mod.default?.fetch ?? mod.fetch;

// Case 1: nitro's node presets start their own listener on import.
if (typeof fetchHandler !== "function") {
  console.log(`[start] Node server bundle started (PORT=${port}).`);
} else {
  const MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".txt": "text/plain; charset=utf-8",
  };

  const staticFile = (pathname) => {
    if (pathname.endsWith("/")) return null;
    const target = join(clientDir, normalize(pathname).replace(/^(\.\.[/\\])+/, ""));
    if (!target.startsWith(clientDir) || !existsSync(target)) return null;
    if (!statSync(target).isFile()) return null;
    return target;
  };

  createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
      const file = staticFile(url.pathname);
      if (file) {
        res.writeHead(200, {
          "content-type": MIME[extname(file)] ?? "application/octet-stream",
          "cache-control": url.pathname.startsWith("/assets/")
            ? "public, max-age=31536000, immutable"
            : "public, max-age=3600",
        });
        res.end(readFileSync(file));
        return;
      }

      const body =
        req.method === "GET" || req.method === "HEAD"
          ? undefined
          : await new Promise((resolve) => {
              const chunks = [];
              req.on("data", (c) => chunks.push(c));
              req.on("end", () => resolve(Buffer.concat(chunks)));
            });

      const response = await fetchHandler(
        new Request(url, { method: req.method, headers: req.headers, body }),
        process.env,
        { waitUntil() {}, passThroughOnException() {} },
      );

      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(response.body ? Buffer.from(await response.arrayBuffer()) : undefined);
    } catch (error) {
      console.error("[start] request failed", error);
      if (!res.headersSent) res.writeHead(500, { "content-type": "text/plain" });
      res.end("Internal Server Error");
    }
  }).listen(port, "0.0.0.0", () => {
    console.log(`[start] Listening on http://0.0.0.0:${port}`);
  });
}
