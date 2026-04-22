"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const NAV_LINKS = [
  { href: "/events", label: "Browse" },
  { href: "/community", label: "Community" },
  { href: "/discussions", label: "Trending" },
  { href: "/about", label: "About" },
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
      {/* Desktop nav links */}
      <nav className="hidden md:flex items-center gap-6 ml-auto font-heading text-sm font-semibold tracking-tight">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-secondary hover:text-primary-container transition-all duration-200"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Desktop auth actions */}
      <div className="hidden md:flex items-center gap-3 ml-6">
        <Link
          href="/login"
          className="font-heading text-sm font-semibold text-secondary hover:text-primary-container transition-all duration-200"
        >
          Log In
        </Link>
        <Link
          href="/signup"
          className="bg-primary-container text-on-primary rounded-full px-6 py-2 font-heading text-sm font-semibold hover:scale-105 transition-transform duration-200 active:scale-95"
        >
          Sign Up
        </Link>
      </div>

      {/* Mobile actions */}
      <div className="flex items-center gap-2 md:hidden">
        <button
          type="button"
          onClick={() => {
            setSearchOpen(!searchOpen);
            setOpen(false);
          }}
          className="p-2 text-secondary hover:text-primary transition-colors"
          aria-label="Search"
        >
          <span className="material-symbols-outlined text-[22px]">search</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(!open);
            setSearchOpen(false);
          }}
          className="p-2 -mr-2 text-secondary hover:text-primary transition-colors"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          <span className="material-symbols-outlined text-[24px]">
            {open ? "close" : "menu"}
          </span>
        </button>
      </div>

      {/* Search bar dropdown */}
      {searchOpen && (
        <div className="absolute top-full left-0 right-0 border-b border-surface-container-high bg-white px-4 py-3 shadow-md z-50">
          <form onSubmit={handleSearch} className="mx-auto flex max-w-2xl gap-2">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-secondary text-[20px]">
                search
              </span>
              <input
                type="search"
                placeholder="Search events, venues, categories..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2.5 pl-10 pr-4 text-sm font-body text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              type="submit"
              className="rounded-full bg-primary-container px-5 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-primary"
            >
              Search
            </button>
          </form>
        </div>
      )}

      {/* Mobile menu panel */}
      {open && (
        <div className="md:hidden absolute top-full left-0 right-0 border-b border-surface-container-high bg-white shadow-md z-50">
          <div className="flex flex-col px-6 py-4 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-on-surface font-heading font-semibold text-sm py-3 px-2 rounded-lg hover:bg-surface-container-low transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-surface-container-high my-2" />
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="text-secondary font-heading font-semibold text-sm py-3 px-2 rounded-lg hover:bg-surface-container-low transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className="bg-primary-container text-on-primary rounded-full px-6 py-3 font-heading text-sm font-semibold text-center hover:bg-primary transition-colors mt-1"
            >
              Sign Up
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
