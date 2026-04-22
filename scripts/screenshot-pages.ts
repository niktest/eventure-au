/**
 * Visual screenshot utility for QA verification.
 *
 * Takes full-page screenshots of all key pages at desktop (1440px) and mobile (375px).
 * Usage:
 *   npm run visual-check                          # uses deployed Vercel URL
 *   npm run visual-check -- --base-url http://localhost:3000   # uses local dev server
 */

import { chromium, type Browser, type Page } from "playwright";
import * as path from "path";
import * as fs from "fs";
import * as sharpModule from "sharp";
const sharp = (sharpModule as any).default ?? sharpModule;

const DEFAULT_BASE_URL = "https://eventure-au.vercel.app";

// Max dimension (width or height) for output images.
// Claude's API limits images to 2000px per dimension in many-image requests.
// We cap at 1800px to stay safely under the limit.
const MAX_IMAGE_DIMENSION = 1800;

const VIEWPORTS = [
  { label: "desktop", width: 1440, height: 900 },
  { label: "mobile", width: 375, height: 812 },
] as const;

// Key pages to screenshot — static routes that don't require auth or dynamic data
const PAGES = [
  { name: "home", path: "/" },
  { name: "events", path: "/events" },
  { name: "login", path: "/login" },
  { name: "signup", path: "/signup" },
  { name: "about", path: "/about" },
  { name: "community", path: "/community" },
  { name: "collections", path: "/collections" },
  { name: "discussions", path: "/discussions" },
  { name: "contact", path: "/contact" },
  { name: "faq", path: "/faq" },
  { name: "privacy", path: "/privacy" },
  { name: "terms", path: "/terms" },
  { name: "cookies", path: "/cookies" },
];

function parseArgs(): { baseUrl: string } {
  const args = process.argv.slice(2);
  let baseUrl = DEFAULT_BASE_URL;

  const idx = args.indexOf("--base-url");
  if (idx !== -1 && args[idx + 1]) {
    baseUrl = args[idx + 1];
  }

  // Strip trailing slash
  return { baseUrl: baseUrl.replace(/\/+$/, "") };
}

async function screenshotPage(
  page: Page,
  baseUrl: string,
  pageDef: (typeof PAGES)[number],
  viewport: (typeof VIEWPORTS)[number],
  outDir: string
): Promise<{ file: string; ok: boolean; error?: string }> {
  const filename = `${pageDef.name}-${viewport.label}.png`;
  const filepath = path.join(outDir, filename);

  try {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const url = `${baseUrl}${pageDef.path}`;
    await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
    // Allow fonts / lazy images to settle
    await page.waitForTimeout(1500);
    const rawBuffer = await page.screenshot({ fullPage: true });
    // Crop height if it exceeds the limit (keeps full width for readability)
    const metadata = await sharp(rawBuffer).metadata();
    const w = metadata.width ?? 0;
    const h = metadata.height ?? 0;
    if (h > MAX_IMAGE_DIMENSION) {
      await sharp(rawBuffer)
        .extract({ left: 0, top: 0, width: w, height: MAX_IMAGE_DIMENSION })
        .png()
        .toFile(filepath);
    } else {
      fs.writeFileSync(filepath, rawBuffer);
    }
    return { file: filename, ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { file: filename, ok: false, error: msg };
  }
}

async function main() {
  const { baseUrl } = parseArgs();
  const outDir = path.resolve(process.cwd(), "screenshots");

  // Ensure output directory exists and is clean
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true });
  }
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`\n  Visual Check — Eventure`);
  console.log(`  Base URL : ${baseUrl}`);
  console.log(`  Pages    : ${PAGES.length}`);
  console.log(`  Viewports: ${VIEWPORTS.map((v) => `${v.label} (${v.width}px)`).join(", ")}`);
  console.log(`  Output   : ${outDir}\n`);

  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const results: { file: string; ok: boolean; error?: string }[] = [];

    for (const pageDef of PAGES) {
      for (const viewport of VIEWPORTS) {
        const result = await screenshotPage(page, baseUrl, pageDef, viewport, outDir);
        const status = result.ok ? "OK" : "FAIL";
        console.log(`  [${status}] ${result.file}${result.error ? ` — ${result.error}` : ""}`);
        results.push(result);
      }
    }

    await browser.close();
    browser = undefined;

    // Summary
    const passed = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;
    console.log(`\n  Done: ${passed} captured, ${failed} failed out of ${results.length} total.`);
    console.log(`  Screenshots saved to: ${outDir}\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

main();
