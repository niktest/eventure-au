// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

function findPages(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findPages(full, out);
    } else if (entry.isFile() && entry.name === "page.tsx") {
      out.push(full);
    }
  }
  return out;
}

// Regression guard for EVE-177.
//
// A page that opts into SSG/ISR (`generateStaticParams` or numeric
// `revalidate`) must not call `auth()` / `cookies()` / `headers()` at the
// module level — those make the route dynamic and Next throws
// DYNAMIC_SERVER_USAGE at runtime, taking the page down with a 500. The
// approved fix is to push the dynamic call into a child component rendered
// inside <Suspense>. A page that wants to opt fully dynamic can do so via
// `export const dynamic = "force-dynamic"`, which is allowed here.

const APP_DIR = path.resolve(__dirname, "../app");

interface PageCheck {
  file: string;
  isISR: boolean;
  isForceDynamic: boolean;
  importsAuth: boolean;
  importsHeaders: boolean;
}

function analyse(file: string): PageCheck {
  const src = readFileSync(file, "utf8");
  const hasGenerateStaticParams = /export\s+(async\s+)?function\s+generateStaticParams\b/.test(src);
  const revalidateMatch = src.match(/export\s+const\s+revalidate\s*=\s*([^;]+);/);
  const hasNumericRevalidate =
    !!revalidateMatch && /^\s*\d+\s*$/.test(revalidateMatch[1]);
  const isForceDynamic = /export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/.test(src);

  const importsAuth = /^\s*import\s+\{[^}]*\bauth\b[^}]*\}\s+from\s+["']@\/lib\/auth["']/m.test(src);
  const importsHeaders = /^\s*import\s+\{[^}]*\b(cookies|headers)\b[^}]*\}\s+from\s+["']next\/headers["']/m.test(src);

  return {
    file,
    isISR: hasGenerateStaticParams || hasNumericRevalidate,
    isForceDynamic,
    importsAuth,
    importsHeaders,
  };
}

describe("ISR/SSG pages must not call dynamic APIs at module level (EVE-177 guard)", () => {
  const pages = findPages(APP_DIR);

  it("finds at least one page.tsx (sanity)", () => {
    expect(pages.length).toBeGreaterThan(0);
  });

  for (const file of pages) {
    const rel = path.relative(APP_DIR, file);
    it(`${rel} respects the SSG/ISR vs dynamic-API contract`, () => {
      const check = analyse(file);
      if (!check.isISR || check.isForceDynamic) return;

      const violations: string[] = [];
      if (check.importsAuth) {
        violations.push(
          "imports `auth` from '@/lib/auth' — wrap in a <Suspense> child component instead",
        );
      }
      if (check.importsHeaders) {
        violations.push(
          "imports `cookies`/`headers` from 'next/headers' — wrap in a <Suspense> child component instead",
        );
      }

      expect(
        violations,
        `EVE-177 regression: ${rel} declares generateStaticParams or numeric revalidate but ${violations.join("; ")}`,
      ).toEqual([]);
    });
  }
});
