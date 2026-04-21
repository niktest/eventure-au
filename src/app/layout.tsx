import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Eventure — Discover Events Near You",
    template: "%s | Eventure",
  },
  description:
    "Discover the best events happening near you — live music, festivals, markets, sports, family fun, nightlife, and more. Starting on the Gold Coast.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://eventure.com.au"
  ),
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: "Eventure",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-AU">
      <body className="min-h-screen bg-white text-slate-900 font-body antialiased">
        <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
            <a href="/" className="font-heading text-2xl font-bold tracking-tight text-slate-900">
              Eventure
            </a>
            <div className="flex items-center gap-6 text-sm font-medium">
              <a href="/events" className="text-slate-700 transition-colors hover:text-coral">
                Events
              </a>
              <a href="/city/gold-coast" className="text-slate-700 transition-colors hover:text-coral">
                Gold Coast
              </a>
              <a href="/about" className="text-slate-700 transition-colors hover:text-coral">
                About
              </a>
              <a href="/contact" className="text-slate-700 transition-colors hover:text-coral">
                Contact
              </a>
            </div>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="mt-16 border-t border-slate-100 bg-slate-900 py-12 text-center text-sm text-slate-300">
          © {new Date().getFullYear()} Eventure. All rights reserved.
        </footer>
      </body>
    </html>
  );
}
