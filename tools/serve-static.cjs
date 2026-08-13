const http = require("http");
const fs = require("fs");
const path = require("path");

const rootArg = process.argv[2];
const portArg = process.argv[3];

if (!rootArg || !portArg) {
  console.error("Usage: node serve-static.cjs <rootDir> <port>");
  process.exit(1);
}

const rootDir = path.resolve(rootArg);
const port = Number(portArg);

if (!Number.isInteger(port) || port <= 0) {
  console.error(`Invalid port: ${portArg}`);
  process.exit(1);
}

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

function sendFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || "application/octet-stream";

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Internal server error");
      return;
    }

    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url || "/", "http://127.0.0.1");
  const normalizedPath = decodeURIComponent(requestUrl.pathname);
  const relativePath = normalizedPath === "/" ? "/index.html" : normalizedPath;
  const requestedFile = path.normalize(path.join(rootDir, relativePath));

  if (!requestedFile.startsWith(rootDir)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.stat(requestedFile, (statError, stats) => {
    if (!statError && stats.isFile()) {
      sendFile(requestedFile, res);
      return;
    }

    const fallback = path.join(rootDir, "index.html");
    fs.stat(fallback, (fallbackError, fallbackStats) => {
      if (fallbackError || !fallbackStats.isFile()) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }

      sendFile(fallback, res);
    });
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`[serve-static] ${rootDir} listening on http://0.0.0.0:${port}`);
});
