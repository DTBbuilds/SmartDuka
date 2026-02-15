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
    default: "SmartDuka \u2013 Point of Sale & Inventory Management Software",
    template: "%s | SmartDuka",
  },
  description: "SmartDuka is a web-based point of sale and inventory management software built by DTB Technologies. Manage sales, stock, reports, analytics, and barcode scanning in one system.",
  keywords: [
    "SmartDuka",
    "point of sale software",
    "POS system",
    "inventory management software",
    "stock management system",
    "retail POS software",
    "barcode POS system",
    "sales reports and analytics software",
    "web-based POS system",
    "DTB Technologies",
    "cloud POS",
    "retail management software",
    "small business POS",
    "barcode scanner POS",
    "multi-store POS",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SmartDuka",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "SmartDuka",
    title: "SmartDuka \u2013 Point of Sale & Inventory Management Software",
    description: "SmartDuka is a web-based point of sale and inventory management software built by DTB Technologies. Manage sales, stock, reports, analytics, and barcode scanning in one system.",
    locale: "en_KE",
    url: "https://www.smartduka.org",
  },
  twitter: {
    card: "summary_large_image",
    title: "SmartDuka \u2013 Point of Sale & Inventory Management Software",
    description: "Web-based POS and inventory management software by DTB Technologies. Sales, stock, analytics, barcode scanning.",
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
    { media: "(prefers-color-scheme: light)", color: "#2563eb" },
    { media: "(prefers-color-scheme: dark)", color: "#1e40af" },
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
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
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
