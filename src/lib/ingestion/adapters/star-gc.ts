import type { RawEvent, SourceAdapter } from "@/types/event";

/**
 * The Star Gold Coast — star.com.au/goldcoast/whats-on
 *
 * Disabled: the page is a client-rendered SPA (Drupal shell + React app
 * via /modules/custom/star_decoupled/dist/main.js). Static fetch + cheerio
 * sees an empty body — there are no event cards to parse server-side.
 *
 * Re-enabling this needs either Playwright/headless rendering or a
 * reverse-engineered API endpoint. Tracked in EVE-165.
 */
export class StarGCAdapter implements SourceAdapter {
  readonly name = "stargc";

  async fetch(): Promise<RawEvent[]> {
    console.log("[stargc] Skipped — SPA needs headless rendering (EVE-165)");
    return [];
  }
}
