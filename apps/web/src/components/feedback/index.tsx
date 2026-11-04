'use client';

/**
 * ERROR-UX-RELIABILITY1 (PR B/D) — shared feedback primitives.
 *
 * One canonical presentation standard for the whole application:
 *  - ErrorBanner: recoverable failures (with optional retry), aria-live
 *  - SuccessNotice: auto-dismissing confirmations, aria-live
 *  - InfoNotice: informational/warning notices
 *  - EmptyState: zero-data screens with a single clear action
 *  - LoadingState: consistent busy indicator (no layout jump)
 *  - ConfirmDialog: destructive-action confirmation (replaces window.confirm)
 *  - FieldError: inline field validation message (aria-describedby ready)
 *
 * Offline/reconnecting states are owned by the existing global
 * BackendStatusOverlay.
 *
 * Rules: no full-page reloads, no duplicated alerts, no lost form data,
 * screen-reader announcements via role/aria-live, responsive by default.
 */

import { useEffect, ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, Loader2, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ── ErrorBanner ─────────────────────────────────────────────────────────────

export interface ErrorBannerProps {
  title?: string;
  message: string;
  /** Correlation ID from the canonical error contract — shown for support. */
  requestId?: string;
  /** When provided, renders a Retry button wired to this callback. */
  onRetry?: () => void;
  retrying?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorBanner({
  title = 'Something went wrong',
  message,
  requestId,
  onRetry,
  retrying,
  onDismiss,
  className = '',
}: ErrorBannerProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm ${className}`}
    >
      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-destructive">{title}</p>
        <p className="text-foreground/80 break-words">{message}</p>
        {requestId && (
          <p className="text-xs text-muted-foreground mt-1">
            Reference: {requestId} — include this if you contact support.
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 gap-1"
            onClick={onRetry}
            disabled={retrying}
          >
            <RefreshCw className={`h-3 w-3 ${retrying ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        )}
        {onDismiss && (
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={onDismiss}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── SuccessNotice ───────────────────────────────────────────────────────────

export function SuccessNotice({
  message,
  autoDismissMs = 3000,
  onDismiss,
}: {
  message: string;
  autoDismissMs?: number;
  onDismiss?: () => void;
}) {
  useEffect(() => {
    if (!autoDismissMs || !onDismiss) return;
    const t = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(t);
  }, [autoDismissMs, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 p-3 text-sm"
    >
      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
      <p className="text-green-800 dark:text-green-400">{message}</p>
    </div>
  );
}

// ── InfoNotice ──────────────────────────────────────────────────────────────

export function InfoNotice({
  message,
  tone = 'info',
}: {
  message: string;
  tone?: 'info' | 'warning';
}) {
  const isWarning = tone === 'warning';
  return (
    <div
      role={isWarning ? 'alert' : 'status'}
      className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
        isWarning
          ? 'border-amber-500/30 bg-amber-500/5'
          : 'border-blue-500/30 bg-blue-500/5'
      }`}
    >
      {isWarning ? (
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
      ) : (
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-600" />
      )}
      <p className="break-words">{message}</p>
    </div>
  );
}

// ── EmptyState ──────────────────────────────────────────────────────────────

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && <div className="mb-3 text-muted-foreground/60">{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="text-muted-foreground text-sm mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── LoadingState ────────────────────────────────────────────────────────────

export function LoadingState({
  label = 'Loading…',
  className = 'py-12',
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-2 ${className}`}
    >
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

// ── ConfirmDialog ───────────────────────────────────────────────────────────

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden />
                Working…
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── FieldError ──────────────────────────────────────────────────────────────

export function FieldError({ message, id }: { message?: string | null; id?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-sm text-destructive mt-1">
      {message}
    </p>
  );
}

// Offline/reconnecting presentation is owned by the existing global
// BackendStatusOverlay (components/backend-status-overlay.tsx) — do NOT add
// a second banner (ERROR-UX-RELIABILITY1 Phase 5: no duplicated alerts).
