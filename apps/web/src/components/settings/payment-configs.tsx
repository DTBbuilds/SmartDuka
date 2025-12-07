"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@smartduka/ui";
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertCircle,
  Loader2,
  Phone,
  Shield,
  RefreshCw,
  MoreVertical,
  Star,
  Power,
  PowerOff,
  History,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { config } from "@/lib/config";

// Types
interface PaymentConfig {
  _id: string;
  shopId: string;
  branchId?: string;
  provider: string;
  environment: string;
  name: string;
  shortCode: string;
  accountPrefix?: string;
  status: string;
  priority: number;
  isActive: boolean;
  isDefault: boolean;
  hasCredentials: boolean;
  maskedConsumerKey?: string;
  verifiedAt?: string;
  lastTestedAt?: string;
  lastTestResult?: string;
  version: number;
  totalTransactions: number;
  successfulTransactions: number;
  successRate: number;
  createdAt: string;
  updatedAt: string;
}

interface PaymentConfigsProps {
  token: string;
  onMessage: (message: { type: "success" | "error"; text: string }) => void;
}

const PROVIDERS = [
  { value: "mpesa_paybill", label: "M-Pesa Paybill" },
  { value: "mpesa_till", label: "M-Pesa Till (Buy Goods)" },
];

const ENVIRONMENTS = [
  { value: "sandbox", label: "Sandbox (Testing)" },
  { value: "production", label: "Production (Live)" },
];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-500",
  pending: "bg-yellow-500",
  verified: "bg-green-500",
  failed: "bg-red-500",
  suspended: "bg-orange-500",
};

export function PaymentConfigs({ token, onMessage }: PaymentConfigsProps) {
  const [configs, setConfigs] = useState<PaymentConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form state for new/edit config
  const [formData, setFormData] = useState({
    name: "",
    provider: "mpesa_till",
    environment: "sandbox",
    shortCode: "",
    accountPrefix: "",
    consumerKey: "",
    consumerSecret: "",
    passkey: "",
  });

  useEffect(() => {
    fetchConfigs();
  }, [token]);

  const fetchConfigs = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${config.apiUrl}/payments/configs`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setConfigs(data.data || []);
      } else {
        onMessage({ type: "error", text: "Failed to load payment configurations" });
      }
    } catch (error: any) {
      onMessage({ type: "error", text: error.message || "Failed to load configurations" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.shortCode) {
      onMessage({ type: "error", text: "Please fill in all required fields" });
      return;
    }

    try {
      setActionLoading("create");
      const response = await fetch(`${config.apiUrl}/payments/configs`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onMessage({ type: "success", text: "Configuration created successfully" });
        setIsCreating(false);
        resetForm();
        fetchConfigs();
      } else {
        onMessage({ type: "error", text: data.message || "Failed to create configuration" });
      }
    } catch (error: any) {
      onMessage({ type: "error", text: error.message || "Failed to create configuration" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      setActionLoading(id);
      const response = await fetch(`${config.apiUrl}/payments/configs/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onMessage({ type: "success", text: "Configuration updated successfully" });
        setEditingId(null);
        resetForm();
        fetchConfigs();
      } else {
        onMessage({ type: "error", text: data.message || "Failed to update configuration" });
      }
    } catch (error: any) {
      onMessage({ type: "error", text: error.message || "Failed to update configuration" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this configuration?")) return;

    try {
      setActionLoading(id);
      const response = await fetch(`${config.apiUrl}/payments/configs/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onMessage({ type: "success", text: "Configuration deleted" });
        fetchConfigs();
      } else {
        onMessage({ type: "error", text: data.message || "Failed to delete configuration" });
      }
    } catch (error: any) {
      onMessage({ type: "error", text: error.message || "Failed to delete configuration" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      setActionLoading(id);
      const response = await fetch(`${config.apiUrl}/payments/configs/${id}/activate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onMessage({ type: "success", text: "Configuration activated" });
        fetchConfigs();
      } else {
        onMessage({ type: "error", text: data.message || "Failed to activate configuration" });
      }
    } catch (error: any) {
      onMessage({ type: "error", text: error.message || "Failed to activate configuration" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      setActionLoading(id);
      const response = await fetch(`${config.apiUrl}/payments/configs/${id}/deactivate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onMessage({ type: "success", text: "Configuration deactivated" });
        fetchConfigs();
      } else {
        onMessage({ type: "error", text: data.message || "Failed to deactivate configuration" });
      }
    } catch (error: any) {
      onMessage({ type: "error", text: error.message || "Failed to deactivate configuration" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      setActionLoading(id);
      const response = await fetch(`${config.apiUrl}/payments/configs/${id}/set-default`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onMessage({ type: "success", text: "Set as default configuration" });
        fetchConfigs();
      } else {
        onMessage({ type: "error", text: data.message || "Failed to set as default" });
      }
    } catch (error: any) {
      onMessage({ type: "error", text: error.message || "Failed to set as default" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerify = async (id: string) => {
    try {
      setActionLoading(id);
      const response = await fetch(`${config.apiUrl}/payments/configs/${id}/verify`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onMessage({ type: "success", text: data.message || "Verification initiated" });
        fetchConfigs();
      } else {
        onMessage({ type: "error", text: data.message || "Verification failed" });
      }
    } catch (error: any) {
      onMessage({ type: "error", text: error.message || "Verification failed" });
    } finally {
      setActionLoading(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      provider: "mpesa_till",
      environment: "sandbox",
      shortCode: "",
      accountPrefix: "",
      consumerKey: "",
      consumerSecret: "",
      passkey: "",
    });
  };

  const startEdit = (cfg: PaymentConfig) => {
    setEditingId(cfg._id);
    setFormData({
      name: cfg.name,
      provider: cfg.provider,
      environment: cfg.environment,
      shortCode: cfg.shortCode,
      accountPrefix: cfg.accountPrefix || "",
      consumerKey: "",
      consumerSecret: "",
      passkey: "",
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Payment Configurations</h3>
          <p className="text-sm text-muted-foreground">
            Manage your M-Pesa Paybill and Till numbers
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
          <Plus className="h-4 w-4 mr-2" />
          Add Configuration
        </Button>
      </div>

      {/* No configs message */}
      {configs.length === 0 && !isCreating && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h4 className="font-semibold mb-2">No Payment Configurations</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Add your M-Pesa Paybill or Till number to start accepting payments
            </p>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Configuration
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Form */}
      {isCreating && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-base">New Payment Configuration</CardTitle>
            <CardDescription>Add a new M-Pesa Paybill or Till number</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Configuration Name *</Label>
                <Input
                  placeholder="e.g., Main Store Till"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Provider Type *</Label>
                <Select
                  value={formData.provider}
                  onValueChange={(v) => setFormData({ ...formData, provider: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Environment *</Label>
                <Select
                  value={formData.environment}
                  onValueChange={(v) => setFormData({ ...formData, environment: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENVIRONMENTS.map((e) => (
                      <SelectItem key={e.value} value={e.value}>
                        {e.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Short Code (Paybill/Till) *</Label>
                <Input
                  placeholder="e.g., 174379"
                  value={formData.shortCode}
                  onChange={(e) => setFormData({ ...formData, shortCode: e.target.value })}
                />
              </div>
            </div>

            {formData.provider === "mpesa_paybill" && (
              <div className="space-y-2">
                <Label>Account Prefix (Optional)</Label>
                <Input
                  placeholder="e.g., INV"
                  value={formData.accountPrefix}
                  onChange={(e) => setFormData({ ...formData, accountPrefix: e.target.value })}
                />
              </div>
            )}

            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium mb-3">Daraja API Credentials</h4>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Consumer Key</Label>
                  <Input
                    type="password"
                    placeholder="From Daraja portal"
                    value={formData.consumerKey}
                    onChange={(e) => setFormData({ ...formData, consumerKey: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Consumer Secret</Label>
                  <Input
                    type="password"
                    placeholder="From Daraja portal"
                    value={formData.consumerSecret}
                    onChange={(e) => setFormData({ ...formData, consumerSecret: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Passkey</Label>
                  <Input
                    type="password"
                    placeholder="From Safaricom"
                    value={formData.passkey}
                    onChange={(e) => setFormData({ ...formData, passkey: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleCreate} disabled={actionLoading === "create"}>
                {actionLoading === "create" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Create Configuration
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreating(false);
                  resetForm();
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Configs */}
      {configs.map((cfg) => (
        <Card
          key={cfg._id}
          className={`${cfg.isActive ? "border-green-500/40" : ""} ${
            cfg.isDefault ? "ring-2 ring-primary/20" : ""
          }`}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    cfg.isActive ? "bg-green-500/20" : "bg-muted"
                  }`}
                >
                  <Phone
                    className={`h-5 w-5 ${
                      cfg.isActive ? "text-green-600" : "text-muted-foreground"
                    }`}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{cfg.name}</CardTitle>
                    {cfg.isDefault && (
                      <Badge variant="outline" className="text-xs">
                        <Star className="h-3 w-3 mr-1" />
                        Default
                      </Badge>
                    )}
                  </div>
                  <CardDescription>
                    {cfg.shortCode} •{" "}
                    {PROVIDERS.find((p) => p.value === cfg.provider)?.label || cfg.provider}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={STATUS_COLORS[cfg.status] || "bg-gray-500"}>
                  {cfg.status}
                </Badge>
                <Badge variant={cfg.environment === "production" ? "default" : "secondary"}>
                  {cfg.environment}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedId(expandedId === cfg._id ? null : cfg._id)}
                >
                  {expandedId === cfg._id ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>

          {expandedId === cfg._id && (
            <CardContent className="pt-0">
              {/* Stats */}
              <div className="grid gap-4 md:grid-cols-4 mb-4">
                <div className="rounded-lg border p-3">
                  <div className="text-sm text-muted-foreground">Transactions</div>
                  <div className="font-semibold">{cfg.totalTransactions}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                  <div className="font-semibold">{cfg.successRate.toFixed(1)}%</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-sm text-muted-foreground">Version</div>
                  <div className="font-semibold">v{cfg.version}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-sm text-muted-foreground">Credentials</div>
                  <div className="font-semibold">
                    {cfg.hasCredentials ? (
                      <span className="text-green-600">Configured</span>
                    ) : (
                      <span className="text-red-600">Missing</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                {cfg.status === "verified" && !cfg.isActive && (
                  <Button
                    size="sm"
                    onClick={() => handleActivate(cfg._id)}
                    disabled={actionLoading === cfg._id}
                  >
                    {actionLoading === cfg._id ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Power className="h-4 w-4 mr-1" />
                    )}
                    Activate
                  </Button>
                )}

                {cfg.isActive && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeactivate(cfg._id)}
                    disabled={actionLoading === cfg._id}
                  >
                    {actionLoading === cfg._id ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <PowerOff className="h-4 w-4 mr-1" />
                    )}
                    Deactivate
                  </Button>
                )}

                {!cfg.isDefault && cfg.isActive && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSetDefault(cfg._id)}
                    disabled={actionLoading === cfg._id}
                  >
                    <Star className="h-4 w-4 mr-1" />
                    Set Default
                  </Button>
                )}

                {cfg.hasCredentials && cfg.status !== "verified" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleVerify(cfg._id)}
                    disabled={actionLoading === cfg._id}
                  >
                    {actionLoading === cfg._id ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Shield className="h-4 w-4 mr-1" />
                    )}
                    Verify
                  </Button>
                )}

                <Button size="sm" variant="outline" onClick={() => startEdit(cfg)}>
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </Button>

                {!cfg.isActive && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(cfg._id)}
                    disabled={actionLoading === cfg._id}
                  >
                    {actionLoading === cfg._id ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-1" />
                    )}
                    Delete
                  </Button>
                )}
              </div>

              {/* Edit Form */}
              {editingId === cfg._id && (
                <div className="mt-4 pt-4 border-t space-y-4">
                  <h4 className="font-medium">Edit Configuration</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Configuration Name</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Short Code</Label>
                      <Input
                        value={formData.shortCode}
                        onChange={(e) => setFormData({ ...formData, shortCode: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h5 className="text-sm font-medium mb-3">
                      Update Credentials (leave blank to keep existing)
                    </h5>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Consumer Key</Label>
                        <Input
                          type="password"
                          placeholder="New consumer key"
                          value={formData.consumerKey}
                          onChange={(e) =>
                            setFormData({ ...formData, consumerKey: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Consumer Secret</Label>
                        <Input
                          type="password"
                          placeholder="New consumer secret"
                          value={formData.consumerSecret}
                          onChange={(e) =>
                            setFormData({ ...formData, consumerSecret: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Passkey</Label>
                        <Input
                          type="password"
                          placeholder="New passkey"
                          value={formData.passkey}
                          onChange={(e) => setFormData({ ...formData, passkey: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleUpdate(cfg._id)}
                      disabled={actionLoading === cfg._id}
                    >
                      {actionLoading === cfg._id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingId(null);
                        resetForm();
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
