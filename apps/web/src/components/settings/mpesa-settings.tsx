"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
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
  Lock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
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

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      
      if (res.ok) {
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
        const errorText = await res.text();
        const error = errorText ? JSON.parse(errorText) : {};
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

      const verifyText = await res.text();
      const data = verifyText ? JSON.parse(verifyText) : {};
      
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

  const [showGuide, setShowGuide] = useState(false);

  // Progress steps for the stepper
  const steps = [
    { label: 'Account Type', done: !!formData.shortCode },
    { label: 'API Credentials', done: !!mpesaConfig?.hasCredentials },
    { label: 'Verify', done: mpesaConfig?.verificationStatus === 'verified' },
    { label: 'Enable', done: !!mpesaConfig?.enabled },
  ];
  const currentStep = steps.filter(s => s.done).length;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          <p className="text-sm text-muted-foreground">Loading M-Pesa configuration...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Hero Card with Branding ── */}
      <Card className="overflow-hidden border-0 shadow-lg">
        {/* Green gradient header */}
        <div className="bg-gradient-to-r from-green-600 via-green-500 to-emerald-500 px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Logos */}
            <div className="flex items-center gap-3 bg-white/95 rounded-xl px-4 py-2.5 shadow-md">
              <Image src="/images/payments/mpesa.svg" alt="M-Pesa" width={90} height={28} className="h-7 w-auto" unoptimized />
              <div className="w-px h-6 bg-gray-300" />
              <Image src="/images/payments/safaricom.svg" alt="Safaricom" width={100} height={28} className="h-6 w-auto" unoptimized />
            </div>
            <div className="flex-1">
              <h2 className="text-white text-lg sm:text-xl font-bold">M-Pesa Payment Configuration</h2>
              <p className="text-green-100 text-sm mt-0.5">Powered by Safaricom Daraja API</p>
            </div>
            {mpesaConfig && mpesaConfig.isConfigured && (
              <Badge className={`text-sm px-3 py-1 ${mpesaConfig.isVerified ? 'bg-white text-green-700' : 'bg-yellow-400 text-yellow-900'}`}>
                {mpesaConfig.isVerified ? 'Verified & Active' : 'Pending Verification'}
              </Badge>
            )}
          </div>

          {/* Progress Stepper */}
          <div className="mt-6 grid grid-cols-4 gap-1 sm:gap-2">
            {steps.map((step, i) => (
              <div key={step.label} className="flex flex-col items-center">
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  step.done
                    ? 'bg-white text-green-700 border-white'
                    : i === currentStep
                      ? 'bg-green-400/30 text-white border-white'
                      : 'bg-green-700/30 text-green-200 border-green-300/40'
                }`}>
                  {step.done ? <CheckCircle className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-[10px] sm:text-xs mt-1 text-center leading-tight ${step.done ? 'text-white font-medium' : 'text-green-200'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Trust / Security strip */}
        <div className="bg-green-50 dark:bg-green-950/40 border-b border-green-200 dark:border-green-800 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-green-700 dark:text-green-400">
          <span className="flex items-center gap-1"><Lock className="h-3.5 w-3.5" /> AES-256 Encrypted</span>
          <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> PCI Compliant</span>
          <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> Safaricom Verified</span>
        </div>
      </Card>

      {/* ── Setup Warning (only if not configured) ── */}
      {mpesaConfig && !mpesaConfig.isConfigured && (
        <Card className="border-amber-400/60 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
          <CardContent className="pt-5 pb-4">
            <div className="flex gap-3 items-start">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/40 shrink-0">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-amber-800 dark:text-amber-300 text-sm">Setup Required</h3>
                <p className="text-xs sm:text-sm text-amber-700/80 dark:text-amber-300/70 mt-1">
                  Configure your Paybill or Till number below to start accepting M-Pesa payments directly to your account.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Status Overview ── */}
      {mpesaConfig && mpesaConfig.isConfigured && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Type</p>
            <p className="font-semibold capitalize text-sm">{mpesaConfig.type || 'Not Set'}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Short Code</p>
            <p className="font-semibold font-mono text-sm">{mpesaConfig.shortCode || '---'}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Credentials</p>
            <p className={`font-semibold text-sm flex items-center gap-1 ${mpesaConfig.hasCredentials ? 'text-green-600' : 'text-muted-foreground'}`}>
              {mpesaConfig.hasCredentials ? <><CheckCircle className="h-3.5 w-3.5" /> Saved</> : 'Not set'}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <div className="flex items-center gap-1.5">
              {mpesaConfig.verificationStatus === 'verified' ? (
                <p className="font-semibold text-sm text-green-600 flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> Verified</p>
              ) : mpesaConfig.verificationStatus === 'failed' ? (
                <p className="font-semibold text-sm text-red-600 flex items-center gap-1"><XCircle className="h-3.5 w-3.5" /> Failed</p>
              ) : mpesaConfig.hasCredentials ? (
                <p className="font-semibold text-sm text-yellow-600 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> Pending</p>
              ) : (
                <p className="font-semibold text-sm text-muted-foreground">---</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ── Configuration Form ── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-green-600" />
            M-Pesa Credentials
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Your credentials are encrypted with AES-256 and never visible to the platform owner.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Account Type + Short Code */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="mpesaType" className="text-sm">Account Type</Label>
              <select
                id="mpesaType"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'paybill' | 'till' })}
                className="w-full h-10 px-3 border rounded-md bg-background text-sm"
              >
                <option value="paybill">Paybill</option>
                <option value="till">Till Number (Buy Goods)</option>
              </select>
              <p className="text-[11px] text-muted-foreground">
                {formData.type === 'paybill' 
                  ? 'Paybill allows customers to enter an account number'
                  : 'Till number is for Buy Goods payments (no account number)'}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shortCode" className="text-sm">
                {formData.type === 'paybill' ? 'Paybill Number' : 'Till Number'}
              </Label>
              <Input
                id="shortCode"
                value={formData.shortCode}
                onChange={(e) => setFormData({ ...formData, shortCode: e.target.value })}
                placeholder={formData.type === 'paybill' ? '123456' : '5678901'}
                className="font-mono"
              />
            </div>
          </div>

          {/* Account Prefix (for Paybill only) */}
          {formData.type === 'paybill' && (
            <div className="space-y-1.5">
              <Label htmlFor="accountPrefix" className="text-sm">Account Number Prefix (Optional)</Label>
              <Input
                id="accountPrefix"
                value={formData.accountPrefix}
                onChange={(e) => setFormData({ ...formData, accountPrefix: e.target.value })}
                placeholder="INV-"
                className="max-w-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Prefix added to order numbers for the account reference (e.g., INV-12345)
              </p>
            </div>
          )}

          {/* Daraja API Credentials */}
          <div className="border-t pt-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-sm">Daraja API Credentials</h4>
                <a
                  href="https://developer.safaricom.co.ke"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-600 hover:underline flex items-center gap-0.5"
                >
                  Get credentials <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowSecrets(!showSecrets)} className="h-8 text-xs">
                {showSecrets ? <EyeOff className="h-3.5 w-3.5 mr-1.5" /> : <Eye className="h-3.5 w-3.5 mr-1.5" />}
                {showSecrets ? 'Hide' : 'Show'}
              </Button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="consumerKey" className="text-sm">Consumer Key</Label>
                <Input
                  id="consumerKey"
                  type={showSecrets ? "text" : "password"}
                  value={formData.consumerKey}
                  onChange={(e) => setFormData({ ...formData, consumerKey: e.target.value })}
                  placeholder={mpesaConfig?.hasCredentials ? "••••••••••••" : "Enter consumer key"}
                  className="font-mono text-sm"
                />
                {mpesaConfig?.consumerKey && (
                  <p className="text-[11px] text-muted-foreground">
                    Current: {mpesaConfig.consumerKey} (leave blank to keep existing)
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="consumerSecret" className="text-sm">Consumer Secret</Label>
                <Input
                  id="consumerSecret"
                  type={showSecrets ? "text" : "password"}
                  value={formData.consumerSecret}
                  onChange={(e) => setFormData({ ...formData, consumerSecret: e.target.value })}
                  placeholder={mpesaConfig?.hasCredentials ? "••••••••••••" : "Enter consumer secret"}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="passkey" className="text-sm">Passkey (for STK Push)</Label>
                <Input
                  id="passkey"
                  type={showSecrets ? "text" : "password"}
                  value={formData.passkey}
                  onChange={(e) => setFormData({ ...formData, passkey: e.target.value })}
                  placeholder={mpesaConfig?.hasCredentials ? "••••••••••••" : "Enter passkey"}
                  className="font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* Enable Toggle */}
          <div className="border-t pt-5">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <div>
                <span className="font-medium text-sm group-hover:text-green-600 transition-colors">Enable M-Pesa Payments</span>
                <p className="text-xs text-muted-foreground">
                  When enabled, customers can pay via M-Pesa using your credentials
                </p>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 pt-3">
            <Button onClick={saveMpesaConfig} disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white">
              {isSaving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                "Save Configuration"
              )}
            </Button>
            
            {mpesaConfig?.hasCredentials && (
              <Button variant="outline" onClick={verifyCredentials} disabled={isVerifying} className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950">
                {isVerifying ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying...</>
                ) : (
                  <><RefreshCw className="h-4 w-4 mr-2" /> Verify Credentials</>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Setup Guide (collapsible) ── */}
      <Card>
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-muted/30 transition-colors rounded-lg"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/40">
              <Info className="h-4 w-4 text-green-600" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-sm">Complete M-Pesa Setup Guide</h3>
              <p className="text-xs text-muted-foreground">Step-by-step instructions to get your M-Pesa working</p>
            </div>
          </div>
          {showGuide ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {showGuide && (
          <CardContent className="pt-0 space-y-5">
            {/* Step 1 */}
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold shrink-0">1</div>
                <div className="w-0.5 flex-1 bg-green-200 dark:bg-green-800 mt-1" />
              </div>
              <div className="pb-5">
                <h4 className="font-semibold text-sm mb-1">Get a Paybill or Till Number</h4>
                <div className="text-xs sm:text-sm text-muted-foreground space-y-2">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="font-medium text-foreground mb-1">Till Number (Recommended)</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>Visit any Safaricom Shop or dial *234#</li>
                      <li>Ready within 24-48 hours, free to register</li>
                    </ul>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="font-medium text-foreground mb-1">Paybill Number</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>Apply at <a href="https://www.safaricom.co.ke/business/sme/m-pesa-payment-solutions/m-pesa-paybill" target="_blank" rel="noopener noreferrer" className="text-green-600 underline">Safaricom Business</a></li>
                      <li>5-10 business days, KES 3,000 setup fee</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold shrink-0">2</div>
                <div className="w-0.5 flex-1 bg-green-200 dark:bg-green-800 mt-1" />
              </div>
              <div className="pb-5">
                <h4 className="font-semibold text-sm mb-1">Register on Daraja Portal</h4>
                <div className="bg-muted/50 rounded-lg p-3 text-xs sm:text-sm text-muted-foreground">
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Go to <a href="https://developer.safaricom.co.ke" target="_blank" rel="noopener noreferrer" className="text-green-600 underline font-medium">developer.safaricom.co.ke</a></li>
                    <li>Sign up with your business email</li>
                    <li>Verify email and log in</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold shrink-0">3</div>
                <div className="w-0.5 flex-1 bg-green-200 dark:bg-green-800 mt-1" />
              </div>
              <div className="pb-5">
                <h4 className="font-semibold text-sm mb-1">Create App & Get Credentials</h4>
                <div className="bg-muted/50 rounded-lg p-3 text-xs sm:text-sm text-muted-foreground">
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Click <strong>My Apps</strong> &rarr; <strong>Add New App</strong></li>
                    <li>Enable <strong>Lipa Na M-Pesa Online</strong> API</li>
                    <li>Copy your <strong>Consumer Key</strong> and <strong>Consumer Secret</strong></li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold shrink-0">4</div>
                <div className="w-0.5 flex-1 bg-green-200 dark:bg-green-800 mt-1" />
              </div>
              <div className="pb-5">
                <h4 className="font-semibold text-sm mb-1">Test in Sandbox</h4>
                <div className="bg-muted/50 rounded-lg p-3 text-xs sm:text-sm text-muted-foreground">
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Use sandbox shortcode: <code className="bg-background px-1 rounded text-xs">174379</code></li>
                    <li>Enter sandbox credentials above &rarr; Save &rarr; Verify</li>
                    <li>Test a payment (no real money charged)</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">5</div>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Go Live!</h4>
                <div className="bg-muted/50 rounded-lg p-3 text-xs sm:text-sm text-muted-foreground">
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Click <strong>Go Live</strong> in your Daraja app</li>
                    <li>Wait for Safaricom approval (2-5 days)</li>
                    <li>Replace sandbox credentials with production ones</li>
                    <li>Enable M-Pesa and start accepting payments</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Help / Notes */}
            <div className="grid gap-3 sm:grid-cols-2 pt-2">
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <h5 className="font-medium text-yellow-800 dark:text-yellow-300 text-xs mb-1">Security Notes</h5>
                <ul className="text-[11px] sm:text-xs text-yellow-700 dark:text-yellow-400 space-y-0.5 list-disc list-inside">
                  <li>Never share your Consumer Secret</li>
                  <li>Credentials are encrypted at rest</li>
                  <li>Only admins can modify these settings</li>
                </ul>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <h5 className="font-medium text-green-800 dark:text-green-300 text-xs mb-1">Need Help?</h5>
                <ul className="text-[11px] sm:text-xs text-green-700 dark:text-green-400 space-y-0.5">
                  <li>Safaricom Business: <strong>0722 002 100</strong></li>
                  <li>Daraja: <strong>apisupport@safaricom.co.ke</strong></li>
                  <li><a href="https://developer.safaricom.co.ke/Documentation" target="_blank" rel="noopener noreferrer" className="underline">Daraja Docs</a></li>
                </ul>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
