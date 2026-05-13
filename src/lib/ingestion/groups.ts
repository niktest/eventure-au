import type { SourceAdapter } from "@/types/event";

import { EventbriteAdapter } from "./adapters/eventbrite";
import { TicketmasterAdapter } from "./adapters/ticketmaster";
import { MeetupAdapter } from "./adapters/meetup";
import { BandsintownAdapter } from "./adapters/bandsintown";
import { EventfindaAdapter } from "./adapters/eventfinda";
import { StickyTicketsAdapter } from "./adapters/sticky-tickets";

import { DestinationGCAdapter } from "./adapters/destination-gc";
import { CityOfGCAdapter } from "./adapters/city-of-gc";
import { HOTAAdapter } from "./adapters/hota";
import { StarGCAdapter } from "./adapters/star-gc";
import { MiamiMarkettaAdapter } from "./adapters/miami-marketta";
import { SandstonePointAdapter } from "./adapters/sandstone-point";
import { VisitBrisbaneAdapter } from "./adapters/visit-brisbane";

import { HumanitixAdapter } from "./adapters/humanitix";
import { TryBookingAdapter } from "./adapters/trybooking";
import { OztixAdapter } from "./adapters/oztix";
import { MegatixAdapter } from "./adapters/megatix";
import { MoshtixAdapter } from "./adapters/moshtix";

/**
 * Adapter groups, scheduled as separate cron endpoints so each stays under
 * Vercel's 300s function limit. See `vercel.json` for schedules.
 *
 * - `api`: fast JSON APIs (excluding Ticketmaster).
 * - `ticketmaster`: isolated because a full paginated run plus dedup dominates
 *   wall-clock (~3500 events).
 * - `scrapers-venue`: light venue/destination scrapers (Gold Coast + Brisbane).
 * - `humanitix` / `oztix`: each ~2.7k events; isolated for the same reason as
 *   `ticketmaster` and `moshtix`.
 * - `scrapers-platform-small`: the remaining smaller platform scrapers.
 * - `moshtix`: isolated because a full paginated run dominates wall-clock
 *   (~1700 events, ~80s of fetches before dedup).
 */
export const ADAPTER_GROUPS = {
  api: (): SourceAdapter[] => [
    new EventbriteAdapter(),
    new MeetupAdapter(),
    new BandsintownAdapter(),
    new EventfindaAdapter(),
    new StickyTicketsAdapter(),
  ],
  ticketmaster: (): SourceAdapter[] => [new TicketmasterAdapter()],
  "scrapers-venue": (): SourceAdapter[] => [
    new DestinationGCAdapter(),
    new CityOfGCAdapter(),
    new HOTAAdapter(),
    new StarGCAdapter(),
    new MiamiMarkettaAdapter(),
    new SandstonePointAdapter(),
    new VisitBrisbaneAdapter(),
  ],
  humanitix: (): SourceAdapter[] => [new HumanitixAdapter()],
  oztix: (): SourceAdapter[] => [new OztixAdapter()],
  "scrapers-platform-small": (): SourceAdapter[] => [
    new TryBookingAdapter(),
    new MegatixAdapter(),
  ],
  moshtix: (): SourceAdapter[] => [new MoshtixAdapter()],
} as const satisfies Record<string, () => SourceAdapter[]>;

export type AdapterGroup = keyof typeof ADAPTER_GROUPS;

export function isAdapterGroup(value: string): value is AdapterGroup {
  return Object.hasOwn(ADAPTER_GROUPS, value);
}
