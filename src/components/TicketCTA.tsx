"use client";

// TicketCTA (EVE-217 redo). The ONLY new client boundary on the event detail
// page. Wraps the existing outbound-ticket anchor and fires a fire-and-forget
// beacon to /api/analytics/ticket-click before letting the browser navigate.
//
// Hard requirement: the user's navigation must always proceed. Every beacon
// branch is wrapped so a network/CSP/parse failure cannot block the click.

type Props = {
  eventId: string;
  eventSlug: string;
  ticketUrl: string;
  source: string;
  className: string;
  children: React.ReactNode;
};

export function TicketCTA({
  eventId,
  eventSlug,
  ticketUrl,
  source,
  className,
  children,
}: Props) {
  const handleClick = () => {
    try {
      const payload = JSON.stringify({ eventId, eventSlug, ticketUrl, source });
      const url = "/api/analytics/ticket-click";
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.sendBeacon === "function"
      ) {
        navigator.sendBeacon(
          url,
          new Blob([payload], { type: "application/json" }),
        );
      } else if (typeof fetch !== "undefined") {
        void fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Telemetry must never block outbound navigation.
    }
  };

  return (
    <a
      href={ticketUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={className}
    >
      {children}
    </a>
  );
}
