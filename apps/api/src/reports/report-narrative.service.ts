import { Injectable, Logger } from '@nestjs/common';
import type { ReportMetrics } from './report-renderer.service';

/**
 * EMAIL-REPORTS-CORE1 (Phase F) — REPORT NARRATIVE.
 *
 * Deterministic FIRST: every insight below is derived strictly from the
 * validated metrics object — no invented numbers, no invented products, no
 * predictions. Facts and suggestions are labelled distinctly.
 *
 * AI narrative (LLM) is OFF by default (AI_NARRATIVE_ENABLED=false) and,
 * when enabled, receives ONLY the validated metrics JSON and must reference
 * those figures — the prompt forbids introducing numbers. On any model
 * failure/timeout the deterministic insights are used unchanged.
 */
@Injectable()
export class ReportNarrativeService {
  private readonly logger = new Logger(ReportNarrativeService.name);

  buildInsights(metrics: ReportMetrics): Array<{ kind: 'fact' | 'suggestion'; text: string }> {
    const insights: Array<{ kind: 'fact' | 'suggestion'; text: string }> = [];

    // ---- FACTS (verbatim from the metrics) ----
    if (metrics.orders === 0) {
      insights.push({ kind: 'fact', text: 'No completed sales in this period.' });
    } else {
      insights.push({
        kind: 'fact',
        text: `${metrics.orders} completed order${metrics.orders === 1 ? '' : 's'} with ${metrics.itemsSold} item${metrics.itemsSold === 1 ? '' : 's'} sold.`,
      });
      if (metrics.outstanding > 0.005) {
        insights.push({
          kind: 'fact',
          text: `Outstanding balance of ${metrics.outstanding.toFixed(2)} across the period (billed vs collected).`,
        });
      }
      if (metrics.topProducts.length > 0) {
        const top = metrics.topProducts[0];
        insights.push({
          kind: 'fact',
          text: `Best seller: ${top.productName} (${top.quantity} sold).`,
        });
      }
      if (metrics.previousPeriod && metrics.previousPeriod.billedRevenue > 0) {
        const change = ((metrics.billedRevenue - metrics.previousPeriod.billedRevenue) / metrics.previousPeriod.billedRevenue) * 100;
        insights.push({
          kind: 'fact',
          text: `Billed sales changed ${change > 0 ? 'up' : 'down'} ${Math.abs(change).toFixed(1)}% versus the previous comparable period.`,
        });
      }
      if (metrics.lowStock.length > 0) {
        insights.push({
          kind: 'fact',
          text: `${metrics.lowStock.length} product${metrics.lowStock.length === 1 ? ' is' : 's are'} at or below the reorder level.`,
        });
      }
    }

    // ---- SUGGESTIONS (actionable, grounded in the facts above) ----
    if (metrics.orders === 0) {
      insights.push({
        kind: 'suggestion',
        text: 'No sales to analyse yet — focus on getting the first checkout completed this week.',
      });
    } else {
      if (metrics.outstanding > 0.005) {
        insights.push({
          kind: 'suggestion',
          text: 'Review the outstanding balance on the Orders page — collect the difference or reconcile it.',
        });
      }
      if (metrics.lowStock.length > 0) {
        insights.push({
          kind: 'suggestion',
          text: `Reorder ${metrics.lowStock[0].name} first — it has the least stock remaining.`,
        });
      }
      if (metrics.topProducts.length > 0 && metrics.orders > 0) {
        const top = metrics.topProducts[0];
        insights.push({
          kind: 'suggestion',
          text: `${top.productName} is selling well — keep it stocked and consider featuring it near the counter.`,
        });
      }
    }

    return insights.slice(0, 6);
  }

  /**
   * Optional LLM narrative — DISABLED by default. When enabled, the model
   * receives the validated metrics and the deterministic insights; it may
   * only rephrase/explain. Any failure returns the deterministic insights.
   */
  async buildAiNarrativeIfEnabled(metrics: ReportMetrics): Promise<Array<{ kind: 'fact' | 'suggestion'; text: string }>> {
    const enabled = process.env.AI_NARRATIVE_ENABLED === 'true';
    if (!enabled) return metrics.insights;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      this.logger.warn('AI_NARRATIVE_ENABLED=true but OPENAI_API_KEY missing — deterministic insights used');
      return metrics.insights;
    }

    try {
      // Cost control: small model, short output, one request per report run.
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: process.env.AI_NARRATIVE_MODEL || 'gpt-4o-mini',
          temperature: 0.3,
          max_tokens: 300,
          messages: [
            {
              role: 'system',
              content:
                'You write two-sentence business explanations for a shop owner. You receive ONLY validated metrics. Rules: never introduce a number that is not in the metrics; never name a product or customer that is not listed; no predictions; no profit claims unless profit data is present; if data is missing, say so plainly. Output plain text only.',
            },
            {
              role: 'user',
              content: JSON.stringify({
                period: metrics.periodLabel,
                currency: metrics.currency,
                metrics: {
                  billedRevenue: metrics.billedRevenue,
                  collectedPayments: metrics.collectedPayments,
                  outstanding: metrics.outstanding,
                  refunds: metrics.refunds,
                  tax: metrics.tax,
                  orders: metrics.orders,
                  itemsSold: metrics.itemsSold,
                  topProducts: metrics.topProducts.slice(0, 5),
                  lowStockCount: metrics.lowStock.length,
                },
                deterministicInsights: metrics.insights,
              }),
            },
          ],
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error(`AI narrative HTTP ${response.status}`);
      const data = (await response.json()) as any;
      const text = data?.choices?.[0]?.message?.content;
      if (!text || typeof text !== 'string') throw new Error('Empty AI narrative');
      return [{ kind: 'fact' as const, text: text.trim().slice(0, 600) }, ...metrics.insights];
    } catch (error: any) {
      this.logger.warn(`AI narrative failed (${error.message}) — deterministic insights used`);
      return metrics.insights;
    }
  }
}
