# Contributing to Eventure

Thanks for working on Eventure. This document captures the engineering standards every contributor — human or agent — must follow.

## Code quality standards

### SOLID

Every change should respect the SOLID principles:

- **Single responsibility** — each module / class / function does one thing. If you cannot describe a file's purpose in one sentence, split it.
- **Open / closed** — extend behaviour by adding new modules or composition, not by editing unrelated existing code.
- **Liskov substitution** — subtypes must honour the contract of their base type.
- **Interface segregation** — prefer many small interfaces / props shapes over a few wide ones.
- **Dependency inversion** — depend on abstractions (interfaces, factory functions, hooks) rather than concrete implementations. This keeps adapters, schemas, and UI loosely coupled.

### DRY

Do not repeat yourself. If the same logic appears more than twice, extract it. That includes:

- shared types / Zod schemas (put them in `src/lib`)
- ingestion adapter helpers (normalisers, dedup, schema builders)
- React UI primitives (extract a component once a JSX block is reused)

Avoid copy-pasted SQL, Prisma queries, or env-var lookups — wrap them in helpers.

### 1000-line file ceiling

**No tracked source file may exceed 1000 lines of code.** Applies to: `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.py`. Generated code, lockfiles, vendored deps, snapshots, and fixtures are excluded.

If a file is approaching the limit, decompose it into smaller, single-responsibility modules **before** you push past it. Do not work around the check — that defeats the purpose.

## Automated guardrail

The 1000-LOC ceiling is enforced automatically:

- **Local pre-commit hook** — `.husky/pre-commit` runs `npm run check:file-size` before lint and typecheck, blocking the commit on a violation.
- **CI** — `.github/workflows/ci.yml` runs the same check on every push and pull request.

### Run it locally

```bash
npm run check:file-size
```

The script (`scripts/check-file-size.mjs`) prints any tracked source file over the limit (largest first) and exits non-zero. Override the limit for an experiment with `MAX_LOC=1500 npm run check:file-size`.

### What to do when it trips

1. Identify the responsibilities packed into the offending file.
2. Extract them into focused modules (helpers, components, schemas, route handlers).
3. Re-run `npm run check:file-size` and the rest of the pre-commit chain.
4. If the legacy file is too large to decompose in this change, open a follow-up issue against `EVE-109` documenting the file and a decomposition plan — but do not merge with the violation in place.

## Adding or updating a scraper adapter

Adapters live under `src/lib/ingestion/adapters/` and implement the `SourceAdapter` interface from `@/types/event`. The patterns below are non-negotiable — they exist because we have already eaten the bug.

### 1. Probe for JSON-LD before writing a cheerio parser

Every scraper must call `extractJsonLdEvents` first and only fall back to HTML selectors when the JSON-LD path returns zero events. Sites add schema.org over time; this keeps adapters robust without code changes.

### 2. Pull the highest-resolution image the source exposes — never the listing thumbnail

Listing markup almost always emits a small thumbnail (often 300–480 px) even when the same CDN serves a 1280 px+ original at a predictable URL. Shipping the thumbnail as `imageUrl` makes event cards look bad on retina screens.

**Required workflow when adding/updating a scraper:**

1. **Find the URL the listing markup gives you.** It will usually have a width/height parameter, a query param like `?t=300x300`, a thumbnail filename suffix like `-650x366.jpg`, or a path segment like `/generated/480w-3-2/`.
2. **Probe higher-resolution variants** by hand (`curl -sIL <url>` and compare `content-length`):
   - Drop the thumbnail param entirely (e.g. `?t=300x300` → no `t=`).
   - Bump the width segment (e.g. `/480w-3-2/` → `/1280w-3-2/`).
   - Strip the WordPress `-WIDTHxHEIGHT` filename suffix.
   - Try the source's own detail page — what URL does the hero `<img>` use?
3. **Use or extend the helpers in `src/lib/ingestion/utils/scrape-helpers.ts`.** Existing helpers cover the common patterns:
   - `upgradeStylelabsImage` — Sitecore Stylelabs (`*.stylelabs.cloud`)
   - `upgradeHotaImage` — HOTA's `/generated/{width}w-{aspect}/` CDN
   - `upgradeWordpressThumbnail` — `name-WIDTHxHEIGHT.ext` thumbnails
   - `upgradeMoshtixImage` — Moshtix `xWxH` upload suffix

   Add a new helper if your source uses a different rewrite pattern. Keep it conservative — non-matching URLs must fall through unchanged so other adapters never regress.
4. **Unit-test the helper** in `scrape-helpers.test.ts` with at least: a happy-path rewrite, a no-op when the URL doesn't match, and `undefined` input.
5. **Verify the byte-size win** with `curl -sIL` against the live source before committing — note the before/after numbers in the PR/issue comment so reviewers can sanity-check.

If a source legitimately only exposes thumbnails (no larger variant anywhere), say so explicitly in the adapter's file-level comment and link the source check that proved it. Don't ship a thumbnail silently.

### 3. Skip recurring/undated cards rather than fabricating dates

If a card has no anchor date (e.g. "Saturday (Weekly)"), `return` from the iterator and let dedup/normalisation pick up dated rows from other sources. Never default to `new Date()` for an undated event — it pollutes the calendar.

### 4. Provide an env-var override for the source URL

Adapters must read `process.env.<SOURCE>_URL` with a sensible default. This lets us repoint at a proxy, mirror, or `localhost` test fixture without redeploying.

## Other expectations

- Run `npm run lint` and `npx tsc --noEmit` before pushing (the pre-commit hook does this for you).
- Add or update tests under the relevant `src/**/*.test.ts(x)` location for behavioural changes.
- Keep PRs focused — one logical change per PR.
