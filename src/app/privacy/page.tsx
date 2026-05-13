import type { Metadata } from "next";
import { CONTACT_EMAILS } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Festlio's Privacy Policy — how we collect, hold, use, and disclose personal information in accordance with the Privacy Act 1988 (Cth) and the Australian Privacy Principles.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-surface-bright min-h-screen"><div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-6 font-heading text-4xl font-extrabold text-on-surface">
        Privacy Policy
      </h1>

      <div className="space-y-8 text-on-surface-variant leading-relaxed">
        <div className="rounded-xl bg-primary-container/10 border border-primary-container/20 p-6">
          <p className="text-on-surface-variant">
            This Privacy Policy describes how Festlio Events &amp;
            Entertainment (&ldquo;we&rdquo;, &ldquo;us&rdquo;,
            &ldquo;our&rdquo;) collects, holds, uses, and discloses personal
            information in accordance with the <em>Privacy Act 1988</em> (Cth)
            and the Australian Privacy Principles (APPs).
          </p>
        </div>

        <p>
          Festlio operates an events aggregation website accessible at
          festlio.com (the &ldquo;Website&rdquo;). We aggregate publicly
          available event information from third-party sources and present it in
          a searchable, user-friendly format. By using the Website, you consent
          to the collection and use of information in accordance with this
          policy.
        </p>

        <section>
          <h2 className="mb-3 font-heading text-2xl font-semibold text-on-surface">
            1. What Personal Information We Collect
          </h2>

          <h3 className="mb-2 mt-4 font-heading text-lg font-semibold text-on-surface">
            Information You Provide Directly
          </h3>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Contact information:</strong> Name, email address (e.g.,
              if you subscribe to a newsletter, submit a contact form, or create
              an account)
            </li>
            <li>
              <strong>Communication records:</strong> Messages or enquiries you
              send us
            </li>
            <li>
              <strong>Billing information:</strong> In future, if we introduce
              ticketing or paid features, we may collect payment and billing
              information. Any such information will be processed by PCI-DSS
              compliant third-party payment providers.
            </li>
          </ul>

          <h3 className="mb-2 mt-4 font-heading text-lg font-semibold text-on-surface">
            Information Collected Automatically
          </h3>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Device and browser information:</strong> IP address,
              browser type and version, operating system, device type
            </li>
            <li>
              <strong>Usage data:</strong> Pages visited, time spent on pages,
              referring URL, click patterns
            </li>
            <li>
              <strong>Location data:</strong> See{" "}
              <a
                href="#location"
                className="text-primary hover:text-primary-container transition-colors"
              >
                Location handling
              </a>{" "}
              below for how we use your approximate IP-derived location and
              (only when you opt in) your precise device location.
            </li>
            <li>
              <strong>Cookies and similar technologies:</strong> See our{" "}
              <a
                href="/cookies"
                className="text-primary hover:text-primary-container transition-colors"
              >
                Cookie Policy
              </a>{" "}
              for details
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-heading text-2xl font-semibold text-on-surface">
            2. How We Collect Personal Information
          </h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Directly from you</strong> — when you subscribe to our
              newsletter, submit a contact form, create an account, or otherwise
              interact with us
            </li>
            <li>
              <strong>Automatically</strong> — through cookies, analytics tools,
              and server logs when you browse the Website
            </li>
            <li>
              <strong>From third-party payment processors</strong> — in future,
              if payment features are introduced
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-heading text-2xl font-semibold text-on-surface">
            3. Why We Collect Your Information
          </h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>To operate and improve the Website and our services</li>
            <li>
              To personalise your experience (e.g., showing events near your
              location)
            </li>
            <li>To respond to your enquiries or requests</li>
            <li>
              To send you newsletters or marketing communications (only with
              your consent — you may opt out at any time)
            </li>
            <li>To analyse Website usage and improve performance</li>
            <li>To comply with legal obligations</li>
            <li>To protect our rights and prevent misuse of the Website</li>
          </ul>
        </section>

        <section id="location" className="scroll-mt-24">
          <h2 className="mb-3 font-heading text-2xl font-semibold text-on-surface">
            3a. Location Handling
          </h2>
          <p>
            We use location information in two ways, both for the sole purpose
            of showing you events relevant to where you are. We do not use
            location information for advertising, profiling, or to track you
            across other websites.
          </p>

          <h3 className="mb-2 mt-4 font-heading text-lg font-semibold text-on-surface">
            Approximate city from IP address
          </h3>
          <p>
            On your first visit, our edge layer reads your IP address and the
            approximate city / latitude / longitude it resolves to (provided by
            our hosting partner, Vercel) to pre-select the nearest supported
            city (currently Gold Coast, Brisbane, Sydney, or Melbourne). The IP
            address itself is not stored by Festlio beyond standard short-term
            server logs; only the resolved city slug is written to a cookie on
            your device (see our{" "}
            <a
              href="/cookies"
              className="text-primary hover:text-primary-container transition-colors"
            >
              Cookie Policy
            </a>
            ). You can change the suggested city from the header city picker at
            any time.
          </p>

          <h3 className="mb-2 mt-4 font-heading text-lg font-semibold text-on-surface">
            Precise device location (opt-in)
          </h3>
          <p>
            When &mdash; and only when &mdash; you tap the &ldquo;Near Me&rdquo;
            button on the home page or the &ldquo;Sort: Near me&rdquo; toggle
            on the events page, your browser will ask your permission to share
            your device location. If you allow it:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>
              your coordinates are appended to the page URL (e.g.{" "}
              <code>?sort=nearme&amp;lat=&hellip;&amp;lng=&hellip;</code>) so
              our server can rank events by distance for that request,
            </li>
            <li>
              the coordinates are cached in your browser&rsquo;s local storage
              for up to 24 hours so the sort persists across page loads,
            </li>
            <li>
              we do <strong>not</strong> persist your coordinates in any
              Festlio database, log, or analytics tool beyond what is needed to
              render the current request.
            </li>
          </ul>
          <p className="mt-2">
            If you deny or revoke the permission in your browser, the rest of
            Festlio continues to work &mdash; you&rsquo;ll only lose
            distance-based sorting.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-heading text-2xl font-semibold text-on-surface">
            4. Disclosure of Personal Information
          </h2>
          <p className="mb-2">We may disclose personal information to:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Service providers</strong> who assist us in operating the
              Website (e.g., hosting providers, analytics services, email
              delivery services)
            </li>
            <li>
              <strong>Payment processors</strong> — if and when payment features
              are introduced
            </li>
            <li>
              <strong>Law enforcement or regulatory bodies</strong> where
              required by law
            </li>
            <li>
              <strong>Professional advisors</strong> (e.g., lawyers, accountants)
              as necessary
            </li>
          </ul>
          <p className="mt-3 rounded-xl border border-ocean/20 bg-surface-container-lowest p-4 text-sm">
            We do <strong>not</strong> sell, rent, or trade your personal
            information to third parties for marketing purposes. Some of our
            service providers may store or process data outside Australia,
            including in the United States. Where this occurs, we take reasonable
            steps to ensure that overseas recipients handle your information
            consistently with the APPs.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-heading text-2xl font-semibold text-on-surface">
            5. Data Security
          </h2>
          <p>
            We take reasonable steps to protect personal information from
            misuse, interference, loss, unauthorised access, modification, or
            disclosure. Our security measures include:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>SSL/TLS encryption for data in transit</li>
            <li>Access controls limiting who can access personal information</li>
            <li>Regular review of our data handling practices</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-heading text-2xl font-semibold text-on-surface">
            6. Access and Correction
          </h2>
          <p>You have the right to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>
              <strong>Access</strong> the personal information we hold about you
            </li>
            <li>
              <strong>Request correction</strong> of any inaccurate, out-of-date,
              incomplete, irrelevant, or misleading information
            </li>
          </ul>
          <p className="mt-2">
            To make a request, contact us using the details below. We will
            respond within a reasonable period (generally within 30 days).
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-heading text-2xl font-semibold text-on-surface">
            7. Data Retention
          </h2>
          <p>
            We retain personal information only for as long as necessary to
            fulfil the purposes described in this policy, or as required by law.
            When personal information is no longer needed, we will take
            reasonable steps to destroy or de-identify it.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-heading text-2xl font-semibold text-on-surface">
            8. Direct Marketing
          </h2>
          <p>
            We will only send you direct marketing communications where you have
            consented or would reasonably expect to receive such communications.
            Every marketing communication will include a simple opt-out
            mechanism. You may opt out at any time.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-heading text-2xl font-semibold text-on-surface">
            9. Anonymity
          </h2>
          <p>
            You may browse the Website without identifying yourself. Where
            practicable, you have the option of not identifying yourself or
            using a pseudonym when interacting with us. However, if you do not
            provide certain personal information, we may not be able to provide
            some services.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-heading text-2xl font-semibold text-on-surface">
            10. Complaints
          </h2>
          <p>
            If you believe we have breached the APPs or handled your personal
            information inappropriately, you may lodge a complaint with us. We
            will acknowledge your complaint within 7 days and aim to resolve it
            within 30 days.
          </p>
          <p className="mt-2">
            If you are not satisfied with our response, you may lodge a
            complaint with the{" "}
            <strong>Office of the Australian Information Commissioner (OAIC)</strong>
            :
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>Phone: 1300 363 992</li>
            <li>Post: GPO Box 5218, Sydney NSW 2001</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-heading text-2xl font-semibold text-on-surface">
            11. Changes to This Policy
          </h2>
          <p>
            We may update this Privacy Policy from time to time. Any changes
            will be posted on this page with an updated &ldquo;Last
            updated&rdquo; date. Continued use of the Website after changes are
            posted constitutes acceptance of the updated policy.
          </p>
        </section>

        <section className="rounded-xl border border-surface-container-high p-6">
          <h2 className="mb-3 font-heading text-2xl font-semibold text-on-surface">
            12. Contact Us
          </h2>
          <p>
            If you have questions about this Privacy Policy, wish to access or
            correct your personal information, or wish to make a complaint:
          </p>
          <p className="mt-3">
            <a
              href={`mailto:${CONTACT_EMAILS.privacy}`}
              className="text-primary hover:text-primary-container transition-colors"
            >
              {CONTACT_EMAILS.privacy}
            </a>
          </p>
        </section>

        <p className="text-sm text-secondary">Last updated: 13 May 2026</p>
      </div>
    </div></div>
  );
}
