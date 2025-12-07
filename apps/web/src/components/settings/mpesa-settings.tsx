"use client";

import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  Input,
  Label,
  Button,
  Badge,
} from "@smartduka/ui";
import { 
  Phone, 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  Info,
} from "lucide-react";
import { config } from "@/lib/config";

interface MpesaConfig {
  type: 'paybill' | 'till';
  shortCode: string;
  accountPrefix?: string;
  callbackUrl?: string;
  isConfigured: boolean;
  isVerified: boolean;
  hasCredentials: boolean;
  consumerKey?: string;
  enabled?: boolean;
  verificationStatus?: 'pending' | 'verified' | 'failed';
  lastTestedAt?: string;
}

interface MpesaSettingsProps {
  token: string;
  onMessage: (message: { type: "success" | "error"; text: string }) => void;
}

export function MpesaSettings({ token, onMessage }: MpesaSettingsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  
  const [mpesaConfig, setMpesaConfig] = useState<MpesaConfig | null>(null);
  
  // Form data for updating M-Pesa config
  const [formData, setFormData] = useState({
    type: 'paybill' as 'paybill' | 'till',
    shortCode: '',
    consumerKey: '',
    consumerSecret: '',
    passkey: '',
    accountPrefix: '',
    enabled: false,
  });

  // Fetch current M-Pesa configuration
  useEffect(() => {
    fetchMpesaConfig();
  }, [token]);

  const fetchMpesaConfig = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${config.apiUrl}/payments/mpesa/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setMpesaConfig(data);
        setFormData({
          type: data.type || 'paybill',
          shortCode: data.shortCode || '',
          consumerKey: '',
          consumerSecret: '',
          passkey: '',
          accountPrefix: data.accountPrefix || '',
          enabled: data.isShopSpecific || false,
        });
      }
    } catch (error) {
      console.error("Failed to fetch M-Pesa config:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveMpesaConfig = async () => {
    if (!formData.shortCode) {
      onMessage({ type: "error", text: "Paybill/Till number is required" });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`${config.apiUrl}/payments/mpesa/config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: formData.type,
          shortCode: formData.shortCode,
          consumerKey: formData.consumerKey || undefined,
          consumerSecret: formData.consumerSecret || undefined,
          passkey: formData.passkey || undefined,
          accountPrefix: formData.accountPrefix || undefined,
          enabled: formData.enabled,
        }),
      });

      if (res.ok) {
        onMessage({ type: "success", text: "M-Pesa configuration saved. Please verify your credentials." });
        // Clear sensitive fields after save
        setFormData(prev => ({
          ...prev,
          consumerKey: '',
          consumerSecret: '',
          passkey: '',
        }));
        // Refresh config
        await fetchMpesaConfig();
      } else {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Failed to save M-Pesa configuration");
      }
    } catch (error: any) {
      onMessage({ type: "error", text: error.message || "Failed to save M-Pesa configuration" });
    } finally {
      setIsSaving(false);
    }
  };

  const verifyCredentials = async () => {
    setIsVerifying(true);
    try {
      const res = await fetch(`${config.apiUrl}/payments/mpesa/config/verify`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      
      if (data.success) {
        onMessage({ type: "success", text: "M-Pesa credentials verified successfully!" });
      } else {
        onMessage({ type: "error", text: data.message || "Credential verification failed" });
      }
      
      // Refresh config to get updated verification status
      await fetchMpesaConfig();
    } catch (error: any) {
      onMessage({ type: "error", text: error.message || "Failed to verify credentials" });
    } finally {
      setIsVerifying(false);
    }
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
      {/* Required Setup Warning */}
      {mpesaConfig && !mpesaConfig.isConfigured && (
        <Card className="border-orange-500/40 bg-orange-500/10">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="p-3 rounded-full bg-orange-500/20 h-fit">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-orange-700 dark:text-orange-400 mb-2">
                  M-Pesa Configuration Required
                </h3>
                <p className="text-sm text-orange-700/80 dark:text-orange-300/80 mb-3">
                  Your shop cannot accept M-Pesa payments until you configure your own Paybill or Till number. 
                  Each shop must use their own M-Pesa credentials - there is no shared/platform account.
                </p>
                <ul className="text-sm text-orange-700/80 dark:text-orange-300/80 list-disc list-inside space-y-1">
                  <li>Enter your Paybill or Till number</li>
                  <li>Add your Daraja API credentials (Consumer Key, Secret, Passkey)</li>
                  <li>Verify your credentials</li>
                  <li>Enable M-Pesa payments</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                M-Pesa Payment Configuration
              </CardTitle>
              <CardDescription>
                Configure your M-Pesa Paybill or Till number for receiving payments
              </CardDescription>
            </div>
            {mpesaConfig && mpesaConfig.isConfigured && (
              <Badge 
                variant="default"
                className={mpesaConfig.isVerified ? "bg-green-600" : "bg-yellow-600"}
              >
                {mpesaConfig.isVerified ? "Verified" : "Pending Verification"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Status Overview */}
          {mpesaConfig && (
            <div className="grid gap-4 md:grid-cols-3 mb-6">
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground mb-1">Account Type</div>
                <div className="font-semibold capitalize">{mpesaConfig.type || 'Not Set'}</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground mb-1">Short Code</div>
                <div className="font-semibold font-mono">{mpesaConfig.shortCode || 'Not Set'}</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground mb-1">Status</div>
                <div className="flex items-center gap-2">
                  {mpesaConfig.verificationStatus === 'verified' ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-semibold text-green-600">Verified</span>
                    </>
                  ) : mpesaConfig.verificationStatus === 'failed' ? (
                    <>
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="font-semibold text-red-600">Failed</span>
                    </>
                  ) : mpesaConfig.hasCredentials ? (
                    <>
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <span className="font-semibold text-yellow-600">Pending Verification</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-muted-foreground">Not Configured</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Info Banner */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 mb-6">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">Multi-Tenant M-Pesa Support</p>
                <p>
                  Configure your own M-Pesa Paybill or Till number to receive payments directly to your account.
                  If not configured, payments will use the platform's shared account.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            M-Pesa Credentials
          </CardTitle>
          <CardDescription>
            Enter your Safaricom Daraja API credentials. These are encrypted and stored securely.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Account Type */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mpesaType">Account Type</Label>
              <select
                id="mpesaType"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'paybill' | 'till' })}
                className="w-full px-3 py-2 border rounded-md bg-background"
              >
                <option value="paybill">Paybill</option>
                <option value="till">Till Number (Buy Goods)</option>
              </select>
              <p className="text-xs text-muted-foreground">
                {formData.type === 'paybill' 
                  ? 'Paybill allows customers to enter an account number'
                  : 'Till number is for Buy Goods payments (no account number)'}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="shortCode">
                {formData.type === 'paybill' ? 'Paybill Number' : 'Till Number'}
              </Label>
              <Input
                id="shortCode"
                value={formData.shortCode}
                onChange={(e) => setFormData({ ...formData, shortCode: e.target.value })}
                placeholder={formData.type === 'paybill' ? '123456' : '5678901'}
              />
            </div>
          </div>

          {/* Account Prefix (for Paybill only) */}
          {formData.type === 'paybill' && (
            <div className="space-y-2">
              <Label htmlFor="accountPrefix">Account Number Prefix (Optional)</Label>
              <Input
                id="accountPrefix"
                value={formData.accountPrefix}
                onChange={(e) => setFormData({ ...formData, accountPrefix: e.target.value })}
                placeholder="INV-"
              />
              <p className="text-xs text-muted-foreground">
                Prefix added to order numbers for the account reference (e.g., INV-12345)
              </p>
            </div>
          )}

          {/* Daraja API Credentials */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium">Daraja API Credentials</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSecrets(!showSecrets)}
              >
                {showSecrets ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showSecrets ? 'Hide' : 'Show'}
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="consumerKey">Consumer Key</Label>
                <Input
                  id="consumerKey"
                  type={showSecrets ? "text" : "password"}
                  value={formData.consumerKey}
                  onChange={(e) => setFormData({ ...formData, consumerKey: e.target.value })}
                  placeholder={mpesaConfig?.hasCredentials ? "••••••••••••" : "Enter consumer key"}
                />
                {mpesaConfig?.consumerKey && (
                  <p className="text-xs text-muted-foreground">
                    Current: {mpesaConfig.consumerKey} (leave blank to keep existing)
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="consumerSecret">Consumer Secret</Label>
                <Input
                  id="consumerSecret"
                  type={showSecrets ? "text" : "password"}
                  value={formData.consumerSecret}
                  onChange={(e) => setFormData({ ...formData, consumerSecret: e.target.value })}
                  placeholder={mpesaConfig?.hasCredentials ? "••••••••••••" : "Enter consumer secret"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="passkey">Passkey (for STK Push)</Label>
                <Input
                  id="passkey"
                  type={showSecrets ? "text" : "password"}
                  value={formData.passkey}
                  onChange={(e) => setFormData({ ...formData, passkey: e.target.value })}
                  placeholder={mpesaConfig?.hasCredentials ? "••••••••••••" : "Enter passkey"}
                />
              </div>
            </div>
          </div>

          {/* Enable Toggle */}
          <div className="border-t pt-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <div>
                <span className="font-medium">Enable Custom M-Pesa Configuration</span>
                <p className="text-sm text-muted-foreground">
                  When enabled, payments will use your M-Pesa credentials instead of the platform default
                </p>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button onClick={saveMpesaConfig} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Configuration"
              )}
            </Button>
            
            {mpesaConfig?.hasCredentials && (
              <Button 
                variant="outline" 
                onClick={verifyCredentials} 
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Verify Credentials
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Complete Setup Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            Complete M-Pesa Setup Guide
          </CardTitle>
          <CardDescription>
            Follow these steps to set up M-Pesa payments for your shop
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Get a Paybill or Till Number */}
          <div className="border-l-4 border-primary pl-4">
            <h4 className="font-semibold text-base mb-2">Step 1: Get a Paybill or Till Number</h4>
            <p className="text-sm text-muted-foreground mb-3">
              If you don't have one yet, you need to register with Safaricom for M-Pesa business services.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm">
              <div>
                <p className="font-medium mb-1">Option A: Till Number (Buy Goods) - Easier & Faster</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                  <li>Visit any Safaricom Shop with your ID and business documents</li>
                  <li>Or dial *234# → My Account → M-Pesa → Lipa Na M-Pesa → Buy Goods</li>
                  <li>You'll get a Till Number within 24-48 hours</li>
                  <li>Cost: Free to register, 0.5% transaction fee</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-1">Option B: Paybill Number - For Larger Businesses</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                  <li>Apply at <a href="https://www.safaricom.co.ke/business/sme/m-pesa-payment-solutions/m-pesa-paybill" target="_blank" rel="noopener noreferrer" className="text-primary underline">Safaricom Business Portal</a></li>
                  <li>Requires: Business registration, KRA PIN, bank account</li>
                  <li>Processing time: 5-10 business days</li>
                  <li>Cost: KES 3,000 setup fee + monthly fees</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Step 2: Register on Daraja Portal */}
          <div className="border-l-4 border-primary pl-4">
            <h4 className="font-semibold text-base mb-2">Step 2: Register on Safaricom Daraja Portal</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Daraja is Safaricom's API platform that allows your shop to send payment requests to customers.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-3">
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>
                  Go to <a href="https://developer.safaricom.co.ke" target="_blank" rel="noopener noreferrer" className="text-primary underline font-medium">developer.safaricom.co.ke</a>
                </li>
                <li>Click <strong>"Sign Up"</strong> (top right corner)</li>
                <li>Fill in your details:
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li>Use your business email</li>
                    <li>Create a strong password</li>
                    <li>Verify your email</li>
                  </ul>
                </li>
                <li>Log in to your new account</li>
              </ol>
            </div>
          </div>

          {/* Step 3: Create an App */}
          <div className="border-l-4 border-primary pl-4">
            <h4 className="font-semibold text-base mb-2">Step 3: Create Your App on Daraja</h4>
            <p className="text-sm text-muted-foreground mb-3">
              An "App" on Daraja gives you the API credentials needed to connect your shop.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-3">
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>After logging in, click <strong>"My Apps"</strong> in the menu</li>
                <li>Click <strong>"Add a New App"</strong></li>
                <li>Fill in the app details:
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li><strong>App Name:</strong> Your shop name (e.g., "My Duka Payments")</li>
                    <li><strong>App Description:</strong> Brief description of your business</li>
                  </ul>
                </li>
                <li>Select the APIs you need:
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li>✅ <strong>Lipa Na M-Pesa Online</strong> (STK Push) - Required!</li>
                    <li>✅ M-Pesa Express Query (optional - for checking payment status)</li>
                  </ul>
                </li>
                <li>Click <strong>"Create App"</strong></li>
              </ol>
            </div>
          </div>

          {/* Step 4: Get Your Credentials */}
          <div className="border-l-4 border-primary pl-4">
            <h4 className="font-semibold text-base mb-2">Step 4: Get Your API Credentials</h4>
            <p className="text-sm text-muted-foreground mb-3">
              After creating your app, you'll get the credentials needed for this settings page.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-3">
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Go to <strong>"My Apps"</strong> and click on your app</li>
                <li>You'll see two tabs: <strong>Sandbox</strong> and <strong>Production</strong></li>
                <li>For testing, use <strong>Sandbox</strong> credentials first</li>
                <li>Copy these values:
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li><strong>Consumer Key:</strong> A long string of letters and numbers</li>
                    <li><strong>Consumer Secret:</strong> Another long string (keep this secret!)</li>
                  </ul>
                </li>
              </ol>
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md text-blue-800 dark:text-blue-300">
                <strong>What about the Passkey?</strong><br/>
                For Sandbox: Use the test passkey from Daraja documentation<br/>
                For Production: Safaricom will provide this when you go live
              </div>
            </div>
          </div>

          {/* Step 5: Test in Sandbox */}
          <div className="border-l-4 border-primary pl-4">
            <h4 className="font-semibold text-base mb-2">Step 5: Test in Sandbox Mode</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Before going live, test your integration with sandbox (test) credentials.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-3">
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Enter your <strong>Sandbox</strong> credentials in the form above</li>
                <li>Use the Sandbox shortcode: <code className="bg-background px-1 rounded">174379</code></li>
                <li>Use the Sandbox passkey from Daraja docs</li>
                <li>Click <strong>"Save Configuration"</strong></li>
                <li>Click <strong>"Verify Credentials"</strong> to test the connection</li>
                <li>Try a test payment (it won't charge real money)</li>
              </ol>
            </div>
          </div>

          {/* Step 6: Go Live */}
          <div className="border-l-4 border-green-500 pl-4">
            <h4 className="font-semibold text-base mb-2">Step 6: Go Live (Production)</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Once testing is successful, apply to go live and accept real payments.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-3">
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>In your Daraja app, click <strong>"Go Live"</strong> button</li>
                <li>Fill in the Go Live form:
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li>Your Paybill or Till number</li>
                    <li>Business details and documents</li>
                    <li>Callback URL (we provide this automatically)</li>
                  </ul>
                </li>
                <li>Submit and wait for Safaricom approval (2-5 business days)</li>
                <li>Once approved, you'll receive:
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li>Production Consumer Key</li>
                    <li>Production Consumer Secret</li>
                    <li>Production Passkey</li>
                  </ul>
                </li>
                <li>Update your credentials here with the production values</li>
                <li>Enable M-Pesa and start accepting real payments! 🎉</li>
              </ol>
            </div>
          </div>

          {/* Important Notes */}
          <div className="mt-6 space-y-3">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <h5 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">⚠️ Important Security Notes</h5>
              <ul className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1 list-disc list-inside">
                <li>Never share your Consumer Secret or Passkey with anyone</li>
                <li>Your credentials are encrypted and stored securely</li>
                <li>Only shop admins can view or modify M-Pesa settings</li>
              </ul>
            </div>

            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <h5 className="font-medium text-green-800 dark:text-green-300 mb-2">✅ Need Help?</h5>
              <ul className="text-sm text-green-700 dark:text-green-400 space-y-1">
                <li>📞 Safaricom Business: <strong>0722 002 100</strong></li>
                <li>📧 Daraja Support: <strong>apisupport@safaricom.co.ke</strong></li>
                <li>📚 <a href="https://developer.safaricom.co.ke/Documentation" target="_blank" rel="noopener noreferrer" className="underline">Daraja Documentation</a></li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
