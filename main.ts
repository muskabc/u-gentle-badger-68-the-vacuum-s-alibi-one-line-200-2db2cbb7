import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const SOURCE_NAME = "line.txt";
const OUTPUT_NAME = "entry.txt";
const MIN_CHARS = 1;
const MAX_CHARS = 200;
const MAX_BYTES = MAX_CHARS * 4; // worst case: every char is 4 UTF-8 bytes

function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function loadSourceLine(): string {
  const sourcePath = resolve(import.meta.dirname, SOURCE_NAME);
  if (!existsSync(sourcePath)) {
    throw new Error(`missing source file: ${SOURCE_NAME}`);
  }
  const raw = readFileSync(sourcePath, "utf8");
  // Only a single trailing line ending is decoration; anything else is content.
  return raw.replace(/(?:\r\n|\n|\r)$/, "");
}

function collectProblems(line: string): string[] {
  const problems: string[] = [];
  const codePoints = Array.from(line);
  const charCount = codePoints.length;
  const byteCount = Buffer.byteLength(line, "utf8");

  if (charCount < MIN_CHARS) problems.push(`empty entry (0 characters)`);
  if (charCount > MAX_CHARS) problems.push(`too long: ${charCount} characters (max ${MAX_CHARS})`);
  if (byteCount > MAX_BYTES) problems.push(`too large: ${byteCount} UTF-8 bytes`);
  if (line.trim() === "") problems.push("entry is only whitespace");
  if (line.indexOf("\n") !== -1 || line.indexOf("\r") !== -1) {
    problems.push("entry spans more than one line");
  }
  const broken = codePoints.some((cp) => cp === "�");
  if (broken) problems.push("entry contains invalid UTF-8 (replacement character present)");
  return problems;
}

function main(): void {
  const line = loadSourceLine();
  const problems = collectProblems(line);
  if (problems.length > 0) {
    throw new Error(`invalid entry in ${SOURCE_NAME}: ${problems.join("; ")}`);
  }

  const sourceDigest = sha256Hex(line);

  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true }); // create only; never remove the directory

  const target = join(outDir, OUTPUT_NAME);
  writeFileSync(target, line, { encoding: "utf8", flag: "w" });

  // Verify the round trip: what landed on disk must hash identically to the source.
  const written = readFileSync(target, "utf8");
  const writtenDigest = sha256Hex(written);
  if (writtenDigest !== sourceDigest) {
    throw new Error(
      `output verification failed: sha256 ${writtenDigest} != source sha256 ${sourceDigest}`,
    );
  }

  const chars = Array.from(line).length;
  console.log(
    `Wrote ${chars} characters (${Buffer.byteLength(line, "utf8")} bytes) to ${target} ` +
      `[sha256 ${sourceDigest.slice(0, 12)}…]`,
  );
}

main();
