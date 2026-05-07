/**
 * Mobile layout audit screenshot helper for EVE-171/EVE-172.
 *
 * Walks every production route at 360px and 390px and (optionally) 768px and
 * writes full-page PNGs to a target directory.
 *
 * Usage:
 *   tsx scripts/mobile-audit.ts --base-url https://festlio.com --out screenshots/eve-171/before
 *   tsx scripts/mobile-audit.ts --base-url http://localhost:3000 --out screenshots/eve-171/after --include-tablet
 */

import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import * as path from "path";
import * as fs from "fs";

interface RouteDef {
  name: string;
  path: string;
  // Some routes need a discovered slug (e.g. event detail, city page, collection, discussion)
  resolveSlug?: (page: Page, baseUrl: string) => Promise<string | null>;
}

const VIEWPORTS = [
  { label: "360", width: 360, height: 740 },
  { label: "390", width: 390, height: 844 },
] as const;

const TABLET_VIEWPORT = { label: "768", width: 768, height: 1024 } as const;

async function discoverFirstHref(
  page: Page,
  baseUrl: string,
  listingPath: string,
  hrefPrefix: string
): Promise<string | null> {
  try {
    await page.goto(`${baseUrl}${listingPath}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForSelector(`a[href^="${hrefPrefix}"]`, { timeout: 10_000 }).catch(() => null);
    return await page.evaluate((prefix) => {
      const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>(`a[href^="${prefix}"]`));
      for (const a of anchors) {
        const href = a.getAttribute("href") ?? "";
        const re = new RegExp(`^${prefix.replace(/[/]/g, "\\/")}([^/?#]+)`);
        const m = href.match(re);
        if (m && m[1]) return m[1];
      }
      return null;
    }, hrefPrefix);
  } catch {
    return null;
  }
}

const ROUTES: RouteDef[] = [
  { name: "01-home", path: "/" },
  { name: "02-events", path: "/events" },
  {
    name: "03-event-detail",
    path: "",
    resolveSlug: async (p, b) => {
      const slug = await discoverFirstHref(p, b, "/events", "/events/");
      return slug ? `/events/${slug}` : null;
    },
  },
  {
    name: "04-city",
    path: "",
    resolveSlug: async (p, b) => {
      const slug = await discoverFirstHref(p, b, "/", "/city/");
      return slug ? `/city/${slug}` : "/city/gold-coast";
    },
  },
  { name: "05-collections", path: "/collections" },
  {
    name: "06-collection-detail",
    path: "",
    resolveSlug: async (p, b) => {
      const slug = await discoverFirstHref(p, b, "/collections", "/collections/");
      if (!slug || slug === "create") return null;
      return `/collections/${slug}`;
    },
  },
  { name: "07-collections-create", path: "/collections/create" },
  { name: "08-community", path: "/community" },
  { name: "09-discussions", path: "/discussions" },
  {
    name: "10-discussion-detail",
    path: "",
    resolveSlug: async (p, b) => {
      const slug = await discoverFirstHref(p, b, "/discussions", "/discussions/");
      if (!slug || slug === "new" || slug === "category") return null;
      return `/discussions/${slug}`;
    },
  },
  { name: "11-discussions-new", path: "/discussions/new" },
  { name: "12-today", path: "/today" },
  { name: "13-about", path: "/about" },
  { name: "14-contact", path: "/contact" },
  { name: "15-faq", path: "/faq" },
  { name: "16-privacy", path: "/privacy" },
  { name: "17-terms", path: "/terms" },
  { name: "18-cookies", path: "/cookies" },
  { name: "19-login", path: "/login" },
  { name: "20-signup", path: "/signup" },
  { name: "21-profile", path: "/profile" },
];

interface Args {
  baseUrl: string;
  outDir: string;
  includeTablet: boolean;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };
  const baseUrl = (get("--base-url") || "https://festlio.com").replace(/\/+$/, "");
  const outDir = path.resolve(process.cwd(), get("--out") || "screenshots/audit");
  const includeTablet = args.includes("--include-tablet");
  return { baseUrl, outDir, includeTablet };
}

async function checkOverflow(page: Page): Promise<{ horizontal: boolean; offenders: string[] }> {
  return await page.evaluate(() => {
    const docEl = document.documentElement;
    const horizontal = docEl.scrollWidth > docEl.clientWidth + 1;
    const offenders: string[] = [];
    if (horizontal) {
      const all = Array.from(document.querySelectorAll<HTMLElement>("body *"));
      for (const el of all) {
        const r = el.getBoundingClientRect();
        if (r.right > docEl.clientWidth + 1 && r.width < docEl.clientWidth + 200) {
          const tag = el.tagName.toLowerCase();
          const cls =
            typeof el.className === "string"
              ? el.className.split(/\s+/).slice(0, 3).join(".")
              : "";
          offenders.push(`${tag}${cls ? "." + cls : ""}@${Math.round(r.right)}`);
          if (offenders.length >= 5) break;
        }
      }
    }
    return { horizontal, offenders };
  });
}

async function captureRoute(
  context: BrowserContext,
  baseUrl: string,
  outDir: string,
  route: RouteDef,
  resolvedPath: string,
  viewport: { label: string; width: number; height: number }
): Promise<{ file: string; ok: boolean; horizontal: boolean; offenders: string[]; error?: string }> {
  const filename = `${route.name}-${viewport.label}.png`;
  const filepath = path.join(outDir, filename);
  const page = await context.newPage();
  try {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(`${baseUrl}${resolvedPath}`, { waitUntil: "networkidle", timeout: 30_000 });
    await page.waitForTimeout(1200);
    const overflow = await checkOverflow(page);
    await page.screenshot({ path: filepath, fullPage: true });
    return { file: filename, ok: true, horizontal: overflow.horizontal, offenders: overflow.offenders };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { file: filename, ok: false, horizontal: false, offenders: [], error: msg };
  } finally {
    await page.close().catch(() => {});
  }
}

async function main() {
  const { baseUrl, outDir, includeTablet } = parseArgs();
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`mobile-audit base=${baseUrl} out=${outDir}`);

  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const discovery = await context.newPage();

    const resolved: { route: RouteDef; resolvedPath: string }[] = [];
    for (const r of ROUTES) {
      let p = r.path;
      if (r.resolveSlug) {
        const dyn = await r.resolveSlug(discovery, baseUrl);
        if (!dyn) {
          console.log(`  [skip] ${r.name} — could not resolve dynamic slug`);
          continue;
        }
        p = dyn;
      }
      resolved.push({ route: r, resolvedPath: p });
    }
    await discovery.close();

    const viewports = includeTablet ? [...VIEWPORTS, TABLET_VIEWPORT] : VIEWPORTS;
    const summary: { route: string; viewport: string; horizontal: boolean; offenders: string[]; error?: string }[] = [];

    for (const { route, resolvedPath } of resolved) {
      for (const v of viewports) {
        const result = await captureRoute(context, baseUrl, outDir, route, resolvedPath, v);
        const flag = result.horizontal ? "  ⚠ horizontal-scroll" : "";
        console.log(
          `  [${result.ok ? "OK" : "FAIL"}] ${route.name} (${resolvedPath}) ${v.label}px${flag}${
            result.error ? ` — ${result.error}` : ""
          }`
        );
        summary.push({
          route: `${route.name} ${resolvedPath}`,
          viewport: v.label,
          horizontal: result.horizontal,
          offenders: result.offenders,
          error: result.error,
        });
      }
    }

    fs.writeFileSync(path.join(outDir, "_audit.json"), JSON.stringify(summary, null, 2));
    const horizontalIssues = summary.filter((s) => s.horizontal);
    if (horizontalIssues.length > 0) {
      console.log(`\nHorizontal-scroll routes (${horizontalIssues.length}):`);
      for (const h of horizontalIssues) {
        console.log(`  - ${h.route} @${h.viewport}px → ${h.offenders.join(", ")}`);
      }
    } else {
      console.log("\nNo horizontal scroll detected.");
    }
  } catch (err) {
    console.error("Fatal:", err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
}

main();
