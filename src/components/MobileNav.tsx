"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const NAV_LINKS = [
  { href: "/events", label: "Browse" },
  { href: "/community", label: "Community" },
  { href: "/discussions", label: "Trending" },
  { href: "/about", label: "About" },
];

export function MobileNav() {
  const [user, setUser] = useState<{ name?: string | null } | null>(null);
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const menuRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const searchPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/events?q=${encodeURIComponent(query.trim())}`);
      setSearchOpen(false);
      setQuery("");
    }
  };

  const closeMenu = useCallback(() => {
    setOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
  }, []);

  // Focus trap for mobile menu
  useEffect(() => {
    if (!open) return;

    const menuEl = menuRef.current;
    if (!menuEl) return;

    const getFocusableElements = () =>
      menuEl.querySelectorAll<HTMLElement>(
        'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMenu();
        return;
      }

      if (e.key !== "Tab") return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // Focus first item on open
    const focusable = getFocusableElements();
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, closeMenu]);

  // Escape key for search panel
  useEffect(() => {
    if (!searchOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeSearch();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen, closeSearch]);

  return (
    <>
      {/* Desktop nav links */}
      <nav className="hidden md:flex items-center gap-6 ml-auto font-heading text-sm font-semibold tracking-tight" aria-label="Main navigation">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-secondary hover:text-primary-container transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Desktop auth actions */}
      <div className="hidden md:flex items-center gap-3 ml-6">
        {user ? (
          <>
            <Link
              href="/profile"
              className="font-heading text-sm font-semibold text-secondary hover:text-primary-container transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
            >
              {user.name ?? "Profile"}
            </Link>
            <button
              type="button"
              onClick={async () => {
                const csrfRes = await fetch("/api/auth/csrf");
                const { csrfToken } = await csrfRes.json();
                await fetch("/api/auth/signout", {
                  method: "POST",
                  headers: { "Content-Type": "application/x-www-form-urlencoded" },
                  body: new URLSearchParams({ csrfToken }),
                });
                window.location.href = "/";
              }}
              className="font-heading text-sm font-semibold text-secondary hover:text-primary-container transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
            >
              Sign Out
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="font-heading text-sm font-semibold text-secondary hover:text-primary-container transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="bg-primary-container text-on-primary rounded-full px-6 py-2 font-heading text-sm font-semibold hover:scale-105 transition-transform duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Sign Up
            </Link>
          </>
        )}
      </div>

      {/* Mobile actions */}
      <div className="flex items-center gap-2 md:hidden">
        <button
          type="button"
          onClick={() => {
            setSearchOpen(!searchOpen);
            setOpen(false);
          }}
          className="p-2 text-secondary hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
          aria-label="Search"
        >
          <span className="material-symbols-outlined text-[22px]" aria-hidden="true">search</span>
        </button>
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => {
            setOpen(!open);
            setSearchOpen(false);
          }}
          className="p-2 -mr-2 text-secondary hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
        >
          <span className="material-symbols-outlined text-[24px]" aria-hidden="true">
            {open ? "close" : "menu"}
          </span>
        </button>
      </div>

      {/* Search bar dropdown */}
      {searchOpen && (
        <div
          ref={searchPanelRef}
          className="absolute top-full left-0 right-0 border-b border-surface-container-high bg-white px-4 py-3 shadow-md z-50"
        >
          <form onSubmit={handleSearch} className="mx-auto flex max-w-2xl gap-2">
            <div className="relative flex-1">
              <label htmlFor="mobile-search" className="sr-only">Search events</label>
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-secondary text-[20px]" aria-hidden="true">
                search
              </span>
              <input
                id="mobile-search"
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
              className="rounded-full bg-primary-container px-5 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Search
            </button>
          </form>
        </div>
      )}

      {/* Mobile menu panel */}
      {open && (
        <nav
          ref={menuRef}
          id="mobile-menu"
          aria-label="Mobile navigation"
          className="md:hidden absolute top-full left-0 right-0 border-b border-surface-container-high bg-white shadow-md z-50"
        >
          <div className="flex flex-col px-6 py-4 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-on-surface font-heading font-semibold text-sm py-3 px-2 rounded-lg hover:bg-surface-container-low transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-surface-container-high my-2" />
            {user ? (
              <>
                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className="text-secondary font-heading font-semibold text-sm py-3 px-2 rounded-lg hover:bg-surface-container-low transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                >
                  {user.name ?? "Profile"}
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    setOpen(false);
                    const csrfRes = await fetch("/api/auth/csrf");
                    const { csrfToken } = await csrfRes.json();
                    await fetch("/api/auth/signout", {
                      method: "POST",
                      headers: { "Content-Type": "application/x-www-form-urlencoded" },
                      body: new URLSearchParams({ csrfToken }),
                    });
                    window.location.href = "/";
                  }}
                  className="text-secondary font-heading font-semibold text-sm py-3 px-2 rounded-lg hover:bg-surface-container-low transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="text-secondary font-heading font-semibold text-sm py-3 px-2 rounded-lg hover:bg-surface-container-low transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className="bg-primary-container text-on-primary rounded-full px-6 py-3 font-heading text-sm font-semibold text-center hover:bg-primary transition-colors mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-container"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </>
  );
}
