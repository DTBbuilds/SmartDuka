import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/login',
          '/signup',
          '/register-shop',
          '/select-plan',
          '/onboarding',
          '/auth/',
          '/verification-pending',
          '/verification-rejected',
          '/admin',
          '/super-admin',
          '/cashier',
          '/branch-manager',
          '/dashboard',
          '/settings',
          '/inbox',
          '/orders',
          '/customers',
          '/suppliers',
          '/purchases',
          '/stock',
          '/users',
          '/payments',
          '/api/',
          '/_next/',
        ],
      },
    ],
    sitemap: 'https://www.smartduka.org/sitemap.xml',
    host: 'https://www.smartduka.org',
  };
}
