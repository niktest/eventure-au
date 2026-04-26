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

## Other expectations

- Run `npm run lint` and `npx tsc --noEmit` before pushing (the pre-commit hook does this for you).
- Add or update tests under the relevant `src/**/*.test.ts(x)` location for behavioural changes.
- Keep PRs focused — one logical change per PR.
