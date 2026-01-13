import Script from 'next/script';

// Organization Schema
export function OrganizationJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'SmartDuka',
    description: 'Modern Point of Sale and Inventory Management System for Kenyan Retailers',
    url: 'https://smartduka.co.ke',
    logo: 'https://smartduka.co.ke/icons/icon.svg',
    sameAs: [
      'https://twitter.com/smartduka',
      'https://facebook.com/smartduka',
      'https://linkedin.com/company/smartduka',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+254-700-000-000',
      contactType: 'customer service',
      areaServed: 'KE',
      availableLanguage: ['English', 'Swahili'],
    },
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'KE',
      addressLocality: 'Nairobi',
    },
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
    name: 'SmartDuka POS',
    description: 'Complete Point of Sale and Inventory Management System with M-Pesa integration for Kenyan retailers. Manage sales, inventory, employees, and customers from one platform.',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Point of Sale Software',
    operatingSystem: 'Web, Android, iOS',
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'KES',
      lowPrice: '2500',
      highPrice: '15000',
      offerCount: '4',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '150',
      bestRating: '5',
      worstRating: '1',
    },
    featureList: [
      'M-Pesa Payment Integration',
      'Real-time Inventory Tracking',
      'Multi-branch Management',
      'Sales Analytics & Reports',
      'Employee Management',
      'Customer Loyalty Programs',
      'Offline Mode Support',
      'Barcode Scanning',
    ],
    screenshot: 'https://smartduka.co.ke/screenshots/pos-desktop.png',
    softwareVersion: '2.0',
    releaseNotes: 'https://smartduka.co.ke/changelog',
    author: {
      '@type': 'Organization',
      name: 'SmartDuka',
    },
    maintainer: {
      '@type': 'Organization',
      name: 'SmartDuka',
    },
    datePublished: '2024-01-01',
    inLanguage: ['en', 'sw'],
    isAccessibleForFree: false,
    countriesSupported: ['Kenya', 'Uganda', 'Tanzania', 'Rwanda'],
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
    name: 'SmartDuka',
    description: 'Modern Point of Sale and Inventory Management System for Kenyan Retailers',
    url: 'https://smartduka.co.ke',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://smartduka.co.ke/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
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
export function LocalBusinessJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareCompany',
    name: 'SmartDuka',
    description: 'Leading Point of Sale and Inventory Management Software provider in Kenya',
    url: 'https://smartduka.co.ke',
    telephone: '+254-700-000-000',
    email: 'support@smartduka.co.ke',
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
        url: 'https://smartduka.co.ke/icons/icon.svg',
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
