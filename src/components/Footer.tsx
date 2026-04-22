"use client";

import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/about", label: "Our Story" },
  { href: "/events", label: "Browse Events" },
  { href: "/community", label: "Community" },
  { href: "/faq", label: "Help Center" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/cookies", label: "Cookies" },
  { href: "/contact", label: "Support" },
];

export function Footer() {
  return (
    <footer className="w-full py-12 px-6 border-t border-outline-variant bg-surface mt-auto">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-7xl mx-auto w-full text-center md:text-left">
        {/* Brand */}
        <div className="col-span-1">
          <Link
            href="/"
            className="text-lg font-extrabold text-on-surface font-heading mb-4 block"
          >
            Eventure Discovery
          </Link>
          <p className="font-body text-sm text-secondary">
            &copy; {new Date().getFullYear()} Eventure Discovery. Built for the
            community.
          </p>
        </div>

        {/* Links */}
        <div className="col-span-1 md:col-span-3 flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-3 items-center">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-body text-sm text-secondary hover:text-primary transition-opacity hover:opacity-80"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
