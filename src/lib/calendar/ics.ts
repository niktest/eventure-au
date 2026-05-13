import type { Event } from "@/types/event";

export type IcsEventInput = Pick<
  Event,
  | "id"
  | "slug"
  | "name"
  | "description"
  | "startDate"
  | "endDate"
  | "venueName"
  | "venueAddress"
  | "city"
  | "state"
  | "country"
  | "latitude"
  | "longitude"
  | "url"
  | "ticketUrl"
  | "updatedAt"
>;

const CRLF = "\r\n";

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\n|\r/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function formatUtc(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  );
}

// RFC 5545 §3.1: content lines must be folded at 75 octets. We split on
// character boundaries (good enough for the ASCII-heavy text we emit).
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (i === 0) {
      chunks.push(line.slice(0, 75));
      i = 75;
    } else {
      chunks.push(" " + line.slice(i, i + 74));
      i += 74;
    }
  }
  return chunks.join(CRLF);
}

export function buildIcs(event: IcsEventInput, siteUrl: string): string {
  const start = new Date(event.startDate);
  // Spec requires DTEND or DURATION; default to +2h when the source omits an
  // end time so the event renders as a block rather than a zero-length point.
  const end = event.endDate
    ? new Date(event.endDate)
    : new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const dtstamp = formatUtc(new Date(event.updatedAt ?? new Date()));
  const uid = `${event.id}@${new URL(siteUrl).host}`;
  const canonicalUrl = `${siteUrl}/events/${event.slug}`;

  const locationParts = [
    event.venueName,
    event.venueAddress,
    event.city,
    event.state,
    event.country,
  ].filter((part): part is string => Boolean(part && part.length > 0));
  const location = locationParts.join(", ");

  const description = [
    event.description?.trim(),
    canonicalUrl,
  ]
    .filter(Boolean)
    .join("\n\n");

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Festlio//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${formatUtc(start)}`,
    `DTEND:${formatUtc(end)}`,
    `SUMMARY:${escapeText(event.name)}`,
  ];

  if (description) {
    lines.push(`DESCRIPTION:${escapeText(description)}`);
  }
  if (location) {
    lines.push(`LOCATION:${escapeText(location)}`);
  }
  if (event.latitude != null && event.longitude != null) {
    lines.push(`GEO:${event.latitude};${event.longitude}`);
  }
  const urlForCalendar = event.ticketUrl ?? event.url ?? canonicalUrl;
  lines.push(`URL:${urlForCalendar}`);
  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.map(foldLine).join(CRLF) + CRLF;
}

// Google Calendar "create" URL — opens a pre-filled event composer in the
// user's logged-in calendar without the user downloading a file first.
export function googleCalendarUrl(event: IcsEventInput, siteUrl: string): string {
  const start = new Date(event.startDate);
  const end = event.endDate
    ? new Date(event.endDate)
    : new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const dates = `${formatUtc(start).replace(/\.\d+/, "")}/${formatUtc(end).replace(/\.\d+/, "")}`;
  const location = [
    event.venueName,
    event.venueAddress,
    event.city,
    event.state,
    event.country,
  ].filter(Boolean).join(", ");
  const canonical = `${siteUrl}/events/${event.slug}`;
  const details = [event.description?.trim(), canonical].filter(Boolean).join("\n\n");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.name,
    dates,
    details,
    location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Outlook web (live.com) compose URL. Works for personal Microsoft accounts.
export function outlookCalendarUrl(event: IcsEventInput, siteUrl: string): string {
  const start = new Date(event.startDate);
  const end = event.endDate
    ? new Date(event.endDate)
    : new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const location = [
    event.venueName,
    event.venueAddress,
    event.city,
    event.state,
    event.country,
  ].filter(Boolean).join(", ");
  const canonical = `${siteUrl}/events/${event.slug}`;
  const body = [event.description?.trim(), canonical].filter(Boolean).join("\n\n");
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.name,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body,
    location,
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
