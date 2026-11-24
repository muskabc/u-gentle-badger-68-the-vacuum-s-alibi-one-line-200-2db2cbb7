import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const raw = readFileSync(join(here, "line.txt"), "utf8");

// Strip one trailing newline if present; the entry itself must be a single line.
const line = raw.replace(/\r?\n$/, "");

if (line.trim().length === 0) {
  throw new Error("line.txt is empty or only whitespace");
}
if (line.includes("\n") || line.includes("\r")) {
  throw new Error("entry must be exactly one line");
}
const length = [...line].length;
if (length < 1 || length > 200) {
  throw new Error(`entry must be 1-200 characters, got ${length}`);
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "entry.txt"), line, "utf8");
console.log(`Wrote ${length} characters to ${join(outDir, "entry.txt")}`);
