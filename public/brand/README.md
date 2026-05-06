# Festlio brand assets — EVE-135

Visual identity for **Festlio** (formerly Eventure). Public form: *"Festlio
Events & Entertainment"*. Pronunciation: FEST-lee-oh.

The identity is a **typographic wordmark** — Plus Jakarta Sans ExtraBold with
a custom-tuned lowercase `i` whose dot is replaced by a four-point sparkle in
the brand neon-coral → neon-magenta gradient. The sparkle doubles as a
secondary mark across the system (favicon corner, OG card, social templates).

All wordmark and lockup files have their letterforms outlined as paths so
they render identically without depending on Plus Jakarta Sans being
available.

## Tokens

Built on the existing **neon theme** (see `src/app/globals.css`):

| Role         | Token                       | Hex       |
|--------------|-----------------------------|-----------|
| Brand grad A | `--color-neon-coral`        | `#FF5A36` |
| Brand grad B | `--color-neon-magenta`      | `#FF3FA4` |
| Ink (light)  | `--color-on-surface`        | `#0B1C30` |
| Ink (dark)   | `--color-on-dark-strong`    | `#F4F6FB` |
| Surface 0    | `--color-surface-0`         | `#0B0D12` |

The brand gradient itself is `--gradient-neon-cta`
(`linear-gradient(90deg, #FF5A36 0%, #FF3FA4 100%)`).

## Files

### Wordmark (in `public/brand/`)

| File | Use |
|------|-----|
| `festlio-wordmark.svg` | **Primary.** Dark ink + gradient sparkle, on light backgrounds (≥ #F8F9FF). |
| `festlio-wordmark-light.svg` | White ink + gradient sparkle, on dark / brand-coloured backgrounds. |
| `festlio-wordmark-mono-dark.svg` | Single-colour dark — embossing, fax/print, single-tone partner placements. |
| `festlio-wordmark-mono-light.svg` | Single-colour white — same role on dark surfaces. |
| `festlio-lockup.svg` | Wordmark + `EVENTS & ENTERTAINMENT` tagline, dark ink. Use sparingly (footer, About, decks). |
| `festlio-lockup-light.svg` | Lockup, white ink. |

### Mark / monogram (in `public/brand/`)

| File | Use |
|------|-----|
| `festlio-mark.svg` | **Primary mark.** White `F` + sparkle on a rounded-square gradient tile. Avatars, app icons, social profile pictures. |
| `festlio-mark-no-tile.svg` | White `F` + gradient sparkle, transparent background — drop on any branded surface. |
| `festlio-mark-mono-dark.svg` | Flat dark `F`, no tile. |
| `festlio-mark-mono-light.svg` | Flat white `F`, no tile. |

### Favicons (in `public/`)

CTO can drop these straight into `public/`:

| File | Size / role |
|------|-------------|
| `favicon.ico` | Multi-resolution ICO (16, 32, 48). Uses the **simplified mark** (no sparkle) for clarity at small sizes. |
| `favicon.svg` | Modern browsers (`rel="icon" type="image/svg+xml"`). Simplified mark. |
| `apple-touch-icon.png` | 180×180. Full mark with sparkle. |
| `icon-192.png` | 192×192 PWA / OG fallback. Full mark. |
| `icon-512.png` | 512×512 PWA. Full mark. |

### Open Graph / social card (in `public/`)

| File | Size |
|------|------|
| `og-image.png` | 1200×630. Default share card. Used by `<meta property="og:image">` and Twitter `summary_large_image`. |
| `brand/og-card.svg` | Editable source if you want a per-page or alt variant later. |

### Previews (in `public/brand/`)

`preview-wordmark-light-bg.png`, `preview-wordmark-dark-bg.png`,
`preview-marks.png` — review-only renders, do not ship.

## Suggested wiring (for CTO, EVE-133)

```tsx
// app/layout.tsx → metadata.icons
icons: {
  icon: [
    { url: '/favicon.ico', sizes: 'any' },
    { url: '/favicon.svg', type: 'image/svg+xml' },
    { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
  ],
  apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
},
openGraph: {
  images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Festlio — Find what’s on near you.' }],
},
twitter: { card: 'summary_large_image', images: ['/og-image.png'] },
```

For the in-app wordmark (header, footer), prefer the SVG at intrinsic size:

```tsx
<Image src="/brand/festlio-wordmark.svg" alt="Festlio" width={140} height={42} priority />
// On dark surfaces (footer, hero):
<Image src="/brand/festlio-wordmark-light.svg" alt="Festlio" width={140} height={42} />
```

## Clear space & minimum size

- **Clear space**: at least the height of the lowercase `e` (~50% of cap
  height) on every side of the wordmark.
- **Minimum size**: wordmark at 88px wide; mark at 24px square (16/32px uses
  the simplified favicon variant).

## Don'ts

- Don't rotate, italicise, or skew the wordmark.
- Don't recolour the sparkle in non-brand colours; if a single-colour
  treatment is required use `*-mono-dark.svg` / `*-mono-light.svg`.
- Don't pair the wordmark with another sparkle/star icon directly adjacent —
  the dot on the `i` is the brand sparkle.
- Don't tint the gradient tile or change the rounded-corner radius on the
  mark.

## Brand audit (neon theme — light, ≤30 min)

Looked at the tokens in `src/app/globals.css`. The wordmark slots into the
existing neon theme without conflict, with two small notes for CTO:

1. **`--color-coral` legacy alias collides with the new brand gradient.**
   `--color-coral` is `#b8551d` (a Material 3 burnt-orange) — a leftover from
   the pre-neon system. The new brand gradient uses `--color-neon-coral`
   (`#FF5A36`), which is a more saturated coral. Both still exist; that's
   fine for backwards compatibility, but **header/footer/CTA components
   should pick `--color-neon-coral`**, not `--color-coral`, so the brand
   reads consistently. If anything still references `--color-coral` /
   `--color-coral-dark` for primary CTAs, swap it.

2. **`--color-primary: #a43c12`** (Material 3 burnt-orange) is no longer
   doing brand work, but it's still wired into surface tints
   (`--color-surface-tint`) and the legacy `.btn-glow` keyframes (lines
   206–208 of `globals.css`). Not urgent — those are decorative — but in
   future cleanup, retiring the burnt-orange in favour of the neon-coral /
   neon-magenta gradient would tighten the palette.

Otherwise the typography system (Plus Jakarta Sans + Inter), dark surfaces
(`--color-surface-0..3`), and shadow stack are a perfect fit for the
identity — no changes needed there.

## Approval status

- Drafted: 2026-05-06
- Awaiting: board sign-off via CEO (preview comment posted on EVE-135)
- Coordinating with: CMO on [EVE-134](/EVE/issues/EVE-134) — brand voice
  doc. If voice direction shifts noticeably (e.g. "weird & playful" vs
  "premium & confident"), the wordmark may need tightening.
