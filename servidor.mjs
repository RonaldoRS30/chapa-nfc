import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT) || 8931;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

function lanIps() {
  const out = [];
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family === "IPv4" && !a.internal) out.push(a.address);
    }
  }
  return out;
}

function safeFile(urlPath) {
  const decoded = decodeURIComponent((urlPath || "/").split("?")[0]);
  let rel = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  if (rel.endsWith("/")) rel += "index.html";
  const abs = path.resolve(ROOT, rel);
  const rootSlash = ROOT.endsWith(path.sep) ? ROOT : ROOT + path.sep;
  if (abs !== ROOT && !abs.startsWith(rootSlash)) return null;
  return abs;
}

const server = http.createServer((req, res) => {
  const file = safeFile(req.url || "/");
  if (!file) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Prohibido");
    return;
  }
  fs.stat(file, (err, st) => {
    const target = !err && st.isDirectory() ? path.join(file, "index.html") : file;
    fs.readFile(target, (readErr, data) => {
      if (readErr) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("No encontrado");
        return;
      }
      const ext = path.extname(target).toLowerCase();
      const live = ext === ".html" || ext === ".css" || ext === ".js";
      res.writeHead(200, {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": live ? "no-store" : "public, max-age=86400",
      });
      res.end(data);
    });
  });
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error("El puerto " + PORT + " ya está en uso. El sistema puede estar sirviéndose ya.");
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("");
  console.log("  CHAPA — servidor local");
  console.log("  En esta PC:     http://localhost:" + PORT + "/index.html");
  for (const ip of lanIps()) {
    console.log("  En la red WiFi: http://" + ip + ":" + PORT + "/index.html");
  }
  console.log("");
  console.log("  Deja esta ventana abierta. Ctrl+C para detener.");
  console.log("");
});
