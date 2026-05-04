"use client";

import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/about", label: "Our Story" },
  { href: "/today", label: "Today" },
  { href: "/events", label: "Browse Events" },
  { href: "/discussions", label: "Discussions" },
  { href: "/community", label: "Community" },
  { href: "/faq", label: "Help Center" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/cookies", label: "Cookies" },
  { href: "/contact", label: "Support" },
];

export function Footer() {
  return (
    <footer
      className="w-full py-12 px-6 mt-auto text-on-dark-strong"
      style={{
        background: "var(--color-surface-0)",
        borderTop: "1px solid var(--color-neon-coral)",
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-7xl mx-auto w-full text-center md:text-left">
        <div className="col-span-1">
          <Link
            href="/"
            className="text-lg font-extrabold font-heading mb-4 block text-neon-coral"
          >
            Eventure Discovery
          </Link>
          <p className="font-body text-sm text-on-dark-muted">
            &copy; {new Date().getFullYear()} Eventure Discovery. Built for the
            community.
          </p>
        </div>

        <div className="col-span-1 md:col-span-3 flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-3 items-center">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-body text-sm text-on-dark-muted hover:text-neon-coral transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
