#!/usr/bin/env node
/**
 * Lighthouse runner for Eventure QA / perf gates.
 *
 * Resolution order:
 *   1. PSI API (preferred) when PSI_API_KEY is set in env. Free tier = 25k req/day.
 *   2. Local `npx lighthouse` against the playwright Chromium binary
 *      (only works if the system libs Chromium needs are installed —
 *      see EVE-119 for the QA sandbox image fix).
 *
 * Usage:
 *   node scripts/lighthouse.mjs <url> [--preset=mobile|desktop] [--json]
 *
 * Output:
 *   Human-readable summary on stderr, JSON object with the four core scores
 *   (performance, accessibility, best-practices, seo) on stdout.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const PLAYWRIGHT_CHROME =
  "/paperclip/.cache/ms-playwright/chromium-1217/chrome-linux/chrome";

function parseArgs(argv) {
  const args = argv.slice(2);
  let url;
  let preset = "mobile";
  let json = false;
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === "--json") {
      json = true;
    } else if (a.startsWith("--preset=")) {
      preset = a.slice("--preset=".length);
    } else if (a === "--preset") {
      preset = args[i + 1];
      i += 1;
    } else if (!a.startsWith("--")) {
      url = a;
    }
  }
  if (!url) {
    console.error(
      "Usage: node scripts/lighthouse.mjs <url> [--preset=mobile|desktop] [--json]",
    );
    process.exit(2);
  }
  if (preset !== "mobile" && preset !== "desktop") {
    console.error(`Unsupported preset: ${preset}`);
    process.exit(2);
  }
  return { url, preset, json };
}

async function runViaPsi(url, preset, apiKey) {
  const strategy = preset === "desktop" ? "desktop" : "mobile";
  const params = new URLSearchParams({
    url,
    key: apiKey,
    strategy,
  });
  for (const cat of ["performance", "accessibility", "best-practices", "seo"]) {
    params.append("category", cat);
  }
  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`;
  const res = await fetch(endpoint);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`PSI API ${res.status}: ${body.slice(0, 500)}`);
  }
  const data = await res.json();
  const cats = data?.lighthouseResult?.categories ?? {};
  return {
    source: "psi",
    url,
    preset,
    scores: {
      performance: pct(cats.performance?.score),
      accessibility: pct(cats.accessibility?.score),
      "best-practices": pct(cats["best-practices"]?.score),
      seo: pct(cats.seo?.score),
    },
  };
}

function runViaLocalChrome(url, preset) {
  if (!existsSync(PLAYWRIGHT_CHROME)) {
    throw new Error(
      `Local Chromium not found at ${PLAYWRIGHT_CHROME}. Run: npx playwright install chromium`,
    );
  }
  const args = [
    "lighthouse",
    url,
    `--preset=${preset === "desktop" ? "desktop" : ""}`,
    "--output=json",
    "--quiet",
    "--chrome-flags=--headless=new --no-sandbox --disable-gpu",
  ].filter((s) => s !== "--preset=");

  const out = spawnSync("npx", args, {
    encoding: "utf8",
    env: { ...process.env, CHROME_PATH: PLAYWRIGHT_CHROME },
  });
  if (out.status !== 0) {
    const stderr = (out.stderr || "").trim();
    throw new Error(`lighthouse exited ${out.status}: ${stderr.slice(0, 800)}`);
  }
  const data = JSON.parse(out.stdout);
  const cats = data?.categories ?? {};
  return {
    source: "local-chrome",
    url,
    preset,
    scores: {
      performance: pct(cats.performance?.score),
      accessibility: pct(cats.accessibility?.score),
      "best-practices": pct(cats["best-practices"]?.score),
      seo: pct(cats.seo?.score),
    },
  };
}

function pct(score) {
  if (score == null) return null;
  return Math.round(score * 100);
}

async function main() {
  const { url, preset, json } = parseArgs(process.argv);
  const apiKey = process.env.PSI_API_KEY;

  let result;
  if (apiKey) {
    result = await runViaPsi(url, preset, apiKey);
  } else {
    console.error(
      "PSI_API_KEY not set; falling back to local Chromium. Set PSI_API_KEY to use the PSI API path.",
    );
    result = runViaLocalChrome(url, preset);
  }

  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    const { scores } = result;
    console.error(
      `\nLighthouse (${result.source}) ${preset} — ${url}\n` +
        `  performance     ${scores.performance ?? "-"}\n` +
        `  accessibility   ${scores.accessibility ?? "-"}\n` +
        `  best-practices  ${scores["best-practices"] ?? "-"}\n` +
        `  seo             ${scores.seo ?? "-"}\n`,
    );
    process.stdout.write(`${JSON.stringify(result.scores)}\n`);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
