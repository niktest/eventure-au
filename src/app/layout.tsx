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
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <header className="border-b border-gray-200">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
            <a href="/" className="text-2xl font-bold tracking-tight">
              Eventure
            </a>
            <div className="flex gap-6 text-sm font-medium">
              <a href="/events" className="hover:text-blue-600">
                Events
              </a>
              <a href="/city/gold-coast" className="hover:text-blue-600">
                Gold Coast
              </a>
            </div>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="mt-16 border-t border-gray-200 py-8 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} Eventure. All rights reserved.
        </footer>
      </body>
    </html>
  );
}
