/**
 * PM2 Ecosystem Configuration for SmartDuka
 * 
 * Usage:
 *   Development: pm2 start ecosystem.config.js --env development
 *   Production:  pm2 start ecosystem.config.js --env production
 *   
 * Commands:
 *   pm2 start ecosystem.config.js     - Start all apps
 *   pm2 stop all                      - Stop all apps
 *   pm2 restart all                   - Restart all apps
 *   pm2 reload all                    - Zero-downtime reload
 *   pm2 logs                          - View logs
 *   pm2 monit                         - Monitor dashboard
 *   pm2 save                          - Save current process list
 *   pm2 startup                       - Generate startup script
 */

module.exports = {
  apps: [
    // ============================================
    // API Server (NestJS Backend)
    // ============================================
    {
      name: 'smartduka-api',
      script: 'dist/src/main.js',
      cwd: './apps/api',
      instances: 1, // Single instance (increase for high traffic)
      exec_mode: 'fork', // Fork mode for single instance
      
      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      
      // Auto-restart configuration
      watch: false, // Disable in production (use for dev only)
      max_memory_restart: '500M', // Restart if memory exceeds 500MB
      
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      merge_logs: true,
      
      // Graceful shutdown
      kill_timeout: 5000, // 5 seconds to gracefully shutdown
      wait_ready: true, // Wait for 'ready' signal
      listen_timeout: 10000, // 10 seconds to wait for app to listen
      
      // Restart policy
      exp_backoff_restart_delay: 100, // Exponential backoff on restart
      max_restarts: 10, // Max restarts within min_uptime
      min_uptime: '10s', // Minimum uptime to consider app started
      
      // Health monitoring
      health_check_grace_period: 3000,
    },
    
    // ============================================
    // Web Server (Next.js Frontend) - Optional
    // Note: Usually deployed separately on Vercel/Netlify
    // ============================================
    {
      name: 'smartduka-web',
      script: 'npm',
      args: 'start',
      cwd: './apps/web',
      instances: 1, // Single instance for Next.js
      exec_mode: 'fork',
      
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
      merge_logs: true,
      
      // Restart policy
      max_memory_restart: '300M',
      max_restarts: 10,
      min_uptime: '10s',
      
      // Disable by default (enable if self-hosting)
      autorestart: true,
    },
  ],
  
  // ============================================
  // Deployment Configuration
  // ============================================
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server.com'],
      ref: 'origin/main',
      repo: 'git@github.com:your-org/smartduka.git',
      path: '/var/www/smartduka',
      'pre-deploy-local': '',
      'post-deploy': 'pnpm install && pnpm build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      env: {
        NODE_ENV: 'production',
      },
    },
    staging: {
      user: 'deploy',
      host: ['staging.your-server.com'],
      ref: 'origin/develop',
      repo: 'git@github.com:your-org/smartduka.git',
      path: '/var/www/smartduka-staging',
      'post-deploy': 'pnpm install && pnpm build && pm2 reload ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging',
      },
    },
  },
};
