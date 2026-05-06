"use client";

import { Accordion } from "@/components/Accordion";
import { CONTACT_EMAILS } from "@/lib/contact";

const faqItems = [
  {
    question: "What is Festlio?",
    answer: (
      <p>
        Festlio is the easiest way to find out what&apos;s on near you. We pull
        together live music, festivals, markets, sport, family days out, food
        and drink, arts, comedy, theatre, and community events from across
        Australia into a single, skimmable calendar.
      </p>
    ),
  },
  {
    question: "Does Festlio sell tickets?",
    answer: (
      <p>
        No. Festlio is a discovery platform — we help you find events, but we
        don&apos;t sell tickets or manage bookings. When something looks good,
        we send you straight to the official ticketing provider or the
        organiser&apos;s site.
      </p>
    ),
  },
  {
    question: "How do you get your event information?",
    answer: (
      <p>
        We aggregate publicly available event information from ticketing
        platforms, venue websites, tourism boards, and community calendars. Our
        system scans those sources daily so listings stay current.
      </p>
    ),
  },
  {
    question: "Is the event information always accurate?",
    answer: (
      <div>
        <p>
          We work hard to keep listings accurate, but organisers can change
          details without notice — venues move, times shift, gigs sell out.
          Always confirm the details on the official event or venue page before
          you head out or buy a ticket.
        </p>
      </div>
    ),
  },
  {
    question: "What areas does Festlio cover?",
    answer: (
      <p>
        We&apos;re starting on the Gold Coast and rolling out to Brisbane next,
        then across the rest of Australia. The goal is one calendar for the
        whole country — but done properly, city by city.
      </p>
    ),
  },
  {
    question: "How can I get my event listed on Festlio?",
    answer: (
      <p>
        If you run events, we&apos;d love to have them on Festlio. Email us at{" "}
        <a
          href={`mailto:${CONTACT_EMAILS.partners}`}
          className="text-primary hover:text-primary-container transition-colors"
        >
          {CONTACT_EMAILS.partners}
        </a>{" "}
        and we&apos;ll get them added — there&apos;s no fee.
      </p>
    ),
  },
  {
    question: "Is Festlio free to use?",
    answer: (
      <p>
        Yes. Festlio is completely free for event-goers. Browse, search, and
        discover — no sign-up, no paywall.
      </p>
    ),
  },
  {
    question: "How do I report incorrect event information?",
    answer: (
      <p>
        Spotted something wrong? Let us know at{" "}
        <a
          href={`mailto:${CONTACT_EMAILS.general}`}
          className="text-primary hover:text-primary-container transition-colors"
        >
          {CONTACT_EMAILS.general}
        </a>{" "}
        and we&apos;ll fix it as quickly as we can.
      </p>
    ),
  },
  {
    question: "Does Festlio use cookies?",
    answer: (
      <p>
        Yes — a small number, mostly to make the site work and to understand
        how people use it. Full details are in our{" "}
        <a
          href="/cookies"
          className="text-primary hover:text-primary-container transition-colors"
        >
          Cookie Policy
        </a>
        .
      </p>
    ),
  },
  {
    question: "How do I contact Festlio?",
    answer: (
      <div>
        <p>You can reach us by email:</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>
            General enquiries:{" "}
            <a
              href={`mailto:${CONTACT_EMAILS.general}`}
              className="text-primary hover:text-primary-container transition-colors"
            >
              {CONTACT_EMAILS.general}
            </a>
          </li>
          <li>
            Event organisers &amp; venues:{" "}
            <a
              href={`mailto:${CONTACT_EMAILS.partners}`}
              className="text-primary hover:text-primary-container transition-colors"
            >
              {CONTACT_EMAILS.partners}
            </a>
          </li>
          <li>
            Privacy questions:{" "}
            <a
              href={`mailto:${CONTACT_EMAILS.privacy}`}
              className="text-primary hover:text-primary-container transition-colors"
            >
              {CONTACT_EMAILS.privacy}
            </a>
          </li>
        </ul>
      </div>
    ),
  },
];

export default function FaqPage() {
  return (
    <div className="bg-surface-bright min-h-screen"><div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-6 font-heading text-4xl font-extrabold text-on-surface">
        Frequently Asked Questions
      </h1>

      <div className="space-y-8">
        <div className="rounded-xl bg-primary-container/10 border border-primary-container/20 p-6">
          <p className="text-primary">
            Find answers to common questions about Festlio below. Can&apos;t
            find what you&apos;re looking for?{" "}
            <a
              href="/contact"
              className="font-semibold text-primary underline hover:no-underline"
            >
              Get in touch
            </a>
            .
          </p>
        </div>

        <Accordion items={faqItems} headingLevel={2} />
      </div>
    </div></div>
  );
}
