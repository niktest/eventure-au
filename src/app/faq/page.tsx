import type { Metadata } from "next";
import { Accordion } from "@/components/Accordion";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Frequently asked questions about Eventure — Australia's events and entertainment aggregator.",
};

const faqItems = [
  {
    question: "What is Eventure?",
    answer: (
      <p>
        Eventure is Australia&apos;s events and entertainment aggregator. We
        scan and curate events happening near you — live music, festivals,
        markets, sports, family fun, nightlife, food and drink, arts, comedy,
        theatre, outdoor adventures, and community gatherings — all in one
        place.
      </p>
    ),
  },
  {
    question: "Does Eventure sell tickets?",
    answer: (
      <p>
        No. Eventure is an aggregation platform — we help you discover events,
        but we do not sell tickets or manage bookings. When you find an event
        you&apos;re interested in, we link you directly to the official
        ticketing provider or event organiser&apos;s website.
      </p>
    ),
  },
  {
    question: "How do you get your event information?",
    answer: (
      <p>
        We aggregate publicly available event information from ticketing
        platforms, venue websites, tourism boards, and community calendars. Our
        system regularly scans these sources to keep listings up to date.
      </p>
    ),
  },
  {
    question: "Is the event information always accurate?",
    answer: (
      <div>
        <p>
          We make every effort to keep event information current and accurate,
          but details can change without notice by the event organiser. We
          always recommend verifying event details (dates, times, pricing,
          availability) directly with the official event or venue website before
          attending.
        </p>
      </div>
    ),
  },
  {
    question: "What areas does Eventure cover?",
    answer: (
      <p>
        We&apos;re launching on the Gold Coast, Queensland, and expanding to
        Brisbane and then Australia-wide. Our goal is to be the go-to
        destination for discovering events across the entire country.
      </p>
    ),
  },
  {
    question: "How can I get my event listed on Eventure?",
    answer: (
      <p>
        If you organise events and want them to appear on Eventure, we&apos;d
        love to hear from you. Contact us at{" "}
        <a
          href="mailto:partners@eventure.com.au"
          className="text-coral hover:text-coral-dark transition-colors"
        >
          partners@eventure.com.au
        </a>{" "}
        and we&apos;ll get your events added.
      </p>
    ),
  },
  {
    question: "Is Eventure free to use?",
    answer: (
      <p>
        Yes! Eventure is completely free for users. Browse, search, and discover
        events without any cost or sign-up required.
      </p>
    ),
  },
  {
    question: "How do I report incorrect event information?",
    answer: (
      <p>
        If you spot an error in an event listing, please let us know by emailing{" "}
        <a
          href="mailto:hello@eventure.com.au"
          className="text-coral hover:text-coral-dark transition-colors"
        >
          hello@eventure.com.au
        </a>
        . We&apos;ll investigate and update the listing as quickly as possible.
      </p>
    ),
  },
  {
    question: "Does Eventure use cookies?",
    answer: (
      <p>
        Yes, we use a small number of cookies to make the Website work and to
        understand how visitors use it. For full details, see our{" "}
        <a
          href="/cookies"
          className="text-coral hover:text-coral-dark transition-colors"
        >
          Cookie Policy
        </a>
        .
      </p>
    ),
  },
  {
    question: "How do I contact Eventure?",
    answer: (
      <div>
        <p>You can reach us via email:</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>
            General enquiries:{" "}
            <a
              href="mailto:hello@eventure.com.au"
              className="text-coral hover:text-coral-dark transition-colors"
            >
              hello@eventure.com.au
            </a>
          </li>
          <li>
            Event organisers &amp; venues:{" "}
            <a
              href="mailto:partners@eventure.com.au"
              className="text-coral hover:text-coral-dark transition-colors"
            >
              partners@eventure.com.au
            </a>
          </li>
          <li>
            Privacy questions:{" "}
            <a
              href="mailto:privacy@eventure.com.au"
              className="text-coral hover:text-coral-dark transition-colors"
            >
              privacy@eventure.com.au
            </a>
          </li>
        </ul>
      </div>
    ),
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 font-heading text-4xl font-bold text-slate-900">
        Frequently Asked Questions
      </h1>

      <div className="space-y-8">
        <div className="rounded-lg bg-ocean-light p-6">
          <p className="text-ocean-dark">
            Find answers to common questions about Eventure below. Can&apos;t
            find what you&apos;re looking for?{" "}
            <a
              href="/contact"
              className="font-semibold text-ocean-dark underline hover:no-underline"
            >
              Get in touch
            </a>
            .
          </p>
        </div>

        <Accordion items={faqItems} />
      </div>
    </div>
  );
}
