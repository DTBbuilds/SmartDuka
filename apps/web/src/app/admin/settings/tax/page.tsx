'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Textarea,
} from '@smartduka/ui';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/use-toast';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface TaxSettings {
  enabled: boolean;
  rate: number;
  name: string;
  description: string;
  appliedByDefault: boolean;
}

interface ShopSettings {
  _id?: string;
  shopId: string;
  tax: TaxSettings;
  taxExemptProducts: string[];
  categoryTaxRates: Record<string, { rate: number; exempt: boolean }>;
  createdAt?: string;
  updatedAt?: string;
}

export default function TaxSettingsPage() {
  const { user, shop, token } = useAuth();
  const { toast } = useToast();

  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!shop?.id) return;
    fetchSettings();
  }, [shop?.id]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${base}/shop-settings/${shop?.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('Failed to load settings');

      const data = await res.json();
      setSettings(data);
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Error',
        message: err?.message || 'Failed to load tax settings',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings || !shop?.id) return;

    try {
      setSaving(true);
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${base}/shop-settings/${shop.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tax: settings.tax,
          taxExemptProducts: settings.taxExemptProducts,
          categoryTaxRates: settings.categoryTaxRates,
        }),
      });

      if (!res.ok) throw new Error('Failed to save settings');

      toast({
        type: 'success',
        title: 'Saved',
        message: 'Tax settings updated successfully',
      });
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Error',
        message: err?.message || 'Failed to save settings',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Failed to load settings</h1>
          <Button onClick={fetchSettings}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Tax Settings</h1>
            <p className="text-muted-foreground">
              Configure VAT and tax settings for your shop
            </p>
          </div>
        </div>

        {/* VAT Configuration Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>VAT Configuration</CardTitle>
            <CardDescription>
              Configure Value Added Tax (VAT) for Kenya
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enable VAT Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <Label className="text-base font-semibold">Enable VAT</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Turn VAT on or off for your shop
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.tax.enabled}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    tax: { ...settings.tax, enabled: e.target.checked },
                  })
                }
                className="h-5 w-5 rounded border-gray-300 cursor-pointer"
              />
            </div>

            {/* VAT Rate Input */}
            <div>
              <Label htmlFor="vat-rate" className="text-base font-semibold">
                VAT Rate (%)
              </Label>
              <p className="text-sm text-muted-foreground mb-2">
                Enter the VAT rate as a percentage (0-100)
              </p>
              <div className="flex gap-2">
                <Input
                  id="vat-rate"
                  type="number"
                  value={settings.tax.rate * 100}
                  onChange={(e) => {
                    const rate = Number(e.target.value) / 100;
                    if (rate >= 0 && rate <= 1) {
                      setSettings({
                        ...settings,
                        tax: { ...settings.tax, rate },
                      });
                    }
                  }}
                  step="0.1"
                  min="0"
                  max="100"
                  className="flex-1"
                />
                <div className="flex items-center px-4 py-2 bg-muted rounded-md">
                  <span className="font-semibold">
                    {(settings.tax.rate * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Tax Name Input */}
            <div>
              <Label htmlFor="tax-name" className="text-base font-semibold">
                Tax Name
              </Label>
              <p className="text-sm text-muted-foreground mb-2">
                Display name for the tax (e.g., VAT, GST, Sales Tax)
              </p>
              <Input
                id="tax-name"
                value={settings.tax.name}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    tax: { ...settings.tax, name: e.target.value },
                  })
                }
                placeholder="VAT"
              />
            </div>

            {/* Tax Description Input */}
            <div>
              <Label htmlFor="tax-description" className="text-base font-semibold">
                Tax Description
              </Label>
              <p className="text-sm text-muted-foreground mb-2">
                Description shown to customers
              </p>
              <Textarea
                id="tax-description"
                value={settings.tax.description}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    tax: { ...settings.tax, description: e.target.value },
                  })
                }
                placeholder="Value Added Tax (16%)"
                rows={3}
              />
            </div>

            {/* Apply by Default Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <Label className="text-base font-semibold">
                  Apply tax by default
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Automatically apply tax to all products unless marked as exempt
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.tax.appliedByDefault}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    tax: { ...settings.tax, appliedByDefault: e.target.checked },
                  })
                }
                className="h-5 w-5 rounded border-gray-300 cursor-pointer"
              />
            </div>

            {/* Info Box */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-900">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>ℹ️ Note:</strong> Tax settings apply to all new orders. You can
                mark specific products as tax-exempt in the product settings.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1"
            size="lg"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={fetchSettings}
            disabled={saving}
            size="lg"
          >
            Reset
          </Button>
        </div>

        {/* Info Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Tax Settings Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Current Settings</h4>
              <div className="space-y-1 text-muted-foreground">
                <p>
                  <strong>Status:</strong>{' '}
                  {settings.tax.enabled ? '✅ Enabled' : '❌ Disabled'}
                </p>
                <p>
                  <strong>Rate:</strong> {(settings.tax.rate * 100).toFixed(1)}%
                </p>
                <p>
                  <strong>Name:</strong> {settings.tax.name}
                </p>
                <p>
                  <strong>Applied by default:</strong>{' '}
                  {settings.tax.appliedByDefault ? 'Yes' : 'No'}
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Kenya VAT Information</h4>
              <p className="text-muted-foreground">
                Kenya's standard VAT rate is 16%. Some items are zero-rated or
                exempt. You can mark specific products as tax-exempt in the product
                settings.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
