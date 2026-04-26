#!/usr/bin/env node
// Fails when any tracked source file exceeds the LOC ceiling.
// Run locally: `npm run check:file-size`
// Override the limit: `MAX_LOC=1500 npm run check:file-size`
// CI and the husky pre-commit hook both call this script.

import { execSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { extname } from "node:path";

const MAX_LOC = Number.parseInt(process.env.MAX_LOC ?? "1000", 10);

const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
]);

// Paths matching any of these segments are skipped: generated code,
// vendored deps, lockfiles, snapshots, fixtures.
const EXCLUDED_SEGMENTS = [
  "node_modules/",
  ".next/",
  "out/",
  "build/",
  "coverage/",
  "dist/",
  ".vercel/",
  "/__snapshots__/",
  "/__fixtures__/",
  "/fixtures/",
  "/snapshots/",
];

const EXCLUDED_FILENAMES = new Set([
  "next-env.d.ts",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
]);

function listTrackedFiles() {
  const stdout = execSync("git ls-files -z", { encoding: "buffer" });
  return stdout
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
}

function isExcluded(path) {
  if (EXCLUDED_FILENAMES.has(path.split("/").pop())) return true;
  if (path.endsWith(".tsbuildinfo")) return true;
  for (const seg of EXCLUDED_SEGMENTS) {
    if (path.includes(seg)) return true;
  }
  return false;
}

function isSourceFile(path) {
  return SOURCE_EXTENSIONS.has(extname(path));
}

function countLines(path) {
  // Skip if the file no longer exists on disk (e.g. just deleted but still
  // tracked in the index for this commit).
  try {
    statSync(path);
  } catch {
    return 0;
  }
  const content = readFileSync(path, "utf8");
  if (content.length === 0) return 0;
  // A trailing newline should not inflate the count by one.
  const trimmed = content.endsWith("\n") ? content.slice(0, -1) : content;
  return trimmed.split("\n").length;
}

function main() {
  const tracked = listTrackedFiles();
  const offenders = [];
  for (const path of tracked) {
    if (isExcluded(path)) continue;
    if (!isSourceFile(path)) continue;
    const loc = countLines(path);
    if (loc > MAX_LOC) {
      offenders.push({ path, loc });
    }
  }

  if (offenders.length === 0) {
    console.log(
      `OK: no tracked source files exceed ${MAX_LOC} LOC (${tracked.length} tracked entries scanned).`,
    );
    return;
  }

  offenders.sort((a, b) => b.loc - a.loc);
  console.error(
    `\nFile size guardrail: ${offenders.length} file(s) exceed ${MAX_LOC} LOC.\n`,
  );
  for (const { path, loc } of offenders) {
    console.error(`  ${loc} LOC  ${path}`);
  }
  console.error(
    "\nDecompose these files into smaller, single-responsibility modules.",
  );
  console.error("See CONTRIBUTING.md (Code quality standards) for guidance.\n");
  process.exit(1);
}

main();
