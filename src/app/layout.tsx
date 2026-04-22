import type { Metadata } from "next";
import { MobileNav } from "@/components/MobileNav";
import { Footer } from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Eventure Discovery — Find Your Vibe",
    template: "%s | Eventure Discovery",
  },
  description:
    "Discover the best events happening near you — live music, festivals, markets, sports, family fun, nightlife, and more. Starting on the Gold Coast.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://eventure.com.au"
  ),
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
    <html lang="en-AU">
      <body className="min-h-screen bg-background text-on-surface font-body antialiased flex flex-col">
        {/* Top Navigation Bar */}
        <header className="fixed top-0 w-full z-50 border-b border-surface-container-high bg-white/90 backdrop-blur-md shadow-sm">
          <div className="flex justify-between items-center h-16 px-6 md:px-12 max-w-[1280px] mx-auto">
            {/* Brand */}
            <a
              href="/"
              className="text-2xl font-extrabold tracking-tighter text-on-surface font-heading"
            >
              Eventure Discovery
            </a>

            {/* Desktop Search */}
            <div className="hidden md:flex flex-1 ml-6 max-w-md">
              <div className="relative w-full">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[20px]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search events..."
                  className="w-full pl-10 pr-4 py-2 bg-surface-bright border border-secondary-container rounded-lg focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container font-body text-sm text-on-surface"
                />
              </div>
            </div>

            {/* Desktop Nav + Actions */}
            <MobileNav />
          </div>
        </header>

        {/* Main content with top padding for fixed header */}
        <main className="flex-grow pt-16">{children}</main>

        <Footer />
      </body>
    </html>
  );
}
