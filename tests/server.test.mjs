import Anthropic from "@anthropic-ai/sdk";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import test from "node:test";
import { loadEnv, parseEnv } from "../scripts/load-env.mjs";
import { describeError, handleApi, NO_KEY } from "../scripts/resume-api.mjs";

test("parses a .env file saved by Notepad", () => {
  const text = "﻿# my settings\r\nANTHROPIC_API_KEY=sk-ant-test\r\n\r\nRESUME_MODEL = \"claude-sonnet-5-5\"\r\nset PORT=3001\r\nexport X='y' # note\r\nEMPTY=\r\n";
  assert.deepEqual(parseEnv(text), {
    ANTHROPIC_API_KEY: "sk-ant-test",
    RESUME_MODEL: "claude-sonnet-5-5",
    PORT: "3001",
    X: "y",
    EMPTY: "",
  });
});

test(".env values win over stale ones, empty values are skipped", () => {
  const file = join(mkdtempSync(join(tmpdir(), "env-")), ".env");
  writeFileSync(file, "TEST_KEY_A=new\nTEST_KEY_B=\n");
  process.env.TEST_KEY_A = "old";
  process.env.TEST_KEY_B = "kept";
  assert.deepEqual([...loadEnv([file]).applied], ["TEST_KEY_A"]);
  assert.equal(process.env.TEST_KEY_A, "new");
  assert.equal(process.env.TEST_KEY_B, "kept");
  assert.deepEqual(loadEnv([join(file, "missing")]), { file: null, applied: new Set() });
});

test("a key pasted on its own line counts, but ANTHROPIC_API_KEY= wins", () => {
  assert.deepEqual(parseEnv("sk-ant-usr-abc_DEF-123\r\n"), { ANTHROPIC_API_KEY: "sk-ant-usr-abc_DEF-123" });
  assert.deepEqual(parseEnv("ANTHROPIC_API_KEY=\r\nsk-ant-bare\r\n"), { ANTHROPIC_API_KEY: "sk-ant-bare" });
  assert.equal(parseEnv("ANTHROPIC_API_KEY=sk-ant-line\nsk-ant-bare").ANTHROPIC_API_KEY, "sk-ant-line");
  assert.deepEqual(parseEnv("not a key\nsk-ant- has spaces"), {});
});

test("reads .env.txt when Windows added the extension, preferring .env", () => {
  const dir = mkdtempSync(join(tmpdir(), "env-"));
  const files = [join(dir, ".env"), join(dir, ".env.txt")];
  writeFileSync(files[1], "\uFEFFsk-ant-from-txt\r\n");
  const fromTxt = loadEnv(files);
  assert.equal(fromTxt.file, files[1]);
  assert.equal(process.env.ANTHROPIC_API_KEY, "sk-ant-from-txt");
  writeFileSync(files[0], Buffer.from("\uFEFFANTHROPIC_API_KEY=sk-ant-utf16\r\n", "utf16le"));
  assert.equal(loadEnv(files).file, files[0]);
  assert.equal(process.env.ANTHROPIC_API_KEY, "sk-ant-utf16");
});

test("API errors become messages that say what to do", () => {
  const headers = new Headers();
  const cases = [
    [new Anthropic.AuthenticationError(401, { error: { message: "invalid x-api-key" } }, undefined, headers), 401, /rejected/],
    [new Anthropic.NotFoundError(404, { error: { message: "model" } }, undefined, headers), 404, /Model "m" was not found/],
    [new Anthropic.RateLimitError(429, {}, undefined, headers), 429, /rate limiting/],
    [new Anthropic.APIConnectionTimeoutError({ message: "t" }), 504, /too long/],
    [new Anthropic.APIConnectionError({ message: "c" }), 502, /Can't reach the Claude API/],
    [new Anthropic.BadRequestError(400, { error: { message: "Your credit balance is too low" } }, undefined, headers), 502, /credit balance/],
    [new TypeError("boom"), 500, /window running it/],
  ];
  for (const [error, status, message] of cases) {
    const described = describeError(error, "m");
    assert.equal(described.status, status, error.constructor.name);
    assert.match(described.message, message);
  }
});

function call(method, path, { headers = {}, body = "" } = {}) {
  const req = new PassThrough();
  req.method = method;
  req.headers = { host: "localhost:3000", ...headers };
  req.end(body);
  return new Promise((resolve) => {
    const res = {
      writeHead(status) {
        this.status = status;
        return this;
      },
      end(text) {
        resolve({ status: this.status, body: JSON.parse(text) });
      },
    };
    handleApi(req, res, path);
  });
}

test("health reports the model and whether a key is set", async () => {
  process.env.RESUME_MODEL = "claude-test";
  process.env.ANTHROPIC_API_KEY = "x";
  const { status, body } = await call("GET", "/api/health");
  assert.equal(status, 200);
  assert.deepEqual(body, { ok: true, model: "claude-test", keySet: true });
  delete process.env.RESUME_MODEL;
});

test("missing key gives a clear message before calling the API", async () => {
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_AUTH_TOKEN;
  const jd = JSON.stringify({ jd: "Senior engineer to build production RAG systems with Python and guardrails." });
  const { body } = await call("POST", "/api/analyze", { headers: { "content-type": "application/json" }, body: jd });
  assert.equal(body.error, NO_KEY);
});

test("only this computer's page may call the API", async () => {
  const json = { "content-type": "application/json" };
  assert.equal((await call("POST", "/api/analyze", { headers: { ...json, host: "evil.example" }, body: "{}" })).status, 403);
  assert.equal((await call("POST", "/api/analyze", { headers: { "content-type": "text/plain" }, body: "{}" })).status, 415);
  assert.equal((await call("GET", "/api/analyze")).status, 405);
});
