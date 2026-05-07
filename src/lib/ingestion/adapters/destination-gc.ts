import type { RawEvent, SourceAdapter } from "@/types/event";

/**
 * Destination Gold Coast — destinationgoldcoast.com/things-to-do/events
 *
 * Disabled: Destination Gold Coast retired their consumer site. The
 * canonical replacement (experiencegoldcoast.com/things-to-do/events) also
 * 404s today, and the org's public events surface is now the regional
 * What's On Gold Coast feed which the cityofgc adapter already covers.
 *
 * Tracked in EVE-167 — re-enable if/when an Experience Gold Coast events
 * page comes online with parseable structure (or JSON-LD).
 */
export class DestinationGCAdapter implements SourceAdapter {
  readonly name = "destinationgc";

  async fetch(): Promise<RawEvent[]> {
    console.log("[destinationgc] Skipped — source site retired (EVE-167)");
    return [];
  }
}
