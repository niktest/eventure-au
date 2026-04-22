import type { Metadata } from "next";
import { MobileNav } from "@/components/MobileNav";
import { Footer } from "@/components/Footer";
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
          <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
            <a href="/" className="flex items-center gap-2 font-heading text-2xl font-bold tracking-tight text-slate-900">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-coral text-sm font-extrabold text-white">
                E
              </span>
              Eventure
            </a>
            <MobileNav />
          </nav>
        </header>
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
