/** Local server: serves public/ on http://localhost:3000 and mounts the /api routes. */
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { handleApi } from "./resume-api.mjs";

const PUBLIC = fileURLToPath(new URL("../public", import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
};

createServer(async (req, res) => {
  const { pathname: raw } = new URL(req.url, "http://localhost");
  let pathname;
  try {
    pathname = decodeURIComponent(raw);
  } catch {
    pathname = "/";
  }
  if (pathname.startsWith("/api/") && (await handleApi(req, res, pathname))) return;
  if (pathname.endsWith("/")) pathname += "index.html";
  const file = normalize(join(PUBLIC, pathname));
  if (!file.startsWith(PUBLIC + sep)) return res.writeHead(404).end("Not found");
  try {
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream", "Cache-Control": "no-store" }).end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(PORT, () => console.log(`Resume builder running at http://localhost:${PORT}`));
