# SmartDuka SEO Technical Implementation Guide

## Quick Implementation Checklist for Developers

This guide provides specific code implementations for the SmartDuka web application.

---

## 1. HTML Head Template

Every page should include these essential meta tags:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Character Set -->
  <meta charset="UTF-8">
  
  <!-- Viewport for Mobile -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Primary Meta Tags -->
  <title>Page Title | SmartDuka</title>
  <meta name="description" content="Page description here (150-160 characters)">
  <meta name="keywords" content="pos system, inventory management, smartduka">
  <meta name="author" content="SmartDuka">
  
  <!-- Canonical URL -->
  <link rel="canonical" href="https://smartduka.org/current-page">
  
  <!-- Robots -->
  <meta name="robots" content="index, follow">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://smartduka.org/current-page">
  <meta property="og:title" content="Page Title | SmartDuka">
  <meta property="og:description" content="Page description here">
  <meta property="og:image" content="https://smartduka.org/images/og-image.png">
  <meta property="og:site_name" content="SmartDuka">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="https://smartduka.org/current-page">
  <meta name="twitter:title" content="Page Title | SmartDuka">
  <meta name="twitter:description" content="Page description here">
  <meta name="twitter:image" content="https://smartduka.org/images/twitter-card.png">
  
  <!-- Favicon -->
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  
  <!-- Preconnect to External Resources -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  
  <!-- Preload Critical Resources -->
  <link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
</head>
```

---

## 2. Schema Markup Implementation

### Organization Schema (Add to Homepage)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "SmartDuka",
  "url": "https://smartduka.org",
  "logo": "https://smartduka.org/images/logo.png",
  "description": "SmartDuka is an all-in-one POS, inventory management, and ERP system designed for retail businesses.",
  "foundingDate": "2024",
  "sameAs": [
    "https://twitter.com/smartduka",
    "https://www.linkedin.com/company/smartduka",
    "https://www.facebook.com/smartduka",
    "https://www.youtube.com/@smartduka"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+254-XXX-XXX-XXX",
    "contactType": "customer support",
    "availableLanguage": ["English", "Swahili"]
  },
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "KE"
  }
}
</script>
```

### Software Application Schema (Add to Homepage & Features)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "SmartDuka",
  "applicationCategory": "BusinessApplication",
  "applicationSubCategory": "Point of Sale Software",
  "operatingSystem": "Web Browser, Android, iOS",
  "description": "Complete POS and inventory management solution for retail businesses of all sizes.",
  "url": "https://smartduka.org",
  "downloadUrl": "https://smartduka.org/download",
  "screenshot": "https://smartduka.org/images/dashboard-screenshot.png",
  "softwareVersion": "2.0",
  "datePublished": "2024-01-01",
  "offers": {
    "@type": "AggregateOffer",
    "lowPrice": "0",
    "highPrice": "99",
    "priceCurrency": "USD",
    "offerCount": "3"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "250",
    "bestRating": "5",
    "worstRating": "1"
  },
  "featureList": [
    "Point of Sale (POS)",
    "Inventory Management",
    "Sales Reporting & Analytics",
    "Multi-Store Support",
    "Barcode Scanning",
    "Customer Management",
    "Employee Management",
    "Real-time Sync",
    "Offline Mode",
    "Cloud Backup"
  ],
  "author": {
    "@type": "Organization",
    "name": "SmartDuka"
  }
}
</script>
```

### FAQ Schema (Add to FAQ Page)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is SmartDuka?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "SmartDuka is an all-in-one Point of Sale (POS) and inventory management system designed for retail businesses. It helps you manage sales, track inventory, generate reports, and run your business efficiently from any device."
      }
    },
    {
      "@type": "Question",
      "name": "Is SmartDuka free to use?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, SmartDuka offers a free plan with essential features for small businesses. Premium plans with advanced features are available for growing businesses."
      }
    },
    {
      "@type": "Question",
      "name": "Does SmartDuka work offline?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, SmartDuka has offline capabilities. You can continue making sales even without internet connection, and data will automatically sync when you're back online."
      }
    },
    {
      "@type": "Question",
      "name": "What devices does SmartDuka support?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "SmartDuka works on any device with a web browser, including desktop computers, laptops, tablets, and smartphones. We also have native Android and iOS apps available."
      }
    },
    {
      "@type": "Question",
      "name": "Can I manage multiple stores with SmartDuka?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, SmartDuka supports multi-store management. You can manage inventory, sales, and employees across multiple locations from a single dashboard."
      }
    }
  ]
}
</script>
```

### Breadcrumb Schema

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://smartduka.org"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Features",
      "item": "https://smartduka.org/features"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Inventory Management",
      "item": "https://smartduka.org/features/inventory-management"
    }
  ]
}
</script>
```

---

## 3. robots.txt Configuration

Create file at: `public/robots.txt`

```txt
# SmartDuka robots.txt
# https://smartduka.org/robots.txt

User-agent: *
Allow: /

# Disallow admin and app areas
Disallow: /admin/
Disallow: /admin/*
Disallow: /api/
Disallow: /api/*
Disallow: /dashboard/
Disallow: /dashboard/*
Disallow: /app/
Disallow: /app/*

# Disallow authentication pages
Disallow: /login
Disallow: /register
Disallow: /forgot-password
Disallow: /reset-password

# Disallow internal search results
Disallow: /search?*
Disallow: /*?*sort=
Disallow: /*?*filter=

# Disallow utility pages
Disallow: /print/
Disallow: /export/
Disallow: /download/

# Allow important CSS and JS for rendering
Allow: /css/
Allow: /js/
Allow: /images/

# Sitemaps
Sitemap: https://smartduka.org/sitemap.xml
Sitemap: https://smartduka.org/sitemap-blog.xml

# Crawl-delay for specific bots (optional)
User-agent: AhrefsBot
Crawl-delay: 10

User-agent: SemrushBot
Crawl-delay: 10
```

---

## 4. XML Sitemap Structure

Create file at: `public/sitemap.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
  
  <!-- Homepage - Highest Priority -->
  <url>
    <loc>https://smartduka.org/</loc>
    <lastmod>2026-02-01</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Main Pages -->
  <url>
    <loc>https://smartduka.org/features</loc>
    <lastmod>2026-02-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  
  <url>
    <loc>https://smartduka.org/pricing</loc>
    <lastmod>2026-02-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  
  <!-- Feature Pages -->
  <url>
    <loc>https://smartduka.org/features/pos-system</loc>
    <lastmod>2026-02-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <url>
    <loc>https://smartduka.org/features/inventory-management</loc>
    <lastmod>2026-02-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <url>
    <loc>https://smartduka.org/features/sales-reports</loc>
    <lastmod>2026-02-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <!-- Industries -->
  <url>
    <loc>https://smartduka.org/industries/retail</loc>
    <lastmod>2026-02-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <url>
    <loc>https://smartduka.org/industries/restaurant</loc>
    <lastmod>2026-02-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <!-- Resources -->
  <url>
    <loc>https://smartduka.org/blog</loc>
    <lastmod>2026-02-01</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
  
  <url>
    <loc>https://smartduka.org/help</loc>
    <lastmod>2026-02-01</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
  
  <url>
    <loc>https://smartduka.org/contact</loc>
    <lastmod>2026-02-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  
  <url>
    <loc>https://smartduka.org/about</loc>
    <lastmod>2026-02-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  
</urlset>
```

---

## 5. Next.js/React SEO Component

If using Next.js, create a reusable SEO component:

```tsx
// components/SEO.tsx
import Head from 'next/head';

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  image?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  noindex?: boolean;
}

const defaultImage = 'https://smartduka.org/images/og-default.png';
const siteName = 'SmartDuka';
const twitterHandle = '@smartduka';

export default function SEO({
  title,
  description,
  canonical,
  image = defaultImage,
  type = 'website',
  publishedTime,
  modifiedTime,
  noindex = false,
}: SEOProps) {
  const fullTitle = `${title} | ${siteName}`;
  const url = canonical || (typeof window !== 'undefined' ? window.location.href : '');

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      
      {/* Robots */}
      <meta 
        name="robots" 
        content={noindex ? 'noindex, nofollow' : 'index, follow'} 
      />
      
      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content={siteName} />
      
      {/* Article specific (for blog posts) */}
      {publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={twitterHandle} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Head>
  );
}
```

**Usage:**

```tsx
// pages/features/inventory-management.tsx
import SEO from '@/components/SEO';

export default function InventoryManagementPage() {
  return (
    <>
      <SEO
        title="Inventory Management Software"
        description="Track stock in real-time, automate reorder alerts, and manage inventory across multiple locations. Start free with SmartDuka."
        canonical="https://smartduka.org/features/inventory-management"
      />
      <main>
        {/* Page content */}
      </main>
    </>
  );
}
```

---

## 6. Performance Optimization

### Image Optimization Component

```tsx
// components/OptimizedImage.tsx
import Image from 'next/image';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className,
}: OptimizedImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      loading={priority ? 'eager' : 'lazy'}
      className={className}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    />
  );
}
```

### Lazy Loading for Below-the-Fold Content

```tsx
// components/LazySection.tsx
import { useEffect, useRef, useState } from 'react';

interface LazySectionProps {
  children: React.ReactNode;
  className?: string;
}

export default function LazySection({ children, className }: LazySectionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={sectionRef} className={className}>
      {isVisible ? children : <div style={{ minHeight: '400px' }} />}
    </div>
  );
}
```

---

## 7. Next.js Configuration for SEO

```js
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode
  reactStrictMode: true,
  
  // Image optimization
  images: {
    domains: ['smartduka.org', 'cdn.smartduka.org'],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Redirects for SEO
  async redirects() {
    return [
      // Redirect www to non-www (or vice versa)
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.smartduka.org' }],
        destination: 'https://smartduka.org/:path*',
        permanent: true,
      },
      // Redirect old URLs if any
      {
        source: '/pos',
        destination: '/features/pos-system',
        permanent: true,
      },
      {
        source: '/inventory',
        destination: '/features/inventory-management',
        permanent: true,
      },
    ];
  },
  
  // Headers for security and caching
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      // Cache static assets
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // Generate sitemap and robots.txt
  // Use next-sitemap package for automatic generation
};

module.exports = nextConfig;
```

---

## 8. Automated Sitemap Generation

Install next-sitemap: `npm install next-sitemap`

```js
// next-sitemap.config.js
/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://smartduka.org',
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  
  // Exclude internal pages
  exclude: [
    '/admin/*',
    '/dashboard/*',
    '/app/*',
    '/api/*',
    '/login',
    '/register',
    '/forgot-password',
  ],
  
  // Custom robots.txt policies
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/dashboard/', '/app/', '/api/', '/login', '/register'],
      },
    ],
    additionalSitemaps: [
      'https://smartduka.org/sitemap-blog.xml',
    ],
  },
  
  // Transform function for custom priorities
  transform: async (config, path) => {
    // Homepage
    if (path === '/') {
      return {
        loc: path,
        changefreq: 'weekly',
        priority: 1.0,
        lastmod: new Date().toISOString(),
      };
    }
    
    // Feature pages
    if (path.startsWith('/features')) {
      return {
        loc: path,
        changefreq: 'monthly',
        priority: 0.8,
        lastmod: new Date().toISOString(),
      };
    }
    
    // Blog posts
    if (path.startsWith('/blog/')) {
      return {
        loc: path,
        changefreq: 'weekly',
        priority: 0.7,
        lastmod: new Date().toISOString(),
      };
    }
    
    // Default
    return {
      loc: path,
      changefreq: 'monthly',
      priority: 0.5,
      lastmod: new Date().toISOString(),
    };
  },
};
```

Add to package.json scripts:

```json
{
  "scripts": {
    "postbuild": "next-sitemap"
  }
}
```

---

## 9. Google Search Console Verification

Add one of these verification methods:

### Option 1: HTML Meta Tag (Easiest)

```html
<meta name="google-site-verification" content="YOUR_VERIFICATION_CODE" />
```

### Option 2: HTML File

Upload `google[verification-code].html` to the root of your website.

### Option 3: DNS TXT Record

Add a TXT record to your domain's DNS:
```
google-site-verification=YOUR_VERIFICATION_CODE
```

---

## 10. Analytics Setup

### Google Analytics 4 (GA4)

```tsx
// components/Analytics.tsx
import Script from 'next/script';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function Analytics() {
  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}
```

### Track Conversions

```ts
// utils/analytics.ts
export const trackEvent = (
  action: string,
  category: string,
  label?: string,
  value?: number
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// Usage examples:
// trackEvent('signup_started', 'conversion');
// trackEvent('trial_activated', 'conversion');
// trackEvent('feature_viewed', 'engagement', 'inventory_management');
```

---

## Quick Implementation Checklist

```
Technical SEO Setup:
□ Add meta tags template to all pages
□ Implement canonical URLs
□ Create robots.txt
□ Generate XML sitemap
□ Add schema markup (Organization, SoftwareApplication, FAQ)
□ Set up 301 redirects for old URLs
□ Enable HTTPS and HSTS
□ Verify in Google Search Console
□ Verify in Bing Webmaster Tools
□ Set up Google Analytics 4
□ Implement conversion tracking

Performance:
□ Optimize images (WebP, lazy loading)
□ Minify CSS and JavaScript
□ Enable compression (Gzip/Brotli)
□ Implement CDN
□ Test Core Web Vitals (PageSpeed Insights)
□ Fix any mobile usability issues

Ongoing:
□ Monitor Search Console for errors weekly
□ Update sitemap when adding new pages
□ Keep content fresh and updated
□ Build quality backlinks monthly
□ Track keyword rankings
```

---

*Technical Implementation Guide v1.0*
*Last Updated: February 2026*
