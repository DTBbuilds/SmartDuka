'use client';

import { config } from '@/lib/config';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Mail,
  Send,
  Eye,
  Trash2,
  RefreshCw,
  Download,
  Filter,
  Search,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
  FileText,
  BarChart3,
  Settings,
  TestTube,
  Edit,
  Copy,
  Check
} from 'lucide-react';

interface EmailLog {
  _id: string;
  to?: string;
  subject?: string;
  templateName?: string;
  type?: string; // maps Notification.type
  status: 'pending' | 'sent' | 'failed'; // Notification.status
  emailSentAt?: string; // Notification.emailSentAt
  errorMessage?: string; // Notification.emailError
  retryCount?: number;
  createdAt: string;
}

interface EmailTemplate {
  _id: string;
  name: string;
  subject: string;
  description: string;
  variables: string[];
  active: boolean;
  htmlContent: string;
  textContent?: string;
  html?: string; // For preview template
}

interface EmailStats {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
  openRate: number;
  clickRate: number;
  byCategory: Record<string, number>;
  byTemplate: Record<string, number>;
}

interface SmtpStatus {
  smtpConfigured: boolean;
  smtpHost?: string;
  smtpPort?: string;
  smtpUser?: string;
  fromEmail?: string;
  frontendUrl?: string;
}

export default function SuperAdminEmailsPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [smtpStatus, setSmtpStatus] = useState<SmtpStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [templateFilter, setTemplateFilter] = useState('all');
  const [dateRange, setDateRange] = useState('7days');
  
  // Dialog states
  const [testEmailOpen, setTestEmailOpen] = useState(false);
  const [templateEditOpen, setTemplateEditOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);

  // Log actions state
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);
  const [emailDetailsOpen, setEmailDetailsOpen] = useState(false);
  
  // Form states
  const [testEmailForm, setTestEmailForm] = useState({
    to: '',
    templateName: '',
    subject: '',
    content: '',
    variables: {} as Record<string, any>
  });

  useEffect(() => {
    loadData();
  }, [activeTab, statusFilter, typeFilter, templateFilter, dateRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (activeTab === 'overview') {
        await Promise.all([
          loadStats(),
          loadRecentEmails(),
          loadTemplates(),
          loadSmtpStatus(),
        ]);
      } else if (activeTab === 'logs') {
        await loadEmails();
      } else if (activeTab === 'templates') {
        await loadTemplates();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    const res = await fetch(`${config.apiUrl}/admin/emails/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const statsText = await res.text();
    const statsData = statsText ? JSON.parse(statsText) : {};
    
    if (res.ok) {
      setStats(statsData.summary || statsData);
    }
  };

  const loadSmtpStatus = async () => {
    const res = await fetch(`${config.apiUrl}/admin/emails/config/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const smtpText = await res.text();
    const smtpData = smtpText ? JSON.parse(smtpText) : {};
    
    if (res.ok) {
      setSmtpStatus(smtpData);
    }
  };

  const loadEmails = async () => {
    const params = new URLSearchParams({
      limit: '100',
      ...(statusFilter !== 'all' && { status: statusFilter }),
      ...(typeFilter !== 'all' && { type: typeFilter }),
      // backend currently supports type/status; template/search/date can be added later
    });

    const res = await fetch(`${config.apiUrl}/admin/emails/logs?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const logsText = await res.text();
    const logsData = logsText ? JSON.parse(logsText) : {};
    
    if (res.ok) {
      setEmails(logsData.logs || logsData);
    }
  };

  const loadRecentEmails = async () => {
    const res = await fetch(`${config.apiUrl}/admin/emails/logs?limit=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const recentText = await res.text();
    const recentData = recentText ? JSON.parse(recentText) : {};
    
    if (res.ok) {
      setEmails(recentData.logs || recentData);
    }
  };

  const loadTemplates = async () => {
    const res = await fetch(`${config.apiUrl}/admin/emails/templates`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const templatesText = await res.text();
    const templatesData = templatesText ? JSON.parse(templatesText) : [];
    
    if (res.ok) {
      setTemplates(templatesData);
    }
  };

  const sendTestEmail = async () => {
    try {
      const res = await fetch(`${config.apiUrl}/admin/emails/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(testEmailForm),
      });
      
      if (res.ok) {
        alert('Test email sent successfully!');
        setTestEmailOpen(false);
        setTestEmailForm({
          to: '',
          templateName: '',
          subject: '',
          content: '',
          variables: {}
        });
      } else {
        throw new Error('Failed to send test email');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send test email');
    }
  };

  const toggleTemplate = async (templateName: string) => {
    try {
      const res = await fetch(`${config.apiUrl}/admin/emails/templates/${templateName}/toggle`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        await loadTemplates();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to toggle template');
    }
  };

  const previewEmailTemplate = async (template: EmailTemplate) => {
    try {
      const res = await fetch(`${config.apiUrl}/admin/emails/templates/${template.name}/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      
      const previewText = await res.text();
      const previewData = previewText ? JSON.parse(previewText) : {};
      
      if (res.ok) {
        setPreviewTemplate({ ...template, ...previewData });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to preview template');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Send className="h-4 w-4 text-blue-500" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Mail className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      sent: 'default',
      delivered: 'default',
      failed: 'destructive',
      pending: 'secondary',
    };
    
    return (
      <Badge variant={variants[status] || 'outline'} className="capitalize">
        {status}
      </Badge>
    );
  };

  const filteredEmails = emails.filter(email => {
    const matchesSearch = !searchQuery || 
      (email.to || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (email.subject || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || email.status === statusFilter;
    const matchesType = typeFilter === 'all' || email.type === typeFilter;
    const matchesTemplate = templateFilter === 'all' || email.templateName === templateFilter;
    
    return matchesSearch && matchesStatus && matchesType && matchesTemplate;
  });

  // ===== Log actions =====

  const handleViewEmail = (email: EmailLog) => {
    setSelectedEmail(email);
    setEmailDetailsOpen(true);
  };

  const handleRetryEmail = async (id: string) => {
    try {
      const res = await fetch(`${config.apiUrl}/admin/emails/logs/${id}/retry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to queue email for retry');
      await loadEmails();
      alert('Email queued for retry');
    } catch (err: any) {
      alert(err.message || 'Failed to retry email');
    }
  };

  const handleDeleteEmail = async (id: string) => {
    if (!confirm('Delete this email log?')) return;
    try {
      const res = await fetch(`${config.apiUrl}/admin/emails/logs/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete email log');
      await loadEmails();
    } catch (err: any) {
      alert(err.message || 'Failed to delete email');
    }
  };

  const handleCopyEmail = async (email: EmailLog) => {
    try {
      const text = `Subject: ${email.subject || ''}\nTo: ${email.to || ''}`;
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard');
    } catch {
      alert('Failed to copy');
    }
  };

  const handleDownloadCsv = async () => {
    try {
      const res = await fetch(`${config.apiUrl}/admin/emails/export/csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to export email logs');

      const csvText = await res.text();
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'email-logs.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Failed to download CSV');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Mail className="h-8 w-8" />
            Email Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage all email communications
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setTestEmailOpen(true)} className="gap-2">
            <TestTube className="h-4 w-4" />
            Test Email
          </Button>
          <Button variant="outline" onClick={loadData} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <FileText className="h-4 w-4" />
            Email Logs
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <Settings className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* SMTP Status */}
          {smtpStatus && !smtpStatus.smtpConfigured && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Email sending is currently disabled because SMTP is not fully configured.
                Please update SMTP settings in the backend environment variables.
              </AlertDescription>
            </Alert>
          )}

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Emails</CardTitle>
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground">All time</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Delivered</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.delivered ?? 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {(stats.total ?? 0) > 0 ? `${(((stats.delivered ?? 0) / (stats.total ?? 1)) * 100).toFixed(1)}%` : '0%'} delivery rate
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Failed</CardTitle>
                  <XCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{stats.failed ?? 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {(stats.total ?? 0) > 0 ? `${(((stats.failed ?? 0) / (stats.total ?? 1)) * 100).toFixed(1)}%` : '0%'} failure rate
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
                  <Eye className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{(stats.openRate ?? 0).toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">Email opens</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Emails */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Emails</CardTitle>
              <CardDescription>Latest email activity across the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredEmails.slice(0, 10).map((email) => (
                  <div key={email._id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(email.status)}
                      <div>
                        <p className="font-medium text-sm">{email.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          To: {email.to} • {new Date(email.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(email.status)}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Retry
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Logs Tab */}
        <TabsContent value="logs" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search emails..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="welcome">welcome</SelectItem>
                      <SelectItem value="subscription_activated">subscription_activated</SelectItem>
                      <SelectItem value="subscription_expiring">subscription_expiring</SelectItem>
                      <SelectItem value="subscription_expired">subscription_expired</SelectItem>
                      <SelectItem value="payment_successful">payment_successful</SelectItem>
                      <SelectItem value="receipt_generated">receipt_generated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="template">Template</Label>
                  <Select value={templateFilter} onValueChange={setTemplateFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Templates</SelectItem>
                      {templates.map((template) => (
                        <SelectItem key={template.name} value={template.name}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="dateRange">Date Range</Label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="7days">Last 7 Days</SelectItem>
                      <SelectItem value="30days">Last 30 Days</SelectItem>
                      <SelectItem value="90days">Last 90 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Logs Table */}
          <Card>
            <CardHeader>
              <CardTitle>Email Logs</CardTitle>
              <div className="flex items-center justify-between gap-4">
                <CardDescription>
                  {filteredEmails.length} emails found
                </CardDescription>
                <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadCsv}>
                  <Download className="h-4 w-4" />
                  Download CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmails.map((email) => (
                    <TableRow key={email._id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(email.status)}
                          {getStatusBadge(email.status)}
                        </div>
                      </TableCell>
                      <TableCell>{email.to}</TableCell>
                      <TableCell className="font-medium max-w-xs truncate">
                        {email.subject}
                      </TableCell>
                      <TableCell>
                        {email.templateName && (
                          <Badge variant="outline">{email.templateName}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{email.type || '-'}</TableCell>
                      <TableCell>
                        {email.emailSentAt 
                          ? new Date(email.emailSentAt).toLocaleString()
                          : new Date(email.createdAt).toLocaleString()
                        }
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewEmail(email)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCopyEmail(email)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Content
                            </DropdownMenuItem>
                            {email.status === 'failed' && (
                              <DropdownMenuItem onClick={() => handleRetryEmail(email._id)}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Retry
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteEmail(email._id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>
                Manage email templates used throughout the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {templates.map((template) => (
                  <div key={template._id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{template.name}</h3>
                        <Badge variant={template.active ? 'default' : 'secondary'}>
                          {template.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {template.description}
                      </p>
                      <p className="text-sm font-medium">
                        Subject: {template.subject}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.variables.map((variable) => (
                          <Badge key={variable} variant="outline" className="text-xs">
                            {variable}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => previewEmailTemplate(template)}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleTemplate(template.name)}
                        className="gap-2"
                      >
                        {template.active ? (
                          <>
                            <XCircle className="h-4 w-4" />
                            Disable
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            Enable
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTemplate(template);
                          setTemplateEditOpen(true);
                        }}
                        className="gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {stats && (
            <>
              {/* Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>By Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(stats.byCategory ?? {}).map(([category, count]) => (
                        <div key={category} className="flex items-center justify-between">
                          <span className="capitalize">{category}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full" 
                                style={{ width: `${(count / stats.total) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>By Template</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(stats.byTemplate ?? {}).map(([template, count]) => (
                        <div key={template} className="flex items-center justify-between">
                          <span className="text-sm">{template}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full" 
                                style={{ width: `${(count / stats.total) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Test Email Dialog */}
      <Dialog open={testEmailOpen} onOpenChange={setTestEmailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Test email functionality by sending a test email
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="testTo">To Email</Label>
              <Input
                id="testTo"
                type="email"
                placeholder="test@example.com"
                value={testEmailForm.to}
                onChange={(e) => setTestEmailForm(prev => ({ ...prev, to: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="testTemplate">Template (Optional)</Label>
              <Select 
                value={testEmailForm.templateName} 
                onValueChange={(value) => setTestEmailForm(prev => ({ ...prev, templateName: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template or send custom email" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Custom Email</SelectItem>
                  {templates.filter(t => t.active).map((template) => (
                    <SelectItem key={template.name} value={template.name}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {!testEmailForm.templateName && (
              <>
                <div>
                  <Label htmlFor="testSubject">Subject</Label>
                  <Input
                    id="testSubject"
                    placeholder="Test Email Subject"
                    value={testEmailForm.subject}
                    onChange={(e) => setTestEmailForm(prev => ({ ...prev, subject: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="testContent">Content</Label>
                  <Textarea
                    id="testContent"
                    placeholder="Email content (HTML supported)"
                    value={testEmailForm.content}
                    onChange={(e) => setTestEmailForm(prev => ({ ...prev, content: e.target.value }))}
                    rows={6}
                  />
                </div>
              </>
            )}
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setTestEmailOpen(false)}>
                Cancel
              </Button>
              <Button onClick={sendTestEmail} className="gap-2">
                <Send className="h-4 w-4" />
                Send Test Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Preview: {previewTemplate?.name}</DialogTitle>
            <DialogDescription>
              Subject: {previewTemplate?.subject}
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg p-4 bg-gray-50">
            <div 
              dangerouslySetInnerHTML={{ __html: previewTemplate?.html || '' }}
              className="prose max-w-none"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Details Dialog */}
      <Dialog open={emailDetailsOpen} onOpenChange={setEmailDetailsOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Email Details</DialogTitle>
            <DialogDescription>
              View basic metadata about this email log.
            </DialogDescription>
          </DialogHeader>
          {selectedEmail && (
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">To:</span> {selectedEmail.to || '-'}</p>
              <p><span className="font-medium">Subject:</span> {selectedEmail.subject || '-'}</p>
              <p><span className="font-medium">Type:</span> {selectedEmail.type || '-'}</p>
              <p><span className="font-medium">Template:</span> {selectedEmail.templateName || '-'}</p>
              <p><span className="font-medium">Status:</span> {selectedEmail.status}</p>
              <p>
                <span className="font-medium">Created At:</span>{' '}
                {new Date(selectedEmail.createdAt).toLocaleString()}
              </p>
              <p>
                <span className="font-medium">Sent At:</span>{' '}
                {selectedEmail.emailSentAt
                  ? new Date(selectedEmail.emailSentAt).toLocaleString()
                  : '-'}
              </p>
              {selectedEmail.errorMessage && (
                <p className="text-red-600">
                  <span className="font-medium">Error:</span> {selectedEmail.errorMessage}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
