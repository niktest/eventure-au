import type { SourceAdapter, RawEvent } from "@/types/event";
import { AU_LOCATIONS, AU_SEARCH_RADIUS_KM } from "../au-locations";

const GRAPHQL_URL = "https://www.meetup.com/gql";

interface MeetupNode {
  id: string;
  title: string;
  description: string;
  dateTime: string;
  endTime: string | null;
  eventUrl: string;
  imageUrl: string | null;
  going: number;
  group: {
    name: string;
    urlname: string;
    city: string;
    state: string;
    country: string;
  };
  venue: {
    name: string;
    address: string;
    city: string;
    state: string;
    lat: number;
    lng: number;
  } | null;
  isFree: boolean;
  feeSettings: {
    amount: number;
    currency: string;
  } | null;
}

interface MeetupResponse {
  data?: {
    rankedEvents?: {
      edges: Array<{ node: MeetupNode }>;
      pageInfo: { hasNextPage: boolean; endCursor: string };
    };
  };
}

const SEARCH_QUERY = `
  query ($lat: Float!, $lon: Float!, $radius: Int!, $after: String) {
    rankedEvents(
      filter: {
        lat: $lat
        lon: $lon
        radius: $radius
        startDateRange: { start: "now" }
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
          imageUrl
          going
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
            lat
            lng
          }
          isFree
          feeSettings {
            amount
            currency
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
 * Meetup adapter using the public GraphQL API.
 * Searches all major AU cities. No API key required.
 */
export class MeetupAdapter implements SourceAdapter {
  readonly name = "meetup";

  async fetch(): Promise<RawEvent[]> {
    const allEvents: RawEvent[] = [];
    const seen = new Set<string>();

    for (const loc of AU_LOCATIONS) {
      console.log(`[meetup] Fetching ${loc.name} (${loc.state})...`);
      let after: string | null = null;
      let pages = 0;

      while (pages < 2) {
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
          const ranked = data.data?.rankedEvents;
          if (!ranked || ranked.edges.length === 0) break;

          for (const { node } of ranked.edges) {
            if (!seen.has(node.id)) {
              seen.add(node.id);
              allEvents.push(mapEvent(node, loc));
            }
          }

          if (!ranked.pageInfo.hasNextPage) break;
          after = ranked.pageInfo.endCursor;
          pages++;
        } catch (err) {
          console.error(`[meetup] Fetch error for ${loc.name}:`, err);
          break;
        }
      }
    }

    return allEvents;
  }
}

function mapEvent(node: MeetupNode, fallback: { name: string; state: string }): RawEvent {
  return {
    sourceId: node.id,
    name: node.title,
    description: node.description ?? undefined,
    startDate: new Date(node.dateTime),
    endDate: node.endTime ? new Date(node.endTime) : undefined,
    imageUrl: node.imageUrl ?? undefined,
    url: node.eventUrl,
    venueName: node.venue?.name ?? node.group.name,
    venueAddress: node.venue?.address ?? undefined,
    city: node.venue?.city ?? node.group.city ?? fallback.name,
    state: node.venue?.state ?? node.group.state ?? fallback.state,
    latitude: node.venue?.lat ?? undefined,
    longitude: node.venue?.lng ?? undefined,
    isFree: node.isFree,
    priceMin: node.feeSettings?.amount ?? undefined,
    ticketUrl: node.eventUrl,
    ticketProvider: "meetup",
    rawData: node,
  };
}
