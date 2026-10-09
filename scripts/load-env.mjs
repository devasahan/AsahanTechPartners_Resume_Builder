/**
 * Reads settings such as ANTHROPIC_API_KEY from the .env file in the project
 * root, so the key doesn't have to be typed into every new Command Prompt.
 * Values in .env win over ones set with `set`/`export`, because a key left in
 * an old window is usually stale. The file is listed in .gitignore.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const ENV_FILE = fileURLToPath(new URL("../.env", import.meta.url));

/** Parse .env text. Copes with Notepad (BOM, CRLF), quotes, comments and `set`/`export` prefixes. */
export function parseEnv(text) {
  const vars = {};
  for (const line of text.replace(/^﻿/, "").split(/\r?\n/)) {
    const match = line.match(/^\s*(?:(?:export|set)\s+)?([A-Za-z_]\w*)\s*=\s*(.*?)\s*$/i);
    if (!match) continue;
    const quoted = match[2].match(/^(["'])(.*?)\1/);
    vars[match[1]] = quoted ? quoted[2] : match[2].replace(/\s+#.*$/, "");
  }
  return vars;
}

/** Apply the non-empty values from `file`; returns the names that were taken from it. */
export function loadEnv(file = ENV_FILE) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return new Set();
  }
  const applied = new Set();
  for (const [key, value] of Object.entries(parseEnv(text))) {
    if (!value) continue;
    process.env[key] = value;
    applied.add(key);
  }
  return applied;
}
