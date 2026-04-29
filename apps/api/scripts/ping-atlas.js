/**
 * Atlas Cluster Wake-up & Connection Test
 * Run: node scripts/ping-atlas.js
 */
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']); // Force Google/Cloudflare DNS for SRV

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Minimal .env parser (no dotenv dependency)
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach((line) => {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  });
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not set in .env');
  process.exit(1);
}

console.log('Pinging Atlas cluster (this wakes it up if paused)...');
const start = Date.now();

mongoose
  .connect(uri, { serverSelectionTimeoutMS: 30000 })
  .then(() => mongoose.connection.db.admin().ping())
  .then((result) => {
    const ms = Date.now() - start;
    console.log(`SUCCESS in ${ms}ms - cluster is AWAKE and reachable`);
    console.log('Ping result:', result);
    process.exit(0);
  })
  .catch((err) => {
    const ms = Date.now() - start;
    console.error(`FAILED in ${ms}ms:`, err.message);
    if (err.message.includes('whitelist') || err.message.includes("IP that isn't")) {
      console.error('\n-> IP whitelist rule is still PENDING in Atlas.');
      console.error('-> Wait a few more minutes and retry.');
    } else if (err.message.includes('ECONNREFUSED') || err.message.includes('querySrv')) {
      console.error('\n-> DNS SRV lookup failed. Cluster may still be paused, OR local DNS issue.');
    } else if (err.message.includes('Authentication')) {
      console.error('\n-> Cluster is UP but password is wrong.');
    }
    process.exit(1);
  });
