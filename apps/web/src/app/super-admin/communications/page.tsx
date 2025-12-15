'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
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
  Mail,
  Send,
  FileText,
  RefreshCw,
  Plus,
  Eye,
  Users,
  Store,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Calendar,
  Trash2,
} from 'lucide-react';

interface Shop {
  id: string;
  name: string;
  email: string;
  status: string;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  shopId: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  type: string;
  status: string;
  description: string;
  amount: number;
  tax: number;
  totalAmount: number;
  currency: string;
  dueDate: string;
  paidAt?: string;
  createdAt: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  notes?: string;
}

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export default function SuperAdminCommunicationsPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('compose-email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Shops data
  const [shops, setShops] = useState<Shop[]>([]);
  const [loadingShops, setLoadingShops] = useState(false);

  // Email form state
  const [emailForm, setEmailForm] = useState({
    recipientType: 'shop' as 'shop' | 'all_shops' | 'custom',
    selectedShops: [] as string[],
    customEmails: '',
    subject: '',
    htmlContent: '',
    category: 'system',
  });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Invoice form state
  const [invoiceForm, setInvoiceForm] = useState({
    shopId: '',
    description: '',
    amount: 0,
    dueDate: '',
    type: 'subscription' as 'subscription' | 'addon' | 'setup',
    lineItems: [{ description: '', quantity: 1, unitPrice: 0 }] as LineItem[],
    notes: '',
    sendEmail: true,
  });
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  // Invoices list
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoiceFilter, setInvoiceFilter] = useState('all');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    loadShops();
  }, []);

  useEffect(() => {
    if (activeTab === 'invoices') {
      loadInvoices();
    }
  }, [activeTab, invoiceFilter]);

  const loadShops = async () => {
    try {
      setLoadingShops(true);
      const res = await fetch(`${apiUrl}/super-admin/communications/shops`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setShops(data);
      }
    } catch (err: any) {
      console.error('Failed to load shops:', err);
    } finally {
      setLoadingShops(false);
    }
  };

  const loadInvoices = async () => {
    try {
      setLoadingInvoices(true);
      const params = new URLSearchParams();
      if (invoiceFilter !== 'all') {
        params.append('status', invoiceFilter);
      }
      params.append('limit', '100');

      const res = await fetch(`${apiUrl}/super-admin/communications/invoices?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
      }
    } catch (err: any) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleSendEmail = async () => {
    setError(null);
    setSuccess(null);

    if (!emailForm.subject.trim()) {
      setError('Subject is required');
      return;
    }
    if (!emailForm.htmlContent.trim()) {
      setError('Email content is required');
      return;
    }
    if (emailForm.recipientType === 'shop' && emailForm.selectedShops.length === 0) {
      setError('Please select at least one shop');
      return;
    }
    if (emailForm.recipientType === 'custom' && !emailForm.customEmails.trim()) {
      setError('Please enter at least one email address');
      return;
    }

    try {
      setSendingEmail(true);
      const payload = {
        recipientType: emailForm.recipientType,
        shopIds: emailForm.recipientType === 'shop' ? emailForm.selectedShops : undefined,
        customEmails: emailForm.recipientType === 'custom' 
          ? emailForm.customEmails.split(',').map(e => e.trim()).filter(e => e) 
          : undefined,
        subject: emailForm.subject,
        htmlContent: wrapEmailContent(emailForm.htmlContent),
        category: emailForm.category,
      };

      const res = await fetch(`${apiUrl}/super-admin/communications/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(`Email sent successfully! Sent: ${data.sent}, Failed: ${data.failed}`);
        // Reset form
        setEmailForm({
          recipientType: 'shop',
          selectedShops: [],
          customEmails: '',
          subject: '',
          htmlContent: '',
          category: 'system',
        });
      } else {
        setError(data.message || 'Failed to send email');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleCreateInvoice = async () => {
    setError(null);
    setSuccess(null);

    if (!invoiceForm.shopId) {
      setError('Please select a shop');
      return;
    }
    if (!invoiceForm.description.trim()) {
      setError('Description is required');
      return;
    }
    if (!invoiceForm.dueDate) {
      setError('Due date is required');
      return;
    }

    // Calculate total from line items or use direct amount
    const hasLineItems = invoiceForm.lineItems.some(item => item.description && item.unitPrice > 0);
    const totalAmount = hasLineItems
      ? invoiceForm.lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
      : invoiceForm.amount;

    if (totalAmount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    try {
      setCreatingInvoice(true);
      const payload = {
        shopId: invoiceForm.shopId,
        description: invoiceForm.description,
        amount: totalAmount,
        dueDate: invoiceForm.dueDate,
        type: invoiceForm.type,
        lineItems: hasLineItems 
          ? invoiceForm.lineItems.filter(item => item.description && item.unitPrice > 0)
          : undefined,
        notes: invoiceForm.notes || undefined,
        sendEmail: invoiceForm.sendEmail,
      };

      const res = await fetch(`${apiUrl}/super-admin/communications/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(`Invoice ${data.invoiceNumber} created successfully!`);
        // Reset form
        setInvoiceForm({
          shopId: '',
          description: '',
          amount: 0,
          dueDate: '',
          type: 'subscription',
          lineItems: [{ description: '', quantity: 1, unitPrice: 0 }],
          notes: '',
          sendEmail: true,
        });
        // Refresh invoices list
        if (activeTab === 'invoices') {
          loadInvoices();
        }
      } else {
        setError(data.message || 'Failed to create invoice');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create invoice');
    } finally {
      setCreatingInvoice(false);
    }
  };

  const handleResendInvoiceEmail = async (invoiceId: string) => {
    try {
      const res = await fetch(`${apiUrl}/super-admin/communications/invoices/${invoiceId}/send-email`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setSuccess('Invoice email sent successfully!');
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to send invoice email');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send invoice email');
    }
  };

  const handleShopSelection = (shopId: string, checked: boolean) => {
    setEmailForm(prev => ({
      ...prev,
      selectedShops: checked
        ? [...prev.selectedShops, shopId]
        : prev.selectedShops.filter(id => id !== shopId),
    }));
  };

  const handleSelectAllShops = (checked: boolean) => {
    setEmailForm(prev => ({
      ...prev,
      selectedShops: checked ? shops.map(s => s.id) : [],
    }));
  };

  const addLineItem = () => {
    setInvoiceForm(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { description: '', quantity: 1, unitPrice: 0 }],
    }));
  };

  const removeLineItem = (index: number) => {
    setInvoiceForm(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index),
    }));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    setInvoiceForm(prev => ({
      ...prev,
      lineItems: prev.lineItems.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const wrapEmailContent = (content: string): string => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f4f4f5; }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 20px; }
    .container { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 30px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: #f8fafc; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>SmartDuka</h1>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p>This email was sent by SmartDuka.</p>
        <p>© ${new Date().getFullYear()} SmartDuka. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
      pending: { variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
      paid: { variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
      failed: { variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
      cancelled: { variant: 'outline', icon: <XCircle className="h-3 w-3" /> },
    };

    const config = variants[status] || variants.pending;

    return (
      <Badge variant={config.variant} className="gap-1 capitalize">
        {config.icon}
        {status}
      </Badge>
    );
  };

  const calculateLineItemsTotal = () => {
    return invoiceForm.lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Mail className="h-8 w-8" />
            Communications Center
          </h1>
          <p className="text-muted-foreground mt-2">
            Send manual emails and create invoices for shop owners
          </p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="compose-email" className="gap-2">
            <Send className="h-4 w-4" />
            Compose Email
          </TabsTrigger>
          <TabsTrigger value="create-invoice" className="gap-2">
            <FileText className="h-4 w-4" />
            Create Invoice
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2">
            <DollarSign className="h-4 w-4" />
            All Invoices
          </TabsTrigger>
        </TabsList>

        {/* Compose Email Tab */}
        <TabsContent value="compose-email" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Email Form */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Compose Email</CardTitle>
                  <CardDescription>
                    Send a manual email to shop owners
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Recipient Type */}
                  <div className="space-y-2">
                    <Label>Recipient Type</Label>
                    <Select
                      value={emailForm.recipientType}
                      onValueChange={(value: 'shop' | 'all_shops' | 'custom') =>
                        setEmailForm(prev => ({ ...prev, recipientType: value, selectedShops: [] }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shop">Select Specific Shops</SelectItem>
                        <SelectItem value="all_shops">All Active Shops</SelectItem>
                        <SelectItem value="custom">Custom Email Addresses</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Custom Emails */}
                  {emailForm.recipientType === 'custom' && (
                    <div className="space-y-2">
                      <Label>Email Addresses (comma separated)</Label>
                      <Textarea
                        placeholder="email1@example.com, email2@example.com"
                        value={emailForm.customEmails}
                        onChange={(e) => setEmailForm(prev => ({ ...prev, customEmails: e.target.value }))}
                        rows={3}
                      />
                    </div>
                  )}

                  {/* Category */}
                  <div className="space-y-2">
                    <Label>Email Category</Label>
                    <Select
                      value={emailForm.category}
                      onValueChange={(value) => setEmailForm(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="system">System</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="notification">Notification</SelectItem>
                        <SelectItem value="support">Support</SelectItem>
                        <SelectItem value="invoice">Invoice</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Subject */}
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input
                      placeholder="Enter email subject"
                      value={emailForm.subject}
                      onChange={(e) => setEmailForm(prev => ({ ...prev, subject: e.target.value }))}
                    />
                  </div>

                  {/* Content */}
                  <div className="space-y-2">
                    <Label>Email Content (HTML supported)</Label>
                    <Textarea
                      placeholder="Enter your email content here. HTML is supported."
                      value={emailForm.htmlContent}
                      onChange={(e) => setEmailForm(prev => ({ ...prev, htmlContent: e.target.value }))}
                      rows={12}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Tip: Use HTML tags like &lt;p&gt;, &lt;strong&gt;, &lt;a href=&quot;...&quot;&gt; for formatting
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={handleSendEmail}
                      disabled={sendingEmail}
                      className="gap-2"
                    >
                      {sendingEmail ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Send Email
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setPreviewOpen(true)}
                      disabled={!emailForm.htmlContent}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Shop Selection */}
            {emailForm.recipientType === 'shop' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    Select Recipients
                  </CardTitle>
                  <CardDescription>
                    {emailForm.selectedShops.length} of {shops.length} shops selected
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Select All */}
                    <div className="flex items-center space-x-2 pb-2 border-b">
                      <Checkbox
                        id="select-all"
                        checked={emailForm.selectedShops.length === shops.length && shops.length > 0}
                        onCheckedChange={handleSelectAllShops}
                      />
                      <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                        Select All
                      </label>
                    </div>

                    {/* Shop List */}
                    <div className="max-h-[400px] overflow-y-auto space-y-2">
                      {loadingShops ? (
                        <div className="flex items-center justify-center py-8">
                          <RefreshCw className="h-6 w-6 animate-spin" />
                        </div>
                      ) : shops.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No shops found
                        </p>
                      ) : (
                        shops.map((shop) => (
                          <div key={shop.id} className="flex items-center space-x-2 p-2 rounded hover:bg-muted">
                            <Checkbox
                              id={shop.id}
                              checked={emailForm.selectedShops.includes(shop.id)}
                              onCheckedChange={(checked) => handleShopSelection(shop.id, checked as boolean)}
                            />
                            <label htmlFor={shop.id} className="flex-1 cursor-pointer">
                              <p className="text-sm font-medium">{shop.name}</p>
                              <p className="text-xs text-muted-foreground">{shop.email}</p>
                            </label>
                            <Badge variant={shop.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                              {shop.status}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* All Shops Info */}
            {emailForm.recipientType === 'all_shops' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    All Active Shops
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-semibold">
                      {shops.filter(s => s.status === 'active').length} Active Shops
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Email will be sent to all shops with active status
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Create Invoice Tab */}
        <TabsContent value="create-invoice" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Manual Invoice</CardTitle>
              <CardDescription>
                Generate a new invoice for a shop owner
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Shop Selection */}
                <div className="space-y-2">
                  <Label>Select Shop *</Label>
                  <Select
                    value={invoiceForm.shopId}
                    onValueChange={(value) => setInvoiceForm(prev => ({ ...prev, shopId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a shop" />
                    </SelectTrigger>
                    <SelectContent>
                      {shops.map((shop) => (
                        <SelectItem key={shop.id} value={shop.id}>
                          {shop.name} ({shop.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Invoice Type */}
                <div className="space-y-2">
                  <Label>Invoice Type *</Label>
                  <Select
                    value={invoiceForm.type}
                    onValueChange={(value: 'subscription' | 'addon' | 'setup') =>
                      setInvoiceForm(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="subscription">Subscription</SelectItem>
                      <SelectItem value="addon">Add-on</SelectItem>
                      <SelectItem value="setup">Setup Fee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                <div className="space-y-2 md:col-span-2">
                  <Label>Description *</Label>
                  <Input
                    placeholder="e.g., Monthly subscription - January 2024"
                    value={invoiceForm.description}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                {/* Due Date */}
                <div className="space-y-2">
                  <Label>Due Date *</Label>
                  <Input
                    type="date"
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, dueDate: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                {/* Simple Amount (if no line items) */}
                <div className="space-y-2">
                  <Label>Amount (KES) - or use line items below</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={invoiceForm.amount || ''}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Line Items (Optional)</Label>
                  <Button variant="outline" size="sm" onClick={addLineItem} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-3">
                  {invoiceForm.lineItems.map((item, index) => (
                    <div key={index} className="flex gap-3 items-start">
                      <div className="flex-1">
                        <Input
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        />
                      </div>
                      <div className="w-24">
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          min={1}
                        />
                      </div>
                      <div className="w-32">
                        <Input
                          type="number"
                          placeholder="Unit Price"
                          value={item.unitPrice || ''}
                          onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="w-32 flex items-center justify-end text-sm font-medium">
                        KES {(item.quantity * item.unitPrice).toLocaleString()}
                      </div>
                      {invoiceForm.lineItems.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineItem(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-end gap-8 text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium w-32 text-right">
                      KES {calculateLineItemsTotal().toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-end gap-8 text-sm">
                    <span className="text-muted-foreground">VAT (16%):</span>
                    <span className="font-medium w-32 text-right">
                      KES {Math.round(calculateLineItemsTotal() * 0.16).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-end gap-8 text-lg font-bold">
                    <span>Total:</span>
                    <span className="w-32 text-right text-primary">
                      KES {Math.round(calculateLineItemsTotal() * 1.16).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  placeholder="Any additional notes for this invoice"
                  value={invoiceForm.notes}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>

              {/* Send Email Option */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="send-email"
                  checked={invoiceForm.sendEmail}
                  onCheckedChange={(checked) =>
                    setInvoiceForm(prev => ({ ...prev, sendEmail: checked as boolean }))
                  }
                />
                <label htmlFor="send-email" className="text-sm cursor-pointer">
                  Send invoice email to shop owner
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleCreateInvoice}
                  disabled={creatingInvoice}
                  className="gap-2"
                >
                  {creatingInvoice ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  Create Invoice
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Invoices Tab */}
        <TabsContent value="invoices" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Invoices</CardTitle>
                  <CardDescription>
                    View and manage all invoices
                  </CardDescription>
                </div>
                <div className="flex gap-3">
                  <Select value={invoiceFilter} onValueChange={setInvoiceFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={loadInvoices} className="gap-2">
                    <RefreshCw className={`h-4 w-4 ${loadingInvoices ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingInvoices ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin" />
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No invoices found</p>
                  <p className="text-sm text-muted-foreground">
                    Create your first invoice using the &quot;Create Invoice&quot; tab
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Shop</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice._id}>
                        <TableCell className="font-medium">
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{invoice.shopId?.name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{invoice.shopId?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {invoice.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          KES {invoice.totalAmount?.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {new Date(invoice.dueDate).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(invoice.status)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResendInvoiceEmail(invoice._id)}
                            className="gap-2"
                          >
                            <Send className="h-4 w-4" />
                            Send Email
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Email Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              Preview how your email will look to recipients
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden">
            <div
              dangerouslySetInnerHTML={{ __html: wrapEmailContent(emailForm.htmlContent) }}
              className="bg-gray-100"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
