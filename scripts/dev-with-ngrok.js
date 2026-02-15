#!/usr/bin/env node
/**
 * Development Server with Ngrok
 * 
 * This script:
 * 1. Starts ngrok tunnel
 * 2. Watches for URL changes and updates .env
 * 3. Optionally restarts the API server when URL changes
 * 
 * Usage:
 *   node scripts/dev-with-ngrok.js
 * 
 * Or add to package.json scripts:
 *   "dev:ngrok": "node scripts/dev-with-ngrok.js"
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

// Configuration
const API_PORT = 5000;
const NGROK_API_URL = 'http://127.0.0.1:4040/api/tunnels';
const ENV_FILE_PATH = path.join(__dirname, '..', 'apps', 'api', '.env');
const CALLBACK_PATH = '/payments/mpesa/callback';

let ngrokProcess = null;
let currentNgrokUrl = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(prefix, message, color = 'reset') {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${colors[color]}[${timestamp}] [${prefix}] ${message}${colors.reset}`);
}

/**
 * Check if ngrok is installed
 */
function checkNgrokInstalled() {
  return new Promise((resolve) => {
    exec('ngrok version', (error) => {
      resolve(!error);
    });
  });
}

/**
 * Start ngrok tunnel
 */
function startNgrok() {
  return new Promise((resolve, reject) => {
    log('NGROK', `Starting tunnel to port ${API_PORT}...`, 'cyan');
    
    ngrokProcess = spawn('ngrok', ['http', API_PORT.toString()], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });
    
    ngrokProcess.on('error', (err) => {
      log('NGROK', `Failed to start: ${err.message}`, 'red');
      reject(err);
    });
    
    ngrokProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        log('NGROK', `Exited with code ${code}`, 'yellow');
      }
    });
    
    // Wait for ngrok to start
    setTimeout(() => {
      resolve();
    }, 2000);
  });
}

/**
 * Fetch ngrok tunnel URL
 */
async function getNgrokUrl() {
  return new Promise((resolve, reject) => {
    const req = http.get(NGROK_API_URL, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const tunnels = JSON.parse(data);
          const httpsTunnel = tunnels.tunnels?.find(
            (t) => t.proto === 'https'
          );
          resolve(httpsTunnel?.public_url || null);
        } catch (err) {
          reject(err);
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(3000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

/**
 * Update .env file with ngrok URL
 */
function updateEnvFile(ngrokUrl) {
  const callbackUrl = `${ngrokUrl}${CALLBACK_PATH}`;
  
  try {
    if (!fs.existsSync(ENV_FILE_PATH)) {
      const examplePath = ENV_FILE_PATH.replace('.env', '.env.example');
      if (fs.existsSync(examplePath)) {
        fs.copyFileSync(examplePath, ENV_FILE_PATH);
      }
    }
    
    let envContent = fs.existsSync(ENV_FILE_PATH) 
      ? fs.readFileSync(ENV_FILE_PATH, 'utf8')
      : '';
    
    const callbackRegex = /^MPESA_CALLBACK_URL=.*/m;
    
    if (callbackRegex.test(envContent)) {
      envContent = envContent.replace(callbackRegex, `MPESA_CALLBACK_URL=${callbackUrl}`);
    } else {
      envContent += `\nMPESA_CALLBACK_URL=${callbackUrl}\n`;
    }
    
    fs.writeFileSync(ENV_FILE_PATH, envContent);
    return true;
  } catch (err) {
    log('ENV', `Failed to update: ${err.message}`, 'red');
    return false;
  }
}

/**
 * Display banner
 */
function displayBanner(ngrokUrl) {
  console.log('\n' + '═'.repeat(65));
  console.log(`${colors.cyan}${colors.bright}  🚀 SMARTDUKA DEV SERVER WITH NGROK${colors.reset}`);
  console.log('═'.repeat(65));
  
  if (ngrokUrl) {
    console.log(`\n  ${colors.green}✓ Ngrok Tunnel:${colors.reset} ${colors.bright}${ngrokUrl}${colors.reset}`);
    console.log(`  ${colors.green}✓ M-Pesa Callback:${colors.reset} ${ngrokUrl}${CALLBACK_PATH}`);
    console.log(`  ${colors.green}✓ API Server:${colors.reset} http://localhost:${API_PORT}`);
  }
  
  console.log('\n' + '─'.repeat(65));
  console.log(`  ${colors.yellow}Press Ctrl+C to stop all services${colors.reset}`);
  console.log('═'.repeat(65) + '\n');
}

/**
 * Watch for ngrok URL changes
 */
async function watchNgrok() {
  try {
    const ngrokUrl = await getNgrokUrl();
    
    if (ngrokUrl && ngrokUrl !== currentNgrokUrl) {
      currentNgrokUrl = ngrokUrl;
      
      if (updateEnvFile(ngrokUrl)) {
        log('ENV', `Updated MPESA_CALLBACK_URL`, 'green');
      }
      
      displayBanner(ngrokUrl);
    }
  } catch (err) {
    // Ngrok not ready yet, keep trying
  }
}

/**
 * Main entry point
 */
async function main() {
  console.clear();
  
  // Check if ngrok is installed
  const ngrokInstalled = await checkNgrokInstalled();
  if (!ngrokInstalled) {
    log('ERROR', 'ngrok is not installed. Install it from https://ngrok.com/download', 'red');
    process.exit(1);
  }
  
  // Start ngrok
  try {
    await startNgrok();
    log('NGROK', 'Tunnel starting...', 'cyan');
  } catch (err) {
    log('ERROR', `Failed to start ngrok: ${err.message}`, 'red');
    process.exit(1);
  }
  
  // Start watching for URL
  setInterval(watchNgrok, 2000);
  
  // Initial check
  setTimeout(watchNgrok, 3000);
}

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n');
  log('SHUTDOWN', 'Stopping services...', 'yellow');
  
  if (ngrokProcess) {
    ngrokProcess.kill();
  }
  
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  log('ERROR', err.message, 'red');
});

// Start
main();
