import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Eventure",
  description:
    "Eventure aggregates events happening near you — live music, festivals, markets, sports, family activities, and more. Starting on the Gold Coast, expanding Australia-wide.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 font-heading text-4xl font-bold text-slate-900">About Eventure</h1>

      <div className="space-y-8 text-slate-700 leading-relaxed">
        <div className="rounded-lg bg-ocean-light p-6">
          <p className="text-ocean-dark">
            Eventure is Australia&apos;s events and entertainment aggregator. We
            scan and curate events happening near you — live music, festivals,
            markets, sports, family fun, nightlife, food and drink, arts, comedy,
            theatre, outdoor adventures, and community gatherings — all in one
            place.
          </p>
        </div>

        <section>
          <h2 className="mb-3 font-heading text-2xl font-semibold text-ocean-dark">Our Mission</h2>
          <p>
            We believe discovering what&apos;s happening near you shouldn&apos;t
            require checking a dozen different websites. Eventure brings together
            events from ticketing platforms, venue websites, tourism boards, and
            community calendars so you never miss out.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-heading text-2xl font-semibold text-ocean-dark">
            Starting on the Gold Coast
          </h2>
          <p>
            We&apos;re launching right here on the Gold Coast — one of
            Australia&apos;s most vibrant regions for events and entertainment.
            From the Sunday markets at Marina Mirage to live gigs at Burleigh
            Pavilion, from HOTA exhibitions to the big shows at The Star — we
            cover it all.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-heading text-2xl font-semibold text-ocean-dark">Growing Nationwide</h2>
          <p>
            After the Gold Coast, we&apos;re expanding to Brisbane, then Sydney,
            Melbourne, and every corner of Australia. Our goal is to be the go-to
            destination for discovering events across the country.
          </p>
        </section>

        <section className="rounded-lg border border-slate-300 p-6">
          <h2 className="mb-3 font-heading text-2xl font-semibold text-ocean-dark">For Organisers</h2>
          <p className="mb-4">
            If you organise events on the Gold Coast and want to make sure your
            events appear on Eventure, get in touch. We&apos;re always looking to
            partner with venues, promoters, and community organisations.
          </p>
          <a
            href="/contact"
            className="inline-block rounded-lg bg-coral px-6 py-3 font-semibold text-white transition-colors hover:bg-coral-dark"
          >
            Get in touch
          </a>
        </section>
      </div>
    </div>
  );
}
