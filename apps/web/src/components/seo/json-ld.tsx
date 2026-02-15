import Script from 'next/script';

// Organization Schema
export function OrganizationJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': 'https://www.smartduka.org/#organization',
    name: 'DTB Technologies',
    alternateName: ['DTB Tech', 'DTBTech'],
    description: 'DTB Technologies builds web-based software solutions including SmartDuka, a point of sale and inventory management system.',
    url: 'https://www.dtbtech.org',
    logo: {
      '@type': 'ImageObject',
      '@id': 'https://www.smartduka.org/#logo',
      url: 'https://www.smartduka.org/icons/icon.svg',
      width: 512,
      height: 512,
      caption: 'SmartDuka Logo',
    },
    brand: {
      '@type': 'Brand',
      name: 'SmartDuka',
      url: 'https://www.smartduka.org',
    },
    sameAs: [
      'https://www.dtbtech.org',
      'https://twitter.com/smartduka',
      'https://facebook.com/smartduka',
      'https://linkedin.com/company/smartduka',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+254-729-983-567',
      contactType: 'customer service',
      availableLanguage: ['English', 'Swahili'],
    },
    knowsAbout: ['Point of Sale Software', 'Inventory Management', 'Retail Technology', 'POS Systems'],
  };

  return (
    <Script
      id="organization-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Software Application Schema
export function SoftwareApplicationJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': 'https://www.smartduka.org/#software',
    name: 'SmartDuka',
    alternateName: ['SmartDuka POS', 'Smart Duka', 'SmartDuka Point of Sale', 'SmartDuka Inventory'],
    description: 'Web-based point of sale and inventory management software. Real-time stock tracking, sales reports and analytics, barcode scanning, and multi-store support. Built by DTB Technologies.',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Point of Sale Software',
    operatingSystem: 'Web, Android',
    url: 'https://www.smartduka.org',
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'KES',
      lowPrice: '0',
      highPrice: '15000',
      offerCount: '4',
      availability: 'https://schema.org/InStock',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '150',
      bestRating: '5',
      worstRating: '1',
    },
    review: [
      {
        '@type': 'Review',
        author: { '@type': 'Person', name: 'Mary Wanjiku' },
        reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
        reviewBody: 'SmartDuka transformed how I manage my supermarket. The POS and inventory management features are excellent.',
        datePublished: '2025-10-15',
      },
      {
        '@type': 'Review',
        author: { '@type': 'Person', name: 'John Ochieng' },
        reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
        reviewBody: 'The inventory tracking and stock management saved me from stockouts. Barcode scanning is fast and reliable.',
        datePublished: '2025-11-20',
      },
    ],
    featureList: [
      'Point of Sale (POS) System',
      'Inventory and Stock Management',
      'Real-time Sales Tracking',
      'Sales Reports and Analytics',
      'Barcode Scanner and Camera Integration',
      'Multi-user and Multi-store Support',
      'Cloud-based Web POS System',
    ],
    screenshot: 'https://www.smartduka.org/screenshots/pos-desktop.svg',
    softwareVersion: '2.0',
    downloadUrl: 'https://www.smartduka.org/pricing',
    installUrl: 'https://www.smartduka.org/register-shop',
    author: {
      '@type': 'Organization',
      '@id': 'https://www.smartduka.org/#organization',
    },
    maintainer: {
      '@type': 'Organization',
      '@id': 'https://www.smartduka.org/#organization',
    },
    datePublished: '2024-01-01',
    dateModified: '2026-02-06',
    inLanguage: 'en',
    isAccessibleForFree: true,
    sameAs: 'https://www.smartduka.org',
  };

  return (
    <Script
      id="software-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// FAQ Schema
interface FAQItem {
  question: string;
  answer: string;
}

export function FAQJsonLd({ faqs }: { faqs: FAQItem[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <Script
      id="faq-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Product Schema for Pricing Plans
interface PricingPlan {
  name: string;
  description: string;
  price: number;
  priceCurrency?: string;
}

export function ProductJsonLd({ plan }: { plan: PricingPlan }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `SmartDuka ${plan.name}`,
    description: plan.description,
    brand: {
      '@type': 'Brand',
      name: 'SmartDuka',
    },
    offers: {
      '@type': 'Offer',
      price: plan.price,
      priceCurrency: plan.priceCurrency || 'KES',
      availability: 'https://schema.org/InStock',
      priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      seller: {
        '@type': 'Organization',
        name: 'SmartDuka',
      },
    },
  };

  return (
    <Script
      id={`product-${plan.name.toLowerCase()}-jsonld`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Breadcrumb Schema
interface BreadcrumbItem {
  name: string;
  url: string;
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <Script
      id="breadcrumb-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// WebSite Schema with SearchAction
export function WebSiteJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': 'https://www.smartduka.org/#website',
    name: 'SmartDuka',
    alternateName: ['SmartDuka POS', 'Smart Duka', 'SmartDuka.org'],
    description: 'Point of Sale & Inventory Management Software by DTB Technologies',
    url: 'https://www.smartduka.org',
    publisher: {
      '@type': 'Organization',
      '@id': 'https://www.smartduka.org/#organization',
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://www.smartduka.org/?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
    inLanguage: 'en',
  };

  return (
    <Script
      id="website-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Local Business Schema for Kenya targeting
export function WebPageJsonLd({ name, description, url }: { name: string; description: string; url: string }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    name,
    description,
    url,
    isPartOf: {
      '@id': 'https://www.smartduka.org/#website',
    },
    about: {
      '@id': 'https://www.smartduka.org/#software',
    },
    publisher: {
      '@id': 'https://www.smartduka.org/#organization',
    },
    inLanguage: 'en',
  };

  return (
    <Script
      id="webpage-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function LocalBusinessJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareCompany',
    '@id': 'https://www.smartduka.org/#company',
    name: 'DTB Technologies',
    alternateName: 'SmartDuka',
    description: 'DTB Technologies builds SmartDuka, a web-based point of sale and inventory management software for retail businesses.',
    url: 'https://www.smartduka.org',
    telephone: '+254-729-983-567',
    email: 'smartdukainfo@gmail.com',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Nairobi',
      addressLocality: 'Nairobi',
      addressRegion: 'Nairobi County',
      postalCode: '00100',
      addressCountry: 'KE',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: -1.2921,
      longitude: 36.8219,
    },
    areaServed: [
      { '@type': 'Country', name: 'Kenya' },
      { '@type': 'Country', name: 'Uganda' },
      { '@type': 'Country', name: 'Tanzania' },
    ],
    priceRange: 'KES 2,500 - KES 15,000/month',
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '08:00',
      closes: '18:00',
    },
  };

  return (
    <Script
      id="localbusiness-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Article/Blog Post Schema
interface ArticleProps {
  title: string;
  description: string;
  image: string;
  datePublished: string;
  dateModified?: string;
  author: string;
  url: string;
}

export function ArticleJsonLd({ article }: { article: ArticleProps }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    image: article.image,
    datePublished: article.datePublished,
    dateModified: article.dateModified || article.datePublished,
    author: {
      '@type': 'Person',
      name: article.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'SmartDuka',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.smartduka.org/icons/icon.svg',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': article.url,
    },
  };

  return (
    <Script
      id="article-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
