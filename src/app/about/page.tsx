import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Eventure",
  description:
    "Eventure aggregates events happening near you — live music, festivals, markets, sports, family activities, and more. Starting on the Gold Coast, expanding Australia-wide.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-4xl font-bold">About Eventure</h1>

      <div className="space-y-6 text-gray-700 leading-relaxed">
        <p>
          Eventure is Australia&apos;s events and entertainment aggregator. We
          scan and curate events happening near you — live music, festivals,
          markets, sports, family fun, nightlife, food and drink, arts, comedy,
          theatre, outdoor adventures, and community gatherings — all in one
          place.
        </p>

        <h2 className="text-2xl font-semibold text-gray-900">Our Mission</h2>
        <p>
          We believe discovering what&apos;s happening near you shouldn&apos;t
          require checking a dozen different websites. Eventure brings together
          events from ticketing platforms, venue websites, tourism boards, and
          community calendars so you never miss out.
        </p>

        <h2 className="text-2xl font-semibold text-gray-900">
          Starting on the Gold Coast
        </h2>
        <p>
          We&apos;re launching right here on the Gold Coast — one of
          Australia&apos;s most vibrant regions for events and entertainment.
          From the Sunday markets at Marina Mirage to live gigs at Burleigh
          Pavilion, from HOTA exhibitions to the big shows at The Star — we
          cover it all.
        </p>

        <h2 className="text-2xl font-semibold text-gray-900">Growing Nationwide</h2>
        <p>
          After the Gold Coast, we&apos;re expanding to Brisbane, then Sydney,
          Melbourne, and every corner of Australia. Our goal is to be the go-to
          destination for discovering events across the country.
        </p>

        <h2 className="text-2xl font-semibold text-gray-900">For Organisers</h2>
        <p>
          If you organise events on the Gold Coast and want to make sure your
          events appear on Eventure, get in touch. We&apos;re always looking to
          partner with venues, promoters, and community organisations.
        </p>
      </div>
    </div>
  );
}
