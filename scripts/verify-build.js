/* CANARY-PREP1 (Phase E) — mandatory pre-deployment build verification.
 *
 * Prevents the stale-artifact failure mode: a FAILED build leaves the
 * PREVIOUS dist/.next in place, and output-grep checks report false
 * success. This script:
 *   1. records the start time,
 *   2. runs each build with its REAL exit code (fail-fast),
 *   3. asserts the artifacts EXIST and are FRESHER than the start time,
 *   4. runs the mandatory regression suites.
 *
 * Usage: node scripts/verify-build.js [--skip-tests]
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const startedAt = Date.now();
const fail = (msg) => { console.error('FATAL:', msg); process.exit(1); };
const run = (cmd, cwd) => {
  console.log(`\n$ ${cmd}  (cwd: ${path.relative(ROOT, cwd) || '.'})`);
  execSync(cmd, { cwd, stdio: 'inherit' }); // throws on non-zero exit — never ignored
};
const assertFresh = (file, label) => {
  if (!fs.existsSync(file)) fail(`${label} artifact missing: ${file}`);
  const mtime = fs.statSync(file).mtimeMs;
  if (mtime < startedAt) fail(`${label} artifact is STALE (mtime ${new Date(mtime).toISOString()} < build start) — the build did not produce it`);
  console.log(`✓ ${label} artifact fresh: ${path.relative(ROOT, file)}`);
};

console.log('=== CANARY-PREP1 build verification ===');

// 1. API: clean build (rm -rf first — a failed build must not leave stale output)
fs.rmSync(path.join(ROOT, 'apps', 'api', 'dist'), { recursive: true, force: true });
run('npm run build', path.join(ROOT, 'apps', 'api'));
assertFresh(path.join(ROOT, 'apps', 'api', 'dist', 'src', 'main.js'), 'API');

// 2. Web: clean build
fs.rmSync(path.join(ROOT, 'apps', 'web', '.next'), { recursive: true, force: true });
run('npm run build', path.join(ROOT, 'apps', 'web'));
assertFresh(path.join(ROOT, 'apps', 'web', '.next', 'BUILD_ID'), 'Web');

// 3. Mandatory regression suites (the financial/security/report/email shields)
if (!process.argv.includes('--skip-tests')) {
  run('npx jest src/sales src/payments src/shops src/shop-settings src/super-admin src/reports src/notifications src/stripe --silent --no-coverage', path.join(ROOT, 'apps', 'api'));
  run('npx jest --silent', path.join(ROOT, 'apps', 'web'));
}

console.log('\n=== BUILD VERIFICATION PASSED ===');
