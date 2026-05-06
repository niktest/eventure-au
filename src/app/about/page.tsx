import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Festlio",
  description:
    "Festlio is the easiest way to find out what's on near you — live music, festivals, markets, sport and more, starting on the Gold Coast and rolling out across Australia.",
};

export default function AboutPage() {
  return (
    <div className="bg-surface-bright min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="mb-6 font-display text-4xl font-extrabold text-on-surface tracking-tight" style={{ letterSpacing: "-0.02em" }}>
          About Festlio
        </h1>

        <div className="space-y-8 font-body text-base text-on-surface-variant leading-relaxed">
          <div className="rounded-xl bg-primary-container/10 p-6 border border-primary-container/20">
            <p className="text-on-surface-variant">
              Festlio is the easiest way to find out what&apos;s on near you. We
              pull together live music, festivals, markets, sport, family days
              out, food and drink, arts, comedy, theatre, and the community
              events that make a town feel like a town — and put them all in
              one place you can actually skim.
            </p>
          </div>

          <section>
            <h2 className="mb-3 font-heading text-2xl font-bold text-on-surface">Why we&apos;re building it</h2>
            <p>
              Finding something to do on a Saturday shouldn&apos;t take half an
              hour of tab-switching. Council pages, ticket sites, venue
              Instagrams, group chats — the information is already out there,
              it&apos;s just scattered. Festlio&apos;s job is to gather it,
              de-duplicate it, and surface what&apos;s actually worth your time.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-heading text-2xl font-bold text-on-surface">
              Starting on the Gold Coast
            </h2>
            <p>
              We&apos;re launching where we live. From Sunday markets at Marina
              Mirage to live music at Burleigh Pavilion, exhibitions at HOTA,
              and the bigger nights at The Star — if it&apos;s on between
              Coolangatta and Coomera, we want it on Festlio. Brisbane is next,
              then the rest of the country.
            </p>
          </section>

          <section className="rounded-xl border border-surface-container-high bg-surface-container-lowest p-6 shadow-sm">
            <h2 className="mb-3 font-heading text-2xl font-bold text-on-surface">For event organisers</h2>
            <p className="mb-4">
              If you run gigs, markets, festivals, classes or community events,
              we want your listings on Festlio. We&apos;re not a ticket
              platform — we send people to your existing site or box office.
              Get in touch and we&apos;ll get you added.
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
