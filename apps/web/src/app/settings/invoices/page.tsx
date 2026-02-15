'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { config } from '@/lib/config';
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '@smartduka/ui';
import { 
  ArrowLeft, 
  FileText, 
  Receipt, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Search,
  Filter,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CreditCard,
  Calendar
} from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  description: string;
  totalAmount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  dueDate: string;
  paidAt?: string;
  paymentMethod?: string;
  mpesaReceiptNumber?: string;
  createdAt: string;
}

const ITEMS_PER_PAGE = 10;

export default function InvoicesPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!token) return;
      
      try {
        setLoading(true);
        const response = await fetch(`${config.apiUrl}/subscriptions/billing/history?limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!response.ok) throw new Error('Failed to fetch invoices');
        
        const data = await response.json();
        setInvoices(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [token]);

  // Filter and search invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      const matchesSearch = 
        invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredInvoices.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredInvoices, currentPage]);

  // Stats
  const stats = useMemo(() => {
    const pending = invoices.filter(i => i.status === 'pending');
    const paid = invoices.filter(i => i.status === 'paid');
    const overdue = invoices.filter(i => i.status === 'overdue');
    
    return {
      total: invoices.length,
      pending: pending.length,
      pendingAmount: pending.reduce((sum, i) => sum + i.totalAmount, 0),
      paid: paid.length,
      paidAmount: paid.reduce((sum, i) => sum + i.totalAmount, 0),
      overdue: overdue.length,
    };
  }, [invoices]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      pending: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', icon: <Clock className="h-3 w-3" /> },
      paid: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', icon: <CheckCircle2 className="h-3 w-3" /> },
      overdue: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', icon: <AlertCircle className="h-3 w-3" /> },
      cancelled: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', icon: <XCircle className="h-3 w-3" /> },
    };
    const style = styles[status] || styles.pending;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {style.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const openInvoice = async (invoiceId: string, type: 'invoice' | 'receipt') => {
    try {
      const { downloadWithAuth } = await import('@/lib/api-client');
      await downloadWithAuth(`/subscriptions/invoices/${invoiceId}/pdf?type=${type}`);
    } catch (error: any) {
      console.error('Failed to open document:', error);
      alert(error.message || 'Failed to open document');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Mobile optimized */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push('/settings')}
              className="gap-1 sm:gap-2 px-2 sm:px-3 h-9 touch-manipulation"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden xs:inline">Back</span>
            </Button>
            <div className="h-5 w-px bg-border hidden sm:block" />
            <h1 className="text-base sm:text-xl font-bold truncate">Invoices</h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Stats Cards - Mobile optimized grid */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-slate-200 dark:bg-slate-700 rounded-lg">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 dark:text-slate-300" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{stats.total}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-700">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-amber-200 dark:bg-amber-800 rounded-lg">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-300" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{stats.pending}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-700">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-emerald-200 dark:bg-emerald-800 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-300" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{stats.paid}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Paid</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-blue-200 dark:bg-blue-800 rounded-lg">
                  <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <p className="text-sm sm:text-lg font-bold">KES {stats.pendingAmount.toLocaleString()}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Due</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters - Mobile optimized */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoices..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 h-10 sm:h-9 text-base sm:text-sm"
                />
              </div>
              <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                {['all', 'pending', 'paid', 'overdue'].map((status) => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setStatusFilter(status);
                      setCurrentPage(1);
                    }}
                    className="capitalize h-8 px-3 text-xs sm:text-sm whitespace-nowrap touch-manipulation flex-shrink-0"
                  >
                    {status === 'all' ? 'All' : status}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoices List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Invoices ({filteredInvoices.length})</span>
              {totalPages > 1 && (
                <span className="text-sm font-normal text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {paginatedInvoices.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No invoices found</p>
              </div>
            ) : (
              <div className="divide-y">
                {paginatedInvoices.map((invoice) => (
                  <div 
                    key={invoice.id} 
                    className="p-3 sm:p-4 hover:bg-muted/50 active:bg-muted/70 transition-colors touch-manipulation"
                  >
                    {/* Mobile-first layout */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs sm:text-sm font-medium">{invoice.invoiceNumber}</span>
                          {getStatusBadge(invoice.status)}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">{invoice.description}</p>
                      </div>
                      <p className="text-base sm:text-lg font-bold whitespace-nowrap">KES {invoice.totalAmount.toLocaleString()}</p>
                    </div>
                    
                    {/* Date info */}
                    <div className="flex items-center gap-3 text-[10px] sm:text-xs text-muted-foreground mb-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Due: {new Date(invoice.dueDate).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                      </span>
                      {invoice.paidAt && (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Paid: {new Date(invoice.paidAt).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      {invoice.mpesaReceiptNumber && (
                        <span className="font-mono text-emerald-600 hidden sm:inline">{invoice.mpesaReceiptNumber}</span>
                      )}
                    </div>
                    
                    {/* Action buttons - Full width on mobile */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openInvoice(invoice.id, 'invoice')}
                        className="flex-1 sm:flex-none h-9 sm:h-8 text-xs sm:text-sm touch-manipulation"
                      >
                        <FileText className="h-3.5 w-3.5 mr-1.5" />
                        Invoice
                      </Button>
                      {invoice.status === 'paid' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openInvoice(invoice.id, 'receipt')}
                          className="flex-1 sm:flex-none h-9 sm:h-8 text-xs sm:text-sm touch-manipulation"
                        >
                          <Receipt className="h-3.5 w-3.5 mr-1.5" />
                          Receipt
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination - Mobile optimized */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-3 sm:p-4 border-t gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-9 sm:h-8 px-2 sm:px-3 touch-manipulation"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Prev</span>
                </Button>
                
                <div className="flex items-center gap-0.5 sm:gap-1">
                  {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage <= 2) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 1) {
                      pageNum = totalPages - 2 + i;
                    } else {
                      pageNum = currentPage - 1 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 sm:w-9 sm:h-9 p-0 text-xs sm:text-sm touch-manipulation"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-9 sm:h-8 px-2 sm:px-3 touch-manipulation"
                >
                  <span className="hidden sm:inline mr-1">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
