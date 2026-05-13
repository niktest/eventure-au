"use client";

import { eventSourceMeta } from "@/lib/events/eventSources";

export type TicketCTAVariant = "detail" | "compact" | "mobile-sticky";

type TicketCTAProps = {
  eventId: string;
  source: string | null | undefined;
  // Preferred outbound URL — ticket purchase if we have one, otherwise the
  // event/info page on the source site. Falls back to `null` (handled).
  ticketUrl: string | null | undefined;
  // Event website / info link, used when ticketUrl is missing (e.g. free
  // community markets that don't sell tickets).
  infoUrl?: string | null | undefined;
  // Used to wording-switch to "Free — More info" rather than "Get tickets".
  isFree?: boolean;
  variant?: TicketCTAVariant;
};

function trackClick(eventId: string, source: string | null | undefined, url: string) {
  // Fire-and-forget telemetry. We don't have a first-class analytics surface
  // yet (see follow-up issue) so this just posts to a server endpoint that
  // logs to stdout — visible in Vercel logs. The client event lets any future
  // analytics package (PostHog/Plausible/etc.) listen without re-touching CTAs.
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("festlio:ticket-click", {
          detail: { eventId, source: source ?? null, url },
        }),
      );
    }
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob(
        [JSON.stringify({ eventId, source: source ?? null, url })],
        { type: "application/json" },
      );
      navigator.sendBeacon("/api/analytics/ticket-click", blob);
    } else if (typeof fetch !== "undefined") {
      void fetch("/api/analytics/ticket-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, source: source ?? null, url }),
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Telemetry must never break the outbound click.
  }
}

export function TicketCTA({
  eventId,
  source,
  ticketUrl,
  infoUrl,
  isFree = false,
  variant = "detail",
}: TicketCTAProps) {
  const meta = eventSourceMeta(source);
  const outboundUrl = ticketUrl || infoUrl || null;
  // "Free / no tickets" path: no ticketUrl but we still want to send the user
  // somewhere useful (the source listing). If there's literally no link at
  // all, fall back to a quiet attribution-only render — better than a dead CTA.
  const hasTickets = Boolean(ticketUrl);
  const ctaLabel = hasTickets ? "Get tickets" : isFree ? "More info" : "More info";
  const ctaIcon = hasTickets ? "confirmation_number" : "open_in_new";

  const onClick = () => {
    if (!outboundUrl) return;
    trackClick(eventId, source, outboundUrl);
  };

  if (variant === "mobile-sticky") {
    if (!outboundUrl) return null;
    return (
      <a
        href={outboundUrl}
        target="_blank"
        rel="noopener nofollow"
        onClick={onClick}
        data-testid="ticket-cta-mobile"
        className="flex-1 bg-primary-container text-on-primary rounded-full py-3 font-heading text-base font-bold shadow flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined text-[18px]">{ctaIcon}</span>
        {ctaLabel}
      </a>
    );
  }

  if (variant === "compact") {
    // Card-sized form: just the provenance line. Cards are clickable as a
    // whole and route to the detail page, so we don't render a second
    // outbound link here — that would create a nested-anchor footgun.
    if (!meta) return null;
    return (
      <span className="inline-flex items-center gap-1 text-xs font-body text-on-surface-variant">
        <span className="material-symbols-outlined text-[14px] leading-none">
          confirmation_number
        </span>
        <span className="truncate">via {meta.label}</span>
      </span>
    );
  }

  if (!outboundUrl) {
    // No actionable link — fall back to attribution only so the user at least
    // knows where the listing came from.
    if (!meta) return null;
    return (
      <p className="text-xs font-body text-on-surface-variant">
        Listed via{" "}
        <span className="font-semibold text-secondary">{meta.label}</span>
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <a
        href={outboundUrl}
        target="_blank"
        // nofollow + noopener: per EVE-212 we don't pass link equity to
        // aggregators (their listings often duplicate ours), and noopener
        // prevents the destination from accessing window.opener.
        rel="noopener nofollow"
        onClick={onClick}
        data-testid="ticket-cta"
        data-event-id={eventId}
        data-source={source ?? ""}
        className="w-full bg-primary-container text-on-primary rounded-full py-4 font-heading text-lg font-bold shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined text-[20px]">{ctaIcon}</span>
        {ctaLabel}
      </a>
      {meta && (
        <p className="text-xs font-body text-on-surface-variant text-center">
          {hasTickets ? "Tickets via" : "Listed via"}{" "}
          <span className="font-semibold text-secondary">{meta.label}</span>
        </p>
      )}
    </div>
  );
}
