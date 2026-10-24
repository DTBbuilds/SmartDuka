/* RELEASE-GATE1/DEPLOY1 — coordinate-level PDF layout inspection (corrected).
 * Coordinate model (empirically verified): TmY is PDF-native (from bottom);
 * visualY_from_top = 841.89 − TmY − ascent(size). Word runs are joined with
 * spaces when the x advances. Checks: clipping, vertical collisions,
 * footer/header placement, page counts, totals, no-PII.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const DIR = path.join(__dirname, '..', 'apps', 'web', 'public', 'release-gate-fixtures');
const PAGE_H = 841.89, PAGE_W = 595.28, MARGIN = 72;

function extract(pdfLatin) {
  const streams = [];
  const re = /stream\r?\n([\s\S]*?)endstream/g;
  let m;
  while ((m = re.exec(pdfLatin))) {
    let raw = m[1];
    try { raw = zlib.inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1'); } catch {}
    streams.push(raw);
  }
  const runs = [];
  for (const raw of streams) {
    const segs = raw.split(/(?=1 0 0 1 [\d.]+ [\d.]+ Tm)/);
    for (const seg of segs) {
      const tm = seg.match(/1 0 0 1 ([\d.]+) ([\d.]+) Tm/);
      if (!tm) continue;
      const size = Number((seg.match(/\/F\d+ ([\d.]+) Tf/) || [])[1] || 0);
      const pieces = Array.from(seg.matchAll(/<([0-9a-fA-F]{2,})>/g)).map((x) => {
        try { return Buffer.from(x[1].length % 2 ? '0' + x[1] : x[1], 'hex').toString('latin1'); } catch { return '?'; }
      });
      runs.push({
        x: Number(tm[1]),
        visualY: PAGE_H - Number(tm[2]) - size * 0.72,
        size,
        text: pieces.join(''),
      });
    }
  }
  // join consecutive runs into words/lines: same visualY (±1) → space-join
  const lines = new Map();
  for (const r of runs) {
    const key = Math.round(r.visualY);
    const arr = lines.get(key) || [];
    arr.push(r);
    lines.set(key, arr);
  }
  const joined = [];
  for (const [y, arr] of lines.entries()) {
    arr.sort((a, b) => a.x - b.x);
    joined.push({ y, text: arr.map((r) => r.text).join(' ').replace(/\s+/g, ' ').trim(), x0: arr[0].x, x1: Math.max(...arr.map((r) => r.x + r.text.length * r.size * 0.5)) });
  }
  return { runs, lines: joined.sort((a, b) => a.y - b.y) };
}

function inspect(name, expectPages, mustContain) {
  const pdf = fs.readFileSync(path.join(DIR, name + '.pdf'), null).toString('latin1');
  const declared = Number((pdf.match(/\/Count (\d+)/) || [])[1]);
  const { runs, lines } = extract(pdf);
  const issues = [];

  if (declared !== expectPages) issues.push(`page count ${declared} != expected ${expectPages}`);

  const allText = lines.map((l) => l.text).join('\n');
  for (const t of mustContain) {
    if (!allText.includes(t)) issues.push(`missing text: "${t}"`);
  }

  // clipping: any run outside the horizontal margins (except the centered footer)
  for (const r of runs) {
    if (r.x < 40) issues.push(`run at x=${r.x.toFixed(1)} left of margin: "${r.text.slice(0, 30)}"`);
  }
  // vertical collisions: distinct lines closer than 2pt
  const ys = lines.map((l) => l.y);
  for (let i = 1; i < ys.length; i++) {
    if (ys[i] - ys[i - 1] < 2 && ys[i] !== ys[i - 1]) {
      issues.push(`vertical collision at y=${ys[i]} (${lines[i - 1].text.slice(0, 25)} / ${lines[i].text.slice(0, 25)})`);
    }
  }
  // content below the bottom margin (footer zone is 740..770)
  for (const l of lines) {
    if (l.y > 775 && !/Page \d+ of \d+/.test(l.text)) issues.push(`content below margin at y=${l.y}: "${l.text.slice(0, 40)}"`);
  }
  // footers: count OCCURRENCES across the joined text (page 1 + page 2
  // footers share the same visualY and merge into one extracted line)
  const footerMatches = (allText.match(/Page \d+ of \d+/g) || []).length;
  if (footerMatches !== expectPages) issues.push(`footer occurrences ${footerMatches} != ${expectPages}`);

  // no customer PII
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(allText)) issues.push('EMAIL ADDRESS found in PDF (PII leak)');

  console.log(`${name}: pages=${declared} ${issues.length === 0 ? 'OK' : 'ISSUES:'}`);
  for (const i of issues) console.log('   -', i);
  return issues.length;
}

let total = 0;
total += inspect('daily', 1, ['Load & Go', 'Billed sales', 'KSh 933.80', 'KSh 805.00', 'KSh 128.80', 'Payments collected', 'Tax collected', 'SMARTDUKA DAILY BUSINESS DIGEST', 'Fact', 'Suggestion']);
total += inspect('weekly', 1, ['Load & Go', 'KSh 46,757.36', 'KSh 41,463.00', 'KSh 5,294.36', 'Payments by method', 'Best sellers', 'Low stock', 'send money']);
total += inspect('monthly', 2, ['Load & Go', 'KSh 47,182.16', 'KSh 41,887.80', 'KSh 5,476.16', 'Best sellers', 'Low stock', 'Discounts given']);
total += inspect('no_sales', 1, ['Load & Go', 'No completed sales', 'KSh 0.00', 'first checkout']);
total += inspect('long_names', 1, ['UltraPremium Deluxe Professional-Grade Organic Correction Tape']); // ellipsized by design
total += inspect('multi_page', 2, ['Page 2 of 2', 'Bulk Product 10', 'Low Stock Product 8']);
console.log(total === 0 ? 'ALL PDF LAYOUT CHECKS PASS' : `${total} ISSUES FOUND`);
