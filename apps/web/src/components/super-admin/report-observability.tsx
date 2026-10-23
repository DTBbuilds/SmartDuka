'use client';

import { useEffect, useState } from 'react';
import { config } from '@/lib/config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from '@smartduka/ui';
import { Activity, RefreshCw } from 'lucide-react';

/**
 * EMAIL-REPORTS-CORE1 (Phase H) — SCHEDULER OBSERVABILITY for Super Admin.
 *
 * Shows report-run history and scheduler health: queued/processing/
 * accepted/delivered/failed/suppressed counts, stale claims, per-run
 * provider + outcome. Read-only — no bulk-send controls exist here.
 */

interface SchedulerHealth {
  enabled: boolean;
  instanceId: string;
  queued: number;
  processing: number;
  accepted: number;
  delivered: number;
  failed: number;
  suppressed: number;
  staleClaims: number;
}

interface ReportRun {
  _id: string;
  runId: string;
  frequency: string;
  periodKey: string;
  status: string;
  recipients: string[];
  attempts: number;
  lastError?: string;
  provider?: string;
  late: boolean;
  createdAt: string;
}

const statusColor = (status: string) => {
  switch (status) {
    case 'delivered': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    case 'accepted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    case 'queued': case 'processing': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    case 'suppressed': return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
    default: return '';
  }
};

export function ReportSchedulerObservability() {
  const [health, setHealth] = useState<SchedulerHealth | null>(null);
  const [runs, setRuns] = useState<ReportRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [hRes, rRes] = await Promise.all([
        fetch(`${config.apiUrl}/reports/scheduler/health`),
        fetch(`${config.apiUrl}/reports/scheduler/runs?limit=25`),
      ]);
      if (hRes.ok) setHealth(await hRes.json());
      if (rRes.ok) {
        const data = await rRes.json();
        setRuns(Array.isArray(data) ? data : []);
      }
      if (!hRes.ok || !rRes.ok) setError('Scheduler endpoints unavailable');
    } catch {
      setError('Failed to load scheduler observability');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">Loading scheduler health…</CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Report scheduler health
            </CardTitle>
            <CardDescription>
              {health?.enabled
                ? `Enabled · instance ${health?.instanceId}`
                : 'DISABLED — REPORT_EMAILS_ENABLED=false (no scheduled reports are sent)'}
            </CardDescription>
          </div>
          <button onClick={load} className="p-2 rounded hover:bg-muted" aria-label="Refresh scheduler health">
            <RefreshCw className="h-4 w-4" />
          </button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
            {[
              ['Queued', health?.queued],
              ['Processing', health?.processing],
              ['Accepted', health?.accepted],
              ['Delivered', health?.delivered],
              ['Failed', health?.failed],
              ['Suppressed', health?.suppressed],
            ].map(([label, value]) => (
              <div key={String(label)} className="p-2 rounded bg-muted/50">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                <p className="text-lg font-bold">{value ?? 0}</p>
              </div>
            ))}
          </div>
          {(health?.staleClaims ?? 0) > 0 && (
            <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
              {health?.staleClaims} stale claim(s) — will be auto-recovered on the next scheduler tick.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent report runs</CardTitle>
          <CardDescription>Queued → processing → accepted (provider) → delivered (webhook) | failed | suppressed</CardDescription>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No report runs yet. Runs appear here once shops enable report emails.
            </p>
          ) : (
            <div className="space-y-1.5">
              {runs.map((run) => (
                <div key={run._id} className="flex items-center justify-between gap-2 p-2 rounded border text-xs">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{run.frequency} · {run.periodKey}{run.late ? ' (late)' : ''}</p>
                    <p className="text-muted-foreground truncate">
                      {run.recipients?.length ?? 0} recipient(s) · attempts {run.attempts}{run.provider ? ` · ${run.provider}` : ''}{run.lastError ? ` · ${run.lastError}` : ''}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full font-medium shrink-0 ${statusColor(run.status)}`}>{run.status}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
