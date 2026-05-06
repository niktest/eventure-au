// Public-facing contact endpoints. Mailbox provider hasn't been picked
// yet — these resolve via forwards on festlio.com until the inbox lands.
// If a role address isn't ready yet, point UI at `general`.
export const CONTACT_EMAILS = {
  general: "hello@festlio.com",
  partners: "partners@festlio.com",
  privacy: "privacy@festlio.com",
  legal: "legal@festlio.com",
  press: "press@festlio.com",
} as const;

// Structured form keeps us polite-scraping-compliant: name/version + a
// reachable contact email so source operators can reach us if a crawl
// misbehaves.
export const SCRAPER_USER_AGENT =
  "Festlio/1.0 (events aggregator; contact@festlio.com)";
