import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Eventure's Terms and Conditions — the rules governing your use of the Eventure events aggregation website.",
};

export default function TermsPage() {
  return (
    <div className="bg-surface-bright min-h-screen"><div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-6 font-heading text-4xl font-extrabold text-on-surface">
        Terms &amp; Conditions
      </h1>

      <div className="space-y-8 text-on-surface-variant leading-relaxed">
        <div className="rounded-xl bg-primary-container/10 border border-primary-container/20 p-6">
          <p className="text-on-primary-container">
            These Terms and Conditions (&ldquo;Terms&rdquo;) govern your access
            to and use of the Eventure website at eventure.com.au (the
            &ldquo;Website&rdquo;), operated by Eventure (&ldquo;we&rdquo;,
            &ldquo;us&rdquo;, &ldquo;our&rdquo;). By accessing or using the
            Website, you agree to be bound by these Terms.
          </p>
        </div>

        <section>
          <h2 className="mb-3 font-heading text-2xl font-semibold text-on-primary-container">
            1. About Eventure
          </h2>
          <p>
            Eventure is an events aggregation platform. We collect, organise,
            and display publicly available event information from third-party
            sources to help users discover events happening near them in
            Australia.
          </p>
          <p className="mt-3 rounded-xl border border-ocean/20 bg-surface-container-lowest p-4 text-sm font-semibold">
            We are not an event organiser, ticketing provider, or venue
            operator. We do not sell tickets, manage bookings, or have any
            involvement in the organisation or delivery of the events listed on
            the Website.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-heading text-2xl font-semibold text-on-primary-container">
            2. Aggregated Content
          </h2>

          <h3 className="mb-2 mt-4 font-heading text-lg font-semibold text-on-surface">
            Third-Party Event Data
          </h3>
          <p>
            The event information displayed on the Website — including event
            names, dates, times, locations, descriptions, images, and ticket
            links — is sourced from third-party websites, APIs, and publicly
            available listings. This information is aggregated and presented for
            informational purposes only.
          </p>

          <h3 className="mb-2 mt-4 font-heading text-lg font-semibold text-on-surface">
            No Guarantee of Accuracy
          </h3>
          <p>
            While we make reasonable efforts to keep event information current
            and accurate, we do not warrant or guarantee the accuracy,
            completeness, reliability, or timeliness of any event information
            displayed on the Website. Specifically, we do not guarantee:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>That an event will take place as listed</li>
            <li>The accuracy of dates, times, locations, or pricing</li>
            <li>The availability of tickets or entry</li>
            <li>The quality, safety, or suitability of any event</li>
            <li>
              That links to third-party ticketing or event pages are current or
              functional
            </li>
          </ul>

          <h3 className="mb-2 mt-4 font-heading text-lg font-semibold text-on-surface">
            Your Responsibility
          </h3>
          <p className="font-semibold">
            You are responsible for verifying all event details directly with
            the event organiser or official ticketing provider before attending
            any event or purchasing tickets.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-heading text-2xl font-semibold text-on-primary-container">
            3. No Endorsement
          </h2>
          <p>
            The listing of any event on the Website does not constitute an
            endorsement, recommendation, or guarantee by Eventure. We do not
            vet, review, or approve events or event organisers.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-heading text-2xl font-semibold text-on-primary-container">
            4. Third-Party Links &amp; Affiliate Disclosure
          </h2>
          <p>
            The Website contains links to third-party websites, including event
            organiser sites and ticketing platforms. These links are provided
            for your convenience only. We have no control over, and accept no
            responsibility for, the content, privacy policies, or practices of
            any third-party websites.
          </p>
          <p className="mt-3">
            <strong>Affiliate links:</strong> Some outbound links may be
            affiliate links, meaning Eventure may earn a commission if you
            complete a transaction on a third-party site. Affiliate
            relationships do not influence which events are listed or how they
            are displayed.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-heading text-2xl font-semibold text-on-primary-container">
            5. Intellectual Property
          </h2>
          <p>
            The Website&apos;s design, layout, logos, branding, and original
            written content are owned by or licensed to Eventure and are
            protected by Australian copyright and intellectual property laws.
            Event information, images, and descriptions sourced from third
            parties remain the intellectual property of their respective owners.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-heading text-2xl font-semibold text-on-primary-container">
            6. Acceptable Use
          </h2>
          <p>You agree not to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>Use the Website for any unlawful purpose</li>
            <li>
              Attempt to gain unauthorised access to our systems or interfere
              with the Website&apos;s operation
            </li>
            <li>
              Use automated tools (bots, scrapers) to extract data from the
              Website without our written permission
            </li>
            <li>Introduce malware, viruses, or other harmful code</li>
            <li>Impersonate any person or entity</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-heading text-2xl font-semibold text-on-primary-container">
            7. Limitation of Liability
          </h2>
          <p>
            To the maximum extent permitted by law, we provide the Website and
            its content on an &ldquo;as is&rdquo; and &ldquo;as
            available&rdquo; basis, without warranties of any kind. We are not
            liable for any loss or damage arising from or in connection with
            your use of or reliance on event information displayed on the
            Website.
          </p>

          <h3 className="mb-2 mt-4 font-heading text-lg font-semibold text-on-surface">
            Australian Consumer Law
          </h3>
          <p>
            Nothing in these Terms excludes, restricts, or modifies any rights
            you may have under the{" "}
            <em>Competition and Consumer Act 2010</em> (Cth), including the
            Australian Consumer Law, or any other applicable consumer
            protection legislation that cannot be excluded by agreement.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-heading text-2xl font-semibold text-on-primary-container">
            8. Indemnity
          </h2>
          <p>
            You agree to indemnify and hold harmless Eventure, its directors,
            officers, employees, and agents from and against any claims, losses,
            damages, liabilities, and expenses arising from your use of the
            Website or your breach of these Terms.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-heading text-2xl font-semibold text-on-primary-container">
            9. Privacy
          </h2>
          <p>
            We collect and handle personal information in accordance with our{" "}
            <a
              href="/privacy"
              className="text-primary hover:text-primary-container transition-colors"
            >
              Privacy Policy
            </a>
            . By using the Website, you consent to such collection and
            handling.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-heading text-2xl font-semibold text-on-primary-container">
            10. Governing Law
          </h2>
          <p>
            These Terms are governed by the laws of Queensland, Australia. Any
            disputes arising from these Terms or your use of the Website are
            subject to the exclusive jurisdiction of the courts of Queensland.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-heading text-2xl font-semibold text-on-primary-container">
            11. Changes to These Terms
          </h2>
          <p>
            We may update these Terms from time to time. Changes will be posted
            on this page with an updated &ldquo;Last updated&rdquo; date. Your
            continued use of the Website after changes are posted constitutes
            acceptance of the updated Terms.
          </p>
        </section>

        <section className="rounded-xl border border-surface-container-high p-6">
          <h2 className="mb-3 font-heading text-2xl font-semibold text-on-primary-container">
            12. Contact Us
          </h2>
          <p>
            If you have questions about these Terms, please contact us:
          </p>
          <p className="mt-3">
            <a
              href="mailto:legal@eventure.com.au"
              className="text-primary hover:text-primary-container transition-colors"
            >
              legal@eventure.com.au
            </a>
          </p>
        </section>
      </div>
    </div></div>
  );
}
