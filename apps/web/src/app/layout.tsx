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
    default: 'SmartDuka | Point of Sale, Inventory and Shop Management',
    template: '%s | SmartDuka',
  },
  description: 'Run your shop smarter with SmartDuka. Manage sales, stock, cashiers, receipts and daily performance in one point of sale system. Start at no cost during the introductory period.',
  keywords: [
    'SmartDuka', 'Smart Duka', 'SmartDuka POS', 'point of sale',
    'retail POS system', 'inventory management', 'shop management',
    'barcode scanner POS', 'sales reporting', 'cashier software',
    'small business POS', 'POS system Kenya', 'POS system Australia',
    'start a shop', 'retail management software',
  ],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SmartDuka POS',
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    siteName: 'SmartDuka',
    title: 'SmartDuka | Run Your Shop Smarter',
    description: 'Sell faster, manage inventory and see your shop performance in one organised point of sale workspace.',
    locale: 'en_KE',
    url: 'https://www.smartduka.org',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SmartDuka | Run Your Shop Smarter',
    description: 'A better retail routine starts with SmartDuka POS and shop management.',
  },
  alternates: {
    canonical: 'https://www.smartduka.org',
    languages: {
      en: 'https://www.smartduka.org',
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
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'fmkK_DRPZrp1j_vUZ67HMw9uSRwDxpUES-r7Yt4pvsc',
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
