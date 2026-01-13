/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://smartduka.co.ke',
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  
  // Exclude authenticated/private routes from sitemap
  exclude: [
    '/admin/*',
    '/super-admin/*',
    '/cashier/*',
    '/pos/*',
    '/dashboard/*',
    '/settings/*',
    '/onboarding/*',
    '/verification-pending',
    '/verification-rejected',
    '/inbox/*',
    '/orders/*',
    '/customers/*',
    '/suppliers/*',
    '/purchases/*',
    '/stock/*',
    '/reports/*',
    '/users/*',
    '/inventory/*',
    '/payments/*',
    '/branch-manager/*',
    '/select-plan',
    '/register-shop',
  ],
  
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/super-admin',
          '/cashier',
          '/pos',
          '/dashboard',
          '/settings',
          '/onboarding',
          '/api',
          '/verification-pending',
          '/verification-rejected',
          '/inbox',
          '/orders',
          '/customers',
          '/suppliers',
          '/purchases',
          '/stock',
          '/reports',
          '/users',
          '/inventory',
          '/payments',
          '/branch-manager',
          '/select-plan',
          '/register-shop',
        ],
      },
    ],
    additionalSitemaps: [
      // Add blog sitemap when blog is implemented
      // 'https://smartduka.co.ke/blog-sitemap.xml',
    ],
  },
  
  // Transform function to add priority and changefreq
  transform: async (config, path) => {
    // Default values
    let priority = 0.7;
    let changefreq = 'weekly';
    
    // High priority pages
    if (path === '/') {
      priority = 1.0;
      changefreq = 'daily';
    } else if (path === '/pricing') {
      priority = 0.9;
      changefreq = 'weekly';
    } else if (path.startsWith('/features')) {
      priority = 0.8;
      changefreq = 'weekly';
    } else if (path.startsWith('/blog')) {
      priority = 0.6;
      changefreq = 'daily';
    }
    
    return {
      loc: path,
      changefreq,
      priority,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
    };
  },
};
