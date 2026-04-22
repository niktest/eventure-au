"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const NAV_LINKS = [
  { href: "/events", label: "Events" },
  { href: "/city/gold-coast", label: "Gold Coast" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/events?q=${encodeURIComponent(query.trim())}`);
      setSearchOpen(false);
      setQuery("");
    }
  };

  return (
    <>
      {/* Desktop nav */}
      <div className="hidden sm:flex items-center gap-6 text-sm font-medium">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-slate-700 transition-colors hover:text-coral"
          >
            {link.label}
          </Link>
        ))}
        {/* Desktop search toggle */}
        <button
          type="button"
          onClick={() => setSearchOpen(!searchOpen)}
          className="rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-coral-light hover:text-coral"
          aria-label="Search"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>

      {/* Mobile hamburger + search */}
      <div className="flex items-center gap-2 sm:hidden">
        <button
          type="button"
          onClick={() => setSearchOpen(!searchOpen)}
          className="p-2 text-slate-700"
          aria-label="Search"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="p-2 -mr-2 text-slate-700"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Search bar dropdown */}
      {searchOpen && (
        <div className="absolute top-full left-0 right-0 border-b border-slate-100 bg-white px-4 py-3 shadow-md">
          <form onSubmit={handleSearch} className="mx-auto flex max-w-2xl gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                placeholder="Search events, venues, categories..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-coral-dark"
            >
              Search
            </button>
          </form>
        </div>
      )}

      {/* Mobile menu panel */}
      {open && (
        <div className="sm:hidden absolute top-full left-0 right-0 border-b border-slate-100 bg-white shadow-md">
          <div className="flex flex-col px-4 py-3 space-y-3 text-sm font-medium">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-slate-700 transition-colors hover:text-coral py-1"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
