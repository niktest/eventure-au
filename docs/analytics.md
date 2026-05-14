# Festlio analytics handbook

Owner: CMO. Scope: outbound-click analytics for the Festlio web app.

## TL;DR

- **Source of truth**: a single Postgres table, `TicketClick`, in our Neon DB.
- **Captured**: every click on the "Get Tickets" CTA on an event detail page.
- **Surface**: SQL queries / Metabase-style dashboards built directly on the
  table. No third-party product-analytics tool.
- **PostHog was explicitly scrapped** under [EVE-224](https://linear.app/EVE/issue/EVE-224)
  — do not re-introduce a client SDK without re-opening that decision.

## How a click flows

```
TicketCTA onClick (src/components/TicketCTA.tsx)
  └─ navigator.sendBeacon("/api/analytics/ticket-click", { eventId, eventSlug, ticketUrl, source })
        └─ POST /api/analytics/ticket-click
             └─ prisma.ticketClick.create(...)
                  → 204 (or 200 with persisted:false if the DB write fails)
```

Hard constraint: the user's outbound navigation must always proceed. The
endpoint never throws; the CTA's `onClick` swallows every error. Telemetry is
best-effort by design.

## Schema (`TicketClick`)

| Column      | Type            | Notes                                                     |
| ----------- | --------------- | --------------------------------------------------------- |
| `id`        | `text` (cuid)   | Primary key                                               |
| `eventId`   | `text?`         | FK by convention to `Event.id`; nullable for safety       |
| `eventSlug` | `text`          | Always present; the join key when `eventId` is null/stale |
| `ticketUrl` | `text`          | Outbound partner URL we sent the user to                  |
| `source`    | `text`          | Where on the site the click came from (e.g. `event_detail`) |
| `userAgent` | `text?`         | Truncated request UA (no PII enrichment)                  |
| `referrer`  | `text?`         | `Referer` header at click time                            |
| `createdAt` | `timestamptz`   | Server clock                                              |

Indexes: `(eventId, createdAt)`, `(eventSlug, createdAt)`, `(createdAt)`.

## Starter dashboards (SQL)

All queries assume a 30-day window; adjust the interval to taste.

### 1. Outbound CTR per event (last 30 days)

How often the "Get Tickets" CTA gets clicked on each event's detail page,
relative to indexed events. (We don't track pageviews here — see *Pageview
gap* below — so this is "click volume per event", not literal CTR.)

```sql
SELECT
  e."slug",
  e."name",
  e."city",
  e."category",
  count(tc."id") AS clicks
FROM "Event" e
LEFT JOIN "TicketClick" tc
  ON tc."eventId" = e."id"
 AND tc."createdAt" >= NOW() - INTERVAL '30 days'
WHERE e."status" = 'published'
GROUP BY e."slug", e."name", e."city", e."category"
HAVING count(tc."id") > 0
ORDER BY clicks DESC
LIMIT 50;
```

### 2. Top partner sites by click volume

Which ticketing partners are pulling outbound traffic. Useful for affiliate
prioritisation later.

```sql
SELECT
  regexp_replace(tc."ticketUrl", '^https?://([^/]+).*$', '\1') AS host,
  count(*) AS clicks,
  count(DISTINCT tc."eventSlug") AS events
FROM "TicketClick" tc
WHERE tc."createdAt" >= NOW() - INTERVAL '30 days'
GROUP BY host
ORDER BY clicks DESC
LIMIT 20;
```

### 3. Daily click volume

Lightweight pulse chart — used to spot deploy/migration regressions early.

```sql
SELECT
  date_trunc('day', tc."createdAt") AS day,
  count(*) AS clicks
FROM "TicketClick" tc
WHERE tc."createdAt" >= NOW() - INTERVAL '30 days'
GROUP BY day
ORDER BY day ASC;
```

### 4. Clicks by city / category

Which markets convert. Drives editorial prioritisation as we expand beyond
Gold Coast / Brisbane.

```sql
SELECT
  e."city",
  e."category",
  count(tc."id") AS clicks
FROM "TicketClick" tc
JOIN "Event" e ON e."id" = tc."eventId"
WHERE tc."createdAt" >= NOW() - INTERVAL '30 days'
GROUP BY e."city", e."category"
ORDER BY clicks DESC;
```

## Pageview gap

We deliberately do not capture pageviews in this table — that would balloon
row counts and overlap with what Vercel Web Analytics already gives us for
free. Conversion-rate analyses (pageview → click) live in Vercel Analytics +
this table, joined by event slug + day.

## Privacy posture

- No cookies, no client SDK, no third-party network call from the user's
  browser. The only request the CTA fires is a same-origin beacon.
- We persist UA + Referer because both are already exposed to the partner
  domain the user is navigating to.
- We do **not** persist IP. If we ever need coarse geo, derive it from
  `Event.city` instead.
- Aligned with the privacy copy landed under EVE-216.

## Not in scope here

- PostHog or any third-party product-analytics SDK ([EVE-224](https://linear.app/EVE/issue/EVE-224)).
- `identify()` / signed-in user attribution.
- Affiliate revenue tracking (separate ticket once affiliate URLs land).
- A/B testing infrastructure.
