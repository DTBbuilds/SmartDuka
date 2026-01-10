'use client';

import { useState, useEffect } from 'react';
import { Mail, AlertCircle, CheckCircle, Clock, Copy, ExternalLink } from 'lucide-react';
import { AuthGuard } from '@/components/auth-guard';

interface SmtpConfig {
  smtpConfigured: boolean;
  smtpStatus: 'configured' | 'not_configured';
  configuration: {
    host: string;
    port: string;
    user: string;
    pass: string;
    from: string;
  };
  missingFields: string[];
  setupInstructions: {
    [key: string]: {
      host: string;
      port: number;
      user: string;
      pass: string;
      link?: string;
    };
  };
  frontendUrl: string;
}

interface TestResult {
  success: boolean;
  message: string;
  messageId?: string;
  testEmail?: string;
  configuration?: {
    host: string;
    port: number;
    from: string;
  };
  error?: string;
  troubleshooting?: string[];
  missingFields?: string[];
}

function EmailSettingsContent() {
  const [config, setConfig] = useState<SmtpConfig | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/emails/config/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setConfig(data);
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/emails/config/test-connection', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testEmail: testEmail || undefined }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Failed to test connection',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Clock className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Mail className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Email Configuration</h1>
          </div>
          <p className="text-gray-600">Monitor and manage SMTP settings for email communications</p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">SMTP Status</h2>
            <div className="flex items-center gap-2">
              {config?.smtpConfigured ? (
                <>
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <span className="text-green-600 font-semibold">Configured</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                  <span className="text-amber-600 font-semibold">Not Configured</span>
                </>
              )}
            </div>
          </div>

          {config?.smtpConfigured ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm text-gray-600 mb-1">SMTP Host</p>
                <p className="font-mono text-sm font-semibold text-gray-900">{config.configuration.host}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm text-gray-600 mb-1">SMTP Port</p>
                <p className="font-mono text-sm font-semibold text-gray-900">{config.configuration.port}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm text-gray-600 mb-1">From Address</p>
                <p className="font-mono text-sm font-semibold text-gray-900">{config.configuration.from}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm text-gray-600 mb-1">Username</p>
                <p className="font-mono text-sm font-semibold text-gray-900">{config.configuration.user}</p>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-900 mb-3">Missing SMTP configuration. Email sending is disabled.</p>
              <p className="text-sm text-amber-800 mb-3">Required environment variables:</p>
              <ul className="space-y-2">
                {config?.missingFields.map((field) => (
                  <li key={field} className="text-sm text-amber-800 flex items-center gap-2">
                    <span className="text-amber-600">✗</span>
                    <code className="bg-white px-2 py-1 rounded text-xs font-mono">{field}</code>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Test Connection */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Test SMTP Connection</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Email Address (Optional)
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Leave empty to use configured SMTP user"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                A test email will be sent to verify your SMTP configuration
              </p>
            </div>
            <button
              onClick={testConnection}
              disabled={testing || !config?.smtpConfigured}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
          </div>

          {testResult && (
            <div className={`mt-4 p-4 rounded-lg ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-start gap-3">
                {testResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-semibold ${testResult.success ? 'text-green-900' : 'text-red-900'}`}>
                    {testResult.message}
                  </p>
                  {testResult.testEmail && (
                    <p className={`text-sm mt-1 ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                      Test email sent to: <code className="bg-white px-2 py-1 rounded text-xs font-mono">{testResult.testEmail}</code>
                    </p>
                  )}
                  {testResult.error && (
                    <p className="text-sm text-red-800 mt-2">{testResult.error}</p>
                  )}
                  {testResult.troubleshooting && testResult.troubleshooting.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-semibold text-red-900 mb-2">Troubleshooting:</p>
                      <ul className="space-y-1">
                        {testResult.troubleshooting.map((tip, idx) => (
                          <li key={idx} className="text-sm text-red-800 flex items-start gap-2">
                            <span className="text-red-600 mt-0.5">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Setup Instructions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Setup Instructions</h2>
          <div className="space-y-6">
            {config?.setupInstructions && Object.entries(config.setupInstructions).map(([provider, settings]) => (
              <div key={provider} className="border-l-4 border-blue-600 pl-4">
                <h3 className="font-semibold text-gray-900 capitalize mb-3 flex items-center gap-2">
                  {provider.replace('_', ' ')}
                  {settings.link && (
                    <a
                      href={settings.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="bg-gray-50 p-3 rounded font-mono text-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span>SMTP_HOST={settings.host}</span>
                      <button
                        onClick={() => copyToClipboard(settings.host, `host-${provider}`)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    {copied === `host-${provider}` && (
                      <span className="text-green-600 text-xs">Copied!</span>
                    )}
                  </div>
                  <div className="bg-gray-50 p-3 rounded font-mono text-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span>SMTP_PORT={settings.port}</span>
                      <button
                        onClick={() => copyToClipboard(settings.port.toString(), `port-${provider}`)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    {copied === `port-${provider}` && (
                      <span className="text-green-600 text-xs">Copied!</span>
                    )}
                  </div>
                  <div className="bg-gray-50 p-3 rounded font-mono text-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span>SMTP_USER={settings.user}</span>
                      <button
                        onClick={() => copyToClipboard(settings.user, `user-${provider}`)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    {copied === `user-${provider}` && (
                      <span className="text-green-600 text-xs">Copied!</span>
                    )}
                  </div>
                  <div className="bg-gray-50 p-3 rounded font-mono text-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span>SMTP_PASS={settings.pass}</span>
                      <button
                        onClick={() => copyToClipboard(settings.pass, `pass-${provider}`)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    {copied === `pass-${provider}` && (
                      <span className="text-green-600 text-xs">Copied!</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> After updating environment variables in your `.env` file, restart the backend server for changes to take effect.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// SECURITY: Protect with AuthGuard
export default function EmailSettingsPage() {
  return (
    <AuthGuard requiredRole="super_admin" fallbackRoute="/login">
      <EmailSettingsContent />
    </AuthGuard>
  );
}
