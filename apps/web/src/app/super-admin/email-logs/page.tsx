'use client';

import { useState, useEffect } from 'react';
import { Mail, Filter, RefreshCw, Download, AlertCircle, CheckCircle, Clock, Trash2, RotateCcw } from 'lucide-react';

interface EmailLog {
  _id: string;
  to: string;
  subject: string;
  templateName?: string;
  status: 'sent' | 'failed' | 'pending';
  emailSent: boolean;
  createdAt: string;
  emailSentAt?: string;
  errorMessage?: string;
  retryCount?: number;
  shopId?: string;
  userId?: string;
}

interface Stats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  successRate: number;
}

export default function EmailLogsPage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'failed' | 'pending'>('all');
  const [templateFilter, setTemplateFilter] = useState('all');
  const [templates, setTemplates] = useState<string[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [retrying, setRetrying] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
    loadStats();
    loadTemplates();
    const interval = setInterval(() => {
      loadStats();
    }, 30000); // Refresh stats every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadLogs();
  }, [statusFilter, templateFilter, searchEmail]);

  const loadLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        limit: '100',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(templateFilter !== 'all' && { template: templateFilter }),
        ...(searchEmail && { search: searchEmail }),
      });

      const res = await fetch(`/api/admin/emails/logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/emails/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setStats(data.summary || data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/emails/templates', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const templateNames = Array.isArray(data) ? data.map((t: any) => t.name) : [];
      setTemplates(templateNames);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const retryEmail = async (id: string) => {
    setRetrying(id);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/emails/logs/${id}/retry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        loadLogs();
        loadStats();
      }
    } catch (error) {
      console.error('Failed to retry email:', error);
    } finally {
      setRetrying(null);
    }
  };

  const deleteLog = async (id: string) => {
    if (!confirm('Are you sure you want to delete this email log?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/emails/logs/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        loadLogs();
        loadStats();
      }
    } catch (error) {
      console.error('Failed to delete log:', error);
    }
  };

  const exportLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/emails/export/csv', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const csv = await res.text();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `email-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (error) {
      console.error('Failed to export logs:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-amber-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit';
    switch (status) {
      case 'sent':
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>{getStatusIcon(status)} Sent</span>;
      case 'failed':
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>{getStatusIcon(status)} Failed</span>;
      case 'pending':
        return <span className={`${baseClasses} bg-amber-100 text-amber-800`}>{getStatusIcon(status)} Pending</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Mail className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Email Logs & Monitoring</h1>
          </div>
          <p className="text-gray-600">Track and manage all email communications</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm font-medium mb-2">Total Emails</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm font-medium mb-2">Sent</p>
              <p className="text-3xl font-bold text-green-600">{stats.sent}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm font-medium mb-2">Failed</p>
              <p className="text-3xl font-bold text-red-600">{stats.failed}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm font-medium mb-2">Pending</p>
              <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm font-medium mb-2">Success Rate</p>
              <p className="text-3xl font-bold text-blue-600">{stats.successRate}%</p>
            </div>
          </div>
        )}

        {/* Filters & Actions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
              <select
                value={templateFilter}
                onChange={(e) => setTemplateFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Templates</option>
                {templates.map((template) => (
                  <option key={template} value={template}>
                    {template}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Email</label>
              <input
                type="email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="Search by email address..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={loadLogs}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={exportLogs}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Email Logs Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">To</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Subject</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Template</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Sent At</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center">
                      <Clock className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No email logs found
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm text-gray-900 font-mono">{log.to}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{log.subject}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{log.templateName || '-'}</td>
                      <td className="px-6 py-4">{getStatusBadge(log.status)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {log.emailSentAt ? new Date(log.emailSentAt).toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          {log.status === 'failed' && (
                            <button
                              onClick={() => retryEmail(log._id)}
                              disabled={retrying === log._id}
                              className="text-blue-600 hover:text-blue-700 disabled:text-gray-400"
                              title="Retry failed email"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteLog(log._id)}
                            className="text-red-600 hover:text-red-700"
                            title="Delete log"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Tip:</strong> Email logs are automatically refreshed every 30 seconds. Failed emails can be retried using the retry button. Use the export feature to download logs for analysis.
          </p>
        </div>
      </div>
    </div>
  );
}
