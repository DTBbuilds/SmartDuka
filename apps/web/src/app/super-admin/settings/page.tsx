'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api-client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Badge,
} from '@smartduka/ui';
import {
  Settings,
  Smartphone,
  CreditCard,
  Shield,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  Save,
  TestTube,
  AlertTriangle,
} from 'lucide-react';

interface MpesaConfig {
  isConfigured: boolean;
  isActive: boolean;
  environment: string;
  shortCode?: string;
  callbackUrl?: string;
  consumerKeyMasked?: string;
  consumerSecretMasked?: string;
  passkeyMasked?: string;
  lastTestedAt?: string;
  lastTestResult?: string;
  lastTestError?: string;
}

export default function SuperAdminSettingsPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('mpesa');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // M-Pesa config state
  const [mpesaConfig, setMpesaConfig] = useState<MpesaConfig | null>(null);
  const [mpesaForm, setMpesaForm] = useState({
    environment: 'sandbox' as 'sandbox' | 'production',
    shortCode: '',
    consumerKey: '',
    consumerSecret: '',
    passkey: '',
    callbackUrl: '',
    isActive: true,
  });
  const [showSecrets, setShowSecrets] = useState(false);

  useEffect(() => {
    loadMpesaConfig();
  }, [token]);

  const loadMpesaConfig = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const config = await api.get<MpesaConfig>('/super-admin/system/config/mpesa');
      setMpesaConfig(config);
      if (config) {
        setMpesaForm(prev => ({
          ...prev,
          environment: (config.environment as 'sandbox' | 'production') || 'sandbox',
          shortCode: config.shortCode || '',
          callbackUrl: config.callbackUrl || '',
          isActive: config.isActive,
        }));
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to load M-Pesa config' });
    } finally {
      setLoading(false);
    }
  };

  const saveMpesaConfig = async () => {
    if (!mpesaForm.shortCode || !mpesaForm.consumerKey || !mpesaForm.consumerSecret || !mpesaForm.passkey) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    try {
      setSaving(true);
      await api.put('/super-admin/system/config/mpesa', mpesaForm);
      setMessage({ type: 'success', text: 'M-Pesa configuration saved successfully' });
      await loadMpesaConfig();
      // Clear sensitive fields after save
      setMpesaForm(prev => ({
        ...prev,
        consumerKey: '',
        consumerSecret: '',
        passkey: '',
      }));
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save M-Pesa config' });
    } finally {
      setSaving(false);
    }
  };

  const testMpesaConfig = async () => {
    try {
      setTesting(true);
      const result = await api.post<{ success: boolean; message: string; error?: string }>(
        '/super-admin/system/config/mpesa/test'
      );
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
      } else {
        setMessage({ type: 'error', text: result.message || result.error || 'Test failed' });
      }
      await loadMpesaConfig();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to test M-Pesa config' });
    } finally {
      setTesting(false);
    }
  };

  const toggleMpesaActive = async () => {
    try {
      await api.put('/super-admin/system/config/mpesa/toggle', { isActive: !mpesaConfig?.isActive });
      setMessage({ type: 'success', text: `M-Pesa ${mpesaConfig?.isActive ? 'disabled' : 'enabled'} successfully` });
      await loadMpesaConfig();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to toggle M-Pesa status' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-4 md:mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <Settings className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">System Settings</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage system-wide payment configurations</p>
        </div>
      </div>

      {message && (
        <div className={`mb-4 md:mb-6 p-3 md:p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <XCircle className="h-5 w-5" />
          )}
          <span>{message.text}</span>
          <button 
            onClick={() => setMessage(null)} 
            className="ml-auto text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 md:mb-6 w-full md:w-auto">
          <TabsTrigger value="mpesa" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            M-Pesa STK Push
          </TabsTrigger>
          <TabsTrigger value="stripe" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Stripe
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mpesa">
          <div className="grid gap-4 md:gap-6 md:grid-cols-2">
            {/* Current Configuration Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Current Configuration</span>
                  {mpesaConfig?.isConfigured ? (
                    <Badge variant="default" className="bg-green-500">Configured</Badge>
                  ) : (
                    <Badge variant="destructive">Not Configured</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  System M-Pesa credentials for subscription payments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <div className="flex items-center gap-2">
                    {mpesaConfig?.isActive ? (
                      <>
                        <span className="h-2 w-2 rounded-full bg-green-500"></span>
                        <span className="text-sm font-medium text-green-600">Active</span>
                      </>
                    ) : (
                      <>
                        <span className="h-2 w-2 rounded-full bg-gray-400"></span>
                        <span className="text-sm font-medium text-gray-500">Inactive</span>
                      </>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={toggleMpesaActive}
                      disabled={!mpesaConfig?.isConfigured}
                    >
                      {mpesaConfig?.isActive ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Environment</span>
                  <Badge variant={mpesaConfig?.environment === 'production' ? 'default' : 'secondary'}>
                    {mpesaConfig?.environment || 'Not Set'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Short Code</span>
                  <span className="text-sm font-mono">{mpesaConfig?.shortCode || '-'}</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Consumer Key</span>
                  <span className="text-sm font-mono">{mpesaConfig?.consumerKeyMasked || '-'}</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Consumer Secret</span>
                  <span className="text-sm font-mono">{mpesaConfig?.consumerSecretMasked || '-'}</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Passkey</span>
                  <span className="text-sm font-mono">{mpesaConfig?.passkeyMasked || '-'}</span>
                </div>

                {mpesaConfig?.lastTestedAt && (
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Last Test</span>
                    <div className="flex items-center gap-2">
                      {mpesaConfig.lastTestResult === 'success' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(mpesaConfig.lastTestedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {mpesaConfig?.lastTestError && (
                  <div className="p-3 bg-red-50 rounded-lg text-sm text-red-700">
                    <strong>Last Error:</strong> {mpesaConfig.lastTestError}
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={testMpesaConfig}
                    disabled={!mpesaConfig?.isConfigured || testing}
                    className="flex-1"
                  >
                    {testing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <TestTube className="h-4 w-4 mr-2" />
                    )}
                    Test Connection
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={loadMpesaConfig}
                    className="flex-1"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Update Configuration Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Update Configuration
                </CardTitle>
                <CardDescription>
                  Enter your M-Pesa API credentials from Safaricom Developer Portal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Environment</Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      type="button"
                      variant={mpesaForm.environment === 'sandbox' ? 'default' : 'outline'}
                      onClick={() => setMpesaForm(prev => ({ ...prev, environment: 'sandbox' }))}
                      className="flex-1"
                    >
                      Sandbox
                    </Button>
                    <Button
                      type="button"
                      variant={mpesaForm.environment === 'production' ? 'default' : 'outline'}
                      onClick={() => setMpesaForm(prev => ({ ...prev, environment: 'production' }))}
                      className="flex-1"
                    >
                      Production
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shortCode">Short Code (Paybill/Till) *</Label>
                  <Input
                    id="shortCode"
                    value={mpesaForm.shortCode}
                    onChange={(e) => setMpesaForm(prev => ({ ...prev, shortCode: e.target.value }))}
                    placeholder="174379"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="consumerKey">Consumer Key *</Label>
                  <div className="relative">
                    <Input
                      id="consumerKey"
                      type={showSecrets ? 'text' : 'password'}
                      value={mpesaForm.consumerKey}
                      onChange={(e) => setMpesaForm(prev => ({ ...prev, consumerKey: e.target.value }))}
                      placeholder="Enter consumer key"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecrets(!showSecrets)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="consumerSecret">Consumer Secret *</Label>
                  <Input
                    id="consumerSecret"
                    type={showSecrets ? 'text' : 'password'}
                    value={mpesaForm.consumerSecret}
                    onChange={(e) => setMpesaForm(prev => ({ ...prev, consumerSecret: e.target.value }))}
                    placeholder="Enter consumer secret"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passkey">Passkey *</Label>
                  <Input
                    id="passkey"
                    type={showSecrets ? 'text' : 'password'}
                    value={mpesaForm.passkey}
                    onChange={(e) => setMpesaForm(prev => ({ ...prev, passkey: e.target.value }))}
                    placeholder="Enter passkey"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="callbackUrl">Callback URL</Label>
                  <Input
                    id="callbackUrl"
                    value={mpesaForm.callbackUrl}
                    onChange={(e) => setMpesaForm(prev => ({ ...prev, callbackUrl: e.target.value }))}
                    placeholder="https://your-domain.com/api/mpesa/callback"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to use the default callback URL from environment
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2 text-sm">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <strong>Important:</strong> These credentials are used for all subscription payments. 
                    Make sure they are correct before saving.
                  </div>
                </div>

                <Button 
                  onClick={saveMpesaConfig} 
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Configuration
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stripe">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Stripe Configuration
              </CardTitle>
              <CardDescription>
                Stripe credentials are managed via environment variables
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Stripe configuration is currently managed through environment variables.</p>
                <p className="text-sm mt-2">
                  Set <code className="bg-muted px-1 rounded">STRIPE_SECRET_KEY</code> and{' '}
                  <code className="bg-muted px-1 rounded">STRIPE_PUBLISHABLE_KEY</code> in your .env file.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
