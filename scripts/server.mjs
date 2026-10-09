/**
 * Local server: serves public/ and the /api routes on http://localhost:3000
 * (or the next free port), opens the browser, and says whether an API key was
 * found. It only accepts connections from this computer.
 *
 * Options: npm run dev -- --no-open   don't open a browser tab
 */
import { exec } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { basename, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./load-env.mjs";
import { config, handleApi, NO_KEY } from "./resume-api.mjs";

const env = loadEnv();
const PUBLIC = fileURLToPath(new URL("../public", import.meta.url));
const START_PORT = Number(process.env.PORT) || 3000;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
};

const server = createServer(async (req, res) => {
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
});

function openBrowser(address) {
  if (process.argv.includes("--no-open")) return;
  const command =
    process.platform === "win32"
      ? `start "" "${address}"`
      : process.platform === "darwin"
        ? `open "${address}"`
        : `xdg-open "${address}"`;
  exec(command, () => {});
}

// Try the next port when one is taken, e.g. by a copy still running in another window.
function listen(port) {
  const onError = (error) => {
    if (error.code === "EADDRINUSE" && port < START_PORT + 9) return listen(port + 1);
    console.error(`\n  Could not start the server: ${error.message}\n`);
    process.exit(1);
  };
  server.once("error", onError);
  server.listen(port, "127.0.0.1", () => server.off("error", onError));
}

server.once("listening", () => {
  const port = server.address().port;
  const address = `http://localhost:${port}`;
  const { model, keySet } = config();
  const envFile = env.file && basename(env.file);
  const key = process.env.ANTHROPIC_API_KEY;
  console.log(`\n  Resume builder running at ${address}`);
  if (port !== START_PORT) console.log(`  (port ${START_PORT} was busy: is another copy running in a different window?)`);
  console.log(`  Model:   ${model}`);
  if (!keySet && envFile) console.log(`  API key: MISSING. ${envFile} has no key: paste it after ANTHROPIC_API_KEY=, save, and restart.`);
  else if (!keySet) console.log(`  API key: MISSING. ${NO_KEY}`);
  else console.log(`  API key: found (${env.applied.has("ANTHROPIC_API_KEY") ? `${envFile} file` : "environment"})`);
  if (key && !key.startsWith("sk-ant-"))
    console.log("  Warning: that key doesn't look like a Claude API key (those start with sk-ant-). Check what was pasted.");
  console.log("\n  Keep this window open while you use the page. Press Ctrl+C to stop.\n");
  openBrowser(address);
});

listen(START_PORT);
