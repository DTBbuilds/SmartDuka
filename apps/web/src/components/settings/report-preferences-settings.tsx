'use client';

import { useEffect, useState } from 'react';
import { config } from '@/lib/config';
import { useAuth } from '@/lib/auth-context';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
} from '@smartduka/ui';
import { FileText, Save, Pause, Play, Mail, Loader2, ExternalLink } from 'lucide-react';
import { useToast } from '@/lib/use-toast';

/**
 * EMAIL-REPORTS-CORE1 (Phase C) — REPORT PREFERENCES UI.
 *
 * Consent-respecting: every frequency is OFF by default; enabling is an
 * explicit admin action. Unsubscribe (all optional reports) is separate
 * from transactional email. Preview shows exactly what would be delivered
 * without sending anything.
 */

interface FrequencyPref {
  enabled: boolean;
  hourLocal: number;
  dayOfWeekLocal: number;
  dayOfMonthLocal: number;
}

interface ReportPreferences {
  timezone: string;
  daily: FrequencyPref;
  weekly: FrequencyPref;
  monthly: FrequencyPref;
  recipientUserIds: string[];
  paused: boolean;
  unsubscribedAt?: string | null;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function ReportPreferencesSettings() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<ReportPreferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewFrequency, setPreviewFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${config.apiUrl}/reports/preferences`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setPrefs(await res.json());
      } catch {
        // preferences load failure is non-fatal; the form shows defaults
      }
    };
    load();
  }, [token]);

  const save = async (patch: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch(`${config.apiUrl}/reports/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        setPrefs(await res.json());
        toast({ type: 'success', title: 'Saved', message: 'Report preferences updated.' });
      } else {
        const errText = await res.text();
        let msg = '';
        try { msg = errText ? JSON.parse(errText)?.message : ''; } catch { msg = ''; }
        throw new Error(msg || 'Failed to save preferences');
      }
    } catch (e: any) {
      toast({ type: 'error', title: 'Save failed', message: e?.message });
    } finally {
      setSaving(false);
    }
  };

  const loadPreview = async () => {
    setPreviewLoading(true);
    setPreviewHtml(null);
    try {
      const res = await fetch(
        `${config.apiUrl}/reports/preview?frequency=${previewFrequency}&format=html`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const data = await res.json();
        setPreviewHtml(data.html);
      } else {
        throw new Error('Preview failed');
      }
    } catch (e: any) {
      toast({ type: 'error', title: 'Preview failed', message: e?.message });
    } finally {
      setPreviewLoading(false);
    }
  };

  if (!prefs) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Loading report preferences…
        </CardContent>
      </Card>
    );
  }

  const freqRow = (
    key: 'daily' | 'weekly' | 'monthly',
    title: string,
    description: string,
    extra?: React.ReactNode,
  ) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border">
      <div className="min-w-0">
        <Label className="text-sm font-semibold">{title}</Label>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
        {extra && <div className="mt-2 flex items-center gap-2">{extra}</div>}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <label className="text-xs text-muted-foreground">Send at</label>
        <select
          value={prefs[key].hourLocal}
          onChange={(e) => save({ [key]: { ...prefs[key], hourLocal: Number(e.target.value) } })}
          disabled={saving || !prefs[key].enabled}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-50"
          aria-label={`${title} send hour (shop-local time)`}
        >
          {Array.from({ length: 24 }, (_, h) => (
            <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
          ))}
        </select>
        <input
          type="checkbox"
          checked={prefs[key].enabled}
          onChange={(e) => save({ [key]: { ...prefs[key], enabled: e.target.checked } })}
          disabled={saving}
          className="h-5 w-5 rounded border-gray-300 cursor-pointer"
          aria-label={`Enable ${title}`}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            Business report emails
          </CardTitle>
          <CardDescription>
            Optional digests of your billed sales, collected payments, outstanding balances, tax and stock
            — sent to verified shop admins. Off by default; enabling is your choice. Security and payment
            emails are not affected by these settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {prefs.unsubscribedAt ? (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200">
              Optional reports are unsubscribed. Re-enable any frequency below to resume.
            </div>
          ) : null}
          {prefs.paused && !prefs.unsubscribedAt ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200">
              <span>Reports are paused.</span>
              <Button size="sm" variant="outline" onClick={() => save({ paused: false })} disabled={saving}>
                <Play className="h-3 w-3 mr-1" /> Resume
              </Button>
            </div>
          ) : null}

          {freqRow('daily', 'Daily digest', 'Yesterday\u2019s business, delivered in your shop\u2019s local time.')}
          {freqRow('weekly', 'Weekly digest', 'The last complete week, delivered on your chosen day.', (
            <select
              value={prefs.weekly.dayOfWeekLocal}
              onChange={(e) => save({ weekly: { ...prefs.weekly, dayOfWeekLocal: Number(e.target.value) } })}
              disabled={saving || !prefs.weekly.enabled}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs disabled:opacity-50"
              aria-label="Weekly send day (shop-local)"
            >
              {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          ))}
          {freqRow('monthly', 'Monthly digest', 'The last complete month, delivered on your chosen day.', (
            <select
              value={prefs.monthly.dayOfMonthLocal}
              onChange={(e) => save({ monthly: { ...prefs.monthly, dayOfMonthLocal: Number(e.target.value) } })}
              disabled={saving || !prefs.monthly.enabled}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs disabled:opacity-50"
              aria-label="Monthly send day (shop-local)"
            >
              {Array.from({ length: 28 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
          ))}

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <Label className="text-sm font-semibold">Shop-local timezone</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Day boundaries and send times follow this zone (IANA name).
              </p>
            </div>
            <Input
              value={prefs.timezone}
              onChange={(e) => setPrefs({ ...prefs, timezone: e.target.value })}
              onBlur={(e) => {
                if (e.target.value !== prefs.timezone) save({ timezone: e.target.value });
              }}
              className="w-44"
              aria-label="Shop timezone (IANA)"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <select
              value={previewFrequency}
              onChange={(e) => setPreviewFrequency(e.target.value as any)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              aria-label="Preview frequency"
            >
              <option value="daily">Preview daily</option>
              <option value="weekly">Preview weekly</option>
              <option value="monthly">Preview monthly</option>
            </select>
            <Button variant="outline" size="sm" onClick={loadPreview} disabled={previewLoading}>
              {previewLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Mail className="h-3 w-3 mr-1" />}
              Preview (no send)
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => save({ paused: true })}
              disabled={saving || prefs.paused}
            >
              <Pause className="h-3 w-3 mr-1" /> Pause all
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700"
              onClick={() => {
                if (window.confirm('Unsubscribe from ALL optional business reports? Security and payment emails are unaffected.')) {
                  save({ paused: true }).then(() =>
                    fetch(`${config.apiUrl}/reports/preferences/unsubscribe`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ reason: 'owner request (settings UI)' }),
                    }).then(() => {
                      toast({ type: 'info', title: 'Unsubscribed', message: 'Optional reports unsubscribed.' });
                      return fetch(`${config.apiUrl}/reports/preferences`, { headers: { Authorization: `Bearer ${token}` } });
                    }).then((r) => r.json()).then(setPrefs).catch(() => undefined),
                  );
                }
              }}
              disabled={saving}
            >
              Unsubscribe from reports
            </Button>
          </div>
        </CardContent>
      </Card>

      {previewHtml ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Preview — {previewFrequency} digest (nothing was sent)</CardTitle>
            <CardDescription>
              This is the exact email your recipients would receive.{' '}
              <a href={`${config.apiUrl}/reports/preview?frequency=${previewFrequency}&format=pdf`} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center">
                Open PDF version <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-hidden rounded-b-lg">
            <iframe
              title="Report email preview"
              srcDoc={previewHtml}
              className="w-full h-[520px] border-0 bg-white"
              sandbox=""
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
