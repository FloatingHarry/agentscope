import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { IBM_Plex_Mono, Manrope } from "next/font/google";

import { SiteHeader, SiteHeaderFallback } from "@/components/shared/site-header";

import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-product-intelligence-agent.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AI Product Intelligence Agent",
    template: "%s | AI Product Intelligence Agent",
  },
  description:
    "A mock-first competitive intelligence dashboard for tracking AI product updates, classifying feature change, comparing competitors, and generating weekly briefs.",
  applicationName: "AI Product Intelligence Agent",
  keywords: [
    "AI product intelligence",
    "competitive intelligence dashboard",
    "Next.js portfolio project",
    "AI product updates",
    "product strategy",
    "mock-first architecture",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    title: "AI Product Intelligence Agent",
    description:
      "Track AI product movement through a mock-first pipeline that normalizes updates, classifies feature change, compares competitors, and generates weekly briefings.",
    siteName: "AI Product Intelligence Agent",
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "AI Product Intelligence Agent share card",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Product Intelligence Agent",
    description:
      "Competitive signals for AI product and strategy teams, built as a mock-first portfolio demo.",
    images: ["/twitter-image"],
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: ["/icon.svg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f5ef",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <div className="relative min-h-screen overflow-x-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top_left,rgba(16,163,154,0.18),transparent_38%),radial-gradient(circle_at_top_right,rgba(76,174,115,0.12),transparent_30%),linear-gradient(180deg,rgba(247,245,239,0.96),rgba(247,245,239,1))]" />
          <div className="relative">
            <Suspense fallback={<SiteHeaderFallback />}>
              <SiteHeader />
            </Suspense>
            <main>{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
