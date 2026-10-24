import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { formatMoney } from '../common/currency';

/**
 * EMAIL-REPORTS-CORE1 (Phase E) — PROFESSIONAL REPORT PRESENTATION.
 *
 * Renders one canonical metrics object into:
 *   - mobile-Gmail-safe HTML (table-based layout, inline styles)
 *   - a plain-text alternative
 *   - a branded PDF attachment (pdfkit — pure JS, no browser dependency)
 *
 * Facts vs suggestions are visually distinct. No customer-level personal
 * data is included. Currency formatting uses the shop's currency snapshot;
 * timestamps show UTC + shop-local.
 */

export interface ReportMetrics {
  shopName: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  periodLabel: string;
  periodStart: Date;
  periodEnd: Date;
  timezone: string;
  currency?: string;
  billedRevenue: number;
  collectedPayments: number;
  outstanding: number;
  refunds: number;
  tax: number;
  discounts: number;
  orders: number;
  itemsSold: number;
  averageOrderValue: number;
  paymentMethods: Array<{ method: string; amount: number }>;
  topProducts: Array<{ productName: string; quantity: number; revenue: number }>;
  lowStock: Array<{ name: string; stock: number; reorderPoint: number }>;
  previousPeriod?: { billedRevenue: number; orders: number } | null;
  insights: Array<{ kind: 'fact' | 'suggestion'; text: string }>;
  dashboardUrl: string;
  preferencesUrl: string;
  generatedAt: Date;
}

const BRAND = { dark: '#111827', muted: '#6b7280', accent: '#f97316', line: '#e5e7eb', bg: '#f9fafb' };
const PAGE_W = 595.28; // A4 width in pt (pdfkit default)

const fmt = (v: number, currency?: string) => formatMoney(v, currency || 'KES');
const pct = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;

@Injectable()
export class ReportRendererService {
  private readonly logger = new Logger(ReportRendererService.name);

  subject(metrics: ReportMetrics): string {
    const label = metrics.frequency === 'daily' ? 'Daily' : metrics.frequency === 'weekly' ? 'Weekly' : 'Monthly';
    return `SmartDuka ${label} Business Digest — ${metrics.shopName} — ${metrics.periodLabel}`;
  }

  private changeText(metrics: ReportMetrics): string | null {
    if (!metrics.previousPeriod || metrics.previousPeriod.billedRevenue <= 0) return null;
    const change = ((metrics.billedRevenue - metrics.previousPeriod.billedRevenue) / metrics.previousPeriod.billedRevenue) * 100;
    return `${pct(change)} vs previous ${metrics.frequency === 'daily' ? 'day' : metrics.frequency === 'weekly' ? 'week' : 'month'}`;
  }

  private kpiTable(metrics: ReportMetrics): string {
    const row = (label: string, value: string, note = '') =>
      `<tr>
        <td style="padding:8px 12px;font-size:13px;color:${BRAND.muted};border-bottom:1px solid ${BRAND.line};">${label}</td>
        <td style="padding:8px 12px;font-size:14px;font-weight:700;color:${BRAND.dark};border-bottom:1px solid ${BRAND.line};text-align:right;">${value}${note ? ` <span style="font-size:11px;font-weight:400;color:${BRAND.muted};">${note}</span>` : ''}</td>
      </tr>`;
    const change = this.changeText(metrics);
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND.line};border-radius:6px;overflow:hidden;">
      ${row('Billed sales', fmt(metrics.billedRevenue, metrics.currency), change || undefined)}
      ${row('Payments collected', fmt(metrics.collectedPayments, metrics.currency))}
      ${metrics.outstanding > 0.005 ? row('Outstanding balance', fmt(metrics.outstanding, metrics.currency)) : ''}
      ${metrics.refunds > 0 ? row('Refunds', fmt(metrics.refunds, metrics.currency)) : ''}
      ${row('Tax collected', fmt(metrics.tax, metrics.currency))}
      ${metrics.discounts > 0 ? row('Discounts given', fmt(metrics.discounts, metrics.currency)) : ''}
      ${row('Orders', String(metrics.orders))}
      ${row('Items sold', String(metrics.itemsSold))}
      ${metrics.orders > 0 ? row('Average order', fmt(metrics.averageOrderValue, metrics.currency)) : ''}
    </table>`;
  }

  private paymentMethodsTable(metrics: ReportMetrics): string {
    if (metrics.paymentMethods.length === 0) return '';
    const rows = metrics.paymentMethods
      .map((m) => `<tr>
        <td style="padding:6px 12px;font-size:13px;color:#374151;border-bottom:1px solid ${BRAND.line};text-transform:capitalize;">${m.method.replace(/_/g, ' ')}</td>
        <td style="padding:6px 12px;font-size:13px;font-weight:600;color:${BRAND.dark};border-bottom:1px solid ${BRAND.line};text-align:right;">${fmt(m.amount, metrics.currency)}</td>
      </tr>`)
      .join('');
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND.line};border-radius:6px;overflow:hidden;margin-top:12px;">
      <tr><td colspan="2" style="padding:8px 12px;font-size:12px;font-weight:700;color:${BRAND.dark};background:${BRAND.bg};border-bottom:1px solid ${BRAND.line};">Payments by method</td></tr>
      ${rows}
    </table>`;
  }

  private topProductsTable(metrics: ReportMetrics): string {
    if (metrics.topProducts.length === 0) return '';
    const rows = metrics.topProducts
      .slice(0, 10)
      .map((p, i) => `<tr>
        <td style="padding:6px 12px;font-size:13px;color:#374151;border-bottom:1px solid ${BRAND.line};">${i + 1}. ${escapeHtml(p.productName)}</td>
        <td style="padding:6px 12px;font-size:13px;color:${BRAND.muted};border-bottom:1px solid ${BRAND.line};text-align:center;">${p.quantity}</td>
        <td style="padding:6px 12px;font-size:13px;font-weight:600;color:${BRAND.dark};border-bottom:1px solid ${BRAND.line};text-align:right;">${fmt(p.revenue, metrics.currency)}</td>
      </tr>`)
      .join('');
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND.line};border-radius:6px;overflow:hidden;margin-top:12px;">
      <tr><td style="padding:8px 12px;font-size:12px;font-weight:700;color:${BRAND.dark};background:${BRAND.bg};border-bottom:1px solid ${BRAND.line};">Best sellers</td><td style="padding:8px 12px;font-size:12px;font-weight:700;color:${BRAND.dark};background:${BRAND.bg};border-bottom:1px solid ${BRAND.line};text-align:center;">Qty</td><td style="padding:8px 12px;font-size:12px;font-weight:700;color:${BRAND.dark};background:${BRAND.bg};border-bottom:1px solid ${BRAND.line};text-align:right;">Revenue</td></tr>
      ${rows}
    </table>`;
  }

  private lowStockTable(metrics: ReportMetrics): string {
    if (metrics.lowStock.length === 0) return '';
    const rows = metrics.lowStock
      .slice(0, 8)
      .map((p) => `<tr>
        <td style="padding:6px 12px;font-size:13px;color:#374151;border-bottom:1px solid ${BRAND.line};">${escapeHtml(p.name)}</td>
        <td style="padding:6px 12px;font-size:13px;font-weight:600;color:#b91c1c;border-bottom:1px solid ${BRAND.line};text-align:right;">${p.stock} left</td>
      </tr>`)
      .join('');
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fecaca;border-radius:6px;overflow:hidden;margin-top:12px;">
      <tr><td colspan="2" style="padding:8px 12px;font-size:12px;font-weight:700;color:#b91c1c;background:#fef2f2;border-bottom:1px solid #fecaca;">&#9888; Low stock — reorder soon</td></tr>
      ${rows}
    </table>`;
  }

  private insightsSection(metrics: ReportMetrics): string {
    if (metrics.insights.length === 0) return '';
    const items = metrics.insights
      .map((i) =>
        i.kind === 'fact'
          ? `<li style="margin:0 0 6px;font-size:13px;color:#374151;"><strong style="color:${BRAND.dark};">Fact:</strong> ${escapeHtml(i.text)}</li>`
          : `<li style="margin:0 0 6px;font-size:13px;color:#374151;"><strong style="color:${BRAND.accent};">Suggestion:</strong> ${escapeHtml(i.text)}</li>`,
      )
      .join('');
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};border-radius:6px;margin-top:12px;">
      <tr><td style="padding:12px 16px;"><p style="margin:0 0 8px;font-size:12px;font-weight:700;color:${BRAND.dark};">Insights</p><ul style="margin:0;padding-left:18px;">${items}</ul></td></tr>
    </table>`;
  }

  html(metrics: ReportMetrics): string {
    const generatedLocal = localTime(metrics.generatedAt, metrics.timezone);
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:16px 8px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px;overflow:hidden;">
  <tr><td style="padding:20px 20px 12px;background:${BRAND.dark};">
    <p style="margin:0;font-size:12px;font-weight:700;color:#f97316;letter-spacing:1px;">SMARTDUKA ${metrics.frequency.toUpperCase()} DIGEST</p>
    <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#ffffff;">${escapeHtml(metrics.shopName)}</p>
    <p style="margin:2px 0 0;font-size:12px;color:#9ca3af;">${escapeHtml(metrics.periodLabel)} &middot; ${escapeHtml(metrics.timezone)}</p>
  </td></tr>
  <tr><td style="padding:16px 20px;">
    ${this.kpiTable(metrics)}
    ${this.paymentMethodsTable(metrics)}
    ${this.topProductsTable(metrics)}
    ${this.lowStockTable(metrics)}
    ${this.insightsSection(metrics)}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px auto;">
      <tr><td style="background-color:${BRAND.dark};border-radius:6px;text-align:center;">
        <a href="${metrics.dashboardUrl}" style="display:inline-block;padding:11px 26px;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;">Open your dashboard</a>
      </td></tr>
    </table>
    <p style="margin:0 0 4px;font-size:11px;color:${BRAND.muted};text-align:center;">
      Generated ${generatedLocal} (UTC ${metrics.generatedAt.toISOString().slice(11, 16)}).
    </p>
    <p style="margin:0;font-size:11px;color:${BRAND.muted};text-align:center;">
      Figures are billed sales vs collected payments — outstanding balances are shown separately.
      Manage reports: <a href="${metrics.preferencesUrl}" style="color:${BRAND.accent};">preferences</a> &middot;
      <a href="${metrics.preferencesUrl}?unsubscribe=1" style="color:${BRAND.accent};">unsubscribe</a>
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
  }

  text(metrics: ReportMetrics): string {
    const lines: string[] = [];
    lines.push(`SMARTDUKA ${metrics.frequency.toUpperCase()} DIGEST — ${metrics.shopName}`);
    lines.push(`${metrics.periodLabel} (${metrics.timezone})`);
    lines.push('');
    lines.push(`Billed sales: ${fmt(metrics.billedRevenue, metrics.currency)}${this.changeText(metrics) ? ` (${this.changeText(metrics)})` : ''}`);
    lines.push(`Payments collected: ${fmt(metrics.collectedPayments, metrics.currency)}`);
    if (metrics.outstanding > 0.005) lines.push(`Outstanding balance: ${fmt(metrics.outstanding, metrics.currency)}`);
    if (metrics.refunds > 0) lines.push(`Refunds: ${fmt(metrics.refunds, metrics.currency)}`);
    lines.push(`Tax collected: ${fmt(metrics.tax, metrics.currency)}`);
    if (metrics.discounts > 0) lines.push(`Discounts given: ${fmt(metrics.discounts, metrics.currency)}`);
    lines.push(`Orders: ${metrics.orders} | Items sold: ${metrics.itemsSold}`);
    if (metrics.orders > 0) lines.push(`Average order: ${fmt(metrics.averageOrderValue, metrics.currency)}`);
    if (metrics.paymentMethods.length > 0) {
      lines.push('');
      lines.push('Payments by method:');
      for (const m of metrics.paymentMethods) lines.push(`  ${m.method.replace(/_/g, ' ')}: ${fmt(m.amount, metrics.currency)}`);
    }
    if (metrics.topProducts.length > 0) {
      lines.push('');
      lines.push('Best sellers:');
      metrics.topProducts.slice(0, 10).forEach((p, i) =>
        lines.push(`  ${i + 1}. ${p.productName} — ${p.quantity} sold — ${fmt(p.revenue, metrics.currency)}`),
      );
    }
    if (metrics.lowStock.length > 0) {
      lines.push('');
      lines.push('LOW STOCK (reorder soon):');
      metrics.lowStock.slice(0, 8).forEach((p) => lines.push(`  ${p.name} — ${p.stock} left`));
    }
    if (metrics.insights.length > 0) {
      lines.push('');
      lines.push('Insights:');
      for (const i of metrics.insights) lines.push(`  [${i.kind === 'fact' ? 'Fact' : 'Suggestion'}] ${i.text}`);
    }
    lines.push('');
    lines.push(`Dashboard: ${metrics.dashboardUrl}`);
    lines.push(`Manage reports: ${metrics.preferencesUrl}`);
    lines.push(`Generated ${localTime(metrics.generatedAt, metrics.timezone)} (UTC ${metrics.generatedAt.toISOString().slice(11, 16)})`);
    lines.push('Billed sales and collected payments are reported separately; outstanding balances are shown, not hidden.');
    return lines.join('\n');
  }

  /**
   * Branded PDF attachment. pdfkit is pure JavaScript (no browser/Chromium
   * dependency) — suitable for the Render free tier. Simple, accurate
   * tables; page numbers; generation timestamps.
   *
   * TWO-PASS RENDER (DEPLOY1 fix): pdfkit FLUSHES a page as soon as
   * addPage() creates the next one, and flushed pages are unreachable by
   * switchToPage — a single-pass footer loop silently skipped every page
   * except the last (page 1 had no footer; page 2's footer read
   * "Page 1 of 1"). Pass 1 renders without footers to count pages; pass 2
   * writes each page's footer WHILE THAT PAGE IS STILL CURRENT (just
   * before leaving it / before end), with the true total.
   */
  async pdf(metrics: ReportMetrics): Promise<Buffer> {
    const first = await this.renderPdf(metrics, null);
    const second = await this.renderPdf(metrics, first.pageCount);
    return second.buffer;
  }

  private async renderPdf(
    metrics: ReportMetrics,
    totalPages: number | null,
  ): Promise<{ buffer: Buffer; pageCount: number }> {
    const doc = new PDFDocument({
      size: 'A4',
      compress: false,
      info: { Title: this.subject(metrics) },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

    const W = doc.page.width - 96;
    let y = 0;
    // pdfkit 0.15 does not expose a pages array — the page number is
    // tracked directly (every page break in this renderer goes through
    // ensureSpace; individual text lines are short and guarded).
    let pageNumber = 1;

    // Footer for the CURRENT page — written while the page is still
    // current (before addPage/end), positioned INSIDE the text area
    // (pdfkit applies its default 72pt margins; maxY = height − 72).
    // Drawn WITHOUT width/align (no LineWrapper): pdfkit's line wrapper
    // sizes its section from the remaining page height and re-breaks the
    // page for this text — manual centering avoids the wrapper entirely.
    const writeFooter = () => {
      if (totalPages === null) return; // pass 1 (page count only)
      const label = `Generated ${localTime(metrics.generatedAt, metrics.timezone)} (UTC ${metrics.generatedAt.toISOString().slice(11, 16)}) · Page ${pageNumber} of ${totalPages}`;
      const estimatedWidth = label.length * 8 * 0.5;
      doc
        .fillColor('#9ca3af')
        .fontSize(8)
        .font('Helvetica')
        .text(label, Math.max(48, (PAGE_W - estimatedWidth) / 2), doc.page.maxY() - 12, {
          lineBreak: false,
        });
    };

    const ensureSpace = (needed: number) => {
      if (y + needed > doc.page.maxY() - 24) {
        writeFooter(); // footer for the page being left
        pageNumber += 1;
        doc.addPage();
        y = 48;
      }
    };

    // Header band
    doc.rect(0, 0, doc.page.width, 88).fill('#111827');
    doc.fillColor('#f97316').fontSize(9).font('Helvetica-Bold').text(`SMARTDUKA ${metrics.frequency.toUpperCase()} BUSINESS DIGEST`, 48, 22);
    doc.fillColor('#ffffff').fontSize(18).text(escapePdf(metrics.shopName), 48, 38);
    doc.fillColor('#9ca3af').fontSize(9).font('Helvetica').text(`${metrics.periodLabel} · ${metrics.timezone}`, 48, 62);
    y = 112;

    // KPI table
    const kpiRows: Array<[string, string]> = [
      ['Billed sales', fmt(metrics.billedRevenue, metrics.currency)],
      ['Payments collected', fmt(metrics.collectedPayments, metrics.currency)],
      ...(metrics.outstanding > 0.005 ? ([['Outstanding balance', fmt(metrics.outstanding, metrics.currency)]] as Array<[string, string]>) : []),
      ...(metrics.refunds > 0 ? ([['Refunds', fmt(metrics.refunds, metrics.currency)]] as Array<[string, string]>) : []),
      ['Tax collected', fmt(metrics.tax, metrics.currency)],
      ...(metrics.discounts > 0 ? ([['Discounts given', fmt(metrics.discounts, metrics.currency)]] as Array<[string, string]>) : []),
      ['Orders', String(metrics.orders)],
      ['Items sold', String(metrics.itemsSold)],
      ...(metrics.orders > 0 ? ([['Average order', fmt(metrics.averageOrderValue, metrics.currency)]] as Array<[string, string]>) : []),
    ];
    const change = this.changeText(metrics);
    doc.fillColor('#111827').fontSize(12).font('Helvetica-Bold').text('Summary', 48, y);
    y += 18;
    for (const [label, value] of kpiRows) {
      ensureSpace(22);
      doc.rect(48, y, W, 22).fill('#f9fafb');
      doc.fillColor('#6b7280').fontSize(10).font('Helvetica').text(label, 58, y + 6);
      doc.fillColor('#111827').font('Helvetica-Bold').text(value + (label === 'Billed sales' && change ? `  (${change})` : ''), 48, y + 6, { width: W - 20, align: 'right' });
      y += 22;
    }

    // Payments by method
    if (metrics.paymentMethods.length > 0) {
      ensureSpace(30);
      y += 14;
      doc.fillColor('#111827').fontSize(12).font('Helvetica-Bold').text('Payments by method', 48, y);
      y += 18;
      for (const m of metrics.paymentMethods) {
        ensureSpace(18);
        doc.fillColor('#374151').fontSize(10).font('Helvetica').text(m.method.replace(/_/g, ' '), 58, y);
        doc.fillColor('#111827').font('Helvetica-Bold').text(fmt(m.amount, metrics.currency), 48, y, { width: W - 20, align: 'right' });
        y += 18;
      }
    }

    // Best sellers
    if (metrics.topProducts.length > 0) {
      ensureSpace(30);
      y += 14;
      doc.fillColor('#111827').fontSize(12).font('Helvetica-Bold').text('Best sellers', 48, y);
      y += 18;
      metrics.topProducts.slice(0, 10).forEach((p, i) => {
        ensureSpace(18);
        doc.fillColor('#374151').fontSize(10).font('Helvetica').text(`${i + 1}. ${p.productName} (${p.quantity})`, 58, y, { width: W - 120, ellipsis: true });
        doc.fillColor('#111827').font('Helvetica-Bold').text(fmt(p.revenue, metrics.currency), 48, y, { width: W - 20, align: 'right' });
        y += 18;
      });
    }

    // Low stock
    if (metrics.lowStock.length > 0) {
      ensureSpace(30);
      y += 14;
      doc.fillColor('#b91c1c').fontSize(12).font('Helvetica-Bold').text('Low stock — reorder soon', 48, y);
      y += 18;
      metrics.lowStock.slice(0, 8).forEach((p) => {
        ensureSpace(18);
        doc.fillColor('#374151').fontSize(10).font('Helvetica').text(p.name, 58, y, { width: W - 120, ellipsis: true });
        doc.fillColor('#b91c1c').font('Helvetica-Bold').text(`${p.stock} left`, 48, y, { width: W - 20, align: 'right' });
        y += 18;
      });
    }

    // Insights
    if (metrics.insights.length > 0) {
      ensureSpace(30);
      y += 14;
      doc.fillColor('#111827').fontSize(12).font('Helvetica-Bold').text('Insights', 48, y);
      y += 18;
      for (const i of metrics.insights) {
        ensureSpace(28);
        doc.fillColor(i.kind === 'fact' ? '#111827' : '#c2410c').fontSize(10).font('Helvetica-Bold').text(i.kind === 'fact' ? 'Fact' : 'Suggestion', 58, y);
        doc.fillColor('#374151').font('Helvetica').text(i.text, 100, y, { width: W - 60 });
        y += 28;
      }
    }

    // Footer for the FINAL page (all previous pages got theirs when left).
    writeFooter();
    doc.end();
    return { buffer: await done, pageCount: pageNumber };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function escapePdf(s: string): string {
  return s.replace(/[\u0080-\uFFFF]/g, '?'); // WinAnsi-safe
}
function localTime(instant: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone, dateStyle: 'medium', timeStyle: 'short',
    }).format(instant);
  } catch {
    return instant.toISOString();
  }
}
