import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import { MobileNav } from "@/components/MobileNav";
import { DesktopSearch } from "@/components/DesktopSearch";
import { Footer } from "@/components/Footer";
import { getSiteUrl } from "@/lib/seo/site-url";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  weight: ["500", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Eventure Discovery — Find Your Vibe",
    template: "%s | Eventure Discovery",
  },
  description:
    "Discover the best events happening near you — live music, festivals, markets, sports, family fun, nightlife, and more. Starting on the Gold Coast.",
  metadataBase: new URL(getSiteUrl()),
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: "Eventure Discovery",
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
    <html lang="en-AU" className={`${inter.variable} ${plusJakarta.variable}`}>
      <body className="min-h-screen bg-background text-on-surface font-body antialiased flex flex-col">
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>

        {/* Top Navigation Bar */}
        <header className="fixed top-0 w-full z-50 border-b border-surface-container-high bg-white/90 backdrop-blur-md shadow-sm">
          <div className="flex justify-between items-center h-16 px-6 md:px-12 max-w-[1280px] mx-auto">
            {/* Brand */}
            <Link
              href="/"
              className="text-2xl font-extrabold tracking-tighter text-on-surface font-heading"
            >
              Eventure Discovery
            </Link>

            {/* Desktop Search */}
            <DesktopSearch />

            {/* Desktop Nav + Actions */}
            <MobileNav />
          </div>
        </header>

        {/* Main content with top padding for fixed header */}
        <main id="main-content" className="flex-grow pt-16">{children}</main>

        <Footer />
      </body>
    </html>
  );
}
