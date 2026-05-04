"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from "@smartduka/ui";
import {
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Unlink,
  Link as LinkIcon,
  Shield,
  Zap,
  Lock,
} from "lucide-react";
import { config } from "@/lib/config";

interface StripeConnectStatus {
  success: boolean;
  isConnected: boolean;
  isCardReady: boolean;
  accountId?: string;
  environment?: "live" | "test";
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  currentlyDueRequirements?: string[];
  pastDueRequirements?: string[];
  disabledReason?: string;
  country?: string;
  defaultCurrency?: string;
  displayName?: string;
  email?: string;
  connectedAt?: string;
  disconnectedAt?: string;
  lastSyncedAt?: string;
}

interface StripeConnectSettingsProps {
  token: string;
  onMessage: (message: { type: "success" | "error"; text: string }) => void;
}

export function StripeConnectSettings({
  token,
  onMessage,
}: StripeConnectSettingsProps) {
  const [status, setStatus] = useState<StripeConnectStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${config.apiUrl}/stripe/connect/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      setStatus(data);
    } catch (err: any) {
      console.error("Failed to fetch Stripe Connect status:", err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchStatus();
  }, [token, fetchStatus]);

  // Check for OAuth callback query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeConnect = params.get("stripe_connect");
    if (stripeConnect === "success") {
      onMessage({ type: "success", text: "Stripe account connected successfully!" });
      fetchStatus();
      // Clean up the URL
      const url = new URL(window.location.href);
      url.searchParams.delete("stripe_connect");
      url.searchParams.delete("reason");
      window.history.replaceState({}, "", url.toString());
    } else if (stripeConnect === "error") {
      const reason = params.get("reason") || "Unknown error";
      onMessage({
        type: "error",
        text: `Stripe connection failed: ${reason}`,
      });
      const url = new URL(window.location.href);
      url.searchParams.delete("stripe_connect");
      url.searchParams.delete("reason");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      const res = await fetch(`${config.apiUrl}/stripe/connect/oauth-url`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        onMessage({
          type: "error",
          text: data.message || "Failed to generate Stripe authorization URL",
        });
      }
    } catch (err: any) {
      onMessage({
        type: "error",
        text: err.message || "Failed to start Stripe connection",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (
      !window.confirm(
        "Are you sure you want to disconnect your Stripe account?\n\n" +
          "Card payments will be disabled immediately until you reconnect."
      )
    ) {
      return;
    }

    try {
      setIsDisconnecting(true);
      const res = await fetch(`${config.apiUrl}/stripe/connect/disconnect`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        onMessage({
          type: "success",
          text: "Stripe account disconnected. Card payments are now disabled.",
        });
        await fetchStatus();
      } else {
        throw new Error(data.message || "Failed to disconnect");
      }
    } catch (err: any) {
      onMessage({
        type: "error",
        text: err.message || "Failed to disconnect Stripe account",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch(`${config.apiUrl}/stripe/connect/refresh`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setStatus(data);
        onMessage({ type: "success", text: "Status refreshed from Stripe" });
      } else {
        throw new Error(data.message || "Refresh failed");
      }
    } catch (err: any) {
      onMessage({
        type: "error",
        text: err.message || "Failed to refresh Stripe status",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDashboard = async () => {
    try {
      const res = await fetch(`${config.apiUrl}/stripe/connect/dashboard-link`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.url) {
        window.open(data.url, "_blank", "noopener");
      } else {
        onMessage({
          type: "error",
          text: "Failed to get dashboard link",
        });
      }
    } catch {
      onMessage({ type: "error", text: "Failed to open Stripe dashboard" });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#635BFF]" />
          <p className="text-sm text-muted-foreground">Loading Stripe status...</p>
        </CardContent>
      </Card>
    );
  }

  const isConnected = status?.isConnected ?? false;
  const isCardReady = status?.isCardReady ?? false;
  const hasRequirements =
    (status?.currentlyDueRequirements?.length ?? 0) > 0 ||
    (status?.pastDueRequirements?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      {/* ── Hero Card with Branding ── */}
      <Card className="overflow-hidden border-0 shadow-lg">
        {/* Purple gradient header */}
        <div className="bg-gradient-to-r from-[#635BFF] via-[#7B73FF] to-[#A399FF] px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Logo strip */}
            <div className="flex items-center gap-3 bg-white/95 rounded-xl px-4 py-2.5 shadow-md">
              <Image src="/images/payments/stripe.svg" alt="Stripe" width={64} height={28} className="h-7 w-auto" unoptimized />
              <div className="w-px h-6 bg-gray-300" />
              <Image src="/images/payments/visa.svg" alt="Visa" width={50} height={18} className="h-5 w-auto" unoptimized />
              <Image src="/images/payments/mastercard.svg" alt="Mastercard" width={36} height={24} className="h-6 w-auto" unoptimized />
            </div>
            <div className="flex-1">
              <h2 className="text-white text-lg sm:text-xl font-bold">Card Payment Configuration</h2>
              <p className="text-purple-200 text-sm mt-0.5">Accept Visa, Mastercard & more via Stripe</p>
            </div>
            {isConnected && (
              <div className="flex items-center gap-2">
                <Badge className={`text-sm px-3 py-1 ${isCardReady ? 'bg-white text-[#635BFF]' : 'bg-yellow-400 text-yellow-900'}`}>
                  {isCardReady ? 'Active' : 'Pending'}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                >
                  {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>

          {/* Accepted cards strip */}
          {!isConnected && (
            <div className="mt-5 flex items-center gap-2 text-purple-200 text-xs">
              <span>Accept:</span>
              <div className="flex items-center gap-2 bg-white/15 rounded-lg px-3 py-1.5">
                <Image src="/images/payments/visa.svg" alt="Visa" width={40} height={14} className="h-3.5 w-auto brightness-0 invert" unoptimized />
                <Image src="/images/payments/mastercard.svg" alt="Mastercard" width={28} height={18} className="h-4.5 w-auto" unoptimized />
                <span className="text-white/80 text-[10px]">+ Apple Pay, Google Pay</span>
              </div>
            </div>
          )}
        </div>

        {/* Trust / Security strip */}
        <div className="bg-purple-50 dark:bg-purple-950/40 border-b border-purple-200 dark:border-purple-800 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-purple-700 dark:text-purple-400">
          <span className="flex items-center gap-1"><Lock className="h-3.5 w-3.5" /> 256-bit SSL</span>
          <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> PCI DSS Level 1</span>
          <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> Stripe Certified</span>
        </div>
      </Card>

      {/* ── Status Banner ── */}
      {isConnected ? (
        isCardReady ? (
          <Card className="border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
            <CardContent className="pt-5 pb-4">
              <div className="flex gap-3 items-start">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/40 shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-800 dark:text-green-300 text-sm">Connected & Ready</h3>
                  <p className="text-xs sm:text-sm text-green-700/80 dark:text-green-300/70 mt-0.5">
                    Your shop accepts Visa, Mastercard and other card payments. Charges go directly to your Stripe account.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-amber-300/60 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
            <CardContent className="pt-5 pb-4">
              <div className="flex gap-3 items-start">
                <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/40 shrink-0">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-800 dark:text-amber-300 text-sm">Connected — Action Required</h3>
                  <p className="text-xs sm:text-sm text-amber-700/80 dark:text-amber-300/70 mt-0.5">
                    Account linked but card payments disabled until you complete onboarding in your Stripe dashboard.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <Card className="border-dashed border-2 border-muted-foreground/20">
          <CardContent className="pt-5 pb-4">
            <div className="flex gap-3 items-start">
              <div className="p-2 rounded-full bg-muted shrink-0">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Not Connected</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Connect your Stripe account to start accepting card payments. Setup takes less than 5 minutes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Connection Details ── */}
      {isConnected && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Account</p>
            <p className="font-semibold text-sm truncate">{status?.displayName || status?.email || status?.accountId || '---'}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Environment</p>
            <Badge variant={status?.environment === 'live' ? 'default' : 'secondary'} className="text-xs">
              {status?.environment === 'live' ? 'Live' : 'Test'}
            </Badge>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Charges</p>
            <CapabilityBadge enabled={status?.chargesEnabled} label="Charges" />
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Payouts</p>
            <CapabilityBadge enabled={status?.payoutsEnabled} label="Payouts" />
          </Card>
        </div>
      )}

      {/* ── Outstanding Requirements ── */}
      {isConnected && hasRequirements && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="pt-5 pb-4">
            <p className="font-medium text-amber-900 dark:text-amber-200 text-sm mb-2">Outstanding Requirements</p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-amber-800 dark:text-amber-300">
              {(status?.pastDueRequirements || []).map((r) => (
                <li key={r}><span className="font-medium">Past due:</span> {formatRequirement(r)}</li>
              ))}
              {(status?.currentlyDueRequirements || []).map((r) => (
                <li key={r}>{formatRequirement(r)}</li>
              ))}
            </ul>
            <Button variant="outline" size="sm" className="mt-3" onClick={handleDashboard}>
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Complete in Stripe Dashboard
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Actions ── */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-col sm:flex-row gap-2">
            {isConnected ? (
              <>
                <Button variant="outline" onClick={handleDashboard} className="border-[#635BFF]/30 text-[#635BFF] hover:bg-[#635BFF]/5">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Stripe Dashboard
                </Button>
                <Button variant="destructive" onClick={handleDisconnect} disabled={isDisconnecting}>
                  {isDisconnecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Unlink className="h-4 w-4 mr-2" />}
                  Disconnect
                </Button>
              </>
            ) : (
              <Button onClick={handleConnect} disabled={isConnecting} size="lg" className="bg-[#635BFF] hover:bg-[#5349E0] text-white shadow-lg shadow-[#635BFF]/25">
                {isConnecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LinkIcon className="h-4 w-4 mr-2" />}
                Connect Stripe Account
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── How It Works ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-[#635BFF]" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <InfoBlock
              icon={<LinkIcon className="h-5 w-5 text-blue-500" />}
              title="OAuth Connect"
              description="Authorize via Stripe's secure flow. We never see or store your secret keys."
            />
            <InfoBlock
              icon={<Zap className="h-5 w-5 text-amber-500" />}
              title="Direct Charges"
              description="Payments go directly to your Stripe account. View everything in your dashboard."
            />
            <InfoBlock
              icon={<Shield className="h-5 w-5 text-green-500" />}
              title="Full Control"
              description="Disconnect anytime. Card payments stop immediately until you reconnect."
            />
          </div>

          {/* Accepted cards footer */}
          <div className="mt-5 pt-4 border-t flex flex-wrap items-center justify-center gap-4">
            <span className="text-xs text-muted-foreground">Cards accepted via Stripe:</span>
            <div className="flex items-center gap-3">
              <Image src="/images/payments/visa.svg" alt="Visa" width={50} height={18} className="h-5 w-auto opacity-70" unoptimized />
              <Image src="/images/payments/mastercard.svg" alt="Mastercard" width={36} height={24} className="h-6 w-auto opacity-70" unoptimized />
              <Image src="/images/payments/stripe.svg" alt="Stripe" width={54} height={24} className="h-5 w-auto opacity-70" unoptimized />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// SMALL HELPER COMPONENTS
// ────────────────────────────────────────────────────────────

function DetailItem({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </dt>
      <dd className={`mt-1 text-sm ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

function CapabilityBadge({
  enabled,
  label,
}: {
  enabled?: boolean;
  label: string;
}) {
  return enabled ? (
    <Badge
      variant="default"
      className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-800"
    >
      <CheckCircle className="h-3 w-3 mr-1" />
      Enabled
    </Badge>
  ) : (
    <Badge variant="secondary">
      <XCircle className="h-3 w-3 mr-1" />
      Disabled
    </Badge>
  );
}

function InfoBlock({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function formatRequirement(key: string): string {
  return key
    .replace(/\./g, " > ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
