/**
 * One-shot backfill for EVE-141 / EVE-144.
 *
 * Re-normalises event rows whose `name`, `description`, `venueName`,
 * `venueAddress`, `city`, or `state` was stored with HTML entities
 * (e.g. `&#39;THE MISSING&#39;` → `'THE MISSING'`,
 * `Brunswick Artists&#39; Bar` → `Brunswick Artists' Bar`), or whose
 * `imageUrl` is still `http://` (Next.js Image rejects non-https
 * sources). Also regenerates the slug so it matches the cleaned title.
 *
 * Run via: `npm run backfill:eve-141` against production.
 */
import { prisma } from "@/lib/prisma";
import { cleanTitle, decodeHtmlEntities } from "@/lib/ingestion/normaliser";

function slugify(text: string): string {
  return cleanTitle(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function rebuildSlug(name: string, sourceId: string): string {
  const base = slugify(name);
  const suffix = sourceId.slice(0, 8).replace(/[^a-z0-9]/gi, "").toLowerCase();
  return base ? `${base}-${suffix}` : suffix;
}

function cleanShortField(raw: string | null): string | null {
  if (raw == null) return null;
  const out = decodeHtmlEntities(raw).replace(/\s+/g, " ").trim();
  return out.length ? out : null;
}

async function main() {
  console.log("[backfill EVE-141] scanning events…");

  const candidates = await prisma.event.findMany({
    where: {
      OR: [
        { name: { contains: "&" } },
        { name: { contains: "http" } },
        { description: { contains: "&" } },
        { venueName: { contains: "&" } },
        { venueAddress: { contains: "&" } },
        { city: { contains: "&" } },
        { state: { contains: "&" } },
        { imageUrl: { startsWith: "http://" } },
        { slug: { contains: "https" } },
      ],
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      imageUrl: true,
      venueName: true,
      venueAddress: true,
      city: true,
      state: true,
      sourceId: true,
    },
  });

  console.log(`[backfill EVE-141] ${candidates.length} candidate row(s)`);

  let fixed = 0;
  for (const ev of candidates) {
    const cleanedName = cleanTitle(ev.name);
    const cleanedDescription = ev.description
      ? decodeHtmlEntities(ev.description).replace(/\s+/g, " ").trim()
      : null;
    const cleanedImage = ev.imageUrl
      ? ev.imageUrl.replace(/^http:\/\//i, "https://")
      : null;
    const cleanedVenueName = cleanShortField(ev.venueName);
    const cleanedVenueAddress = cleanShortField(ev.venueAddress);
    const cleanedCity = cleanShortField(ev.city) ?? ev.city;
    const cleanedState = cleanShortField(ev.state) ?? ev.state;
    const newSlug = rebuildSlug(cleanedName, ev.sourceId);

    const nameChanged = cleanedName !== ev.name;
    const descriptionChanged = cleanedDescription !== ev.description;
    const imageChanged = cleanedImage !== ev.imageUrl;
    const venueNameChanged = cleanedVenueName !== ev.venueName;
    const venueAddressChanged = cleanedVenueAddress !== ev.venueAddress;
    const cityChanged = cleanedCity !== ev.city;
    const stateChanged = cleanedState !== ev.state;
    const slugChanged = newSlug !== ev.slug;

    if (
      !nameChanged &&
      !descriptionChanged &&
      !imageChanged &&
      !venueNameChanged &&
      !venueAddressChanged &&
      !cityChanged &&
      !stateChanged &&
      !slugChanged
    )
      continue;

    // Slug uniqueness — append numeric suffix on conflict.
    let finalSlug = newSlug;
    if (slugChanged) {
      let n = 1;
      while (
        await prisma.event.findFirst({
          where: { slug: finalSlug, NOT: { id: ev.id } },
          select: { id: true },
        })
      ) {
        finalSlug = `${newSlug}-${++n}`;
      }
    }

    await prisma.event.update({
      where: { id: ev.id },
      data: {
        name: cleanedName,
        description: cleanedDescription,
        imageUrl: cleanedImage,
        venueName: cleanedVenueName,
        venueAddress: cleanedVenueAddress,
        city: cleanedCity,
        state: cleanedState,
        slug: finalSlug,
      },
    });

    fixed++;
    if (fixed <= 10 || fixed % 50 === 0) {
      console.log(
        `[backfill EVE-141] fixed id=${ev.id}` +
          (nameChanged ? ` name` : "") +
          (slugChanged ? ` slug` : "") +
          (imageChanged ? ` image` : "") +
          (descriptionChanged ? ` desc` : "") +
          (venueNameChanged ? ` venueName` : "") +
          (venueAddressChanged ? ` venueAddr` : "") +
          (cityChanged ? ` city` : "") +
          (stateChanged ? ` state` : ""),
      );
    }
  }

  console.log(`[backfill EVE-141] done. fixed=${fixed} of ${candidates.length}`);
}

main()
  .catch((err) => {
    console.error("[backfill EVE-141] fatal", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
