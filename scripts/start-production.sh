#!/bin/bash
# SmartDuka Production Startup Script
# Usage: ./scripts/start-production.sh

set -e

echo "🚀 Starting SmartDuka in production mode..."

# Create logs directory if it doesn't exist
mkdir -p logs

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed. Installing globally..."
    npm install -g pm2
fi

# Build the API
echo "📦 Building API..."
cd apps/api
pnpm build
cd ../..

# Build the Web app (optional - usually deployed on Vercel)
# echo "📦 Building Web..."
# cd apps/web
# pnpm build
# cd ../..

# Start with PM2
echo "🔄 Starting services with PM2..."
pm2 start ecosystem.config.js --env production

# Save PM2 process list
pm2 save

# Display status
echo ""
echo "✅ SmartDuka is now running!"
echo ""
pm2 status

echo ""
echo "📊 Useful commands:"
echo "   pm2 logs          - View logs"
echo "   pm2 monit         - Monitor dashboard"
echo "   pm2 restart all   - Restart all services"
echo "   pm2 stop all      - Stop all services"
