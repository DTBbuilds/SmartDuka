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
  metadataBase: new URL(process.env.SITE_URL || 'https://smartduka.co.ke'),
  title: {
    default: "SmartDuka - #1 POS & Inventory Management System in Kenya",
    template: "%s | SmartDuka",
  },
  description: "Kenya's leading Point of Sale and Inventory Management System. Features M-Pesa integration, real-time stock tracking, sales analytics, and multi-branch support for retail businesses.",
  keywords: [
    "POS system Kenya",
    "point of sale software Kenya",
    "inventory management Kenya",
    "M-Pesa POS integration",
    "retail software Nairobi",
    "SmartDuka",
    "duka management software",
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
    title: "SmartDuka - #1 POS & Inventory Management System in Kenya",
    description: "Kenya's leading POS system with M-Pesa integration, inventory tracking, and sales analytics for retail businesses.",
    locale: "en_KE",
    images: [
      {
        url: "/screenshots/pos-desktop.png",
        width: 1280,
        height: 720,
        alt: "SmartDuka POS Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SmartDuka - Kenya's #1 POS System",
    description: "Complete POS & inventory management with M-Pesa integration for Kenyan retailers.",
    images: ["/screenshots/pos-desktop.png"],
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
    // Add your Google Search Console verification code here
    // google: "your-verification-code",
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
