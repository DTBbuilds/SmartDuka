/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://www.smartduka.org',
  generateRobotsTxt: false,
  generateIndexSitemap: false,
  outDir: 'public',
  
  // Exclude ALL authenticated/private/app routes from sitemap
  exclude: [
    // Auth routes
    '/login',
    '/signup',
    '/register-shop',
    '/select-plan',
    '/onboarding',
    '/onboarding/*',
    '/auth/*',
    '/verification-pending',
    '/verification-rejected',
    // Admin routes
    '/admin',
    '/admin/*',
    '/super-admin',
    '/super-admin/*',
    '/cashier',
    '/cashier/*',
    '/branch-manager',
    '/branch-manager/*',
    // App routes
    '/pos',
    '/pos/*',
    '/dashboard',
    '/dashboard/*',
    '/settings',
    '/settings/*',
    '/inbox',
    '/inbox/*',
    '/orders',
    '/orders/*',
    '/customers',
    '/customers/*',
    '/suppliers',
    '/suppliers/*',
    '/purchases',
    '/purchases/*',
    '/stock',
    '/stock/*',
    '/reports',
    '/reports/*',
    '/users',
    '/users/*',
    '/inventory',
    '/inventory/*',
    '/payments',
    '/payments/*',
    // API and system routes
    '/api',
    '/api/*',
    '/_next/*',
    '/404',
    '/500',
  ],
  
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: [
          '/',
        ],
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
          '/pos',
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
    additionalSitemaps: [],
  },
  
  // Transform function to add priority and changefreq
  transform: async (config, path) => {
    // Skip private routes entirely
    const privateRoutes = [
      '/login', '/signup', '/admin', '/pos', '/dashboard',
      '/settings', '/onboarding', '/inbox', '/orders', '/customers',
      '/suppliers', '/purchases', '/stock', '/reports', '/users',
      '/inventory', '/payments', '/auth', '/verification', '/select-plan',
      '/register-shop', '/super-admin', '/cashier', '/branch-manager', '/help'
    ];
    
    if (privateRoutes.some(route => path === route || path.startsWith(route + '/'))) {
      return null; // Exclude from sitemap
    }
    
    // Default values
    let priority = 0.7;
    let changefreq = 'weekly';
    
    // High priority pages - Marketing & SEO critical
    if (path === '/') {
      priority = 1.0;
      changefreq = 'daily';
    } else if (path === '/point-of-sale-software') {
      priority = 0.95;
      changefreq = 'weekly';
    } else if (path === '/inventory-management-software') {
      priority = 0.95;
      changefreq = 'weekly';
    } else if (path === '/reports-and-analytics') {
      priority = 0.9;
      changefreq = 'weekly';
    } else if (path === '/barcode-pos-system') {
      priority = 0.9;
      changefreq = 'weekly';
    } else if (path === '/pricing') {
      priority = 0.9;
      changefreq = 'weekly';
    } else if (path === '/features') {
      priority = 0.85;
      changefreq = 'weekly';
    } else if (path.startsWith('/features/')) {
      priority = 0.8;
      changefreq = 'weekly';
    } else if (path === '/blog') {
      priority = 0.8;
      changefreq = 'daily';
    } else if (path.startsWith('/blog/')) {
      priority = 0.7;
      changefreq = 'weekly';
    } else if (path === '/contact') {
      priority = 0.8;
      changefreq = 'monthly';
    } else if (path === '/support') {
      priority = 0.7;
      changefreq = 'monthly';
    } else if (path === '/privacy' || path === '/terms') {
      priority = 0.3;
      changefreq = 'yearly';
    }
    
    return {
      loc: path,
      changefreq,
      priority,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
    };
  },
};
