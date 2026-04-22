import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Eventure",
  description:
    "Eventure aggregates events happening near you — live music, festivals, markets, sports, family activities, and more. Starting on the Gold Coast, expanding Australia-wide.",
};

export default function AboutPage() {
  return (
    <div className="bg-surface-bright min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="mb-6 font-display text-4xl font-extrabold text-on-surface tracking-tight" style={{ letterSpacing: "-0.02em" }}>
          About Eventure
        </h1>

        <div className="space-y-8 font-body text-base text-on-surface-variant leading-relaxed">
          <div className="rounded-xl bg-primary-container/10 p-6 border border-primary-container/20">
            <p className="text-on-primary-container">
              Eventure is Australia&apos;s events and entertainment aggregator. We
              scan and curate events happening near you — live music, festivals,
              markets, sports, family fun, nightlife, food and drink, arts, comedy,
              theatre, outdoor adventures, and community gatherings — all in one
              place.
            </p>
          </div>

          <section>
            <h2 className="mb-3 font-heading text-2xl font-bold text-on-surface">Our Mission</h2>
            <p>
              We believe discovering what&apos;s happening near you shouldn&apos;t
              require checking a dozen different websites. Eventure brings together
              events from ticketing platforms, venue websites, tourism boards, and
              community calendars so you never miss out.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-heading text-2xl font-bold text-on-surface">
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
            <h2 className="mb-3 font-heading text-2xl font-bold text-on-surface">Growing Nationwide</h2>
            <p>
              After the Gold Coast, we&apos;re expanding to Brisbane, then Sydney,
              Melbourne, and every corner of Australia. Our goal is to be the go-to
              destination for discovering events across the country.
            </p>
          </section>

          <section className="rounded-xl border border-surface-container-high bg-surface-container-lowest p-6 shadow-sm">
            <h2 className="mb-3 font-heading text-2xl font-bold text-on-surface">For Organisers</h2>
            <p className="mb-4">
              If you organise events on the Gold Coast and want to make sure your
              events appear on Eventure, get in touch. We&apos;re always looking to
              partner with venues, promoters, and community organisations.
            </p>
            <Link
              href="/contact"
              className="inline-block rounded-full bg-primary-container px-6 py-3 font-body font-semibold text-on-primary transition-colors hover:bg-primary"
            >
              Get in touch
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
