"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
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
  Info,
  Zap,
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
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading Stripe status...</span>
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
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Stripe Card Payments
              </CardTitle>
              <CardDescription className="mt-1">
                Connect your Stripe account to accept card payments at your POS.
                Funds settle directly into your Stripe balance.
              </CardDescription>
            </div>
            {isConnected && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-1.5 hidden sm:inline">Refresh</span>
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status Banner */}
          {isConnected ? (
            isCardReady ? (
              <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
                <CheckCircle className="h-5 w-5 mt-0.5 text-green-600 dark:text-green-400 shrink-0" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-200">
                    Connected &amp; Ready
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-400 mt-0.5">
                    Your shop can accept card payments. Charges go directly to
                    your Stripe account.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
                <AlertCircle className="h-5 w-5 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <p className="font-medium text-amber-900 dark:text-amber-200">
                    Connected — Action Required
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                    Your Stripe account is linked, but card payments are disabled
                    until you complete onboarding in your Stripe dashboard.
                  </p>
                </div>
              </div>
            )
          ) : (
            <div className="flex items-start gap-3 rounded-lg border border-muted bg-muted/30 p-4">
              <Info className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="font-medium">Not Connected</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Connect your Stripe account to start accepting card payments
                  from customers.
                </p>
              </div>
            </div>
          )}

          {/* Connection Details */}
          {isConnected && (
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailItem
                label="Account"
                value={
                  status?.displayName ||
                  status?.email ||
                  status?.accountId ||
                  "—"
                }
              />
              <DetailItem
                label="Account ID"
                value={status?.accountId || "—"}
                mono
              />
              <DetailItem
                label="Environment"
                value={
                  <Badge
                    variant={
                      status?.environment === "live" ? "default" : "secondary"
                    }
                    className="text-xs"
                  >
                    {status?.environment === "live" ? "Live" : "Test"}
                  </Badge>
                }
              />
              <DetailItem
                label="Currency"
                value={status?.defaultCurrency?.toUpperCase() || "—"}
              />
              <DetailItem
                label="Charges"
                value={
                  <CapabilityBadge
                    enabled={status?.chargesEnabled}
                    label="Charges"
                  />
                }
              />
              <DetailItem
                label="Payouts"
                value={
                  <CapabilityBadge
                    enabled={status?.payoutsEnabled}
                    label="Payouts"
                  />
                }
              />
              {status?.connectedAt && (
                <DetailItem
                  label="Connected"
                  value={new Date(status.connectedAt).toLocaleDateString()}
                />
              )}
              {status?.lastSyncedAt && (
                <DetailItem
                  label="Last Synced"
                  value={new Date(status.lastSyncedAt).toLocaleString()}
                />
              )}
            </div>
          )}

          {/* Outstanding Requirements */}
          {isConnected && hasRequirements && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
              <p className="font-medium text-amber-900 dark:text-amber-200 text-sm mb-2">
                Outstanding Requirements
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-amber-800 dark:text-amber-300">
                {(status?.pastDueRequirements || []).map((r) => (
                  <li key={r}>
                    <span className="font-medium">Past due:</span>{" "}
                    {formatRequirement(r)}
                  </li>
                ))}
                {(status?.currentlyDueRequirements || []).map((r) => (
                  <li key={r}>{formatRequirement(r)}</li>
                ))}
              </ul>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={handleDashboard}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Complete in Stripe Dashboard
              </Button>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-2">
            {isConnected ? (
              <>
                <Button variant="outline" onClick={handleDashboard}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Stripe Dashboard
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                >
                  {isDisconnecting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Unlink className="h-4 w-4 mr-2" />
                  )}
                  Disconnect
                </Button>
              </>
            ) : (
              <Button onClick={handleConnect} disabled={isConnecting} size="lg">
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <LinkIcon className="h-4 w-4 mr-2" />
                )}
                Connect Stripe Account
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Security Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <InfoBlock
              icon={<LinkIcon className="h-5 w-5 text-blue-500" />}
              title="OAuth Connect"
              description="You authorize SmartDuka via Stripe's secure OAuth flow. We never see or store your Stripe secret keys."
            />
            <InfoBlock
              icon={<Zap className="h-5 w-5 text-amber-500" />}
              title="Direct Charges"
              description="Card payments are processed directly on your Stripe account. You see them in your own Stripe dashboard."
            />
            <InfoBlock
              icon={<Shield className="h-5 w-5 text-green-500" />}
              title="Full Control"
              description="You can disconnect at any time from here or from your Stripe dashboard. Card payments stop immediately."
            />
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
