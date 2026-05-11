import type { SourceAdapter, RawEvent } from "@/types/event";
import { AU_LOCATIONS, AU_SEARCH_RADIUS_KM } from "../au-locations";

const GRAPHQL_URL = "https://api.meetup.com/gql-ext";

interface MeetupPhoto {
  highResUrl?: string | null;
  baseUrl?: string | null;
}

interface MeetupNode {
  id: string;
  title: string;
  description: string;
  dateTime: string;
  endTime: string | null;
  eventUrl: string;
  eventType: string | null;
  displayPhoto: MeetupPhoto | null;
  featuredEventPhoto: MeetupPhoto | null;
  feeSettings: {
    accepts: string | null;
    amount: number | null;
    currency: string | null;
  } | null;
  group: {
    name: string;
    urlname: string;
    city: string;
    state: string;
    country: string;
  } | null;
  venue: {
    name: string;
    address: string;
    city: string;
    state: string;
    country: string;
    lat: number;
    lng: number;
  } | null;
}

interface MeetupResponse {
  data?: {
    recommendedEvents?: {
      edges: Array<{ node: MeetupNode }>;
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  };
  errors?: Array<{ message: string }>;
}

const SEARCH_QUERY = `
  query ($lat: Float!, $lon: Float!, $radius: Float!, $after: String) {
    recommendedEvents(
      filter: {
        lat: $lat
        lon: $lon
        radius: $radius
        eventType: PHYSICAL
      }
      first: 50
      after: $after
    ) {
      edges {
        node {
          id
          title
          description
          dateTime
          endTime
          eventUrl
          eventType
          displayPhoto { highResUrl baseUrl }
          featuredEventPhoto { highResUrl baseUrl }
          feeSettings { accepts amount currency }
          group {
            name
            urlname
            city
            state
            country
          }
          venue {
            name
            address
            city
            state
            country
            lat
            lng
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

/**
 * Meetup adapter using the public Meetup GraphQL API (api.meetup.com/gql-ext).
 * Uses `recommendedEvents` — Meetup retired `rankedEvents` and the
 * www.meetup.com/gql endpoint, so the old query 404s.
 * Searches all major AU cities. No API key required.
 */
export class MeetupAdapter implements SourceAdapter {
  readonly name = "meetup";

  async fetch(): Promise<RawEvent[]> {
    const allEvents: RawEvent[] = [];
    const seen = new Set<string>();

    // 50/page; cap protects against runaway pagination loops.
    const MAX_PAGES_PER_CITY = 20;

    for (const loc of AU_LOCATIONS) {
      console.log(`[meetup] Fetching ${loc.name} (${loc.state})...`);
      let after: string | null = null;
      let pages = 0;
      let cityCount = 0;

      while (pages < MAX_PAGES_PER_CITY) {
        try {
          const res = await fetch(GRAPHQL_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: SEARCH_QUERY,
              variables: {
                lat: loc.lat,
                lon: loc.lon,
                radius: AU_SEARCH_RADIUS_KM,
                after,
              },
            }),
          });

          if (!res.ok) {
            console.error(`[meetup] API error ${res.status} for ${loc.name}: ${await res.text()}`);
            break;
          }

          const data: MeetupResponse = await res.json();
          if (data.errors?.length) {
            console.error(`[meetup] GraphQL errors for ${loc.name}:`, data.errors);
            break;
          }
          const conn = data.data?.recommendedEvents;
          if (!conn || conn.edges.length === 0) break;

          for (const { node } of conn.edges) {
            if (!seen.has(node.id)) {
              seen.add(node.id);
              allEvents.push(mapEvent(node, loc));
              cityCount++;
            }
          }

          if (!conn.pageInfo.hasNextPage || !conn.pageInfo.endCursor) break;
          after = conn.pageInfo.endCursor;
          pages++;
        } catch (err) {
          console.error(`[meetup] Fetch error for ${loc.name}:`, err);
          break;
        }
      }
      console.log(`[meetup]   -> ${loc.name}: +${cityCount} (total=${allEvents.length})`);
    }

    return allEvents;
  }
}

function pickPhoto(node: MeetupNode): string | undefined {
  return (
    node.featuredEventPhoto?.highResUrl ??
    node.featuredEventPhoto?.baseUrl ??
    node.displayPhoto?.highResUrl ??
    node.displayPhoto?.baseUrl ??
    undefined
  );
}

function mapEvent(node: MeetupNode, fallback: { name: string; state: string }): RawEvent {
  const fee = node.feeSettings;
  const isPaid = fee != null && fee.amount != null && fee.amount > 0;

  return {
    sourceId: node.id,
    name: node.title,
    description: node.description ?? undefined,
    startDate: new Date(node.dateTime),
    endDate: node.endTime ? new Date(node.endTime) : undefined,
    imageUrl: pickPhoto(node),
    url: node.eventUrl,
    venueName: node.venue?.name ?? node.group?.name,
    venueAddress: node.venue?.address ?? undefined,
    city: node.venue?.city ?? node.group?.city ?? fallback.name,
    state: node.venue?.state ?? node.group?.state ?? fallback.state,
    latitude: node.venue?.lat ?? undefined,
    longitude: node.venue?.lng ?? undefined,
    isFree: !isPaid,
    priceMin: isPaid ? (fee?.amount ?? undefined) : undefined,
    ticketUrl: node.eventUrl,
    ticketProvider: "meetup",
    rawData: node,
  };
}
