'use client';

import { config } from '@/lib/config';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { AuthGuard } from '@/components/auth-guard';
import { CartLoader } from '@/components/ui/cart-loader';
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
  to: string;
  subject: string;
  templateName?: string;
  category?: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  sentAt?: string;
  failedAt?: string;
  errorMessage?: string;
  retryCount?: number;
  shopName?: string;
  userName?: string;
  messageId?: string;
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

function SuperAdminEmailsContent() {
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
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEmails, setTotalEmails] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  
  // Sort state
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'status' | 'recipient'>('newest');
  
  // Dialog states
  const [testEmailOpen, setTestEmailOpen] = useState(false);
  const [templateEditOpen, setTemplateEditOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);

  // Log actions state
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);
  const [emailDetailsOpen, setEmailDetailsOpen] = useState(false);
  
  // Audit state
  const [auditReport, setAuditReport] = useState<any>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  
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
  }, [activeTab, statusFilter, typeFilter, templateFilter, dateRange, currentPage, sortOrder, pageSize]);

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

  const loadEmails = async (page = currentPage) => {
    const skip = (page - 1) * pageSize;
    const params = new URLSearchParams({
      limit: String(pageSize),
      skip: String(skip),
      ...(statusFilter !== 'all' && { status: statusFilter }),
      ...(typeFilter !== 'all' && { category: typeFilter }),
      ...(templateFilter !== 'all' && { templateName: templateFilter }),
    });

    const res = await fetch(`${config.apiUrl}/admin/emails/logs?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const logsText = await res.text();
    const logsData = logsText ? JSON.parse(logsText) : {};
    
    if (res.ok) {
      let emailList = logsData.logs || logsData || [];
      
      // Client-side sorting
      if (sortOrder === 'oldest') {
        emailList = [...emailList].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      } else if (sortOrder === 'status') {
        emailList = [...emailList].sort((a, b) => a.status.localeCompare(b.status));
      } else if (sortOrder === 'recipient') {
        emailList = [...emailList].sort((a, b) => (a.to || '').localeCompare(b.to || ''));
      }
      // 'newest' is default from backend
      
      setEmails(emailList);
      setTotalEmails(logsData.total || emailList.length);
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
    const matchesType = typeFilter === 'all' || email.category === typeFilter;
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

  // ===== Audit functions =====
  
  const loadAuditReport = async () => {
    try {
      setAuditLoading(true);
      const res = await fetch(`${config.apiUrl}/admin/emails/audit/report`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAuditReport(data);
      }
    } catch (err: any) {
      console.error('Failed to load audit report:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  const fixEmailStatuses = async () => {
    if (!confirm('This will fix all mismatched email statuses. Continue?')) return;
    try {
      setAuditLoading(true);
      const res = await fetch(`${config.apiUrl}/admin/emails/audit/fix-statuses`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Fixed ${data.fixed} email statuses`);
        await loadData();
        await loadAuditReport();
      } else {
        throw new Error('Failed to fix email statuses');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to fix email statuses');
    } finally {
      setAuditLoading(false);
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
    return <CartLoader size="lg" className="h-64" />;
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold flex items-center gap-2 md:gap-3">
            <Mail className="h-6 w-6 md:h-8 md:w-8" />
            Email Management
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
            Monitor and manage all email communications
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setTestEmailOpen(true)} className="gap-2" size="sm">
            <TestTube className="h-4 w-4" />
            <span className="hidden sm:inline">Test Email</span>
            <span className="sm:hidden">Test</span>
          </Button>
          <Button variant="outline" onClick={loadData} className="gap-2" size="sm">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="overview" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 md:py-1.5 text-xs md:text-sm">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
            <span className="sm:hidden">Stats</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 md:py-1.5 text-xs md:text-sm">
            <FileText className="h-4 w-4" />
            <span>Logs</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 md:py-1.5 text-xs md:text-sm">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Templates</span>
            <span className="sm:hidden">Tmpl</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 md:py-1.5 text-xs md:text-sm">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
            <span className="sm:hidden">Data</span>
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
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
                    <div>
                      {getStatusBadge(email.status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Logs Tab */}
        <TabsContent value="logs" className="space-y-4 md:space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
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
                  {totalEmails} emails found • Page {currentPage} of {Math.ceil(totalEmails / pageSize) || 1}
                </CardDescription>
                <div className="flex items-center gap-2">
                  <Select value={sortOrder} onValueChange={(v: any) => setSortOrder(v)}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="status">By Status</SelectItem>
                      <SelectItem value="recipient">By Recipient</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadCsv}>
                    <Download className="h-4 w-4" />
                    CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 md:p-6">
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3 p-4">
                {filteredEmails.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No emails found
                  </div>
                ) : (
                  filteredEmails.map((email) => (
                    <div key={email._id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{email.subject}</div>
                          <div className="text-xs text-muted-foreground truncate">{email.to}</div>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          {getStatusIcon(email.status)}
                          {getStatusBadge(email.status)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground text-xs">Template:</span>
                          <div className="text-xs">{email.templateName || '-'}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Type:</span>
                          <div className="text-xs">{email.category || '-'}</div>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground text-xs">Sent:</span>
                          <div className="text-xs">
                            {email.sentAt 
                              ? new Date(email.sentAt).toLocaleString()
                              : new Date(email.createdAt).toLocaleString()
                            }
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2 border-t">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewEmail(email)}>
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        {email.status === 'failed' && (
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleRetryEmail(email._id)}>
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Retry
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteEmail(email._id)}>
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block">
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
                      <TableCell>{email.category || '-'}</TableCell>
                      <TableCell>
                        {email.sentAt 
                          ? new Date(email.sentAt).toLocaleString()
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
              </div>
              
              {/* Pagination Controls */}
              {totalEmails > pageSize && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t px-4 md:px-0">
                  <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalEmails)} of {totalEmails}
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="hidden sm:inline-flex"
                    >
                      First
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <span className="hidden sm:inline">Previous</span>
                      <span className="sm:hidden">Prev</span>
                    </Button>
                    <span className="px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium">
                      {currentPage} / {Math.ceil(totalEmails / pageSize)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalEmails / pageSize), p + 1))}
                      disabled={currentPage >= Math.ceil(totalEmails / pageSize)}
                    >
                      Next
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.ceil(totalEmails / pageSize))}
                      disabled={currentPage >= Math.ceil(totalEmails / pageSize)}
                      className="hidden sm:inline-flex"
                    >
                      Last
                    </Button>
                  </div>
                </div>
              )}
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
          {/* Database Audit Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Email Database Audit</CardTitle>
                <CardDescription>Check and fix email status issues in the database</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={loadAuditReport} 
                  disabled={auditLoading}
                  className="gap-2"
                >
                  {auditLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Run Audit
                </Button>
                {auditReport?.issues?.statusMismatch > 0 && (
                  <Button 
                    onClick={fixEmailStatuses} 
                    disabled={auditLoading}
                    className="gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Fix {auditReport.issues.statusMismatch} Issues
                  </Button>
                )}
              </div>
            </CardHeader>
            {auditReport && (
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <div className="text-2xl font-bold">{auditReport.summary?.total || 0}</div>
                    <div className="text-xs text-muted-foreground">Total Emails</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{auditReport.summary?.statusSent || 0}</div>
                    <div className="text-xs text-muted-foreground">Sent</div>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-600">{auditReport.summary?.statusPending || 0}</div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-600">{auditReport.summary?.statusFailed || 0}</div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                </div>
                
                {auditReport.issues?.statusMismatch > 0 && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Found {auditReport.issues.statusMismatch} emails with mismatched status (emailSent=true but status=pending).
                      Click "Fix Issues" to correct them.
                    </AlertDescription>
                  </Alert>
                )}
                
                {auditReport.recommendations?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Recommendations:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {auditReport.recommendations.map((rec: string, i: number) => (
                        <li key={i}>• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

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
              <p><span className="font-medium">Category:</span> {selectedEmail.category || '-'}</p>
              <p><span className="font-medium">Template:</span> {selectedEmail.templateName || '-'}</p>
              <p><span className="font-medium">Status:</span> {selectedEmail.status}</p>
              <p>
                <span className="font-medium">Created At:</span>{' '}
                {new Date(selectedEmail.createdAt).toLocaleString()}
              </p>
              <p>
                <span className="font-medium">Sent At:</span>{' '}
                {selectedEmail.sentAt
                  ? new Date(selectedEmail.sentAt).toLocaleString()
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

// SECURITY: Protect with AuthGuard
export default function SuperAdminEmailsPage() {
  return (
    <AuthGuard requiredRole="super_admin" fallbackRoute="/login">
      <SuperAdminEmailsContent />
    </AuthGuard>
  );
}
