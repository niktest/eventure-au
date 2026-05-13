import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { MobileNav } from "@/components/MobileNav";
import { DesktopSearch } from "@/components/DesktopSearch";
import { Footer } from "@/components/Footer";
import { HeaderCityPickerSlot } from "@/components/HeaderCityPickerSlot";
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
    default: "Festlio — What's on near you",
    template: "%s | Festlio",
  },
  description:
    "Find what's on near you tonight — live music, festivals, markets, sport and more. Festlio aggregates Australia's events into one calendar, starting on the Gold Coast.",
  metadataBase: new URL(getSiteUrl()),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: "Festlio",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Festlio — Find what's on near you.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.png"],
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
            <Link href="/" aria-label="Festlio — home" className="inline-flex items-center">
              <Image
                src="/brand/festlio-wordmark.svg"
                alt="Festlio"
                width={140}
                height={42}
                priority
              />
            </Link>

            {/* Desktop Search */}
            <DesktopSearch />

            {/* City picker — visible on every page (EVE-209) */}
            <Suspense fallback={<div className="hidden md:block w-[140px]" />}>
              <HeaderCityPickerSlot />
            </Suspense>

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
