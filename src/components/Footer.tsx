"use client";

import Link from "next/link";

const FOOTER_LINKS = {
  Discover: [
    { href: "/events", label: "All Events" },
    { href: "/events?category=music", label: "Live Music" },
    { href: "/events?category=festival", label: "Festivals" },
    { href: "/events?category=markets", label: "Markets" },
    { href: "/events?category=sports", label: "Sports" },
    { href: "/events?category=family", label: "Family & Kids" },
  ],
  Cities: [
    { href: "/city/gold-coast", label: "Gold Coast" },
    { href: "/city/brisbane", label: "Brisbane" },
    { href: "/city/sydney", label: "Sydney" },
    { href: "/city/melbourne", label: "Melbourne" },
  ],
  Company: [
    { href: "/about", label: "About Us" },
    { href: "/contact", label: "Contact" },
    { href: "/faq", label: "FAQ" },
  ],
  Legal: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms & Conditions" },
    { href: "/cookies", label: "Cookie Policy" },
  ],
};

function SocialIcon({ type }: { type: "facebook" | "instagram" | "twitter" }) {
  const paths: Record<string, string> = {
    facebook: "M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z",
    instagram:
      "M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 01-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 017.8 2m-.2 2A3.6 3.6 0 004 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 003.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 110 2.5 1.25 1.25 0 010-2.5M12 7a5 5 0 110 10 5 5 0 010-10m0 2a3 3 0 100 6 3 3 0 000-6z",
    twitter:
      "M22.46 6c-.77.35-1.6.58-2.46.69a4.3 4.3 0 001.88-2.38 8.59 8.59 0 01-2.72 1.04 4.28 4.28 0 00-7.32 3.91A12.16 12.16 0 013.16 4.86a4.28 4.28 0 001.33 5.71 4.24 4.24 0 01-1.94-.54v.05a4.28 4.28 0 003.43 4.19 4.27 4.27 0 01-1.93.07 4.29 4.29 0 004 2.98A8.59 8.59 0 012 19.54a12.13 12.13 0 006.56 1.92c7.88 0 12.2-6.53 12.2-12.2 0-.19 0-.37-.01-.56A8.72 8.72 0 0022.46 6z",
  };
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[type]} />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="mt-0 border-t border-slate-800 bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-6">
          {/* Brand + newsletter */}
          <div className="sm:col-span-2">
            <Link href="/" className="mb-4 inline-block font-heading text-2xl font-bold text-white">
              Eventure
            </Link>
            <p className="mb-6 max-w-sm text-sm leading-relaxed text-slate-400">
              Australia&apos;s events aggregator. Live music, festivals, markets,
              sports, and more — discover what&apos;s happening near you.
            </p>
            {/* Newsletter signup */}
            <div className="mb-6">
              <p className="mb-2 text-sm font-medium text-white">Stay in the loop</p>
              <form
                onSubmit={(e) => e.preventDefault()}
                className="flex max-w-sm gap-2"
              >
                <input
                  type="email"
                  placeholder="Your email"
                  className="newsletter-input flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder:text-slate-500"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-coral px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-coral-dark"
                >
                  Subscribe
                </button>
              </form>
            </div>
            {/* Social links */}
            <div className="flex gap-4">
              {(["facebook", "instagram", "twitter"] as const).map((social) => (
                <a
                  key={social}
                  href="#"
                  aria-label={`Follow us on ${social}`}
                  className="rounded-full bg-slate-800 p-2.5 text-slate-400 transition-colors hover:bg-coral hover:text-white"
                >
                  <SocialIcon type={social} />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading}>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
                {heading}
              </h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-400 transition-colors hover:text-coral"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-8 sm:flex-row">
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} Eventure. All rights reserved.
          </p>
          <p className="text-sm text-slate-500">
            Proudly built on the Gold Coast
          </p>
        </div>
      </div>
    </footer>
  );
}
