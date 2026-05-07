import type { EventCategory, RawEvent } from "@/types/event";

export interface JsonLdEventDefaults {
  sourceIdPrefix: string;
  venueName?: string;
  venueAddress?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  category?: EventCategory;
}

interface JsonLdImage {
  url?: string;
  "@id"?: string;
}

interface JsonLdLocation {
  name?: string;
  address?: string | { streetAddress?: string };
}

interface JsonLdEvent {
  "@type"?: string | string[];
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  image?: string | string[] | JsonLdImage | JsonLdImage[];
  url?: string;
  location?: JsonLdLocation | JsonLdLocation[];
}

const JSON_LD_BLOCK = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function isEventType(type: unknown): boolean {
  if (typeof type === "string") return type === "Event" || type.endsWith("Event");
  if (Array.isArray(type)) return type.some(isEventType);
  return false;
}

function flattenGraph(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed.flatMap(flattenGraph);
  if (parsed && typeof parsed === "object") {
    const obj = parsed as { "@graph"?: unknown };
    if (Array.isArray(obj["@graph"])) return obj["@graph"].flatMap(flattenGraph);
    return [parsed];
  }
  return [];
}

function pickImage(image: JsonLdEvent["image"]): string | undefined {
  if (!image) return undefined;
  if (typeof image === "string") return image;
  if (Array.isArray(image)) {
    const first = image[0];
    if (!first) return undefined;
    return typeof first === "string" ? first : first.url ?? first["@id"];
  }
  return image.url ?? image["@id"];
}

function pickLocation(location: JsonLdEvent["location"]): JsonLdLocation | undefined {
  if (!location) return undefined;
  return Array.isArray(location) ? location[0] : location;
}

function pickAddress(loc: JsonLdLocation | undefined): string | undefined {
  if (!loc?.address) return undefined;
  return typeof loc.address === "string" ? loc.address : loc.address.streetAddress;
}

export function extractJsonLdEvents(html: string, defaults: JsonLdEventDefaults): RawEvent[] {
  const events: RawEvent[] = [];

  for (const match of html.matchAll(JSON_LD_BLOCK)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(match[1]);
    } catch {
      continue;
    }

    for (const node of flattenGraph(parsed)) {
      const item = node as JsonLdEvent;
      if (!isEventType(item["@type"])) continue;
      if (!item.name || !item.startDate) continue;

      const location = pickLocation(item.location);
      const slugSeed = item.name.replace(/\s+/g, "-").toLowerCase();

      events.push({
        sourceId: item.url ?? `${defaults.sourceIdPrefix}-${slugSeed}`,
        name: item.name,
        description: item.description,
        startDate: new Date(item.startDate),
        endDate: item.endDate ? new Date(item.endDate) : undefined,
        imageUrl: pickImage(item.image),
        url: item.url,
        venueName: location?.name ?? defaults.venueName,
        venueAddress: pickAddress(location) ?? defaults.venueAddress,
        city: defaults.city,
        state: defaults.state,
        latitude: defaults.latitude,
        longitude: defaults.longitude,
        category: defaults.category,
        rawData: item,
      });
    }
  }

  return events;
}
