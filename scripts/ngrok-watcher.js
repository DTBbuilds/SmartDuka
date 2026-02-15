#!/usr/bin/env node
/**
 * Ngrok URL Watcher
 * 
 * This script monitors ngrok's local API and automatically updates
 * the MPESA_CALLBACK_URL environment variable when the tunnel URL changes.
 * 
 * Usage:
 *   node scripts/ngrok-watcher.js
 * 
 * Or add to package.json scripts:
 *   "ngrok:watch": "node scripts/ngrok-watcher.js"
 * 
 * Prerequisites:
 *   1. Start ngrok: ngrok http 5000
 *   2. Run this script in another terminal
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { exec } = require('child_process');

// Configuration
const NGROK_API_URL = 'http://127.0.0.1:4040/api/tunnels';
const ENV_FILE_PATH = path.join(__dirname, '..', 'apps', 'api', '.env');
const CHECK_INTERVAL_MS = 5000; // Check every 5 seconds
const CALLBACK_PATH = '/payments/mpesa/callback';
const AUTO_RESTART_API = false; // Set to true to auto-restart API on URL change

let currentNgrokUrl = null;
let lastCheckTime = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

/**
 * Fetch ngrok tunnel information from local API
 */
async function getNgrokUrl() {
  return new Promise((resolve, reject) => {
    const req = http.get(NGROK_API_URL, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const tunnels = JSON.parse(data);
          // Find the HTTPS tunnel
          const httpsTunnel = tunnels.tunnels?.find(
            (t) => t.proto === 'https' && t.config?.addr?.includes('5000')
          );
          
          if (httpsTunnel) {
            resolve(httpsTunnel.public_url);
          } else if (tunnels.tunnels?.length > 0) {
            // Fallback to first HTTPS tunnel
            const anyHttps = tunnels.tunnels.find((t) => t.proto === 'https');
            resolve(anyHttps?.public_url || null);
          } else {
            resolve(null);
          }
        } catch (err) {
          reject(new Error('Failed to parse ngrok response'));
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.setTimeout(3000, () => {
      req.destroy();
      reject(new Error('Ngrok API timeout'));
    });
  });
}

/**
 * Update the .env file with new ngrok URL
 */
function updateEnvFile(ngrokUrl) {
  const callbackUrl = `${ngrokUrl}${CALLBACK_PATH}`;
  
  try {
    // Check if .env file exists
    if (!fs.existsSync(ENV_FILE_PATH)) {
      logWarning(`.env file not found at ${ENV_FILE_PATH}`);
      logInfo(`Creating .env file from .env.example...`);
      
      const examplePath = ENV_FILE_PATH.replace('.env', '.env.example');
      if (fs.existsSync(examplePath)) {
        fs.copyFileSync(examplePath, ENV_FILE_PATH);
      } else {
        // Create minimal .env
        fs.writeFileSync(ENV_FILE_PATH, `MPESA_CALLBACK_URL=${callbackUrl}\n`);
        logSuccess(`Created .env with MPESA_CALLBACK_URL`);
        return true;
      }
    }
    
    // Read current .env content
    let envContent = fs.readFileSync(ENV_FILE_PATH, 'utf8');
    
    // Check if MPESA_CALLBACK_URL exists
    const callbackRegex = /^MPESA_CALLBACK_URL=.*/m;
    
    if (callbackRegex.test(envContent)) {
      // Update existing value
      envContent = envContent.replace(callbackRegex, `MPESA_CALLBACK_URL=${callbackUrl}`);
    } else {
      // Add new value
      envContent += `\n# Auto-updated by ngrok-watcher\nMPESA_CALLBACK_URL=${callbackUrl}\n`;
    }
    
    fs.writeFileSync(ENV_FILE_PATH, envContent);
    return true;
  } catch (err) {
    logError(`Failed to update .env file: ${err.message}`);
    return false;
  }
}

/**
 * Display current status
 */
function displayStatus() {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.cyan}${colors.bright}  🔗 NGROK URL WATCHER${colors.reset}`);
  console.log('='.repeat(60));
  
  if (currentNgrokUrl) {
    console.log(`\n  ${colors.green}Current ngrok URL:${colors.reset}`);
    console.log(`  ${colors.bright}${currentNgrokUrl}${colors.reset}`);
    console.log(`\n  ${colors.green}M-Pesa Callback URL:${colors.reset}`);
    console.log(`  ${colors.bright}${currentNgrokUrl}${CALLBACK_PATH}${colors.reset}`);
  } else {
    console.log(`\n  ${colors.yellow}Waiting for ngrok...${colors.reset}`);
    console.log(`  Run: ${colors.bright}ngrok http 5000${colors.reset}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`  Checking every ${CHECK_INTERVAL_MS / 1000}s | Press Ctrl+C to stop`);
  console.log('='.repeat(60) + '\n');
}

/**
 * Main check loop
 */
async function checkNgrok() {
  try {
    const ngrokUrl = await getNgrokUrl();
    lastCheckTime = new Date();
    
    if (!ngrokUrl) {
      if (currentNgrokUrl) {
        logWarning('Ngrok tunnel disconnected');
        currentNgrokUrl = null;
        displayStatus();
      }
      return;
    }
    
    // Check if URL changed
    if (ngrokUrl !== currentNgrokUrl) {
      const isNewConnection = !currentNgrokUrl;
      currentNgrokUrl = ngrokUrl;
      
      if (isNewConnection) {
        logSuccess(`Ngrok tunnel detected: ${ngrokUrl}`);
      } else {
        logWarning(`Ngrok URL changed: ${ngrokUrl}`);
      }
      
      // Update .env file
      if (updateEnvFile(ngrokUrl)) {
        logSuccess(`Updated MPESA_CALLBACK_URL in .env`);
        logInfo(`Callback URL: ${ngrokUrl}${CALLBACK_PATH}`);
        logWarning('Restart your API server to apply changes!');
      }
      
      displayStatus();
    }
  } catch (err) {
    if (currentNgrokUrl) {
      logWarning(`Ngrok check failed: ${err.message}`);
      currentNgrokUrl = null;
      displayStatus();
    }
  }
}

/**
 * Start the watcher
 */
async function start() {
  console.clear();
  displayStatus();
  
  logInfo('Starting ngrok watcher...');
  logInfo(`Monitoring: ${NGROK_API_URL}`);
  logInfo(`Updating: ${ENV_FILE_PATH}`);
  
  // Initial check
  await checkNgrok();
  
  // Start interval
  setInterval(checkNgrok, CHECK_INTERVAL_MS);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n');
  logInfo('Stopping ngrok watcher...');
  process.exit(0);
});

// Start the watcher
start().catch((err) => {
  logError(`Failed to start: ${err.message}`);
  process.exit(1);
});
