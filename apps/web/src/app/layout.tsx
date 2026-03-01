import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || 'https://www.smartduka.org'),
  title: {
    default: "SmartDuka \u2013 Free Open Source Point of Sale & Inventory Management",
    template: "%s | SmartDuka \u2013 Free POS",
  },
  description: "SmartDuka is a 100% free, open source point of sale and inventory management system. No subscriptions, no hidden fees, no user data collected. Manage sales, stock, reports, analytics, M-Pesa payments, and barcode scanning \u2014 completely free forever.",
  keywords: [
    "SmartDuka",
    "Smart Duka",
    "smart duka",
    "smartduka",
    "Smart Duka POS",
    "Smart Duka point of sale",
    "free point of sale",
    "free POS system",
    "free POS software",
    "open source POS",
    "free inventory management",
    "free stock management",
    "free retail POS",
    "free barcode POS",
    "free sales software",
    "point of sale Kenya",
    "POS system Kenya",
    "free business software",
    "open source inventory management",
    "no subscription POS",
    "free cloud POS",
    "free retail management",
    "free small business POS",
    "M-Pesa POS system",
    "free multi-store POS",
    "DTB Technologies",
    "smartduka.org",
    "free web-based POS",
    "no data collection POS",
    "privacy-first POS",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SmartDuka \u2013 Free POS",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "SmartDuka",
    title: "SmartDuka \u2013 Free Open Source Point of Sale & Inventory Management",
    description: "100% free, open source POS and inventory management. No subscriptions, no hidden fees, no user data collected. M-Pesa integration, barcode scanning, analytics \u2014 all free forever.",
    locale: "en_KE",
    url: "https://www.smartduka.org",
  },
  twitter: {
    card: "summary_large_image",
    title: "SmartDuka \u2013 Free Open Source POS System",
    description: "100% free, open source point of sale & inventory management. No subscriptions, no data collection. Built for African retailers.",
    creator: "@smartduka",
    site: "@smartduka",
  },
  alternates: {
    canonical: "https://www.smartduka.org",
    languages: {
      'en': 'https://www.smartduka.org',
      'en-KE': 'https://www.smartduka.org',
      'x-default': 'https://www.smartduka.org',
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "fmkK_DRPZrp1j_vUZ67HMw9uSRwDxpUES-r7Yt4pvsc",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f97316" },
    { media: "(prefers-color-scheme: dark)", color: "#ea580c" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  interactiveWidget: "resizes-visual",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
