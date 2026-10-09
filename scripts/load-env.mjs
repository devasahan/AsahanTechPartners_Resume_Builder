/**
 * Reads settings such as ANTHROPIC_API_KEY from the .env file in the project
 * root, so the key doesn't have to be typed into every new Command Prompt.
 * Windows often saves that file as .env.txt (File Explorer hides extensions),
 * so that name works too, as does a file holding nothing but the key. Values
 * in the file win over ones set with `set`/`export`, because a key left in an
 * old window is usually stale. Both names are listed in .gitignore.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const ENV_FILES = [".env", ".env.txt"].map((name) => fileURLToPath(new URL(`../${name}`, import.meta.url)));

const BARE_KEY = /^\s*(sk-ant-[\w-]+)\s*$/;

/** Parse .env text. Copes with Notepad (BOM, CRLF), quotes, comments, `set`/`export` prefixes and a bare key. */
export function parseEnv(text) {
  const vars = {};
  let bareKey;
  for (const line of text.replace(/^﻿/, "").split(/\r?\n/)) {
    const bare = line.match(BARE_KEY);
    if (bare) {
      bareKey ??= bare[1];
      continue;
    }
    const match = line.match(/^\s*(?:(?:export|set)\s+)?([A-Za-z_]\w*)\s*=\s*(.*?)\s*$/i);
    if (!match) continue;
    const quoted = match[2].match(/^(["'])(.*?)\1/);
    vars[match[1]] = quoted ? quoted[2] : match[2].replace(/\s+#.*$/, "");
  }
  // A key pasted on its own line counts, unless ANTHROPIC_API_KEY= already holds one.
  if (bareKey && !vars.ANTHROPIC_API_KEY) vars.ANTHROPIC_API_KEY = bareKey;
  return vars;
}

/** Notepad's older "Unicode" option saves UTF-16; everything else is read as UTF-8. */
function readText(file) {
  const bytes = readFileSync(file);
  return bytes[0] === 0xff && bytes[1] === 0xfe ? bytes.toString("utf16le") : bytes.toString("utf8");
}

/** Apply the non-empty values from the first file that exists; returns that file and the names taken from it. */
export function loadEnv(files = ENV_FILES) {
  for (const file of files) {
    let text;
    try {
      text = readText(file);
    } catch {
      continue;
    }
    const applied = new Set();
    for (const [key, value] of Object.entries(parseEnv(text))) {
      if (!value) continue;
      process.env[key] = value;
      applied.add(key);
    }
    return { file, applied };
  }
  return { file: null, applied: new Set() };
}
