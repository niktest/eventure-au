import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "Eventure's Cookie Policy — how we use cookies and similar tracking technologies on our website.",
};

export default function CookiePolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 font-heading text-4xl font-bold text-slate-900">
        Cookie Policy
      </h1>

      <div className="space-y-8 text-slate-700 leading-relaxed">
        <div className="rounded-lg bg-ocean-light p-6">
          <p className="text-ocean-dark">
            This Cookie Policy explains how Eventure (&ldquo;we&rdquo;,
            &ldquo;us&rdquo;, &ldquo;our&rdquo;) uses cookies and similar
            tracking technologies on our website at eventure.com.au. This policy
            should be read alongside our{" "}
            <a
              href="/privacy"
              className="font-semibold text-ocean-dark underline hover:no-underline"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>

        <section>
          <h2 className="mb-3 font-heading text-2xl font-semibold text-ocean-dark">
            1. What Are Cookies?
          </h2>
          <p>
            Cookies are small text files placed on your device (computer,
            tablet, or mobile phone) when you visit a website. They are widely
            used to make websites work efficiently and to provide information to
            website operators. Similar technologies include web beacons, pixels,
            and local storage — this policy covers all such technologies.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-heading text-2xl font-semibold text-ocean-dark">
            2. How We Use Cookies
          </h2>

          <h3 className="mb-2 mt-4 font-heading text-lg font-semibold text-slate-800">
            Strictly Necessary Cookies
          </h3>
          <p>
            These cookies are essential for the Website to function. They enable
            core features such as page navigation and secure access.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="pb-2 pr-4 font-semibold text-slate-800">Cookie</th>
                  <th className="pb-2 pr-4 font-semibold text-slate-800">Purpose</th>
                  <th className="pb-2 font-semibold text-slate-800">Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4">Session cookie</td>
                  <td className="py-2 pr-4">Maintains your browsing session</td>
                  <td className="py-2">Session</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="mb-2 mt-6 font-heading text-lg font-semibold text-slate-800">
            Analytics Cookies
          </h3>
          <p>
            These cookies help us understand how visitors interact with the
            Website by collecting and reporting information anonymously.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="pb-2 pr-4 font-semibold text-slate-800">Cookie</th>
                  <th className="pb-2 pr-4 font-semibold text-slate-800">Purpose</th>
                  <th className="pb-2 pr-4 font-semibold text-slate-800">Duration</th>
                  <th className="pb-2 font-semibold text-slate-800">Provider</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4">_ga</td>
                  <td className="py-2 pr-4">Distinguishes unique users</td>
                  <td className="py-2 pr-4">2 years</td>
                  <td className="py-2">Google Analytics</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4">_ga_*</td>
                  <td className="py-2 pr-4">Maintains session state</td>
                  <td className="py-2 pr-4">2 years</td>
                  <td className="py-2">Google Analytics</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="mb-2 mt-6 font-heading text-lg font-semibold text-slate-800">
            Functional Cookies
          </h3>
          <p>
            These cookies enable enhanced functionality and personalisation,
            such as remembering your location preference for showing nearby
            events.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="pb-2 pr-4 font-semibold text-slate-800">Cookie</th>
                  <th className="pb-2 pr-4 font-semibold text-slate-800">Purpose</th>
                  <th className="pb-2 font-semibold text-slate-800">Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4">location_pref</td>
                  <td className="py-2 pr-4">
                    Stores your preferred city/region for event discovery
                  </td>
                  <td className="py-2">1 year</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="mb-2 mt-6 font-heading text-lg font-semibold text-slate-800">
            Third-Party Cookies
          </h3>
          <p>
            When you click links to third-party websites (e.g., ticketing
            platforms, event organiser sites), those websites may set their own
            cookies. We have no control over third-party cookies. We do not use
            advertising or behavioural targeting cookies.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-heading text-2xl font-semibold text-ocean-dark">
            3. Managing Cookies
          </h2>

          <h3 className="mb-2 mt-4 font-heading text-lg font-semibold text-slate-800">
            Browser Settings
          </h3>
          <p>
            Most web browsers allow you to manage cookies through their
            settings. You can view, delete, or block cookies from specific or
            all websites.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>
              <strong>Chrome:</strong> Settings &gt; Privacy and Security &gt;
              Cookies
            </li>
            <li>
              <strong>Firefox:</strong> Settings &gt; Privacy &amp; Security
              &gt; Cookies and Site Data
            </li>
            <li>
              <strong>Safari:</strong> Preferences &gt; Privacy &gt; Manage
              Website Data
            </li>
            <li>
              <strong>Edge:</strong> Settings &gt; Cookies and site permissions
            </li>
          </ul>

          <h3 className="mb-2 mt-4 font-heading text-lg font-semibold text-slate-800">
            Impact of Disabling Cookies
          </h3>
          <p>
            If you disable or delete cookies, some features of the Website may
            not function as intended. Strictly necessary cookies cannot be
            disabled while using the Website.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-heading text-2xl font-semibold text-ocean-dark">
            4. Australian Law Context
          </h2>
          <p>
            Australia does not currently have a standalone cookie consent law
            equivalent to the EU&apos;s ePrivacy Directive. However, under the{" "}
            <em>Privacy Act 1988</em> (Cth) and the Australian Privacy
            Principles (APPs), the collection of personal information through
            cookies must be transparent and fair. This Cookie Policy fulfils our
            obligation to inform you about our use of cookies and similar
            technologies.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-heading text-2xl font-semibold text-ocean-dark">
            5. Changes to This Policy
          </h2>
          <p>
            We may update this Cookie Policy from time to time. Any changes
            will be posted on this page with an updated &ldquo;Last
            updated&rdquo; date.
          </p>
        </section>

        <section className="rounded-lg border border-slate-300 p-6">
          <h2 className="mb-3 font-heading text-2xl font-semibold text-ocean-dark">
            6. Contact Us
          </h2>
          <p>
            If you have questions about our use of cookies, please contact us:
          </p>
          <p className="mt-3">
            <a
              href="mailto:privacy@eventure.com.au"
              className="text-coral hover:text-coral-dark transition-colors"
            >
              privacy@eventure.com.au
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
